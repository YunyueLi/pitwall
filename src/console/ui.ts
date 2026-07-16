/**
 * The AgentOS console — one self-contained page, zero external assets.
 * Design language: deep-space glass. Everything renders from the ledger via
 * /api/state + /api/stream (SSE); the page holds no truth of its own.
 *
 * Client JS avoids template literals so the whole page can live inside one
 * backtick string.
 */
export const UI_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentOS</title>
<style>
  :root {
    --ink: #eef0f6; --ink-dim: #9aa3b5; --ink-faint: #626b7d;
    --violet: #8b7cf7; --emerald: #34d39b; --amber: #f5b84f; --rose: #f0708a;
    --hairline: rgba(255,255,255,.09); --hairline-2: rgba(255,255,255,.16);
    --shell: rgba(255,255,255,.035); --core: rgba(13,14,18,.78);
    --ease: cubic-bezier(.32,.72,0,1);
    --r-lg: 1.6rem; --r-in: calc(1.6rem - 7px);
    --font: "SF Pro Display", "SF Pro Text", ui-sans-serif, system-ui, "Segoe UI Variable", sans-serif;
    --mono: "SF Mono", ui-monospace, "Cascadia Code", monospace;
  }
  * { box-sizing: border-box; }
  html { background: #050505; }
  body {
    margin: 0; color: var(--ink); font: 14px/1.55 var(--font);
    -webkit-font-smoothing: antialiased; min-height: 100dvh;
    overflow-x: hidden;
  }
  /* ---- ambient stage ---- */
  .stage { position: fixed; inset: 0; z-index: -2; background: #050505; }
  .orb { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .55; }
  .orb.v { width: 44vw; height: 44vw; left: -12vw; top: -18vw; background: radial-gradient(circle, rgba(112,92,255,.34), transparent 65%); }
  .orb.e { width: 38vw; height: 38vw; right: -10vw; top: 22vh; background: radial-gradient(circle, rgba(38,220,155,.16), transparent 65%); }
  .orb.b { width: 50vw; height: 30vw; left: 24vw; bottom: -22vw; background: radial-gradient(circle, rgba(90,130,255,.14), transparent 70%); }
  .grain {
    position: fixed; inset: 0; z-index: 60; pointer-events: none; opacity: .05;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  }
  /* ---- shells (double bezel) ---- */
  .shell {
    background: var(--shell); border: 1px solid var(--hairline);
    border-radius: var(--r-lg); padding: 7px;
  }
  .core {
    background: var(--core); border-radius: var(--r-in);
    border: 1px solid rgba(255,255,255,.05);
    box-shadow: inset 0 1px 1px rgba(255,255,255,.07);
    padding: 18px;
  }
  /* ---- top island ---- */
  .island {
    position: sticky; top: 14px; z-index: 40;
    margin: 14px auto 26px; max-width: 1460px;
    display: flex; align-items: center; gap: 14px;
    padding: 10px 12px 10px 20px;
    background: rgba(10,11,15,.62); backdrop-filter: blur(28px) saturate(1.5);
    border: 1px solid var(--hairline); border-radius: 999px;
    box-shadow: 0 18px 50px -22px rgba(0,0,0,.85), inset 0 1px 1px rgba(255,255,255,.08);
  }
  .wordmark { display: flex; align-items: center; gap: 10px; font-weight: 650; letter-spacing: -.02em; font-size: 15px; }
  .logo-orb {
    width: 22px; height: 22px; border-radius: 50%; flex: none;
    background: conic-gradient(from 210deg, #8b7cf7, #34d39b, #4f8dff, #8b7cf7);
    box-shadow: 0 0 18px rgba(139,124,247,.55), inset 0 0 6px rgba(0,0,0,.4);
  }
  .island .goalline { flex: 1 1 auto; min-width: 0; color: var(--ink-dim); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pill {
    display: inline-flex; align-items: center; gap: 7px; border-radius: 999px;
    padding: 5px 13px; font-size: 11px; letter-spacing: .06em; font-weight: 560;
    border: 1px solid var(--hairline-2); color: var(--ink-dim); background: rgba(255,255,255,.03);
    white-space: nowrap;
  }
  .pill .led { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-faint); }
  .pill.running .led { background: var(--emerald); box-shadow: 0 0 10px var(--emerald); animation: breathe 2.2s var(--ease) infinite; }
  .pill.paused .led, .pill.awaiting-review .led { background: var(--amber); box-shadow: 0 0 10px var(--amber); }
  .pill.done .led { background: var(--violet); box-shadow: 0 0 10px var(--violet); }
  .pill.failed .led { background: var(--rose); }
  @keyframes breathe { 50% { opacity: .35; } }
  .cost { font-family: var(--mono); font-size: 11.5px; color: var(--ink-dim); }
  /* ---- buttons ---- */
  button { font: inherit; cursor: pointer; }
  .btn {
    display: inline-flex; align-items: center; gap: 9px;
    border-radius: 999px; padding: 8px 8px 8px 16px;
    background: rgba(255,255,255,.05); color: var(--ink);
    border: 1px solid var(--hairline-2); font-size: 12.5px; font-weight: 560;
    transition: transform .5s var(--ease), background .5s var(--ease), border-color .5s var(--ease);
  }
  .btn:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.26); }
  .btn:active { transform: scale(.97); }
  .btn .cap {
    width: 24px; height: 24px; border-radius: 50%; flex: none;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.08); transition: transform .5s var(--ease);
  }
  .btn:hover .cap { transform: translate(2px,-1px) scale(1.06); }
  .btn.primary { background: linear-gradient(135deg, #8b7cf7, #6a5df0); border-color: rgba(139,124,247,.6); color: #0b0b12; }
  .btn.primary .cap { background: rgba(0,0,0,.18); color: #0b0b12; }
  .btn.primary:hover { background: linear-gradient(135deg, #9a8cfb, #7668f4); }
  .btn.ghost-danger { color: var(--rose); border-color: rgba(240,112,138,.35); padding: 8px 16px; }
  .btn.ghost-danger:hover { background: rgba(240,112,138,.08); }
  .btn.tiny { padding: 4px 10px; font-size: 11px; gap: 6px; }
  .btn.tiny .cap { width: 18px; height: 18px; }
  /* ---- layout ---- */
  .wrap { max-width: 1460px; margin: 0 auto; padding: 0 22px 120px; display: grid; grid-template-columns: minmax(0,1fr) 372px; gap: 20px; }
  .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: .22em; color: var(--ink-faint); font-weight: 620; margin: 0 0 12px 4px; display: flex; align-items: center; gap: 8px; }
  .eyebrow .count { color: var(--ink-dim); font-family: var(--mono); letter-spacing: 0; }
  section { margin-bottom: 22px; }
  /* ---- board ---- */
  .board { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
  .col-head { display: flex; align-items: center; gap: 8px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); font-weight: 620; padding: 2px 6px 10px; }
  .col-head .k { width: 6px; height: 6px; border-radius: 50%; }
  .col.planned .k { background: var(--ink-faint); }
  .col.building .k { background: var(--emerald); box-shadow: 0 0 8px var(--emerald); }
  .col.review .k { background: var(--amber); box-shadow: 0 0 8px var(--amber); }
  .col.done .k { background: var(--violet); box-shadow: 0 0 8px var(--violet); }
  .col .lane { display: flex; flex-direction: column; gap: 10px; min-height: 60px; }
  .task {
    border-radius: 1.1rem; border: 1px solid var(--hairline);
    background: rgba(255,255,255,.035); padding: 6px; cursor: pointer;
    transition: transform .55s var(--ease), border-color .55s var(--ease);
  }
  .task:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.2); }
  .task .in { background: rgba(12,13,17,.72); border-radius: calc(1.1rem - 5px); padding: 12px 13px; border: 1px solid rgba(255,255,255,.04); box-shadow: inset 0 1px 1px rgba(255,255,255,.05); }
  .task .t { font-size: 12.8px; font-weight: 560; letter-spacing: -.008em; line-height: 1.4; }
  .task .m { display: flex; align-items: center; gap: 8px; margin-top: 9px; font-size: 10.5px; color: var(--ink-faint); }
  .task .m .who { display: inline-flex; align-items: center; gap: 5px; }
  .task.working .in { border-color: rgba(52,211,155,.25); }
  .task.working { border-color: rgba(52,211,155,.3); box-shadow: 0 0 26px -12px rgba(52,211,155,.5); }
  .task.review-glow { border-color: rgba(245,184,79,.3); box-shadow: 0 0 26px -12px rgba(245,184,79,.5); }
  .task.done-fade .t { color: var(--ink-dim); }
  .task .crit { margin: 8px 0 0; padding: 0; list-style: none; display: none; }
  .task.open .crit { display: block; }
  .task .crit li { font-size: 11px; color: var(--ink-dim); padding: 3px 0 3px 18px; position: relative; }
  .task .crit li::before { content: ""; position: absolute; left: 2px; top: 8px; width: 8px; height: 8px; border-radius: 3px; border: 1px solid var(--ink-faint); }
  .task.col-done .crit li::before { background: var(--violet); border-color: var(--violet); }
  .task .desc { display: none; font-size: 11.5px; color: var(--ink-dim); margin-top: 8px; line-height: 1.5; }
  .task.open .desc { display: block; }
  .avatar { width: 15px; height: 15px; border-radius: 50%; flex: none; }
  .avatar.a0 { background: radial-gradient(circle at 30% 30%, #b6a9ff, #6a5df0); }
  .avatar.a1 { background: radial-gradient(circle at 30% 30%, #7ff0c5, #17a97a); }
  .board-empty { grid-column: 1 / -1; }
  .board-empty .core { display: flex; align-items: center; gap: 14px; color: var(--ink-dim); font-size: 13px; padding: 22px; }
  .shimmer { width: 26px; height: 26px; border-radius: 50%; flex: none; border: 2px solid rgba(255,255,255,.1); border-top-color: var(--violet); animation: spin 1.1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  /* ---- agents rail ---- */
  .agent { display: flex; flex-direction: column; gap: 10px; }
  .agent .rowA { display: flex; align-items: center; gap: 12px; }
  .presence { position: relative; width: 40px; height: 40px; flex: none; }
  .presence .face { position: absolute; inset: 4px; border-radius: 50%; }
  .presence .ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--hairline-2); }
  .presence.working .ring { border: none; background: conic-gradient(from 0deg, transparent 10%, var(--emerald)); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px)); mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px)); animation: spin 1.6s linear infinite; }
  .presence.paused .ring { border-color: rgba(245,184,79,.6); border-style: dashed; }
  .agent .who { min-width: 0; }
  .agent .who .n { font-weight: 620; font-size: 13.5px; letter-spacing: -.01em; display: flex; gap: 8px; align-items: baseline; }
  .agent .who .r { font-size: 10px; text-transform: uppercase; letter-spacing: .18em; color: var(--ink-faint); margin-top: 1px; }
  .agent .statline { font-size: 11px; color: var(--ink-dim); }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .metric { background: rgba(255,255,255,.03); border: 1px solid var(--hairline); border-radius: .8rem; padding: 7px 10px; }
  .metric .v { font-family: var(--mono); font-size: 12px; }
  .metric .l { font-size: 9px; text-transform: uppercase; letter-spacing: .14em; color: var(--ink-faint); margin-top: 1px; }
  .agent .acts { display: flex; gap: 6px; }
  /* ---- approvals ---- */
  .approval-shell { border-color: rgba(139,124,247,.4); box-shadow: 0 0 44px -18px rgba(139,124,247,.55); animation: rise .8s var(--ease) both; }
  .approval .g { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--violet); font-weight: 650; }
  .approval .s { font-size: 13px; font-weight: 560; margin: 6px 0 2px; line-height: 1.45; }
  .approval details { margin-top: 6px; }
  .approval input[type=text] { margin-top: 10px; }
  .approval .acts { display: flex; gap: 8px; margin-top: 12px; }
  /* ---- composer ---- */
  textarea, input[type=text], select {
    width: 100%; background: rgba(255,255,255,.04); color: var(--ink);
    border: 1px solid var(--hairline-2); border-radius: .9rem; padding: 10px 12px;
    font: 13px/1.5 var(--font); outline: none;
    transition: border-color .5s var(--ease), background .5s var(--ease);
  }
  textarea:focus, input[type=text]:focus { border-color: rgba(139,124,247,.55); background: rgba(255,255,255,.06); }
  textarea { min-height: 74px; resize: vertical; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip {
    border-radius: 999px; padding: 4px 12px; font-size: 11px; cursor: pointer; user-select: none;
    color: var(--ink-dim); border: 1px solid var(--hairline); background: transparent;
    transition: all .45s var(--ease);
  }
  .chip.on { color: var(--ink); border-color: rgba(139,124,247,.6); background: rgba(139,124,247,.14); }
  .chip.warn.on { border-color: rgba(245,184,79,.6); background: rgba(245,184,79,.12); }
  .composer .rows { display: flex; flex-direction: column; gap: 10px; }
  .composer .foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .hint { font-size: 10.5px; color: var(--ink-faint); line-height: 1.5; }
  /* ---- feed ---- */
  .feed { display: flex; flex-direction: column; gap: 8px; }
  .ev {
    display: flex; gap: 12px; padding: 9px 12px; border-radius: 1rem;
    border: 1px solid transparent; animation: rise .7s var(--ease) both;
  }
  @keyframes rise { from { opacity: 0; transform: translateY(14px); filter: blur(5px); } to { opacity: 1; transform: none; filter: none; } }
  .ev:hover { background: rgba(255,255,255,.025); border-color: var(--hairline); }
  .ev .ico { width: 26px; height: 26px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.05); border: 1px solid var(--hairline); margin-top: 1px; }
  .ev .ico svg { width: 13px; height: 13px; stroke: var(--ink-dim); stroke-width: 1.3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .ev.k-directive .ico { border-color: rgba(245,184,79,.5); } .ev.k-directive .ico svg { stroke: var(--amber); }
  .ev.k-message .ico { border-color: rgba(139,124,247,.45); } .ev.k-message .ico svg { stroke: var(--violet); }
  .ev.k-objection .ico { border-color: rgba(240,112,138,.5); } .ev.k-objection .ico svg { stroke: var(--rose); }
  .ev.k-files .ico svg, .ev.k-ok .ico svg { stroke: var(--emerald); }
  .ev .bd { min-width: 0; flex: 1; }
  .ev .hd { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 10.5px; color: var(--ink-faint); }
  .ev .hd .who { color: var(--ink-dim); font-weight: 600; font-size: 11.5px; }
  .ev .hd .t { font-family: var(--mono); }
  .tag { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--hairline-2); color: var(--ink-dim); }
  .tag.human { color: var(--amber); border-color: rgba(245,184,79,.5); }
  .ev .tx { font-size: 12.5px; color: var(--ink); margin-top: 3px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.55; }
  .ev .tx.dim { color: var(--ink-dim); font-size: 11.5px; }
  .ev .tx.mono { font-family: var(--mono); font-size: 11px; color: var(--ink-dim); }
  details.more summary { cursor: pointer; font-size: 10.5px; color: var(--ink-faint); margin-top: 4px; list-style: none; }
  details.more summary::before { content: "› "; }
  details.more[open] summary::before { content: "⌄ "; }
  details.more pre { background: rgba(255,255,255,.03); border: 1px solid var(--hairline); border-radius: .8rem; padding: 10px; font-size: 10.5px; line-height: 1.5; max-height: 300px; overflow: auto; white-space: pre-wrap; }
  .filebadge { display: inline-block; font-family: var(--mono); font-size: 10.5px; border: 1px solid var(--hairline-2); border-radius: 7px; padding: 1px 8px; margin: 2px 3px 0 0; color: var(--ink-dim); }
  /* ---- criteria list in goal card ---- */
  .goalcard .g { font-size: 14.5px; font-weight: 560; letter-spacing: -.012em; line-height: 1.5; }
  .goalcard ol { margin: 10px 0 0; padding-left: 0; list-style: none; counter-reset: c; }
  .goalcard ol li { counter-increment: c; position: relative; padding: 4px 0 4px 30px; font-size: 12px; color: var(--ink-dim); }
  .goalcard ol li::before {
    content: counter(c, decimal-leading-zero); position: absolute; left: 0; top: 5px;
    font-family: var(--mono); font-size: 10px; color: var(--violet);
  }
  .rail > section { position: relative; }
  @media (max-width: 1080px) {
    .wrap { grid-template-columns: 1fr; padding: 0 14px 90px; }
    .board { grid-template-columns: 1fr 1fr; }
    .island { margin: 10px 10px 20px; }
    .island .goalline { display: none; }
  }
  @media (max-width: 640px) { .board { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="stage"><div class="orb v"></div><div class="orb e"></div><div class="orb b"></div></div>
<div class="grain"></div>

<header class="island">
  <div class="wordmark"><span class="logo-orb"></span>AgentOS</div>
  <span id="statusPill" class="pill"><span class="led"></span><span id="statusTxt">connecting</span></span>
  <div class="goalline" id="goalline"></div>
  <span class="cost" id="costline"></span>
  <button class="btn tiny" id="pauseBtn"><span id="pauseLbl">Pause</span><span class="cap">
    <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" fill="none" stroke-width="1.6"><path d="M9 5v14M15 5v14"/></svg></span>
  </button>
</header>

<div class="wrap">
  <main>
    <section>
      <p class="eyebrow">Mission board <span class="count" id="taskCount"></span></p>
      <div class="board" id="board"></div>
    </section>
    <section>
      <p class="eyebrow">Live activity
        <span style="flex:1"></span>
        <span class="chips" id="filters" style="letter-spacing:0; text-transform:none;"></span>
      </p>
      <div class="shell"><div class="core"><div class="feed" id="feed"></div></div></div>
    </section>
  </main>

  <aside class="rail">
    <section id="approvalsSec" style="display:none">
      <p class="eyebrow">Needs your decision</p>
      <div id="approvals"></div>
    </section>
    <section>
      <p class="eyebrow">Mission</p>
      <div class="shell"><div class="core goalcard">
        <div class="g" id="goal"></div>
        <ol id="criteria"></ol>
      </div></div>
    </section>
    <section>
      <p class="eyebrow">Agents</p>
      <div id="agents" style="display:flex; flex-direction:column; gap:12px;"></div>
    </section>
    <section class="composer">
      <p class="eyebrow">Tell the team</p>
      <div class="shell"><div class="core rows" style="display:flex;">
        <textarea id="dirText" placeholder="Add guidance, change direction, or overrule…"></textarea>
        <div class="chips" id="scopeChips"></div>
        <div class="chips">
          <span class="chip on" data-mode="supplement" id="modeSup">supplement</span>
          <span class="chip" data-mode="override" id="modeOvr">override</span>
          <span class="chip warn" id="intChip">interrupt now</span>
        </div>
        <div class="foot">
          <span class="hint" id="dirHint">Lands at the next turn boundary, with a delivery receipt.</span>
          <button class="btn primary" id="sendBtn">Send<span class="cap">
            <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span></button>
        </div>
      </div></div>
    </section>
  </aside>
</div>

<script>
(function () {
  'use strict';
  var state = null;
  var agentIdx = {};      // name -> 0/1 for avatar hue
  var LAYERS = { message: true, state: true, action: true, detail: false };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function post(path, body) {
    return fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function tstr(ts) { return new Date(ts).toLocaleTimeString([], { hour12: false }); }
  function money(v) { return '$' + (v || 0).toFixed(2); }
  function ktok(agents) {
    var t = 0; agents.forEach(function (a) { t += a.totals.inputTokens + a.totals.outputTokens; });
    return t >= 1000 ? Math.round(t / 1000) + 'k' : String(t);
  }

  // ---------- state ----------
  var refetchTimer = null;
  function scheduleRefetch() {
    if (refetchTimer) return;
    refetchTimer = setTimeout(function () {
      refetchTimer = null;
      fetch('/api/state').then(function (r) { return r.json(); }).then(renderState);
    }, 250);
  }

  var openTasks = {};
  function renderState(s) {
    state = s;
    s.agents.forEach(function (a, i) { agentIdx[a.name] = i % 2; });

    el('statusTxt').textContent = s.status + (s.mode === 'team' ? ' · team' : '');
    el('statusPill').className = 'pill ' + s.status;
    el('goalline').textContent = s.goal;
    var cost = 0; s.agents.forEach(function (a) { cost += a.totals.costUsd; });
    el('costline').textContent = money(cost) + ' · ' + ktok(s.agents) + ' tok';
    el('goal').textContent = s.goal;
    el('criteria').innerHTML = (s.criteria || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
    var isPaused = s.status === 'paused';
    el('pauseLbl').textContent = isPaused ? 'Resume' : 'Pause';

    renderBoard(s);
    renderAgents(s);
    renderApprovals(s);
    renderScopes(s);
  }

  var COLS = [
    { key: 'planned',  title: 'Planned',   match: function (t) { return t.status === 'pending'; } },
    { key: 'building', title: 'Building',  match: function (t) { return t.status === 'in-progress'; } },
    { key: 'review',   title: 'In review', match: function (t) { return t.status === 'needs-review'; } },
    { key: 'done',     title: 'Done',      match: function (t) { return t.status === 'accepted'; } }
  ];

  function renderBoard(s) {
    var tasks = s.tasks.filter(function (t) { return t.status !== 'superseded' && t.status !== 'rejected'; });
    el('taskCount').textContent = tasks.length ? tasks.filter(function (t) { return t.status === 'accepted'; }).length + ' / ' + tasks.length : '';
    if (!tasks.length) {
      var planning = s.mode === 'team';
      el('board').innerHTML = '<div class="board-empty shell"><div class="core">'
        + (planning ? '<span class="shimmer"></span><span>The director is studying the repository and drafting the plan…</span>'
                    : '<span>No tasks yet.</span>')
        + '</div></div>';
      return;
    }
    el('board').innerHTML = COLS.map(function (col) {
      var items = tasks.filter(col.match);
      return '<div class="col ' + col.key + '">'
        + '<div class="col-head"><span class="k"></span>' + col.title + ' <span style="opacity:.5">' + items.length + '</span></div>'
        + '<div class="lane">' + items.map(function (t) { return taskCard(t, col.key); }).join('') + '</div></div>';
    }).join('');
  }

  function taskCard(t, colKey) {
    var glow = colKey === 'building' ? ' working' : colKey === 'review' ? ' review-glow' : colKey === 'done' ? ' done-fade col-done' : '';
    var open = openTasks[t.taskId] ? ' open' : '';
    var crit = (t.criteria || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
    return '<div class="task' + glow + open + '" data-task="' + esc(t.taskId) + '"><div class="in">'
      + '<div class="t">' + esc(t.title) + '</div>'
      + (t.description ? '<div class="desc">' + esc(t.description) + '</div>' : '')
      + (crit ? '<ul class="crit">' + crit + '</ul>' : '')
      + '<div class="m"><span class="who"><span class="avatar a' + (agentIdx[t.assignee] || 0) + '"></span>' + esc(t.assignee) + '</span>'
      + (t.criteria && t.criteria.length ? '<span>' + t.criteria.length + ' criteria</span>' : '')
      + '</div></div></div>';
  }

  el('board').addEventListener('click', function (ev) {
    var n = ev.target.closest('.task');
    if (!n) return;
    var id = n.getAttribute('data-task');
    openTasks[id] = !openTasks[id];
    n.classList.toggle('open');
  });

  function renderAgents(s) {
    el('agents').innerHTML = s.agents.map(function (a, i) {
      var st = a.state;
      return '<div class="shell"><div class="core agent">'
        + '<div class="rowA">'
        + '<span class="presence ' + st + '"><span class="ring"></span><span class="face avatar a' + (i % 2) + '" style="inset:5px"></span></span>'
        + '<div class="who"><div class="n">' + esc(a.name) + '<span class="tag">' + esc(a.role) + '</span></div>'
        + '<div class="r">' + esc(a.adapter) + ' · ' + esc(a.model) + ' · ' + esc(a.sandbox) + '</div></div>'
        + '</div>'
        + '<div class="statline">' + esc(st) + (a.detail ? ' — ' + esc(a.detail) : '') + '</div>'
        + '<div class="metrics">'
        + '<div class="metric"><div class="v">' + a.totals.turns + '</div><div class="l">turns</div></div>'
        + '<div class="metric"><div class="v">' + ktok([a]) + '</div><div class="l">tokens</div></div>'
        + '<div class="metric"><div class="v">' + (a.totals.costUsd ? money(a.totals.costUsd) : '—') + '</div><div class="l">cost</div></div>'
        + '</div>'
        + '<div class="acts">'
        + (st === 'paused'
          ? '<button class="btn tiny" data-act="unpause" data-agent="' + esc(a.name) + '">Resume agent</button>'
          : '<button class="btn tiny" data-act="pause" data-agent="' + esc(a.name) + '">Pause</button>')
        + (st === 'working' ? '<button class="btn tiny ghost-danger" data-act="interrupt" data-agent="' + esc(a.name) + '">Interrupt</button>' : '')
        + '<button class="btn tiny" data-act="raw" data-agent="' + esc(a.name) + '">Raw</button>'
        + '</div>'
        + '</div></div>';
    }).join('');
  }

  el('agents').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var act = b.getAttribute('data-act'), agent = b.getAttribute('data-agent');
    if (act === 'pause') post('/api/agent-pause', { agent: agent, paused: true });
    if (act === 'unpause') post('/api/agent-pause', { agent: agent, paused: false });
    if (act === 'interrupt') post('/api/agent-pause', { agent: agent, paused: true, interrupt: true });
    if (act === 'raw') {
      fetch('/api/raw/' + encodeURIComponent(agent) + '?n=300').then(function (r) { return r.json(); }).then(function (d) {
        var w = window.open('', '_blank');
        w.document.write('<title>raw · ' + esc(agent) + '</title><body style="background:#0a0a0c;color:#c8cede"><pre style="white-space:pre-wrap;font:11px/1.6 monospace;padding:16px">' + d.lines.map(esc).join('\n') + '</pre>');
      });
    }
  });

  function renderApprovals(s) {
    var pend = s.approvals.filter(function (a) { return !a.decision; });
    el('approvalsSec').style.display = pend.length ? '' : 'none';
    el('approvals').innerHTML = pend.map(function (a) {
      return '<div class="shell approval-shell"><div class="core approval">'
        + '<div class="g">' + esc(a.gate) + ' gate</div>'
        + '<div class="s">' + esc(a.summary) + '</div>'
        + (a.detail ? '<details class="more"><summary>details</summary><pre>' + esc(a.detail) + '</pre></details>' : '')
        + '<input type="text" id="note-' + esc(a.approvalId) + '" placeholder="Note — required context if you reject">'
        + '<div class="acts">'
        + '<button class="btn primary" data-appr="allow" data-id="' + esc(a.approvalId) + '">Approve<span class="cap"><svg viewBox="0 0 24 24"><path d="M5 13l5 5L20 7" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button>'
        + '<button class="btn ghost-danger" data-appr="deny" data-id="' + esc(a.approvalId) + '">Reject</button>'
        + '</div></div></div>';
    }).join('');
  }

  el('approvals').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var dec = b.getAttribute('data-appr'), id = b.getAttribute('data-id');
    if (!dec) return;
    var note = document.getElementById('note-' + id);
    post('/api/approval', { approvalId: id, decision: dec, note: note ? note.value : '' });
  });

  // ---------- composer ----------
  var scope = 'all', mode = 'supplement', interrupt = false;
  function renderScopes(s) {
    var names = ['all'].concat(s.agents.map(function (a) { return a.name; }));
    el('scopeChips').innerHTML = names.map(function (n) {
      return '<span class="chip' + (scope === n ? ' on' : '') + '" data-scope="' + esc(n) + '">to: ' + esc(n) + '</span>';
    }).join('');
  }
  el('scopeChips').addEventListener('click', function (ev) {
    var c = ev.target.closest('.chip'); if (!c) return;
    scope = c.getAttribute('data-scope');
    renderScopes(state);
  });
  el('modeSup').addEventListener('click', function () { mode = 'supplement'; el('modeSup').classList.add('on'); el('modeOvr').classList.remove('on'); });
  el('modeOvr').addEventListener('click', function () { mode = 'override'; el('modeOvr').classList.add('on'); el('modeSup').classList.remove('on'); });
  el('intChip').addEventListener('click', function () { interrupt = !interrupt; el('intChip').classList.toggle('on', interrupt);
    el('dirHint').textContent = interrupt ? 'Aborts the current turn and re-delivers immediately.' : 'Lands at the next turn boundary, with a delivery receipt.'; });
  el('sendBtn').addEventListener('click', function () {
    var text = el('dirText').value.trim();
    if (!text) return;
    post('/api/directive', { scope: scope, mode: mode, text: text, interrupt: interrupt })
      .then(function () { el('dirText').value = ''; interrupt = false; el('intChip').classList.remove('on'); });
  });
  el('pauseBtn').addEventListener('click', function () {
    post('/api/run-pause', { paused: !(state && state.status === 'paused') });
  });

  // ---------- feed ----------
  var ICONS = {
    msg: '<svg viewBox="0 0 24 24"><path d="M4 6h16v10H8l-4 4z"/></svg>',
    dir: '<svg viewBox="0 0 24 24"><path d="M12 3v13M6 10l6 6 6-6"/></svg>',
    turn: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z M14 3v5h4"/></svg>',
    gate: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg>',
    task: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    tool: '<svg viewBox="0 0 24 24"><path d="M14 7l3 3L7 20H4v-3z M12 5l3-2 4 4-2 3"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M6 21V4m0 1h11l-2 4 2 4H6"/></svg>'
  };

  function layerOf(e) {
    switch (e.type) {
      case 'run.created': case 'run.status': case 'goal.updated': case 'agent.status':
      case 'task.created': case 'task.updated': case 'approval.requested': case 'approval.resolved':
        return 'state';
      case 'message': case 'directive': case 'note': return 'message';
      case 'files.changed': case 'turn.started': case 'turn.completed': case 'error': return 'action';
      default: return 'detail';
    }
  }

  function feedEntry(env) {
    var e = env.event;
    var origin = env.origin.kind === 'agent' ? env.origin.agent : env.origin.kind;
    var oTag = env.origin.kind === 'human' ? '<span class="tag human">human</span>' : '';
    var ico = ICONS.turn, cls = '', who = '', tx = '', more = '';
    switch (e.type) {
      case 'message':
        ico = e.kind === 'objection' ? ICONS.flag : ICONS.msg;
        cls = e.kind === 'objection' ? 'k-objection' : 'k-message';
        who = esc(e.from) + ' → ' + esc(e.to) + ' <span class="tag">' + esc(e.kind) + '</span>';
        tx = clip(e.text, 500);
        break;
      case 'directive':
        ico = ICONS.dir; cls = 'k-directive';
        who = 'human → ' + esc(e.scope) + ' <span class="tag">' + esc(e.mode) + (e.interrupt ? ' · interrupt' : '') + '</span>';
        tx = clip(e.text, 400);
        break;
      case 'directive.delivered':
        ico = ICONS.dir;
        tx = '<span class="tx dim">delivery receipt — ' + esc(e.agent) + ' has the directive</span>';
        break;
      case 'note':
        ico = ICONS.msg; cls = 'k-directive'; who = 'human note'; tx = clip(e.text, 400); break;
      case 'turn.started':
        tx = '<span class="tx dim">' + esc(e.agent) + ' starts a turn</span>'
          + '<details class="more"><summary>full prompt</summary><pre>' + esc(e.input) + '</pre></details>';
        break;
      case 'turn.completed': {
        var u = e.usage || {};
        var bits = [esc(e.agent), 'turn ' + esc(e.outcome)];
        if (e.durationMs != null) bits.push(Math.round(e.durationMs / 1000) + 's');
        if (u.outputTokens != null) bits.push(u.outputTokens + ' out-tok');
        if (u.costUsd != null) bits.push('$' + u.costUsd.toFixed(3));
        cls = e.outcome === 'ok' ? 'k-ok' : '';
        tx = '<span class="tx dim">' + bits.join(' · ') + (e.error ? ' — <span style="color:var(--rose)">' + esc(e.error) + '</span>' : '') + '</span>';
        break;
      }
      case 'tool.used':
        ico = ICONS.tool;
        tx = '<span class="tx mono">' + esc(e.agent) + ' ▸ ' + esc(e.tool) + ' · ' + esc(e.summary) + '</span>';
        break;
      case 'files.changed':
        ico = ICONS.file; cls = 'k-files';
        tx = '<span class="tx dim">' + (e.agent ? esc(e.agent) + ' · ' : '') + esc(e.source) + '</span><div>'
          + e.changes.map(function (c) { return '<span class="filebadge">' + esc(c.kind[0]) + ' ' + esc(c.path) + '</span>'; }).join('') + '</div>';
        break;
      case 'task.created':
        ico = ICONS.task; who = 'board';
        tx = 'new task — <b>' + esc(e.title) + '</b> → ' + esc(e.assignee);
        break;
      case 'task.updated':
        ico = ICONS.task; who = 'board';
        tx = '<span class="tx dim">task → <b style="color:var(--ink)">' + esc(e.status || 'updated') + '</b>' + (e.note ? ' · ' + esc(e.note) : '') + '</span>';
        break;
      case 'approval.requested':
        ico = ICONS.gate; cls = 'k-message'; who = 'gate';
        tx = '<b>' + esc(e.gate) + '</b> — ' + esc(e.summary);
        break;
      case 'approval.resolved':
        ico = ICONS.gate; who = 'gate';
        tx = '<span class="tx dim">' + (e.decision === 'allow' ? 'approved' : 'rejected') + (e.note ? ' · ' + esc(e.note) : '') + '</span>';
        break;
      case 'run.created':
        ico = ICONS.gate; who = 'run';
        tx = '<span class="tx dim">run created · ' + e.agents.map(function (a) { return esc(a.name) + ' (' + esc(a.role) + ')'; }).join(' + ') + '</span>';
        break;
      case 'run.status':
        who = 'run';
        tx = '<span class="tx dim">status → <b style="color:var(--ink)">' + esc(e.status) + '</b>' + (e.reason ? ' · ' + esc(e.reason) : '') + '</span>';
        break;
      case 'goal.updated':
        ico = ICONS.dir; cls = 'k-directive'; who = 'goal ' + esc(e.mode);
        tx = clip(e.text, 300);
        break;
      case 'agent.status':
        tx = '<span class="tx dim">' + esc(e.agent) + ' → ' + esc(e.state) + (e.detail ? ' (' + esc(e.detail) + ')' : '') + '</span>';
        break;
      case 'agent.registered':
      case 'agent.native-session':
        tx = '<span class="tx mono">' + esc(JSON.stringify(e)).slice(0, 200) + '</span>';
        break;
      case 'error':
        cls = 'k-objection';
        tx = '<span style="color:var(--rose)">' + esc(e.scope) + ' — ' + esc(e.message) + '</span>';
        break;
      default:
        tx = '<span class="tx mono">' + esc(JSON.stringify(e)).slice(0, 240) + '</span>';
    }
    var layer = layerOf(e);
    return '<div class="ev ' + cls + '" data-layer="' + layer + '"' + (LAYERS[layer] ? '' : ' style="display:none"') + '>'
      + '<span class="ico">' + ico + '</span>'
      + '<div class="bd"><div class="hd"><span class="t">' + tstr(env.ts) + '</span>'
      + (who ? '<span class="who">' + who + '</span>' : '<span class="who">' + esc(origin) + '</span>')
      + oTag + '</div>'
      + '<div class="tx">' + tx + '</div></div></div>';
  }

  function clip(text, n) {
    var t = String(text || '');
    if (t.length <= n) return esc(t);
    return esc(t.slice(0, n)) + '… <details class="more"><summary>show all</summary><pre>' + esc(t) + '</pre></details>';
  }

  function appendEvent(env) {
    var div = document.createElement('div');
    div.innerHTML = feedEntry(env);
    var node = div.firstChild;
    el('feed').appendChild(node);
    var feed = el('feed');
    while (feed.children.length > 400) feed.removeChild(feed.firstChild);
  }

  // ---------- filters ----------
  var FLABELS = { message: 'Messages', state: 'State', action: 'Actions', detail: 'Tools' };
  function renderFilters() {
    el('filters').innerHTML = Object.keys(FLABELS).map(function (k) {
      return '<span class="chip' + (LAYERS[k] ? ' on' : '') + '" data-layer="' + k + '">' + FLABELS[k] + '</span>';
    }).join('');
  }
  el('filters').addEventListener('click', function (ev) {
    var k = ev.target.getAttribute('data-layer'); if (!k) return;
    LAYERS[k] = !LAYERS[k];
    renderFilters();
    var nodes = el('feed').children;
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].style.display = LAYERS[nodes[i].getAttribute('data-layer')] ? '' : 'none';
    }
  });

  // ---------- boot ----------
  renderFilters();
  fetch('/api/state').then(function (r) { return r.json(); }).then(function (s) {
    renderState(s);
    var es = new EventSource('/api/stream?since=0');
    es.onmessage = function (m) {
      appendEvent(JSON.parse(m.data));
      scheduleRefetch();
    };
    es.onerror = function () { el('statusTxt').textContent = 'reconnecting…'; };
  });
})();
</script>
</body>
</html>`;
