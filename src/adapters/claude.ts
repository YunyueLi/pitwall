import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import type { AgentSpec } from '../core/events.js';
import type { AdapterEvent, AgentAdapter, StartTurnOptions, TurnResult } from './types.js';

/**
 * Claude Code adapter. One `claude -p` process per turn, streaming
 * `--output-format stream-json`; continuity across turns and across
 * orchestrator crashes comes from `--session-id` / `--resume`.
 *
 * We pre-generate the session UUID so the ledger can record it *before* the
 * process starts — if we crash mid-turn, recovery still knows what to resume.
 */
export class ClaudeAdapter implements AgentAdapter {
  readonly spec: AgentSpec;
  private repo: string;
  private child?: ChildProcess;
  private interrupted = false;

  constructor(spec: AgentSpec, repo: string) {
    this.spec = spec;
    this.repo = repo;
  }

  /** UUID for a brand-new session, so callers can persist it up front. */
  static newSessionId(): string {
    return randomUUID();
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

    const args = ['-p', '--output-format', 'stream-json', '--verbose'];
    const resuming = !!opts.resumeExisting;
    if (resuming) args.push('--resume', opts.nativeSessionId!);
    else args.push('--session-id', opts.nativeSessionId!);
    if (this.spec.model) args.push('--model', this.spec.model);
    args.push('--permission-mode', 'acceptEdits');
    if (this.spec.sandbox === 'workspace-write') {
      // The driver needs to run builds/tests; edits are already covered by
      // acceptEdits. Bash stays inside the repo cwd by convention and audit.
      args.push('--allowedTools', 'Bash');
    } else {
      args.push('--allowedTools', 'Read', '--disallowedTools', 'Edit', 'Write', 'Bash');
    }

    const child = spawn('claude', args, {
      cwd: this.repo,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    this.child = child;
    child.stdin!.write(opts.prompt);
    child.stdin!.end();

    let finalText = '';
    const result: TurnResult = { outcome: 'ok', finalText: '' };
    let stderrTail = '';
    child.stderr!.on('data', (d: Buffer) => {
      stderrTail = (stderrTail + d.toString()).slice(-4000);
    });

    const rl = createInterface({ input: child.stdout! });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      let ev: any;
      try {
        ev = JSON.parse(line);
      } catch {
        return;
      }
      opts.onEvent({ kind: 'raw', payload: ev });
      this.normalize(ev, opts.onEvent, (r) => Object.assign(result, r), (t) => (finalText = t));
    });

    const exitCode: number | null = await new Promise((res) => child.on('close', res));
    this.child = undefined;

    if (this.interrupted) return { outcome: 'interrupted', finalText };
    if (result.finalText === '' && finalText) result.finalText = finalText;
    if (exitCode !== 0 && result.outcome === 'ok') {
      return {
        outcome: 'error',
        finalText,
        error: `claude exited with code ${exitCode}: ${stderrTail.slice(-500)}`,
      };
    }
    return result;
  }

  private normalize(
    ev: any,
    emit: (e: AdapterEvent) => void,
    setResult: (r: Partial<TurnResult>) => void,
    setText: (t: string) => void,
  ): void {
    switch (ev.type) {
      case 'system':
        if (ev.subtype === 'init' && ev.session_id) {
          emit({ kind: 'native-session', nativeSessionId: ev.session_id });
        }
        break;
      case 'assistant': {
        for (const block of ev.message?.content ?? []) {
          if (block.type === 'text' && block.text?.trim()) {
            setText(block.text);
            emit({ kind: 'assistant-text', text: block.text });
          } else if (block.type === 'tool_use') {
            const summary = summarizeToolUse(block.name, block.input);
            emit({ kind: 'tool-use', tool: block.name, summary });
            const fc = fileChangeOf(block.name, block.input);
            if (fc) emit({ kind: 'file-change', ...fc });
          }
        }
        break;
      }
      case 'result': {
        const usage = ev.usage ?? {};
        setResult({
          outcome: ev.is_error ? 'error' : 'ok',
          finalText: typeof ev.result === 'string' ? ev.result : '',
          error: ev.is_error ? String(ev.result ?? 'unknown error') : undefined,
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cachedInputTokens: usage.cache_read_input_tokens,
            costUsd: ev.total_cost_usd,
          },
        });
        break;
      }
    }
  }
}

function summarizeToolUse(name: string, input: any): string {
  if (!input) return name;
  if (name === 'Bash') return String(input.command ?? '').slice(0, 200);
  if (input.file_path) return `${name} ${input.file_path}`;
  if (input.path) return `${name} ${input.path}`;
  if (input.pattern) return `${name} ${input.pattern}`;
  const s = JSON.stringify(input);
  return `${name} ${s.slice(0, 160)}`;
}

function fileChangeOf(
  name: string,
  input: any,
): { path: string; change: 'created' | 'modified' | 'deleted' } | undefined {
  if (name === 'Write' && input?.file_path) return { path: input.file_path, change: 'created' };
  if ((name === 'Edit' || name === 'MultiEdit' || name === 'NotebookEdit') && input?.file_path) {
    return { path: input.file_path, change: 'modified' };
  }
  return undefined;
}
