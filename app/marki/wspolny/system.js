/* Wspólny system identyfikacji z pliku klienta (system-social.json).
   Jeden układ pliku dla każdego klienta: plik niesie tylko wygląd marki (kolory, kroje, logo, styl, teksty stałe),
   a szablony, formaty i strefy bezpieczne są wspólne i żyją tutaj. Opis pliku: README → „Plik systemu identyfikacji”.
   Interfejs obiektu marki jest taki sam jak w app/marki/wizme/marka.js, więc moduł Grafiki obsługuje oba. */
(() => {
  const TYP = 'system-social', WERSJE = [1, 2];
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
  // v2: kolory także z kanałem alfa; kształt gradientu radialnego tylko z bezpiecznych słów i procentów
  const HEX2 = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const KSZTALT = /^(ellipse|circle)( \d{1,3}%){0,2}( at \d{1,3}% \d{1,3}%)?$/;
  const TLA = ['ciemne', 'jasne', 'akcent'];
  const ZNAKI = ['sygnet', 'podpis', 'polaczenie', 'brak'];
  const POZYCJE = ['prawy-dol', 'lewy-dol', 'prawy-gora', 'lewy-gora', 'srodek'];
  const SCIEZKA = ' Pliki z paczki (np. logo/…, zdjecia/…) działają tylko przy wgraniu całej paczki ZIP.';
  const AKCENTY = ['kursywa', 'kolor', 'pogrubienie'];
  // CSS gradientu budujemy wyłącznie ze sprawdzonej struktury – nigdy nie wklejamy CSS z pliku
  const gradientCss = g => {
    const stopy = g.stopy.map(([c, p]) => `${c} ${p}%`).join(', ');
    return g.typ === 'radial' ? `radial-gradient(${g.ksztalt || 'ellipse'}, ${stopy})` : `linear-gradient(${g.kat}deg, ${stopy})`;
  };
  const rgba = (hex, a) => {
    let h = hex.slice(1); if (h.length <= 4) h = [...h].map(x => x + x).join('');
    const n = i => parseInt(h.slice(i, i + 2), 16);
    return `rgba(${n(0)},${n(2)},${n(4)},${(+a).toFixed(3)})`;
  };

  /* ---------- sprawdzenie pliku ---------- */
  // Zwraca { system } albo { blad } z opisem po polsku. Nieznane pola są pomijane.
  function sprawdzSystem(s) {
    const blad = b => ({ blad: b });
    if (!s || typeof s !== 'object') return blad('Plik nie jest obiektem JSON.');
    if (s.typ !== TYP) return blad(`To nie jest plik systemu identyfikacji (pole „typ” musi mieć wartość „${TYP}”).`);
    if (!WERSJE.includes(+s.wersja)) return blad(`Nieobsługiwana wersja pliku: ${s.wersja}. Aplikacja czyta wersje ${WERSJE.join(' i ')}.`);
    let v2;
    try { v2 = +s.wersja === 2 ? polaV2(s) : {}; } catch (e) { return blad(e.message); }
    const m = s.marka || {}, k = s.kolory || {}, f = s.fonty || {}, l = s.logo || {}, st = s.styl || {}, t = s.teksty || {};
    if (!String(m.nazwa || '').trim()) return blad('Brakuje nazwy marki (marka.nazwa).');
    for (const p of ['ciemny', 'jasny', 'akcent', 'tlo']) if (!HEX.test(k[p] || '')) return blad(`Kolor „kolory.${p}” musi być w zapisie #RRGGBB.`);
    if (k.akcentTekst && !HEX.test(k.akcentTekst)) return blad('Kolor „kolory.akcentTekst” musi być w zapisie #RRGGBB.');
    for (const p of ['tytul', 'tekst']) if (!String(f[p]?.rodzina || '').trim()) return blad(`Brakuje kroju „fonty.${p}.rodzina”.`);
    if (f.google && !/^https:\/\/fonts\.googleapis\.com\//.test(f.google)) return blad('„fonty.google” musi być adresem https://fonts.googleapis.com/…');
    for (const p of ['naCiemnym', 'naJasnym', 'znak']) if (l[p] && !OBRAZ.test(l[p])) return blad(`Logo „logo.${p}” musi być obrazem: data:image/… (SVG, PNG, JPG, WEBP) albo adresem https://.${SCIEZKA}`);
    // v1: lista adresów; v2: obiekty { plik, opis } – po imporcie paczki plik jest już adresem /media/…
    const zdjecia = (Array.isArray(s.zdjecia) ? s.zdjecia : []).map(u => (typeof u === 'string' ? u : u?.plik)).filter(u => typeof u === 'string' && OBRAZ.test(u)).slice(0, 60);
    const font = (x, waga) => ({ rodzina: String(x.rodzina).trim().slice(0, 80), waga: liczba(x.waga, waga), wersaliki: !!x.wersaliki });
    return { system: {
      typ: TYP, wersja: +s.wersja,
      marka: { nazwa: String(m.nazwa).trim().slice(0, 80), konto: String(m.konto || '').slice(0, 60), www: String(m.www || '').slice(0, 80) },
      kolory: { ciemny: k.ciemny, jasny: k.jasny, akcent: k.akcent, tlo: k.tlo, akcentTekst: k.akcentTekst || k.ciemny, ...v2.kolory },
      fonty: { tytul: { ...font(f.tytul, 700), ...v2.tytul }, tekst: { ...font(f.tekst, 400), ...v2.tekst }, google: f.google || '', ...v2.fonty },
      logo: { naCiemnym: l.naCiemnym || '', naJasnym: l.naJasnym || '', znak: l.znak || '' },
      styl: {
        zaokraglenie: Math.max(0, Math.min(60, liczba(st.zaokraglenie, 0))),
        etykieta: st.etykieta === 'pigulka' ? 'pigulka' : 'tekst',
        linia: st.linia !== false,
        cien: Math.max(0, Math.min(1, liczba(st.cien, 0.78))),
        ...v2.styl,
      },
      teksty: { stopka: String(t.stopka || m.konto || '').slice(0, 60), cta: String(t.cta || 'Napisz do nas').slice(0, 40) },
      zdjecia,
      ...v2.reszta,
    } };
  }

  // Nowe pola wersji 2 (wszystkie opcjonalne). Rzuca błąd z opisem po polsku; zwraca tylko sprawdzone wartości.
  function polaV2(s) {
    const zle = m => { throw new Error(m); };
    const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
    const hex = (v, gdzie) => (HEX2.test(v || '') ? v : zle(`Kolor „${gdzie}” musi być w zapisie #RGB, #RRGGBB albo #RRGGBBAA.`));
    const num = (v, min, max, gdzie) => (v === '' || v == null || isNaN(+v) || +v < min || +v > max ? zle(`„${gdzie}” musi być liczbą od ${min} do ${max}.`) : +v);
    const opc = (o, kl, min, max, gdzie, wynik) => { if (o[kl] != null && o[kl] !== '') wynik[kl] = num(o[kl], min, max, `${gdzie}.${kl}`); };
    const k = obj(s.kolory) || {}, f = obj(s.fonty) || {}, z = obj(s.zlozone), st = obj(s.styl) || {}, mg = obj(s.marginesy), tl = obj(s.tla);
    const kolory = {}, tytul = {}, tekst = {}, fonty = {}, styl = {}, reszta = {};
    // kolory
    if (k.tekstNaJasnym) kolory.tekstNaJasnym = hex(k.tekstNaJasnym, 'kolory.tekstNaJasnym');
    if (k.akcentNaJasnym) kolory.akcentNaJasnym = hex(k.akcentNaJasnym, 'kolory.akcentNaJasnym');
    if (k.etykietaNaJasnym) kolory.etykietaNaJasnym = hex(k.etykietaNaJasnym, 'kolory.etykietaNaJasnym');
    if (k.paleta != null) {
      if (!Array.isArray(k.paleta)) zle('„kolory.paleta” musi być listą kolorów.');
      kolory.paleta = k.paleta.slice(0, 24).map((c, i) => ({
        nazwa: String(c?.nazwa || '').slice(0, 40), hex: hex(c?.hex, `kolory.paleta[${i + 1}].hex`), rola: String(c?.rola || '').slice(0, 120) }));
    }
    // gradienty i cień
    const gradient = (g, gdzie) => {
      if (!obj(g)) zle(`„${gdzie}” musi być obiektem gradientu.`);
      if (!['linear', 'radial'].includes(g.typ)) zle(`„${gdzie}.typ” musi mieć wartość „linear” albo „radial”.`);
      if (!Array.isArray(g.stopy) || g.stopy.length < 2 || g.stopy.length > 8) zle(`„${gdzie}.stopy” musi mieć od 2 do 8 punktów.`);
      const stopy = g.stopy.map((x, i) => [hex(x?.[0], `${gdzie}.stopy[${i + 1}]`), num(x?.[1], 0, 100, `${gdzie}.stopy[${i + 1}] – pozycja`)]);
      if (g.typ === 'radial') {
        const ksztalt = String(g.ksztalt ?? 'ellipse').trim();
        if (!KSZTALT.test(ksztalt)) zle(`„${gdzie}.ksztalt” ma niedozwoloną postać – np. „ellipse 80% 60% at 50% 42%”.`);
        return { typ: 'radial', ksztalt, stopy };
      }
      return { typ: 'linear', kat: g.kat == null ? 180 : num(g.kat, 0, 360, `${gdzie}.kat`), stopy };
    };
    if (z) {
      const zl = {};
      for (const kl of ['tloCiemne', 'tloJasne', 'tloAkcent']) if (z[kl] != null) zl[kl] = gradient(z[kl], `zlozone.${kl}`);
      if (z.cien != null) {
        const c = obj(z.cien) || zle('„zlozone.cien” musi być obiektem.');
        if (!Array.isArray(c.stopy) || c.stopy.length < 2 || c.stopy.length > 8) zle('„zlozone.cien.stopy” musi mieć od 2 do 8 punktów.');
        zl.cien = { kolor: hex(c.kolor, 'zlozone.cien.kolor'),
          stopy: c.stopy.map((x, i) => [num(x?.[0], 0, 1, `zlozone.cien.stopy[${i + 1}] – krycie`), num(x?.[1], 0, 100, `zlozone.cien.stopy[${i + 1}] – pozycja`)]) };
      }
      if (Object.keys(zl).length) reszta.zlozone = zl;
    }
    // typografia
    const tt = obj(f.tytul) || {}, tx = obj(f.tekst) || {}, et = obj(f.etykieta);
    opc(tt, 'interlinia', 0.7, 2.5, 'fonty.tytul', tytul); opc(tt, 'odstep', -0.05, 0.5, 'fonty.tytul', tytul);
    if (tt.waga != null) tytul.waga = num(tt.waga, 100, 900, 'fonty.tytul.waga');
    opc(tx, 'interlinia', 0.8, 3, 'fonty.tekst', tekst);
    if (tx.waga != null) tekst.waga = num(tx.waga, 100, 900, 'fonty.tekst.waga');
    if (et) {
      const e = {};
      if (et.rodzina) e.rodzina = String(et.rodzina).trim().slice(0, 80);
      if (et.waga != null) e.waga = num(et.waga, 100, 900, 'fonty.etykieta.waga');
      opc(et, 'odstep', -0.05, 0.5, 'fonty.etykieta', e); opc(et, 'rozmiar', 10, 80, 'fonty.etykieta', e);
      if (et.wersaliki != null) e.wersaliki = !!et.wersaliki;
      fonty.etykieta = e;
    }
    if (f.akcent != null) fonty.akcent = AKCENTY.includes(f.akcent) ? f.akcent : zle(`„fonty.akcent” musi mieć jedną z wartości: ${AKCENTY.join(', ')}.`);
    // styl, marginesy, tła
    if (st.cienNaTytule != null) styl.cienNaTytule = st.cienNaTytule !== false;
    if (mg) {
      const m = {};
      for (const fm of ['post', 'story', 'kwadrat']) {
        if (mg[fm] == null) continue;
        const o = obj(mg[fm]) || zle(`„marginesy.${fm}” musi być obiektem { gora, dol, bok }.`), w = {};
        for (const kl of ['gora', 'dol', 'bok']) opc(o, kl, 0, 600, `marginesy.${fm}`, w);
        m[fm] = w;
      }
      reszta.marginesy = m;
    }
    const obraz = (v, gdzie) => (typeof v === 'string' && OBRAZ.test(v) ? v : zle(`„${gdzie}” musi być obrazem z aplikacji (/media/…), adresem https:// albo data:image/….${SCIEZKA}`));
    const tekstL = (v, n) => String(v ?? '').slice(0, n);
    if (tl) {
      const t = {};
      if (tl.dozwolone != null) {
        const d = Array.isArray(tl.dozwolone) ? [...new Set(tl.dozwolone)] : [];
        if (!d.length || d.some(x => !TLA.includes(x))) zle(`„tla.dozwolone” musi być niepustą listą z wartości: ${TLA.join(', ')}.`);
        t.dozwolone = TLA.filter(x => d.includes(x));
      }
      // obrazy teł: pion (posty, relacje, kwadraty) i poziom (grafiki poziome, banery)
      for (const kl of TLA) {
        const o = obj(tl[kl]); if (!o) continue;
        const w = {};
        for (const u of ['pion', 'poziom']) if (o[u]) w[u] = obraz(o[u], `tla.${kl}.${u}`);
        if (Object.keys(w).length) t[kl] = w;
      }
      if (Object.keys(t).length) reszta.tla = t;
    }
    if (z && z.wygaszenie != null) {
      const w = obj(z.wygaszenie) || zle('„zlozone.wygaszenie” musi być obiektem { kolor, wysokosc }.');
      (reszta.zlozone ||= {}).wygaszenie = { kolor: hex(w.kolor, 'zlozone.wygaszenie.kolor'), wysokosc: w.wysokosc == null ? 320 : num(w.wysokosc, 0, 2000, 'zlozone.wygaszenie.wysokosc') };
    }
    if (mg && mg.rolka != null) {
      const o = obj(mg.rolka) || zle('„marginesy.rolka” musi być obiektem.'), w = {};
      for (const kl of ['gora', 'dol', 'lewo', 'prawo']) opc(o, kl, 0, 600, 'marginesy.rolka', w);
      reszta.marginesy.rolka = w;
    }
    // logo: warianty, połączenie, znak wodny, rozmiary i zasada „który znak w którym szablonie”
    const l = obj(s.logo) || {}, logo = {};
    for (const wr of ['podpis', 'sygnet']) {
      const o = obj(l[wr]); if (!o) continue;
      const w = {};
      for (const m of ['naCiemnym', 'naJasnym', 'naZdjeciu']) if (o[m]) w[m] = obraz(o[m], `logo.${wr}.${m}`);
      logo[wr] = w;
    }
    if (l.polaczenie != null) {
      const o = obj(l.polaczenie) || zle('„logo.polaczenie” musi być obiektem.'), w = { linia: o.linia !== false };
      opc(o, 'liniaGrubosc', 0, 20, 'logo.polaczenie', w); opc(o, 'liniaKrycie', 0, 1, 'logo.polaczenie', w);
      opc(o, 'podpisDoSygnetu', 0.2, 3, 'logo.polaczenie', w); opc(o, 'odstep', 0, 3, 'logo.polaczenie', w);
      logo.polaczenie = w;
    }
    if (l.znakWodny != null) {
      const o = obj(l.znakWodny) || zle('„logo.znakWodny” musi być obiektem.'), w = {};
      w.wariant = o.wariant == null ? 'sygnet' : ['sygnet', 'podpis'].includes(o.wariant) ? o.wariant : zle('„logo.znakWodny.wariant” musi mieć wartość „sygnet” albo „podpis”.');
      w.pozycja = o.pozycja == null ? 'prawy-dol' : POZYCJE.includes(o.pozycja) ? o.pozycja : zle(`„logo.znakWodny.pozycja” musi mieć jedną z wartości: ${POZYCJE.join(', ')}.`);
      opc(o, 'krycie', 0, 1, 'logo.znakWodny', w); opc(o, 'wysokosc', 20, 3000, 'logo.znakWodny', w);
      if (o.wyjscie != null) {
        if (!Array.isArray(o.wyjscie) || o.wyjscie.length !== 2) zle('„logo.znakWodny.wyjscie” musi być parą liczb [x, y].');
        w.wyjscie = o.wyjscie.map((v, i) => num(v, -3000, 3000, `logo.znakWodny.wyjscie[${i + 1}]`));
      }
      logo.znakWodny = w;
    }
    if (l.rozmiary != null) {
      const o = obj(l.rozmiary) || zle('„logo.rozmiary” musi być obiektem.'), w = {};
      for (const kl of ['podpis', 'sygnet', 'polaczenieSygnet', 'minSygnet']) opc(o, kl, 10, 800, 'logo.rozmiary', w);
      logo.rozmiary = w;
    }
    if (l.uzycie != null) {
      const o = obj(l.uzycie) || zle('„logo.uzycie” musi być obiektem.'), w = {};
      const znak = (v, gdzie) => (ZNAKI.includes(v) ? v : zle(`„${gdzie}” musi mieć jedną z wartości: ${ZNAKI.join(', ')}.`));
      for (const [typ, v] of Object.entries(o)) {
        if (!/^[a-z]{2,20}$/.test(typ)) continue;
        if (typeof v === 'string') { w[typ] = znak(v, `logo.uzycie.${typ}`); continue; }
        const x = obj(v) || zle(`„logo.uzycie.${typ}” musi być nazwą znaku albo obiektem { gora, stopka, znakWodny }.`), y = {};
        if (x.gora != null) y.gora = znak(x.gora, `logo.uzycie.${typ}.gora`);
        if (x.stopka != null) y.stopka = znak(x.stopka, `logo.uzycie.${typ}.stopka`);
        if (x.znakWodny != null) y.znakWodny = !!x.znakWodny;
        w[typ] = y;
      }
      logo.uzycie = w;
    }
    if (Object.keys(logo).length) reszta.logoV2 = logo;
    // zdjęcia z opisem i położeniem głowy (automatyczny kadr „głowa do klatki”)
    if (Array.isArray(s.zdjecia)) {
      reszta.zdjecia = s.zdjecia.slice(0, 60).map((x, i) => {
        if (typeof x === 'string') return { plik: obraz(x, `zdjecia[${i + 1}]`) };
        const o = obj(x) || zle(`„zdjecia[${i + 1}]” musi być adresem albo obiektem { plik, opis, glowa }.`);
        const w = { plik: obraz(o.plik, `zdjecia[${i + 1}].plik`), opis: tekstL(o.opis, 120) };
        if (o.podglad) w.podglad = obraz(o.podglad, `zdjecia[${i + 1}].podglad`);
        if (o.w != null && o.h != null) { w.w = num(o.w, 1, 20000, `zdjecia[${i + 1}].w`); w.h = num(o.h, 1, 20000, `zdjecia[${i + 1}].h`); }
        if (o.glowa != null) {
          const g = obj(o.glowa) || zle(`„zdjecia[${i + 1}].glowa” musi być obiektem { gora, broda, x }.`);
          w.glowa = { gora: num(g.gora, 0, 1, `zdjecia[${i + 1}].glowa.gora`), broda: num(g.broda, 0, 1, `zdjecia[${i + 1}].glowa.broda`), x: num(g.x ?? 0.5, 0, 1, `zdjecia[${i + 1}].glowa.x`) };
          if (w.glowa.broda <= w.glowa.gora) zle(`„zdjecia[${i + 1}].glowa.broda” musi być niżej niż „gora”.`);
        }
        return w;
      });
    }
    if (s.kadr != null) {
      const o = obj(s.kadr) || zle('„kadr” musi być obiektem { twarz, glowaOdGory }.'), w = {};
      for (const [kl, min, max] of [['twarz', 0.05, 1], ['glowaOdGory', 0, 0.6]]) {
        const x = obj(o[kl]); if (!x) continue;
        w[kl] = {};
        for (const fm of ['post', 'story', 'kwadrat']) opc(x, fm, min, max, `kadr.${kl}`, w[kl]);
      }
      reszta.kadr = w;
    }
    // ściągawka, wzorce PNG, gotowe projekty i dokument systemu
    if (Array.isArray(s.zasady)) reszta.zasady = s.zasady.filter(x => typeof x === 'string' && x.trim()).slice(0, 40).map(x => x.slice(0, 500));
    if (Array.isArray(s.wzorce)) {
      reszta.wzorce = s.wzorce.slice(0, 150).map((x, i) => {
        const o = obj(x) || zle(`„wzorce[${i + 1}]” musi być obiektem.`);
        return { grupa: tekstL(o.grupa, 40), nazwa: tekstL(o.nazwa, 80), plik: obraz(o.plik, `wzorce[${i + 1}].plik`),
          format: FORMATY[o.format] ? o.format : '', typ: /^[a-z]{2,20}$/.test(o.typ || '') ? o.typ : '' };
      });
    }
    if (Array.isArray(s.projekty)) {
      reszta.projekty = s.projekty.slice(0, 80).map((x, i) => {
        const o = obj(x) || zle(`„projekty[${i + 1}]” musi być obiektem.`), w = { nazwa: tekstL(o.nazwa || `Projekt ${i + 1}`, 80) };
        w.format = FORMATY[o.format] ? o.format : 'post';
        if (/^[a-z]{2,20}$/.test(o.typ || '')) w.typ = o.typ;
        for (const kl of Object.keys(P)) {
          if (o[kl] == null || o[kl] === '') continue;
          if (kl === 'zdjecie') w.zdjecie = obraz(o.zdjecie, `projekty[${i + 1}].zdjecie`);
          else if (P[kl].typ === 'num') w[kl] = num(o[kl], P[kl].min, P[kl].max, `projekty[${i + 1}].${kl}`);
          else w[kl] = tekstL(o[kl], 600);
        }
        return w;
      });
    }
    if (s.dokument) reszta.dokument = /^(\/media\/[a-f0-9]{32}|https:\/\/\S+)$/.test(s.dokument) ? s.dokument : zle(`„dokument” musi być plikiem z aplikacji albo adresem https://.${SCIEZKA}`);
    return { kolory, tytul, tekst, fonty, styl, reszta };
  }

  /* ---------- wspólne formaty i szablony ---------- */
  const FORMATY = {
    post: { w: 1080, h: 1350, nazwa: 'Post / slajd karuzeli', opis: 'Instagram, Facebook i LinkedIn, 1080 × 1350' },
    story: { w: 1080, h: 1920, nazwa: 'Relacja / okładka rolki', opis: '1080 × 1920' },
    kwadrat: { w: 1080, h: 1080, nazwa: 'Awatar / okładka wyróżnionej relacji', opis: '1080 × 1080' },
    likwadrat: { w: 1200, h: 1200, nazwa: 'Post kwadratowy LinkedIn', opis: '1200 × 1200' },
    poziom: { w: 1200, h: 627, nazwa: 'Post poziomy LinkedIn / link', opis: '1200 × 627' },
    fb: { w: 1640, h: 624, nazwa: 'Okładka Facebooka', opis: '1640 × 624' },
    lifirma: { w: 2256, h: 382, nazwa: 'Baner LinkedIn – firma', opis: '2256 × 382' },
    liosoba: { w: 1584, h: 396, nazwa: 'Baner LinkedIn – osoba', opis: '1584 × 396' },
  };
  const PIONOWE = ['okladka', 'tekst', 'cytat', 'liczba', 'zdjecie', 'cta', 'zamkniecie', 'logo'];
  // „wlasny” – kreator: grafika złożona od zera z warstw (tło, zdjęcia, logo, teksty, dodatki) z materiałów systemu
  const TYPY_FORMATU = { post: [...PIONOWE, 'wlasny'], story: [...PIONOWE, 'wlasny'], kwadrat: ['awatar', 'wyroznione', 'wlasny'],
    likwadrat: [...PIONOWE.filter(t => t !== 'logo'), 'wlasny'], poziom: ['poziom', 'wlasny'],
    fb: ['baner', 'wlasny'], lifirma: ['baner', 'wlasny'], liosoba: ['baner', 'wlasny'] };
  const NAZWY_TYPOW = {
    okladka: 'Okładka na zdjęciu', tekst: 'Slajd z treścią', cytat: 'Cytat', liczba: 'Liczba / wynik', zdjecie: 'Zdjęcie z podpisem osoby',
    cta: 'Zaproszenie z wezwaniem', zamkniecie: 'Zamknięcie na zdjęciu', logo: 'Samo logo', awatar: 'Awatar (znak)', wyroznione: 'Okładka wyróżnionej relacji',
    poziom: 'Tekst i zdjęcie obok siebie', baner: 'Logo i hasło', wlasny: 'Własny układ (kreator od zera)',
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
    zamkniecie: ['zdjecie', 'kadr', 'tytul', 'rozmiar', 'pod', 'cien', 'prawa'],
    logo: ['tlo'], awatar: ['tlo'], wyroznione: ['tlo', 'tytul'],
    poziom: ['tlo', 'zdjecie', 'kadr', 'nad', 'tytul', 'rozmiar', 'pod'],
    baner: ['tlo', 'tytul', 'rozmiar', 'logo'],
    wlasny: ['tlo'],
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
.zw{position:absolute;pointer-events:none;width:auto;max-width:none}
.pol{display:flex;align-items:center}
.pol .pl{align-self:stretch;background:currentColor}
.zn-s{display:block;width:auto;object-fit:contain}
.wyg{position:absolute;left:0;right:0;bottom:0}
.wl-txt .ty,.wl-txt .tx,.wl-txt .lb,.wl-txt .cyt,.wl-txt .btn{margin:0}
.wl-txt .cyt{height:auto;line-height:.8;overflow:visible}
.wl-pusty{background:repeating-linear-gradient(45deg,rgba(127,127,127,.25) 0 20px,rgba(127,127,127,.12) 20px 40px);border:3px dashed rgba(127,127,127,.6)}
`;

  window.MARKI = window.MARKI || {};
  // Buduje obiekt marki z pliku klienta. id = 'k-<id klienta>', żeby projekty każdego klienta były osobno.
  window.systemZPliku = (sys, id) => {
    const k = sys.kolory, f = sys.fonty, st = sys.styl, L = sys.logo;
    const Z = sys.zlozone || {}, M = sys.marginesy || {}, E = f.etykieta || {}, LV = sys.logoV2 || {}, U = LV.uzycie || {}, TL = sys.tla || {};
    const tlo = (g, kolor) => (g ? `${gradientCss(g)}, ${kolor}` : kolor);
    const css = `:root{--ciemny:${k.ciemny};--jasny:${k.jasny};--akcent:${k.akcent};--tlo:${k.tlo};--akt:${k.akcentTekst || k.ciemny};
--ft:"${fontNazwa(f.tytul.rodzina)}",Georgia,serif;--fx:"${fontNazwa(f.tekst.rodzina)}",Arial,sans-serif;
--tw:${f.tytul.waga};--tu:${f.tytul.wersaliki ? 'uppercase' : 'none'};--r:${st.zaokraglenie}px}` + CSS_WSPOLNY + cssV2();
    // wersja 2: wszystko poniżej dopisujemy tylko wtedy, gdy plik to określa – bez tych pól grafika wygląda jak w v1
    function cssV2() {
      let s = '';
      if (Z.tloCiemne) s += `.ciemne{background:${tlo(Z.tloCiemne, k.ciemny)}}`;
      if (Z.tloJasne) s += `.jasne{background:${tlo(Z.tloJasne, k.tlo)}}`;
      if (Z.tloAkcent) s += `.akcent{background:${tlo(Z.tloAkcent, k.akcent)}}`;
      // obraz tła nad gradientem: pion dla postów, relacji i kwadratów, poziom dla grafik poziomych i banerów
      const KOL = { ciemne: [Z.tloCiemne, k.ciemny], jasne: [Z.tloJasne, k.tlo], akcent: [Z.tloAkcent, k.akcent] };
      for (const t of TLA) {
        const o = TL[t]; if (!o) continue;
        const pod = tlo(...KOL[t]), url = u => `url('${cssUrl(u)}') 50% 50%/cover no-repeat, ${pod}`;
        if (o.pion || o.poziom) s += `.c.${t}{background:${url(o.pion || o.poziom)}}`;
        if (o.poziom || o.pion) s += `.c.poz.${t}{background:${url(o.poziom || o.pion)}}`;
      }
      if (k.tekstNaJasnym) s += `.jasne{color:${k.tekstNaJasnym}}`;
      const anj = k.akcentNaJasnym;
      if (anj) s += `.jasne .et,.jasne .ty b,.jasne .cyt,.jasne .au,.jasne .lb{color:${anj}}.jasne .li{background:${anj}}.jasne .os{border-color:${anj}}
.jasne .btn,.jasne .et.pig{background:${anj};color:${k.tlo}}`;
      if (k.etykietaNaJasnym) s += `.jasne .et:not(.pig){color:${k.etykietaNaJasnym}}`;
      const t = f.tytul, x = f.tekst;
      if (t.interlinia != null) s += `.ty{line-height:${t.interlinia}}`;
      if (t.odstep != null) s += `.ty{letter-spacing:${t.odstep}em}`;
      if (sys.wersja >= 2 && x.waga != null) s += `.tx{font-weight:${x.waga}}`;  // w v1 waga tekstu była pomijana
      if (x.interlinia != null) s += `.tx{line-height:${x.interlinia}}`;
      if (E.rodzina) s += `.et,.nr{font-family:"${fontNazwa(E.rodzina)}",var(--fx)}`;
      if (E.waga != null) s += `.et,.nr{font-weight:${E.waga}}`;
      if (E.odstep != null) s += `.et{letter-spacing:${E.odstep}em}`;
      if (E.rozmiar != null) s += `.et,.nr{font-size:${E.rozmiar}px}`;
      if (E.wersaliki != null) s += `.et{text-transform:${E.wersaliki ? 'uppercase' : 'none'}}`;
      if (f.akcent === 'kursywa') s += '.c .ty b{font-style:italic;color:inherit}';
      if (f.akcent === 'pogrubienie') s += '.c .ty b{font-weight:700;color:inherit}';
      if (st.cienNaTytule === false) s += '.na-foto .ty{text-shadow:none}';
      const mg = (sel, o) => (o && Object.keys(o).length ? `${sel}{${o.bok != null ? `--m:${o.bok}px;` : ''}${o.gora != null ? `--g:${o.gora}px;` : ''}${o.dol != null ? `--d:${o.dol}px;` : ''}}` : '');
      s += mg('.c', M.post) + mg('.c.wysoki', M.story) + mg('.c.kw', M.kwadrat);
      return s;
    }
    // logo jasne na ciemnym tle i na zdjęciu, ciemne na jasnym; brak pliku = nazwa marki krojem tytułu
    const logoSrc = motyw => (motyw === 'jasne' ? L.naJasnym || L.naCiemnym : L.naCiemnym || L.naJasnym) || '';
    const logo = (motyw, styl = '') => { const s = logoSrc(motyw); return s ? `<img class="zn" src="${tekstHtml(s)}" alt="" style="${styl}">` : `<span class="zn-t">${zwykly(sys.marka.nazwa)}</span>`; };
    const znak = (motyw, w) => { const s = L.znak || logoSrc(motyw); return s ? `<img src="${tekstHtml(s)}" alt="" style="width:${w}px;max-height:${w}px;object-fit:contain">` : `<span class="zn-t" style="font-size:${Math.round(w / 3)}px">${zwykly(sys.marka.nazwa.slice(0, 2))}</span>`; };
    // v2: warianty znaku (podpis, sygnet, połączenie) w wersji na ciemnym, jasnym i na zdjęciu; brak wariantu = jak v1
    const R = LV.rozmiary || {}, PL = LV.polaczenie || {};
    const wariant = (rodzaj, motyw) => { const w = LV[rodzaj]; if (!w) return '';
      return (motyw === 'foto' ? w.naZdjeciu || w.naCiemnym : motyw === 'jasne' ? w.naJasnym || w.naCiemnym : w.naCiemnym || w.naJasnym) || ''; };
    const img = (src, h, styl = '') => `<img class="zn-s" src="${tekstHtml(src)}" alt="" style="height:${Math.round(h)}px;${styl}">`;
    const podpis = (motyw, h = R.podpis || 60) => { const s = wariant('podpis', motyw); return s ? img(s, h) : logo(motyw === 'foto' ? 'ciemne' : motyw); };
    const sygnet = (motyw, h = R.sygnet || 72) => { const s = wariant('sygnet', motyw); return s ? img(s, Math.max(h, R.minSygnet || 0)) : znak(motyw, h); };
    const polaczenie = (motyw, h = R.polaczenieSygnet || 74) => {
      if (!LV.sygnet || !LV.podpis) return logo(motyw);
      const g = PL.odstep ?? 0.34, linia = PL.linia === false ? '' : `<span class="pl" style="width:${PL.liniaGrubosc ?? 1.5}px;opacity:${PL.liniaKrycie ?? 0.45};margin:${Math.round(h * 0.1)}px 0"></span>`;
      return `<span class="pol" style="gap:${Math.round(h * g)}px;height:${Math.round(h)}px">${sygnet(motyw, h)}${linia}${podpis(motyw, h * (PL.podpisDoSygnetu ?? 0.8))}</span>`;
    };
    const znakWg = (rodzaj, motyw, h) => (rodzaj === 'brak' ? '' : rodzaj === 'sygnet' ? sygnet(motyw, h) : rodzaj === 'polaczenie' ? polaczenie(motyw, h) : podpis(motyw, h));
    const uz = typ => (typeof U[typ] === 'object' ? U[typ] : {});
    const znakWodny = motyw => {
      const W = LV.znakWodny; if (!W) return '';
      const s = wariant(W.wariant || 'sygnet', motyw); if (!s) return '';
      const [x, y] = W.wyjscie || [0, 0], h = W.wysokosc || 1000;
      const poz = { 'prawy-dol': `right:${x}px;bottom:${y}px`, 'lewy-dol': `left:${x}px;bottom:${y}px`, 'prawy-gora': `right:${x}px;top:${y}px`,
        'lewy-gora': `left:${x}px;top:${y}px`, srodek: 'left:50%;top:50%;transform:translate(-50%,-50%)' }[W.pozycja || 'prawy-dol'];
      return `<img class="zw" src="${tekstHtml(s)}" alt="" style="height:${h}px;opacity:${W.krycie ?? 0.07};${poz}">`;
    };
    const zdjecie = n => n || '';
    // Kadr „głowa do klatki”: dla zdjęcia z systemu z opisem głowy i bez ręcznego kadru liczymy rozmiar i położenie w px
    // (twarz zajmuje kadr.twarz wysokości, czubek głowy na kadr.glowaOdGory, zdjęcie nie wychodzi poza boki).
    // Gdy zdjęciu brakuje dołu, dokładamy wygaszenie w kolorze z systemu.
    const KD = sys.kadr || {}, ZD = Array.isArray(sys.zdjecia) ? sys.zdjecia.filter(z => typeof z === 'object') : [];
    const kadrAuto = (p, w, h) => {
      if (p.kadr || !p.zdjecie) return null;
      const z = ZD.find(x => x.plik === p.zdjecie || x.podglad === p.zdjecie); if (!z?.glowa || !z.w || !z.h) return null;
      const fm = p.format === 'story' ? 'story' : p.format === 'kwadrat' || p.format === 'likwadrat' ? 'kwadrat' : 'post';
      const twarz = KD.twarz?.[fm] ?? (h / w > 1.6 ? 0.29 : h / w > 1.1 ? 0.36 : 0.40), glowa = KD.glowaOdGory?.[fm] ?? (h / w > 1.6 ? 0.12 : 0.085);
      const ar = z.h / z.w, g = z.glowa;
      const IW = Math.max(w, twarz * h / ((g.broda - g.gora) * ar)), IH = IW * ar;
      const y = Math.min(0, Math.round(glowa * h - g.gora * IH)), x = Math.round(Math.max(w - IW, Math.min(0, w / 2 - g.x * IW)));
      const W = Z.wygaszenie || { kolor: k.ciemny, wysokosc: 320 }, dol = y + IH;
      const wyg = dol < h ? `<div class="wyg" style="top:${Math.round(dol - W.wysokosc)}px;background:linear-gradient(180deg,${rgba(W.kolor, 0)} 0,${W.kolor} ${W.wysokosc}px)"></div>` : '';
      return { styl: `background-size:${Math.round(IW)}px ${Math.round(IH)}px;background-position:${x}px ${y}px;`, wyg };
    };
    const foto = (p, kl = 'foto', styl = '') => {
      const fm = FORMATY[p.format] || FORMATY.post, a = kl === 'foto' ? kadrAuto(p, fm.w, fm.h) : null;
      return `<div class="${kl}${p.zdjecie ? '' : ' puste'}" style="${p.zdjecie ? `background-image:url('${cssUrl(p.zdjecie)}');` : ''}${a ? a.styl : `background-position:${cssUrl(p.kadr || '50% 50%').replace(/%/g, '% ').trim()};`}${styl}"></div>${a ? a.wyg : ''}`;
    };
    const cien = p => {
      // v2: przebieg i kolor cienia z systemu; pole „Przyciemnienie” skaluje krycie (100 = jak w systemie)
      if (Z.cien) {
        const s = p.cien === '' || p.cien == null ? 1 : Math.max(0, liczba(p.cien, 100)) / 100;
        return `<div class="cien" style="background:linear-gradient(180deg,${Z.cien.stopy.map(([a, poz]) => `${rgba(Z.cien.kolor, Math.min(1, a * s))} ${poz}%`).join(',')})"></div>`;
      }
      const a = p.cien === '' || p.cien == null ? st.cien : liczba(p.cien, 78) / 100;
      return `<div class="cien" style="background:linear-gradient(180deg,rgba(0,0,0,${(a * .35).toFixed(2)}) 0%,rgba(0,0,0,0) 18%,rgba(0,0,0,0) 42%,rgba(0,0,0,${(a * .7).toFixed(2)}) 74%,rgba(0,0,0,${a.toFixed(2)}) 100%)"></div>`; };
    const etyk = (p, styl = '') => (p.nad ? `<span class="et ${st.etykieta === 'pigulka' ? 'pig' : ''}" style="${styl}">${zwykly(p.nad)}</span>` : '');
    const gora = (p, typ, motyw) => {
      // v2: znak w górnym rogu (np. sygnet na okładce) – etykieta schodzi wtedy nad tytuł, numer zostaje po prawej
      const zn = uz(typ).gora;
      if (zn && zn !== 'brak') return `<div class="gora">${znakWg(zn, motyw, zn === 'sygnet' ? R.sygnet || 72 : undefined)}${p.nr ? `<span class="nr">${zwykly(p.nr)}</span>` : ''}</div>`;
      return p.nad || p.nr ? `<div class="gora">${etyk(p)}${p.nr ? `<span class="nr">${zwykly(p.nr)}</span>` : ''}</div>` : '';
    };
    const nadTytulem = (p, typ) => (uz(typ).gora && uz(typ).gora !== 'brak' && p.nad ? `<div style="margin-bottom:28px">${etyk(p)}</div>` : '');
    const wodny = (typ, motyw) => (uz(typ).znakWodny ? znakWodny(motyw) : '');
    const tytul = (p, r) => (p.tytul ? `<h1 class="ty" style="--t:${liczba(p.rozmiar, r)}px">${linie(p.tytul)}</h1>` : '');
    const linia = () => (st.linia ? '<div class="li"></div>' : '');
    const tekst = (p, styl = '') => (p.pod ? `<p class="tx" style="${styl}">${pogrubienia(p.pod)}</p>` : '');
    const stopka = (p, motyw, typ) => {
      const zn = uz(typ).stopka;
      return `<div class="st">${zn ? znakWg(zn, motyw) : logo(motyw)}<span>${zwykly(p.prawa || sys.teksty.stopka)}</span></div>`;
    };
    const glowny = (typ, motyw, h, v1) => (typeof U[typ] === 'string' ? znakWg(U[typ], motyw, h) : v1);
    const TYPY = {
      okladka: (p, m) => `${foto(p)}${cien(p)}${gora(p, 'okladka', 'foto')}<div class="dol">${nadTytulem(p, 'okladka')}${tytul(p, 104)}${linia()}${tekst(p)}${stopka(p, 'foto', 'okladka')}</div>`,
      tekst: (p, m) => `${wodny('tekst', m)}${gora(p, 'tekst', m)}<div class="dol">${nadTytulem(p, 'tekst')}${tytul(p, 84)}${linia()}${tekst(p)}${stopka(p, m, 'tekst')}</div>`,
      cytat: (p, m) => `${wodny('cytat', m)}${gora(p, 'cytat', m)}<div class="dol">${nadTytulem(p, 'cytat')}<div class="cyt">“</div>${tytul(p, 68)}${p.autor ? `<div class="au">— ${zwykly(p.autor)}</div>` : ''}${stopka(p, m, 'cytat')}</div>`,
      liczba: (p, m) => `${wodny('liczba', m)}${gora(p, 'liczba', m)}<div class="dol">${nadTytulem(p, 'liczba')}<div class="lb" style="--n:${liczba(p.wielkosc, 300)}px">${zwykly(p.liczba || '')}</div>${tytul(p, 72)}${tekst(p)}${stopka(p, m, 'liczba')}</div>`,
      zdjecie: p => `${foto(p)}${cien(p)}<div class="dol"><div class="os"><b>${zwykly(p.imie || '')}</b><em>${zwykly(p.rola || '')}</em></div><div style="margin-top:48px">${uz('zdjecie').stopka ? znakWg(uz('zdjecie').stopka, 'foto') : logo('foto')}</div></div>`,
      cta: (p, m) => `${wodny('cta', m)}${gora(p, 'cta', m)}<div class="dol">${nadTytulem(p, 'cta')}${tytul(p, 96)}${tekst(p)}<div><span class="btn">${zwykly(p.cta || sys.teksty.cta)}</span></div>${stopka(p, m, 'cta')}</div>`,
      zamkniecie: p => `${foto(p)}${cien(p)}<div class="dol">${tytul(p, 88)}${linia()}${tekst(p)}<div class="st">${uz('zamkniecie').stopka ? znakWg(uz('zamkniecie').stopka, 'foto') : LV.sygnet && LV.podpis ? polaczenie('foto') : logo('foto')}<span>${zwykly(p.prawa || sys.teksty.stopka)}</span></div></div>`,
      logo: (p, m) => `<div class="cnt">${glowny('logo', m, 260, logo(m, 'height:auto;width:62%;max-width:none;max-height:40%'))}</div>`,
      awatar: (p, m) => `<div class="cnt">${glowny('awatar', m, 600, znak(m, 600))}</div>`,
      wyroznione: (p, m) => `<div class="cnt">${glowny('wyroznione', m, 300, znak(m, 300))}<div class="ty" style="--t:84px;margin-top:44px">${zwykly(p.tytul || '')}</div></div>`,
      baner: (p, m) => `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:70px;padding:0 90px">${glowny('baner', m, liczba(p.logo, 380) / 4, logo(m, `height:auto;width:${liczba(p.logo, 380)}px;max-width:none`))}${p.tytul ? `<h1 class="ty" style="--t:${liczba(p.rozmiar, 52)}px">${linie(p.tytul)}</h1>` : ''}</div>`,
    };
    /* ---------- kreator „Własny układ”: warstwy w px formatu, wszystko z materiałów systemu ---------- */
    const PALETA = (Array.isArray(k.paleta) ? k.paleta : []).filter(x => x && HEX2.test(x.hex || ''));
    const KOL_W = { jasny: 'var(--jasny)', ciemny: 'var(--ciemny)', akcent: 'var(--akcent)', tlo: 'var(--tlo)' };
    if (k.akcentNaJasnym) KOL_W.akcentNaJasnym = k.akcentNaJasnym;
    const kolorW = v => (!v || v === 'auto' ? '' : KOL_W[v] || (HEX2.test(v) ? v : ''));
    const WYPEL = { tloCiemne: [Z.tloCiemne, k.ciemny], tloJasne: [Z.tloJasne, k.tlo], tloAkcent: [Z.tloAkcent, k.akcent] };
    const kadrPoz = v => cssUrl(v || '50% 50%').replace(/%/g, '% ').trim();
    const ZNAKI_W = ['podpis', 'sygnet', 'polaczenie'];
    const warstwa = (w, p, motyw) => {
      if (!w || typeof w !== 'object') return '';
      const id = String(w.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 24);
      const x = Math.round(liczba(w.x, 0)), y = Math.round(liczba(w.y, 0)), sz = Math.max(4, liczba(w.w, 400)), wy = Math.max(1, liczba(w.h, sz));
      const op = Math.max(0, Math.min(1, liczba(w.krycie, 100) / 100)), obr = liczba(w.obrot, 0);
      const baza = `position:absolute;left:${x}px;top:${y}px;opacity:${op};${obr ? `transform:rotate(${obr}deg);` : ''}`;
      const kol = kolorW(w.kolor), r = Math.max(0, liczba(w.zaokr, 0));
      const blok = (wnetrze, styl = '', kl = '') => `<div data-w="${id}" class="${kl}" style="${baza}${styl}">${wnetrze}</div>`;
      const pelny = wnetrze => `<div data-w="${id}" data-full="1" style="position:absolute;inset:0;opacity:${op}">${wnetrze}</div>`;
      switch (w.rodzaj) {
        case 'zdjecie': {
          const ok = typeof w.plik === 'string' && OBRAZ.test(w.plik);
          if (w.pelne) return pelny(ok ? foto({ zdjecie: w.plik, kadr: w.kadr, format: p.format }) : '<div class="foto puste"></div>');
          return blok('', `width:${sz}px;height:${wy}px;border-radius:${r}px;${ok ? `background:url('${cssUrl(w.plik)}') ${kadrPoz(w.kadr)}/cover no-repeat` : ''}`, ok ? '' : 'wl-pusty');
        }
        case 'cien': return pelny(cien({ cien: w.sila }));
        case 'logo': {
          const m2 = ['ciemne', 'jasne', 'foto'].includes(w.motyw) ? w.motyw : motyw === 'jasne' ? 'jasne' : 'ciemne';
          const zn = ZNAKI_W.includes(w.wariant) ? w.wariant : 'podpis', h = Math.max(10, liczba(w.h, 80));
          return blok(zn === 'podpis' && !LV.podpis ? logo(m2 === 'foto' ? 'ciemne' : m2, `height:${h}px;max-width:none`) : znakWg(zn, m2, h), `height:${h}px;display:flex;align-items:center`);
        }
        case 'tekst': {
          const rozm = Math.max(8, liczba(w.rozmiar, 48)), c = kol ? `color:${kol};` : '', t = w.tresc || '';
          const wyr = ['left', 'center', 'right'].includes(w.wyr) ? `text-align:${w.wyr};` : '';
          const cienT = w.cienTekstu ? 'text-shadow:0 2px 30px rgba(0,0,0,.45);' : '';
          const wn = {
            tytul: () => `<h1 class="ty" style="--t:${rozm}px;${c}${cienT}">${linie(t)}</h1>`,
            etykieta: () => `<span class="et ${st.etykieta === 'pigulka' ? 'pig' : ''}" style="font-size:${rozm}px;${c}${cienT}">${zwykly(t)}</span>`,
            liczba: () => `<div class="lb" style="--n:${rozm}px;${c}${cienT}">${zwykly(t)}</div>`,
            cytat: () => `<div class="cyt" style="font-size:${rozm}px;${c}">“</div>`,
            przycisk: () => `<span class="btn" style="font-size:${rozm}px;padding:${Math.round(rozm * .75)}px ${Math.round(rozm * 1.3)}px;${kol ? `background:${kol};` : ''}">${zwykly(t)}</span>`,
          }[w.styl] || (() => `<p class="tx" style="font-size:${rozm}px;${c}${cienT}">${pogrubienia(t).replace(/\n/g, '<br>')}</p>`);
          return blok(wn(), `width:${sz}px;${wyr}`, 'wl-txt');
        }
        case 'linia': return blok('', `width:${sz}px;height:${Math.max(1, liczba(w.h, 3))}px;background:${kol || 'var(--akcent)'};border-radius:${r}px`);
        case 'ksztalt': {
          const g = WYPEL[w.wypelnienie];
          return blok('', `width:${sz}px;height:${wy}px;border-radius:${r}px;background:${g ? tlo(g[0], g[1]) : kol || 'var(--akcent)'}`);
        }
        default: return '';
      }
    };
    const wlasny = (p, motyw) => (Array.isArray(p.warstwy) ? p.warstwy : []).slice(0, 80).map(w => warstwa(w, p, motyw)).join('');
    const klasaFormatu = (format, fm) => (format === 'story' ? 'wysoki' : format === 'kwadrat' || format === 'likwadrat' ? 'kw' : fm.w > fm.h ? 'poz' : '');
    function szablon(p) {
      const format = FORMATY[p.format] ? p.format : 'post', fm = FORMATY[format];
      const motyw = DOZW.includes(p.tlo) ? p.tlo : DOZW[0];
      const wymiar = `width:${fm.w}px;height:${fm.h}px`;
      if (p.typ === 'wlasny') return `<div class="c ${motyw} ${klasaFormatu(format, fm)}" style="${wymiar}">${wlasny(p, motyw)}</div>`;
      if (format === 'poziom') {
        return `<div class="c poz ${motyw}" style="${wymiar}">${foto(p, 'prawa', 'width:540px')}
          <div class="lewa" style="width:660px">${logo(motyw, 'height:48px')}<div>${p.nad ? `<span class="et ${st.etykieta === 'pigulka' ? 'pig' : ''}" style="font-size:18px;display:inline-block;margin-bottom:16px">${zwykly(p.nad)}</span>` : ''}${tytul(p, 56)}${p.pod ? `<p class="tx" style="font-size:22px;margin-top:14px">${pogrubienia(p.pod)}</p>` : ''}</div></div></div>`;
      }
      const typ = TYPY_FORMATU[format].includes(p.typ) ? p.typ : TYPY_FORMATU[format][0];
      const naFoto = ['okladka', 'zdjecie', 'zamkniecie'].includes(typ);
      return `<div class="c ${naFoto ? 'ciemne na-foto' : motyw} ${klasaFormatu(format, fm)}" style="${wymiar}">${TYPY[typ](p, motyw)}</div>`;
    }
    const nazwa = sys.marka.nazwa, konto = sys.marka.konto;
    const DOZW = sys.tla?.dozwolone?.length ? sys.tla.dozwolone : TLA;
    const START = {
      okladka: { nad: 'Seria · temat', nr: '1/6', tytul: 'Zwykłe zdanie|i *jedno słowo*', rozmiar: 104, pod: '' },
      tekst: { tlo: 'jasne', nad: 'Seria · temat', nr: '2/6', tytul: 'Tytuł slajdu|*w dwóch wierszach*', rozmiar: 84, pod: 'Krótki tekst w jednym, dwóch zdaniach. *Najważniejsze* pogrubione.' },
      cytat: { tlo: 'ciemne', tytul: 'Zdanie, które warto zapamiętać.', rozmiar: 68, autor: 'Imię Nazwisko' },
      liczba: { tlo: 'akcent', nad: 'Wynik', liczba: '120%', tytul: 'Co oznacza|*ta liczba*', rozmiar: 72 },
      zdjecie: { imie: 'Imię Nazwisko', rola: `Rola · ${nazwa}` },
      cta: { tlo: 'ciemne', nad: 'Zaproszenie', tytul: 'Jedno jasne|*zaproszenie*', rozmiar: 96, pod: 'Co zyskasz i kiedy.', cta: sys.teksty.cta },
      zamkniecie: { tytul: 'Dziękuję|*za uwagę*', rozmiar: 88, pod: sys.teksty.cta },
      logo: { tlo: 'ciemne' }, awatar: { tlo: 'ciemne' }, wyroznione: { tlo: 'ciemne', tytul: 'Realizacje' },
      poziom: { tlo: 'ciemne', nad: nazwa, tytul: 'Tytuł grafiki|*poziomej*', rozmiar: 56, pod: konto },
      baner: { tlo: 'ciemne', tytul: `${nazwa}|*hasło marki*`, rozmiar: 52 },
      wlasny: { tlo: 'ciemne', warstwy: [] },
    };
    // pola i ich opcje są wspólne – dla marki z ograniczonymi tłami albo własnym cieniem robimy kopię, nie zmieniamy wspólnych
    const pola = { ...P }, polaTypow = { ...POLA_TYPOW };
    if (DOZW.length < TLA.length) {
      pola.tlo = { ...P.tlo, opcje: P.tlo.opcje.filter(([o]) => DOZW.includes(o)) };
      for (const t of Object.values(START)) if (t.tlo && !DOZW.includes(t.tlo)) t.tlo = DOZW[0];
      if (DOZW.length === 1) for (const t of Object.keys(polaTypow)) polaTypow[t] = polaTypow[t].filter(x => x !== 'tlo');
    }
    if (Z.cien) pola.cien = { ...P.cien, hint: '% siły cienia z systemu · puste = 100' };
    const podglad = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><rect width="4" height="5" fill="${k.ciemny}"/><rect y="3.6" width="4" height=".08" fill="${k.akcent}"/></svg>`)}`;
    const zdj = (sys.zdjecia || []).map(z => (typeof z === 'string' ? { plik: z } : z));
    const projekty = (sys.projekty || []).map((x, i) => ({ id: `p${i}`, ...x }));
    const przyklady = { zbiory: projekty.length ? [{ nazwa: 'Gotowe projekty z systemu', projekty }] : [], zdjecia: zdj.map(z => z.plik) };
    const miniatura = n => zdj.find(z => z.plik === n)?.podglad || n;
    const opisZdjecia = n => zdj.find(z => z.plik === n)?.opis || '';
    const podgladProjektu = id => { const x = projekty.find(p => p.id === id); return x?.zdjecie ? miniatura(x.zdjecie) : podglad; };
    window.MARKI[id] = {
      id, nazwa, css, fonty: f.google || 'data:text/css,', zrodlo: sys.wczytano || 0,
      formaty: FORMATY, typyFormatu: TYPY_FORMATU, nazwyTypow: NAZWY_TYPOW, pola, polaTypow, start: START,
      zdjecieUrl: zdjecie, miniatura, opisZdjecia, podgladPrzykladu: podgladProjektu,
      wzorce: sys.wzorce || [], zasady: sys.zasady || [], dokument: sys.dokument || '',
      szablon, przyklady, async init() {},
      // materiały dla kreatora „Własny układ” (znaki, kolory i wypełnienia z systemu)
      kreator: {
        znaki: [['polaczenie', 'Sygnet + podpis (połączenie)'], ['podpis', 'Podpis / logo'], ['sygnet', 'Sygnet']]
          .filter(([z]) => z === 'podpis' || (z === 'polaczenie' ? LV.sygnet && LV.podpis : LV.sygnet || L.znak)),
        kolory: [['auto', 'Automatycznie (do tła)'], ['jasny', 'Jasny'], ['ciemny', 'Ciemny'], ['akcent', 'Akcent'], ['tlo', 'Jasne tło'],
          ...(k.akcentNaJasnym ? [['akcentNaJasnym', 'Akcent na jasnym']] : []), ...PALETA.map(x => [x.hex, x.nazwa || x.hex])],
        wypelnienia: [['', 'Kolor'], ...[['tloCiemne', 'Gradient ciemny'], ['tloJasne', 'Gradient jasny'], ['tloAkcent', 'Gradient akcentu']].filter(([g]) => Z[g])],
        znakWodny: LV.znakWodny || null, cta: sys.teksty.cta,
      },
    };
    return window.MARKI[id];
  };
  window.sprawdzSystem = sprawdzSystem;
  window.gradientSystemu = gradientCss;  // podgląd pasków gradientu w profilu klienta
})();
