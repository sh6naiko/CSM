-- Empty database only. For an existing Co-StudyMaxx install, run database/migrate.php.
SET NAMES utf8mb4;
CREATE TABLE users (
 id CHAR(32) PRIMARY KEY, username VARCHAR(24) NOT NULL UNIQUE,
 email VARCHAR(254) NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, auth_version INT NOT NULL DEFAULT 1,
 role ENUM('user','admin','superadmin') NOT NULL DEFAULT 'user', locked_until DATETIME(3) NULL,
 banned_at DATETIME(3) NULL, banned_by_user_id CHAR(32) NULL, ban_reason VARCHAR(500) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE profiles (
 user_id CHAR(32) PRIMARY KEY, display_name VARCHAR(40) NOT NULL, first_name VARCHAR(80) NOT NULL DEFAULT '', middle_name VARCHAR(80) NULL, last_name VARCHAR(80) NOT NULL DEFAULT '', avatar VARCHAR(16) NOT NULL DEFAULT 'ember', deck_visibility ENUM('private','public') NOT NULL DEFAULT 'private', name_changed_at DATETIME(3) NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE web_sessions (id VARCHAR(128) PRIMARY KEY,payload MEDIUMBLOB NOT NULL,expires_at BIGINT NOT NULL,INDEX(expires_at)) ENGINE=InnoDB;
CREATE TABLE user_active_tabs (
 user_id CHAR(32) NOT NULL,browser_hash CHAR(64) NOT NULL,active_tab_hash CHAR(64) NOT NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 PRIMARY KEY(user_id,browser_hash),INDEX(updated_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE auth_attempts (bucket CHAR(64) PRIMARY KEY,attempts INT NOT NULL DEFAULT 0,window_start BIGINT NOT NULL,INDEX(window_start)) ENGINE=InnoDB;
CREATE TABLE password_reset_tokens (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,token_hash CHAR(64) NOT NULL UNIQUE,
 expires_at DATETIME(3) NOT NULL,used_at DATETIME(3) NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX(user_id,used_at,created_at),INDEX(expires_at,used_at),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE decks (
 id CHAR(32) PRIMARY KEY,user_id CHAR(32) NOT NULL,title VARCHAR(160) NOT NULL,subject VARCHAR(160) NOT NULL DEFAULT '',category VARCHAR(80) NOT NULL DEFAULT 'Recent',moderation_status ENUM('visible','hidden') NOT NULL DEFAULT 'visible',visibility ENUM('inherit','private','public') NOT NULL DEFAULT 'inherit',deleted_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX(user_id,updated_at),INDEX(user_id,deleted_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- One source of truth for hand-authored and future approved generated Bombcards.
CREATE TABLE cards (
 id CHAR(32) PRIMARY KEY,deck_id CHAR(32) NOT NULL,type ENUM('MULTIPLE_CHOICE','TRUE_FALSE','IDENTIFICATION') NOT NULL,prompt TEXT NOT NULL,hint VARCHAR(500) NOT NULL DEFAULT '',
 correct_answer TEXT NOT NULL,alternates TEXT NOT NULL,explanation TEXT NOT NULL,position INT NOT NULL DEFAULT 0,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX(deck_id,position),FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE card_options (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,card_id CHAR(32) NOT NULL,position INT NOT NULL,answer_text VARCHAR(2000) NOT NULL,is_correct BOOLEAN NOT NULL DEFAULT FALSE,
 UNIQUE(card_id,position),FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE documents (
 id CHAR(32) PRIMARY KEY,user_id CHAR(32) NOT NULL,deck_id CHAR(32) NOT NULL,title VARCHAR(255) NOT NULL,stored_name VARCHAR(80) NOT NULL UNIQUE,
 mime_type VARCHAR(80) NOT NULL,size_bytes BIGINT NOT NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX(user_id,created_at),INDEX(deck_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE highlights (
 id CHAR(32) PRIMARY KEY,document_id CHAR(32) NOT NULL,page_number INT NOT NULL DEFAULT 1,note_text TEXT NOT NULL,color CHAR(7) NOT NULL,
 purpose VARCHAR(16) NOT NULL DEFAULT 'note',selection_json LONGTEXT NULL,card_id CHAR(32) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX(document_id,page_number),INDEX idx_highlights_card(card_id),FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE bombcard_progress (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,bombcard_id CHAR(32) NOT NULL,status ENUM('new','learning','known') NOT NULL DEFAULT 'new',
 times_seen INT UNSIGNED NOT NULL DEFAULT 0,times_known INT UNSIGNED NOT NULL DEFAULT 0,times_unknown INT UNSIGNED NOT NULL DEFAULT 0,
 last_reviewed_at DATETIME(3) NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE(user_id,bombcard_id),INDEX(user_id,status),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(bombcard_id) REFERENCES cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Actual Study interactions, separate from resettable mastery and general activity.
-- Keep card identifiers as history even if a card is later removed; no content is stored.
CREATE TABLE bombcard_reviews (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,bombcard_id CHAR(32) NOT NULL,
 reviewed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX(user_id,reviewed_at,bombcard_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE study_activity (
 id CHAR(32) PRIMARY KEY,user_id CHAR(32) NOT NULL,deck_id CHAR(32) NULL,material VARCHAR(255) NOT NULL,mode VARCHAR(80) NOT NULL,screen VARCHAR(32) NOT NULL,status VARCHAR(40) NOT NULL,accuracy DECIMAL(5,2) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),INDEX(user_id,created_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE arena_sessions (
 id CHAR(32) PRIMARY KEY,user_id CHAR(32) NOT NULL,deck_id CHAR(32) NULL,deck_title VARCHAR(160) NOT NULL,difficulty ENUM('easy','normal','hard') NOT NULL,starting_seconds INT NOT NULL,
 remaining_ms BIGINT NOT NULL,clock_at_ms BIGINT NOT NULL,paused BOOLEAN NOT NULL DEFAULT FALSE,status ENUM('active','completed','timeout','abandoned') NOT NULL DEFAULT 'active',
 current_index INT NOT NULL DEFAULT 0,correct_count INT NOT NULL DEFAULT 0,streak INT NOT NULL DEFAULT 0,max_streak INT NOT NULL DEFAULT 0,duration_ms BIGINT NOT NULL DEFAULT 0,
 started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),ended_at DATETIME(3) NULL,INDEX(user_id,status,started_at),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE arena_questions (
 session_id CHAR(32) NOT NULL,position INT NOT NULL,card_id CHAR(32) NULL,snapshot LONGTEXT NOT NULL,PRIMARY KEY(session_id,position),
 FOREIGN KEY(session_id) REFERENCES arena_sessions(id) ON DELETE CASCADE,FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE arena_answers (
 id CHAR(32) PRIMARY KEY,session_id CHAR(32) NOT NULL,position INT NOT NULL,result ENUM('correct','wrong','timeout') NOT NULL,adjustment_seconds INT NOT NULL,remaining_ms BIGINT NOT NULL,
 submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),UNIQUE(session_id,position),FOREIGN KEY(session_id,position) REFERENCES arena_questions(session_id,position) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin review is internal: decks remain private to their owner and staff.
CREATE TABLE deck_reports (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,deck_id CHAR(32) NOT NULL,flagged_by_user_id CHAR(32) NULL,
 reason VARCHAR(1000) NOT NULL,status ENUM('open','dismissed','actioned') NOT NULL DEFAULT 'open',
 moderation_action ENUM('hide','restore') NULL,moderation_reason VARCHAR(1000) NULL,reviewed_by_user_id CHAR(32) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),reviewed_at DATETIME(3) NULL,
 INDEX(status,created_at),INDEX(deck_id,status),
 FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE,
 FOREIGN KEY(flagged_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,deck_id CHAR(32) NULL,
 notification_type VARCHAR(40) NOT NULL,title VARCHAR(160) NOT NULL,message VARCHAR(1000) NOT NULL,
 read_at DATETIME(3) NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX idx_user_notifications_unread(user_id,read_at,created_at),INDEX idx_user_notifications_deck(deck_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_archive_notice_state (
 user_id CHAR(32) PRIMARY KEY,
 last_inactive_checked_at DATETIME(3) NOT NULL DEFAULT '1970-01-01 00:00:00.000',
 last_security_cutoff_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
 pending_inactive_users INT UNSIGNED NOT NULL DEFAULT 0,
 pending_security_events INT UNSIGNED NOT NULL DEFAULT 0,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_achievements (
 user_id CHAR(32) NOT NULL,achievement_key VARCHAR(40) NOT NULL,
 earned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(user_id,achievement_key),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE security_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,actor_user_id CHAR(32) NULL,target_user_id CHAR(32) NULL,
 target_type ENUM('user','deck','system') NOT NULL DEFAULT 'user',target_id CHAR(32) NULL,
 event_code VARCHAR(64) NOT NULL,ip_hash CHAR(64) NULL,details_json LONGTEXT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX(created_at),INDEX(event_code,created_at),INDEX(target_user_id,created_at),INDEX idx_security_target(target_type,target_id),
 FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_settings (
 setting_key VARCHAR(64) PRIMARY KEY,value_text VARCHAR(255) NOT NULL,updated_by_user_id CHAR(32) NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 FOREIGN KEY(updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO system_settings(setting_key,value_text) VALUES
 ('maintenance_mode','0'),('storage_limit_bytes','10737418240')
ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);

CREATE TABLE deck_shares (
 id CHAR(32) PRIMARY KEY,deck_id CHAR(32) NOT NULL UNIQUE,share_token CHAR(64) NOT NULL UNIQUE,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX idx_deck_shares_token(share_token, is_active),
 FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
