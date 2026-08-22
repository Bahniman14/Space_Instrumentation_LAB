# SSA Lab Portal

Lab report submission and grading portal for IITK's Space Sciences & Astronomy
course (X-Ray, Radio Astronomy, Optics). See [`CLAUDE.md`](./CLAUDE.md) for the
full technical reference and [`planner.md`](./planner.md) for the phased build
plan.

## Getting started

### 1. Install dependencies

Use the Node version pinned in `.nvmrc`:

```bash
nvm use
npm install
```

### 2. Configure environment variables

Copy the example file and fill in real values (see `CLAUDE.md` §7 for what each
variable is for — Neon connection string, JWT secret, R2/B2 credentials, Brevo
API key, Admin credentials):

```bash
cp .env.example .env
```

`.env` is gitignored and must never be committed.

### 3. Set up the database

Point `DATABASE_URL` in `.env` at a Neon Postgres database, then run:

```bash
npx prisma migrate dev
```

This applies `prisma/schema.prisma` and generates the Prisma Client.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Seed data

`/seed/labs.json` has no PII and is committed as-is. `/seed/students.csv` and
`/seed/staff.json` contain real roster PII, are gitignored, and must never be
committed — see `/seed/students.example.csv` and `/seed/staff.example.json` for
the expected shape.
