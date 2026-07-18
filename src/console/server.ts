import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { openSync, readFileSync, statSync, unwatchFile, watchFile } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Orchestrator } from '../orchestrator/orchestrator.js';
import { layerOf, type Envelope } from '../core/events.js';
import { readLedgerFile } from '../core/ledger.js';
import { reduce } from '../core/state.js';
import { listRuns, readControl, runDir, writeControl } from '../core/store.js';
import { UI_HTML } from './ui.js';

/**
 * The control server is both the console backend and the IPC surface the CLI
 * talks to. It binds to 127.0.0.1 only: the ledger contains prompts, diffs
 * and repo paths, none of which belong on the network by default.
 *
 * One server can show every run on the machine: its own live run read-write,
 * any other via `?run=` — served read-only straight from that run's ledger
 * file, tailed live even if a different process is writing it.
 */
export interface ConsoleBackend {
  runId: string;
  dir: string;
  state(): ReturnType<Orchestrator['state']>;
  events(): ReturnType<Orchestrator['events']>;
  subscribe(fn: Parameters<Orchestrator['subscribe']>[0]): () => void;
  criteria(): string[];
  mode(): 'pair' | 'team';
  readonly?: boolean;
  directive?(scope: string, mode: 'supplement' | 'override', text: string, interrupt: boolean): string;
  updateGoal?(text: string, mode: 'supplement' | 'override'): void;
  resolveApproval?(approvalId: string, decision: 'allow' | 'deny', note?: string): void;
  setAgentPaused?(agent: string, paused: boolean, interrupt?: boolean): void;
  setRunPaused?(paused: boolean): void;
  addNote?(text: string): void;
  stop?(): Promise<void>;
}

/** Read-only backend over a ledger file; tails appends from other processes. */
export function ledgerBackend(runId: string): ConsoleBackend {
  const dir = runDir(runId);
  const path = join(dir, 'events.jsonl');
  let history = readLedgerFile(path);
  let size = fileSize(path);
  const refresh = () => {
    const now = fileSize(path);
    if (now !== size) {
      size = now;
      history = readLedgerFile(path);
    }
  };
  const created = () => {
    const e = history.find((x) => x.event.type === 'run.created')?.event;
    return e && e.type === 'run.created' ? e : undefined;
  };
  return {
    runId,
    dir,
    readonly: true,
    state: () => {
      refresh();
      return reduce(history);
    },
    events: () => {
      refresh();
      return history;
    },
    criteria: () => created()?.criteria ?? [],
    mode: () => created()?.mode ?? 'pair',
    subscribe: (fn) => {
      let sent = history.length;
      const listener = () => {
        refresh();
        for (; sent < history.length; sent++) fn(history[sent]!);
      };
      watchFile(path, { interval: 700 }, listener);
      return () => unwatchFile(path, listener);
    },
  };
}

function fileSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return -1;
  }
}

export function startControlServer(orch: ConsoleBackend, preferredPort = 0): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => handle(orch, req, res));
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(preferredPort, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      if (!orch.readonly) {
        writeControl(orch.dir, { pid: process.pid, port, startedAt: new Date().toISOString() });
      }
      resolve({ server, port });
    });
  });
}

