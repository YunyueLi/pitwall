export const UI_HTML = String.raw`<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pitwall</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%23888' stroke-width='2.6'/%3E%3Ccircle cx='16' cy='16' r='4.5' fill='%232E6DF0'/%3E%3C/svg%3E">
<style>
  :root {
    --paper: #FAF9F6; --panel: #F1EFEA; --surface: #FFFFFF;
    --ink: #26241F; --ink2: rgba(38,36,31,.60); --ink3: rgba(38,36,31,.40); --ink4: rgba(38,36,31,.26);
    --line: rgba(38,36,31,.085); --line2: rgba(38,36,31,.15); --hair: rgba(38,36,31,.055);
    --fill: rgba(38,36,31,.045); --fill2: rgba(38,36,31,.08);
    --live: #2E6DF0; --live-fill: rgba(46,109,240,.10); --live-line: rgba(46,109,240,.30);
    --flag: #C98418; --flag-fill: rgba(201,132,24,.12);
    --ok: #2E9E62; --bad: #DB4B54;
    --codebg: #F4F3F0;
    --shadow-s: 0 1px 2px rgba(30,26,20,.05), 0 4px 12px -6px rgba(30,26,20,.10);
    --shadow-m: 0 1px 2px rgba(30,26,20,.05), 0 10px 24px -10px rgba(30,26,20,.14);
    --shadow-l: 0 2px 4px rgba(30,26,20,.06), 0 28px 56px -22px rgba(30,26,20,.26);
    --inset: inset 0 1px 0 rgba(255,255,255,.6);
    --spring: cubic-bezier(.32,.72,0,1);
    --ease: cubic-bezier(.22,.61,.36,1);
    --sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    --mono: "SF Mono", ui-monospace, "JetBrains Mono", "Cascadia Code", Menlo, monospace;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --paper: #161513; --panel: #100F0D; --surface: #1E1C19;
      --ink: rgba(255,253,247,.86); --ink2: rgba(255,253,247,.56); --ink3: rgba(255,253,247,.36); --ink4: rgba(255,253,247,.22);
      --line: rgba(255,253,247,.10); --line2: rgba(255,253,247,.16); --hair: rgba(255,253,247,.06);
      --fill: rgba(255,253,247,.05); --fill2: rgba(255,253,247,.09);
      --live: #4E8BF7; --live-fill: rgba(78,139,247,.16); --live-line: rgba(78,139,247,.4);
      --flag: #E0A63E; --flag-fill: rgba(224,166,62,.16); --ok: #43B877; --bad: #EC6069;
      --codebg: #242321;
      --shadow-s: 0 1px 2px rgba(0,0,0,.4), 0 6px 16px -8px rgba(0,0,0,.5);
      --shadow-m: 0 2px 4px rgba(0,0,0,.4), 0 14px 30px -12px rgba(0,0,0,.6);
      --shadow-l: 0 3px 6px rgba(0,0,0,.5), 0 34px 64px -22px rgba(0,0,0,.8);
      --inset: inset 0 1px 0 rgba(255,255,255,.06);
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --paper: #161513; --panel: #100F0D; --surface: #1E1C19;
    --ink: rgba(255,253,247,.86); --ink2: rgba(255,253,247,.56); --ink3: rgba(255,253,247,.36); --ink4: rgba(255,253,247,.22);
    --line: rgba(255,253,247,.10); --line2: rgba(255,253,247,.16); --hair: rgba(255,253,247,.06);
    --fill: rgba(255,253,247,.05); --fill2: rgba(255,253,247,.09);
    --live: #4E8BF7; --live-fill: rgba(78,139,247,.16); --live-line: rgba(78,139,247,.4);
    --flag: #E0A63E; --flag-fill: rgba(224,166,62,.16); --ok: #43B877; --bad: #EC6069;
    --codebg: #242321;
    --shadow-s: 0 1px 2px rgba(0,0,0,.4), 0 6px 16px -8px rgba(0,0,0,.5);
    --shadow-m: 0 2px 4px rgba(0,0,0,.4), 0 14px 30px -12px rgba(0,0,0,.6);
    --shadow-l: 0 3px 6px rgba(0,0,0,.5), 0 34px 64px -22px rgba(0,0,0,.8);
    --inset: inset 0 1px 0 rgba(255,255,255,.06);
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body { background: var(--paper); color: var(--ink); font: 15px/1.62 var(--sans); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow: hidden; }
  body::before { content: ""; position: fixed; inset: 0; z-index: 1; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); opacity: .5; mix-blend-mode: multiply; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) ~ * , body::before { } }
  :root[data-theme="dark"] body::before, body:has(:root[data-theme="dark"]) { }
  ::selection { background: var(--live-fill); }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; padding: 0; }
  input, textarea { font: inherit; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: var(--line2); border-radius: 10px; border: 3px solid transparent; background-clip: padding-box; }
  ::-webkit-scrollbar-thumb:hover { background: var(--ink3); background-clip: padding-box; }
  @media (prefers-reduced-motion: reduce) { * { animation-duration: .001ms !important; transition-duration: .001ms !important; } }

  /* signals */
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ink4); flex: none; }
  .dot.working, .dot.running { background: var(--ok); animation: beat 2.4s var(--ease) infinite; }
  .dot.paused, .dot.awaiting-review, .dot.needs-review { background: var(--flag); }
  .dot.done, .dot.accepted { background: var(--ok); }
  .dot.failed, .dot.dead { background: var(--bad); }
  @keyframes beat { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 55%, transparent); } 70% { box-shadow: 0 0 0 5px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
  .shimmer { background: linear-gradient(100deg, var(--ink2) 34%, var(--ink4) 50%, var(--ink) 60%, var(--ink2) 74%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: shim 2.4s linear infinite; }
  @keyframes shim { to { background-position: -180% 0; } }

  /* shell */
  .app { position: fixed; inset: 0; z-index: 2; display: grid; --cl: 260px; --cr: 340px;
    grid-template-columns: var(--cl) 1fr var(--cr); grid-template-rows: 52px 1fr;
    grid-template-areas: "side head head" "side main rail"; transition: grid-template-columns .34s var(--spring); }
  body.side-off .app { --cl: 64px; }
  body.rail-off .app { --cr: 0px; }
  @media (max-width: 1180px) { .app { grid-template-columns: var(--cl) 1fr; grid-template-areas: "side head" "side main"; } .rail { display: none; } .railtoggle { display: none; } }
  @media (max-width: 900px) { .app { --cl: 64px; } }

  /* header */
  header { grid-area: head; display: flex; align-items: center; gap: 10px; padding: 0 14px;
    border-bottom: 1px solid var(--hair); background: color-mix(in srgb, var(--paper) 72%, transparent);
    backdrop-filter: saturate(1.5) blur(20px); -webkit-backdrop-filter: saturate(1.5) blur(20px); position: relative; z-index: 20; }
  .crumb { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ink2); }
  .crumb b { color: var(--ink); font-weight: 560; }
  .crumb .csep { color: var(--line2); }
  header .sp { flex: 1; }
  .runid { font: 11px var(--mono); color: var(--ink4); }
  @media (max-width: 760px) { .runid { display: none; } }
  .hbtn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 10px; border-radius: 8px; font-size: 12.5px; color: var(--ink2); transition: background .16s var(--ease), color .16s var(--ease); }
  .hbtn:hover { background: var(--fill2); color: var(--ink); }
  .hbtn.icobtn { width: 30px; padding: 0; font-size: 14px; }
  .hbtn svg { width: 16px; height: 16px; }
  .railtoggle svg { transition: transform .3s var(--spring); }
  body.rail-off .railtoggle svg { transform: scaleX(-1); }

  /* sidebar */
  .side { grid-area: side; background: var(--panel); overflow-y: auto; overflow-x: hidden; padding: 0 10px 12px; display: flex; flex-direction: column; position: relative; z-index: 15; transition: box-shadow .34s var(--spring); }
  .brand { display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 4px 0 6px; flex: none; }
  .brand .home { display: flex; align-items: center; gap: 10px; min-width: 0; border-radius: 9px; padding: 4px 6px; margin-left: -6px; transition: background .16s var(--ease); cursor: pointer; }
  .brand .home:hover { background: var(--fill); }
  .mk { width: 26px; height: 26px; flex: none; }
  .mk svg { width: 100%; height: 100%; display: block; }
  .mk .ring, .mk .core { transform-box: view-box; transform-origin: 50px 50px; }
  .mk.spin .ring { animation: mkspin .72s cubic-bezier(.45,.05,.2,1); }
  .mk.spin .core { animation: mkpop .72s cubic-bezier(.2,.8,.3,1); }
  @keyframes mkspin { to { transform: rotate(180deg); } }
  @keyframes mkpop { 30% { transform: scale(1.4); } 100% { transform: scale(1); } }
  .brand .nm { font-weight: 680; font-size: 14.5px; letter-spacing: -.012em; line-height: 1; white-space: nowrap; }
  .brand .nm small { display: block; font: 500 9px/1 var(--sans); letter-spacing: .12em; color: var(--ink3); margin-top: 3px; text-transform: uppercase; }
  .brand .tgl { margin-left: auto; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: var(--ink3); opacity: 0; transition: opacity .18s var(--ease), background .16s, color .16s; flex: none; }
  .brand:hover .tgl, .brand .tgl:focus-visible { opacity: 1; }
  .brand .tgl:hover { background: var(--fill2); color: var(--ink); }
  .brand .tgl svg { width: 15px; height: 15px; transition: transform .3s var(--spring); }
  body.side-off .brand .tgl svg { transform: scaleX(-1); }
  .srow { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border-radius: 9px; color: var(--ink2); font-size: 13px; font-weight: 500; transition: background .16s var(--ease), color .16s; white-space: nowrap; }
  .srow:hover { background: var(--fill2); color: var(--ink); }
  .srow svg { width: 15px; height: 15px; flex: none; opacity: .72; }
  .srow .kbd { margin-left: auto; font: 500 10px/1 var(--mono); color: var(--ink3); border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 5px; padding: 3px 5px; background: var(--surface); }
  .sfilter { display: none; align-items: center; gap: 9px; padding: 6px 10px; border-radius: 9px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--live-line), 0 0 0 3px var(--live-fill); }
  .sfilter svg { width: 15px; height: 15px; flex: none; color: var(--ink3); }
  .sfilter input { border: none; background: none; outline: none; font-size: 13px; color: var(--ink); width: 100%; }
  .side.filtering .sfilter { display: flex; }
  .side.filtering #searchRow { display: none; }
  .grp { display: flex; align-items: center; gap: 6px; width: 100%; padding: 18px 10px 7px; font-size: 11px; color: var(--ink3); font-weight: 500; white-space: nowrap; }
  .grp.flag { color: var(--flag); font-weight: 600; }
  .grp .cnt { margin-left: auto; font-family: var(--mono); color: var(--ink4); }
  .empty { padding: 20px 12px; color: var(--ink3); font-size: 12.5px; line-height: 1.6; }
  .runrow { display: block; width: 100%; text-align: left; padding: 7px 9px; border-radius: 9px; margin-bottom: 1px; transition: background .16s var(--ease); position: relative; }
  .runrow:hover { background: var(--fill); }
  .runrow.cur { background: var(--fill2); box-shadow: inset 0 0 0 1px var(--line); }
  .runrow .r1 { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .runrow .si { width: 16px; height: 16px; flex: none; display: grid; place-items: center; }
  .runrow .si svg { width: 15px; height: 15px; }
  .runrow .g { flex: 1; font-size: 13px; line-height: 1.35; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .runrow.done-run .g { color: var(--ink2); }
  .runrow .m { display: flex; align-items: center; gap: 6px; margin: 4px 0 0 25px; font: 10.5px var(--mono); color: var(--ink3); white-space: nowrap; }
  .runrow .m .want { color: var(--flag); font-family: var(--sans); font-weight: 600; }
  .runrow .m .lv { display: inline-flex; align-items: center; gap: 5px; color: var(--ok); }
  .runrow .m .prog { margin-left: auto; }
  .foot { margin-top: auto; padding: 12px 8px 4px; border-top: 1px solid var(--hair); flex: none; }
  .acct { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--ink2); white-space: nowrap; }
  .acct .me { width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, var(--ink), color-mix(in srgb, var(--ink) 60%, var(--flag))); color: var(--paper); display: grid; place-items: center; font-size: 10px; font-weight: 650; flex: none; }
  .acct .lk { margin-left: auto; color: var(--ink3); display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; transition: background .15s, color .15s; }
  .acct .lk:hover { background: var(--fill2); color: var(--ink); }
  .acct .lk svg { width: 14px; height: 14px; }
  /* collapsed icon rail */
  body.side-off .side:not(.peek) { padding: 0 8px 12px; }
  body.side-off .side:not(.peek) .brand { justify-content: center; padding: 0; }
  body.side-off .side:not(.peek) .brand .home { margin: 0; padding: 4px; }
  body.side-off .side:not(.peek) .brand .nm, body.side-off .side:not(.peek) .brand .tgl { display: none; }
  body.side-off .side:not(.peek) .srow { justify-content: center; padding: 10px 0; gap: 0; }
  body.side-off .side:not(.peek) .srow .lb, body.side-off .side:not(.peek) .srow .kbd { display: none; }
  body.side-off .side:not(.peek) .grp, body.side-off .side:not(.peek) .empty { display: none; }
  body.side-off .side:not(.peek) .runrow { padding: 9px 0; }
  body.side-off .side:not(.peek) .runrow .r1 { justify-content: center; }
  body.side-off .side:not(.peek) .runrow .g, body.side-off .side:not(.peek) .runrow .m { display: none; }
  body.side-off .side:not(.peek) .foot { padding: 12px 0 4px; display: grid; place-items: center; }
  body.side-off .side:not(.peek) .acct .lk, body.side-off .side:not(.peek) .acct .nm2 { display: none; }
  body.side-off .side.peek { position: absolute; top: 0; bottom: 0; left: 0; width: 260px; box-shadow: var(--shadow-l); border-radius: 0 16px 16px 0; background: var(--panel); z-index: 35; }

  /* main / document */
  .main { grid-area: main; overflow-y: auto; position: relative; }
  .doc { max-width: 704px; margin: 0 auto; padding: 34px 30px 190px; }
  h1.goal { font-size: 22px; line-height: 1.34; font-weight: 660; letter-spacing: -.018em; margin: 0; text-wrap: balance; }
  .convhead { margin: 32px 0 4px; display: flex; align-items: center; }
  .convhead .h { font-size: 11px; color: var(--ink3); font-weight: 500; }
  .convhead .sp { flex: 1; }

  /* gate */
  .decision { margin: 26px 0 0; padding: 3px; border-radius: 20px; background: linear-gradient(180deg, var(--flag-fill), transparent); animation: rise .6s var(--spring) both; }
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  .decision .core { border: 1px solid color-mix(in srgb, var(--flag) 30%, var(--line2)); border-radius: 17px; padding: 18px 20px; background: var(--surface); box-shadow: var(--shadow-l), var(--inset); }
  .decision .k { display: inline-flex; align-items: center; gap: 8px; font: 680 10.5px/1 var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--flag); }
  .decision .k .di { width: 9px; height: 9px; border-radius: 2px; transform: rotate(45deg); background: var(--flag); box-shadow: 0 0 10px var(--flag); }
  .decision .s { font-size: 15px; font-weight: 520; margin-top: 9px; line-height: 1.5; }
  .decision input[type=text] { width: 100%; margin-top: 14px; border: 1px solid var(--line2); border-radius: 10px; background: var(--paper); padding: 10px 12px; font-size: 13.5px; color: var(--ink); outline: none; transition: border-color .18s, box-shadow .18s; }
  .decision input[type=text]:focus { border-color: var(--live); box-shadow: 0 0 0 3px var(--live-fill); }
  .decision .acts { display: flex; gap: 9px; margin-top: 14px; }
  .pbtn { display: inline-flex; align-items: center; gap: 10px; padding: 9px 10px 9px 20px; border-radius: 999px; background: var(--ink); color: var(--paper); font-size: 13.5px; font-weight: 560; box-shadow: var(--shadow-m); transition: transform .4s var(--spring), box-shadow .3s var(--ease); }
  .pbtn:hover { transform: translateY(-1px); box-shadow: var(--shadow-l); } .pbtn:active { transform: scale(.98); }
  .pbtn .ic { width: 26px; height: 26px; border-radius: 50%; background: color-mix(in srgb, var(--paper) 18%, transparent); display: grid; place-items: center; transition: transform .4s var(--spring); }
  .pbtn:hover .ic { transform: translate(3px,-1px); }
  .pbtn svg { width: 14px; height: 14px; }
  .gbtn { padding: 9px 18px; border-radius: 999px; border: 1px solid var(--line2); color: var(--ink2); font-size: 13.5px; transition: color .18s, border-color .18s; }
  .gbtn:hover { color: var(--bad); border-color: var(--bad); }
  details.d-more summary { cursor: pointer; font-size: 12px; color: var(--ink3); margin-top: 10px; list-style: none; }
  details.d-more summary::-webkit-details-marker { display: none; }
  details.d-more summary::before { content: "›"; display: inline-block; width: 12px; transition: transform .15s; }
  details.d-more[open] summary::before { transform: rotate(90deg); }
  details.d-more pre { background: var(--codebg); border-radius: 10px; padding: 12px 14px; font: 12px/1.6 var(--mono); white-space: pre-wrap; max-height: 300px; overflow: auto; margin: 8px 0 0; }

  /* conversation */
  .conv { margin-top: 4px; }
  .msg { padding: 20px 0 4px; animation: fade .5s var(--spring) both; }
  @keyframes fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .msg .head { display: flex; align-items: center; gap: 10px; }
  .pfp { width: 23px; height: 23px; border-radius: 50%; flex: none; display: grid; place-items: center; font-size: 11px; font-weight: 660; box-shadow: var(--shadow-s); }
  .pfp.agent { background: var(--ink); color: var(--paper); }
  .pfp.agent2 { background: var(--surface); color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--line2), var(--shadow-s); }
  .pfp.human { background: linear-gradient(135deg, var(--flag), color-mix(in srgb, var(--flag) 60%, var(--bad))); color: #fff; }
  .msg .n { font-weight: 620; font-size: 13.5px; }
  .msg .r { font-size: 12px; color: var(--ink3); }
  .msg .t { margin-left: auto; font: 11px var(--mono); color: var(--ink4); opacity: 0; transition: opacity .2s; }
  .msg:hover .t { opacity: 1; }
  .tag { font: 500 11px/1 var(--sans); color: var(--ink3); }
  .tag.no { color: var(--bad); } .tag.ok { color: var(--ok); } .tag.hm { color: var(--flag); }
  .body { margin: 10px 0 0 33px; font-size: 14.5px; line-height: 1.74; }
  .body.rule { padding-left: 15px; border-left: 2px solid var(--line2); }
  .body.rule.no { border-left-color: color-mix(in srgb, var(--bad) 55%, transparent); }
  .body.rule.ok { border-left-color: color-mix(in srgb, var(--ok) 55%, transparent); }
  .body.rule.hm { border-left-color: color-mix(in srgb, var(--flag) 55%, transparent); }
  .body p { margin: 0 0 10px; } .body p:last-child { margin: 0; }
  .body pre { background: var(--codebg); border-radius: 10px; padding: 12px 14px; overflow-x: auto; font: 12.5px/1.6 var(--mono); margin: 10px 0; }
  .body code { font: .9em var(--mono); background: var(--fill2); border-radius: 5px; padding: 1px 5px; }
  .body pre code { background: none; padding: 0; }
  .body ul { margin: 6px 0 10px; padding-left: 22px; } .body li { margin: 2px 0; }
  .verdict { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; font: 600 12.5px/1 var(--sans); padding: 6px 11px; border-radius: 999px; }
  .verdict.ok { color: var(--ok); background: color-mix(in srgb, var(--ok) 11%, transparent); }
  .verdict.no { color: var(--bad); background: color-mix(in srgb, var(--bad) 11%, transparent); }
  details.m-more summary { cursor: pointer; font-size: 12px; color: var(--ink3); list-style: none; margin-top: 8px; }
  details.m-more summary::-webkit-details-marker { display: none; }
  details.m-more summary::before { content: "›"; display: inline-block; width: 12px; transition: transform .15s; }
  details.m-more[open] summary::before { transform: rotate(90deg); }
  details.m-more pre { background: var(--codebg); border-radius: 10px; padding: 12px; font: 12px/1.6 var(--mono); white-space: pre-wrap; max-height: 360px; overflow: auto; }
  .sys { margin: 18px 0 0 33px; display: flex; align-items: baseline; gap: 9px; font-size: 12.5px; color: var(--ink3); animation: fade .45s var(--spring) both; }
  .sys b { color: var(--ink2); font-weight: 600; }
  .sys .mk2 { flex: none; font-family: var(--mono); }
  .sys.ok .mk2 { color: var(--ok); } .sys.no .mk2 { color: var(--bad); } .sys.gate .mk2 { color: var(--flag); } .sys.tk .mk2 { color: var(--ink4); } .sys.taskdone .mk2 { color: var(--ok); }
  .steps { margin: 16px 0 0 33px; animation: fade .45s var(--spring) both; }
  .steps summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font: 11.5px var(--mono); color: var(--ink3); transition: color .15s; }
  .steps summary::-webkit-details-marker { display: none; }
  .steps summary:hover { color: var(--ink2); }
  .steps .cv { display: inline-block; width: 9px; transition: transform .2s var(--spring); }
  .steps[open] .cv { transform: rotate(90deg); }
  .steps .rows { margin: 9px 0 2px 4px; padding-left: 15px; border-left: 1px solid var(--line); }
  .steps .row { font: 11.5px/1.75 var(--mono); color: var(--ink3); overflow-wrap: anywhere; }
  .steps .row b { color: var(--ink2); font-weight: 560; }
  .steps .row .fb { border: 1px solid var(--line2); border-radius: 5px; padding: 0 5px; }

  /* rail */
  .rail { grid-area: rail; background: var(--panel); border-left: 1px solid var(--hair); overflow-y: auto; padding: 20px 18px 44px; transition: transform .34s var(--spring); }
  .edgeR { display: none; position: absolute; right: 0; top: 52px; bottom: 0; width: 16px; z-index: 14; }
  body.rail-off .edgeR { display: block; }
  body.rail-off .rail { transform: translateX(101%); position: absolute; top: 52px; bottom: 0; right: 0; width: 340px; z-index: 35; }
  body.rail-off .rail.peek { transform: none; box-shadow: var(--shadow-l); border-radius: 16px 0 0 16px; }
  .tele { padding: 5px; border-radius: 20px; background: linear-gradient(180deg, var(--fill2), transparent); box-shadow: var(--shadow-s); }
  .tele .core { border: 1px solid var(--line); border-radius: 16px; padding: 16px; background: var(--surface); box-shadow: var(--inset); }
  .ts { display: flex; align-items: center; gap: 9px; }
  .ts .w { font-size: 15px; font-weight: 620; letter-spacing: -.01em; }
  .tsub { font-size: 12px; color: var(--ink3); margin-top: 3px; }
  .spark { margin-top: 14px; height: 34px; width: 100%; display: block; }
  .tgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px 12px; margin-top: 14px; }
  .cell .l { font-size: 10.5px; color: var(--ink3); font-weight: 500; }
  .cell .v { font: 600 18px/1.1 var(--mono); font-variant-numeric: tabular-nums; margin-top: 4px; letter-spacing: -.02em; }
  .cell .v small { font-size: 11px; color: var(--ink3); font-weight: 500; }
  .tbar { margin-top: 15px; height: 5px; border-radius: 5px; background: var(--fill2); overflow: hidden; }
  .tbar > div { height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--ink), color-mix(in srgb, var(--ink) 55%, var(--live))); transition: width .8s var(--spring); }
  .rsec { margin-top: 28px; }
  .rsec .rh { font-size: 11px; color: var(--ink3); font-weight: 500; display: flex; align-items: baseline; margin-bottom: 11px; }
  .rsec .rh .n { margin-left: auto; font-family: var(--mono); color: var(--ink4); }
  .trow { padding: 9px 8px; border-radius: 11px; cursor: pointer; transition: background .16s var(--ease); }
  .trow.cur { background: var(--live-fill); box-shadow: inset 0 0 0 1px var(--live-line); }
  .trow:hover { background: var(--fill); }
  .trow .r1 { display: flex; align-items: flex-start; gap: 10px; }
  .tmark { width: 18px; height: 18px; flex: none; margin-top: 1px; }
  .tmark svg { width: 18px; height: 18px; display: block; }
  .trow .t { flex: 1; font-size: 12.5px; line-height: 1.45; color: var(--ink2); }
  .trow.cur .t { color: var(--ink); font-weight: 520; }
  .trow.done .t { color: var(--ink3); }
  .trow .crit { display: none; margin: 8px 0 2px 27px; padding: 0; list-style: none; }
  .trow.open .crit { display: block; }
  .trow .crit li { font-size: 12px; color: var(--ink2); padding: 2px 0 2px 15px; position: relative; line-height: 1.5; }
  .trow .crit li::before { content: ""; position: absolute; left: 0; top: 8px; width: 6px; height: 6px; border-radius: 2px; border: 1px solid var(--line2); }
  .tempty { padding: 2px 8px; color: var(--ink3); font-size: 12.5px; line-height: 1.6; display: flex; align-items: flex-start; gap: 9px; }
  .spin { width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid var(--line2); border-top-color: var(--live); animation: sp 1s linear infinite; flex: none; margin-top: 2px; }
  @keyframes sp { to { transform: rotate(360deg); } }
  .agentcard { padding: 10px 8px; border-radius: 11px; transition: background .16s; }
  .agentcard:hover { background: var(--fill); }
  .agentcard .top { display: flex; align-items: center; gap: 9px; }
  .agentcard .pfp { width: 21px; height: 21px; font-size: 10px; box-shadow: none; }
  .agentcard .nm { font-size: 13px; font-weight: 560; }
  .agentcard .rl { font-size: 11.5px; color: var(--ink3); }
  .agentcard .top .dot { margin-left: auto; }
  .agentcard .mt { font: 11px var(--mono); color: var(--ink3); margin: 6px 0 0 30px; font-variant-numeric: tabular-nums; }
  .agentcard .acts { display: none; gap: 6px; margin: 7px 0 0 30px; }
  .agentcard:hover .acts { display: flex; }
  .lbtn { font-size: 11px; color: var(--ink3); padding: 3px 9px; border-radius: 7px; border: 1px solid var(--line); transition: color .14s, border-color .14s, background .14s; }
  .lbtn:hover { background: var(--fill2); color: var(--ink); }
  .lbtn.bad:hover { color: var(--bad); border-color: var(--bad); }
  .criteria { margin: 0; padding: 0; list-style: none; }
  .criteria li { position: relative; padding: 4px 0 4px 21px; font-size: 12.5px; color: var(--ink2); line-height: 1.5; }
  .criteria li::before { content: ""; position: absolute; left: 2px; top: 9px; width: 7px; height: 7px; border-radius: 2px; border: 1.4px solid var(--line2); }
  .frow { display: flex; align-items: center; gap: 9px; padding: 5px 0; font: 12px var(--mono); color: var(--ink2); }
  .fkind { width: 16px; height: 16px; border-radius: 5px; flex: none; display: grid; place-items: center; font: 700 9px/1 var(--sans); }
  .fkind.added { background: color-mix(in srgb, var(--ok) 16%, transparent); color: var(--ok); }
  .fkind.modified { background: var(--live-fill); color: var(--live); }
  .fkind.deleted { background: color-mix(in srgb, var(--bad) 16%, transparent); color: var(--bad); }
  .frow .fp { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* composer */
  .composer { position: absolute; left: 260px; right: 340px; bottom: 0; z-index: 12; padding: 16px 30px 20px; background: linear-gradient(180deg, transparent, var(--paper) 44%); pointer-events: none; transition: left .34s var(--spring), right .34s var(--spring); }
  @media (max-width: 1180px) { .composer { right: 0; } }
  @media (max-width: 900px) { .composer { left: 64px; } }
  body.side-off .composer { left: 64px; }
  body.rail-off .composer { right: 0; }
  .cwrap { max-width: 704px; margin: 0 auto; pointer-events: auto; }
  .cbox { padding: 4px; border-radius: 22px; background: linear-gradient(180deg, var(--fill2), transparent); box-shadow: var(--shadow-l); transition: transform .3s var(--spring); }
  .cbox:focus-within { transform: translateY(-2px); }
  .cbox .in { border: 1px solid var(--line2); border-radius: 18px; padding: 13px 15px 10px; background: var(--surface); box-shadow: var(--inset); transition: border-color .2s, box-shadow .2s; }
  .cbox:focus-within .in { border-color: var(--live-line); box-shadow: 0 0 0 3px var(--live-fill), var(--inset); }
  .cbox textarea { width: 100%; border: none; background: none; outline: none; resize: none; font: 14.5px/1.55 var(--sans); color: var(--ink); max-height: 150px; min-height: 22px; }
  .cbox textarea::placeholder { color: var(--ink3); }
  .row2 { display: flex; align-items: center; gap: 3px; margin-top: 9px; }
  .selchip { font-size: 12px; color: var(--ink3); padding: 5px 10px; border-radius: 9px; transition: background .16s, color .16s; white-space: nowrap; }
  .selchip:hover { background: var(--fill2); color: var(--ink2); }
  .selchip.on { color: var(--ink); background: var(--fill2); }
  .selchip.warn.on { color: var(--flag); background: var(--flag-fill); }
  .chipdiv { width: 1px; height: 15px; background: var(--line2); margin: 0 6px; }
  .row2 .sp { flex: 1; }
  .sendbtn { width: 34px; height: 34px; border-radius: 50%; background: var(--ink); color: var(--paper); display: grid; place-items: center; box-shadow: var(--shadow-m); transition: transform .35s var(--spring), opacity .2s; }
  .sendbtn:hover { transform: scale(1.06) translateY(-1px); } .sendbtn:active { transform: scale(.94); }
  .sendbtn:disabled { opacity: .35; cursor: default; transform: none; }
  .sendbtn svg { width: 15px; height: 15px; }
  .note { margin: 9px auto 0; max-width: 704px; font-size: 11px; color: var(--ink3); padding: 0 4px; }

  .toast { position: fixed; bottom: 108px; left: 50%; transform: translateX(-50%) translateY(14px); z-index: 50; background: var(--ink); color: var(--paper); font-size: 12.5px; padding: 9px 16px; border-radius: 999px; box-shadow: var(--shadow-l); opacity: 0; pointer-events: none; transition: opacity .3s var(--ease), transform .4s var(--spring); }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
</head>
<body>
<div class="app" id="app">
  <header>
    <span class="crumb" id="crumb"></span>
    <span class="sp"></span>
    <span class="runid" id="runid"></span>
    <button class="hbtn icobtn" id="themeBtn" title="Theme">◐</button>
    <button class="hbtn" id="langBtn">EN</button>
    <button class="hbtn" id="pauseBtn"></button>
    <button class="hbtn icobtn railtoggle" id="railBtn" title="Panel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M15 4v16"/></svg></button>
  </header>

  <div class="edgeR" id="edgeR"></div>
  <aside class="side" id="side">
    <div class="brand">
      <span class="home" id="brandHome" title="Pitwall">
        <span class="mk" id="mk"><svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <g class="ring">
            <circle cx="50" cy="50" r="33" stroke="var(--ink)" stroke-width="7"/>
            <rect x="46.5" y="4" width="7" height="14" rx="2" fill="var(--ink)"/>
            <rect x="46.5" y="82" width="7" height="14" rx="2" fill="var(--ink)"/>
            <rect x="4" y="46.5" width="14" height="7" rx="2" fill="var(--ink)"/>
            <rect x="82" y="46.5" width="14" height="7" rx="2" fill="var(--ink)"/>
          </g>
          <circle class="core" cx="50" cy="50" r="10" fill="var(--live)"/>
        </svg></span>
        <span class="nm">Pitwall<small id="brandSub">PIT WALL</small></span>
      </span>
      <button class="tgl" id="sideBtn" title="Collapse (⌘\)" aria-label="collapse"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/></svg></button>
    </div>
    <button class="srow" id="newRow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span class="lb" id="tNew"></span></button>
    <button class="srow" id="searchRow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span class="lb" id="tSearch"></span><span class="kbd">⌘K</span></button>
    <div class="sfilter" id="sfilter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="filterIn" type="text"></div>
    <div id="runlist"></div>
    <div class="foot">
      <div class="acct"><span class="me">你</span><span class="nm2" id="identity"></span><a class="lk" href="https://github.com/YunyueLi/pitwall" target="_blank" rel="noopener" title="GitHub"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4-1.4 6.8-5.2 6.8-9.7C22 6.6 17.5 2 12 2z"/></svg></a></div>
    </div>
  </aside>

  <main class="main" id="main">
    <div class="doc">
      <h1 class="goal" id="goal"></h1>
      <div id="decisions"></div>
      <div class="convhead"><span class="h" id="secRoom"></span><span class="sp"></span><button class="hbtn" id="noiseChip" style="font-size:11px;padding:3px 8px"></button></div>
      <div class="conv" id="conv"></div>
    </div>
  </main>

  <aside class="rail" id="rail">
    <div class="tele"><div class="core">
      <div class="ts"><span class="dot" id="hdot"></span><span class="w" id="teleState"></span></div>
      <div class="tsub" id="teleSub"></div>
      <canvas class="spark" id="spark"></canvas>
      <div class="tgrid" id="teleGrid"></div>
      <div class="tbar"><div id="pfill" style="width:0%"></div></div>
    </div></div>
    <div class="rsec"><div class="rh"><span id="secTasks"></span><span class="n" id="taskCount"></span></div><div id="tlist"></div></div>
    <div class="rsec" id="agentsSec"><div class="rh" id="secAgents"></div><div id="agents"></div></div>
    <div class="rsec" id="critSec"><div class="rh" id="secCrit"></div><ol class="criteria" id="criteria"></ol></div>
    <div class="rsec" id="filesSec" style="display:none"><div class="rh"><span id="secFiles"></span><span class="n" id="fileCount"></span></div><div id="files"></div></div>
  </aside>

  <div class="composer" id="composer">
    <div class="cwrap">
      <div class="cbox"><div class="in">
        <textarea id="dirText" rows="1"></textarea>
        <div class="row2">
          <span id="scopeChips"></span>
          <span class="chipdiv"></span>
          <button class="selchip" id="modeChip"></button>
          <button class="selchip warn" id="intChip"></button>
          <span class="sp"></span>
          <button class="sendbtn" id="sendBtn" title="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
        </div>
      </div></div>
      <div class="note" id="dirHint"></div>
    </div>
  </div>
</div>
<div class="toast" id="toast"></div>

<script>
(function () {
  'use strict';
  var BT = String.fromCharCode(96);
  var $ = function (id) { return document.getElementById(id); };
  var state = null, allEvents = [], agentIdx = {}, showNoise = false;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- i18n
  var ZH = {
    'Pause': '暂停', 'Resume': '继续', 'New run': '新建运行', 'Search runs': '搜索运行',
    'running': '运行中', 'paused': '已暂停', 'done': '已完成', 'failed': '失败', 'awaiting-review': '待验收',
    'team': '团队', 'pair': '结对', 'idle': '空闲', 'working': '工作中', 'dead': '无响应',
    'director': '总监', 'engineer': '工程师', 'driver': '实现', 'reviewer': '评审',
    'plan': '计划', 'acceptance': '验收', 'task': '任务仲裁', 'tool': '操作',
    'Complete': '已完成', 'Live': '进行中', 'Paused': '已暂停', 'Needs you': '等你决定', 'Failed': '失败',
    'Conversation': '对话', 'Plan': '任务', 'Agents': '代理', 'Criteria': '验收标准', 'Changes': '文件变更',
    'show steps': '显示执行细节', 'hide steps': '隐藏执行细节',
    'tasks': '任务', 'turns': '轮', 'elapsed': '耗时', 'cost': '花费', 'tokens': 'Token',
    'planned': '待开始', 'building': '实现中', 'in review': '审核中', 'accepted': '已验收',
    'The director is studying the repository and drafting the plan…': '总监正在研究仓库、起草任务计划……',
    'No tasks yet.': '尚无任务。', 'Local · you': '本地 · 你', 'live': '在线',
    'You': '你', 'human': '人类',
    'objection': '驳回', 'verdict': '裁决', 'report': '汇报', 'handoff': '计划', 'question': '提问', 'info': '消息',
    'directive': '指令', 'note': '批注', 'goal update': '目标更新',
    'supplement': '补充', 'override': '覆盖', 'interrupt': '中断',
    'to all': '发给全体', 'to ': '发给 ', 'approved': '已批准', 'rejected': '已驳回',
    'run created': '已创建运行', 'new task': '新任务', 'task update': '任务',
    'reports done': '报告完成', 'changes required': '需要修改', 'blocked': '受阻', 'approve': '通过',
    'steps': '步', 'show full message': '展开完整消息', 'details': '详情', 'Approve': '通过', 'Reject': '驳回',
    'Add guidance, change direction, or overrule…': '补充说明、调整方向，或推翻此前的指令……',
    'Lands at the next turn boundary, with a delivery receipt.': '将在下一轮次边界送达，并留有送达回执。',
    'Aborts the current turn and re-delivers immediately.': '立即中断当前轮次并即时送达。',
    'delivery receipt': '送达回执', 'received directive': '已收到指令',
    'starts a turn': '开始新一轮', 'finished': '完成本轮', 'registered': '已注册',
    'Raw': '原始输出', 'Interrupt': '中断', 'run': '运行',
    'Needs you': '等你决定', 'In progress': '进行中', 'Finished': '已结束',
    'This run is read-only — it is not driven by this process.': '该运行为只读——不由本进程驱动，如需操作请用 pitwall resume。',
    'Nothing running yet.': '暂无运行。', 'copied': '已复制',
    'just now': '刚刚', 'm ago': ' 分钟前', 'h ago': ' 小时前', 'd ago': ' 天前'
  };
  var SYS = [
    [/^The director proposes (\d+) task(?:s|\(s\))?\. Approve the plan to let the engineer start\.$/, '总监提出 $1 个任务的计划，批准后工程师开始实现。'],
    [/^All (\d+) task(?:s|\(s\))? implemented and approved by the director\. Final human acceptance required\.$/, '全部 $1 个任务已实现并通过总监审核，等待你的最终验收。'],
    [/^"(.+)": director still objects after (\d+) rounds\. Your call\.$/, '「$1」：总监 $2 轮后仍不通过，由你裁决。'],
    [/^Reviewer approves after round (\d+)\. Human acceptance required\.$/, '评审在第 $1 轮通过，等待你的验收。'],
    [/^Max review rounds \((\d+)\) reached without reviewer approval\. Human decision required\.$/, '已达最大评审轮数（$1）仍未通过，由你决定。'],
    [/^director approved in review round (\d+)$/, '总监在第 $1 轮审核通过'],
    [/^director objection in round (\d+)$/, '总监在第 $1 轮驳回'],
    [/^engineer reports done; director review pending$/, '工程师报告完成，等待总监审核'],
    [/^driver reports done; awaiting independent review$/, '实现方报告完成，等待独立评审'],
    [/^reviewer objection in round (\d+)$/, '评审在第 $1 轮驳回'],
    [/^plan rejected by human$/, '计划已被你驳回'],
    [/^human rejected acceptance(.*)$/, '你驳回了验收$1'],
    [/^human sided with the objection(.*)$/, '你支持了驳回意见$1'],
    [/^accepted by human$/, '人类已验收'], [/^task accepted by human$/, '人类已验收'],
    [/^accepted \(autonomous mode\)$/, '已验收（自主模式）'],
    [/^auto-approved \(autonomous mode\)$/, '自动放行（自主模式）'],
    [/^resumed from ledger$/, '已从账本恢复'], [/^recovered$/, '已恢复'],
    [/^paused by human$/, '被人类暂停'], [/^resumed by human$/, '被人类恢复'], [/^unpaused by human$/, '被人类恢复'],
    [/^orchestrator stopped$/, '编排器已停止'],
    [/^engineer is blocked and asked the human a question.*$/, '工程师受阻并向你提问，回复后请恢复运行'],
    [/^driver is blocked and asked the human a question.*$/, '实现方受阻并向你提问，回复后请恢复运行'],
    [/^accepted by director in review round (\d+)$/, '总监在第 $1 轮审核通过'],
    [/^orchestrator process died mid-turn.*$/, '编排进程在轮次中途终止，将带恢复提示重发'],
    [/^agent turn failed.*$/, '代理轮次失败：检查错误后可补充指令并恢复'],
    [/^two consecutive turn timeouts.*$/, '连续两次轮次超时，需要人工介入'],
    [/^driver reports done.*$/, '实现方报告完成，等待独立评审'],
    [/^engineer reports done.*$/, '工程师报告完成，等待总监审核']
  ];
  var urlLang = new URLSearchParams(location.search).get('lang');
  var lang = (urlLang === 'zh' || urlLang === 'en') ? urlLang
    : localStorage.getItem('pitwall-lang') || (((navigator.language || '').toLowerCase().indexOf('zh') === 0) ? 'zh' : 'en');
  var RUN = new URLSearchParams(location.search).get('run');
  function api(p) { return RUN ? p + (p.indexOf('?') >= 0 ? '&' : '?') + 'run=' + encodeURIComponent(RUN) : p; }
  function t(s) { return (lang === 'zh' && ZH[s]) ? ZH[s] : s; }
  function tSys(s) { if (lang !== 'zh') return s; for (var i = 0; i < SYS.length; i++) if (SYS[i][0].test(s)) return s.replace(SYS[i][0], SYS[i][1]); return s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function post(path, body) {
    return fetch(api(path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).then(function (d) { if (d && d.error) alert(d.error); return d; });
  }
  function tstr(ts) { return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }); }
  function money(v) { return '$' + (v || 0).toFixed(2); }
  function ftok(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
  function ago(iso) { var m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); if (m < 1) return t('just now'); if (m < 60) return m + t('m ago'); if (m < 1440) return Math.round(m / 60) + t('h ago'); return Math.round(m / 1440) + t('d ago'); }
  function toast(m) { var e = $('toast'); e.textContent = m; e.classList.add('show'); setTimeout(function () { e.classList.remove('show'); }, 1800); }
  var cache = {};
  function setHtml(id, html) { if (cache[id] === html) return; cache[id] = html; $(id).innerHTML = html; }

  // ---- theme
  function applyTheme() {
    var u = new URLSearchParams(location.search).get('theme');
    var m = (u === 'light' || u === 'dark' || u === 'auto') ? u : (localStorage.getItem('pitwall-theme') || 'auto');
    if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m);
    $('themeBtn').textContent = m === 'light' ? '☀' : m === 'dark' ? '☾' : '◐';
  }
  $('themeBtn').onclick = function () { var o = ['auto', 'light', 'dark'], c = localStorage.getItem('pitwall-theme') || 'auto'; localStorage.setItem('pitwall-theme', o[(o.indexOf(c) + 1) % 3]); applyTheme(); drawSpark(); };

  // ---- markdown-lite
  var FENCE_PW = new RegExp(BT + BT + BT + '(?:pitwall|agentos)\\s*\\n([\\s\\S]*?)' + BT + BT + BT, 'g');
  var FENCE = new RegExp(BT + BT + BT + '([a-zA-Z]*)\\n?([\\s\\S]*?)' + BT + BT + BT, 'g');
  var INLINE = new RegExp(BT + '([^' + BT + '\\n]+)' + BT, 'g');
  function stripStructured(text) { var json = null; var rest = String(text || '').replace(FENCE_PW, function (_, b) { try { json = JSON.parse(b.trim()); } catch (e) {} return ''; }); return { text: rest.trim(), json: json }; }
  function md(text) { var out = [], last = 0, m; FENCE.lastIndex = 0; var s = String(text || ''); while ((m = FENCE.exec(s))) { out.push(inline(s.slice(last, m.index))); out.push('<pre><code>' + esc(m[2]) + '</code></pre>'); last = m.index + m[0].length; } out.push(inline(s.slice(last))); return out.join(''); }
  function inline(t0) {
    var s = esc(t0).replace(INLINE, function (_, c) { return '<code>' + c + '</code>'; }).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return s.split(/\n{2,}/).map(function (p) {
      var lines = p.split('\n');
      var isList = lines.length > 1 && lines.every(function (l) { return /^\s*([-*]|\d+[.)])\s/.test(l) || !l.trim(); });
      if (isList) return '<ul>' + lines.filter(function (l) { return l.trim(); }).map(function (l) { return '<li>' + l.replace(/^\s*([-*]|\d+[.)])\s/, '') + '</li>'; }).join('') + '</ul>';
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  function clipBody(raw) { var p = stripStructured(raw); if (p.text.length <= 900) return md(p.text); return md(p.text.slice(0, 860)) + '<details class="m-more"><summary>' + t('show full message') + '</summary><pre>' + esc(raw) + '</pre></details>'; }

  // ---- static labels
  var interrupt = false, mode = 'supplement';
  function applyStatic() {
    document.documentElement.lang = lang;
    $('langBtn').textContent = lang === 'zh' ? 'EN' : '中文';
    $('tNew').textContent = t('New run'); $('tSearch').textContent = t('Search runs');
    $('secRoom').textContent = t('Conversation'); $('secTasks').textContent = t('Plan');
    $('secAgents').textContent = t('Agents'); $('secCrit').textContent = t('Criteria'); $('secFiles').textContent = t('Changes');
    $('identity').textContent = t('Local · you'); $('brandSub').textContent = lang === 'zh' ? '指挥席' : 'PIT WALL';
    $('filterIn').placeholder = lang === 'zh' ? '搜索运行……' : 'Search runs…';
    $('noiseChip').textContent = t(showNoise ? 'hide steps' : 'show steps');
    $('dirText').placeholder = t('Add guidance, change direction, or overrule…');
    $('dirHint').textContent = t(interrupt ? 'Aborts the current turn and re-delivers immediately.' : 'Lands at the next turn boundary, with a delivery receipt.');
    $('intChip').textContent = t('interrupt'); renderModeChip();
  }

  // ---- sidebar collapse / peek / logo / search
  function spinMark() { var m = $('mk'); if (!m || reduce) return; m.classList.remove('spin'); void m.offsetWidth; m.classList.add('spin'); }
  $('mk').addEventListener('animationend', function () { $('mk').classList.remove('spin'); }, true);
  function toggleSide() { spinMark(); var off = document.body.classList.toggle('side-off'); localStorage.setItem('pitwall-side', off ? '1' : '0'); $('side').classList.remove('peek'); }
  $('sideBtn').onclick = function (e) { e.stopPropagation(); toggleSide(); };
  $('brandHome').onclick = function () { spinMark(); if (document.body.classList.contains('side-off')) { document.body.classList.remove('side-off'); localStorage.setItem('pitwall-side', '0'); $('side').classList.remove('peek'); } };
  $('side').addEventListener('mouseenter', function () { if (document.body.classList.contains('side-off')) $('side').classList.add('peek'); });
  $('side').addEventListener('mouseleave', function () { if (document.body.classList.contains('side-off')) $('side').classList.remove('peek'); });
  $('railBtn').onclick = function () { var off = document.body.classList.toggle('rail-off'); localStorage.setItem('pitwall-rail', off ? '1' : '0'); if (!off) $('rail').classList.remove('peek'); setTimeout(drawSpark, 360); };
  $('edgeR').onmouseenter = function () { $('rail').classList.add('peek'); setTimeout(drawSpark, 40); };
  $('rail').addEventListener('mouseleave', function () { if (document.body.classList.contains('rail-off')) $('rail').classList.remove('peek'); });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); toggleSide(); }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openFilter(); }
    if (e.key === 'Escape' && $('side').classList.contains('filtering')) closeFilter();
  });
  function openFilter() { if (document.body.classList.contains('side-off')) { spinMark(); document.body.classList.remove('side-off'); } $('side').classList.add('filtering'); $('filterIn').focus(); }
  function closeFilter() { $('side').classList.remove('filtering'); $('filterIn').value = ''; applyFilter(''); }
  $('searchRow').onclick = openFilter;
  $('newRow').onclick = function () { var cmd = 'pitwall run --repo <path> --goal "…" --criteria "…"'; if (navigator.clipboard) navigator.clipboard.writeText(cmd); toast(lang === 'zh' ? '在终端启动新运行（命令已复制）' : 'Start a run from your terminal (command copied)'); };
  $('filterIn').addEventListener('input', function () { applyFilter(this.value); });
  $('filterIn').addEventListener('blur', function () { if (!this.value) closeFilter(); });
  function applyFilter(q) {
    q = q.trim().toLowerCase();
    [].forEach.call(document.querySelectorAll('#runlist .runrow'), function (r) { r.style.display = !q || r.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; });
    [].forEach.call(document.querySelectorAll('#runlist .grp'), function (g) { g.style.display = q ? 'none' : ''; });
  }

  // ---- sparkline (live throughput)
  var spData = []; for (var i = 0; i < 44; i++) spData.push(4 + Math.random() * 3);
  var lastTok = 0;
  function hexA(h, a) { h = h.trim(); if (h[0] !== '#') return h; var n = parseInt(h.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function drawSpark() {
    var c = $('spark'); if (!c || !c.clientWidth) return; var dpr = devicePixelRatio || 1, w = c.clientWidth, h = 34;
    c.width = w * dpr; c.height = h * dpr; var g = c.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
    var live = getComputedStyle(document.documentElement).getPropertyValue('--live').trim() || '#2E6DF0';
    var max = Math.max.apply(null, spData) * 1.15 || 1, n = spData.length, step = w / (n - 1);
    g.beginPath(); for (var i = 0; i < n; i++) { var x = i * step, y = h - 4 - (spData[i] / max) * (h - 8); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = hexA(live, .16); g.fill();
    g.beginPath(); for (var j = 0; j < n; j++) { var x2 = j * step, y2 = h - 4 - (spData[j] / max) * (h - 8); j ? g.lineTo(x2, y2) : g.moveTo(x2, y2); }
    g.strokeStyle = live; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
    var ex = (n - 1) * step, ey = h - 4 - (spData[n - 1] / max) * (h - 8);
    g.beginPath(); g.arc(ex, ey, 2.6, 0, 7); g.fillStyle = live; g.fill();
  }
  addEventListener('resize', drawSpark);
  setInterval(function () {
    var tok = 0, busy = false;
    if (state) state.agents.forEach(function (a) { tok += a.totals.inputTokens + a.totals.outputTokens; if (a.state === 'working') busy = true; });
    var delta = lastTok ? Math.max(0, tok - lastTok) : 0; lastTok = tok;
    spData.push(delta > 0 ? Math.min(60, 6 + delta / 60) : (busy ? 6 + Math.random() * 5 : 3 + Math.random() * 3));
    if (spData.length > 44) spData.shift();
    drawSpark();
  }, 1200);

  // ---- sidebar runs
  var RUNI = {
    want: '<svg viewBox="0 0 18 18"><rect x="5" y="5" width="8" height="8" rx="2" transform="rotate(45 9 9)" fill="var(--flag)"/></svg>',
    live: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.5" fill="none" stroke="var(--ok)" stroke-width="1.6"/><circle cx="9" cy="9" r="3" fill="var(--ok)"><animate attributeName="opacity" values="1;.35;1" dur="1.8s" repeatCount="indefinite"/></circle></svg>',
    done: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.8" fill="none" stroke="var(--line2)" stroke-width="1.6"/><path d="M5.9 9.2l2.1 2.1 4.1-4.5" fill="none" stroke="var(--ink3)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fail: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.8" fill="none" stroke="var(--bad)" stroke-width="1.6"/><path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="var(--bad)" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };
  function runRow(r, curId) {
    var icon = r.pending ? RUNI.want : r.status === 'failed' ? RUNI.fail : (r.status === 'done' ? RUNI.done : (r.live ? RUNI.live : RUNI.done));
    var prog = r.tasksTotal ? r.tasksDone + '/' + r.tasksTotal : (r.costUsd ? money(r.costUsd) : ago(r.createdAt));
    var meta = r.pending ? '<span class="want">' + (lang === 'zh' ? r.pending + ' 项待批准' : r.pending + ' pending') + '</span>'
      : (r.live && r.status === 'running') ? '<span class="lv"><span class="dot running" style="width:5px;height:5px"></span>' + t('live') + '</span>'
      : esc(t(r.status));
    return '<button class="runrow' + (r.runId === curId ? ' cur' : '') + (r.status === 'done' || r.status === 'failed' ? ' done-run' : '') + '" data-run="' + esc(r.runId) + '">'
      + '<span class="r1"><span class="si">' + icon + '</span><span class="g">' + esc(r.goal || r.runId) + '</span></span>'
      + '<span class="m">' + meta + '<span class="prog">' + esc(prog) + '</span></span></button>';
  }
  function renderRuns(list) {
    var curId = state ? state.runId : RUN;
    if (!list.length) { setHtml('runlist', '<div class="empty">' + t('Nothing running yet.') + '</div>'); return; }
    var you = [], live = [], fin = [];
    list.forEach(function (r) { if (r.pending || r.status === 'awaiting-review') you.push(r); else if (r.status === 'done' || r.status === 'failed') fin.push(r); else live.push(r); });
    function grp(cls, label, arr) { if (!arr.length) return ''; return '<div class="grp ' + cls + '">' + esc(label) + '<span class="cnt">' + arr.length + '</span></div>' + arr.map(function (r) { return runRow(r, curId); }).join(''); }
    setHtml('runlist', grp('flag', t('Needs you'), you) + grp('', t('In progress'), live) + grp('', t('Finished'), fin));
  }
  function loadRuns() { fetch('/api/runs').then(function (r) { return r.json(); }).then(renderRuns).catch(function () {}); }
  $('runlist').addEventListener('click', function (ev) { var b = ev.target.closest('.runrow'); if (!b) return; var q = '?run=' + encodeURIComponent(b.getAttribute('data-run')); if (urlLang) q += '&lang=' + urlLang; location.href = '/' + q; });

  // ---- header + telemetry + rail
  function gateLabel(g) { return lang === 'zh' ? t(g) + '门' : g + ' gate'; }
  function activeTasks(s) { return s.tasks.filter(function (x) { return x.status !== 'superseded' && x.status !== 'rejected'; }); }
  function renderTop(s) {
    var tasks = activeTasks(s);
    var done = tasks.filter(function (x) { return x.status === 'accepted'; }).length;
    var pend = s.approvals.filter(function (a) { return !a.decision; });
    var working = s.agents.filter(function (a) { return a.state === 'working'; });
    var isWorking = working.length && s.status === 'running';

    $('hdot').className = 'dot ' + (isWorking ? 'working' : s.status);
    setHtml('crumb', '<b>' + esc(t(s.mode)) + '</b>'
      + (s.autonomous ? '<span class="csep">·</span><span>' + (lang === 'zh' ? '自主' : 'auto') + '</span>' : '')
      + '<span class="csep">·</span><span>' + esc(t(s.status)) + '</span>');
    $('runid').textContent = s.runId;
    $('pauseBtn').textContent = t(s.status === 'paused' ? 'Resume' : 'Pause');
    $('pauseBtn').style.display = s.readonly ? 'none' : '';
    document.title = 'Pitwall — ' + t(s.status);
    $('goal').textContent = s.goal;

    var word = pend.length ? t('Needs you') : isWorking ? working.map(function (a) { return a.name; }).join(', ')
      : s.status === 'done' ? t('Complete') : s.status === 'failed' ? t('Failed') : s.status === 'paused' ? t('Paused') : t('Live');
    $('teleState').className = 'w' + (isWorking ? ' shimmer' : '');
    $('teleState').textContent = isWorking ? (lang === 'zh' ? word + ' 工作中…' : word + ' working…') : word;
    var sub = [t(s.mode)]; if (s.autonomous) sub.push(lang === 'zh' ? '自主模式' : 'autonomous'); if (s.statusReason) sub.push(tSys(s.statusReason));
    $('teleSub').textContent = sub.join(' · ');

    var cost = 0, tok = 0, turns = 0;
    s.agents.forEach(function (a) { cost += a.totals.costUsd; tok += a.totals.inputTokens + a.totals.outputTokens; turns += a.totals.turns; });
    var started = s.startedTs ? new Date(s.startedTs).getTime() : Date.now();
    var ended = (s.status === 'done' || s.status === 'failed') && s.lastTs ? new Date(s.lastTs).getTime() : Date.now();
    var mins = Math.max(0, Math.round((ended - started) / 60000));
    var dur = mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + ' min';
    function cell(l, v, u) { return '<div class="cell"><div class="l">' + esc(l) + '</div><div class="v">' + v + (u ? ' <small>' + esc(u) + '</small>' : '') + '</div></div>'; }
    setHtml('teleGrid', cell(t('cost'), esc(money(cost))) + cell(t('tokens'), esc(ftok(tok))) + cell(t('turns'), esc(String(turns))) + cell(t('elapsed'), esc(dur)));
    $('pfill').style.width = (tasks.length ? Math.round(done / tasks.length * 100) : (s.status === 'done' ? 100 : 0)) + '%';

    $('agentsSec').style.display = s.agents.length ? '' : 'none';
    setHtml('agents', s.agents.map(function (a) {
      var idx = agentIdx[a.name] || 0;
      var st = a.state === 'working' ? 'working' : a.state === 'paused' ? 'paused' : a.state === 'dead' ? 'dead' : '';
      return '<div class="agentcard"><div class="top"><span class="pfp ' + (idx === 0 ? 'agent' : 'agent2') + '">' + esc(String(a.name).charAt(0).toUpperCase()) + '</span>'
        + '<span class="nm">' + esc(a.name) + '</span><span class="rl">' + esc(t(a.role)) + '</span><span class="dot ' + st + '"></span></div>'
        + '<div class="mt">' + a.totals.turns + ' ' + t('turns') + ' · ' + (a.totals.costUsd ? money(a.totals.costUsd) : ftok(a.totals.inputTokens + a.totals.outputTokens) + ' tok') + '</div>'
        + (s.readonly ? '' : '<div class="acts">'
          + (a.state === 'paused' ? '<button class="lbtn" data-act="unpause" data-agent="' + esc(a.name) + '">' + t('Resume') + '</button>' : '<button class="lbtn" data-act="pause" data-agent="' + esc(a.name) + '">' + t('Pause') + '</button>')
          + (a.state === 'working' ? '<button class="lbtn bad" data-act="interrupt" data-agent="' + esc(a.name) + '">' + t('Interrupt') + '</button>' : '')
          + '<button class="lbtn" data-act="raw" data-agent="' + esc(a.name) + '">' + t('Raw') + '</button></div>') + '</div>';
    }).join(''));

    $('critSec').style.display = (s.criteria || []).length ? '' : 'none';
    setHtml('criteria', (s.criteria || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join(''));

    var files = s.files || [];
    $('filesSec').style.display = files.length ? '' : 'none';
    if (files.length) { $('fileCount').textContent = files.length; setHtml('files', files.slice(-40).map(function (f) { var k = f.kind || 'modified', L = k === 'added' ? 'A' : k === 'deleted' ? 'D' : 'M'; return '<div class="frow"><span class="fkind ' + k + '">' + L + '</span><span class="fp">' + esc(f.path) + '</span></div>'; }).join('')); }

    setHtml('decisions', pend.map(function (a) {
      return '<div class="decision"><div class="core"><div class="k"><span class="di"></span>' + esc(gateLabel(a.gate)) + '</div>'
        + '<div class="s">' + esc(tSys(a.summary)) + '</div>'
        + (a.detail ? '<details class="d-more"><summary>' + t('details') + '</summary><pre>' + esc(a.detail) + '</pre></details>' : '')
        + '<input type="text" id="note-' + esc(a.approvalId) + '" placeholder="' + (lang === 'zh' ? '备注——驳回请说明原因' : 'Note — say why if you reject') + '">'
        + '<div class="acts"><button class="pbtn" data-appr="allow" data-id="' + esc(a.approvalId) + '">' + t('Approve') + '<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button>'
        + '<button class="gbtn" data-appr="deny" data-id="' + esc(a.approvalId) + '">' + t('Reject') + '</button></div></div></div>';
    }).join(''));

    if (s.readonly) { $('dirText').disabled = true; $('sendBtn').disabled = true; $('dirHint').textContent = t('This run is read-only — it is not driven by this process.'); }
  }

  // ---- tasks
  var MARKS = {
    pending: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.6" fill="none" stroke="var(--line2)" stroke-width="1.5"/></svg>',
    'in-progress': '<svg viewBox="0 0 18 18"><rect x="4.4" y="4.4" width="9.2" height="9.2" rx="2.4" transform="rotate(45 9 9)" fill="var(--live)"><animate attributeName="opacity" values="1;.4;1" dur="1.7s" repeatCount="indefinite"/></rect></svg>',
    'needs-review': '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.6" fill="none" stroke="var(--flag)" stroke-width="1.5"/><path d="M9 5.3v3.9l2.6 1.5" fill="none" stroke="var(--flag)" stroke-width="1.5" stroke-linecap="round"/></svg>',
    accepted: '<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.2" fill="var(--ok)"/><path d="M5.7 9.2l2.2 2.2 4.3-4.7" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var openTasks = {};
  function renderTasks(s) {
    var tasks = activeTasks(s);
    $('taskCount').textContent = tasks.length ? tasks.filter(function (x) { return x.status === 'accepted'; }).length + ' / ' + tasks.length : '';
    if (!tasks.length) { setHtml('tlist', '<div class="tempty">' + (s.mode === 'team' && s.status === 'running' ? '<span class="spin"></span>' + esc(t('The director is studying the repository and drafting the plan…')) : esc(t('No tasks yet.'))) + '</div>'); return; }
    setHtml('tlist', tasks.map(function (x) {
      var cls = x.status === 'accepted' ? 'done' : x.status === 'in-progress' ? 'cur' : '';
      return '<div class="trow ' + cls + (openTasks[x.taskId] ? ' open' : '') + '" data-task="' + esc(x.taskId) + '"><div class="r1"><span class="tmark">' + (MARKS[x.status] || MARKS.pending) + '</span><span class="t">' + esc(x.title) + '</span></div>'
        + ((x.criteria || []).length ? '<ul class="crit">' + x.criteria.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    }).join(''));
  }
  $('tlist').addEventListener('click', function (ev) { var n = ev.target.closest('.trow'); if (!n) return; var id = n.getAttribute('data-task'); openTasks[id] = !openTasks[id]; n.classList.toggle('open'); });

  // ---- conversation
  var curSteps = null;
  function roleOf(name) { if (!state) return ''; var a = state.agents.filter(function (x) { return x.name === name; })[0]; return a ? a.role : ''; }
  function pfp(name, human) { if (human) return '<span class="pfp human">' + (lang === 'zh' ? '你' : 'U') + '</span>'; var cls = (agentIdx[name] || 0) === 0 ? 'agent' : 'agent2'; return '<span class="pfp ' + cls + '">' + esc(String(name).charAt(0).toUpperCase()) + '</span>'; }
  function isPrimary(e) { switch (e.type) { case 'message': case 'directive': case 'note': case 'goal.updated': case 'approval.requested': case 'approval.resolved': case 'task.created': case 'task.updated': case 'run.created': case 'run.status': case 'error': return true; default: return false; } }
  function agentMessage(env) {
    var e = env.event, human = env.origin.kind === 'human', name = human ? t('You') : (e.from || 'system');
    var parsed = stripStructured(e.text), tag = '', rule = '';
    if (e.type === 'message') {
      if (e.kind === 'objection') { tag = '<span class="tag no">' + t('objection') + '</span>'; rule = ' rule no'; }
      else if (e.kind === 'verdict') { tag = '<span class="tag ok">' + t('verdict') + '</span>'; rule = ' rule ok'; }
      else if (e.kind === 'question') { tag = '<span class="tag hm">' + t('question') + '</span>'; rule = ' rule hm'; }
    }
    var chip = '';
    if (parsed.json) {
      if (parsed.json.verdict) chip = parsed.json.verdict === 'approve' ? '<div class="verdict ok">✓ ' + t('approve') + '</div>' : '<div class="verdict no">✕ ' + t('changes required') + '</div>';
      else if (parsed.json.status) chip = parsed.json.status === 'done' ? '<div class="verdict ok">✓ ' + t('reports done') + '</div>' : '<div class="verdict no">— ' + t(parsed.json.status) + '</div>';
    }
    var role = human ? '' : roleOf(name);
    return '<div class="msg"><div class="head">' + pfp(name, human) + '<span class="n">' + esc(name) + '</span>' + (role ? '<span class="r">' + esc(t(role)) + '</span>' : '') + tag + '<span class="t">' + tstr(env.ts) + '</span></div><div class="body' + rule + '">' + clipBody(e.text) + chip + '</div></div>';
  }
  function humanBlock(env) {
    var e = env.event;
    var label = e.type === 'directive' ? t('directive') + ' → ' + (e.scope === 'all' ? t('to all') : esc(e.scope)) + ' · ' + t(e.mode) + (e.interrupt ? ' · ' + t('interrupt') : '') : e.type === 'goal.updated' ? t('goal update') + ' · ' + t(e.mode) : t('note');
    return '<div class="msg"><div class="head">' + pfp('', true) + '<span class="n">' + t('You') + '</span><span class="tag hm">' + label + '</span><span class="t">' + tstr(env.ts) + '</span></div><div class="body rule hm">' + md(e.text) + '</div></div>';
  }
  function sysLine(cls, mk, html) { return '<div class="sys ' + cls + '"><span class="mk2">' + mk + '</span><span>' + html + '</span></div>'; }
  var STAGE = { pending: 'planned', 'in-progress': 'building', 'needs-review': 'in review', accepted: 'accepted' };
  function stepRow(env) {
    var e = env.event;
    switch (e.type) {
      case 'turn.started': return '<b>' + esc(e.agent) + '</b> ' + t('starts a turn');
      case 'turn.completed': { var u = e.usage || {}, b = ['<b>' + esc(e.agent) + '</b> ' + t('finished')]; if (e.durationMs != null) b.push(Math.round(e.durationMs / 1000) + 's'); if (u.outputTokens != null) b.push(u.outputTokens + ' tok'); if (u.costUsd != null) b.push('$' + u.costUsd.toFixed(3)); return b.join(' · ') + (e.error ? ' — <span style="color:var(--bad)">' + esc(tSys(e.error)) + '</span>' : ''); }
      case 'tool.used': return '<b>' + esc(e.agent) + '</b> ▸ ' + esc(e.tool) + ' · ' + esc(e.summary);
      case 'files.changed': return (e.agent ? '<b>' + esc(e.agent) + '</b> · ' : '') + e.changes.map(function (c) { return '<span class="fb">' + esc(c.kind[0]) + ' ' + esc(c.path) + '</span>'; }).join(' ');
      case 'agent.status': return esc(e.agent) + ' → ' + esc(t(e.state)) + (e.detail ? ' (' + esc(tSys(e.detail)) + ')' : '');
      case 'directive.delivered': return t('delivery receipt') + ' — <b>' + esc(e.agent) + '</b> ' + t('received directive');
      case 'agent.registered': return t('registered') + ' <b>' + esc(e.spec.name) + '</b> · ' + esc(e.spec.adapter) + ' · ' + esc(t(e.spec.role));
      case 'agent.native-session': return esc(e.agent) + ' · session ' + esc(String(e.nativeSessionId).slice(0, 13)) + '…';
      default: return esc(JSON.stringify(e).slice(0, 140));
    }
  }
  function stepsLabel(c) { var b = [c.count + ' ' + t('steps')]; if (c.secs) b.push(c.secs + 's'); if (c.cost) b.push('$' + c.cost.toFixed(2)); var ags = Object.keys(c.agents); return (ags.length ? ags.join(' + ') + ' · ' : '') + b.join(' · '); }
  function appendEvent(env) {
    var e = env.event, conv = $('conv');
    if (!isPrimary(e)) {
      if (!curSteps) { var d = document.createElement('details'); d.className = 'steps'; if (showNoise) d.open = true; d.innerHTML = '<summary><span class="cv">›</span><span class="cs"></span></summary><div class="rows"></div>'; conv.appendChild(d); curSteps = { rows: d.querySelector('.rows'), cs: d.querySelector('.cs'), count: 0, secs: 0, cost: 0, agents: {} }; }
      var row = document.createElement('div'); row.className = 'row'; row.innerHTML = stepRow(env); curSteps.rows.appendChild(row); curSteps.count += 1;
      if (e.agent) curSteps.agents[e.agent] = 1;
      if (e.type === 'turn.completed') { if (e.durationMs) curSteps.secs += Math.round(e.durationMs / 1000); if (e.usage && e.usage.costUsd) curSteps.cost += e.usage.costUsd; }
      curSteps.cs.textContent = stepsLabel(curSteps); return;
    }
    curSteps = null; var html = '';
    switch (e.type) {
      case 'message': html = agentMessage(env); break;
      case 'directive': case 'note': case 'goal.updated': html = humanBlock(env); break;
      case 'approval.requested': html = sysLine('gate', '◆', '<b>' + esc(gateLabel(e.gate)) + '</b> — ' + esc(tSys(e.summary))); break;
      case 'approval.resolved': html = sysLine(e.decision === 'allow' ? 'ok' : 'no', e.decision === 'allow' ? '✓' : '✕', '<b>' + t(e.decision === 'allow' ? 'approved' : 'rejected') + '</b>' + (e.note ? ' — ' + esc(tSys(e.note)) : '')); break;
      case 'task.created': html = sysLine('tk', '○', t('new task') + ' — <b>' + esc(e.title) + '</b> → ' + esc(e.assignee)); break;
      case 'task.updated': if (!e.status || (e.status === 'in-progress' && !e.note)) { html = ''; break; } html = sysLine(e.status === 'accepted' ? 'taskdone' : 'tk', e.status === 'accepted' ? '●' : '○', t('task update') + ' → <b>' + esc(t(STAGE[e.status] || e.status)) + '</b>' + (e.note ? ' — ' + esc(tSys(e.note)) : '')); break;
      case 'run.created': html = sysLine('tk', '○', t('run created') + ' — ' + e.agents.map(function (a) { return '<b>' + esc(a.name) + '</b> (' + esc(t(a.role)) + ')'; }).join(' + ')); break;
      case 'run.status': html = sysLine(e.status === 'done' ? 'ok' : e.status === 'paused' ? 'no' : 'tk', e.status === 'done' ? '■' : '·', t('run') + ' → <b>' + esc(t(e.status)) + '</b>' + (e.reason ? ' — ' + esc(tSys(e.reason)) : '')); break;
      case 'error': html = sysLine('no', '✕', '<span style="color:var(--bad)">' + esc(e.scope) + ' — ' + esc(e.message) + '</span>'); break;
    }
    if (!html) return; var div = document.createElement('div'); div.innerHTML = html; conv.appendChild(div.firstChild);
    var m = $('main'); m.scrollTop = m.scrollHeight;
  }
  function rebuildConv() { $('conv').innerHTML = ''; curSteps = null; allEvents.forEach(appendEvent); }

  // ---- interactions
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var act = b.getAttribute('data-act'), agent = b.getAttribute('data-agent');
    if (act && agent) {
      if (act === 'pause') post('/api/agent-pause', { agent: agent, paused: true });
      if (act === 'unpause') post('/api/agent-pause', { agent: agent, paused: false });
      if (act === 'interrupt') post('/api/agent-pause', { agent: agent, paused: true, interrupt: true });
      if (act === 'raw') fetch(api('/api/raw/' + encodeURIComponent(agent) + '?n=300')).then(function (r) { return r.json(); }).then(function (d) { var w = window.open('', '_blank'); w.document.write('<title>raw · ' + esc(agent) + '</title><body style="background:#1b1b1a;color:#d5d5d0;margin:0"><pre style="white-space:pre-wrap;font:11px/1.6 monospace;padding:18px">' + d.lines.map(esc).join('\n') + '</pre>'); });
      return;
    }
    var dec = b.getAttribute('data-appr'), id = b.getAttribute('data-id');
    if (dec && id) { var note = $('note-' + id); post('/api/approval', { approvalId: id, decision: dec, note: note ? note.value : '' }); }
  });
  var scope = 'all';
  function renderScopes(s) {
    var names = ['all'].concat(s.agents.map(function (a) { return a.name; }));
    setHtml('scopeChips', names.map(function (n) { var label = n === 'all' ? t('to all') : (lang === 'zh' ? t('to ') + n : '@' + n); return '<button class="selchip' + (scope === n ? ' on' : '') + '" data-scope="' + esc(n) + '">' + esc(label) + '</button>'; }).join(''));
  }
  $('scopeChips').addEventListener('click', function (ev) { var c = ev.target.closest('.selchip'); if (!c) return; scope = c.getAttribute('data-scope'); cache.scopeChips = null; renderScopes(state); });
  function renderModeChip() { $('modeChip').textContent = t(mode); $('modeChip').classList.toggle('on', mode === 'override'); }
  $('modeChip').onclick = function () { mode = mode === 'supplement' ? 'override' : 'supplement'; renderModeChip(); };
  $('intChip').onclick = function () { interrupt = !interrupt; $('intChip').classList.toggle('on', interrupt); $('dirHint').textContent = t(interrupt ? 'Aborts the current turn and re-delivers immediately.' : 'Lands at the next turn boundary, with a delivery receipt.'); };
  function send() { var v = $('dirText').value.trim(); if (!v) return; post('/api/directive', { scope: scope, mode: mode, text: v, interrupt: interrupt }).then(function () { $('dirText').value = ''; $('dirText').style.height = 'auto'; interrupt = false; $('intChip').classList.remove('on'); $('dirHint').textContent = t('Lands at the next turn boundary, with a delivery receipt.'); }); }
  $('sendBtn').onclick = send;
  $('dirText').addEventListener('input', function () { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 150) + 'px'; });
  $('dirText').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.isComposing) { e.preventDefault(); send(); } });
  $('pauseBtn').onclick = function () { post('/api/run-pause', { paused: !(state && state.status === 'paused') }); };
  $('noiseChip').onclick = function () { showNoise = !showNoise; $('noiseChip').textContent = t(showNoise ? 'hide steps' : 'show steps'); [].forEach.call(document.querySelectorAll('.steps'), function (s) { s.open = showNoise; }); };
  $('langBtn').onclick = function () { lang = lang === 'zh' ? 'en' : 'zh'; localStorage.setItem('pitwall-lang', lang); cache = {}; applyStatic(); if (state) renderState(state); rebuildConv(); loadRuns(); };

  // ---- state + boot
  var refetch = null;
  function scheduleRefetch() { if (refetch) return; refetch = setTimeout(function () { refetch = null; fetch(api('/api/state')).then(function (r) { return r.json(); }).then(renderState); }, 250); }
  function renderState(s) { state = s; s.agents.forEach(function (a, i) { agentIdx[a.name] = i % 2; }); renderTop(s); renderTasks(s); renderScopes(s); }

  applyTheme();
  var sp = new URLSearchParams(location.search);
  if (sp.get('side') === 'collapsed' || (sp.get('side') !== 'expanded' && localStorage.getItem('pitwall-side') === '1')) document.body.classList.add('side-off');
  if (sp.get('rail') === 'collapsed' || localStorage.getItem('pitwall-rail') === '1') document.body.classList.add('rail-off');
  applyStatic(); loadRuns(); drawSpark();
  setInterval(loadRuns, 30000);
  setInterval(function () { if (state) renderTop(state); }, 30000);
  fetch(api('/api/state')).then(function (r) { return r.json(); }).then(function (s) {
    renderState(s);
    if (sp.get('snapshot')) { fetch(api('/api/events?since=0')).then(function (r) { return r.json(); }).then(function (evs) { evs.forEach(function (env) { allEvents.push(env); appendEvent(env); }); }); return; }
    var es = new EventSource(api('/api/stream?since=0'));
    es.onmessage = function (m) { var env = JSON.parse(m.data); allEvents.push(env); appendEvent(env); scheduleRefetch(); };
  });
})();
</script>
</body>
</html>`;
