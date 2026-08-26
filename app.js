(function () {
  'use strict';

  var MANIFEST = './manifest.json';
  var state = { manifest: null, rituals: [], routing: null, media: null, current: null, back: [], lastSignal: '', recentBubbles: [] };
  var seen = null;
  var mediaCounters = {};

  var $ = function (id) { return document.getElementById(id); };
  var card = $('ritualCard'), content = $('ritualContent'), empty = $('emptyState'), input = $('input');
  var status = $('status'), avatar = $('avatar'), mediaStage = $('mediaStage'), mediaFrame = $('mediaFrame');
  var backBtn = $('backBtn'), nextBtn = $('nextBtn'), micBtn = $('micBtn');

  function section(label, text, cls) {
    if (!String(text || '').trim()) return '';
    return '<section class="ts-section ' + (cls || '') + '"><div class="ts-label">' + esc(label) + '</div><div class="ts-body">' + esc(text) + '</div></section>';
  }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }

  function avatarFor(r) {
    var url = state.media && state.media.avatars && state.media.avatars[r.bubble];
    if (!url) { avatar.hidden = true; avatar.innerHTML = ''; return; }
    avatar.innerHTML = '<img alt="" src="' + esc(url) + '">';
    avatar.hidden = false;
  }

  function render(r) {
    state.current = r;
    empty.hidden = true; content.hidden = false;
    content.innerHTML =
      '<div class="ts-meta">' + esc(r.bubble + ' · ' + r.play_time + ' Guided Reset') + '</div>' +
      '<h1 class="ts-game-title">' + esc(r.title) + '</h1>' +
      section('MISSION', r.mission) +
      section('ONE RULE', r.rule, 'ts-rule') +
      section('PLAY', r.play) +
      section('TWIST', r.twist) +
      section('WIN', r.win) +
      '<div class="ts-mindbend">' + section('MIND BEND', r.mind_bend) + '</div>' +
      (r.support_first ? '<div class="ts-support">' + section('SUPPORT FIRST', r.support_first) + '</div>' : '');
    card.scrollTop = 0;
    avatarFor(r);
    backBtn.disabled = !state.back.length;
    nextBtn.disabled = !state.lastSignal;
    status.textContent = r.id + ' · ' + r.best_for;
  }

  function commit(r) {
    if (state.current) state.back.push(state.current);
    if (state.back.length > 100) state.back.shift();
    render(r);
  }

  function nextMedia(r) {
    var pool = state.media && state.media.transition_media && state.media.transition_media[r.bubble];
    if (!Array.isArray(pool)) return '';
    pool = pool.filter(Boolean);
    if (!pool.length) return '';
    var i = mediaCounters[r.bubble] || 0;
    var url = pool[i % pool.length];
    mediaCounters[r.bubble] = i + 1;
    return url;
  }

  function showWithTransition(r) {
    var url = nextMedia(r);
    if (!url) { commit(r); return; }
    mediaStage.hidden = false; mediaFrame.innerHTML = '';
    var isVideo = /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(url);
    var done = false;
    function finish() { if (done) return; done = true; mediaStage.hidden = true; mediaFrame.innerHTML = ''; commit(r); }
    if (isVideo) {
      var v = document.createElement('video'); v.src = url; v.autoplay = true; v.muted = true; v.playsInline = true;
      var sec = Number(state.media.video_play_seconds || 0);
      v.loop = sec > 0; v.onended = function () { if (sec <= 0) finish(); }; v.onerror = finish; mediaFrame.appendChild(v);
      if (sec > 0) setTimeout(finish, sec * 1000);
    } else {
      var img = document.createElement('img'); img.src = url; img.onload = function () { setTimeout(finish, Number(state.media.image_hold_ms || 1800)); }; img.onerror = finish; mediaFrame.appendChild(img);
    }
  }

  function choose(signal) {
    var result = ThinkStillRouter.choose(state.rituals, signal, state.routing, { seen: seen, seenKey: state.routing.storage_key, recentBubbles: state.recentBubbles });
    seen = result.seen;
    if (!result.ritual) return;
    state.recentBubbles.unshift(result.ritual.bubble); state.recentBubbles = state.recentBubbles.slice(0, 3);
    showWithTransition(result.ritual);
  }

  function submit() {
    var q = String(input.value || '').trim(); if (!q) return;
    state.lastSignal = q; input.value = ''; nextBtn.disabled = false; choose(q);
  }

  $('enterBtn').addEventListener('click', submit);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  nextBtn.addEventListener('click', function () { if (state.lastSignal) choose(state.lastSignal); });
  backBtn.addEventListener('click', function () {
    if (!state.back.length) return;
    var prev = state.back.pop(); state.current = null; render(prev);
  });
  $('resetBtn').addEventListener('click', function () {
    ThinkStillRouter.clearSeen(state.routing && state.routing.storage_key); seen = new Set();
    state.current = null; state.back = []; state.lastSignal = ''; state.recentBubbles = []; content.hidden = true; content.innerHTML = ''; empty.hidden = false; avatar.hidden = true;
    backBtn.disabled = true; nextBtn.disabled = true; status.textContent = 'Console reset · 750-ID cycle cleared'; input.focus();
  });

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) micBtn.style.display = 'none';
  else {
    var rec = new SpeechRecognition(); rec.lang = 'en-AU'; rec.interimResults = true; rec.continuous = false;
    rec.onstart = function () { micBtn.classList.add('listening'); };
    rec.onend = function () { micBtn.classList.remove('listening'); if (input.value.trim()) submit(); };
    rec.onresult = function (e) { var t = ''; for (var i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; input.value = t.trim(); };
    micBtn.addEventListener('click', function () { try { rec.start(); } catch (_) {} });
  }

  Promise.all([
    ThinkStillLoader.load(MANIFEST),
    fetch('./routing.json', {cache:'no-store'}).then(function (r) { return r.json(); }),
    fetch('./media-config.json', {cache:'no-store'}).then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (all) {
    state.manifest = all[0].manifest; state.rituals = all[0].rituals; state.routing = all[1]; state.media = all[2] || {};
    seen = ThinkStillRouter.loadSeen(state.routing.storage_key);
    status.textContent = '750 rituals ready · ' + seen.size + ' used this cycle'; backBtn.disabled = true; nextBtn.disabled = true; input.focus();
  }).catch(function (err) { status.textContent = 'Library error: ' + (err && err.message ? err.message : err); });
})();
