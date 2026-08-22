# Lab Report Portal — Planner

A closed, invite-only web portal for the IITK SSA lab course. 29 students submit PDF
lab reports across 3 labs (X-Ray, Radio Astronomy, Optics); TAs comment per-lab; the
Supervisor grades across all labs; an Admin manages the roster and system. Nobody
self-registers — access is limited to a fixed roster of 33 people, authenticated via
OTP (no passwords, except Admin).

This file is the phased build plan. `CLAUDE.md` is the technical reference (schema,
auth flow, non-negotiable rules) — read that first, this file sequences the work.

---

## 1. Roles & Permission Matrix

| Capability                                   | Student            | TA               | Supervisor    | Admin  |
|-----------------------------------------------|--------------------|-------------------|----------------|--------|
| Login method                                  | Roll No. or Email + OTP | Email + OTP  | Email + OTP    | Email + Password + OTP |
| Upload / reupload own reports                 | ✅ (until locked)  | —                 | —              | —      |
| View own upload history & timestamps          | ✅                 | —                 | —              | —      |
| View comments on own reports                  | ✅ (read-only)     | —                 | —              | —      |
| View marks                                    | ❌ never           | ❌ never          | ✅ enter/edit  | ✅ view |
| View reports                                  | own only           | own lab only      | all 3 labs     | all    |
| Comment on reports                             | —                  | ✅ (own lab)      | ✅ (any lab)   | view-only |
| Set / edit experiment deadlines               | —                  | ✅ (own lab)      | view-only      | ✅ (override any) |
| Rename experiments (own lab)                  | —                  | ✅ (own lab)      | —              | ✅ (any lab) |
| Unlock a marks-locked submission for reupload | —                  | —                 | —              | ✅ (only path) |
| Manage roster (add/edit/remove, CSV import)   | —                  | —                 | —              | ✅     |
| Add / remove / reorder labs & experiments     | —                  | —                 | —              | ✅     |
| Assign TA ↔ lab mapping                       | —                  | —                 | —              | ✅     |
| Export marks CSV                              | —                  | —                 | ✅             | ✅     |
| View audit log                                | —                  | —                 | —              | ✅     |

---

## 2. Explicitly Out of Scope (v1)

- Group/batch/rotation tracking — any student can submit to any lab/experiment any time;
  the system does not need to know the 9/9/10 rotation grouping.
- Email notifications beyond OTP (no "you got a comment" emails).
- Threaded replies to comments — one-directional, TA/Supervisor → student.
- Inline PDF annotation — comments are freeform text attached to the report, not
  markup on the PDF itself.
- `.docx` upload — PDF only, decided for simplicity (native browser preview via pdf.js).
- Any public sign-up flow. The roster is the only way in.

---

## 3. Confirmed Decisions (previously flagged, now settled)

1. **Admin email:** `bahniman.rkm@gmail.com` — confirmed correct, a real gmail address,
   not a typo. This is the address used for `ADMIN_EMAIL` and where the Admin OTP is sent.
2. **Comment permissions:** both TAs (own lab) and the Supervisor (any lab) can comment.
   Only the Supervisor enters marks.
3. **Deadline editing:** TA sets/edits deadlines for their own lab; Admin can override
   any deadline; Supervisor has read-only visibility (for context when reviewing late
   flags) but can't edit deadlines.

---

## 4. Tech Stack (final)

- **Framework:** Next.js (App Router, TypeScript) — one codebase for both UIs
- **ORM:** Prisma
- **Database:** Postgres on **Neon** (free tier)
- **File storage:** **Cloudflare R2** (primary) + **Backblaze B2** (backup mirror,
  auto-synced every 7 days)
- **Email/OTP:** **Brevo**
- **Hosting:** **Vercel** (free/hobby tier), including Vercel Cron for the backup job
- **Uptime monitoring:** **UptimeRobot**
- **Auth:** fully custom — no third-party auth provider. OTP-based for Student/TA/
  Supervisor; Password+OTP for Admin. Stateless JWT session cookie, 7-day expiry.

---

## 5. Build Phases

### Phase 0 — Scaffolding
- `next` + TypeScript project init, repo structure, `.env.example`
- Package management: **npm, no virtual environment** — this is a Node.js project, not
  Python. `node_modules` is already project-scoped by default. Commit `package-lock.json`
  for reproducible installs; add an `.nvmrc` pinning the Node version so everyone (and
  every deploy) runs the same runtime — that's the actual Node equivalent of what a
  venv gives you in Python.
- Public landing page at `/` — what the portal is, who it's for, a "Login" button.
  Unauthenticated visitors see this; only *logged-in* users get redirected to their
  role's dashboard (student/staff/admin). Build it against `CLAUDE.md` §Design System
  — full expression of the design tokens here (this is the one place the brand gets
  to be bold). The `frontend-design` Claude Code plugin should be active for this step.
