'use strict';
// PostToolUse(Edit|Write|MultiEdit): run ESLint (warn-only, no --fix) on the single
// changed TS/JS file using the LOCAL eslint via the node binary (no npx cold start,
// no .cmd shell quirks). Surfaces issues to Claude as additionalContext. Fails open.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
let input = {}; try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
try {
  const tool = input.tool_name || '';
  if (!/^(Edit|Write|MultiEdit)$/.test(tool)) process.exit(0);
  const fp = input.tool_input && input.tool_input.file_path;
  if (!fp || !/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(fp)) process.exit(0);
  const root = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const eslintJs = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');
  if (!fs.existsSync(eslintJs)) process.exit(0);

  let out = '';
  try {
    execFileSync(process.execPath, [eslintJs, fp, '--format', 'compact'],
      { cwd: root, timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = ((e.stdout && e.stdout.toString()) || '') + ((e.stderr && e.stderr.toString()) || '');
  }
  // Skip config-load failures (noise) — only report real lint findings.
  if (out && /Oops!|Cannot find|Failed to load|Configuration for rule/i.test(out)) process.exit(0);
  if (out && /\b(Error|Warning)\b/.test(out)) {
    const msg = 'ESLint findings in ' + fp + ':\n' + out.trim().slice(0, 1500);
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg },
    }));
  }
  process.exit(0);
} catch (e) { console.error('[lint-changed] failed open: ' + e.message); process.exit(0); }
