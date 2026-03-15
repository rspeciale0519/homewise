# CLAUDE.md - Project Onboarding Guide

## PRIMARY RULES

### Rule 1: Never Delete Files or Folders

**CRITICAL:** Claude must NEVER delete files or folders from the codebase. Instead:

1. Create an `archive` folder at the root of the project (if it doesn't exist)
2. Move any files or folders that were intended to be deleted into the `archive` folder
3. This preserves history and allows easy recovery

### Rule 2: Context Window Management

Your context window will be automatically compacted as it approaches its limit. Never stop tasks early due to token budget concerns. Always complete tasks fully, even if the end of your budget is approaching.

### Rule 3: Development Server Awareness

Before running the dev server, check if it's already running on a port. Either use the currently running server or kill all running ports and restart - whichever is more effective for your current purposes.

### Rule 4: Browser Testing

Always use the Playwright MCP browser tools to test and check console errors.
Don't close the browser without explicit approval. Leave it open until you receive confirmation to close it.

### Rule 5: Temporary Documentation Location

All temporary markdown files created during tasks (working notes, intermediate outputs, scratch documents, task-specific artifacts) must be placed in `docs/temp/`. Do not create temporary `.md` files elsewhere in the project. Look in `docs/temp/` first when needing to reference task-related documents.

### Rule 6: Planning Mode File Requirements

**Location:** ALWAYS save plan files to the **project's** `.claude/plans/` folder.
- **CORRECT:** `{current-project-root}/.claude/plans/`
- **WRONG:** `/home/rob/.claude/plans/` (this is the WSL home directory - NEVER use this)

**Naming:** ALWAYS use descriptive `[type]-[subject].md` filenames. NEVER use random/creative names.

| CORRECT | WRONG |
|---------|-------|
| `feature-crm.md` | `sunny-purring-lynx.md` |
| `bugfix-email-validation.md` | `playful-jumping-rabbit.md` |
| `refactor-auth-flow.md` | `streamed-finding-pond.md` |

**Valid types:** `feature`, `bugfix`, `refactor`, `hotfix`, `security`, `docs`, `test`, `perf`

**CRITICAL - Git Integration:** The plan filename determines the Git branch name:
- Plan `feature-crm.md` → Branch `feature/crm`
- Plan `bugfix-email-validation.md` → Branch `bugfix/email-validation`

This naming enables automatic branch creation via Rule 9.

**Git Tracking:** ALWAYS stage and push plan files to the remote repo. All plans must be tracked in version control — never leave them as untracked local files.

### Rule 7: Update Development Roadmap

**TRIGGER:** After completing each phase of any plan, BEFORE running `/git-workflow-planning:checkpoint`.

---

#### Step 1: Locate the Roadmap File

Search the project's `docs/` folder for the roadmap file:
```bash
find docs/ -maxdepth 2 -type f -name "*.md" | xargs grep -l -i -E "(roadmap|todo|tasks)" | head -5
```

Common filenames:
- `docs/Development_Roadmap.md`
- `docs/Dev_Todo.md`
- `docs/Dev_Tasks.md`
- `docs/ROADMAP.md`

---

#### Step 2: Mark Completed Items

Change checkbox syntax from unchecked to checked for items completed in this phase:
```markdown
BEFORE: - [ ] Implement CRM pipeline feature
AFTER:  - [x] Implement CRM pipeline feature
```

---

#### Step 3: Verify and Confirm

1. Read the updated file to confirm changes are correct
2. Inform user: "Updated roadmap: marked [item description] as complete"

---

#### IF ROADMAP FILE NOT FOUND

Ask user:
> "I couldn't find a development roadmap file in `docs/`. Would you like me to:
> 1. Create one at `docs/Development_Roadmap.md`
> 2. Skip roadmap update for this task
> 3. Specify the correct file path"

---

#### INTEGRATION WITH RULE 9

```
[Phase N code complete]
        │
        ▼
┌─────────────────────────┐
│  UPDATE ROADMAP HERE    │  ← Rule 7
│  (before checkpoint)    │
└─────────────────────────┘
        │
        ▼
/git-workflow-planning:checkpoint N description
```

The roadmap update is included in each checkpoint commit, keeping progress tracked incrementally.

### Rule 8: Supabase Database Connectivity - Use Pooler, Not Direct Connection

**CRITICAL:** This project runs in WSL2 which has IPv6 enabled but NO IPv6 network connectivity. Direct database connections fail with ENETUNREACH.

**ALWAYS use Supabase Supavisor pooler for database connectivity:**

```bash
# .env.local MUST use these pooler hosts:
DATABASE_URL=postgresql://postgres.xrixrioaarbnpzjqzfsl:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres.xrixrioaarbnpzjqzfsl:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

**Key Points:**
- Pooler host is `aws-1-us-east-1.pooler.supabase.com` (NOT `aws-0`)
- Transaction mode (port 6543) for application queries
- Session mode (port 5432) for migrations and direct operations
- NEVER use `db.xrixrioaarbnpzjqzfsl.supabase.co` (direct connection) - it resolves IPv6-only and is unreachable

**Verification:** Run E2E seed to confirm: `npx tsx tests/e2e/fixtures/seed-e2e.ts`

### Rule 9: Git Workflow Integration in Planning Mode

**MANDATORY:** You MUST use these slash commands at the specified trigger points. No exceptions.

---

#### TRIGGER 1: Plan Approved (Before ANY Code Changes)

**IMMEDIATELY** execute:
```
/git-workflow-planning:start <type> <subject>
```

Extract `<type>` and `<subject>` from the plan filename:
- Plan `feature-crm-pipeline.md` → `/git-workflow-planning:start feature crm-pipeline`
- Plan `bugfix-login-error.md` → `/git-workflow-planning:start bugfix login-error`

**DO NOT write any code until this command completes successfully.**

---

#### TRIGGER 2: Phase Completed (After Each Phase)

1. **FIRST:** Update Development Roadmap per Rule 7 (mark completed items)
2. **THEN IMMEDIATELY** execute:
```
/git-workflow-planning:checkpoint <phase-number> <brief-description>
```

Examples:
- `/git-workflow-planning:checkpoint 1 implement data models`
- `/git-workflow-planning:checkpoint 2 build API endpoints`
- `/git-workflow-planning:checkpoint 3 create UI components`

**DO NOT proceed to the next phase until checkpoint completes successfully.**

---

#### TRIGGER 3: Final Phase Completed (After Last Checkpoint)

**IMMEDIATELY** execute:
```
/git-workflow-planning:finish
```

This creates the PR, asks before merging, and handles branch cleanup.

---

#### IF CHECKPOINT FAILS (Type-Check or Lint Errors)

1. **STOP** - Do not proceed
2. Fix all reported errors
3. Re-run the same checkpoint command: `/git-workflow-planning:checkpoint <same-phase> <same-description>`
4. Repeat until checkpoint succeeds
5. Only then proceed to next phase

---

#### RESUMING WORK IN A NEW SESSION

When returning to an in-progress plan:
1. Read the plan file from the project's `.claude/plans/` folder
2. Run `/git-workflow-planning:start <type> <subject>` - it will switch to the existing branch
3. Run `git log --oneline -10` to identify completed phases
4. Resume from the next incomplete phase

---

#### COMMAND SELECTION GUIDE

| Scenario | Command to Use |
|----------|----------------|
| Working on a multi-phase plan | `/git-workflow-planning:start`, `checkpoint`, `finish` |
| Quick one-off commit (no plan) | `/commit-commands:commit` |
| Standalone feature branch (no plan) | `/git-workflow:feature <name>` |

---

#### WORKFLOW VISUALIZATION

```
Plan Approved
      │
      ▼
/git-workflow-planning:start feature crm
      │
      ▼
[Write Phase 1 Code]
      │
      ▼
Update Roadmap (Rule 7)
      │
      ▼
/git-workflow-planning:checkpoint 1 data models
      │
      ▼
[Write Phase 2 Code]
      │
      ▼
Update Roadmap (Rule 7)
      │
      ▼
/git-workflow-planning:checkpoint 2 API endpoints
      │
      ▼
[Write Phase 3 Code]
      │
      ▼
Update Roadmap (Rule 7)
      │
      ▼
/git-workflow-planning:checkpoint 3 UI components
      │
      ▼
/git-workflow-planning:finish
      │
      ▼
Done
```

---

#### SINGLE-PHASE PLANS

For plans with only 1 phase, ask the user:
> "This is a single-phase plan. Should I create a feature branch, or work directly on develop?"

If user chooses branch: run `/git-workflow-planning:start`, then `checkpoint 1`, then `finish`.
If user chooses develop: use `/commit-commands:commit` when complete.

---

## TOOL & AGENT SELECTION GUIDE

Use this section to determine which tools and agents to invoke for specific tasks:

### Frontend Development

- **UI/UX Design & Component Building:** Primarily use `Skill: frontend-design` or secondarily use `Task: nextjs-vercel-pro:frontend-developer`
- **React Performance Issues:** Use `Task: react-performance-optimization`
- **Component Code Review:** Use `Task: frontend-coder`
- **Responsive Design & Accessibility:** Use `Task: nextjs-vercel-pro:frontend-developer`

### Backend Development

- **API Design & Architecture:** Use `Task: backend-architect` or `Task: nextjs-vercel-pro:fullstack-developer`
- **Backend Functionality Verification:** Use `Task: backend-coder`
- **API Security Audits:** Use `Task: api-security-audit`
- **API Documentation:** Use `Task: api-documenter`

### Database & Data

- **Database Schema Design:** Use `Task: supabase-schema-architect`
- **Query Optimization:** Use `Task: database-optimization`
- **Database Architecture Decisions:** Use `Task: database-architect`
- **Data Analysis & Modeling:** Use `Task: supabase-toolkit:data-scientist`
- **ETL/Data Pipelines:** Use `Task: supabase-toolkit:data-engineer`

### Testing & QA

- **Test Strategy & Automation:** Use `Task: testing-suite:test-engineer`
- **Generate Test Suites:** Use `Task: test-automator` or Slash Command `/testing-suite:generate-tests`
- **Coverage Analysis:** Use `Task: testing-suite:test-engineer` or Slash Command `/testing-suite:test-coverage`
- **E2E Testing Setup:** Use Slash Command `/testing-suite:e2e-setup`
- **Visual Regression Testing:** Use Slash Command `/testing-suite:setup-visual-testing`
- **Load Testing:** Use Slash Command `/testing-suite:setup-load-testing`

### Security

- **Code Vulnerability Review:** Use `Task: security-pro:security-auditor`
- **Dependency Vulnerability Scanning:** Use Slash Command `/security-pro:dependency-audit`
- **Full Security Audit:** Use Slash Command `/security-pro:security-audit`
- **Smart Contract Security:** Use `Task: smart-contract-auditor`
- **Penetration Testing:** Use `Task: security-pro:penetration-tester`

### Performance & Optimization

- **Performance Profiling:** Use `Task: performance-optimizer:performance-engineer`
- **Load Testing & Stress Testing:** Use `Task: performance-optimizer:load-testing-specialist`
- **Lighthouse & Performance Audit:** Use Slash Command `/performance-optimizer:performance-audit`

### DevOps & Deployment

- **CI/CD Setup & Automation:** Use `Task: deployment-engineer` or `Task: devops-engineer`
- **Cloud Infrastructure:** Use `Task: devops-automation:cloud-architect`
- **Production Troubleshooting:** Use `Task: devops-troubleshooter`
- **Vercel Deployment:** Use `Task: nextjs-vercel-pro:fullstack-developer` or Slash Command `/nextjs-vercel-pro:vercel-deploy-optimize`

### Git & Version Control

**Branch Strategy:**

- `main` - Production branch, stable releases only
- `staging` - Pre-production testing
- `develop` - Active development (default working branch)

**Workflow:**

1. Daily work happens on `develop`
2. Feature branches branch off `develop` and merge back via PR
3. `develop` → `staging` for testing
4. `staging` → `main` for production releases

**Always commit to `develop` unless specifically deploying to staging/production.**

- **Git Flow Feature Branch:** Use Slash Command `/git-workflow:feature <name>`
- **Git Flow Release:** Use Slash Command `/git-workflow:release <version>`
- **Git Flow Hotfix:** Use Slash Command `/git-workflow:hotfix <name>`
- **Complete Git Flow:** Use Slash Command `/git-workflow:finish`
- **Git Flow Status:** Use Slash Command `/git-workflow:flow-status`

### Documentation

- **Technical Writing:** Use `Task: documentation-generator:technical-writer`
- **Update Project Documentation:** Use Slash Command `/documentation-generator:update-docs`
- **Docusaurus Sites:** Use `Task: documentation-generator:docusaurus-expert`

### Code Quality & Review

- **General Code Review:** Use `Task: code-reviewer`
- **Architecture Review:** Use `Task: architect-reviewer`
- **Unused Code Cleanup:** Use `Task: unused-code-cleaner`

### Research & Analysis

- **Codebase Exploration:** Use `Task: Explore` (quick codebase searches)
- **Deep Technical Research:** Use `Task: comprehensive-researcher`
- **Current Tech Information:** Use `Task: researcher`
- **Competitive Intelligence:** Use `Task: competitive-intelligence-analyst`
- **Market Research:** Use `Task: market-research-analyst`

### Planning & Architecture

- **Implementation Planning:** Use `Task: Plan`
- **Product Strategy:** Use `Task: project-management-suite:product-strategist`
- **MVP Scoping:** Use `Skill: launch-planner`

### AI/ML & Advanced Features

- **LLM Integration & RAG:** Use `Task: ai-ml-toolkit:ai-engineer`
- **ML Production Systems:** Use `Task: ai-ml-toolkit:ml-engineer`
- **NLP Tasks:** Use `Task: ai-ml-toolkit:nlp-engineer`
- **Computer Vision:** Use `Task: ai-ml-toolkit:computer-vision-engineer`
- **MLOps:** Use `Task: ai-ml-toolkit:mlops-engineer`

### Content & Marketing

- **Landing Page Copy:** Use `Task: content-writer`
- **Blog Posts & SEO:** Use `Task: content-marketer`
- **Marketing Design:** Use `Skill: launch-planner` or `Skill: design-guide`

### Specialized Domains

- **Web3/Blockchain Frontend:** Use `Task: web3-integration-specialist`
- **Smart Contract Development:** Use `Task: smart-contract-specialist`
- **Mobile Development:** Use `Task: mobile-developer` or `Task: ios-developer`
- **Game Development:** Use `Task: unity-game-developer` or `Task: unreal-engine-developer`
- **Audio Processing:** Use `Task: audio-mixer` or `Task: audio-quality-controller`
- **Video Editing:** Use `Task: video-editor`

---

## PROJECT CONTEXT

### Important Patterns

- Use TypeScript strict mode everywhere - no `any` types
- Zod schemas for all API validation boundaries
- **Source code files** must not exceed 450 lines of code (non-negotiable)
  - **EXCEPTION:** Documentation files (`*.md`) are exempt from the 450 LOC limit
  - This allows comprehensive documentation while keeping source code modular
- Follow existing code patterns (don't add explanatory comments)
- Tests co-located with source files using `.test.ts` suffix
- Use Prisma for all database operations
- Use Server Components by default, Client Components when needed
- API routes follow RESTful conventions

---

## VERIFICATION & TESTING

### How to Verify Changes

1. **TypeScript:** Run `npm run type-check` in the relevant workspace
2. **Linting:** Run `npm run lint` to check code quality
3. **Tests:** Run `npm run test` to execute test suites
4. **Build:** Run `npm run build` to verify compilation
5. **E2E Testing:** Use Playwright via the browser testing tools

### Running Commands

- All npm commands are run from the project root
- Check if dev servers are already running before starting new ones
- Use the Playwright MCP for browser-based testing and verification
- `npm run dev` starts Next.js development server (default: http://localhost:3000)

---

## CLAUDE CODE SPECIFIC

### When to Use Progressive Disclosure

If you encounter task-specific instructions that don't fit in this file, ask the user to provide them via separate markdown files in an `agent_docs/` folder. Reference file locations instead of including code snippets.

### Instruction Following

This CLAUDE.md file is intentionally concise to maximize instruction-following quality. The system prompt already contains ~50 instructions. Additional context is loaded as needed through tool use.

### Context Preservation

When working on complex tasks, use the TodoWrite tool frequently to track progress and maintain context across tool calls.
