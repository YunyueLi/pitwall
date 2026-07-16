/**
 * The AgentOS console — one self-contained page, zero external assets.
 *
 * Design: paper-minimal (Notion/Manus lineage). Light by default, dark via
 * prefers-color-scheme. One centered reading column; the agents' dialogue is
 * the document; machine noise folds into one-line gray steps; chrome stays
 * out of the way. Bilingual (zh/en), toggle in the header, persisted.
 *
 * Client JS avoids template literals (the page lives inside one backtick
 * string); backtick characters are built via String.fromCharCode(96).
 */
export const UI_HTML = String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentOS</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%23888' stroke-width='2.5'/%3E%3Ccircle cx='16' cy='16' r='4.5' fill='%23888'/%3E%3C/svg%3E">
<style>
  :root {
    --bg: #FBFBFA; --surface: #FFFFFF; --ink: #1C1C1B; --ink2: #71716D; --ink3: #A8A8A3;
    --line: #ECECE9; --line2: #DEDEDA;
    --ok: #1E9E6A; --warn: #C98A0B; --bad: #D9536F; --run: #1E9E6A;
    --codebg: #F4F4F2;
    --ease: cubic-bezier(.25,.6,.2,1);
    --font: ui-sans-serif, -apple-system, "SF Pro Text", "PingFang SC", "Segoe UI", "Microsoft YaHei", sans-serif;
    --mono: ui-monospace, "SF Mono", "Cascadia Code", "PingFang SC", monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #191918; --surface: #202020; --ink: #EDEDEB; --ink2: #9B9B97; --ink3: #6B6B67;
      --line: #2C2C2A; --line2: #3A3A37; --codebg: #242423;
    }
  }
  * { box-sizing: border-box; }
  html { background: var(--bg); }
  body { margin: 0; color: var(--ink); font: 15px/1.7 var(--font); -webkit-font-smoothing: antialiased; min-height: 100dvh; }
  ::selection { background: rgba(110,110,220,.18); }
  a { color: inherit; }
  button { font: inherit; cursor: pointer; background: none; border: none; color: inherit; padding: 0; }

  /* ---------- header ---------- */
  header {
    position: sticky; top: 0; z-index: 50; height: 52px;
    display: flex; align-items: center; gap: 10px; padding: 0 20px;
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: blur(14px); border-bottom: 1px solid var(--line);
  }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 650; font-size: 14px; letter-spacing: -.01em; }
  .brand .mark { width: 15px; height: 15px; border-radius: 50%; border: 2px solid var(--ink); position: relative; }
  .brand .mark::after { content: ""; position: absolute; inset: 3.5px; border-radius: 50%; background: var(--ink); }
  .hstatus { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--ink2); margin-left: 4px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ink3); flex: none; }
  .dot.running { background: var(--run); animation: breathe 2.2s var(--ease) infinite; }
  .dot.paused, .dot.awaiting-review { background: var(--warn); }
  .dot.done { background: var(--ink); }
  .dot.failed { background: var(--bad); }
  @keyframes breathe { 50% { opacity: .35; } }
  header .sp { flex: 1; }
  .hbtn { font-size: 12.5px; color: var(--ink2); padding: 5px 10px; border-radius: 7px; transition: background .3s var(--ease), color .3s var(--ease); }
  .hbtn:hover { background: var(--line); color: var(--ink); }
  .runid { font: 11px var(--mono); color: var(--ink3); }
  @media (max-width: 700px) { .runid { display: none; } }

  /* ---------- document column ---------- */
  .doc { max-width: 720px; margin: 0 auto; padding: 56px 24px 180px; }
  .kicker { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--ink3); font-weight: 600; display: flex; align-items: center; gap: 8px; }
  h1.title { font-size: 28px; line-height: 1.35; font-weight: 700; letter-spacing: -.02em; margin: 10px 0 0; }
  .metaline { margin-top: 14px; font-size: 13px; color: var(--ink2); display: flex; flex-wrap: wrap; gap: 6px 0; align-items: center; }
  .metaline .sep { margin: 0 9px; color: var(--line2); }
  .progress { margin-top: 20px; height: 2px; background: var(--line); border-radius: 1px; overflow: hidden; }
  .progress .fill { height: 100%; background: var(--ink); border-radius: 1px; transition: width 1s var(--ease); }

  /* agents line */
  .agents { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 4px 26px; font-size: 13px; color: var(--ink2); }
  .agentrow { display: inline-flex; align-items: center; gap: 8px; padding: 3px 0; }
  .agentrow b { color: var(--ink); font-weight: 600; }
  .agentrow .acts { display: none; gap: 2px; }
  .agentrow:hover .acts { display: inline-flex; }
  .lbtn { font-size: 11.5px; color: var(--ink3); padding: 2px 7px; border-radius: 6px; }
  .lbtn:hover { background: var(--line); color: var(--ink); }
  .lbtn.bad:hover { color: var(--bad); }

  /* criteria */
  .criteria { margin: 26px 0 0; padding: 0; list-style: none; }
  .criteria li { position: relative; padding: 3px 0 3px 26px; font-size: 13.5px; color: var(--ink2); }
  .criteria li::before { content: ""; position: absolute; left: 4px; top: 11px; width: 6px; height: 6px; border-radius: 50%; background: var(--line2); }

  /* ---------- decision callout ---------- */
  .decision { margin: 34px 0 0; border: 1px solid var(--line2); border-radius: 14px; padding: 18px 20px; background: var(--surface); animation: fadein .6s var(--ease) both; }
  .decision .k { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--warn); font-weight: 650; }
  .decision .s { font-size: 14.5px; font-weight: 550; margin-top: 6px; line-height: 1.6; }
  .decision input[type=text] { width: 100%; margin-top: 12px; border: none; border-bottom: 1px solid var(--line2); background: none; padding: 6px 0; font: 13.5px var(--font); color: var(--ink); outline: none; transition: border-color .3s; }
  .decision input[type=text]:focus { border-color: var(--ink2); }
  .decision .acts { display: flex; gap: 10px; margin-top: 16px; }
  .pbtn { background: var(--ink); color: var(--bg); border-radius: 999px; padding: 7px 20px; font-size: 13px; font-weight: 570; transition: opacity .3s var(--ease), transform .3s var(--ease); }
  .pbtn:hover { opacity: .85; } .pbtn:active { transform: scale(.97); }
  .gbtn { border-radius: 999px; padding: 7px 16px; font-size: 13px; color: var(--ink2); border: 1px solid var(--line2); transition: all .3s var(--ease); }
  .gbtn:hover { color: var(--bad); border-color: var(--bad); }
  details.d-more summary { cursor: pointer; font-size: 12px; color: var(--ink3); margin-top: 8px; list-style: none; }
  details.d-more summary::before { content: "› "; }
  details.d-more[open] summary::before { content: "⌄ "; }
  details.d-more pre { background: var(--codebg); border-radius: 10px; padding: 12px 14px; font: 12px/1.6 var(--mono); white-space: pre-wrap; max-height: 300px; overflow: auto; margin: 8px 0 0; }

  /* ---------- tasks ---------- */
  .sec { margin-top: 46px; }
  .sec .h { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--ink3); font-weight: 650; margin-bottom: 12px; display: flex; align-items: baseline; gap: 8px; }
  .sec .h .n { font-family: var(--mono); letter-spacing: 0; }
  .tlist { border-top: 1px solid var(--line); }
  .trow { border-bottom: 1px solid var(--line); padding: 11px 2px; cursor: pointer; transition: background .3s var(--ease); }
  .trow:hover { background: color-mix(in srgb, var(--line) 36%, transparent); }
  .trow .r1 { display: flex; align-items: center; gap: 12px; }
  .tmark { width: 18px; height: 18px; flex: none; position: relative; }
  .tmark svg { width: 18px; height: 18px; display: block; }
  .trow .t { flex: 1; font-size: 14.5px; font-weight: 520; line-height: 1.55; }
  .trow.done .t { color: var(--ink2); }
  .trow .st { font-size: 12px; color: var(--ink3); flex: none; }
  .trow .st.b { color: var(--run); } .trow .st.r { color: var(--warn); }
  .trow .crit { display: none; margin: 8px 0 4px 30px; padding: 0; list-style: none; }
  .trow.open .crit { display: block; }
  .trow .crit li { font-size: 13px; color: var(--ink2); padding: 2px 0 2px 18px; position: relative; }
  .trow .crit li::before { content: ""; position: absolute; left: 0; top: 10px; width: 7px; height: 7px; border-radius: 2px; border: 1px solid var(--line2); }
  .trow.done .crit li::before { background: var(--ink3); border-color: var(--ink3); }
  .tempty { padding: 18px 2px; color: var(--ink2); font-size: 13.5px; display: flex; align-items: center; gap: 10px; }
  .spin { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--line2); border-top-color: var(--ink2); animation: spin 1s linear infinite; flex: none; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ---------- conversation ---------- */
  .conv { margin-top: 10px; }
  .msg { padding: 22px 0 6px; animation: fadein .55s var(--ease) both; }
  @keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .msg .head { display: flex; align-items: baseline; gap: 9px; }
  .pfp { width: 24px; height: 24px; border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 650; align-self: center; }
  .pfp.agent { background: var(--ink); color: var(--bg); }
  .pfp.agent2 { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--ink); }
  .pfp.human { background: var(--warn); color: #fff; }
  .msg .head .n { font-weight: 650; font-size: 14px; }
  .msg .head .r { font-size: 12px; color: var(--ink3); }
  .msg .head .t { font: 11px var(--mono); color: var(--ink3); margin-left: auto; }
  .badge { font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line2); color: var(--ink2); }
  .badge.bad { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 45%, transparent); }
  .badge.ok { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 45%, transparent); }
  .badge.hm { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 45%, transparent); }
  .msg .body { margin: 8px 0 0 33px; font-size: 14.5px; line-height: 1.75; max-width: 64ch; }
  .msg .body.rule { padding-left: 14px; border-left: 2px solid var(--line2); }
  .msg .body.rule.bad { border-left-color: color-mix(in srgb, var(--bad) 55%, transparent); }
  .msg .body.rule.ok { border-left-color: color-mix(in srgb, var(--ok) 55%, transparent); }
  .msg .body.rule.hm { border-left-color: color-mix(in srgb, var(--warn) 55%, transparent); }
  .msg .body p { margin: 0 0 10px; } .msg .body p:last-child { margin: 0; }
  .msg .body pre { background: var(--codebg); border-radius: 10px; padding: 12px 14px; overflow-x: auto; font: 12.5px/1.6 var(--mono); margin: 10px 0; }
  .msg .body code { font: .9em var(--mono); background: var(--codebg); border-radius: 4px; padding: 1px 5px; }
  .msg .body pre code { background: none; padding: 0; }
  .msg .body ul { margin: 6px 0 10px; padding-left: 22px; } .msg .body li { margin: 2px 0; }
  .verdictline { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12.5px; font-weight: 600; }
  .verdictline.ok { color: var(--ok); } .verdictline.bad { color: var(--bad); }
  details.m-more summary { cursor: pointer; font-size: 12px; color: var(--ink3); list-style: none; margin-top: 6px; }
  details.m-more summary::before { content: "› "; }
  details.m-more[open] summary::before { content: "⌄ "; }
  details.m-more pre { background: var(--codebg); border-radius: 10px; padding: 12px; font: 12px/1.6 var(--mono); white-space: pre-wrap; max-height: 360px; overflow: auto; }

  /* system dividers */
  .sys { margin: 20px 0 0 33px; font-size: 12.5px; color: var(--ink3); animation: fadein .5s var(--ease) both; }
  .sys b { color: var(--ink2); font-weight: 600; }
  .sys.gate { color: var(--ink2); }
  .sys.gate::before { content: "◆ "; color: var(--warn); }
  .sys.ok::before { content: "✓ "; color: var(--ok); }
  .sys.no::before { content: "✕ "; color: var(--bad); }
  .sys.task::before { content: "○ "; color: var(--ink3); }
  .sys.taskdone::before { content: "● "; color: var(--ink2); }

  /* machine steps capsule */
  .steps { margin: 18px 0 0 33px; animation: fadein .5s var(--ease) both; }
  .steps summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
    font: 12px var(--mono); color: var(--ink3); padding: 3px 0; transition: color .3s var(--ease); }
  .steps summary:hover { color: var(--ink2); }
  .steps summary::-webkit-details-marker { display: none; }
  .steps summary .tick { display: inline-block; width: 12px; height: 12px; border: 1.5px solid var(--line2); border-radius: 4px; position: relative; }
  .steps[open] summary .tick { background: var(--line2); }
  .steps .rows { margin: 8px 0 4px 3px; border-left: 1px solid var(--line); padding-left: 16px; }
  .steps .row { font: 11.5px/1.7 var(--mono); color: var(--ink3); overflow-wrap: anywhere; padding: 1px 0; }
  .steps .row b { color: var(--ink2); font-weight: 570; }
  .steps .row .fb { border: 1px solid var(--line2); border-radius: 5px; padding: 0 6px; margin-right: 4px; }

  /* ---------- composer ---------- */
  .composer { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; padding: 12px 16px 22px;
    background: linear-gradient(180deg, transparent, var(--bg) 38%); pointer-events: none; }
  .composer .box { pointer-events: auto; max-width: 720px; margin: 0 auto; background: var(--surface);
    border: 1px solid var(--line2); border-radius: 16px; padding: 12px 14px 10px;
    box-shadow: 0 12px 40px -18px rgba(0,0,0,.18); transition: border-color .3s var(--ease); }
  .composer .box:focus-within { border-color: var(--ink3); }
  .composer textarea { width: 100%; border: none; background: none; outline: none; resize: none;
    font: 14px/1.6 var(--font); color: var(--ink); max-height: 130px; min-height: 24px; }
  .composer .row2 { display: flex; align-items: center; gap: 4px; margin-top: 8px; }
  .selchip { font-size: 12px; color: var(--ink3); padding: 3px 9px; border-radius: 7px; transition: all .25s var(--ease); white-space: nowrap; }
  .selchip:hover { background: var(--line); color: var(--ink2); }
  .selchip.on { color: var(--ink); background: var(--line); }
  .selchip.warn.on { color: var(--warn); background: color-mix(in srgb, var(--warn) 12%, transparent); }
  .composer .sp { flex: 1; }
  .sendbtn { width: 30px; height: 30px; border-radius: 50%; background: var(--ink); color: var(--bg);
    display: inline-flex; align-items: center; justify-content: center; transition: opacity .3s, transform .3s var(--ease); flex: none; }
  .sendbtn:hover { opacity: .85; } .sendbtn:active { transform: scale(.94); }
  .sendbtn svg { width: 14px; height: 14px; }
  .composer .note { max-width: 720px; margin: 7px auto 0; font-size: 11px; color: var(--ink3); padding: 0 4px; pointer-events: none; }
