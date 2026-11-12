# WIZme Social – plan social media dla klientów agencji

Jedno miejsce na plany treści wszystkich klientów: tabela jak w Excelu, kalendarz, podgląd postów jak w aplikacjach
(Instagram, Facebook, LinkedIn) i link dla klienta do akceptacji. Bez tworzenia treści i bez automatycznej publikacji.

## Co potrafi

| Obszar | Co robi |
|---|---|
| **Pulpit** | Treści w tym miesiącu, czekające na akceptację, uwagi klientów, po terminie; publikacje na 7 dni; postęp każdego klienta |
| **Plan (tabela)** | Tygodnie z tematem tygodnia, rezerwa, uwagi operacyjne. Widok „Zwięzły” albo „Jak w Excelu” (wszystkie kolumny). Filtry: miesiąc, kanał, status, szukaj. Status publikacji przełączany jednym kliknięciem |
| **Kalendarz** | Miesiąc z tematami tygodni i kolorami filarów, przeciąganie treści na inny dzień (także z rezerwy) |
| **Edytor treści** | Kanały FB + IG i/lub LinkedIn z osobnym opisem dla LinkedIna, CTA, hashtagi, oznaczenia, tekst na grafice, brief dla grafika, pytanie „do potwierdzenia” dla klienta, notatka wewnętrzna, komentarze |
| **Podgląd** | Jak w aplikacjach: karuzela Instagrama (przycięta do proporcji 1. slajdu), kolaż Facebooka jak w Meta, dokument LinkedIn z numerem strony, Rolka, Relacja. Zakładka „Siatka” pokazuje profil Instagrama z miniaturami 3:4 (tak jak siatka od 2025 r.); kadr miniatury ustawia się przeciągnięciem i suwakiem powiększenia, a przy rolce można wybrać okładkę. Klient widzi ten sam kadr w swoim panelu. Galeria pełnoekranowa i ostrzeżenia o limitach i przycinaniu |
| **Profil klienta** | Konta, zasady publikacji, ton, stałe hashtagi, filary z opisem (cel, grupa, co publikujemy, przykłady) |
| **Panel klienta** | Link `/p/<token>` bez logowania: plan z tematami tygodni, podgląd każdej treści, „Akceptuję” / „Poproś o zmiany”, komentarze. Serwer nie wysyła klientowi szkiców, notatek wewnętrznych ani ustawień agencji |
| **Import z Excela** | Wspólny schemat (niżej) oraz starsze plany (układ Lion i see, arkusz LinkedIn, „Opis filarów”), grafiki wklejone w arkusz, tygodnie, rezerwę i uwagi; podgląd przed importem z dopasowaniem kolumn |
| **Grafiki** | Zakładka „Grafiki” i przycisk „＋ Nowa grafika” u klienta, któremu w profilu włączono moduł Grafiki. Klient WIZme ma wbudowany system WIZme, każdy inny klient – własny system wgrany z pliku (wspólny układ pliku, niżej). Tylko dla zespołu agencji (panel klienta nie ma dostępu). Projekty w systemie identyfikacji marki – na start WIZme: post, relacja / okładka rolki, grafika pozioma, okładka Facebooka, banery LinkedIn, awatar i okładki wyróżnionych relacji. Gotowe projekty i wzorce z systemu jako punkt wyjścia, przykładowe zdjęcia, kadr ustawiany przeciągnięciem, zapis projektów, pobranie PNG i dodanie grafiki do istniejącej treści albo do nowej (data, format, kanały) z od razu otwartym edytorem treści |
| **Linki klienta** | Tylko dla zespołu agencji. Dodaje się je w zakładce „Profil, filary i ustawienia” (Dysk Google, materiały od klienta, Canva…), a pod nazwą klienta są pod ręką na każdej zakładce. Panel klienta ich nie dostaje |
| **Asystent AI** | Tylko dla zespołu, działa po dodaniu klucza Claude API. „Zaplanuj z AI” układa tematy tygodni i treści na miesiąc ze strategii klienta (filary, ton, grupa, zasady, pełny dokument strategii), z uwzględnieniem tego, co już jest w planie i co było publikowane. Propozycje zaznaczasz i dodajesz jako szkice, opcjonalnie od razu z opisami. W edytorze treści „Napisz / Popraw z AI” pisze opisy FB + IG i LinkedIn, CTA, hashtagi, tekst na grafikę i brief dla grafika; wynik widać przed wstawieniem. W profilu „Wczytaj strategię z PDF” uzupełnia puste pola strategii i dodaje brakujące filary |
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

