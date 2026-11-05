/* Asystent AI (Claude): plan miesiąca ze strategii, pisanie treści posta, wczytanie strategii z PDF.
   Wszystko, co proponuje AI, trafia do planu jako szkic – klient widzi treść dopiero po zmianie statusu. */

let aiOn = false;
const aiRun = { plan: null, write: null, busy: false };

if (!PORTAL_TOKEN) api('GET', '/api/ai/status').then(s => {
  aiOn = !!s.enabled;
  if (aiOn && route().name === 'client') render();
}).catch(() => {});

function aiBtn(attrs, label, cls = 'btn') { return aiOn ? `<button class="${cls} ai-btn" ${attrs}>✨ ${label}</button>` : ''; }
const aiWait = msg => `<div class="ai-wait"><span class="spinner"></span><div><b>${esc(msg)}</b><div class="small muted">Claude czyta strategię klienta i pisze propozycje – zwykle 20–60 sekund. Nie zamykaj okna.</div></div></div>`;

/* ---------------- plan miesiąca ---------------- */
function aiPlanOpen(cid) {
  const c = clientById(cid);
  const mk = ui.month === 'all' ? TODAY.slice(0, 7) : ui.month;
  aiRun.plan = { cid, mk, count: 12, meta: true, li: !!c.liName, instructions: '', result: null, pick: new Set(), weeks: true, write: false };
  aiPlanRender();
}
function aiPlanRender() {
  const s = aiRun.plan, c = clientById(s.cid);
  if (aiRun.busy) return modal(`<div class="modal-h"><h2 style="font-size:18px">✨ Plan na ${monthLabel(s.mk).toLowerCase()}</h2></div><div class="modal-b">${aiWait('AI układa plan miesiąca…')}</div>`, true);
  if (!s.result) {
    const has = postsOf(s.cid).filter(p => postMonth(p) === s.mk).length;
    const weak = !(c.pillars || []).length && !c.strategyDoc && !c.strategy;
    return modal(`<div class="modal-h"><h2 style="font-size:18px">✨ Zaplanuj miesiąc z AI – ${esc(c.name)}</h2></div>
      <div class="modal-b">
        <p class="muted" style="margin-top:0">Claude zaproponuje tematy tygodni i treści na podstawie strategii klienta (filary, ton, grupa docelowa, zasady publikacji${c.strategyDoc ? ', pełny dokument strategii' : ''}). Wybierasz, co trafia do planu – jako szkice.</p>
        ${weak ? `<div class="guide" style="margin-bottom:12px">Ten klient nie ma jeszcze filarów ani strategii – plan będzie ogólny. Uzupełnij zakładkę <a href="#/k/${c.id}/profil" data-act="close-modal">Profil, filary i ustawienia</a> albo wczytaj strategię z PDF.</div>` : ''}
        <div class="three">
          <div class="field"><label>Miesiąc</label><input type="month" class="input" id="aiMonth" value="${esc(s.mk)}"></div>
          <div class="field"><label>Liczba nowych treści</label><input type="number" min="1" max="40" class="input" id="aiCount" value="${s.count}"></div>
          <div class="field"><label>Kanały</label><div class="row wrap" style="gap:6px">
            <label class="row small" style="gap:4px"><input type="checkbox" id="aiMeta" ${s.meta ? 'checked' : ''}>FB + IG</label>
            <label class="row small" style="gap:4px"><input type="checkbox" id="aiLi" ${s.li ? 'checked' : ''}>LinkedIn</label></div></div>
        </div>
        ${has ? `<div class="small muted" style="margin:-4px 0 10px">W tym miesiącu jest już ${has} treści – AI je uwzględni i nie będzie dublować tematów.</div>` : ''}
        <div class="field"><label>Wytyczne na ten miesiąc <span class="hint">· opcjonalnie</span></label>
          <textarea class="input" id="aiInstr" rows="4" placeholder="np. 15.11 startuje promocja jesienna, więcej rolek, jeden post o nowym pracowniku, unikamy tematu cen…">${esc(s.instructions)}</textarea></div>
      </div>
      <div class="modal-f"><button class="btn" data-act="close-modal">Anuluj</button><button class="btn primary" data-ai="plan-go">✨ Przygotuj plan</button></div>`, true);
  }
  const r = s.result;
  const weeks = weeksOfMonth(s.mk), md = monthData(s.cid, s.mk);
  const rows = r.posts.map((p, i) => `<label class="ai-row ${s.pick.has(i) ? '' : 'off'}">
      <input type="checkbox" data-ai-pick="${i}" ${s.pick.has(i) ? 'checked' : ''}>
      <div class="ai-when">${p.date ? `<b>${fmtShort(p.date)}</b><span class="small muted">${DOW_LONG[parseYmd(p.date).getDay()]}</span>` : '<span class="small muted">rezerwa</span>'}</div>
      <div class="ai-main"><div class="row wrap" style="gap:6px"><span class="ch">${chIcons(p)}</span><span class="small muted">${esc(p.format)}</span>${pillarChip(c, p.pillar)}</div>
        <div class="ai-title">${esc(p.title)}</div><div class="small">${esc(p.brief)}</div>
        ${p.toConfirm ? `<div class="small" style="color:#b45309;margin-top:2px">❓ ${esc(p.toConfirm)}</div>` : ''}</div></label>`).join('');
  const themes = weeks.filter(w => r.weeks[w]).map(w => `<li><b>Tydzień ${weekNo(w, s.mk)}</b> · ${esc(r.weeks[w])}${md.weeks[w] && md.weeks[w] !== r.weeks[w] ? ` <span class="small muted">(obecnie: ${esc(md.weeks[w])})</span>` : ''}</li>`).join('');
  modal(`<div class="modal-h"><h2 style="font-size:18px">✨ Propozycja planu – ${monthLabel(s.mk).toLowerCase()}</h2></div>
    <div class="modal-b">
      ${r.summary ? `<div class="guide" style="margin-bottom:12px">${esc(r.summary)}</div>` : ''}
      ${themes ? `<div class="sec" style="margin-top:0">Tematy tygodni</div><ul class="ai-weeks">${themes}</ul>
        <label class="row small" style="gap:6px;margin-bottom:8px"><input type="checkbox" id="aiWeeks" ${s.weeks ? 'checked' : ''}>Wpisz tematy tygodni (tylko tam, gdzie są puste)</label>` : ''}
      <div class="row"><div class="sec" style="margin:6px 0">Treści (${r.posts.length})</div><span class="grow"></span>
        <button class="btn sm ghost" data-ai="pick-all">Zaznacz wszystkie</button><button class="btn sm ghost" data-ai="pick-none">Odznacz</button></div>
      <div class="ai-list">${rows}</div>
    </div>
    <div class="modal-f"><button class="btn ghost" data-ai="plan-back">↺ Zmień wytyczne</button><span class="grow"></span>
      <label class="row small" style="gap:6px" title="Dla każdej dodanej treści AI napisze opisy, CTA, hashtagi i tekst na grafikę"><input type="checkbox" id="aiWrite" ${s.write ? 'checked' : ''}>od razu napisz opisy</label>
      <button class="btn" data-act="close-modal">Anuluj</button><button class="btn primary" data-ai="plan-add" ${s.pick.size ? '' : 'disabled'}>Dodaj ${s.pick.size} do planu jako szkice</button></div>`, true);
}
async function aiPlanGo() {
  const s = aiRun.plan;
  s.mk = $('#aiMonth').value || s.mk; s.count = Math.max(1, Math.min(40, +$('#aiCount').value || 12));
  s.meta = $('#aiMeta').checked; s.li = $('#aiLi').checked; s.instructions = $('#aiInstr').value;
  if (!s.meta && !s.li) { toast('Wybierz co najmniej jeden kanał'); return; }
  try { await flush(); } catch {}
  aiRun.busy = true; aiPlanRender();
  try {
    s.result = await api('POST', '/api/ai/plan', { clientId: s.cid, month: s.mk, count: s.count, meta: s.meta, li: s.li, instructions: s.instructions });
    s.pick = new Set(s.result.posts.map((_, i) => i));
  } catch (e) { toast(e.message, 5000); }
  aiRun.busy = false;
  if (aiRun.plan === s && $('#modal')) aiPlanRender();
}
async function aiPlanAdd() {
  const s = aiRun.plan, r = s.result;
  s.write = $('#aiWrite')?.checked;
  if (r.weeks && $('#aiWeeks')?.checked) {
    const md = monthDataW(s.cid, s.mk);
    Object.entries(r.weeks).forEach(([w, t]) => { if (t && !(md.weeks[w] || '').trim()) md.weeks[w] = t; });
  }
  const added = [...s.pick].sort((a, b) => a - b).map(i => {
    const p = r.posts[i];
    return newPost({ clientId: s.cid, date: p.date, month: s.mk, meta: p.meta, li: p.li, format: p.format || 'Post', pillar: p.pillar,
      title: p.title, brief: p.brief, materialBrief: p.materialBrief, toConfirm: p.toConfirm, approval: 'draft', note: 'Propozycja AI – do weryfikacji' });
  });
  state.posts.push(...added);
  ui.month = s.mk; save(true); closeModal(); aiRun.plan = null;
  if (route().name !== 'client' || route().id !== s.cid) location.hash = `#/k/${s.cid}/plan`; else render();
  toast(`Dodano ${added.length} szkiców do planu`);
  if (s.write) aiWriteMany(added.map(p => p.id));
}

