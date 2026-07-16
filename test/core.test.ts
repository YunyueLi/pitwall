import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendFileSync } from 'node:fs';
import { Ledger, readLedgerFile } from '../src/core/ledger.js';
import { reduce, pendingDirectivesFor, currentGoal } from '../src/core/state.js';
import { parseAgentReply } from '../src/orchestrator/prompts.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'agentos-test-'));
}

test('ledger assigns monotonic seq and system timestamps, survives reopen', () => {
  const dir = tempDir();
  try {
    const { ledger } = Ledger.open(dir);
    const a = ledger.append({ kind: 'human' }, { type: 'note', text: 'one' });
    const b = ledger.append({ kind: 'system' }, { type: 'note', text: 'two' });
    assert.equal(a.seq, 1);
    assert.equal(b.seq, 2);
    assert.ok(Date.parse(a.ts) > 0, 'timestamp is system-generated ISO');
    ledger.close();

    const { ledger: l2, history } = Ledger.open(dir);
    assert.equal(history.length, 2);
    const c = l2.append({ kind: 'human' }, { type: 'note', text: 'three' });
    assert.equal(c.seq, 3, 'seq continues across restarts');
    l2.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('replay tolerates a torn tail write', () => {
  const dir = tempDir();
  try {
    const { ledger } = Ledger.open(dir);
    ledger.append({ kind: 'human' }, { type: 'note', text: 'ok' });
    ledger.close();
    appendFileSync(join(dir, 'events.jsonl'), '{"seq":2,"ts":"2026-'); // crash mid-write
    const history = readLedgerFile(join(dir, 'events.jsonl'));
    assert.equal(history.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('state fold: goal revisions, directives, override supersession, delivery acks', () => {
  const dir = tempDir();
  try {
    const { ledger } = Ledger.open(dir);
    const env = (e: any, origin: any = { kind: 'system' }) => ledger.append(origin, e);
    env({ type: 'run.created', runId: 'r1', goal: 'build x', repo: '/tmp/r', agents: [], agentosVersion: 't' });
    env({ type: 'agent.registered', spec: { name: 'claude', adapter: 'claude-code', role: 'driver', sandbox: 'workspace-write' } });
    env({ type: 'directive', directiveId: 'd1', scope: 'all', mode: 'supplement', text: 'use spanish', interrupt: false }, { kind: 'human' });
    env({ type: 'directive', directiveId: 'd2', scope: 'claude', mode: 'supplement', text: 'add tests', interrupt: false }, { kind: 'human' });

    let s = reduce(readLedgerFile(join(dir, 'events.jsonl')));
    assert.equal(pendingDirectivesFor(s, 'claude').length, 2);

    env({ type: 'directive.delivered', directiveId: 'd1', agent: 'claude', turnId: 't1' });
    env({ type: 'directive', directiveId: 'd3', scope: 'all', mode: 'override', text: 'actually use french', interrupt: false }, { kind: 'human' });
    env({ type: 'goal.updated', text: 'build y instead', mode: 'override' }, { kind: 'human' });

    s = reduce(readLedgerFile(join(dir, 'events.jsonl')));
    const pending = pendingDirectivesFor(s, 'claude');
    assert.deepEqual(pending.map((d) => d.directiveId), ['d3'], 'override supersedes prior directives');
    assert.equal(currentGoal(s), 'build y instead');
    assert.equal(s.goalHistory.length, 2, 'goal history preserved');
    ledger.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('turn accounting: open turn tracked for crash recovery, totals accumulate', () => {
  const dir = tempDir();
  try {
    const { ledger } = Ledger.open(dir);
    const env = (e: any) => ledger.append({ kind: 'system' }, e);
    env({ type: 'run.created', runId: 'r1', goal: 'g', repo: '/tmp/r', agents: [], agentosVersion: 't' });
    env({ type: 'agent.registered', spec: { name: 'codex', adapter: 'codex', role: 'reviewer', sandbox: 'read-only' } });
    env({ type: 'turn.started', turnId: 'tA', agent: 'codex', input: 'review it', directiveIds: [] });

    let s = reduce(readLedgerFile(join(dir, 'events.jsonl')));
    assert.equal(s.agents.get('codex')!.openTurnId, 'tA', 'mid-turn crash leaves an open turn visible');

    env({ type: 'turn.completed', turnId: 'tA', agent: 'codex', outcome: 'ok', usage: { inputTokens: 100, outputTokens: 50, costUsd: 0.01 } });
    s = reduce(readLedgerFile(join(dir, 'events.jsonl')));
    assert.equal(s.agents.get('codex')!.openTurnId, undefined);
    assert.equal(s.agents.get('codex')!.totals.turns, 1);
    assert.equal(s.agents.get('codex')!.totals.outputTokens, 50);
    ledger.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('agent reply parsing: last agentos block wins, garbage tolerated', () => {
  const good = 'I did things.\n```agentos\n{"status":"done","summary":"ok"}\n```\n';
  assert.equal(parseAgentReply(good).json.status, 'done');
  const two = '```agentos\n{"status":"blocked"}\n```\ntext\n```agentos\n{"status":"done"}\n```';
  assert.equal(parseAgentReply(two).json.status, 'done');
  const bad = 'no block at all';
  assert.equal(parseAgentReply(bad).json, undefined);
  const broken = '```agentos\n{not json}\n```';
  assert.equal(parseAgentReply(broken).json, undefined);
});
