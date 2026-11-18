"""API panelu agencji (wymaga zalogowania).

Interfejs trzyma cały plan w pamięci przeglądarki i co chwilę wysyła na /api/sync tylko to, co się zmieniło.
Treści mają numer wersji (`rev`): jeśli klient w międzyczasie zaakceptował treść albo zmienił ją ktoś z zespołu,
serwer odrzuca starszą wersję i odsyła aktualną, zamiast po cichu ją nadpisać.
"""
from __future__ import annotations

import io
import json
import re
import secrets
import time
import unicodedata
import zipfile
from pathlib import Path
from urllib.parse import quote
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .auth import client_scope, current_user, hash_password, require_admin, user_json, validate_password, verify_password
from .config import settings
from .db import get_db
from .models import Client, ClientAccess, Comment, Design, Media, MonthPlan, Notification, NotificationSeen, Post, User

router = APIRouter()

ID_RE = re.compile(r"^[A-Za-z0-9_-]{4,40}$")
TOKEN_RE = re.compile(r"^[a-f0-9]{24,64}$")
MONTH_RE = re.compile(r"^\d{4}-\d{2}$")
IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MEDIA_TYPES = IMAGE_TYPES | {"application/pdf"}  # PDF: dokument systemu identyfikacji z paczki klienta


def _check_id(value: str, what: str = "identyfikator") -> str:
    if not isinstance(value, str) or not ID_RE.match(value):
        raise HTTPException(400, f"Niepoprawny {what}.")
    return value


def comment_json(c: Comment) -> dict:
    return {"id": c.id, "role": c.role, "author": c.author, "text": c.text, "at": c.at}


# Konto klienta (rola client) pracuje w swoim profilu jak zespół, ale bez rzeczy wewnętrznych agencji:
# tych pól klienta nie dostaje w odpowiedzi API, a przy zapisie serwer zostawia ich obecną wartość.
CLIENT_HIDDEN_FIELDS = ("notes", "links", "drive", "strategyDoc")
# ustawienia modułu Grafiki konto klienta widzi (żeby działały Grafiki), ale nie może ich zmienić
CLIENT_LOCKED_FIELDS = CLIENT_HIDDEN_FIELDS + ("brand", "system")
# pola treści tylko dla agencji: notatka wewnętrzna i czerwona kropka „nowe od klienta”
CLIENT_HIDDEN_POST_FIELDS = ("note", "unread")


def post_json(p: Post, comments: list[Comment], scoped: bool = False) -> dict:
    data = {k: v for k, v in p.data.items() if k not in CLIENT_HIDDEN_POST_FIELDS} if scoped else p.data
    out = {**data, "id": p.id, "clientId": p.client_id, "rev": p.rev, "comments": [comment_json(c) for c in comments]}
    if scoped:
        out["unread"] = False
    return out


def client_json(c: Client, scoped: bool = False) -> dict:
    if scoped:
        return {**{k: v for k, v in c.data.items() if k not in CLIENT_HIDDEN_FIELDS}, "id": c.id}
    return {**c.data, "id": c.id, "token": c.token}


def comments_by_post(db: Session, post_ids: list[str]) -> dict[str, list[Comment]]:
    out: dict[str, list[Comment]] = {pid: [] for pid in post_ids}
    if post_ids:
        for c in db.scalars(select(Comment).where(Comment.post_id.in_(post_ids)).order_by(Comment.at)):
            out[c.post_id].append(c)
    return out


