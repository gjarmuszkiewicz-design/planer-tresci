"""Przykładowy klient do demonstracji systemu.

Tworzy się przy starcie tylko wtedy, gdy w bazie nie ma żadnego klienta (DEMO_CLIENT=0 wyłącza to całkowicie).
Daty liczymy od dzisiaj, żeby pulpit, kalendarz i powiadomienia zawsze pokazywały bieżące dane.
"""
from __future__ import annotations

import logging
import secrets
import time
from datetime import date, timedelta

from sqlalchemy import func, select

from .config import settings
from .db import SessionLocal
from .models import Client, Comment, MonthPlan, Notification, Post

log = logging.getLogger("planer.demo")

HOUR = 3_600_000
FILARY = ("Filar 1: Kawa bez tajemnic", "Filar 2: Życie kawiarni", "Filar 3: Ludzie i miejsce")

CLIENT = {
    "name": "Kawiarnia Ziarno (demo)",
    "color": "#6B4226",
    "avatar": "/static/demo/logo.jpg",
    "igHandle": "kawiarnia.ziarno.demo",
    "fbName": "Kawiarnia Ziarno",
    "liName": "Ziarno Kawiarnie",
    "liFollowers": "1 240",
    "freq": "Facebook + Instagram: poniedziałek, środa, piątek. LinkedIn: raz w tygodniu, we wtorek. Relacje według potrzeb.",
    "tone": "Ciepło, po ludzku, bez branżowego żargonu. Emoji z umiarem.",
    "audience": "Mieszkańcy okolicy, osoby pracujące zdalnie i miłośnicy dobrej kawy.",
    "strategy": "Filar 1 uczy i przyciąga nowych odbiorców, Filar 2 zaprasza do odwiedzin, a Filar 3 buduje zaufanie.",
    "hashtags": "#kawiarniaziarno #dobrakawa",
    "drive": "",
    "contact": "Anna Przykładowa, właścicielka",
    "notes": "Klient przykładowy do pokazywania systemu. Wszystkie dane i grafiki są zmyślone.",
    "pillars": [
        {"id": "demofil1", "name": FILARY[0], "color": "#2563eb", "goal": "Pokazać wiedzę i przyciągnąć nowych odbiorców.",
         "audience": "Miłośnicy kawy i osoby parzące ją w domu.", "desc": "Proste porady o parzeniu i pochodzeniu kawy.",
         "what": "- porady krok po kroku\n- ciekawostki o ziarnach", "examples": "- Jak dobrać mielenie do metody parzenia?",
         "avoid": "- branżowego żargonu", "tips": "- każdy post kończymy jedną wskazówką do wykorzystania w domu"},
        {"id": "demofil2", "name": FILARY[1], "color": "#059669", "goal": "Zapraszać do lokalu i pokazywać ofertę.",
         "audience": "Goście i mieszkańcy okolicy.", "desc": "Menu, promocje, wydarzenia i kulisy pracy.",
         "what": "- nowości w menu\n- wydarzenia\n- zdjęcia z lokalu", "examples": "- Jesienne menu",
         "avoid": "- samej promocji bez konkretu", "tips": "- zawsze podajemy termin i miejsce"},
        {"id": "demofil3", "name": FILARY[2], "color": "#d97706", "goal": "Budować zaufanie do marki.",
         "audience": "Klienci, partnerzy i przyszli pracownicy.", "desc": "Zespół, dostawcy i lokalne współprace.",
         "what": "- historie zespołu\n- lokalni dostawcy", "examples": "- Dzień z baristą",
         "avoid": "- publikowania zdjęć bez zgody", "tips": "- pokazujemy prawdziwe osoby i imiona"},
    ],
}


def _image(name: str, w: int, h: int) -> dict:
    return {"id": "demo-" + name.split(".")[0], "type": "image", "src": f"/static/demo/{name}", "name": name, "w": w, "h": h}


CAROUSEL = [_image(f"karuzela-{i}.jpg", 1080, 1350) for i in range(1, 5)]
COLLAGE = [_image(f"lokal-{i}.jpg", 1200, 900) for i in range(1, 4)]

