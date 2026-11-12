"""Testy całego przepływu: logowanie, zapis planu, konflikt wersji, panel klienta i jego ograniczenia."""
from __future__ import annotations

import json
import os
import tempfile

_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_db.name}"
os.environ["ADMIN_EMAIL"] = "admin@agencja.pl"
os.environ["ADMIN_PASSWORD"] = "tajne-haslo-1"
os.environ["ADMIN_NAME"] = "Ania Admin"
os.environ["DEMO_CLIENT"] = "0"

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
                     "contact": "Anna", "links": [{"name": "TAJNE wyceny", "url": "https://example.com/wyceny"}], "pillars": [{"id": "p1", "name": "Produkt", "color": "#000", "goal": "sprzedaż"}]}],
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
    assert "links" not in c and "brand" not in c  # linki do materiałów i ustawienia Grafik są tylko dla agencji
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


def test_notifications_bell(client):
    n = client.get("/api/notifications").json()
    # akceptacja z poprzedniego testu jest pod dzwonkiem
    assert n["unread"] == 1
    item = n["items"][0]
    assert item["kind"] == "accept" and item["author"] == "Anna Nowak" and item["postId"] == "post0001"
    assert client.get("/api/state").json()["notifications"]["unread"] == 1
    # po otwarciu dzwonka licznik się zeruje, a lista zostaje
    seen = client.post("/api/notifications/seen").json()
    assert seen["unread"] == 0 and len(seen["items"]) == 1
    # kolejna uwaga klienta znowu podbija licznik
    TestClient(app).post(f"/api/p/{TOKEN}/posts/post0001", json={"kind": "comment", "text": "Jeszcze jedno", "author": "Anna Nowak"})
    n = client.get("/api/notifications").json()
    assert n["unread"] == 1 and n["items"][0]["kind"] == "comment" and n["items"][0]["text"] == "Jeszcze jedno"
    # licznik jest osobny dla każdej osoby z zespołu
    assert TestClient(app).get("/api/notifications").status_code == 401


def test_media_upload(client):
    r = client.post("/api/media", files={"file": ("a.png", PNG, "image/png")}, data={"name": "a.png"})
    assert r.status_code == 200
    url = r.json()["url"]
    got = TestClient(app).get(url)  # adres grafiki działa bez logowania (panel klienta)
    assert got.status_code == 200 and got.content == PNG
    assert client.post("/api/media", files={"file": ("a.txt", b"x", "text/plain")}).status_code == 400


def test_media_download_original_and_zip(client):
    import io
    import zipfile
    jpg = b"\xff\xd8\xff\xe0" + bytes(range(256)) * 40  # bajty muszą wrócić bez zmian
    ids = []
    for name, data, ct in (("a.png", PNG, "image/png"), ("b.jpg", jpg, "image/jpeg")):
        r = client.post("/api/media", files={"file": (name, data, ct)}, data={"name": name})
        ids.append(r.json()["id"])
    pub = TestClient(app)  # pobieranie działa też w panelu klienta (bez logowania)
    r = pub.get(f"/media/{ids[1]}", params={"dl": 1, "n": "Kawiarnia 2026-11-06 Post: SEO/ąę"})
    assert r.status_code == 200 and r.content == jpg
    cd = r.headers["content-disposition"]
    assert cd.startswith("attachment;") and ".jpg" in cd and "/" not in cd.split("filename*=")[1].replace("%2F", "")
    r = pub.get("/media-zip", params={"ids": ",".join(ids), "n": "Karuzela"})
    assert r.status_code == 200 and r.headers["content-type"] == "application/zip"
    z = zipfile.ZipFile(io.BytesIO(r.content))
    assert z.namelist() == ["Karuzela 01.png", "Karuzela 02.jpg"]
    assert z.read("Karuzela 02.jpg") == jpg
    assert pub.get("/media-zip", params={"ids": "../etc"}).status_code in (400, 404)