async function handle(primary: ConsoleBackend, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    const runParam = url.searchParams.get('run');
    const isPrimary = !runParam || runParam === primary.runId;
    const orch: ConsoleBackend = isPrimary ? primary : ledgerBackend(runParam!);

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(UI_HTML);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/runs') {
      json(res, 200, listRuns().map((r) => {
        const b = ledgerBackend(r.runId);
        const s = b.state();
        const live = readControl(runDir(r.runId));
        const tasks = [...s.tasks.values()].filter((x) => x.status !== 'superseded' && x.status !== 'rejected');
        let cost = 0;
        for (const a of s.agents.values()) cost += a.totals.costUsd;
        return {
          runId: r.runId,
          createdAt: r.createdAt,
          repo: r.repo,
          goal: s.goalHistory[s.goalHistory.length - 1]?.text ?? '',
          status: s.status,
          mode: b.mode(),
          live: !!live,
          current: r.runId === primary.runId,
          pending: [...s.approvals.values()].filter((a) => !a.decision).length,
          costUsd: cost,
          tasksDone: tasks.filter((x) => x.status === 'accepted').length,
          tasksTotal: tasks.length,
        };
      }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      json(res, 200, serializeState(orch));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      const since = Number(url.searchParams.get('since') ?? 0);
      json(res, 200, orch.events().filter((e) => e.seq > since));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/stream') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      const since = Number(url.searchParams.get('since') ?? 0);
      const send = (env: Envelope) => res.write(`data: ${JSON.stringify(env)}\n\n`);
      for (const env of orch.events()) {
        if (env.seq > since) send(env);
      }
      const un = orch.subscribe(send);
      const ping = setInterval(() => res.write(': ping\n\n'), 15000);
      req.on('close', () => {
        clearInterval(ping);
        un();
      });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/diff') {
      const p = url.searchParams.get('path') ?? '';
      if (p.includes('..') || p.startsWith('/') || p.includes('\0')) {
        json(res, 400, { error: 'bad path' });
        return;
      }
      json(res, 200, { path: p, diff: gitDiff(orch.state().repo, p || undefined) });
      return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/raw/')) {
      const agent = decodeURIComponent(url.pathname.slice('/api/raw/'.length));
      if (!/^[\w.-]+$/.test(agent)) {
        json(res, 400, { error: 'bad agent name' });
        return;
      }
      const n = Math.min(Number(url.searchParams.get('n') ?? 200), 2000);
      let lines: string[] = [];
      try {
        lines = readFileSync(join(orch.dir, `raw-${agent}.jsonl`), 'utf8').trimEnd().split('\n').slice(-n);
      } catch {
        /* no raw log yet */
      }
      json(res, 200, { agent, lines });
      return;
    }

    // Starting a NEW run is a product action, not a mutation of the viewed
    // run, so it works from read-only view servers too (still 127.0.0.1-only).
    if (req.method === 'POST' && url.pathname === '/api/runs/new') {
      const body = await readBody(req);
      const repo = String(body.repo ?? '').trim();
      const goal = String(body.goal ?? '').trim();
      if (!repo || !goal) {
        json(res, 400, { error: 'repo and goal are required' });
        return;
      }
      try {
        if (!statSync(repo).isDirectory()) throw new Error('not a directory');
      } catch {
        json(res, 400, { error: `repo path is not a directory: ${repo}` });
        return;
      }
      const args = [process.argv[1]!, 'run', '--repo', repo, '--goal', goal, '--mode', body.mode === 'pair' ? 'pair' : 'team'];
      const criteria = Array.isArray(body.criteria) ? body.criteria : [];
      for (const c of criteria.slice(0, 8)) {
        const t = String(c).trim();
        if (t) args.push('--criteria', t);
      }
      if (body.auto) {
        args.push('--auto');
        const it = Number(body.iterate ?? 0);
        if (Number.isInteger(it) && it > 0) args.push('--iterate', String(Math.min(it, 20)));
      }
      const log = join(tmpdir(), `pitwall-run-${Date.now()}.log`);
      const out = openSync(log, 'a');
      const child = spawn(process.execPath, args, { detached: true, stdio: ['ignore', out, out] });
      child.unref();
      json(res, 200, { ok: true, pid: child.pid, log });
      return;
    }

    if (req.method === 'POST') {
      if (orch.readonly) {
        const live = readControl(orch.dir);
        json(res, 403, {
          error: live
            ? `this run is driven by another process (console at http://127.0.0.1:${live.port}/)`
            : 'read-only: the run is not live (use `pitwall resume` to drive it)',
        });
        return;
      }
      const body = await readBody(req);
      switch (url.pathname) {
        case '/api/directive': {
          const id = orch.directive!(
            String(body.scope ?? 'all'),
            body.mode === 'override' ? 'override' : 'supplement',
            String(body.text ?? ''),
            !!body.interrupt,
          );
          json(res, 200, { directiveId: id });
          return;
        }
        case '/api/goal':
          orch.updateGoal!(String(body.text ?? ''), body.mode === 'supplement' ? 'supplement' : 'override');
          json(res, 200, { ok: true });
          return;
        case '/api/approval':
          orch.resolveApproval!(String(body.approvalId), body.decision === 'allow' ? 'allow' : 'deny', body.note ? String(body.note) : undefined);
          json(res, 200, { ok: true });
          return;
        case '/api/agent-pause':
          orch.setAgentPaused!(String(body.agent), !!body.paused, !!body.interrupt);
          json(res, 200, { ok: true });
          return;
        case '/api/run-pause':
          orch.setRunPaused!(!!body.paused);
          json(res, 200, { ok: true });
          return;
        case '/api/note':
          orch.addNote!(String(body.text ?? ''));
          json(res, 200, { ok: true });
          return;
        case '/api/stop':
          json(res, 200, { ok: true });
          setTimeout(() => void orch.stop!(), 50);
          return;
      }
    }
    json(res, 404, { error: 'not found' });
  } catch (err) {
    json(res, 500, { error: String(err instanceof Error ? err.message : err) });
  }
}

