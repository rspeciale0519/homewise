'use strict';
// PreToolUse(Bash): protect the SHARED PRODUCTION Supabase DB (CLAUDE.md Rule 8).
// - DENY  `prisma migrate` (any) and destructive resets — workflow is db:push only.
// - ASK   on seed/backfill scripts — they WRITE to prod data.
// Matches only REAL command invocations at a command boundary (start, or after
// ; & | && ||), optionally via a runner (npx/pnpm/yarn/npm run|exec). This avoids
// false positives when the trigger text appears inside a commit message, echo,
// comment, or grep pattern.
const fs = require('fs');
let input = {}; try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
function decide(permissionDecision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason: reason },
  }));
  process.exit(0);
}
try {
  if ((input.tool_name || '') !== 'Bash') process.exit(0);
  const cmd = (input.tool_input && input.tool_input.command) || '';
  if (!cmd) process.exit(0);
  const c = cmd.toLowerCase();

  const BOUND = '(?:^|[;&|]\\s*)';                                  // command boundary
  const RUNNER = '(?:(?:npx|bunx|pnpm|yarn|npm(?:\\s+(?:run|exec))?)\\s+)*';
  const reMigrate = new RegExp(BOUND + RUNNER + 'prisma\\s+migrate', 'i');
  const rePush = new RegExp(BOUND + RUNNER + '(?:prisma\\s+db\\s+push|db:push)', 'i');
  const reSeed = new RegExp(
    BOUND + RUNNER + '(?:db:seed|(?:tsx?|node)\\s+\\S*(?:prisma[\\\\/]seed|seed-[a-z-]+\\.ts|backfill-[a-z-]+\\.ts))',
    'i');

  if (reMigrate.test(c)) {
    decide('deny', 'Blocked: `prisma migrate` is forbidden here. The Supabase DB is SHARED WITH '
      + 'PRODUCTION and the workflow is `npm run db:push` only (CLAUDE.md Rule 8). Use '
      + '`prisma db push` for additive schema changes.');
  }
  if (rePush.test(c) && /--(accept-data-loss|force-reset)/.test(c)) {
    decide('deny', 'Blocked: destructive/data-loss db push against the SHARED PRODUCTION database. '
      + 'Refused (CLAUDE.md Rule 8).');
  }
  if (reSeed.test(c)) {
    decide('ask', 'Caution: this runs a seed/backfill that WRITES to the SHARED PRODUCTION Supabase DB '
      + '(CLAUDE.md Rule 8 — local writes hit prod). Confirm you intend to mutate prod data.');
  }
  process.exit(0);
} catch (e) { console.error('[guard-db-commands] failed open: ' + e.message); process.exit(0); }
