'use strict';
/* ================= Grafiki: projekty w systemie identyfikacji marki (tylko agencja) =================
   Marka to pakiet z /marki/<id>/marka.js: formaty, szablony i pola. Grafika powstaje w ramce (iframe) z kodem marki,
   więc style aplikacji nie zmieniają jej wyglądu, a PNG robi biblioteka html-to-image wczytana w tej samej ramce. */
const studio = {
  brands: null, brand: 'wizme', designs: null, error: '',
  cur: null, dirty: false, frame: null, scale: 1, busy: '', pickFoto: false, loading: null,
};
const brandOf = id => window.MARKI?.[id];
const formatOf = d => brandOf(d.brand).formaty[d.format];
const stDesign = id => studio.designs?.find(d => d.id === id);

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Nie udało się wczytać systemu marki')); document.head.appendChild(s); });
}
async function loadBrand(id) {
  if (brandOf(id)?.przyklady) return;
  if (!brandOf(id)) await loadScript(`/marki/${id}/marka.js`);
  await brandOf(id).init();
}
function studioLoad() {
  studio.loading ||= (async () => {
    try {
      studio.brands ||= await api('GET', '/marki/marki.json');
      if (!studio.brands.some(b => b.id === studio.brand)) studio.brand = studio.brands[0]?.id;
      await loadBrand(studio.brand);
      studio.designs ||= await api('GET', '/api/designs');
      studio.error = '';
    } catch (e) { studio.error = e.message; }
    studio.loading = null;
    if (route().name === 'studio') render();
  })();
}

/* ---------- widoki ---------- */
function viewStudio(r) {
  if (!studio.designs || !brandOf(studio.brand)?.przyklady) {
    if (!studio.error) studioLoad();
    return `<div class="container"><div class="empty">${studio.error ? `<b>Nie udało się otworzyć modułu Grafiki</b>${esc(studio.error)}` : 'Wczytuję system identyfikacji…'}</div></div>`;
  }
  if (r.id === 'nowy' && studio.cur) return stEditor();
  if (r.id && r.id !== 'nowy') {
    const d = stDesign(r.id);
    if (!d) return `<div class="container"><div class="empty"><b>Nie ma takiego projektu</b><a href="#/grafiki">Wróć do grafik</a></div></div>`;
    if (studio.cur?.id !== d.id) { studio.cur = structuredClone(d); studio.dirty = false; }
    return stEditor();
  }
  return stGallery();
}

