"""Testy całego przepływu: logowanie, zapis planu, konflikt wersji, panel klienta i jego ograniczenia."""
from __future__ import annotations

import os
import tempfile

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_db.name}"
os.environ["ADMIN_EMAIL"] = "admin@agencja.pl"
os.environ["ADMIN_PASSWORD"] = "tajne-haslo-1"
os.environ["ADMIN_NAME"] = "Ania Admin"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

TOKEN = "a" * 24
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def login(c: TestClient, email="admin@agencja.pl", password="tajne-haslo-1"):
    return c.post("/login", data={"email": email, "password": password}, follow_redirects=False)


def seed(c: TestClient):
    body = {
        "clients": [{"id": "klient01", "token": TOKEN, "name": "Kawiarnia", "notes": "TAJNE notatki agencji",
                     "contact": "Anna", "pillars": [{"id": "p1", "name": "Produkt", "color": "#000", "goal": "sprzedaż"}]}],
        "months": [{"clientId": "klient01", "month": "2026-10", "weeks": {"2026-10-05": "Tydzień kawy"}, "notes": "Uwagi do planu"}],
        "posts": [
            {"id": "post0001", "clientId": "klient01", "date": "2026-10-06", "title": "Gotowy post", "approval": "pending",
             "note": "notatka wewnętrzna", "copyMeta": "Opis", "media": []},
            {"id": "post0002", "clientId": "klient01", "date": "2026-10-07", "title": "Szkic", "approval": "draft", "media": []},
        ],
    }
    r = c.post("/api/sync", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_requires_login(client):
    assert client.get("/", follow_redirects=False).headers["location"] == "/login"
    assert client.get("/api/state").status_code == 401
    assert client.post("/api/sync", json={}).status_code == 401


def test_wrong_password(client):
    r = login(client, password="zle")
    assert r.status_code == 401
    assert "Nieprawidłowy" in r.text


def test_login_and_sync(client):
    assert login(client).status_code == 303
    assert client.get("/").status_code == 200
    res = seed(client)
    assert res["revs"] == {"post0001": 1, "post0002": 1}
    state = client.get("/api/state").json()
    assert state["user"]["name"] == "Ania Admin"
    assert {p["id"] for p in state["posts"]} == {"post0001", "post0002"}
    assert state["months"][0]["weeks"] == {"2026-10-05": "Tydzień kawy"}


def test_update_and_conflict(client):
    ok = client.post("/api/sync", json={"posts": [{"id": "post0001", "clientId": "klient01", "rev": 1, "title": "Zmieniony",
                                                   "approval": "pending", "date": "2026-10-06"}]}).json()
    assert ok["revs"]["post0001"] == 2 and not ok["conflicts"]
    # ktoś wysyła starą wersję (rev 1) – serwer jej nie przyjmuje i odsyła aktualną
    stale = client.post("/api/sync", json={"posts": [{"id": "post0001", "clientId": "klient01", "rev": 1, "title": "Stary"}]}).json()
    assert stale["revs"] == {}
    assert stale["conflicts"][0]["title"] == "Zmieniony" and stale["conflicts"][0]["rev"] == 2


def test_agency_comment(client):
    r = client.post("/api/posts/post0001/comments", json={"text": "Poprawiłem opis"})
    assert r.status_code == 200 and r.json()["author"] == "Ania Admin"
    assert client.post("/api/posts/nieistnieje/comments", json={"text": "x"}).status_code == 404


def test_portal_hides_internal_data(client):
    anon = TestClient(app)
    assert anon.get(f"/p/{TOKEN}").status_code == 200
    data = anon.get(f"/api/p/{TOKEN}").json()
    ids = [p["id"] for p in data["posts"]]
    assert ids == ["post0001"]  # szkic niewidoczny
    assert "note" not in data["posts"][0]
    c = data["clients"][0]
    assert c["name"] == "Kawiarnia" and "notes" not in c and "contact" not in c
    assert data["months"][0]["notes"] == "Uwagi do planu"
    assert "TAJNE" not in anon.get(f"/api/p/{TOKEN}").text
    assert anon.get("/api/p/" + "b" * 24).status_code == 404
    assert anon.get("/api/state").status_code == 401


def test_portal_actions(client):
    anon = TestClient(app)
    url = f"/api/p/{TOKEN}/posts/post0001"
    assert anon.post(url, json={"kind": "changes", "text": "", "author": "Anna"}).status_code == 400
    assert anon.post(url, json={"kind": "accept", "author": ""}).status_code == 400
    r = anon.post(url, json={"kind": "accept", "text": "Super!", "author": "Anna Nowak"})
    assert r.status_code == 200
    p = r.json()
    assert p["approval"] == "accepted"
    assert [c["role"] for c in p["comments"]][-2:] == ["client", "sys"]
    # szkicu nie da się zaakceptować z linku klienta
    assert anon.post(f"/api/p/{TOKEN}/posts/post0002", json={"kind": "accept", "author": "Anna"}).status_code == 404
    # agencja widzi akceptację, nieprzeczytaną uwagę i nową wersję
    post = next(x for x in client.get("/api/state").json()["posts"] if x["id"] == "post0001")
    assert post["approval"] == "accepted" and post["unread"] is True and post["rev"] == 3


def test_media_upload(client):
    r = client.post("/api/media", files={"file": ("a.png", PNG, "image/png")}, data={"name": "a.png"})
    assert r.status_code == 200
    url = r.json()["url"]
    got = TestClient(app).get(url)  # adres grafiki działa bez logowania (panel klienta)
    assert got.status_code == 200 and got.content == PNG
    assert client.post("/api/media", files={"file": ("a.txt", b"x", "text/plain")}).status_code == 400


def test_cross_site_post_blocked(client):
    r = client.post("/api/sync", json={}, headers={"Origin": "https://zla-strona.pl"})
    assert r.status_code == 403


def test_team_management(client):
    r = client.post("/api/users", json={"email": "Ola@agencja.pl", "name": "Ola", "password": "haslo-oli-1"})
    assert r.status_code == 200 and r.json()["role"] == "member"
    assert client.post("/api/users", json={"email": "ola@agencja.pl", "password": "haslo-oli-1"}).status_code == 409
    assert client.post("/api/users", json={"email": "x@y.pl", "password": "krotkie"}).status_code == 400
    ola = TestClient(app)
    assert login(ola, "ola@agencja.pl", "haslo-oli-1").status_code == 303
    assert ola.get("/api/state").status_code == 200
    assert ola.get("/api/users").status_code == 403  # zwykły członek zespołu nie zarządza kontami
    uid = r.json()["id"]
    assert client.patch(f"/api/users/{uid}", json={"active": False}).status_code == 200
    assert ola.get("/api/state").status_code == 401  # wyłączone konto traci dostęp od razu
    me = client.get("/api/me").json()
    assert client.patch(f"/api/users/{me['id']}", json={"active": False}).status_code == 400


def test_change_password(client):
    assert client.post("/api/me/password", json={"current": "zle", "new": "nowe-haslo-12"}).status_code == 400
    assert client.post("/api/me/password", json={"current": "tajne-haslo-1", "new": "nowe-haslo-12"}).status_code == 200
    fresh = TestClient(app)
    assert login(fresh, password="nowe-haslo-12").status_code == 303


def test_delete_client_cascades(client):
    r = client.post("/api/sync", json={"deleteClients": ["klient01"]})
    assert r.status_code == 200
    state = client.get("/api/state").json()
    assert state["clients"] == [] and state["posts"] == [] and state["months"] == []
    assert TestClient(app).get(f"/api/p/{TOKEN}").status_code == 404
