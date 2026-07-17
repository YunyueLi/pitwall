# Pitwall Design Document

*Written 2026-07. This document records the product judgment behind the first
vertical slice: what the problem actually is, what already exists, which
abstractions are load-bearing, and which conflicts we resolved deliberately.*

## 1. The problem, precisely

Coding agents from different vendors (Claude Code, Codex CLI, …) are each
individually capable of long autonomous work on a repository. The moment you
put **two of them on the same repository**, three things break:

1. **Observability.** Raw terminal streams are unreadable as a record; you
   cannot answer "what was just decided, who is doing what, what did it cost,
   what changed" without scrolling through cursor-control noise. Summaries
   written by the agents themselves drift from what the human actually said.
2. **Control.** Mid-course corrections have no defined semantics: which agent
   receives them, when they take effect, whether old work continues under a
   superseded instruction, who acknowledged what. Approval is conflated with
   an agent's own self-check.
3. **Continuity.** The collaboration lives in chat scrollback, ad-hoc PTYs and
   temp files. A crash, closed terminal, or device switch destroys the session
   — and naive resumption double-executes side effects.

## 2. What already exists (survey, July 2026)

Full details in the research notes; the shape of the market:

- **Parallel isolation is the solved problem.** claude-squad, Vibe Kanban,
  Conductor, Superset, Crystal/Nimbalyst, mux, Sculptor, cmux… all run N
  agents in N worktrees/containers and let the human pick winners. Several are
  well-funded; two shut down in early 2026 (Terragon, Bloop).
- **True cross-vendor collaboration is an industry-wide blank.** No credible
  open-source project lets a Claude-family agent and a Codex-family agent
  work the *same* task with division of labor, handoffs, objections and
  acceptance. The closest things are glue scripts (<100 stars) and one
  closed commercial product (Zenflow).
- **Unified, trustworthy event timelines are absent** across the orchestrator
  tools; OpenHands has the most complete event-stream architecture but is a
  single-agent platform at heart. Cost display, approval gates, recovery each
  exist *somewhere*, never together.
- **Interop is standardizing on ACP** (Agent Client Protocol, JSON-RPC/stdio;
  Zed, OpenHands, JetBrains ecosystem). Adapters exist for both Claude Code
  and Codex, but they lag native interfaces on usage/cost and session
  semantics.
