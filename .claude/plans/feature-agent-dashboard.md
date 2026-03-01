# Agent Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the public Agent Resources section into a role-gated "Agent Tools" area within the existing user dashboard, with invite-code registration, protected PDF serving, and a scalable sidebar.

**Architecture:** Extend the existing dashboard sidebar with a role-aware "Agent Tools" section visible only to users with `role === "agent"`. Agents register via a special invite-code link. PDFs move behind an authenticated API route. Public agent-resources pages are archived.

**Tech Stack:** Next.js App Router, Supabase Auth, Prisma, Tailwind CSS, existing dashboard components

**Design Doc:** `docs/plans/2026-03-01-agent-dashboard-design.md`

---

## Phase 1: Invite Code Registration & Role-Aware Sidebar

### Task 1: Add invite code support to registration

**Files:**
- Modify: `src/components/auth/register-form.tsx`
- Modify: `src/app/(marketing)/register/page.tsx`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/api/auth/profile/route.ts`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `.env.local` and `.env.example`

**Step 1: Add environment variable**

Add to `.env.local` and `.env.example`:
```
AGENT_INVITE_CODE=HWAGENT2026
```

**Step 2: Modify the register page to pass invite code**

In `src/app/(marketing)/register/page.tsx`, this is a server component. It needs to read the `?code` query param and pass it to the client-side `RegisterForm`. Update the page to accept `searchParams` and pass the code:

```tsx
// Add searchParams to the page component
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const isAgentRegistration = code === process.env.AGENT_INVITE_CODE;

  // Pass isAgentRegistration and code to the form
  // Show "Agent Registration" badge when valid code is present
```

Add the agent badge in the card header when `isAgentRegistration` is true:
```tsx
{isAgentRegistration && (
  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-50 border border-navy-200 mb-4">
    <svg className="h-3.5 w-3.5 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
    <span className="text-xs font-semibold text-navy-600">Agent Registration</span>
  </div>
)}
```

Pass `inviteCode={code}` prop to `<RegisterForm inviteCode={code} />`.

**Step 3: Modify RegisterForm to store invite code in user metadata**

In `src/components/auth/register-form.tsx`:

Add `inviteCode` prop to the component:
```tsx
interface RegisterFormProps {
  inviteCode?: string;
}