function serializeState(orch: ConsoleBackend): unknown {
  const s = orch.state();
  const events = orch.events();
  const created = events.find((e) => e.event.type === 'run.created')?.event;
  const goalsOpened = events.filter((e) => e.event.type === 'goal.updated' && e.origin.kind === 'agent').length;
  return {
    runId: s.runId,
    repo: s.repo,
    mode: orch.mode(),
    autonomous: created?.type === 'run.created' ? !!created.autonomous : false,
    iterate: created?.type === 'run.created' ? (created.iterate ?? 0) : 0,
    goalsOpened,
    readonly: !!orch.readonly,
    startedTs: events[0]?.ts,
    lastTs: events[events.length - 1]?.ts,
    status: s.status,
    statusReason: s.statusReason,
    goal: s.goalHistory[s.goalHistory.length - 1]?.text ?? '',
    goalHistory: s.goalHistory,
    criteria: orch.criteria(),
    agents: [...s.agents.values()].map((a) => ({
      name: a.spec.name,
      adapter: a.spec.adapter,
      role: a.spec.role,
      model: a.spec.model ?? 'default',
      sandbox: a.spec.sandbox,
      state: a.state,
      detail: a.detail,
      nativeSessionId: a.nativeSessionId,
      totals: a.totals,
      openTurnId: a.openTurnId,
    })),
    tasks: [...s.tasks.values()],
    directives: [...s.directives.values()],
    approvals: [...s.approvals.values()],
    files: [...s.changedFiles.entries()].map(([path, v]) => ({ path, ...v })),
    lastSeq: s.lastSeq,
  };
}

function json(res: ServerResponse, code: number, data: unknown): void {
  res.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify(data));
}

/** Read-only diff of the working tree against HEAD, optionally for one path.
 * Untracked files come back as an all-added diff. Never throws. */
function gitDiff(repo: string, path?: string): string {
  const run = (args: string[]) => {
    try {
      return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 4_000_000, timeout: 5000 });
    } catch (e: any) {
      return typeof e?.stdout === 'string' ? e.stdout : ''; // diff --no-index exits 1 when files differ
    }
  };
  const scope = path ? ['--', path] : [];
  let out = run(['diff', 'HEAD', ...scope]);
  if (!out.trim()) out = run(['diff', ...scope]);
  if (!out.trim() && path) out = run(['diff', '--no-index', '--', '/dev/null', path]);
  if (!out.trim() && !path) {
    const untracked = run(['ls-files', '--others', '--exclude-standard']).trim();
    if (untracked) out = untracked.split('\n').map((f: string) => run(['diff', '--no-index', '--', '/dev/null', f])).join('');
  }
  return out.length > 400_000 ? out.slice(0, 400_000) + '\n… (truncated)' : out;
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (d) => {
      buf += d;
      if (buf.length > 1_000_000) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export { layerOf };
