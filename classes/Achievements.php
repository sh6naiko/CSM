<?php
declare(strict_types=1);

final class Achievements {
    public function __construct(private Database $database) {}

    // Inputs come from the authenticated workspace's database queries, never the client.
    public function sync(string $user, array $stats, array $sessions): array {
        $eligible = [
            'first_deck' => [($stats['decks'] ?? 0) >= 1, 'First Reviewer', 'You created your first study deck.'],
            'streak_starter' => [($stats['studyBestDays'] ?? 0) >= 1, 'Streak Flame', 'You started a study streak. Keep it going!'],
            'arena_warrior' => [count(array_filter($sessions, fn($session) => $session['status'] === 'completed')) > 0, 'Arena Champion', 'You completed an Arena match.'],
            'pdf_scholar' => [($stats['documents'] ?? 0) >= 1, 'PDF Scholar', 'You added your first study document.'],
            'master_mind' => [($stats['accuracy'] ?? 0) >= 75 && ($stats['cards'] ?? 0) >= 3, 'Sharp Recall', 'You reached 75% accuracy with at least three Bombcards.'],
        ];

        return $this->database->transaction(function () use ($user, $eligible): array {
            // Serialize awards for this account, including simultaneous browser requests.
            $account = $this->database->query('SELECT role FROM users WHERE id=? FOR UPDATE', [$user])->fetch();
            if (!$account || $account['role'] !== 'user') return [];
            $earned = $this->database->query('SELECT achievement_key FROM user_achievements WHERE user_id=?', [$user])->fetchAll(PDO::FETCH_COLUMN);
            foreach ($eligible as $key => [$unlocked, $title, $message]) {
                if (!$unlocked || in_array($key, $earned, true)) continue;
                $this->database->query('INSERT INTO user_achievements(user_id,achievement_key) VALUES(?,?)', [$user, $key]);
                $this->database->query(
                    'INSERT INTO user_notifications(user_id,notification_type,title,message) VALUES(?,?,?,?)',
                    [$user, 'achievement_unlocked', 'Achievement unlocked: ' . $title, $message]
                );
                $earned[] = $key;
            }
            return $earned;
        });
    }
}
