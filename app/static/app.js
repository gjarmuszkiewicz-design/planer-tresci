'use strict';
/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const TODAY = ymd(new Date());
const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const MONTHS_GEN = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
const DOW = ['pon','wt','śr','czw','pt','sob','nd'];
const DOW_LONG = ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];
const fmtShort = s => { if (!s) return ''; const d = parseYmd(s); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`; };
const fmtDay = s => { const d = parseYmd(s); return `${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };
const fmtTs = ts => { const d = new Date(ts); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const initials = s => (s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const shiftMonth = (mk, n) => { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const monthLabel = mk => { const [y, m] = mk.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
const mondayOf = s => { const d = parseYmd(s); return ymd(addDays(d, -((d.getDay() + 6) % 7))); };
function weeksOfMonth(mk) {
  const [y, m] = mk.split('-').map(Number);
  const first = new Date(y, m - 1, 1), last = new Date(y, m, 0);
  let d = addDays(first, -((first.getDay() + 6) % 7)); const out = [];
  while (d <= last) { out.push(ymd(d)); d = addDays(d, 7); }
  return out;
}
const weekRange = mon => { const s = parseYmd(mon), e = addDays(s, 6); return `${s.getDate()}.${pad(s.getMonth() + 1)} – ${e.getDate()}.${pad(e.getMonth() + 1)}`; };
const weekNo = (mon, mk) => weeksOfMonth(mk).indexOf(mon) + 1;
const pkey = s => String(s || '').toUpperCase().replace(/Ł/g, 'L').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');
const sentence = s => { s = String(s || '').trim(); return s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s; };

const ICON = {
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="#d62976" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#d62976"/></svg>',
  fb: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1877f2"/><path d="M13.2 19v-6h2l.3-2.4h-2.3V9.2c0-.7.2-1.2 1.2-1.2h1.2V5.9a16 16 0 0 0-1.8-.1c-1.8 0-3 1.1-3 3.1v1.7h-2V13h2v6z" fill="#fff"/></svg>',
  li: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="#0a66c2"/><path d="M7 10h2.2v7H7zM8.1 6.5a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM10.8 10h2.1v1c.3-.6 1.1-1.2 2.2-1.2 2.3 0 2.7 1.5 2.7 3.4V17h-2.2v-3.4c0-.8 0-1.9-1.2-1.9s-1.4.9-1.4 1.8V17h-2.2z" fill="#fff"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
};
const chIcons = p => `${p.meta ? ICON.ig + ICON.fb : ''}${p.li ? ICON.li : ''}`;
const chLabel = p => [p.meta && 'FB + IG', p.li && 'LinkedIn'].filter(Boolean).join(' · ');
const FORMATS = ['Post', 'Karuzela', 'Rolka', 'Relacja', 'Karuzela dokumentowa', 'Wideo', 'Artykuł', 'Zdjęcia + komentarz'];
const isReel = f => /rolk|reel|wideo|video|film/i.test(f || '');
const isStory = f => /relacj|story|stories/i.test(f || '');
const PILLAR_COLORS = ['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#65a30d', '#dc2626', '#475569', '#a16207'];
const APPROVAL = {
  draft:    { label: 'Szkic',         cls: 's-draft' },
  pending:  { label: 'Do akceptacji', cls: 's-pending' },
  accepted: { label: 'Zaakceptowany', cls: 's-ok' },
  changes:  { label: 'Do poprawy',    cls: 's-bad' },
};
const badge = a => `<span class="badge ${APPROVAL[a].cls}">${APPROVAL[a].label}</span>`;
const avatar = (c, size = 28) => c?.avatar
  ? `<span class="av" style="width:${size}px;height:${size}px"><img src="${esc(c.avatar)}" alt=""></span>`
  : `<span class="av" style="width:${size}px;height:${size}px;background:${esc(c?.color || '#999')};font-size:${Math.round(size * .4)}px">${esc(initials(c?.name))}</span>`;
function pillarOf(c, name) {
  if (!name || !c) return null; const k = pkey(name);
  return (c.pillars || []).find(p => pkey(p.name) === k) || null;
}
const pillarChip = (c, name) => name ? `<span class="pill" style="--pc:${esc(pillarOf(c, name)?.color || '#94a3b8')}" title="${esc(name)}">${esc(name)}</span>` : '';

function toast(msg, ms = 2600) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}

/* ================= server (API) ================= */
// Panel klienta działa pod /p/<token> (bez logowania), panel agencji pod / (po zalogowaniu).
const PORTAL_TOKEN = (location.pathname.match(/^\/p\/([a-f0-9]{24,64})\/?$/) || [])[1] || null;
let me = null;  // zalogowana osoba z zespołu
let notifs = { unread: 0, items: [], seenAt: 0 };  // powiadomienia od klientów (dzwonek)
let state = { clients: [], posts: [], months: {} };

async function api(method, url, body) {
  const opt = { method, credentials: 'same-origin', headers: {} };
  if (body instanceof FormData) opt.body = body;
  else if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const res = await fetch(url, opt);
  if (res.status === 401 && !PORTAL_TOKEN) { location.href = '/login'; throw new Error('Sesja wygasła – zaloguj się ponownie.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Błąd serwera (${res.status})`);
  return data;
}
function applyServerState(s) {
  const months = {};
  (s.months || []).forEach(m => { months[mkey(m.clientId, m.month)] = { weeks: m.weeks || {}, notes: m.notes || '' }; });
  state = { clients: s.clients || [], posts: (s.posts || []).map(p => ({ comments: [], media: [], ...p })), months };
}

// --- zapis: co chwilę wysyłamy na serwer tylko to, co zmieniło się od ostatniego zapisu ---
let snap = new Map();
const postKey = p => { const { comments, rev, ...rest } = p; return JSON.stringify(rest); };
function keysNow() {
  const m = new Map();
  state.clients.forEach(c => m.set('c:' + c.id, JSON.stringify(c)));
  state.posts.forEach(p => m.set('p:' + p.id, postKey(p)));
  Object.entries(state.months).forEach(([k, v]) => m.set('m:' + k, JSON.stringify(v)));
  return m;
}
const snapshotAll = () => { snap = keysNow(); };
function pendingChanges() {
  const cur = keysNow();
  if (cur.size !== snap.size) return true;
  for (const [k, v] of cur) if (snap.get(k) !== v) return true;
  return false;
}
let saveTimer, syncing = null, syncAgain = false;
function save(now) {
  if (PORTAL_TOKEN) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, now ? 0 : 500);
}
function setSyncStatus(kind, msg) {
  const el = $('#sync'); if (!el) return;
  el.dataset.kind = kind;
  el.textContent = kind === 'saving' ? 'Zapisywanie…' : kind === 'error' ? '⚠ Nie zapisano – ponawiam' : '✓ Zapisano';
  el.title = msg || '';
}
async function flush() {
  if (syncing) { syncAgain = true; return syncing; }
  const cur = keysNow();
  const body = { clients: [], posts: [], months: [], deleteClients: [], deletePosts: [], deleteMonths: [] };
  const split = k => [k.slice(0, 1), k.slice(2)];
  for (const [k, v] of cur) {
    if (snap.get(k) === v) continue;
    const [t, id] = split(k);
    if (t === 'c') body.clients.push(JSON.parse(v));
    else if (t === 'p') body.posts.push({ ...JSON.parse(v), rev: state.posts.find(x => x.id === id)?.rev || 0 });
    else { const [clientId, month] = id.split('|'); body.months.push({ ...JSON.parse(v), clientId, month }); }
  }
  for (const k of snap.keys()) {
    if (cur.has(k)) continue;
    const [t, id] = split(k);
    if (t === 'c') body.deleteClients.push(id);
    else if (t === 'p') body.deletePosts.push(id);
    else { const [clientId, month] = id.split('|'); body.deleteMonths.push({ clientId, month }); }
  }
  if (!Object.values(body).some(a => a.length)) return;
  setSyncStatus('saving');
  syncing = (async () => {
    try {
      const res = await api('POST', '/api/sync', body);
      for (const [k, v] of cur) if (snap.get(k) !== v) snap.set(k, v);
      for (const k of [...snap.keys()]) if (!cur.has(k)) snap.delete(k);
      Object.entries(res.revs).forEach(([id, rev]) => { const p = state.posts.find(x => x.id === id); if (p) p.rev = rev; });
      if (res.conflicts.length) {
        res.conflicts.forEach(sp => {
          const np = { comments: [], media: [], ...sp };
          const i = state.posts.findIndex(x => x.id === sp.id);
          if (i >= 0) state.posts[i] = np; else state.posts.push(np);
          snap.set('p:' + sp.id, postKey(np));
        });
        toast('Część treści zmieniono w międzyczasie (np. klient je zaakceptował). Wczytano aktualne wersje – sprawdź i popraw jeszcze raz.', 6000);
        if (!drawer) render();
      }
      setSyncStatus('ok');
    } catch (e) {
      setSyncStatus('error', e.message);
      toast('Nie udało się zapisać: ' + e.message, 5000);
      setTimeout(() => save(), 10000);
    } finally {
      syncing = null;
      if (syncAgain) { syncAgain = false; save(); }
    }
  })();
  return syncing;
}
async function reload(force) {
  // nie podmieniamy ekranu pod kimś, kto właśnie pisze albo ma otwarte okno
  if (!force && (drawer || modalOpen || lb || document.activeElement?.matches('input,textarea,select'))) return;
  if (PORTAL_TOKEN) { applyServerState(await api('GET', `/api/p/${PORTAL_TOKEN}`)); render(); return; }
  await flush();
  if (pendingChanges()) return;
  const s = await api('GET', '/api/state');
  me = s.user; notifs = s.notifications || notifs; applyServerState(s); snapshotAll(); render();
}
window.addEventListener('beforeunload', e => { if (!PORTAL_TOKEN && pendingChanges()) { flush(); e.preventDefault(); e.returnValue = ''; } });

/* ================= model helpers ================= */
const clientById = id => state.clients.find(c => c.id === id);
const postsOf = cid => state.posts.filter(p => p.clientId === cid);
const postMonth = p => p.date ? p.date.slice(0, 7) : p.month;
const postWeek = p => p.date ? mondayOf(p.date) : (p.week || '');
const sortKey = p => (p.date || (p.week ? p.week + '~' : '9999')) + (p.time || '') + String(p.order ?? 0).padStart(4, '0');
const sortPosts = arr => arr.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
const needsAttention = cid => postsOf(cid).filter(p => p.unread || p.approval === 'changes').length;
const caption = (p, ch) => [ch === 'li' ? p.copyLi : p.copyMeta, p.cta, p.hashtags].filter(s => s && s.trim()).join('\n\n');
const shareUrl = c => `${location.origin}/p/${c.token}`;
const mkey = (cid, mk) => cid + '|' + mk;
const monthData = (cid, mk) => state.months[mkey(cid, mk)] || { weeks: {}, notes: '' };
const monthDataW = (cid, mk) => (state.months[mkey(cid, mk)] ||= { weeks: {}, notes: '' });
const lastComment = p => p.comments.filter(c => c.role !== 'sys').slice(-1)[0];
function newPost(o = {}) {
  const cid = o.clientId || state.clients[0]?.id;
  const date = o.date === undefined ? TODAY : o.date;
  return { id: uid(), clientId: cid, date, month: (date || TODAY).slice(0, 7), week: '', time: '', meta: true, li: false, format: 'Post', pillar: '', title: '',
    brief: '', copyMeta: '', copyLi: '', onGraphic: '', cta: '', hashtags: '', mentions: '', materialBrief: '', media: [], toConfirm: '',
    approval: 'pending', published: false, publishedAt: '', note: '', comments: [], unread: false, ...o };
}
function newClient(o = {}) {
  return { id: uid(), token: newToken(), name: 'Nowy klient', color: '#4f46e5', avatar: '', igHandle: '', fbName: '', liName: '', liFollowers: '',
    freq: '', tone: '', audience: '', pillars: [], hashtags: '', drive: '', contact: '', notes: '', ...o };
}

/* ================= ui state ================= */
const ui = { month: TODAY.slice(0, 7), ch: 'all', st: 'all', q: '', full: false, portalFilter: 'all', portalView: 'list' };
let drawer = null;
let modalOpen = false;
let imp = null;  // excel import state

/* ================= router ================= */
function route() {
  if (PORTAL_TOKEN) return { name: 'portal', token: PORTAL_TOKEN };
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'k' && h[1]) return { name: 'client', id: h[1], tab: h[2] || 'plan' };
  return { name: 'dash' };
}
window.addEventListener('hashchange', () => { closeDrawer(true); render(); window.scrollTo(0, 0); });

function render() {
  const r = route();
  document.title = 'Planer treści';
  if (r.name === 'portal') { $('#app').innerHTML = viewPortal(r.token); return; }
  let body;
  if (r.name === 'client') {
    const c = clientById(r.id);
    body = c ? viewClient(c, r.tab) : `<div class="container"><div class="empty"><b>Nie znaleziono klienta</b><a href="#/">Wróć do pulpitu</a></div></div>`;
  } else body = viewDash();
  $('#app').innerHTML = `<div class="shell">${viewSide(r)}<main class="main">${body}</main></div>`;
}

/* ================= sidebar ================= */
function viewSide(r) {
  const clients = state.clients.map(c => {
    const n = needsAttention(c.id);
    return `<a href="#/k/${c.id}/${r.name === 'client' ? r.tab : 'plan'}" class="${r.id === c.id ? 'active' : ''}">
      ${avatar(c, 22)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span>${n ? `<span class="cnt" title="Uwagi klienta / do poprawy">${n}</span>` : ''}</a>`;
  }).join('');
  return `<aside class="side">
    <div class="brand"><a href="#/" aria-label="Pulpit"><img src="/static/logo-wizme-white.png" alt="WIZme"><span class="app">Planer treści</span></a><span class="grow"></span>
      <button class="bell" data-act="notif" title="Powiadomienia od klientów">${ICON.bell}${notifs.unread ? `<span class="dot">${notifs.unread > 99 ? '99+' : notifs.unread}</span>` : ''}</button></div>
    <nav class="nav"><a href="#/" class="${r.name === 'dash' ? 'active' : ''}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>Pulpit</a></nav>
    <div class="nav-label">Klienci</div>
    <div class="scroll"><nav class="nav">${clients || '<div class="small" style="padding:6px 12px;color:rgba(255,255,255,.5)">Brak klientów</div>'}</nav></div>
    <div class="foot">
      <button class="hi" data-act="import-xlsx">⤒ Importuj plan z Excela</button>
      <button data-act="new-client">＋ Dodaj klienta</button>
      ${me?.role === 'admin' ? '<button data-act="team">👥 Zespół</button>' : ''}
      <div class="me"><span class="av" style="width:34px;height:34px;font-size:14px;background:#5b3fb0">${esc(initials(me?.name))}</span>
        <span class="who" title="${esc(me?.email)}"><b>${esc(me?.name || '')}</b><span>${me?.role === 'admin' ? 'Administrator' : 'Zespół'}</span></span>
        <button data-act="password" title="Zmień hasło">🔑</button><a href="/logout" title="Wyloguj się">⎋</a></div>
      <div id="sync" class="sync" data-kind="ok">✓ Zapisano</div>
    </div>
  </aside>`;
}

/* ================= dashboard ================= */
function viewDash() {
  if (!state.clients.length) return `<div class="container"><div class="card" style="max-width:560px;margin:8vh auto 0"><div class="empty">
    <b>Witaj w Planerze treści 👋</b>Zacznij od dodania pierwszego klienta albo zaimportuj jego plan z Excela – klient i filary utworzą się same.
    <div class="row" style="justify-content:center;margin-top:16px"><button class="btn primary" data-act="import-xlsx">⤒ Importuj plan z Excela</button><button class="btn" data-act="new-client">＋ Dodaj klienta</button></div></div></div></div>`;
  const mk = TODAY.slice(0, 7);
  const monthPosts = state.posts.filter(p => postMonth(p) === mk);
  const week = ymd(addDays(new Date(), 7));
  const upcoming = sortPosts(state.posts.filter(p => p.date && p.date >= TODAY && p.date <= week && !p.published));
  const late = state.posts.filter(p => p.date && p.date < TODAY && !p.published && p.approval !== 'draft');
  const feedback = state.posts.filter(p => p.unread || p.approval === 'changes')
    .sort((a, b) => (lastComment(b)?.at || 0) - (lastComment(a)?.at || 0));
  const stat = (v, l, col) => `<div class="card stat"><div class="v" style="color:${col || 'inherit'}">${v}</div><div class="l">${l}</div></div>`;

  const cards = state.clients.map(c => {
    const ps = postsOf(c.id).filter(p => postMonth(p) === mk);
    const k = { draft: 0, pending: 0, accepted: 0, changes: 0 }; ps.forEach(p => k[p.approval]++);
    const pub = ps.filter(p => p.published).length; const tot = ps.length || 1;
    return `<div class="card ccard" data-go="#/k/${c.id}/plan">
      <div class="row">${avatar(c, 36)}<div class="grow"><div style="font-weight:650">${esc(c.name)}</div><div class="small muted">${ps.length} treści w tym miesiącu</div></div>
      ${needsAttention(c.id) ? `<span class="badge s-bad">${needsAttention(c.id)} uwag</span>` : ''}</div>
      <div class="bar"><i style="width:${k.accepted / tot * 100}%;background:#10b981"></i><i style="width:${k.pending / tot * 100}%;background:#f59e0b"></i><i style="width:${k.changes / tot * 100}%;background:#ef4444"></i><i style="width:${k.draft / tot * 100}%;background:#d1d5db"></i></div>
      <div class="mini"><span><b>${k.accepted}</b> zaakc.</span><span><b>${k.pending}</b> do akc.</span><span><b>${k.changes}</b> do popr.</span><span><b>${pub}</b> opubl.</span></div>
    </div>`;
  }).join('');

  const item = p => { const c = clientById(p.clientId); return `<div class="it" data-act="open-post" data-id="${p.id}">
    ${avatar(c, 26)}<div class="grow" style="min-width:0"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.title || 'Bez tytułu')}</div>
    <div class="small muted">${esc(c?.name)} · ${fmtShort(p.date)} ${esc(p.time)}</div></div>
    <span class="ch">${chIcons(p)}</span>${badge(p.approval)}</div>`; };
  const fItem = p => { const c = clientById(p.clientId); const lc = lastComment(p); return `<div class="it" data-act="open-post" data-id="${p.id}">
    ${p.unread ? '<span class="newdot"></span>' : ''}${avatar(c, 26)}<div class="grow" style="min-width:0"><div style="font-weight:600">${esc(p.title || 'Bez tytułu')} <span class="small muted">· ${esc(c?.name)}</span></div>
    <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lc ? `„${esc(lc.text)}” – ${esc(lc.author)}` : 'Oznaczono do poprawy'}</div></div>${badge(p.approval)}</div>`; };

  return `<div class="container">
    <div class="topbar"><div><h1>Dzień dobry 👋</h1><div class="muted">${fmtDay(TODAY)} · przegląd wszystkich klientów</div></div>
      <div class="grow"></div><button class="btn" data-act="import-xlsx">⤒ Importuj z Excela</button><button class="btn primary" data-act="new-post">＋ Nowa treść</button></div>
    <div class="stats">
      ${stat(monthPosts.length, 'treści w tym miesiącu')}
      ${stat(monthPosts.filter(p => p.approval === 'pending').length, 'czeka na akceptację klienta', 'var(--pending)')}
      ${stat(feedback.length, 'uwagi / do poprawy', 'var(--bad)')}
      ${stat(late.length, 'po terminie, nieopublikowane', late.length ? '#9a3412' : '')}
    </div>
    <div class="grid g2" style="margin-bottom:20px">
      <div class="card"><div class="card-h"><h3>Do publikacji w najbliższych 7 dniach</h3><span class="grow"></span><span class="small muted">${upcoming.length}</span></div>
        <div class="list">${upcoming.map(item).join('') || '<div class="empty small">Nic zaplanowanego na najbliższy tydzień</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Uwagi od klientów</h3><span class="grow"></span><span class="small muted">${feedback.length}</span></div>
        <div class="list">${feedback.map(fItem).join('') || '<div class="empty small">Brak nowych uwag 🎉</div>'}</div></div>
    </div>
    <h3 style="margin-bottom:12px">Klienci – ${monthLabel(mk).toLowerCase()}</h3>
    <div class="grid g3">${cards}<div class="card ccard" data-act="new-client" style="display:grid;place-items:center;color:var(--muted);min-height:120px;border-style:dashed">＋ Dodaj klienta</div></div>
  </div>`;
}

/* ================= client views ================= */
function viewClient(c, tab) {
  const tabs = [['plan', 'Plan (tabela)'], ['kalendarz', 'Kalendarz'], ['profil', 'Profil, filary i ustawienia']];
  let content;
  if (tab === 'kalendarz') content = viewCalendar(c);
  else if (tab === 'profil') content = viewProfile(c);
  else content = viewTable(c);
  return `<div class="container ${tab === 'plan' && ui.full ? 'wide' : ''}">
    <div class="topbar">${avatar(c, 44)}<div><h1>${esc(c.name)}</h1>
      <div class="muted small row" style="gap:12px"><span class="ch">${ICON.ig}${ICON.fb} ${esc(c.igHandle ? '@' + c.igHandle : '—')}</span><span class="ch">${ICON.li} ${esc(c.liName || '—')}</span></div></div>
      <div class="grow"></div>
      <button class="btn" data-act="share" data-id="${c.id}">🔗 Link dla klienta</button>
      <button class="btn primary" data-act="new-post" data-client="${c.id}">＋ Nowa treść</button></div>
    <div class="tabs">${tabs.map(([k, l]) => `<a href="#/k/${c.id}/${k}" class="${tab === k ? 'active' : ''}">${l}</a>`).join('')}</div>
    ${content}
  </div>`;
}

const matchStatus = p => ui.st === 'all' || (ui.st === 'unpub' ? !p.published : ui.st === 'pub' ? p.published : p.approval === ui.st);
const matchCh = p => ui.ch === 'all' || p[ui.ch];
function filterPosts(c) {
  const q = ui.q.trim().toLowerCase();
  return postsOf(c.id).filter(p =>
    (ui.month === 'all' || postMonth(p) === ui.month) && matchCh(p) && matchStatus(p) &&
    (!q || [p.title, p.brief, p.copyMeta, p.copyLi, p.hashtags, p.pillar, p.cta, p.onGraphic].join(' ').toLowerCase().includes(q)));
}

function toolbar(withAll) {
  return `<div class="toolbar">
    <div class="monthnav">
      <button class="btn icon" data-act="month" data-d="-1" ${ui.month === 'all' ? 'disabled' : ''}>‹</button>
      <div class="label">${ui.month === 'all' ? 'Wszystkie miesiące' : monthLabel(ui.month)}</div>
      <button class="btn icon" data-act="month" data-d="1" ${ui.month === 'all' ? 'disabled' : ''}>›</button>
      <button class="btn sm ghost" data-act="month" data-d="0">Dziś</button>
      ${withAll ? `<button class="btn sm ${ui.month === 'all' ? '' : 'ghost'}" data-act="month-all">Wszystkie</button>` : ''}
    </div>
    <div class="grow"></div>
    <div class="seg">
      <button class="${ui.ch === 'all' ? 'on' : ''}" data-act="ch" data-v="all">Wszystkie</button>
      <button class="${ui.ch === 'meta' ? 'on' : ''}" data-act="ch" data-v="meta"><span class="ch">${ICON.ig}${ICON.fb}</span>FB + IG</button>
      <button class="${ui.ch === 'li' ? 'on' : ''}" data-act="ch" data-v="li"><span class="ch">${ICON.li}</span>LinkedIn</button>
    </div>
    <select class="select" style="width:auto" data-bind="st">
      <option value="all">Każdy status</option>
      ${Object.entries(APPROVAL).map(([k, v]) => `<option value="${k}" ${ui.st === k ? 'selected' : ''}>${v.label}</option>`).join('')}
      <option value="unpub" ${ui.st === 'unpub' ? 'selected' : ''}>Nieopublikowane</option>
      <option value="pub" ${ui.st === 'pub' ? 'selected' : ''}>Opublikowane</option>
    </select>
    ${withAll ? `<input class="input" style="width:180px" placeholder="Szukaj…" data-bind="q" value="${esc(ui.q)}">
      <div class="seg"><button class="${!ui.full ? 'on' : ''}" data-act="full" data-v="0" title="Zwięzła tabela">Zwięzły</button><button class="${ui.full ? 'on' : ''}" data-act="full" data-v="1" title="Wszystkie kolumny jak w Excelu">Jak w Excelu</button></div>` : ''}
  </div>`;
}

function pillarsBar(c, posts) {
  if (!c.pillars?.length) return '';
  const cnt = {}; posts.forEach(p => { const k = pillarOf(c, p.pillar)?.name || '—'; cnt[k] = (cnt[k] || 0) + 1; });
  return `<div class="pillars-bar"><span class="small muted">Filary:</span>${c.pillars.map(p => `<span class="pill" style="--pc:${esc(p.color)}" title="${esc(p.goal || '')}">${esc(p.name)} <b>${cnt[p.name] || 0}</b></span>`).join('')}
    ${cnt['—'] ? `<span class="pill" style="--pc:#94a3b8">bez filaru <b>${cnt['—']}</b></span>` : ''}</div>`;
}

function mediaCell(p) {
  const m = p.media[0];
  if (!m) return `<span class="thumb">—</span>`;
  const t = mediaThumb(m);
  return t ? `<span class="thumb" style="padding:0"><img src="${esc(t)}" style="width:100%;height:100%;object-fit:cover;border-radius:7px" onerror="this.replaceWith(document.createTextNode('🔗'))">${p.media.length > 1 ? `<span class="n">${p.media.length}</span>` : ''}</span>` : `<span class="thumb">🔗</span>`;
}
function pubCell(p) {
  if (!p.date) return `<span class="small faint">—</span>`;
  return `<button class="pubbtn ${p.published ? 'done' : ''}" data-act="toggle-pub" data-id="${p.id}" title="Kliknij, aby zmienić">${p.published ? '✓ Opublikowano ' + fmtShort(p.publishedAt) : (p.date < TODAY ? '⚠ Oczekuje' : 'Oczekuje')}</button>`;
}
function dateCell(p) {
  if (!p.date) return `<td class="date"><span class="faint" style="font-weight:500">${p.week ? 'w tygodniu' : 'rezerwa'}</span></td>`;
  const d = parseYmd(p.date);
  return `<td class="date">${fmtShort(p.date)}${p.time ? ` <span class="muted" style="font-weight:400">${esc(p.time)}</span>` : ''}<small>${DOW[(d.getDay() + 6) % 7]}</small></td>`;
}
function rowHtml(c, p) {
  const ncm = p.comments.filter(x => x.role !== 'sys').length;
  const status = `${badge(p.approval)}${ncm ? `<div class="small muted" style="margin-top:4px">💬 ${ncm}</div>` : ''}${p.toConfirm ? `<div class="small" style="margin-top:4px;color:#92400e">❓ do potwierdzenia</div>` : ''}`;
  const ttl = `<div class="ttl">${p.unread ? '<span class="newdot" title="Nowa uwaga klienta"></span> ' : ''}${esc(p.title || 'Bez tematu')}</div>`;
  const tx = (s, w) => `<td><div class="tx ${w ? 'w3' : ''}">${esc(s) || '<span class="faint">—</span>'}</div></td>`;
  if (ui.full) return `<tr class="r ${p.approval === 'draft' ? 'draft' : ''}" data-act="open-post" data-id="${p.id}">
    ${dateCell(p)}<td><span class="ch">${chIcons(p)}</span><div class="small muted" style="margin-top:3px">${esc(p.format)}</div></td><td>${pillarChip(c, p.pillar)}</td>
    <td style="min-width:200px">${ttl}</td>${tx(p.brief)}${tx(p.copyMeta, 1)}${tx(p.copyLi, 1)}${tx(p.onGraphic)}${tx(p.cta)}${tx(p.hashtags)}${tx(p.mentions)}${tx(p.materialBrief)}
    <td>${mediaCell(p)}</td>${tx(p.toConfirm)}<td>${status}</td><td>${pubCell(p)}</td></tr>`;
  return `<tr class="r ${p.approval === 'draft' ? 'draft' : ''}" data-act="open-post" data-id="${p.id}">
    ${dateCell(p)}
    <td><span class="ch">${chIcons(p)}</span><div class="small muted" style="margin-top:3px">${esc(p.format)}</div></td>
    <td>${mediaCell(p)}</td>
    <td style="min-width:260px">${ttl}<div class="copy">${esc(p.copyMeta || p.copyLi || p.brief) || '<span class="faint">Brak treści</span>'}</div></td>
    <td style="max-width:170px">${pillarChip(c, p.pillar)}</td>
    <td>${status}</td><td>${pubCell(p)}</td></tr>`;
}
const HEAD_COMPACT = ['Data', 'Kanał / format', 'Materiał', 'Temat i opis', 'Filar', 'Akceptacja', 'Publikacja'];
const HEAD_FULL = ['Data', 'Kanał / format', 'Filar', 'Temat', 'Założenie', 'Opis FB + IG', 'Opis LinkedIn', 'Tekst na grafice', 'CTA', 'Hashtagi', 'Oznaczenia', 'Materiał – opis', 'Materiał', 'Do potwierdzenia', 'Akceptacja', 'Publikacja'];

function monthBlock(c, mk, posts, showHeader) {
  const cols = (ui.full ? HEAD_FULL : HEAD_COMPACT).length;
  const md = monthData(c.id, mk);
  let h = showHeader ? `<tr class="mh"><td colspan="${cols}">${monthLabel(mk)}</td></tr>` : '';
  const weeks = weeksOfMonth(mk);
  const filtersOn = ui.ch !== 'all' || ui.st !== 'all' || ui.q;
  weeks.forEach((w, i) => {
    const wp = sortPosts(posts.filter(p => postWeek(p) === w));
    if (filtersOn && !wp.length) return;
    h += `<tr class="wk"><td colspan="${cols}"><div class="row">
      <b style="white-space:nowrap">Tydzień ${i + 1}</b><span class="small muted" style="white-space:nowrap">${weekRange(w)}</span>
      <input class="wk-in" data-week="${w}" data-mk="${mk}" value="${esc(md.weeks[w] || '')}" placeholder="Temat tygodnia…">
      <span class="grow"></span><span class="small muted" style="white-space:nowrap">${wp.length} ${wp.length === 1 ? 'treść' : 'treści'}</span>
      <button class="btn sm ghost" data-act="new-post" data-client="${c.id}" data-week="${w}" data-mk="${mk}" title="Dodaj treść w tym tygodniu">＋</button></div></td></tr>`;
    h += wp.map(p => rowHtml(c, p)).join('');
  });
  const res = sortPosts(posts.filter(p => !postWeek(p)));
  if (res.length || !filtersOn) {
    h += `<tr class="wk res"><td colspan="${cols}"><div class="row"><b>Rezerwa</b><span class="small muted">posty zapasowe i pomysły bez terminu</span><span class="grow"></span>
      <span class="small muted">${res.length}</span><button class="btn sm ghost" data-act="new-post" data-client="${c.id}" data-reserve="1" data-mk="${mk}" title="Dodaj do rezerwy">＋</button></div></td></tr>`;
    h += res.map(p => rowHtml(c, p)).join('');
  }
  return h;
}

function viewTable(c) {
  const ps = filterPosts(c);
  const months = ui.month === 'all' ? [...new Set(postsOf(c.id).map(postMonth))].sort() : [ui.month];
  const head = ui.full ? HEAD_FULL : HEAD_COMPACT;
  const body = months.map(mk => monthBlock(c, mk, ps.filter(p => postMonth(p) === mk), ui.month === 'all')).join('');
  const md = monthData(c.id, ui.month);
  return `${toolbar(true)}${pillarsBar(c, ps)}
    <div class="card tbl-wrap" style="${ui.full ? 'max-height:calc(100vh - 260px)' : ''}">
      <table class="plan ${ui.full ? 'full' : ''}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${body || `<tr><td colspan="${head.length}"><div class="empty"><b>Brak treści</b>Dodaj treść albo zaimportuj plan z Excela.</div></td></tr>`}</tbody></table>
    </div>
    <div class="row wrap" style="margin-top:12px"><span class="small muted">${ps.length} pozycji · kliknij wiersz, aby edytować · kliknij status publikacji, aby go przełączyć</span><span class="grow"></span>
      <button class="btn sm" data-act="import-xlsx" data-client="${c.id}">⤒ Import z Excela</button>
      <button class="btn sm" data-act="xlsx" data-id="${c.id}">⤓ Eksport do Excela</button></div>
    ${ui.month !== 'all' ? `<div class="card notes-card" style="margin-top:16px"><div class="card-h"><h3>Uwagi operacyjne i do potwierdzenia</h3><span class="small muted">· ${monthLabel(ui.month).toLowerCase()} · widoczne dla klienta</span></div>
      <div class="card-b"><textarea class="input" data-notes="${ui.month}" placeholder="Zasady publikacji, rzeczy do potwierdzenia z klientem przed publikacją…">${esc(md.notes)}</textarea></div></div>` : ''}`;
}

function chip(p, editable) {
  const c = clientById(p.clientId);
  const pc = pillarOf(c, p.pillar)?.color;
  return `<div class="chip ${p.approval} ${p.published ? 'pub' : ''}" ${editable ? 'draggable="true"' : ''} data-act="${editable ? 'open-post' : 'portal-jump'}" data-id="${p.id}" title="${esc(p.title)}${p.pillar ? ' · ' + esc(p.pillar) : ''}">
    ${p.meta ? ICON.ig : ''}${p.li ? ICON.li : ''}${pc ? `<span class="pd" style="background:${esc(pc)}"></span>` : ''}${p.time ? `<span class="tm">${esc(p.time)}</span>` : ''}<span class="t">${esc(p.title || p.format)}</span>${p.unread && editable ? '<span class="newdot"></span>' : ''}</div>`;
}
function calendarGrid(c, posts, mk, editable) {
  const [y, m] = mk.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const last = new Date(y, m, 0);
  const days = Math.ceil(((first.getDay() + 6) % 7 + last.getDate()) / 7) * 7;
  const by = {}; posts.filter(p => p.date).forEach(p => (by[p.date] ||= []).push(p));
  const md = monthData(c.id, mk);
  let h = DOW.map(d => `<div class="dh">${d}</div>`).join('');
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i), k = ymd(d);
    if (i % 7 === 0) {
      const theme = md.weeks[k]; const undated = posts.filter(p => !p.date && p.week === k);
      if (theme || undated.length) h += `<div class="wkbar"><b>Tydzień ${i / 7 + 1}</b>${theme ? ' · ' + esc(theme) : ''}${undated.length ? ` · <span class="muted">${undated.length} bez dnia: ${undated.map(p => esc(p.title || p.format)).join(', ')}</span>` : ''}</div>`;
    }
    const chips = sortPosts(by[k] || []).map(p => chip(p, editable)).join('');
    h += `<div class="d ${k.slice(0, 7) !== mk ? 'out' : ''} ${k === TODAY ? 'today' : ''}" data-date="${k}">
      <div class="num">${d.getDate()}</div>${editable ? `<button class="add" data-act="new-post" data-date="${k}" data-client="${c.id}" title="Dodaj treść">+</button>` : ''}${chips}</div>`;
  }
  const undated = sortPosts(posts.filter(p => !p.date));
  return `<div class="cal">${h}</div>
    ${undated.length ? `<div class="card" style="margin-top:12px"><div class="card-b" style="padding:12px 14px"><div class="small" style="font-weight:600">Bez konkretnego dnia (tygodnie i rezerwa) – ${undated.length}${editable ? ' <span class="muted" style="font-weight:400">· przeciągnij na dzień, aby zaplanować</span>' : ''}</div>
      <div class="undated">${undated.map(p => chip(p, editable)).join('')}</div></div></div>` : ''}
    <div class="legend"><span><i style="background:#d1d5db"></i>Szkic</span><span><i style="background:#f59e0b"></i>Do akceptacji</span><span><i style="background:#10b981"></i>Zaakceptowany</span><span><i style="background:#ef4444"></i>Do poprawy</span><span style="text-decoration:line-through">Opublikowany</span>
    ${editable ? '<span class="grow"></span><span>Przeciągnij treść na inny dzień, aby zmienić datę</span>' : ''}</div>`;
}

function viewCalendar(c) {
  if (ui.month === 'all') ui.month = TODAY.slice(0, 7);
  const ps = postsOf(c.id).filter(p => postMonth(p) === ui.month && matchCh(p) && matchStatus(p));
  return toolbar(false) + pillarsBar(c, ps) + calendarGrid(c, ps, ui.month, true);
}

function viewProfile(c) {
  const f = (k, label, ph = '', type = 'input') => `<div class="field"><label>${label}</label>${type === 'textarea'
    ? `<textarea class="input" data-cfield="${k}" placeholder="${esc(ph)}" rows="3">${esc(c[k])}</textarea>`
    : `<input class="input" data-cfield="${k}" placeholder="${esc(ph)}" value="${esc(c[k])}">`}</div>`;
  const pf = (i, k, label, ph = '', ta) => `<div class="field" style="margin-bottom:8px"><label>${label}</label>${ta
    ? `<textarea class="input" data-pfield="${i}.${k}" rows="2" style="min-height:52px" placeholder="${esc(ph)}">${esc(c.pillars[i][k])}</textarea>`
    : `<input class="input" data-pfield="${i}.${k}" placeholder="${esc(ph)}" value="${esc(c.pillars[i][k])}">`}</div>`;
  const pillars = (c.pillars || []).map((p, i) => `<div class="pl-card" style="--pc:${esc(p.color)}">
    <div class="row" style="margin-bottom:8px"><input type="color" data-pfield="${i}.color" value="${esc(p.color)}" style="width:30px;height:26px;border:0;padding:0;background:none">
      <input class="input" data-pfield="${i}.name" value="${esc(p.name)}" style="font-weight:600"><span class="small muted" style="white-space:nowrap">${postsOf(c.id).filter(x => pillarOf(c, x.pillar) === p).length} treści</span>
      <button class="btn sm ghost" data-act="pl-del" data-i="${i}" title="Usuń filar">✕</button></div>
    <div class="two">${pf(i, 'goal', 'Cel filaru')}${pf(i, 'audience', 'Grupa docelowa')}</div>
    ${pf(i, 'desc', 'Opis', '', 1)}
    <div class="two">${pf(i, 'what', 'Co publikujemy', '', 1)}${pf(i, 'examples', 'Przykłady tematów', '', 1)}</div></div>`).join('');
  return `<div class="settings">
    <div class="card"><div class="card-h"><h3>Klient</h3></div><div class="card-b">
      <div class="row" style="gap:14px;margin-bottom:14px">${avatar(c, 64)}
        <div class="row wrap"><button class="btn sm" data-act="client-avatar">Wgraj logo / avatar</button>${c.avatar ? '<button class="btn sm ghost" data-act="client-avatar-rm">Usuń</button>' : ''}
        <label class="row small muted" style="gap:6px">Kolor <input type="color" data-cfield="color" value="${esc(c.color)}" style="width:34px;height:26px;border:0;padding:0;background:none"></label></div></div>
      ${f('name', 'Nazwa klienta')}
      ${f('contact', 'Osoba kontaktowa / akceptująca', 'np. Anna Nowak – marketing')}
      ${f('drive', 'Folder z materiałami (Dysk Google)', 'https://drive.google.com/…')}
      ${f('notes', 'Notatki wewnętrzne', 'Wytyczne, zakazy, ustalenia…', 'textarea')}
    </div></div>
    <div class="card"><div class="card-h"><h3>Profile w social media</h3></div><div class="card-b">
      <div class="prof-head"><span class="ch">${ICON.ig}${ICON.fb}</span><b>Instagram + Facebook</b><span class="small muted">· wspólny opis</span></div>
      <div class="two">${f('igHandle', 'Nazwa konta Instagram', 'bez @')}${f('fbName', 'Nazwa strony Facebook')}</div>
      <div class="prof-head" style="margin-top:6px"><span class="ch">${ICON.li}</span><b>LinkedIn</b><span class="small muted">· osobny opis</span></div>
      <div class="two">${f('liName', 'Nazwa strony / profilu')}${f('liFollowers', 'Obserwujący (do podglądu)', 'np. 4 812')}</div>
      ${f('freq', 'Zasady i częstotliwość publikacji', 'np. dni robocze, 4 posty tygodniowo FB + IG', 'textarea')}
    </div></div>
    <div class="card" style="grid-column:1/-1"><div class="card-h"><h3>Strategia</h3></div><div class="card-b">
      <div class="two">${f('tone', 'Ton komunikacji', 'np. bez długich myślników i list, emoji z umiarem', 'textarea')}<div>${f('audience', 'Grupa docelowa')}${f('hashtags', 'Stałe hashtagi', '#marka #branża')}</div></div>
    </div></div>
    <div class="card" style="grid-column:1/-1"><div class="card-h"><h3>Filary komunikacji</h3><span class="small muted">· podpowiadane w edytorze, kolor widać w planie i kalendarzu</span><span class="grow"></span><button class="btn sm" data-act="pl-add">＋ Dodaj filar</button></div>
      <div class="card-b">${pillars || '<div class="small muted">Brak filarów. Dodaj je ręcznie albo zaimportuj z arkusza „Opis filarów”.</div>'}
      <div class="row" style="margin-top:10px"><span class="small muted">Zmiany zapisują się automatycznie.</span><span class="grow"></span><button class="btn sm bad" data-act="del-client" data-id="${c.id}">Usuń klienta</button></div></div></div>
  </div>`;
}

/* ================= media helpers ================= */
function driveId(url) { const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/); return m ? m[1] : null; }
function mediaThumb(m) {
  if (m.type === 'image') return m.src;
  if (m.thumb) return m.thumb;
  const id = driveId(m.url); if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
  if (/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(m.url)) return m.url;
  return null;
}
const linkName = url => { if (/drive\.google\.com\/drive\/.*folders/.test(url)) return 'Folder na Dysku Google'; if (driveId(url)) return 'Plik z Dysku Google'; try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'link'; } };
function blobToMedia(blob, name) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const png = blob.type === 'image/png' && blob.size < 700e3;
      // zmniejszona kopia trafia na serwer; w treści zapisujemy tylko jej adres
      c.toBlob(async out => {
        try {
          const fd = new FormData();
          fd.append('file', out, name || 'obraz');
          fd.append('name', name || 'obraz');
          const up = await api('POST', '/api/media', fd);
          res({ id: up.id, type: 'image', src: up.url, name: name || 'obraz', w: c.width, h: c.height });
        } catch (e) { rej(new Error(`${name || 'Plik'}: ${e.message}`)); }
      }, png ? 'image/png' : 'image/jpeg', .88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error(`${name || 'Plik'}: nie udało się odczytać obrazu`)); };
    img.src = url;
  });
}
const fileToMedia = file => file.type.startsWith('image/') ? blobToMedia(file, file.name || 'wklejony obraz.png')
  : Promise.reject(new Error(`${file.name}: obsługiwane są obrazy (PNG, JPG, WEBP). Wideo dodaj jako link.`));
