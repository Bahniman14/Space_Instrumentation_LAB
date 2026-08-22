# CLAUDE.md

Technical reference for this project. Read this fully before writing code, and treat
§2 (Non-Negotiable Rules) as hard constraints — not defaults to optimize away under
time pressure. `planner.md` sequences the work; this file is the ground truth for how
each piece must behave.

## 1. What This Is

A closed lab-report submission portal for an IITK course. 29 students, 3 TAs, 1
Supervisor, 1 Admin — a fixed roster, no public sign-up. Students upload PDF reports
per lab experiment; TAs and the Supervisor leave comments; the Supervisor grades;
the Admin runs the system. Zero budget — every service used must have a real free
tier that this scale (33 users, low traffic) will never exceed.

## 2. Non-Negotiable Rules

- **PDF only, 30MB max.** Validate and reject server-side — never trust client-side
  validation alone.
- **Never store OTP codes in plaintext.** Hash before storing (same treatment as a
  password), compare hashed values on verify.
- **Only two files ever live per submission: `first` and `latest`.** On the 3rd+
  upload for a given submission, delete the previous `latest` object from R2 *before*
  writing the new one. `first` is never touched again after the initial upload. The
  `UploadEvent` log still records every upload attempt/timestamp regardless of whether
  the file itself survives.
- **`isLate` is computed once, at first-submission time, and frozen forever.** Store
  the deadline value that was active at that moment directly on the submission
  (`deadlineSnapshotAt`). If a TA edits the experiment's deadline later, it must never
  retroactively change any existing submission's late status — it only affects
  submissions made after the edit.
- **Reupload lock.** Once a `Mark` row exists for a submission, set `marksLocked = true`
  and reject further uploads for that submission with a clear explanatory error. The
  *only* way to lift this is the Admin's manual unlock action — this must write an
  `AuditLog` entry (who, when, which submission).
- **Marks visibility is a server-side rule, not a UI rule.** Any API route that returns
  submission data to a Student or TA session must strip the `Mark` relation entirely —
  do not rely on the frontend simply not rendering it.
- **Comment visibility:** a student sees comments on their own reports only; a TA sees
  comments (and can post) only on reports within their assigned lab; the Supervisor
  sees and can post on all labs. Enforce lab-scoping for TAs at the query layer.
- **No email notifications beyond OTP.** Do not build any "you got a comment" /
  "deadline approaching" email system — explicitly out of scope.
- **Admin credentials never touch the database.** `ADMIN_EMAIL` and
  `ADMIN_PASSWORD_HASH` are environment variables only. There is no `Admin` row in the
  `User` table, and no UI path can create, view, or edit them. Changing the Admin
  password means updating the Vercel env var and redeploying.
- **No third-party auth providers.** No NextAuth social login, no Clerk, no Auth0 —
  the OTP/password flow described in §4 is the entire auth system.
- **No Python, no virtual environment.** This is a Node.js/TypeScript project end to
  end — `npm` and `node_modules` (already project-scoped by default). Use `.nvmrc` to
  pin the Node version and commit `package-lock.json` for reproducible installs;
  do not create a `venv/` or any Python tooling.
- **`/` is a public landing page**, not gated — visible to anyone, unauthenticated.
  It explains the portal and has a Login button. Only authenticated sessions get
  redirected onward to `/student`, `/staff`, or `/admin`.
- **Rejected/wrong login attempts must not leak roster info** beyond what's specified
  in §4 — e.g. don't reveal whether an email exists but the roll number doesn't vs.
  the email not existing at all, beyond the two specified error messages.

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| ORM | Prisma |
| Database | Postgres on Neon (free tier) |
| Primary file storage | Cloudflare R2 (S3-compatible SDK) |
| Backup file storage | Backblaze B2 (S3-compatible), weekly mirror of R2 |
| Email (OTP only) | Brevo |
| Hosting | Vercel (free/hobby tier) |
| Scheduled jobs | Vercel Cron |
| Uptime monitoring | UptimeRobot (external, not part of the app) |
| Sessions | Stateless JWT in an HTTP-only cookie, 7-day expiry |
| Password hashing (Admin only) | bcrypt |
| OTP hashing | bcrypt or equivalent — same treatment as a password |

## 4. Auth Flows

### 4.1 Student / TA / Supervisor (OTP only, no password)

1. User submits an identifier — **students** may enter roll number *or* email;
   **TA/Supervisor** must enter email.
2. Server looks up the identifier against the `User` table:
   - Email not found on roster → `"Enter Correct Email"`
   - Roll number not found / doesn't match a registered student → `"This Roll Number
     isn't enrolled in this course"` (cleaning up the originally-specified copy —
     swap back if the exact original wording is wanted)