</style>
</head>
<body>
<header>
  <div class="brand"><span class="mark"></span>AgentOS</div>
  <span class="hstatus"><span class="dot" id="hdot"></span><span id="hstatus"></span></span>
  <span class="sp"></span>
  <span class="runid" id="runid"></span>
  <button class="hbtn" id="langBtn">EN</button>
  <button class="hbtn" id="pauseBtn"></button>
</header>

<div class="doc">
  <p class="kicker" id="kicker"></p>
  <h1 class="title" id="goal"></h1>
  <div class="metaline" id="metaline"></div>
  <div class="progress"><div class="fill" id="pfill" style="width:0%"></div></div>
  <div class="agents" id="agents"></div>
  <ol class="criteria" id="criteria"></ol>
  <div id="decisions"></div>
  <div class="sec">
    <div class="h"><span id="secTasks"></span><span class="n" id="taskCount"></span></div>
    <div class="tlist" id="tlist"></div>
  </div>
  <div class="sec">
    <div class="h"><span id="secRoom"></span><span style="flex:1"></span><button class="hbtn" id="noiseChip" style="font-size:11.5px; text-transform:none; letter-spacing:0"></button></div>
    <div class="conv" id="conv"></div>
  </div>
</div>

<div class="composer">
  <div class="box">
    <textarea id="dirText" rows="1"></textarea>
    <div class="row2">
      <span id="scopeChips"></span>
      <span class="selchip" id="modeChip"></span>
      <span class="selchip warn" id="intChip"></span>
      <span class="sp"></span>
      <button class="sendbtn" id="sendBtn" title="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
    </div>
  </div>
  <div class="note" id="dirHint"></div>
