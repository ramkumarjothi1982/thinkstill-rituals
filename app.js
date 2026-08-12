const TS = {
  version: '40.0',
  manifest: null,
  rituals: [],
  routing: null,
  current: null,
  originalQuery: '',
  round: 0,
  sessionTried: new Set(),
  sessionMechanisms: new Set(),
  usedKey: '__thinkstill_v40_used_rituals',
  outcomesKey: '__thinkstill_v40_outcomes',
  cycleKey: '__thinkstill_v40_cycle',
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => new Set(norm(s).split(' ').filter(w => w.length > 2));

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; } catch { return fallback; }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function usedSet() { return new Set(loadJSON(TS.usedKey, [])); }
function saveUsed(set) { saveJSON(TS.usedKey, [...set]); }
function outcomes() { return loadJSON(TS.outcomesKey, {}); }

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function isHighRisk(q) {
  const n = norm(q);
  const signals = TS.routing?.highRiskSignals || [];
  return signals.some(x => n.includes(norm(x)));
}

function keywordScore(query, list = []) {
  const n = norm(query);
  const qTokens = tokens(query);
  let score = 0;
  for (const raw of list) {
    const k = norm(raw);
    if (!k) continue;
    if (k.includes(' ') && n.includes(k)) score += 18;
    else if (qTokens.has(k)) score += 5;
    else if (k.length > 4 && n.includes(k)) score += 2;
  }
  return score;
}

function bestSpecialists(query) {
  const highRisk = isHighRisk(query);
  return (TS.routing?.specialists || [])
    .map(s => ({...s, score: keywordScore(query, s.keywords) + (highRisk && s.specialist === 'High-Risk Support Bridge' ? 1000 : 0)}))
    .sort((a,b) => b.score - a.score || b.count - a.count);
}

function historicalBoost(r) {
  const o = outcomes();
  const key = `${r.specialist}||${r.mechanism}`;
  const x = o[key] || {better:0,little:0,notYet:0};
  return x.better * 6 + x.little * 1.5 - x.notYet * 4;
}

function ritualScore(r, query, rankedSpecs) {
  const specRank = rankedSpecs.findIndex(s => s.specialist === r.specialist);
  let score = specRank < 0 ? 0 : Math.max(0, 70 - specRank * 8);
  score += keywordScore(query, r.routingKeywords || []) * 2;
  score += keywordScore(query, [r.moment, r.precisePattern, r.goal, r.mechanism, r.title]);
  score += (4 - Number(r.firstLinePriority || 3)) * 5;
  score += historicalBoost(r);
  if (TS.sessionMechanisms.has(r.mechanism)) score -= 60;
  return score;
}

function resetGlobalCycle() {
  saveJSON(TS.usedKey, []);
  saveJSON(TS.cycleKey, Number(loadJSON(TS.cycleKey, 1)) + 1);
}

function chooseRitual(query, forceDifferentMechanism = false) {
  let used = usedSet();
  if (used.size >= TS.rituals.length) { resetGlobalCycle(); used = new Set(); }
  const rankedSpecs = bestSpecialists(query);
  const highRisk = isHighRisk(query);

  let pool = TS.rituals.filter(r => !used.has(r.id) && !TS.sessionTried.has(r.id));
  if (highRisk) pool = pool.filter(r => r.specialist === 'High-Risk Support Bridge');
  if (forceDifferentMechanism && TS.current) {
    const diff = pool.filter(r => r.mechanism !== TS.current.mechanism);
    if (diff.length) pool = diff;
  }
  if (!pool.length) {
    TS.sessionTried.clear();
    pool = TS.rituals.filter(r => !used.has(r.id));
  }

  pool.sort((a,b) => ritualScore(b, query, rankedSpecs) - ritualScore(a, query, rankedSpecs) || a.id.localeCompare(b.id));
  const chosen = pool[0] || null;
  if (chosen) {
    used.add(chosen.id); saveUsed(used);
    TS.sessionTried.add(chosen.id); TS.sessionMechanisms.add(chosen.mechanism);
  }
  return chosen;
}

function section(label, content, cls='') {
  return `<section class="ritual-section ${cls}"><div class="section-label">${label}</div>${content}</section>`;
}

