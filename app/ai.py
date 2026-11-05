"""Asystent AI (Claude API): plan miesiąca ze strategii klienta, pisanie treści postów, wczytanie strategii z PDF.

Klucz API tylko w zmiennej środowiskowej ANTHROPIC_API_KEY (Railway → Variables), nigdy w kodzie.
Wyniki wracają jako propozycje – zespół decyduje, co trafia do planu (zawsze jako szkic).
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import current_user
from .db import get_db
from .models import Client, MonthPlan, Post, User

log = logging.getLogger("ai")
router = APIRouter()

MODEL = os.getenv("AI_MODEL", "").strip() or "claude-opus-5-5"
MAX_PDF_MB = 25
MONTH_RE = re.compile(r"^\d{4}-\d{2}$")
DOW = ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"]

_client = None


def enabled() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())


def _anthropic():
    global _client
    if not enabled():
        raise HTTPException(503, "Asystent AI nie jest włączony – dodaj zmienną ANTHROPIC_API_KEY w Railway.")
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic(timeout=300.0, max_retries=2)
    return _client


# ---------------------------------------------------------------- wywołanie modelu

SYSTEM = """Jesteś doświadczonym strategiem i copywriterem social media w polskiej agencji WIZme. \
Planujesz i piszesz treści na Facebooka, Instagrama i LinkedIna dla klientów agencji.

