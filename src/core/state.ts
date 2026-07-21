import type {
  AgentRunState,
  AgentSpec,
  Envelope,
  RunStatus,
  TaskStatus,
} from './events.js';

/**
 * RunState is a pure fold over the ledger. The orchestrator uses it to resume
 * after a crash; the console uses it to answer "what is true right now".
 * It must stay derivable from events alone — no side channels.
 */

export interface AgentState {
  spec: AgentSpec;
  state: AgentRunState;
  detail?: string;
  nativeSessionId?: string;
  /** Open turn, if the agent was mid-turn (relevant for crash recovery). */
  openTurnId?: string;
  openTurnInput?: string;
  totals: { inputTokens: number; outputTokens: number; costUsd: number; turns: number };
}

export interface TaskState {
  taskId: string;
  title: string;
  description: string;
  criteria: string[];
  assignee: string;
  dependsOn: string[];
  status: TaskStatus;
  notes: { ts: string; note: string }[];
}

export interface DirectiveState {
  directiveId: string;
  ts: string;
  scope: string;
  mode: 'supplement' | 'override';
  text: string;
  interrupt: boolean;
  /** Which agents have had this folded into a turn prompt. */
  deliveredTo: string[];
  /** Set when a later override supersedes this directive. */
  superseded: boolean;
}

export interface ApprovalState {
  approvalId: string;
  ts: string;
  agent?: string;
  gate: 'tool' | 'acceptance' | 'plan' | 'task';
  taskId?: string;
  summary: string;
  detail?: string;
  decision?: 'allow' | 'deny';
  note?: string;
}

/** Latest recorded diff snapshot for one file (from `diff.captured`). */
export interface DiffState {
  patch: string;
  kind: 'created' | 'modified' | 'deleted';
  truncated?: boolean;
  agent: string;
  turnId: string;
  taskId?: string;
  ts: string;
}

export interface RunState {
  runId: string;
  repo: string;
  status: RunStatus;
  statusReason?: string;
  /** All goal revisions, oldest first; last entry is authoritative. */
  goalHistory: { ts: string; text: string; mode: 'initial' | 'supplement' | 'override' }[];
  agents: Map<string, AgentState>;
  tasks: Map<string, TaskState>;
  directives: Map<string, DirectiveState>;
  approvals: Map<string, ApprovalState>;
  changedFiles: Map<string, { kind: string; lastAgent?: string; lastTs: string }>;
  /** Per-file latest diff snapshot; replays changes without a working tree. */
  diffs: Map<string, DiffState>;
  lastSeq: number;
}

export function reduce(history: Envelope[]): RunState {
  const s: RunState = {
    runId: '',
    repo: '',
    status: 'running',
    goalHistory: [],
    agents: new Map(),
    tasks: new Map(),
    directives: new Map(),
    approvals: new Map(),
    changedFiles: new Map(),
    diffs: new Map(),
    lastSeq: 0,
  };

  for (const env of history) {
    s.lastSeq = env.seq;
    const e = env.event;
    switch (e.type) {
      case 'run.created':
        s.runId = e.runId;
        s.repo = e.repo;
        s.goalHistory.push({ ts: env.ts, text: e.goal, mode: 'initial' });
        break;
      case 'run.status':
        s.status = e.status;
        s.statusReason = e.reason;
        break;
      case 'goal.updated':
        s.goalHistory.push({ ts: env.ts, text: e.text, mode: e.mode });
        break;
      case 'agent.registered':
        s.agents.set(e.spec.name, {
          spec: e.spec,
          state: 'idle',
          totals: { inputTokens: 0, outputTokens: 0, costUsd: 0, turns: 0 },
        });
        break;
      case 'agent.native-session': {
        const a = s.agents.get(e.agent);
        if (a) a.nativeSessionId = e.nativeSessionId;
        break;
      }
      case 'agent.status': {
        const a = s.agents.get(e.agent);
        if (a) {
          a.state = e.state;
          a.detail = e.detail;
        }
        break;
      }
      case 'task.created':
        s.tasks.set(e.taskId, {
          taskId: e.taskId,
          title: e.title,
          description: e.description,
          criteria: e.criteria ?? [],
          assignee: e.assignee,
          dependsOn: e.dependsOn,
          status: 'pending',
          notes: [],
        });
        break;
      case 'task.updated': {
        const t = s.tasks.get(e.taskId);
        if (t) {
          if (e.status) t.status = e.status;
          if (e.assignee) t.assignee = e.assignee;
          if (e.note) t.notes.push({ ts: env.ts, note: e.note });
        }
        break;
      }
      case 'turn.started': {
        const a = s.agents.get(e.agent);
        if (a) {
          a.openTurnId = e.turnId;
          a.openTurnInput = e.input;
        }
        break;
      }
      case 'turn.completed': {
        const a = s.agents.get(e.agent);
        if (a) {
          if (a.openTurnId === e.turnId) {
            a.openTurnId = undefined;
            a.openTurnInput = undefined;
          }
          a.totals.turns += 1;
          a.totals.inputTokens += e.usage?.inputTokens ?? 0;
          a.totals.outputTokens += e.usage?.outputTokens ?? 0;
          a.totals.costUsd += e.usage?.costUsd ?? 0;
        }
        break;
      }
      case 'directive':
        if (e.mode === 'override') {
          for (const d of s.directives.values()) {
            if (d.scope === e.scope || e.scope === 'all') d.superseded = true;
          }
        }
        s.directives.set(e.directiveId, {
          directiveId: e.directiveId,
          ts: env.ts,
          scope: e.scope,
          mode: e.mode,
          text: e.text,
          interrupt: e.interrupt,
          deliveredTo: [],
          superseded: false,
        });
        break;
      case 'directive.delivered': {
        const d = s.directives.get(e.directiveId);
        if (d && !d.deliveredTo.includes(e.agent)) d.deliveredTo.push(e.agent);
        break;
      }
      case 'approval.requested':
        s.approvals.set(e.approvalId, {
          approvalId: e.approvalId,
          ts: env.ts,
          agent: e.agent,
          gate: e.gate,
          taskId: e.taskId,
          summary: e.summary,
          detail: e.detail,
        });
        break;
      case 'approval.resolved': {
        const ap = s.approvals.get(e.approvalId);
        if (ap) {
          ap.decision = e.decision;
          ap.note = e.note;
        }
        break;
      }
      case 'files.changed':
        for (const c of e.changes) {
          s.changedFiles.set(c.path, { kind: c.kind, lastAgent: e.agent, lastTs: env.ts });
        }
        break;
      case 'diff.captured':
        for (const f of e.files) {
          s.diffs.set(f.path, {
            patch: f.patch,
            kind: f.kind,
            truncated: f.truncated,
            agent: e.agent,
            turnId: e.turnId,
            taskId: e.taskId,
            ts: env.ts,
          });
        }
        break;
      default:
        break;
    }
  }
  return s;
}

export function currentGoal(s: RunState): string {
  const last = s.goalHistory[s.goalHistory.length - 1];
  return last ? last.text : '';
}

/** Directives an agent has not yet received, oldest first. */
export function pendingDirectivesFor(s: RunState, agent: string): DirectiveState[] {
  return [...s.directives.values()]
    .filter(
      (d) =>
        !d.superseded &&
        (d.scope === 'all' || d.scope === agent) &&
        !d.deliveredTo.includes(agent),
    )
    .sort((a, b) => (a.ts < b.ts ? -1 : 1));
}
