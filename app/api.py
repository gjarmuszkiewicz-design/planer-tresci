"""API panelu agencji (wymaga zalogowania).

Interfejs trzyma cały plan w pamięci przeglądarki i co chwilę wysyła na /api/sync tylko to, co się zmieniło.
Treści mają numer wersji (`rev`): jeśli klient w międzyczasie zaakceptował treść albo zmienił ją ktoś z zespołu,
serwer odrzuca starszą wersję i odsyła aktualną, zamiast po cichu ją nadpisać.
"""
from __future__ import annotations

import re
import secrets
import time
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import current_user, hash_password, require_admin, user_json, validate_password, verify_password
from .config import settings
from .db import get_db
from .models import Client, Comment, Media, MonthPlan, Post, User

router = APIRouter()

ID_RE = re.compile(r"^[A-Za-z0-9_-]{4,40}$")
TOKEN_RE = re.compile(r"^[a-f0-9]{24,64}$")
MONTH_RE = re.compile(r"^\d{4}-\d{2}$")
IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


def _check_id(value: str, what: str = "identyfikator") -> str:
    if not isinstance(value, str) or not ID_RE.match(value):
        raise HTTPException(400, f"Niepoprawny {what}.")
    return value


def comment_json(c: Comment) -> dict:
    return {"id": c.id, "role": c.role, "author": c.author, "text": c.text, "at": c.at}


def post_json(p: Post, comments: list[Comment]) -> dict:
    return {**p.data, "id": p.id, "clientId": p.client_id, "rev": p.rev, "comments": [comment_json(c) for c in comments]}


def client_json(c: Client) -> dict:
    return {**c.data, "id": c.id, "token": c.token}


def comments_by_post(db: Session, post_ids: list[str]) -> dict[str, list[Comment]]:
    out: dict[str, list[Comment]] = {pid: [] for pid in post_ids}
    if post_ids:
        for c in db.scalars(select(Comment).where(Comment.post_id.in_(post_ids)).order_by(Comment.at)):
            out[c.post_id].append(c)
    return out


@router.get("/api/me")
def me(user: User = Depends(current_user)):
    return user_json(user)


@router.get("/api/state")
def state(user: User = Depends(current_user), db: Session = Depends(get_db)):
    clients = db.scalars(select(Client)).all()
    posts = db.scalars(select(Post)).all()
    cm = comments_by_post(db, [p.id for p in posts])
    months = db.scalars(select(MonthPlan)).all()
    return {
        "user": user_json(user),
        "clients": [client_json(c) for c in clients],
        "posts": [post_json(p, cm[p.id]) for p in posts],
        "months": [{**m.data, "clientId": m.client_id, "month": m.month} for m in months],
    }


class SyncBody(BaseModel):
    clients: list[dict[str, Any]] = Field(default_factory=list)
    posts: list[dict[str, Any]] = Field(default_factory=list)
    months: list[dict[str, Any]] = Field(default_factory=list)
    deleteClients: list[str] = Field(default_factory=list)
    deletePosts: list[str] = Field(default_factory=list)
    deleteMonths: list[dict[str, str]] = Field(default_factory=list)


@router.post("/api/sync")
def sync(body: SyncBody, _user: User = Depends(current_user), db: Session = Depends(get_db)):
    revs: dict[str, int] = {}
    conflicts: list[Post] = []

    for c in body.clients:
        cid = _check_id(c.get("id"), "identyfikator klienta")
        token = c.get("token") or secrets.token_hex(12)
        if not TOKEN_RE.match(token):
            raise HTTPException(400, "Niepoprawny token linku klienta.")
        other = db.scalar(select(Client).where(Client.token == token, Client.id != cid))
        if other:
            raise HTTPException(409, "Ten link klienta jest już zajęty – wygeneruj nowy.")
        data = {k: v for k, v in c.items() if k not in ("id", "token")}
        row = db.get(Client, cid)
        if row:
            row.data, row.token = data, token
        else:
            db.add(Client(id=cid, token=token, data=data))
    db.flush()

    for m in body.months:
        cid, month = _check_id(m.get("clientId"), "identyfikator klienta"), m.get("month", "")
        if not MONTH_RE.match(month):
            raise HTTPException(400, "Niepoprawny miesiąc.")
        if not db.get(Client, cid):
            raise HTTPException(400, "Plan miesiąca dla nieistniejącego klienta.")
        data = {"weeks": m.get("weeks") or {}, "notes": m.get("notes") or ""}
        row = db.get(MonthPlan, (cid, month))
        if row:
            row.data = data
        else:
            db.add(MonthPlan(client_id=cid, month=month, data=data))

    for p in body.posts:
        pid = _check_id(p.get("id"), "identyfikator treści")
        cid = _check_id(p.get("clientId"), "identyfikator klienta")
        if not db.get(Client, cid):
            raise HTTPException(400, "Treść dla nieistniejącego klienta.")
        data = {k: v for k, v in p.items() if k not in ("id", "clientId", "rev", "comments")}
        month = (data.get("date") or data.get("month") or "")[:7]
        row = db.get(Post, pid)
        if row is None:
            db.add(Post(id=pid, client_id=cid, month=month, data=data, rev=1))
            revs[pid] = 1
        elif int(p.get("rev") or 0) != row.rev:
            conflicts.append(row)
        else:
            row.client_id, row.month, row.data, row.rev = cid, month, data, row.rev + 1
            revs[pid] = row.rev

    for pid in body.deletePosts:
        row = db.get(Post, _check_id(pid))
        if row:
            db.delete(row)
    for m in body.deleteMonths:
        row = db.get(MonthPlan, (m.get("clientId", ""), m.get("month", "")))
        if row:
            db.delete(row)
    db.flush()
    for cid in body.deleteClients:
        row = db.get(Client, _check_id(cid))
        if row:
            for p in db.scalars(select(Post).where(Post.client_id == row.id)):
                db.delete(p)
            for m in db.scalars(select(MonthPlan).where(MonthPlan.client_id == row.id)):
                db.delete(m)
            db.flush()
            db.delete(row)

    db.commit()
    cm = comments_by_post(db, [p.id for p in conflicts])
    return {"revs": revs, "conflicts": [post_json(p, cm[p.id]) for p in conflicts]}


