import { execFileSync } from 'node:child_process';
import type { AgentAdapter } from '../adapters/types.js';
import { ClaudeAdapter } from '../adapters/claude.js';
import { CodexAdapter } from '../adapters/codex.js';
import type { AgentSpec, Envelope, RunEvent, Origin } from '../core/events.js';
import { newId } from '../core/ids.js';
import { Ledger } from '../core/ledger.js';
import {
  currentGoal,
  pendingDirectivesFor,
  reduce,
  type RunState,
  type TaskState,
} from '../core/state.js';
import { RawLog, createRunDir, openRun, runDir } from '../core/store.js';
import {
  directorPlanPrompt,
  directorReviewPrompt,
  driverPrompt,
  engineerTaskPrompt,
  parseAgentReply,
  recoveryPreamble,
  reviewerPrompt,
} from './prompts.js';

type StepResult = 'ok' | 'error' | 'interrupted' | 'timeout' | 'wait' | 'applied' | 'done';

export interface RunConfig {
  goal: string;
  criteria: string[];
  repo: string;
  /** 'pair': driver implements, reviewer audits. 'team': director plans and
   * reviews task by task; engineer implements in an autonomous loop. */
  mode: 'pair' | 'team';
  driver: AgentSpec;
  reviewer: AgentSpec;
  maxReviewRounds: number;
  turnTimeoutMs: number;
}

const HUMAN: Origin = { kind: 'human' };
const SYSTEM: Origin = { kind: 'system' };

/**
 * The orchestrator owns the run loop: it is the single ledger writer, drives
 * agents turn by turn, folds human directives in at turn boundaries, and
 * never lets an agent's self-check stand in for acceptance.
 *
 * The protocol implemented here is deliberately the simplest one that
 * exercises every core mechanism: driver implements → reviewer audits →
 * objections loop back → human accepts. Roles are config, not code: either
 * vendor can hold either seat.
 */
export class Orchestrator {
  readonly dir: string;
  readonly runId: string;
  private ledger: Ledger;
  private history: Envelope[];
  private config: RunConfig;
  private adapters = new Map<string, AgentAdapter>();
  private rawLogs = new Map<string, RawLog>();
  private pausedAgents = new Set<string>();
  private runPaused = false;
  private stopping = false;
  private waiters: (() => void)[] = [];
  private gitBaseline = new Map<string, string>();

  private constructor(dir: string, runId: string, ledger: Ledger, history: Envelope[], config: RunConfig) {
    this.dir = dir;
    this.runId = runId;
    this.ledger = ledger;
    this.history = history;
    this.config = config;
    this.ledger.subscribe((env) => this.history.push(env));
    for (const spec of [config.driver, config.reviewer]) {
      this.adapters.set(spec.name, makeAdapter(spec, config.repo));
      this.rawLogs.set(spec.name, new RawLog(dir, spec.name));
    }
    this.baselineGit();
  }

  // -- construction ---------------------------------------------------------

  static create(config: RunConfig, agentosVersion: string): Orchestrator {
    const { runId, dir } = createRunDir(config.repo);
    const { ledger, history } = Ledger.open(dir);
    const orch = new Orchestrator(dir, runId, ledger, history, config);
    orch.append(HUMAN, {
      type: 'run.created',
      runId,
      goal: config.goal,
      criteria: config.criteria,
      mode: config.mode,
      repo: config.repo,
      agents: [config.driver, config.reviewer],
      agentosVersion,
    });
    orch.append(SYSTEM, { type: 'agent.registered', spec: config.driver });
    orch.append(SYSTEM, { type: 'agent.registered', spec: config.reviewer });
    if (config.mode === 'pair') {
      orch.append(HUMAN, {
        type: 'task.created',
        taskId: newId('task'),
        title: `Implement: ${config.goal.slice(0, 80)}`,
        description: config.goal,
        criteria: config.criteria,
        assignee: config.driver.name,
        dependsOn: [],
      });
    }
    return orch;
  }

  static resume(runId: string, overrides: Partial<Pick<RunConfig, 'maxReviewRounds' | 'turnTimeoutMs'>> = {}): Orchestrator {
    const dir = runDir(runId);
    const { ledger, history } = openRun(dir);
    const created = history.find((e) => e.event.type === 'run.created')?.event;
    if (!created || created.type !== 'run.created') throw new Error(`run ${runId} has no run.created event`);
    const config: RunConfig = {
      goal: created.goal,
      criteria: created.criteria ?? extractCriteria(history),
      repo: created.repo,
      mode: created.mode ?? 'pair',
      driver: created.agents[0]!,
      reviewer: created.agents[1]!,
      maxReviewRounds: overrides.maxReviewRounds ?? 3,
      turnTimeoutMs: overrides.turnTimeoutMs ?? 20 * 60 * 1000,
    };
    const orch = new Orchestrator(dir, runId, ledger, history, config);
    // Close out turns that were in flight when the previous process died.
    const state = orch.state();
    for (const [name, a] of state.agents) {
      if (a.openTurnId) {
        orch.append(SYSTEM, {
          type: 'turn.completed',
          turnId: a.openTurnId,
          agent: name,
          outcome: 'interrupted',
          error: 'orchestrator process died mid-turn; will re-issue with recovery notice',
        });
      }
      orch.append(SYSTEM, { type: 'agent.status', agent: name, state: 'idle', detail: 'recovered' });
    }
    orch.append(SYSTEM, { type: 'run.status', status: 'running', reason: 'resumed from ledger' });
    return orch;
  }

