<?php
declare(strict_types=1);

final class StudyReview {
    public function __construct(private Database $db) {}

    public function record(string $userId, string $cardId, string $rating): array {
        // rating: 'again', 'hard', 'good', 'easy' (or 'known', 'learning')
        $isCorrect = in_array($rating, ['good', 'easy', 'known'], true);
        
        // Fetch current progress if exists
        $curr = $this->db->query(
            'SELECT * FROM flashcard_review_progress WHERE user_id = ? AND flashcard_id = ?',
            [$userId, $cardId]
        )->fetch();

        $reviewCount = ($curr ? (int)$curr['review_count'] : 0) + 1;
        $correctCount = ($curr ? (int)$curr['correct_count'] : 0) + ($isCorrect ? 1 : 0);
        
        // Determine status and next review interval
        $status = 'learning';
        $intervalDays = 1;
        if ($isCorrect) {
            if ($correctCount >= 4) {
                $status = 'mastered';
                $intervalDays = 7;
            } elseif ($correctCount >= 2) {
                $status = 'known';
                $intervalDays = 3;
            } else {
                $status = 'learning';
                $intervalDays = 1;
            }
            if ($rating === 'easy') {
                $intervalDays *= 2;
            }
        } else {
            $status = 'learning';
            $intervalDays = 0; // needs immediate/same day review
        }

        $nextReview = (new \DateTimeImmutable())->modify("+{$intervalDays} days")->format('Y-m-d H:i:s.v');
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s.v');

        $this->db->query(
            'INSERT INTO flashcard_review_progress (user_id, flashcard_id, review_count, correct_count, review_status, last_reviewed_at, next_review_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                review_count = VALUES(review_count),
                correct_count = VALUES(correct_count),
                review_status = VALUES(review_status),
                last_reviewed_at = VALUES(last_reviewed_at),
                next_review_at = VALUES(next_review_at)',
            [$userId, $cardId, $reviewCount, $correctCount, $status, $now, $nextReview]
        );

        return [
            'flashcard_id' => $cardId,
            'review_count' => $reviewCount,
            'correct_count' => $correctCount,
            'review_status' => $status,
            'last_reviewed_at' => $now,
            'next_review_at' => $nextReview,
        ];
    }

    public function forDeck(string $userId, string $deckId): array {
        return $this->db->query(
            'SELECT p.* FROM flashcard_review_progress p
             JOIN study_flashcards sf ON sf.id = p.flashcard_id
             WHERE p.user_id = ? AND sf.deck_id = ?',
            [$userId, $deckId]
        )->fetchAll();
    }

    public function forCard(string $userId, string $cardId): ?array {
        return $this->db->query(
            'SELECT * FROM flashcard_review_progress WHERE user_id = ? AND flashcard_id = ?',
            [$userId, $cardId]
        )->fetch() ?: null;
    }
}
