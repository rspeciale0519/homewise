# Training Hub v2 — Compliance Teeth, Certificates, Quizzes

Second branch in the Training Hub roadmap. v1 (see
`feature-training-hub-v1.md`) shipped the credible foundation: three-level
Course → Section → Content hierarchy, Tiptap block editor, category entities,
status lifecycle, bulk admin actions, curriculum builder, agent course player,
and the public `/learn` SEO surface. v1 deliberately shipped several **unused
columns** so v2 needs no schema migration to start enforcing them.

Goal of v2: turn the Training Hub from a content/course system into a real
**compliance LMS** — graded quizzes, completion criteria that actually mean
something, drip scheduling, due dates, recurring annual training, and
certificates agents can show a broker.

## Columns already shipped in v1 that v2 activates

These exist in the schema today (added by the v1 migration) and are currently
inert — v2 wires runtime behavior onto them, so no migration is needed for them:

- `TrainingCourse.passThreshold Int @default(80)` — quiz pass mark.
- `TrainingCourse.dueDays Int?` — days after enrollment a course is "due".
- `TrainingCourse.recurDays Int?` — re-enrollment interval for annual training.
- `TrainingSection.dripDays Int?` — days after enrollment a section unlocks.
- Auto-enroll switch already exists in the course drawer UI (currently a no-op
  toggle) — v2 makes it functional.

## Locked architectural decisions

1. **Quizzes are first-class content, not a separate system.** The
   `TrainingContent.type = "quiz"` value already exists; v2 adds the
   question/answer entities behind it. A quiz is a Content row like any other,
   so it slots into Sections and the curriculum builder unchanged.
2. **Completion becomes criteria-driven, not manual.** v1 used a universal
   manual "Mark complete". v2 introduces a per-content-type completion rule;
   manual remains the fallback for `link`/`article` where no signal exists.
3. **Certificates are generated artifacts, not just DB rows.** Issue a row on
   course completion AND render a downloadable PDF (reuse the existing PDF
   export/flatten pipeline — print/email flatten, download stays editable per
   the established policy).
4. **Drip & due dates are computed at read time** from enrollment date +
   `dripDays`/`dueDays`, not materialized — avoids a scheduler for v2.
   Recurring re-enrollment (`recurDays`) DOES need a scheduled job.

## New entities (Prisma)

**New**
- `TrainingQuizQuestion { id, contentId (FK→TrainingContent), prompt, type
  (single_choice|multi_choice|true_false), explanation?, sortOrder, points
  @default(1), createdAt }`
- `TrainingQuizOption { id, questionId (FK), label, isCorrect Boolean,
  sortOrder }`
- `TrainingQuizAttempt { id, contentId, userId, enrollmentId?, score Int,
  passed Boolean, answers Json, startedAt, submittedAt }`
- `TrainingCertificate { id, courseId, userId, enrollmentId, serial @unique,
  issuedAt, pdfUrl?, revokedAt? }`

**Modified**
- `TrainingContent`:
  - `completionRule: TrainingCompletionRule` enum
    (`manual | view | video_percent | quiz_pass | download`), default `manual`.
  - `videoCompletePercent Int?` — when `completionRule = video_percent`.
  - **DROP** the legacy `category` string column (v1 kept it one release for
    safety; `categoryId` FK is now authoritative). Verify no code path still
    reads the string before dropping.
- `TrainingEnrollment` (existing):
  - `dueAt: DateTime?` — computed + stored at enrollment from course `dueDays`.
  - `unlockedSectionIds` handled at read time (no column).
  - `certificateId: String?` (FK) once issued.

**Enums (new)**
- `TrainingCompletionRule { manual, view, video_percent, quiz_pass, download }`

## Phased build sequence

Each phase ends in a checkpoint commit (type-check + lint + tests pass).

### Phase 1 — Schema + migration
- New quiz/certificate entities, `completionRule` + `videoCompletePercent` on
  Content, `dueAt`/`certificateId` on Enrollment.