  // -- public surface (used by CLI/console via the control server) ----------

  state(): RunState {
    return reduce(this.history);
  }

  events(): Envelope[] {
    return this.history;
  }

  subscribe(fn: (env: Envelope) => void): () => void {
    return this.ledger.subscribe(fn);
  }

  goalText(): string {
    return currentGoal(this.state());
  }

  criteria(): string[] {
    return this.config.criteria;
  }

  mode(): 'pair' | 'team' {
    return this.config.mode;
  }

  directive(scope: string, mode: 'supplement' | 'override', text: string, interrupt: boolean): string {
    const directiveId = newId('dir');
    this.append(HUMAN, { type: 'directive', directiveId, scope, mode, text, interrupt });
    if (interrupt) {
      for (const [name, adapter] of this.adapters) {
        if ((scope === 'all' || scope === name) && adapter.busy()) adapter.interrupt();
      }
    }
    this.signal();
    return directiveId;
  }

  updateGoal(text: string, mode: 'supplement' | 'override'): void {
    this.append(HUMAN, { type: 'goal.updated', text, mode });
    this.signal();
  }

  resolveApproval(approvalId: string, decision: 'allow' | 'deny', note?: string): void {
    const ap = this.state().approvals.get(approvalId);
    if (!ap) throw new Error(`unknown approval ${approvalId}`);
    if (ap.decision) throw new Error(`approval ${approvalId} already resolved`);
    this.append(HUMAN, { type: 'approval.resolved', approvalId, decision, note });
    this.signal();
  }

  setAgentPaused(agent: string, paused: boolean, interrupt = false): void {
    if (!this.adapters.has(agent)) throw new Error(`unknown agent ${agent}`);
    if (paused) {
      this.pausedAgents.add(agent);
      if (interrupt) this.adapters.get(agent)!.interrupt();
      this.append(HUMAN, { type: 'agent.status', agent, state: 'paused', detail: 'paused by human' });
    } else {
      this.pausedAgents.delete(agent);
      this.append(HUMAN, { type: 'agent.status', agent, state: 'idle', detail: 'unpaused by human' });
    }
    this.signal();
  }

  setRunPaused(paused: boolean): void {
    this.runPaused = paused;
    this.append(HUMAN, {
      type: 'run.status',
      status: paused ? 'paused' : 'running',
      reason: paused ? 'paused by human' : 'resumed by human',
    });
    this.signal();
  }

  addNote(text: string): void {
    this.append(HUMAN, { type: 'note', text });
  }

  async stop(): Promise<void> {
    this.stopping = true;
    for (const a of this.adapters.values()) a.interrupt();
    this.signal();
  }

  // -- run loop --------------------------------------------------------------

  async run(): Promise<void> {
    try {
      await this.loop();
    } finally {
      for (const a of this.adapters.values()) a.dispose();
      for (const r of this.rawLogs.values()) r.close();
    }
  }

  private async loop(): Promise<void> {
    let timeoutRetries = 0;
    while (!this.stopping) {
      const state = this.state();
      if (state.status === 'done' || state.status === 'failed') return;

      const step = this.config.mode === 'team' ? await this.teamStep(state) : await this.pairStep(state);

      if (step === 'done') {
        this.append(SYSTEM, { type: 'run.status', status: 'done', reason: 'accepted by human' });
        return;
      }
      if (step === 'wait') {
        await this.waitForSignal();
        continue;
      }
      if (step === 'applied') continue; // a ledger-derived decision was applied; re-evaluate
      if (step === 'interrupted') {
        if (this.stopping) return;
        continue;
      }
      if (step === 'timeout') {
        timeoutRetries += 1;
        if (timeoutRetries >= 2) {
          this.append(SYSTEM, {
            type: 'run.status',
            status: 'paused',
            reason: 'two consecutive turn timeouts; human attention needed',
          });
          this.runPaused = true;
        }
        continue;
      }
      timeoutRetries = 0;
      if (step === 'error') {
        this.append(SYSTEM, {
          type: 'run.status',
          status: 'paused',
          reason: 'agent turn failed; inspect the error, optionally `agentos tell`, then resume',
        });
        this.runPaused = true;
        continue;
      }
    }
    this.append(SYSTEM, { type: 'run.status', status: 'paused', reason: 'orchestrator stopped' });
  }