3. On a valid match: generate a 6-digit numeric OTP, hash it, store an `OtpCode` row
   (`purpose = "login"`, `expiresAt = now + 3min`), send via Brevo.
4. **Resend:** 60-second cooldown between requests.
5. **Rate limits:** max 5 OTP requests/hour per email, max 10/hour per IP.
6. **Verification:** max 5 wrong attempts per OTP. On the 5th wrong attempt, lock
   further attempts for that identifier for 30 minutes (auto-expires — no manual
   unlock needed for this specific case).
7. On correct OTP: issue a JWT session cookie (7-day expiry) containing `userId`,
   `role`, and (for TAs) `assignedLabId`.

### 4.2 Admin (Password + OTP)

1. Admin submits email + password.
2. Server compares against `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` env vars (bcrypt).
3. On match, same OTP mechanism as above (`purpose = "admin_login"`), sent to
   `ADMIN_EMAIL`.
4. On correct OTP: issue a JWT session with `role = ADMIN`.
5. There is exactly one Admin account. It is not stored in the roster and cannot be
   created, edited, or viewed through any application UI.

## 5. Data Model (Prisma schema — implement as-is, extend only if a gap is found)

```prisma
enum Role {
  STUDENT
  TA
  SUPERVISOR
}
// Admin is NOT a Role value and NOT a User row — see §4.2

model User {
  id             String       @id @default(cuid())
  role           Role
  name           String
  email          String       @unique
  rollNumber     String?      @unique   // students only
  assignedLabId  String?                // TAs only
  assignedLab    Lab?         @relation(fields: [assignedLabId], references: [id])
  submissions    Submission[]           // students only, via studentId
  comments       Comment[]
  marks          Mark[]
  createdAt      DateTime     @default(now())
}

model Lab {
  id          String       @id @default(cuid())
  name        String       @unique   // "X-Ray" | "Radio Astronomy" | "Optics"
  experiments Experiment[]
  tas         User[]
}

model Experiment {
  id             String       @id @default(cuid())
  labId          String
  lab            Lab          @relation(fields: [labId], references: [id])
  name           String
  orderIndex     Int
  deadlineAt     DateTime?
  deadlineSetBy  String?                // TA userId who last set it
  submissions    Submission[]
}

model Submission {
  id                  String        @id @default(cuid())
  studentId           String
  student             User          @relation(fields: [studentId], references: [id])
  experimentId        String
  experiment          Experiment    @relation(fields: [experimentId], references: [id])

  firstFileKey        String?
  firstFileName       String?
  firstUploadedAt     DateTime?

  latestFileKey       String?
  latestFileName      String?
  latestUploadedAt    DateTime?

  isLate              Boolean?
  deadlineSnapshotAt  DateTime?        // deadline value at moment of first submission

  marksLocked         Boolean       @default(false)

  uploadEvents        UploadEvent[]
  comments            Comment[]
  mark                Mark?

  @@unique([studentId, experimentId])
}

model UploadEvent {
  id            String     @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id])
  uploadedAt    DateTime   @default(now())
  fileName      String
}

model Comment {
  id            String     @id @default(cuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id])
  authorId      String
  author        User       @relation(fields: [authorId], references: [id])
  authorRole    Role                // TA or SUPERVISOR
  body          String
  createdAt     DateTime   @default(now())
}

model Mark {
  id            String     @id @default(cuid())
  submissionId  String     @unique
  submission    Submission @relation(fields: [submissionId], references: [id])
  score         Decimal    // 0–10
  enteredById   String
  enteredBy     User       @relation(fields: [enteredById], references: [id])
  updatedAt     DateTime   @updatedAt
}

model OtpCode {
  id            String     @id @default(cuid())
  identifier    String              // email the OTP was sent to
  codeHash      String
  purpose       String              // "login" | "admin_login"
  attemptCount  Int        @default(0)
  expiresAt     DateTime
  lockedUntil   DateTime?
  createdAt     DateTime   @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  actor      String            // "admin" (only actor for now)
  action     String            // e.g. "unlock_submission", "edit_roster", "override_deadline"
  target     String?           // e.g. submissionId or userId affected
  createdAt  DateTime @default(now())
}
```

## 6. File Storage Rules

- Object key convention: `{labSlug}/{experimentSlug}/{rollNumber}/{first|latest}.pdf`
- On upload:
  - If no `firstFileKey` exists yet → this is the first submission. Compute `isLate`
    against the experiment's current `deadlineAt`, store `deadlineSnapshotAt`, write
    to the `first` slot.
  - If `firstFileKey` already exists → this is a reupload. Delete the existing
    `latest` object from R2 (if present), upload the new file to the `latest` slot,
    update `latestFileKey`/`latestFileName`/`latestUploadedAt`. Do **not** touch
    `isLate` or `deadlineSnapshotAt`.
  - Either way, append a row to `UploadEvent`.