def test_designs_and_brand_files_only_for_agency(client):
    anon = TestClient(app)
    assert anon.get("/marki/wizme/marka.js").status_code == 401
    assert anon.get("/marki/wizme/zdjecia/olaf.jpg").status_code == 401
    assert anon.get("/api/designs").status_code == 401
    assert anon.put("/api/designs/proj0001", json={"brand": "wizme", "data": {}}).status_code == 401

    assert client.get("/marki/wizme/marka.js").status_code == 200
    assert client.get("/marki/wizme/przyklady.json").json()["zbiory"]
    assert client.get("/marki/../app/config.py").status_code == 404
    assert client.get("/marki/%2e%2e/config.py").status_code == 404

    r = client.put("/api/designs/proj0001", json={"brand": "wizme", "data": {"name": "Okładka", "format": "post", "typ": "tekst"}})
    assert r.status_code == 200 and r.json()["name"] == "Okładka"
    client.put("/api/designs/proj0001", json={"brand": "wizme", "data": {"name": "Okładka 2", "format": "story", "typ": "tekst"}})
    items = client.get("/api/designs").json()
    assert [(d["id"], d["name"], d["format"]) for d in items] == [("proj0001", "Okładka 2", "story")]
    assert client.put("/api/designs/proj0002", json={"brand": "Zła marka!", "data": {}}).status_code == 400
    assert client.delete("/api/designs/proj0001").status_code == 200
    assert client.get("/api/designs").json() == []


def test_client_brand_system_file(client):
    # wspólny układ pliku systemu identyfikacji: wzór i szablony tylko dla zespołu, plik klienta nie trafia do panelu klienta
    anon = TestClient(app)
    assert anon.get("/marki/wspolny/wzor-system-social.json").status_code == 401
    assert anon.get("/marki/wspolny/system.js").status_code == 401
    wzor = client.get("/marki/wspolny/wzor-system-social.json").json()
    assert wzor["typ"] == "system-social" and wzor["wersja"] == 2
    assert client.get("/marki/wspolny/wzor-system-social-v1.json").json()["wersja"] == 1
    assert {"ciemny", "jasny", "akcent", "tlo"} <= set(wzor["kolory"]) and wzor["fonty"]["tytul"]["rodzina"]
    assert "systemZPliku" in client.get("/marki/wspolny/system.js").text
    client.post("/api/sync", json={"clients": [{"id": "klient01", "token": TOKEN, "name": "Kawiarnia", "brand": "plik",
                                                "system": {**wzor, "marka": {"nazwa": "TAJNY system"}}}]})
    assert "TAJNY" not in TestClient(app).get(f"/api/p/{TOKEN}").text
    # projekty z własnego systemu klienta mają markę k-<id klienta>
    assert client.put("/api/designs/proj0003", json={"brand": "k-klient01", "data": {"format": "post", "typ": "okladka"}}).status_code == 200


VALIDATOR_JS = r"""
const fs = require('fs'); global.window = {};
eval(fs.readFileSync('app/marki/wspolny/system.js', 'utf8'));
const base = f => JSON.parse(fs.readFileSync('app/marki/wspolny/' + f, 'utf8'));
const ok = o => !window.sprawdzSystem(o).blad;
const v2 = base('wzor-system-social.json'), zmien = f => { const o = JSON.parse(JSON.stringify(v2)); f(o); return o; };
const brand = window.systemZPliku({ ...window.sprawdzSystem(zmien(o => { o.tla.dozwolone = ['ciemne', 'jasne']; })).system, wczytano: 1 }, 'k-x');
console.log(JSON.stringify({
  v1: ok(base('wzor-system-social-v1.json')), v2: ok(v2), v3: ok(zmien(o => { o.wersja = 3; })),
  zlaStopa: ok(zmien(o => { o.zlozone.tloCiemne.stopy[0][0] = 'red'; })),
  ksztaltSrednik: ok(zmien(o => { o.zlozone.tloCiemne.ksztalt = 'ellipse 50%; color:red'; })),
  ksztaltUrl: ok(zmien(o => { o.zlozone.tloCiemne.ksztalt = 'url(https://x/a.png)'; })),
  akcent: ok(zmien(o => { o.fonty.akcent = 'migotanie'; })),
  tla: brand.pola.tlo.opcje.map(x => x[0]),
  css: /radial-gradient\(ellipse 80% 60% at 50% 40%/.test(brand.css),
}));
"""


def test_system_file_validator_v1_v2():
    import json
    import shutil
    import subprocess
    from pathlib import Path

    node = shutil.which("node")
    if not node:
        pytest.skip("brak Node.js")
    root = Path(__file__).resolve().parents[1]
    out = json.loads(subprocess.run([node, "-e", VALIDATOR_JS], cwd=root, capture_output=True, text=True, check=True).stdout)
    assert out == {"v1": True, "v2": True, "v3": False, "zlaStopa": False, "ksztaltSrednik": False, "ksztaltUrl": False,
                   "akcent": False, "tla": ["ciemne", "jasne"], "css": True}


