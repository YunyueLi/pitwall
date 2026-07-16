import { parseArgs } from 'node:util';
import { join, resolve } from 'node:path';
import type { AgentSpec, Envelope } from './core/events.js';
import { readLedgerFile } from './core/ledger.js';
import { reduce, currentGoal } from './core/state.js';
import { clearControl, listRuns, readControl, resolveRunId, runDir } from './core/store.js';
import { Orchestrator, type RunConfig } from './orchestrator/orchestrator.js';
import { startControlServer } from './console/server.js';

const VERSION = '0.1.0';

const HELP = `agentos ${VERSION} — a control plane for coding agents collaborating on one repository

Usage:
  agentos run --repo <dir> --goal "<text>" [options]   Start a new run (foreground)
  agentos resume [runId]                               Resume a run after crash/stop
  agentos ls                                           List runs
  agentos status [runId]                               Show run state (live or offline)
  agentos tell [runId] [--to <agent|all>] [--override] [--interrupt] "<text>"
                                                       Send a directive to agents
  agentos goal [runId] [--supplement] "<text>"         Revise the goal (default: override)
  agentos approve [runId] [--note "<text>"]            Approve the pending gate
  agentos reject [runId] [--note "<text>"]             Reject the pending gate
  agentos pause [runId] [--agent <name>] [--interrupt] Pause run or one agent
  agentos unpause [runId] [--agent <name>]             Unpause run or one agent
  agentos watch [runId]                                Follow the timeline in the terminal
  agentos stop [runId]                                 Stop a live orchestrator gracefully

Options for run:
  --repo <dir>            Target repository (default: cwd)
  --goal <text>           The goal (required)
  --criteria <text>       Completion criterion, repeatable
  --driver <kind>         claude-code | codex (default: claude-code)
  --reviewer <kind>       claude-code | codex (default: codex)
  --driver-model <m>      Model override for the driver
  --reviewer-model <m>    Model override for the reviewer
  --max-rounds <n>        Max review rounds before forcing human decision (default: 3)
  --turn-timeout <min>    Minutes before a stuck turn is interrupted (default: 20)
  --port <n>              Console port (default: random)
`;

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case 'run':
      return cmdRun(rest);
    case 'resume':
      return cmdResume(rest);
    case 'ls':
      return cmdLs();
    case 'status':
      return cmdStatus(rest);
    case 'tell':
      return cmdTell(rest);
    case 'goal':
      return cmdGoal(rest);
    case 'approve':
      return cmdDecide(rest, 'allow');
    case 'reject':
      return cmdDecide(rest, 'deny');
    case 'pause':
      return cmdPause(rest, true);
    case 'unpause':
      return cmdPause(rest, false);
    case 'watch':
      return cmdWatch(rest);
    case 'stop':
      return cmdStop(rest);
    case '--version':
    case '-V':
      console.log(VERSION);
      return;
    default:
      console.log(HELP);
      process.exitCode = cmd && cmd !== 'help' && cmd !== '--help' ? 1 : 0;
  }
}

// ---------------------------------------------------------------------------

function agentSpec(kind: string, role: 'driver' | 'reviewer', model?: string): AgentSpec {
  if (kind !== 'claude-code' && kind !== 'codex') {
    throw new Error(`unknown adapter "${kind}" (use claude-code or codex)`);
  }
  const name = kind === 'claude-code' ? 'claude' : 'codex';
  return {
    name,
    adapter: kind,
    role,
    model,
    sandbox: role === 'driver' ? 'workspace-write' : 'read-only',
  };
}

