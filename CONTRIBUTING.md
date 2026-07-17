# Contributing to Pitwall

Thanks for your interest. This project is young; the fastest way to help is
to run the demo, break it, and file precise issues.

## Ground rules

- **The ledger is sacred.** Any change must keep run state derivable from
  `events.jsonl` alone. If your feature needs state, it needs an event.
  Timestamps and sequence numbers are assigned only by the ledger.
- **Core never imports vendor types.** Anything Claude- or Codex-specific
  belongs in `src/adapters/`. A new agent = a new adapter implementing
  `AgentAdapter` (see `src/adapters/types.ts`), nothing else.
- **Zero runtime dependencies** stays true unless there is a very strong
  reason. Dev dependencies are fine.
- **Provenance labeling is a security boundary.** Never present agent output
  to another agent as if it were a human instruction; never let repository
  or tool content masquerade as either.

## Development

```bash
npm install
npm run build        # tsc → dist/
npm test             # unit tests (node:test)
./examples/create-demo-repo.sh /tmp/demo && node bin/pitwall.js run --repo /tmp/demo --goal "…"
```

Adapters are validated against real CLIs; when you touch one, state the CLI
version you tested against in the PR (`claude --version`, `codex --version`).
Interface drift between CLI versions is a fact of life — pin what you
verified, don't guess.

## Pull requests

- Small and focused beats large and complete.
- New events: update `src/core/events.ts` (type + `layerOf`), the state fold
  in `src/core/state.ts`, and both renderers (console UI, CLI timeline).
- Include a test where the behavior is testable without live agents
  (ledger/state logic almost always is).

## Compatibility policy

Until 1.0, the event schema may change; runs are not guaranteed portable
across versions (the ledger records `engineVersion` for exactly this
reason). After 1.0, event schema changes will be additive or versioned.