# week: tydzień względem bieżącego, day: 0 = poniedziałek; week bez day = treść „w tygodniu”, bez week = rezerwa
POSTS = [
    {"week": -1, "day": 0, "time": "09:00", "format": "Karuzela", "pillar": FILARY[0], "title": "3 kroki do lepszej kawy w domu",
     "copyMeta": "Dobra kawa w domu to nie magia. Przesuń i sprawdź trzy proste zasady, które zmienią Twój poranek. ☕",
     "cta": "Zapisz post na później", "hashtags": "#dobrakawa #kawawdomu", "media": CAROUSEL, "approval": "accepted", "published": True},
    {"week": -1, "day": 2, "time": "12:00", "format": "Post", "pillar": FILARY[1], "title": "Nowa lada i więcej miejsc",
     "copyMeta": "Odświeżyliśmy lokal! Nowa lada, więcej miejsc przy oknie i to samo dobre ziarno. Wpadniesz zobaczyć?",
     "hashtags": "#kawiarniaziarno", "media": COLLAGE, "approval": "accepted", "published": True},
    {"week": 0, "day": 0, "time": "09:00", "format": "Post", "pillar": FILARY[1], "title": "Startuje jesienne menu",
     "brief": "Zapowiedź nowego menu sezonowego.", "copyMeta": "Dynia, kardamon i palony karmel. Jesienne menu wchodzi do Ziarna już w ten poniedziałek. 🍂",
     "onGraphic": "Jesienne menu", "cta": "Sprawdź w lokalu", "hashtags": "#jesienwkawiarni #dobrakawa",
     "media": [_image("post-menu.jpg", 1080, 1350)], "approval": "accepted"},
    {"week": 0, "day": 1, "time": "10:00", "format": "Post", "meta": False, "li": True, "pillar": FILARY[2], "title": "Lokalni dostawcy w liczbach",
     "copyLi": "86% produktów w naszym menu pochodzi z regionu. Współpracujemy z 12 palarniami i 3 piekarniami, bo krótki łańcuch dostaw to świeższa kawa i uczciwa współpraca.\n\nJak dbacie o lokalnych partnerów w swoich firmach?",
     "hashtags": "#lokalnybiznes #gastronomia", "media": [_image("linkedin.jpg", 1200, 628)], "approval": "pending",
     "toConfirm": "Czy możemy podać dokładną liczbę palarni?"},
    {"week": 0, "day": 2, "time": "17:00", "format": "Rolka", "pillar": FILARY[0], "title": "Jak powstaje flat white",
     "copyMeta": "30 sekund za barem z naszą baristką. Podpatrz, jak spieniamy mleko.", "cta": "Oznacz kawosza",
     "materialBrief": "Pionowe wideo 30 s, nagranie w lokalu.", "media": [_image("rolka.jpg", 1080, 1920)], "approval": "pending"},
    {"week": 0, "day": 4, "time": "13:00", "format": "Relacja", "pillar": FILARY[1], "title": "Popołudniowa promocja 2 za 1",
     "copyMeta": "Dziś od 15:00 do 17:00 druga kawa gratis.", "onGraphic": "Dziś 2 za 1",
     "media": [_image("relacja.jpg", 1080, 1920)], "approval": "changes", "unread": True, "note": "Klient prosi o zmianę godzin."},
    {"week": 1, "day": 0, "time": "09:00", "format": "Post", "pillar": FILARY[2], "title": "Poznaj naszą baristkę",
     "brief": "Krótka historia Oli i jej ulubiona kawa.", "copyMeta": "To Ola. Od pięciu lat parzy kawę, a jej ulubiona to etiopska filtrowana. Co zamawiasz u niej najczęściej?",
     "materialBrief": "Portret przy ekspresie, sesja w czwartek.", "approval": "draft", "note": "Czekamy na zdjęcia z sesji."},
    {"week": 1, "day": 2, "time": "12:00", "format": "Karuzela", "pillar": FILARY[0], "title": "Skąd pochodzi nasza kawa",
     "copyMeta": "Etiopia, Kolumbia, Gwatemala. Sprawdź, czym różnią się ziarna z trzech stron świata.",
     "copyLi": "Pochodzenie ziarna wpływa na smak bardziej, niż myślimy. Pokazujemy to gościom na trzech przykładach.",
     "li": True, "hashtags": "#kawaspecialty", "media": CAROUSEL[:3], "approval": "pending"},
    {"week": 2, "format": "Post", "pillar": FILARY[1], "title": "Wieczór z muzyką na żywo",
     "brief": "Zapowiedź wydarzenia, dzień do ustalenia.", "toConfirm": "Który piątek pasuje zespołowi?", "approval": "draft"},
    {"format": "Post", "pillar": FILARY[0], "title": "Rezerwa: co to jest specialty?",
     "brief": "Post zapasowy na wypadek odwołanej publikacji.", "copyMeta": "Specialty to nie moda, tylko ocena jakości ziarna.", "approval": "pending"},
]
EMPTY = {"time": "", "meta": True, "li": False, "brief": "", "copyMeta": "", "copyLi": "", "onGraphic": "", "cta": "", "hashtags": "",
         "mentions": "", "materialBrief": "", "media": [], "toConfirm": "", "published": False, "publishedAt": "", "note": "", "unread": False}
