# Security Policy

## Model

AgentOS runs coding agents with real filesystem and shell access on your
machine. The security posture is:

- **Local only by default.** The console/control server binds to 127.0.0.1.
  There is no remote access, no cloud component, and **no telemetry of any
  kind** — nothing is collected, phoned home, or shared.
- **Ledger contains sensitive data.** `~/.agentos/runs/` stores full prompts,
  agent output, file paths and diffs of whatever repository you ran on. Treat
  it like your shell history: export deliberately, delete freely.
- **Sandboxing is delegated, honestly.** The reviewer seat runs Codex under
  its OS-level `read-only` sandbox. The driver seat has write access to the
  target repository (that is its job) — Claude Code runs with `acceptEdits`
  scoped to the repo working directory plus Bash. Do not point the driver at
  a repository you are not prepared to let it modify; use git.
- **Prompt injection is mitigated, not solved.** Cross-agent content and
  repository content are provenance-labeled, and agents are instructed to
  treat them as data. A sufficiently adversarial repository can still mislead
  an agent; the human acceptance gate and the read-only reviewer exist for
  exactly that reason.
- **Secrets:** AgentOS never reads or stores your API credentials; it invokes
  the vendor CLIs, which use their own auth. Prompts and ledgers are not
  scrubbed for secrets yet (roadmap) — avoid pasting secrets into goals and
  directives.

## Reporting a vulnerability

Open a GitHub security advisory (preferred) or email the maintainer listed in
`package.json`. Please do not open public issues for exploitable problems.
You can expect an acknowledgment within 72 hours.
