import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { readLedgerFile } from './core/ledger.js';
import { currentGoal } from './core/state.js';
import { listRuns, readControl, resolveRunId, runDir } from './core/store.js';
import { ledgerBackend } from './console/server.js';

/**
 * `pitwall mcp` — the lightweight form of the product: a zero-dependency MCP
 * server on stdio, so ANY MCP-capable agent (Claude Code, Codex, editors)
 * can observe and steer Pitwall runs without opening the web console.
 *
 *   claude mcp add pitwall -- pitwall mcp
 *   codex:  [mcp_servers.pitwall] command = "pitwall"  args = ["mcp"]
 *
 * Reads go straight to the ledgers; writes are forwarded to the live
 * orchestrator's local control API (they fail cleanly when no run is live).
 */

interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  run: (args: any) => Promise<string>;
}

const str = (d: string) => ({ type: 'string', description: d });

const TOOLS: Tool[] = [
  {
    name: 'pitwall_list_runs',
    description: 'List Pitwall runs on this machine: id, status, goal, whether a live orchestrator is driving it.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      const runs = listRuns();
      if (!runs.length) return 'No runs. Start one with: pitwall run --repo <dir> --goal "…"';
      return runs
        .map((r) => {
          const b = ledgerBackend(r.runId);
          const s = b.state();
          const live = readControl(runDir(r.runId));
          return `${r.runId} [${s.status}${live ? ', LIVE' : ''}] ${currentGoal(s).slice(0, 100)}`;
        })
        .join('\n');
    },
  },
  {
    name: 'pitwall_status',
    description: 'Full status of one run: goal, tasks with review states, agents with cost, pending human gates.',
    inputSchema: { type: 'object', properties: { run: str('Run id or prefix; defaults to the most recent run.') } },
    run: async (a) => {
      const runId = resolveRunId(a?.run);
      const s = ledgerBackend(runId).state();
      const lines = [
        `run ${runId} — ${s.status}${s.statusReason ? ` (${s.statusReason})` : ''}`,
        `goal: ${currentGoal(s)}`,
      ];
      for (const t of s.tasks.values()) {
        if (t.status === 'superseded') continue;
        lines.push(`task [${t.status}] ${t.title} → ${t.assignee}`);
      }
      for (const ag of s.agents.values()) {
        lines.push(
          `agent ${ag.spec.name} (${ag.spec.role}, ${ag.spec.adapter}) ${ag.state} — ${ag.totals.turns} turns, $${ag.totals.costUsd.toFixed(2)}, ${ag.totals.inputTokens + ag.totals.outputTokens} tok`,
        );
      }
      for (const ap of s.approvals.values()) {
        if (!ap.decision) lines.push(`PENDING GATE [${ap.gate}] ${ap.summary} (approve/reject via pitwall_decide)`);
      }
      return lines.join('\n');
    },
  },
  {
    name: 'pitwall_tell',
    description: 'Send a human directive into a LIVE run: supplement or override standing guidance, optionally interrupting in-flight turns. Requires the run to have a live orchestrator.',
    inputSchema: {
      type: 'object',
      properties: {
        run: str('Run id or prefix; defaults to the most recent run.'),
        text: str('The directive text.'),
        to: str('Target agent name or "all" (default "all").'),
        mode: { type: 'string', enum: ['supplement', 'override'], description: 'supplement adds guidance; override supersedes prior directives.' },
        interrupt: { type: 'boolean', description: 'Abort in-flight turns and deliver immediately.' },
      },
      required: ['text'],
    },
    run: async (a) => {
      const d = await postLive(a?.run, '/api/directive', {
        scope: a?.to ?? 'all',
        mode: a?.mode === 'override' ? 'override' : 'supplement',
        text: String(a.text),
        interrupt: !!a?.interrupt,
      });
      return `directive ${d.directiveId} recorded; delivery will be acknowledged in the ledger`;
    },
  },
  {
    name: 'pitwall_decide',
    description: 'Resolve the pending human gate (plan / task tie-break / final acceptance) of a LIVE run.',
    inputSchema: {
      type: 'object',
      properties: {
        run: str('Run id or prefix; defaults to the most recent run.'),
        decision: { type: 'string', enum: ['approve', 'reject'], description: 'Your decision.' },
        note: str('Context for the agents; strongly recommended when rejecting.'),
      },
      required: ['decision'],
    },
    run: async (a) => {
      const runId = resolveRunId(a?.run);
      const s = ledgerBackend(runId).state();
      const pending = [...s.approvals.values()].find((x) => !x.decision);
      if (!pending) return 'no pending gate on this run';
      await postLive(runId, '/api/approval', {
        approvalId: pending.approvalId,
        decision: a.decision === 'approve' ? 'allow' : 'deny',
        note: a?.note ?? '',
      });
      return `${a.decision}d: ${pending.summary}`;
    },
  },
  {
    name: 'pitwall_pause',
    description: 'Pause or resume a LIVE run, or a single agent within it.',
    inputSchema: {
      type: 'object',
      properties: {
        run: str('Run id or prefix; defaults to the most recent run.'),
        agent: str('Agent name; omit to pause/resume the whole run.'),
        paused: { type: 'boolean', description: 'true to pause, false to resume.' },
      },
      required: ['paused'],
    },
    run: async (a) => {
      if (a?.agent) {
        await postLive(a?.run, '/api/agent-pause', { agent: a.agent, paused: !!a.paused });
        return `${a.agent} ${a.paused ? 'paused' : 'resumed'}`;
      }
      await postLive(a?.run, '/api/run-pause', { paused: !!a.paused });
      return `run ${a.paused ? 'paused' : 'resumed'}`;
    },
  },
  {
    name: 'pitwall_transcript',
    description: 'The explicit dialogue of a run (plans, reports, objections, verdicts, human directives), most recent last.',
    inputSchema: {
      type: 'object',
      properties: {
        run: str('Run id or prefix; defaults to the most recent run.'),
        limit: { type: 'number', description: 'Max messages, default 20.' },
      },
    },
    run: async (a) => {
      const runId = resolveRunId(a?.run);
      const history = readLedgerFile(join(runDir(runId), 'events.jsonl'));
      const msgs: string[] = [];
      for (const env of history) {
        const e = env.event;
        if (e.type === 'message') msgs.push(`[${e.kind}] ${e.from} → ${e.to}: ${e.text.slice(0, 500)}`);
        if (e.type === 'directive') msgs.push(`[directive→${e.scope}${e.interrupt ? ', interrupt' : ''}] human: ${e.text}`);
        if (e.type === 'approval.resolved') msgs.push(`[gate] human: ${e.decision}${e.note ? ` — ${e.note}` : ''}`);
      }
      return msgs.slice(-(a?.limit ?? 20)).join('\n\n') || '(no messages yet)';
    },
  },
];