async function cmdRun(argv: string[]): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      repo: { type: 'string' },
      goal: { type: 'string' },
      criteria: { type: 'string', multiple: true },
      driver: { type: 'string', default: 'claude-code' },
      reviewer: { type: 'string', default: 'codex' },
      'driver-model': { type: 'string' },
      'reviewer-model': { type: 'string' },
      'max-rounds': { type: 'string', default: '3' },
      'turn-timeout': { type: 'string', default: '20' },
      port: { type: 'string', default: '0' },
    },
  });
  if (!values.goal) throw new Error('--goal is required');
  const repo = resolve(values.repo ?? process.cwd());
  const driver = agentSpec(values.driver!, 'driver', values['driver-model']);
  const reviewer = agentSpec(values.reviewer!, 'reviewer', values['reviewer-model']);
  if (driver.name === reviewer.name) {
    driver.name = `${driver.name}-driver`;
    reviewer.name = `${reviewer.name}-reviewer`;
  }
  const config: RunConfig = {
    goal: values.goal,
    criteria: values.criteria ?? [],
    repo,
    driver,
    reviewer,
    maxReviewRounds: Number(values['max-rounds']),
    turnTimeoutMs: Number(values['turn-timeout']) * 60 * 1000,
  };
  const orch = Orchestrator.create(config, VERSION);
  await serve(orch, Number(values.port));
}

async function cmdResume(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { port: { type: 'string', default: '0' } },
    allowPositionals: true,
  });
  const runId = resolveRunId(positionals[0]);
  const live = readControl(runDir(runId));
  if (live) throw new Error(`run ${runId} already has a live orchestrator (pid ${live.pid})`);
  const orch = Orchestrator.resume(runId);
  await serve(orch, Number(values.port));
}