Zasady:
- Opierasz się na strategii klienta: filarach komunikacji, grupie docelowej, tonie i zasadach publikacji. \
Każda treść realizuje cel konkretnego filaru i trzyma się jego wskazówek („czego unikać”, „rekomendacje”).
- Piszesz po polsku, naturalnie i konkretnie, w tonie klienta. Bez ogólników, bez sztucznego entuzjazmu, \
bez wymyślonych faktów (cen, liczb, nazw, dat wydarzeń). Gdy czegoś nie wiesz, dodaj pytanie w polu „toConfirm”.
- Opis FB + IG jest wspólny dla obu kanałów; LinkedIn ma osobny opis, bardziej merytoryczny i biznesowy.
- CTA i hashtagi idą w osobnych polach, nie powtarzaj ich w opisie.
- Uwzględnij polskie święta i okazje w danym miesiącu, tylko gdy pasują do marki."""


def _profile(c: dict) -> str:
    """Strategia klienta jako tekst dla modelu (stała część promptu – trafia do pamięci podręcznej)."""
    lines = [f"# Klient: {c.get('name', '')}"]
    for key, label in (("audience", "Grupa docelowa"), ("tone", "Ton komunikacji"), ("freq", "Zasady i częstotliwość publikacji"),
                       ("strategy", "Jak filary współgrają"), ("hashtags", "Stałe hashtagi"), ("notes", "Notatki i ustalenia agencji")):
        if (c.get(key) or "").strip():
            lines.append(f"\n## {label}\n{c[key].strip()}")
    channels = [x for x in (c.get("igHandle") and f"Instagram @{c['igHandle']}", c.get("fbName") and f"Facebook „{c['fbName']}”",
                            c.get("liName") and f"LinkedIn „{c['liName']}”") if x]
    if channels:
        lines.append("\n## Profile\n" + ", ".join(channels))
    pillars = c.get("pillars") or []
    if pillars:
        lines.append("\n## Filary komunikacji")
        for p in pillars:
            lines.append(f"\n### {p.get('name', '')}")
            for key, label in (("goal", "Cel"), ("audience", "Grupa"), ("desc", "Opis"), ("what", "Co publikujemy"),
                               ("examples", "Przykłady tematów"), ("avoid", "Czego unikać"), ("tips", "Rekomendacje")):
                if (p.get(key) or "").strip():
                    lines.append(f"- {label}: {p[key].strip()}")
    if (c.get("strategyDoc") or "").strip():
        lines.append("\n## Pełny dokument strategii\n" + c["strategyDoc"].strip())
    return "\n".join(lines)


def _call(profile: str, task: str, schema: dict, effort: str, max_tokens: int, content: list | None = None) -> dict:
    """Jedno zapytanie do Claude z odpowiedzią w ustalonym formacie JSON."""
    import anthropic

    client = _anthropic()
    user_content = (content or []) + [{"type": "text", "text": task}]
    system = [{"type": "text", "text": SYSTEM}]
    if profile:
        system.append({"type": "text", "text": profile, "cache_control": {"type": "ephemeral"}})
    try:
        with client.beta.messages.stream(
            model=MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_content}],
            output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
            # gdy model odmówi (rzadkie fałszywe alarmy filtrów), API samo ponawia na modelu zapasowym
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as stream:
            msg = stream.get_final_message()
    except anthropic.AuthenticationError:
        raise HTTPException(502, "Klucz ANTHROPIC_API_KEY jest nieprawidłowy.")
    except anthropic.RateLimitError:
        raise HTTPException(429, "Za dużo zapytań do AI naraz – spróbuj za chwilę.")
    except anthropic.BadRequestError as e:
        log.warning("AI bad request: %s", e)
        raise HTTPException(502, "AI odrzuciło zapytanie (np. za duży plik).")
    except anthropic.APIStatusError as e:
        log.warning("AI error %s: %s", e.status_code, e)
        raise HTTPException(502, "Usługa AI jest chwilowo niedostępna – spróbuj ponownie.")
    except anthropic.APIConnectionError:
        raise HTTPException(502, "Brak połączenia z usługą AI – spróbuj ponownie.")
    if msg.stop_reason == "refusal":
        raise HTTPException(422, "AI odmówiło wykonania tego zadania. Zmień polecenie i spróbuj ponownie.")
    if msg.stop_reason == "max_tokens":
        raise HTTPException(502, "Odpowiedź AI była za długa – zmniejsz liczbę treści albo spróbuj ponownie.")
    text = next((b.text for b in msg.content if b.type == "text"), "")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(502, "AI zwróciło niepoprawną odpowiedź – spróbuj ponownie.")


def _obj(props: dict, required: list[str] | None = None) -> dict:
    return {"type": "object", "properties": props, "required": required or list(props), "additionalProperties": False}


STR = {"type": "string"}


def _client_row(db: Session, client_id: str) -> Client:
    c = db.get(Client, client_id)
    if not c:
        raise HTTPException(404, "Nie ma takiego klienta.")
    return c


def _post_line(p: dict) -> str:
    when = p.get("date") or (f"tydzień od {p['week']}" if p.get("week") else "rezerwa")
    ch = " + ".join(x for x in (p.get("meta") and "FB+IG", p.get("li") and "LI") if x)
    return f"- {when} · {ch} · {p.get('format', '')} · {p.get('pillar') or 'bez filaru'} · {p.get('title', '')}"


# ---------------------------------------------------------------- status

@router.get("/api/ai/status")
def status(_user: User = Depends(current_user)):
    return {"enabled": enabled(), "model": MODEL}


# ---------------------------------------------------------------- plan miesiąca

class PlanBody(BaseModel):
    clientId: str
    month: str
    count: int = Field(12, ge=1, le=40)
    meta: bool = True
    li: bool = False
    instructions: str = Field("", max_length=4000)


class PlanPost(BaseModel):
    date: str
    meta: bool
    li: bool
    format: str
    pillar: str
    title: str
    brief: str
    materialBrief: str
    toConfirm: str


class PlanOut(BaseModel):
    summary: str
    weeks: list[dict]
    posts: list[PlanPost]


PLAN_SCHEMA = _obj({
    "summary": STR,
    "weeks": {"type": "array", "items": _obj({"monday": STR, "theme": STR})},
    "posts": {"type": "array", "items": _obj({
        "date": STR, "meta": {"type": "boolean"}, "li": {"type": "boolean"}, "format": STR, "pillar": STR,
        "title": STR, "brief": STR, "materialBrief": STR, "toConfirm": STR,
    })},
})


def _calendar(month: str) -> tuple[list[str], str]:
    y, m = map(int, month.split("-"))
    first = date(y, m, 1)
    last = (date(y + (m == 12), m % 12 + 1, 1) - timedelta(days=1))
    mondays = []
    d = first - timedelta(days=first.weekday())
    while d <= last:
        mondays.append(d.isoformat())
        d += timedelta(days=7)
    days = []
    d = first
    while d <= last:
        days.append(f"{d.isoformat()} {DOW[d.weekday()]}")
        d += timedelta(days=1)
    return mondays, "\n".join(days)


@router.post("/api/ai/plan")
def plan(body: PlanBody, _user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not MONTH_RE.match(body.month):
        raise HTTPException(400, "Nieprawidłowy miesiąc.")
    if not (body.meta or body.li):
        raise HTTPException(400, "Wybierz co najmniej jeden kanał.")
    c = _client_row(db, body.clientId)
    data = c.data or {}
    pillars = [p.get("name", "") for p in data.get("pillars") or [] if p.get("name")]
    mondays, days = _calendar(body.month)

    existing = [p.data for p in db.scalars(select(Post).where(Post.client_id == c.id))]
    in_month = [p for p in existing if (p.get("date") or "")[:7] == body.month or (not p.get("date") and p.get("month") == body.month)]
    recent = sorted((p for p in existing if p.get("date") and p["date"][:7] < body.month), key=lambda p: p["date"])[-30:]
    mp = db.scalar(select(MonthPlan).where(MonthPlan.client_id == c.id, MonthPlan.month == body.month))
    themes = (mp.data or {}).get("weeks", {}) if mp else {}

    channels = " i ".join(x for x in (body.meta and "Facebook + Instagram (wspólny opis)", body.li and "LinkedIn") if x)
    task = f"""Zaplanuj treści na miesiąc {body.month}: {body.count} nowych treści, kanały: {channels}.

