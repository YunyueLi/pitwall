import { spawn, type ChildProcess } from 'node:child_process';
import type { AgentSpec } from '../core/events.js';
import type { AgentAdapter, StartTurnOptions, TurnResult } from './types.js';

/**
 * Generic CLI adapter: plugs ANY terminal-runnable agent into a run, the way
 * Orca's "if it runs in a terminal, it runs here" tier works. The spec's
 * adapter kind is `cmd:` followed by a shell template, e.g.
 *
 *   cmd:gemini -p {prompt} --yolo
 *   cmd:my-agent --repo {repo}
 *
 * One process per turn. `{prompt}` is replaced with the turn prompt (shell-
 * quoted); without the placeholder the prompt is written to stdin. `{repo}`
 * is replaced with the repository path. Stdout is the agent's reply; the
 * structured ```pitwall fence is parsed from it like any other agent.
 *
 * Honest limits versus the deep adapters: no vendor session to resume (every
 * prompt is already self-contained, so the protocol still works, but the
 * agent keeps no memory between turns), no token/cost telemetry, no tool
 * stream (the git scan still records file changes), and no enforced sandbox —
 * the command runs with your shell's rights, so give write-capable seats only
 * to agents you trust in that repository.
 */
export class GenericCliAdapter implements AgentAdapter {
  readonly spec: AgentSpec;
  private repo: string;
  private template: string;
  private child?: ChildProcess;
  private interrupted = false;

  constructor(spec: AgentSpec, repo: string) {
    this.spec = spec;
    this.repo = repo;
    this.template = spec.adapter.slice('cmd:'.length).trim();
    if (!this.template) throw new Error(`${spec.name}: empty cmd: adapter template`);
  }

  busy(): boolean {
    return !!this.child;
  }

  interrupt(): void {
    if (this.child) {
      this.interrupted = true;
      this.child.kill('SIGTERM');
    }
  }

  dispose(): void {
    this.interrupt();
  }

  async runTurn(opts: StartTurnOptions): Promise<TurnResult> {
    if (this.child) throw new Error(`${this.spec.name}: turn already in flight`);
    this.interrupted = false;

    const viaArg = this.template.includes('{prompt}');
    const cmd = this.template
      .split('{prompt}').join(shellQuote(opts.prompt))
      .split('{repo}').join(shellQuote(this.repo));

    const child = spawn('/bin/sh', ['-c', cmd], {
      cwd: this.repo,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    this.child = child;
    if (!viaArg) child.stdin!.write(opts.prompt);
    child.stdin!.end();

    let stdout = '';
    let stderrTail = '';
    child.stdout!.on('data', (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      if (stdout.length > 2_000_000) stdout = stdout.slice(-2_000_000);
      opts.onEvent({ kind: 'raw', payload: s });
    });
    child.stderr!.on('data', (d: Buffer) => {
      stderrTail = (stderrTail + d.toString()).slice(-4000);
      opts.onEvent({ kind: 'raw', payload: `[stderr] ${d.toString()}` });
    });

    const exitCode: number | null = await new Promise((res) => child.on('close', res));
    this.child = undefined;

    const finalText = stdout.trim();
    if (finalText) opts.onEvent({ kind: 'assistant-text', text: finalText });
    if (this.interrupted) return { outcome: 'interrupted', finalText };
    if (exitCode !== 0) {
      return {
        outcome: 'error',
        finalText,
        error: `command exited with code ${exitCode}${stderrTail ? `: ${stderrTail.slice(-500)}` : ''}`,
      };
    }
    if (!finalText) {
      return { outcome: 'error', finalText, error: 'command produced no output' };
    }
    return { outcome: 'ok', finalText };
  }
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
