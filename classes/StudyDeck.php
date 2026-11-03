<?php
declare(strict_types=1);

final class StudyDeck {
    public function __construct(private Database $db) {}

    public function owned(string $id, string $userId): ?array {
        return $this->db->query(
            'SELECT * FROM study_decks WHERE id = ? AND user_id = ?',
            [$id, $userId]
        )->fetch() ?: null;
    }

    public function forUser(string $userId): array {
        return $this->db->query(
            'SELECT sd.*, (SELECT COUNT(*) FROM study_flashcards sf WHERE sf.deck_id = sd.id) AS card_count FROM study_decks sd WHERE sd.user_id = ? ORDER BY sd.updated_at DESC',
            [$userId]
        )->fetchAll();
    }

    public function forDocument(string $documentId, string $userId): array {
        return $this->db->query(
            'SELECT sd.*, (SELECT COUNT(*) FROM study_flashcards sf WHERE sf.deck_id = sd.id) AS card_count FROM study_decks sd WHERE sd.document_id = ? AND sd.user_id = ? ORDER BY sd.updated_at DESC',
            [$documentId, $userId]
        )->fetchAll();
    }

    public function create(string $id, string $userId, string $title, string $description = '', ?string $documentId = null): void {
        $this->db->query(
            'INSERT INTO study_decks (id, user_id, document_id, title, description) VALUES (?, ?, ?, ?, ?)',
            [$id, $userId, $documentId, $title, $description]
        );
    }

    public function update(string $id, string $userId, string $title, string $description): void {
        $this->db->query(
            'UPDATE study_decks SET title = ?, description = ? WHERE id = ? AND user_id = ?',
            [$title, $description, $id, $userId]
        );
    }

    public function delete(string $id, string $userId): bool {
        return $this->db->query(
            'DELETE FROM study_decks WHERE id = ? AND user_id = ?',
            [$id, $userId]
        )->rowCount() > 0;
    }
}
