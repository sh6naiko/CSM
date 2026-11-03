<?php
declare(strict_types=1);

final class DeckShare {
    public function __construct(private Database $db) {}

    public function getForDeck(string $deckId, string $userId): ?array {
        return $this->db->query(
            "SELECT s.* FROM deck_shares s
             JOIN decks d ON d.id=s.deck_id
             WHERE s.deck_id=? AND d.user_id=? AND d.moderation_status='visible' AND d.deleted_at IS NULL",
            [$deckId, $userId]
        )->fetch() ?: null;
    }

    public function createOrGet(string $deckId, string $userId): array {
        // Verify deck ownership and visibility
        $deck = $this->db->query(
            "SELECT id FROM decks WHERE id=? AND user_id=? AND moderation_status='visible' AND deleted_at IS NULL",
            [$deckId, $userId]
        )->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }

        $existing = $this->db->query("SELECT * FROM deck_shares WHERE deck_id=?", [$deckId])->fetch();
        if ($existing) {
            if (!(bool)$existing['is_active']) {
                $this->db->query("UPDATE deck_shares SET is_active=1 WHERE id=?", [$existing['id']]);
                $existing['is_active'] = 1;
            }
            return $existing;
        }

        $id = uid();
        $token = bin2hex(random_bytes(32));
        $this->db->query(
            "INSERT INTO deck_shares (id, deck_id, share_token, is_active) VALUES (?, ?, ?, 1)",
            [$id, $deckId, $token]
        );
        return [
            'id' => $id,
            'deck_id' => $deckId,
            'share_token' => $token,
            'is_active' => 1,
            'created_at' => gmdate('Y-m-d H:i:s'),
            'updated_at' => gmdate('Y-m-d H:i:s'),
        ];
    }

    public function setActive(string $deckId, string $userId, bool $active): array {
        $share = $this->getForDeck($deckId, $userId);
        if (!$share) {
            fail(404, 'Share link not found.');
        }
        $this->db->query("UPDATE deck_shares SET is_active=? WHERE id=?", [(int)$active, $share['id']]);
        $share['is_active'] = (int)$active;
        return $share;
    }

    public function regenerate(string $deckId, string $userId): array {
        $deck = $this->db->query(
            "SELECT id FROM decks WHERE id=? AND user_id=? AND moderation_status='visible' AND deleted_at IS NULL",
            [$deckId, $userId]
        )->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }

        $newToken = bin2hex(random_bytes(32));
        $existing = $this->db->query("SELECT * FROM deck_shares WHERE deck_id=?", [$deckId])->fetch();
        if ($existing) {
            $this->db->query("UPDATE deck_shares SET share_token=?, is_active=1 WHERE id=?", [$newToken, $existing['id']]);
            $existing['share_token'] = $newToken;
            $existing['is_active'] = 1;
            return $existing;
        }

        $id = uid();
        $this->db->query(
            "INSERT INTO deck_shares (id, deck_id, share_token, is_active) VALUES (?, ?, ?, 1)",
            [$id, $deckId, $newToken]
        );
        return [
            'id' => $id,
            'deck_id' => $deckId,
            'share_token' => $newToken,
            'is_active' => 1,
            'created_at' => gmdate('Y-m-d H:i:s'),
            'updated_at' => gmdate('Y-m-d H:i:s'),
        ];
    }

    public function getByToken(string $token): ?array {
        $token = trim($token);
        if (!preg_match('/^[a-zA-Z0-9_-]{3,64}$/D', $token)) {
            return null;
        }

        // 1. Direct match on share_token
        $row = $this->db->query(
            "SELECT s.id AS share_id, s.deck_id, s.share_token, s.is_active,
                    d.title, d.subject, d.category, d.updated_at, d.moderation_status,
                    u.username AS owner_name
             FROM deck_shares s
             JOIN decks d ON d.id=s.deck_id
             JOIN users u ON u.id=d.user_id
             WHERE s.share_token=? AND d.deleted_at IS NULL",
            [$token]
        )->fetch();
        if ($row) {
            return $row;
        }

        // 2. Fallback: match by deck code or title prefix (e.g. "GEN003-T55J" or "GEN003" or deck id)
        $cleanToken = preg_replace('/-[a-zA-Z0-9]{3,8}$/', '', $token);
        $normalizedToken = strtolower(str_replace([' ', '-', '_'], '', $cleanToken));
        $normalizedExact = strtolower(str_replace([' ', '-', '_'], '', $token));

        $deck = $this->db->query(
            "SELECT d.id, d.user_id, d.title, d.subject, d.category, d.updated_at, d.moderation_status,
                    u.username AS owner_name
             FROM decks d
             JOIN users u ON u.id=d.user_id
             WHERE d.moderation_status='visible' AND d.deleted_at IS NULL
               AND (
                 REPLACE(REPLACE(REPLACE(LOWER(d.title), ' ', ''), '-', ''), '_', '') IN (?, ?)
                 OR LOWER(d.id) = ?
               )
             LIMIT 1",
            [$normalizedToken, $normalizedExact, strtolower($token)]
        )->fetch();

        if ($deck) {
            $existing = $this->db->query("SELECT * FROM deck_shares WHERE deck_id=?", [$deck['id']])->fetch();
            if ($existing) {
                return [
                    'share_id' => $existing['id'],
                    'deck_id' => $deck['id'],
                    'share_token' => $existing['share_token'],
                    'is_active' => (int)$existing['is_active'],
                    'title' => $deck['title'],
                    'subject' => $deck['subject'],
                    'category' => $deck['category'],
                    'updated_at' => $deck['updated_at'],
                    'moderation_status' => $deck['moderation_status'],
                    'owner_name' => $deck['owner_name'],
                ];
            }
            $created = $this->createOrGet($deck['id'], $deck['user_id']);
            return [
                'share_id' => $created['id'],
                'deck_id' => $deck['id'],
                'share_token' => $created['share_token'],
                'is_active' => 1,
                'title' => $deck['title'],
                'subject' => $deck['subject'],
                'category' => $deck['category'],
                'updated_at' => $deck['updated_at'],
                'moderation_status' => $deck['moderation_status'],
                'owner_name' => $deck['owner_name'],
            ];
        }

        return null;
    }
}
