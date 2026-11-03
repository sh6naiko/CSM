# Repository cleanup

The October 2026 cleanup removed code with no callers and consolidated duplicated reference files. Runtime routes, credentials, uploads, database rows, migrations, tests, and dependencies were preserved.

## Removed

- `login.css`: no page imported this old stylesheet; `login.html` contains the active sign-in styles.
- `start php server.txt`: its launch instructions are already in `README.md`.
- `database/CSM_SCHEMA.sql`: an unreferenced, outdated alternate schema missing tables present in `database/schema.sql`. Use the canonical schema for empty databases and the additive migrations for existing installations.
- Unreferenced React icon components, mock deck fixtures, the unused Markdown renderer and its formatter, unused deck handlers, and state/ref values that were never read. Associated write-only state updates were also removed.

## Organized

- Branding PNGs moved to `assets/images/`, with references updated in the app, landing page, and login page.
- The architecture guide moved to `docs/ARCHITECTURE.md`; README links use relative repository paths.
- Browser entry points remain at the root to preserve existing URLs and relative API calls.

## Recovery

The pre-cleanup versions of affected source files and images are saved locally in the ignored archive `storage/backups/cleanup-20261014-220436.zip`. Files in this archive are stored by basename; restore `CSM_SCHEMA.sql` under `database/` if needed. The archive preserves uncommitted edits that Git alone may not recover. Do not import its schema into an existing database.

Keep backups, secrets, private uploads, and installed dependencies out of routine unused-file deletion. CSS selectors and backend endpoints can be used dynamically, so a missing literal reference alone is not sufficient reason to remove them.
