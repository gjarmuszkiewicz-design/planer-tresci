/* Wspólny system identyfikacji z pliku klienta (system-social.json).
   Jeden układ pliku dla każdego klienta: plik niesie tylko wygląd marki (kolory, kroje, logo, styl, teksty stałe),
   a szablony, formaty i strefy bezpieczne są wspólne i żyją tutaj. Opis pliku: README → „Plik systemu identyfikacji”.
   Interfejs obiektu marki jest taki sam jak w app/marki/wizme/marka.js, więc moduł Grafiki obsługuje oba. */
(() => {
  const TYP = 'system-social', WERSJA = 1;
  const tekstHtml = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cssUrl = (s = '') => String(s).replace(/['"\\()\s]/g, '');
  const nbsp = (s = '') => s.replace(/(^|\s)([aiouwzAIOUWZ])\s/g, '$1$2\u00a0');
  // Składnia tytułu jak w systemie WIZme: | nowy wiersz, *słowo* akcent.
  const linie = (s = '') => String(s).split('|').map(l => `<span class="l">${nbsp(tekstHtml(l)).replace(/\*([^*]+)\*/g, '<b>$1</b>')}</span>`).join('');
  const zwykly = (s = '') => nbsp(tekstHtml(s));
  const pogrubienia = (s = '') => zwykly(s).replace(/\*([^*]+)\*/g, '<b>$1</b>');
  const fontNazwa = (s = '') => String(s).replace(/[^\p{L}\p{N} -]/gu, '');
  const liczba = (v, d) => (v === '' || v == null || isNaN(+v) ? d : +v);
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const OBRAZ = /^(data:image\/(png|jpeg|webp|svg\+xml)[;,]|https:\/\/|\/media\/)/i;

  /* ---------- sprawdzenie pliku ---------- */
  // Zwraca { system } albo { blad } z opisem po polsku. Nieznane pola są pomijane.
  function sprawdzSystem(s) {
    const blad = b => ({ blad: b });
    if (!s || typeof s !== 'object') return blad('Plik nie jest obiektem JSON.');
    if (s.typ !== TYP) return blad(`To nie jest plik systemu identyfikacji (pole „typ” musi mieć wartość „${TYP}”).`);
    if (+s.wersja !== WERSJA) return blad(`Nieobsługiwana wersja pliku: ${s.wersja}. Aplikacja czyta wersję ${WERSJA}.`);
    const m = s.marka || {}, k = s.kolory || {}, f = s.fonty || {}, l = s.logo || {}, st = s.styl || {}, t = s.teksty || {};
    if (!String(m.nazwa || '').trim()) return blad('Brakuje nazwy marki (marka.nazwa).');
    for (const p of ['ciemny', 'jasny', 'akcent', 'tlo']) if (!HEX.test(k[p] || '')) return blad(`Kolor „kolory.${p}” musi być w zapisie #RRGGBB.`);
    if (k.akcentTekst && !HEX.test(k.akcentTekst)) return blad('Kolor „kolory.akcentTekst” musi być w zapisie #RRGGBB.');
    for (const p of ['tytul', 'tekst']) if (!String(f[p]?.rodzina || '').trim()) return blad(`Brakuje kroju „fonty.${p}.rodzina”.`);
    if (f.google && !/^https:\/\/fonts\.googleapis\.com\//.test(f.google)) return blad('„fonty.google” musi być adresem https://fonts.googleapis.com/…');
    for (const p of ['naCiemnym', 'naJasnym', 'znak']) if (l[p] && !OBRAZ.test(l[p])) return blad(`Logo „logo.${p}” musi być obrazem: data:image/… (SVG, PNG, JPG, WEBP) albo adresem https://.`);
    const zdjecia = (Array.isArray(s.zdjecia) ? s.zdjecia : []).filter(u => typeof u === 'string' && OBRAZ.test(u)).slice(0, 60);
    const font = (x, waga) => ({ rodzina: String(x.rodzina).trim().slice(0, 80), waga: liczba(x.waga, waga), wersaliki: !!x.wersaliki });
    return { system: {
      typ: TYP, wersja: WERSJA,
      marka: { nazwa: String(m.nazwa).trim().slice(0, 80), konto: String(m.konto || '').slice(0, 60), www: String(m.www || '').slice(0, 80) },
      kolory: { ciemny: k.ciemny, jasny: k.jasny, akcent: k.akcent, tlo: k.tlo, akcentTekst: k.akcentTekst || k.ciemny },
      fonty: { tytul: font(f.tytul, 700), tekst: font(f.tekst, 400), google: f.google || '' },
      logo: { naCiemnym: l.naCiemnym || '', naJasnym: l.naJasnym || '', znak: l.znak || '' },
      styl: {
        zaokraglenie: Math.max(0, Math.min(60, liczba(st.zaokraglenie, 0))),
        etykieta: st.etykieta === 'pigulka' ? 'pigulka' : 'tekst',
        linia: st.linia !== false,
        cien: Math.max(0, Math.min(1, liczba(st.cien, 0.78))),
      },
      teksty: { stopka: String(t.stopka || m.konto || '').slice(0, 60), cta: String(t.cta || 'Napisz do nas').slice(0, 40) },
      zdjecia,
    } };
  }

  /* ---------- wspólne formaty i szablony ---------- */
  const FORMATY = {
    post: { w: 1080, h: 1350, nazwa: 'Post / slajd karuzeli', opis: 'Instagram i Facebook, 1080 × 1350' },
    story: { w: 1080, h: 1920, nazwa: 'Relacja / okładka rolki', opis: '1080 × 1920' },
    kwadrat: { w: 1080, h: 1080, nazwa: 'Awatar / okładka wyróżnionej relacji', opis: '1080 × 1080' },
    poziom: { w: 1200, h: 627, nazwa: 'Grafika pozioma', opis: 'LinkedIn i link, 1200 × 627' },
    fb: { w: 1640, h: 624, nazwa: 'Okładka Facebooka', opis: '1640 × 624' },
    lifirma: { w: 2256, h: 382, nazwa: 'Baner LinkedIn – firma', opis: '2256 × 382' },
    liosoba: { w: 1584, h: 396, nazwa: 'Baner LinkedIn – osoba', opis: '1584 × 396' },
  };
  const PIONOWE = ['okladka', 'tekst', 'cytat', 'liczba', 'zdjecie', 'cta', 'logo'];
  const TYPY_FORMATU = { post: PIONOWE, story: PIONOWE, kwadrat: ['awatar', 'wyroznione'], poziom: ['poziom'], fb: ['baner'], lifirma: ['baner'], liosoba: ['baner'] };
  const NAZWY_TYPOW = {
    okladka: 'Okładka na zdjęciu', tekst: 'Slajd z treścią', cytat: 'Cytat', liczba: 'Liczba / wynik', zdjecie: 'Zdjęcie z podpisem osoby',
    cta: 'Zaproszenie z wezwaniem', logo: 'Samo logo', awatar: 'Awatar (znak)', wyroznione: 'Okładka wyróżnionej relacji',
    poziom: 'Tekst i zdjęcie obok siebie', baner: 'Logo i hasło',
  };
  const P = {
    tlo: { label: 'Tło', typ: 'select', opcje: [['ciemne', 'Ciemne'], ['jasne', 'Jasne'], ['akcent', 'Kolor akcentu']] },
    nad: { label: 'Etykieta', typ: 'text', hint: 'np. seria albo temat' },
    nr: { label: 'Numer slajdu', typ: 'text', hint: 'np. 1/6' },
    tytul: { label: 'Tytuł', typ: 'area', hint: '| nowy wiersz · *słowo* akcent' },
    rozmiar: { label: 'Wielkość tytułu', typ: 'num', hint: 'px', min: 30, max: 220 },
    pod: { label: 'Tekst', typ: 'area', hint: '*fragment* pogrubienie' },
    autor: { label: 'Autor cytatu', typ: 'text' },
    liczba: { label: 'Liczba', typ: 'text' },
    wielkosc: { label: 'Wielkość liczby', typ: 'num', hint: 'px', min: 100, max: 500 },
    zdjecie: { label: 'Zdjęcie', typ: 'foto' },
    kadr: { label: 'Kadr', typ: 'kadr', hint: 'albo przeciągnij zdjęcie na podglądzie' },
    cien: { label: 'Przyciemnienie zdjęcia', typ: 'num', hint: '% · puste = jak w systemie', min: 0, max: 100 },
    imie: { label: 'Imię i nazwisko', typ: 'text' },
    rola: { label: 'Rola', typ: 'text' },
    cta: { label: 'Przycisk', typ: 'text', hint: 'np. Zapisz się' },
    prawa: { label: 'Tekst w stopce', typ: 'text', hint: 'puste = konto marki' },
    logo: { label: 'Szerokość logo', typ: 'num', hint: 'px', min: 100, max: 900 },
  };
  const POLA_TYPOW = {
    okladka: ['zdjecie', 'kadr', 'nad', 'nr', 'tytul', 'rozmiar', 'pod', 'cien', 'prawa'],
    tekst: ['tlo', 'nad', 'nr', 'tytul', 'rozmiar', 'pod', 'prawa'],
    cytat: ['tlo', 'nad', 'nr', 'tytul', 'rozmiar', 'autor', 'prawa'],
    liczba: ['tlo', 'nad', 'nr', 'liczba', 'wielkosc', 'tytul', 'rozmiar', 'pod', 'prawa'],
    zdjecie: ['zdjecie', 'kadr', 'imie', 'rola', 'cien'],
    cta: ['tlo', 'nad', 'tytul', 'rozmiar', 'pod', 'cta', 'prawa'],
    logo: ['tlo'], awatar: ['tlo'], wyroznione: ['tlo', 'tytul'],
    poziom: ['tlo', 'zdjecie', 'kadr', 'nad', 'tytul', 'rozmiar', 'pod'],
    baner: ['tlo', 'tytul', 'rozmiar', 'logo'],
  };

  const CSS_WSPOLNY = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{overflow:hidden;background:transparent}
.c{position:relative;overflow:hidden;font-family:var(--fx);-webkit-font-smoothing:antialiased;--m:90px;--g:100px;--d:96px}
.c.wysoki{--g:250px;--d:380px}
.c.kw{--m:90px;--g:90px;--d:90px}
.ciemne{background:var(--ciemny);color:var(--jasny)}
.jasne{background:var(--tlo);color:var(--ciemny)}
.akcent{background:var(--akcent);color:var(--akt)}
.foto{position:absolute;inset:0;background-color:var(--ciemny);background-size:cover;background-repeat:no-repeat}
.puste{background-image:linear-gradient(135deg,var(--ciemny),color-mix(in srgb,var(--ciemny) 70%,var(--akcent)))}
.cien{position:absolute;inset:0}
.gora{position:absolute;left:var(--m);right:var(--m);top:var(--g);display:flex;justify-content:space-between;align-items:center;gap:20px}
.et{font:500 24px/1.25 var(--fx);letter-spacing:.2em;text-transform:uppercase;color:var(--akcent)}
.akcent .et{color:var(--akt)}
.et.pig{background:var(--akcent);color:var(--akt);padding:10px 22px;border-radius:var(--r);letter-spacing:.12em}
.akcent .et.pig{background:var(--ciemny);color:var(--jasny)}
.nr{font:500 24px/1 var(--fx);opacity:.85;margin-left:auto}
.dol{position:absolute;left:var(--m);right:var(--m);bottom:var(--d)}
.ty{font-family:var(--ft);font-weight:var(--tw);font-size:var(--t,96px);line-height:1.06;letter-spacing:-.01em;text-transform:var(--tu)}
.ty .l{display:block}
.ty b{color:var(--akcent);font-weight:inherit}
.akcent .ty b{color:var(--jasny)}
.na-foto .ty{text-shadow:0 2px 30px rgba(0,0,0,.35)}
.li{width:240px;height:3px;background:var(--akcent);margin:34px 0 0}
.akcent .li{background:currentColor}
.tx{font:400 36px/1.45 var(--fx);margin-top:30px}
.tx b{font-weight:700}
.st{display:flex;justify-content:space-between;align-items:center;gap:30px;margin-top:56px;font:500 24px/1 var(--fx);letter-spacing:.06em}
.zn{display:block;height:56px;width:auto;max-width:380px;object-fit:contain}
.zn-t{font:700 34px/1 var(--ft)}
.cyt{font:700 260px/1 var(--ft);color:var(--akcent);height:150px;overflow:hidden;margin-bottom:6px}
.akcent .cyt{color:var(--jasny)}
.au{font:500 28px/1.3 var(--fx);margin-top:34px;color:var(--akcent);letter-spacing:.04em}
.akcent .au{color:inherit}
.lb{font-family:var(--ft);font-weight:var(--tw);font-size:var(--n,300px);line-height:.95;color:var(--akcent);letter-spacing:-.02em;margin-bottom:24px}
.akcent .lb{color:var(--jasny)}
.btn{display:inline-block;margin-top:44px;background:var(--akcent);color:var(--akt);font:600 34px/1 var(--fx);padding:26px 44px;border-radius:var(--r)}
.akcent .btn{background:var(--ciemny);color:var(--jasny)}
.os{display:inline-block;border-left:8px solid var(--akcent);padding:6px 0 6px 26px}
.os b{display:block;font:600 46px/1.15 var(--fx)}
.os em{display:block;font:400 28px/1.3 var(--fx);font-style:normal;opacity:.9;margin-top:6px}
.cnt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}
.lewa{position:absolute;left:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:space-between;padding:56px 60px}
.prawa{position:absolute;right:0;top:0;bottom:0;background-color:var(--ciemny);background-size:cover}
`;

  window.MARKI = window.MARKI || {};
  // Buduje obiekt marki z pliku klienta. id = 'k-<id klienta>', żeby projekty każdego klienta były osobno.
  window.systemZPliku = (sys, id) => {
    const k = sys.kolory, f = sys.fonty, st = sys.styl, L = sys.logo;
    const css = `:root{--ciemny:${k.ciemny};--jasny:${k.jasny};--akcent:${k.akcent};--tlo:${k.tlo};--akt:${k.akcentTekst || k.ciemny};
--ft:"${fontNazwa(f.tytul.rodzina)}",Georgia,serif;--fx:"${fontNazwa(f.tekst.rodzina)}",Arial,sans-serif;
--tw:${f.tytul.waga};--tu:${f.tytul.wersaliki ? 'uppercase' : 'none'};--r:${st.zaokraglenie}px}` + CSS_WSPOLNY;
    // logo jasne na ciemnym tle i na zdjęciu, ciemne na jasnym; brak pliku = nazwa marki krojem tytułu
    const logoSrc = motyw => (motyw === 'jasne' ? L.naJasnym || L.naCiemnym : L.naCiemnym || L.naJasnym) || '';
    const logo = (motyw, styl = '') => { const s = logoSrc(motyw); return s ? `<img class="zn" src="${tekstHtml(s)}" alt="" style="${styl}">` : `<span class="zn-t">${zwykly(sys.marka.nazwa)}</span>`; };
    const znak = (motyw, w) => { const s = L.znak || logoSrc(motyw); return s ? `<img src="${tekstHtml(s)}" alt="" style="width:${w}px;max-height:${w}px;object-fit:contain">` : `<span class="zn-t" style="font-size:${Math.round(w / 3)}px">${zwykly(sys.marka.nazwa.slice(0, 2))}</span>`; };
    const zdjecie = n => n || '';
    const foto = (p, kl = 'foto', styl = '') => `<div class="${kl}${p.zdjecie ? '' : ' puste'}" style="${p.zdjecie ? `background-image:url('${cssUrl(p.zdjecie)}');` : ''}background-position:${cssUrl(p.kadr || '50% 50%').replace(/%/g, '% ').trim()};${styl}"></div>`;
    const cien = p => { const a = p.cien === '' || p.cien == null ? st.cien : liczba(p.cien, 78) / 100;
      return `<div class="cien" style="background:linear-gradient(180deg,rgba(0,0,0,${(a * .35).toFixed(2)}) 0%,rgba(0,0,0,0) 18%,rgba(0,0,0,0) 42%,rgba(0,0,0,${(a * .7).toFixed(2)}) 74%,rgba(0,0,0,${a.toFixed(2)}) 100%)"></div>`; };
    const gora = p => (p.nad || p.nr ? `<div class="gora">${p.nad ? `<span class="et ${st.etykieta === 'pigulka' ? 'pig' : ''}">${zwykly(p.nad)}</span>` : ''}${p.nr ? `<span class="nr">${zwykly(p.nr)}</span>` : ''}</div>` : '');
    const tytul = (p, r) => (p.tytul ? `<h1 class="ty" style="--t:${liczba(p.rozmiar, r)}px">${linie(p.tytul)}</h1>` : '');
    const linia = () => (st.linia ? '<div class="li"></div>' : '');
    const tekst = (p, styl = '') => (p.pod ? `<p class="tx" style="${styl}">${pogrubienia(p.pod)}</p>` : '');
    const stopka = (p, motyw) => `<div class="st">${logo(motyw)}<span>${zwykly(p.prawa || sys.teksty.stopka)}</span></div>`;
    const TYPY = {
      okladka: (p, m) => `${foto(p)}${cien(p)}${gora(p)}<div class="dol">${tytul(p, 104)}${linia()}${tekst(p)}${stopka(p, 'foto')}</div>`,
      tekst: (p, m) => `${gora(p)}<div class="dol">${tytul(p, 84)}${linia()}${tekst(p)}${stopka(p, m)}</div>`,
      cytat: (p, m) => `${gora(p)}<div class="dol"><div class="cyt">“</div>${tytul(p, 68)}${p.autor ? `<div class="au">— ${zwykly(p.autor)}</div>` : ''}${stopka(p, m)}</div>`,
      liczba: (p, m) => `${gora(p)}<div class="dol"><div class="lb" style="--n:${liczba(p.wielkosc, 300)}px">${zwykly(p.liczba || '')}</div>${tytul(p, 72)}${tekst(p)}${stopka(p, m)}</div>`,
      zdjecie: p => `${foto(p)}${cien(p)}<div class="dol"><div class="os"><b>${zwykly(p.imie || '')}</b><em>${zwykly(p.rola || '')}</em></div><div style="margin-top:48px">${logo('foto')}</div></div>`,
      cta: (p, m) => `${gora(p)}<div class="dol">${tytul(p, 96)}${tekst(p)}<div><span class="btn">${zwykly(p.cta || sys.teksty.cta)}</span></div>${stopka(p, m)}</div>`,
      logo: (p, m) => `<div class="cnt">${logo(m, 'height:auto;width:62%;max-width:none;max-height:40%')}</div>`,
      awatar: (p, m) => `<div class="cnt">${znak(m, 600)}</div>`,
      wyroznione: (p, m) => `<div class="cnt">${znak(m, 300)}<div class="ty" style="--t:84px;margin-top:44px">${zwykly(p.tytul || '')}</div></div>`,
      baner: (p, m) => `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:70px;padding:0 90px">${logo(m, `height:auto;width:${liczba(p.logo, 380)}px;max-width:none`)}${p.tytul ? `<h1 class="ty" style="--t:${liczba(p.rozmiar, 52)}px">${linie(p.tytul)}</h1>` : ''}</div>`,
    };
    function szablon(p) {
      const format = FORMATY[p.format] ? p.format : 'post', fm = FORMATY[format];
      const motyw = ['ciemne', 'jasne', 'akcent'].includes(p.tlo) ? p.tlo : 'ciemne';
      const wymiar = `width:${fm.w}px;height:${fm.h}px`;
      if (format === 'poziom') {
        return `<div class="c ${motyw}" style="${wymiar}">${foto(p, 'prawa', 'width:540px')}
          <div class="lewa" style="width:660px">${logo(motyw, 'height:48px')}<div>${p.nad ? `<span class="et ${st.etykieta === 'pigulka' ? 'pig' : ''}" style="font-size:18px;display:inline-block;margin-bottom:16px">${zwykly(p.nad)}</span>` : ''}${tytul(p, 56)}${p.pod ? `<p class="tx" style="font-size:22px;margin-top:14px">${pogrubienia(p.pod)}</p>` : ''}</div></div></div>`;
      }
      const typ = TYPY_FORMATU[format].includes(p.typ) ? p.typ : TYPY_FORMATU[format][0];
      const naFoto = ['okladka', 'zdjecie'].includes(typ);
      return `<div class="c ${naFoto ? 'ciemne na-foto' : motyw} ${format === 'story' ? 'wysoki' : format === 'kwadrat' ? 'kw' : ''}" style="${wymiar}">${TYPY[typ](p, motyw)}</div>`;
    }
    const nazwa = sys.marka.nazwa, konto = sys.marka.konto;
    const START = {
      okladka: { nad: 'Seria · temat', nr: '1/6', tytul: 'Zwykłe zdanie|i *jedno słowo*', rozmiar: 104, pod: '' },
      tekst: { tlo: 'jasne', nad: 'Seria · temat', nr: '2/6', tytul: 'Tytuł slajdu|*w dwóch wierszach*', rozmiar: 84, pod: 'Krótki tekst w jednym, dwóch zdaniach. *Najważniejsze* pogrubione.' },
      cytat: { tlo: 'ciemne', tytul: 'Zdanie, które warto zapamiętać.', rozmiar: 68, autor: 'Imię Nazwisko' },
      liczba: { tlo: 'akcent', nad: 'Wynik', liczba: '120%', tytul: 'Co oznacza|*ta liczba*', rozmiar: 72 },
      zdjecie: { imie: 'Imię Nazwisko', rola: `Rola · ${nazwa}` },
      cta: { tlo: 'ciemne', nad: 'Zaproszenie', tytul: 'Jedno jasne|*zaproszenie*', rozmiar: 96, pod: 'Co zyskasz i kiedy.', cta: sys.teksty.cta },
      logo: { tlo: 'ciemne' }, awatar: { tlo: 'ciemne' }, wyroznione: { tlo: 'ciemne', tytul: 'Realizacje' },
      poziom: { tlo: 'ciemne', nad: nazwa, tytul: 'Tytuł grafiki|*poziomej*', rozmiar: 56, pod: konto },
      baner: { tlo: 'ciemne', tytul: `${nazwa}|*hasło marki*`, rozmiar: 52 },
    };
    const podglad = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><rect width="4" height="5" fill="${k.ciemny}"/><rect y="3.6" width="4" height=".08" fill="${k.akcent}"/></svg>`)}`;
    const przyklady = { zbiory: [], zdjecia: sys.zdjecia || [] };
    window.MARKI[id] = {
      id, nazwa, css, fonty: f.google || 'data:text/css,', zrodlo: sys.wczytano || 0,
      formaty: FORMATY, typyFormatu: TYPY_FORMATU, nazwyTypow: NAZWY_TYPOW, pola: P, polaTypow: POLA_TYPOW, start: START,
      zdjecieUrl: zdjecie, miniatura: n => n, podgladPrzykladu: () => podglad,
      szablon, przyklady, async init() {},
    };
    return window.MARKI[id];
  };
  window.sprawdzSystem = sprawdzSystem;
})();
