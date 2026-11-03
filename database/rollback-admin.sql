-- Admin-panel schema rollback for a database previously upgraded by migrate.php.
-- Export deck_reports, user_notifications, security_events, and system_settings first; this removes
-- admin-role assignments, moderation records and notifications, audit history, and admin settings.
-- It leaves all pre-existing account, deck, card, document, Arena, and study rows.
DROP TABLE user_notifications;
DROP TABLE deck_reports;
DROP TABLE security_events;
DROP TABLE system_settings;
ALTER TABLE decks DROP COLUMN moderation_status;
ALTER TABLE users DROP COLUMN locked_until, DROP COLUMN role;
