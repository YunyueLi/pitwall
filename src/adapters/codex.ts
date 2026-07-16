import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { AgentSpec } from '../core/events.js';
import type { AdapterEvent, AgentAdapter, StartTurnOptions, TurnResult } from './types.js';

/**
 * Codex CLI adapter. One `codex exec --json` process per turn; the thread id
 * from `thread.started` is persisted by the orchestrator and later turns use
 * `codex exec resume <thread_id>`. Codex does not let callers choose the
 * thread id, so a crash in the narrow window before `thread.started` arrives
 * simply orphans an empty thread — the retry starts a fresh one.
 */
export class CodexAdapter implements AgentAdapter {
  readonly spec: AgentSpec;
  private repo: string;
  private child?: ChildProcess;
  private interrupted = false;

  constructor(spec: AgentSpec, repo: string) {
    this.spec = spec;
    this.repo = repo;
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

    const common = [
      '--json',
      '--skip-git-repo-check',
      '--cd',
      this.repo,
      '--sandbox',
      this.spec.sandbox === 'read-only' ? 'read-only' : 'workspace-write',
    ];
    if (this.spec.model) common.push('--model', this.spec.model);

    const args =
      opts.resumeExisting && opts.nativeSessionId
        ? ['exec', 'resume', opts.nativeSessionId, ...common, '-']
        : ['exec', ...common, '-'];

    const child = spawn('codex', args, {
      cwd: this.repo,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    this.child = child;
    child.stdin!.write(opts.prompt);
    child.stdin!.end();

    let finalText = '';
    let usage: TurnResult['usage'];
    let errorMsg: string | undefined;
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
      switch (ev.type) {
        case 'thread.started':
          if (ev.thread_id) {
            opts.onEvent({ kind: 'native-session', nativeSessionId: ev.thread_id });
          }
          break;
        case 'item.completed': {
          const item = ev.item ?? {};
          if (item.type === 'agent_message' && item.text) {
            finalText = item.text;
            opts.onEvent({ kind: 'assistant-text', text: item.text });
          } else if (item.type === 'command_execution') {
            opts.onEvent({
              kind: 'tool-use',
              tool: 'shell',
              summary: String(item.command ?? '').slice(0, 200),
            });
          } else if (item.type === 'file_change') {
            for (const c of item.changes ?? []) {
              opts.onEvent({
                kind: 'file-change',
                path: c.path,
                change: c.kind === 'add' ? 'created' : c.kind === 'delete' ? 'deleted' : 'modified',
              });
            }
          } else if (item.type === 'error') {
            errorMsg = String(item.message ?? 'codex reported an error');
          }
          break;
        }
        case 'turn.completed':
          if (ev.usage) {
            usage = {
              inputTokens: ev.usage.input_tokens,
              outputTokens: ev.usage.output_tokens,
              cachedInputTokens: ev.usage.cached_input_tokens,
            };
          }
          break;
        case 'turn.failed':
          errorMsg = String(ev.error?.message ?? 'turn failed');
          break;
        case 'error':
          errorMsg = String(ev.message ?? 'stream error');
          break;
      }
    });

    const exitCode: number | null = await new Promise((res) => child.on('close', res));
    this.child = undefined;

    if (this.interrupted) return { outcome: 'interrupted', finalText };
    if (errorMsg || exitCode !== 0) {
      return {
        outcome: 'error',
        finalText,
        usage,
        error: errorMsg ?? `codex exited with code ${exitCode}: ${stderrTail.slice(-500)}`,
      };
    }
    return { outcome: 'ok', finalText, usage };
  }
}
