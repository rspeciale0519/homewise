# Bugfix — Fix Project-Wide ESLint Configuration

## Context

Two compounding issues make `npm run lint` completely broken:

1. **Next.js 16 removed `next lint`** — the CLI no longer has a lint command, so `next lint` treats "lint" as a directory argument and errors: *"Invalid project directory provided, no such directory: …/lint"*.
2. **ESLint 9 requires flat config** — ESLint 9.x dropped support for `.eslintrc.json` by default and requires `eslint.config.(js|mjs|cjs)`. Running `npx eslint` fails with *"ESLint couldn't find an eslint.config file"*.

`eslint-config-next` 16.1.6 already ships ESLint 9 flat config arrays (confirmed: `dist/core-web-vitals.js` exports an array directly).

---

## Files to Create

| File | Purpose |
|------|---------|
| `eslint.config.mjs` | New flat config that imports from `eslint-config-next` |

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | `"lint"` script: `"next lint"` → `"eslint ."` |

## Files to Archive

| File | Destination |
|------|------------|
| `.eslintrc.json` | `archive/.eslintrc.json` |

---

## Implementation

### 1. Create `eslint.config.mjs`

```js
import coreWebVitals from "eslint-config-next/core-web-vitals";

export default [...coreWebVitals];
```

`core-web-vitals` already includes the TypeScript rules from `eslint-config-next/typescript`, so no separate import is needed.

### 2. Update `package.json` lint script

```json
"lint": "eslint ."
```

### 3. Archive `.eslintrc.json`

Move to `archive/.eslintrc.json`.

---

## Verification

1. `npm run lint` — should complete without the "Invalid project directory" error
2. Zero lint errors on newly added auth flow files
3. `npm run type-check` — should still show only the 2 pre-existing errors in `properties/[id]/page.tsx`