async function postLive(runRef: string | undefined, path: string, body: unknown): Promise<any> {
  const runId = resolveRunId(runRef);
  const live = readControl(runDir(runId));
  if (!live) {
    throw new Error(`run ${runId} has no live orchestrator — start/resume it first (pitwall resume ${runId})`);
  }
  const res = await fetch(`http://127.0.0.1:${live.port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await res.json();
  if (data?.error) throw new Error(data.error);
  return data;
}

// ---------------------------------------------------------------------------
// MCP wire protocol: newline-delimited JSON-RPC 2.0 on stdio.

export async function runMcpServer(version: string): Promise<void> {
  const write = (msg: unknown) => process.stdout.write(JSON.stringify(msg) + '\n');
  const rl = createInterface({ input: process.stdin });

  rl.on('line', (line) => {
    if (!line.trim()) return;
    let req: any;
    try {
      req = JSON.parse(line);
    } catch {
      return;
    }
    void dispatch(req).then((result) => {
      if (req.id !== undefined && result !== undefined) {
        write({ jsonrpc: '2.0', id: req.id, result });
      }
    }).catch((err) => {
      if (req.id !== undefined) {
        write({ jsonrpc: '2.0', id: req.id, error: { code: -32000, message: String(err instanceof Error ? err.message : err) } });
      }
    });
  });

  async function dispatch(req: any): Promise<unknown> {
    switch (req.method) {
      case 'initialize':
        return {
          protocolVersion: req.params?.protocolVersion ?? '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'pitwall', version },
        };
      case 'notifications/initialized':
      case 'notifications/cancelled':
        return undefined;
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
      case 'tools/call': {
        const tool = TOOLS.find((t) => t.name === req.params?.name);
        if (!tool) throw new Error(`unknown tool ${req.params?.name}`);
        try {
          const text = await tool.run(req.params?.arguments ?? {});
          return { content: [{ type: 'text', text }] };
        } catch (err) {
          return { content: [{ type: 'text', text: `error: ${err instanceof Error ? err.message : err}` }], isError: true };
        }
      }
      default:
        if (req.id !== undefined) throw new Error(`method not found: ${req.method}`);
        return undefined;
    }
  }

  await new Promise(() => {}); // serve until stdin closes / process is killed
}
