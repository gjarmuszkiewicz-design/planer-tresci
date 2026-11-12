'use strict';
/* ================= Grafiki: projekty w systemie identyfikacji marki (tylko agencja) =================
   Marka to pakiet z /marki/<id>/marka.js: formaty, szablony i pola. Grafika powstaje w ramce (iframe) z kodem marki,
   więc style aplikacji nie zmieniają jej wyglądu, a PNG robi biblioteka html-to-image wczytana w tej samej ramce. */
const studio = {
  brands: null, brand: 'wizme', designs: null, error: '',
  cur: null, dirty: false, frame: null, scale: 1, busy: '', pickFoto: false, loading: null,
  cid: '', atMode: '',  // klient, w którego zakładce działa moduł; tryb okna „Dodaj do treści”
};
const stBase = () => `#/k/${studio.cid}/grafiki`;
const brandOf = id => window.MARKI?.[id];
const formatOf = d => brandOf(d.brand).formaty[d.format];
const stDesign = id => studio.designs?.find(d => d.id === id);

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Nie udało się wczytać systemu marki')); document.head.appendChild(s); });
}
async function loadBrand(id) {
  // własny system klienta z pliku (wspólne szablony z /marki/wspolny/system.js)
  if (id.startsWith('k-')) {
    const c = clientById(id.slice(2));
    if (!c?.system) throw new Error('Klient nie ma wczytanego pliku systemu identyfikacji');
    if (!window.systemZPliku) await loadScript('/marki/wspolny/system.js');
    if (brandOf(id)?.zrodlo !== c.system.wczytano) systemZPliku(c.system, id);
    return;
  }
  if (brandOf(id)?.przyklady) return;
  if (!brandOf(id)) await loadScript(`/marki/${id}/marka.js`);
  await brandOf(id).init();
}
function studioLoad() {
  studio.loading ||= (async () => {
    try {
      studio.brands ||= await api('GET', '/marki/marki.json');
      if (!studio.brand.startsWith('k-') && !studio.brands.some(b => b.id === studio.brand)) studio.brand = studio.brands[0]?.id;
      await loadBrand(studio.brand);
      studio.designs ||= await api('GET', '/api/designs');
      studio.error = '';
    } catch (e) { studio.error = e.message; }
    studio.loading = null;
    const r = route();
    if (r.name === 'studio' || r.tab === 'grafiki') render();
  })();
}

/* ---------- widoki ---------- */
// moduł działa w zakładce „Grafiki” klienta, który ma system identyfikacji (np. WIZme jako klient agencji)
function viewStudio(r, c) {
  studio.cid = c.id;
  if (studio.brand !== clientBrand(c)) { studio.brand = clientBrand(c); studio.loading = null; }
  const stale = studio.brand.startsWith('k-') && brandOf(studio.brand) && brandOf(studio.brand).zrodlo !== c.system?.wczytano;
  if (stale) studio.loading = null;
  if (!studio.designs || !brandOf(studio.brand)?.przyklady || stale) {
    if (!studio.error && !studio.loading) studioLoad();
    return `<div class="empty">${studio.error ? `<b>Nie udało się otworzyć modułu Grafiki</b>${esc(studio.error)}` : 'Wczytuję system identyfikacji…'}</div>`;
  }
  if (r.did === 'nowy') {
    if (studio.cur && !studio.cur.id) return stEditor();
    location.replace(stBase()); return '';
  }
  if (r.did) {
    const d = stDesign(r.did);
    if (!d) return `<div class="container"><div class="empty"><b>Nie ma takiego projektu</b><a href="${stBase()}">Wróć do grafik</a></div></div>`;
    if (studio.cur?.id !== d.id) { studio.cur = structuredClone(d); studio.dirty = false; studio.wsel = null; }
    return stEditor();
  }
  if (studio.wantNew) { studio.wantNew = false; setTimeout(stNew); }
  return stGallery();
}

function stGallery() {
  const m = brandOf(studio.brand);
  const fmt = d => m.formaty[d.format]?.nazwa || '';
  const mine = studio.designs.filter(d => d.brand === studio.brand);
  const card = (thumb, title, sub, attrs, extra = '') => `<div class="st-card" ${attrs}>
      <div class="st-thumb"><img src="${esc(thumb)}" alt="" loading="lazy"></div>
      <div class="st-cap"><b>${esc(title)}</b><span>${esc(sub)}</span></div>${extra}</div>`;
  return `<div class="studio st-in">
    <div class="st-head"><p class="muted">Projekty w systemie identyfikacji ${esc(m.nazwa)}. Gotową grafikę dodasz do istniejącej albo nowej treści w planie. Widzi je tylko zespół agencji.</p>
      <span class="grow"></span>${m.kreator ? '<button class="btn" data-sa="new-wl" title="Format wybierasz Ty, resztę układasz od zera z materiałów systemu">✎ Własny układ</button>' : ''}<button class="btn primary" data-sa="new">＋ Nowa grafika</button></div>
    <h2 class="st-h2">Twoje projekty</h2>
    ${mine.length ? `<div class="st-grid">${mine.map(d => card(d.thumb || m.podgladPrzykladu('t10'), d.name || 'Bez nazwy', `${fmt(d)} · ${fmtTs(d.updatedAt)}`,
      `data-sa="open" data-id="${esc(d.id)}"`, `<button class="st-del" data-sa="del" data-id="${esc(d.id)}" title="Usuń projekt">✕</button>`)).join('')}</div>`
      : '<div class="st-none muted">Nie masz jeszcze zapisanych projektów. Zacznij od nowej grafiki albo od gotowego projektu poniżej.</div>'}
    ${stWzorce(m)}
    ${m.przyklady.zbiory.map((z, zi) => `<h2 class="st-h2">${esc(z.nazwa)}</h2>
      <div class="st-grid">${z.projekty.map((p, i) => card(m.podgladPrzykladu(p.id), p.nazwa, `${fmt(p)}${p.typ ? ' · ' + (m.nazwyTypow[p.typ] || '') : ''}`,
        `data-sa="example" data-z="${zi}" data-i="${i}" title="Otwórz jako nowy projekt"`)).join('')}</div>`).join('')}
  </div>`;
}

// Wzorce systemu: gotowe PNG z paczki klienta (podgląd i pobranie) + „Zrób podobną” w pasującym szablonie
const WZOR_TYP = [[/zamkniecie|plansza|koncow/, 'zamkniecie'], [/okladka/, 'okladka'], [/tresc/, 'tekst'], [/cytat.*zdjeci/, 'okladka'], [/cytat/, 'cytat'],
  [/liczba|wynik/, 'liczba'], [/podpis|nakladka|zdjecie/, 'zdjecie'], [/pytanie|kontakt|link|nowy post|zaproszenie/, 'cta'], [/baner|okladka fb/, 'baner'], [/poziom/, 'poziom']];
