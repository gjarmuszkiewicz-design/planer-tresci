# Planer treści – plan social media dla klientów agencji

Jedno miejsce na plany treści wszystkich klientów: tabela jak w Excelu, kalendarz, podgląd postów jak w aplikacjach
(Instagram, Facebook, LinkedIn) i link dla klienta do akceptacji. Bez tworzenia treści i bez automatycznej publikacji.

## Co potrafi

| Obszar | Co robi |
|---|---|
| **Pulpit** | Treści w tym miesiącu, czekające na akceptację, uwagi klientów, po terminie; publikacje na 7 dni; postęp każdego klienta |
| **Plan (tabela)** | Tygodnie z tematem tygodnia, rezerwa, uwagi operacyjne. Widok „Zwięzły” albo „Jak w Excelu” (wszystkie kolumny). Filtry: miesiąc, kanał, status, szukaj. Status publikacji przełączany jednym kliknięciem |
| **Kalendarz** | Miesiąc z tematami tygodni i kolorami filarów, przeciąganie treści na inny dzień (także z rezerwy) |
| **Edytor treści** | Kanały FB + IG i/lub LinkedIn z osobnym opisem dla LinkedIna, CTA, hashtagi, oznaczenia, tekst na grafice, brief dla grafika, pytanie „do potwierdzenia” dla klienta, notatka wewnętrzna, komentarze |
| **Podgląd** | Jak w aplikacjach: karuzela Instagrama (przycięta do proporcji 1. slajdu), kolaż Facebooka jak w Meta, dokument LinkedIn z numerem strony, Rolka, Relacja. Galeria pełnoekranowa i ostrzeżenia o limitach i przycinaniu |
| **Profil klienta** | Konta, zasady publikacji, ton, stałe hashtagi, filary z opisem (cel, grupa, co publikujemy, przykłady) |
| **Panel klienta** | Link `/p/<token>` bez logowania: plan z tematami tygodni, podgląd każdej treści, „Akceptuję” / „Poproś o zmiany”, komentarze. Serwer nie wysyła klientowi szkiców, notatek wewnętrznych ani ustawień agencji |
| **Import z Excela** | Rozpoznaje nasze plany (układ Lion i see, arkusz LinkedIn, „Opis filarów”), grafiki wklejone w arkusz, tygodnie, rezerwę i uwagi; podgląd przed importem z dopasowaniem kolumn |
| **Eksport do Excela** | Plan w podobnym układzie: tygodnie, rezerwa, uwagi, miniatury grafik |
| **Zespół** | Konta osób z agencji (administrator dodaje osoby, ustawia hasła, wyłącza konta) |

Zmiany zapisują się same (stan widać na dole menu: „✓ Zapisano”). Jeśli klient zaakceptuje treść, gdy ktoś z zespołu
ma ją otwartą, zapis nie nadpisze akceptacji – panel wczyta aktualną wersję i pokaże komunikat.

## Wdrożenie na Railway

1. **GitHub:** utwórz repozytorium `gjarmuszkiewicz-design/planer-tresci` i wypchnij ten folder.
2. **Railway → New Project → Deploy from GitHub repo** → wybierz repozytorium. Railway sam wykryje `Dockerfile`.
3. W projekcie dodaj usługę **PostgreSQL** (**+ New → Database → PostgreSQL**). W usłudze aplikacji, w zakładce
   **Variables**, dodaj referencję `DATABASE_URL` do bazy (Railway podpowiada ją w **Add Reference**).
4. W **Variables** aplikacji ustaw:
   - `SECRET_KEY` – długi losowy ciąg (np. wynik `openssl rand -hex 32`),
   - `COOKIE_SECURE=1`,
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (min. 8 znaków), `ADMIN_NAME` – pierwsze konto administratora.
     Tworzy się przy pierwszym starcie, gdy baza jest pusta. Później zmienne można usunąć, a hasło zmienić w panelu (🔑).
5. **Settings → Networking → Generate Domain**. Otwórz adres, zaloguj się i dodaj zespół w menu **Zespół**.

Uruchamiaj w **jednej instancji** (ustawione w `railway.json`). Kopie zapasowe bazy (w tym grafik) robi Railway
w usłudze PostgreSQL (**Backups**).

## Uruchomienie lokalne

Potrzebny jest [uv](https://docs.astral.sh/uv/) (sam pobierze Pythona 3.12). Bez `DATABASE_URL` aplikacja użyje pliku SQLite.

```bash
ADMIN_EMAIL=ja@agencja.pl ADMIN_PASSWORD=haslo-lokalne uv run --python 3.12 --no-project --with-requirements requirements.txt uvicorn app.main:app --reload
```

Otwórz http://localhost:8000.

## Testy

```bash
uv run --python 3.12 --no-project --with-requirements requirements.txt --with pytest --with httpx python -m pytest
```

Testy sprawdzają logowanie, zapis planu, ochronę przed nadpisaniem akceptacji klienta, panel klienta (co klient widzi,
a czego nie), akcje klienta, wgrywanie grafik, zarządzanie zespołem i blokadę żądań z obcych stron.

## Struktura

```
app/
  main.py      aplikacja: logowanie, strony, nagłówki bezpieczeństwa
  api.py       API panelu agencji: stan, zapis zmian (/api/sync), komentarze, grafiki, zespół
  portal.py    panel klienta /p/<token> – tylko dane widoczne dla klienta
  auth.py      hasła (scrypt), sesja, konto administratora ze zmiennych
  models.py    tabele: users, clients, posts, month_plans, comments, media
  static/      interfejs (app.js, app.css, index.html)
tests/         testy przepływu
```

Klient, treść i plan miesiąca trzymają swoje pola w kolumnie JSON, więc nowe pole w formularzu nie wymaga migracji bazy.
Grafiki są w tabeli `media` w PostgreSQL; adres `/media/<id>` jest publiczny (potrzebny w panelu klienta),
ale identyfikator jest losowy i nie do zgadnięcia.
