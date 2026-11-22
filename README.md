# E-Voting Sekolah

**A secure, reusable web app for running student council (OSIS) elections in schools.**

E-Voting Sekolah replaces paper ballots with a mobile-first voting flow that students can complete on a phone or Chromebook. It covers the whole election, from importing the voter list to a live, synchronized results announcement. Throughout, ballots stay anonymous and the results stay tamper-resistant.

It was built by a school administrator who runs these elections, so the workflow follows how student elections actually happen: one committee, shared school Wi-Fi, a single announcement moment in front of the whole school.

## Used in a real election

| Metric | Result |
| --- | --- |
| Election | Student council (OSIS) election, September 2026 |
| Turnout | **85%**: 204 of 240 registered students voted |
| Voting window | 2 hours 8 minutes from first to last ballot |
| Time to results | Announced publicly **32 minutes** after the last ballot |

> The interface is in Bahasa Indonesia. School identity, election period, candidates and voters are all configured from the admin panel, so the same codebase can be reused by any school.

---

## Highlights

- **End-to-end election lifecycle**: setup → candidates → voters → tokens → voting → results → public announcement → archive
- **Anonymous ballots by design**: the `votes` table stores no voter, session, token, name or class data
- **One person, one vote**: enforced by an atomic database transaction, not by client-side checks
- **Bulk voter import** from Excel (`.xlsx`) or CSV, with a mandatory preview before saving
- **Live results announcement**: a 10-second countdown synchronized to server time across every screen, then the results reveal
- **Security-first engineering**: hashed tokens, rate limiting, hardened cookies and server-only secrets
- **101 automated tests** covering voting, login security, results, announcements and archiving

---

## How it works

### For the election committee (admin)

| Step | Page | What happens |
| --- | --- | --- |
| 1. Configure | `/admin/pengaturan`, `/admin/pemilihan` | School name, time zone, election name and term |
| 2. Candidates | `/admin/kandidat` | Ballot number, name, class, photo (≤ 2 MB), vision and mission |
| 3. Voters | `/admin/pemilih` | Add manually or import `.xlsx`/`.csv` (`nama, kelas, jenis_kelamin`) with search, filters and pagination |
| 4. Tokens | `/admin/pemilih` | Generate a 6-digit voting token per student; each token is shown **only once** and can be downloaded for printing |
| 5. Ballot box | `/admin/kotak-suara` | Open, pause, resume and permanently close voting |
| 6. Results | `/admin/hasil` | Turnout during voting; candidate totals only after closing; finalize results |
| 7. Announcement | `/admin/pengumuman` | Start the one-time public reveal |
| 8. Archive | `/admin/arsip-pemilihan` | Archive the election and start a new one next year |

### For students (voters)

1. Open `/pilih` and enter the 6-digit token (displayed as `123-456`)
2. View the active candidates with photo, vision and mission
3. Cast one vote. The confirmation page deliberately does **not** show who they voted for.

### For the whole school

`/pengumuman` is designed for a projector or shared screen. It shows a waiting screen, then a synchronized countdown, then each candidate's votes and percentage. Ties are reported honestly: the system never picks a single winner automatically.

---

## Election lifecycle

```text
draft ──▶ open ⇄ paused ──▶ closed ──▶ finalized ──▶ announced ──▶ archived
```

Guard rails built into each transition:

- The ballot box can only open when there are **at least two active candidates**, at least one voter, and **every voter has a token**
- `closed` is terminal: a finished election can never be reopened from the UI
- Once results are finalized, candidates and key election settings are locked
- Practice runs can be marked as **test elections** and permanently deleted after archiving. Deletion requires typing `HAPUS` and is written to the audit log.

---

## Security

Elections need trust, so security was treated as a core feature rather than an add-on.

| Concern | Approach |
| --- | --- |
| Token storage | Only an **HMAC-SHA-256 hash** (with a server-only pepper) is stored; raw tokens never touch the database |
| Token exposure | Raw tokens are never sent in URLs, never stored in `localStorage`/`sessionStorage`, and never logged |
| Brute force | PostgreSQL-backed rate limiting over a 10-minute window: 5 failures per device or token, 100 per IP (sized for shared school Wi-Fi) |
| Voter session | 15-minute session; cookie is `HttpOnly`, `SameSite=Strict`, `Secure` in production, and holds only a random secret |
| Double voting | A single database RPC inserts the vote, marks the voter as voted, and consumes the session **atomically** |
| Ballot secrecy | Votes are stored without any link to a voter; public endpoints return aggregates only, and only after the reveal time |
| Privileged access | Voter login runs only through server actions using a server-only key; it cannot be called with the public key |
| Admin access | Supabase Auth with no public sign-up; `/admin` requires an `admin` role and is scoped to the admin's own school |
| Auditability | Token generation, regeneration and test-election deletion are written to `audit_logs` |

---

## Tech stack

- **Framework:** Next.js 16 (App Router, Server Actions), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RPC functions, Row Level Security)
- **Validation:** Zod
- **Import/export:** ExcelJS, PapaParse
- **Testing:** Node.js built-in test runner
- **Hosting:** Vercel

---

## Project structure

```text
src/
  app/            # Routes: /admin, /pilih, /pengumuman, /api/health
  features/       # Domain modules: voting, announcement, admin/*
  components/     # Shared layout components
  lib/supabase/   # Browser, server, admin and proxy clients
  types/          # Database and domain types
  utils/          # Pure helpers (dates, token formatting)
supabase/
  migrations/     # 18 ordered SQL migrations
tests/            # 101 automated tests
docs/             # Specification, architecture, database design, deployment
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project

### Setup

```bash
git clone https://github.com/lisalazim/e-voting-sekolah.git
cd e-voting-sekolah
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase publishable key |
| `SUPABASE_URL` | Server only | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Server only | Supabase secret key |
| `VOTER_TOKEN_PEPPER` | Server only | Long random secret for hashing voter tokens |
| `VOTER_RATE_LIMIT_PEPPER` | Server only | Random secret, at least 32 characters |

Apply the SQL files in `supabase/migrations/` in order, create an admin user in Supabase Auth with an `admin` profile, then run:

```bash
npm run dev     # http://localhost:3000
npm test        # run the test suite
npm run build   # production build
```

### Deployment

See [`docs/DEPLOYMENT_VERCEL.md`](docs/DEPLOYMENT_VERCEL.md) for the production checklist, environment scoping and post-deploy verification.

---

## Documentation

Detailed documentation (in Bahasa Indonesia):

- [Project specification](docs/PROJECT_SPEC.md): features and development phases
- [Architecture](docs/ARCHITECTURE.md): folder responsibilities and design principles
- [Database design](docs/DATABASE_DESIGN.md): tables, relationships and access rules
- [Deployment on Vercel](docs/DEPLOYMENT_VERCEL.md)

---

## Author

**Lisa Lazimaturrohmah** — Vice Principal for Student Affairs and EdTech developer, building software for schools from the inside.

GitHub: [@lisalazim](https://github.com/lisalazim)
