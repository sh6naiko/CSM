<?php
final class Deck {
    public function __construct(private Database $db) {}
    public function owned(string $id,string $userId): ?array { return $this->db->query("SELECT * FROM decks WHERE id=? AND user_id=? AND moderation_status='visible' AND deleted_at IS NULL",[$id,$userId])->fetch() ?: null; }
    public function ownedArchived(string $id,string $userId): ?array { return $this->db->query("SELECT * FROM decks WHERE id=? AND user_id=? AND deleted_at IS NOT NULL",[$id,$userId])->fetch() ?: null; }
    public function archivedForUser(string $userId,int $limit,int $offset): array { return $this->db->query("SELECT id,title,subject,category,created_at,updated_at,deleted_at,(SELECT COUNT(*) FROM cards c WHERE c.deck_id=decks.id) card_count,(SELECT COUNT(*) FROM documents m WHERE m.deck_id=decks.id) document_count FROM decks WHERE user_id=? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC,id LIMIT ".max(1,min(100,$limit))." OFFSET ".max(0,$offset),[$userId])->fetchAll(); }
    public function archivedCountForUser(string $userId): int { return (int)$this->db->query("SELECT COUNT(*) FROM decks WHERE user_id=? AND deleted_at IS NOT NULL",[$userId])->fetchColumn(); }
    public function allForUser(string $userId): array { return $this->db->query("SELECT * FROM decks WHERE user_id=? AND moderation_status='visible' AND deleted_at IS NULL ORDER BY updated_at DESC",[$userId])->fetchAll(); }
    public function create(string $id,string $user,string $title,string $subject,string $category): void { $this->db->query('INSERT INTO decks (id,user_id,title,subject,category) VALUES (?,?,?,?,?)',[$id,$user,$title,$subject,$category]); }
    public function update(string $id,string $title,string $subject,string $category,string $visibility='inherit'): void { $this->db->query('UPDATE decks SET title=?,subject=?,category=?,visibility=? WHERE id=? AND deleted_at IS NULL',[$title,$subject,$category,$visibility,$id]); }
    public function archive(string $id,string $userId): void { $this->db->query('UPDATE decks SET deleted_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND deleted_at IS NULL',[$id,$userId]); }
    public function restore(string $id,string $userId): void { $this->db->query('UPDATE decks SET deleted_at=NULL WHERE id=? AND user_id=? AND deleted_at IS NOT NULL',[$id,$userId]); }
    public function delete(string $id,string $user): void { $this->db->query('DELETE FROM decks WHERE id=? AND user_id=?',[$id,$user]); }
}
