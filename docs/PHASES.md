# Implementation phases and integration map

The source is organized and documented in the requested phase order. All phases share the same foundation migration: migration statements are grouped by dependencies because RLS helpers, tables and RPCs must exist before application integration. There are no fake per-phase migration files.

| Phase | Working implementation | How to verify |
| --- | --- | --- |
| 1 Branding/splash/home | `main.tsx`, `Public.tsx`, `index.css`, shared Brand/Footer | Open home at mobile/tablet/desktop sizes; first visit shows short splash; navigate all CTAs. |
| 2 DB/auth/security | Foundation migration, `AuthContext`, `Auth.tsx`, guards, Storage policies | Apply migration; confirm email, login/recovery; run SQL authorization tests. |
| 3 Registration | `Register.tsx`, `validation.ts`, `submit_registration` RPC | Complete all 6 steps; go back/edit/review; submit; retry duplicate number/account. |
| 4 Locking/corrections | RLS write revocation, request/review RPCs, student/admin correction pages | Direct PATCH must fail; submit correction; unauthorized reviews fail; authorized update is audited. |
| 5 Student dashboard/profile | `Student.tsx`, private photo signing, notification list | Own-only profile, pending notice, correction history, separate security settings. |
| 6 Cards/verification | `MembershipCard.tsx`, cards/token schema, `verify_membership` RPC | Pending blocked; approve; PDF/PNG/print; scan QR; revoke; old scan no longer valid. |
| 7 Analytics | `Admin.tsx`, `Analytics.tsx`, analytics utilities, Realtime | Compare unique rows/counts/group totals; exercise every filter and progress target. |
| 8 Directory/approvals | `StudentDirectory`, decision/membership RPCs | Search, pagination, inspect records; approve/reject/deactivate/reactivate; verify notifications/audit. |
| 9 Admin/developer | `AdminManagement`, invite function, trusted provisioning scripts, developer RPC/page | Verify roles, secure invitations, protected developer and badge. |
| 10 Announcements/notifications | `AnnouncementManagement`, `AnnouncementList`, notifications RPC/table | Draft/public/private/future publish/archive/delete; student notifications read state. |
| 11 Control Center | `SystemControlCenter`, update settings RPC, audit browser | Registration closed rejects submission; branding/settings update; recent activity counts. |
| 12 Reports | `Reports`, `reportService.ts` | Excel/PDF/print filters and summarized population numbers; private contacts absent. |
| 13 Test/release | Vitest, Playwright, SQL regression tests, deployment/security guides | Build; unit tests; staged journey and policy tests; release checklist. |

Run locally using README instructions after configuring Supabase. Hosted functionality cannot be accepted without a real connected project. See validation evidence for what was actually executed in the development environment.