function stWzorTyp(m, w) {
  const format = m.formaty[w.format] ? w.format : 'post', typy = m.typyFormatu[format], n = `${w.nazwa} ${w.grupa}`.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
  let typ = w.typ && typy.includes(w.typ) ? w.typ : '';
  if (!typ && w.grupa === 'wyroznione') typ = 'wyroznione';
  if (!typ && /profil|awatar/.test(n)) typ = 'awatar';
  if (!typ && w.grupa === 'logo') typ = format === 'kwadrat' ? 'awatar' : 'logo';
  typ ||= WZOR_TYP.find(([re, t]) => re.test(n) && typy.includes(t))?.[1] || typy[0];
  return { format, typ: typy.includes(typ) ? typ : typy[0] };
}
function stWzorce(m) {
  const ws = m.wzorce || []; if (!ws.length) return '';
  const grupy = [...new Set(ws.map(w => w.grupa || 'inne'))];
  return `<h2 class="st-h2">Wzorce systemu <span class="muted small" style="font-weight:400">· ${ws.length} gotowych grafik z systemu identyfikacji</span></h2>
    ${grupy.map(g => `<div class="st-wg"><div class="st-wg-h">${esc(g)}</div><div class="st-grid">${ws.map((w, i) => [w, i]).filter(([w]) => (w.grupa || 'inne') === g).map(([w, i]) => `<div class="st-card st-wz">
      <div class="st-thumb" data-sa="wzor-lb" data-i="${i}" title="Powiększ"><img src="${esc(w.plik)}" alt="" loading="lazy"></div>
      <div class="st-cap"><b>${esc(w.nazwa || 'Wzorzec')}</b><span>${esc(m.formaty[w.format]?.nazwa || '')}</span></div>
      <div class="st-wz-act"><button class="btn sm" data-sa="wzor" data-i="${i}">Zrób podobną</button><a class="btn sm ghost" href="${esc(w.plik)}?dl=1&n=${encodeURIComponent(`${m.nazwa} ${g} ${w.nazwa}`)}" download title="Pobierz PNG">⤓</a></div></div>`).join('')}</div></div>`).join('')}`;
}
function stZasady(m) {
  const z = m.zasady || []; if (!z.length) return '';
  return `<details class="st-zasady" ${studio.zasadyOpen ? 'open' : ''}><summary>Zasady systemu (${z.length})</summary><ol>${z.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>`;
}