/* zbiorcze pisanie opisów – po 3 naraz, każda gotowa treść od razu trafia do planu */
async function aiWriteMany(ids) {
  let done = 0, failed = 0;
  const bar = document.createElement('div'); bar.className = 'ai-progress'; document.body.appendChild(bar);
  const upd = () => { bar.innerHTML = `<span class="spinner"></span> AI pisze opisy: ${done + failed} / ${ids.length}${failed ? ` · błędy: ${failed}` : ''}`; };
  upd();
  const queue = ids.slice();
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift(), p = state.posts.find(x => x.id === id);
      if (!p) { done++; continue; }
      try {
        const out = await api('POST', '/api/ai/write', { clientId: p.clientId, post: p, instructions: '' });
        const cur = state.posts.find(x => x.id === id);
        if (cur) { for (const [k, v] of Object.entries(out)) if (v && aiFieldFits(cur, k) && !String(cur[k] || '').trim()) cur[k] = v; save(); }
        done++;
      } catch (e) { failed++; console.warn(e); }
      upd();
      if (route().name === 'client' && !drawer && !modalOpen) render();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  bar.remove();
  toast(failed ? `Opisy gotowe: ${done}, nie udało się: ${failed}` : `Opisy gotowe (${done})`, 4000);
}

/* ---------------- treść posta w edytorze ---------------- */
const AI_FIELDS = [['title', 'Temat'], ['brief', 'Założenie'], ['copyMeta', 'Opis FB + IG'], ['copyLi', 'Opis LinkedIn'], ['cta', 'CTA'],
  ['hashtags', 'Hashtagi'], ['onGraphic', 'Tekst na grafice'], ['materialBrief', 'Materiał – opis'], ['toConfirm', 'Do potwierdzenia']];
