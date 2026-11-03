<?php
final class Material {
    public function __construct(private Database $db) {}
    public function owned(string $id,string $userId): ?array { return $this->db->query("SELECT m.* FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.id=? AND m.user_id=? AND d.moderation_status='visible' AND d.deleted_at IS NULL",[$id,$userId])->fetch() ?: null; }
    public function byDeck(string $deckId): array { return $this->db->query('SELECT id,title,size_bytes AS size,created_at FROM documents WHERE deck_id=? ORDER BY created_at',[$deckId])->fetchAll(); }
    public function add(string $id,string $deck,string $user,string $title,string $stored,string $mime,int $size): void {
        $this->db->query('INSERT INTO documents (id,deck_id,user_id,title,stored_name,mime_type,size_bytes) VALUES (?,?,?,?,?,?,?)',[$id,$deck,$user,$title,$stored,$mime,$size]);
    }
    public function remove(string $id,string $user): ?array {
        $row=$this->owned($id,$user); if($row)$this->db->query('DELETE FROM documents WHERE id=? AND user_id=?',[$id,$user]); return $row;
    }
}
