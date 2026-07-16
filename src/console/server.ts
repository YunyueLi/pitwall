import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Orchestrator } from '../orchestrator/orchestrator.js';
import { layerOf } from '../core/events.js';
import { writeControl } from '../core/store.js';
import { UI_HTML } from './ui.js';

/**
 * The control server is both the console backend and the IPC surface the CLI
 * talks to. It binds to 127.0.0.1 only: the ledger contains prompts, diffs
 * and repo paths, none of which belong on the network by default.
 */
export function startControlServer(orch: Orchestrator, preferredPort = 0): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => handle(orch, req, res));
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(preferredPort, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      writeControl(orch.dir, { pid: process.pid, port, startedAt: new Date().toISOString() });
      resolve({ server, port });
    });
  });
}

async function handle(orch: Orchestrator, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(UI_HTML);
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
      for (const env of orch.events()) {
        if (env.seq > since) res.write(`data: ${JSON.stringify(env)}\n\n`);
      }
      const un = orch.subscribe((env) => res.write(`data: ${JSON.stringify(env)}\n\n`));
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
      const body = await readBody(req);
      switch (url.pathname) {
        case '/api/directive': {
          const id = orch.directive(
            String(body.scope ?? 'all'),
            body.mode === 'override' ? 'override' : 'supplement',
            String(body.text ?? ''),
            !!body.interrupt,
          );
          json(res, 200, { directiveId: id });
          return;
        }
        case '/api/goal':
          orch.updateGoal(String(body.text ?? ''), body.mode === 'supplement' ? 'supplement' : 'override');
          json(res, 200, { ok: true });
          return;
        case '/api/approval':
          orch.resolveApproval(String(body.approvalId), body.decision === 'allow' ? 'allow' : 'deny', body.note ? String(body.note) : undefined);
          json(res, 200, { ok: true });
          return;
        case '/api/agent-pause':
          orch.setAgentPaused(String(body.agent), !!body.paused, !!body.interrupt);
          json(res, 200, { ok: true });
          return;
        case '/api/run-pause':
          orch.setRunPaused(!!body.paused);
          json(res, 200, { ok: true });
          return;
        case '/api/note':
          orch.addNote(String(body.text ?? ''));
          json(res, 200, { ok: true });
          return;
        case '/api/stop':
          json(res, 200, { ok: true });
          setTimeout(() => void orch.stop(), 50);
          return;
      }
    }
    json(res, 404, { error: 'not found' });
  } catch (err) {
    json(res, 500, { error: String(err instanceof Error ? err.message : err) });
  }
}

function serializeState(orch: Orchestrator): unknown {
  const s = orch.state();
  return {
    runId: s.runId,
    repo: s.repo,
    mode: orch.mode(),
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
