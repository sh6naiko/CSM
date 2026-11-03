# React component guide

The previous `index.jsx` has been replaced by ES modules under `src/`. Both authenticated users and shared-deck guests load the same workspace bundle.

| Location | Responsibility |
| --- | --- |
| `src/main.jsx` | Session/guest bootstrap and root rendering |
| `src/App.jsx` | Shared workspace state, navigation, API actions, and composing screens/dialogs |
| `src/landing.jsx` | Landing page entry point |
| `src/components/layout/` | Sidebar and workspace header |
| `src/components/ui/` | Reusable Button, Modal, and ProgressBar |
| `src/components/dialogs/` | Shared confirmations, completion notices, and guest restriction dialog |
| `src/components/forms/` | Password strength indicator |
| `src/components/icons.jsx` | Shared workspace SVG icons |
| `src/features/` | Account, admin, AI, archive, arena, cards, dashboard, landing, library, PDF, people, and study components |
| `src/services/client.js` | Explicit access to the existing `api.js` session-aware client |
| `src/utils/` | Deck title normalization, pagination, account presentation, passwords, preferences |
| `src/audio/` | Sound engine and shared audio instance |
| `src/bootstrap/` | Startup failure views |

## Component contracts

Screen components receive their data and actions as explicit props. Cross-screen state remains in `App` so selecting a deck, opening its PDF, returning to the deck, and resuming study retain the existing behavior. Feature components with independent state (such as admin screens and the PDF viewer) keep that state locally. Do not declare component functions inside `App`; doing so gives React a new component type on every render.

Shared controls do not own application state:

```jsx
<Button variant="primary" onClick={save} disabled={saving}>Save</Button>

<ConfirmationDialog
  title="Archive this deck?"
  message="You can restore it later."
  kicker="DECK ARCHIVE"
  confirmLabel="Move to archive"
  variant="primary"
  onConfirm={archive}
  onCancel={close}
/>

<ProgressBar value={percent} label="Deck mastery" className="csm-library-deck-progress-track" />

<LibraryDeckCard deck={deck} studyProgress={progress} onOpen={openDeck} actions={<DeckActions />} />
```

`Button` forwards native button attributes and refs, defaults to `type="button"`, and supports primary/secondary/danger styles. Set `type="submit"` explicitly inside forms.

`Modal` provides the existing backdrop/dialog DOM and accessibility labels; callers control whether it is mounted and what closes it. `ConfirmationDialog` builds on it with unique label IDs and optional busy/error states. Existing feature-specific modal styling, portals, keyboard behavior, and animations remain in their respective components.

`ProgressBar` clamps values to 0–100 and renders zero as an empty track. `LibraryDeckCard` accepts an action slot, so it does not depend on a particular dropdown implementation. `PdfPagination` is reused above and below the PDF and uses the same page state/callback for both.

## Build and development

```sh
npm install
npm run dev             # Builds, watches React sources, and starts PHP
npm run build           # Builds both browser bundles once
npm run build:watch     # Watches sources with a separately running PHP server
npm run format:frontend
```

The build uses esbuild and React 18. HTML pages load `assets/app.js` or `assets/landing.js`; JSX is no longer compiled in the browser. Keep generated bundles with deployments and rebuild them after changing `src/`. Do not edit generated JavaScript directly. Tailwind, PDF.js, and the existing styles retain their current loading paths.

`start.bat` builds once before launching PHP. A direct PHP launch uses the already-built bundles and does not need Node.js at runtime.

## Verification

### Daily study goal

`DailyStudyGoal` reads `GET study/daily-goal&timezone=<browser IANA zone>`. The server counts distinct Bombcard IDs reviewed during that local calendar day: Study answer reveals saved through `POST study/progress`, plus correct or wrong Arena submissions. Repeats across both modes count once; timeouts and general activity (navigation, editing, uploads) do not count. The target is 20 and the percentage is capped at 100, while the actual review count can exceed 20. Resetting deck mastery does not erase daily review history.

Run `php database/migrate.php` before deploying the updated app to create `bombcard_reviews`. Historical Arena answers remain countable; historical Study interactions cannot be reconstructed accurately and begin tracking with this update. The widget refreshes on return, focus, saved Study reviews, and local midnight. Failed requests show an error and Retry action instead of a fabricated count.

`php tests/daily-study-goal.php` verifies counting, user isolation, deduplication, mastery reset preservation, local midnight, daylight-saving boundaries, and the percentage cap using database fixtures rolled back afterward.

```sh
npx playwright install chromium
npm run test:frontend
```

The frontend command rebuilds first. Tests cover screen mounting, library actions, shared confirmation dialogs, AI dialog opening/cancellation, PDF pagination and refresh restoration, returning to the source deck, study navigation, guest access, admin report/archive notices, and the landing FAQ. API and PDF fixtures keep these checks independent of real accounts, uploaded files, and AI services. They do not replace backend integration tests or live Gemini/PDF rendering checks.

To use an installed Chromium browser, set `CSM_BROWSER_PATH` to its executable path before running the frontend tests. `npm test` remains the existing PHP API test suite.
