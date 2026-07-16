/**
 * The console: one self-contained HTML page, served by the control server.
 * No external assets (works offline, nothing leaves the machine). Kept as a
 * TS string so the compiled output needs no asset-copy step.
 *
 * Client-side JS deliberately avoids template literals so this file can hold
 * the page inside one backtick string.
 */
export const UI_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentOS Console</title>
<style>
  :root {
    --bg: #0f1115; --panel: #171a21; --panel2: #1d212b; --border: #2a2f3a;
    --text: #e6e9ef; --dim: #8b93a3; --accent: #6ea8fe; --ok: #4ade80;
    --warn: #fbbf24; --err: #f87171; --purple: #c084fc; --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  @media (prefers-color-scheme: light) {
    :root { --bg:#f5f6f8; --panel:#ffffff; --panel2:#eef0f4; --border:#d8dce4; --text:#1a2029; --dim:#5b6472; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 16px; display: grid; grid-template-columns: 340px 1fr; gap: 16px; }
  @media (max-width: 900px) { .wrap { grid-template-columns: 1fr; } }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 14px; }
  h1 { font-size: 16px; margin: 0 0 4px; display:flex; align-items:center; gap:8px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--dim); margin: 0 0 10px; }
  .badge { display:inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; border:1px solid var(--border); background: var(--panel2); }
  .badge.running { color: var(--ok); border-color: var(--ok); }
  .badge.paused, .badge.awaiting-review { color: var(--warn); border-color: var(--warn); }
  .badge.done { color: var(--accent); border-color: var(--accent); }
  .badge.failed { color: var(--err); border-color: var(--err); }
  .dim { color: var(--dim); } .mono { font-family: var(--mono); font-size: 12px; }
  .goal { white-space: pre-wrap; margin: 6px 0; }
  ol.criteria { margin: 6px 0 0; padding-left: 20px; }
  .agent { border:1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px; background: var(--panel2); }
  .agent .row1 { display:flex; align-items:center; gap:8px; }
  .dot { width:9px; height:9px; border-radius:50%; background: var(--dim); flex:none; }
  .dot.working { background: var(--ok); animation: pulse 1.2s infinite; }
  .dot.paused { background: var(--warn); } .dot.dead { background: var(--err); }
  .dot.awaiting-approval { background: var(--purple); }
  @keyframes pulse { 50% { opacity: .35; } }
  .agent .name { font-weight: 600; }
  .agent .meta { font-size: 12px; color: var(--dim); margin-top: 4px; }
  .agent button { margin-top: 6px; }
  button { background: var(--panel2); color: var(--text); border:1px solid var(--border); border-radius:6px; padding: 4px 10px; cursor:pointer; font-size: 12px; }
  button:hover { border-color: var(--accent); }
  button.primary { background: var(--accent); color:#0b1020; border-color: var(--accent); font-weight:600; }
  button.danger { color: var(--err); border-color: var(--err); }
  textarea, select, input[type=text] { width:100%; background: var(--panel2); color: var(--text); border:1px solid var(--border); border-radius:6px; padding:6px 8px; font: inherit; }
  textarea { min-height: 64px; resize: vertical; }
  .controls-row { display:flex; gap:8px; margin-top:8px; align-items:center; flex-wrap:wrap; }
  .controls-row select { width:auto; }
  .approval { border:1px solid var(--purple); background: color-mix(in srgb, var(--purple) 8%, var(--panel)); border-radius:8px; padding: 10px; margin-bottom:8px; }
  .approval .sum { font-weight:600; }
  .filters { display:flex; gap:6px; flex-wrap:wrap; margin-bottom: 10px; }
  .chip { padding:2px 10px; border-radius:999px; border:1px solid var(--border); cursor:pointer; font-size:12px; color:var(--dim); user-select:none; }
  .chip.on { color: var(--text); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
  .ev { border-left: 3px solid var(--border); padding: 6px 10px; margin: 0 0 8px; }
  .ev .head { font-size: 11px; color: var(--dim); display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .ev .body { margin-top: 2px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .ev.layer-message { border-left-color: var(--accent); }
  .ev.layer-state { border-left-color: var(--purple); }
  .ev.layer-action { border-left-color: var(--ok); }
  .ev.layer-detail { border-left-color: var(--border); }
  .ev.kind-directive { border-left-color: var(--warn); background: color-mix(in srgb, var(--warn) 6%, transparent); }
  .ev.kind-objection { background: color-mix(in srgb, var(--err) 6%, transparent); }
  .from-to { font-weight: 600; color: var(--text); }
  .origin { font-size:10px; padding:0 6px; border-radius:4px; border:1px solid var(--border); }
  .origin.human { color: var(--warn); border-color: var(--warn); }
  .origin.agent { color: var(--accent); }
  details summary { cursor:pointer; color: var(--dim); font-size: 12px; }
  details pre { background: var(--panel2); padding:8px; border-radius:6px; overflow-x:auto; font-size:11px; max-height: 320px; overflow-y:auto; }
  .files li { font-family: var(--mono); font-size: 12px; }
  .cost { font-variant-numeric: tabular-nums; }
  #timeline { max-height: none; }
  .toolbar { display:flex; gap:8px; align-items:center; justify-content: space-between; flex-wrap:wrap; }
</style>
</head>
<body>
<div class="wrap">
  <div id="left">
    <div class="card">
      <h1>AgentOS <span id="runStatus" class="badge">…</span></h1>
      <div class="mono dim" id="runId"></div>
      <div class="mono dim" id="repo"></div>
      <div class="controls-row">
        <button id="pauseRun">Pause run</button>
        <button id="resumeRun">Resume run</button>
        <span class="cost dim" id="totalCost"></span>
      </div>
      <div class="dim" id="statusReason" style="margin-top:6px"></div>
    </div>
    <div class="card">
      <h2>Goal</h2>
      <div class="goal" id="goal"></div>
      <ol class="criteria" id="criteria"></ol>
      <div class="dim" id="goalHist" style="font-size:12px"></div>
    </div>
    <div class="card">
      <h2>Agents</h2>
      <div id="agents"></div>
    </div>
    <div class="card" id="approvalsCard" style="display:none">
      <h2>Awaiting your decision</h2>
      <div id="approvals"></div>
    </div>
    <div class="card">
      <h2>Tell the agents</h2>
      <textarea id="dirText" placeholder="Supplement or override standing instructions…"></textarea>
      <div class="controls-row">
        <select id="dirScope"><option value="all">to: all</option></select>
        <select id="dirMode">
          <option value="supplement">supplement</option>
          <option value="override">override</option>
        </select>
        <label style="font-size:12px"><input type="checkbox" id="dirInt"> interrupt now</label>
        <button class="primary" id="dirSend">Send</button>
      </div>
      <div class="dim" style="font-size:12px; margin-top:6px">Delivered at the target's next turn boundary (immediately if "interrupt"). Delivery is acknowledged in the timeline.</div>
    </div>
    <div class="card">
      <h2>Files changed</h2>
      <ul class="files" id="files"></ul>
    </div>
  </div>
  <div id="right">
    <div class="card">
      <div class="toolbar">
        <h2 style="margin:0">Timeline</h2>
        <div class="filters" id="filters"></div>
      </div>
      <div id="timeline"></div>
    </div>
  </div>
</div>
<script>
(function () {
  'use strict';
  var LAYERS = { state: true, message: true, action: true, detail: false };
  var events = [];
  var state = null;

  function layerOf(e) {
    switch (e.type) {
      case 'run.created': case 'run.status': case 'goal.updated': case 'agent.status':
      case 'task.created': case 'task.updated': case 'approval.requested': case 'approval.resolved':
        return 'state';
      case 'message': case 'directive': case 'note':
        return 'message';
      case 'files.changed': case 'turn.started': case 'turn.completed': case 'error':
        return 'action';
      default:
        return 'detail';
    }
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false }) ;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function post(path, body) {
    return fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function el(id) { return document.getElementById(id); }

  // ---- state rendering ----
  var refetchTimer = null;
  function scheduleStateRefetch() {
    if (refetchTimer) return;
    refetchTimer = setTimeout(function () {
      refetchTimer = null;
      fetch('/api/state').then(function (r) { return r.json(); }).then(renderState);
    }, 300);
  }

  function renderState(s) {
    state = s;
    el('runStatus').textContent = s.status;
    el('runStatus').className = 'badge ' + s.status;
    el('runId').textContent = s.runId;
    el('repo').textContent = s.repo;
    el('statusReason').textContent = s.statusReason || '';
    el('goal').textContent = s.goal;
    var totCost = 0, totOut = 0;
    s.agents.forEach(function (a) { totCost += a.totals.costUsd; totOut += a.totals.outputTokens; });
    el('totalCost').textContent = '$' + totCost.toFixed(4) + ' · ' + totOut.toLocaleString() + ' out-tok';
    el('criteria').innerHTML = (s.criteria || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
    el('goalHist').textContent = s.goalHistory.length > 1 ? (s.goalHistory.length - 1) + ' revision(s); latest wins' : '';

    var scopeSel = el('dirScope');
    var keep = scopeSel.value;
    scopeSel.innerHTML = '<option value="all">to: all</option>' + s.agents.map(function (a) {
      return '<option value="' + esc(a.name) + '">to: ' + esc(a.name) + '</option>';
    }).join('');
    scopeSel.value = keep || 'all';

    el('agents').innerHTML = s.agents.map(function (a) {
      var busy = a.state === 'working';
      return '<div class="agent">'
        + '<div class="row1"><span class="dot ' + a.state + '"></span><span class="name">' + esc(a.name) + '</span>'
        + '<span class="badge">' + esc(a.adapter) + '</span><span class="badge">' + esc(a.role) + '</span>'
        + '<span class="dim" style="font-size:12px">' + esc(a.state) + '</span></div>'
        + '<div class="meta">model ' + esc(a.model) + ' · ' + esc(a.sandbox) + ' · turns ' + a.totals.turns
        + ' · $' + a.totals.costUsd.toFixed(4) + ' · ' + (a.totals.inputTokens + a.totals.outputTokens).toLocaleString() + ' tok'
        + (a.detail ? ' · ' + esc(a.detail) : '') + '</div>'
        + '<div class="controls-row">'
        + (a.state === 'paused'
            ? '<button data-act="unpause" data-agent="' + esc(a.name) + '">Unpause</button>'
            : '<button data-act="pause" data-agent="' + esc(a.name) + '">Pause</button>')
        + (busy ? '<button class="danger" data-act="interrupt" data-agent="' + esc(a.name) + '">Interrupt</button>' : '')
        + '<button data-act="raw" data-agent="' + esc(a.name) + '">Raw output</button>'
        + '</div></div>';
    }).join('');

    var pend = s.approvals.filter(function (a) { return !a.decision; });
    el('approvalsCard').style.display = pend.length ? '' : 'none';
    el('approvals').innerHTML = pend.map(function (a) {
      return '<div class="approval"><div class="sum">' + esc(a.gate) + ': ' + esc(a.summary) + '</div>'
        + (a.detail ? '<details><summary>detail</summary><pre>' + esc(a.detail) + '</pre></details>' : '')
        + '<input type="text" placeholder="note (optional; sent to the agents if you deny)" id="note-' + esc(a.approvalId) + '" style="margin:6px 0">'
        + '<div class="controls-row">'
        + '<button class="primary" data-appr="allow" data-id="' + esc(a.approvalId) + '">Approve</button>'
        + '<button class="danger" data-appr="deny" data-id="' + esc(a.approvalId) + '">Reject</button>'
        + '</div></div>';
    }).join('');

    el('files').innerHTML = s.files.map(function (f) {
      return '<li>' + esc(f.path) + ' <span class="dim">(' + esc(f.kind) + (f.lastAgent ? ' · ' + esc(f.lastAgent) : '') + ')</span></li>';
    }).join('');
  }

  // ---- timeline rendering ----
  function evHtml(env) {
    var e = env.event;
    var layer = layerOf(e);
    var originCls = env.origin.kind;
    var originTxt = env.origin.kind === 'agent' ? env.origin.agent : env.origin.kind;
    var head = '<span>' + fmtTime(env.ts) + '</span><span class="origin ' + originCls + '">' + esc(originTxt) + '</span>';
    var body = '';
    var extraCls = '';
    switch (e.type) {
      case 'message':
        extraCls = ' kind-' + e.kind;
        head += '<span class="from-to">' + esc(e.from) + ' → ' + esc(e.to) + '</span><span class="badge">' + esc(e.kind) + '</span>';
        body = renderLong(e.text);
        break;
      case 'directive':
        extraCls = ' kind-directive';
        head += '<span class="from-to">human → ' + esc(e.scope) + '</span><span class="badge">' + esc(e.mode) + (e.interrupt ? ' · interrupt' : '') + '</span>';
        body = esc(e.text);
        break;
      case 'directive.delivered':
        body = '<span class="dim">directive ' + esc(e.directiveId) + ' delivered to ' + esc(e.agent) + '</span>';
        break;
      case 'note':
        head += '<span class="badge">note</span>';
        body = esc(e.text);
        break;
      case 'turn.started':
        body = '<span class="dim">turn started · ' + esc(e.agent) + '</span>'
          + '<details><summary>prompt</summary><pre>' + esc(e.input) + '</pre></details>';
        break;
      case 'turn.completed': {
        var u = e.usage || {};
        var cost = u.costUsd != null ? ' · $' + u.costUsd.toFixed(4) : '';
        var toks = (u.outputTokens != null) ? ' · ' + u.outputTokens + ' out-tok' : '';
        var dur = e.durationMs != null ? ' · ' + Math.round(e.durationMs / 1000) + 's' : '';
        body = '<span class="dim">turn ' + esc(e.outcome) + ' · ' + esc(e.agent) + dur + toks + cost
          + (e.error ? ' · <span style="color:var(--err)">' + esc(e.error) + '</span>' : '') + '</span>';
        break;
      }
      case 'tool.used':
        body = '<span class="dim mono">' + esc(e.agent) + ' ▸ ' + esc(e.tool) + ': ' + esc(e.summary) + '</span>';
        break;
      case 'files.changed':
        body = '<span class="dim">' + esc(e.source) + (e.agent ? ' · ' + esc(e.agent) : '') + '</span> '
          + e.changes.map(function (c) { return '<span class="badge mono">' + esc(c.kind[0]) + ' ' + esc(c.path) + '</span>'; }).join(' ');
        break;
      case 'task.created':
        body = 'task created: <b>' + esc(e.title) + '</b> → ' + esc(e.assignee);
        break;
      case 'task.updated':
        body = 'task ' + (e.status ? '→ <b>' + esc(e.status) + '</b>' : 'updated') + (e.note ? ' <span class="dim">(' + esc(e.note) + ')</span>' : '');
        break;
      case 'approval.requested':
        body = '<b>approval requested</b> [' + esc(e.gate) + '] ' + esc(e.summary);
        break;
      case 'approval.resolved':
        body = '<b>approval ' + (e.decision === 'allow' ? 'granted' : 'denied') + '</b>' + (e.note ? ': ' + esc(e.note) : '');
        break;
      case 'run.created':
        body = 'run created · goal set · agents: ' + e.agents.map(function (a) { return esc(a.name) + ' (' + esc(a.adapter) + ', ' + esc(a.role) + ')'; }).join(', ');
        break;
      case 'run.status':
        body = 'run → <b>' + esc(e.status) + '</b>' + (e.reason ? ' <span class="dim">(' + esc(e.reason) + ')</span>' : '');
        break;
      case 'goal.updated':
        body = '<b>goal ' + esc(e.mode) + '</b>: ' + esc(e.text);
        break;
      case 'agent.status':
        body = '<span class="dim">' + esc(e.agent) + ' → ' + esc(e.state) + (e.detail ? ' (' + esc(e.detail) + ')' : '') + '</span>';
        break;
      case 'agent.registered':
        body = '<span class="dim">registered ' + esc(e.spec.name) + ' · ' + esc(e.spec.adapter) + ' · ' + esc(e.spec.role) + ' · ' + esc(e.spec.sandbox) + '</span>';
        break;
      case 'agent.native-session':
        body = '<span class="dim mono">' + esc(e.agent) + ' native session ' + esc(e.nativeSessionId) + '</span>';
        break;
      case 'error':
        body = '<span style="color:var(--err)">' + esc(e.scope) + ': ' + esc(e.message) + '</span>';
        break;
      default:
        body = '<span class="dim mono">' + esc(JSON.stringify(e)).slice(0, 400) + '</span>';
    }
    return '<div class="ev layer-' + layer + extraCls + '" data-layer="' + layer + '">'
      + '<div class="head">' + head + '</div><div class="body">' + body + '</div></div>';
  }

  function renderLong(text) {
    var t = String(text || '');
    if (t.length <= 700) return esc(t);
    return esc(t.slice(0, 700)) + '<details><summary>show all (' + t.length + ' chars)</summary><pre>' + esc(t) + '</pre></details>';
  }

  function appendEvent(env) {
    events.push(env);
    var layer = layerOf(env.event);
    var div = document.createElement('div');
    div.innerHTML = evHtml(env);
    var node = div.firstChild;
    if (!LAYERS[layer]) node.style.display = 'none';
    el('timeline').appendChild(node);
    if (autoScroll) window.scrollTo(0, document.body.scrollHeight);
  }

  // ---- filters ----
  var FILTER_LABELS = { state: 'State', message: 'Messages', action: 'Actions', detail: 'Tool detail' };
  function renderFilters() {
    el('filters').innerHTML = Object.keys(FILTER_LABELS).map(function (k) {
      return '<span class="chip' + (LAYERS[k] ? ' on' : '') + '" data-layer="' + k + '">' + FILTER_LABELS[k] + '</span>';
    }).join('');
  }
  el('filters').addEventListener('click', function (ev) {
    var k = ev.target.getAttribute('data-layer');
    if (!k) return;
    LAYERS[k] = !LAYERS[k];
    renderFilters();
    var nodes = el('timeline').children;
    for (var i = 0; i < nodes.length; i++) {
      var l = nodes[i].getAttribute('data-layer');
      nodes[i].style.display = LAYERS[l] ? '' : 'none';
    }
  });

  var autoScroll = true;
  window.addEventListener('scroll', function () {
    autoScroll = (window.innerHeight + window.scrollY) >= document.body.scrollHeight - 80;
  });

  // ---- actions ----
  el('dirSend').addEventListener('click', function () {
    var text = el('dirText').value.trim();
    if (!text) return;
    post('/api/directive', {
      scope: el('dirScope').value,
      mode: el('dirMode').value,
      text: text,
      interrupt: el('dirInt').checked,
    }).then(function () { el('dirText').value = ''; el('dirInt').checked = false; });
  });
  el('pauseRun').addEventListener('click', function () { post('/api/run-pause', { paused: true }); });
  el('resumeRun').addEventListener('click', function () { post('/api/run-pause', { paused: false }); });
  el('agents').addEventListener('click', function (ev) {
    var act = ev.target.getAttribute('data-act');
    var agent = ev.target.getAttribute('data-agent');
    if (!act || !agent) return;
    if (act === 'pause') post('/api/agent-pause', { agent: agent, paused: true });
    if (act === 'unpause') post('/api/agent-pause', { agent: agent, paused: false });
    if (act === 'interrupt') post('/api/agent-pause', { agent: agent, paused: true, interrupt: true });
    if (act === 'raw') {
      fetch('/api/raw/' + encodeURIComponent(agent) + '?n=300').then(function (r) { return r.json(); }).then(function (d) {
        var w = window.open('', '_blank');
        w.document.write('<title>raw · ' + esc(agent) + '</title><pre style="white-space:pre-wrap;font:11px/1.5 monospace;padding:12px">'
          + d.lines.map(esc).join('\n') + '</pre>');
      });
    }
  });
  el('approvals').addEventListener('click', function (ev) {
    var dec = ev.target.getAttribute('data-appr');
    var id = ev.target.getAttribute('data-id');
    if (!dec || !id) return;
    var noteEl = document.getElementById('note-' + id);
    post('/api/approval', { approvalId: id, decision: dec, note: noteEl ? noteEl.value : '' });
  });

  // ---- boot ----
  renderFilters();
  fetch('/api/state').then(function (r) { return r.json(); }).then(function (s) {
    renderState(s);
    var es = new EventSource('/api/stream?since=0');
    es.onmessage = function (m) {
      var env = JSON.parse(m.data);
      appendEvent(env);
      scheduleStateRefetch();
    };
    es.onerror = function () { document.title = 'AgentOS Console (disconnected)'; };
    es.onopen = function () { document.title = 'AgentOS Console'; };
  });
})();
</script>
</body>
</html>`;