function stGallery() {
  const m = brandOf(studio.brand);
  const fmt = d => m.formaty[d.format]?.nazwa || '';
  const mine = studio.designs.filter(d => d.brand === studio.brand);
  const card = (thumb, title, sub, attrs, extra = '') => `<div class="st-card" ${attrs}>
      <div class="st-thumb"><img src="${esc(thumb)}" alt="" loading="lazy"></div>
      <div class="st-cap"><b>${esc(title)}</b><span>${esc(sub)}</span></div>${extra}</div>`;
  const brands = studio.brands.length > 1 ? `<div class="seg">${studio.brands.map(b => `<button class="${b.id === studio.brand ? 'on' : ''}" data-sa="brand" data-v="${esc(b.id)}">${esc(b.nazwa)}</button>`).join('')}</div>` : '';
  return `<div class="container wide studio">
    <div class="st-head"><div><h1>Grafiki</h1><p class="muted">Projekty w systemie identyfikacji ${esc(m.nazwa)}. Widzi je tylko zespół agencji, klienci nie mają do nich dostępu.</p></div>
      <span class="grow"></span>${brands}<button class="btn primary" data-sa="new">＋ Nowa grafika</button></div>
    <h2 class="st-h2">Twoje projekty</h2>
    ${mine.length ? `<div class="st-grid">${mine.map(d => card(d.thumb || m.podgladPrzykladu('t10'), d.name || 'Bez nazwy', `${fmt(d)} · ${fmtTs(d.updatedAt)}`,
      `data-sa="open" data-id="${esc(d.id)}"`, `<button class="st-del" data-sa="del" data-id="${esc(d.id)}" title="Usuń projekt">✕</button>`)).join('')}</div>`
      : '<div class="st-none muted">Nie masz jeszcze zapisanych projektów. Zacznij od nowej grafiki albo od gotowego projektu poniżej.</div>'}
    ${m.przyklady.zbiory.map((z, zi) => `<h2 class="st-h2">${esc(z.nazwa)}</h2>
      <div class="st-grid">${z.projekty.map((p, i) => card(m.podgladPrzykladu(p.id), p.nazwa, `${fmt(p)}${p.typ ? ' · ' + (m.nazwyTypow[p.typ] || '') : ''}`,
        `data-sa="example" data-z="${zi}" data-i="${i}" title="Otwórz jako nowy projekt"`)).join('')}</div>`).join('')}
  </div>`;
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
        <div class="col"><button class="btn sm" data-sa="foto-up">⤒ Wgraj zdjęcie</button><button class="btn sm ghost" data-sa="foto-toggle">${studio.pickFoto ? 'Ukryj przykładowe' : 'Wybierz z przykładowych'}</button></div></div>
      ${studio.pickFoto ? `<div class="st-photos">${photos.map(n => `<img src="${esc(m.miniatura(n))}" alt="" title="${esc(n)}" class="${n === d.zdjecie ? 'on' : ''}" data-sa="foto-pick" data-v="${esc(n)}" loading="lazy">`).join('')}</div>` : ''}</div>`;
  }
  return `<div class="field">${label}<input class="input" data-sf="${k}" value="${esc(v)}"></div>`;
}

function stForm() {
  const d = studio.cur, m = brandOf(d.brand);
  const typy = m.typyFormatu[d.format];
  return `<div class="field"><label>Rodzaj grafiki</label><select class="select" data-sf="format">${Object.entries(m.formaty).map(([k, f]) =>
      `<option value="${k}" ${k === d.format ? 'selected' : ''}>${esc(f.nazwa)} · ${esc(f.opis)}</option>`).join('')}</select></div>
    ${typy.length > 1 ? `<div class="field"><label>Szablon</label><select class="select" data-sf="typ">${typy.map(t => `<option value="${t}" ${t === d.typ ? 'selected' : ''}>${esc(m.nazwyTypow[t])}</option>`).join('')}</select></div>` : ''}
    <div class="st-sep"></div>
    ${m.polaTypow[d.typ].map(k => stField(m, d, k)).join('')}`;
}

function stEditor() {
  const d = studio.cur, f = formatOf(d);
  return `<div class="studio st-ed">
    <div class="st-bar"><button class="btn ghost" data-sa="back">← Grafiki</button>
      <input class="input st-name" data-sf="name" value="${esc(d.name || '')}" placeholder="Nazwa projektu">
      <span class="muted small" id="stState">${studio.dirty ? 'Niezapisane zmiany' : d.id ? 'Zapisano' : 'Nowy projekt'}</span><span class="grow"></span>
      <button class="btn" data-sa="png" ${studio.busy ? 'disabled' : ''}>⤓ Pobierz PNG</button>
      <button class="btn" data-sa="attach" ${studio.busy ? 'disabled' : ''}>＋ Dodaj do treści</button>
      <button class="btn primary" data-sa="save" ${studio.busy ? 'disabled' : ''}>${studio.busy === 'save' ? 'Zapisuję…' : 'Zapisz'}</button></div>
    <div class="st-body">
      <div class="st-form" id="stForm">${stForm()}</div>
      <div class="st-view"><div class="st-stage-wrap" id="stWrap"><div class="st-stage" id="stStage"></div><div class="st-drag" id="stDrag"></div></div>
        <div class="muted small st-dims">${f.w} × ${f.h} px${brandOf(d.brand).polaTypow[d.typ].includes('kadr') ? ' · przeciągnij zdjęcie, aby ustawić kadr' : ''}</div></div>
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
  fr.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${m.fonty}"><style>${m.css}</style><script src="/static/vendor/html-to-image.js"><\/script></head><body></body></html>`;
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
    if (location.hash !== `#/grafiki/p/${id}`) history.replaceState(null, '', `#/grafiki/p/${id}`);
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

/* ---------- dodanie grafiki do treści w planie ---------- */
function stAttachModal(cid) {
  const brand = brandOf(studio.cur.brand);
  const clients = state.clients;
  if (!clients.length) { toast('Najpierw dodaj klienta'); return; }
  cid ||= (clients.find(c => pkey(c.name).includes(pkey(brand.nazwa))) || clients[0]).id;
  const posts = sortPosts(postsOf(cid)).sort((a, b) => (a.date && a.date < TODAY) - (b.date && b.date < TODAY));
  const label = p => `${p.date ? fmtShort(p.date) : p.week ? 'tydz. ' + fmtShort(p.week) : 'rezerwa'} · ${p.format || 'treść'} · ${p.title || 'bez tematu'}${p.media.length ? ` (${p.media.length} graf.)` : ''}`;
  modal(`<div class="modal-h"><h2 style="font-size:18px">Dodaj grafikę do treści</h2></div>
    <div class="modal-b">
      <div class="field"><label>Klient</label><select class="select" id="stAtClient">${clients.map(c => `<option value="${esc(c.id)}" ${c.id === cid ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Treść <span class="hint">grafika trafi na koniec jej materiałów</span></label>
        ${posts.length ? `<select class="select" id="stAtPost" size="8">${posts.map((p, i) => `<option value="${esc(p.id)}" ${i === 0 ? 'selected' : ''}>${esc(label(p))}</option>`).join('')}</select>`
        : '<div class="muted">Ten klient nie ma jeszcze treści.</div>'}</div>
      <label class="st-check"><input type="checkbox" id="stAtNew"> Utwórz nową treść w rezerwie</label>
    </div>
    <div class="modal-f"><button class="btn" data-act="close-modal">Anuluj</button><button class="btn primary" data-sa="attach-do">Dodaj</button></div>`);
}
function stAttach() {
  const cid = $('#stAtClient').value, makeNew = $('#stAtNew').checked || !$('#stAtPost');
  let post = makeNew ? null : state.posts.find(p => p.id === $('#stAtPost').value);
  closeModal();
  return stRun('attach', async () => {
    const d = studio.cur, canvas = await stCanvas();
    const m = await blobToMedia(await canvasBlob(canvas), `${fileName(d)}.png`, 2400);
    if (!post) {
      post = newPost({ clientId: cid, date: '', approval: 'draft', title: d.name || 'Grafika', format: d.format === 'story' ? 'Relacja' : 'Post' });
      state.posts.push(post);
    }
    post.media.push(m);
    save(true);
    toast(`Grafika dodana do treści „${post.title || 'bez tematu'}”`, 4000);
  });
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
  studio.cur = { ...(base ? rest : m.start[typ]), brand: m.id, format, typ: format === 'poziom' ? 'poziom' : typ, name: base?.nazwa || base?.name || 'Nowa grafika' };
  delete studio.cur.nazwa;
  studio.dirty = false; studio.pickFoto = false;
  if (location.hash === '#/grafiki/nowy') render(); else location.hash = '#/grafiki/nowy';
}
const stLeave = () => !studio.dirty || confirm('Masz niezapisane zmiany w grafice. Wyjść bez zapisywania?');

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-sa]'); if (!el) return;
  const a = el.dataset.sa, m = brandOf(studio.brand);
  switch (a) {
    case 'brand': studio.brand = el.dataset.v; studio.error = ''; await loadBrand(studio.brand).catch(err => toast(err.message)); render(); break;
    case 'new': stNew(); break;
    case 'example': stNew(structuredClone(m.przyklady.zbiory[+el.dataset.z].projekty[+el.dataset.i])); break;
    case 'open': if (!e.target.closest('.st-del')) location.hash = `#/grafiki/p/${el.dataset.id}`; break;
    case 'del': {
      const d = stDesign(el.dataset.id); if (!confirm(`Usunąć projekt „${d?.name || 'bez nazwy'}”? Grafiki dodane do treści zostaną w planie.`)) return;
      try { await api('DELETE', `/api/designs/${el.dataset.id}`); studio.designs = studio.designs.filter(x => x.id !== el.dataset.id); render(); } catch (err) { toast(err.message, 5000); }
      break;
    }
    case 'back': if (stLeave()) { studio.dirty = false; studio.cur = null; location.hash = '#/grafiki'; } break;
    case 'save': stSave(); break;
    case 'png': stPng(); break;
    case 'attach': stAttachModal(); break;
    case 'attach-do': stAttach(); break;
    case 'foto-toggle': studio.pickFoto = !studio.pickFoto; stRedrawForm(); break;
    case 'foto-pick': studio.cur.zdjecie = el.dataset.v; delete studio.cur.styl; stMarkDirty(); stRedrawForm(); stPaint(); break;
    case 'foto-up': {
      const [f] = await pickFiles('image/*,.jfif,.webp,.avif', false); if (!f) return;
      toast('Wgrywam zdjęcie…');
      try { const md = await fileToMedia(f, 2400); studio.cur.zdjecie = md.src; delete studio.cur.styl; stMarkDirty(); stRedrawForm(); stPaint(); }
      catch (err) { toast(err.message, 6000); }
      break;
    }
  }
});
document.addEventListener('change', e => { if (e.target.id === 'stAtClient') stAttachModal(e.target.value); });
document.addEventListener('input', e => {
  const t = e.target, d = studio.cur;
  if (t.dataset.sk && d) { const [x, y] = stKadr(d); stSetKadr(t.dataset.sk === 'x' ? +t.value : x, t.dataset.sk === 'y' ? +t.value : y); return; }
  if (!t.dataset.sf || !d) return;
  const k = t.dataset.sf, f = brandOf(d.brand).pola[k];
  if (t.type === 'checkbox') d[k] = t.checked;
  else if (f?.typ === 'num') { if (t.value === '') delete d[k]; else d[k] = +t.value; }
  else d[k] = t.value;
  stMarkDirty();
  if (k === 'format' || k === 'typ') {
    const m = brandOf(d.brand), typy = m.typyFormatu[d.format];
    if (!typy.includes(d.typ)) d.typ = typy[0];
    // nowy szablon dostaje przykładową treść tylko w polach, których jeszcze nie ma
    for (const [pk, pv] of Object.entries(m.start[d.typ] || {})) if (d[pk] === undefined || d[pk] === '') d[pk] = pv;
    render();
    return;
  }
  if (k !== 'name') stPaint();
});
window.addEventListener('beforeunload', e => { if (route().name === 'studio' && studio.dirty) { e.preventDefault(); e.returnValue = ''; } });

// przeciąganie zdjęcia na podglądzie ustawia kadr
let stDragFrom = null;
document.addEventListener('pointerdown', e => {
  if (e.target.id !== 'stDrag' || !studio.cur || !brandOf(studio.cur.brand).polaTypow[studio.cur.typ].includes('kadr')) return;
  stDragFrom = { x: e.clientX, y: e.clientY, k: stKadr(studio.cur), w: e.target.clientWidth, h: e.target.clientHeight };
  e.target.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', e => {
  if (!stDragFrom) return;
  const s = stDragFrom;
  stSetKadr(s.k[0] - (e.clientX - s.x) / s.w * 100, s.k[1] - (e.clientY - s.y) / s.h * 100);
});
document.addEventListener('pointerup', () => { stDragFrom = null; });
