/* Podgląd siatki profilu Instagram: miniatury 3:4 (tak wyświetla je Instagram od 2025 r.)
   i kadr miniatury ustawiany w treści – przesunięcie (x, y w %) i powiększenie (z). Zapis w poście: p.grid = { x, y, z, i }. */

const GRID_R = 3 / 4;
const GRID_ICON = {
  tab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M7 3h12a2 2 0 0 1 2 2v12h-2V5H7z"/><rect x="3" y="7" width="14" height="14" rx="2"/></svg>',
  reel: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 8h18M8 3l3 5M14 3l3 5"/><path d="M10 11.5v5l4.5-2.5z" fill="#fff" stroke="none"/></svg>',
};
const gridOf = p => ({ x: 50, y: 50, z: 1, i: 0, ...(p.grid || {}) });
const onGrid = p => p.meta && !isStory(p.format);
// okładka na siatce: przy rolce można wybrać materiał, przy karuzeli i poście zawsze 1. slajd
const gridMedia = p => p.media[isReel(p.format) ? Math.min(gridOf(p).i, p.media.length - 1) : 0];

// styl obrazka w kafelku 3:4 – w procentach kafelka, więc wygląda tak samo w każdym rozmiarze
function gridImgStyle(m, g) {
  if (!m?.w || !m?.h) return `inset:0;width:100%;height:100%;object-fit:cover;object-position:${g.x}% ${g.y}%;transform:scale(${g.z});transform-origin:${g.x}% ${g.y}%`;
  const r = m.w / m.h;
  let w = 100, h = 100;
  if (r > GRID_R) w = r / GRID_R * 100; else h = GRID_R / r * 100;
  w *= g.z; h *= g.z;
  return `width:${w.toFixed(3)}%;height:${h.toFixed(3)}%;left:${(-(w - 100) * g.x / 100).toFixed(3)}%;top:${(-(h - 100) * g.y / 100).toFixed(3)}%`;
}
function gridInner(p) {
  const m = p.media.length ? gridMedia(p) : null, t = m && mediaThumb(m);
  const ic = isReel(p.format) ? GRID_ICON.reel : p.media.length > 1 ? GRID_ICON.car : '';
  return (t ? `<img src="${esc(t)}" alt="" draggable="false" style="${gridImgStyle(m, gridOf(p))}" onerror="this.remove()">`
      : `<div class="gph">${esc(p.onGraphic || p.title || 'Brak grafiki')}</div>`)
    + (ic ? `<span class="gic">${ic}</span>` : '');
}
const gridTile = (p, cur) => `<div class="gt ${cur ? 'cur' : ''}" title="${esc((p.date ? fmtShort(p.date) + ' · ' : '') + (p.title || p.format))}">${gridInner(p)}</div>`;

// treści na siatce wokół bieżącej: od najnowszej (lewy górny róg), maks. 15 kafelków; treść bez daty traktujemy jako najnowszą
function gridPosts(p) {
  const list = state.posts.filter(x => x.clientId === p.clientId && x.id !== p.id && onGrid(x) && x.date)
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  if (onGrid(p)) {
    if (!p.date) list.unshift(p);
    else list.splice(list.findIndex(x => sortKey(x) < sortKey(p)) >>> 0, 0, p);
  }
  const i = Math.max(0, list.indexOf(p)), from = Math.max(0, Math.min(i - 6, list.length - 15));
  return list.slice(from, from + 15);
}