</div>

<script>
(function () {
  'use strict';
  var BT = String.fromCharCode(96);
  var state = null;
  var allEvents = [];
  var agentIdx = {};
  var showNoise = false;

  // ------------------------------------------------------------ i18n
  var ZH = {
    'Pause': '暂停', 'Resume': '继续', 'Send': '发送',
    'running': '运行中', 'paused': '已暂停', 'done': '已完成', 'failed': '失败', 'awaiting-review': '待验收',
    'team': '团队', 'pair': '结对',
    'idle': '空闲', 'working': '工作中', 'dead': '掉线', 'awaiting-approval': '等待批准',
    'director': '总监', 'engineer': '工程师', 'driver': '实现', 'reviewer': '评审',
    'plan': '计划', 'acceptance': '验收', 'task': '任务仲裁', 'tool': '操作',
    'RUN COMPLETE': '运行完成', 'LIVE': '进行中', 'PAUSED': '已暂停', 'NEEDS YOU': '等你决定',
    'Tasks': '任务', 'The room': '协作现场',
    'show steps': '显示执行细节', 'hide steps': '隐藏执行细节',
    'tasks': '个任务', 'turns': '轮', 'elapsed': '耗时',
    'planned': '待开工', 'building': '实现中', 'in review': '审核中', 'accepted': '已验收',
    'The director is studying the repository and drafting the plan…': '总监正在研究仓库、起草任务计划……',
    'No tasks yet.': '还没有任务。',
    'You': '你', 'human': '人类',
    'objection': '驳回', 'verdict': '裁决', 'report': '汇报', 'handoff': '计划', 'question': '提问', 'info': '消息',
    'directive': '指令', 'note': '批注', 'goal update': '目标更新',
    'supplement': '补充', 'override': '覆盖', 'interrupt': '打断',
    'to all': '发给全体', 'to ': '发给 ',
    'approved': '已批准', 'rejected': '已驳回', 'gate': '门',
    'run created': '运行创建', 'new task': '新任务', 'task update': '任务',
    'reports done': '自报完成', 'changes required': '需要修改', 'blocked': '受阻', 'approve': '通过',
    'steps': '步', 'show full message': '展开完整消息', 'details': '详情', 'full prompt': '完整提示词',
    'Note — say why if you reject': '备注——驳回请说明原因',
    'Approve': '通过', 'Reject': '驳回',
    'Add guidance, change direction, or overrule…': '补充指导、调整方向，或推翻先前口径……',
    'Lands at the next turn boundary, with a delivery receipt.': '将在下一轮次边界送达，留有送达回执。',
    'Aborts the current turn and re-delivers immediately.': '立即打断当前轮次并即时送达。',
    'delivery receipt': '送达回执', 'received directive': '已收到指令',
    'starts a turn': '开始新一轮', 'finished': '完成本轮', 'registered': '注册',
    'accepted by human': '人类已验收', 'cost': '花费', 'Raw': '原始输出', 'Interrupt': '打断',
    'run': '运行', 'status': '状态'
  };
  var SYS = [
    [/^The director proposes (\d+) task\(s\)\. Approve the plan to let the engineer start\.$/, '总监提出 $1 个任务的计划，批准后工程师开工。'],
    [/^All (\d+) task\(s\) implemented and approved by the director\. Final human acceptance required\.$/, '全部 $1 个任务已实现并通过总监审核，等待你的最终验收。'],
    [/^"(.+)": director still objects after (\d+) rounds\. Your call\.$/, '「$1」：总监 $2 轮后仍不通过，由你裁决。'],
    [/^Reviewer approves after round (\d+)\. Human acceptance required\.$/, '评审在第 $1 轮通过，等待你的验收。'],
    [/^Max review rounds \((\d+)\) reached without reviewer approval\. Human decision required\.$/, '已达最大评审轮数（$1）仍未通过，由你决定。'],
    [/^director approved in review round (\d+)$/, '总监在第 $1 轮审核通过'],
    [/^director objection in round (\d+)$/, '总监在第 $1 轮驳回'],
    [/^engineer reports done; director review pending$/, '工程师自报完成，等待总监审核'],
    [/^driver reports done; awaiting independent review$/, '实现方自报完成，等待独立评审'],
    [/^reviewer objection in round (\d+)$/, '评审在第 $1 轮驳回'],
    [/^plan rejected by human$/, '计划被人类驳回'],
    [/^human rejected acceptance(.*)$/, '人类驳回验收$1'],
    [/^human sided with the objection(.*)$/, '人类支持驳回意见$1'],
    [/^accepted by human$/, '人类已验收'], [/^task accepted by human$/, '人类已验收'],
    [/^resumed from ledger$/, '已从账本恢复'],
    [/^paused by human$/, '被人类暂停'], [/^resumed by human$/, '被人类恢复'],
    [/^orchestrator stopped$/, '编排器已停止'],
    [/^engineer is blocked and asked the human a question.*$/, '工程师受阻并向你提问，回复后请恢复运行'],
    [/^driver is blocked and asked the human a question.*$/, '实现方受阻并向你提问，回复后请恢复运行'],
    [/^accepted by director in review round (\d+)$/, '总监在第 $1 轮审核通过'],
    [/^orchestrator process died mid-turn.*$/, '编排进程在轮次中途终止，将带恢复提示重发'],
    [/^agent turn failed.*$/, '代理轮次失败：检查错误后可补充指令并恢复'],
    [/^two consecutive turn timeouts.*$/, '连续两次轮次超时，需要人工介入'],
    [/^recovered$/, '已恢复'], [/^paused by human$/, '被人类暂停'], [/^unpaused by human$/, '被人类恢复'],
    [/^driver reports done.*$/, '实现方自报完成，等待独立评审'],
    [/^engineer reports done.*$/, '工程师自报完成，等待总监审核']
  ];
  var urlLang = new URLSearchParams(location.search).get('lang');
  var lang = (urlLang === 'zh' || urlLang === 'en') ? urlLang
    : localStorage.getItem('agentos-lang') || (((navigator.language || '').toLowerCase().indexOf('zh') === 0) ? 'zh' : 'en');
  function t(s) { if (lang === 'zh' && ZH[s]) return ZH[s]; return s; }
  function tSys(s) {
    if (lang !== 'zh') return s;
    for (var i = 0; i < SYS.length; i++) { if (SYS[i][0].test(s)) return s.replace(SYS[i][0], SYS[i][1]); }
    return s;
  }

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function post(path, body) {
    return fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.error) alert(d.error); return d; });
  }
  function tstr(ts) { return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }); }
  function money(v) { return '$' + (v || 0).toFixed(2); }
  function fmtTok(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n); }

  var htmlCache = {};
  function setHtml(id, html) {
    if (htmlCache[id] === html) return;
    htmlCache[id] = html;
    el(id).innerHTML = html;
  }

  // ------------------------------------------------------------ markdown-lite
  var FENCE_AGENTOS = new RegExp(BT + BT + BT + 'agentos\\s*\\n([\\s\\S]*?)' + BT + BT + BT, 'g');
  var FENCE = new RegExp(BT + BT + BT + '([a-zA-Z]*)\\n?([\\s\\S]*?)' + BT + BT + BT, 'g');
  var INLINE = new RegExp(BT + '([^' + BT + '\\n]+)' + BT, 'g');
  function stripStructured(text) {
    var json = null;
    var rest = String(text || '').replace(FENCE_AGENTOS, function (_, body) {
      try { json = JSON.parse(body.trim()); } catch (e) {}
      return '';
    });
    return { text: rest.trim(), json: json };
  }
  function md(text) {
    var out = [], last = 0, m;
    FENCE.lastIndex = 0;
    var s = String(text || '');
    while ((m = FENCE.exec(s))) {
      out.push(inline(s.slice(last, m.index)));
      out.push('<pre><code>' + esc(m[2]) + '</code></pre>');
      last = m.index + m[0].length;
    }
    out.push(inline(s.slice(last)));
    return out.join('');
  }
  function inline(t0) {
    var s = esc(t0);
    s = s.replace(INLINE, function (_, c) { return '<code>' + c + '</code>'; });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return s.split(/\n{2,}/).map(function (p) {
      var lines = p.split('\n');
      var isList = lines.length > 1 && lines.every(function (l) { return /^\s*([-*]|\d+[.)])\s/.test(l) || !l.trim(); });
      if (isList) {
        return '<ul>' + lines.filter(function (l) { return l.trim(); }).map(function (l) {
          return '<li>' + l.replace(/^\s*([-*]|\d+[.)])\s/, '') + '</li>';
        }).join('') + '</ul>';
      }
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  function clipBody(rawText) {
    var parsed = stripStructured(rawText);
    if (parsed.text.length <= 900) return md(parsed.text);
    return md(parsed.text.slice(0, 860)) + '<details class="m-more"><summary>' + t('show full message') + '</summary><pre>' + esc(rawText) + '</pre></details>';
  }

  // ------------------------------------------------------------ static text
  function applyStatic() {
    document.documentElement.lang = lang;
    el('langBtn').textContent = lang === 'zh' ? 'EN' : '中文';
    el('secTasks').textContent = t('Tasks');
    el('secRoom').textContent = t('The room');
    el('noiseChip').textContent = t(showNoise ? 'hide steps' : 'show steps');
    el('dirText').placeholder = t('Add guidance, change direction, or overrule…');
    el('dirHint').textContent = t(interrupt ? 'Aborts the current turn and re-delivers immediately.' : 'Lands at the next turn boundary, with a delivery receipt.');
    el('intChip').textContent = t('interrupt');
    renderModeChip();
  }

  // ------------------------------------------------------------ header/meta
  function renderTop(s) {
    var tasks = activeTasks(s);
    var done = tasks.filter(function (x) { return x.status === 'accepted'; }).length;
    var pend = s.approvals.filter(function (a) { return !a.decision; });
    var working = s.agents.filter(function (a) { return a.state === 'working'; });

    el('hdot').className = 'dot ' + s.status;
    el('hstatus').textContent = t(s.status) + ' · ' + t(s.mode);
    el('runid').textContent = s.runId;
    el('pauseBtn').textContent = t(s.status === 'paused' ? 'Resume' : 'Pause');
    document.title = 'AgentOS — ' + t(s.status);

    var kick = s.status === 'done' ? t('RUN COMPLETE') : pend.length ? t('NEEDS YOU') : s.status === 'paused' ? t('PAUSED') : t('LIVE');
    var kdot = working.length && s.status === 'running' ? '<span class="dot running"></span>' : '';
    setHtml('kicker', kdot + esc(kick));
    el('goal').textContent = s.goal;

    var cost = 0, tok = 0, turns = 0;
    s.agents.forEach(function (a) { cost += a.totals.costUsd; tok += a.totals.inputTokens + a.totals.outputTokens; turns += a.totals.turns; });
    var started = s.startedTs ? new Date(s.startedTs).getTime() : Date.now();
    var ended = (s.status === 'done' || s.status === 'failed') && s.lastTs ? new Date(s.lastTs).getTime() : Date.now();
    var mins = Math.max(0, Math.round((ended - started) / 60000));
    var dur = mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min';
    var bits = [
      done + ' / ' + tasks.length + ' ' + (lang === 'zh' ? '个任务' : 'tasks'),
      money(cost) + ' · ' + fmtTok(tok) + ' tok',
      turns + ' ' + t('turns'),
      dur
    ];
    setHtml('metaline', bits.map(esc).join('<span class="sep">·</span>'));
    el('pfill').style.width = (tasks.length ? Math.round(done / tasks.length * 100) : 0) + '%';

    setHtml('agents', s.agents.map(function (a, i) {
      return '<span class="agentrow"><span class="dot ' + (a.state === 'working' ? 'running' : a.state === 'paused' ? 'paused' : '') + '"></span>'
        + '<b>' + esc(a.name) + '</b> <span>' + esc(t(a.role)) + '</span>'
        + '<span style="color:var(--ink3)">' + a.totals.turns + ' ' + t('turns') + ' · ' + (a.totals.costUsd ? money(a.totals.costUsd) : fmtTok(a.totals.inputTokens + a.totals.outputTokens) + ' tok') + '</span>'
        + '<span class="acts">'
        + (a.state === 'paused'
            ? '<button class="lbtn" data-act="unpause" data-agent="' + esc(a.name) + '">' + t('Resume') + '</button>'
            : '<button class="lbtn" data-act="pause" data-agent="' + esc(a.name) + '">' + t('Pause') + '</button>')
        + (a.state === 'working' ? '<button class="lbtn bad" data-act="interrupt" data-agent="' + esc(a.name) + '">' + t('Interrupt') + '</button>' : '')
        + '<button class="lbtn" data-act="raw" data-agent="' + esc(a.name) + '">' + t('Raw') + '</button>'
        + '</span></span>';
    }).join(''));

    setHtml('criteria', (s.criteria || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join(''));

    setHtml('decisions', pend.map(function (a) {
      return '<div class="decision">'
        + '<div class="k">' + esc(gateLabel(a.gate)) + '</div>'
        + '<div class="s">' + esc(tSys(a.summary)) + '</div>'
        + (a.detail ? '<details class="d-more"><summary>' + t('details') + '</summary><pre>' + esc(a.detail) + '</pre></details>' : '')
        + '<input type="text" id="note-' + esc(a.approvalId) + '" placeholder="' + t('Note — say why if you reject') + '">'
        + '<div class="acts">'
        + '<button class="pbtn" data-appr="allow" data-id="' + esc(a.approvalId) + '">' + t('Approve') + '</button>'
        + '<button class="gbtn" data-appr="deny" data-id="' + esc(a.approvalId) + '">' + t('Reject') + '</button>'
        + '</div></div>';
    }).join(''));
  }

  function gateLabel(g) { return lang === 'zh' ? t(g) + '门' : g + ' gate'; }
  function activeTasks(s) {
    return s.tasks.filter(function (x) { return x.status !== 'superseded' && x.status !== 'rejected'; });
  }

  // ------------------------------------------------------------ tasks
  var MARKS = {
    pending: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="var(--line2)" stroke-width="1.6"/></svg>',
    'in-progress': '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="var(--run)" stroke-width="1.6"/><circle cx="9" cy="9" r="3.4" fill="var(--run)"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></circle></svg>',
    'needs-review': '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="var(--warn)" stroke-width="1.6"/><path d="M9 5.6v3.8l2.6 1.5" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-linecap="round"/></svg>',
    accepted: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.6" fill="var(--ink)"/><path d="M5.8 9.2l2.2 2.2 4.2-4.6" fill="none" stroke="var(--bg)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var STAGE = { pending: 'planned', 'in-progress': 'building', 'needs-review': 'in review', accepted: 'accepted' };
  var openTasks = {};

  function renderTasks(s) {
    var tasks = activeTasks(s);
    el('taskCount').textContent = tasks.length ? tasks.filter(function (x) { return x.status === 'accepted'; }).length + ' / ' + tasks.length : '';
    if (!tasks.length) {
      setHtml('tlist', '<div class="tempty">'
        + (s.mode === 'team' && s.status === 'running' ? '<span class="spin"></span>' + esc(t('The director is studying the repository and drafting the plan…')) : esc(t('No tasks yet.')))
        + '</div>');
      return;
    }
    setHtml('tlist', tasks.map(function (x) {
      var open = openTasks[x.taskId] ? ' open' : '';
      var stCls = x.status === 'in-progress' ? ' b' : x.status === 'needs-review' ? ' r' : '';
      return '<div class="trow' + (x.status === 'accepted' ? ' done' : '') + open + '" data-task="' + esc(x.taskId) + '">'
        + '<div class="r1"><span class="tmark">' + (MARKS[x.status] || MARKS.pending) + '</span>'
        + '<span class="t">' + esc(x.title) + '</span>'
        + '<span class="st' + stCls + '">' + esc(t(STAGE[x.status] || x.status)) + '</span></div>'
        + ((x.criteria || []).length ? '<ul class="crit">' + x.criteria.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' : '')
        + '</div>';
    }).join(''));
  }
  el('tlist').addEventListener('click', function (ev) {
    var n = ev.target.closest('.trow'); if (!n) return;
    var id = n.getAttribute('data-task');
    openTasks[id] = !openTasks[id];
    n.classList.toggle('open');
  });

  // ------------------------------------------------------------ conversation
  var curSteps = null;

  function roleOf(name) {
    if (!state) return '';
    var a = state.agents.filter(function (x) { return x.name === name; })[0];
    return a ? a.role : '';
  }
  function pfp(name, isHuman) {
    if (isHuman) return '<span class="pfp human">' + (lang === 'zh' ? '你' : 'U') + '</span>';
    var cls = (agentIdx[name] || 0) === 0 ? 'agent' : 'agent2';
    return '<span class="pfp ' + cls + '">' + esc(String(name).charAt(0).toUpperCase()) + '</span>';
  }

  function isPrimary(e) {
    switch (e.type) {
      case 'message': case 'directive': case 'note': case 'goal.updated':
      case 'approval.requested': case 'approval.resolved':
      case 'task.created': case 'task.updated': case 'run.created': case 'run.status': case 'error':
        return true;
      default: return false;
    }
  }

  function agentMessage(env) {
    var e = env.event;
    var isHuman = env.origin.kind === 'human';
    var name = isHuman ? t('You') : (e.from || 'system');
    var parsed = stripStructured(e.text);
    var kindBadge = '';
    var ruleCls = '';
    if (e.type === 'message') {
      if (e.kind === 'objection') { kindBadge = '<span class="badge bad">' + t('objection') + '</span>'; ruleCls = ' rule bad'; }
      else if (e.kind === 'verdict') { kindBadge = '<span class="badge ok">' + t('verdict') + '</span>'; ruleCls = ' rule ok'; }
      else if (e.kind === 'handoff') kindBadge = '<span class="badge">' + t('handoff') + '</span>';
      else if (e.kind === 'question') kindBadge = '<span class="badge hm">' + t('question') + '</span>';
      else kindBadge = '<span class="badge">' + t(e.kind) + '</span>';
    }
    var chip = '';
    if (parsed.json) {
      if (parsed.json.verdict) {
        chip = parsed.json.verdict === 'approve'
          ? '<div class="verdictline ok">✓ ' + t('approve') + '</div>'
          : '<div class="verdictline bad">✕ ' + t('changes required') + '</div>';
      } else if (parsed.json.status) {
        chip = parsed.json.status === 'done'
          ? '<div class="verdictline ok">✓ ' + t('reports done') + '</div>'
          : '<div class="verdictline bad">— ' + t(parsed.json.status) + '</div>';
      }
    }
    var role = isHuman ? '' : roleOf(name);
    return '<div class="msg"><div class="head">'
      + pfp(name, isHuman)
      + '<span class="n">' + esc(name) + '</span>'
      + (role ? '<span class="r">' + esc(t(role)) + '</span>' : '')
      + kindBadge
      + '<span class="t">' + tstr(env.ts) + '</span>'
      + '</div><div class="body' + ruleCls + '">' + clipBody(e.text) + chip + '</div></div>';
  }

  function humanBlock(env) {
    var e = env.event;
    var label = e.type === 'directive'
      ? t('directive') + ' → ' + (e.scope === 'all' ? t('to all') : esc(e.scope)) + ' · ' + t(e.mode) + (e.interrupt ? ' · ' + t('interrupt') : '')
      : e.type === 'goal.updated' ? t('goal update') + ' · ' + t(e.mode) : t('note');
    return '<div class="msg"><div class="head">'
      + pfp('', true)
      + '<span class="n">' + t('You') + '</span>'
      + '<span class="badge hm">' + label + '</span>'
      + '<span class="t">' + tstr(env.ts) + '</span>'
      + '</div><div class="body rule hm">' + md(e.text) + '</div></div>';
  }

  function sysLine(cls, html) { return '<div class="sys ' + cls + '">' + html + '</div>'; }

  function stepRow(env) {
    var e = env.event;
    switch (e.type) {
      case 'turn.started': return '<b>' + esc(e.agent) + '</b> ' + t('starts a turn');
      case 'turn.completed': {
        var u = e.usage || {};
        var bits = ['<b>' + esc(e.agent) + '</b> ' + t('finished')];
        if (e.durationMs != null) bits.push(Math.round(e.durationMs / 1000) + 's');
        if (u.outputTokens != null) bits.push(u.outputTokens + ' tok');
        if (u.costUsd != null) bits.push('$' + u.costUsd.toFixed(3));
        return bits.join(' · ') + (e.error ? ' — <span style="color:var(--bad)">' + esc(tSys(e.error)) + '</span>' : '');
      }
      case 'tool.used': return '<b>' + esc(e.agent) + '</b> ▸ ' + esc(e.tool) + ' · ' + esc(e.summary);
      case 'files.changed':
        return (e.agent ? '<b>' + esc(e.agent) + '</b> · ' : '') + e.changes.map(function (c) {
          return '<span class="fb">' + esc(c.kind[0]) + ' ' + esc(c.path) + '</span>';
        }).join('');
      case 'agent.status': return esc(e.agent) + ' → ' + esc(t(e.state)) + (e.detail ? ' (' + esc(tSys(e.detail)) + ')' : '');
      case 'directive.delivered': return t('delivery receipt') + ' — <b>' + esc(e.agent) + '</b> ' + t('received directive');
      case 'agent.registered': return t('registered') + ' <b>' + esc(e.spec.name) + '</b> · ' + esc(e.spec.adapter) + ' · ' + esc(t(e.spec.role));
      case 'agent.native-session': return esc(e.agent) + ' · session ' + esc(String(e.nativeSessionId).slice(0, 13)) + '…';
      default: return esc(JSON.stringify(e).slice(0, 140));
    }
  }
  function stepsLabel(c) {
    var bits = [c.count + ' ' + t('steps')];
    if (c.secs) bits.push(c.secs + 's');
    if (c.cost) bits.push('$' + c.cost.toFixed(2));
    var agents = Object.keys(c.agents);
    return (agents.length ? agents.join(' + ') + ' · ' : '') + bits.join(' · ');
  }

  function appendEvent(env) {
    var e = env.event;
    var conv = el('conv');

    if (!isPrimary(e)) {
      if (!curSteps) {
        var d = document.createElement('details');
        d.className = 'steps';
        if (showNoise) d.open = true;
        d.innerHTML = '<summary><span class="tick"></span><span class="cs"></span></summary><div class="rows"></div>';
        conv.appendChild(d);
        curSteps = { node: d, rows: d.querySelector('.rows'), cs: d.querySelector('.cs'), count: 0, secs: 0, cost: 0, agents: {} };
      }
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = stepRow(env);
      curSteps.rows.appendChild(row);
      curSteps.count += 1;
      if (e.agent) curSteps.agents[e.agent] = 1;
      if (e.type === 'turn.completed') {
        if (e.durationMs) curSteps.secs += Math.round(e.durationMs / 1000);
        if (e.usage && e.usage.costUsd) curSteps.cost += e.usage.costUsd;
      }
      curSteps.cs.textContent = stepsLabel(curSteps);
      return;
    }

    curSteps = null;
    var html = '';
    switch (e.type) {
      case 'message': html = agentMessage(env); break;
      case 'directive': case 'note': case 'goal.updated': html = humanBlock(env); break;
      case 'approval.requested':
        html = sysLine('gate', '<b>' + esc(gateLabel(e.gate)) + '</b> — ' + esc(tSys(e.summary)));
        break;
      case 'approval.resolved':
        html = sysLine(e.decision === 'allow' ? 'ok' : 'no',
          '<b>' + t(e.decision === 'allow' ? 'approved' : 'rejected') + '</b>' + (e.note ? ' — ' + esc(e.note) : '') + ' · ' + t('human'));
        break;
      case 'task.created':
        html = sysLine('task', t('new task') + ' — <b>' + esc(e.title) + '</b> → ' + esc(e.assignee));
        break;
      case 'task.updated':
        if (!e.status || (e.status === 'in-progress' && !e.note)) { html = ''; break; }
        html = sysLine(e.status === 'accepted' ? 'taskdone' : 'task',
          t('task update') + ' → <b>' + esc(t(STAGE[e.status] || e.status)) + '</b>' + (e.note ? ' — ' + esc(tSys(e.note)) : ''));
        break;
      case 'run.created':
        html = sysLine('task', t('run created') + ' — ' + e.agents.map(function (a) { return '<b>' + esc(a.name) + '</b> (' + esc(t(a.role)) + ')'; }).join(' + '));
        break;
      case 'run.status':
        html = sysLine(e.status === 'done' ? 'ok' : e.status === 'paused' ? 'no' : 'task',
          t('run') + ' → <b>' + esc(t(e.status)) + '</b>' + (e.reason ? ' — ' + esc(tSys(e.reason)) : ''));
        break;
      case 'error':
        html = sysLine('no', '<span style="color:var(--bad)">' + esc(e.scope) + ' — ' + esc(e.message) + '</span>');
        break;
    }
    if (!html) return;
    var div = document.createElement('div');
    div.innerHTML = html;
    conv.appendChild(div.firstChild);
  }

  function rebuildConv() {
    el('conv').innerHTML = '';
    curSteps = null;
    allEvents.forEach(appendEvent);
  }

  // ------------------------------------------------------------ interactions
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var act = b.getAttribute('data-act'), agent = b.getAttribute('data-agent');
    if (act && agent) {
      if (act === 'pause') post('/api/agent-pause', { agent: agent, paused: true });
      if (act === 'unpause') post('/api/agent-pause', { agent: agent, paused: false });
      if (act === 'interrupt') post('/api/agent-pause', { agent: agent, paused: true, interrupt: true });
      if (act === 'raw') {
        fetch('/api/raw/' + encodeURIComponent(agent) + '?n=300').then(function (r) { return r.json(); }).then(function (d) {
          var w = window.open('', '_blank');
          w.document.write('<title>raw · ' + esc(agent) + '</title><body style="background:#1b1b1a;color:#d5d5d0;margin:0"><pre style="white-space:pre-wrap;font:11px/1.6 monospace;padding:18px">' + d.lines.map(esc).join('\n') + '</pre>');
        });
      }
      return;
    }
    var dec = b.getAttribute('data-appr'), id = b.getAttribute('data-id');
    if (dec && id) {
      var note = document.getElementById('note-' + id);
      post('/api/approval', { approvalId: id, decision: dec, note: note ? note.value : '' });
    }
  });

  var scope = 'all', mode = 'supplement', interrupt = false;
  function renderScopes(s) {
    var names = ['all'].concat(s.agents.map(function (a) { return a.name; }));
    setHtml('scopeChips', names.map(function (n) {
      var label = n === 'all' ? t('to all') : (lang === 'zh' ? t('to ') + n : '@' + n);
      return '<button class="selchip' + (scope === n ? ' on' : '') + '" data-scope="' + esc(n) + '">' + esc(label) + '</button>';
    }).join(''));
  }
  el('scopeChips').addEventListener('click', function (ev) {
    var c = ev.target.closest('.selchip'); if (!c) return;
    scope = c.getAttribute('data-scope');
    htmlCache.scopeChips = null;
    renderScopes(state);
  });
  function renderModeChip() { el('modeChip').textContent = t(mode); el('modeChip').classList.toggle('on', mode === 'override'); }
  el('modeChip').addEventListener('click', function () { mode = mode === 'supplement' ? 'override' : 'supplement'; renderModeChip(); });
  el('intChip').addEventListener('click', function () {
    interrupt = !interrupt;
    el('intChip').classList.toggle('on', interrupt);
    el('dirHint').textContent = t(interrupt ? 'Aborts the current turn and re-delivers immediately.' : 'Lands at the next turn boundary, with a delivery receipt.');
  });
  el('sendBtn').addEventListener('click', function () {
    var text = el('dirText').value.trim(); if (!text) return;
    post('/api/directive', { scope: scope, mode: mode, text: text, interrupt: interrupt })
      .then(function () { el('dirText').value = ''; interrupt = false; el('intChip').classList.remove('on'); });
  });
  el('dirText').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 130) + 'px';
  });
  el('pauseBtn').addEventListener('click', function () {
    post('/api/run-pause', { paused: !(state && state.status === 'paused') });
  });
  el('noiseChip').addEventListener('click', function () {
    showNoise = !showNoise;
    el('noiseChip').textContent = t(showNoise ? 'hide steps' : 'show steps');
    var caps = document.querySelectorAll('.steps');
    for (var i = 0; i < caps.length; i++) caps[i].open = showNoise;
  });
  el('langBtn').addEventListener('click', function () {
    lang = lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('agentos-lang', lang);
    htmlCache = {};
    applyStatic();
    if (state) renderState(state);
    rebuildConv();
  });

  // ------------------------------------------------------------ state + boot
  var refetchTimer = null;
  function scheduleRefetch() {
    if (refetchTimer) return;
    refetchTimer = setTimeout(function () {
      refetchTimer = null;
      fetch('/api/state').then(function (r) { return r.json(); }).then(renderState);
    }, 250);
  }
  function renderState(s) {
    state = s;
    s.agents.forEach(function (a, i) { agentIdx[a.name] = i % 2; });
    renderTop(s);
    renderTasks(s);
    renderScopes(s);
  }

  applyStatic();
  setInterval(function () { if (state) renderTop(state); }, 30000);
  fetch('/api/state').then(function (r) { return r.json(); }).then(function (s) {
    renderState(s);
    var es = new EventSource('/api/stream?since=0');
    es.onmessage = function (m) {
      var env = JSON.parse(m.data);
      allEvents.push(env);
      appendEvent(env);
      scheduleRefetch();
    };
    es.onerror = function () { el('hstatus').textContent = '…'; };
  });
})();
</script>
</body>
</html>`;
