<?php
final class Material {
    public function __construct(private Database $db) {}
    public function owned(string $id,string $userId): ?array { return $this->db->query("SELECT m.id,m.user_id,m.deck_id,m.title,m.stored_name,m.mime_type,m.size_bytes,m.created_at,m.page_count,m.processing_status,m.last_page,m.text_extracted FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.id=? AND m.user_id=? AND d.moderation_status='visible' AND d.deleted_at IS NULL",[$id,$userId])->fetch() ?: null; }
    public function byDeck(string $deckId): array { return $this->db->query('SELECT id,title,size_bytes AS size,created_at FROM documents WHERE deck_id=? ORDER BY created_at',[$deckId])->fetchAll(); }
    public function add(string $id,string $deck,string $user,string $title,string $stored,string $mime,int $size,string $contents): void {
        $statement=$this->db->getConnection()->prepare('INSERT INTO documents (id,deck_id,user_id,title,stored_name,mime_type,size_bytes,file_data) VALUES (?,?,?,?,?,?,?,?)');
        $statement->bindValue(1,$id);$statement->bindValue(2,$deck);$statement->bindValue(3,$user);$statement->bindValue(4,$title);$statement->bindValue(5,$stored);$statement->bindValue(6,$mime);$statement->bindValue(7,$size,PDO::PARAM_INT);$statement->bindValue(8,$contents,PDO::PARAM_LOB);$statement->execute();
    }
    public function remove(string $id,string $user): ?array {
        $row=$this->owned($id,$user); if($row)$this->db->query('DELETE FROM documents WHERE id=? AND user_id=?',[$id,$user]); return $row;
    }
}
