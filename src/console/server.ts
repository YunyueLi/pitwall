import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFileSync, statSync, unwatchFile, watchFile } from 'node:fs';
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
        return {
          runId: r.runId,
          createdAt: r.createdAt,
          repo: r.repo,
          goal: s.goalHistory[s.goalHistory.length - 1]?.text ?? '',
          status: s.status,
          mode: b.mode(),
          live: !!live,
          current: r.runId === primary.runId,
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
  return {
    runId: s.runId,
    repo: s.repo,
    mode: orch.mode(),
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