export function RegisterForm({ inviteCode }: RegisterFormProps) {
```

In the `handleSubmit` function, include the invite code in the Supabase `signUp` metadata:
```tsx
const { error } = await supabase.auth.signUp({
  email: result.data.email,
  password: result.data.password,
  options: {
    data: {
      first_name: result.data.firstName,
      last_name: result.data.lastName,
      invite_code: inviteCode ?? "",
    },
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

**Step 4: Modify auth callback to assign agent role**

In `src/app/auth/callback/route.ts`, when creating the `UserProfile`, check the invite code from user metadata:

```tsx
if (!existing) {
  const meta = data.user.user_metadata;
  const isAgent = (meta?.invite_code as string) === process.env.AGENT_INVITE_CODE;
  await prisma.userProfile.create({
    data: {
      id: data.user.id,
      email: data.user.email ?? "",
      firstName: (meta?.first_name as string) ?? (meta?.full_name as string)?.split(" ")[0] ?? "",
      lastName: (meta?.last_name as string) ?? (meta?.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
      avatarUrl: (meta?.avatar_url as string) ?? null,
      role: isAgent ? "agent" : "user",
    },
  });
}
```

**Step 5: Modify profile creation API to handle agent role**

In `src/app/api/auth/profile/route.ts` POST handler, apply the same invite code check:

```tsx
const meta = user.user_metadata;
const isAgent = (meta?.invite_code as string) === process.env.AGENT_INVITE_CODE;
const profile = await prisma.userProfile.create({
  data: {
    id: user.id,
    email: user.email ?? "",
    firstName: (meta?.first_name as string) ?? (meta?.full_name as string)?.split(" ")[0] ?? "",
    lastName: (meta?.last_name as string) ?? (meta?.full_name as string)?.split(" ").slice(1).join(" ") ?? "",
    avatarUrl: (meta?.avatar_url as string) ?? null,
    role: isAgent ? "agent" : "user",
  },
});
```

**Step 6: Modify dashboard layout to handle agent role**

In `src/app/dashboard/layout.tsx`, also apply the same invite code check in the auto-create block, and pass `role` to the sidebar:

In the `if (!existing)` block, add the same role logic. Then fetch the profile's role and pass it:

```tsx
const profile = existing ?? await prisma.userProfile.findUnique({ where: { id: user.id } });
const userRole = profile?.role ?? "user";

// ...

<Sidebar role={userRole} />
```

**Step 7: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors (sidebar will have a type error for the new prop — that's expected, we fix it in Task 2)

**Step 8: Commit**

```bash
git add src/components/auth/register-form.tsx src/app/(marketing)/register/page.tsx src/app/auth/callback/route.ts src/app/api/auth/profile/route.ts src/app/dashboard/layout.tsx .env.example
git commit -m "feat: add invite code support for agent role registration"
```

---

### Task 2: Make the sidebar role-aware

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`

**Step 1: Accept role prop and add agent nav items**

Add a `role` prop to the Sidebar component and define agent-specific navigation items:

```tsx
interface SidebarProps {
  role?: string;
}

const AGENT_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/agent-hub", label: "Resources Hub", icon: "resources", exact: true },
  { href: "/dashboard/agent-hub/documents", label: "Document Library", icon: "library" },
];

export function Sidebar({ role }: SidebarProps) {
```

**Step 2: Render agent section in desktop sidebar**

After the existing `NAV_ITEMS.map(...)` block (line 52) and before the closing `</div>` of the nav container, add the agent tools section:

```tsx
{role === "agent" && (
  <>
    <div className="my-3 mx-3 border-t border-slate-200/60" />
    <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      Agent Tools
    </p>
    {AGENT_NAV_ITEMS.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          isActive(item.href, item.exact)
            ? "bg-white text-navy-700 shadow-sm border border-slate-100"
            : "text-slate-600 hover:bg-white/60 hover:text-navy-700"
        )}
      >
        <SidebarIcon type={item.icon} active={isActive(item.href, item.exact)} />
        {item.label}
      </Link>
    ))}
  </>
)}
```

**Step 3: Render agent items in mobile horizontal tabs**

After the existing mobile `NAV_ITEMS.map(...)` (line 84), add agent items for mobile:

```tsx
{role === "agent" && (
  <>
    <div className="shrink-0 w-px h-6 bg-slate-200 mx-1" />
    {AGENT_NAV_ITEMS.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
          isActive(item.href, item.exact)
            ? "bg-navy-600 text-white"
            : "text-slate-600 bg-slate-50 hover:bg-slate-100"
        )}
      >
        <SidebarIcon type={item.icon} active={isActive(item.href, item.exact)} mobile />
        {item.label}
      </Link>
    ))}
  </>
)}
```

**Step 4: Add new icons to SidebarIcon**

Add two new cases to the `SidebarIcon` switch statement:

```tsx
case "resources":
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
case "library":
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
```

**Step 5: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/dashboard/sidebar.tsx
git commit -m "feat: add role-aware Agent Tools section to dashboard sidebar"
```

---

## Phase 2: Agent Dashboard Pages & PDF Protection

### Task 3: Create the Resources Hub page

**Files:**
- Create: `src/app/dashboard/agent-hub/page.tsx`

**Step 1: Create the page**

This is a server component. It verifies the user is an agent, then renders the company information and quick access documents. Adapt the content from the existing `src/app/(marketing)/agent-resources/page.tsx` but without the hero (the dashboard layout provides the shell) and styled to match dashboard page patterns.

The page should:
1. Fetch the user's profile from Supabase + Prisma
2. Check `profile.role === "agent"` — if not, show an access denied message
3. Render company identifiers (HUD NAID, Tax ID, DBPR License, ORRA MLS ID)
4. Render phone/fax contact info
5. Render quick access documents grid
6. Render document library category cards linking to `/dashboard/agent-hub/documents`
7. Render Transaction Desk info callout

Follow existing dashboard page patterns:
- `p-6 sm:p-8 lg:p-10` padding
- `max-w-5xl` content width
- `font-serif` headings in `text-navy-700`
- White cards with `rounded-2xl border border-slate-100`

For the access denied state:
```tsx
function AccessDenied() {
  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-navy-700 mb-3">Agent Access Required</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          This area is for Home Wise Realty agents. If you are an agent, contact the office for your registration link.
        </p>
        <p className="text-sm text-slate-500">Office: <a href="tel:4077122000" className="text-navy-600 font-medium hover:text-crimson-600 transition-colors">(407) 712-2000</a></p>
      </div>
    </div>
  );
}
```