Dni miesiąca:
{days}

Tygodnie (poniedziałki): {", ".join(mondays)}
{"Tematy tygodni ustalone wcześniej: " + json.dumps(themes, ensure_ascii=False) if themes else "Tematy tygodni nie są jeszcze ustalone – zaproponuj je."}

{"Treści już zaplanowane w tym miesiącu (nie dubluj tematów ani terminów):" + chr(10) + chr(10).join(_post_line(p) for p in in_month) if in_month else "W tym miesiącu nie ma jeszcze treści."}

{"Ostatnio publikowane treści (unikaj powtórek):" + chr(10) + chr(10).join(_post_line(p) for p in recent) if recent else ""}

{"Dodatkowe wytyczne od zespołu: " + body.instructions.strip() if body.instructions.strip() else ""}

Wymagania:
- Rozłóż treści równomiernie na dni zgodne z zasadami publikacji klienta (domyślnie dni robocze), daty w formacie RRRR-MM-DD w tym miesiącu.
- Zachowaj proporcje filarów wynikające ze strategii. Pole „pillar” musi mieć dokładnie jedną z nazw: {json.dumps(pillars, ensure_ascii=False) if pillars else "(klient nie ma filarów – zostaw puste)"}.
- Format wybierz z: Post, Karuzela, Rolka, Relacja, Karuzela dokumentowa, Wideo, Artykuł, Zdjęcia + komentarz.
- „meta” i „li” oznaczają kanały tej treści (tylko spośród wybranych powyżej).
- „title” to krótki temat, „brief” to 2–3 zdania założenia: o czym jest post, jaki kąt i jaki cel filaru realizuje.
- „materialBrief” to krótki brief dla grafika lub fotografa. „toConfirm” – pytanie do klienta albo pusty tekst.
- „weeks”: dla każdego poniedziałku z listy krótki temat przewodni tygodnia (zostaw ustalone wcześniej bez zmian).
- „summary”: 2–3 zdania o logice planu dla zespołu."""
    out = _call(_profile(data), task, PLAN_SCHEMA, effort="high", max_tokens=32000)
    try:
        res = PlanOut.model_validate(out)
    except ValidationError:
        raise HTTPException(502, "AI zwróciło niepełny plan – spróbuj ponownie.")
    posts = []
    for p in res.posts:
        d = p.model_dump()
        if not (d["date"][:7] == body.month and re.match(r"^\d{4}-\d{2}-\d{2}$", d["date"])):
            d["date"] = ""
        d["meta"] = d["meta"] and body.meta
        d["li"] = d["li"] and body.li
        if not (d["meta"] or d["li"]):
            d["meta"], d["li"] = body.meta, body.li and not body.meta
        if pillars and d["pillar"] not in pillars:
            d["pillar"] = ""
        posts.append(d)
    weeks = {w.get("monday"): (w.get("theme") or "").strip() for w in res.weeks if w.get("monday") in mondays}
    return {"summary": res.summary, "weeks": weeks, "posts": posts}


# ---------------------------------------------------------------- treść posta

class WriteBody(BaseModel):
    clientId: str
    post: dict[str, Any]
    instructions: str = Field("", max_length=4000)


WRITE_FIELDS = ("title", "brief", "copyMeta", "copyLi", "cta", "hashtags", "onGraphic", "materialBrief", "toConfirm")
WRITE_SCHEMA = _obj({k: STR for k in WRITE_FIELDS})


@router.post("/api/ai/write")
def write(body: WriteBody, _user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _client_row(db, body.clientId)
    p = {k: body.post.get(k) for k in ("date", "week", "month", "meta", "li", "format", "pillar", *WRITE_FIELDS)}
    if len(json.dumps(p, ensure_ascii=False)) > 30000:
        raise HTTPException(400, "Treść jest za długa.")
    pillar = next((x for x in (c.data or {}).get("pillars") or [] if x.get("name") == p.get("pillar")), None)
    channels = [x for x in (p.get("meta") and "FB + IG", p.get("li") and "LinkedIn") if x] or ["FB + IG"]
    task = f"""Napisz gotową do publikacji treść posta. Kanały: {", ".join(channels)}.