function pickFiles(accept, multiple) {
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple; i.onchange = () => res([...i.files]); i.click(); });
}

/* ================= previews ================= */
function rich(t) {
  return esc(t).replace(/(^|[^&\w])(#[\p{L}\d_]+)/gu, '$1<span class="tag">$2</span>').replace(/(^|\s)(@[\w.]+)/g, '$1<span class="tag">$2</span>');
}
function truncText(t, n, moreLabel) {
  if (!t) return '';
  let cut = n; const lines = t.split('\n'); if (lines.length > 3) cut = Math.min(cut, lines.slice(0, 3).join('\n').length);
  if (t.length <= cut) return rich(t);
  return `<span class="short">${rich(t.slice(0, cut).trimEnd())}</span><span class="more-btn" data-act="expand">… ${moreLabel}</span><span class="full">${rich(t)}</span>`;
}
/* --- media layouts: what each platform really does with several images --- */
const ratioOf = m => m && m.w && m.h ? m.w / m.h : 1;
const clampR = (r, lo, hi) => Math.max(lo, Math.min(hi, r));
const isDoc = f => /karuzel|dokument|pdf/i.test(f || '');
const LINK_FAIL = `this.outerHTML='<div class=ph>🔗 Materiał na Dysku<br><span class=small>podgląd niedostępny – plik musi być udostępniony „każdy z linkiem”</span></div>'`;
function slideHtml(m, i) {
  const t = mediaThumb(m);
  return t ? `<img src="${esc(t)}" alt="" data-act="lb" data-i="${i}" draggable="false" onerror="${LINK_FAIL}">`
    : `<div class="ph">🔗 ${esc(m.name || 'Materiał z linku')}<br><a href="${esc(m.url)}" target="_blank" rel="noopener" class="small">otwórz link</a></div>`;
}
function emptyMedia(p, ratio) {
  return `<div class="p-media" style="aspect-ratio:${ratio || 1}"><div class="sl"><div class="ph">${p.onGraphic ? `<b>Tekst na grafice:</b>\n${esc(p.onGraphic)}` : 'Brak grafiki'}${p.materialBrief ? `\n\n<span class="small">${esc(p.materialBrief)}</span>` : ''}</div></div></div>`;
}
// swipeable slides; kind: '' (Instagram) or 'doc' (LinkedIn document)
function carousel(p, ratio, kind = '') {
  const ms = p.media, n = ms.length;
  const nav = n > 1 ? `<button class="car-btn prev" data-act="car" data-d="-1" hidden aria-label="Poprzedni">‹</button><button class="car-btn next" data-act="car" data-d="1" aria-label="Następny">›</button>` : '';
  return `<div class="car ${kind}" data-pid="${p.id}" data-n="${n}"><div class="car-stage">
    <div class="p-media" style="aspect-ratio:${ratio}">${ms.map((m, i) => `<div class="sl">${slideHtml(m, i)}</div>`).join('')}</div>
    ${nav}${n > 1 ? `<span class="p-count">${kind === 'doc' ? '1 / ' + n : '1/' + n}</span>` : ''}</div>
    ${n > 1 && !kind ? `<div class="p-dots">${ms.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div>`;
}
// Facebook / LinkedIn post with several photos = collage, "+N" on the last tile.
// The big tile goes on top for a landscape/square first photo and on the left for a portrait one.
function collage(p) {
  const ms = p.media, n = ms.length, orient = ratioOf(ms[0]) < .95 ? 'port' : 'land';
  return `<div class="grid-m g${Math.min(n, 5)} ${orient}" data-pid="${p.id}">${ms.slice(0, 5).map((m, i) => `<div class="gi">${slideHtml(m, i)}${i === 4 && n > 5 ? `<span class="more" data-act="lb" data-i="4">+${n - 5}</span>` : ''}</div>`).join('')}</div>`;
}
function previewIG(p, c) {
  const handle = c.igHandle || c.name.toLowerCase().replace(/\s+/g, '.');
  if (isStory(p.format)) {
    const n = p.media.length;
    return `<div class="ig-story car story" data-pid="${p.id}" data-n="${n}">
      <div class="segs">${(n ? p.media : [0]).map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
      <div class="h">${avatar(c, 28)} ${esc(handle)} <span style="font-weight:400;opacity:.8">2 godz.</span></div>
      <div class="car-stage"><div class="p-media">${p.media.map((m, i) => `<div class="sl">${slideHtml(m, i)}</div>`).join('')}</div>
      ${n > 1 ? `<button class="car-btn prev" data-act="car" data-d="-1" hidden>‹</button><button class="car-btn next" data-act="car" data-d="1">›</button>` : ''}</div></div>`;
  }
  // Instagram crops every slide to the first slide's ratio (4:5 … 1.91:1)
  const ratio = isReel(p.format) ? 9 / 16 : clampR(ratioOf(p.media[0]), .8, 1.91);
  return `<div class="phone ig"><div class="p-head">${avatar(c, 32)}<div><div class="nm">${esc(handle)}</div>${isReel(p.format) ? '<div class="sub">Oryginalny dźwięk</div>' : ''}</div><span class="more">···</span></div>
    ${p.media.length ? carousel(p, ratio) : emptyMedia(p, ratio)}
    <div class="p-acts">${ICON.heart}${ICON.comment}${ICON.send}<span class="grow"></span>${ICON.save}</div>
    <div class="p-text" style="padding-bottom:2px"><b>Lubi to 128 osób</b></div>
    <div class="p-text"><b>${esc(handle)}</b> ${truncText(caption(p, 'meta'), 125, 'więcej') || '<span class="faint">Opis posta…</span>'}</div></div>`;
}
function fbMedia(p) {
  const n = p.media.length, vertical = isReel(p.format) || isStory(p.format);
  if (!n) return emptyMedia(p, vertical ? 9 / 16 : 1);
  if (vertical) return carousel(p, 9 / 16);
  // like Meta: an organic Facebook post with several photos is always a collage
  if (n > 1) return collage(p);
  return carousel(p, clampR(ratioOf(p.media[0]), .8, 1.91));
}
function liMedia(p) {
  const n = p.media.length;
  if (!n) return emptyMedia(p, 1.91);
  if (isDoc(p.format)) return `<div class="doc-h"><span>${esc(p.title || 'Dokument')}</span><span>${n} ${n === 1 ? 'strona' : n < 5 ? 'strony' : 'stron'}</span></div>` + carousel(p, clampR(ratioOf(p.media[0]), .56, 1.91), 'doc');
  if (n > 1) return collage(p);
  return carousel(p, clampR(ratioOf(p.media[0]), .56, 1.91));
}
// thumbnails of every slide under the preview – opens the full-size gallery
function slidesStrip(p) {
  if (p.media.length < 2) return '';
  return `<div class="slides" data-pid="${p.id}"><div class="small muted" style="margin-bottom:6px">Wszystkie grafiki (${p.media.length}) – kliknij, aby zobaczyć w pełnym rozmiarze</div>
    <div class="strip">${p.media.map((m, i) => { const t = mediaThumb(m); return t ? `<img src="${esc(t)}" alt="" data-act="lb" data-i="${i}" title="${i + 1}. ${esc(m.name || '')}">` : `<span class="lnk" data-act="lb" data-i="${i}">🔗</span>`; }).join('')}</div></div>`;
}
function previewFB(p, c) {
  const d = p.date ? parseYmd(p.date) : null;
  return `<div class="phone fb"><div class="p-head">${avatar(c, 38)}<div><div class="nm">${esc(c.fbName || c.name)}</div><div class="sub">${d ? `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${p.time ? ' o ' + esc(p.time) : ''}` : 'data do ustalenia'} · 🌐</div></div><span class="more">···</span></div>
    <div class="p-text">${truncText(caption(p, 'meta'), 240, 'Wyświetl więcej') || '<span class="faint">Opis posta…</span>'}</div>
    ${fbMedia(p)}
    <div class="fb-stats"><span>👍❤️ 86</span><span>12 komentarzy · 4 udostępnienia</span></div>
    <div class="fb-acts"><span>👍 Lubię to!</span><span>💬 Komentarz</span><span>↗ Udostępnij</span></div></div>`;
}
function previewLI(p, c) {
  const t = caption(p, 'li');
  const body = p.format === 'Artykuł' && p.title ? `<b>${esc(p.title)}</b>\n\n` + truncText(t, 210, 'więcej') : truncText(t, 210, 'więcej');
  return `<div class="phone li"><div class="p-head">${avatar(c, 44)}<div><div class="nm">${esc(c.liName || c.name)}</div><div class="sub">${esc(c.liFollowers || '1 000')} obserwujących</div><div class="sub">1 godz. · 🌐</div></div><span class="more">···</span></div>
    <div class="p-text">${body || '<span class="faint">Opis LinkedIn…</span>'}</div>
    ${liMedia(p)}
    <div class="fb-stats" style="border:0"><span>👍💡❤️ 54</span><span>7 komentarzy · 3 udostępnienia</span></div>
    <div class="li-acts"><span>👍 Poleć</span><span>💬 Komentarz</span><span>🔁 Udostępnij</span><span>➤ Wyślij</span></div></div>`;
}
function previewWarnings(p) {
  const w = [];
  if (p.meta) {
    const t = caption(p, 'meta'), tags = (t.match(/#[\p{L}\d_]+/gu) || []).length;
    if (!p.copyMeta.trim() && p.approval !== 'draft') w.push('Brak opisu FB + IG.');
    if (t.length > 2200) w.push(`Instagram: tekst ma ${t.length} znaków (limit 2200).`);
    if (tags > 30) w.push(`Instagram: ${tags} hashtagów (limit 30).`);
    if (p.media.length > 20) w.push('Instagram: karuzela może mieć maks. 20 slajdów.');
    const imgs = p.media.filter(m => m.type === 'image' && m.w);
    if (imgs.length && !isReel(p.format) && !isStory(p.format)) {
      const r0 = ratioOf(imgs[0]);
      if (r0 < .79 || r0 > 1.92) w.push(`Instagram przytnie grafikę do ${r0 < 1 ? '4:5' : '1,91:1'} (obecnie ${imgs[0].w}×${imgs[0].h}).`);
      const odd = imgs.filter((m, i) => i && Math.abs(ratioOf(m) - r0) > .03).length;
      if (odd) w.push(`Karuzela: ${odd} ${odd === 1 ? 'slajd ma' : 'slajdy mają'} inne proporcje niż pierwszy – Instagram przytnie je do proporcji pierwszego slajdu.`);
    }
  }
  if (p.li) {
    const t = caption(p, 'li');
    if (!p.copyLi.trim() && p.approval !== 'draft') w.push('Brak opisu LinkedIn.');
    if (t.length > 3000) w.push(`LinkedIn: tekst ma ${t.length} znaków (limit 3000).`);
  }
  return w.length ? `<div class="warnbox">⚠ ${w.join('<br>⚠ ')}</div>` : '';
}
/* --- carousel navigation & full-size gallery --- */
const slidesOf = m => [...m.children];
function slideIndex(m) {
  const s = slidesOf(m), base = s[0]?.offsetLeft || 0; let best = 0, bd = Infinity;
  s.forEach((x, i) => { const d = Math.abs(x.offsetLeft - base - m.scrollLeft); if (d < bd) { bd = d; best = i; } });
  return best;
}
function goSlide(car, i) {
  const m = car.querySelector('.p-media'), s = slidesOf(m);
  i = Math.max(0, Math.min(s.length - 1, i));
  const left = Math.min(s[i].offsetLeft - s[0].offsetLeft, m.scrollWidth - m.clientWidth);
  syncCar(car, i);
  m.scrollTo({ left, behavior: 'smooth' });
  // smooth scrolling + scroll-snap is unreliable in some browsers – make sure we land on the slide
  setTimeout(() => { if (Math.abs(m.scrollLeft - left) > 2) m.scrollLeft = left; }, 450);
}
function syncCar(car, i) {
  const n = +car.dataset.n;
  const cnt = car.querySelector('.p-count'); if (cnt) cnt.textContent = car.classList.contains('doc') ? `${i + 1} / ${n}` : `${i + 1}/${n}`;
  car.querySelectorAll('.p-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
  car.querySelectorAll('.segs i').forEach((d, k) => d.classList.toggle('on', k <= i));
  const pv = car.querySelector('.car-btn.prev'), nx = car.querySelector('.car-btn.next');
  if (pv) pv.hidden = i === 0; if (nx) nx.hidden = i >= n - 1;
}
document.addEventListener('scroll', e => {
  const m = e.target; if (!m.classList?.contains('p-media')) return;
  const car = m.closest('.car'); if (car) syncCar(car, slideIndex(m));
}, true);
const findPost = id => (drawer && drawer.draft.id === id) ? drawer.draft : state.posts.find(p => p.id === id);
let lb = null;
function openLb(pid, i) { const p = findPost(pid); if (!p?.media.length) return; lb = { p, i: Math.min(i, p.media.length - 1) }; renderLb(); }
function closeLb() { lb = null; $('#lb')?.remove(); }
function renderLb() {
  let el = $('#lb'); if (!el) { el = document.createElement('div'); el.id = 'lb'; document.body.appendChild(el); }
  const { p, i } = lb, n = p.media.length, m = p.media[i], t = mediaThumb(m);
  el.innerHTML = `<div class="lb"><div class="lb-bg" data-act="lb-close"></div>
    ${t ? `<img src="${esc(t)}" alt="">` : `<div class="lb-ph">🔗 ${esc(m.name || 'Materiał z linku')}<br><a href="${esc(m.url)}" target="_blank" rel="noopener" style="color:#a5b4fc">otwórz link</a></div>`}
    ${n > 1 ? `<button class="lb-btn lb-prev" data-act="lb-nav" data-d="-1" ${i === 0 ? 'hidden' : ''}>‹</button><button class="lb-btn lb-next" data-act="lb-nav" data-d="1" ${i === n - 1 ? 'hidden' : ''}>›</button>` : ''}
    <button class="lb-btn lb-x" data-act="lb-close" title="Zamknij (Esc)">✕</button>
    <div class="lb-cap"><b>${i + 1} / ${n}</b>${m.name ? ' · ' + esc(m.name) : ''}${m.w ? ` · ${m.w}×${m.h}` : ''} · pełna grafika bez przycięcia</div></div>`;
}
const pvTabsFor = p => [...(p.meta ? ['ig', 'fb'] : []), ...(p.li ? ['li'] : [])];
const PV_LABEL = { ig: [ICON.ig, 'Instagram'], fb: [ICON.fb, 'Facebook'], li: [ICON.li, 'LinkedIn'] };
function previewFor(p, c, which) {
  if (which === 'li') return previewLI(p, c);
  return which === 'fb' ? previewFB(p, c) : previewIG(p, c);
}

/* ================= post editor (drawer) ================= */
function openDrawer(post, isNew) {
  if (!state.clients.length) { toast('Najpierw dodaj klienta'); return openClientModal(); }
  if (!isNew && post.unread) { post.unread = false; save(); }
  const d = structuredClone(post);
  drawer = { draft: d, isNew, pv: pvTabsFor(d)[0], cap: d.meta ? 'meta' : 'li', dirty: false };
  renderDrawer();
}
function closeDrawer(force) {
  if (!drawer) return;
  if (!force && drawer.dirty && !confirm('Masz niezapisane zmiany. Zamknąć bez zapisywania?')) return;
  drawer = null; $('#layer').innerHTML = ''; render();
}
function renderDrawer() {
  const d = drawer.draft, c = clientById(d.clientId) || state.clients[0];
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label ?? v)}</option>`;
  const mode = d.date ? 'date' : d.week ? 'week' : 'reserve';
  const capField = drawer.cap === 'li' ? 'copyLi' : 'copyMeta';
  const len = caption(d, drawer.cap).length, lim = drawer.cap === 'li' ? 3000 : 2200;
  const pl = pillarOf(c, d.pillar);
  const weeks = weeksOfMonth(d.month);
  $('#layer').innerHTML = `<div class="overlay" data-act="close-drawer"></div>
  <div class="drawer" role="dialog">
    <div class="drawer-h">${avatar(c, 30)}<h2>${drawer.isNew ? 'Nowa treść' : esc(d.title || 'Edycja treści')}</h2><span class="muted small" style="white-space:nowrap">· ${esc(c.name)}</span>
      <span class="grow"></span>${badge(d.approval)}<button class="btn ghost icon" data-act="close-drawer" title="Zamknij (Esc)">✕</button></div>
    <div class="drawer-b">
      <div class="form">
        <div class="sec">Planowanie</div>
        ${drawer.isNew && state.clients.length > 1 ? `<div class="field"><label>Klient</label><select class="select" data-f="clientId">${state.clients.map(x => opt(x.id, d.clientId, x.name)).join('')}</select></div>` : ''}
        <div class="field"><label>Kanały <span class="hint">· FB i IG mają wspólny opis, LinkedIn osobny</span></label><div class="row wrap">
          <span class="toggle ${d.meta ? 'on' : ''}" data-act="toggle-ch" data-v="meta"><span class="box">${d.meta ? '✓' : ''}</span><span class="ch">${ICON.ig}${ICON.fb}</span>Facebook + Instagram</span>
          <span class="toggle ${d.li ? 'on' : ''}" data-act="toggle-ch" data-v="li"><span class="box">${d.li ? '✓' : ''}</span><span class="ch">${ICON.li}</span>LinkedIn</span></div></div>
        <div class="field"><label>Termin</label><div class="seg">
          <button class="${mode === 'date' ? 'on' : ''}" data-act="dmode" data-v="date">Konkretny dzień</button>
          <button class="${mode === 'week' ? 'on' : ''}" data-act="dmode" data-v="week">Tydzień (dzień do ustalenia)</button>
          <button class="${mode === 'reserve' ? 'on' : ''}" data-act="dmode" data-v="reserve">Rezerwa</button></div></div>
        <div class="three">
          ${mode === 'date' ? `<div class="field"><label>Data publikacji</label><input type="date" class="input" data-f="date" value="${esc(d.date)}"></div>
            <div class="field"><label>Godzina <span class="hint">opcjonalnie</span></label><input type="time" class="input" data-f="time" value="${esc(d.time)}"></div>`
          : `<div class="field"><label>Miesiąc</label><input type="month" class="input" data-f="month" value="${esc(d.month)}"></div>
            ${mode === 'week' ? `<div class="field"><label>Tydzień</label><select class="select" data-f="week">${weeks.map((w, i) => opt(w, d.week, `Tydzień ${i + 1} (${weekRange(w)})`)).join('')}</select></div>` : '<div></div>'}`}
          <div class="field"><label>Format</label><input class="input" data-f="format" list="formats" value="${esc(d.format)}"><datalist id="formats">${FORMATS.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
        </div>
        <div class="two">
          <div class="field"><label>Filar</label><select class="select" data-f="pillar"><option value="">— bez filaru —</option>${(c.pillars || []).map(p => opt(p.name, d.pillar)).join('')}${d.pillar && !pl ? opt(d.pillar, d.pillar) : ''}</select></div>
          <div class="field"><label>Temat</label><input class="input" data-f="title" value="${esc(d.title)}" placeholder="np. Optymalizacja kosztów ochrony"></div>
        </div>
        ${pl && (pl.goal || pl.what) ? `<div class="guide" style="margin:-4px 0 12px"><b>${esc(pl.name)}</b>${pl.goal ? ` · cel: ${esc(pl.goal)}` : ''}${pl.what ? `<br>Co publikujemy: ${esc(pl.what)}` : ''}</div>` : ''}
        <div class="field"><label>Założenie / opis pomysłu <span class="hint">· o czym jest post</span></label><textarea class="input" data-f="brief" rows="2" style="min-height:56px">${esc(d.brief)}</textarea></div>

        <div class="sec">Treść</div>
        <div class="captabs">
          ${d.meta ? `<button class="${drawer.cap === 'meta' ? 'on' : ''}" data-act="cap" data-v="meta"><span class="ch">${ICON.ig}${ICON.fb}</span>Opis FB + IG${!d.copyMeta.trim() ? '<span class="dot" title="pusty"></span>' : ''}</button>` : ''}
          ${d.li ? `<button class="${drawer.cap === 'li' ? 'on' : ''}" data-act="cap" data-v="li"><span class="ch">${ICON.li}</span>Opis LinkedIn${!d.copyLi.trim() ? '<span class="dot" title="pusty"></span>' : ''}</button>` : ''}
          <span class="grow"></span>${drawer.cap === 'li' && d.meta ? `<button data-act="copy-meta-li" style="font-weight:500">⧉ Skopiuj z FB + IG</button>` : ''}
        </div>
        <div class="field"><textarea class="input" data-f="${capField}" rows="9" placeholder="Wklej lub napisz opis posta…">${esc(d[capField])}</textarea></div>
        <div class="field"><label>CTA <span class="hint">· dopisywane na końcu opisu</span></label><textarea class="input" data-f="cta" rows="2" style="min-height:44px">${esc(d.cta)}</textarea></div>
        <div class="two">
          <div class="field"><label>Hashtagi ${c.hashtags ? `<button class="btn sm ghost" data-act="add-tags">＋ stałe</button>` : ''}</label><textarea class="input" data-f="hashtags" rows="2" style="min-height:52px" placeholder="#marka #branża">${esc(d.hashtags)}</textarea></div>
          <div class="field"><label>Oznaczenia <span class="hint">· konta do oznaczenia</span></label><textarea class="input" data-f="mentions" rows="2" style="min-height:52px" placeholder="@partner, @osoba">${esc(d.mentions)}</textarea></div>
        </div>
        <div class="counter ${len > lim ? 'warn' : ''}" id="counter">${len} / ${lim} znaków (${drawer.cap === 'li' ? 'LinkedIn' : 'Instagram'})</div>

        <div class="sec">Grafika / materiały</div>
        <div class="two">
          <div class="field"><label>Tekst na grafice</label><textarea class="input" data-f="onGraphic" rows="2" style="min-height:56px" placeholder="Nagłówek, slajdy karuzeli…">${esc(d.onGraphic)}</textarea></div>
          <div class="field"><label>Materiał – opis <span class="hint">· brief dla grafika</span></label><textarea class="input" data-f="materialBrief" rows="2" style="min-height:56px" placeholder="Co ma być na zdjęciu / grafice">${esc(d.materialBrief)}</textarea></div>
        </div>
        <div class="drop" data-act="upload" id="drop">⬆ Przeciągnij pliki PNG/JPG, kliknij, aby wybrać, lub wklej obraz <b>Ctrl+V</b></div>
        <div class="row" style="margin-top:8px"><input class="input" id="linkIn" placeholder="Link do Dysku Google / WeTransfer / Canva…"><button class="btn" data-act="add-link">Dodaj link</button></div>
        <div class="media-list">${d.media.map((m, i) => { const t = mediaThumb(m); return `<div class="mi">
          ${t ? `<img class="im" src="${esc(t)}" alt="" onerror="this.outerHTML='<div class=im>🔗 link</div>'">` : `<div class="im">🔗 ${esc(m.name || 'link')}</div>`}
          <div class="ctl">${i > 0 ? `<button data-act="m-left" data-i="${i}" title="Przesuń w lewo">◀</button>` : ''}<button data-act="m-del" data-i="${i}" title="Usuń">✕</button></div>
          <div class="cap">${i + 1}. ${m.type === 'link' ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name || 'link')}</a>` : esc(m.name || '')}</div></div>`; }).join('')}</div>

        <div class="sec">Akceptacja i publikacja</div>
        <div class="field"><label>Do potwierdzenia z klientem <span class="hint">· klient zobaczy to pytanie przy poście</span></label><textarea class="input" data-f="toConfirm" rows="2" style="min-height:48px" placeholder="np. Czy liontower.pl to adres nowej strony?">${esc(d.toConfirm)}</textarea></div>
        <div class="two">
          <div class="field"><label>Akceptacja klienta</label><select class="select" data-f="approval">${Object.entries(APPROVAL).map(([k, v]) => opt(k, d.approval, v.label + (k === 'draft' ? ' (niewidoczny dla klienta)' : ''))).join('')}</select></div>
          <div class="field"><label>Publikacja</label><div class="row">
            <select class="select" data-f="published"><option value="0" ${!d.published ? 'selected' : ''}>Oczekuje</option><option value="1" ${d.published ? 'selected' : ''}>Opublikowano</option></select>
            ${d.published ? `<input type="date" class="input" data-f="publishedAt" value="${esc(d.publishedAt)}" title="Data publikacji">` : ''}</div></div>
        </div>
        <div class="field"><label>Notatka wewnętrzna <span class="hint">· klient jej nie widzi</span></label><textarea class="input" data-f="note" rows="2" style="min-height:48px">${esc(d.note)}</textarea></div>

        <div class="sec">Komentarze i uwagi klienta</div>
        ${commentsHtml(d.comments)}
        <div class="row" style="margin-top:10px;align-items:flex-start"><textarea class="input" id="cmIn" rows="2" style="min-height:44px" placeholder="Odpowiedz klientowi lub dodaj komentarz…"></textarea><button class="btn" data-act="add-comment">Wyślij</button></div>
        ${c.tone || c.notes || c.freq ? `<div class="sec">Wytyczne klienta</div><div class="guide">${c.freq ? `<b>Zasady:</b> ${esc(c.freq)}<br>` : ''}${c.tone ? `<b>Ton:</b> ${esc(c.tone)}<br>` : ''}${c.notes ? `<b>Notatki:</b> ${esc(c.notes)}` : ''}</div>` : ''}
      </div>
      <div class="pv" id="pv">${pvPane()}</div>
    </div>
    <div class="drawer-f">
      ${drawer.isNew ? '' : `<button class="btn bad" data-act="del-post">Usuń</button><button class="btn" data-act="dup-post">Duplikuj</button>`}
      <span class="grow"></span><button class="btn" data-act="close-drawer">Anuluj</button><button class="btn primary" data-act="save-post">Zapisz</button>
    </div>
  </div>`;
}
function pvPane() {
  const d = drawer.draft, c = clientById(d.clientId);
  const tabs = pvTabsFor(d);
  if (!tabs.includes(drawer.pv)) drawer.pv = tabs[0];
  return `<div class="seg">${tabs.map(t => `<button class="${drawer.pv === t ? 'on' : ''}" data-act="pv" data-v="${t}"><span class="ch">${PV_LABEL[t][0]}</span>${PV_LABEL[t][1]}</button>`).join('')}</div>`
    + previewWarnings(d) + previewFor(d, c, drawer.pv) + slidesStrip(d)
    + (d.mentions ? `<div class="mentions">Oznaczenia: ${esc(d.mentions)}</div>` : '')
    + `<div class="pv-note">Podgląd poglądowy – realny wygląd może się nieznacznie różnić zależnie od urządzenia.</div>`;
}
function refreshPreview() {
  if (!drawer) return;
  $('#pv').innerHTML = pvPane();
  const d = drawer.draft, len = caption(d, drawer.cap).length, lim = drawer.cap === 'li' ? 3000 : 2200;
  const ct = $('#counter'); if (ct) { ct.textContent = `${len} / ${lim} znaków (${drawer.cap === 'li' ? 'LinkedIn' : 'Instagram'})`; ct.classList.toggle('warn', len > lim); }
}
function commentsHtml(list, forClient) {
  if (!list.length) return `<div class="small muted">Brak komentarzy.</div>`;
  return `<div class="comments">${list.map(m => m.role === 'sys'
    ? `<div class="cm sys"><div class="bub">● ${esc(m.text)} – ${esc(m.author)}, ${fmtTs(m.at)}</div></div>`
    : `<div class="cm ${m.role}"><span class="av" style="width:26px;height:26px;font-size:11px;background:${m.role === 'client' ? '#ea580c' : '#4f46e5'}">${esc(initials(m.author))}</span>
      <div class="bub"><div class="who">${esc(m.author)} <span>${m.role === 'client' ? 'klient' : (forClient ? 'agencja' : 'zespół')} · ${fmtTs(m.at)}</span></div>${esc(m.text).replace(/\n/g, '<br>')}</div></div>`).join('')}</div>`;
}
async function addMedia(files) {
  for (const f of files) {
    try { drawer.draft.media.push(await fileToMedia(f)); } catch (e) { toast(e.message); }
  }
  drawer.dirty = true; renderDrawerKeepScroll();
}
function renderDrawerKeepScroll() {
  const s = $('.drawer .form')?.scrollTop || 0;
  renderDrawer();
  const f = $('.drawer .form'); if (f) f.scrollTop = s;
}
function commitDraft() {
  const d = drawer.draft;
  if (d.date) { d.month = d.date.slice(0, 7); d.week = ''; }
  if (d.published && !d.publishedAt) d.publishedAt = TODAY;
  if (!d.published) d.publishedAt = '';
  const i = state.posts.findIndex(p => p.id === d.id);
  if (i >= 0) state.posts[i] = d; else state.posts.push(d);
  save(true);
}

/* ================= client portal ================= */
function viewPortal(token) {
  const c = state.clients.find(x => x.token === token);
  if (!c) return `<div class="portal"><div class="card"><div class="empty"><b>Link jest nieaktywny</b>Poproś agencję o nowy link do podglądu planu.</div></div></div>`;
  document.title = `Plan treści – ${c.name}`;
  const reviewer = getReviewer();
  const inMonth = postsOf(c.id).filter(p => p.approval !== 'draft' && postMonth(p) === ui.month);
  const cnt = k => inMonth.filter(p => p.approval === k).length;
  const list = inMonth.filter(p => ui.portalFilter === 'all' || p.approval === ui.portalFilter);
  const md = monthData(c.id, ui.month);
  const fb = (k, l, n) => `<button class="${ui.portalFilter === k ? 'on' : ''}" data-act="pf" data-v="${k}">${l}${n != null ? ` <span class="faint">${n}</span>` : ''}</button>`;
  const kv = (label, val) => val && val.trim() ? `<div class="kv"><b>${label}</b><div>${esc(val)}</div></div>` : '';
  const card = p => {
    const tabs = pvTabsFor(p);
    return `<div class="card pcard" id="post-${p.id}">
    <div class="l"><div style="display:flex;flex-direction:column;gap:10px;align-items:center;width:100%">
      ${tabs.length > 1 ? `<div class="seg">${tabs.map((t, i) => `<button class="${i ? '' : 'on'}" data-act="ppv" data-id="${p.id}" data-v="${t}"><span class="ch">${PV_LABEL[t][0]}</span>${PV_LABEL[t][1]}</button>`).join('')}</div>` : ''}
      <div data-pv="${p.id}" style="display:flex;justify-content:center;width:100%">${previewFor(p, c, tabs[0])}</div>${slidesStrip(p)}</div></div>
    <div class="r">
      <div class="meta"><span class="when">${p.date ? `${fmtDay(p.date)}${p.time ? ', ' + esc(p.time) : ''}` : p.week ? `Tydzień ${weekNo(p.week, ui.month)} · dzień do ustalenia` : 'Rezerwa'}</span><span class="grow"></span>${badge(p.approval)}${p.published ? `<span class="badge s-pub">Opublikowano ${fmtShort(p.publishedAt)}</span>` : ''}</div>
      <div class="meta small muted"><span class="ch">${chIcons(p)} ${chLabel(p)}</span>· ${esc(p.format)}${p.pillar ? ' · ' + pillarChip(c, p.pillar) : ''}</div>
      ${p.title ? `<div style="font-weight:650;font-size:15px">${esc(p.title)}</div>` : ''}
      ${p.toConfirm ? `<div class="ask"><b>❓ Do potwierdzenia:</b> ${esc(p.toConfirm)}</div>` : ''}
      ${kv('Założenie', p.brief)}${kv('Tekst na grafice', p.onGraphic)}${kv('Oznaczenia', p.mentions)}
      ${p.media.filter(m => m.type === 'link').map(m => `<a class="small" href="${esc(m.url)}" target="_blank" rel="noopener">🔗 ${esc(m.name || 'Materiał')} – otwórz</a>`).join('')}
      <div class="approve-bar">
        <button class="btn ok" data-act="c-accept" data-id="${p.id}" ${p.approval === 'accepted' ? 'disabled' : ''}>✓ ${p.approval === 'accepted' ? 'Zaakceptowano' : 'Akceptuję'}</button>
        <button class="btn bad" data-act="c-changes" data-id="${p.id}">✎ Poproś o zmiany</button>
      </div>
      <div><div class="small" style="font-weight:600;margin-bottom:8px">Uwagi i komentarze</div>${commentsHtml(p.comments, true)}</div>
      <div class="row" style="align-items:flex-start"><textarea class="input" data-cin="${p.id}" rows="2" style="min-height:44px" placeholder="Napisz uwagę do tej treści…"></textarea><button class="btn" data-act="c-comment" data-id="${p.id}">Wyślij</button></div>
    </div></div>`;
  };
  let listHtml = '';
  weeksOfMonth(ui.month).forEach((w, i) => {
    const wp = sortPosts(list.filter(p => postWeek(p) === w)); if (!wp.length) return;
    listHtml += `<div class="pweek"><h3>Tydzień ${i + 1}</h3><span class="muted small">${weekRange(w)}</span>${md.weeks[w] ? `<span class="muted">· ${esc(md.weeks[w])}</span>` : ''}</div>` + wp.map(card).join('');
  });
  const res = sortPosts(list.filter(p => !postWeek(p)));
  if (res.length) listHtml += `<div class="pweek"><h3>Rezerwa</h3><span class="muted small">posty zapasowe do podmiany</span></div>` + res.map(card).join('');
  return `<div class="portal-top"><div class="in">${avatar(c, 36)}<div><div style="font-weight:650">${esc(c.name)}</div><div class="small muted">Plan treści do akceptacji</div></div>
    <span class="grow"></span><label class="small muted row">Twoje imię <input class="input" style="width:170px" data-act-input="reviewer" value="${esc(reviewer)}" placeholder="np. Anna Nowak"></label></div></div>
  <div class="portal">
    <div class="notice">Sprawdź zaplanowane treści. Przy każdej możesz kliknąć <b>Akceptuję</b> albo <b>Poproś o zmiany</b> i dopisać uwagi. Agencja zobaczy je od razu.</div>
    <div class="toolbar">
      <div class="monthnav"><button class="btn icon" data-act="month" data-d="-1">‹</button><div class="label">${monthLabel(ui.month)}</div><button class="btn icon" data-act="month" data-d="1">›</button></div>
      <div class="grow"></div>
      <div class="seg">${fb('all', 'Wszystkie', inMonth.length)}${fb('pending', 'Do akceptacji', cnt('pending'))}${fb('changes', 'Do poprawy', cnt('changes'))}${fb('accepted', 'Zaakceptowane', cnt('accepted'))}</div>
      <div class="seg"><button class="${ui.portalView === 'list' ? 'on' : ''}" data-act="pview" data-v="list">Lista</button><button class="${ui.portalView === 'cal' ? 'on' : ''}" data-act="pview" data-v="cal">Kalendarz</button></div>
    </div>
    ${pillarsBar(c, inMonth)}
    ${md.notes ? `<div class="card" style="margin-bottom:14px"><div class="card-b"><div class="small" style="font-weight:650;margin-bottom:6px">Uwagi do planu</div><div class="small" style="white-space:pre-wrap;line-height:1.55">${esc(md.notes)}</div></div></div>` : ''}
    ${ui.portalView === 'cal' ? calendarGrid(c, inMonth, ui.month, false) : (listHtml || `<div class="card"><div class="empty"><b>Brak treści w tym widoku</b>Zmień miesiąc lub filtr.</div></div>`)}
  </div>`;
}
function getReviewer() { try { return localStorage.getItem('planer-reviewer') || ''; } catch { return ''; } }
function setReviewer(v) { try { localStorage.setItem('planer-reviewer', v); } catch {} }
function needReviewer() {
  let r = getReviewer().trim();
  if (!r) { r = (prompt('Podaj swoje imię i nazwisko – agencja zobaczy, kto zostawił uwagę:') || '').trim(); if (r) setReviewer(r); }
  return r;
}
async function clientAction(id, kind, btn) {
  const p = state.posts.find(x => x.id === id); if (!p) return;
  const box = $(`[data-cin="${id}"]`); const text = (box?.value || '').trim();
  if (kind === 'changes' && !text) { box?.focus(); if (box) box.style.borderColor = '#ef4444'; toast('Opisz, co mamy zmienić'); return; }
  if (kind === 'comment' && !text) return;
  const who = needReviewer(); if (!who) return;
  if (btn) btn.disabled = true;
  try {
    const np = await api('POST', `/api/p/${PORTAL_TOKEN}/posts/${id}`, { kind, text, author: who });
    state.posts[state.posts.indexOf(p)] = { comments: [], media: [], ...np };
    render();
    toast(kind === 'accept' ? 'Dziękujemy! Treść zaakceptowana.' : kind === 'changes' ? 'Uwagi wysłane do agencji.' : 'Komentarz dodany.');
    $(`#post-${id}`)?.scrollIntoView({ block: 'nearest' });
  } catch (e) { toast(e.message, 5000); if (btn) btn.disabled = false; }
}