### Moduł Grafiki i systemy identyfikacji marek

Każda marka to katalog `app/marki/<id>/` z plikiem `marka.js` (formaty, szablony HTML/CSS, pola edytora), logo i sygnetem w SVG,
przykładowymi zdjęciami i listą gotowych projektów (`przyklady.json`). Pliki są dostępne tylko po zalogowaniu (`/marki/...`).
Szablony WIZme przeniesiono 1:1 z generatora `system-social-wizme/generuj.js`, a gotowe projekty z jego `posty.json`.
Grafika powstaje w przeglądarce (ramka z kodem marki + biblioteka html-to-image), więc serwer nie potrzebuje Chrome.
Nową markę dodaje się jako nowy katalog i wpis w `app/marki/marki.json`.

### Plik systemu identyfikacji klienta (`system-social.json`)

Każdy klient poza WIZme dostaje grafiki z jednego, wspólnego układu pliku. Plik powstaje przy budowie systemu komunikacji
wizualnej na social media i niesie tylko wygląd marki; szablony (okładka na zdjęciu, slajd z treścią, cytat, liczba,
zdjęcie z podpisem, zaproszenie, logo, awatar, okładka wyróżnionej, grafika pozioma, banery), formaty i strefy bezpieczne
są wspólne (`app/marki/wspolny/system.js`). Wgrywa się go w profilu klienta: **Moduł Grafiki → Własny system klienta z pliku**.
Wzór do pobrania jest tam pod przyciskiem „Wzór pliku” (`app/marki/wspolny/wzor-system-social.json`, wersja 2;
wzór wersji 1: `wzor-system-social-v1.json`). Aplikacja czyta wersje 1 i 2.

| Pole | Wymagane | Opis |
|---|---|---|
| `typ`, `wersja` | tak | zawsze `"system-social"`, wersja `1` albo `2` |
| `marka.nazwa` | tak | nazwa marki; `marka.konto` (np. `@konto`) i `marka.www` opcjonalnie |
| `kolory.ciemny`, `.jasny`, `.akcent`, `.tlo` | tak | `#RRGGBB`: tło ciemne, tekst na ciemnym, akcent (etykiety, wyróżnione słowa, linie, przycisk), jasne tło slajdów z treścią; `kolory.akcentTekst` – tekst na tle akcentu (domyślnie ciemny) |
| `fonty.tytul`, `fonty.tekst` | tak | `{"rodzina": "Playfair Display", "waga": 700, "wersaliki": false}`; `fonty.google` – adres CSS z fonts.googleapis.com z tymi krojami |
| `logo.naCiemnym`, `.naJasnym`, `.znak` | nie | obraz jako `data:image/svg+xml;base64,…` (także PNG, JPG, WEBP) albo adres `https://`; znak = sygnet do awatara. Bez logo stopka pokazuje nazwę marki |
| `styl` | nie | `zaokraglenie` (px), `etykieta` (`"tekst"` albo `"pigulka"`), `linia` (linia pod tytułem), `cien` (siła przyciemnienia zdjęcia 0–1) |
| `teksty.stopka`, `teksty.cta` | nie | tekst w stopce (domyślnie konto) i domyślny napis na przycisku |
| `zdjecia` | nie | lista adresów zdjęć marki do wyboru w edytorze (w v2 także obiekty `{"plik": adres, "opis": …}`) |

**Wersja 2** jest nadzbiorem wersji 1: wszystkie pola v1 znaczą to samo, a nowe są opcjonalne. Bez nich grafika wygląda
jak w v1. Kolory w nowych polach: `#RGB`, `#RRGGBB` albo `#RRGGBBAA`. CSS aplikacja buduje sama ze struktury pliku –
surowego CSS z pliku nie przyjmuje.