async function serve(orch: Orchestrator, port: number): Promise<void> {
  const { server, port: boundPort } = await startControlServer(orch, port);
  console.log(`run:     ${orch.runId}`);
  console.log(`console: http://127.0.0.1:${boundPort}/`);
  console.log(`goal:    ${orch.goalText()}\n`);
  printTimeline(orch.events(), false);
  orch.subscribe((env) => printTimeline([env], true));

  const shutdown = () => {
    console.log('\nshutting down (run state is durable; `agentos resume` continues it)…');
    void orch.stop();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await orch.run();
  clearControl(orch.dir);
  server.close();
  const status = orch.state().status;
  console.log(`\nrun ${orch.runId} is ${status}.`);
  process.exit(status === 'done' ? 0 : 2);
}

// ---------------------------------------------------------------------------

function cmdLs(): void {
  const runs = listRuns();
  if (!runs.length) {
    console.log('no runs yet — start one with `agentos run --goal "…"`');
    return;
  }
  for (const r of runs) {
    const history = readLedgerFile(join(runDir(r.runId), 'events.jsonl'));
    const s = reduce(history);
    const live = readControl(runDir(r.runId));
    console.log(
      `${r.runId}  ${s.status.padEnd(15)} ${live ? `live:${live.port}` : 'offline  '}  ${r.createdAt}  ${currentGoal(s).slice(0, 60)}`,
    );
  }
}

function loadState(runId: string) {
  const history = readLedgerFile(join(runDir(runId), 'events.jsonl'));
  return { history, state: reduce(history) };
}

function cmdStatus(argv: string[]): void {
  const runId = resolveRunId(argv[0]);
  const { state } = loadState(runId);
  const live = readControl(runDir(runId));
  console.log(`run      ${runId} (${live ? `live, console http://127.0.0.1:${live.port}/` : 'offline'})`);
  console.log(`status   ${state.status}${state.statusReason ? ` — ${state.statusReason}` : ''}`);
  console.log(`repo     ${state.repo}`);
  console.log(`goal     ${currentGoal(state)}`);
  for (const t of state.tasks.values()) console.log(`task     [${t.status}] ${t.title} → ${t.assignee}`);
  for (const a of state.agents.values()) {
    console.log(
      `agent    ${a.spec.name} (${a.spec.adapter}, ${a.spec.role}, ${a.spec.sandbox}) ${a.state}` +
        ` — ${a.totals.turns} turns, $${a.totals.costUsd.toFixed(4)}, ${a.totals.inputTokens + a.totals.outputTokens} tok`,
    );
  }
  const pending = [...state.approvals.values()].filter((x) => !x.decision);
  for (const p of pending) console.log(`GATE     [${p.gate}] ${p.summary}\n         approve with: agentos approve ${runId}`);
  if (state.changedFiles.size) {
    console.log(`files    ${[...state.changedFiles.keys()].join(', ')}`);
  }
}

// ---------------------------------------------------------------------------

async function api(runId: string, path: string, body: unknown): Promise<any> {
  const live = readControl(runDir(runId));
  if (!live) {
    throw new Error(
      `run ${runId} has no live orchestrator — start one with \`agentos resume ${runId}\` first`,
    );
  }
  const res = await fetch(`http://127.0.0.1:${live.port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

function splitRunAndText(
  argv: string[],
  flags: Record<string, { type: 'string' | 'boolean'; default?: string | boolean }>,
): { values: any; runId: string; text: string } {
  const { values, positionals } = parseArgs({ args: argv, options: flags, allowPositionals: true });
  // Heuristic: with two positionals the first is the run id; with one it's the text.
  let runId: string | undefined;
  let text: string | undefined;
  if (positionals.length >= 2) {
    runId = positionals[0];
    text = positionals.slice(1).join(' ');
  } else {
    text = positionals[0];
  }
  return { values, runId: resolveRunId(runId), text: text ?? '' };
}

async function cmdTell(argv: string[]): Promise<void> {
  const { values, runId, text } = splitRunAndText(argv, {
    to: { type: 'string', default: 'all' },
    override: { type: 'boolean', default: false },
    interrupt: { type: 'boolean', default: false },
  });
  if (!text) throw new Error('directive text required');
  const r = await api(runId, '/api/directive', {
    scope: values.to,
    mode: values.override ? 'override' : 'supplement',
    text,
    interrupt: values.interrupt,
  });
  console.log(
    `directive ${r.directiveId} recorded (scope=${values.to}, mode=${values.override ? 'override' : 'supplement'}${values.interrupt ? ', interrupting now' : ', applies at next turn boundary'}); delivery will be acknowledged in the timeline`,
  );
}

async function cmdGoal(argv: string[]): Promise<void> {
  const { values, runId, text } = splitRunAndText(argv, {
    supplement: { type: 'boolean', default: false },
  });
  if (!text) throw new Error('goal text required');
  await api(runId, '/api/goal', { text, mode: values.supplement ? 'supplement' : 'override' });
  console.log(`goal ${values.supplement ? 'supplemented' : 'overridden'}; agents see it from their next turn`);
}

async function cmdDecide(argv: string[], decision: 'allow' | 'deny'): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { note: { type: 'string' } },
    allowPositionals: true,
  });
  const runId = resolveRunId(positionals[0]);
  const { state } = loadState(runId);
  const pending = [...state.approvals.values()].filter((a) => !a.decision);
  if (!pending.length) throw new Error('no pending approval');
  await api(runId, '/api/approval', { approvalId: pending[0]!.approvalId, decision, note: values.note });
  console.log(`${decision === 'allow' ? 'approved' : 'rejected'}: ${pending[0]!.summary}`);
}

async function cmdPause(argv: string[], paused: boolean): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { agent: { type: 'string' }, interrupt: { type: 'boolean', default: false } },
    allowPositionals: true,
  });
  const runId = resolveRunId(positionals[0]);
  if (values.agent) {
    await api(runId, '/api/agent-pause', { agent: values.agent, paused, interrupt: values.interrupt });
    console.log(`${values.agent} ${paused ? 'paused' : 'unpaused'}`);
  } else {
    await api(runId, '/api/run-pause', { paused });
    console.log(`run ${paused ? 'paused' : 'resumed'}`);
  }
}

async function cmdWatch(argv: string[]): Promise<void> {
  const runId = resolveRunId(argv[0]);
  const live = readControl(runDir(runId));
  const { history } = loadState(runId);
  printTimeline(history, false);
  if (!live) {
    console.log('\n(run is offline — showing recorded history; `agentos resume` to continue it)');
    return;
  }
  console.log(`\nconsole: http://127.0.0.1:${live.port}/  (following live events, Ctrl-C to detach)\n`);
  const res = await fetch(`http://127.0.0.1:${live.port}/api/stream?since=${history.length ? history[history.length - 1]!.seq : 0}`);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      if (chunk.startsWith('data: ')) printTimeline([JSON.parse(chunk.slice(6))], true);
    }
  }
}

async function cmdStop(argv: string[]): Promise<void> {
  const runId = resolveRunId(argv[0]);
  await api(runId, '/api/stop', {});
  console.log(`stop requested; run ${runId} can be continued later with \`agentos resume\``);
}

// ---------------------------------------------------------------------------
// Terminal timeline rendering (message/state/action layers only)

function printTimeline(envs: Envelope[], _live: boolean): void {
  for (const env of envs) {
    const e = env.event;
    const t = new Date(env.ts).toLocaleTimeString([], { hour12: false });
    const line = (s: string) => console.log(`  ${t}  ${s}`);
    switch (e.type) {
      case 'run.created':
        line(`▶ run created — agents: ${e.agents.map((a) => `${a.name}(${a.adapter}/${a.role})`).join(', ')}`);
        break;
      case 'run.status':
        line(`■ run → ${e.status}${e.reason ? ` (${e.reason})` : ''}`);
        break;
      case 'goal.updated':
        line(`✎ goal ${e.mode}: ${e.text.slice(0, 100)}`);
        break;
      case 'message':
        line(`✉ ${e.from} → ${e.to} [${e.kind}] ${firstLine(e.text, 110)}`);
        break;
      case 'directive':
        line(`⚑ human → ${e.scope} [${e.mode}${e.interrupt ? ',interrupt' : ''}] ${firstLine(e.text, 100)}`);
        break;
      case 'directive.delivered':
        line(`  ✓ directive delivered to ${e.agent}`);
        break;
      case 'task.updated':
        if (e.status) line(`◆ task → ${e.status}${e.note ? ` (${firstLine(e.note, 70)})` : ''}`);
        break;
      case 'turn.started':
        line(`… ${e.agent} turn started`);
        break;
      case 'turn.completed': {
        const cost = e.usage?.costUsd != null ? ` $${e.usage.costUsd.toFixed(4)}` : '';
        const dur = e.durationMs != null ? ` ${Math.round(e.durationMs / 1000)}s` : '';
        line(`✔ ${e.agent} turn ${e.outcome}${dur}${cost}${e.error ? ` — ${firstLine(e.error, 80)}` : ''}`);
        break;
      }
      case 'approval.requested':
        line(`⛔ APPROVAL NEEDED [${e.gate}] ${firstLine(e.summary, 100)}`);
        break;
      case 'approval.resolved':
        line(`⛔ approval → ${e.decision}${e.note ? ` (${firstLine(e.note, 80)})` : ''}`);
        break;
      case 'files.changed':
        line(`± ${e.changes.map((c) => c.path).join(', ')} (${e.source}${e.agent ? `, ${e.agent}` : ''})`);
        break;
      case 'note':
        line(`✎ note: ${firstLine(e.text, 100)}`);
        break;
      case 'error':
        line(`✖ ${e.scope}: ${firstLine(e.message, 110)}`);
        break;
      default:
        break; // tool detail stays in the console UI / raw logs
    }
  }
}

function firstLine(s: string, max: number): string {
  const l = s.split('\n')[0] ?? '';
  return l.length > max ? l.slice(0, max) + '…' : l;
}

main().catch((err) => {
  console.error(`agentos: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