- **Platform risk is real.** Wrappers that scrape interactive CLIs die
  (Omnara's open-source version); orchestrators that re-sell subscription
  quota face vendor policy risk. Driving the *official headless interfaces*
  of locally-installed CLIs, under the user's own login, is the defensible
  posture.

Conclusion: Pitwall is an **Agentic Development Environment for teams of
agents** — heterogeneous agents, one repository, the human at the pit wall.
The gap it occupies: no other open environment lets agents from different
vendors truly collaborate on one task under human supervision, recoverable
by design.

## 3. Load-bearing abstractions

### 3.1 The ledger (single source of truth)

A run *is* an append-only JSONL event log. Every other artifact — the web
console, the CLI timeline, task state, crash recovery — is a projection of it.

- `seq` and `ts` are assigned by the ledger **at append time from the system
  clock**. Agents and humans never write timestamps; models are never trusted
  with clocks. (This directly fixes the "agent hand-wrote a future time" class
  of failure.)
- Every envelope carries `origin`: `human`, `agent:<name>`, or `system`.
  Provenance is data, not prose.
- The ledger lives **outside the target repository** (`~/.pitwall/runs/…`),
  so agents cannot casually rewrite their own audit trail and the repo stays
  clean.
- Replay tolerates a torn tail write; an acknowledged append is fsync'd.
- High-volume native output goes to per-agent `raw-*.jsonl` sidecars,
  referenced from the console's "detail" layer. State never depends on them.

### 3.2 The turn (idempotency boundary)

One prompt handed to one agent, until it yields. `turn.started` records the
full prompt; `turn.completed` records outcome, duration, tokens and cost.
Crash recovery closes any open turn as `interrupted` and re-issues a fresh
turn whose prompt *begins with a recovery notice*: **audit the repository
state first, do not repeat completed side effects, then re-satisfy the
original intent.** The repository itself is the authority on which side
effects already happened — this is more honest than pretending an orchestrator
can make vendor CLIs transactional.

### 3.3 Adapters (vendors are plugins)

An adapter turns one vendor CLI into `runTurn(prompt, nativeSessionId?) →
normalized events + result`. Both current adapters spawn one process per turn
and rely on the vendor's own durable session for continuity:

- Claude Code: `claude -p --output-format stream-json --session-id/--resume`.
  We pre-generate the session UUID so the ledger knows it before the process
  starts — a crash in the first turn is still resumable.
- Codex: `codex exec --json` / `codex exec resume <thread_id>` (sandbox
  re-asserted via `-c sandbox_mode=…` on resume, which rejects `--sandbox`).

Turn-per-process was chosen over long-lived bidirectional streams
deliberately: symmetric across vendors, clean interrupt semantics (SIGTERM,
session survives), and the orchestrator process can die at any moment without
losing anything but an in-flight turn. The cost is process startup latency per
turn, which is negligible against model latency.

Roles are configuration, not code: either vendor can hold either seat, and
`sandbox` is part of the agent spec (`workspace-write` driver, `read-only`
reviewer by default).

### 3.4 Directives (human control with delivery semantics)

A directive has scope (one agent or all), mode (`supplement` adds to standing
guidance; `override` supersedes prior directives), and an optional
`interrupt` flag. Non-interrupting directives take effect at each target's
**next turn boundary**; interrupting ones abort the in-flight turn, which is
then re-issued with the directive folded in. Every delivery is acknowledged by
a `directive.delivered` event naming agent and turn — "who has seen this" is
always answerable from the ledger. Goal revisions are kept as history; the
latest is authoritative and agents are told when earlier wording is void.

### 3.5 Gates (self-check is never acceptance)

When the driver claims done, the task moves to `needs-review` and an
independent agent audits the actual working tree (read-only) against the goal
and its **completion criteria** (explicit, itemized, judged one by one — a
borrowed insight from spec/goal-contract workflows). Reviewer approval still
only produces an `approval.requested` event: the run finishes when the
*human* allows the acceptance gate. A rejection note flows back to the driver
as a labeled human instruction.

### 3.6 Trust boundaries between agents

Peer output is quoted inside `[FROM AGENT "<name>"]` markers and explicitly
framed as a colleague's claim to verify, never as a human instruction; only
`[HUMAN DIRECTIVE]` blocks carry human authority; file/tool/web content is
data. This does not make prompt injection impossible — it makes provenance
explicit at every hop, which is the precondition for any stronger policy.

## 4. Requirement conflicts and how we resolved them

| Conflict | Resolution |
|---|---|
| "Show me everything" vs. readability | One ledger, four display layers (state / messages / actions / tool detail); raw vendor streams in sidecars, expandable on demand, never load-bearing. |
| Full auditability vs. privacy | Local-first; ledger outside the repo; console binds to 127.0.0.1; zero telemetry; export is a deliberate act (`~/.pitwall` is plain files you can redact or delete). |
| Agent autonomy vs. human authority | Agents run whole turns without pestering; human authority enters at turn boundaries, or immediately via interrupt; the final gate is always human. |
| Idempotent recovery vs. real side effects | Turn = recovery unit; recovery prompt forces a state audit before action; vendor-native session resume preserves agent memory. |
| Vendor capability drift vs. stable core | Adapters are thin and empirically smoke-tested; core never imports vendor types. ACP adapter is the planned third backend once cost/session gaps close. |
| Dynamic role assignment vs. a shippable protocol | The engine hard-codes no brands; MVP ships one protocol (driver ⇄ reviewer with objection rounds) because it is the smallest loop that exercises handoff, dissent, correction and acceptance. More topologies are protocol modules, not core changes. |

## 5. What the MVP deliberately does not do

- Multi-task dependency graphs (one task per run for now; the event model
  already carries `task.*` so this is additive).
- Tool-level approval bridging (Claude Code supports it via PreToolUse hooks /
  `--permission-prompt-tool`; Codex headless has no callback — its guardrail
  is the OS sandbox. Roadmap: bridge Claude tool approvals into the same
  approval gate UI).
- Workspace isolation modes (shared working tree only; worktree-per-agent is
  a well-understood addition and the reviewer is read-only anyway).
- Secret redaction / retention windows for exported ledgers.
- ACP adapter, third agent kinds, remote/web deployment.

Each of these is listed in the roadmap with the abstraction it plugs into.

## 6. Naming

Started as the working title "AgentOS", which collides with several existing
projects. Renamed to **Pitwall** (2026-07): the Formula 1 pit wall is where
the team watches telemetry, radios the drivers, and makes the strategy calls
— exactly this product's seat for the human. Checked at rename time: no
notable software project or npm-famous package holds the name; search results
are F1 content, which is the association we want.