Import data from `@/data/content/agent-resources` (same constants: `COMPANY_IDENTIFIERS`, `QUICK_ACCESS_DOCUMENTS`, `FORM_CATEGORIES`) and `PHONE`/`FAX` from `@/lib/constants`.

Use the `frontend-design` skill for styling this page to match the dashboard aesthetic while keeping the content well-organized. Keep the `IdentifierCard` and `CategoryIcon` inline components from the original page.

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/dashboard/agent-hub/page.tsx
git commit -m "feat: add agent Resources Hub dashboard page"
```

---

### Task 4: Create the Document Library page

**Files:**
- Create: `src/app/dashboard/agent-hub/documents/page.tsx`

**Step 1: Create the page**

Server component with agent role check. Renders all 53 documents from all 3 categories (Office, Listing, Sales) using the existing `DocumentList` component. Uses a tabbed interface to switch between the 3 categories.

The page should:
1. Fetch user profile, check `role === "agent"` (same pattern as Task 3)
2. Import `OFFICE_FORMS`, `LISTING_FORMS`, `SALES_FORMS` from `@/data/content/agent-resources`
3. Render a tabbed interface showing one category at a time — this needs to be a client component for tab switching
4. Each tab renders `<DocumentList categories={selectedForms} />`
5. Show document count per tab

Create an inline client component `DocumentTabs`:
```tsx
"use client";
import { useState } from "react";
import { DocumentList } from "@/components/content/document-list";
import type { ResourceCategory } from "@/data/content/agent-resources";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  count: number;
  categories: ResourceCategory[];
}

function DocumentTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0);
  // Tab bar + DocumentList for active tab
}
```

Or extract `DocumentTabs` to `src/app/dashboard/agent-hub/documents/document-tabs.tsx` if the file gets too long.

Follow dashboard styling patterns. Reuse the `AccessDenied` component (extract to a shared location like `src/components/dashboard/access-denied.tsx` if both pages need it).

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/dashboard/agent-hub/
git commit -m "feat: add agent Document Library dashboard page with tabbed categories"
```

---

### Task 5: Create the authenticated document API route

**Files:**
- Create: `src/app/api/documents/[...path]/route.ts`
- Move: `public/documents/office/` → `private/documents/office/`
- Move: `public/documents/listing/` → `private/documents/listing/`
- Move: `public/documents/sales/` → `private/documents/sales/`
- Modify: `src/data/content/agent-resources.ts`

**Step 1: Move PDFs to private directory**

```bash
mkdir -p private/documents
mv public/documents/office private/documents/office
mv public/documents/listing private/documents/listing
mv public/documents/sales private/documents/sales
```

