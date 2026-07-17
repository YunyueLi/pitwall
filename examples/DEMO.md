# The validated demo run

This is a record of the first end-to-end validation run (2026-07-16, Pitwall
0.1.0, Claude Code 2.1.210, codex-cli 0.144.4). The complete raw ledger is in
[`sample-run-events.jsonl`](sample-run-events.jsonl) — 67 events, every
timestamp system-generated. What happened, in order:

| Time (local) | Event |
|---|---|
| 16:32:32 | Run created. Goal: add `median()` to demo-stats with tests. Two criteria. Agents: `claude` (claude-code, driver, workspace-write, sonnet-5), `codex` (codex, reviewer, read-only sandbox). |
| 16:32:55 | Driver working; tool stream reports `src/stats.js` modified. |
| 16:33:xx | **Human mid-course correction, with `--interrupt`**: "median([]) must throw TypeError; even-length arrays average the two middle values; both need tests." Driver's in-flight turn is aborted (`turn.completed: interrupted`). |
| 16:33:xx | Fresh driver turn starts with a recovery preamble ("audit repository state first, do not repeat completed side effects") and the directive folded in; `directive.delivered` acked for `claude`. |
| 16:35:xx | Driver reports: *"The prior turn's work was already complete and matches the new human directive — no repeat work needed."* Task → `needs-review`. |
| 16:36:xx | Reviewer turn starts; the same directive is delivered and acked for `codex`. Codex inspects the working tree read-only (git diff, runs tests). |
| 16:39:xx | Codex verdict: **approve**, addressing each completion criterion. Acceptance gate opens — *reviewer approval is not acceptance*. |
| 16:40:xx | **`kill -9` on the orchestrator** while the gate is pending. `pitwall status` still answers correctly from the ledger (offline mode). |
| 16:41:xx | `pitwall resume`: state rebuilt from the ledger, native sessions reattached, gate still pending, console back up. |
| 16:42:xx | **Human rejects** the gate with a note: also document `median()` in README. Task → `in-progress` with the note attached as a human instruction. |
| 16:44:xx | Driver (same vendor session, resumed) documents README, re-runs tests, hands off. Reviewer re-audits: **approve, round 2**. |
| 16:47:xx | Human approves. Task → `accepted`, run → `done`. Orchestrator exits 0. |

Independently verified afterwards: `npm test` in the demo repo passes 3/3;
README documents the empty-array `TypeError` and even-length behavior; costs
were recorded per turn (driver: 3 turns, $0.51; reviewer: 2 turns, 222k
tokens — Codex reports tokens only, which the console shows honestly instead
of inventing a dollar figure).

Things this run exercised that are easy to claim and hard to do:

- Interrupting delivery of a human directive, with a durable delivery receipt
  per agent (`directive.delivered` events).
- A recovery preamble that made the agent *check the repo before redoing side
  effects* — it correctly concluded the interrupted work was already done.
- Cross-vendor handoff where the reviewer judged the working tree, not the
  driver's claims, criterion by criterion.
- SIGKILL mid-run with zero lost state, including a pending approval gate
  (this validation caught a real bug: the acceptance handler was an in-memory
  subscription that died with the process; it is now derived from the ledger).
- Human rejection flowing back into the loop as a labeled instruction.

To reproduce:

```bash
./examples/create-demo-repo.sh /tmp/demo-repo
node bin/pitwall.js run --repo /tmp/demo-repo \
  --goal "Add a median(values) function to src/stats.js, exported alongside sum and mean, and cover it with tests." \
  --criteria "median is exported and returns the middle value for odd-length arrays" \
  --criteria "npm test passes" \
  --driver claude-code --driver-model claude-sonnet-5 --reviewer codex
```