| Pole (v2) | Opis |
|---|---|
| `kolory.tekstNaJasnym` | tekst na jasnym tle (domyślnie `ciemny`) |
| `kolory.akcentNaJasnym` | etykiety, wyróżnione słowa, liczba, linia, cudzysłów i przycisk na jasnym tle (domyślnie `akcent`); `kolory.etykietaNaJasnym` – osobny kolor samych etykiet |
| `kolory.paleta` | `[{"nazwa", "hex", "rola"}]` – pełna paleta, widoczna w profilu klienta (do 24) |
| `zlozone.tloCiemne`, `.tloJasne`, `.tloAkcent` | gradient tła: `{"typ": "linear", "kat": 180, "stopy": [["#hex", 0], ["#hex", 100]]}` albo `{"typ": "radial", "ksztalt": "ellipse 80% 60% at 50% 42%", "stopy": …}`; 2–8 stóp, pozycje 0–100 %, kształt tylko `ellipse`/`circle` z procentami i `at X% Y%`. Pod gradientem zostaje kolor płaski |
| `zlozone.cien` | cień pod napisem na zdjęciu w kolorze marki: `{"kolor": "#140907", "stopy": [[krycie 0–1, pozycja %], …]}`; pole „Przyciemnienie” w edytorze skaluje krycie (100 = jak w systemie) |
| `fonty.tytul.interlinia`, `.odstep` | interlinia (0,7–2,5) i odstęp liter w em (−0,05–0,5) tytułu |
| `fonty.tekst.waga`, `.interlinia` | grubość (100–900) i interlinia tekstu |
| `fonty.etykieta` | `{"rodzina", "waga", "wersaliki", "odstep", "rozmiar"}` etykiety i numeru slajdu |
| `fonty.akcent` | jak wyróżniać `*słowa*` w tytule: `"kolor"` (jak v1), `"kursywa"` albo `"pogrubienie"` |
| `marginesy.post`, `.story`, `.kwadrat` | strefy w px (0–600): `{"gora", "dol", "bok"}` |
| `styl.cienNaTytule` | `false` wyłącza cień pod tytułem na zdjęciu |
| `tla.dozwolone` | tła do wyboru w edytorze, podzbiór `["ciemne", "jasne", "akcent"]`; przy jednym tle pole „Tło” znika |

| `zlozone.wygaszenie` | `{"kolor", "wysokosc"}` – wygaszenie dołu zdjęcia, gdy brakuje go pod napisem |
| `marginesy.rolka` | `{"gora", "dol", "lewo", "prawo"}` – strefa okładki rolki |
| `tla.ciemne`, `.jasne`, `.akcent` | obraz tła `{"pion", "poziom"}` (zamiast gradientu; poziom – grafiki poziome) |
| `logo.podpis`, `logo.sygnet` | warianty `{"naCiemnym", "naJasnym", "naZdjeciu"}`; `logo.polaczenie` (sygnet + linia + podpis), `logo.znakWodny` (`wariant`, `pozycja`, `krycie`, `wysokosc`, `wyjscie`), `logo.rozmiary` |
| `logo.uzycie` | który znak w którym szablonie: `{"okladka": {"gora": "sygnet", "stopka": "polaczenie", "znakWodny": true}, "zamkniecie": "polaczenie"}`; znaki: `sygnet`, `podpis`, `polaczenie`, `brak` |
| `zdjecia[]` | `{"plik", "podglad", "opis", "w", "h", "glowa": {"gora", "broda", "x"}}` – opis w wyborze zdjęć, `glowa` (0–1) ustawia kadr „głowa do klatki” sam; `kadr.twarz` i `kadr.glowaOdGory` (per format) go stroją |
| `zasady` | lista zasad – ściągawka nad formularzem w edytorze |
| `wzorce` | `[{"grupa", "nazwa", "plik", "format", "typ"}]` – galeria „Wzorce systemu” w Grafikach (podgląd, pobranie, „Zrób podobną” w pasującym szablonie) |
| `projekty` | gotowe projekty do skopiowania; `dokument` – PDF systemu |

