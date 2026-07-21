import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureDiffs, workingTreeDiff } from '../src/core/diffs.js';
import { reduce } from '../src/core/state.js';
import { Ledger, readLedgerFile } from '../src/core/ledger.js';

function gitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pitwall-diff-test-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'test@test');
  git('config', 'user.name', 'test');
  writeFileSync(join(dir, 'kept.txt'), 'line one\nline two\n');
  writeFileSync(join(dir, 'doomed.txt'), 'to be deleted\n');
  git('add', '.');
  git('commit', '-qm', 'base');
  return dir;
}

test('captureDiffs snapshots created, modified and deleted files as unified diffs', () => {
  const dir = gitRepo();
  try {
    writeFileSync(join(dir, 'kept.txt'), 'line one\nline TWO\n');
    writeFileSync(join(dir, 'fresh.txt'), 'brand new\n');
    rmSync(join(dir, 'doomed.txt'));

    const files = captureDiffs(dir, [
      { path: 'kept.txt', kind: 'modified' },
      { path: 'fresh.txt', kind: 'created' },
      { path: 'doomed.txt', kind: 'deleted' },
    ]);

    assert.equal(files.length, 3);
    const byPath = new Map(files.map((f) => [f.path, f]));
    assert.match(byPath.get('kept.txt')!.patch, /-line two\n\+line TWO/);
    assert.match(byPath.get('fresh.txt')!.patch, /\+brand new/, 'untracked file diffs against /dev/null');
    assert.match(byPath.get('doomed.txt')!.patch, /-to be deleted/);
    for (const f of files) assert.notEqual(f.truncated, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('captureDiffs truncates oversized patches and never throws outside a repo', () => {
  const dir = gitRepo();
  try {
    let big = '';
    for (let i = 0; i < 9000; i++) big += `line number ${i} padded to be long enough\n`;
    writeFileSync(join(dir, 'huge.txt'), big);
    const [f] = captureDiffs(dir, [{ path: 'huge.txt', kind: 'created' }]);
    assert.equal(f!.truncated, true);
    assert.ok(f!.patch.length <= 64_100, 'per-file cap holds');
    assert.match(f!.patch, /truncated/);

    const outside = mkdtempSync(join(tmpdir(), 'pitwall-nogit-'));
    try {
      const res = captureDiffs(outside, [{ path: 'x.txt', kind: 'modified' }]);
      assert.equal(res.length, 1);
      assert.equal(res[0]!.patch, '');
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('workingTreeDiff covers the whole tree including untracked files', () => {
  const dir = gitRepo();
  try {
    writeFileSync(join(dir, 'kept.txt'), 'line one\nline TWO\n');
    writeFileSync(join(dir, 'fresh.txt'), 'brand new\n');
    const all = workingTreeDiff(dir);
    assert.match(all, /line TWO/);
    assert.match(all, /brand new/);
    const one = workingTreeDiff(dir, 'kept.txt');
    assert.match(one, /line TWO/);
    assert.doesNotMatch(one, /brand new/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('state fold keeps the newest diff snapshot per file, with task attribution', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pitwall-fold-'));
  try {
    const { ledger } = Ledger.open(dir);
    const env = (e: any) => ledger.append({ kind: 'system' }, e);
    env({ type: 'run.created', runId: 'r1', goal: 'g', repo: '/tmp/r', agents: [], engineVersion: 't' });
    env({
      type: 'diff.captured', agent: 'codex', turnId: 't1', taskId: 'task_a',
      files: [{ path: 'a.ts', kind: 'created', patch: '+v1' }],
    });
    env({
      type: 'diff.captured', agent: 'codex', turnId: 't2', taskId: 'task_b',
      files: [
        { path: 'a.ts', kind: 'modified', patch: '+v2' },
        { path: 'b.ts', kind: 'created', patch: '+new', truncated: true },
      ],
    });
    ledger.close();

    const s = reduce(readLedgerFile(join(dir, 'events.jsonl')));
    assert.equal(s.diffs.size, 2);
    assert.equal(s.diffs.get('a.ts')!.patch, '+v2', 'later snapshot wins');
    assert.equal(s.diffs.get('a.ts')!.taskId, 'task_b');
    assert.equal(s.diffs.get('b.ts')!.truncated, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
