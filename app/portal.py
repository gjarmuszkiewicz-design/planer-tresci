"""Panel klienta pod linkiem /p/<token> – bez logowania.

Klient widzi wyłącznie swój profil. Serwer sam odfiltrowuje szkice, notatki wewnętrzne i ustawienia agencji,
więc tych danych nie ma nawet w odpowiedzi API, którą przegląda przeglądarka klienta.
"""
from __future__ import annotations

import secrets
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .api import TOKEN_RE, _check_id, comment_json, comments_by_post
from .db import get_db
from .models import Client, Comment, MonthPlan, Post

router = APIRouter()

# pola klienta widoczne w jego panelu (reszta – notatki, kontakt, zasady, ton – zostaje w agencji)
PUBLIC_CLIENT_FIELDS = ("name", "color", "avatar", "igHandle", "fbName", "liName", "liFollowers")
PUBLIC_PILLAR_FIELDS = ("id", "name", "color", "goal")
# pola treści, których klient nie widzi
HIDDEN_POST_FIELDS = ("note", "unread")


def _client(db: Session, token: str) -> Client:
    c = db.scalar(select(Client).where(Client.token == token)) if TOKEN_RE.match(token or "") else None
    if not c:
        raise HTTPException(404, "Link jest nieaktywny. Poproś agencję o nowy link.")
    return c


def public_client(c: Client) -> dict:
    data = {k: c.data.get(k, "") for k in PUBLIC_CLIENT_FIELDS}
    data["pillars"] = [{k: p.get(k, "") for k in PUBLIC_PILLAR_FIELDS} for p in c.data.get("pillars") or []]
    return {**data, "id": c.id, "token": c.token}


def public_post(p: Post, comments: list[Comment]) -> dict:
    data = {k: v for k, v in p.data.items() if k not in HIDDEN_POST_FIELDS}
    return {**data, "id": p.id, "clientId": p.client_id, "rev": p.rev, "unread": False,
            "comments": [comment_json(c) for c in comments]}


def _visible(p: Post) -> bool:
    return (p.data or {}).get("approval") != "draft"


@router.get("/api/p/{token}")
def portal_state(token: str, db: Session = Depends(get_db)):
    c = _client(db, token)
    posts = [p for p in db.scalars(select(Post).where(Post.client_id == c.id)) if _visible(p)]
    cm = comments_by_post(db, [p.id for p in posts])
    months = db.scalars(select(MonthPlan).where(MonthPlan.client_id == c.id)).all()
    return {
        "clients": [public_client(c)],
        "posts": [public_post(p, cm[p.id]) for p in posts],
        "months": [{"weeks": m.data.get("weeks") or {}, "notes": m.data.get("notes") or "",
                    "clientId": c.id, "month": m.month} for m in months],
    }


class Action(BaseModel):
    kind: str  # accept / changes / comment
    text: str = ""
    author: str


@router.post("/api/p/{token}/posts/{post_id}")
def portal_action(token: str, post_id: str, body: Action, db: Session = Depends(get_db)):
    c = _client(db, token)
    p = db.get(Post, _check_id(post_id))
    if not p or p.client_id != c.id or not _visible(p):
        raise HTTPException(404, "Nie ma takiej treści.")
    text, author = body.text.strip()[:5000], body.author.strip()[:200]
    if not author:
        raise HTTPException(400, "Podaj swoje imię.")
    if body.kind not in ("accept", "changes", "comment"):
        raise HTTPException(400, "Nieznana akcja.")
    if body.kind in ("changes", "comment") and not text:
        raise HTTPException(400, "Opisz, co mamy zmienić." if body.kind == "changes" else "Komentarz jest pusty.")

    now = int(time.time() * 1000)
    if text:
        db.add(Comment(id=secrets.token_hex(8), post_id=p.id, role="client", author=author, text=text, at=now))
    data = dict(p.data)
    if body.kind == "accept":
        data["approval"] = "accepted"
        db.add(Comment(id=secrets.token_hex(8), post_id=p.id, role="sys", author=author, text="Zaakceptowano", at=now + 1))
    elif body.kind == "changes":
        data["approval"] = "changes"
        db.add(Comment(id=secrets.token_hex(8), post_id=p.id, role="sys", author=author, text="Poproszono o zmiany", at=now + 1))
    data["unread"] = True  # czerwona kropka w panelu agencji
    p.data, p.rev = data, p.rev + 1
    db.commit()
    return public_post(p, comments_by_post(db, [p.id])[p.id])
