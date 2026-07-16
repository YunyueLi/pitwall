/**
 * The AgentOS console — one self-contained page, zero external assets.
 *
 * Information architecture: the agents' dialogue IS the main view. Primary
 * events (messages, directives, gates, task milestones) render as a
 * conversation; machine noise (turns, tools, file scans) collapses into
 * activity capsules between them. A compact task strip replaces the kanban.
 *
 * Client JS avoids template literals (the page lives inside one backtick
 * string); backtick characters are built via String.fromCharCode(96).
 */
export const UI_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentOS</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3CradialGradient id='g' cx='35%25' cy='30%25'%3E%3Cstop offset='0%25' stop-color='%23c8bcff'/%3E%3Cstop offset='55%25' stop-color='%238b7cf7'/%3E%3Cstop offset='100%25' stop-color='%233b2f8f'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='16' cy='16' r='13' fill='url(%23g)'/%3E%3C/svg%3E">
<style>
  :root {
    --ink: #f1f3f9; --ink-dim: #a2abbf; --ink-faint: #5e6678;
    --violet: #8b7cf7; --violet-hi: #beb2ff; --emerald: #3ee0a4; --amber: #f6bb54; --rose: #f4718c; --blue: #6ea8fe;
    --hairline: rgba(255,255,255,.075); --hairline-2: rgba(255,255,255,.15);
    --shell: rgba(255,255,255,.03); --core: rgba(12,13,18,.82);
    --ease: cubic-bezier(.32,.72,0,1);
    --font: "SF Pro Display", "SF Pro Text", "PingFang SC", ui-sans-serif, system-ui, "Segoe UI Variable", "Microsoft YaHei", sans-serif;
    --mono: "SF Mono", ui-monospace, "Cascadia Code", "PingFang SC", monospace;
  }
  * { box-sizing: border-box; }
  html { background: #040406; scroll-behavior: smooth; }
  body { margin: 0; color: var(--ink); font: 14px/1.6 var(--font); -webkit-font-smoothing: antialiased; min-height: 100dvh; overflow-x: hidden; }
  ::selection { background: rgba(139,124,247,.35); }
  /* ---------- ambient ---------- */
  .stage { position: fixed; inset: 0; z-index: -2; background: radial-gradient(130% 90% at 50% -10%, #0b0b15 0%, #050507 55%, #030305 100%); }
  .orb { position: absolute; border-radius: 50%; filter: blur(110px); }
  .orb.v { width: 52vw; height: 52vw; left: -16vw; top: -24vw; background: radial-gradient(circle, rgba(108,88,255,.35), transparent 62%); }
  .orb.e { width: 40vw; height: 40vw; right: -13vw; top: 16vh; background: radial-gradient(circle, rgba(40,222,160,.12), transparent 62%); }
  .orb.b { width: 60vw; height: 36vw; left: 20vw; bottom: -26vw; background: radial-gradient(circle, rgba(86,126,255,.12), transparent 70%); }
  .grain { position: fixed; inset: 0; z-index: 80; pointer-events: none; opacity: .04;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E"); }
  /* ---------- shells ---------- */
  .shell { background: var(--shell); border: 1px solid var(--hairline); border-radius: 1.6rem; padding: 7px; box-shadow: 0 30px 80px -55px rgba(0,0,0,.95); }
  .core { background: var(--core); border-radius: calc(1.6rem - 7px); border: 1px solid rgba(255,255,255,.05); box-shadow: inset 0 1px 1px rgba(255,255,255,.06); padding: 18px; }
  /* ---------- island ---------- */
  .island { position: sticky; top: 14px; z-index: 40; margin: 14px auto 0; max-width: 1560px;
    display: flex; align-items: center; gap: 14px; padding: 10px 12px 10px 20px;
    background: rgba(9,10,15,.55); backdrop-filter: blur(30px) saturate(1.6);
    border: 1px solid var(--hairline); border-radius: 999px;
    box-shadow: 0 20px 55px -24px rgba(0,0,0,.9), inset 0 1px 1px rgba(255,255,255,.08); }
  .wordmark { display: flex; align-items: center; gap: 10px; font-weight: 680; letter-spacing: -.02em; font-size: 15px; }
  .logo-orb { width: 23px; height: 23px; border-radius: 50%; flex: none;
    background: conic-gradient(from 210deg, #8b7cf7, #3ee0a4, #4f8dff, #8b7cf7);
    box-shadow: 0 0 20px rgba(139,124,247,.6), inset 0 0 7px rgba(0,0,0,.45); animation: slowspin 16s linear infinite; }
  @keyframes slowspin { to { transform: rotate(360deg); } }
  .island .spacer { flex: 1; min-width: 0; }
  .runmeta { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); white-space: nowrap; }
  .pill { display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; padding: 5px 13px;
    font-size: 11px; letter-spacing: .06em; font-weight: 580; border: 1px solid var(--hairline-2);
    color: var(--ink-dim); background: rgba(255,255,255,.03); white-space: nowrap; }
  .pill .led { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-faint); }
  .pill.running .led { background: var(--emerald); box-shadow: 0 0 12px var(--emerald); animation: breathe 2.1s var(--ease) infinite; }
  .pill.paused .led, .pill.awaiting-review .led { background: var(--amber); box-shadow: 0 0 12px var(--amber); }
  .pill.done .led { background: var(--violet); box-shadow: 0 0 12px var(--violet); }
  .pill.failed .led { background: var(--rose); }
  @keyframes breathe { 50% { opacity: .3; } }
  /* ---------- buttons ---------- */
  button { font: inherit; cursor: pointer; }
  .btn { display: inline-flex; align-items: center; gap: 9px; border-radius: 999px; padding: 8px 8px 8px 16px;
    background: rgba(255,255,255,.05); color: var(--ink); border: 1px solid var(--hairline-2);
    font-size: 12.5px; font-weight: 570;
    transition: transform .55s var(--ease), background .55s var(--ease), border-color .55s var(--ease), box-shadow .55s var(--ease); }
  .btn:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.28); }
  .btn:active { transform: scale(.97); }
  .btn .cap { width: 24px; height: 24px; border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.09); transition: transform .55s var(--ease); }
  .btn:hover .cap { transform: translate(2px,-1px) scale(1.07); }
  .btn.primary { background: linear-gradient(135deg, #9486ff, #6a5df0 60%, #5b4ee6); border-color: rgba(150,135,255,.7); color: #0a0a12;
    box-shadow: 0 8px 30px -10px rgba(122,105,255,.7), inset 0 1px 1px rgba(255,255,255,.35); }
  .btn.primary .cap { background: rgba(0,0,0,.16); color: #0a0a12; }
  .btn.primary:hover { box-shadow: 0 10px 36px -10px rgba(122,105,255,.95); }
  .btn.ghost-danger { color: var(--rose); border-color: rgba(244,113,140,.35); padding: 8px 16px; }
  .btn.ghost-danger:hover { background: rgba(244,113,140,.08); }
  .btn.tiny { padding: 4px 10px; font-size: 11px; gap: 6px; }
  .btn.tiny .cap { width: 18px; height: 18px; }
  /* ---------- hero ---------- */
  .hero { max-width: 1560px; margin: 40px auto 26px; padding: 0 28px; display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; flex-wrap: wrap; }
  .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: .26em; color: var(--ink-faint); font-weight: 650; margin: 0 0 12px 3px; display: flex; align-items: center; gap: 8px; }
  .eyebrow .count { color: var(--ink-dim); font-family: var(--mono); letter-spacing: .05em; }
  .hero h1 { margin: 8px 0 0; font-size: clamp(30px, 3.5vw, 50px); line-height: 1.05; font-weight: 700; letter-spacing: -.035em; max-width: 24ch; }
  .hero h1 .hl { background: linear-gradient(100deg, var(--violet-hi), var(--violet) 55%, var(--blue)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .hero h1 .hl.ok { background: linear-gradient(100deg, #8df0c9, var(--emerald) 60%, #2fae83); -webkit-background-clip: text; background-clip: text; }
  .hero h1 .hl.warn { background: linear-gradient(100deg, #ffd9a0, var(--amber) 60%, #e09a2f); -webkit-background-clip: text; background-clip: text; }
  .hero .sub { margin-top: 13px; color: var(--ink-dim); font-size: 13.5px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .livebar { position: relative; width: 46px; height: 3px; border-radius: 2px; overflow: hidden; background: rgba(255,255,255,.08); flex: none; }
  .livebar::after { content: ""; position: absolute; inset: 0; width: 40%; border-radius: 2px; background: linear-gradient(90deg, transparent, var(--emerald), transparent); animation: sweep 1.6s var(--ease) infinite; }
  @keyframes sweep { from { transform: translateX(-120%); } to { transform: translateX(320%); } }
  .stats { display: flex; gap: 10px; flex-wrap: wrap; }
  .stat { min-width: 116px; padding: 14px 18px 12px; border-radius: 1.3rem; background: var(--shell); border: 1px solid var(--hairline); box-shadow: inset 0 1px 1px rgba(255,255,255,.06); }
  .stat .v { font-family: var(--mono); font-size: 20px; font-weight: 500; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .stat .v .u { font-size: 11px; color: var(--ink-faint); margin-left: 2px; }
  .stat .l { font-size: 9.5px; text-transform: uppercase; letter-spacing: .2em; color: var(--ink-faint); margin-top: 4px; }
  /* ---------- layout ---------- */
  .wrap { max-width: 1560px; margin: 0 auto; padding: 0 28px 150px; display: grid; grid-template-columns: minmax(0,1fr) 384px; gap: 24px; align-items: start; }
  section { margin-bottom: 26px; }
  /* ---------- task strip ---------- */
  .strip { display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 8px; scrollbar-width: thin; }
  .tcard { flex: 1 1 220px; min-width: 210px; border-radius: 1.2rem; border: 1px solid var(--hairline);
    background: var(--shell); padding: 6px; cursor: pointer; position: relative;
    transition: transform .6s var(--ease), border-color .6s var(--ease), box-shadow .6s var(--ease);
    animation: rise .8s var(--ease) both; }
  .tcard:hover { transform: translateY(-3px); border-color: rgba(255,255,255,.22); box-shadow: 0 18px 44px -26px rgba(0,0,0,.95); }
  .tcard .in { background: rgba(11,12,17,.75); border-radius: calc(1.2rem - 5px); padding: 12px 14px 11px; border: 1px solid rgba(255,255,255,.04); box-shadow: inset 0 1px 1px rgba(255,255,255,.05); height: 100%; }
  .tcard .step { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); letter-spacing: .12em; display: flex; align-items: center; gap: 7px; }
  .tcard .step .sdot { width: 6px; height: 6px; border-radius: 50%; background: var(--ink-faint); }
  .tcard.s-building .step { color: var(--emerald); } .tcard.s-building .step .sdot { background: var(--emerald); box-shadow: 0 0 9px var(--emerald); animation: breathe 1.4s var(--ease) infinite; }
  .tcard.s-review .step { color: var(--amber); } .tcard.s-review .step .sdot { background: var(--amber); box-shadow: 0 0 9px var(--amber); }
  .tcard.s-done .step { color: var(--violet-hi); } .tcard.s-done .step .sdot { background: var(--violet); box-shadow: 0 0 9px var(--violet); }
  .tcard.s-building { border-color: rgba(62,224,164,.35); box-shadow: 0 0 36px -16px rgba(62,224,164,.55); }
  .tcard.s-review { border-color: rgba(246,187,84,.35); box-shadow: 0 0 36px -16px rgba(246,187,84,.5); }
  .tcard .t { font-size: 12.5px; font-weight: 570; line-height: 1.45; margin-top: 8px; letter-spacing: -.005em; }
  .tcard.s-done .t { color: var(--ink-dim); }
  .tcard .crit { margin: 8px 0 0; padding: 0; list-style: none; display: none; }
  .tcard.open .crit { display: block; }
  .tcard .crit li { font-size: 11px; color: var(--ink-dim); padding: 3px 0 3px 18px; position: relative; line-height: 1.45; }
  .tcard .crit li::before { content: ""; position: absolute; left: 2px; top: 7px; width: 8px; height: 8px; border-radius: 3px; border: 1px solid var(--ink-faint); }
  .tcard.s-done .crit li::before { background: rgba(139,124,247,.7); border-color: var(--violet); }
  .strip-empty { display: flex; align-items: center; gap: 14px; color: var(--ink-dim); font-size: 13px; padding: 18px 22px; border: 1px dashed rgba(255,255,255,.1); border-radius: 1.2rem; width: 100%; }
  .shimmer { width: 24px; height: 24px; border-radius: 50%; flex: none; border: 2px solid rgba(255,255,255,.09); border-top-color: var(--violet); animation: spin 1.05s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  /* ---------- conversation ---------- */
  .conv { display: flex; flex-direction: column; gap: 18px; padding: 6px 2px; }
  .msg { display: flex; gap: 14px; animation: rise .75s var(--ease) both; }
  @keyframes rise { from { opacity: 0; transform: translateY(18px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
  .msg .av { width: 38px; height: 38px; border-radius: 50%; flex: none; position: relative; margin-top: 2px;
    box-shadow: 0 0 0 1px var(--hairline-2), 0 6px 18px -6px rgba(0,0,0,.8); }
  .av.a0 { background: radial-gradient(circle at 32% 28%, #c3b8ff, #6a5df0 72%); }
  .av.a1 { background: radial-gradient(circle at 32% 28%, #8ff3cd, #17a97a 72%); }
  .av.human { background: radial-gradient(circle at 32% 28%, #ffe3ae, #e0962b 74%); }
  .av .glyph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: rgba(10,10,16,.82); }
  .msg .body { min-width: 0; flex: 1; }
  .msg .head { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
  .msg .head .n { font-weight: 660; font-size: 13.5px; letter-spacing: -.01em; }
  .msg .head .t { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); }
  .tag { font-size: 9px; letter-spacing: .16em; text-transform: uppercase; padding: 1.5px 9px; border-radius: 999px; border: 1px solid var(--hairline-2); color: var(--ink-dim); }
  .tag.human { color: var(--amber); border-color: rgba(246,187,84,.55); }
  .tag.violet { color: var(--violet-hi); border-color: rgba(139,124,247,.55); }
  .tag.rose { color: var(--rose); border-color: rgba(244,113,140,.55); }
  .tag.ok { color: var(--emerald); border-color: rgba(62,224,164,.5); }
  .card {
    margin-top: 8px; padding: 14px 17px; border-radius: 1.25rem; font-size: 13px; line-height: 1.65;
    background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.025));
    border: 1px solid var(--hairline); box-shadow: inset 0 1px 1px rgba(255,255,255,.05), 0 14px 36px -28px rgba(0,0,0,.9);
  }
  .card.objection { border-color: rgba(244,113,140,.3); background: linear-gradient(180deg, rgba(244,113,140,.07), rgba(244,113,140,.025)); }
  .card.verdict { border-color: rgba(62,224,164,.28); background: linear-gradient(180deg, rgba(62,224,164,.06), rgba(62,224,164,.02)); }
  .card.human { border-color: rgba(246,187,84,.32); background: linear-gradient(180deg, rgba(246,187,84,.07), rgba(246,187,84,.025)); }
  .card p { margin: 0 0 10px; } .card p:last-child { margin-bottom: 0; }
  .card pre { background: rgba(0,0,0,.45); border: 1px solid var(--hairline); border-radius: .9rem; padding: 12px 14px; overflow-x: auto; font: 11.5px/1.6 var(--mono); margin: 10px 0; }
  .card code { font: .92em var(--mono); background: rgba(255,255,255,.07); border-radius: 5px; padding: 1px 5px; }
  .card pre code { background: none; padding: 0; }
  .card ul { margin: 6px 0 10px; padding-left: 20px; } .card li { margin: 3px 0; }
  .resultchip { display: inline-flex; align-items: center; gap: 7px; margin-top: 11px; border-radius: 999px; padding: 4px 13px;
    font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 640;
    border: 1px solid var(--hairline-2); color: var(--ink-dim); }
  .resultchip.ok { color: var(--emerald); border-color: rgba(62,224,164,.5); background: rgba(62,224,164,.07); }
  .resultchip.bad { color: var(--rose); border-color: rgba(244,113,140,.5); background: rgba(244,113,140,.07); }
  .resultchip .d { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
  details.more summary { cursor: pointer; font-size: 10.5px; color: var(--ink-faint); margin-top: 7px; list-style: none; transition: color .4s var(--ease); }
  details.more summary:hover { color: var(--ink-dim); }
  details.more summary::before { content: "› "; }
  details.more[open] summary::before { content: "⌄ "; }
  details.more pre { background: rgba(0,0,0,.4); border: 1px solid var(--hairline); border-radius: .9rem; padding: 11px; font: 10.5px/1.55 var(--mono); max-height: 340px; overflow: auto; white-space: pre-wrap; margin-top: 6px; }
  /* activity capsule (collapsed machine noise) */
  .capsule { margin: 0 0 0 52px; animation: rise .7s var(--ease) both; }
  .capsule summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: 9px;
    border-radius: 999px; padding: 5px 14px 5px 10px; font-size: 10.5px; color: var(--ink-faint);
    border: 1px dashed rgba(255,255,255,.12); background: rgba(255,255,255,.02);
    transition: border-color .5s var(--ease), color .5s var(--ease); font-family: var(--mono); }
  .capsule summary:hover { color: var(--ink-dim); border-color: rgba(255,255,255,.22); }
  .capsule summary::-webkit-details-marker { display: none; }
  .capsule summary .gear { width: 13px; height: 13px; }
  .capsule summary .gear svg { width: 13px; height: 13px; stroke: currentColor; stroke-width: 1.2; fill: none; }
  .capsule[open] summary { border-style: solid; color: var(--ink-dim); }
  .capsule .rows { margin-top: 8px; border-left: 1px solid var(--hairline); padding-left: 16px; display: flex; flex-direction: column; gap: 5px; }
  .capsule .row { font: 10.5px/1.55 var(--mono); color: var(--ink-faint); overflow-wrap: anywhere; }
  .capsule .row b { color: var(--ink-dim); font-weight: 570; }
  .capsule .row .fb { display: inline-block; border: 1px solid var(--hairline-2); border-radius: 6px; padding: 0 7px; margin: 1px 3px 0 0; color: var(--ink-dim); }
  /* divider events (gates, task milestones, run status) */
  .divider { display: flex; align-items: center; gap: 12px; margin: 2px 0; animation: rise .7s var(--ease) both; }
  .divider .line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--hairline-2), transparent); }
  .divider .chip { flex: none; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; padding: 5px 15px;
    font-size: 11px; color: var(--ink-dim); border: 1px solid var(--hairline-2); background: rgba(12,13,18,.8); max-width: 72ch; }
  .divider .chip b { color: var(--ink); font-weight: 600; }
  .divider.gate .chip { border-color: rgba(139,124,247,.5); box-shadow: 0 0 26px -10px rgba(139,124,247,.55); }
  .divider.ok .chip { border-color: rgba(62,224,164,.4); }
  .divider.warn .chip { border-color: rgba(246,187,84,.45); }
  /* ---------- rail ---------- */
  .approval-shell { position: relative; border-color: rgba(139,124,247,.45); box-shadow: 0 0 60px -20px rgba(139,124,247,.65); animation: rise .9s var(--ease) both; }
  .approval .g { font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: var(--violet-hi); font-weight: 680; }
  .approval .s { font-size: 13.5px; font-weight: 570; margin: 7px 0 2px; line-height: 1.5; }
  .approval input[type=text] { margin-top: 10px; }
  .approval .acts { display: flex; gap: 8px; margin-top: 13px; }
  .goalcard { display: flex; gap: 16px; align-items: flex-start; }
  .goalcard .ring { flex: none; width: 74px; height: 74px; position: relative; }
  .goalcard .ring svg { transform: rotate(-90deg); }
  .goalcard .ring .num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: 600 13px var(--mono); letter-spacing: -.03em; }
  .goalcard .g { font-size: 12.5px; font-weight: 540; line-height: 1.6; color: var(--ink); }
  .criteria { margin: 12px 0 0; padding: 0; list-style: none; counter-reset: c; }
  .criteria li { counter-increment: c; position: relative; padding: 4px 0 4px 32px; font-size: 11.5px; color: var(--ink-dim); line-height: 1.55; }
  .criteria li::before { content: counter(c, decimal-leading-zero); position: absolute; left: 0; top: 6px; font-family: var(--mono); font-size: 10px; color: var(--violet-hi); }
  .agent { display: flex; flex-direction: column; gap: 11px; }
  .agent .rowA { display: flex; align-items: center; gap: 12px; }
  .presence { position: relative; width: 42px; height: 42px; flex: none; }
  .presence .face { position: absolute; inset: 5px; border-radius: 50%; }
  .presence .ring2 { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--hairline-2); }
  .presence.working .ring2 { border: none; background: conic-gradient(from 0deg, transparent 8%, var(--emerald)); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px)); mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px)); animation: spin 1.5s linear infinite; }
  .presence.paused .ring2 { border-color: rgba(246,187,84,.65); border-style: dashed; }
  .agent .who .n { font-weight: 640; font-size: 13.5px; display: flex; gap: 8px; align-items: baseline; }
  .agent .who .r { font-size: 9.5px; text-transform: uppercase; letter-spacing: .18em; color: var(--ink-faint); margin-top: 2px; }
  .agent .statline { font-size: 11px; color: var(--ink-dim); }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .metric { background: rgba(255,255,255,.03); border: 1px solid var(--hairline); border-radius: .85rem; padding: 8px 11px; }
  .metric .v { font-family: var(--mono); font-size: 12.5px; font-variant-numeric: tabular-nums; }
  .metric .l { font-size: 8.5px; text-transform: uppercase; letter-spacing: .18em; color: var(--ink-faint); margin-top: 2px; }
  .agent .acts { display: flex; gap: 6px; }
  textarea, input[type=text] { width: 100%; background: rgba(255,255,255,.04); color: var(--ink);
    border: 1px solid var(--hairline-2); border-radius: 1rem; padding: 11px 13px; font: 13px/1.5 var(--font); outline: none;
    transition: border-color .55s var(--ease), background .55s var(--ease), box-shadow .55s var(--ease); }
  textarea:focus, input[type=text]:focus { border-color: rgba(139,124,247,.6); background: rgba(255,255,255,.06); box-shadow: 0 0 0 3px rgba(139,124,247,.12); }
  textarea { min-height: 76px; resize: vertical; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { border-radius: 999px; padding: 4px 12px; font-size: 11px; cursor: pointer; user-select: none;
    color: var(--ink-dim); border: 1px solid var(--hairline); background: transparent; transition: all .5s var(--ease); }
  .chip:hover { border-color: var(--hairline-2); color: var(--ink); }
  .chip.on { color: var(--ink); border-color: rgba(139,124,247,.65); background: rgba(139,124,247,.15); }
  .chip.warn.on { border-color: rgba(246,187,84,.65); background: rgba(246,187,84,.13); }
  .composer .rows { display: flex; flex-direction: column; gap: 10px; }
  .composer .foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .hint { font-size: 10.5px; color: var(--ink-faint); line-height: 1.5; max-width: 24ch; }
  .rail { position: sticky; top: 84px; }
  @media (max-width: 1120px) {
    .wrap { grid-template-columns: 1fr; padding: 0 14px 110px; }
    .rail { position: static; }
    .island { margin: 10px 10px 0; }
    .hero { padding: 0 16px; margin: 28px auto 20px; }
    .runmeta { display: none; }
    .capsule { margin-left: 0; }
  }
</style>
</head>
<body>
<div class="stage"><div class="orb v"></div><div class="orb e"></div><div class="orb b"></div></div>
<div class="grain"></div>

<header class="island">
  <div class="wordmark"><span class="logo-orb"></span>AgentOS</div>
  <span id="statusPill" class="pill"><span class="led"></span><span id="statusTxt">connecting</span></span>
  <div class="spacer"></div>
  <span class="runmeta" id="runmeta"></span>
  <button class="btn tiny" id="pauseBtn"><span id="pauseLbl">Pause</span><span class="cap">
    <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" fill="none" stroke-width="1.6"><path d="M9 5v14M15 5v14"/></svg></span>
  </button>
</header>

<div class="hero">
  <div>
    <p class="eyebrow" id="heroEyebrow">Mission control</p>
    <h1 id="heroTitle">Opening the <span class="hl">ledger</span>…</h1>
    <div class="sub" id="heroSub"></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="v" id="stCost">—</div><div class="l">spend</div></div>
    <div class="stat"><div class="v" id="stTok">—</div><div class="l">tokens</div></div>
    <div class="stat"><div class="v" id="stTurns">—</div><div class="l">turns</div></div>
    <div class="stat"><div class="v" id="stTime">—</div><div class="l">elapsed</div></div>
  </div>
</div>

<div class="wrap">
  <main>
    <section>
      <p class="eyebrow">Tasks <span class="count" id="taskCount"></span></p>
      <div class="strip" id="strip"></div>
    </section>
    <section>
      <p class="eyebrow">The room <span style="flex:1"></span><span class="chips"><span class="chip" id="noiseChip">show machine detail</span></span></p>
      <div class="conv" id="conv"></div>
    </section>
  </main>

  <aside class="rail">
    <section id="approvalsSec" style="display:none">
      <p class="eyebrow">Needs your decision</p>
      <div id="approvals"></div>
    </section>
    <section>
      <p class="eyebrow">Mission</p>
      <div class="shell"><div class="core">
        <div class="goalcard">
          <div class="ring" id="ring"></div>
          <div class="g" id="goal"></div>
        </div>
        <ol class="criteria" id="criteria"></ol>
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
  var BT = String.fromCharCode(96);
  var state = null;
  var agentIdx = {};
  var bootStagger = 0;

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
  function tstr(ts) { return new Date(ts).toLocaleTimeString([], { hour12: false }); }
  function money(v) { return '$' + (v || 0).toFixed(2); }
  function fmtTok(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n); }

  // ---------- lightweight markdown ----------
  var FENCE_AGENTOS = new RegExp(BT + BT + BT + 'agentos\\s*\\n([\\s\\S]*?)' + BT + BT + BT, 'g');
  var FENCE = new RegExp(BT + BT + BT + '([a-zA-Z]*)\\n?([\\s\\S]*?)' + BT + BT + BT, 'g');
  var INLINE = new RegExp(BT + '([^' + BT + '\\n]+)' + BT, 'g');

  function stripStructured(text) {
    var json = null;
    var rest = String(text || '').replace(FENCE_AGENTOS, function (_, body) {
      try { json = JSON.parse(body.trim()); } catch (e) { /* keep raw */ }
      return '';
    });
    return { text: rest.trim(), json: json };
  }
  function md(text) {
    var out = [];
    var last = 0, m;
    FENCE.lastIndex = 0;
    var t = String(text || '');
    while ((m = FENCE.exec(t))) {
      out.push(inline(t.slice(last, m.index)));
      out.push('<pre><code>' + esc(m[2]) + '</code></pre>');
      last = m.index + m[0].length;
    }
    out.push(inline(t.slice(last)));
    return out.join('');
  }
  function inline(t) {
    var s = esc(t);
    s = s.replace(INLINE, function (_, c) { return '<code>' + c + '</code>'; });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    var paras = s.split(/\n{2,}/).map(function (p) {
      var lines = p.split('\n');
      var isList = lines.length > 1 && lines.every(function (l) { return /^\s*([-*]|\d+[.)])\s/.test(l) || !l.trim(); });
      if (isList) {
        return '<ul>' + lines.filter(function (l) { return l.trim(); }).map(function (l) {
          return '<li>' + l.replace(/^\s*([-*]|\d+[.)])\s/, '') + '</li>';
        }).join('') + '</ul>';
      }
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    });
    return paras.join('');
  }
  function clipCard(html, rawText) {
    if (rawText.length <= 900) return html;
    var s = stripStructured(rawText).text.slice(0, 860);
    return md(s) + '<details class="more"><summary>show the full message</summary><pre>' + esc(rawText) + '</pre></details>';
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

  function renderHero(s) {
    var tasks = s.tasks.filter(function (t) { return t.status !== 'superseded' && t.status !== 'rejected'; });
    var done = tasks.filter(function (t) { return t.status === 'accepted'; }).length;
    var pend = s.approvals.filter(function (a) { return !a.decision; });
    var working = s.agents.filter(function (a) { return a.state === 'working'; });
    var title, eyebrow = 'Mission control', live = false;
    if (s.status === 'done') { title = 'Mission <span class="hl ok">accomplished</span>.'; eyebrow = 'Run complete'; }
    else if (pend.length) { title = 'Waiting on <span class="hl warn">your decision</span>.'; eyebrow = pend[0].gate + ' gate'; }
    else if (s.status === 'paused') { title = 'Run <span class="hl warn">paused</span>.'; eyebrow = 'On hold'; }
    else if (working.length) {
      live = true;
      var w = working[0];
      var t = tasks.filter(function (x) { return x.status === 'in-progress' || x.status === 'needs-review'; })[0];
      if (w.role === 'director' && !tasks.length) title = '<span class="hl">' + esc(w.name) + '</span> is drafting the plan.';
      else if (t && t.status === 'needs-review') title = '<span class="hl">' + esc(w.name) + '</span> is auditing the work.';
      else title = '<span class="hl">' + esc(w.name) + '</span> is building' + (tasks.length ? ' <span style="color:var(--ink-dim)">' + Math.min(done + 1, tasks.length) + ' of ' + tasks.length + '</span>.' : '.');
    } else title = 'Standing <span class="hl">by</span>.';
    el('heroTitle').innerHTML = title;
    el('heroEyebrow').textContent = eyebrow;
    var subBits = [];
    if (tasks.length) subBits.push(done + ' / ' + tasks.length + ' tasks accepted');
    subBits.push(s.agents.map(function (a) { return a.name + ' (' + a.role + ')'; }).join(' · '));
    el('heroSub').innerHTML = (live ? '<span class="livebar"></span>' : '') + '<span>' + esc(subBits.join('  ·  ')) + '</span>';

    var cost = 0, tok = 0, turns = 0;
    s.agents.forEach(function (a) { cost += a.totals.costUsd; tok += a.totals.inputTokens + a.totals.outputTokens; turns += a.totals.turns; });
    el('stCost').innerHTML = cost ? money(cost) : '$0<span class="u">+sub</span>';
    el('stTok').textContent = fmtTok(tok);
    el('stTurns').textContent = String(turns);
    var started = s.startedTs ? new Date(s.startedTs).getTime() : Date.now();
    var ended = (s.status === 'done' || s.status === 'failed') && s.lastTs ? new Date(s.lastTs).getTime() : Date.now();
    var mins = Math.max(0, Math.round((ended - started) / 60000));
    el('stTime').innerHTML = mins >= 60 ? Math.floor(mins / 60) + '<span class="u">h</span>' + (mins % 60) + '<span class="u">m</span>' : mins + '<span class="u">min</span>';

    // progress ring
    var pct = tasks.length ? done / tasks.length : 0;
    var C = 2 * Math.PI * 30;
    el('ring').innerHTML = '<svg width="74" height="74" viewBox="0 0 74 74">'
      + '<circle cx="37" cy="37" r="30" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="5"/>'
      + '<circle cx="37" cy="37" r="30" fill="none" stroke="url(#rg)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct)) + '" style="transition: stroke-dashoffset 1.2s var(--ease)"/>'
      + '<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#beb2ff"/><stop offset="1" stop-color="#6a5df0"/></linearGradient></defs></svg>'
      + '<span class="num">' + done + '/' + (tasks.length || 0) + '</span>';
  }

  // Re-render a container only when its content actually changed, so entry
  // animations play once instead of re-triggering on every ledger event.
  var htmlCache = {};
  function setHtml(id, html) {
    if (htmlCache[id] === html) return;
    htmlCache[id] = html;
    el(id).innerHTML = html;
  }

  var openTasks = {};
  function renderState(s) {
    state = s;
    s.agents.forEach(function (a, i) { agentIdx[a.name] = i % 2; });
    document.title = 'AgentOS — ' + s.status;
    el('statusTxt').textContent = s.status + (s.mode === 'team' ? ' · team' : '');
    el('statusPill').className = 'pill ' + s.status;
    el('runmeta').textContent = s.runId;
    el('goal').textContent = s.goal;
    setHtml('criteria', (s.criteria || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join(''));
    el('pauseLbl').textContent = s.status === 'paused' ? 'Resume' : 'Pause';
    renderHero(s);
    renderStrip(s);
    renderAgents(s);
    renderApprovals(s);
    renderScopes(s);
  }

  function stageOf(t) {
    return t.status === 'pending' ? ['planned', 'planned'] :
      t.status === 'in-progress' ? ['building', 'building'] :
      t.status === 'needs-review' ? ['review', 'in review'] : ['done', 'done'];
  }
  function renderStrip(s) {
    var tasks = s.tasks.filter(function (t) { return t.status !== 'superseded' && t.status !== 'rejected'; });
    el('taskCount').textContent = tasks.length ? tasks.filter(function (t) { return t.status === 'accepted'; }).length + ' / ' + tasks.length : '';
    if (!tasks.length) {
      setHtml('strip', '<div class="strip-empty">'
        + (s.mode === 'team' && s.status === 'running' ? '<span class="shimmer"></span><span>The director is studying the repository and drafting the plan…</span>' : '<span>No tasks yet.</span>')
        + '</div>');
      return;
    }
    setHtml('strip', tasks.map(function (t, i) {
      var st = stageOf(t);
      var open = openTasks[t.taskId] ? ' open' : '';
      var crit = (t.criteria || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
      return '<div class="tcard s-' + st[0] + open + '" data-task="' + esc(t.taskId) + '" style="animation-delay:' + (i * 80) + 'ms"><div class="in">'
        + '<div class="step"><span class="sdot"></span>' + (i + 1 < 10 ? '0' : '') + (i + 1) + ' · ' + st[1].toUpperCase() + '</div>'
        + '<div class="t">' + esc(t.title) + '</div>'
        + (crit ? '<ul class="crit">' + crit + '</ul>' : '')
        + '</div></div>';
    }).join(''));
  }
  el('strip').addEventListener('click', function (ev) {
    var n = ev.target.closest('.tcard'); if (!n) return;
    var id = n.getAttribute('data-task');
    openTasks[id] = !openTasks[id];
    n.classList.toggle('open');
  });

  function renderAgents(s) {
    setHtml('agents', s.agents.map(function (a, i) {
      var st = a.state;
      return '<div class="shell"><div class="core agent">'
        + '<div class="rowA">'
        + '<span class="presence ' + st + '"><span class="ring2"></span><span class="face av a' + (i % 2) + '" style="inset:5px"></span></span>'
        + '<div class="who"><div class="n">' + esc(a.name) + '<span class="tag violet">' + esc(a.role) + '</span></div>'
        + '<div class="r">' + esc(a.adapter) + ' · ' + esc(a.model) + ' · ' + esc(a.sandbox) + '</div></div>'
        + '</div>'
        + '<div class="statline">' + esc(st) + (a.detail ? ' — ' + esc(a.detail) : '') + '</div>'
        + '<div class="metrics">'
        + '<div class="metric"><div class="v">' + a.totals.turns + '</div><div class="l">turns</div></div>'
        + '<div class="metric"><div class="v">' + fmtTok(a.totals.inputTokens + a.totals.outputTokens) + '</div><div class="l">tokens</div></div>'
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
    }).join(''));
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
        w.document.write('<title>raw · ' + esc(agent) + '</title><body style="background:#0a0a0c;color:#c8cede;margin:0"><pre style="white-space:pre-wrap;font:11px/1.6 monospace;padding:18px">' + d.lines.map(esc).join('\n') + '</pre>');
      });
    }
  });

  function renderApprovals(s) {
    var pend = s.approvals.filter(function (a) { return !a.decision; });
    el('approvalsSec').style.display = pend.length ? '' : 'none';
    setHtml('approvals', pend.map(function (a) {
      return '<div class="shell approval-shell"><div class="core approval">'
        + '<div class="g">' + esc(a.gate) + ' gate</div>'
        + '<div class="s">' + esc(a.summary) + '</div>'
        + (a.detail ? '<details class="more"><summary>details</summary><pre>' + esc(a.detail) + '</pre></details>' : '')
        + '<input type="text" id="note-' + esc(a.approvalId) + '" placeholder="Note — required context if you reject">'
        + '<div class="acts">'
        + '<button class="btn primary" data-appr="allow" data-id="' + esc(a.approvalId) + '">Approve<span class="cap"><svg viewBox="0 0 24 24"><path d="M5 13l5 5L20 7" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button>'
        + '<button class="btn ghost-danger" data-appr="deny" data-id="' + esc(a.approvalId) + '">Reject</button>'
        + '</div></div></div>';
    }).join(''));
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
    setHtml('scopeChips', names.map(function (n) {
      return '<span class="chip' + (scope === n ? ' on' : '') + '" data-scope="' + esc(n) + '">to: ' + esc(n) + '</span>';
    }).join(''));
  }
  el('scopeChips').addEventListener('click', function (ev) {
    var c = ev.target.closest('.chip'); if (!c) return;
    scope = c.getAttribute('data-scope');
    renderScopes(state);
  });
  el('modeSup').addEventListener('click', function () { mode = 'supplement'; el('modeSup').classList.add('on'); el('modeOvr').classList.remove('on'); });
  el('modeOvr').addEventListener('click', function () { mode = 'override'; el('modeOvr').classList.add('on'); el('modeSup').classList.remove('on'); });
  el('intChip').addEventListener('click', function () {
    interrupt = !interrupt; el('intChip').classList.toggle('on', interrupt);
    el('dirHint').textContent = interrupt ? 'Aborts the current turn and re-delivers immediately.' : 'Lands at the next turn boundary, with a delivery receipt.';
  });
  el('sendBtn').addEventListener('click', function () {
    var text = el('dirText').value.trim(); if (!text) return;
    post('/api/directive', { scope: scope, mode: mode, text: text, interrupt: interrupt })
      .then(function () { el('dirText').value = ''; interrupt = false; el('intChip').classList.remove('on'); });
  });
  el('pauseBtn').addEventListener('click', function () {
    post('/api/run-pause', { paused: !(state && state.status === 'paused') });
  });

  // ---------- conversation ----------
  var GEAR = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>';
  var showNoise = false;
  var curCapsule = null; // { node, rowsNode, count, agent, secs, cost, tools }

  function avatarFor(name, isHuman) {
    var cls = isHuman ? 'human' : ('a' + (agentIdx[name] || 0));
    var glyph = isHuman ? '你' : esc(String(name).charAt(0).toUpperCase());
    return '<span class="av ' + cls + '"><span class="glyph">' + glyph + '</span></span>';
  }
  function roleOf(name) {
    if (!state) return '';
    var a = state.agents.filter(function (x) { return x.name === name; })[0];
    return a ? a.role : '';
  }

  function primaryMessage(env) {
    var e = env.event;
    var isHuman = env.origin.kind === 'human';
    var parsed = stripStructured(e.text);
    var kindTag = '';
    var cardCls = '';
    if (e.type === 'message') {
      if (e.kind === 'objection') { kindTag = '<span class="tag rose">objection</span>'; cardCls = ' objection'; }
      else if (e.kind === 'verdict') { kindTag = '<span class="tag ok">verdict</span>'; cardCls = ' verdict'; }
      else if (e.kind === 'handoff') kindTag = '<span class="tag violet">plan</span>';
      else if (e.kind === 'question') kindTag = '<span class="tag">question → you</span>';
      else kindTag = '<span class="tag">' + esc(e.kind) + '</span>';
    }
    var chip = '';
    if (parsed.json) {
      if (parsed.json.verdict) {
        chip = parsed.json.verdict === 'approve'
          ? '<div class="resultchip ok"><span class="d"></span>approved</div>'
          : '<div class="resultchip bad"><span class="d"></span>changes required</div>';
      } else if (parsed.json.status) {
        chip = parsed.json.status === 'done'
          ? '<div class="resultchip ok"><span class="d"></span>reports done</div>'
          : '<div class="resultchip bad"><span class="d"></span>' + esc(parsed.json.status) + '</div>';
      }
    }
    var name = isHuman ? 'You' : (e.from || (env.origin.kind === 'agent' ? env.origin.agent : 'system'));
    var role = isHuman ? '' : roleOf(name);
    var to = e.to && e.to !== 'human' ? ' <span style="color:var(--ink-faint); font-size:11px">→ ' + esc(e.to) + '</span>' : '';
    return '<div class="msg">'
      + avatarFor(name, isHuman)
      + '<div class="body"><div class="head"><span class="n">' + esc(name) + '</span>'
      + (role ? '<span class="tag violet">' + esc(role) + '</span>' : '')
      + (isHuman ? '<span class="tag human">human</span>' : '')
      + kindTag + to
      + '<span class="t">' + tstr(env.ts) + '</span></div>'
      + '<div class="card' + cardCls + (isHuman ? ' human' : '') + '">' + clipCard(md(parsed.text), e.text) + chip + '</div>'
      + '</div></div>';
  }

  function humanDirective(env) {
    var e = env.event;
    var head = e.type === 'directive'
      ? 'directive → ' + esc(e.scope) + ' · ' + esc(e.mode) + (e.interrupt ? ' · interrupt' : '')
      : e.type === 'goal.updated' ? 'goal ' + esc(e.mode) : 'note';
    return '<div class="msg">'
      + avatarFor('You', true)
      + '<div class="body"><div class="head"><span class="n">You</span><span class="tag human">' + head + '</span>'
      + '<span class="t">' + tstr(env.ts) + '</span></div>'
      + '<div class="card human">' + md(e.text) + '</div>'
      + '</div></div>';
  }

  function divider(cls, html) {
    return '<div class="divider ' + cls + '"><span class="line"></span><span class="chip">' + html + '</span><span class="line"></span></div>';
  }

  function isPrimary(e) {
    switch (e.type) {
      case 'message': case 'directive': case 'note': case 'goal.updated':
      case 'approval.requested': case 'approval.resolved':
      case 'task.created': case 'task.updated': case 'run.created': case 'run.status': case 'error':
        return true;
      default:
        return false;
    }
  }

  function capsuleRow(env) {
    var e = env.event;
    switch (e.type) {
      case 'turn.started':
        return '<b>' + esc(e.agent) + '</b> starts a turn — <a href="#" style="color:inherit" onclick="return false">prompt in ledger</a>';
      case 'turn.completed': {
        var u = e.usage || {};
        var bits = ['<b>' + esc(e.agent) + '</b> finished (' + esc(e.outcome) + ')'];
        if (e.durationMs != null) bits.push(Math.round(e.durationMs / 1000) + 's');
        if (u.outputTokens != null) bits.push(u.outputTokens + ' out-tok');
        if (u.costUsd != null) bits.push('$' + u.costUsd.toFixed(3));
        return bits.join(' · ') + (e.error ? ' — <span style="color:var(--rose)">' + esc(e.error) + '</span>' : '');
      }
      case 'tool.used':
        return '<b>' + esc(e.agent) + '</b> ▸ ' + esc(e.tool) + ' · ' + esc(e.summary);
      case 'files.changed':
        return (e.agent ? '<b>' + esc(e.agent) + '</b> · ' : '') + e.changes.map(function (c) {
          return '<span class="fb">' + esc(c.kind[0]) + ' ' + esc(c.path) + '</span>';
        }).join('');
      case 'agent.status':
        return esc(e.agent) + ' → ' + esc(e.state) + (e.detail ? ' (' + esc(e.detail) + ')' : '');
      case 'directive.delivered':
        return 'delivery receipt — <b>' + esc(e.agent) + '</b> has directive ' + esc(e.directiveId.slice(-6));
      case 'agent.registered':
        return 'registered <b>' + esc(e.spec.name) + '</b> · ' + esc(e.spec.adapter) + ' · ' + esc(e.spec.role) + ' · ' + esc(e.spec.sandbox);
      case 'agent.native-session':
        return esc(e.agent) + ' session ' + esc(e.nativeSessionId.slice(0, 13)) + '…';
      default:
        return esc(JSON.stringify(e).slice(0, 160));
    }
  }

  function capsuleStat(c) {
    var bits = [c.count + ' step' + (c.count > 1 ? 's' : '')];
    if (c.secs) bits.push(c.secs + 's');
    if (c.cost) bits.push('$' + c.cost.toFixed(2));
    var agents = Object.keys(c.agents);
    return (agents.length ? agents.join(' + ') + ' · ' : '') + bits.join(' · ');
  }

  function appendEvent(env) {
    var e = env.event;
    var conv = el('conv');
    var delay = bootStagger > 0 ? Math.min(bootStagger, 800) : 0;
    if (bootStagger > 0) bootStagger += 16;

    if (!isPrimary(e)) {
      // fold machine noise into the current capsule
      if (!curCapsule) {
        var d = document.createElement('details');
        d.className = 'capsule';
        if (showNoise) d.open = true;
        d.style.animationDelay = delay + 'ms';
        d.innerHTML = '<summary><span class="gear">' + GEAR + '</span><span class="cs">working…</span></summary><div class="rows"></div>';
        conv.appendChild(d);
        curCapsule = { node: d, rows: d.querySelector('.rows'), cs: d.querySelector('.cs'), count: 0, secs: 0, cost: 0, agents: {} };
      }
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = capsuleRow(env);
      curCapsule.rows.appendChild(row);
      curCapsule.count += 1;
      if (e.agent) curCapsule.agents[e.agent] = 1;
      if (e.type === 'turn.completed') {
        if (e.durationMs) curCapsule.secs += Math.round(e.durationMs / 1000);
        if (e.usage && e.usage.costUsd) curCapsule.cost += e.usage.costUsd;
      }
      curCapsule.cs.textContent = capsuleStat(curCapsule);
      return;
    }

    curCapsule = null; // a primary event closes the capsule
    var html = '';
    switch (e.type) {
      case 'message': html = primaryMessage(env); break;
      case 'directive': case 'note': case 'goal.updated': html = humanDirective(env); break;
      case 'approval.requested':
        html = divider('gate', '⛬ <b>' + esc(e.gate) + ' gate</b> — ' + esc(e.summary));
        break;
      case 'approval.resolved':
        html = divider(e.decision === 'allow' ? 'ok' : 'warn',
          (e.decision === 'allow' ? '✓ <b>approved</b>' : '✕ <b>rejected</b>') + (e.note ? ' — ' + esc(e.note) : '') + ' <span class="tag human" style="margin-left:6px">human</span>');
        break;
      case 'task.created':
        html = divider('', '+ task — <b>' + esc(e.title) + '</b> → ' + esc(e.assignee));
        break;
      case 'task.updated':
        if (!e.status || e.status === 'in-progress' && !e.note) { html = ''; break; }
        html = divider(e.status === 'accepted' ? 'ok' : e.status === 'needs-review' ? 'warn' : '',
          'task → <b>' + esc(e.status) + '</b>' + (e.note ? ' — ' + esc(e.note) : ''));
        break;
      case 'run.created':
        html = divider('', 'run created — ' + e.agents.map(function (a) { return '<b>' + esc(a.name) + '</b> (' + esc(a.role) + ')'; }).join(' + '));
        break;
      case 'run.status':
        html = divider(e.status === 'done' ? 'ok' : e.status === 'paused' ? 'warn' : '',
          'run → <b>' + esc(e.status) + '</b>' + (e.reason ? ' — ' + esc(e.reason) : ''));
        break;
      case 'error':
        html = divider('warn', '<span style="color:var(--rose)">✕ ' + esc(e.scope) + ' — ' + esc(e.message) + '</span>');
        break;
    }
    if (!html) return;
    var div = document.createElement('div');
    div.innerHTML = html;
    var node = div.firstChild;
    node.style.animationDelay = delay + 'ms';
    conv.appendChild(node);
  }

  el('noiseChip').addEventListener('click', function () {
    showNoise = !showNoise;
    el('noiseChip').classList.toggle('on', showNoise);
    el('noiseChip').textContent = showNoise ? 'hide machine detail' : 'show machine detail';
    var caps = document.querySelectorAll('.capsule');
    for (var i = 0; i < caps.length; i++) caps[i].open = showNoise;
  });

  // ---------- boot ----------
  setInterval(function () { if (state) renderHero(state); }, 30000);
  fetch('/api/state').then(function (r) { return r.json(); }).then(function (s) {
    renderState(s);
    bootStagger = 1;
    var es = new EventSource('/api/stream?since=0');
    es.onmessage = function (m) {
      appendEvent(JSON.parse(m.data));
      scheduleRefetch();
    };
    es.onopen = function () { setTimeout(function () { bootStagger = 0; }, 1300); };
    es.onerror = function () { el('statusTxt').textContent = 'reconnecting…'; };
  });
})();
</script>
</body>
</html>`;