@router.get("/api/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return user_json(user, client_scope(db, user))


@router.get("/api/state")
def state(user: User = Depends(current_user), db: Session = Depends(get_db)):
    scope = client_scope(db, user)
    qc, qp, qm = select(Client), select(Post), select(MonthPlan)
    if scope is not None:
        qc, qp, qm = qc.where(Client.id == scope), qp.where(Post.client_id == scope), qm.where(MonthPlan.client_id == scope)
    clients, posts, months = db.scalars(qc).all(), db.scalars(qp).all(), db.scalars(qm).all()
    cm = comments_by_post(db, [p.id for p in posts])
    scoped = scope is not None
    return {
        "user": user_json(user, scope),
        "clients": [client_json(c, scoped) for c in clients],
        "posts": [post_json(p, cm[p.id], scoped) for p in posts],
        "months": [{**m.data, "clientId": m.client_id, "month": m.month} for m in months],
        "notifications": notifications_for(db, user),
    }


# ---------- powiadomienia (dzwonek) ----------

NOTIF_LIMIT = 50


def notifications_for(db: Session, user: User) -> dict:
    if user.role == "client":  # dzwonek to zdarzenia od klientów dla agencji
        return {"unread": 0, "seenAt": 0, "items": []}
    seen = db.get(NotificationSeen, user.id)
    seen_at = seen.seen_at if seen else 0
    rows = db.scalars(select(Notification).order_by(Notification.at.desc()).limit(NOTIF_LIMIT)).all()
    unread = db.scalar(select(func.count(Notification.id)).where(Notification.at > seen_at)) or 0
    return {
        "unread": unread,
        "seenAt": seen_at,
        "items": [{"id": n.id, "kind": n.kind, "author": n.author, "text": n.text, "at": n.at,
                   "postId": n.post_id, "clientId": n.client_id} for n in rows],
    }


@router.get("/api/notifications")
def notifications(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return notifications_for(db, user)


@router.post("/api/notifications/seen")
def notifications_seen(user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(NotificationSeen, user.id)
    now = int(time.time() * 1000)
    if row:
        row.seen_at = now
    else:
        db.add(NotificationSeen(user_id=user.id, seen_at=now))
    db.commit()
    return notifications_for(db, user)


class SyncBody(BaseModel):
    clients: list[dict[str, Any]] = Field(default_factory=list)
    posts: list[dict[str, Any]] = Field(default_factory=list)
    months: list[dict[str, Any]] = Field(default_factory=list)
    deleteClients: list[str] = Field(default_factory=list)
    deletePosts: list[str] = Field(default_factory=list)
    deleteMonths: list[dict[str, str]] = Field(default_factory=list)


@router.post("/api/sync")
def sync(body: SyncBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    revs: dict[str, int] = {}
    conflicts: list[Post] = []
    scope = client_scope(db, user)

    def own(cid: str) -> str:
        if scope is not None and cid != scope:
            raise HTTPException(403, "To konto ma dostęp tylko do swojego klienta.")
        return cid

    if scope is not None and body.deleteClients:
        raise HTTPException(403, "Konto klienta nie może usuwać klientów.")

    for c in body.clients:
        cid = own(_check_id(c.get("id"), "identyfikator klienta"))
        if scope is not None:
            row = db.get(Client, cid)
            data = {k: v for k, v in c.items() if k not in ("id", "token") + CLIENT_LOCKED_FIELDS}
            data.update({k: row.data[k] for k in CLIENT_LOCKED_FIELDS if k in row.data})
            row.data = data
            continue
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
        cid, month = own(_check_id(m.get("clientId"), "identyfikator klienta")), m.get("month", "")
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
        cid = own(_check_id(p.get("clientId"), "identyfikator klienta"))
        if not db.get(Client, cid):
            raise HTTPException(400, "Treść dla nieistniejącego klienta.")
        data = {k: v for k, v in p.items() if k not in ("id", "clientId", "rev", "comments")}
        month = (data.get("date") or data.get("month") or "")[:7]
        row = db.get(Post, pid)
        if scope is not None:
            if row is not None and row.client_id != scope:
                raise HTTPException(403, "To konto ma dostęp tylko do swojego klienta.")
            for k in CLIENT_HIDDEN_POST_FIELDS:
                data.pop(k, None)
                if row is not None and k in row.data:
                    data[k] = row.data[k]
            # akceptacja albo prośba o zmiany z konta klienta trafia do agencji jak z linku dla klienta
            old, new = (row.data.get("approval") if row else None), data.get("approval")
            if row is not None and int(p.get("rev") or 0) == row.rev and new != old and new in ("accepted", "changes"):
                now, author = int(time.time() * 1000), user.name or user.email
                db.add(Comment(id=secrets.token_hex(8), post_id=pid, role="sys", author=author,
                               text="Zaakceptowano" if new == "accepted" else "Poproszono o zmiany", at=now))
                db.add(Notification(client_id=cid, post_id=pid, kind="accept" if new == "accepted" else "changes",
                                    author=author, text="", at=now))
                data["unread"] = True
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
            own(row.client_id)
            db.delete(row)
    for m in body.deleteMonths:
        row = db.get(MonthPlan, (own(m.get("clientId", "")), m.get("month", "")))
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
            for a in db.scalars(select(ClientAccess).where(ClientAccess.client_id == row.id)):
                db.delete(a)
            db.flush()
            db.delete(row)

    db.commit()
    cm = comments_by_post(db, [p.id for p in conflicts])
    return {"revs": revs, "conflicts": [post_json(p, cm[p.id], scope is not None) for p in conflicts]}


class CommentBody(BaseModel):
    text: str


@router.post("/api/posts/{post_id}/comments")
def add_comment(post_id: str, body: CommentBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    post = db.get(Post, _check_id(post_id))
    text = body.text.strip()
    scope = client_scope(db, user)
    if not post or (scope is not None and post.client_id != scope):
        raise HTTPException(404, "Najpierw zapisz treść.")
    if not text:
        raise HTTPException(400, "Komentarz jest pusty.")
    author, now = user.name or user.email, int(time.time() * 1000)
    c = Comment(id=secrets.token_hex(8), post_id=post.id, role="client" if scope else "agency", author=author,
                text=text[:5000], at=now)
    db.add(c)
    if scope:  # komentarz z konta klienta – powiadomienie pod dzwonkiem agencji
        db.add(Notification(client_id=post.client_id, post_id=post.id, kind="comment", author=author, text=text[:5000], at=now))
    db.commit()
    return comment_json(c)


@router.post("/api/media")
async def upload_media(file: UploadFile = File(...), name: str = Form(""),
                       _user: User = Depends(current_user), db: Session = Depends(get_db)):
    if file.content_type not in MEDIA_TYPES:
        raise HTTPException(400, "Obsługiwane są obrazy PNG, JPG, WEBP i GIF oraz dokumenty PDF.")
    data = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Plik jest większy niż {settings.max_upload_mb} MB.")
    m = Media(id=secrets.token_hex(16), content_type=file.content_type, name=(name or file.filename or "")[:300],
              size=len(data), data=data)
    db.add(m)
    db.commit()
    return {"id": m.id, "url": f"/media/{m.id}"}


EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf"}
MAX_ZIP_FILES = 30
MAX_ZIP_MB = 400


def _file_name(n: str, fallback: str) -> str:
    """Nazwa pliku do pobrania: bez znaków niedozwolonych w Windows/macOS, rozsądnej długości."""
    n = re.sub(r"[\\/:*?\"<>|\x00-\x1f]+", " ", n or "").strip(" .")
    n = re.sub(r"\s+", " ", n)[:90].strip()
    return n or fallback


def _attachment(name: str) -> str:
    ascii_name = name.encode("ascii", "ignore").decode() or "plik"
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(name)}"


@router.get("/media/{media_id}")
def get_media(media_id: str, dl: int = 0, n: str = "", db: Session = Depends(get_db)):
    m = db.get(Media, _check_id(media_id))
    if not m:
        raise HTTPException(404, "Nie ma takiego pliku.")
    headers = {"Cache-Control": "public, max-age=31536000, immutable"}
    if dl:  # pobranie oryginału bez zmian, z czytelną nazwą pliku
        headers["Content-Disposition"] = _attachment(f"{_file_name(n, 'grafika')}.{EXT.get(m.content_type, 'bin')}")
    return Response(m.data, media_type=m.content_type, headers=headers)


@router.get("/media-zip")
def media_zip(ids: str, n: str = "", db: Session = Depends(get_db)):
    """Wszystkie grafiki treści (np. karuzeli) w jednym pliku ZIP, w kolejności slajdów, bez ponownej kompresji."""
    id_list = [_check_id(i) for i in ids.split(",") if i][:MAX_ZIP_FILES]
    if not id_list:
        raise HTTPException(400, "Brak plików.")
    rows = {m.id: m for m in db.scalars(select(Media).where(Media.id.in_(id_list)))}
    files = [rows[i] for i in id_list if i in rows]
    if not files:
        raise HTTPException(404, "Nie ma takich plików.")
    if sum(m.size or len(m.data) for m in files) > MAX_ZIP_MB * 1024 * 1024:
        raise HTTPException(413, "Za dużo danych naraz – pobierz grafiki pojedynczo.")
    base = _file_name(n, "grafiki")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
        for i, m in enumerate(files, 1):
            z.writestr(f"{base} {i:02d}.{EXT.get(m.content_type, 'bin')}", m.data)
    return Response(buf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": _attachment(f"{base}.zip"), "Cache-Control": "no-store"})


# ---------- grafiki (projekty w systemie identyfikacji marki) ----------

BRAND_RE = re.compile(r"^[a-z0-9-]{2,40}$")


class DesignBody(BaseModel):
    brand: str
    data: dict[str, Any]


def design_json(d: Design) -> dict:
    return {**d.data, "id": d.id, "brand": d.brand, "updatedAt": int(d.updated_at.timestamp() * 1000)}


MARKI_JSON = Path(__file__).parent / "marki" / "marki.json"


def _pkey(s: str) -> str:
    """Jak pkey() w app.js: wielkie litery bez polskich znaków i odstępów."""
    s = unicodedata.normalize("NFD", str(s or "").upper().replace("Ł", "L"))
    return re.sub(r"[^A-Z0-9]", "", "".join(ch for ch in s if not unicodedata.combining(ch)))


def brands_for(db: Session, user: User) -> set[str] | None:
    """Marki projektów, które widzi konto klienta: jego system z pliku i wbudowany system jego marki (po nazwie)."""
    scope = client_scope(db, user)
    if scope is None:
        return None
    c = db.get(Client, scope)
    out = {f"k-{scope}"}
    try:
        name = _pkey(c.data.get("name"))
        out |= {b["id"] for b in json.loads(MARKI_JSON.read_text(encoding="utf-8")) if _pkey(b.get("nazwa")) and _pkey(b.get("nazwa")) in name}
    except (OSError, ValueError, KeyError, TypeError):
        pass
    return out


def _own_design(allowed: set[str] | None, brand: str) -> None:
    if allowed is not None and brand not in allowed:
        raise HTTPException(403, "To konto ma dostęp tylko do grafik swojego klienta.")


@router.get("/api/designs")
def list_designs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    allowed, q = brands_for(db, user), select(Design).order_by(Design.updated_at.desc())
    if allowed is not None:
        q = q.where(Design.brand.in_(allowed))
    return [design_json(d) for d in db.scalars(q)]


@router.put("/api/designs/{design_id}")
def save_design(design_id: str, body: DesignBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not BRAND_RE.match(body.brand):
        raise HTTPException(400, "Niepoprawna marka.")
    allowed = brands_for(db, user)
    _own_design(allowed, body.brand)
    if len(json.dumps(body.data)) > 200_000:
        raise HTTPException(413, "Projekt jest za duży.")
    data = {k: v for k, v in body.data.items() if k not in ("id", "brand", "updatedAt")}
    d = db.get(Design, _check_id(design_id))
    if d:
        _own_design(allowed, d.brand)
        d.brand, d.data = body.brand, data
    else:
        d = Design(id=design_id, brand=body.brand, data=data)
        db.add(d)
    db.commit()
    db.refresh(d)
    return design_json(d)


@router.delete("/api/designs/{design_id}")
def delete_design(design_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    d = db.get(Design, _check_id(design_id))
    if d:
        _own_design(brands_for(db, user), d.brand)
        db.delete(d)
        db.commit()
    return {"ok": True}


# ---------- zespół ----------

class NewUser(BaseModel):
    email: str
    name: str = ""
    password: str
    role: str = "member"
    clientId: str = ""  # dla roli client: jedyny klient, którego to konto widzi


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
    access = {a.user_id: a.client_id for a in db.scalars(select(ClientAccess))}
    return [user_json(u, access.get(u.id)) for u in db.scalars(select(User).order_by(User.name))]


@router.post("/api/users")
def create_user(body: NewUser, _admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(400, "Niepoprawny adres e-mail.")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Konto z tym adresem już istnieje.")
    validate_password(body.password)
    role = body.role if body.role in ("admin", "client") else "member"
    if role == "client" and not (ID_RE.match(body.clientId or "") and db.get(Client, body.clientId)):
        raise HTTPException(400, "Wybierz klienta, do którego ma dostęp to konto.")
    u = User(email=email, name=body.name.strip() or email, role=role, password_hash=hash_password(body.password))
    db.add(u)
    db.flush()
    if role == "client":
        db.add(ClientAccess(user_id=u.id, client_id=body.clientId))
    db.commit()
    return user_json(u, body.clientId if role == "client" else None)


@router.patch("/api/users/{user_id}")
def update_user(user_id: int, body: UserPatch, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "Nie ma takiego konta.")
    if u.id == admin.id and (body.active is False or body.role == "member"):
        raise HTTPException(400, "Nie możesz odebrać uprawnień ani wyłączyć własnego konta.")
    if body.name is not None:
        u.name = body.name.strip() or u.email
    if body.role in ("admin", "member") and u.role != "client":  # konto klienta zostaje kontem klienta
        u.role = body.role
    if body.active is not None:
        u.active = body.active
    if body.password:
        validate_password(body.password)
        u.password_hash = hash_password(body.password)
    db.commit()
    acc = db.get(ClientAccess, u.id)
    return user_json(u, acc.client_id if acc else None)


@router.post("/api/me/password")
def change_password(body: PasswordChange, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current, user.password_hash):
        raise HTTPException(400, "Obecne hasło jest nieprawidłowe.")
    validate_password(body.new)
    user.password_hash = hash_password(body.new)
    db.commit()
    return {"ok": True}