function stField(m, d, k) {
  const f = m.pola[k], v = d[k] ?? '';
  const label = `<label>${esc(f.label)}${f.hint ? ` <span class="hint">${esc(f.hint)}</span>` : ''}</label>`;
  if (f.typ === 'check') return `<label class="st-check"><input type="checkbox" data-sf="${k}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
  if (f.typ === 'select') return `<div class="field">${label}<select class="select" data-sf="${k}">${f.opcje.map(([o, l]) => `<option value="${esc(o)}" ${o === (v || f.opcje[0][0]) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  if (f.typ === 'area') return `<div class="field">${label}<textarea class="input" data-sf="${k}" rows="${k === 'tytul' ? 3 : 2}">${esc(v)}</textarea></div>`;
  if (f.typ === 'num') return `<div class="field">${label}<input class="input" type="number" data-sf="${k}" value="${esc(v)}" min="${f.min}" max="${f.max}" placeholder="domyślnie"></div>`;
  if (f.typ === 'kadr') {
    const [x, y] = stKadr(d);
    return `<div class="field">${label}<div class="st-kadr"><span>poziomo</span><input type="range" min="0" max="100" data-sk="x" value="${x}"><span>pionowo</span><input type="range" min="0" max="100" data-sk="y" value="${y}"></div></div>`;
  }
  if (f.typ === 'foto') {
    const photos = m.przyklady.zdjecia;
    return `<div class="field">${label}<div class="st-foto">${d.zdjecie ? `<img src="${esc(m.miniatura(d.zdjecie))}" alt="">` : '<span class="st-nofoto">brak zdjęcia</span>'}
        <div class="col"><button class="btn sm" data-sa="foto-up">⤒ Wgraj zdjęcie</button>${photos.length ? `<button class="btn sm ghost" data-sa="foto-toggle">${studio.pickFoto ? 'Ukryj przykładowe' : 'Wybierz z przykładowych'}</button>` : ''}</div></div>
      ${studio.pickFoto ? `<div class="st-photos">${photos.map(n => `<img src="${esc(m.miniatura(n))}" alt="" title="${esc(m.opisZdjecia?.(n) || n)}" class="${n === d.zdjecie ? 'on' : ''}" data-sa="foto-pick" data-v="${esc(n)}" loading="lazy">`).join('')}</div>` : ''}
      ${d.zdjecie && !d.kadr && m.opisZdjecia?.(d.zdjecie) ? '<div class="small muted" style="margin-top:4px">Kadr ustawiony automatycznie („głowa do klatki”) – przeciągnij zdjęcie, aby zmienić.</div>' : ''}</div>`;
  }
  return `<div class="field">${label}<input class="input" data-sf="${k}" value="${esc(v)}"></div>`;
}

function stForm() {
  const d = studio.cur, m = brandOf(d.brand);
  const typy = m.typyFormatu[d.format];
  return `${stZasady(m)}${studio.wzor ? `<div class="st-ref"><img src="${esc(studio.wzor.plik)}" alt=""><div><b>Wzorzec:</b> ${esc(studio.wzor.nazwa)}<br><span class="small muted">Grafika powstaje w szablonie aplikacji – wzorzec jest punktem odniesienia.</span></div></div>` : ''}
    <div class="field"><label>Rodzaj grafiki</label><select class="select" data-sf="format">${Object.entries(m.formaty).map(([k, f]) =>
      `<option value="${k}" ${k === d.format ? 'selected' : ''}>${esc(f.nazwa)} · ${esc(f.opis)}</option>`).join('')}</select></div>
    ${typy.length > 1 ? `<div class="field"><label>Szablon</label><select class="select" data-sf="typ">${typy.map(t => `<option value="${t}" ${t === d.typ ? 'selected' : ''}>${esc(m.nazwyTypow[t])}</option>`).join('')}</select></div>` : ''}
    <div class="st-sep"></div>
    ${m.polaTypow[d.typ].map(k => stField(m, d, k)).join('')}
    ${d.typ === 'wlasny' && m.kreator ? stWlForm(m, d) : ''}`;
}

function stEditor() {
  const d = studio.cur, f = formatOf(d);
  return `<div class="studio st-ed">
    <div class="st-bar"><button class="btn ghost" data-sa="back">← Grafiki · ${esc(clientById(studio.cid)?.name || '')}</button>
      <input class="input st-name" data-sf="name" value="${esc(d.name || '')}" placeholder="Nazwa projektu">
      <span class="muted small" id="stState">${studio.dirty ? 'Niezapisane zmiany' : d.id ? 'Zapisano' : 'Nowy projekt'}</span><span class="grow"></span>
      <button class="btn" data-sa="png" ${studio.busy ? 'disabled' : ''}>⤓ Pobierz PNG</button>
      <button class="btn" data-sa="attach" ${studio.busy ? 'disabled' : ''}>＋ Dodaj do treści</button>
      <button class="btn primary" data-sa="save" ${studio.busy ? 'disabled' : ''}>${studio.busy === 'save' ? 'Zapisuję…' : 'Zapisz'}</button></div>
    <div class="st-body">
      <div class="st-form" id="stForm">${stForm()}</div>
      <div class="st-view"><div class="st-stage-wrap" id="stWrap"><div class="st-stage" id="stStage"></div><div class="st-drag ${d.typ === 'wlasny' ? 'wl' : ''}" id="stDrag"><div class="wl-box" id="wlBox"></div></div></div>
        <div class="muted small st-dims">${f.w} × ${f.h} px${d.typ === 'wlasny' ? ' · kliknij element, przeciągnij, aby przesunąć · strzałki: 1 px, z Shift 10 px · Delete usuwa' : brandOf(d.brand).polaTypow[d.typ].includes('kadr') ? ' · przeciągnij zdjęcie, aby ustawić kadr' : ''}</div></div>
    </div></div>`;
}

/* ---------- ramka z grafiką ---------- */
function studioMounted() {
  if (!studio.cur || !$('#stStage')) return;
  stMountFrame();
}
function stMountFrame() {
  const d = studio.cur, m = brandOf(d.brand), f = formatOf(d), host = $('#stStage');
  studio.frame = null;
  const fr = document.createElement('iframe');
  fr.className = 'st-frame'; fr.width = f.w; fr.height = f.h; fr.setAttribute('scrolling', 'no'); fr.title = 'Podgląd grafiki';
  fr.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${m.fonty}" crossorigin="anonymous"><style>${m.css}</style><script src="/static/vendor/html-to-image.js"><\/script></head><body></body></html>`;
  fr.onload = () => { if (studio.cur === d) { studio.frame = fr; stPaint(); } };
  host.innerHTML = ''; host.appendChild(fr);
  stFit();
}
function stFit() {
  const wrap = $('#stWrap'), host = $('#stStage'); if (!wrap || !studio.cur) return;
  const f = formatOf(studio.cur);
  const s = Math.min(1, wrap.parentElement.clientWidth / f.w, (window.innerHeight - 190) / f.h);
  studio.scale = s;
  wrap.style.width = `${Math.round(f.w * s)}px`; wrap.style.height = `${Math.round(f.h * s)}px`;
  host.style.transform = `scale(${s})`;
}
window.addEventListener('resize', () => { if (route().name === 'studio') stFit(); });
function stPaint() {
  const doc = studio.frame?.contentDocument; if (!doc?.body) return;
  doc.body.innerHTML = brandOf(studio.cur.brand).szablon(studio.cur);
  if (stWl()) requestAnimationFrame(stWlBox); else { const b = $('#wlBox'); if (b) b.style.display = 'none'; }
}
function stMarkDirty() {
  studio.dirty = true;
  const s = $('#stState'); if (s) s.textContent = 'Niezapisane zmiany';
}
function stRedrawForm() {
  const box = $('#stForm'); if (!box) return;
  const y = box.scrollTop; box.innerHTML = stForm(); box.scrollTop = y;
}

// Gotowa grafika w pełnym rozmiarze. Pierwsze przejście html-to-image bywa bez zdjęć w tle, dlatego rysujemy dwa razy.
async function stCanvas() {
  const fr = studio.frame; if (!fr) throw new Error('Podgląd jeszcze się wczytuje');
  const w = fr.contentWindow, doc = fr.contentDocument, f = formatOf(studio.cur), node = doc.querySelector('.c');
  await doc.fonts.ready;
  await Promise.all([...doc.querySelectorAll('[style*="background-image"]')].map(el => {
    const u = (el.style.backgroundImage.match(/url\(["']?([^"')]+)/) || [])[1];
    return u ? new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; }) : null;
  }));
  const opt = { width: f.w, height: f.h, pixelRatio: 1, canvasWidth: f.w, canvasHeight: f.h, skipAutoScale: true };
  await w.htmlToImage.toCanvas(node, opt);
  return w.htmlToImage.toCanvas(node, opt);
}
const canvasBlob = (c, type = 'image/png', q) => new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Nie udało się zapisać obrazu'))), type, q));
async function stThumb(canvas) {
  const s = Math.min(1, 480 / Math.max(canvas.width, canvas.height));
  const t = document.createElement('canvas'); t.width = Math.round(canvas.width * s); t.height = Math.round(canvas.height * s);
  t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
  const fd = new FormData(); fd.append('file', await canvasBlob(t, 'image/jpeg', .82), 'miniatura.jpg'); fd.append('name', `Miniatura: ${studio.cur.name || 'grafika'}`);
  return (await api('POST', '/api/media', fd)).url;
}
const fileName = d => (d.name || 'grafika').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'grafika';

// bez przebudowy widoku: nowa ramka nie zdążyłaby się wczytać przed eksportem
function stBusyUi() {
  $$('.st-bar [data-sa="png"], .st-bar [data-sa="attach"], .st-bar [data-sa="save"]').forEach(b => { b.disabled = !!studio.busy; });
  const s = $('.st-bar [data-sa="save"]'); if (s) s.textContent = studio.busy === 'save' ? 'Zapisuję…' : 'Zapisz';
  const st = $('#stState'); if (st && !studio.busy) st.textContent = studio.dirty ? 'Niezapisane zmiany' : studio.cur?.id ? 'Zapisano' : 'Nowy projekt';
}
async function stRun(kind, fn) {
  if (studio.busy) return;
  studio.busy = kind; stBusyUi();
  try { await fn(); } catch (e) { toast(e.message, 6000); }
  studio.busy = ''; stBusyUi();
}
function stSave() {
  return stRun('save', async () => {
    const d = studio.cur, canvas = await stCanvas();
    const id = d.id || uid() + uid();
    const { id: _, brand, updatedAt, ...data } = d;
    data.thumb = await stThumb(canvas);
    const saved = await api('PUT', `/api/designs/${id}`, { brand, data });
    studio.designs = [saved, ...studio.designs.filter(x => x.id !== id)];
    studio.cur = structuredClone(saved); studio.dirty = false;
    if (location.hash !== `${stBase()}/p/${id}`) history.replaceState(null, '', `${stBase()}/p/${id}`);
    toast('Projekt zapisany');
  });
}
function stPng() {
  return stRun('png', async () => {
    const blob = await canvasBlob(await stCanvas());
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${fileName(studio.cur)}.png`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}

/* ---------- dodanie grafiki do treści w planie: do istniejącej albo do nowej ---------- */
const stPostLabel = p => `${p.date ? fmtShort(p.date) : p.week ? 'tydz. ' + fmtShort(p.week) : 'rezerwa'} · ${p.format || 'treść'} · ${p.title || 'bez tematu'}${p.media.length ? ` (${p.media.length} graf.)` : ''}`;
function stAttachModal(cid, mode) {
  const clients = state.clients;
  if (!clients.length) { toast('Najpierw dodaj klienta'); return; }
  cid ||= clientById(studio.cid) ? studio.cid : clients[0].id;
  // najpierw treści od dziś, potem rezerwa i starsze
  const posts = sortPosts(postsOf(cid)).sort((a, b) => (a.date && a.date < TODAY) - (b.date && b.date < TODAY));
  mode = studio.atMode = mode || studio.atMode || (posts.length ? 'old' : 'new');
  const d = studio.cur, fmt = d.format === 'story' ? 'Relacja' : 'Post', li = /^li|linked/i.test(d.format);
  const opt = (v, cur) => `<option ${v === cur ? 'selected' : ''}>${esc(v)}</option>`;
  modal(`<div class="modal-h"><h2 style="font-size:18px">Dodaj grafikę do treści</h2></div>
    <div class="modal-b">
      <div class="field"><label>Klient</label><select class="select" id="stAtClient">${clients.map(c => `<option value="${esc(c.id)}" ${c.id === cid ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="seg" style="margin-bottom:14px"><button class="${mode === 'old' ? 'on' : ''}" data-sa="at-mode" data-v="old">Do istniejącej treści</button><button class="${mode === 'new' ? 'on' : ''}" data-sa="at-mode" data-v="new">Nowa treść</button></div>
      ${mode === 'old' ? (posts.length ? `<div class="field"><label>Treść <span class="hint">· grafika trafi na koniec jej materiałów</span></label>
          <input class="input" id="stAtQ" placeholder="Szukaj po temacie lub formacie…" style="margin-bottom:6px">
          <select class="select" id="stAtPost" size="9">${posts.map((p, i) => `<option value="${esc(p.id)}" ${i === 0 ? 'selected' : ''}>${esc(stPostLabel(p))}</option>`).join('')}</select></div>`
        : '<div class="muted" style="margin-bottom:12px">Ten klient nie ma jeszcze treści – wybierz „Nowa treść”.</div>')
      : `<div class="field"><label>Temat</label><input class="input" id="stAtTitle" value="${esc(d.name && d.name !== 'Nowa grafika' ? d.name : '')}" placeholder="Temat treści"></div>
        <div class="two"><div class="field"><label>Data publikacji <span class="hint">· pusta = rezerwa</span></label><input class="input" type="date" id="stAtDate"></div>
          <div class="field"><label>Format</label><select class="select" id="stAtFormat">${FORMATS.map(f => opt(f, fmt)).join('')}</select></div></div>
        <div class="field"><label>Kanały</label><div class="row" style="gap:16px"><label class="st-check"><input type="checkbox" id="stAtMeta" ${li ? '' : 'checked'}> Facebook + Instagram</label><label class="st-check"><input type="checkbox" id="stAtLi" ${li ? 'checked' : ''}> LinkedIn</label></div></div>
        <div class="small muted" style="margin-bottom:12px">Treść powstanie jako szkic (klient go nie widzi), opis dopiszesz w edytorze.</div>`}
      <label class="st-check"><input type="checkbox" id="stAtOpen" checked> Otwórz treść po dodaniu${studio.dirty ? ' (projekt grafiki zapisze się sam)' : ''}</label>
    </div>
    <div class="modal-f"><button class="btn" data-act="close-modal">Anuluj</button><button class="btn primary" data-sa="attach-do" ${mode === 'old' && !posts.length ? 'disabled' : ''}>${mode === 'old' ? 'Dodaj do treści' : 'Utwórz treść z grafiką'}</button></div>`);
}
async function stAttach() {
  const cid = $('#stAtClient').value, mode = studio.atMode, openAfter = $('#stAtOpen').checked;
  let post = null, fresh = null;
  if (mode === 'old') {
    post = state.posts.find(p => p.id === $('#stAtPost')?.value);
    if (!post) { toast('Wybierz treść z listy'); return; }
  } else {
    const date = $('#stAtDate').value, meta = $('#stAtMeta').checked, li = $('#stAtLi').checked;
    if (!meta && !li) { toast('Zaznacz co najmniej jeden kanał'); return; }
    fresh = { clientId: cid, date, month: date ? date.slice(0, 7) : ui.month, approval: 'draft', title: $('#stAtTitle').value.trim() || 'Grafika', format: $('#stAtFormat').value, meta, li };
  }
  closeModal();
  if (openAfter && studio.dirty) { await stSave(); if (studio.dirty) return; }
  await stRun('attach', async () => {
    const d = studio.cur, canvas = await stCanvas();
    // grafika trafia do treści jako oryginalny PNG w pełnej rozdzielczości formatu
    const m = await postImageToMedia(new File([await canvasBlob(canvas)], `${fileName(d)}.png`, { type: 'image/png' }));
    if (!post) { post = newPost(fresh); state.posts.push(post); }
    post.media.push(m);
    save(true);
    if (!openAfter) { toast(`Grafika dodana do treści „${post.title || 'bez tematu'}”`, 4000); return; }
    // po przejściu do planu klienta otwieramy edytor tej treści
    ui.month = postMonth(post) || ui.month;
    const target = post;
    window.addEventListener('hashchange', () => openDrawer(target), { once: true });
    location.hash = `#/k/${target.clientId}/plan`;
  });
}


/* ---------- kreator „Własny układ”: grafika od zera z warstw, tylko z materiałów systemu klienta ---------- */
const WL_STYLE = [['tytul', 'Nagłówek'], ['tekst', 'Opis'], ['etykieta', 'Etykieta'], ['liczba', 'Liczba'], ['cytat', 'Znak cytatu „'], ['przycisk', 'Przycisk']];
const WL_DODAJ = [['naglowek', 'Nagłówek'], ['opis', 'Opis'], ['etykieta', 'Etykieta'], ['logo', 'Logo'], ['zdjecie', 'Zdjęcie w tle'], ['ramka', 'Zdjęcie w ramce'],
  ['cien', 'Cień na zdjęciu'], ['liczba', 'Liczba'], ['cytat', 'Cytat „'], ['przycisk', 'Przycisk'], ['linia', 'Linia'], ['ksztalt', 'Kształt'], ['wodny', 'Znak wodny']];
const stWl = () => (studio.cur?.typ === 'wlasny' && brandOf(studio.cur.brand)?.kreator ? brandOf(studio.cur.brand) : null);
const stWlSel = () => (studio.cur?.warstwy || []).find(w => w.id === studio.wsel);
const stWlFull = w => w.rodzaj === 'cien' || (w.rodzaj === 'zdjecie' && w.pelne);
function stWlNazwa(m, w) {
  if (w.nazwa) return w.nazwa;
  if (w.rodzaj === 'tekst') {
    const s = WL_STYLE.find(x => x[0] === w.styl)?.[1] || 'Opis', t = String(w.tresc || '').replace(/[|*]/g, ' ').replace(/\s+/g, ' ').trim();
    return w.styl === 'cytat' || !t ? s : `${s}: ${t.slice(0, 30)}${t.length > 30 ? '…' : ''}`;
  }
  if (w.rodzaj === 'zdjecie') return w.pelne ? 'Zdjęcie w tle' : 'Zdjęcie w ramce';
  if (w.rodzaj === 'logo') return `Logo: ${(m.kreator.znaki.find(z => z[0] === w.wariant)?.[1] || 'podpis').toLowerCase()}`;
  return { cien: 'Cień na zdjęciu', linia: 'Linia', ksztalt: 'Kształt' }[w.rodzaj] || 'Element';
}
function stWlNowa(typ) {
  const d = studio.cur, f = formatOf(d), m = brandOf(d.brand), K = m.kreator;
  const s = Math.max(0.35, Math.min(f.w, f.h) / 1080), R = n => Math.round(n * s), mg = R(90), id = uid() + uid();
  const T = (styl, tresc, rozmiar, y, extra = {}) => ({ id, rodzaj: 'tekst', styl, tresc, rozmiar: R(rozmiar), x: mg, y: Math.round(y), w: f.w - 2 * mg, ...extra });
  const foto = m.przyklady.zdjecia[0] || '';
  const nowe = {
    naglowek: () => T('tytul', 'Nagłówek|*z akcentem*', 96, f.h * 0.52),
    opis: () => T('tekst', 'Krótki opis w jednym, dwóch zdaniach. *Najważniejsze* pogrubione.', 36, f.h * 0.74),
    etykieta: () => T('etykieta', 'Seria · temat', 24, mg),
    liczba: () => T('liczba', '25', 300, f.h * 0.28),
    cytat: () => T('cytat', '', 260, f.h * 0.3),
    przycisk: () => T('przycisk', K.cta || 'Napisz do mnie', 34, f.h * 0.76, { w: Math.min(f.w - 2 * mg, R(700)) }),
    logo: () => ({ id, rodzaj: 'logo', wariant: K.znaki[0]?.[0] || 'podpis', h: R(70), x: mg, y: f.h - mg - R(70) }),
    zdjecie: () => ({ id, rodzaj: 'zdjecie', pelne: true, plik: foto }),
    ramka: () => ({ id, rodzaj: 'zdjecie', pelne: false, plik: foto, x: mg, y: mg, w: R(480), h: R(600), zaokr: 0 }),
    cien: () => ({ id, rodzaj: 'cien', sila: 100 }),
    linia: () => ({ id, rodzaj: 'linia', x: mg, y: Math.round(f.h * 0.7), w: R(240), h: Math.max(2, R(3)), kolor: 'akcent' }),
    ksztalt: () => ({ id, rodzaj: 'ksztalt', x: mg, y: mg, w: R(400), h: R(400), kolor: 'akcent', wypelnienie: '' }),
    wodny: () => {
      const W = K.znakWodny || {}, h = R(W.wysokosc || 900);
      return { id, rodzaj: 'logo', nazwa: 'Znak wodny', wariant: K.znaki.some(z => z[0] === 'sygnet') ? 'sygnet' : K.znaki[0][0], h,
        krycie: Math.round((W.krycie ?? 0.07) * 100), x: Math.round(f.w - h * 0.75), y: Math.round(f.h - h * 0.75) };
    },
  };
  return nowe[typ]?.();
}
// zdjęcie w tle ląduje na spodzie, cień zaraz nad zdjęciami w tle, znak wodny nad tłem – reszta na wierzch
function stWlDodaj(typ) {
  const d = studio.cur, ws = (d.warstwy ||= []), w = stWlNowa(typ); if (!w) return;
  const spod = ws.findIndex(x => !stWlFull(x)), poTle = spod < 0 ? ws.length : spod;
  if (typ === 'zdjecie') ws.unshift(w);
  else if (typ === 'cien' || typ === 'wodny') ws.splice(poTle, 0, w);
  else ws.push(w);
  studio.wsel = w.id; stMarkDirty(); stRedrawForm(); stPaint();
}
function stWlSkaluj(d, stary) {
  const a = brandOf(d.brand).formaty[stary], b = formatOf(d); if (!a || !b) return;
  const sx = b.w / a.w, sy = b.h / a.h, sm = Math.min(sx, sy), r = v => (v == null || v === '' ? v : Math.round(v));
  for (const w of d.warstwy || []) {
    if (w.x != null) w.x = r(w.x * sx); if (w.y != null) w.y = r(w.y * sy);
    if (w.rodzaj === 'tekst' || w.rodzaj === 'linia') { if (w.w != null) w.w = r(w.w * sx); }
    else { if (w.w != null) w.w = r(w.w * sm); if (w.h != null && w.rodzaj !== 'linia') w.h = r(w.h * sm); }
    if (w.rozmiar != null) w.rozmiar = r(w.rozmiar * sm);
  }
}
function stWlForm(m, d) {
  const ws = d.warstwy || [];
  return `<div class="st-sep"></div>
    <div class="field"><label>Dodaj element <span class="hint">· z materiałów systemu</span></label><div class="wl-add">${WL_DODAJ.map(([k, l]) => `<button class="btn sm" data-sa="wl-add" data-v="${k}">＋ ${l}</button>`).join('')}</div></div>
    <div class="field"><label>Warstwy <span class="hint">· wyżej na liście = na wierzchu</span></label>
    ${ws.length ? `<div class="wl-list">${ws.map((w, i) => [w, i]).reverse().map(([w, i]) => `<div class="wl-row ${w.id === studio.wsel ? 'on' : ''}" data-sa="wl-sel" data-id="${esc(w.id)}">
        <span class="grow">${esc(stWlNazwa(m, w))}</span>
        <button class="ic" data-sa="wl-mv" data-id="${esc(w.id)}" data-v="1" title="Wyżej" ${i === ws.length - 1 ? 'disabled' : ''}>↑</button>
        <button class="ic" data-sa="wl-mv" data-id="${esc(w.id)}" data-v="-1" title="Niżej" ${i === 0 ? 'disabled' : ''}>↓</button>
        <button class="ic" data-sa="wl-dup" data-id="${esc(w.id)}" title="Powiel">⧉</button>
        <button class="ic" data-sa="wl-del" data-id="${esc(w.id)}" title="Usuń">✕</button></div>`).join('')}</div>`
      : '<div class="small muted">Pusta grafika. Dodaj zdjęcie w tle, nagłówek, logo i resztę – elementy przeciągasz na podglądzie.</div>'}</div>
    ${stWlProps(m, d)}`;
}
function stWlProps(m, d) {
  const w = stWlSel(); if (!w) return d.warstwy?.length ? '<div class="small muted">Kliknij element na podglądzie albo na liście, aby go ustawić.</div>' : '';
  const K = m.kreator, f = formatOf(d);
  const num = (k, l, min, max, hint = '') => `<div class="field"><label>${l}${hint ? ` <span class="hint">${hint}</span>` : ''}</label><input class="input" type="number" data-sw="${k}" value="${esc(w[k] ?? '')}" min="${min}" max="${max}"></div>`;
  const sel = (k, l, opcje, def = '') => `<div class="field"><label>${l}</label><select class="select" data-sw="${k}">${opcje.map(([o, t]) => `<option value="${esc(o)}" ${String(w[k] ?? def) === o ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  const chk = (k, l) => `<label class="st-check" style="margin-bottom:10px"><input type="checkbox" data-sw="${k}" ${w[k] ? 'checked' : ''}> ${l}</label>`;
  const two = (a, b) => `<div class="two">${a}${b}</div>`;
  let h = '';
  if (w.rodzaj === 'tekst') {
    h += sel('styl', 'Rodzaj tekstu', WL_STYLE, 'tekst');
    if (w.styl !== 'cytat') h += `<div class="field"><label>Treść <span class="hint">${w.styl === 'tytul' ? '| nowy wiersz · *słowo* akcent' : w.styl === 'tekst' ? '*fragment* pogrubienie' : ''}</span></label><textarea class="input" rows="3" data-sw="tresc">${esc(w.tresc || '')}</textarea></div>`;
    h += two(num('rozmiar', 'Wielkość', 8, 900, 'px'), num('w', 'Szerokość pola', 20, f.w * 2, 'px'));
    h += two(sel('kolor', w.styl === 'przycisk' ? 'Kolor przycisku' : 'Kolor', K.kolory, 'auto'), sel('wyr', 'Wyrównanie', [['left', 'Do lewej'], ['center', 'Do środka'], ['right', 'Do prawej']], 'left'));
    if (!['cytat', 'przycisk'].includes(w.styl)) h += chk('cienTekstu', 'Cień pod tekstem (na zdjęciu)');
  } else if (w.rodzaj === 'logo') {
    h += sel('wariant', 'Znak', K.znaki, K.znaki[0]?.[0]) + two(sel('motyw', 'Wersja', [['', 'Dopasuj do tła'], ['ciemne', 'Na ciemne tło'], ['jasne', 'Na jasne tło'], ['foto', 'Na zdjęcie']], ''), num('h', 'Wysokość', 10, 3000, 'px'));
  } else if (w.rodzaj === 'zdjecie') {
    const zd = m.przyklady.zdjecia;
    h += `<div class="field"><label>Zdjęcie</label>${zd.length ? `<div class="st-photos">${zd.map(n => `<img src="${esc(m.miniatura(n))}" alt="" title="${esc(m.opisZdjecia?.(n) || '')}" class="${n === w.plik ? 'on' : ''}" data-sa="wl-foto" data-v="${esc(n)}" loading="lazy">`).join('')}</div>` : ''}
      <button class="btn sm" data-sa="wl-foto-up" style="margin-top:8px">⤒ Wgraj własne</button></div>`;
    h += chk('pelne', 'Na całą grafikę (tło)');
    if (!w.pelne) h += two(num('w', 'Szerokość', 10, f.w * 2, 'px'), num('h', 'Wysokość', 10, f.h * 2, 'px')) + num('zaokr', 'Zaokrąglenie rogów', 0, 2000, 'px');
    h += `<div class="small muted" style="margin-bottom:10px">${w.pelne ? (w.kadr ? 'Przeciągnij zdjęcie na podglądzie, aby zmienić kadr.' : 'Kadr „głowa do klatki” z systemu – przeciągnij zdjęcie, aby ustawić ręcznie.') : 'Kadr wewnątrz ramki:'}</div>`;
    if (!w.pelne) { const [x, y] = stKadr(w); h += `<div class="st-kadr" style="margin-bottom:12px"><span>poziomo</span><input type="range" min="0" max="100" data-swk="x" value="${x}"><span>pionowo</span><input type="range" min="0" max="100" data-swk="y" value="${y}"></div>`; }
  } else if (w.rodzaj === 'cien') {
    h += num('sila', 'Siła cienia', 0, 150, '% · 100 = jak w systemie');
  } else if (w.rodzaj === 'linia') {
    h += two(num('w', 'Długość', 2, f.w * 2, 'px'), num('h', 'Grubość', 1, 200, 'px')) + sel('kolor', 'Kolor', K.kolory.filter(([k]) => k !== 'auto'), 'akcent');
  } else if (w.rodzaj === 'ksztalt') {
    h += two(num('w', 'Szerokość', 4, f.w * 2, 'px'), num('h', 'Wysokość', 4, f.h * 2, 'px'));
    h += two(sel('wypelnienie', 'Wypełnienie', K.wypelnienia, ''), sel('kolor', 'Kolor', K.kolory.filter(([k]) => k !== 'auto'), 'akcent')) + num('zaokr', 'Zaokrąglenie rogów', 0, 2000, 'px');
  }
  if (!stWlFull(w)) {
    h += two(num('x', 'Od lewej', -f.w, f.w * 2, 'px'), num('y', 'Od góry', -f.h, f.h * 2, 'px'));
    h += `<div class="row" style="gap:6px;margin:-4px 0 12px"><button class="btn sm ghost" data-sa="wl-center" data-v="x">↔ Wyśrodkuj</button><button class="btn sm ghost" data-sa="wl-center" data-v="y">↕ Wyśrodkuj</button></div>`;
    h += two(num('krycie', 'Krycie', 0, 100, '%'), num('obrot', 'Obrót', -180, 180, '°'));
  } else h += num('krycie', 'Krycie', 0, 100, '%');
  return `<div class="wl-props"><div class="wl-ph">${esc(stWlNazwa(m, w))}</div>${h}</div>`;
}
// ramka zaznaczenia nad podglądem (poza grafiką – nie trafia do PNG)
function stWlBox() {
  const box = $('#wlBox'); if (!box) return;
  const w = stWl() && stWlSel(), el = w && studio.frame?.contentDocument?.querySelector(`[data-w="${w.id}"]`);
  if (!el) { box.style.display = 'none'; return; }
  const r = el.getBoundingClientRect(), s = studio.scale;
  Object.assign(box.style, { display: 'block', left: `${r.left * s}px`, top: `${r.top * s}px`, width: `${Math.max(4, r.width * s)}px`, height: `${Math.max(4, r.height * s)}px` });
}
let wlDrag = null;
function stWlDown(e) {
  const doc = studio.frame?.contentDocument; if (!doc) return;
  const R = e.target.getBoundingClientRect(), s = studio.scale, ws = studio.cur.warstwy || [];
  const hits = doc.elementsFromPoint((e.clientX - R.left) / s, (e.clientY - R.top) / s).map(x => x.closest('[data-w]')).filter(Boolean);
  const warstwa = el => ws.find(v => v.id === el.dataset.w);
  // najpierw elementy, potem zdjęcie w tle (przeciąganie zmienia wtedy kadr), na końcu cień
  const hit = hits.find(x => !x.dataset.full) || hits.find(x => warstwa(x)?.rodzaj === 'zdjecie') || hits[0];
  const w = hit && warstwa(hit);
  if ((w?.id || null) !== (studio.wsel || null)) { studio.wsel = w?.id || null; stRedrawForm(); }
  stWlBox();
  if (!w || (w.rodzaj === 'cien')) return;
  e.target.setPointerCapture(e.pointerId);
  const r = hit.getBoundingClientRect();
  wlDrag = { w, el: hit, x0: e.clientX, y0: e.clientY, sx: +w.x || 0, sy: +w.y || 0, kadr: w.pelne ? stKadr(w) : null, ww: r.width, hh: r.height, ruch: false };
}
function stWlMove(e) {
  const g = wlDrag, s = studio.scale, f = formatOf(studio.cur);
  const dx = (e.clientX - g.x0) / s, dy = (e.clientY - g.y0) / s;
  if (!g.ruch && Math.abs(dx) + Math.abs(dy) < 3 / s) return;
  g.ruch = true;
  if (g.kadr) {
    const c = v => Math.round(Math.max(0, Math.min(100, v)));
    g.w.kadr = `${c(g.kadr[0] - dx / f.w * 100)}% ${c(g.kadr[1] - dy / f.h * 100)}%`;
    stPaint();
  } else {
    // przyciąganie do środka grafiki
    const snap = 8 / s;
    let x = Math.round(g.sx + dx), y = Math.round(g.sy + dy);
    if (Math.abs(x + g.ww / 2 - f.w / 2) < snap) x = Math.round(f.w / 2 - g.ww / 2);
    if (Math.abs(y + g.hh / 2 - f.h / 2) < snap) y = Math.round(f.h / 2 - g.hh / 2);
    g.w.x = x; g.w.y = y; g.el.style.left = `${x}px`; g.el.style.top = `${y}px`;
    stWlBox();
  }
  stMarkDirty();
}
function stWlAkcja(a, el) {
  const d = studio.cur, ws = (d.warstwy ||= []), i = ws.findIndex(w => w.id === el.dataset.id), w = ws[i];
  switch (a) {
    case 'wl-add': stWlDodaj(el.dataset.v); return;
    case 'wl-sel': studio.wsel = el.dataset.id; stRedrawForm(); stWlBox(); return;
    case 'wl-mv': { const j = i + +el.dataset.v; if (i < 0 || j < 0 || j >= ws.length) return; [ws[i], ws[j]] = [ws[j], ws[i]]; break; }
    case 'wl-dup': { if (!w) return; const k = { ...structuredClone(w), id: uid() + uid() }; if (!stWlFull(k)) { k.x = (+k.x || 0) + 30; k.y = (+k.y || 0) + 30; } ws.splice(i + 1, 0, k); studio.wsel = k.id; break; }
    case 'wl-del': if (i < 0) return; ws.splice(i, 1); if (studio.wsel === w.id) studio.wsel = null; break;
    case 'wl-foto': { const s = stWlSel(); if (!s) return; s.plik = el.dataset.v; delete s.kadr; break; }
    case 'wl-center': {
      const s = stWlSel(), x = s && studio.frame?.contentDocument?.querySelector(`[data-w="${s.id}"]`); if (!x) return;
      const f = formatOf(d), r = x.getBoundingClientRect();
      if (el.dataset.v === 'x') s.x = Math.round(f.w / 2 - r.width / 2); else s.y = Math.round(f.h / 2 - r.height / 2);
      break;
    }
    default: return;
  }
  stMarkDirty(); stRedrawForm(); stPaint();
}

/* ---------- edycja ---------- */
const stKadr = d => { const [x = 50, y = 50] = String(d.kadr || '50% 50%').split(/\s+/).map(parseFloat); return [isNaN(x) ? 50 : x, isNaN(y) ? 50 : y]; };
function stSetKadr(x, y) {
  const c = v => Math.round(Math.max(0, Math.min(100, v)));
  studio.cur.kadr = `${c(x)}% ${c(y)}%`;
  $$('[data-sk]').forEach(i => { i.value = c(i.dataset.sk === 'x' ? x : y); });
  stMarkDirty(); stPaint();
}
function stNew(base) {
  const m = brandOf(studio.brand);
  const format = base?.format && m.formaty[base.format] ? base.format : 'post';
  const typ = base?.typ || m.typyFormatu[format][0];
  const { id, ...rest } = base || {};
  studio.cur = { ...structuredClone(base ? rest : m.start[typ]), brand: m.id, format, typ: format === 'poziom' && typ !== 'wlasny' ? 'poziom' : typ, name: base?.nazwa || base?.name || 'Nowa grafika' };
  delete studio.cur.nazwa;
  studio.dirty = false; studio.pickFoto = false; studio.wzor = null; studio.wsel = null;
  if (location.hash === `${stBase()}/nowy`) render(); else location.hash = `${stBase()}/nowy`;
}
const stLeave = () => !studio.dirty || confirm('Masz niezapisane zmiany w grafice. Wyjść bez zapisywania?');

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-sa]'); if (!el) return;
  const a = el.dataset.sa, m = brandOf(studio.brand);
  switch (a) {
    case 'new': stNew(); break;
    case 'new-wl': stNew({ ...structuredClone(m.start.wlasny || { warstwy: [] }), format: 'post', typ: 'wlasny', nazwa: 'Własny układ' }); break;
    case 'wl-add': case 'wl-sel': case 'wl-mv': case 'wl-dup': case 'wl-del': case 'wl-foto': case 'wl-center': stWlAkcja(a, el); break;
    case 'wl-foto-up': {
      const w = stWlSel(); if (!w) return;
      const [f] = await pickFiles('image/*,.jfif,.webp,.avif', false); if (!f) return;
      toast('Wgrywam zdjęcie…');
      try { const md = await fileToMedia(f, 2400); w.plik = md.src; delete w.kadr; stMarkDirty(); stRedrawForm(); stPaint(); }
      catch (err) { toast(err.message, 6000); }
      break;
    }
    // „＋ Nowa grafika” w górnym pasku klienta: od razu nowy projekt w jego systemie
    case 'new-top': {
      const r = route();
      if (r.name === 'client' && r.tab === 'grafiki' && studio.cid === el.dataset.client && brandOf(studio.brand)?.przyklady) stNew();
      else if (r.name === 'studio' && studio.cid === el.dataset.client) { if (stLeave()) stNew(); }
      else { studio.wantNew = true; location.hash = `#/k/${el.dataset.client}/grafiki`; }
      break;
    }
    case 'example': stNew(structuredClone(m.przyklady.zbiory[+el.dataset.z].projekty[+el.dataset.i])); break;
    case 'wzor': {
      const w = m.wzorce[+el.dataset.i], { format, typ } = stWzorTyp(m, w);
      stNew({ ...structuredClone(m.start[typ] || {}), format, typ, nazwa: `Na wzór: ${w.nazwa}` });
      studio.wzor = w; render();
      break;
    }
    case 'wzor-lb': openLb(null, +el.dataset.i, { media: m.wzorce.map(w => ({ type: 'image', src: w.plik, orig: w.plik, name: w.nazwa })) }); break;
    case 'open': if (!e.target.closest('.st-del')) location.hash = `${stBase()}/p/${el.dataset.id}`; break;
    case 'del': {
      const d = stDesign(el.dataset.id); if (!confirm(`Usunąć projekt „${d?.name || 'bez nazwy'}”? Grafiki dodane do treści zostaną w planie.`)) return;
      try { await api('DELETE', `/api/designs/${el.dataset.id}`); studio.designs = studio.designs.filter(x => x.id !== el.dataset.id); render(); } catch (err) { toast(err.message, 5000); }
      break;
    }
    case 'back': if (stLeave()) { studio.dirty = false; studio.cur = null; location.hash = stBase(); } break;
    case 'save': stSave(); break;
    case 'png': stPng(); break;
    case 'attach': stAttachModal(); break;
    case 'at-mode': stAttachModal($('#stAtClient').value, el.dataset.v); break;
    case 'attach-do': stAttach(); break;
    case 'foto-toggle': studio.pickFoto = !studio.pickFoto; stRedrawForm(); break;
    case 'foto-pick': studio.cur.zdjecie = el.dataset.v; delete studio.cur.styl; delete studio.cur.kadr; stMarkDirty(); stRedrawForm(); stPaint(); break;
    case 'foto-up': {
      const [f] = await pickFiles('image/*,.jfif,.webp,.avif', false); if (!f) return;
      toast('Wgrywam zdjęcie…');
      try { const md = await fileToMedia(f, 2400); studio.cur.zdjecie = md.src; delete studio.cur.styl; stMarkDirty(); stRedrawForm(); stPaint(); }
      catch (err) { toast(err.message, 6000); }
      break;
    }
  }
});
document.addEventListener('change', e => { if (e.target.id === 'stAtClient') stAttachModal(e.target.value, studio.atMode); });
// szukanie treści w oknie „Dodaj do treści”
document.addEventListener('input', e => {
  if (e.target.id !== 'stAtQ') return;
  const q = pkey(e.target.value), sel = $('#stAtPost');
  [...sel.options].forEach(o => { o.hidden = !!q && !pkey(o.textContent).includes(q); });
  if (sel.selectedOptions[0]?.hidden) { const f = [...sel.options].find(o => !o.hidden); if (f) f.selected = true; }
});
document.addEventListener('input', e => {
  const t = e.target, d = studio.cur;
  if (t.dataset.sk && d) { const [x, y] = stKadr(d); stSetKadr(t.dataset.sk === 'x' ? +t.value : x, t.dataset.sk === 'y' ? +t.value : y); return; }
  if (t.dataset.swk && d) {
    const w = stWlSel(); if (!w) return;
    const [x, y] = stKadr(w); w.kadr = `${t.dataset.swk === 'x' ? +t.value : x}% ${t.dataset.swk === 'y' ? +t.value : y}%`;
    stMarkDirty(); stPaint(); return;
  }
  if (t.dataset.sw && d) {
    const w = stWlSel(); if (!w) return;
    const k = t.dataset.sw;
    if (t.type === 'checkbox') w[k] = t.checked;
    else if (t.type === 'number') { if (t.value === '') delete w[k]; else w[k] = +t.value; }
    else w[k] = t.value;
    if (k === 'pelne' && !w.pelne) { const f = formatOf(d); w.x ??= 90; w.y ??= 90; w.w ??= Math.round(f.w / 2); w.h ??= Math.round(f.h / 2); }
    stMarkDirty(); stPaint();
    if (t.tagName === 'SELECT' || t.type === 'checkbox') stRedrawForm();
    else { const row = $(`.wl-row.on .grow`); if (row) row.textContent = stWlNazwa(brandOf(d.brand), w); }
    return;
  }
  if (!t.dataset.sf || !d) return;
  const k = t.dataset.sf, f = brandOf(d.brand).pola[k], stary = d.format;
  if (t.type === 'checkbox') d[k] = t.checked;
  else if (f?.typ === 'num') { if (t.value === '') delete d[k]; else d[k] = +t.value; }
  else d[k] = t.value;
  stMarkDirty();
  if (k === 'format' || k === 'typ') {
    const m = brandOf(d.brand), typy = m.typyFormatu[d.format];
    if (!typy.includes(d.typ)) d.typ = typy[0];
    if (k === 'format' && d.typ === 'wlasny' && stary !== d.format) stWlSkaluj(d, stary);
    // nowy szablon dostaje przykładową treść tylko w polach, których jeszcze nie ma
    for (const [pk, pv] of Object.entries(m.start[d.typ] || {})) if (d[pk] === undefined || d[pk] === '') d[pk] = structuredClone(pv);
    render();
    return;
  }
  if (k !== 'name') stPaint();
});
window.addEventListener('beforeunload', e => { if (route().name === 'studio' && studio.dirty) { e.preventDefault(); e.returnValue = ''; } });

// przeciąganie zdjęcia na podglądzie ustawia kadr
let stDragFrom = null;
document.addEventListener('pointerdown', e => {
  if (e.target.id === 'stDrag' && stWl()) { stWlDown(e); return; }
  if (e.target.id !== 'stDrag' || !studio.cur || !brandOf(studio.cur.brand).polaTypow[studio.cur.typ].includes('kadr')) return;
  stDragFrom = { x: e.clientX, y: e.clientY, k: stKadr(studio.cur), w: e.target.clientWidth, h: e.target.clientHeight };
  e.target.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', e => {
  if (wlDrag) { stWlMove(e); return; }
  if (!stDragFrom) return;
  const s = stDragFrom;
  stSetKadr(s.k[0] - (e.clientX - s.x) / s.w * 100, s.k[1] - (e.clientY - s.y) / s.h * 100);
});
document.addEventListener('pointerup', () => {
  stDragFrom = null;
  if (wlDrag) { const ruch = wlDrag.ruch; wlDrag = null; if (ruch) { stRedrawForm(); stPaint(); } }
});
// klawiatura w kreatorze: strzałki przesuwają zaznaczony element, Delete go usuwa
document.addEventListener('keydown', e => {
  if (!stWl() || route().name !== 'studio' || modalOpen || document.activeElement?.matches('input,textarea,select,[contenteditable]')) return;
  const w = stWlSel(); if (!w) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); stWlAkcja('wl-del', { dataset: { id: w.id } }); return; }
  const kier = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!kier || stWlFull(w)) return;
  e.preventDefault();
  const o = e.shiftKey ? 10 : 1; w.x = (+w.x || 0) + kier[0] * o; w.y = (+w.y || 0) + kier[1] * o;
  stMarkDirty(); stPaint(); stRedrawForm();
});

// stan ściągawki zasad przetrwa przerysowanie formularza
document.addEventListener('toggle', e => { if (e.target.classList?.contains('st-zasady')) studio.zasadyOpen = e.target.open; }, true);
