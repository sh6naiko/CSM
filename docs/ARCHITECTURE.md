# Co-StudyMaxx System Architecture

Start with [the README](../README.md) for installation and commands. Static branding images live in `assets/images/`; project documentation lives in `docs/`. Browser entry pages stay at the project root so existing routes and relative API requests continue to work.

Co-StudyMaxx is a lightweight, high-performance study platform combining active recall flashcards ("Bombcards"), PDF annotation tools, pressure-based countdown quiz games ("Bombstyle Arena"), and AI flashcard generation.

The architecture uses a modular React frontend built with esbuild and a PHP API with per-account data isolation. See [the frontend component guide](FRONTEND.md) for module ownership and build commands.

---

## 1. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              CLIENT (Browser)                           |
|  index.html + assets/app.js (React) + index.css + PDF.js + SoundEngine     |
+------------------------------------+------------------------------------+
                                     |  HTTP REST / JSON
                                     v
+------------------------------------+------------------------------------+
|                         ROUTING & MIDDLEWARE                            |
|       router.php  -->  server/bootstrap.php  -->  api/index.php         |
|  - Auto-loads .env                                                      |
|  - CSRF verification, rate limiting, and multi-tab session validation  |
+------------------------------------+------------------------------------+
                                     |
         +---------------------------+---------------------------+
         |                                                       |
         v                                                       v
