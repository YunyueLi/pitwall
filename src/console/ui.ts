export const UI_HTML = String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pitwall</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%23888' stroke-width='2.5'/%3E%3Ccircle cx='16' cy='16' r='4.5' fill='%23888'/%3E%3C/svg%3E">
<style>
  :root {
    --bg: #FAF9F7; --panel: #F0EFEB; --surface: #FFFFFF; --raise: #FFFFFF;
    --ink: #37352F; --ink2: rgba(55,53,47,.62); --ink3: rgba(55,53,47,.40);
    --line: rgba(55,53,47,.085); --line2: rgba(55,53,47,.15); --hair: rgba(55,53,47,.06);
    --fill: rgba(55,53,47,.045); --fill2: rgba(55,53,47,.08);
    --blue: #0B7CE0; --blue-fill: rgba(11,124,224,.10); --blue-line: rgba(11,124,224,.32);
    --ok: #2E9E64; --warn: #BE8412; --bad: #D64C63;
    --codebg: #F4F3F0;
    --shadow: 0 1px 2px rgba(15,15,15,.04), 0 8px 28px -14px rgba(15,15,15,.14);
    --pop: 0 0 0 1px rgba(15,15,15,.05), 0 4px 12px rgba(15,15,15,.10), 0 12px 32px -8px rgba(15,15,15,.18);
    --ease: cubic-bezier(.25,.6,.2,1);
    --font: ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "PingFang SC", "Microsoft YaHei", Roboto, sans-serif;
    --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, monospace;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #1B1B1A; --panel: #141413; --surface: #232221; --raise: #2A2927;
      --ink: rgba(255,255,255,.83); --ink2: rgba(255,255,255,.55); --ink3: rgba(255,255,255,.36);
      --line: rgba(255,255,255,.09); --line2: rgba(255,255,255,.15); --hair: rgba(255,255,255,.06);
      --fill: rgba(255,255,255,.05); --fill2: rgba(255,255,255,.09);
      --blue: #4C9DEB; --blue-fill: rgba(76,157,235,.15); --blue-line: rgba(76,157,235,.38);
      --ok: #43B87C; --warn: #D6A03A; --bad: #E8697F;
      --codebg: #242321;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px -14px rgba(0,0,0,.5);
      --pop: 0 0 0 1px rgba(255,255,255,.08), 0 8px 30px rgba(0,0,0,.5);
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --bg: #1B1B1A; --panel: #141413; --surface: #232221; --raise: #2A2927;
    --ink: rgba(255,255,255,.83); --ink2: rgba(255,255,255,.55); --ink3: rgba(255,255,255,.36);
    --line: rgba(255,255,255,.09); --line2: rgba(255,255,255,.15); --hair: rgba(255,255,255,.06);
    --fill: rgba(255,255,255,.05); --fill2: rgba(255,255,255,.09);
    --blue: #4C9DEB; --blue-fill: rgba(76,157,235,.15); --blue-line: rgba(76,157,235,.38);
    --ok: #43B87C; --warn: #D6A03A; --bad: #E8697F;
    --codebg: #242321;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px -14px rgba(0,0,0,.5);
    --pop: 0 0 0 1px rgba(255,255,255,.08), 0 8px 30px rgba(0,0,0,.5);
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  html { background: var(--bg); }
  body { margin: 0; color: var(--ink); font: 15px/1.6 var(--font); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; min-height: 100dvh; }
  ::selection { background: var(--blue-fill); }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; cursor: pointer; background: none; border: none; color: inherit; padding: 0; }
  ::-webkit-scrollbar { width: 9px; height: 9px; }
  ::-webkit-scrollbar-thumb { background: var(--line2); border-radius: 9px; border: 2px solid transparent; background-clip: padding-box; }
  ::-webkit-scrollbar-thumb:hover { background: var(--ink3); background-clip: padding-box; }

  /* ---------------- signals: one blue jewel, amber = you, green = live/done ---------------- */
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ink3); flex: none; }
  .dot.running, .dot.working { background: var(--ok); box-shadow: 0 0 0 0 var(--ok); animation: pulse 2.4s var(--ease) infinite; }
  .dot.paused, .dot.awaiting-review, .dot.needs-review { background: var(--warn); }
  .dot.done, .dot.accepted { background: var(--ok); }
  .dot.failed, .dot.dead { background: var(--bad); }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 var(--blue-fill); } 70% { box-shadow: 0 0 0 5px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
  .shimmer { background: linear-gradient(100deg, var(--ink2) 30%, var(--ink3) 48%, var(--ink) 58%, var(--ink2) 72%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; animation: shimmer 2.6s linear infinite; }
  @keyframes shimmer { 0% { background-position: 160% 0; } 100% { background-position: -160% 0; } }

  /* ---------------- header ---------------- */
  header {
    position: fixed; top: 0; left: 0; right: 0; z-index: 60; height: 46px;
    display: flex; align-items: center; gap: 8px; padding: 0 14px 0 16px;
    background: color-mix(in srgb, var(--bg) 78%, transparent);
    backdrop-filter: saturate(1.4) blur(16px); -webkit-backdrop-filter: saturate(1.4) blur(16px);
    border-bottom: 1px solid var(--hair);
  }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 640; font-size: 14px; letter-spacing: -.01em; }
  .brand .mark { width: 15px; height: 15px; border-radius: 50%; border: 2px solid var(--ink); position: relative; }
  .brand .mark::after { content: ""; position: absolute; inset: 3.4px; border-radius: 50%; background: var(--ink); }
  .crumb { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--ink2); margin-left: 6px; min-width: 0; }
  .crumb .csep { color: var(--line2); }
  .crumb .g { max-width: 40vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  header .sp { flex: 1; }
  .hbtn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; color: var(--ink2); padding: 5px 9px; border-radius: 7px; transition: background .12s var(--ease), color .12s var(--ease); }
  .hbtn:hover { background: var(--fill2); color: var(--ink); }
  .icobtn { width: 30px; height: 30px; padding: 0; font-size: 14px; }
  .runid { font: 11px var(--mono); color: var(--ink3); }
  @media (max-width: 760px) { .runid, .crumb { display: none; } }
  .railbtn { display: none; }
  @media (max-width: 1180px) { .railbtn { display: inline-flex; } }
  .sidetoggle svg { width: 16px; height: 16px; transition: transform .2s var(--ease); }
  body.side-collapsed .sidetoggle svg { transform: scaleX(-1); }

  /* ---------------- sidebar: run workspace ---------------- */
  .side { position: fixed; top: 46px; bottom: 0; left: 0; width: 240px; overflow-y: auto; overscroll-behavior: contain;
    border-right: 1px solid var(--line); padding: 10px 8px 12px; background: var(--panel);
    display: flex; flex-direction: column; z-index: 41; transition: transform .26s var(--ease), box-shadow .26s var(--ease); }
  .newrun { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 8px 10px; border-radius: 9px; color: var(--ink2); font-size: 13px; transition: background .12s var(--ease); margin-bottom: 6px; }
  .newrun:hover { background: var(--fill2); color: var(--ink); }
  .newrun svg { width: 15px; height: 15px; }
  .grp { padding: 14px 10px 6px; font-size: 11px; letter-spacing: .06em; color: var(--ink3); font-weight: 600; display: flex; align-items: center; gap: 6px; }
  .grp .cnt { color: var(--ink3); font-weight: 500; }
  .grp.you { color: var(--warn); }
  .runrow { display: block; width: 100%; text-align: left; padding: 8px 10px; border-radius: 9px; margin-bottom: 1px; transition: background .12s var(--ease); position: relative; }
  .runrow:hover { background: var(--fill); }
  .runrow.cur { background: var(--fill2); }
  .runrow .g { font-size: 13px; line-height: 1.4; color: var(--ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 450; }
  .runrow.done-run .g { color: var(--ink2); font-weight: 400; }
  .runrow .m { display: flex; align-items: center; gap: 6px; margin-top: 5px; font: 11px var(--mono); color: var(--ink3); }
  .runrow .m .badge-you { color: var(--warn); font-weight: 600; font-family: var(--font); letter-spacing: 0; }
  .runrow .m .prog { margin-left: auto; }
  .empty { padding: 20px 12px; color: var(--ink3); font-size: 12.5px; line-height: 1.6; }
  .side .foot { margin-top: auto; padding: 12px 10px 4px; border-top: 1px solid var(--hair); font-size: 12px; color: var(--ink2); display: flex; align-items: center; gap: 8px; }
  .side .foot .idot { width: 20px; height: 20px; border-radius: 50%; background: var(--ink); color: var(--bg); display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 650; }
  .side .foot a { color: var(--ink3); margin-left: auto; font-size: 11px; }
  .side .foot a:hover { color: var(--ink); }

  /* ---------------- layout frame ---------------- */
  .main { margin: 46px 320px 0 240px; min-height: calc(100dvh - 46px); transition: margin-left .26s var(--ease), margin-right .26s var(--ease); }
  .rail { position: fixed; top: 46px; bottom: 0; right: 0; width: 320px; overflow-y: auto; overscroll-behavior: contain;
    border-left: 1px solid var(--line); padding: 20px 18px 40px; background: var(--panel); z-index: 40; }
  /* left-edge hot-zone reveals the collapsed sidebar as a floating peek */
  .edge { display: none; position: fixed; left: 0; top: 46px; bottom: 0; width: 14px; z-index: 39; }

  /* desktop: user-collapsible sidebar with edge-peek */
  @media (min-width: 1001px) {
    body.side-collapsed .side { transform: translateX(-101%); box-shadow: none; }
    body.side-collapsed .main { margin-left: 0; }
    body.side-collapsed .composer { left: 0; }
    body.side-collapsed .edge { display: block; }
    body.side-collapsed .side.peek { transform: none; box-shadow: 10px 0 60px -12px rgba(15,15,15,.28); border-radius: 0 12px 12px 0; }
  }

  @media (max-width: 1180px) {
    .main { margin-right: 0; }
    .rail { transform: translateX(100%); transition: transform .28s var(--ease), box-shadow .28s var(--ease); box-shadow: none; width: 340px; }
    .rail.open { transform: none; box-shadow: -10px 0 60px -12px rgba(15,15,15,.28); }
  }
  @media (max-width: 1000px) {
    .side { transform: translateX(-101%); }
    .side.open { transform: none; box-shadow: 10px 0 60px -12px rgba(15,15,15,.28); }
    .main { margin-left: 0; }
    .composer { left: 0; }
  }

  /* ---------------- document column ---------------- */
  .doc { max-width: 720px; margin: 0 auto; padding: 40px 32px 200px; }
  .kicker { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink3); font-weight: 600; display: flex; align-items: center; gap: 8px; height: 16px; }
  h1.title { font-size: 22px; line-height: 1.34; font-weight: 660; letter-spacing: -.018em; margin: 12px 0 0; }
  .metaline { margin-top: 14px; font-size: 12.5px; color: var(--ink2); display: flex; flex-wrap: wrap; align-items: center; gap: 2px; }
  .metaline .sep { margin: 0 9px; color: var(--line2); }
  .metaline .cp { cursor: pointer; border-radius: 5px; padding: 1px 5px; transition: background .12s; }
  .metaline .cp:hover { background: var(--fill2); }

  /* ---------------- decision gate (center, prominent) ---------------- */
  .decision { margin: 30px 0 0; border: 1px solid var(--line2); border-radius: 14px; padding: 18px 20px; background: var(--surface); box-shadow: var(--shadow); animation: rise .5s var(--ease) both; }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .decision .k { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--warn); font-weight: 680; display: flex; align-items: center; gap: 7px; }
  .decision .k::before { content: ""; width: 8px; height: 8px; border-radius: 2px; transform: rotate(45deg); background: var(--warn); }
  .decision .s { font-size: 15px; font-weight: 520; margin-top: 8px; line-height: 1.55; }
  .decision input[type=text] { width: 100%; margin-top: 14px; border: 1px solid var(--line2); border-radius: 9px; background: var(--bg); padding: 9px 11px; font: 13.5px var(--font); color: var(--ink); outline: none; transition: border-color .15s, box-shadow .15s; }
  .decision input[type=text]:focus { border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-fill); }
  .decision .acts { display: flex; gap: 9px; margin-top: 14px; }
  .pbtn { background: var(--ink); color: var(--bg); border-radius: 999px; padding: 8px 20px; font-size: 13px; font-weight: 560; transition: opacity .12s, transform .12s var(--ease); }
  .pbtn:hover { opacity: .85; } .pbtn:active { transform: scale(.97); }
  .gbtn { border-radius: 999px; padding: 8px 16px; font-size: 13px; color: var(--ink2); border: 1px solid var(--line2); transition: color .15s, border-color .15s; }
  .gbtn:hover { color: var(--bad); border-color: var(--bad); }
  details.d-more summary { cursor: pointer; font-size: 12px; color: var(--ink3); margin-top: 10px; list-style: none; }
  details.d-more summary::-webkit-details-marker { display: none; }
  details.d-more summary::before { content: "›"; display: inline-block; width: 12px; transition: transform .15s; }
  details.d-more[open] summary::before { transform: rotate(90deg); }
  details.d-more pre { background: var(--codebg); border-radius: 10px; padding: 12px 14px; font: 12px/1.6 var(--mono); white-space: pre-wrap; max-height: 300px; overflow: auto; margin: 8px 0 0; }

  /* ---------------- conversation ---------------- */
  .convhead { margin: 34px 0 4px; display: flex; align-items: center; }
  .convhead .h { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink3); font-weight: 600; }
  .convhead .sp { flex: 1; }
  .conv { margin-top: 4px; }
  .msg { padding: 20px 0 4px; animation: fade .5s var(--ease) both; }
  @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .msg .head { display: flex; align-items: center; gap: 9px; }
  .pfp { width: 23px; height: 23px; border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 650; }
  .pfp.agent { background: var(--ink); color: var(--bg); }
  .pfp.agent2 { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--line2); }
  .pfp.human { background: var(--warn); color: #fff; }
  .msg .head .n { font-weight: 630; font-size: 13.5px; }
  .msg .head .r { font-size: 12px; color: var(--ink3); }
  .msg .head .t { font: 11px var(--mono); color: var(--ink3); margin-left: auto; opacity: 0; transition: opacity .15s; }
  .msg:hover .head .t { opacity: 1; }
  .badge { font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line2); color: var(--ink2); }
  .badge.bad { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 42%, transparent); }
  .badge.ok { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 42%, transparent); }
  .badge.hm { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 42%, transparent); }
  .msg .body { margin: 8px 0 0 32px; font-size: 14.5px; line-height: 1.72; max-width: 62ch; }
  .msg .body.rule { padding-left: 15px; border-left: 2px solid var(--line2); }
  .msg .body.rule.bad { border-left-color: color-mix(in srgb, var(--bad) 55%, transparent); }
  .msg .body.rule.ok { border-left-color: color-mix(in srgb, var(--ok) 55%, transparent); }
  .msg .body.rule.hm { border-left-color: color-mix(in srgb, var(--warn) 55%, transparent); }
  .msg .body p { margin: 0 0 10px; } .msg .body p:last-child { margin: 0; }
  .msg .body pre { background: var(--codebg); border-radius: 10px; padding: 12px 14px; overflow-x: auto; font: 12.5px/1.6 var(--mono); margin: 10px 0; }
  .msg .body code { font: .9em var(--mono); background: var(--codebg); border-radius: 4px; padding: 1px 5px; }
  .msg .body pre code { background: none; padding: 0; }
  .msg .body ul { margin: 6px 0 10px; padding-left: 22px; } .msg .body li { margin: 2px 0; }
  .verdictline { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
  .verdictline.ok { color: var(--ok); background: color-mix(in srgb, var(--ok) 10%, transparent); }
  .verdictline.bad { color: var(--bad); background: color-mix(in srgb, var(--bad) 10%, transparent); }
  details.m-more summary { cursor: pointer; font-size: 12px; color: var(--ink3); list-style: none; margin-top: 8px; }
  details.m-more summary::-webkit-details-marker { display: none; }
  details.m-more summary::before { content: "›"; display: inline-block; width: 12px; transition: transform .15s; }
  details.m-more[open] summary::before { transform: rotate(90deg); }
  details.m-more pre { background: var(--codebg); border-radius: 10px; padding: 12px; font: 12px/1.6 var(--mono); white-space: pre-wrap; max-height: 360px; overflow: auto; }

  /* system lines */
  .sys { margin: 18px 0 0 32px; font-size: 12.5px; color: var(--ink3); display: flex; align-items: baseline; gap: 8px; animation: fade .45s var(--ease) both; }
  .sys::before { flex: none; }
  .sys b { color: var(--ink2); font-weight: 600; }
  .sys.gate::before { content: "◆"; color: var(--warn); }
  .sys.ok::before { content: "✓"; color: var(--ok); }
  .sys.no::before { content: "✕"; color: var(--bad); }
  .sys.task::before { content: "○"; color: var(--ink3); }
  .sys.taskdone::before { content: "●"; color: var(--ok); }

  /* machine steps capsule */
  .steps { margin: 16px 0 0 32px; animation: fade .45s var(--ease) both; }
  .steps summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font: 11.5px var(--mono); color: var(--ink3); padding: 3px 0; transition: color .12s; }
  .steps summary:hover { color: var(--ink2); }
  .steps summary::-webkit-details-marker { display: none; }
  .steps summary .chev { display: inline-block; width: 10px; transition: transform .15s; }
  .steps[open] summary .chev { transform: rotate(90deg); }
  .steps .rows { margin: 8px 0 4px 5px; border-left: 1px solid var(--line); padding-left: 14px; }
  .steps .row { font: 11.5px/1.7 var(--mono); color: var(--ink3); overflow-wrap: anywhere; padding: 1px 0; }
  .steps .row b { color: var(--ink2); font-weight: 560; }
  .steps .row .fb { border: 1px solid var(--line2); border-radius: 5px; padding: 0 6px; margin-right: 4px; }

  /* ---------------- right rail cards ---------------- */
  .tele { border: 1px solid var(--line); border-radius: 14px; padding: 16px; background: var(--surface); box-shadow: var(--shadow); }
  .tele .ts { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 620; letter-spacing: -.01em; }
  .tele .tsub { font-size: 12px; color: var(--ink3); margin-top: 2px; }
  .tgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 10px; margin-top: 16px; }
  .tgrid .cell .l { font-size: 10.5px; letter-spacing: .04em; text-transform: uppercase; color: var(--ink3); font-weight: 600; }
  .tgrid .cell .v { font-size: 17px; font-weight: 600; margin-top: 2px; font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
  .tgrid .cell .v small { font-size: 11px; color: var(--ink3); font-weight: 500; }
  .tbar { margin-top: 14px; height: 4px; border-radius: 4px; background: var(--fill2); overflow: hidden; }
  .tbar > div { height: 100%; background: var(--ink); border-radius: 4px; transition: width .8s var(--ease); }

  .rsec { margin-top: 26px; }
  .rsec .rh { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink3); font-weight: 600; margin-bottom: 10px; display: flex; align-items: baseline; gap: 8px; }
  .rsec .rh .n { font-family: var(--mono); letter-spacing: 0; margin-left: auto; }

  /* tasks / plan */
  .trow { padding: 9px 8px; border-radius: 9px; cursor: pointer; transition: background .12s; }
  .trow:hover { background: var(--fill); }
  .trow .r1 { display: flex; align-items: flex-start; gap: 10px; }
  .tmark { width: 17px; height: 17px; flex: none; margin-top: 1px; }
  .tmark svg { width: 17px; height: 17px; display: block; }
  .trow .t { flex: 1; font-size: 13px; font-weight: 460; line-height: 1.5; }
  .trow.done .t { color: var(--ink2); }
  .trow.cur .t { font-weight: 560; }
  .trow .crit { display: none; margin: 8px 0 2px 27px; padding: 0; list-style: none; }
  .trow.open .crit { display: block; }
  .trow .crit li { font-size: 12px; color: var(--ink2); padding: 2px 0 2px 15px; position: relative; line-height: 1.5; }
  .trow .crit li::before { content: ""; position: absolute; left: 0; top: 8px; width: 6px; height: 6px; border-radius: 2px; border: 1px solid var(--line2); }
  .trow.done .crit li::before { background: var(--ok); border-color: var(--ok); }
  .tempty { padding: 4px 8px; color: var(--ink2); font-size: 12.5px; line-height: 1.6; display: flex; align-items: flex-start; gap: 9px; }
  .spin { width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid var(--line2); border-top-color: var(--blue); animation: spin 1s linear infinite; flex: none; margin-top: 2px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* agents */
  .agentcard { padding: 10px 8px; border-radius: 9px; transition: background .12s; }
  .agentcard:hover { background: var(--fill); }
  .agentcard .top { display: flex; align-items: center; gap: 8px; }
  .agentcard .pfp { width: 21px; height: 21px; font-size: 10px; }
  .agentcard .nm { font-size: 13px; font-weight: 560; }
  .agentcard .rl { font-size: 11.5px; color: var(--ink3); }
  .agentcard .top .dot { margin-left: auto; }
  .agentcard .mt { font: 11px var(--mono); color: var(--ink3); margin: 5px 0 0 29px; }
  .agentcard .acts { display: none; gap: 2px; margin: 6px 0 0 27px; }
  .agentcard:hover .acts { display: flex; }
  .lbtn { font-size: 11px; color: var(--ink3); padding: 2px 8px; border-radius: 6px; border: 1px solid var(--line); transition: color .12s, border-color .12s; }
  .lbtn:hover { background: var(--fill2); color: var(--ink); }
  .lbtn.bad:hover { color: var(--bad); border-color: var(--bad); }

  /* criteria */
  .criteria { margin: 0; padding: 0; list-style: none; }
  .criteria li { position: relative; padding: 4px 0 4px 22px; font-size: 12.5px; color: var(--ink2); line-height: 1.5; }
  .criteria li::before { content: ""; position: absolute; left: 3px; top: 10px; width: 6px; height: 6px; border-radius: 2px; border: 1px solid var(--line2); }

  /* changed files */
  .frow { display: flex; align-items: center; gap: 8px; padding: 4px 0; font: 12px var(--mono); color: var(--ink2); }
  .fkind { width: 15px; height: 15px; border-radius: 4px; flex: none; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; font-family: var(--font); }
  .fkind.added { background: color-mix(in srgb, var(--ok) 16%, transparent); color: var(--ok); }
  .fkind.modified { background: var(--blue-fill); color: var(--blue); }
  .fkind.deleted { background: color-mix(in srgb, var(--bad) 16%, transparent); color: var(--bad); }
  .frow .fp { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }

  /* ---------------- composer ---------------- */
  .composer { position: fixed; left: 240px; right: 320px; bottom: 0; z-index: 45; padding: 14px 16px 20px; background: linear-gradient(180deg, transparent, var(--bg) 42%); pointer-events: none; transition: left .26s var(--ease), right .26s var(--ease); }
  @media (max-width: 1180px) { .composer { right: 0; } }
  @media (max-width: 1000px) { .composer { left: 0; } }
  .composer .wrap { max-width: 720px; margin: 0 auto; padding: 0 32px; }
  .composer .box { pointer-events: auto; background: var(--surface); border: 1px solid var(--line2); border-radius: 18px; padding: 12px 14px 9px; box-shadow: var(--shadow); transition: border-color .15s, box-shadow .15s; }
  .composer .box:focus-within { border-color: var(--blue-line); box-shadow: 0 0 0 3px var(--blue-fill), var(--shadow); }
  .composer textarea { width: 100%; border: none; background: none; outline: none; resize: none; font: 14px/1.55 var(--font); color: var(--ink); max-height: 160px; min-height: 22px; }
  .composer textarea::placeholder { color: var(--ink3); }
  .composer .row2 { display: flex; align-items: center; gap: 3px; margin-top: 8px; }
  .selchip { font-size: 12px; color: var(--ink3); padding: 4px 9px; border-radius: 8px; transition: background .12s, color .12s; white-space: nowrap; }
  .selchip:hover { background: var(--fill2); color: var(--ink2); }
  .selchip.on { color: var(--ink); background: var(--fill2); }
  .selchip.warn.on { color: var(--warn); background: color-mix(in srgb, var(--warn) 12%, transparent); }
  .chipdiv { width: 1px; height: 15px; background: var(--line2); margin: 0 5px; flex: none; }
  .composer .sp { flex: 1; }
  .sendbtn { width: 30px; height: 30px; border-radius: 50%; background: var(--ink); color: var(--bg); display: inline-flex; align-items: center; justify-content: center; transition: opacity .12s, transform .12s var(--ease); flex: none; }
  .sendbtn:hover { opacity: .85; } .sendbtn:active { transform: scale(.94); }
  .sendbtn:disabled { opacity: .3; cursor: default; }
  .sendbtn svg { width: 14px; height: 14px; }
  .composer .note { margin: 8px auto 0; max-width: 720px; padding: 0 34px; font-size: 11px; color: var(--ink3); pointer-events: none; }
  .composer .ro { pointer-events: auto; max-width: 720px; margin: 0 auto; padding: 10px 14px; font-size: 12.5px; color: var(--ink3); background: var(--surface); border: 1px solid var(--line); border-radius: 12px; display: flex; align-items: center; gap: 8px; }

  /* ---------------- empty home ---------------- */
  .home { max-width: 640px; margin: 0 auto; padding: 12vh 32px 40px; text-align: center; }
  .home h2 { font-size: 24px; font-weight: 680; letter-spacing: -.02em; margin: 0; }
  .home p { color: var(--ink2); font-size: 14px; margin: 12px 0 0; line-height: 1.7; }
  .home .cmd { text-align: left; margin: 26px 0 0; background: var(--codebg); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; font: 12.5px/1.7 var(--mono); color: var(--ink2); overflow-x: auto; }
  .home .cmd .c0 { color: var(--ink3); }
</style>
</head>
<body>
<header>
  <button class="hbtn icobtn sidetoggle" id="menuBtn" title="Toggle sidebar (⌘\)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/></svg></button>
  <div class="brand"><span class="mark"></span>Pitwall</div>
  <span class="crumb" id="crumb"></span>
  <span class="sp"></span>
  <span class="runid" id="runid"></span>
  <button class="hbtn icobtn" id="themeBtn" title="Theme">◐</button>
  <button class="hbtn" id="langBtn">EN</button>
  <button class="hbtn" id="pauseBtn"></button>
  <button class="hbtn icobtn railbtn" id="railBtn" title="Panel">⊞</button>
</header>

<div class="edge" id="edge"></div>
<aside class="side" id="side">
  <button class="newrun" id="newRun"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span id="newRunLabel"></span></button>
  <div id="runlist"></div>
  <div class="foot">
    <span class="idot" id="ilabel">你</span><span id="identity"></span>
    <a href="https://github.com/YunyueLi/pitwall" target="_blank" rel="noopener">GitHub</a>
  </div>
</aside>

<div class="main">
<div class="doc" id="doc">
  <p class="kicker" id="kicker"></p>
  <h1 class="title" id="goal"></h1>
  <div class="metaline" id="metaline"></div>
  <div id="decisions"></div>
  <div class="convhead"><span class="h" id="secRoom"></span><span class="sp"></span><button class="hbtn" id="noiseChip" style="font-size:11px; text-transform:none; letter-spacing:0; padding:3px 8px"></button></div>
  <div class="conv" id="conv"></div>
</div>
</div>

<aside class="rail" id="rail">
  <div class="tele">
    <div class="ts"><span class="dot" id="hdot"></span><span id="teleState"></span></div>
    <div class="tsub" id="teleSub"></div>
    <div class="tgrid" id="teleGrid"></div>
    <div class="tbar"><div id="pfill" style="width:0%"></div></div>
  </div>
  <div class="rsec"><div class="rh"><span id="secTasks"></span><span class="n" id="taskCount"></span></div><div id="tlist"></div></div>
  <div class="rsec"><div class="rh" id="secAgents"></div><div id="agents"></div></div>
  <div class="rsec" id="critSec"><div class="rh" id="secCrit"></div><ol class="criteria" id="criteria"></ol></div>
  <div class="rsec" id="filesSec" style="display:none"><div class="rh"><span id="secFiles"></span><span class="n" id="fileCount"></span></div><div id="files"></div></div>
</aside>

<div class="composer" id="composer">
  <div class="wrap">
    <div class="box" id="cbox">
      <textarea id="dirText" rows="1"></textarea>
      <div class="row2">
        <span id="scopeChips"></span>
        <span class="chipdiv"></span>
        <span class="selchip" id="modeChip"></span>
        <span class="selchip warn" id="intChip"></span>
        <span class="sp"></span>
        <button class="sendbtn" id="sendBtn" title="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
      </div>
    </div>
    <div class="note" id="dirHint"></div>
  </div>
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
    'Pause': '暂停', 'Resume': '继续', 'Send': '发送', 'New run': '新建运行',
    'running': '运行中', 'paused': '已暂停', 'done': '已完成', 'failed': '失败', 'awaiting-review': '待验收',
    'team': '团队', 'pair': '结对',
    'idle': '空闲', 'working': '工作中', 'dead': '掉线', 'awaiting-approval': '等待批准',
    'director': '总监', 'engineer': '工程师', 'driver': '实现', 'reviewer': '评审',
    'plan': '计划', 'acceptance': '验收', 'task': '任务仲裁', 'tool': '操作',
    'Complete': '已完成', 'Live': '进行中', 'Paused': '已暂停', 'Needs you': '等你决定', 'Failed': '失败',
    'Plan': '任务', 'Agents': '代理', 'Criteria': '验收标准', 'Changes': '文件变更', 'The room': '协作现场',
    'show steps': '显示执行细节', 'hide steps': '隐藏执行细节',
    'tasks': '任务', 'turns': '轮', 'elapsed': '耗时', 'cost': '花费', 'tokens': 'Token',
    'planned': '待开工', 'building': '实现中', 'in review': '审核中', 'accepted': '已验收',
    'The director is studying the repository and drafting the plan…': '总监正在研究仓库、起草任务计划……',
    'No tasks yet.': '尚无任务。', 'No agents yet.': '尚无代理。', 'No changes yet.': '尚无文件变更。', 'None set.': '未设定。',
    'You': '你', 'human': '人类',
    'objection': '驳回', 'verdict': '裁决', 'report': '汇报', 'handoff': '计划', 'question': '提问', 'info': '消息',
    'directive': '指令', 'note': '批注', 'goal update': '目标更新',
    'supplement': '补充', 'override': '覆盖', 'interrupt': '打断',
    'to all': '发给全体', 'to ': '发给 ',
    'approved': '已批准', 'rejected': '已驳回',
    'run created': '运行创建', 'new task': '新任务', 'task update': '任务',
    'reports done': '自报完成', 'changes required': '需要修改', 'blocked': '受阻', 'approve': '通过',
    'steps': '步', 'show full message': '展开完整消息', 'details': '详情',
    'Approve': '通过', 'Reject': '驳回',
    'Add guidance, change direction, or overrule…': '补充指导、调整方向，或推翻先前口径……',
    'Lands at the next turn boundary, with a delivery receipt.': '将在下一轮次边界送达，留有送达回执。',
    'Aborts the current turn and re-delivers immediately.': '立即打断当前轮次并即时送达。',
    'delivery receipt': '送达回执', 'received directive': '已收到指令',
    'starts a turn': '开始新一轮', 'finished': '完成本轮', 'registered': '注册',
    'Raw': '原始输出', 'Interrupt': '打断',
    'run': '运行', 'Runs': '运行', 'Local · you': '本地 · 你', 'live': '在线',
    'Needs you': '等你决定', 'In progress': '进行中', 'Finished': '已结束',
    'This run is read-only — it is not driven by this process.': '该运行为只读——不由本进程驱动，如需操作请用 pitwall resume。',
    'Nothing running yet.': '暂无运行。',
    'Start one from the terminal:': '在终端里启动一个：',
    'copied': '已复制',
    'just now': '刚刚', 'm ago': ' 分钟前', 'h ago': ' 小时前', 'd ago': ' 天前'
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
    [/^recovered$/, '已恢复'], [/^unpaused by human$/, '被人类恢复'],
    [/^driver reports done.*$/, '实现方自报完成，等待独立评审'],
    [/^engineer reports done.*$/, '工程师自报完成，等待总监审核']
  ];
  var urlLang = new URLSearchParams(location.search).get('lang');
  var lang = (urlLang === 'zh' || urlLang === 'en') ? urlLang
    : localStorage.getItem('pitwall-lang') || (((navigator.language || '').toLowerCase().indexOf('zh') === 0) ? 'zh' : 'en');
  var RUN = new URLSearchParams(location.search).get('run');
  function api(p) {
    if (!RUN) return p;
    return p + (p.indexOf('?') >= 0 ? '&' : '?') + 'run=' + encodeURIComponent(RUN);
  }
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
    return fetch(api(path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.error) alert(d.error); return d; });
  }
  function tstr(ts) { return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }); }
  function money(v) { return '$' + (v || 0).toFixed(2); }
  function fmtTok(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
  function ago(iso) {
    var m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return t('just now');
    if (m < 60) return m + t('m ago');
    if (m < 1440) return Math.round(m / 60) + t('h ago');
    return Math.round(m / 1440) + t('d ago');
  }

  var htmlCache = {};
  function setHtml(id, html) {
    if (htmlCache[id] === html) return;
    htmlCache[id] = html;
    el(id).innerHTML = html;
  }

  // ------------------------------------------------------------ theme
  function applyTheme() {
    var urlT = new URLSearchParams(location.search).get('theme');
    var m = (urlT === 'light' || urlT === 'dark' || urlT === 'auto') ? urlT : (localStorage.getItem('pitwall-theme') || 'auto');
    var root = document.documentElement;
    if (m === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
    el('themeBtn').textContent = m === 'light' ? '☀' : m === 'dark' ? '☾' : '◐';
    el('themeBtn').title = m;
  }
  el('themeBtn').addEventListener('click', function () {
    var order = ['auto', 'light', 'dark'];
    var cur = localStorage.getItem('pitwall-theme') || 'auto';
    localStorage.setItem('pitwall-theme', order[(order.indexOf(cur) + 1) % 3]);
    applyTheme();
  });

  // ------------------------------------------------------------ markdown-lite
  var FENCE_AGENTOS = new RegExp(BT + BT + BT + '(?:pitwall|agentos)\\s*\\n([\\s\\S]*?)' + BT + BT + BT, 'g');
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
  var interrupt = false, mode = 'supplement';
  function applyStatic() {
    document.documentElement.lang = lang;
    el('langBtn').textContent = lang === 'zh' ? 'EN' : '中文';
    el('newRunLabel').textContent = t('New run');
    el('secRoom').textContent = t('The room');
    el('secTasks').textContent = t('Plan');
    el('secAgents').textContent = t('Agents');
    el('secCrit').textContent = t('Criteria');
    el('secFiles').textContent = t('Changes');
    el('identity').textContent = t('Local · you');
    el('ilabel').textContent = lang === 'zh' ? '你' : 'U';
    el('noiseChip').textContent = t(showNoise ? 'hide steps' : 'show steps');
    el('dirText').placeholder = t('Add guidance, change direction, or overrule…');
    el('dirHint').textContent = t(interrupt ? 'Aborts the current turn and re-delivers immediately.' : 'Lands at the next turn boundary, with a delivery receipt.');
    el('intChip').textContent = t('interrupt');
    renderModeChip();
  }

  // ------------------------------------------------------------ sidebar (grouped)
  function runProg(r) {
    if (r.tasksTotal) return r.tasksDone + '/' + r.tasksTotal;
    return '';
  }
  function runRow(r, curId) {
    var dot = r.live && r.status === 'running' ? 'running' : r.status;
    var meta = [];
    if (r.pending) meta.push('<span class="badge-you">' + (lang === 'zh' ? r.pending + ' 待办' : r.pending + ' pending') + '</span>');
    else meta.push('<span class="dot ' + dot + '"></span>' + esc(t(r.status)) + (r.live && r.status === 'running' ? ' · ' + t('live') : ''));
    var right = runProg(r) || (r.costUsd ? money(r.costUsd) : ago(r.createdAt));
    return '<button class="runrow' + (r.runId === curId ? ' cur' : '') + (r.status === 'done' || r.status === 'failed' ? ' done-run' : '') + '" data-run="' + esc(r.runId) + '">'
      + '<span class="g">' + esc(r.goal || r.runId) + '</span>'
      + '<span class="m">' + meta.join('') + '<span class="prog">' + esc(right) + '</span></span>'
      + '</button>';
  }
  function renderRuns(list) {
    var curId = state ? state.runId : RUN;
    if (!list.length) { setHtml('runlist', '<div class="empty">' + t('Nothing running yet.') + '</div>'); return; }
    var you = [], live = [], fin = [];
    list.forEach(function (r) {
      if (r.pending || r.status === 'awaiting-review') you.push(r);
      else if (r.status === 'done' || r.status === 'failed') fin.push(r);
      else live.push(r);
    });
    var html = '';
    function grp(cls, label, arr) {
      if (!arr.length) return '';
      return '<div class="grp ' + cls + '">' + esc(label) + '<span class="cnt">' + arr.length + '</span></div>'
        + arr.map(function (r) { return runRow(r, curId); }).join('');
    }
    html += grp('you', t('Needs you'), you);
    html += grp('', t('In progress'), live);
    html += grp('', t('Finished'), fin);
    setHtml('runlist', html);
  }
  function loadRuns() {
    fetch('/api/runs').then(function (r) { return r.json(); }).then(renderRuns).catch(function () {});
  }
  el('runlist').addEventListener('click', function (ev) {
    var b = ev.target.closest('.runrow'); if (!b) return;
    var q = '?run=' + encodeURIComponent(b.getAttribute('data-run'));
    if (urlLang) q += '&lang=' + urlLang;
    location.href = '/' + q;
  });
  function toggleSidebar() {
    if (window.innerWidth <= 1000) {
      el('side').classList.toggle('open');
      return;
    }
    var collapsed = document.body.classList.toggle('side-collapsed');
    localStorage.setItem('pitwall-side', collapsed ? '1' : '0');
    if (!collapsed) el('side').classList.remove('peek');
  }
  el('menuBtn').addEventListener('click', toggleSidebar);
  el('edge').addEventListener('mouseenter', function () { el('side').classList.add('peek'); });
  el('side').addEventListener('mouseleave', function () { if (document.body.classList.contains('side-collapsed')) el('side').classList.remove('peek'); });
  document.addEventListener('keydown', function (ev) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === '\\') { ev.preventDefault(); toggleSidebar(); }
  });
  el('railBtn').addEventListener('click', function () { el('rail').classList.toggle('open'); });
  el('newRun').addEventListener('click', function () {
    var cmd = 'pitwall run --repo <path> --goal "…" --criteria "…"';
    if (navigator.clipboard) navigator.clipboard.writeText(cmd);
    alert(lang === 'zh' ? '在终端启动新运行（命令已复制到剪贴板）：\n\n' + cmd : 'Start a new run from your terminal (command copied):\n\n' + cmd);
  });

  // ------------------------------------------------------------ header + telemetry + rail
  function gateLabel(g) { return lang === 'zh' ? t(g) + '门' : g + ' gate'; }
  function activeTasks(s) {
    return s.tasks.filter(function (x) { return x.status !== 'superseded' && x.status !== 'rejected'; });
  }
  function copyable(text, label) {
    return '<span class="cp" data-copy="' + esc(text) + '">' + esc(label) + '</span>';
  }
  function renderTop(s) {
    var tasks = activeTasks(s);
    var done = tasks.filter(function (x) { return x.status === 'accepted'; }).length;
    var pend = s.approvals.filter(function (a) { return !a.decision; });
    var working = s.agents.filter(function (a) { return a.state === 'working'; });
    var isWorking = working.length && s.status === 'running';

    // header
    el('hdot').className = 'dot ' + (isWorking ? 'working' : s.status);
    setHtml('crumb', '<span class="g">' + esc(t(s.mode)) + '</span><span class="csep">·</span><span>' + esc(t(s.status)) + '</span>');
    el('runid').textContent = s.runId;
    el('pauseBtn').textContent = t(s.status === 'paused' ? 'Resume' : 'Pause');
    el('pauseBtn').style.display = s.readonly ? 'none' : '';
    document.title = 'Pitwall — ' + t(s.status);

    // kicker + title
    var kick = pend.length ? t('Needs you') : s.status === 'done' ? t('Complete') : s.status === 'failed' ? t('Failed')
      : s.status === 'paused' ? t('Paused') : t('Live');
    var kdot = isWorking ? '<span class="dot working"></span>' : '';
    setHtml('kicker', kdot + esc(kick));
    el('goal').textContent = s.goal;

    // telemetry card
    var stateWord = pend.length ? t('Needs you') : isWorking ? (working.map(function (a) { return a.name; }).join(', '))
      : s.status === 'done' ? t('Complete') : s.status === 'failed' ? t('Failed') : s.status === 'paused' ? t('Paused') : t('Live');
    el('teleState').className = isWorking ? 'shimmer' : '';
    el('teleState').textContent = isWorking ? (lang === 'zh' ? stateWord + ' 工作中…' : stateWord + ' working…') : stateWord;
    var subBits = [t(s.mode)];
    if (s.statusReason) subBits.push(tSys(s.statusReason));
    el('teleSub').textContent = subBits.join(' · ');

    var cost = 0, tok = 0, turns = 0;
    s.agents.forEach(function (a) { cost += a.totals.costUsd; tok += a.totals.inputTokens + a.totals.outputTokens; turns += a.totals.turns; });
    var started = s.startedTs ? new Date(s.startedTs).getTime() : Date.now();
    var ended = (s.status === 'done' || s.status === 'failed') && s.lastTs ? new Date(s.lastTs).getTime() : Date.now();
    var mins = Math.max(0, Math.round((ended - started) / 60000));
    var dur = mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min';
    function cell(l, v, sub) { return '<div class="cell"><div class="l">' + esc(l) + '</div><div class="v">' + v + (sub ? ' <small>' + esc(sub) + '</small>' : '') + '</div></div>'; }
    setHtml('teleGrid',
      cell(t('cost'), esc(money(cost))) +
      cell(t('tokens'), esc(fmtTok(tok))) +
      cell(t('turns'), esc(String(turns))) +
      cell(t('elapsed'), esc(dur)));
    el('pfill').style.width = (tasks.length ? Math.round(done / tasks.length * 100) : (s.status === 'done' ? 100 : 0)) + '%';

    // meta line under title
    setHtml('metaline',
      copyable(s.runId, s.runId) + '<span class="sep">·</span>'
      + esc(tasks.length ? done + ' / ' + tasks.length + ' ' + t('tasks') : t('tasks'))
      + '<span class="sep">·</span>' + esc(money(cost)) + '<span class="sep">·</span>' + esc(dur));

    // agents (rail cards)
    setHtml('agents', s.agents.length ? s.agents.map(function (a) {
      var idx = agentIdx[a.name] || 0;
      var st = a.state === 'working' ? 'working' : a.state === 'paused' ? 'paused' : a.state === 'dead' ? 'dead' : '';
      return '<div class="agentcard">'
        + '<div class="top"><span class="pfp ' + (idx === 0 ? 'agent' : 'agent2') + '">' + esc(String(a.name).charAt(0).toUpperCase()) + '</span>'
        + '<span class="nm">' + esc(a.name) + '</span><span class="rl">' + esc(t(a.role)) + '</span><span class="dot ' + st + '"></span></div>'
        + '<div class="mt">' + a.totals.turns + ' ' + t('turns') + ' · ' + (a.totals.costUsd ? money(a.totals.costUsd) : fmtTok(a.totals.inputTokens + a.totals.outputTokens) + ' tok') + '</div>'
        + (s.readonly ? '' : '<div class="acts">'
          + (a.state === 'paused'
              ? '<button class="lbtn" data-act="unpause" data-agent="' + esc(a.name) + '">' + t('Resume') + '</button>'
              : '<button class="lbtn" data-act="pause" data-agent="' + esc(a.name) + '">' + t('Pause') + '</button>')
          + (a.state === 'working' ? '<button class="lbtn bad" data-act="interrupt" data-agent="' + esc(a.name) + '">' + t('Interrupt') + '</button>' : '')
          + '<button class="lbtn" data-act="raw" data-agent="' + esc(a.name) + '">' + t('Raw') + '</button>'
          + '</div>')
        + '</div>';
    }).join('') : '<div class="tempty">' + t('No agents yet.') + '</div>');

    // criteria
    setHtml('criteria', (s.criteria || []).length
      ? s.criteria.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('')
      : '<div class="tempty">' + t('None set.') + '</div>');

    // changed files
    var files = s.files || [];
    el('filesSec').style.display = files.length ? '' : 'none';
    if (files.length) {
      el('fileCount').textContent = files.length;
      setHtml('files', files.slice(-40).map(function (f) {
        var k = f.kind || 'modified';
        var letter = k === 'added' ? 'A' : k === 'deleted' ? 'D' : 'M';
        return '<div class="frow"><span class="fkind ' + k + '">' + letter + '</span><span class="fp">' + esc(f.path) + '</span></div>';
      }).join(''));
    }

    // decision gates (center)
    setHtml('decisions', pend.map(function (a) {
      return '<div class="decision">'
        + '<div class="k">' + esc(gateLabel(a.gate)) + '</div>'
        + '<div class="s">' + esc(tSys(a.summary)) + '</div>'
        + (a.detail ? '<details class="d-more"><summary>' + t('details') + '</summary><pre>' + esc(a.detail) + '</pre></details>' : '')
        + '<input type="text" id="note-' + esc(a.approvalId) + '" placeholder="' + (lang === 'zh' ? '备注——驳回请说明原因' : 'Note — say why if you reject') + '">'
        + '<div class="acts">'
        + '<button class="pbtn" data-appr="allow" data-id="' + esc(a.approvalId) + '">' + t('Approve') + '</button>'
        + '<button class="gbtn" data-appr="deny" data-id="' + esc(a.approvalId) + '">' + t('Reject') + '</button>'
        + '</div></div>';
    }).join(''));

    // composer read-only handling
    if (s.readonly) {
      el('dirText').disabled = true;
      el('sendBtn').disabled = true;
      el('dirHint').textContent = t('This run is read-only — it is not driven by this process.');
    }
  }

  // ------------------------------------------------------------ tasks / plan
  var MARKS = {
    pending: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.6" fill="none" stroke="var(--line2)" stroke-width="1.5"/></svg>',
    'in-progress': '<svg viewBox="0 0 18 18"><rect x="4.5" y="4.5" width="9" height="9" rx="2.2" transform="rotate(45 9 9)" fill="var(--blue)"><animate attributeName="opacity" values="1;.35;1" dur="1.8s" repeatCount="indefinite"/></rect></svg>',
    'needs-review': '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.6" fill="none" stroke="var(--warn)" stroke-width="1.5"/><path d="M9 5.4v3.8l2.6 1.5" fill="none" stroke="var(--warn)" stroke-width="1.5" stroke-linecap="round"/></svg>',
    accepted: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.2" fill="var(--ok)"/><path d="M5.8 9.2l2.2 2.2 4.2-4.6" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
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
      var cur = x.status === 'in-progress' ? ' cur' : '';
      return '<div class="trow' + (x.status === 'accepted' ? ' done' : '') + cur + open + '" data-task="' + esc(x.taskId) + '">'
        + '<div class="r1"><span class="tmark">' + (MARKS[x.status] || MARKS.pending) + '</span>'
        + '<span class="t">' + esc(x.title) + '</span></div>'
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
    var kindBadge = '', ruleCls = '';
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
        d.innerHTML = '<summary><span class="chev">›</span><span class="cs"></span></summary><div class="rows"></div>';
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
        html = sysLine('gate', '<b>' + esc(gateLabel(e.gate)) + '</b> — ' + esc(tSys(e.summary))); break;
      case 'approval.resolved':
        html = sysLine(e.decision === 'allow' ? 'ok' : 'no',
          '<b>' + t(e.decision === 'allow' ? 'approved' : 'rejected') + '</b>' + (e.note ? ' — ' + esc(e.note) : '') + ' · ' + t('human')); break;
      case 'task.created':
        html = sysLine('task', t('new task') + ' — <b>' + esc(e.title) + '</b> → ' + esc(e.assignee)); break;
      case 'task.updated':
        if (!e.status || (e.status === 'in-progress' && !e.note)) { html = ''; break; }
        html = sysLine(e.status === 'accepted' ? 'taskdone' : 'task',
          t('task update') + ' → <b>' + esc(t(STAGE[e.status] || e.status)) + '</b>' + (e.note ? ' — ' + esc(tSys(e.note)) : '')); break;
      case 'run.created':
        html = sysLine('task', t('run created') + ' — ' + e.agents.map(function (a) { return '<b>' + esc(a.name) + '</b> (' + esc(t(a.role)) + ')'; }).join(' + ')); break;
      case 'run.status':
        html = sysLine(e.status === 'done' ? 'ok' : e.status === 'paused' ? 'no' : 'task',
          t('run') + ' → <b>' + esc(t(e.status)) + '</b>' + (e.reason ? ' — ' + esc(tSys(e.reason)) : '')); break;
      case 'error':
        html = sysLine('no', '<span style="color:var(--bad)">' + esc(e.scope) + ' — ' + esc(e.message) + '</span>'); break;
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
    var cp = ev.target.closest('[data-copy]');
    if (cp) {
      var txt = cp.getAttribute('data-copy');
      if (navigator.clipboard) navigator.clipboard.writeText(txt);
      var old = cp.textContent; cp.textContent = t('copied');
      setTimeout(function () { cp.textContent = old; }, 1000);
      return;
    }
    var b = ev.target.closest('button'); if (!b) return;
    var act = b.getAttribute('data-act'), agent = b.getAttribute('data-agent');
    if (act && agent) {
      if (act === 'pause') post('/api/agent-pause', { agent: agent, paused: true });
      if (act === 'unpause') post('/api/agent-pause', { agent: agent, paused: false });
      if (act === 'interrupt') post('/api/agent-pause', { agent: agent, paused: true, interrupt: true });
      if (act === 'raw') {
        fetch(api('/api/raw/' + encodeURIComponent(agent) + '?n=300')).then(function (r) { return r.json(); }).then(function (d) {
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

  var scope = 'all';
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
  function send() {
    var text = el('dirText').value.trim(); if (!text) return;
    post('/api/directive', { scope: scope, mode: mode, text: text, interrupt: interrupt })
      .then(function () { el('dirText').value = ''; el('dirText').style.height = 'auto'; interrupt = false; el('intChip').classList.remove('on'); applyStatic(); });
  }
  el('sendBtn').addEventListener('click', send);
  el('dirText').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
  });
  el('dirText').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.metaKey && !ev.isComposing) { ev.preventDefault(); send(); }
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
    localStorage.setItem('pitwall-lang', lang);
    htmlCache = {};
    applyStatic();
    if (state) renderState(state);
    rebuildConv();
    loadRuns();
  });

  // ------------------------------------------------------------ state + boot
  var refetchTimer = null;
  function scheduleRefetch() {
    if (refetchTimer) return;
    refetchTimer = setTimeout(function () {
      refetchTimer = null;
      fetch(api('/api/state')).then(function (r) { return r.json(); }).then(renderState);
    }, 250);
  }
  function renderState(s) {
    state = s;
    s.agents.forEach(function (a, i) { agentIdx[a.name] = i % 2; });
    renderTop(s);
    renderTasks(s);
    renderScopes(s);
  }

  applyTheme();
  var sideParam = new URLSearchParams(location.search).get('side');
  if (sideParam === 'collapsed' || (sideParam !== 'expanded' && localStorage.getItem('pitwall-side') === '1')) document.body.classList.add('side-collapsed');
  applyStatic();
  loadRuns();
  setInterval(loadRuns, 30000);
  setInterval(function () { if (state) renderTop(state); }, 30000);
  fetch(api('/api/state')).then(function (r) { return r.json(); }).then(function (s) {
    renderState(s);
    if (new URLSearchParams(location.search).get('snapshot')) {
      fetch(api('/api/events?since=0')).then(function (r) { return r.json(); }).then(function (evs) {
        evs.forEach(function (env) { allEvents.push(env); appendEvent(env); });
      });
      return;
    }
    var es = new EventSource(api('/api/stream?since=0'));
    es.onmessage = function (m) {
      var env = JSON.parse(m.data);
      allEvents.push(env);
      appendEvent(env);
      scheduleRefetch();
    };
    es.onerror = function () {};
  });
})();
</script>
</body>
</html>`;