- `.gitignore` must exclude the **real** roster data before the first commit —
  `/seed/students.csv` and `/seed/staff.json` contain real names, emails, and roll
  numbers and must never enter git history, even in a private repo. Generate
  `/seed/students.example.csv` and `/seed/staff.example.json` with fake placeholder
  rows in the same format, and commit those instead — that's what a future maintainer
  reads to understand the expected shape. `/seed/labs.json` has no PII and can be
  committed as-is.
- Prisma initialized, pointed at a Neon connection string
- Deploy to Vercel first (landing page + empty auth shell), to prove the full pipeline
  (repo → Vercel → Neon) works before deeper feature code is written
- `CLAUDE.md` and this `planner.md` committed at repo root

### Phase 1 — Data model & seeding
- Full Prisma schema (see `CLAUDE.md` §Data Model) migrated to Neon
- Seed script that imports `/seed/students.csv`, `/seed/staff.json`, `/seed/labs.json`
- `/seed/labs.json` ships with placeholder experiment names (2 X-Ray, 4 RA, 3 Optics) —
  not a blocker, since each TA can rename the experiments in their own lab from their
  dashboard (Phase 4) once real titles are decided

### Phase 2 — Authentication
- OTP generation, hashing (never store plaintext), 3-min expiry, attempt tracking
- Roll number / email lookup with role resolution
- Brevo integration for sending OTP mails
- Resend cooldown (60s), rate limits (5 requests/hr per email, 10/hr per IP)
- Lockout after 5 wrong attempts, auto-clears after 30 min — no manual unlock needed
  for this specific lockout (that's separate from the Admin reupload-unlock in Phase 6)
- Admin auth as a distinct flow: password check against env var, then OTP
- JWT session issuance (7-day expiry), role-aware middleware on every route

### Phase 3 — Student flow
- Lab → Experiment selector
- UI follows `CLAUDE.md` §Design System, restrained application (see "Application by
  Surface") — same tokens as the landing page, functional and data-first, not
  marketing-styled. This applies to every dashboard from here on (Phases 3–6);
  not repeated in each phase below.
- Upload / reupload (PDF only, 30MB cap) to R2, enforcing "only first + latest file
  ever retained" (see `CLAUDE.md` §File Storage Rules)
- Upload-event history log (every upload timestamped, independent of file retention)
- Late flag computed once, at first-submission time, and frozen permanently
- Read-only view of comments on own reports
- Reupload blocked once `marksLocked = true` on that submission, with a clear message
  explaining why (not a silent failure)

### Phase 4 — TA dashboard
- Scoped strictly to the TA's one assigned lab (server-enforced, not just UI-hidden)
- Table: students × experiments in that lab, submission status, on-time/late
- View first + latest file, view full upload-event history
- Add freeform, timestamped comments (accumulate as a log, don't overwrite)
- Set / edit deadlines for experiments in their lab
- Rename the experiment titles in their lab — adding, removing, or reordering
  experiments stays Admin-only

### Phase 5 — Supervisor dashboard
- Visibility across all 3 labs
- Enter / edit marks (0–10) per report — never exposed to TA or Student views/APIs
- Optional comments, same freeform log as TAs
- CSV export: Roll Number, Name, Lab, Experiment, Marks, On-time/Late,
  First Submitted At, Last Updated At

### Phase 6 — Admin panel
- Roster CRUD + CSV bulk import matching `/seed/students.csv` format
- Lab / Experiment management (add, edit, reorder)
- TA ↔ Lab assignment
- Deadline override for any lab
- Manual "unlock reupload" action on any marks-locked submission (writes to audit log)
- Full read access: all comments, all marks, all history
- Audit log view

### Phase 7 — Backup, monitoring, hardening
- Vercel Cron job, weekly, mirrors the R2 bucket to Backblaze B2
- UptimeRobot check pointed at the production URL
- Load-test / abuse-test the OTP endpoints against the stated rate limits
- Error pages, loading states, mobile responsiveness pass (students will use phones)
- Full QA pass against the permission matrix in §1 — log in as each role and verify
  every boundary (a TA from one lab cannot see another lab's reports, a student cannot
  see marks via direct API call, etc.)

### Phase 8 — Go-live
- Real roster confirmed and imported (not placeholder/test data)
- All secrets (Admin password hash, JWT secret, API keys) set as Vercel production
  environment variables — never committed to the repo
- End-to-end smoke test with one real TA and one real student before wide rollout
- Old test/dummy submissions purged from Neon + R2 before real students start using it

---

## 6. Data Handed Off With This Plan

- `/seed/students.csv` — 29 students (name, roll_number, email) as of today. Expected
  to change over the semester (drops/adds) — that's what the Admin roster CRUD in
  Phase 6 is for, this file is only the initial seed.
- `/seed/staff.json` — 3 TAs + 1 Supervisor, with lab assignments
- `/seed/labs.json` — 3 labs, 9 experiments, placeholder names — TAs rename them from
  their own dashboard whenever the real titles are ready (Phase 4)