function renderRitual(r) {
  TS.current = r;
  TS.round += 1;
  $('#status').textContent = `ROUND ${TS.round} · ${r.world} · ${r.specialist}`;
  $('#status').classList.add('active');

  const steps = r.steps.map((s,i) => {
    const m = String(s).match(/^\s*\d+[.)]\s*(.+?)(?:\s+[—–-]\s+)(.+)$/);
    const action = m ? m[1] : `MOVE ${i+1}`;
    const detail = m ? m[2] : s;
    return `<div class="step"><div class="step-no">${i+1}</div><div><strong>${escapeHTML(action)}</strong><p>${escapeHTML(detail)}</p></div></div>`;
  }).join('');

  const tips = r.tips.map(t => `<li>${escapeHTML(t)}</li>`).join('');
  const safetyLines = String(r.safety || '').split(/\n+/).map(x => x.trim()).filter(Boolean).filter(x => norm(x) !== 'safety');
  const pause = safetyLines[0]?.toUpperCase() === 'PAUSE' ? safetyLines.shift() : 'PAUSE';

  $('#ritual').innerHTML = `
    <article class="ritual-card" data-world="${escapeHTML(r.world)}">
      <div class="ritual-topline"><span class="world-chip">${escapeHTML(r.world)}</span><span>${escapeHTML(r.playTime)}</span></div>
      <h1>${escapeHTML(r.title)}</h1>
      ${section('GOAL', `<p class="goal">${escapeHTML(r.goal)}</p>`, 'goal-section')}
      <div class="steps">${steps}</div>
      ${section('WIN', `<p class="win">${escapeHTML(r.win)}</p>`, 'win-section')}
      ${section('TIPS', `<ul class="tips">${tips}</ul>`, 'tips-section')}
      ${section('MIND BEND', `<div class="mind-bend"><span class="bend-mark">↯</span><p>${escapeHTML(r.mindBend)}</p></div>`, 'bend-section')}
      ${section('FORMULA FLOW', `<p class="formula">${escapeHTML(r.formulaFlow)}</p>`, 'formula-section')}
      ${section('SAFETY', `<div class="safety"><strong>${escapeHTML(pause)}</strong>${safetyLines.map(x=>`<p>${escapeHTML(x)}</p>`).join('')}</div>`, 'safety-section')}
    </article>
  `;

  $('#feedback').innerHTML = `
    <div class="feedback-card">
      <span class="eyebrow">CHECK THE SHIFT</span>
      <h2>${escapeHTML(r.feedbackPrompt || 'Did anything shift?')}</h2>
      <div class="feedback-buttons">
        <button data-feedback="better" class="primary">✓ BETTER</button>
        <button data-feedback="little">◇ A LITTLE</button>
        <button data-feedback="notYet">↻ NOT YET</button>
      </div>
      <p class="microcopy">No pretending. Your answer changes what ThinkStill does next.</p>
    </div>`;
  $$('#feedback [data-feedback]').forEach(b => b.addEventListener('click', () => handleFeedback(b.dataset.feedback)));
  $('#ritual').scrollIntoView({behavior:'smooth', block:'start'});
}

function logOutcome(kind) {
  if (!TS.current) return;
  const o = outcomes();
  const key = `${TS.current.specialist}||${TS.current.mechanism}`;
  o[key] ||= {better:0,little:0,notYet:0};
  o[key][kind] = (o[key][kind] || 0) + 1;
  saveJSON(TS.outcomesKey, o);
}

function handleFeedback(kind) {
  logOutcome(kind);
  if (kind === 'better') {
    $('#feedback').innerHTML = `<div class="feedback-card success"><span class="eyebrow">KEEP THE WIN</span><h2>Good. Don’t overwork it.</h2><p>Let the shift stand. ThinkStill has remembered the kind of move that helped.</p><button id="newIssue" class="primary">NEW MOMENT</button></div>`;
    $('#newIssue').onclick = resetSession;
    return;
  }
  if (TS.round >= 3 && TS.current?.safetyTier >= 2) {
    $('#feedback').innerHTML = `<div class="feedback-card caution"><span class="eyebrow">CHANGE SUPPORT TYPE</span><h2>This isn’t shifting enough.</h2><p>Do not force endless resets. Slow down, involve a trusted person or appropriate professional support, and seek urgent help if safety or medical risk is present.</p><button id="newIssue" class="primary">START A DIFFERENT MOMENT</button></div>`;
    $('#newIssue').onclick = resetSession;
    return;
  }
  showRefinements(kind === 'little' ? 'Something moved. What is still strongest?' : 'Okay. What is still strongest?');
}

function showRefinements(title) {
  const opts = TS.current?.feedbackOptions || [];
  $('#feedback').innerHTML = `<div class="feedback-card"><span class="eyebrow">REFINE THE MATCH</span><h2>${escapeHTML(title)}</h2><div class="chips">${opts.map(x=>`<button class="chip" data-refine="${escapeHTML(x)}">${escapeHTML(x)}</button>`).join('')}</div><p class="microcopy">ThinkStill will switch mechanism rather than replay the same approach.</p></div>`;
  $$('#feedback [data-refine]').forEach(b => b.addEventListener('click', () => {
    const q = `${TS.originalQuery}. ${b.dataset.refine}`;
    const next = chooseRitual(q, true);
    if (next) renderRitual(next);
  }));
}

function resetSession() {
  TS.current = null; TS.originalQuery=''; TS.round=0; TS.sessionTried.clear(); TS.sessionMechanisms.clear();
  $('#ritual').innerHTML=''; $('#feedback').innerHTML=''; $('#status').textContent='BUILT FOR DURING'; $('#status').classList.remove('active');
  $('#message').value=''; $('#message').focus(); window.scrollTo({top:0,behavior:'smooth'});
}

function submitMoment() {
  const q = $('#message').value.trim();
  if (!q) return;
  TS.originalQuery = q; TS.round = 0; TS.sessionTried.clear(); TS.sessionMechanisms.clear();
  const r = chooseRitual(q, false);
  if (r) renderRitual(r);
}

async function init() {
  try {
    TS.manifest = await (await fetch('manifest.json', {cache:'no-store'})).json();
    TS.routing = await (await fetch(TS.manifest.routing, {cache:'no-store'})).json();
    TS.rituals = await (await fetch(TS.manifest.rituals, {cache:'no-store'})).json();
    $('#libraryCount').textContent = `${TS.rituals.length} MENTAL MOVES`;
    $('#message').disabled = false; $('#play').disabled = false;
  } catch (e) {
    console.error(e);
    $('#status').textContent='LIBRARY ERROR';
    $('#intro').insertAdjacentHTML('beforeend','<p class="error">ThinkStill could not load its ritual library. Check that manifest.json and rituals.json are uploaded beside index.html.</p>');
  }
  $('#play').addEventListener('click', submitMoment);
  $('#message').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMoment(); } });
  $$('.quick').forEach(b => b.addEventListener('click', () => { $('#message').value=b.dataset.q; submitMoment(); }));
  $('#reset').addEventListener('click', resetSession);
}

window.addEventListener('DOMContentLoaded', init);
