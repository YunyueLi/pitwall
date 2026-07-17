import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Ledger } from './ledger.js';
import type { Envelope } from './events.js';
import { newId } from './ids.js';

/**
 * Run storage lives outside the target repository (default ~/.pitwall/runs)
 * so the ledger never dirties the codebase agents are working on, and agents
 * cannot casually rewrite their own audit trail.
 */
export function pitwallHome(): string {
  if (process.env.PITWALL_HOME) return process.env.PITWALL_HOME;
  if (process.env.AGENTOS_HOME) return process.env.AGENTOS_HOME; // legacy name
  const home = join(homedir(), '.pitwall');
  const legacy = join(homedir(), '.agentos');
  if (!existsSync(home) && existsSync(legacy)) return legacy; // pre-rename data
  return home;
}

export function runsDir(): string {
  return join(pitwallHome(), 'runs');
}

export function runDir(runId: string): string {
  return join(runsDir(), runId);
}

export interface RunMeta {
  runId: string;
  repo: string;
  createdAt: string;
}

export function createRunDir(repo: string): { runId: string; dir: string } {
  const runId = newId('run');
  const dir = runDir(runId);
  mkdirSync(dir, { recursive: true });
  const meta: RunMeta = { runId, repo, createdAt: new Date().toISOString() };
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  return { runId, dir };
}

export function listRuns(): RunMeta[] {
  let names: string[];
  try {
    names = readdirSync(runsDir());
  } catch {
    return [];
  }
  const metas: RunMeta[] = [];
  for (const n of names) {
    try {
      metas.push(JSON.parse(readFileSync(join(runDir(n), 'meta.json'), 'utf8')));
    } catch {
      /* skip non-run entries */
    }
  }
  return metas.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function resolveRunId(idOrPrefix?: string): string {
  const runs = listRuns();
  if (!idOrPrefix) {
    if (!runs.length) throw new Error('no runs found');
    return runs[0]!.runId; // most recent
  }
  const hit = runs.filter((r) => r.runId === idOrPrefix || r.runId.includes(idOrPrefix));
  if (hit.length === 1) return hit[0]!.runId;
  if (hit.length === 0) throw new Error(`no run matches "${idOrPrefix}"`);
  throw new Error(`ambiguous run id "${idOrPrefix}" (${hit.length} matches)`);
}

// ---------------------------------------------------------------------------
// Orchestrator liveness / single-writer lock

export interface ControlInfo {
  pid: number;
  port: number;
  startedAt: string;
}

function controlPath(dir: string): string {
  return join(dir, 'control.json');
}

export function readControl(dir: string): ControlInfo | undefined {
  try {
    const c = JSON.parse(readFileSync(controlPath(dir), 'utf8')) as ControlInfo;
    process.kill(c.pid, 0); // liveness probe; throws if pid is gone
    return c;
  } catch {
    return undefined;
  }
}

export function writeControl(dir: string, info: ControlInfo): void {
  const live = readControl(dir);
  if (live && live.pid !== process.pid) {
    throw new Error(
      `run already has a live orchestrator (pid ${live.pid}, port ${live.port}); ` +
        `refusing to double-drive it`,
    );
  }
  writeFileSync(controlPath(dir), JSON.stringify(info, null, 2));
}

export function clearControl(dir: string): void {
  try {
    rmSync(controlPath(dir));
  } catch {
    /* already gone */
  }
}

// ---------------------------------------------------------------------------
// Raw native event capture (expandable detail layer; not part of replay state)

export class RawLog {
  private fd: number;
  constructor(dir: string, agent: string) {
    this.fd = openSync(join(dir, `raw-${agent}.jsonl`), 'a');
  }
  write(payload: unknown): void {
    writeSync(this.fd, JSON.stringify({ ts: new Date().toISOString(), payload }) + '\n');
    fsyncSync(this.fd);
  }
  close(): void {
    closeSync(this.fd);
  }
}

export function openRun(dirPath: string): { ledger: Ledger; history: Envelope[] } {
  if (!existsSync(join(dirPath, 'meta.json'))) {
    throw new Error(`${dirPath} is not an Pitwall run directory`);
  }
  return Ledger.open(dirPath);
}
