# AgentOS

**A local-first control plane for heterogeneous coding agents collaborating on one repository.**

Claude Code implements. Codex reviews it — adversarially, in a read-only
sandbox. You watch everything on one timeline, redirect them mid-flight, and
nothing ships until *you* approve it. Kill the process at any moment;
`agentos resume` continues exactly where the ledger left off.

> Working title. This name collides with existing projects and will change
> before public release — see `docs/DESIGN.md §6`.

## Why

Running several coding agents in parallel worktrees is a solved problem
(claude-squad, Vibe Kanban, Conductor, …). What no open tool does is let
agents from **different vendors work the same task** — with division of
labor, handoffs, objections and acceptance — while the human keeps one
authoritative, recoverable view. AgentOS is built around three commitments:

1. **The ledger is the product.** A run is an append-only event log with
   system-generated timestamps and provenance on every event. The console,
   the CLI, task state and crash recovery are all projections of it. Agents
   never write their own clock, and never rewrite their own audit trail.
2. **Self-check is never acceptance.** Work claimed done goes to an
   independent reviewer agent from another vendor, judged against explicit
   completion criteria; the final gate is always human.
3. **Death is an expected state.** Turns are idempotency boundaries. The
   orchestrator can be SIGKILLed mid-turn; resuming replays the ledger,
   reattaches vendor-native sessions, and re-issues interrupted turns with a
   mandatory "audit the repo state before redoing anything" preamble.

## Requirements

- Node.js ≥ 22
- [Claude Code](https://code.claude.com) CLI, logged in
- [Codex CLI](https://developers.openai.com/codex) ≥ 0.144, logged in

AgentOS drives both CLIs through their **official headless interfaces**
(`claude -p --output-format stream-json`, `codex exec --json`), under your
own login, on your own machine. No scraping, no quota resale, no telemetry.

## Quick start

```bash
git clone <this repo> && cd AgentOS
npm install && npm run build

# a tiny sample repo to watch the agents work on
./examples/create-demo-repo.sh /tmp/demo-repo

node bin/agentos.js run \
  --repo /tmp/demo-repo \
  --goal "Add a median(values) function to src/stats.js, with tests." \
  --criteria "median is exported and handles odd-length arrays" \
  --criteria "npm test passes"
```

The CLI prints a console URL (`http://127.0.0.1:<port>/`). Open it: you get a
live, layered timeline (state / messages / actions / expandable tool detail),
agent cards with health, token and dollar totals, and the approval queue.

While it runs, from a second terminal:

```bash
agentos tell --to all --interrupt "Requirement update: median([]) must throw TypeError"
agentos pause --agent claude          # pause one agent, not the run
agentos status                        # works live or offline
kill -9 <orchestrator pid>            # go ahead
agentos resume                        # …and continue exactly where it stopped
agentos reject --note "also update the README, then I'll accept"
agentos approve
```

(`agentos` = `node bin/agentos.js`, or `npm link` once.)

## What actually happens

The MVP ships one collaboration protocol — the smallest loop that exercises
handoff, dissent, correction and acceptance. Roles are configuration, not
code: `--driver codex --reviewer claude-code` swaps the seats.

```
        goal + completion criteria (human)
                     │
             ┌───────▼────────┐   objection round(s)
             │ driver agent   │◄──────────────┐
             │ workspace-write│               │
             └───────┬────────┘               │
              report │ handoff        ┌───────┴────────┐
                     └───────────────►│ reviewer agent │
                                      │ read-only      │
                                      └───────┬────────┘
                                       verdict│approve
                     ┌────────────────────────▼─┐
                     │ acceptance gate — HUMAN  │──deny+note──► driver
                     └────────────┬─────────────┘
                                  ▼ allow
                                done
```

Human directives (`agentos tell`) are routed by scope (one agent / all),
carry `supplement` or `override` semantics, take effect at the next turn
boundary (or immediately with `--interrupt`), and every delivery is
acknowledged in the timeline — "who has seen this instruction" is always
answerable.

Cross-agent content is provenance-labeled in prompts: peer output is a
colleague's claim to verify, never a human instruction. Only
`[HUMAN DIRECTIVE]` blocks carry human authority.

## Architecture

```
src/core/         events, append-only ledger, state fold, run store
src/adapters/     claude.ts, codex.ts — one vendor CLI each, ~150 lines
src/orchestrator/ run loop, directive routing, gates, prompts
src/console/      127.0.0.1 HTTP + SSE server, single-file web console
src/cli.ts        run/resume/ls/status/tell/goal/approve/reject/pause/watch/stop
```

Zero runtime dependencies. Everything a run produces lives in
`~/.agentos/runs/<runId>/` as plain files (`events.jsonl` + per-agent raw
sidecars) that you can read, redact, export or delete.

Design rationale, market survey and the conflict table live in
[`docs/DESIGN.md`](docs/DESIGN.md).

## Roadmap

- Tool-level approval bridge (Claude PreToolUse hook → the same approval UI;
  Codex via `app-server` callbacks)
- Worktree / container isolation modes per agent
- ACP (Agent Client Protocol) adapter as the third backend → any ACP agent
- Multi-task plans with dependencies; role reassignment mid-run
- Ledger export with secret redaction and retention policies
- Pluggable protocols beyond driver/reviewer (parallel explore + judge, etc.)

## License

Apache-2.0. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
