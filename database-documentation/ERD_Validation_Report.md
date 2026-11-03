# Co-StudyMaxx ERD Validation Report

## Verified model

- Tables represented: **30**
- Columns represented: **226**
- Verified foreign-key relationships: **42**
- Nullable foreign-key relationships shown as optional at the referenced end: **13**
- Unique foreign-key relationships shown as one-to-one: **4**
- Source: canonical schema plus the additive learning-workspace migration.
- The original deliverable was preserved as `Co-StudyMaxx_ERD_before_rebuild_20261029.drawio` before this rebuild.

## Layout rebuild

- Rebuilt the diagram from a new layout and routing process; no prior connector geometry was retained.
- Added six editable pages: one complete overview and five focused documentation pages.
- Tables use the required two-column KEY / VARIABLE layout with exact schema and migration column names.
- Table sizes are calculated from their actual column counts.
- Each connector is routed with orthogonal obstacle-aware paths and attaches near the relevant FK and referenced PK rows.
- Crow's Foot endpoints distinguish zero-to-many, zero-to-one, mandatory one, and optional one using FK uniqueness and nullability.
- Tables have square corners, consistent typography, dark headers, light column headers, and white backgrounds.

## Automated checks

- Draw.io XML parse: **PASS**
- Table vertices: **30** on the complete page
- Relationship edges: **42** on the complete page
- Dangling connector endpoints: **0**
- Overlapping table rectangles: **0**
- Connector-to-unrelated-table collisions: **0**
- Unrelated connector pairs with at least one geometric intersection (summed across pages): **92**
- Complete overview crossing pairs: **76**
- Focused-page crossing pairs: User and Authentication: 0; Decks and Bombcards: 3; Arena and Game Sessions: 1; Documents and Study Features: 10; Administration and System: 2
- Rendering check performed: native XML geometry and route collision inspection; no Draw.io desktop renderer was available in the workspace.

## Database inconsistencies

The recovered MariaDB snapshot contains **22** tables and is treated as a historical snapshot, not the current schema source. Differences from the current schema/migrations:

- users: recovered dump differs (missing: banned_at, banned_by_user_id, ban_reason; extra: active_tab_hash).
- profiles: recovered dump differs (missing: first_name, middle_name, last_name, deck_visibility; extra: none).
- decks: recovered dump differs (missing: visibility, deleted_at; extra: none).
- documents: recovered dump differs (missing: page_count, processing_status, last_page, text_extracted; extra: none).
- Recovered dump does not contain project-declared table bombcard_reviews.
- Recovered dump does not contain project-declared table admin_archive_notice_state.
- Recovered dump does not contain project-declared table document_pages.
- Recovered dump does not contain project-declared table document_notes.
- Recovered dump does not contain project-declared table study_decks.
- Recovered dump does not contain project-declared table study_flashcards.
- Recovered dump does not contain project-declared table flashcard_tags.
- Recovered dump does not contain project-declared table flashcard_review_progress.

Application-level relationships not enforced by the database:

- bombcard_reviews.bombcard_id -> cards.id is used by application queries but is not declared as a foreign key.
- security_events.target_id is polymorphic and indexed, not a foreign key.
- users.banned_by_user_id records an actor but has no declared foreign-key constraint.
