# Testing and production acceptance

## Automated checks

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

`vitest.config.ts` isolates domain tests from browser suites. Unit tests cover validation, consent, population totals, filters, trends, roles and appearance-cache validation. All browser suites run at desktop, tablet and mobile sizes against **explicit test-only transport fixtures**, never imported by production code.

The default `npm run test:e2e` starts its own isolated fixture-configured server and runs all suites. It does not reuse a running production-configured development server. For a separately started fixture server, use the following (override the configured public publishable key as well):
```sh
VITE_SUPABASE_URL=https://ui-fixture.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=test-public-key VITE_SUPABASE_ANON_KEY=test-public-key VITE_PUBLIC_APP_URL= npm run dev -- --port 4174
# In a separate terminal:
UI_FIXTURES=1 E2E_BASE_URL=http://127.0.0.1:4174 npm run test:e2e
```
Do not point fixture tests at a live deployment. These tests validate UI behavior, not hosted Auth/SMTP or actual gateway authorization. Public fixtures also distinguish unprovisioned developer identity and invalid QR results safely.

`supabase/tests/authorization.sql` runs real PostgreSQL RPC/permission regressions in an isolated project transaction and rolls fixtures back. Use `psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/authorization.sql` **only against a dedicated empty test database after both migrations**. It tests malicious user metadata, forged registration fields, duplicate accounts/numbers, denied updates/role escalation, private row isolation, email verification enforcement, approval/rejection, membership invalidation/token rotation, correction approval and audit, role boundaries, developer protection, scheduling and private public visibility.

`supabase/tests/community.sql` adds policy/photo activation gates, upload ownership/locking, academic role permissions, private ratings/responses, version reacceptance, service-only deletion creation/execution, cancelled requests, original-reviewer enforcement, closure mutation blocks and retry-safe linked-data removal. Run it separately in the same isolated environment. Do not run either SQL suite against real identities.

An optional PGlite test harness (`npm run test:db`) compiles and runs the same SQL with minimal simulated Supabase Auth/Storage schemas. PostgreSQL constraints/functions/RLS are real in that engine; hosted Auth, Storage gateway and Realtime behaviour still require staging tests.

## Hosted student journey — must complete before release

- [ ] Register two real accounts and verify email delivery and links.
- [ ] Attempt registration before email confirmation; rejected.
- [ ] Test all six steps, optional fields, back navigation and final review.
- [ ] Confirm database email comes from confirmed Auth, not forged submitted JSON.
- [ ] Duplicate registration number in a different account; blocked (including case variants).
- [ ] Attempt PATCH/INSERT/DELETE against official records via REST; denied.
- [ ] Own profile readable; another student's record, photo, correction, token and notification not readable.
- [ ] Pending/rejected/inactive/suspended cards unavailable.
- [ ] Submit correction; accepted and rejected cases; notification and audit values correct.
- [ ] Approve registration, download PDF and PNG; verify both sides and actual ID dimensions.
- [ ] Decode QR from the exported image/PDF, not only the on-screen canvas.
- [ ] Scan from two phones; test valid, inactive, suspended, revoked, invalid and rotated tokens.
- [ ] Password recovery, account password change and secure logout work.

## Administrator acceptance

- [ ] Privately provision genuine Dev Brian and inspect verified badge.
- [ ] Invite each role; email invitation arrives and password setup works.
- [ ] Inspect permissions through browser controls **and direct API/RPC calls** as every role.
- [ ] Confirm ordinary admins cannot modify developer profile role/badge or remove it.
- [ ] Verify directory search/filter/pagination, approve/reject and membership status operations.
- [ ] Compare every statistic/chart to a database count, including Other/unspecified gender and suspended/revoked membership groups.
- [ ] Change a student in a second session; dashboard refreshes without duplicated counts.
- [ ] Close registration; submission fails at the database even if stale frontend says open.
- [ ] Publish/edit/archive/delete and future-schedule public/private announcements.
- [ ] Export all report types and compare filtered totals and group summaries in both Excel and PDF. Standard reports must omit private contacts.
- [ ] Audit actor, student, previous value, updated value, reason and timestamp correct.
- [ ] Test slow network, empty data, invalid fields, duplicate requests and concurrent corrections.
- [ ] Test uploads with wrong MIME and excessive size; ensure private photo URLs expire.

## Device and release checks

- [ ] Actual Android/iOS, tablet, desktop Chromium/Firefox/Safari; keyboard-only navigation, focus indicators, screen-reader labels and reduced motion.
- [ ] Card printing at 100%, no unintended page scaling.
- [ ] QR tokens reveal only permitted fields; use canonical HTTPS domain.
- [ ] Review legal privacy notice, consent, authorized branding, controller/contact details and retention.
- [ ] SMTP, monitoring, abuse limits, encrypted backups and restore rehearsals configured.
- [ ] Rerun dependency audit, production build and all staging checks after dependency or schema updates.

Do not mark unchecked release gates as passing. Local test fixtures do not establish production connectivity or privacy-law compliance.

## Community and deletion staging acceptance

- [ ] Real signup is disabled until photo selection, both legal scroll ends and explicit acceptance. Verify on the same device and a second device.
- [ ] Wrong MIME/size rejected; private sanitized photo uploaded; missing/foreign photo or stale legal versions rejected by RPC.
- [ ] Existing V1 missing-photo account activates without unlocking official details. Existing submitted photo cannot be replaced through activation.
- [ ] Admin lecturer/unit CRUD and multiple assignments appear to students; unauthorized mutations fail via direct RPC.
- [ ] Student feedback requires 1–5 stars; private row isolation, daily limits and reviewer notifications work in two real sessions.
- [ ] Themes/fonts persist on this browser; all settings remain legible on supported real devices. Local/global logout has a confirmation.
- [ ] Incorrect password, wrong phrase and missing acknowledgment reject deletion requests. Only pending requests can be cancelled.
- [ ] Self-review, developer deletion, ordinary-role review and direct authenticated service-only RPC calls are denied.
- [ ] Separate execution phrase and original reviewer enforced. Test pending, rejected, approved, processing and completed states.
- [ ] Photos, Auth account, cards, student records, corrections, feedback and linked notifications are removed; old QR becomes invalid.
- [ ] Simulate gateway failures; retry Processing safely. Race an upload/activation/role grant against erasure and reconcile actual Storage blobs.
- [ ] Approved backup expiry and retention exceptions communicated; no claim that downloaded copies or backups were instantly erased.
