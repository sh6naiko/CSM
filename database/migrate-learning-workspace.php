<?php
// PDF Learning Workspace migration – additive only, never drops or rewrites existing rows.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$config = require dirname(__DIR__) . '/server/config.local.php';
$migrationDsn = getenv('CSM_MIGRATION_DSN'); $migrationUser = getenv('CSM_MIGRATION_USER'); $migrationPassword = getenv('CSM_MIGRATION_PASSWORD');
$dsn = $migrationDsn === false ? $config['dsn'] : $migrationDsn;
$dbUser = $migrationUser === false ? $config['user'] : $migrationUser;
$dbPassword = $migrationPassword === false ? $config['password'] : ($migrationPassword === '__EMPTY__' ? '' : $migrationPassword);
try {
    $db = new PDO($dsn, $dbUser, $dbPassword, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
} catch (Throwable $error) {
    fwrite(STDERR, "Could not connect to MySQL.\n");
    exit(1);
}

$tables = $db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach (['users', 'decks', 'cards', 'documents', 'highlights'] as $required) {
    if (!in_array($required, $tables, true)) {
        fwrite(STDERR, "Expected existing table '$required'; run migrate.php first.\n");
        exit(1);
    }
}

// 1. Add columns to documents table
$docCols = array_column($db->query('SHOW COLUMNS FROM documents')->fetchAll(), 'Field');

if (!in_array('page_count', $docCols, true)) {
    $db->exec('ALTER TABLE documents ADD COLUMN page_count INT NULL AFTER size_bytes');
    echo "Added page_count to documents.\n";
}
if (!in_array('processing_status', $docCols, true)) {
    $db->exec("ALTER TABLE documents ADD COLUMN processing_status ENUM('pending','extracting','ready','failed') NOT NULL DEFAULT 'pending' AFTER page_count");
    echo "Added processing_status to documents.\n";
}
if (!in_array('last_page', $docCols, true)) {
    $db->exec('ALTER TABLE documents ADD COLUMN last_page INT NOT NULL DEFAULT 1 AFTER processing_status');
    echo "Added last_page to documents.\n";
}
if (!in_array('text_extracted', $docCols, true)) {
    $db->exec('ALTER TABLE documents ADD COLUMN text_extracted BOOLEAN NOT NULL DEFAULT FALSE AFTER last_page');
    echo "Added text_extracted to documents.\n";
}

// 2. Create document_pages table for extracted page text
if (!in_array('document_pages', $tables, true)) {
    $db->exec("CREATE TABLE document_pages (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        document_id CHAR(32) NOT NULL,
        page_number INT NOT NULL,
        page_text LONGTEXT NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE(document_id, page_number),
        INDEX(document_id),
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created document_pages table.\n";
}

// 3. Create document_notes table
if (!in_array('document_notes', $tables, true)) {
    $db->exec("CREATE TABLE document_notes (
        id CHAR(32) PRIMARY KEY,
        document_id CHAR(32) NOT NULL,
        user_id CHAR(32) NOT NULL,
        page_number INT NULL,
        title VARCHAR(500) NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        annotation_id CHAR(32) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX(document_id, user_id),
        INDEX(user_id, created_at),
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(annotation_id) REFERENCES highlights(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created document_notes table.\n";
}

// 4. Create study_decks table (independent flashcard decks)
if (!in_array('study_decks', $tables, true)) {
    $db->exec("CREATE TABLE study_decks (
        id CHAR(32) PRIMARY KEY,
        user_id CHAR(32) NOT NULL,
        document_id CHAR(32) NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX(user_id, updated_at),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created study_decks table.\n";
}

// 5. Create study_flashcards table
if (!in_array('study_flashcards', $tables, true)) {
    $db->exec("CREATE TABLE study_flashcards (
        id CHAR(32) PRIMARY KEY,
        deck_id CHAR(32) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        explanation TEXT NOT NULL DEFAULT '',
        source_document_id CHAR(32) NULL,
        source_page INT NULL,
        position INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX(deck_id, position),
        FOREIGN KEY(deck_id) REFERENCES study_decks(id) ON DELETE CASCADE,
        FOREIGN KEY(source_document_id) REFERENCES documents(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created study_flashcards table.\n";
}

// 6. Create flashcard_tags table
if (!in_array('flashcard_tags', $tables, true)) {
    $db->exec("CREATE TABLE flashcard_tags (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        flashcard_id CHAR(32) NOT NULL,
        tag VARCHAR(100) NOT NULL,
        INDEX(flashcard_id),
        INDEX(tag),
        FOREIGN KEY(flashcard_id) REFERENCES study_flashcards(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created flashcard_tags table.\n";
}

// 7. Create flashcard_review_progress table
if (!in_array('flashcard_review_progress', $tables, true)) {
    $db->exec("CREATE TABLE flashcard_review_progress (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(32) NOT NULL,
        flashcard_id CHAR(32) NOT NULL,
        review_count INT UNSIGNED NOT NULL DEFAULT 0,
        correct_count INT UNSIGNED NOT NULL DEFAULT 0,
        review_status ENUM('new','learning','known','mastered') NOT NULL DEFAULT 'new',
        last_reviewed_at DATETIME(3) NULL,
        next_review_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE(user_id, flashcard_id),
        INDEX(user_id, review_status),
        INDEX(user_id, next_review_at),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(flashcard_id) REFERENCES study_flashcards(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created flashcard_review_progress table.\n";
}

echo "PDF Learning Workspace migration complete. No existing tables or data were dropped.\n";