  private globallyBlocked(state: RunState): boolean {
    const pendingApproval = [...state.approvals.values()].find((a) => !a.decision);
    return !!pendingApproval || this.runPaused || state.status === 'paused';
  }

  // -- pair mode (driver implements, reviewer audits) -------------------------

  private async pairStep(state: RunState): Promise<StepResult> {
    const task = [...state.tasks.values()][0];
    if (!task) throw new Error('run has no task');

    const acceptance = this.unappliedAcceptance(state, task.taskId);
    if (acceptance) {
      if (acceptance.decision === 'allow') {
        this.append(SYSTEM, { type: 'task.updated', taskId: task.taskId, status: 'accepted', note: acceptance.note });
      } else {
        this.append(SYSTEM, {
          type: 'task.updated',
          taskId: task.taskId,
          status: 'in-progress',
          note: `human rejected acceptance${acceptance.note ? `: ${acceptance.note}` : ''}`,
        });
      }
      return 'applied';
    }

    if (this.globallyBlocked(state)) return 'wait';
    if (task.status === 'accepted') return 'done';

    const phase: 'driver' | 'reviewer' = task.status === 'needs-review' ? 'reviewer' : 'driver';
    const agentName = phase === 'driver' ? this.config.driver.name : this.config.reviewer.name;
    if (this.pausedAgents.has(agentName)) return 'wait';

    return phase === 'driver' ? this.driverTurn() : this.reviewerTurn();
  }

  // -- team mode (director plans + reviews; engineer builds task by task) -----

  private async teamStep(state: RunState): Promise<StepResult> {
    const engineer = this.config.driver; // workspace-write seat
    const director = this.config.reviewer; // read-only seat
    const active = [...state.tasks.values()].filter((t) => t.status !== 'superseded');
    const batchSeq = this.lastTaskCreatedSeq();

    // 1. Apply ledger-derived gate decisions (survives crashes and restarts).
    const milestone = this.newestGate('acceptance');
    if (milestone?.resolved === 'allow' && milestone.resolvedSeq! > batchSeq) return 'done';

    const planGate = this.newestGate('plan');
    if (planGate?.resolved === 'deny') {
      const victims = active.filter(
        (t) => t.status !== 'accepted' && this.taskCreatedSeq(t.taskId) < planGate.resolvedSeq!,
      );
      if (victims.length) {
        for (const t of victims) {
          this.append(SYSTEM, { type: 'task.updated', taskId: t.taskId, status: 'superseded', note: 'plan rejected by human' });
        }
        return 'applied';
      }
    }
    for (const t of active) {
      const g = this.newestGate('task', t.taskId);
      if (g?.resolved && g.resolvedSeq! > this.lastTaskUpdateSeq(t.taskId)) {
        if (g.resolved === 'allow') {
          this.append(SYSTEM, { type: 'task.updated', taskId: t.taskId, status: 'accepted', note: g.note ?? 'accepted by human tie-break' });
        } else {
          this.append(SYSTEM, {
            type: 'task.updated',
            taskId: t.taskId,
            status: 'in-progress',
            note: `human sided with the objection${g.note ? `: ${g.note}` : ''}`,
          });
        }
        return 'applied';
      }
    }

    // 2. Global blocks (pending approvals, paused run).
    if (this.globallyBlocked(state)) return 'wait';

    // 3. Pick the next move.
    if (!active.length) {
      if (this.pausedAgents.has(director.name)) return 'wait';
      return this.directorPlanTurn(state);
    }
    if (!(planGate && planGate.seq > batchSeq && planGate.resolved === 'allow')) {
      const pending = active.filter((t) => t.status !== 'accepted');
      this.append(SYSTEM, {
        type: 'approval.requested',
        approvalId: newId('appr'),
        gate: 'plan',
        summary: `The director proposes ${pending.length} task(s). Approve the plan to let the engineer start.`,
        detail: pending.map((t, i) => `${i + 1}. ${t.title}`).join('\n'),
      });
      return 'applied';
    }
    if (active.every((t) => t.status === 'accepted')) {
      if (milestone?.resolved === 'deny' && milestone.resolvedSeq! > batchSeq) {
        if (this.pausedAgents.has(director.name)) return 'wait';
        return this.directorPlanTurn(state); // remedial plan carrying the human's note
      }
      this.append(SYSTEM, {
        type: 'approval.requested',
        approvalId: newId('appr'),
        gate: 'acceptance',
        summary: `All ${active.length} task(s) implemented and approved by the director. Final human acceptance required.`,
        detail: active.map((t) => `✓ ${t.title}`).join('\n'),
      });
      return 'applied';
    }
    const inReview = active.find((t) => t.status === 'needs-review');
    if (inReview) {
      if (this.pausedAgents.has(director.name)) return 'wait';
      return this.directorReviewTurn(state, inReview);
    }
    const runnable = active.find(
      (t) =>
        (t.status === 'pending' || t.status === 'in-progress') &&
        t.dependsOn.every((id) => state.tasks.get(id)?.status === 'accepted'),
    );
    if (!runnable) return 'wait';
    if (this.pausedAgents.has(engineer.name)) return 'wait';
    return this.engineerTurn(state, runnable);
  }

