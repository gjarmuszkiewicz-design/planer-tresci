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
| **Import z Excela** | Wspólny schemat (niżej) oraz starsze plany (układ Lion i see, arkusz LinkedIn, „Opis filarów”), grafiki wklejone w arkusz, tygodnie, rezerwę i uwagi; podgląd przed importem z dopasowaniem kolumn |
| **Eksport do Excela** | Plik we wspólnym schemacie, z miniaturami grafik. Przycisk „Pusty szablon” daje ten sam układ bez treści, z filarami klienta |

### Wspólny schemat pliku Excel (import i eksport)

Ten sam plik można wyeksportować, poprawić w Excelu i zaimportować z powrotem. Układ odpowiada szablonowi
„Harmonogram Publikacji”.

| Zakładka | Zawartość |
|---|---|
| **`<Miesiąc rok>`**, np. „Czerwiec 2026” | Plan Facebook + Instagram: tytuł, kanał, linia „FILARY KOMUNIKACJI”, nagłówki, pasy „TYDZIEŃ n: DATA: … \| TEMAT: …”, treści, REZERWA, LEGENDA, STRUKTURA — FILARY KOMUNIKACJI, UWAGI OPERACYJNE |
| **`LinkedIn – <Miesiąc rok>`** | Ten sam układ dla LinkedIna (osobny opis) |
| **Opis filarów** | Wstęp „jak filary współgrają”, PROPORCJE I RYTM (zasady, ton, grupa docelowa, hashtagi), a dla każdego filara: opis, cel, grupa docelowa, co publikujemy, przykłady, czego unikać, rekomendacje |

Kolumny planu: **A–K** jak w szablonie agencji – DATA, FORMAT, FILAR, TEMAT, OPIS POSTA (założenie), TREŚĆ POSTA
(opis do publikacji), CTA, OZNACZENIA, HASZTAGI, MATERIAŁ — OPIS, MATERIAŁ — PLIKI / LINKI. **L–Q** (fioletowy
nagłówek) to dane z planera: GODZINA, TEKST NA GRAFICE, DO POTWIERDZENIA, STATUS AKCEPTACJI, UWAGI KLIENTA, PUBLIKACJA.
**R** (ukryta) to ID TREŚCI: wiersz z zakładki FB + IG i wiersz z zakładki LinkedIn o tym samym ID (albo tej samej
dacie i temacie) stają się jedną treścią na obu kanałach. W kolumnie DATA zamiast daty można wpisać „W TYGODNIU”
(dzień do ustalenia) albo „REZERWA”.
| **Zespół** | Konta osób z agencji (administrator dodaje osoby, ustawia hasła, wyłącza konta) |
| **Powiadomienia** | Dzwonek w menu: akceptacje, prośby o zmiany i komentarze klientów, licznik nieprzeczytanych osobno dla każdej osoby, sprawdzanie co 30 s, kliknięcie otwiera treść |

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
