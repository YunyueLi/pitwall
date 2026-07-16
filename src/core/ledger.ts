import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import type { Envelope, Origin, RunEvent } from './events.js';

/**
 * Append-only JSONL ledger. Single writer per run (the orchestrator process,
 * guarded by a pid lockfile in RunStore). Timestamps and sequence numbers are
 * assigned here — at append time, from the system clock — never upstream.
 *
 * Durability: every append is written and fsync'd before `append` returns, so
 * an acknowledged event survives a crash. Replay tolerates one trailing
 * partial line (a write cut off mid-crash).
 */
export class Ledger {
  private fd: number;
  private seq: number;
  private listeners = new Set<(env: Envelope) => void>();

  private constructor(fd: number, lastSeq: number) {
    this.fd = fd;
    this.seq = lastSeq;
  }

  static open(dir: string): { ledger: Ledger; history: Envelope[] } {
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'events.jsonl');
    const history = readLedgerFile(path);
    const fd = openSync(path, 'a');
    const lastSeq = history.length ? history[history.length - 1]!.seq : 0;
    return { ledger: new Ledger(fd, lastSeq), history };
  }

  append(origin: Origin, event: RunEvent): Envelope {
    const env: Envelope = {
      seq: ++this.seq,
      ts: new Date().toISOString(),
      origin,
      event,
    };
    writeSync(this.fd, JSON.stringify(env) + '\n');
    fsyncSync(this.fd);
    for (const l of this.listeners) l(env);
    return env;
  }

  subscribe(listener: (env: Envelope) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    closeSync(this.fd);
    this.listeners.clear();
  }
}

/** Read and parse a ledger file; skips a truncated trailing line. */
export function readLedgerFile(path: string): Envelope[] {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return [];
  }
  const out: Envelope[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as Envelope);
    } catch (err) {
      if (i === lines.length - 1) break; // torn tail write from a crash
      throw new Error(`corrupt ledger line ${i + 1} in ${path}: ${err}`);
    }
  }
  return out;
}
