# Deployment and trusted provisioning

## 1. Supabase foundation

Use a hosted project in a region selected after assessing Kenya Data Protection Act requirements, processor contracts and cross-border safeguards. Back up the project before applying migrations. Apply `202611230001_foundation.sql`, then `202611230002_community.sql`. The foundation migration now reconciles the temporary `administrator_roles` table from the setup walkthrough: it creates/backfills profiles, normalizes the role constraints and foreign key, and converts the temporary `admin` role to the app's `super_admin` role while keeping `is_developer=false`. Do not rerun the foundation migration on a fully installed project; review schema history first. With the CLI: `supabase login`, `supabase link --project-ref YOUR_REF`, then `supabase db push`.

## 2. Authentication

In Authentication settings:
- Require confirmed emails for sign-in; the registration RPC separately rejects unconfirmed users.
- Set the production Site URL to the Vercel/custom domain and explicitly allow `/student`, `/student/setup` and `/reset-password` redirects on it. Add localhost only for development.
- Require passwords of at least 12 characters. Configure custom SMTP, test verification/recovery/invite delivery, and enable suitable Auth abuse/rate limits and CAPTCHA as part of the launch hardening review.
- Restrict Supabase dashboard access, require MFA for project owners, and keep recovery methods offline. Application administrator MFA is a recommended enhancement, not implemented in this version.

## 3. Class administrator account

There is no default password and no public administrator registration. Create/sign in with the intended account through Supabase Authentication and confirm its email. The foundation migration preserves the previously created administrator row and upgrades the temporary `admin` label to `super_admin` with `is_developer=false`. Verify with:

```sql
select u.id, u.email, r.role, r.is_developer
from auth.users u
join public.administrator_roles r on r.user_id = u.id
where u.email = 'YOUR_CONFIRMED_EMAIL';
```

Expected: `role = 'super_admin'` and `is_developer = false`. If no role row exists, use `supabase/provision-existing-admin.sql` as database owner after replacing its UUID placeholder with the verified Auth UUID. Do not run `provision-developer.sql` for an ordinary class administrator. New administrator accounts can be invited by authorized super administrators using the app once the Edge Function is deployed.

## 4. Edge Function

```sh
supabase functions deploy admin-invite
supabase functions deploy account-lifecycle
supabase secrets set APP_URL=https://YOUR_DOMAIN
```

Hosted Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to functions. `APP_URL` must exactly match the app origin (no trailing slash). JWT verification remains enabled; the function also validates the session and `roles` permission server-side. CORS permits the configured origin only. Invitations to existing accounts are handled through the trusted existing-account script, not an insecure lookup endpoint.

## 5. Vercel

Import this directory/repository. Framework: Vite. Node: 22. Install: `npm ci`. Build: `npm run build`. Output: `dist`.

Set:
- `VITE_SUPABASE_URL`: hosted project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the supplied public publishable key. Legacy `VITE_SUPABASE_ANON_KEY` remains supported as a fallback; do not set both unless deliberately matching the project.
- `VITE_PUBLIC_APP_URL`: canonical public origin, without trailing slash.

Never set a service-role key as a Vercel frontend variable. `vercel.json` handles SPA navigation and security headers. Preview deployments need explicitly approved Auth redirects and a compatible invitation origin; use a dedicated staging project instead of opening arbitrary wildcard redirects.

## 6. Configure before opening registration

In System Control set academic year, registration status, expected population if known, approved support email/class contact and a reviewed privacy notice. Optional branding/photos accept raster images only. The default abstract medical-engineering symbol is class-specific and does not claim official KMTC endorsement.

Verify Realtime is enabled for the migration's tables. Data is paged internally in batches of 500 and filtered locally; this design is suitable for one class, not a national student system. Realtime refresh is supplemented with a 60-second refresh for scheduled announcements and operational resilience. Every card download rechecks the latest membership eligibility.

## 7. Backups and retention

Enable Supabase managed backups appropriate to your plan; consider PITR for critical operations. Separately back up Storage objects and Auth/configuration; database backups alone do not preserve the image objects. Encrypt exports, restrict operators, record retention periods, and test restore quarterly into an isolated project.

Agree a documented retention policy with the responsible class/institution controller. Schedule database-owner maintenance for old membership verification timestamps (e.g. 90 days, subject to review), unused photo objects, and archived announcements. Do not retain data forever by default. Account erasure uses the password-verifying account-lifecycle function, independent super-administrator review and a separate destructive execution confirmation. The original reviewer executes; never approve your own closure. The database first blocks protected mutations/uploads and removes linked portal records; the function suspends Auth access, recursively removes private Storage files, deletes the Auth account and finalizes a minimal closure receipt. A gateway failure remains Processing and supports retry. Stop if a cleanup error persists and reconcile Storage/Auth under trusted operator supervision. Original UUID/action/date linkage is pseudonymous, not anonymous. All closure narratives for that account are removed on completion; previously downloaded exports, external backups and retained class announcements are not automatically erased. Handle broader lawful exceptions and consent-withdrawal requests through approved support.

## 8. Release gates

Complete `docs/TESTING.md`, review `docs/SECURITY.md`, test on actual smartphones/tablets/desktops, confirm permissions as every role, check PDFs at actual size, scan QR codes from exported PNG/PDF cards, test SMTP and backups, and obtain approval for privacy wording and official branding. Release only after staging acceptance is recorded.

## 9. Activation, community and legal rollout

The ZIP includes no local `.env` file; configure the frontend public Supabase variables from `.env.example`. Apply migrations before using portal settings. Do not leave registration open until you have set the actual controller/support details, reviewed policy text and agreed a retention schedule.

New signups stage a sanitized image in browser IndexedDB; the file becomes unavailable after 48 hours and is uploaded privately after verified-email login. Verification on another device requires selecting the photo again. Account activation requires both current legal versions and the owned Storage object. Existing registered students can attach a missing photo once, then their recognition image remains locked. Submitted users retain the same photo when reaccepting policy updates. Policy publication increments the version; registration and activation reject stale acceptance. The scroll gate is a frontend aid, not legal proof of comprehension.

Super administrators and class representatives manage lecturers/units and review feedback. Assistant representatives and data officers can read the student academic directory but cannot manage it. Only super administrators handle account closure and legal publication. Test uploaded-photo and deletion concurrency against the actual hosted Storage gateway, not just local SQL. A PostgreSQL owner remains a break-glass trust authority.
