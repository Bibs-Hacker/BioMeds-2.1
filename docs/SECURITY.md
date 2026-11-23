# Security and privacy review

## Authorization model

| Permission | Super Admin | Class Rep | Assistant Rep | Data Officer |
| --- | --- | --- | --- | --- |
| View permitted class records/statistics | Yes | Yes | Yes | Yes |
| Approve/reject/manage membership | Yes | Yes | Yes | No |
| Correct records | Yes | No | No | Yes |
| Publish/edit/archive notices | Yes | Yes | No | No |
| Export reports | Yes | Yes | No | Yes |
| Roles/settings/audit | Yes | No | No | No |

Report generation has a separately permission-checked backend register RPC. Administrators who are permitted to view private records can inherently copy what they can view; hiding report buttons is not DRM.

The `has_permission` function reads trusted role rows, not JWT user-editable metadata. Student/public writes to roles, submitted records, settings, announcements, corrections and audit logs are denied. All privileged RPCs use fixed schema-qualified objects and a restricted search path. The protected developer badge reads a system-provisioned developer role, never a submitted display name.

Photos are private, restricted by bucket/path and read policies, displayed through short-lived signed URLs, limited to JPEG/PNG/WebP, and rasterized in-browser to remove image metadata. Public branding has separate super-admin-only upload policies. Storage MIME checks are not a complete malware detection service; add server-side image validation/scanning if the institution requires it.

Corrections store the submitted previous value, proposed replacement and reason. Acceptance locks both records, checks for stale previous values, applies only whitelisted fields and logs old/new values plus the administrator. Database constraints validate the corrected value too. Students never receive UPDATE access.

## Membership security

Tokens contain 32 cryptographically random bytes (64 hex characters), not internal IDs or registration numbers. Pending/rejected/inactive/suspended memberships cannot download active cards. Public verification looks up the token privately and returns only the approved fields. Reapproval and recovery after revocation rotate tokens. Revocation cannot delete saved card images; recipients must perform live verification.

Public verification logs only a bounded card/timestamp event, not visitor IP/device/phone/location. Infrastructure/WAF rate limits should also be applied to public verification and auth routes before release. Bounded DB logging is not comprehensive anti-DDoS protection.

## Data minimization

Public pages show no population metrics or private records. Reports intentionally omit email, phone, date of birth, home address and emergency contacts. Class administrators have private directory access only through authenticated policies. Institution/course/academic designation are constrained by the database; students cannot switch class or semester.

The default privacy text is **not legal advice or a compliance certification**. The responsible controller must determine lawful processing basis, consent handling, support identity verification, emergency-contact third-party notice, retention, controller/processor responsibilities, minor-data requirements if applicable, breach response and cross-border safeguards under applicable Kenyan law before launch. Configure the contact/privacy settings and document these decisions.

## Limitations and hardening

- No administrator TOTP/WebAuthn flow is included; consider requiring MFA before sensitive RPC operations.
- Infrastructure owners/service-role holders are trusted; keep those credentials away from ordinary administrators.
- Database-owner operations must use change control; app audit guarantees do not make PostgreSQL owner access immutable.
- Single-class analytics loads permitted rows in 500-row batches. For larger scale, implement authorized server-side aggregate queries and paginated directory RPCs.
- Notification state is in-app, not SMS/push; authorization does not depend on notification delivery.
- Realtime delivery is best-effort with polling fallback. Offline operations cannot submit records.
- QR rendering/downloads require a stable public domain and modern browser canvas support. Two PNG files may require permission for multiple downloads.
- Class membership cards are not official KMTC identity documents and must not be used as such.
- Dependency auditing is part of every release; the validation file records the local audit findings.

## Version 2 community additions

Private recognition photographs and current policy acceptance gate account activation and registration. Legal documents are public; lecturer/unit records require sign-in; academic mutations require super-admin/class-representative permission. Feedback reads are restricted to its owner and authorized reviewers, and submission is rate-limited. Official submitted student details and protected Dev Brian identity remain locked.

Deletion requests are service-only creations after current-password checking in the authenticated Edge Function. No password is logged or persisted. Independent super-admin review, exact separate execution confirmation and original-reviewer checks are enforced server-side. Approved/processing closure blocks uploads, activation, new feedback and role grants. Upload and cleanup transactions lock the same profile row; actual hosted gateway concurrency still requires staging acceptance. Recursive bounded Storage cleanup, Auth suspension/deletion and minimal closure receipts support safe retry. Portal erasure does not guarantee instant external-backup or downloaded-copy erasure; retain only approved pseudonymous accountability/class content and document retention exceptions.

Public URL/publishable key in `.env` are intentional client configuration, not administrator credentials. Service-role keys exist only in the deployed function environment. Neither hosted function has been deployed or tested against real user deletion in this release.