- Drop legacy `TrainingContent.category` string (guarded — grep all readers
  first; the v1 plan explicitly deferred this drop to v2).
- Backfill: set `completionRule` from existing `type`
  (video→`video_percent`@80, quiz→`quiz_pass`, doc→`download`, else `manual`).
- Unit tests for backfill helpers.

### Phase 2 — Quiz authoring (admin)
- Quiz editor inside the Content drawer when `type = quiz`: add/reorder
  questions, options, mark correct answer(s), set points + pass explanation.
- Reuse dnd-kit sortable patterns from the curriculum builder.
- Zod validation: at least one correct option per question; `passThreshold`
  reachable.
- API: `/api/admin/training/[id]/quiz` GET/PUT (atomic rebuild like the
  curriculum endpoint).
- Tests: validation, atomic rebuild, auth gate.

### Phase 3 — Quiz player + grading (agent)
- Quiz-taking UI in the course player: render questions, capture answers,
  submit → grade server-side → `TrainingQuizAttempt` row.
- Pass/fail against `course.passThreshold`; show score + per-question review
  with explanations; allow retry.
- Completion of a quiz item gated on `passed = true`.
- Tests: grading math, pass/fail boundary, retry, multi-choice partial credit.

### Phase 4 — Completion criteria engine
- Replace universal manual "Mark complete" with `completionRule` dispatch:
  - `view` — mark on item open (existing behavior for articles).
  - `video_percent` — track YouTube playback % to `videoCompletePercent`.
  - `quiz_pass` — from Phase 3.
  - `download` — mark on document download/open.
  - `manual` — keep the button as fallback.
- Course % recomputes from criteria-satisfied items.
- Tests: each rule path, mixed-rule course rollup.

### Phase 5 — Drip + due dates + auto-enroll
- Section unlock computed from `enrollment.startedAt + section.dripDays`;
  locked sections render with unlock date.
- `dueAt` stored at enrollment from `course.dueDays`; due/overdue badges on
  agent dashboard + admin progress tab.
- Make the auto-enroll toggle functional: enroll matching agents on course
  publish (scope by audience).
- Tests: drip date math, due/overdue states, auto-enroll selection.

### Phase 6 — Recurring annual training (scheduled job)
- Background job (existing jobs infra under `/admin/jobs`): for courses with
  `recurDays`, re-enroll agents whose last completion is older than
  `recurDays`; reset progress, issue fresh `dueAt`.
- Idempotent; safe to run daily.
- Tests: re-enrollment window, idempotency, no double-enroll.

### Phase 7 — Certificates
- On course completion (100% criteria satisfied), issue `TrainingCertificate`
  with unique serial; render PDF (reuse export/flatten pipeline — download
  editable, print/email flattened).
- Agent: "Download certificate" on completed course; cert list on profile.
- Admin: revoke certificate (sets `revokedAt`); revoked certs show invalid.
- Tests: issue-once guard, serial uniqueness, revoke flow.

### Phase 8 — Verify + E2E
- `npm run type-check`, `npm run lint`, `npx vitest run`.
- chrome-devtools E2E (desktop + 390×844 mobile):
  - Admin: author a quiz → set pass threshold → publish.
  - Agent: take quiz → fail → retry → pass → section unlocks via drip →
    complete course → download certificate.
  - Admin: verify progress/overdue badges; revoke a certificate.
- Vercel production verification.

## Reused utilities
- dnd-kit sortables (quiz question ordering) — same as curriculum builder.
- PDF export/flatten pipeline (certificates).
- Background jobs infra at `/admin/jobs` (recurring re-enrollment).
- `ConfirmDialog`, `adminFetch`, `useToast`, Zod request validation.

## Out of scope for v2 (→ v3)
- Discussions, notes, bookmarks, internal-link references.
- Content versioning / history.
- Postgres full-text search.
- Analytics dashboard.

## Out of scope indefinitely
- SCORM / xAPI, AI quiz generation, live cohorts, native mobile app, public
  (non-agent) accounts/login.
