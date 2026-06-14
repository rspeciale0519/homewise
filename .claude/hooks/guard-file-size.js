'use strict';
// PostToolUse(Edit|Write|MultiEdit): warn when a SOURCE file crosses the
// 450-LOC non-negotiable cap (CLAUDE.md). Docs (*.md) are exempt. Non-blocking:
// surfaces an additionalContext note so Claude self-corrects before finishing.
const fs = require('fs');
let input = {}; try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
try {
  const tool = input.tool_name || '';
  if (!/^(Edit|Write|MultiEdit)$/.test(tool)) process.exit(0);
  const fp = input.tool_input && input.tool_input.file_path;
  if (!fp) process.exit(0);
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(fp)) process.exit(0); // source only
  let txt = '';
  try { txt = fs.readFileSync(fp, 'utf8'); } catch { process.exit(0); }
  const loc = txt.split(/\r?\n/).length;
  const LIMIT = 450;
  if (loc > LIMIT) {
    const msg = `WARN [450-LOC guard] ${fp} is now ${loc} lines (limit ${LIMIT}, `
      + `non-negotiable per CLAUDE.md). Split this source file into smaller modules `
      + `before completing the task.`;
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg },
    }));
  }
  process.exit(0);
} catch (e) { console.error('[guard-file-size] failed open: ' + e.message); process.exit(0); }