// opis LinkedIn tylko dla postów na LinkedIn, opis FB + IG tylko dla postów na FB + IG
const aiFieldFits = (p, k) => !(k === 'copyLi' && !p.li) && !(k === 'copyMeta' && !p.meta);
function aiWriteOpen() {
  if (!drawer) return;
  aiRun.write = { instructions: aiRun.write?.instructions || '', result: null, pick: new Set() };
  aiWriteRender();
}
function aiWriteRender() {
  const s = aiRun.write, d = drawer?.draft;
  if (!d) return closeModal();
  if (aiRun.busy) return modal(`<div class="modal-h"><h2 style="font-size:18px">✨ Treść z AI</h2></div><div class="modal-b">${aiWait('AI pisze treść posta…')}</div>`, true);
  if (!s.result) {
    const empty = !d.copyMeta.trim() && !d.copyLi.trim();
    return modal(`<div class="modal-h"><h2 style="font-size:18px">✨ ${empty ? 'Napisz treść z AI' : 'Popraw treść z AI'}</h2></div>
      <div class="modal-b">
        <p class="muted" style="margin-top:0">Claude ${empty ? 'napisze opisy, CTA, hashtagi i tekst na grafikę' : 'przepisze treść według wytycznych'} na podstawie tematu, założenia, filaru i strategii klienta. Zobaczysz wynik, zanim cokolwiek się zmieni.</p>
        ${!d.title.trim() && !d.brief.trim() ? '<div class="guide" style="margin-bottom:12px">Post nie ma tematu ani założenia – AI wymyśli temat zgodny z filarem. Lepiej wpisz chociaż krótki pomysł.</div>' : ''}
        <div class="field"><label>Wytyczne <span class="hint">· opcjonalnie</span></label>
          <textarea class="input" id="aiWInstr" rows="4" placeholder="np. krócej, bardziej sprzedażowo, zacznij od pytania, wspomnij o darmowej dostawie…">${esc(s.instructions)}</textarea></div>
        <div class="row wrap" style="gap:6px">${['Krócej', 'Bardziej sprzedażowo', 'Luźniej, bardziej po ludzku', 'Więcej konkretów i ekspertyzy', 'Mocniejszy pierwszy akapit'].map(t => `<button class="btn sm ghost" data-ai="w-chip">${t}</button>`).join('')}</div>
      </div>
      <div class="modal-f"><button class="btn" data-act="close-modal">Anuluj</button><button class="btn primary" data-ai="write-go">✨ ${empty ? 'Napisz' : 'Popraw'}</button></div>`, true);
  }
  const r = s.result;
  const rows = AI_FIELDS.filter(([k]) => aiFieldFits(d, k) && r[k] && r[k].trim() !== String(d[k] || '').trim()).map(([k, l]) => `<label class="ai-field ${s.pick.has(k) ? '' : 'off'}">
      <div class="row"><input type="checkbox" data-ai-wpick="${k}" ${s.pick.has(k) ? 'checked' : ''}><b>${l}</b>${String(d[k] || '').trim() ? '<span class="small muted">· zastąpi obecny tekst</span>' : ''}</div>
      <div class="ai-text">${esc(r[k]).replace(/\n/g, '<br>')}</div></label>`).join('');
  modal(`<div class="modal-h"><h2 style="font-size:18px">✨ Propozycja treści</h2></div>
    <div class="modal-b">${rows || '<div class="small muted">AI nie zaproponowało zmian.</div>'}</div>
    <div class="modal-f"><button class="btn ghost" data-ai="write-back">↺ Inne wytyczne</button><span class="grow"></span>
      <button class="btn" data-act="close-modal">Anuluj</button><button class="btn primary" data-ai="write-apply" ${s.pick.size ? '' : 'disabled'}>Wstaw zaznaczone</button></div>`, true);
}
async function aiWriteGo() {
  const s = aiRun.write, d = drawer.draft;
  s.instructions = $('#aiWInstr').value;
  aiRun.busy = true; aiWriteRender();
  try {
    s.result = await api('POST', '/api/ai/write', { clientId: d.clientId, post: d, instructions: s.instructions });
    // domyślnie zaznaczone: puste pola, a przy poprawkach także opisy, których dotyczyły wytyczne
    const rewrite = !!s.instructions.trim();
    s.pick = new Set(AI_FIELDS.map(([k]) => k).filter(k => aiFieldFits(d, k) && s.result[k]?.trim() && s.result[k].trim() !== String(d[k] || '').trim()
      && (!String(d[k] || '').trim() || (rewrite && ['copyMeta', 'copyLi', 'cta', 'onGraphic'].includes(k)))));
  } catch (e) { toast(e.message, 5000); }
  aiRun.busy = false;
  if (aiRun.write === s && $('#modal')) aiWriteRender();
}
function aiWriteApply() {
  const s = aiRun.write, d = drawer.draft;
  s.pick.forEach(k => { d[k] = s.result[k]; });
  drawer.dirty = true; closeModal();
  if (s.pick.has('copyLi') && !s.pick.has('copyMeta') && d.li) drawer.cap = 'li';
  renderDrawerKeepScroll(); toast('Wstawiono – sprawdź i zapisz treść');
}