  private async directorPlanTurn(state: RunState): Promise<StepResult> {
    const director = this.config.reviewer;
    const batchSeq = this.lastTaskCreatedSeq();
    const humanNote = this.newestDenyNoteAfter(batchSeq);
    const accepted = [...state.tasks.values()].filter((t) => t.status === 'accepted');
    const newDirectives = pendingDirectivesFor(state, director.name);
    const prompt = directorPlanPrompt({
      goal: currentGoal(state),
      criteria: this.config.criteria,
      engineerName: this.config.driver.name,
      standingDirectives: this.standingFor(state, director.name, newDirectives),
      newDirectives,
      humanNote,
      acceptedTasks: accepted.map((t) => t.title),
      recovery: this.recoveryTextFor(director.name),
    });
    const { result, reply } = await this.executeTurn(director.name, prompt, newDirectives.map((d) => d.directiveId));
    if (result.outcome !== 'ok') return result.outcome;

    const plan: any[] = Array.isArray(reply.json?.plan) ? reply.json.plan : [];
    const items = plan
      .filter((p) => p && typeof p.title === 'string')
      .slice(0, 8)
      .map((p) => ({
        title: String(p.title).slice(0, 120),
        description: String(p.description ?? ''),
        criteria: Array.isArray(p.criteria) ? p.criteria.map(String) : [],
        dependsOn: Array.isArray(p.dependsOn) ? p.dependsOn.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0) : [],
      }));
    if (!items.length) {
      this.append(SYSTEM, { type: 'error', scope: 'plan', message: 'director produced no parseable plan; retrying next cycle' });
      return 'error';
    }
    const ids = items.map(() => newId('task'));
    items.forEach((p, i) => {
      this.append(
        { kind: 'agent', agent: director.name },
        {
          type: 'task.created',
          taskId: ids[i]!,
          title: p.title,
          description: p.description,
          criteria: p.criteria,
          assignee: this.config.driver.name,
          dependsOn: p.dependsOn.filter((n: number) => n < i).map((n: number) => ids[n]!),
        },
      );
    });
    this.append(
      { kind: 'agent', agent: director.name },
      {
        type: 'message',
        messageId: newId('msg'),
        from: director.name,
        to: 'human',
        kind: 'handoff',
        text: result.finalText,
      },
    );
    return 'ok'; // next cycle requests the plan gate
  }

  private async engineerTurn(state: RunState, task: TaskState): Promise<StepResult> {
    const engineer = this.config.driver;
    const newDirectives = pendingDirectivesFor(state, engineer.name);
    const objection = this.latestMessageFor(task.taskId, 'objection');
    const tieBreak = this.newestGate('task', task.taskId);
    const humanNote =
      tieBreak?.resolved === 'deny' && tieBreak.resolvedSeq! > this.lastTurnSeq(engineer.name) ? tieBreak.note : undefined;
    const prompt = engineerTaskPrompt({
      goal: currentGoal(state),
      task: { taskId: task.taskId, title: task.title, description: task.description, criteria: task.criteria },
      directorName: this.config.reviewer.name,
      standingDirectives: this.standingFor(state, engineer.name, newDirectives),
      newDirectives,
      objection: objection && objection.seq > this.lastOkTurnSeq(engineer.name) ? objection.text : undefined,
      humanNote,
      recovery: this.recoveryTextFor(engineer.name),
    });
    if (task.status === 'pending') {
      this.append(SYSTEM, { type: 'task.updated', taskId: task.taskId, status: 'in-progress' });
    }
    const { result, reply } = await this.executeTurn(engineer.name, prompt, newDirectives.map((d) => d.directiveId));
    if (result.outcome !== 'ok') return result.outcome;

    const status = reply.json?.status;
    this.append(
      { kind: 'agent', agent: engineer.name },
      {
        type: 'message',
        messageId: newId('msg'),
        from: engineer.name,
        to: status === 'blocked' ? 'human' : this.config.reviewer.name,
        kind: status === 'blocked' ? 'question' : 'report',
        text: result.finalText,
        taskId: task.taskId,
      },
    );
    if (status === 'blocked') {
      this.append(SYSTEM, {
        type: 'run.status',
        status: 'paused',
        reason: 'engineer is blocked and asked the human a question; answer with `agentos tell` then resume',
      });
      this.runPaused = true;
      return 'ok';
    }
    this.append(SYSTEM, {
      type: 'task.updated',
      taskId: task.taskId,
      status: 'needs-review',
      note: 'engineer reports done; director review pending',
    });
    return 'ok';
  }

  private async directorReviewTurn(state: RunState, task: TaskState): Promise<StepResult> {
    const director = this.config.reviewer;
    const newDirectives = pendingDirectivesFor(state, director.name);
    const report = this.latestMessageFor(task.taskId, 'report');
    const round = this.objectionCount(task.taskId) + 1;
    const prompt = directorReviewPrompt({
      goal: currentGoal(state),
      task: { taskId: task.taskId, title: task.title, description: task.description, criteria: task.criteria },
      engineerName: this.config.driver.name,
      engineerReport: report?.text ?? '(no report; judge the working tree directly)',
      round,
      standingDirectives: this.standingFor(state, director.name, newDirectives),
      newDirectives,
      recovery: this.recoveryTextFor(director.name),
    });
    const { result, reply } = await this.executeTurn(director.name, prompt, newDirectives.map((d) => d.directiveId));
    if (result.outcome !== 'ok') return result.outcome;

    const verdict = reply.json?.verdict === 'approve' ? 'approve' : 'objection';
    this.append(
      { kind: 'agent', agent: director.name },
      {
        type: 'message',
        messageId: newId('msg'),
        from: director.name,
        to: verdict === 'approve' ? 'human' : this.config.driver.name,
        kind: verdict === 'approve' ? 'verdict' : 'objection',
        text: result.finalText,
        taskId: task.taskId,
      },
    );
    if (verdict === 'approve') {
      this.append(SYSTEM, {
        type: 'task.updated',
        taskId: task.taskId,
        status: 'accepted',
        note: `director approved in review round ${round}`,
      });
    } else if (round >= this.config.maxReviewRounds) {
      this.append(SYSTEM, {
        type: 'approval.requested',
        approvalId: newId('appr'),
        gate: 'task',
        taskId: task.taskId,
        summary: `"${task.title}": director still objects after ${round} rounds. Your call.`,
        detail: reply.json?.summary ?? result.finalText.slice(0, 2000),
      });
    } else {
      this.append(SYSTEM, {
        type: 'task.updated',
        taskId: task.taskId,
        status: 'in-progress',
        note: `director objection in round ${round}`,
      });
    }
    return 'ok';
  }

  // -- team-mode history queries ----------------------------------------------

  private newestGate(
    gate: 'plan' | 'acceptance' | 'task',
    taskId?: string,
  ): { seq: number; approvalId: string; resolved?: 'allow' | 'deny'; resolvedSeq?: number; note?: string } | undefined {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const env = this.history[i]!;
      const e = env.event;
      if (e.type === 'approval.requested' && e.gate === gate && (taskId === undefined || e.taskId === taskId)) {
        const out: { seq: number; approvalId: string; resolved?: 'allow' | 'deny'; resolvedSeq?: number; note?: string } = {
          seq: env.seq,
          approvalId: e.approvalId,
        };
        for (const env2 of this.history) {
          const r = env2.event;
          if (r.type === 'approval.resolved' && r.approvalId === e.approvalId) {
            out.resolved = r.decision;
            out.resolvedSeq = env2.seq;
            out.note = r.note;
          }
        }
        return out;
      }
    }
    return undefined;
  }

  private lastTaskCreatedSeq(): number {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i]!.event.type === 'task.created') return this.history[i]!.seq;
    }
    return 0;
  }

  private taskCreatedSeq(taskId: string): number {
    for (const env of this.history) {
      if (env.event.type === 'task.created' && env.event.taskId === taskId) return env.seq;
    }
    return 0;
  }

  private lastTaskUpdateSeq(taskId: string): number {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const e = this.history[i]!.event;
      if (e.type === 'task.updated' && e.taskId === taskId && e.status) return this.history[i]!.seq;
    }
    return 0;
  }

  private newestDenyNoteAfter(seq: number): string | undefined {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const env = this.history[i]!;
      const e = env.event;
      if (env.seq <= seq) break;
      if (e.type === 'approval.resolved' && e.decision === 'deny' && e.note) return e.note;
    }
    return undefined;
  }

  private latestMessageFor(taskId: string, kind: 'report' | 'objection'): { text: string; seq: number } | undefined {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const env = this.history[i]!;
      const e = env.event;
      if (e.type === 'message' && e.kind === kind && e.taskId === taskId) return { text: e.text, seq: env.seq };
    }
    return undefined;
  }

  private objectionCount(taskId: string): number {
    return this.history.filter((env) => {
      const e = env.event;
      return e.type === 'message' && e.kind === 'objection' && e.taskId === taskId;
    }).length;
  }

  private lastOkTurnSeq(agent: string): number {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const e = this.history[i]!.event;
      if (e.type === 'turn.completed' && e.agent === agent && e.outcome === 'ok') return this.history[i]!.seq;
    }
    return 0;
  }

  private lastTurnSeq(agent: string): number {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const e = this.history[i]!.event;
      if (e.type === 'turn.completed' && e.agent === agent) return this.history[i]!.seq;
    }
    return 0;
  }

  private standingFor(state: RunState, agent: string, exclude: { directiveId: string }[]): ReturnType<typeof pendingDirectivesFor> {
    const excludeIds = new Set(exclude.map((d) => d.directiveId));
    return [...state.directives.values()].filter(
      (d) =>
        !d.superseded &&
        (d.scope === 'all' || d.scope === agent) &&
        d.deliveredTo.includes(agent) &&
        !excludeIds.has(d.directiveId),
    );
  }

  // -- turns -----------------------------------------------------------------

  private async driverTurn(): Promise<'ok' | 'error' | 'interrupted' | 'timeout'> {
    const state = this.state();
    const driver = this.config.driver;
    const task = [...state.tasks.values()][0]!;
    const firstTurn = !this.history.some(
      (e) => e.event.type === 'turn.completed' && e.event.agent === driver.name && e.event.outcome === 'ok',
    );
    const newDirectives = pendingDirectivesFor(state, driver.name);
    const standing = [...state.directives.values()].filter(
      (d) => !d.superseded && (d.scope === 'all' || d.scope === driver.name) && d.deliveredTo.includes(driver.name),
    );
    const objection = this.latestObjectionForDriver();
    const rejection = this.latestHumanRejection();
    const recovery = this.recoveryTextFor(driver.name);
    const goalHist = state.goalHistory;
    const prompt = driverPrompt({
      goal: currentGoal(state),
      criteria: this.config.criteria,
      goalWasOverridden: goalHist.length > 1 && goalHist[goalHist.length - 1]!.mode === 'override',
      standingDirectives: standing.filter((d) => !newDirectives.includes(d)),
      newDirectives,
      objection,
      humanRejectionNote: rejection,
      recovery,
      firstTurn,
    });

    if (task.status === 'pending') {
      this.append(SYSTEM, { type: 'task.updated', taskId: task.taskId, status: 'in-progress' });
    }
    const { result, reply } = await this.executeTurn(driver.name, prompt, newDirectives.map((d) => d.directiveId));
    if (result.outcome !== 'ok') return result.outcome === 'interrupted' ? this.classifyInterrupt() : 'error';

    const status = reply.json?.status;
    this.append(
      { kind: 'agent', agent: driver.name },
      {
        type: 'message',
        messageId: newId('msg'),
        from: driver.name,
        to: status === 'blocked' ? 'human' : this.config.reviewer.name,
        kind: status === 'blocked' ? 'question' : 'report',
        text: result.finalText,
      },
    );
    if (status === 'blocked') {
      this.append(SYSTEM, {
        type: 'run.status',
        status: 'paused',
        reason: `driver is blocked and asked the human a question; answer with \`agentos tell\` then resume`,
      });
      this.runPaused = true;
      return 'ok';
    }
    this.append(SYSTEM, {
      type: 'task.updated',
      taskId: task.taskId,
      status: 'needs-review',
      note: 'driver reports done; awaiting independent review',
    });
    return 'ok';
  }

  private async reviewerTurn(): Promise<'ok' | 'error' | 'interrupted' | 'timeout'> {
    const state = this.state();
    const reviewer = this.config.reviewer;
    const driver = this.config.driver;
    const task = [...state.tasks.values()][0]!;
    const newDirectives = pendingDirectivesFor(state, reviewer.name);
    const standing = [...state.directives.values()].filter(
      (d) => !d.superseded && (d.scope === 'all' || d.scope === reviewer.name) && d.deliveredTo.includes(reviewer.name),
    );
    const report = this.latestDriverReport() ?? '(driver produced no report; review the working tree directly)';
    const round = this.reviewRounds() + 1;
    const recovery = this.recoveryTextFor(reviewer.name);
    const prompt = reviewerPrompt({
      goal: currentGoal(state),
      criteria: this.config.criteria,
      driverName: driver.name,
      driverReport: report,
      standingDirectives: standing.filter((d) => !newDirectives.includes(d)),
      newDirectives,
      round,
      recovery,
    });

    const { result, reply } = await this.executeTurn(reviewer.name, prompt, newDirectives.map((d) => d.directiveId));
    if (result.outcome !== 'ok') return result.outcome === 'interrupted' ? this.classifyInterrupt() : 'error';

    const verdict = reply.json?.verdict === 'approve' ? 'approve' : 'objection';
    this.append(
      { kind: 'agent', agent: reviewer.name },
      {
        type: 'message',
        messageId: newId('msg'),
        from: reviewer.name,
        to: verdict === 'approve' ? 'human' : driver.name,
        kind: verdict === 'approve' ? 'verdict' : 'objection',
        text: result.finalText,
      },
    );

    if (verdict === 'approve' || round >= this.config.maxReviewRounds) {
      const summary =
        verdict === 'approve'
          ? `Reviewer approves after round ${round}. Human acceptance required.`
          : `Max review rounds (${this.config.maxReviewRounds}) reached without reviewer approval. Human decision required.`;
      this.append(SYSTEM, {
        type: 'approval.requested',
        approvalId: newId('appr'),
        gate: 'acceptance',
        summary,
        detail: reply.json?.summary ?? result.finalText.slice(0, 2000),
      });
      // The main loop applies the decision once resolved (ledger-derived, so
      // it also works after a crash and restart).
    } else {
      this.append(SYSTEM, {
        type: 'task.updated',
        taskId: task.taskId,
        status: 'in-progress',
        note: `reviewer objection in round ${round}`,
      });
    }
    return 'ok';
  }

  /** Applies the effect of an acceptance decision as soon as it is resolved. */
  private unappliedAcceptance(
    state: RunState,
    taskId: string,
  ): { decision: 'allow' | 'deny'; note?: string } | undefined {
    // Find the newest resolved acceptance approval, and the newest task status
    // change; the decision is unapplied iff it is newer than the status change.
    let decisionSeq = 0;
    let decision: { decision: 'allow' | 'deny'; note?: string } | undefined;
    let taskChangeSeq = 0;
    for (const env of this.history) {
      const e = env.event;
      if (e.type === 'approval.resolved') {
        const ap = state.approvals.get(e.approvalId);
        if (ap?.gate === 'acceptance') {
          decisionSeq = env.seq;
          decision = { decision: e.decision, note: e.note };
        }
      } else if (e.type === 'task.updated' && e.taskId === taskId && e.status) {
        taskChangeSeq = env.seq;
      }
    }
    return decision && decisionSeq > taskChangeSeq ? decision : undefined;
  }

  private async executeTurn(
    agentName: string,
    prompt: string,
    directiveIds: string[],
  ): Promise<{ result: { outcome: 'ok' | 'error' | 'interrupted' | 'timeout'; finalText: string; error?: string }; reply: ReturnType<typeof parseAgentReply> }> {
    const adapter = this.adapters.get(agentName)!;
    const raw = this.rawLogs.get(agentName)!;
    const state = this.state();
    const agentState = state.agents.get(agentName)!;
    const turnId = newId('turn');

    let nativeSessionId = agentState.nativeSessionId;
    let resumeExisting = !!nativeSessionId;
    if (!nativeSessionId && agentState.spec.adapter === 'claude-code') {
      nativeSessionId = ClaudeAdapter.newSessionId();
      this.append(SYSTEM, { type: 'agent.native-session', agent: agentName, nativeSessionId });
    }

    this.append(SYSTEM, { type: 'turn.started', turnId, agent: agentName, input: prompt, directiveIds });
    for (const id of directiveIds) {
      this.append(SYSTEM, { type: 'directive.delivered', directiveId: id, agent: agentName, turnId });
    }
    this.append(SYSTEM, { type: 'agent.status', agent: agentName, state: 'working' });

    const started = Date.now();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      adapter.interrupt();
    }, this.config.turnTimeoutMs);

    const turnResult = await adapter.runTurn({
      prompt,
      nativeSessionId,
      resumeExisting,
      onEvent: (e) => {
        switch (e.kind) {
          case 'raw':
            raw.write(e.payload);
            break;
          case 'native-session':
            if (!resumeExisting && e.nativeSessionId !== nativeSessionId) {
              this.append(SYSTEM, {
                type: 'agent.native-session',
                agent: agentName,
                nativeSessionId: e.nativeSessionId,
              });
            }
            break;
          case 'tool-use':
            this.append({ kind: 'agent', agent: agentName }, { type: 'tool.used', agent: agentName, turnId, tool: e.tool, summary: e.summary });
            break;
          case 'file-change': {
            const rel = e.path.startsWith(this.config.repo + '/')
              ? e.path.slice(this.config.repo.length + 1)
              : e.path;
            this.append(
              { kind: 'agent', agent: agentName },
              { type: 'files.changed', agent: agentName, turnId, changes: [{ path: rel, kind: e.change }], source: 'tool' },
            );
            break;
          }
          case 'assistant-text':
            break; // final text becomes a message; intermediate text stays in raw
        }
      },
    });
    clearTimeout(timer);

    this.append(SYSTEM, {
      type: 'turn.completed',
      turnId,
      agent: agentName,
      outcome: turnResult.outcome,
      usage: turnResult.usage,
      durationMs: Date.now() - started,
      error: timedOut ? `turn exceeded ${this.config.turnTimeoutMs / 60000} min timeout` : turnResult.error,
    });
    this.append(SYSTEM, { type: 'agent.status', agent: agentName, state: 'idle' });
    this.scanGit(agentName, turnId);

    const outcome = timedOut ? 'timeout' : turnResult.outcome;
    return {
      result: { outcome, finalText: turnResult.finalText, error: turnResult.error },
      reply: parseAgentReply(turnResult.finalText),
    };
  }

  private classifyInterrupt(): 'interrupted' {
    return 'interrupted';
  }

  // -- history queries -------------------------------------------------------

  private latestObjectionForDriver(): { from: string; text: string } | undefined {
    const lastDriverDone = this.lastSeqWhere(
      (e) => e.type === 'turn.completed' && e.agent === this.config.driver.name && e.outcome === 'ok',
    );
    for (let i = this.history.length - 1; i >= 0; i--) {
      const env = this.history[i]!;
      const e = env.event;
      if (e.type === 'message' && e.kind === 'objection' && env.seq > lastDriverDone) {
        return { from: e.from, text: e.text };
      }
    }
    return undefined;
  }

  private latestHumanRejection(): string | undefined {
    const lastDriverDone = this.lastSeqWhere(
      (e) => e.type === 'turn.completed' && e.agent === this.config.driver.name && e.outcome === 'ok',
    );
    for (let i = this.history.length - 1; i >= 0; i--) {
      const env = this.history[i]!;
      const e = env.event;
      if (e.type === 'approval.resolved' && e.decision === 'deny' && env.seq > lastDriverDone) {
        return e.note ?? 'The human declined acceptance without a note; re-examine the work critically.';
      }
    }
    return undefined;
  }

  private latestDriverReport(): string | undefined {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const e = this.history[i]!.event;
      if (e.type === 'message' && e.from === this.config.driver.name && e.kind === 'report') return e.text;
    }
    return undefined;
  }

  private reviewRounds(): number {
    return this.history.filter((env) => {
      const e = env.event;
      return e.type === 'message' && (e.kind === 'verdict' || e.kind === 'objection') && e.from === this.config.reviewer.name;
    }).length;
  }

  private recoveryTextFor(agent: string): string | undefined {
    // A turn.completed with outcome 'interrupted' and no later ok-turn means
    // the next prompt must carry the recovery preamble.
    for (let i = this.history.length - 1; i >= 0; i--) {
      const e = this.history[i]!.event;
      if (e.type === 'turn.completed' && e.agent === agent) {
        if (e.outcome !== 'interrupted') return undefined;
        const started = this.history.find(
          (h) => h.event.type === 'turn.started' && h.event.turnId === e.turnId,
        );
        const input = started && started.event.type === 'turn.started' ? started.event.input : '(unavailable)';
        return recoveryPreamble(input);
      }
    }
    return undefined;
  }

  private lastSeqWhere(pred: (e: Extract<RunEvent, { type: 'turn.completed' }>) => boolean): number {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const e = this.history[i]!.event;
      if (e.type === 'turn.completed' && pred(e)) return this.history[i]!.seq;
    }
    return 0;
  }

  // -- misc ------------------------------------------------------------------

  private append(origin: Origin, event: RunEvent): void {
    this.ledger.append(origin, event);
  }

  private signal(): void {
    const ws = this.waiters;
    this.waiters = [];
    for (const w of ws) w();
  }

  private waitForSignal(): Promise<void> {
    return new Promise((res) => this.waiters.push(res));
  }

  private baselineGit(): void {
    this.gitBaseline = this.gitPorcelain();
  }

  private gitPorcelain(): Map<string, string> {
    const map = new Map<string, string>();
    try {
      const out = execFileSync('git', ['status', '--porcelain'], { cwd: this.config.repo, encoding: 'utf8' });
      for (const line of out.split('\n')) {
        if (!line.trim()) continue;
        map.set(line.slice(3).trim(), line.slice(0, 2).trim());
      }
    } catch {
      /* not a git repo — tool-reported changes still cover us */
    }
    return map;
  }

  /** Emit deltas the tool stream may have missed (e.g. files created via Bash). */
  private scanGit(agent: string, turnId: string): void {
    const now = this.gitPorcelain();
    const changes: { path: string; kind: 'created' | 'modified' | 'deleted' }[] = [];
    for (const [path, code] of now) {
      if (this.gitBaseline.get(path) !== code) {
        changes.push({ path, kind: code.includes('D') ? 'deleted' : code === '??' || code.includes('A') ? 'created' : 'modified' });
      }
    }
    for (const path of this.gitBaseline.keys()) {
      if (!now.has(path)) changes.push({ path, kind: 'modified' });
    }
    this.gitBaseline = now;
    if (changes.length) {
      this.append(SYSTEM, { type: 'files.changed', agent, turnId, changes, source: 'git-scan' });
    }
  }
}

function makeAdapter(spec: AgentSpec, repo: string): AgentAdapter {
  if (spec.adapter === 'claude-code') return new ClaudeAdapter(spec, repo);
  if (spec.adapter === 'codex') return new CodexAdapter(spec, repo);
  throw new Error(`unknown adapter kind: ${spec.adapter}`);
}

function extractCriteria(history: Envelope[]): string[] {
  const created = history.find((e) => e.event.type === 'task.created')?.event;
  if (!created || created.type !== 'task.created') return [];
  return created.description
    .split('\n')
    .filter((l) => /^criterion \d+:/.test(l))
    .map((l) => l.replace(/^criterion \d+:\s*/, ''));
}
