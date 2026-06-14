---
type: skill
area: build
status: provisional
confidence: provisional
updated: 2026-06-14
sources:
  - journal:2026-06-14
  - code:.claude/hooks/guard-db-commands.js
  - code:.claude/hooks/lint-changed.js
---

# Claude Code hooks: treat tool input as untrusted

## When to use
Authoring or editing any `.claude/hooks/*` script that consumes the PreToolUse /
PostToolUse stdin payload (`tool_input.command`, `tool_input.file_path`, `input.cwd`).

## The approach
Hook input is attacker-/accident-controlled text, not a vetted command. Two rules learned
the hard way in one session:
1. **Command-text guards must match invocation position, not substring.** A regex that
   matches a dangerous token *anywhere* in `tool_input.command` will fire on the same words
   inside a commit message, `echo`, comment, or grep pattern. Anchor on a command boundary:
   `(?:^|[;&|]\s*)` + an optional runner prefix (`npx|pnpm|yarn|npm run|exec`).
2. **Don't trust caller-supplied paths.** Reject a `file_path` starting with `-` and pass
   it after a `--` end-of-options marker (argv flag-smuggling). Locate executables from
   `process.env.CLAUDE_PROJECT_DIR` (not `input.cwd`), then `fs.realpathSync` and verify
   the binary lives under that root before exec.

Always **fail open** (`process.exit(0)` on any error) so a hook bug never bricks the tool.

## Pitfalls & anti-patterns
- Substring match on `prisma migrate` blocked a `git commit` whose *message* contained the
  phrase — real incident, 2026-06-14.
- `input.cwd` to find `node_modules/.bin/*` lets a manipulated cwd point exec at a planted
  binary (flagged by automated security review).
- Native-Windows node can't resolve MSYS `/c/...` paths — test hooks with `C:\` paths;
  real hook input is already Windows-style.

## Evidence
Both fixes shipped + re-verified: guard-db-commands denies real `npx prisma migrate`,
allows the same words in a commit message, asks on real seed scripts; lint-changed passes
`node --check` and runs clean with `CLAUDE_PROJECT_DIR` set (commits 7421162, 336424f).

## Revision log
- 2026-06-14: distilled from building + hardening the .claude tooling suite.