def test_ai_assistant(client, monkeypatch):
    from types import SimpleNamespace

    from app import ai

    anon = TestClient(app)
    assert anon.post("/api/ai/plan", json={"clientId": "klient01", "month": "2026-10"}).status_code == 401
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert client.get("/api/ai/status").json()["enabled"] is False
    assert client.post("/api/ai/plan", json={"clientId": "klient01", "month": "2026-10"}).status_code == 503

    # podmieniony klient Claude: sprawdzamy, co wysyłamy, i zwracamy gotowy JSON
    sent = {}
    reply = {}

    class Stream:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get_final_message(self):
            return SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text=json.dumps(reply))])

    def stream(**kw):
        sent.update(kw)
        return Stream()

    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    monkeypatch.setattr(ai, "_client", SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(stream=stream))))
    client.post("/api/sync", json={"clients": [{"id": "klient01", "token": TOKEN, "name": "Kawiarnia", "notes": "TAJNE notatki agencji",
                                                "strategyDoc": "TAJNA strategia: kawa speciality",
                                                "pillars": [{"id": "p1", "name": "Produkt", "color": "#000", "goal": "sprzedaż"}]}]})

    reply.update({"summary": "Plan", "weeks": [{"monday": "2026-10-05", "theme": "Kawa"}, {"monday": "1999-01-01", "theme": "x"}],
                  "posts": [{"date": "2026-10-08", "meta": True, "li": True, "format": "Post", "pillar": "Produkt", "title": "Nowa kawa",
                             "brief": "b", "materialBrief": "m", "toConfirm": ""},
                            {"date": "2026-12-01", "meta": False, "li": False, "format": "Rolka", "pillar": "Nieistniejący", "title": "Poza miesiącem",
                             "brief": "", "materialBrief": "", "toConfirm": ""}]})
    r = client.post("/api/ai/plan", json={"clientId": "klient01", "month": "2026-10", "count": 2, "meta": True, "li": False})
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["weeks"] == {"2026-10-05": "Kawa"}
    assert out["posts"][0]["li"] is False and out["posts"][0]["pillar"] == "Produkt"
    assert out["posts"][1]["date"] == "" and out["posts"][1]["pillar"] == "" and out["posts"][1]["meta"] is True
    assert sent["model"] == "claude-opus-5-5" and sent["output_config"]["format"]["type"] == "json_schema"
    profile = sent["system"][1]["text"]
    assert "TAJNA strategia" in profile and "Produkt" in profile and "Zmieniony" in sent["messages"][0]["content"][-1]["text"]

    reply.clear()
    reply.update({k: f"nowe {k}" for k in ai.WRITE_FIELDS})
    r = client.post("/api/ai/write", json={"clientId": "klient01", "post": {"title": "Nowa kawa", "pillar": "Produkt", "meta": True}})
    assert r.status_code == 200 and r.json()["copyMeta"] == "nowe copyMeta"
    assert client.post("/api/ai/write", json={"clientId": "brak", "post": {}}).status_code == 404

    assert client.post("/api/ai/strategy", files={"file": ("s.txt", b"tekst", "text/plain")}).status_code == 400
    reply.clear()
    reply.update({"summary": "S", "audience": "", "tone": "", "freq": "", "strategy": "", "hashtags": "", "pillars": []})
    r = client.post("/api/ai/strategy", files={"file": ("s.pdf", b"%PDF-1.4 test", "application/pdf")})
    assert r.status_code == 200 and r.json()["summary"] == "S"
    assert sent["messages"][0]["content"][0]["type"] == "document"

    # strategia i notatki nie trafiają do panelu klienta
    assert "TAJNA" not in TestClient(app).get(f"/api/p/{TOKEN}").text


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


def test_demo_client_seeded_only_into_empty_db(client, monkeypatch):
    from sqlalchemy import delete

    from app.config import settings
    from app.db import SessionLocal
    from app.demo import POSTS, seed_demo_client
    from app.models import Client as ClientRow

    with SessionLocal() as db:
        db.execute(delete(ClientRow))
        db.commit()
    monkeypatch.setattr(settings, "demo_client", True)
    seed_demo_client()
    seed_demo_client()  # druga próba nic nie dodaje
    login(client)
    state = client.get("/api/state").json()
    assert len(state["clients"]) == 1
    assert len(state["posts"]) == len(POSTS)
    assert len(state["notifications"]["items"]) == 2
    token = state["clients"][0]["token"]
    portal = client.get(f"/api/p/{token}").json()
    assert all(p["approval"] != "draft" for p in portal["posts"])
    assert "notes" not in portal["clients"][0]
