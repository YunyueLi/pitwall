# Pitwall

**An Agentic Development Environment (ADE) for teams of agents. Agents drive — you make the calls.**

Most ADEs put one agent next to you and keep you in the loop for every step.
Pitwall is the environment for the next posture: **multiple coding agents from
different vendors working the same repository as a team** — planning, building
and reviewing each other's work autonomously — while you sit at the pit wall:
watching one live timeline, radioing in corrections mid-flight, and holding
the few gates that actually need a human. In Formula 1, drivers drive; the
team watches telemetry and makes the strategy calls. That seat is this product.

Kill the process at any moment; `pitwall resume` continues exactly where it
left off — recoverability is table stakes for an environment agents live in.

- **Console** — a minimal, bilingual (中文/EN) web workspace: every run in
  the sidebar, the agents' dialogue as the document, machine noise folded
  away, gates as callouts.
- **CLI** — everything works headless: `run` / `tell` / `approve` / `watch`.
- **MCP** — `pitwall mcp` plugs the whole thing into any MCP-capable agent
  (see [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md)).

## Why

Running several coding agents in parallel worktrees is a solved problem
(claude-squad, Vibe Kanban, Conductor, …), and single-agent ADEs are getting
excellent. What no open environment does is let agents from **different
vendors work the same task as a team** — with division of labor, handoffs,
objections and acceptance — while the human supervises instead of operating.
Pitwall is built around three commitments:

1. **The environment outlives any process.** A run is an append-only event
   ledger with system-generated timestamps and provenance on every event —
   the console, the CLI, task state and crash recovery are all projections of
   it. That's the foundation, not the product: it's what makes the
   environment resumable, inspectable and honest.
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

Pitwall drives both CLIs through their **official headless interfaces**
(`claude -p --output-format stream-json`, `codex exec --json`), under your
own login, on your own machine. No scraping, no quota resale, no telemetry.

## Quick start

```bash
git clone <this repo> && cd Pitwall
npm install && npm run build

# a tiny sample repo to watch the agents work on
./examples/create-demo-repo.sh /tmp/demo-repo

node bin/pitwall.js run \
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
pitwall tell --to all --interrupt "Requirement update: median([]) must throw TypeError"
pitwall pause --agent claude          # pause one agent, not the run
pitwall status                        # works live or offline
kill -9 <orchestrator pid>            # go ahead
pitwall resume                        # …and continue exactly where it stopped
pitwall reject --note "also update the README, then I'll accept"
pitwall approve
```

(`pitwall` = `node bin/pitwall.js`, or `npm link` once.)

## What actually happens

Two collaboration protocols ship today. Roles are configuration, not code —
either vendor can hold either seat.

**Pair mode** (default) — the smallest loop that exercises handoff, dissent,
correction and acceptance:

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

**Team mode** (`--mode team`) — a director agent (default: Claude, read-only)
studies the repo and breaks the goal into a task board; after you approve the
plan, an engineer agent (default: Codex, workspace-write) implements the
tasks in an autonomous loop, with the director reviewing each one against its
criteria. You watch the board, and gates come to you only at the edges:

```
   goal ──► director plans ──► PLAN GATE (human) ──► engineer builds task N
                ▲                                        │ report
                │ milestone rejected w/ note             ▼
                │                            director reviews task N
   HUMAN ◄── MILESTONE GATE ◄── all tasks ◄── approve │ objection ──► retry
                                accepted              (3 strikes → human tie-break)
```

Anytime, in either mode: `pitwall tell` routes a directive to one agent or
all, as a supplement or an override, at the next turn boundary or immediately
with `--interrupt` — always with a delivery receipt in the timeline.

## Agents

Two tiers, the way Orca does it:

- **Deep adapters** — `claude-code` and `codex` get vendor-native session
  resume (memory across turns), token/cost telemetry, and a live tool stream
  in the console.
- **Any terminal agent** — `cmd:<shell template>` runs anything that runs in
  a terminal, one process per turn: `{prompt}` is shell-quoted into the
  command (or fed via stdin), `{repo}` is the repository path, stdout is the
  reply. Gemini CLI, Qwen Code, OpenCode, aider, your own script — if it
  reads a prompt and prints an answer, it can hold a seat:

```sh
pitwall run --goal "…" \
  --driver codex \
  --reviewer 'cmd:gemini -p {prompt}'
```

Honest limits of the `cmd:` tier: no session memory between turns (every
Pitwall prompt is self-contained, so the protocol still works), no usage
telemetry, and no enforced sandbox — give write seats only to agents you
trust in that repository. Deep adapters for more vendors are on the roadmap;
ACP will collapse this whole problem when it lands.

**Autonomous mode** (`--auto`) removes the waiting without removing you: every
gate still appears on the timeline, but the system resolves it as `allow`
after a beat, so the run never blocks. You can still pause, direct, overrule
or reject at any moment — a human decision always wins because it lands first.

**Autonomous iteration** (`--auto --iterate <n>`, team mode) closes the loop:
when a goal is accepted, the engineer itself proposes the next one — grounded
in the original mission, recorded on the ledger like any other turn — and the
team replans and builds it, up to `n` self-opened goals. The engineer is told
that declaring the mission complete is a respected answer, so a bounded run
ends itself instead of inventing work. You watch goals open on the timeline
and steer with `pitwall tell` whenever you care to.

## Architecture

```
src/core/         events, append-only ledger, state fold, run store
src/adapters/     claude.ts, codex.ts — one vendor CLI each, ~150 lines
src/orchestrator/ run loop, directive routing, gates, prompts
src/console/      127.0.0.1 HTTP + SSE server, single-file web console
src/cli.ts        run/resume/ls/status/tell/goal/approve/reject/pause/watch/stop
```

Zero runtime dependencies. Everything a run produces lives in
`~/.pitwall/runs/<runId>/` as plain files (`events.jsonl` + per-agent raw
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