Szablon `zamkniecie` (plansza końcowa: podziękowanie, zaproszenie, połączenie znaków) jest w postach i relacjach.

#### Paczka ZIP (`system-social-….zip`)

W profilu klienta można wgrać całą paczkę zamiast samego JSON-a. Aplikacja czyta ją w przeglądarce (JSZip,
`app/static/vendor/jszip.min.js`): `system-social.json` w katalogu głównym albo w jednym folderze, ścieżki względne
(`logo/…`, `tla/…`, `zdjecia/…`, `wzorce/…`, `publikacje/…`, PDF). Limity: 150 MB paczki, 400 plików, 30 MB na plik,
300 MB po rozpakowaniu; ścieżki z `..` albo bezwzględne są odrzucane. Pliki trafiają do mediów aplikacji (zdjęcia
w oryginale z podglądem, SVG zamieniane na PNG), a ścieżki w pliku podmieniane na `/media/…`. Przed importem okno pyta, co
przenieść do klienta: filary (`filary`), ton (`ton`), hashtagi, bio (do notatek), link do dokumentu PDF i publikacje
z `publikacje[]` jako treści do akceptacji (ponowny import aktualizuje treść o tej samej dacie i tytule, nie dubluje).
„Pobierz obecny (ZIP)” odtwarza paczkę z oryginalnymi ścieżkami. Sam JSON z względnymi ścieżkami jest odrzucany
z podpowiedzią, by wgrać ZIP.

Aplikacja sprawdza plik przy wgrywaniu i pokazuje, czego brakuje. Duże logo rastrowe zapisuje w grafikach aplikacji.
Plik klienta nie trafia do panelu klienta.

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
   - `ANTHROPIC_API_KEY` – klucz z console.anthropic.com, włącza asystenta AI (bez niego przyciski AI są ukryte).
     Domyślny model to `claude-opus-5-5`; inny można ustawić zmienną `AI_MODEL`. Klucz zostaje na serwerze, przeglądarka go nie widzi.
5. **Settings → Networking → Custom Domain:** dodaj `social.wizme.pl` i u dostawcy DNS ustaw rekord CNAME wskazany przez Railway. Otwórz adres, zaloguj się i dodaj zespół w menu **Zespół**.

Gdy w bazie nie ma żadnego klienta, aplikacja przy starcie tworzy przykładowego klienta „Kawiarnia Ziarno (demo)” (wyłącza to `DEMO_CLIENT=0`). Bez PostgreSQL dane są w pliku wewnątrz kontenera i znikają przy każdym wdrożeniu.

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
a czego nie), akcje klienta, wgrywanie grafik, asystenta AI (na podstawionym modelu, bez kosztów API), zarządzanie zespołem i blokadę żądań z obcych stron.

## Struktura

```
app/
  main.py      aplikacja: logowanie, strony, nagłówki bezpieczeństwa
  api.py       API panelu agencji: stan, zapis zmian (/api/sync), komentarze, grafiki, zespół
  ai.py        asystent AI (Claude API): plan miesiąca, pisanie treści, strategia z PDF
  portal.py    panel klienta /p/<token> – tylko dane widoczne dla klienta
  demo.py      przykładowy klient przy pustej bazie
  marki/       systemy identyfikacji marek dla modułu Grafiki (tylko po zalogowaniu)
  auth.py      hasła (scrypt), sesja, konto administratora ze zmiennych
  models.py    tabele: users, clients, posts, month_plans, comments, media, designs
  static/      interfejs (app.js, studio.js – moduł Grafiki, grid.js – siatka Instagrama, ai.js – asystent AI, app.css, index.html)
tests/         testy przepływu
```

Klient, treść i plan miesiąca trzymają swoje pola w kolumnie JSON, więc nowe pole w formularzu nie wymaga migracji bazy.
Grafiki są w tabeli `media` w PostgreSQL; adres `/media/<id>` jest publiczny (potrzebny w panelu klienta),
ale identyfikator jest losowy i nie do zgadnięcia.
