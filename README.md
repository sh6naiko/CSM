# Co-StudyMaxx (PHP + MySQL + React)

Co-StudyMaxx is a modern active recall platform featuring flashcard reviewers ("Bombcards"), interactive PDF annotation tools, pressure-based countdown quiz games ("Bombstyle Arena"), and AI flashcard generation powered by Gemini. Bombstyle supports True/False, Multiple Choice, and Identification answer modes with server-side answer validation.

For codebase design, directory structure, and data flows, see [the architecture guide](docs/ARCHITECTURE.md).

## Project layout

- Root HTML pages, `api.js`, and styles: browser entry points and the shared API client.
- `src/`: React entry points, shared components, feature screens, and utilities. See [the frontend guide](docs/FRONTEND.md).
- `scripts/build-frontend.cjs`: builds `assets/app.js` and `assets/landing.js` from the React sources.
- `assets/images/`: shared branding images.
- `api/`, `server/`, and `classes/`: API routes, request/session handling, and database services.
- `database/schema.sql`: the canonical empty-database schema. Use `migrate.php` and `migrate-learning-workspace.php` for existing installations and the PDF learning workspace.
- `mailer/`: password-recovery email service.
- `tests/`: integration checks; `docs/`: project documentation.
- `storage/`: ignored local backups. Keep uploaded PDFs in the configured private upload directory.

See [cleanup notes](docs/CLEANUP.md) for removed legacy files and recovery information.

---

## Quick Start (Developer Launch)

### Option 1: 1-Click Launch on Windows (Recommended)
Double-click or run:
```bat
start.bat
```
This automatically detects `php` on your PATH or at `C:\xampp\php\php.exe` and launches the development server on `http://127.0.0.1:8080`.

### Option 2: Using npm
```powershell
npm install
npm run dev
# or
npm start
```

The npm server builds React before starting PHP and watches `src/` for changes. Refresh the browser after editing. `start.bat` builds once when launched; use `npm run build:watch` alongside it for ongoing edits.

### Option 3: Direct Command Line
```powershell
php -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8080 router.php
```

Then open `http://127.0.0.1:8080/` in your browser.

For a direct PHP launch or deployment, run `npm run build` after React changes and include both generated bundles in `assets/`. The checked-in bundles let PHP serve the app without Node.js at runtime.

Frontend browser checks use isolated API/PDF fixtures: run `npx playwright install chromium` once, then `npm run test:frontend`. The existing `npm test` command still runs the PHP API smoke tests.

---

## Environment Configuration

Copy `.env.example` to `.env` and fill in any required keys:
```env
APP_ENV=local
APP_BASE_URL=http://127.0.0.1:8080
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
```
The application automatically loads `.env` securely in [`server/bootstrap.php`](server/bootstrap.php). `.env` is ignored by Git to protect secrets.

