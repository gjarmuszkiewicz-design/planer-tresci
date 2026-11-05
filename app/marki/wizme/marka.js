/* System identyfikacji WIZme na social media – szablony grafik.
   Przeniesione 1:1 z generatora D:\FREELANCER\__WIZME\system-social-wizme\generuj.js: te same wymiary, kolory,
   marginesy i zasady typografii. Zmiany wyglądu wprowadzamy tutaj, a nie w polach edytora. */
(() => {
  const DIR = '/marki/wizme';
  const tekstHtml = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // zdjęcie przykładowe z pakietu marki albo wgrane do aplikacji (/media/...)
  const zdjecie = (n = '') => /^(\/|https?:)/.test(n) ? n : `${DIR}/zdjecia/${n}`;
  const cssUrl = (s = '') => String(s).replace(/['"\\()\s]/g, '');
  // Spójniki na końcu wiersza przechodzą do następnego.
  const nbsp = (s = '') => s.replace(/(^|\s)([aiouwzAIOUWZ])\s/g, '$1$2\u00a0');
  // Nazwa marki nigdy nie idzie w wersaliki.
  const wielkie = (s = '') => s.toLocaleUpperCase('pl').replace(/WIZME\.AI/g, 'wizme.ai').replace(/WIZME\.PL/g, 'wizme.pl').replace(/WIZME/g, 'WIZme');
  // Składnia tytułu: | nowy wiersz, *słowo* akcent.
  const linie = (s = '', akcent = 'mag') => String(s).split('|').map(l =>
    `<span class="l">${wielkie(nbsp(tekstHtml(l))).replace(/\*([^*]+)\*/g, `<b class="${akcent === 'noc2' ? 'noc2' : 'mag'}">$1</b>`)}</span>`).join('');
  const zwykly = (s = '') => nbsp(tekstHtml(s));
  const pogrubienia = (s = '') => zwykly(s).replace(/\*([^*]+)\*/g, '<b>$1</b>');
  const liczba = (v, d) => (v === '' || v == null || isNaN(+v) ? d : +v);

  const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#130b30;overflow:hidden}
.c{position:relative;overflow:hidden;font-family:Poppins,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;--m:80px;--g:80px;--d:80px}
.wysoki{--g:260px;--d:410px}
.noc{background:radial-gradient(120% 70% at 100% 20%,#ee3c7466 0%,transparent 55%),radial-gradient(90% 60% at 10% 90%,#39125a 0%,transparent 70%),linear-gradient(160deg,#27105a 0%,#130b30 60%,#160d36 100%)}
.magenta{background:#ee1a7f}
.biel{background:#fff;color:#130b30}
.logo svg,.syg svg{display:block;width:100%;height:auto}
.foto{position:absolute;inset:0;background-size:cover}
.cien{position:absolute;inset:0;background:linear-gradient(to bottom,#130b3099 0%,#130b3000 22%,#130b3000 44%,#130b30cc 72%,#130b30 100%)}
.cien.lekki{background:linear-gradient(to bottom,#130b3066 0%,#130b3000 20%,#130b3000 70%,#130b30bb 100%)}
.cien.miekki{background:linear-gradient(to bottom,#130b3080 0%,#130b3000 16%,#130b3000 52%,#130b30b3 72%,#130b30f2 86%,#130b30 100%)}
.tel{position:absolute;left:50%;top:var(--tt,250px);width:var(--tw,640px);aspect-ratio:1290/2796;transform:translateX(-50%);border-radius:78px;border:16px solid #07040f;background-size:cover;background-position:top center;box-shadow:0 0 0 2px #ffffff26,0 50px 140px #0009}
.tel.skos{left:auto;right:-30px;transform:rotate(-7deg)}
.cien.nisko{background:linear-gradient(to bottom,#130b3000 0%,#130b3000 58%,#130b30b3 74%,#130b30f0 86%,#130b30 100%)}
.gora{position:absolute;left:var(--m);right:var(--m);top:var(--g);display:flex;justify-content:space-between;align-items:center}
.pill{display:inline-block;background:#ee1a7f;color:#fff;padding:8px 22px;border-radius:10px;font-weight:600;font-size:30px;letter-spacing:3px;line-height:1.3;text-transform:uppercase}
.magenta .pill{background:#130b30}
.nr{font-weight:600;font-size:28px}
.miekki~.gora .nr{background:#130b30cc;padding:4px 16px;border-radius:10px}
.dol{position:absolute;left:var(--m);right:var(--m);bottom:var(--d)}
.d{font-weight:800;font-size:var(--t,104px);line-height:1.04;letter-spacing:-1px}
.d .l{display:block}
.cieniowany .d{text-shadow:0 6px 0 rgba(19,11,48,.85),0 14px 36px rgba(19,11,48,.55)}
.magenta.cieniowany .d,.biel.cieniowany .d{text-shadow:none}
.d b{font-weight:800}
.mag{color:#ee1a7f}
.noc2{color:#130b30}
.s{font-size:36px;font-weight:600;line-height:1.35;margin-top:28px}
.t{font-size:40px;font-weight:400;line-height:1.42}
.t b{font-weight:600;color:#ee1a7f}
.biel .t b{color:#c80f66}
.magenta .t b{color:#fff}
.belka{border-left:10px solid #ee1a7f;padding-left:36px;margin-top:40px}
.magenta .belka{border-color:#fff}
.mini{width:270px}
.pel{width:100%}
.stopka{display:flex;justify-content:space-between;align-items:center;margin-top:64px}
.stopka span{font-weight:600;font-size:30px}
.pasek-dol{position:absolute;left:var(--m);right:var(--m);bottom:var(--d)}
.podpis{display:inline-flex;align-items:stretch}
.podpis i{width:12px;background:#ee1a7f;border-radius:6px}
.podpis div{margin-left:14px;padding:18px 30px 20px 26px;border-radius:18px;background:rgba(19,11,48,.86)}
.podpis b{display:block;font-weight:800;font-size:46px;line-height:1.1}
.podpis em{display:block;font-style:normal;font-weight:600;font-size:30px;line-height:1.3;color:#ee1a7f;margin-top:4px}
.luk{position:absolute;right:-300px;top:-210px;width:1250px;color:#fff;opacity:.075}
.biel .luk{color:#130b30;opacity:.05}
.magenta .luk{opacity:.16}
.woda{position:absolute;left:-570px;top:-170px;width:1100px;color:#fff;opacity:.18}
.split{position:absolute;left:0;right:0;top:0;background-size:cover}
.liczba{font-weight:800;font-size:var(--t,330px);line-height:.92;letter-spacing:-6px}
.prawa{position:absolute;right:0;top:0;bottom:0;background-size:cover}
.lewa{position:absolute;left:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:space-between;padding:52px 56px}
.srodek{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
`;

  const FORMATY = {
    post: { w: 1080, h: 1440, nazwa: 'Post', opis: 'Instagram i Facebook, 1080 × 1440' },
    story: { w: 1080, h: 1920, nazwa: 'Relacja / okładka rolki', opis: '1080 × 1920' },
    kwadrat: { w: 1080, h: 1080, nazwa: 'Awatar / okładka wyróżnionej relacji', opis: '1080 × 1080' },
    poziom: { w: 1200, h: 627, nazwa: 'Grafika pozioma', opis: 'LinkedIn i link, 1200 × 627' },
    fb: { w: 1640, h: 624, nazwa: 'Okładka Facebooka', opis: '1640 × 624' },
    lifirma: { w: 2256, h: 382, nazwa: 'Baner LinkedIn – firma', opis: '2256 × 382' },
    liosoba: { w: 1584, h: 396, nazwa: 'Baner LinkedIn – osoba', opis: '1584 × 396' },
  };
  const NA_ZDJECIU = ['zdjecie', 'split', 'osoba', 'podpis', 'czyste', 'woda', 'znak', 'ekran'];
  // szablony dostępne w danym formacie
  const TYPY_FORMATU = {
    post: ['tekst', 'liczba', ...NA_ZDJECIU, 'logo'],
    story: ['tekst', 'liczba', ...NA_ZDJECIU, 'logo'],
    kwadrat: ['awatar', 'wyroznione'],
    poziom: ['poziom'],
    fb: ['baner'], lifirma: ['baner'], liosoba: ['baner'],
  };
  const NAZWY_TYPOW = {
    tekst: 'Tekst na kolorze', liczba: 'Duża liczba', zdjecie: 'Zdjęcie z tytułem', split: 'Zdjęcie przechodzące w granat',
    osoba: 'Osoba: tytuł i podpis', podpis: 'Zdjęcie z podpisem osoby', czyste: 'Samo zdjęcie z logo', woda: 'Zdjęcie ze znakiem wodnym',
    znak: 'Zdjęcie z dużym logo', ekran: 'Realizacja w telefonie', logo: 'Samo logo', awatar: 'Awatar (sygnet)',
    wyroznione: 'Okładka wyróżnionej relacji', poziom: 'Zdjęcie i tytuł obok siebie', baner: 'Logo i hasło',
  };

  // Pola edytora. typ: text | area | num | select | check | foto | kadr
  const P = {
    tlo: { label: 'Tło', typ: 'select', opcje: [['noc', 'Granat'], ['magenta', 'Magenta'], ['biel', 'Biel']] },
    akcent: { label: 'Kolor akcentu w tytule', typ: 'select', opcje: [['mag', 'Magenta'], ['noc2', 'Granat (na magentowym tle)']] },
    nad: { label: 'Etykieta', typ: 'text', hint: 'np. Budujemy, Tworzymy, Chronimy' },
    nr: { label: 'Numer slajdu', typ: 'text', hint: 'np. 1/6' },
    tytul: { label: 'Tytuł', typ: 'area', hint: '| nowy wiersz · *słowo* akcent' },
    rozmiar: { label: 'Wielkość tytułu', typ: 'num', hint: 'px', min: 30, max: 200 },
    pod: { label: 'Podtytuł', typ: 'area' },
    tekst: { label: 'Tekst w belce', typ: 'area', hint: '*fragment* pogrubienie' },
    prawa: { label: 'Tekst przy logo', typ: 'text', hint: 'np. Przesuń dalej →, wizme.pl, @wizme_pl' },
    liczba: { label: 'Liczba', typ: 'text' },
    wielkosc: { label: 'Wielkość liczby', typ: 'num', hint: 'px', min: 100, max: 500 },
    zdjecie: { label: 'Zdjęcie', typ: 'foto' },
    kadr: { label: 'Kadr', typ: 'kadr', hint: 'albo przeciągnij zdjęcie na podglądzie' },
    imie: { label: 'Imię i nazwisko', typ: 'text' },
    rola: { label: 'Rola', typ: 'text' },
    cien: { label: 'Przyciemnienie', typ: 'select', opcje: [['', 'Zwykłe'], ['lekki', 'Lekkie'], ['miekki', 'Miękkie'], ['nisko', 'Tylko na dole']] },
    dolny: { label: 'Odstęp tekstu od dołu', typ: 'num', hint: 'px', min: 40, max: 900 },
    bezluku: { label: 'Bez łuku w tle', typ: 'check' },
    skos: { label: 'Telefon pod kątem', typ: 'check' },
    tw: { label: 'Szerokość telefonu', typ: 'num', hint: 'px', min: 300, max: 900 },
    tt: { label: 'Telefon od góry', typ: 'num', hint: 'px', min: 0, max: 900 },
    logo: { label: 'Szerokość logo', typ: 'num', hint: 'px', min: 150, max: 900 },
    lewo: { label: 'Odstęp od lewej', typ: 'num', hint: 'px', min: 0, max: 1500 },
    odstep: { label: 'Odstęp logo – hasło', typ: 'num', hint: 'px', min: 0, max: 300 },
  };
  const POLA_TYPOW = {
    tekst: ['tlo', 'akcent', 'nad', 'nr', 'tytul', 'rozmiar', 'pod', 'tekst', 'prawa', 'bezluku'],
    liczba: ['tlo', 'akcent', 'nad', 'nr', 'liczba', 'wielkosc', 'tytul', 'rozmiar', 'pod', 'prawa', 'bezluku'],
    zdjecie: ['zdjecie', 'kadr', 'nad', 'nr', 'tytul', 'rozmiar', 'pod', 'cien', 'dolny'],
    split: ['zdjecie', 'kadr', 'nad', 'nr', 'tytul', 'rozmiar', 'pod'],
    osoba: ['zdjecie', 'kadr', 'nad', 'nr', 'tytul', 'rozmiar', 'imie', 'rola'],
    podpis: ['zdjecie', 'kadr', 'imie', 'rola'],
    czyste: ['zdjecie', 'kadr'], woda: ['zdjecie', 'kadr'], znak: ['zdjecie', 'kadr'],
    ekran: ['zdjecie', 'tlo', 'nad', 'nr', 'tytul', 'rozmiar', 'pod', 'skos', 'tw', 'tt', 'dolny', 'bezluku'],
    logo: ['tlo'], awatar: ['tlo'],
    wyroznione: ['tlo', 'tytul'],
    poziom: ['tlo', 'zdjecie', 'kadr', 'nad', 'tytul', 'rozmiar', 'pod'],
    baner: ['tlo', 'tytul', 'rozmiar', 'logo', 'lewo', 'odstep'],
  };
  // zawartość nowej grafiki po wybraniu szablonu
  const START = {
    tekst: { tlo: 'noc', nad: 'Budujemy', tytul: 'TWÓJ TYTUŁ|*W DWÓCH WIERSZACH*', rozmiar: 104, pod: 'Podtytuł w jednym zdaniu.', prawa: '@wizme_pl' },
    liczba: { tlo: 'noc', nad: 'Bezpłatny raport', liczba: '24 h', tytul: 'I WIESZ, *CO WIDAĆ.*', rozmiar: 80, prawa: 'wizme.pl' },
    zdjecie: { zdjecie: 'kulisy-noc-bramka.jpg', kadr: '50% 40%', nad: 'Tworzymy', tytul: 'TYTUŁ|*NA ZDJĘCIU*', rozmiar: 100, pod: 'Podtytuł' },
    split: { tlo: 'noc', zdjecie: 'kulisy-s02.jpg', kadr: '50% 48%', tytul: 'TYTUŁ|*POD ZDJĘCIEM*', rozmiar: 76 },
    osoba: { zdjecie: 'olaf.jpg', kadr: '50% 12%', nad: 'Osoba + firma', tytul: 'FIRMĘ WIDAĆ|*PRZEZ LUDZI*', imie: 'Imię Nazwisko', rola: 'Rola w firmie' },
    podpis: { zdjecie: 'katarzyna.jpg', kadr: '50% 20%', imie: 'Imię Nazwisko', rola: 'Rola w firmie' },
    czyste: { zdjecie: 'olaf.jpg', kadr: '50% 15%' }, woda: { zdjecie: 'szut.jpg', kadr: '60% 30%' }, znak: { zdjecie: 'kulisy-noc-bramka.jpg', kadr: '50% 42%' },
    ekran: { tlo: 'noc', zdjecie: 'matgolon-strona-telefon.jpg', nad: 'Tworzymy', tytul: 'STRONA WWW|*DLA KLIENTA*', rozmiar: 96, pod: 'Nazwa klienta · adres strony' },
    logo: { tlo: 'noc' }, awatar: { tlo: 'noc' }, wyroznione: { tlo: 'noc', tytul: 'Realizacje' },
    poziom: { tlo: 'noc', zdjecie: 'zespol.jpg', kadr: '60% 50%', tytul: 'BUDUJEMY MARKI.|TWORZYMY *WIZERUNEK.*', rozmiar: 54, pod: 'Agencja marketingu i wizerunku, Poznań' },
    baner: { tlo: 'noc', tytul: 'BUDUJEMY MARKI.|TWORZYMY *WIZERUNEK.*|CHRONIMY *REPUTACJĘ.*', rozmiar: 66 },
  };

  let LOGO = '', SYGNET = '';
  const logo = (kl = 'mini', st = '') => `<div class="logo ${kl}" style="${st}">${LOGO}</div>`;
  const luk = p => (p.bezluku ? '' : `<div class="syg luk">${SYGNET}</div>`);
  const foto = (p, kl = 'foto') => `<div class="${kl}" style="background-image:url('${cssUrl(zdjecie(p.zdjecie))}');background-position:${cssUrl(p.kadr || '50% 50%').replace(/%/g, '% ').trim()};${p.styl || ''}"></div>`;
  const gora = p => (p.nad || p.nr ? `<div class="gora"><span>${p.nad ? `<span class="pill">${zwykly(p.nad)}</span>` : ''}</span><span class="nr">${zwykly(p.nr || '')}</span></div>` : '');
  const tytul = (p, r, a) => (p.tytul ? `<h1 class="d" style="--t:${liczba(p.rozmiar, r)}px">${linie(p.tytul, a)}</h1>` : '');
  const pod = p => (p.pod ? `<p class="s">${zwykly(p.pod)}</p>` : '');
  const tresc = p => (p.tekst ? `<div class="belka"><p class="t">${pogrubienia(p.tekst)}</p></div>` : '');
  const stopka = p => `<div class="stopka">${logo()}<span>${zwykly(p.prawa || '')}</span></div>`;
  const podpis = p => `<div class="podpis"><i></i><div><b>${zwykly(p.imie || '')}</b><em>${zwykly(p.rola || '')}</em></div></div>`;
  const cienKl = p => (p.cien ? ' ' + cssUrl(p.cien) : '');

  const TYPY = {
    czyste: p => `${foto(p)}<div class="cien lekki"></div><div class="dol">${logo()}</div>`,
    podpis: p => `${foto(p)}<div class="cien lekki"></div><div class="dol">${podpis(p)}<div style="margin-top:44px">${logo()}</div></div>`,
    woda: p => `${foto(p)}<div class="syg woda">${SYGNET}</div><div class="dol">${logo()}</div>`,
    znak: p => `${foto(p)}<div class="cien"></div><div class="dol">${logo('pel')}</div>`,
    zdjecie: p => `${foto(p)}<div class="cien${cienKl(p)}"></div>${gora(p)}<div class="dol"${p.dolny ? ` style="bottom:${liczba(p.dolny, 80)}px"` : ''}>${tytul(p, 104)}${pod(p)}<div style="margin-top:48px">${logo()}</div></div>`,
    osoba: p => `${foto(p)}<div class="cien"></div>${gora(p)}<div class="dol">${tytul(p, 84)}<div style="margin-top:36px">${podpis(p)}</div><div style="margin-top:44px">${logo()}</div></div>`,
    split: p => `${foto({ ...p, styl: (p.styl || '').replace(/height:[^;]*;?/, '') })}<div class="cien miekki"></div>${gora(p)}<div class="dol">${tytul(p, 72)}${pod(p)}</div>`,
    ekran: p => `${luk(p)}<div class="tel${p.skos ? ' skos' : ''}" style="--tw:${liczba(p.tw, 640)}px;--tt:${liczba(p.tt, 250)}px;background-image:url('${cssUrl(zdjecie(p.zdjecie))}')"></div><div class="cien"></div>${gora(p)}<div class="dol" style="bottom:${liczba(p.dolny, 410)}px">${tytul(p, 100)}${pod(p)}<div style="margin-top:48px">${logo()}</div></div>`,
    tekst: p => `${luk(p)}${gora(p)}<div class="dol">${tytul(p, 112, p.akcent)}${pod(p)}${tresc(p)}${stopka(p)}</div>`,
    liczba: p => `${luk(p)}${gora(p)}<div class="dol"><div class="liczba" style="--t:${liczba(p.wielkosc, 330)}px">${zwykly(p.liczba || '')}</div>${tytul(p, 84, p.akcent)}${pod(p)}${stopka(p)}</div>`,
    logo: () => `${luk({})}<div class="srodek"><div class="logo" style="width:800px">${LOGO}</div></div>`,
    awatar: () => `<div class="srodek"><div class="syg" style="width:640px">${SYGNET}</div></div>`,
    wyroznione: p => `<div class="srodek"><div style="text-align:center"><div class="syg" style="width:300px;margin:0 auto 44px">${SYGNET}</div><div style="font-weight:800;font-size:88px;line-height:1.1">${zwykly(p.tytul || '')}</div></div></div>`,
    baner: p => `${luk(p)}<div style="position:absolute;left:${liczba(p.lewo, 90)}px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:${liczba(p.odstep, 70)}px"><div class="logo" style="width:${liczba(p.logo, 420)}px">${LOGO}</div><h1 class="d" style="--t:${liczba(p.rozmiar, 50)}px">${linie(p.tytul)}</h1></div>`,
  };

  function szablon(p) {
    const format = FORMATY[p.format] ? p.format : 'post';
    const f = FORMATY[format];
    const motyw = ['noc', 'magenta', 'biel'].includes(p.tlo) ? p.tlo : 'noc';
    const wymiar = `width:${f.w}px;height:${f.h}px`;
    if (format === 'poziom') {
      return `<div class="c cieniowany ${motyw}" style="${wymiar}">
      ${foto(p, 'prawa').replace('style="', 'style="width:560px;')}
      <div class="lewa" style="width:640px">${logo('', 'width:230px')}<div>${p.nad ? `<span class="pill" style="font-size:20px;padding:5px 14px;letter-spacing:2px;margin-bottom:16px">${zwykly(p.nad)}</span>` : ''}<h1 class="d" style="--t:${liczba(p.rozmiar, 58)}px">${linie(p.tytul)}</h1>${p.pod ? `<p class="s" style="font-size:23px;margin-top:14px">${zwykly(p.pod)}</p>` : ''}</div></div></div>`;
    }
    const typ = TYPY[p.typ] ? p.typ : TYPY_FORMATU[format][0];
    return `<div class="c cieniowany ${motyw} ${format === 'story' ? 'wysoki' : ''}" style="${wymiar}">${TYPY[typ](p)}</div>`;
  }

  let przyklady = null;
  window.MARKI = window.MARKI || {};
  window.MARKI.wizme = {
    id: 'wizme', nazwa: 'WIZme', css: CSS, fonty: '/marki/fonty/fonty.css',
    formaty: FORMATY, typyFormatu: TYPY_FORMATU, nazwyTypow: NAZWY_TYPOW, pola: P, polaTypow: POLA_TYPOW, start: START,
    zdjecieUrl: zdjecie, miniatura: n => /^(\/|https?:)/.test(n) ? n : `${DIR}/zdjecia/mini/${n.replace(/\.\w+$/, '.jpg')}`,
    podgladPrzykladu: id => `${DIR}/przyklady/${id}.jpg`,
    szablon,
    get przyklady() { return przyklady; },
    async init() {
      const tekst = u => fetch(u, { credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error('Nie udało się wczytać systemu WIZme'); return r; });
      [LOGO, SYGNET, przyklady] = await Promise.all([
        tekst(`${DIR}/logo.svg`).then(r => r.text()), tekst(`${DIR}/sygnet.svg`).then(r => r.text()), tekst(`${DIR}/przyklady.json`).then(r => r.json()),
      ]);
    },
  };
})();
