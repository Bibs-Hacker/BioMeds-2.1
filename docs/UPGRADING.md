# Using the updated ZIP

The public Supabase connection is already in `.env`. Do not overwrite it with unrelated credentials. Install with `npm ci`, then `npm run dev`. This is a Vite project; frontend variables start with `VITE_`. Node.js 22.12 or newer is required.

The hosted project is reachable but portal tables are missing. In Supabase, apply `202611230001_foundation.sql` then `202611230002_community.sql`. If the first migration is already installed, back up/review and apply only the second. Never rerun the first against existing records.

Configure SMTP and verified-email redirects, provision Dev Brian privately, deploy both `admin-invite` and `account-lifecycle`, and set the function `APP_URL` secret. Before deployment set `VITE_PUBLIC_APP_URL` to the actual canonical origin so emailed links and exported QR codes remain stable. No service credentials belong in the frontend.

Use `npm run build`, `npm test`, `npm run test:db` and `npm run test:e2e` for local checks. Install Chromium for browser tests first with `npx playwright install chromium`. The browser test command uses isolated network fixtures, not real student accounts.

See DEPLOYMENT.md for hosted setup and TESTING.md for the remaining acceptance gates. Version 2 includes lecturers/units, feedback/ratings, reusable dashboards, responsive navigation/footer, appearance settings, required recognition-photo activation, legal scroll/acceptance gates and reviewed, strictly confirmed account erasure.
