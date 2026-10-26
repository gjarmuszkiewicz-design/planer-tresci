"""Planer treści – aplikacja webowa (FastAPI)."""
from __future__ import annotations

import html
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, Form, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from . import api, portal
from .auth import authenticate, bootstrap_admin, login_blocked, login_failed
from .config import settings
from .db import get_db, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

STATIC = Path(__file__).parent / "static"
INDEX = STATIC / "index.html"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    bootstrap_admin()
    yield


app = FastAPI(title="Planer treści", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.middleware("http")
async def security(request: Request, call_next):
    # zmiany danych tylko z naszej strony (ochrona przed CSRF z obcych witryn)
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        hosts = {request.headers.get("host"), request.headers.get("x-forwarded-host")}
        if origin and urlparse(origin).netloc not in hosts:
            return JSONResponse({"detail": "Żądanie z obcej strony."}, status_code=403)
    response = await call_next(request)
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


# SessionMiddleware dodany po middleware bezpieczeństwa, więc działa wcześniej (owija go)
app.add_middleware(
    SessionMiddleware, secret_key=settings.secret_key, session_cookie="planer_session",
    max_age=60 * 60 * 24 * 30, same_site="lax", https_only=settings.cookie_secure,
)

app.include_router(api.router)
app.include_router(portal.router)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/robots.txt")
def robots():
    return HTMLResponse("User-agent: *\nDisallow: /\n", media_type="text/plain")


def _index() -> FileResponse:
    return FileResponse(INDEX, headers={"Cache-Control": "no-cache"})


@app.get("/")
def home(request: Request):
    if not request.session.get("uid"):
        return RedirectResponse("/login", status_code=303)
    return _index()


@app.get("/p/{token}")
def client_panel(token: str):
    return _index()


LOGIN_PAGE = """<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Logowanie – Planer treści</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f6f8;font-family:Inter,system-ui,sans-serif;color:#1b1f2a;padding:16px;box-sizing:border-box}}
form{{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px;width:100%;max-width:360px;box-shadow:0 1px 3px rgba(16,24,40,.08)}}
.brand{{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px;margin-bottom:20px}}
.logo{{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#ec4899);display:grid;place-items:center;color:#fff}}
label{{display:block;font-size:12px;font-weight:600;color:#4b5563;margin:12px 0 5px}}
input{{width:100%;box-sizing:border-box;border:1px solid #e5e7eb;border-radius:8px;padding:9px 11px;font:inherit}}
input:focus{{outline:none;border-color:#a5b4fc;box-shadow:0 0 0 3px #e0e7ff}}
button{{margin-top:18px;width:100%;border:0;border-radius:8px;padding:10px;background:#4f46e5;color:#fff;font:inherit;font-weight:600;cursor:pointer}}
.err{{background:#fee2e2;color:#b91c1c;border-radius:8px;padding:8px 10px;font-size:13px;margin-bottom:6px}}
</style></head><body>
<form method="post" action="/login">
<div class="brand"><div class="logo">✦</div>Planer treści</div>
{error}
<label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" required value="{email}" autofocus>
<label for="password">Hasło</label><input id="password" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Zaloguj się</button>
</form></body></html>"""


def _login_page(error: str = "", email: str = "", status: int = 200) -> HTMLResponse:
    err = f'<div class="err">{html.escape(error)}</div>' if error else ""
    return HTMLResponse(LOGIN_PAGE.format(error=err, email=html.escape(email)), status_code=status)


@app.get("/login")
def login_form(request: Request):
    if request.session.get("uid"):
        return RedirectResponse("/", status_code=303)
    return _login_page()


@app.post("/login")
def login(request: Request, email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "?"
    if login_blocked(ip):
        return _login_page("Za dużo nieudanych prób. Spróbuj ponownie za kilka minut.", email, 429)
    user = authenticate(db, email, password)
    if not user:
        login_failed(ip)
        return _login_page("Nieprawidłowy e-mail lub hasło.", email, 401)
    request.session.clear()
    request.session["uid"] = user.id
    return RedirectResponse("/", status_code=303)


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)
