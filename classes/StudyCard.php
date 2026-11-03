<?php
declare(strict_types=1);

final class StudyCard {
    public function __construct(private Database $db) {}

    public function owned(string $id, string $userId): ?array {
        return $this->db->query(
            'SELECT sf.* FROM study_flashcards sf JOIN study_decks sd ON sd.id = sf.deck_id WHERE sf.id = ? AND sd.user_id = ?',
            [$id, $userId]
        )->fetch() ?: null;
    }

    public function forDeck(string $deckId): array {
        $cards = $this->db->query(
            'SELECT sf.*, d.title AS source_document_title FROM study_flashcards sf LEFT JOIN documents d ON d.id = sf.source_document_id WHERE sf.deck_id = ? ORDER BY sf.position, sf.created_at',
            [$deckId]
        )->fetchAll();
        foreach ($cards as &$card) {
            $card['tags'] = $this->getTags($card['id']);
        }
        return $cards;
    }

    public function create(string $id, string $deckId, string $question, string $answer, string $explanation = '', ?string $sourceDocId = null, ?int $sourcePage = null, int $position = 0): void {
        $this->db->query(
            'INSERT INTO study_flashcards (id, deck_id, question, answer, explanation, source_document_id, source_page, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$id, $deckId, $question, $answer, $explanation, $sourceDocId, $sourcePage, $position]
        );
        $this->db->query('UPDATE study_decks SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [$deckId]);
    }

    public function update(string $id, string $userId, string $question, string $answer, string $explanation): void {
        $card = $this->owned($id, $userId);
        if (!$card) return;
        $this->db->query(
            'UPDATE study_flashcards SET question = ?, answer = ?, explanation = ? WHERE id = ?',
            [$question, $answer, $explanation, $id]
        );
        $this->db->query('UPDATE study_decks SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [$card['deck_id']]);
    }

    public function delete(string $id, string $userId): bool {
        $card = $this->owned($id, $userId);
        if (!$card) return false;
        $deleted = $this->db->query('DELETE FROM study_flashcards WHERE id = ?', [$id])->rowCount() > 0;
        if ($deleted) {
            $this->db->query('UPDATE study_decks SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [$card['deck_id']]);
        }
        return $deleted;
    }

    public function getTags(string $cardId): array {
        return $this->db->query(
            'SELECT tag FROM flashcard_tags WHERE flashcard_id = ? ORDER BY id',
            [$cardId]
        )->fetchAll(\PDO::FETCH_COLUMN);
    }

    public function setTags(string $cardId, array $tags): void {
        $this->db->query('DELETE FROM flashcard_tags WHERE flashcard_id = ?', [$cardId]);
        foreach (array_unique(array_filter($tags)) as $tag) {
            $this->db->query('INSERT INTO flashcard_tags (flashcard_id, tag) VALUES (?, ?)', [$cardId, $tag]);
        }
    }

    public function nextPosition(string $deckId): int {
        return (int)$this->db->query(
            'SELECT COALESCE(MAX(position), -1) + 1 FROM study_flashcards WHERE deck_id = ?',
            [$deckId]
        )->fetchColumn();
    }
}