THEMES = {-1: "Pierwsze kroki z kawą", 0: "Start jesiennego menu", 1: "Ludzie Ziarna", 2: "Wydarzenia w lokalu"}


def seed_demo_client() -> None:
    if not settings.demo_client:
        return
    with SessionLocal() as db:
        if db.scalar(select(func.count(Client.id))):
            return
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        now = int(time.time() * 1000)
        client = Client(id="demo" + secrets.token_hex(4), token=secrets.token_hex(12), data=CLIENT)
        db.add(client)
        db.flush()

        plans: dict[str, dict] = {}
        for week, theme in THEMES.items():
            start = monday + timedelta(weeks=week)
            for day in (start, start + timedelta(days=6)):
                plans.setdefault(day.isoformat()[:7], {"weeks": {}, "notes": ""})["weeks"][start.isoformat()] = theme
        plans[today.isoformat()[:7]]["notes"] = "Zdjęcia z sesji dostarczymy do czwartku.\nPrzed publikacją potwierdzamy godziny promocji."
        for month, data in plans.items():
            db.add(MonthPlan(client_id=client.id, month=month, data=data))

        by_title = {}
        for i, src in enumerate(POSTS):
            p = {**EMPTY, **src, "order": i}
            week, day = p.pop("week", None), p.pop("day", None)
            start = monday + timedelta(weeks=week) if week is not None else None
            when = start + timedelta(days=day) if day is not None else None
            p["date"] = when.isoformat() if when else ""
            p["week"] = start.isoformat() if start and not when else ""
            p["month"] = (when or start or today).isoformat()[:7]
            if p["published"]:
                p["publishedAt"] = p["date"]
            post = Post(id="demo" + secrets.token_hex(4), client_id=client.id, month=p["month"], data=p)
            db.add(post)
            by_title[p["title"]] = post
        db.flush()

        activity = [
            ("Startuje jesienne menu", "accept", "Anna Przykładowa", "", 26),
            ("Popołudniowa promocja 2 za 1", "changes", "Anna Przykładowa", "Proszę zmienić godziny na 14:00 do 16:00.", 3),
        ]
        for title, kind, author, text, hours in activity:
            post, at = by_title[title], now - hours * HOUR
            label = "Zaakceptowano" if kind == "accept" else "Poproszono o zmiany"
            db.add(Comment(id=secrets.token_hex(8), post_id=post.id, role="sys", author=author, text=label, at=at + 1))
            if text:
                db.add(Comment(id=secrets.token_hex(8), post_id=post.id, role="client", author=author, text=text, at=at))
            db.add(Notification(client_id=client.id, post_id=post.id, kind=kind, author=author, text=text, at=at))
        db.commit()
        log.info("Utworzono przykładowego klienta %s", CLIENT["name"])