/* ================= modals ================= */
function modal(html, wide) {
  closeModal();
  modalOpen = true;
  const w = document.createElement('div'); w.id = 'modal';
  w.innerHTML = `<div class="overlay top" data-act="close-modal"></div><div class="modal ${wide ? 'wide' : ''}">${html}</div>`;
  document.body.appendChild(w);
  setTimeout(() => w.querySelector('input:not([type=checkbox])')?.focus(), 30);
}
function closeModal() { $('#modal')?.remove(); modalOpen = false; }
function openClientModal() {
  modal(`<div class="modal-h"><h2 style="font-size:18px">Nowy klient</h2></div>
    <div class="modal-b"><div class="field"><label>Nazwa klienta</label><input class="input" id="ncName" placeholder="np. Kawiarnia Ziarno"></div>
    <div class="two"><div class="field"><label>Instagram (bez @)</label><input class="input" id="ncIg"></div><div class="field"><label>LinkedIn – nazwa strony</label><input class="input" id="ncLi"></div></div>
    <div class="small muted">Filary i resztę ustawień uzupełnisz w zakładce „Profil, filary i ustawienia” albo zaimportujesz z Excela.</div></div>
    <div class="modal-f"><button class="btn" data-act="close-modal">Anuluj</button><button class="btn primary" data-act="create-client">Dodaj klienta</button></div>`);
}
function openShareModal(c) {
  const url = shareUrl(c);
  modal(`<div class="modal-h"><h2 style="font-size:18px">Link dla klienta – ${esc(c.name)}</h2></div>
    <div class="modal-b">
      <p class="muted" style="margin-top:0">Klient zobaczy tylko treści tego profilu (bez szkiców i notatek wewnętrznych), pytania „do potwierdzenia” i uwagi do planu. Może akceptować treści i dodawać uwagi. Nie musi zakładać konta.</p>
      <div class="row"><input class="input" id="shareUrl" value="${esc(url)}" readonly><button class="btn primary" data-act="copy-link">Kopiuj</button></div>
      <div class="small muted" style="margin-top:10px">Każdy, kto ma ten link, zobaczy plan tego klienta. Jeśli link trafi do niewłaściwej osoby, wygeneruj nowy – stary przestanie działać.</div>
    </div>
    <div class="modal-f"><button class="btn ghost" data-act="regen-token" data-id="${c.id}" title="Stary link przestanie działać">↻ Nowy link</button><span class="grow"></span>
      <a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Otwórz jako klient ↗</a><button class="btn" data-act="close-modal">Zamknij</button></div>`);
}