/* ---------------- strategia z PDF ---------------- */
async function aiStrategyPdf(cid) {
  const [f] = await pickFiles('application/pdf,.pdf', false);
  if (!f) return;
  const c = clientById(cid);
  aiRun.busy = true;
  modal(`<div class="modal-h"><h2 style="font-size:18px">✨ Wczytywanie strategii</h2></div><div class="modal-b">${aiWait('AI czyta „' + f.name + '”…')}</div>`);
  let r;
  try { const fd = new FormData(); fd.append('file', f); r = await api('POST', '/api/ai/strategy', fd); }
  catch (e) { aiRun.busy = false; closeModal(); toast(e.message, 5000); return; }
  aiRun.busy = false;
  const filled = [];
  if (r.summary) {
    if (!c.strategyDoc?.trim() || confirm('Zastąpić obecny dokument strategii klienta treścią z wczytanego PDF?')) { c.strategyDoc = r.summary; filled.push('dokument strategii'); }
  }
  [['audience', 'grupa docelowa'], ['tone', 'ton'], ['freq', 'zasady publikacji'], ['strategy', 'współgranie filarów'], ['hashtags', 'hashtagi']]
    .forEach(([k, l]) => { if (r[k]?.trim() && !String(c[k] || '').trim()) { c[k] = r[k].trim(); filled.push(l); } });
  let np = 0;
  (r.pillars || []).forEach(p => {
    if (!p.name?.trim() || (c.pillars || []).some(x => pkey(x.name) === pkey(p.name))) return;
    c.pillars.push({ id: uid(), color: PILLAR_COLORS[c.pillars.length % PILLAR_COLORS.length], goal: '', audience: '', desc: '', what: '', examples: '', avoid: '', tips: '', ...p, name: p.name.trim() });
    np++;
  });
  if (np) filled.push(`${np} ${np === 1 ? 'filar' : np < 5 ? 'filary' : 'filarów'}`);
  save(true); closeModal(); render();
  toast(filled.length ? `Uzupełniono: ${filled.join(', ')}. Wypełnione wcześniej pola zostały bez zmian.` : 'Nic nowego do uzupełnienia – profil był już wypełniony.', 6000);
}

