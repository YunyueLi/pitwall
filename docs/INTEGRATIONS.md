# Integrations — the lightweight ways to use Pitwall

The web console is the full product surface, but you don't have to open it.
Pitwall follows the same distribution pattern as the strongest tools in this
space (CLI first, then MCP, then editor protocols): every capability is
available headlessly, and the console is just one client of the ledger.

## 1. CLI (always there)

```bash
pitwall status            # answers "what is true right now" from the ledger
pitwall watch             # live timeline in the terminal
pitwall tell --to all --interrupt "change of plan: …"
pitwall approve --note "verified locally"
```

Works whether or not the run is live; state comes from the ledger on disk.

## 2. MCP server — plug Pitwall into any agent

`pitwall mcp` speaks the Model Context Protocol on stdio (zero dependencies).
Any MCP-capable client — Claude Code, Codex, editors — can then observe and
steer runs as tools:

| Tool | What it does |
|---|---|
| `pitwall_list_runs` | All runs with status and live flag |
| `pitwall_status` | Goal, task board, agents, cost, pending gates |
| `pitwall_transcript` | The explicit dialogue (plans, objections, verdicts, directives) |
| `pitwall_tell` | Send a supplement/override directive, optionally interrupting |
| `pitwall_decide` | Approve/reject the pending human gate |
| `pitwall_pause` | Pause/resume the run or one agent |

**Claude Code:**

```bash
claude mcp add pitwall -- pitwall mcp
```

Then, inside any Claude Code session: *"check my pitwall run and approve the
plan if it looks reasonable"*. The gates stay human-authorized — you are the
one talking to Claude Code.

**Codex** (`~/.codex/config.toml`):

```toml
[mcp_servers.pitwall]
command = "pitwall"
args = ["mcp"]
```

This is the deliberate answer to "the console is a product-layer wrapper —
where's the lightweight form?": the ledger is the product; CLI, MCP and the
console are three clients of it.

## 3. Roadmap

- **ACP adapter** (Agent Client Protocol) — Pitwall as an ACP client, so any
  ACP agent becomes a seat; and as an ACP agent, so editors can embed it.
- **GitHub Action** — run gates as PR checks.