Note: Keep `public/documents/listing/old/` and `public/documents/listing/originals/` where they are (user's working files).

**Step 2: Create the API route**

`src/app/api/documents/[...path]/route.ts`:

```tsx
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // 1. Authenticate
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check agent role
  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "agent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Resolve file path (prevent directory traversal)
  const { path: segments } = await params;
  const filePath = segments.join("/");

  // Security: block directory traversal
  if (filePath.includes("..") || filePath.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const fullPath = path.join(process.cwd(), "private", "documents", filePath);

  // Ensure resolved path is still within private/documents
  const documentsDir = path.join(process.cwd(), "private", "documents");
  if (!fullPath.startsWith(documentsDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // 4. Read and serve the file
  try {
    const fileBuffer = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    const fileName = path.basename(fullPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
```

**Step 3: Update document URLs in data file**

In `src/data/content/agent-resources.ts`, change all `/documents/...` URLs to `/api/documents/...`:

- `/documents/office/transaction-checklist.pdf` → `/api/documents/office/transaction-checklist.pdf`
- `/documents/listing/residential-data-entry.pdf` → `/api/documents/listing/residential-data-entry.pdf`
- etc.

Do a find-and-replace: `url: "/documents/` → `url: "/api/documents/`

Leave external URLs (the ones with `external: true`) unchanged.

**Step 4: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/api/documents/ private/documents/ src/data/content/agent-resources.ts
git commit -m "feat: add authenticated PDF serving API route and move documents to private directory"
```

---

## Phase 3: Navigation Cleanup & Build Verification

### Task 6: Remove Agent Resources from public navigation and archive pages

**Files:**
- Modify: `src/data/navigation.ts`
- Archive: `src/app/(marketing)/agent-resources/` → `archive/agent-resources-pages/`

**Step 1: Remove Agent Resources from NAV_ITEMS**

In `src/data/navigation.ts`, remove the entire "Agent Resources" entry (lines 97-122):

Delete this block:
```tsx
  {
    label: "Agent Resources",
    href: "/agent-resources",
    children: [
      ...
    ],
  },
```

**Step 2: Archive the public agent resources pages**

Per Rule 1 (never delete files), move to archive:

```bash
mkdir -p archive/agent-resources-pages
mv src/app/\(marketing\)/agent-resources archive/agent-resources-pages/
```

**Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 5: Run build**

Run: `npm run build`
Expected: Successful build. The `/agent-resources` routes should no longer appear. The `/dashboard/agent-hub` and `/dashboard/agent-hub/documents` routes should appear.

**Step 6: Commit**

```bash
git add src/data/navigation.ts archive/agent-resources-pages/
git commit -m "feat: remove Agent Resources from public nav and archive marketing pages"
```

---

### Task 7: Full build verification and visual testing

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Successful build

**Step 4: Visual verification**

Start dev server and check:
- Register page with `?code=HWAGENT2026` shows "Agent Registration" badge
- Register page without code shows normal registration
- Agent user sees "Agent Tools" section in dashboard sidebar
- Regular user does NOT see "Agent Tools" section
- `/dashboard/agent-hub` shows Resources Hub for agents
- `/dashboard/agent-hub` shows "Agent Access Required" for non-agents
- `/dashboard/agent-hub/documents` shows tabbed Document Library
- Document download links work through the API route
- Direct URL to `/api/documents/office/transaction-checklist.pdf` returns 401 when not logged in
- Direct URL to `/api/documents/office/transaction-checklist.pdf` returns 403 for non-agent users
- `/agent-resources` is no longer accessible (404)
- "Agent Resources" no longer appears in header/mobile nav
- Mobile responsive (375px, 768px, 1024px)

---

## File Inventory

**New files (4-5):**
- `src/app/dashboard/agent-hub/page.tsx` — Resources Hub page
- `src/app/dashboard/agent-hub/documents/page.tsx` — Document Library page
- `src/app/dashboard/agent-hub/documents/document-tabs.tsx` — Tab switching client component (if extracted)
- `src/app/api/documents/[...path]/route.ts` — Authenticated PDF API
- `src/components/dashboard/access-denied.tsx` — Shared access denied component (if extracted)

**Moved directories:**
- `public/documents/office/` → `private/documents/office/`
- `public/documents/listing/` → `private/documents/listing/`
- `public/documents/sales/` → `private/documents/sales/`

**Archived (4 files):**
- `src/app/(marketing)/agent-resources/page.tsx` → `archive/`
- `src/app/(marketing)/agent-resources/listing-forms/page.tsx` → `archive/`
- `src/app/(marketing)/agent-resources/sales-forms/page.tsx` → `archive/`
- `src/app/(marketing)/agent-resources/office-forms/page.tsx` → `archive/`

**Modified files (7):**
- `src/components/auth/register-form.tsx` — Accept inviteCode prop
- `src/app/(marketing)/register/page.tsx` — Read code param, show agent badge, pass to form
- `src/app/auth/callback/route.ts` — Assign agent role from invite code
- `src/app/api/auth/profile/route.ts` — Assign agent role from invite code
- `src/app/dashboard/layout.tsx` — Fetch role, pass to sidebar
- `src/components/dashboard/sidebar.tsx` — Role-aware agent tools section
- `src/data/navigation.ts` — Remove Agent Resources entry
- `src/data/content/agent-resources.ts` — Update URLs to API route

## Notes

- The `AGENT_INVITE_CODE` env variable is not committed to git (only `.env.example` has the placeholder)
- Use `frontend-design` skill for the dashboard pages to maintain visual quality
- Keep each page file under 450 LOC (per project rules)
- If `AccessDenied` is needed in both pages, extract to a shared component
- The `DocumentList` component is reused as-is — no modifications needed
- External document links (business cards site, SignPost) remain unchanged and are not served through the API
