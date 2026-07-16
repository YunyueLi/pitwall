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
} from '../core/state.js';
import { RawLog, createRunDir, openRun, runDir } from '../core/store.js';
import {
  driverPrompt,
  parseAgentReply,
  recoveryPreamble,
  reviewerPrompt,
} from './prompts.js';

export interface RunConfig {
  goal: string;
  criteria: string[];
  repo: string;
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
      repo: config.repo,
      agents: [config.driver, config.reviewer],
      agentosVersion,
    });
    orch.append(SYSTEM, { type: 'agent.registered', spec: config.driver });
    orch.append(SYSTEM, { type: 'agent.registered', spec: config.reviewer });
    orch.append(HUMAN, {
      type: 'task.created',
      taskId: newId('task'),
      title: `Implement: ${config.goal.slice(0, 80)}`,
      description: [config.goal, ...config.criteria.map((c, i) => `criterion ${i + 1}: ${c}`)].join('\n'),
      assignee: config.driver.name,
      dependsOn: [],
    });
    return orch;
  }

  static resume(runId: string, overrides: Partial<Pick<RunConfig, 'maxReviewRounds' | 'turnTimeoutMs'>> = {}): Orchestrator {
    const dir = runDir(runId);
    const { ledger, history } = openRun(dir);
    const created = history.find((e) => e.event.type === 'run.created')?.event;
    if (!created || created.type !== 'run.created') throw new Error(`run ${runId} has no run.created event`);
    const criteria = extractCriteria(history);
    const config: RunConfig = {
      goal: created.goal,
      criteria,
      repo: created.repo,
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

      const pendingApproval = [...state.approvals.values()].find((a) => !a.decision);
      if (pendingApproval || this.runPaused || state.status === 'paused') {
        await this.waitForSignal();
        continue;
      }

      const task = [...state.tasks.values()][0];
      if (!task) throw new Error('run has no task');

      if (task.status === 'accepted') {
        this.append(SYSTEM, { type: 'run.status', status: 'done', reason: 'task accepted by human' });
        return;
      }

      const phase: 'driver' | 'reviewer' = task.status === 'needs-review' ? 'reviewer' : 'driver';
      const agentName = phase === 'driver' ? this.config.driver.name : this.config.reviewer.name;
      if (this.pausedAgents.has(agentName)) {
        await this.waitForSignal();
        continue;
      }

      const outcome = phase === 'driver' ? await this.driverTurn() : await this.reviewerTurn();
      if (outcome === 'interrupted') {
        // Either a human interrupt-directive (fold in and retry) or stop().
        if (this.stopping) return;
        continue;
      }
      if (outcome === 'timeout') {
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
      if (outcome === 'error') {
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
      // Loop will now wait; on allow → accepted → done. On deny → back to driver.
      this.installAcceptanceHandler(task.taskId);
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
  private installAcceptanceHandler(taskId: string): void {
    const un = this.ledger.subscribe((env) => {
      const e = env.event;
      if (e.type !== 'approval.resolved') return;
      const ap = this.state().approvals.get(e.approvalId);
      if (!ap || ap.gate !== 'acceptance') return;
      un();
      if (e.decision === 'allow') {
        this.append(SYSTEM, { type: 'task.updated', taskId, status: 'accepted', note: e.note });
      } else {
        this.append(SYSTEM, {
          type: 'task.updated',
          taskId,
          status: 'in-progress',
          note: `human rejected acceptance${e.note ? `: ${e.note}` : ''}`,
        });
      }
    });
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
          case 'file-change':
            this.append(
              { kind: 'agent', agent: agentName },
              { type: 'files.changed', agent: agentName, turnId, changes: [{ path: e.path, kind: e.change }], source: 'tool' },
            );
            break;
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
