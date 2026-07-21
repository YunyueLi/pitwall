import { execFileSync } from 'node:child_process';
import type { DiffFile } from './events.js';

/**
 * Diff capture: turns "these files changed" into reviewable evidence.
 *
 * `captureDiffs` runs at turn end and snapshots each touched file's diff
 * (working tree vs HEAD) for the ledger, so a run's changes can be replayed
 * after the tree moves on. `workingTreeDiff` is the live view the console
 * serves for runs that are still being driven.
 *
 * Both are read-only and never throw: a broken git, a non-repo directory or
 * a binary file degrade to smaller (possibly empty) patches, never to a
 * failed turn.
 */

/** Per-file cap keeps one runaway file from dominating the event. */
const PER_FILE_LIMIT = 64_000;
/** Whole-event budget keeps ledger lines bounded (mirrors the live cap). */
const EVENT_BUDGET = 400_000;
/** Wall-clock guard: capture is best-effort, a turn must not stall on it. */
const CAPTURE_MS = 10_000;

export function captureDiffs(
  repo: string,
  changes: { path: string; kind: 'created' | 'modified' | 'deleted' }[],
): DiffFile[] {
  const files: DiffFile[] = [];
  let budget = EVENT_BUDGET;
  const deadline = Date.now() + CAPTURE_MS;
  for (const c of changes) {
    let patch = Date.now() < deadline ? fileDiff(repo, c.path) : '';
    let truncated = false;
    if (patch.length > PER_FILE_LIMIT) {
      patch = patch.slice(0, PER_FILE_LIMIT) + '\n… (truncated)';
      truncated = true;
    }
    if (patch.length > budget) {
      patch = '';
      truncated = true;
    }
    budget -= patch.length;
    files.push({ path: c.path, kind: c.kind, patch, truncated: truncated || undefined });
  }
  return files;
}

/** Diff of the working tree against HEAD, optionally for one path.
 * Untracked files come back as an all-added diff. Never throws. */
export function workingTreeDiff(repo: string, path?: string): string {
  const scope = path ? ['--', path] : [];
  let out = git(repo, ['diff', 'HEAD', ...scope]);
  if (!out.trim()) out = git(repo, ['diff', ...scope]);
  if (!out.trim() && path) out = git(repo, ['diff', '--no-index', '--', '/dev/null', path]);
  if (!path) {
    // Untracked files never show in `diff HEAD`; append them so the whole-tree
    // view includes brand-new files even when tracked changes exist.
    const untracked = git(repo, ['ls-files', '--others', '--exclude-standard']).trim();
    if (untracked) {
      out += untracked
        .split('\n')
        .map((f) => git(repo, ['diff', '--no-index', '--', '/dev/null', f]))
        .join('');
    }
  }
  return out.length > EVENT_BUDGET ? out.slice(0, EVENT_BUDGET) + '\n… (truncated)' : out;
}

function fileDiff(repo: string, path: string): string {
  let out = git(repo, ['diff', 'HEAD', '--', path]);
  if (!out.trim()) out = git(repo, ['diff', '--', path]);
  if (!out.trim()) out = git(repo, ['diff', '--no-index', '--', '/dev/null', path]);
  return out;
}

function git(repo: string, args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 4_000_000, timeout: 5000 });
  } catch (e) {
    // diff --no-index exits 1 when the files differ; its output is still good.
    const out = (e as { stdout?: unknown })?.stdout;
    return typeof out === 'string' ? out : '';
  }
}
