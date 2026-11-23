# Version 2 validation and hosted release status

Validated on **23 November 2026**. Your supplied **public Supabase connection is included**; no administrator/service-role credentials or public deployment domain were supplied. The source ZIP is locally validated, not a live deployed production service.

## Executed checks

| Check | Result | Scope |
| --- | --- | --- |
| TypeScript | Passed | Updated frontend, routes and configuration |
| Vite production build | Passed | Production assets built; export dependency chunk remains over 500 kB |
| Unit tests | **23 passed** | Registration/consent validation, population/filter/group trends, role map and appearance-cache validation |
| Public browser tests | **18 passed** | Branding/navigation, route protection, legal notice, unprovisioned developer, invalid QR and viewport fit |
| Existing portal browser tests | **18 passed** | Locked profile, six-step registration/review/back navigation, PDF export, inactive-card restrictions, analytics/developer identity and role boundaries |
| New community browser tests | **30 passed** | Photo/legal scroll gating, activation redirect, read-only academic directory, representative management, theme/font persistence, typed deletion request/approval confirmation, protected developer, rating submission, confirmed logout and actual privacy-to-terms document switching |
| Complete browser run | **66 passed** | All suites at desktop, tablet and mobile sizes; both dedicated-server and default self-starting test configurations passed |
| Both SQL migrations | Passed | Compiled by real PostgreSQL via PGlite with minimal simulated Supabase Auth/Storage schemas |
| Foundation authorization regression | Passed | RLS, forged metadata/fields, duplicate prevention, official-record lock, role/developer protection, correction/audit, announcements and membership-token lifecycle |
| Community SQL regression | Passed | Photo ownership/existence, current legal versions, linked-photo deletion lock, blocked post-submission uploads, academic permissions, private feedback, reviewer notifications, service-only erasure functions, pending cancellation, original reviewer, closing-account mutation blocks and retry-safe linked-data removal |
| Card PDF | Passed | Two pages, **85.60 × 53.98 mm** each |
| Card PNG | Passed | Two sides, **2568 × 1620 pixels** each |
| QR decoding | Passed | Both final PNGs and both rendered PDF pages decoded to the intended test verification URL |
| Excel report | Passed | Fixture student/register headings, population-summary counts and private-contact exclusions |
| PDF report | Passed | Fixture name/registration present; private email/phone absent |
| Screenshot content/layout review | Passed for inspected states | Desktop/mobile landing, admin statistics, mobile lecturer directory/signup, dark settings/deletion confirmation, teal feedback and both card PDF sides; capture reported no page errors or viewport overflow |
| npm audit | **0 reported vulnerabilities** | Locked dependency graph at validation time; not an external security certification |
| Read-only hosted connection probe | **Reachable; setup incomplete** | Supplied project returned HTTP 404 / `PGRST205` for `registration_settings`; no hosted records were created or changed |

All browser data is explicit **test-only transport fixtures**, outside production source. The sample lecturer and student are not real identities. The SQL engine executes real PostgreSQL constraints, grants, RLS and functions; surrounding Auth/Storage schemas are simulated. Storage blob cleanup and Auth deletion are gateway simulations in local SQL tests, not real hosted erasure.

The browser checks revealed missing exact accessible labels and incomplete transport fixtures; labels and fixtures were corrected, and the complete final run passed. Policy navigation remounts the correct document. The final browser command starts an isolated fixture-configured server rather than accidentally reusing the real configured app.

## Hosted setup still required

1. Apply **both migrations in filename order** to the currently empty target project. Existing V1 installations apply only the second migration after backup/schema review.
2. Configure email confirmation/SMTP, allowed `/student/setup` and password-reset redirects, and the real canonical public app URL.
3. Privately provision the genuine **Dev Brian** identity using the included trusted script.
4. Deploy **admin-invite** and **account-lifecycle**, with server-only `APP_URL` matching the real origin. Service-role credentials stay in Supabase's function environment, never frontend variables.
5. Set actual controller/support details, review legal documents and retention/branding, then run hosted staging acceptance before opening registration.

## Not executed — release gates remain open

- Real hosted signup, email verification/recovery and SMTP/invitation delivery.
- Hosted private Storage upload, signed URLs, expiration and concurrent upload/deletion gateway behavior.
- Hosted Realtime, multi-session notices and feedback responses.
- Actual account-lifecycle deployment, password reauthentication, Storage/Auth removal, timeout/retry behavior and protected-account tests against genuine staging users.
- Vercel/custom-domain deployment, DNS/TLS and deployed routing/QR verification.
- Physical card printing, real-phone QR scans and actual-device Safari/Firefox/assistive-technology acceptance.
- External security review, load/abuse testing, backup restoration and incident rehearsal.
- Approval of applicable Kenyan privacy requirements, controller information, retention, cross-border processing and official branding.

**Do not describe this as live or production-ready until these hosted release gates are completed and signed off.** See `DEPLOYMENT.md`, `SECURITY.md` and `TESTING.md` for setup and acceptance.