function previewGrid(p, c, editable) {
  const handle = c.igHandle || c.name.toLowerCase().replace(/\s+/g, '.');
  const g = gridOf(p), m = p.media.length ? gridMedia(p) : null;
  const canCrop = editable && m && mediaThumb(m);
  const editor = !editable ? '' : `<div class="gedit">
    <div class="small" style="font-weight:600;margin-bottom:6px">Kadr miniatury na siatce (3:4)</div>
    ${canCrop ? `<div class="gt gcrop" data-gcrop>${gridInner(p)}<span class="gguide"></span></div>
      <div class="row" style="margin-top:8px;gap:8px"><span class="small muted">Powiększenie</span><input type="range" min="1" max="3" step="0.01" value="${g.z}" data-gzoom style="flex:1">
        <button class="btn sm ghost" data-act="grid-reset" title="Wyśrodkuj i bez powiększenia">↺</button></div>
      ${isReel(p.format) && p.media.length > 1 ? `<div class="row wrap" style="gap:4px;margin-top:6px"><span class="small muted">Okładka:</span>${p.media.map((_, i) => `<button class="btn sm ${i === Math.min(g.i, p.media.length - 1) ? '' : 'ghost'}" data-act="grid-cover" data-i="${i}">${i + 1}</button>`).join('')}</div>` : ''}
      <div class="small muted" style="margin-top:6px">Przeciągnij obraz, aby ustawić kadr. Na Instagramie ustawisz to samo przy publikacji („Edytuj siatkę profilu”).</div>`
      : `<div class="small muted">${m ? 'Podgląd kadru działa dla wgranych grafik i linków do obrazów.' : 'Dodaj grafikę, aby ustawić kadr.'}</div>`}</div>`;
  return `<div class="phone ig ggrid">
    ${editor}
    <div class="p-head">${avatar(c, 32)}<div><div class="nm">${esc(handle)}</div><div class="sub">Siatka profilu · najnowsze u góry</div></div></div>
    <div class="ig-grid">${gridPosts(p).map(x => gridTile(x, x === p)).join('')}</div>
    ${!onGrid(p) ? '<div class="small muted" style="padding:10px">Ta treść nie pojawi się na siatce (relacja albo brak kanału FB + IG).</div>' : ''}</div>`;
}

/* --- ustawianie kadru przeciąganiem --- */
let gdrag = null;
function gridRefreshImgs() {
  const d = drawer?.draft; if (!d) return;
  const m = gridMedia(d), st = gridImgStyle(m, gridOf(d));
  $$('.gcrop img, .ig-grid .gt.cur img').forEach(im => { im.setAttribute('style', st); });
}
document.addEventListener('pointerdown', e => {
  const box = e.target.closest('[data-gcrop]'); if (!box || !drawer) return;
  const im = box.querySelector('img'); if (!im) return;
  e.preventDefault();
  const tr = box.getBoundingClientRect(), ir = im.getBoundingClientRect();
  gdrag = { sx: e.clientX, sy: e.clientY, g: gridOf(drawer.draft), ox: ir.width - tr.width, oy: ir.height - tr.height, tw: tr.width, th: tr.height, box };
  box.setPointerCapture(e.pointerId); box.classList.add('drag');
});
document.addEventListener('pointermove', e => {
  if (!gdrag) return;
  const { g } = gdrag, d = drawer.draft;
  // przy obrazku bez wymiarów (link) przesuwamy object-position – czułość przybliżona
  const ox = gdrag.ox > 1 ? gdrag.ox : gdrag.tw, oy = gdrag.oy > 1 ? gdrag.oy : gdrag.th;
  const clamp = v => Math.max(0, Math.min(100, v));
  d.grid = { ...g, x: +clamp(g.x - (e.clientX - gdrag.sx) / ox * 100).toFixed(1), y: +clamp(g.y - (e.clientY - gdrag.sy) / oy * 100).toFixed(1) };
  gridRefreshImgs();
});
document.addEventListener('pointerup', () => {
  if (!gdrag) return;
  gdrag.box.classList.remove('drag'); gdrag = null;
  drawer.dirty = true;
});
document.addEventListener('input', e => {
  if (!e.target.matches('[data-gzoom]') || !drawer) return;
  drawer.draft.grid = { ...gridOf(drawer.draft), z: +e.target.value };
  drawer.dirty = true; gridRefreshImgs();
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="grid-reset"], [data-act="grid-cover"]'); if (!el || !drawer) return;
  const d = drawer.draft;
  d.grid = el.dataset.act === 'grid-reset' ? { ...gridOf(d), x: 50, y: 50, z: 1 } : { ...gridOf(d), i: +el.dataset.i, x: 50, y: 50, z: 1 };
  drawer.dirty = true; refreshPreview();
});
PV_LABEL.grid = [GRID_ICON.tab, 'Siatka'];
