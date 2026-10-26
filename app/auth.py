"""Konta zespołu: hasła, sesja, uprawnienia."""
from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
import time
from collections import defaultdict

from fastapi import Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal, get_db
from .models import User

log = logging.getLogger(__name__)

_N, _R, _P = 2**14, 8, 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        kind, salt, digest = stored.split("$")
    except ValueError:
        return False
    if kind != "scrypt":
        return False
    check = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=_N, r=_R, p=_P, dklen=32)
    return hmac.compare_digest(check.hex(), digest)


def validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(400, "Hasło musi mieć co najmniej 8 znaków.")


def bootstrap_admin() -> None:
    """Pierwsze konto administratora ze zmiennych ADMIN_EMAIL i ADMIN_PASSWORD (tylko przy pustej bazie)."""
    with SessionLocal() as db:
        if db.scalar(select(func.count(User.id))):
            return
        if not settings.admin_email or not settings.admin_password:
            log.warning("Brak użytkowników. Ustaw ADMIN_EMAIL i ADMIN_PASSWORD, aby utworzyć konto administratora.")
            return
        db.add(User(email=settings.admin_email, name=settings.admin_name, role="admin",
                    password_hash=hash_password(settings.admin_password)))
        db.commit()
        log.info("Utworzono konto administratora %s", settings.admin_email)


# proste ograniczenie prób logowania: 8 nieudanych prób na 10 minut z jednego adresu
_failures: dict[str, list[float]] = defaultdict(list)
_WINDOW, _LIMIT = 600, 8


def login_blocked(ip: str) -> bool:
    now = time.time()
    _failures[ip] = [t for t in _failures[ip] if now - t < _WINDOW]
    return len(_failures[ip]) >= _LIMIT


def login_failed(ip: str) -> None:
    _failures[ip].append(time.time())


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if not user or not user.active or not verify_password(password, user.password_hash):
        return None
    return user


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    uid = request.session.get("uid")
    user = db.get(User, uid) if uid else None
    if not user or not user.active:
        request.session.clear()
        raise HTTPException(401, "Zaloguj się ponownie.")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Tylko administrator może to zrobić.")
    return user


def user_json(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "active": u.active}
