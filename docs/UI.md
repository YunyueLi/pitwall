# Pitwall Console — UI design system (v5)

The console is the product-layer wrapper over the ledger. This note records the
design decisions so contributors can extend it without eroding the aesthetic.
It is the result of a screen-by-screen study of Notion, Manus, Kimi,
hermes-agent, cc-switch, Conductor, Vibe Kanban and Devin.

## Layout — three regions

- **Sidebar (240px)** — the run workspace. Runs grouped by human relevance:
  **Needs you** (pending gates) → **In progress** → **Finished**, each row a
  two-line goal + a status/badge line (pending count, live dot, or tasks
  `done/total`). New-run affordance on top; local identity + GitHub at the foot.
- **Document column (max 720px, centered)** — dialogue as a document. Compact
  run header (kicker + goal title + quiet meta), then approval **gates as
  prominent callouts**, then the conversation. Machine noise (turns, tool calls,
  file scans) folds into one-line collapsible "steps" capsules. Floating
  composer docked at the bottom (Enter sends, IME-safe; Shift+Enter newline).
- **Right rail (320px)** — the telemetry deck. A raised card (status word +
  live dot, cost/tokens/turns/elapsed, task progress bar), then the **Plan**
  (task checklist), **Agents** (compact cards, controls on hover), **Criteria**,
  and **Changes** (touched files). Collapses to a drawer below 1180px.

## Color — one warm ink, one blue jewel

All greys are alpha steps of a single warm ink `#37352F` (Notion's), on a warm
paper `#FAF9F7` with pure-white raised surfaces. Dark mode is a warm near-black
`#191918`, never blue-black. Chrome is monochrome. Color has exactly three jobs:

- **Blue** (`#0B7CE0`) — "where the agent is *now*": the current-task diamond,
  links, focus rings, selection. Nothing decorative.
- **Amber** (`#BE8412`) — "you are needed": gate callouts, the human avatar,
  needs-review.
- **Green** (`#2E9E64`) — "live / done": the running pulse and accepted marks.

## Type & motion

System font stack (no webfonts). Three sizes carry the whole UI — ~14.5px body,
~13px chrome, ~12px metadata — with two weights. Chinese body keeps a generous
1.7 line-height. Motion is Notion-fast: ~120ms hovers, ~500ms structural fades,
and a single "alive" signal — **shimmer text** on the working agent's name.
Everything secondary (timestamps, agent controls) is hover-revealed. Borders are
hairlines and elevation is soft shadow, never boxed frames.

## Theme & language

`◐` cycles auto → light → dark (persisted; `?theme=` overrides). `EN/中文`
toggles a full zh/en dictionary plus a regex table for ledger-generated phrases
(persisted; `?lang=` overrides). `?snapshot=1` renders one static frame without
opening the live stream (used for screenshots).
