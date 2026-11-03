<?php
final class StudyProgress {
    public function __construct(private Database $db) {}
    public function record(string $user,string $card,string $result): void {
        if(!in_array($result,['seen','known','unknown'],true))fail(422,'Invalid study progress value.');
        $known=(int)($result==='known');$unknown=(int)($result==='unknown');
        $this->db->query("INSERT INTO bombcard_progress (user_id,bombcard_id,times_seen,times_known,times_unknown,status,last_reviewed_at)
            SELECT ?,c.id,1,?,?,IF(?=1,'known','learning'),CURRENT_TIMESTAMP(3) FROM cards c JOIN decks d ON d.id=c.deck_id WHERE c.id=? AND d.user_id=? AND d.moderation_status='visible' AND d.deleted_at IS NULL
            ON DUPLICATE KEY UPDATE times_seen=times_seen+1,times_known=times_known+VALUES(times_known),times_unknown=times_unknown+VALUES(times_unknown),last_reviewed_at=VALUES(last_reviewed_at),status=IF(times_unknown>times_known,'learning',IF(times_known>0,'known','learning'))",
            [$user,$known,$unknown,$known,$card,$user]);
    }
    public function forUser(string $user): array {
        return $this->db->query("SELECT p.*,c.deck_id FROM bombcard_progress p JOIN cards c ON c.id=p.bombcard_id JOIN decks d ON d.id=c.deck_id WHERE p.user_id=? AND d.user_id=? AND d.moderation_status='visible' AND d.deleted_at IS NULL ORDER BY p.last_reviewed_at DESC",[$user,$user])->fetchAll();
    }
    public function resetDeck(string $user,string $deck): int {
        return $this->db->query('DELETE p FROM bombcard_progress p JOIN cards c ON c.id=p.bombcard_id WHERE p.user_id=? AND c.deck_id=?',[$user,$deck])->rowCount();
    }

    // Called by the Study interaction endpoint, not by Arena timeout processing.
    public function recordReview(string $user, string $card): void {
        $this->db->query("INSERT INTO bombcard_reviews (user_id,bombcard_id)
            SELECT ?,c.id FROM cards c JOIN decks d ON d.id=c.deck_id
            WHERE c.id=? AND d.user_id=? AND d.moderation_status='visible' AND d.deleted_at IS NULL",
            [$user,$card,$user]);
    }

    public function dailyGoal(string $user, string $timezone = 'UTC', ?DateTimeImmutable $now = null): array {
        if (!in_array($timezone, DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC), true)) {
            throw new InvalidArgumentException('Invalid study time zone.');
        }
        $zone = new DateTimeZone($timezone);
        $start = ($now ?? new DateTimeImmutable('now', new DateTimeZone('UTC')))->setTimezone($zone)->setTime(0, 0);
        $end = $start->modify('+1 day');
        $utc = new DateTimeZone('UTC');
        $from = $start->setTimezone($utc)->format('Y-m-d H:i:s');
        $to = $end->setTimezone($utc)->format('Y-m-d H:i:s');
        // UNION de-duplicates repeats within Study, within Arena, and between modes.
        // Existing Arena answers can be counted accurately without inventing past Study events.
        $arenaIncluded = true;
        try {
            $reviewed = (int)$this->db->query("SELECT COUNT(*) FROM (
                SELECT bombcard_id FROM bombcard_reviews
                WHERE user_id=? AND reviewed_at>=? AND reviewed_at<?
                UNION
                SELECT q.card_id AS bombcard_id FROM arena_answers a
                JOIN arena_sessions s ON s.id=a.session_id
                JOIN arena_questions q ON q.session_id=a.session_id AND q.position=a.position
                WHERE s.user_id=? AND a.submitted_at>=? AND a.submitted_at<?
                  AND a.result IN ('correct','wrong') AND q.card_id IS NOT NULL
            ) reviewed_cards", [$user,$from,$to,$user,$from,$to])->fetchColumn();
        } catch (PDOException $error) {
            $sqlState = (string)($error->errorInfo[0] ?? $error->getCode());
            $driverCode = (int)($error->errorInfo[1] ?? 0);
            if ($sqlState !== '42S02' && $driverCode !== 1932) throw $error;
            // A damaged Arena question table must not take down the independent Study goal.
            $reviewed = (int)$this->db->query("SELECT COUNT(DISTINCT bombcard_id) FROM bombcard_reviews
                WHERE user_id=? AND reviewed_at>=? AND reviewed_at<?", [$user,$from,$to])->fetchColumn();
            $arenaIncluded = false;
        }
        $target = 20;
        return [
            'reviewed' => $reviewed, 'target' => $target,
            'percent' => min(100, (int)round($reviewed / $target * 100)),
            'date' => $start->format('Y-m-d'), 'timezone' => $timezone,
            'arenaIncluded' => $arenaIncluded,
            'resetsAt' => $end->setTimezone($utc)->format(DateTimeInterface::ATOM),
        ];
    }
}