- Backup: a weekly Vercel Cron job mirrors the entire R2 bucket to a Backblaze B2
  bucket. This is a cold backup only — the application never reads from B2 directly.

## 7. Environment Variables

```
DATABASE_URL=
JWT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
B2_KEY_ID=
B2_APPLICATION_KEY=
B2_BUCKET_NAME=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
```

All secrets live in Vercel's environment variable settings for production — never
committed to the repo. `.env.example` in the repo should list the keys above with
empty/placeholder values only.

## 8. Conventions

- Every API route re-validates the session and role server-side before touching the
  database — never trust a role or userId sent from the client.
- All request bodies validated with Zod (or equivalent) schemas — no unchecked input
  reaching Prisma.
- Marks are `Decimal`, never `float`/`number`, to avoid rounding drift.
- All timestamps stored and compared in UTC; format for display client-side only.
- TA queries for submissions/comments must filter by `assignedLabId` at the database
  query level (`WHERE experiment.labId = session.assignedLabId`), not by filtering
  results after an unscoped fetch.
- TAs may update `Experiment.name` and `Experiment.deadlineAt` only for experiments
  where `experiment.labId === session.assignedLabId` — enforce this on the write path
  the same way as the read-scoping above. TAs cannot create, delete, or reorder
  `Experiment` or `Lab` rows — that's Admin-only, via the roster/lab-management panel.

## 9. Seed Data

- `/seed/students.csv` — 29 students: `name, roll_number, email`. **Real PII — gitignored,
  never committed.** Present locally for the one-time seed import only.
- `/seed/staff.json` — 3 TAs (with `assignedLab`) + 1 Supervisor. **Real PII — gitignored,
  same as above.**
- `/seed/labs.json` — 3 labs × 9 experiments total (2 X-Ray, 4 Radio Astronomy,
  3 Optics). No PII, safe to commit. Experiment names are placeholders; each TA
  renames the experiments in their own lab from their dashboard (§5 `Experiment.name`
  is a normal editable field, scoped by `labId` — see §8 Conventions for the
  write-permission rule).
- `/seed/students.example.csv` and `/seed/staff.example.json` — same shape, fake data,
  **committed**. This is what a future maintainer reads to understand the expected
  format without ever seeing real student data.

## 10. Design System

The `frontend-design` Claude Code plugin is installed for this project — defer to its
judgment on execution quality (typography pairing, spacing, restraint). The brief
below is the fixed direction; the plugin fills in disciplined execution around it.

**Brief:** A lab-report portal for IITK's Space Sciences & Astronomy course (X-Ray,
Radio Astronomy, Optics labs). Audience is a closed cohort of 33 people who already
have an account — the landing page's job is to orient and get them to Login quickly,
not to persuade or convert. Dashboards are daily-use tools for that same small group,
not a marketing surface.

**Color tokens:**

| Token | Hex | Use |
|---|---|---|
| Nebula Violet | `#6D28D9` | gradient start, brand |
| Pulsar Pink | `#EC4899` | gradient end, brand |
| Deep Space Ink | `#1E1B2E` | headings, strong text |
| Slate Fog | `#52525B` | body text |
| Signal Green | `#10B981` | on-time / success states |
| Flare Amber | `#F59E0B` | late-flag / warning states |

**Type** (load via `next/font/google`):
- Display — **Space Grotesk**: landing page headlines only
- Body — **IBM Plex Sans**: body copy, dashboard UI, general content
- Data/utility — **IBM Plex Mono**: roll numbers, timestamps, deadlines, file names —
  anything data-shaped, across both the landing page and every dashboard

**Application by surface:**
- **Landing page (`/`):** full expression of the tokens above — gradient, the
  signature motif set (below), generous whitespace. This is the one place the brand
  gets to be bold.
- **Student / Staff / Admin dashboards (Phases 3–6):** same tokens, restrained —
  data-dense and functional. Gradient reserved for primary buttons and nav accents
  only, never spread across cards or backgrounds. Tables and data fields use IBM
  Plex Mono.

**Signature element:** three interlocking lab motifs — X-ray burst, radio-telescope
concentric arcs, prism spectrum split — as a small cohesive icon set. Not decoration:
used as the landing hero's visual anchor, as per-lab badges in TA/Supervisor tables,
and in empty states. This is the one memorable, subject-grounded device across the
whole product — don't introduce competing decorative elements alongside it.

**On the gradient specifically:** a violet-to-pink gradient is normally a generic
AI-design default worth avoiding on instinct. Here it's a deliberate choice made
against a real reference the user provided, not an autopilot pick — proceed with it
as specified, don't soften it toward a "safer" muted palette.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