/* zaznaczanie bez przebudowy okna (bez mignięcia i utraty przewijania) */
function aiPickUi() {
  $$('[data-ai-pick]').forEach(x => { x.checked = aiRun.plan.pick.has(+x.dataset.aiPick); x.closest('.ai-row').classList.toggle('off', !x.checked); });
  $$('[data-ai-wpick]').forEach(x => x.closest('.ai-field').classList.toggle('off', !x.checked));
  const add = $('[data-ai="plan-add"]');
  if (add) { add.disabled = !aiRun.plan.pick.size; add.textContent = `Dodaj ${aiRun.plan.pick.size} do planu jako szkice`; }
  const ins = $('[data-ai="write-apply"]');
  if (ins) ins.disabled = !aiRun.write.pick.size;
}

/* ---------------- zdarzenia ---------------- */
document.addEventListener('click', e => {
  const pick = e.target.closest('[data-ai-pick]');
  if (pick && e.target === pick) { const i = +pick.dataset.aiPick; pick.checked ? aiRun.plan.pick.add(i) : aiRun.plan.pick.delete(i); aiPickUi(); return; }
  const wpick = e.target.closest('[data-ai-wpick]');
  if (wpick && e.target === wpick) { const k = wpick.dataset.aiWpick; wpick.checked ? aiRun.write.pick.add(k) : aiRun.write.pick.delete(k); aiPickUi(); return; }
  const el = e.target.closest('[data-ai]'); if (!el || aiRun.busy) return;
  const r = route();
  switch (el.dataset.ai) {
    case 'plan-open': aiPlanOpen(el.dataset.client || r.id); break;
    case 'plan-go': aiPlanGo(); break;
    case 'plan-back': aiRun.plan.result = null; aiPlanRender(); break;
    case 'pick-all': aiRun.plan.pick = new Set(aiRun.plan.result.posts.map((_, i) => i)); aiPickUi(); break;
    case 'pick-none': aiRun.plan.pick.clear(); aiPickUi(); break;
    case 'plan-add': aiPlanAdd(); break;
    case 'write-open': aiWriteOpen(); break;
    case 'w-chip': { const t = $('#aiWInstr'); t.value = (t.value.trim() ? t.value.trim() + ', ' : '') + el.textContent.toLowerCase(); t.focus(); break; }
    case 'write-go': aiWriteGo(); break;
    case 'write-back': aiRun.write.result = null; aiWriteRender(); break;
    case 'write-apply': aiWriteApply(); break;
    case 'strategy-pdf': aiStrategyPdf(r.id); break;
  }
});
