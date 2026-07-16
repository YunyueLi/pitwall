/**
 * The event model. An AgentOS run is an append-only sequence of envelopes;
 * everything else — console views, task state, recovery — is a projection.
 *
 * Invariants:
 *  - `seq` and `ts` are assigned by the ledger at append time. Agents and
 *    humans never supply timestamps; models are never trusted with clocks.
 *  - `origin` records who caused the event. Content originating from an agent
 *    is never re-presented to another agent as if it were a human instruction.
 */

export type Origin =
  | { kind: 'human' }
  | { kind: 'agent'; agent: string }
  | { kind: 'system' };

/** Wire envelope. One JSON line in events.jsonl. */
export interface Envelope<E extends RunEvent = RunEvent> {
  seq: number;
  ts: string; // ISO 8601, system clock at append time
  origin: Origin;
  event: E;
}

// ---------------------------------------------------------------------------
// Agents

export type AdapterKind = 'claude-code' | 'codex';

export interface AgentSpec {
  /** Unique within the run, e.g. "claude", "codex", "claude-reviewer". */
  name: string;
  adapter: AdapterKind;
  /** Free-form role label, e.g. "driver", "reviewer". Reassignable mid-run. */
  role: string;
  model?: string;
  /** Adapter-specific safety posture. */
  sandbox: 'read-only' | 'workspace-write';
}

export type AgentRunState =
  | 'idle'
  | 'working'
  | 'paused'
  | 'awaiting-approval'
  | 'dead';

// ---------------------------------------------------------------------------
// Tasks

export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'needs-review' // agent claims done; self-check is never final acceptance
  | 'accepted'
  | 'rejected'
  | 'superseded';

// ---------------------------------------------------------------------------
// Events

export type RunEvent =
  | RunCreated
  | RunStatusChanged
  | GoalUpdated
  | AgentRegistered
  | AgentNativeSession
  | AgentStatusChanged
  | TaskCreated
  | TaskUpdated
  | TurnStarted
  | TurnCompleted
  | Message
  | Directive
  | DirectiveDelivered
  | ApprovalRequested
  | ApprovalResolved
  | ToolUsed
  | FilesChanged
  | Note
  | ErrorEvent;

export interface RunCreated {
  type: 'run.created';
  runId: string;
  goal: string;
  criteria?: string[];
  /** 'pair': driver/reviewer loop. 'team': director plans, engineer builds. */
  mode?: 'pair' | 'team';
  repo: string; // absolute path of the target repository
  agents: AgentSpec[];
  agentosVersion: string;
}

export type RunStatus = 'running' | 'paused' | 'awaiting-review' | 'done' | 'failed';

export interface RunStatusChanged {
  type: 'run.status';
  status: RunStatus;
  reason?: string;
}

/** Goal revisions are kept, never overwritten; the latest is authoritative. */
export interface GoalUpdated {
  type: 'goal.updated';
  text: string;
  mode: 'supplement' | 'override';
  directiveId?: string;
}

export interface AgentRegistered {
  type: 'agent.registered';
  spec: AgentSpec;
}

/** Links our agent name to the adapter's native session/thread id (for resume). */
export interface AgentNativeSession {
  type: 'agent.native-session';
  agent: string;
  nativeSessionId: string;
}

export interface AgentStatusChanged {
  type: 'agent.status';
  agent: string;
  state: AgentRunState;
  detail?: string;
}

export interface TaskCreated {
  type: 'task.created';
  taskId: string;
  title: string;
  description: string;
  criteria?: string[];
  assignee: string; // agent name
  dependsOn: string[];
}

export interface TaskUpdated {
  type: 'task.updated';
  taskId: string;
  status?: TaskStatus;
  assignee?: string;
  note?: string;
}

/**
 * A turn is the idempotency boundary: one prompt handed to one agent, and
 * everything until that agent yields. On recovery, a started-but-uncompleted
 * turn is re-issued as a *fresh* turn that instructs the agent to first audit
 * repository state before redoing side effects.
 */
export interface TurnStarted {
  type: 'turn.started';
  turnId: string;
  agent: string;
  /** What we asked of the agent (full prompt, for auditability). */
  input: string;
  /** Directives folded into this turn's prompt. */
  directiveIds: string[];
}

export interface TurnCompleted {
  type: 'turn.completed';
  turnId: string;
  agent: string;
  outcome: 'ok' | 'error' | 'interrupted';
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    costUsd?: number;
  };
  durationMs?: number;
  error?: string;
}

/**
 * Explicit inter-party communication: reports, handoffs, objections,
 * questions, verdicts. `from`/`to` are agent names or 'human' or 'all'.
 */
export interface Message {
  type: 'message';
  messageId: string;
  from: string;
  to: string;
  kind: 'report' | 'handoff' | 'objection' | 'question' | 'verdict' | 'info';
  text: string;
  turnId?: string;
  taskId?: string;
}

/**
 * A human instruction. `supplement` adds to standing guidance; `override`
 * supersedes prior directives (and possibly the goal wording).
 * Takes effect at each target agent's next turn boundary; delivery is acked
 * by DirectiveDelivered, so "who has seen this" is always answerable.
 */
export interface Directive {
  type: 'directive';
  directiveId: string;
  scope: string; // agent name or 'all'
  mode: 'supplement' | 'override';
  text: string;
  /** If interrupt, target agents' current turns are aborted for redelivery. */
  interrupt: boolean;
}

export interface DirectiveDelivered {
  type: 'directive.delivered';
  directiveId: string;
  agent: string;
  turnId: string;
}

export interface ApprovalRequested {
  type: 'approval.requested';
  approvalId: string;
  agent?: string;
  /** plan: approve the task breakdown; task: tie-break one task; acceptance: final milestone; tool: a risky action. */
  gate: 'tool' | 'acceptance' | 'plan' | 'task';
  taskId?: string;
  summary: string;
  detail?: string;
}

export interface ApprovalResolved {
  type: 'approval.resolved';
  approvalId: string;
  decision: 'allow' | 'deny';
  note?: string;
}

/** Normalized, summarized tool activity (raw payloads live in raw-<agent>.jsonl). */
export interface ToolUsed {
  type: 'tool.used';
  agent: string;
  turnId: string;
  tool: string;
  summary: string;
}

export interface FilesChanged {
  type: 'files.changed';
  agent?: string;
  turnId?: string;
  changes: { path: string; kind: 'created' | 'modified' | 'deleted' }[];
  source: 'tool' | 'git-scan';
}

/** Free-form human annotation on the record. */
export interface Note {
  type: 'note';
  text: string;
}

export interface ErrorEvent {
  type: 'error';
  scope: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Display layers: every event belongs to exactly one readability layer.

export type Layer = 'state' | 'message' | 'action' | 'detail';

export function layerOf(e: RunEvent): Layer {
  switch (e.type) {
    case 'run.created':
    case 'run.status':
    case 'goal.updated':
    case 'agent.status':
    case 'task.created':
    case 'task.updated':
    case 'approval.requested':
    case 'approval.resolved':
      return 'state';
    case 'message':
    case 'directive':
    case 'note':
      return 'message';
    case 'files.changed':
    case 'turn.started':
    case 'turn.completed':
    case 'error':
      return 'action';
    default:
      return 'detail';
  }
}