class CommentBody(BaseModel):
    text: str


@router.post("/api/posts/{post_id}/comments")
def add_comment(post_id: str, body: CommentBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    post = db.get(Post, _check_id(post_id))
    text = body.text.strip()
    if not post:
        raise HTTPException(404, "Najpierw zapisz treść.")
    if not text:
        raise HTTPException(400, "Komentarz jest pusty.")
    c = Comment(id=secrets.token_hex(8), post_id=post.id, role="agency", author=user.name or user.email,
                text=text[:5000], at=int(time.time() * 1000))
    db.add(c)
    db.commit()
    return comment_json(c)


@router.post("/api/media")
async def upload_media(file: UploadFile = File(...), name: str = Form(""),
                       _user: User = Depends(current_user), db: Session = Depends(get_db)):
    if file.content_type not in IMAGE_TYPES:
        raise HTTPException(400, "Obsługiwane są obrazy PNG, JPG, WEBP i GIF.")
    data = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Plik jest większy niż {settings.max_upload_mb} MB.")
    m = Media(id=secrets.token_hex(16), content_type=file.content_type, name=(name or file.filename or "")[:300],
              size=len(data), data=data)
    db.add(m)
    db.commit()
    return {"id": m.id, "url": f"/media/{m.id}"}


@router.get("/media/{media_id}")
def get_media(media_id: str, db: Session = Depends(get_db)):
    m = db.get(Media, _check_id(media_id))
    if not m:
        raise HTTPException(404, "Nie ma takiego pliku.")
    return Response(m.data, media_type=m.content_type,
                    headers={"Cache-Control": "public, max-age=31536000, immutable"})


# ---------- zespół ----------

class NewUser(BaseModel):
    email: str
    name: str = ""
    password: str
    role: str = "member"


class UserPatch(BaseModel):
    name: str | None = None
    role: str | None = None
    active: bool | None = None
    password: str | None = None


class PasswordChange(BaseModel):
    current: str
    new: str


@router.get("/api/users")
def list_users(_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [user_json(u) for u in db.scalars(select(User).order_by(User.name))]


@router.post("/api/users")
def create_user(body: NewUser, _admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(400, "Niepoprawny adres e-mail.")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Konto z tym adresem już istnieje.")
    validate_password(body.password)
    u = User(email=email, name=body.name.strip() or email, role="admin" if body.role == "admin" else "member",
             password_hash=hash_password(body.password))
    db.add(u)
    db.commit()
    return user_json(u)


@router.patch("/api/users/{user_id}")
def update_user(user_id: int, body: UserPatch, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "Nie ma takiego konta.")
    if u.id == admin.id and (body.active is False or body.role == "member"):
        raise HTTPException(400, "Nie możesz odebrać uprawnień ani wyłączyć własnego konta.")
    if body.name is not None:
        u.name = body.name.strip() or u.email
    if body.role in ("admin", "member"):
        u.role = body.role
    if body.active is not None:
        u.active = body.active
    if body.password:
        validate_password(body.password)
        u.password_hash = hash_password(body.password)
    db.commit()
    return user_json(u)


@router.post("/api/me/password")
def change_password(body: PasswordChange, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current, user.password_hash):
        raise HTTPException(400, "Obecne hasło jest nieprawidłowe.")
    validate_password(body.new)
    user.password_hash = hash_password(body.new)
    db.commit()
    return {"ok": True}