/* ================= Excel: library ================= */
async function loadExcelJS() {
  if (window.ExcelJS) return;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    s.onload = res; s.onerror = () => rej(new Error('Nie udało się wczytać obsługi Excela (sprawdź internet).'));
    document.head.appendChild(s);
  });
}

/* ================= Excel: import ================= */
const FIELDS = {
  skip: 'Pomiń', date: 'Data', time: 'Godzina', format: 'Format', pillar: 'Filar', title: 'Temat', brief: 'Założenie / opis pomysłu', goal: 'Cel (do założenia)',
  copyMeta: 'Opis FB + IG', copyLi: 'Opis LinkedIn', onGraphic: 'Tekst na grafice', cta: 'CTA', hashtags: 'Hashtagi', mentions: 'Oznaczenia',
  materialBrief: 'Materiał – opis', media: 'Materiał – pliki / linki', toConfirm: 'Do potwierdzenia', clientComment: 'Uwagi klienta (→ komentarz)', note: 'Notatka wewnętrzna',
};
const norm = s => String(s ?? '').toUpperCase().replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
const MONTH_NORM = ['STYCZEN', 'LUTY', 'MARZEC', 'KWIECIEN', 'MAJ', 'CZERWIEC', 'LIPIEC', 'SIERPIEN', 'WRZESIEN', 'PAZDZIERNIK', 'LISTOPAD', 'GRUDZIEN'];
function monthFromText(s) {
  const t = String(s || '').toUpperCase().replace(/Ł/g, 'L').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const i = MONTH_NORM.findIndex(m => new RegExp('\\b' + m + '\\b').test(t)); const y = t.match(/\b(20\d\d)\b/);
  return i >= 0 && y ? `${y[1]}-${pad(i + 1)}` : '';
}
function rawVal(v) { return v && typeof v === 'object' && !(v instanceof Date) && 'result' in v ? v.result : v; }
function cellText(v) {
  v = rawVal(v);
  if (v == null) return '';
  if (v instanceof Date) return ymd(new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(t => t.text).join('');
    if (v.text != null) return cellText(v.text);
    if (v.hyperlink) return v.hyperlink;
    return '';
  }
  return String(v);
}
function cellLinks(v) {
  const out = []; v = rawVal(v);
  if (v && typeof v === 'object' && v.hyperlink) out.push(v.hyperlink);
  (cellText(v).match(/https?:\/\/[^\s"<>]+/g) || []).forEach(u => out.push(u.replace(/[),.;]+$/, '')));
  return [...new Set(out)];
}
function parseDateCell(v) {
  v = rawVal(v);
  if (v instanceof Date) return ymd(new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  const s = cellText(v);
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
  m = s.match(/\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})\b/); if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return '';
}
function guessField(h, layout, ch) {
  const n = norm(h);
  if (/^DATA/.test(n)) return 'date';
  if (/^GODZ/.test(n)) return 'time';
  if (n === 'FORMAT') return 'format';
  if (/^FILAR/.test(n)) return 'pillar';
  if (n === 'TEMAT') return 'title';
  if (/LINKEDIN/.test(n) && /OPIS|TREŚĆ/.test(n)) return 'copyLi';
  if (/(FB|IG|INSTAGRAM|FACEBOOK)/.test(n) && /OPIS|TREŚĆ/.test(n)) return 'copyMeta';
  if (/^KIERUNKI/.test(n)) return 'brief';
  if (n === 'CEL') return 'goal';
  if (/^MATERIA\S* ?-? ?(PLIK|LINK)|^MATERIAŁY GRAFICZNE/.test(n)) return 'media';
  if (/^MATERIA/.test(n)) return 'materialBrief';
  if (/^DO POTWIERDZENIA/.test(n)) return 'toConfirm';
  if (/^(KOMENTARZ|KOREKTA|UWAGI|AKCEPTACJA)/.test(n)) return 'clientComment';
  if (n === 'CTA') return 'cta';
  if (/^HA(SZ|SH)TAG/.test(n)) return 'hashtags';
  if (/^OZNACZENIA/.test(n)) return 'mentions';
  if (/^TREŚĆ POSTA/.test(n)) return layout === 'see' ? 'onGraphic' : (ch === 'li' ? 'copyLi' : 'copyMeta');
  if (/^OPIS/.test(n)) return layout === 'lion' ? 'brief' : (ch === 'li' ? 'copyLi' : 'copyMeta');
  return 'skip';
}
function parsePillarLine(t) {
  const s = String(t).replace(/^.*?FILARY KOMUNIKACJI\s*:?/i, '');
  return s.split('|').map(x => x.trim()).filter(Boolean).map(x => {
    const m = x.match(/^\(?\s*(\d+)\s*\)\s*(.+)$/); if (!m) return null;
    const [name, ...rest] = m[2].split(/\s*[—–]\s*|,\s*/);
    return { num: +m[1], name: name.trim(), desc: rest.join(', ').trim() };
  }).filter(Boolean);
}
function analyzeWorkbook(wb, fileName) {
  const sheets = [], pillars = []; let clientHint = '';
  wb.eachSheet(ws => {
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row, r) => {
      const cells = new Map();
      row.eachCell({ includeEmpty: false }, (cell, c) => {
        if (cell.isMerged && cell.master !== cell) return;
        const t = cellText(cell.value); if (!t.trim()) return;
        cells.set(c, { v: cell.value, t: t.trim() });
      });
      if (cells.size) rows.push({ r, cells, first: [...cells.entries()][0] });
    });
    const sh = { name: ws.name, ws, type: 'skip', rows: [], headers: [], map: {}, channel: 'meta', sheetMonth: monthFromText(ws.name), on: false, images: [] };
    const hi = rows.findIndex(row => [...row.cells.values()].some(x => /^DATA/.test(norm(x.t))) && [...row.cells.values()].some(x => norm(x.t) === 'TEMAT'));
    if (hi < 0) {
      // "Opis filarów" sheet
      const txt = rows.map(r => r.first[1].t);
      if (txt.some(t => /^FILAR\s*\d+\s*[-–—:]/i.test(t))) {
        sh.type = 'pillars'; sh.on = true;
        const title = txt.find(t => /PLAN TREŚCI/i.test(t)); if (title) clientHint = title.replace(/^.*PLAN TREŚCI\s*/i, '').trim();
        let cur = null, expect = null;
        txt.forEach(t => {
          const m = t.match(/^FILAR\s*(\d+)\s*[-–—:]\s*(.+)$/i);
          if (m) { cur = { num: +m[1], name: `Filar ${m[1]}: ${sentence(m[2])}`, goal: '', audience: '', desc: '', what: '', examples: '' }; pillars.push(cur); expect = null; return; }
          if (!cur) return;
          const n = norm(t);
          if (/^CEL FILARU/.test(n)) { cur.goal = t.replace(/^cel filaru\s*:?\s*/i, ''); expect = null; }
          else if (/^GRUPA DOCELOWA/.test(n)) { cur.audience = t.replace(/^grupa docelowa\s*:?\s*/i, ''); expect = null; }
          else if (n === 'OPIS') expect = 'desc';
          else if (/^CO PUBLIKUJEMY/.test(n)) expect = 'what';
          else if (/^PRZYKŁADY/.test(n)) expect = 'examples';
          else if (expect) cur[expect] += (cur[expect] ? '\n' : '') + t;
        });
        sh.info = `${pillars.length} filarów`;
      }
      sheets.push(sh); return;
    }
    sh.type = 'plan'; sh.on = !!monthFromText(ws.name + ' 2000') || /linkedin/i.test(ws.name);
    const before = rows.slice(0, hi).map(r => [...r.cells.values()].map(x => x.t).join(' '));
    before.forEach(t => { if (/FILARY KOMUNIKACJI/i.test(t)) parsePillarLine(t).forEach(p => pillars.push(p)); if (!sh.sheetMonth) sh.sheetMonth = monthFromText(t); });
    if (/linkedin/i.test(ws.name) || before.some(t => /^LINKEDIN$/i.test(t.trim()))) sh.channel = 'li';
    const hdr = rows[hi];
    sh.headers = [...hdr.cells.entries()].map(([c, x]) => ({ c, text: x.t }));
    const hn = sh.headers.map(h => norm(h.text));
    const layout = hn.some(n => /LINKEDIN|FB|IG/.test(n) && /OPIS/.test(n)) ? 'see' : (hn.some(n => /^TREŚĆ POSTA/.test(n)) && hn.some(n => /^OPIS/.test(n)) ? 'lion' : 'plain');
    sh.layout = layout;
    sh.headers.forEach(h => { sh.map[h.c] = guessField(h.text, layout, sh.channel); });
    sh.rows = rows.slice(hi + 1);
    sh.images = ws.getImages().map(im => ({ row: Math.floor((im.range?.tl?.nativeRow ?? im.range?.tl?.row ?? -1)) + 1, imageId: im.imageId }));
    sheets.push(sh);
  });
  return { fileName, sheets, pillars, clientHint };
}
function matchPillar(str, list) {
  const s = String(str || '').trim(); if (!s) return '';
  const num = (s.match(/^\(?\s*(\d+)\s*\)/) || s.match(/FILAR\s*(\d+)/i) || [])[1];
  if (num) { const p = list.find(x => x.num === +num); if (p) return p.name; }
  const k = pkey(s.replace(/^\(\s*\d+\s*\)\s*/, ''));
  const p = list.find(x => pkey(x.name) === k) || list.find(x => k && (pkey(x.name).includes(k) || k.includes(pkey(x.name))));
  return p ? p.name : sentence(s.replace(/^\(\s*\d+\s*\)\s*/, ''));
}
// client remark → status: "ok…/super…" = accepted, asks for changes = to fix, anything else stays to accept
function commentStatus(t) {
  if (!t || !t.trim()) return 'pending';
  const s = t.trim().toLowerCase();
  const positive = /^(ok\b|okej|okay|super|świetn|akcept|zatwierdz|tak\b|👍)/.test(s);
  const change = /popraw|zmie[nń]|dopis|usu[nń]|zamiast|inaczej|błąd|skróć|przerób|innym razem|nie publik/.test(s);
  if (positive && !(change && /\bale\b|jednak/.test(s))) return 'accepted';
  return change ? 'changes' : 'pending';
}
function buildSheet(sh, pillars) {
  const fieldCols = f => Object.keys(sh.map).filter(c => sh.map[c] === f).map(Number);
  const val = (row, f) => fieldCols(f).map(c => row.cells.get(c)?.t).filter(Boolean).join('\n\n');
  const dateCol = fieldCols('date')[0];
  const sections = [], posts = [], notes = []; let cur = null, mode = 'plan', fixes = 0;
  const rowText = row => [...row.cells.values()].map(x => x.t).join(' · ');
  for (const row of sh.rows) {
    const ft = norm(row.first[1].t);
    if (/^UWAGI OPERACYJNE/.test(ft)) { mode = 'notes'; continue; }
    if (mode === 'notes') { notes.push(rowText(row)); continue; }
    if (/^(LEGENDA|STRUKTURA)/.test(ft)) { mode = 'skip'; continue; }
    if (mode === 'skip') continue;
    if (/^TYDZIE/.test(ft)) {
      const n = +(ft.match(/TYDZIE\S*\s*(\d+)/) || [])[1] || null;
      const rg = ft.match(/(\d{1,2})\s*(?:\.\d{1,2})?\s*[-–]\s*(\d{1,2})\.(\d{1,2})/);
      const clean = s => { s = s.replace(/\b(DATA|TEMAT)\s*:/gi, '').replace(/^[\s|·:]+|[\s|·:]+$/g, '').trim(); return /^\d{1,2}\s*[-–]\s*\d{1,2}\.?\s*[\p{L}\d.]*$/u.test(s) ? '' : s; };
      const inA = clean(row.first[1].t.replace(/^TYDZIE\S*\s*\d*\s*(\([^)]*\))?\s*[:|]?\s*/i, ''));
      const theme = [inA, ...[...row.cells.entries()].slice(1).map(([, x]) => clean(x.t))].filter(Boolean).join(' · ');
      cur = { n, rg: rg ? { d: +rg[1], m: +rg[3] } : null, theme, posts: [] }; sections.push(cur); continue;
    }
    if (/^REZERWA\s*(\||$)/.test(ft)) { cur = { reserve: true, posts: [] }; sections.push(cur); continue; }
    const dcell = dateCol != null ? row.cells.get(dateCol) : null;
    const date = dcell ? parseDateCell(dcell.v) : '';
    const isRes = dcell && /^REZERWA/i.test(dcell.t);
    if (dcell && !date && !isRes) { cur = { n: null, theme: rowText(row), posts: [] }; sections.push(cur); continue; }
    const hasContent = ['title', 'copyMeta', 'copyLi', 'brief', 'onGraphic'].some(f => val(row, f));
    const slot = !hasContent && val(row, 'format');   // empty planned slot, e.g. "REZERWA 1 | POST"
    if (!hasContent && !slot) { if (!dcell) notes.push(rowText(row)); continue; }
    if (!val(row, 'format') && !val(row, 'title') && !date) { notes.push(rowText(row)); continue; }
    const comment = val(row, 'clientComment');
    const fmt = val(row, 'format');
    const brief = [val(row, 'brief'), val(row, 'goal') && 'Cel: ' + val(row, 'goal')].filter(Boolean).join('\n');
    const p = {
      _row: row.r, _sec: isRes ? null : cur, _res: isRes || !!cur?.reserve, date,
      time: val(row, 'time'), format: fmt ? sentence(fmt.split('\n')[0]) : 'Post', pillar: matchPillar(val(row, 'pillar'), pillars), title: val(row, 'title'),
      brief, copyMeta: sh.channel === 'li' ? '' : val(row, 'copyMeta'), copyLi: val(row, 'copyLi') || (sh.channel === 'li' ? val(row, 'copyMeta') : ''),
      onGraphic: val(row, 'onGraphic'), cta: val(row, 'cta'), hashtags: val(row, 'hashtags'), mentions: val(row, 'mentions'), materialBrief: val(row, 'materialBrief'),
      toConfirm: val(row, 'toConfirm'), note: val(row, 'note'),
      links: fieldCols('media').flatMap(c => cellLinks(row.cells.get(c)?.v)), comment,
      approval: slot ? 'draft' : commentStatus(comment),
    };
    posts.push(p); cur?.posts?.push(p);
  }
  // month: majority of dates, else sheet name / title
  const cnt = {}; posts.filter(p => p.date).forEach(p => { const k = p.date.slice(0, 7); cnt[k] = (cnt[k] || 0) + 1; });
  const month = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || sh.sheetMonth || TODAY.slice(0, 7);
  // fix typos in year (e.g. 17.08.2024 in a sheet for August 2026)
  posts.forEach(p => { if (p.date && p.date.slice(5, 7) === month.slice(5, 7) && p.date.slice(0, 4) !== month.slice(0, 4)) { p.date = month.slice(0, 4) + p.date.slice(4); fixes++; } });
  // resolve week sections → monday
  const weeks = {};
  const ws = weeksOfMonth(month);
  sections.forEach(s => {
    if (s.reserve) return;
    const dated = s.posts.find(p => p.date);
    if (dated) s.mon = mondayOf(dated.date);
    else if (s.rg) s.mon = mondayOf(`${month.slice(0, 4)}-${pad(s.rg.m)}-${pad(s.rg.d)}`);
  });
  const ref = sections.find(s => s.mon && s.n);
  sections.forEach(s => {
    if (s.reserve || s.mon || !s.n) return;
    if (ref) s.mon = ymd(addDays(parseYmd(ref.mon), 7 * (s.n - ref.n)));
    else { const firstMon = ws.find(w => w >= month + '-01') || ws[0]; s.mon = ymd(addDays(parseYmd(firstMon), 7 * (s.n - 1))); }
  });
  sections.forEach(s => { if (s.mon && s.theme) weeks[s.mon] = s.theme; else if (!s.reserve && s.theme && !s.n) notes.unshift('Sekcja: ' + s.theme); });
  posts.forEach(p => { p.month = p.date ? p.date.slice(0, 7) : month; p.week = !p.date && !p._res && p._sec?.mon ? p._sec.mon : ''; });
  return { month, posts, weeks, notes: notes.join('\n'), fixes,
    images: sh.images.filter(im => posts.some(p => Math.abs(p._row - im.row) <= 2)).length, comments: posts.filter(p => p.comment).length };
}
async function startImport(file, presetClient) {
  try {
    toast('Wczytuję plik…');
    await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const an = analyzeWorkbook(wb, file.name);
    an.wb = wb;
    const guessName = an.clientHint || file.name.replace(/\.xlsx?$/i, '').replace(/^(v\d+\s*-\s*)?(\d+_\d+_)?/i, '').replace(/_?plan_?publikacji_?\d*(_v\d+)?/i, '').replace(/^SM_plan\s*/i, '').replace(/[_]+/g, ' ').trim();
    const existing = presetClient || state.clients.find(c => guessName && pkey(c.name) === pkey(guessName))?.id || '';
    imp = { an, client: existing || '__new', newName: guessName || file.name.replace(/\.xlsx?$/i, '').replace(/_/g, ' '), replace: true, busy: false };
    renderImport();
  } catch (e) { console.error(e); toast('Nie udało się odczytać pliku: ' + e.message, 5000); }
}
function renderImport() {
  const { an } = imp;
  const plans = an.sheets.filter(s => s.type === 'plan');
  const sheetRow = s => {
    if (s.type === 'skip') return `<div class="imp-sheet off"><div class="hd"><b>${esc(s.name)}</b><span class="small muted">pominięty – nie rozpoznano układu planu</span></div></div>`;
    if (s.type === 'pillars') return `<div class="imp-sheet ${s.on ? '' : 'off'}"><div class="hd"><label class="row"><input type="checkbox" data-imp-on="${esc(s.name)}" ${s.on ? 'checked' : ''}><b>${esc(s.name)}</b></label><span class="badge s-ok">Opis filarów</span><span class="small muted">${esc(s.info)} → profil klienta</span></div></div>`;
    const b = buildSheet(s, an.pillars);
    return `<div class="imp-sheet ${s.on ? '' : 'off'}"><div class="hd">
      <label class="row"><input type="checkbox" data-imp-on="${esc(s.name)}" ${s.on ? 'checked' : ''}><b>${esc(s.name)}</b></label>
      <select class="select" style="width:auto;padding:4px 8px" data-imp-ch="${esc(s.name)}"><option value="meta" ${s.channel === 'meta' ? 'selected' : ''}>Plan FB + IG</option><option value="li" ${s.channel === 'li' ? 'selected' : ''}>Plan LinkedIn</option></select>
      <span class="grow"></span>
      <div class="stats2"><span>miesiąc: <b>${monthLabel(b.month)}</b>${s.sheetMonth && s.sheetMonth !== b.month ? ` <span title="Nazwa arkusza wskazuje inny miesiąc">(arkusz: ${monthLabel(s.sheetMonth)})</span>` : ''}</span>
      <span><b>${b.posts.length}</b> treści</span><span><b>${b.posts.filter(p => !p.date).length}</b> bez daty</span><span><b>${b.images}</b> grafik</span><span><b>${b.comments}</b> uwag klienta</span>
      ${b.fixes ? `<span style="color:#92400e">poprawiono rok w ${b.fixes} dat.</span>` : ''}${Object.keys(b.weeks).length ? `<span><b>${Object.keys(b.weeks).length}</b> tematów tyg.</span>` : ''}${b.notes ? '<span>+ uwagi operacyjne</span>' : ''}</div></div>
      <details><summary>Dopasowanie kolumn (${s.headers.length})</summary><div class="map">
        ${s.headers.map(h => `<span class="h" title="${esc(h.text)}">${esc(h.text)}</span><span class="arrow muted">→</span><select class="select" data-imp-map="${esc(s.name)}" data-col="${h.c}">${Object.entries(FIELDS).map(([k, l]) => `<option value="${k}" ${s.map[h.c] === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`).join('')}
      </div></details></div>`;
  };
  const total = plans.filter(s => s.on).reduce((n, s) => n + buildSheet(s, an.pillars).posts.length, 0);
  modal(`<div class="modal-h"><h2 style="font-size:18px">Import planu z Excela</h2><div class="small muted" style="margin-top:4px">${esc(an.fileName)}</div></div>
    <div class="modal-b">
      <div class="two">
        <div class="field"><label>Klient</label><select class="select" id="impClient">${state.clients.map(c => `<option value="${c.id}" ${imp.client === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="__new" ${imp.client === '__new' ? 'selected' : ''}>＋ Nowy klient…</option></select></div>
        ${imp.client === '__new' ? `<div class="field"><label>Nazwa nowego klienta</label><input class="input" id="impNewName" value="${esc(imp.newName)}"></div>` : `<div class="field"><label>&nbsp;</label><label class="row small"><input type="checkbox" id="impReplace" ${imp.replace ? 'checked' : ''}> Zastąp dotychczasowe treści klienta w importowanych miesiącach</label></div>`}
      </div>
      ${an.pillars.length ? `<div class="guide" style="margin-bottom:12px"><b>Filary z pliku:</b> ${an.pillars.map(p => esc(p.name)).join(' · ')}</div>` : ''}
      ${an.sheets.map(sheetRow).join('')}
      <div class="guide">Kolumny „Komentarz”, „Korekta opisu”, „Uwagi…” trafiają jako uwagi klienta: wpis zaczynający się od „ok” oznacza <b>Zaakceptowany</b>, inna treść oznacza <b>Do poprawy</b>, a brak wpisu oznacza <b>Do akceptacji</b>. Grafiki wklejone w arkusz są przypinane do wiersza, w którym leżą. Kolory wierszy nie są importowane.</div>
    </div>
    <div class="modal-f"><span class="small muted" style="margin-right:auto">${total} treści do zaimportowania</span><button class="btn" data-act="close-modal">Anuluj</button>
      <button class="btn primary" data-act="do-import" ${imp.busy || !total ? 'disabled' : ''}>${imp.busy ? '<span class="spinner"></span> Importuję…' : 'Importuj'}</button></div>`, true);
}
async function doImport() {
  const { an } = imp;
  imp.busy = true; renderImport();
  try {
    let c;
    if (imp.client === '__new') { c = newClient({ name: imp.newName.trim() || 'Nowy klient', color: PILLAR_COLORS[state.clients.length % PILLAR_COLORS.length] }); state.clients.push(c); }
    else c = clientById(imp.client);
    const pillarsOn = an.sheets.some(s => s.type === 'pillars' && s.on) || an.pillars.some(p => !p.goal);
    const addPillar = (name, extra = {}) => {
      if (!name) return; const ex = c.pillars.find(p => pkey(p.name) === pkey(name));
      if (ex) { Object.entries(extra).forEach(([k, v]) => { if (v && !ex[k]) ex[k] = v; }); return; }
      c.pillars.push({ id: uid(), name, color: PILLAR_COLORS[c.pillars.length % PILLAR_COLORS.length], goal: '', audience: '', desc: '', what: '', examples: '', ...extra });
    };
    if (pillarsOn) an.pillars.forEach(p => addPillar(p.name, { goal: p.goal || '', audience: p.audience || '', desc: p.desc || '', what: p.what || '', examples: p.examples || '' }));
    const imported = new Set();
    let count = 0, imgs = 0;
    for (const s of an.sheets.filter(s => s.type === 'plan' && s.on)) {
      const b = buildSheet(s, an.pillars);
      if (imp.replace && imp.client !== '__new') {
        const months = new Set(b.posts.map(p => p.month).concat(b.month));
        state.posts = state.posts.filter(p => !(p.clientId === c.id && months.has(postMonth(p)) && !imported.has(p)));
      }
      const md = monthDataW(c.id, b.month);
      Object.assign(md.weeks, b.weeks);
      if (b.notes) md.notes = md.notes && (imp.client === '__new' || !imp.replace || md._imp) ? md.notes + '\n' + b.notes : b.notes;
      const byRow = new Map();
      b.posts.forEach((x, i) => {
        addPillar(x.pillar);
        const p = newPost({ clientId: c.id, date: x.date, month: x.month, week: x.week, time: x.time, meta: s.channel === 'meta', li: s.channel === 'li' || !!x.copyLi,
          format: x.format, pillar: x.pillar, title: x.title, brief: x.brief, copyMeta: x.copyMeta, copyLi: x.copyLi, onGraphic: x.onGraphic, cta: x.cta, hashtags: x.hashtags,
          mentions: x.mentions, materialBrief: x.materialBrief, toConfirm: x.toConfirm, note: x.note, approval: x.approval, order: i,
          media: x.links.map(u => ({ id: uid(), type: 'link', url: u, thumb: '', name: linkName(u) })),
          comments: x.comment ? [{ id: uid(), role: 'client', author: 'Klient (z Excela)', text: x.comment, at: Date.now() }] : [] });
        state.posts.push(p); imported.add(p); byRow.set(x._row, p); count++;
      });
      for (const im of s.images) {
        let target = byRow.get(im.row);
        if (!target) { const rows = [...byRow.keys()].filter(r => r <= im.row && im.row - r <= 2).sort((a, z) => z - a); target = byRow.get(rows[0]); }
        if (!target) continue;
        try {
          const img = an.wb.getImage(im.imageId);
          const blob = new Blob([img.buffer], { type: 'image/' + (img.extension === 'jpg' ? 'jpeg' : img.extension) });
          target.media.unshift(await blobToMedia(blob, `${s.name} – wiersz ${im.row}.${img.extension}`)); imgs++;
        } catch (e) { console.warn(e); }
      }
    }
    save(true); closeModal(); imp = null;
    const firstMonth = [...imported].map(postMonth).sort()[0];
    if (firstMonth) ui.month = firstMonth;
    location.hash = `#/k/${c.id}/plan`; render();
    toast(`Zaimportowano ${count} treści i ${imgs} grafik`, 4000);
  } catch (e) { console.error(e); imp.busy = false; renderImport(); toast('Błąd importu: ' + e.message, 5000); }
}

/* ================= Excel: export ================= */
// pierwsza grafika każdej treści (PNG/JPG z naszego serwera) jako base64 do osadzenia w arkuszu
async function firstImages(posts) {
  const out = new Map();
  await Promise.all(posts.map(async p => {
    const m = p.media.find(x => x.type === 'image' && x.src && !x.src.startsWith('data:image/svg'));
    if (!m) return;
    try {
      const blob = await (await fetch(m.src)).blob();
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpeg' : null;
      if (!ext) return;
      const base64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
      out.set(p.id, { base64, ext });
    } catch { /* grafika niedostępna – eksport bez miniatury */ }
  }));
  return out;
}
async function exportXlsx(c) {
  try {
    await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    const months = ui.month === 'all' ? [...new Set(postsOf(c.id).map(postMonth))].sort() : [ui.month];
    const cols = [['DATA', 12], ['FORMAT', 12], ['KANAŁY', 12], ['FILAR', 18], ['TEMAT', 28], ['ZAŁOŻENIE', 32], ['OPIS FB + IG', 55], ['OPIS LINKEDIN', 55], ['TEKST NA GRAFICE', 28], ['CTA', 28],
      ['HASZTAGI', 26], ['OZNACZENIA', 18], ['MATERIAŁ — OPIS', 30], ['MATERIAŁ — PLIKI / LINKI', 30], ['DO POTWIERDZENIA', 28], ['AKCEPTACJA', 15], ['UWAGI KLIENTA', 36], ['PUBLIKACJA', 16]];
    const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    for (const mk of months) {
      const ws = wb.addWorksheet(monthLabel(mk).slice(0, 31));
      ws.columns = cols.map(([, w]) => ({ width: w }));
      const n = cols.length;
      const band = (text, argb, color = 'FFFFFFFF', bold = true) => { const r = ws.addRow([text]); ws.mergeCells(r.number, 1, r.number, n); r.getCell(1).fill = fill(argb); r.getCell(1).font = { bold, color: { argb: color } }; r.getCell(1).alignment = { wrapText: true, vertical: 'middle' }; return r; };
      band(`PLAN PUBLIKACJI SOCIAL MEDIA — ${monthLabel(mk).toUpperCase()} — ${c.name}`, 'FF2C2C2C').height = 24;
      if (c.pillars.length) band('FILARY KOMUNIKACJI: ' + c.pillars.map((p, i) => `(${i + 1}) ${p.name}`).join(' | '), 'FFF2F2F2', 'FF333333', false);
      const hr = ws.addRow(cols.map(([h]) => h));
      hr.eachCell(cell => { cell.fill = fill('FF561C0C'); cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
      ws.views = [{ state: 'frozen', ySplit: hr.number }];
      const md = monthData(c.id, mk), ps = postsOf(c.id).filter(p => postMonth(p) === mk);
      const images = await firstImages(ps);
      const addPost = p => {
        const r = ws.addRow([p.date ? parseYmd(p.date) : (p.week ? 'w tygodniu' : 'REZERWA'), p.format, chLabel(p), p.pillar, p.title, p.brief, p.copyMeta, p.copyLi, p.onGraphic, p.cta, p.hashtags, p.mentions,
          p.materialBrief, p.media.filter(m => m.type === 'link').map(m => m.url).join('\n'), p.toConfirm, APPROVAL[p.approval].label,
          p.comments.filter(x => x.role === 'client').map(x => `${x.author}: ${x.text}`).join('\n'), p.published ? 'Opublikowano ' + fmtShort(p.publishedAt) : 'Oczekuje']);
        r.eachCell(cell => { cell.alignment = { wrapText: true, vertical: 'top' }; });
        if (p.date) r.getCell(1).numFmt = 'dd.mm.yyyy';
        const img = images.get(p.id);
        if (img) {
          const id = wb.addImage({ base64: img.base64, extension: img.ext });
          const h = 110, w = Math.min(200, Math.round(h * (img.w || 1) / (img.h || 1)));
          r.height = Math.max(r.height || 0, 90);
          ws.addImage(id, { tl: { col: 13, row: r.number - 1 }, ext: { width: w, height: h } });
        }
      };
      weeksOfMonth(mk).forEach((w, i) => {
        const wp = sortPosts(ps.filter(p => postWeek(p) === w)); if (!wp.length && !md.weeks[w]) return;
        band(`TYDZIEŃ ${i + 1} (${weekRange(w)})${md.weeks[w] ? ' | ' + md.weeks[w] : ''}`, 'FFDA9E3C');
        wp.forEach(addPost);
      });
      const res = sortPosts(ps.filter(p => !postWeek(p)));
      if (res.length) { band('REZERWA | posty zapasowe do podmiany', 'FFD9D9D9', 'FF333333'); res.forEach(addPost); }
      if (md.notes) { ws.addRow([]); band('UWAGI OPERACYJNE I DO POTWIERDZENIA', 'FFDA9E3C'); md.notes.split('\n').forEach(t => { const r = ws.addRow([t]); ws.mergeCells(r.number, 1, r.number, n); r.getCell(1).alignment = { wrapText: true }; }); }
    }
    const buf = await wb.xlsx.writeBuffer();
    download(`Plan_${c.name.replace(/[^\p{L}\d]+/gu, '_')}_${ui.month === 'all' ? 'wszystkie' : ui.month}.xlsx`, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } catch (e) { console.error(e); toast('Eksport nie powiódł się: ' + e.message, 5000); }
}
function download(name, data, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ================= events ================= */
document.addEventListener('click', async e => {
  const go = e.target.closest('[data-go]'); if (go && !e.target.closest('[data-act]')) { location.hash = go.dataset.go; return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  const r = route();
  switch (a) {
    case 'expand': el.parentElement.classList.add('open'); break;
    case 'car': { const car = el.closest('.car'); goSlide(car, slideIndex(car.querySelector('.p-media')) + +el.dataset.d); break; }
    case 'lb': openLb(el.closest('[data-pid]')?.dataset.pid, +el.dataset.i || 0); break;
    case 'lb-nav': lb.i = Math.max(0, Math.min(lb.p.media.length - 1, lb.i + +el.dataset.d)); renderLb(); break;
    case 'lb-close': closeLb(); break;
    case 'month': ui.month = el.dataset.d === '0' ? TODAY.slice(0, 7) : shiftMonth(ui.month === 'all' ? TODAY.slice(0, 7) : ui.month, +el.dataset.d); render(); break;
    case 'month-all': ui.month = ui.month === 'all' ? TODAY.slice(0, 7) : 'all'; render(); break;
    case 'ch': ui.ch = el.dataset.v; render(); break;
    case 'full': ui.full = el.dataset.v === '1'; render(); break;
    case 'new-client': openClientModal(); break;
    case 'create-client': {
      const name = $('#ncName').value.trim(); if (!name) { $('#ncName').focus(); return; }
      const c = newClient({ name, color: PILLAR_COLORS[state.clients.length % PILLAR_COLORS.length], igHandle: $('#ncIg').value.trim().replace(/^@/, ''), fbName: name, liName: $('#ncLi').value.trim() || name });
      state.clients.push(c); save(true); closeModal(); location.hash = `#/k/${c.id}/profil`; break;
    }
    case 'close-modal': if (!imp?.busy) { closeModal(); imp = null; } break;
    case 'share': openShareModal(clientById(id)); break;
    case 'copy-link': { const i = $('#shareUrl'); i.select(); try { await navigator.clipboard.writeText(i.value); } catch { document.execCommand('copy'); } toast('Link skopiowany'); break; }
    case 'regen-token': { if (!confirm('Stary link przestanie działać. Kontynuować?')) return; const c = clientById(id); c.token = newToken(); save(true); openShareModal(c); break; }
    case 'del-client': { const c = clientById(id); if (!confirm(`Usunąć klienta „${c.name}” i wszystkie jego treści (${postsOf(id).length})? Tej operacji nie można cofnąć.`)) return;
      state.posts = state.posts.filter(p => p.clientId !== id); state.clients = state.clients.filter(x => x.id !== id);
      Object.keys(state.months).forEach(k => { if (k.startsWith(id + '|')) delete state.months[k]; }); save(true); location.hash = '#/'; break; }
    case 'client-avatar': case 'client-avatar-rm': {
      const c = clientById(r.id);
      if (a === 'client-avatar-rm') c.avatar = '';
      else { const [f] = await pickFiles('image/*', false); if (!f) return; try { const m = await fileToMedia(f); c.avatar = m.src; } catch (err) { return toast(err.message); } }
      save(); render(); break;
    }
    case 'pl-add': { const c = clientById(r.id); c.pillars.push({ id: uid(), name: `Filar ${c.pillars.length + 1}`, color: PILLAR_COLORS[c.pillars.length % PILLAR_COLORS.length], goal: '', audience: '', desc: '', what: '', examples: '' }); save(); render(); break; }
    case 'pl-del': { const c = clientById(r.id); const p = c.pillars[+el.dataset.i]; if (!confirm(`Usunąć filar „${p.name}”? Treści zachowają nazwę filaru.`)) return; c.pillars.splice(+el.dataset.i, 1); save(); render(); break; }
    case 'xlsx': exportXlsx(clientById(id)); break;
    case 'import-xlsx': { const [f] = await pickFiles('.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', false); if (f) startImport(f, el.dataset.client); break; }
    case 'do-import': doImport(); break;
    case 'notif': if ($('#notif')) closeNotif(); else openNotif(); break;
    case 'notif-close': closeNotif(); break;
    case 'notif-open': openPostFromNotif(id); break;
    case 'team': openTeam(); break;
    case 'password': openPassword(); break;
    case 'user-add': addUser(); break;
    case 'user-toggle': toggleUser(+id); break;
    case 'user-reset': resetUser(+id); break;
    case 'password-save': savePassword(); break;
    case 'toggle-pub': {
      e.stopPropagation();
      const p = state.posts.find(x => x.id === id); p.published = !p.published; p.publishedAt = p.published ? TODAY : '';
      save(); render(); toast(p.published ? 'Oznaczono jako opublikowane' : 'Oznaczono jako oczekujące'); break;
    }
    case 'open-post': { const p = state.posts.find(x => x.id === id); if (p) openDrawer(p, false); break; }
    case 'new-post': {
      e.stopPropagation();
      const o = { clientId: el.dataset.client || (r.name === 'client' ? r.id : undefined) };
      if (el.dataset.date) o.date = el.dataset.date;
      if (el.dataset.week) { o.date = ''; o.week = el.dataset.week; o.month = el.dataset.mk; }
      if (el.dataset.reserve) { o.date = ''; o.month = el.dataset.mk; }
      openDrawer(newPost(o), true); break;
    }
    // drawer
    case 'close-drawer': closeDrawer(); break;
    case 'toggle-ch': { const d = drawer.draft, k = el.dataset.v, other = k === 'meta' ? 'li' : 'meta';
      if (d[k] && !d[other]) { toast('Wybierz co najmniej jeden kanał'); return; }
      d[k] = !d[k]; if (!d[drawer.cap]) drawer.cap = d.meta ? 'meta' : 'li'; if (d[k]) drawer.cap = k;
      drawer.dirty = true; renderDrawerKeepScroll(); break; }
    case 'cap': drawer.cap = el.dataset.v; renderDrawerKeepScroll(); break;
    case 'copy-meta-li': { const d = drawer.draft; if (d.copyLi.trim() && !confirm('Zastąpić obecny opis LinkedIn opisem z FB + IG?')) return; d.copyLi = d.copyMeta; drawer.dirty = true; renderDrawerKeepScroll(); break; }
    case 'dmode': { const d = drawer.draft, v = el.dataset.v;
      if (v === 'date') { d.date = d.week ? (d.week.slice(0, 7) === d.month ? d.week : d.month + '-01') : (d.month || TODAY.slice(0, 7)) + '-01'; if (d.month === TODAY.slice(0, 7) && !d.week) d.date = TODAY; d.week = ''; }
      else { if (d.date) d.month = d.date.slice(0, 7); d.week = v === 'week' ? (d.date ? mondayOf(d.date) : weeksOfMonth(d.month)[0]) : ''; d.date = ''; }
      drawer.dirty = true; renderDrawerKeepScroll(); break; }
    case 'pv': drawer.pv = el.dataset.v; refreshPreview(); break;
    case 'add-tags': { const d = drawer.draft, c = clientById(d.clientId); const have = new Set(d.hashtags.split(/\s+/)); const add = c.hashtags.split(/\s+/).filter(t => t && !have.has(t));
      d.hashtags = (d.hashtags.trim() + ' ' + add.join(' ')).trim(); drawer.dirty = true; renderDrawerKeepScroll(); break; }
    case 'upload': addMedia(await pickFiles('image/png,image/jpeg,image/webp,image/gif', true)); break;
    case 'add-link': { const v = $('#linkIn').value.trim(); if (!/^https?:\/\//i.test(v)) { toast('Wklej pełny link zaczynający się od https://'); return; }
      drawer.draft.media.push({ id: uid(), type: 'link', url: v, thumb: '', name: linkName(v) }); drawer.dirty = true; renderDrawerKeepScroll(); break; }
    case 'm-del': drawer.draft.media.splice(+el.dataset.i, 1); drawer.dirty = true; renderDrawerKeepScroll(); break;
    case 'm-left': { const m = drawer.draft.media, i = +el.dataset.i; [m[i - 1], m[i]] = [m[i], m[i - 1]]; drawer.dirty = true; renderDrawerKeepScroll(); break; }
    case 'add-comment': {
      const t = $('#cmIn').value.trim(); if (!t) return;
      const live = state.posts.find(x => x.id === drawer.draft.id);
      if (!live) { toast('Najpierw zapisz treść, potem dodaj komentarz.'); return; }
      el.disabled = true;
      try {
        await flush();
        const cm = await api('POST', `/api/posts/${live.id}/comments`, { text: t });
        drawer.draft.comments.push(cm); live.comments.push(structuredClone(cm));
        renderDrawerKeepScroll();
      } catch (err) { toast(err.message, 5000); el.disabled = false; }
      break;
    }
    case 'save-post': { commitDraft(); const isNew = drawer.isNew; drawer = null; $('#layer').innerHTML = ''; render(); toast(isNew ? 'Dodano treść' : 'Zapisano zmiany'); break; }
    case 'del-post': if (!confirm('Usunąć tę treść?')) return; state.posts = state.posts.filter(p => p.id !== drawer.draft.id); save(true); drawer = null; $('#layer').innerHTML = ''; render(); toast('Usunięto'); break;
    case 'dup-post': { if (drawer.dirty) commitDraft(); const copy = { ...structuredClone(drawer.draft), id: uid(), title: drawer.draft.title + ' (kopia)', comments: [], approval: 'draft', published: false, publishedAt: '', unread: false };
      openDrawer(copy, true); drawer.dirty = true; toast('Utworzono kopię – ustaw termin i zapisz'); break; }
    // portal
    case 'pf': ui.portalFilter = el.dataset.v; render(); break;
    case 'pview': ui.portalView = el.dataset.v; render(); break;
    case 'portal-jump': ui.portalView = 'list'; ui.portalFilter = 'all'; render(); setTimeout(() => $(`#post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); break;
    case 'ppv': { const p = state.posts.find(x => x.id === id), c = clientById(p.clientId);
      $(`[data-pv="${id}"]`).innerHTML = previewFor(p, c, el.dataset.v);
      $$('button', el.parentElement).forEach(b => b.classList.toggle('on', b === el)); break; }
    case 'c-accept': clientAction(id, 'accept', el); break;
    case 'c-changes': clientAction(id, 'changes', el); break;
    case 'c-comment': clientAction(id, 'comment', el); break;
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.f && drawer) {
    const d = drawer.draft, k = t.dataset.f;
    d[k] = k === 'published' ? t.value === '1' : t.value;
    drawer.dirty = true;
    if (k === 'date' && t.value) d.month = t.value.slice(0, 7);
    if (k === 'month' && t.value && d.week && !weeksOfMonth(t.value).includes(d.week)) d.week = weeksOfMonth(t.value)[0];
    if (['published', 'clientId', 'approval', 'pillar', 'month'].includes(k)) { if (k === 'published' && d.published && !d.publishedAt) d.publishedAt = TODAY; renderDrawerKeepScroll(); }
    else refreshPreview();
    if (k === 'copyMeta' || k === 'copyLi') { const tab = $(`.captabs [data-v="${k === 'copyLi' ? 'li' : 'meta'}"] .dot`); if (tab && t.value.trim()) tab.remove(); }
    return;
  }
  if (t.dataset.cfield) { const c = clientById(route().id); c[t.dataset.cfield] = t.value; save();
    if (t.dataset.cfield === 'color' || t.dataset.cfield === 'name') rerenderKeepFocus(t, `[data-cfield="${t.dataset.cfield}"]`);
    return; }
  if (t.dataset.pfield) { const c = clientById(route().id); const [i, k] = t.dataset.pfield.split('.'); const pl = c.pillars[+i];
    if (k === 'name') { const old = pl.name; state.posts.forEach(p => { if (p.clientId === c.id && p.pillar === old) p.pillar = t.value; }); }
    pl[k] = t.value; save();
    if (k === 'color') rerenderKeepFocus(t, `[data-pfield="${t.dataset.pfield}"]`);
    return; }
  if (t.dataset.week) { const md = monthDataW(route().id, t.dataset.mk); if (t.value.trim()) md.weeks[t.dataset.week] = t.value; else delete md.weeks[t.dataset.week]; save(); return; }
  if (t.dataset.notes) { monthDataW(route().id, t.dataset.notes).notes = t.value; save(); return; }
  if (t.dataset.bind === 'q') { ui.q = t.value; rerenderKeepFocus(t, '[data-bind="q"]', 250); return; }
  if (t.dataset.actInput === 'reviewer') setReviewer(t.value);
  if (t.id === 'impNewName' && imp) imp.newName = t.value;
});
function rerenderKeepFocus(t, sel, ms = 600) {
  clearTimeout(t._r);
  t._r = setTimeout(() => { const pos = t.selectionStart; render(); const n = $(sel); n?.focus(); try { n?.setSelectionRange(pos, pos); } catch {} }, ms);
}
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.bind === 'st') { ui.st = t.value; render(); return; }
  if (!imp) return;
  if (t.id === 'impClient') { imp.client = t.value; renderImport(); }
  else if (t.id === 'impReplace') imp.replace = t.checked;
  else if (t.dataset.impOn) { imp.an.sheets.find(s => s.name === t.dataset.impOn).on = t.checked; renderImport(); }
  else if (t.dataset.impCh) { const s = imp.an.sheets.find(s => s.name === t.dataset.impCh); s.channel = t.value; s.headers.forEach(h => { s.map[h.c] = guessField(h.text, s.layout, s.channel); }); renderImport(); }
  else if (t.dataset.impMap) { const s = imp.an.sheets.find(s => s.name === t.dataset.impMap); s.map[t.dataset.col] = t.value;
    const open = $$('.imp-sheet details').map(d => d.open); renderImport(); $$('.imp-sheet details').forEach((d, i) => { d.open = open[i]; }); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#notif')) { closeNotif(); return; }
  if (lb) {
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { lb.i = Math.max(0, Math.min(lb.p.media.length - 1, lb.i + (e.key === 'ArrowLeft' ? -1 : 1))); renderLb(); }
    return;
  }
  if (e.key === 'Escape') { if (modalOpen) { if (!imp?.busy) { closeModal(); imp = null; } } else if (drawer) closeDrawer(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && drawer) $('[data-act="save-post"]')?.click();
  if (e.key === 'Enter' && modalOpen && e.target.id?.startsWith('nc')) $('[data-act="create-client"]')?.click();
});
document.addEventListener('paste', e => {
  if (!drawer) return;
  const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); addMedia(files); toast('Wklejono obraz'); }
});

// drag & drop: calendar re-scheduling, media drop zone, excel drop
let dragId = null;
document.addEventListener('dragstart', e => { const c = e.target.closest?.('.chip[draggable=true]'); if (c) { dragId = c.dataset.id; e.dataTransfer.effectAllowed = 'move'; } });
document.addEventListener('dragover', e => {
  const day = e.target.closest?.('.cal .d'); const drop = e.target.closest?.('#drop');
  if ((day && dragId) || e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  $$('.cal .d.over').forEach(x => x !== day && x.classList.remove('over')); if (day && dragId) day.classList.add('over');
  $('#drop')?.classList.toggle('over', !!drop);
});
document.addEventListener('drop', e => {
  const day = e.target.closest?.('.cal .d');
  if (day && dragId) { e.preventDefault(); const p = state.posts.find(x => x.id === dragId);
    if (p && p.date !== day.dataset.date) { p.date = day.dataset.date; p.month = p.date.slice(0, 7); p.week = ''; save(); toast(`Zaplanowano na ${fmtShort(p.date)}`); } dragId = null; render(); return; }
  const files = [...(e.dataTransfer?.files || [])];
  if (!files.length) return;
  e.preventDefault(); $('#drop')?.classList.remove('over');
  const xl = files.find(f => /\.xlsx$/i.test(f.name));
  if (xl && !drawer) { const r = route(); startImport(xl, r.name === 'client' ? r.id : undefined); return; }
  if (drawer) addMedia(files);
});
document.addEventListener('dragend', () => { dragId = null; $$('.cal .d.over').forEach(x => x.classList.remove('over')); });

// zmiany zespołu i decyzje klientów: odświeżamy po powrocie do karty i co minutę
const quietReload = () => reload().catch(() => {});
window.addEventListener('focus', quietReload);
setInterval(() => { if (document.visibilityState === 'visible') quietReload(); }, 60000);

/* ================= powiadomienia (dzwonek) ================= */
const NOTIF_KIND = { accept: ['✓', 'Akceptacja'], changes: ['✎', 'Prośba o zmiany'], comment: ['💬', 'Komentarz'] };
function fmtAgo(ts) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  if (min < 24 * 60) return `${Math.round(min / 60)} godz. temu`;
  return fmtTs(ts);
}
function updateBell() {
  const b = $('.bell'); if (!b) return;
  b.innerHTML = ICON.bell + (notifs.unread ? `<span class="dot">${notifs.unread > 99 ? '99+' : notifs.unread}</span>` : '');
}
let notifPrevSeen = 0;
async function openNotif() {
  notifPrevSeen = notifs.seenAt;  // to, co przyszło od ostatniego przeglądania, zostaje wyróżnione
  renderNotif();
  try { notifs = await api('POST', '/api/notifications/seen'); updateBell(); } catch { /* lista i tak jest widoczna */ }
}
function closeNotif() { $('#notif')?.remove(); }
function renderNotif() {
  let el = $('#notif');
  if (!el) { el = document.createElement('div'); el.id = 'notif'; document.body.appendChild(el); }
  const items = notifs.items.map(n => {
    const p = state.posts.find(x => x.id === n.postId), c = clientById(n.clientId);
    const [ic, label] = NOTIF_KIND[n.kind] || ['•', n.kind];
    return `<div class="notif-it ${n.at > notifPrevSeen ? 'new' : ''}" data-act="notif-open" data-id="${esc(n.postId)}">
      <span class="ic ${esc(n.kind)}">${ic}</span>
      <div class="tx"><b>${label}</b> · ${esc(c?.name || 'klient')}<br>${esc(n.author)}${p ? ` – „${esc(p.title || 'Bez tematu')}”` : ''}
        ${n.text ? `<q>${esc(n.text)}</q>` : ''}<div class="when">${fmtAgo(n.at)}</div></div></div>`;
  }).join('');
  el.innerHTML = `<div class="notif-overlay" data-act="notif-close"></div>
    <div class="notif" role="dialog" aria-label="Powiadomienia"><div class="notif-h"><h3>Powiadomienia od klientów</h3><span class="grow"></span><button class="btn ghost icon" data-act="notif-close" title="Zamknij">✕</button></div>
    <div class="notif-b">${items || '<div class="empty small">Na razie cisza. Tu pojawią się akceptacje, prośby o zmiany i komentarze klientów.</div>'}</div></div>`;
}
function openPostFromNotif(postId) {
  closeNotif();
  const p = state.posts.find(x => x.id === postId);
  if (!p) { toast('Tej treści już nie ma w planie.'); return; }
  ui.month = postMonth(p);
  const target = `#/k/${p.clientId}/plan`;
  if (location.hash !== target) location.hash = target; else render();
  setTimeout(() => openDrawer(p, false), 60);
}
async function pollNotifs() {
  if (PORTAL_TOKEN || !me) return;
  try {
    const prevTop = notifs.items[0]?.id ?? 0;
    notifs = await api('GET', '/api/notifications');
    updateBell();
    const fresh = notifs.items.filter(n => n.id > prevTop);
    if (prevTop && fresh.length) {
      const n = fresh[0], c = clientById(n.clientId);
      toast(`🔔 ${NOTIF_KIND[n.kind]?.[1] || 'Nowe zdarzenie'} – ${c?.name || 'klient'} (${n.author})${fresh.length > 1 ? ` i ${fresh.length - 1} więcej` : ''}`, 5000);
      quietReload();
    }
    if ($('#notif')) renderNotif();
  } catch { /* spróbujemy przy następnym sprawdzeniu */ }
}
setInterval(() => { if (document.visibilityState === 'visible') pollNotifs(); }, 30000);

/* ================= zespół ================= */
async function openTeam() {
  let users;
  try { users = await api('GET', '/api/users'); } catch (e) { return toast(e.message, 5000); }
  modal(`<div class="modal-h"><h2 style="font-size:18px">Zespół</h2><div class="small muted" style="margin-top:4px">Konta osób z agencji. Klienci nie potrzebują kont – dostają link do swojego planu.</div></div>
    <div class="modal-b">
      <div class="team">${users.map(u => `<div class="team-row ${u.active ? '' : 'off'}">
        <span class="av" style="width:30px;height:30px;font-size:12px;background:${u.active ? '#4f46e5' : '#9ca3af'}">${esc(initials(u.name))}</span>
        <div class="grow" style="min-width:0"><div style="font-weight:600">${esc(u.name)} ${u.role === 'admin' ? '<span class="badge s-pub">admin</span>' : ''} ${u.active ? '' : '<span class="badge s-draft">wyłączone</span>'}</div><div class="small muted">${esc(u.email)}</div></div>
        ${u.id === me.id ? '<span class="small muted">to Ty</span>' : `<button class="btn sm" data-act="user-reset" data-id="${u.id}">Nowe hasło</button>
          <button class="btn sm ${u.active ? 'bad' : ''}" data-act="user-toggle" data-id="${u.id}">${u.active ? 'Wyłącz' : 'Włącz'}</button>`}</div>`).join('')}</div>
      <div class="sec" style="margin-top:18px">Dodaj osobę</div>
      <div class="two"><div class="field"><label>Imię i nazwisko</label><input class="input" id="nuName"></div><div class="field"><label>E-mail</label><input class="input" id="nuEmail" type="email"></div></div>
      <div class="two"><div class="field"><label>Hasło startowe <span class="hint">min. 8 znaków – przekaż je tej osobie</span></label><input class="input" id="nuPass" value="${esc(randomPassword())}"></div>
        <div class="field"><label>Rola</label><select class="select" id="nuRole"><option value="member">Członek zespołu</option><option value="admin">Administrator (zarządza zespołem)</option></select></div></div>
    </div>
    <div class="modal-f"><button class="btn" data-act="close-modal">Zamknij</button><button class="btn primary" data-act="user-add">Dodaj osobę</button></div>`);
}
function randomPassword() {
  const a = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), b => a[b % a.length]).join('');
}
async function addUser() {
  const body = { name: $('#nuName').value.trim(), email: $('#nuEmail').value.trim(), password: $('#nuPass').value, role: $('#nuRole').value };
  if (!body.email) { $('#nuEmail').focus(); return; }
  try { await api('POST', '/api/users', body); toast(`Dodano ${body.name || body.email}. Przekaż tej osobie e-mail i hasło startowe.`, 5000); openTeam(); }
  catch (e) { toast(e.message, 5000); }
}
async function toggleUser(id) {
  const row = await api('GET', '/api/users').then(us => us.find(u => u.id === id));
  if (!row) return;
  if (row.active && !confirm(`Wyłączyć konto ${row.name}? Ta osoba nie zaloguje się, dopóki go nie włączysz.`)) return;
  try { await api('PATCH', `/api/users/${id}`, { active: !row.active }); openTeam(); } catch (e) { toast(e.message, 5000); }
}
async function resetUser(id) {
  const pass = randomPassword();
  if (!confirm('Ustawić tej osobie nowe hasło? Stare przestanie działać.')) return;
  try { await api('PATCH', `/api/users/${id}`, { password: pass }); prompt('Nowe hasło – skopiuj i przekaż tej osobie:', pass); } catch (e) { toast(e.message, 5000); }
}
function openPassword() {
  modal(`<div class="modal-h"><h2 style="font-size:18px">Zmień hasło</h2></div>
    <div class="modal-b"><div class="field"><label>Obecne hasło</label><input class="input" id="pwOld" type="password" autocomplete="current-password"></div>
      <div class="field"><label>Nowe hasło <span class="hint">min. 8 znaków</span></label><input class="input" id="pwNew" type="password" autocomplete="new-password"></div></div>
    <div class="modal-f"><button class="btn" data-act="close-modal">Anuluj</button><button class="btn primary" data-act="password-save">Zapisz</button></div>`);
}
async function savePassword() {
  try { await api('POST', '/api/me/password', { current: $('#pwOld').value, new: $('#pwNew').value }); closeModal(); toast('Hasło zmienione'); }
  catch (e) { toast(e.message, 5000); }
}

/* ================= boot ================= */
(async () => {
  try {
    if (PORTAL_TOKEN) ui.month = TODAY.slice(0, 7);
    await reload(true);
  } catch (e) {
    $('#app').innerHTML = `<div class="portal"><div class="card"><div class="empty"><b>${PORTAL_TOKEN ? 'Nie udało się otworzyć planu' : 'Nie udało się wczytać danych'}</b>${esc(e.message)}</div></div></div>`;
  }
})();