+--------+--------+                                     +--------+--------+
| DOMAIN SERVICES |                                     | EXTERNAL / CLOUD|
|   classes/*.php |                                     |                 |
|  - User.php     |                                     | - Gemini API    |
|  - Deck.php     |                                     |   (Flashcards)  |
|  - Bombcard.php |                                     |                 |
|  - Material.php |                                     | - Node Mailer   |
|  - DeckShare.php|                                     |   (Port 8091)   |
|  - Achievements.php |                                 |                 |
+--------+--------+                                     +-----------------+
         |
         v
+--------+--------+
|  MySQL/MariaDB  |
| (Database / PDO)|
+-----------------+
```

---

## 2. Directory Structure

```
CSM/
├── .env                  # Secret environment variables (Ignored by Git)
├── .env.example          # Sample environment template (Tracked in Git)
├── start.bat             # 1-Click developer startup script for Windows
├── package.json          # Node scripts ("dev", "start", "mailer", "test")
├── router.php            # Built-in PHP server router for clean URLs
├── assets/images/        # Mascot and sidebar branding images
├── docs/                 # Architecture and maintenance documentation
├── database/             # Canonical schema.sql and additive migrations
│
├── index.html            # Main SPA host page (compiled React bundle + Tailwind)
├── src/                  # React screens, reusable components, utilities, bootstrap
├── scripts/              # Frontend build script
├── index.css             # Design system, glassmorphism, animations, layouts
├── landing.html          # Public marketing & product introduction page
├── login.html            # Authentication (Sign in, Register, Password Reset)
├── shared.html           # Public guest deck study interface
│
├── api/
│   └── index.php         # Clean REST API gateway (Routes, Dispatching, Auth)
│
├── classes/              # Domain Services (OOP PHP with PDO)
│   ├── Database.php      # PDO database connection & query wrapper
│   ├── User.php          # User registration, authentication, and profiles
│   ├── Deck.php          # Reviewer decks, categorization, and ownership
│   ├── Bombcard.php      # Flashcards CRUD (Multiple Choice, True/False, Identification)
│   ├── Achievements.php  # Persistent badge awards and notification creation
│   ├── Material.php      # PDF document records & secure file management
│   ├── DeckShare.php     # Public guest sharing tokens (64-char hex)
│   ├── StudyProgress.php # Leitner box spaced repetition tracking
│   ├── BombstyleSession.php # Quiz gameplay sessions and streaks
│   └── Admin.php         # Audit logging, user moderation, system metrics
│
├── server/
│   ├── bootstrap.php     # Zero-dependency .env loader, session handler, helpers
│   ├── config.local.php  # Local database credentials & upload limits
│   ├── arena.php         # Bombstyle Arena game round logic & scoring
│   └── learning_workspace.php # PDF notes, study cards, and AI routes
│
├── mailer/
│   └── server.js         # Optional background microservice for password reset emails
│
└── tests/                # Automated smoke tests
    ├── deck-sharing-smoke.php
    ├── tab-session-smoke.php
    └── api-smoke.php
```

---

## 3. Frontend Architecture

### Technology Stack
- **React 18** in ES modules under `src/`, bundled by esbuild into `assets/app.js` and `assets/landing.js`. `npm run dev` builds and watches the sources; direct PHP deployments serve the generated bundles without Node.js at runtime.
- **Tailwind CSS + Custom CSS (`index.css`)**: Tailored color palette, dark mode cards, micro-animations, and smooth accordion transitions.
- **PDF.js**: Client-side PDF rendering, text layer extraction, and highlight coordinates.
- **SoundEngine**: Web Audio API synthesizer for tactile game audio (clicks, correct notes, detonation).

### Navigation & Screen Hierarchy
All user features are accessible within 1 click:

1. **Home Screen (`home`)**:
   - **Quick Stats**: Total Cards, Decks, Accuracy, Study Streaks.
   - **Study Tools Grid (4 Core Tools)**:
     1. **Reviewer Library**: Deck organization and management.
     2. **Bombstyle Arena**: Fast-paced countdown quiz game.
     3. **PDF Study Tool**: Interactive PDF reading and excerpt capture.
     4. **AI Flashcard Maker**: Instant generation from notes/PDFs.
   - **Recent Activity**: Resume studying where you left off.

2. **Reviewer Library (`library`)**:
   - Nested animated sidebar subnav:
     - **Study (`flashcards`)**: Flip cards, check answers, Leitner box progress.
     - **Create Bombcards (`creator`)**: Modern 2-step card authoring studio.
     - **PDF Tools (`highlighter`)**: Read PDFs, highlight text, and save excerpts.
     - **AI Generator ✨**: Modal to forge flashcards via Gemini AI.

3. **Arena Lobby & Game (`arena`, `game`)**:
   - Solo Blitz, Custom Challenge, or Live Lobby countdown matches.

---

## 4. Backend & API Architecture

### Clean API Gateway (`api/index.php`)
All requests route through `api/index.php?r=<route>`:
- **`auth/*`**: Session check, login, register, password reset, logout.
- **`shared/*`**: Public guest access to decks and documents without login.
- **`admin/*`**: Administrative dashboard, moderation, deck reports, audit logs.
- **`decks` & `decks/share`**: Reviewer management and token share links.
- **`cards`**: Bombcard CRUD operations.
- **`ai/generate`**: Gemini AI flashcard creation pipeline.
- **`documents` & `documents/file`**: Secure PDF upload, download, and streaming.
- **`highlights` & `highlights/card`**: PDF annotations and one-click card conversion.
- **`study/progress` & `activity`**: User learning stats and recent activity tracking.
- **`arena/*`**: Multiplayer and solo quiz gameplay states.

### Security Features
1. **API Keys & Secrets**: Loaded securely from `.env` via `server/bootstrap.php` (never exposed to client).
2. **CSRF Protection**: All `POST`, `PATCH`, and `DELETE` requests validate `X-CSRF-Token`.
3. **Session Hardening**: Multi-tab synchronization (`user_active_tabs`) prevents stale tab overwrite collisions.
4. **PDF File Isolation**: Stored in a directory outside the public web root with mime and magic header inspection (`%PDF-`).

---

## 5. Development & Operations

### Starting the Server
- **Windows 1-Click**: Run `start.bat` (automatically detects PHP on PATH or XAMPP).
- **npm**: `npm run dev` or `npm start`.
- **Command Line**:
  ```bash
  php -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8080 router.php
  ```

### Running Automated Smoke Tests
```bash
php tests/tab-session-smoke.php
php tests/deck-sharing-smoke.php
```