To enable AI flashcard generation, create a local root `.env` from `.env.example`, add your Gemini API key from [Google AI Studio](https://aistudio.google.com/), and keep `GEMINI_MODEL=gemini-3.8-flash` unless you need a different model. The key remains server-side and is sent to Gemini through an API-key header; it is never placed in frontend JavaScript or request URLs. AI generation is limited to 20 requests per account per hour.

## Security requirements

The application applies security headers, server-side sessions, HttpOnly/SameSite cookies, CSRF and same-origin checks, per-browser tab binding, idle logout after 20 minutes, private PDF storage, upload validation, rate limits, and no-store API responses. These controls reduce risk but do not replace secure deployment practices.

Before exposing the site beyond local development:

1. Serve the site only over HTTPS, set `APP_ENV=production`, use an `https://` `APP_BASE_URL`, and set `secure_cookie` to `true`. The API refuses production startup when these requirements are missing.
2. Configure `ADMIN_BASE_URL` as a separate HTTPS host such as `https://admin.example.com`. Production startup refuses to run without a distinct admin host. The admin console is entered through `/admin`, and every `admin/*` API request independently checks the configured admin host before role authorization.
3. Set `ADMIN_IP_ALLOWLIST` to a comma-separated list of trusted administrator IPs when you have a fixed VPN, office, or Zero Trust egress address. Leave it blank only when your edge provider supplies the network restriction; do not expose the origin directly.
4. Keep `server/config.local.php`, `.env`, and `mailer/.env` outside version control. Rotate database, mailer, and AI credentials immediately if they were ever committed, pasted into a ticket, or shared publicly.
5. Use a dedicated MySQL account with only `SELECT, INSERT, UPDATE, DELETE` on this application database. Keep backups encrypted and restrict access to the private upload directory and database backups.
6. Keep the mailer bound to `127.0.0.1`; do not expose port `8091` to the network. Use authenticated SMTP with TLS in production.
7. Do not place uploaded PDFs or configuration files under a public web root. Review web-server logs and audit events without recording passwords, tokens, session IDs, or document contents.

---

## XAMPP Setup

1. Install/start Apache and MySQL in XAMPP. The app uses PHP 8+, PDO MySQL, `mbstring`, and `fileinfo` (included in the XAMPP PHP build).
2. Create a local database named `co_studymaxx` with `utf8mb4` collation. For a new empty database, import `database/schema.sql` using phpMyAdmin?s **Import** tab or `mysql -u root -p co_studymaxx < database/schema.sql`.
3. Create a least-privilege application user in MySQL. Grant `SELECT, INSERT, UPDATE, DELETE` on `co_studymaxx.*`; the application does not need DDL permissions at runtime.
4. Copy `server/config.example.php` to `server/config.local.php` and set a strong unique local password, database host/name, and a private upload directory. Keep `secure_cookie` false only for local HTTP; enable it behind HTTPS. `config.local.php` is ignored by Git.
5. For an existing Co-StudyMaxx database, back it up first, then run the additive migration with a database account temporarily allowed to alter the schema:

   ```powershell
   C:\xampp\mysql\bin\mysqldump.exe -u root -p co_studymaxx > co_studymaxx-backup.sql
   C:\xampp\php\php.exe database\migrate.php
   ```

   `database/migrate.php` reads `server/config.local.php` by default. For a one-time migration, you can override its connection using `CSM_MIGRATION_DSN`, `CSM_MIGRATION_USER`, and `CSM_MIGRATION_PASSWORD` environment variables (`__EMPTY__` represents an intentionally empty password), or temporarily grant its configured DB user the DDL permissions needed for the additive `ALTER`/`CREATE` statements. The migration adds nullable email data and password-reset token storage, scopes existing PDF metadata to its deck owner, adds True/False Bombcard support, per-Bombcard study progress and PDF highlight metadata, and adds admin roles, temporary account-lock status, deck moderation, owner-only review notifications, audit-event storage, system settings, and browser-scoped active-tab bindings. Existing accounts remain `user`; no account is automatically promoted. Existing account, reviewer, card, activity, Arena, and highlight rows are preserved. Revoke temporary DDL access afterward; runtime only needs `SELECT, INSERT, UPDATE, DELETE`.

   To roll back only the admin-panel schema, first export the admin tables and then apply `database/rollback-admin.sql` with a DDL-capable account. This intentionally removes admin roles/settings, moderation records and their user notifications, and audit history; the app's pre-existing study/account data is left in place. The rollback does not undo the earlier password-recovery or PDF/highlight migrations.
6. Either put the project under XAMPP?s `htdocs` and browse to it through Apache, or from this folder start the PHP development server:

   ```powershell
   C:\xampp\php\php.exe -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8080 router.php
   ```

   Then open `http://127.0.0.1:8080/`. `package.json` keeps `npm start`/`npm run serve` mapped to the PHP server. In Windows PowerShell, use `npm.cmd start` or `npm.cmd run serve` (PowerShell may block the `npm.ps1` shim under restrictive execution policies). Node is needed only for password-recovery email delivery; the rest of the app continues to run directly on PHP. Do not use VS Code Live Server or another static-only server; it cannot execute `api/index.php`.

## Admin access and first superadmin

After importing/updating the database, create an account normally in Co-StudyMaxx, then promote that existing account once from the repository root using the CLI. The script asks you to confirm the exact username/email, does not set or reveal a password, refuses to run outside CLI, and refuses to replace an existing superadmin:

```powershell
C:\xampp\php\php.exe database\bootstrap-superadmin.php your-existing-username
```

Type `YES` at the prompt, then sign out and back in. There are no default admin credentials. The CLI uses the configured application DB account; grant it only the normal runtime DML privileges. A superadmin can then grant `admin`/`superadmin` roles to other existing accounts from **Admin console → Users**. Only superadmins can change roles, and the server prevents removing the last superadmin (and prevents changing your own role).

Admins see an **Admin** navigation item after signing back in. Staff accounts do not have personal Library or Arena access; the server also denies their personal deck, document, study, and Arena API routes. The console reports total users, accounts active in the last five minutes, distinct study-active users for a selected period, decks, PDF uploads, Arena activity, and date summaries; supports user search, temporary login-lock release, and secure reset-link delivery through the existing recovery email flow; and provides a staff review queue for decks. Moderation outcomes (dismissed reports, hidden decks, and restored decks) appear in the deck owner?s persistent notifications with an unread indicator. Review notes are included so the owner understands the outcome. Admin actions use in-app confirmation/reason dialogs. Decks are private in the current app and its share token is not an authorized sharing feature, so reports are staff-created rather than allowing users to inspect/report other users' private decks. Hiding a deck removes it from the owner's normal study screens and ends any active Arena session, while retaining its data for restoration. Admins cannot see the raw security log or change system controls. Each account permits one active tab per browser profile: a successful sign-in in a different tab replaces the prior tab, immediately redirects other open tabs in that browser, and causes their later API requests (including PDF range requests) to be rejected. Separate browsers/devices can remain signed in independently; password changes and the superadmin **Clear all sessions** action still revoke all sessions as before.

From **Admin console → Content**, authorized staff can open a read-only preview of another account's Bombcard prompts, options, answers, hints, explanations, and attached PDFs. PDF access is streamed through a staff-only endpoint and recorded in the security event log; staff cannot edit the owner's content or launch gameplay from the preview.

Superadmins additionally see the raw security event log, maintenance mode, the global PDF storage limit (10 GiB initially), and **Clear all sessions**. Maintenance mode blocks regular-user workspace API requests while leaving sign-in/out and admin access available. Clearing sessions increments every account's `auth_version` and deletes server session records, signing everyone out. Audit events include actor, target, time, event code, and only non-sensitive details; IP addresses are stored as one-way hashes. Passwords, reset links/tokens, session IDs, and PDF contents are not audit fields. Repeated failed sign-ins temporarily lock the matched account for 30 minutes; an administrator can unlock it sooner, and a successful password reset clears the lock.

## Password recovery mail service

PHP continues to issue, hash, validate, expire, and consume reset tokens. A small Nodemailer bridge only sends the email; it binds to `127.0.0.1` and accepts requests only with a shared secret. The application uses the configured `APP_BASE_URL` to create reset links and never trusts the request Host header.

1. Install Node.js (LTS, version 20 or newer) on the machine that runs PHP, then from the repository root run `npm install` (`npm.cmd install` in Windows PowerShell).
2. Copy `mailer/.env.example` to `mailer/.env`. Generate a private shared secret with `C:\xampp\php\php.exe -r "echo bin2hex(random_bytes(32)), PHP_EOL;"` (or `php -r ...` where PHP is on PATH). Put the same generated value in `mailer/.env` as `CSM_MAILER_SECRET` and in `server/config.local.php` as `mailer_secret`. Never commit either local file.
3. Set `APP_BASE_URL` identically in the PHP configuration and `mailer/.env`, e.g. `http://127.0.0.1:8080` for local PHP development or `http://localhost/CSM` under local XAMPP Apache. Set `mailer_url` in `server/config.local.php` to `http://127.0.0.1:8091/send`. The URL is configured explicitly and is not constructed from incoming requests.
4. For real email delivery, set `MAILER_TRANSPORT=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURITY` (`implicit`, `starttls`, or `none` for local-only testing), `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `mailer/.env`. Recovery is not considered configured until both services have a valid base URL and matching secret and all SMTP fields are supplied. Do not use `none` in production. In production set `APP_ENV=production`, `NODE_ENV=production`, use an HTTPS `APP_BASE_URL`, and set PHP `secure_cookie` to `true` behind HTTPS.
5. Start the app with `npm start` (`npm.cmd start` in Windows PowerShell). When `mailer/.env` exists, the development launcher starts the Nodemailer bridge and PHP together and stops both when the launcher exits. If you use XAMPP Apache instead, start the bridge separately with `npm run mailer`. Keep the mail service on the same host as PHP; do not expose its port to the network.

The bridge reports `not configured` on `/health` until its settings are complete. Recovery requests always return the same confirmation for known and unknown email addresses; SMTP sending is started after the local bridge acknowledges the request to reduce timing-based account discovery. Reset links expire after 30 minutes, are single-use, and newer requests invalidate previous links. Tokens are carried in the URL fragment (not sent in the initial page request or web-server access logs) and the reset page removes the fragment from visible history after reading it.

The PDF Study Tool uses a pinned Mozilla PDF.js build from cdnjs, so PDF rendering requires an internet connection. Text selection/highlighting is available for text-based PDFs; scanned image-only documents require OCR before text can be selected.

## Data and sample content

`database/schema.sql` is for an empty database only. For data already in the prior schema, run the migration, not the empty schema over that database. There is no automatic sample-data seeder: the old frontend?s sample decks were presentation mocks and are not copied into real accounts. The app now displays each signed-in account?s saved data. Existing users without email can continue signing in with username; an email is required when registering a new account. Browser-only legacy profile/activity data is not silently assigned to a server account; the login page offers a JSON export, while old plaintext browser credentials are removed.

Uploaded PDFs are stored outside the public project folder (default: a `csm-private-uploads` directory two levels above `server/`) under generated names. Back up that directory along with MySQL. Never place it under `htdocs` or the repository.

## Checks

With the PHP server running and `server/config.local.php` configured:

```powershell
C:\xampp\php\php.exe tests\api-smoke.php
```

For the recovery checks, copy `mailer/.env.example`, set a valid shared secret and matching local base URL, set `MAILER_TRANSPORT=stub`, and start `npm run mailer` (or `npm.cmd run mailer` in Windows PowerShell) in another terminal. The stub uses Nodemailer's JSON transport, keeps messages in memory, and does not contact SMTP. The API smoke test creates temporary accounts and exercises registration/sign-in, reviewer/card/PDF/highlight/Arena persistence, cross-account isolation, role boundaries, analytics/moderation, maintenance, generic reset responses, invalidated/invalid/expired/used tokens, and password-reset session revocation. `php tests/tab-session-smoke.php` separately verifies that a new sign-in in another tab invalidates the previous tab while a sign-in in another browser remains independent. QA users, audit rows, server sessions, and account-specific throttles are removed afterward. The API smoke test intentionally skips **Clear all sessions** because that action signs out every account in the configured database; to test it, use a disposable database and explicitly set `CSM_TEST_ALLOW_SESSION_CLEAR=YES`.

If the mail bridge is currently configured for real SMTP and you want to run the rest of the API smoke test without sending mail, set `$env:CSM_TEST_SKIP_RECOVERY='1'` before running it, then clear that environment variable afterward. This skips the password-reset cases (including the staff-triggered reset-link case) while still exercising moderation notifications and role/dashboard flows. Leave the variable unset to run the complete suite with the stub transport.

## Current limits

- The legacy ?share? action still produces a client-side share token and is not a server-authorized collaborator workflow. Private data is never exposed by that token. Sharing needs a product decision on roles and revocation before it can be made real.
- Deck review reports are currently initiated by staff from the admin deck directory because no server-authorized deck-sharing/reporting flow exists. User-to-user reports should be added only alongside a real visibility/sharing permission model.
- The PDF viewer can serve an owned PDF securely, and notes are stored per document, but the existing mock annotation UI is not a true text-selection/highlight editor.
- Privacy-policy text/links and account deletion are not implemented.
