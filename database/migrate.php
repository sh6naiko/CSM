<?php
// Additive migration for the existing Co-StudyMaxx schema; never drops or rewrites a row.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$config=require dirname(__DIR__).'/server/config.local.php';
$migrationDsn=getenv('CSM_MIGRATION_DSN');$migrationUser=getenv('CSM_MIGRATION_USER');$migrationPassword=getenv('CSM_MIGRATION_PASSWORD');
$dsn=$migrationDsn===false?$config['dsn']:$migrationDsn;$dbUser=$migrationUser===false?$config['user']:$migrationUser;
$dbPassword=$migrationPassword===false?$config['password']:($migrationPassword==='__EMPTY__'?'':$migrationPassword);
try{$db=new PDO($dsn,$dbUser,$dbPassword,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);}
catch(Throwable $error){fwrite(STDERR,"Could not connect to MySQL with the configured migration credentials.\n");exit(1);}
$tables=$db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach(['users','decks','cards','documents'] as $required) if(!in_array($required,$tables,true)){fwrite(STDERR,"Expected existing table '$required'; use schema.sql only for a new empty database.\n");exit(1);}
if(!in_array('profiles',$tables,true)){fwrite(STDERR,"Expected existing table 'profiles'; use schema.sql only for a new empty database.\n");exit(1);}
$profileColumns=array_column($db->query('SHOW COLUMNS FROM profiles')->fetchAll(),'Field');
if(!in_array('deck_visibility',$profileColumns,true)){$db->exec("ALTER TABLE profiles ADD COLUMN deck_visibility ENUM('private','public') NOT NULL DEFAULT 'private' AFTER avatar");echo "Added private-by-default deck discovery settings.\n";}
if(!in_array('first_name',$profileColumns,true)){$db->exec("ALTER TABLE profiles ADD COLUMN first_name VARCHAR(80) NOT NULL DEFAULT '' AFTER display_name");echo "Added first names to profiles; existing accounts were preserved.\n";}
if(!in_array('middle_name',$profileColumns,true)){$db->exec("ALTER TABLE profiles ADD COLUMN middle_name VARCHAR(80) NULL AFTER first_name");echo "Added optional middle names to profiles.\n";}
if(!in_array('last_name',$profileColumns,true)){$db->exec("ALTER TABLE profiles ADD COLUMN last_name VARCHAR(80) NOT NULL DEFAULT '' AFTER middle_name");echo "Added last names to profiles; existing accounts were preserved.\n";}
if(!in_array('password_reset_tokens',$tables,true)){
    $db->exec("CREATE TABLE password_reset_tokens (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,token_hash CHAR(64) NOT NULL UNIQUE,expires_at DATETIME(3) NOT NULL,used_at DATETIME(3) NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),INDEX(user_id,used_at,created_at),INDEX(expires_at,used_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created password reset token storage.\n";
}
$columns=array_column($db->query('SHOW COLUMNS FROM users')->fetchAll(),'Field');
if(!in_array('email',$columns,true)){ $db->exec('ALTER TABLE users ADD COLUMN email VARCHAR(254) NULL UNIQUE AFTER username'); echo "Added nullable unique email; existing usernames/password hashes were preserved.\n"; }
$columns=array_column($db->query('SHOW COLUMNS FROM documents')->fetchAll(),'Field');
if(!in_array('user_id',$columns,true)){
    $db->exec('ALTER TABLE documents ADD COLUMN user_id CHAR(32) NULL AFTER id');
    $db->exec('UPDATE documents m JOIN decks d ON d.id=m.deck_id SET m.user_id=d.user_id WHERE m.user_id IS NULL');
    $db->exec('ALTER TABLE documents MODIFY user_id CHAR(32) NOT NULL, ADD INDEX idx_documents_user_created(user_id,created_at), ADD CONSTRAINT fk_documents_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE');
    echo "Backfilled material ownership from each parent deck; existing PDF metadata and IDs were preserved.\n";
}
if(!in_array('bombcard_progress',$tables,true)){
    $db->exec("CREATE TABLE bombcard_progress (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,bombcard_id CHAR(32) NOT NULL,status ENUM('new','learning','known') NOT NULL DEFAULT 'new',times_seen INT UNSIGNED NOT NULL DEFAULT 0,times_known INT UNSIGNED NOT NULL DEFAULT 0,times_unknown INT UNSIGNED NOT NULL DEFAULT 0,last_reviewed_at DATETIME(3) NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),UNIQUE(user_id,bombcard_id),INDEX(user_id,status),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(bombcard_id) REFERENCES cards(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created per-user Bombcard progress. Existing cards, sessions, results, and notes were preserved.\n";
}
if(!in_array('bombcard_reviews',$tables,true)){
    $db->exec("CREATE TABLE bombcard_reviews (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,bombcard_id CHAR(32) NOT NULL,
        reviewed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX(user_id,reviewed_at,bombcard_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created actual Bombcard review history for daily goals. Existing activity and mastery were preserved.\n";
}
$highlightTables=$db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
if(in_array('highlights',$highlightTables,true)){
    $columns=array_column($db->query('SHOW COLUMNS FROM highlights')->fetchAll(),'Field');
    if(!in_array('purpose',$columns,true)){$db->exec("ALTER TABLE highlights ADD COLUMN purpose VARCHAR(16) NOT NULL DEFAULT 'note'");echo "Added highlight purpose metadata.\n";}
    if(!in_array('selection_json',$columns,true)){$db->exec('ALTER TABLE highlights ADD COLUMN selection_json LONGTEXT NULL');echo "Added persisted PDF selection geometry.\n";}
    if(!in_array('card_id',$columns,true)){$db->exec('ALTER TABLE highlights ADD COLUMN card_id CHAR(32) NULL');echo "Added source Bombcard link for highlights.\n";}
    $indexes=$db->query('SHOW INDEX FROM highlights')->fetchAll();
    if(!in_array('idx_highlights_card',array_column($indexes,'Key_name'),true))$db->exec('ALTER TABLE highlights ADD INDEX idx_highlights_card(card_id)');
    $foreign=$db->query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='highlights' AND COLUMN_NAME='card_id' AND REFERENCED_TABLE_NAME='cards'")->fetchColumn();
    if(!$foreign)$db->exec('ALTER TABLE highlights ADD CONSTRAINT fk_highlights_card FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE SET NULL');
}
$userColumns=array_column($db->query('SHOW COLUMNS FROM users')->fetchAll(),'Field');
if(!in_array('role',$userColumns,true)){$db->exec("ALTER TABLE users ADD COLUMN role ENUM('user','admin','superadmin') NOT NULL DEFAULT 'user' AFTER auth_version");echo "Added default user roles; existing accounts remain regular users.\n";}
if(!in_array('locked_until',$userColumns,true)){$db->exec('ALTER TABLE users ADD COLUMN locked_until DATETIME(3) NULL AFTER role');echo "Added temporary account-lock status.\n";}
if(!in_array('banned_at',$userColumns,true)){$db->exec('ALTER TABLE users ADD COLUMN banned_at DATETIME(3) NULL AFTER locked_until');echo "Added reversible account ban status.\n";}
if(!in_array('banned_by_user_id',$userColumns,true)){$db->exec('ALTER TABLE users ADD COLUMN banned_by_user_id CHAR(32) NULL AFTER banned_at');echo "Added account ban actor tracking.\n";}
if(!in_array('ban_reason',$userColumns,true)){$db->exec('ALTER TABLE users ADD COLUMN ban_reason VARCHAR(500) NULL AFTER banned_by_user_id');echo "Added account ban reason tracking.\n";}
$deckColumns=array_column($db->query('SHOW COLUMNS FROM decks')->fetchAll(),'Field');
if(!in_array('visibility',$deckColumns,true)){$db->exec("ALTER TABLE decks ADD COLUMN visibility ENUM('inherit','private','public') NOT NULL DEFAULT 'inherit' AFTER moderation_status");echo "Added per-deck visibility overrides; existing decks remain private by default.\n";}
if(!in_array('moderation_status',$deckColumns,true)){$db->exec("ALTER TABLE decks ADD COLUMN moderation_status ENUM('visible','hidden') NOT NULL DEFAULT 'visible' AFTER category");echo "Added moderation visibility without changing existing decks.\n";}
if(!in_array('deleted_at',$deckColumns,true)){$db->exec('ALTER TABLE decks ADD COLUMN deleted_at DATETIME(3) NULL AFTER moderation_status, ADD INDEX idx_decks_user_deleted(user_id,deleted_at)');echo "Added recoverable deck archive status; existing decks remain active.\n";}
$cardType=$db->query("SHOW COLUMNS FROM cards LIKE 'type'")->fetch();
if($cardType && strpos((string)($cardType['Type']??''),"'TRUE_FALSE'")===false){$db->exec("ALTER TABLE cards MODIFY type ENUM('MULTIPLE_CHOICE','TRUE_FALSE','IDENTIFICATION') NOT NULL");echo "Added True/False Bombcard support; existing card types were preserved.\n";}
$db->exec("CREATE TABLE IF NOT EXISTS deck_reports (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,deck_id CHAR(32) NOT NULL,flagged_by_user_id CHAR(32) NULL,
 reason VARCHAR(1000) NOT NULL,status ENUM('open','dismissed','actioned') NOT NULL DEFAULT 'open',
 moderation_action ENUM('hide','restore') NULL,moderation_reason VARCHAR(1000) NULL,reviewed_by_user_id CHAR(32) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),reviewed_at DATETIME(3) NULL,
 INDEX(status,created_at),INDEX(deck_id,status),
 FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE,
 FOREIGN KEY(flagged_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$db->exec("CREATE TABLE IF NOT EXISTS user_notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id CHAR(32) NOT NULL,deck_id CHAR(32) NULL,
 notification_type VARCHAR(40) NOT NULL,title VARCHAR(160) NOT NULL,message VARCHAR(1000) NOT NULL,
 read_at DATETIME(3) NULL,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX idx_user_notifications_unread(user_id,read_at,created_at),INDEX idx_user_notifications_deck(deck_id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$db->exec("CREATE TABLE IF NOT EXISTS admin_archive_notice_state (
 user_id CHAR(32) PRIMARY KEY,
 last_inactive_checked_at DATETIME(3) NOT NULL DEFAULT '1970-01-01 00:00:00.000',
 last_security_cutoff_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
 pending_inactive_users INT UNSIGNED NOT NULL DEFAULT 0,
 pending_security_events INT UNSIGNED NOT NULL DEFAULT 0,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$db->exec("CREATE TABLE IF NOT EXISTS user_achievements (
 user_id CHAR(32) NOT NULL,achievement_key VARCHAR(40) NOT NULL,
 earned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(user_id,achievement_key),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$db->exec("CREATE TABLE IF NOT EXISTS security_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,actor_user_id CHAR(32) NULL,target_user_id CHAR(32) NULL,
 target_type ENUM('user','deck','system') NOT NULL DEFAULT 'user',target_id CHAR(32) NULL,
 event_code VARCHAR(64) NOT NULL,ip_hash CHAR(64) NULL,details_json LONGTEXT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),INDEX(created_at),INDEX(event_code,created_at),INDEX(target_user_id,created_at),INDEX idx_security_target(target_type,target_id),
 FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL,FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$securityColumns=array_column($db->query('SHOW COLUMNS FROM security_events')->fetchAll(),'Field');
if(!in_array('target_type',$securityColumns,true)){$db->exec("ALTER TABLE security_events ADD COLUMN target_type ENUM('user','deck','system') NOT NULL DEFAULT 'user' AFTER target_user_id");echo "Added typed audit targets.\n";}
if(!in_array('target_id',$securityColumns,true)){$db->exec('ALTER TABLE security_events ADD COLUMN target_id CHAR(32) NULL AFTER target_type');$db->exec("UPDATE security_events SET target_id=target_user_id WHERE target_type='user'");echo "Added generic audit target IDs while preserving existing user event rows.\n";}
$securityIndexes=$db->query('SHOW INDEX FROM security_events')->fetchAll();
if(!in_array('idx_security_target',array_column($securityIndexes,'Key_name'),true))$db->exec('ALTER TABLE security_events ADD INDEX idx_security_target(target_type,target_id)');
$db->exec("CREATE TABLE IF NOT EXISTS system_settings (
 setting_key VARCHAR(64) PRIMARY KEY,value_text VARCHAR(255) NOT NULL,updated_by_user_id CHAR(32) NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 FOREIGN KEY(updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$db->exec("INSERT IGNORE INTO system_settings(setting_key,value_text) VALUES ('maintenance_mode','0'),('storage_limit_bytes','10737418240')");
$db->exec("CREATE TABLE IF NOT EXISTS user_active_tabs (
 user_id CHAR(32) NOT NULL,browser_hash CHAR(64) NOT NULL,active_tab_hash CHAR(64) NOT NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 PRIMARY KEY(user_id,browser_hash),INDEX(updated_at),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$db->exec("CREATE TABLE IF NOT EXISTS deck_shares (
 id CHAR(32) PRIMARY KEY,deck_id CHAR(32) NOT NULL UNIQUE,share_token CHAR(64) NOT NULL UNIQUE,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX idx_deck_shares_token(share_token, is_active),
 FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
echo "Deck sharing schema is ready. Existing user/content rows were preserved.\n";
echo "Migration complete. No tables or existing user data were dropped.\n";
