<?php
final class BombstyleSession {
    public function __construct(private Database $db) {}
    public function owned(string $id,string $user): ?array { return $this->db->query('SELECT * FROM arena_sessions WHERE id=? AND user_id=?',[$id,$user])->fetch() ?: null; }
    public function activeForUser(string $user): ?array { return $this->db->query("SELECT * FROM arena_sessions WHERE user_id=? AND status='active' ORDER BY started_at DESC LIMIT 1",[$user])->fetch() ?: null; }
    public function history(string $user,int $limit=100): array { return $this->db->query('SELECT * FROM arena_sessions WHERE user_id=? ORDER BY started_at DESC LIMIT '.max(1,min(500,$limit)),[$user])->fetchAll(); }
    public function results(string $session): array { return $this->db->query('SELECT * FROM arena_answers WHERE session_id=? ORDER BY position',[$session])->fetchAll(); }
}
