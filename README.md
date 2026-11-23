# MedEng Y2S1 Class Portal

**KMTC • Medical Engineering • Year 2 • Semester 1**  
**One Class. One Identity. One Community.**  
Developed and Managed by **Dev Brian**.

A React/TypeScript application backed by Supabase Auth, PostgreSQL, private Storage and row-level security. No mock production data. All student and administrative actions call the hosted database or authenticated Edge Function.

## Start here

Requires **Node.js 22 LTS**, npm, a Supabase project and a Vercel account. Run commands from the extracted project folder.

```sh
npm ci
# Copy .env.example to .env and enter your Supabase project URL and publishable key.
# Set VITE_PUBLIC_APP_URL to your real public domain before production build.
npm run dev
```

1. Back up the Supabase project, then apply **both** migrations in filename order from `supabase/migrations/`. The foundation migration safely reconciles the temporary `administrator_roles` table created during setup, converts the existing `admin` role to `super_admin` before applying the canonical role constraint, and backfills profiles. If a previous run failed on the role constraint, the transaction rolled back; rerun the corrected foundation migration, then run the community migration.
2. Confirm your own email-confirmed Auth UUID, then run `supabase/provision-existing-admin.sql` only if the migration did not already preserve and promote your existing role. Replace its UUID placeholder; do not run `provision-developer.sql`.
3. Configure email confirmation, SMTP and authentication redirect URLs. See `docs/DEPLOYMENT.md`.
4. Deploy both `supabase/functions/admin-invite/index.ts` and `supabase/functions/account-lifecycle/index.ts` with the Supabase CLI and set its server-only `APP_URL` secret.
5. Build and test: `npm run build`, `npm test`, `npm run test:e2e`.
6. Import into Vercel, set the public environment variables from `.env.example`, then follow the production checklist.

## Implemented workflow

- Lightweight animated splash, responsive public landing, About/privacy and secure developer profile.
- Student sign-up with a required recognition photo, scroll-to-end Privacy Policy/Terms acceptance, verified-email activation, login, recovery, password change and confirmed local/global logout.
- New dashboard building blocks (`StatGrid`, `DashboardSection`, `QuickAction`), responsive public/sidebar navigation and branded footer.
- Administrator-managed lecturers, teaching units and many-to-many assignments, visible to signed-in students.
- Private one-to-five-star feedback, categories, reviewer responses and notifications.
- Five theme choices, four local font families, text size, density and reduced-motion settings, saved per browser.
- Current-password-verified deletion requests, exact typed confirmation, pending cancellation, independent super-admin review and separately confirmed server-side erasure. Dev Brian remains protected.
- Six-step registration using React Hook Form and Zod, review, required privately sanitized recognition photo, declaration, consent, normalized unique registration number and unique account association.
- Pending registrations create a membership reference. Official records are database-locked; students cannot insert/update/delete directly or modify roles.
- Read-only profiles, announcements, account notifications, correction requests and auditable administrator decisions.
- Approval creates an unpredictable 256-bit verification token. Active members can preview front/back, download a two-page ID-size PDF, download two high-resolution PNGs, or print a PDF.
- Public QR verification displays only the permitted membership fields and always checks current status. A card is a **class membership card, not an official KMTC student ID**.
- Realtime, filterable database analytics and charts; searchable paginated administrator directory, approval/rejection and membership lifecycle.
- Permission-gated administrator invitations/role updates, immutable developer identity through ordinary application access, announcement publication/scheduling/archive/deletion, System Control, audit browser and reporting exports.
- Configurable class logo, optional developer photo/biography, registration switch, expected-population target and privacy notice.

Interface screenshots are in `docs/PREVIEWS.md`; private previews use test-only records.

## Key files

| Area | Files |
| --- | --- |
| Landing, splash and branding | `src/main.tsx`, `src/pages/Public.tsx`, `src/components/common.tsx`, `src/index.css` |
| Authentication and route permissions | `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx`, `src/components/Layout.tsx` |
| Registration | `src/pages/Register.tsx`, `src/utils/validation.ts`, `src/services/studentService.ts` |
| Locked student profile and corrections | `src/pages/Student.tsx`, database RPCs and RLS |
| Membership generation | `src/pages/MembershipCard.tsx`, public verification page in `Public.tsx` |
| Population and directory | `src/pages/Admin.tsx`, `src/components/Analytics.tsx`, `src/utils/analytics.ts` |
| Administrators, notices, control and reports | `src/pages/Management.tsx`, `src/services/reportService.ts` |
| Data foundation and storage policies | `supabase/migrations/202611230001_foundation.sql` |
| Academic directory, feedback, appearance and account closure | `src/pages/Academics.tsx`, `Feedback.tsx`, `Settings.tsx`, community migration and account-lifecycle function |
| Secure administrator invites | `supabase/functions/admin-invite/index.ts` |
| Existing administrator provisioning (only if needed) | `supabase/provision-existing-admin.sql` |
| Tests and release evidence | `tests/`, `supabase/tests/`, `docs/TESTING.md`, `docs/VALIDATION.md` |

Pages are grouped by domain instead of one file per route. This is intentional; the route map is in `src/App.tsx`.

## Your supplied connection

Configure the public Supabase URL and publishable key in a local `.env` copied from `.env.example`; the deployment ZIP intentionally excludes local environment files. No service-role credentials belong in the frontend. This is a **Vite** app, so use `VITE_*` variables, not `NEXT_PUBLIC_*`. Apply both migrations and deploy both functions before hosted workflows can operate. The canonical public app domain has not been supplied; local development uses its own origin.

## Honest release status

Source implementation and local validation are included. **This is not a claim of a live deployed or independently audited production service.** A genuine Supabase environment, real SMTP, administrator identity verification, Kenyan privacy/retention review and staging acceptance are prerequisites to release. Exact executed checks and remaining checks are in `docs/VALIDATION.md`.

## Security boundaries

The anonymous/public Supabase key is intentionally public; authorization is enforced by PostgreSQL policies and RPC permission checks. Never put service-role keys in `VITE_*`, a browser bundle or Git. The service-role key is used only inside server-side invitation and account-lifecycle Edge Functions. RLS blocks private public browsing and direct student/admin record writes. Even a manually crafted browser request cannot grant itself a role or bypass official-record locking.

Exported files and printed cards cannot be remotely erased. Revocation is effective through live QR verification. Keep the public URL stable; reissue cards if it changes. Do not treat a screenshot of a valid response as live verification.

## Attribution

© 2026 KMTC Medical Engineering Y2S1 Class Portal. Developed and Managed by Dev Brian.