Obecny stan posta (puste pola uzupełnij, wypełnione popraw tylko wtedy, gdy wytyczne tego wymagają):
{json.dumps(p, ensure_ascii=False, indent=1)}
{f"Filar tej treści: {pillar.get('name')} – trzymaj się jego celu i wskazówek ze strategii." if pillar else ""}

{"Wytyczne od zespołu: " + body.instructions.strip() if body.instructions.strip() else "Brak dodatkowych wytycznych – napisz najlepszą wersję zgodną ze strategią."}

Wymagania:
- „copyMeta”: opis na Facebooka i Instagrama{"" if p.get("meta") else " – ten post nie idzie na FB + IG, zostaw pusty tekst"}. Mocne pierwsze zdanie, akapity, emoji tylko jeśli pasują do tonu. Bez CTA i hashtagów.
- „copyLi”: opis na LinkedIna{"" if p.get("li") else " – ten post nie idzie na LinkedIn, zostaw pusty tekst"}. Bardziej merytoryczny, bez CTA i hashtagów.
- „cta”: jedno krótkie wezwanie do działania. „hashtags”: 3–8 hashtagów w jednej linii, uwzględnij stałe hashtagi klienta.
- „onGraphic”: krótki tekst na grafikę (nagłówek; przy karuzeli kolejne slajdy w osobnych liniach „Slajd 1: …”).
- „materialBrief”: brief dla grafika / fotografa. „title” i „brief” – zachowaj, chyba że są puste albo wytyczne każą je zmienić.
- „toConfirm”: pytanie do klienta o fakty, których nie znasz, albo pusty tekst."""
    out = _call(_profile(c.data or {}), task, WRITE_SCHEMA, effort="medium", max_tokens=16000)
    return {k: str(out.get(k) or "") for k in WRITE_FIELDS}


# ---------------------------------------------------------------- strategia z PDF

STRATEGY_SCHEMA = _obj({
    "summary": STR, "audience": STR, "tone": STR, "freq": STR, "strategy": STR, "hashtags": STR,
    "pillars": {"type": "array", "items": _obj({
        "name": STR, "goal": STR, "audience": STR, "desc": STR, "what": STR, "examples": STR, "avoid": STR, "tips": STR})},
})


@router.post("/api/ai/strategy")
async def strategy_from_pdf(file: UploadFile = File(...), _user: User = Depends(current_user)):
    raw = await file.read(MAX_PDF_MB * 1024 * 1024 + 1)
    if len(raw) > MAX_PDF_MB * 1024 * 1024:
        raise HTTPException(400, f"Plik jest za duży (maks. {MAX_PDF_MB} MB).")
    if not raw.startswith(b"%PDF"):
        raise HTTPException(400, "Wgraj strategię w formacie PDF.")
    doc = {"type": "document", "source": {"type": "base64", "media_type": "application/pdf",
                                          "data": base64.standard_b64encode(raw).decode()}}
    task = """To dokument strategii komunikacji klienta w social media. Wyciągnij z niego wszystko, \
co jest potrzebne do planowania i pisania treści, bez dopisywania czegokolwiek od siebie:
- „summary”: zwięzłe, ale pełne streszczenie strategii (cele, pozycjonowanie, wyróżniki, oferta, kluczowe komunikaty, \
zasady, zakazy) – to będzie stała ściąga dla copywritera, do ok. 6000 znaków.
- „audience”, „tone”, „freq” (kanały, częstotliwość, dni publikacji), „strategy” (jak filary współgrają), „hashtags”.
- „pillars”: filary komunikacji z dokumentu z opisem pól; pole, którego nie ma w dokumencie, zostaw puste.
Gdy czegoś nie ma w dokumencie, zostaw pusty tekst."""
    # PDF czytany jest w wątku roboczym FastAPI, bo wywołanie jest blokujące
    from starlette.concurrency import run_in_threadpool
    return await run_in_threadpool(_call, "", task, STRATEGY_SCHEMA, "medium", 16000, [doc])
