---
name: scaffold-api-route
description: Scaffold a new Next.js App Router API route that conforms to homewise conventions — Zod-validated input, Supabase auth gate, Prisma access, RESTful methods, co-located Vitest test, ≤450 LOC. Use when the user asks to create or add an API route/endpoint.
disable-model-invocation: true
---

# Scaffold API Route

Create a new API route under `src/app/api/<path>/route.ts` that matches this repo's established patterns. Always inspect 1–2 nearby existing routes first and mirror their exact import style and helpers — do not invent new patterns.

## Steps

1. **Gather intent.** Confirm: route path, HTTP method(s), whether it's public or authed, the resource it touches, and the input/output shape. If unclear, ask before generating.

2. **Study a sibling.** Read the closest existing `src/app/api/**/route.ts` (and its `.test.ts` if present) to copy the real conventions: how auth is resolved, how Zod schemas are imported from `src/schemas/`, how the Prisma client is imported, and the error/response helpers in use. Mirror them.

3. **Generate `route.ts`** following these non-negotiables:
   - **Zod at the boundary.** Define/import a Zod schema; parse body/query/params with `safeParse` and return `400` on failure. No `any`.
   - **Auth gate per method.** For every mutating method (and any non-public GET), resolve the user with Supabase `getUser`/`getClaims` (not a trusting `getSession`) and assert ownership/role BEFORE any DB work. Gate each exported method independently.
   - **Listing visibility.** If returning listings, apply the public-visibility rule (IDX OR approved-manual) and preserve MLS attribution fields. For VOW/BBO-tier data, enforce the tier gate and log access via the MLS access log.
   - **Correct status codes:** 200/201, 400 (invalid), 401 (unauth), 403 (forbidden), 404 (not found). No silent `catch {}` returning 200.
   - **RESTful** method semantics; **≤450 LOC** (split helpers into `src/lib/` if needed).

4. **Generate a co-located test** `route.test.ts` (Vitest) covering: happy path, invalid input → 400, unauthenticated → 401, and forbidden/ownership → 403. Match the mocking style of existing route tests.

5. **Verify.** Run `npm run type-check` and `npm run lint`, then `npx vitest run <new test>`. Fix until green. Report results with evidence.

6. **Audit.** Hand the new route to the `api-route-auditor` subagent for a final auth/validation/visibility pass before declaring done.

## Reference template (adapt to the sibling's actual helpers — do not paste blindly)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const BodySchema = z.object({ /* ... */ });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // authorize ownership/role, then perform the Prisma operation
  // return NextResponse.json(result, { status: 201 });
}
```
