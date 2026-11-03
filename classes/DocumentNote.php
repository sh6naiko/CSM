<?php
declare(strict_types=1);

final class DocumentNote {
    public function __construct(private Database $db) {}

    public function owned(string $id, string $userId): ?array {
        return $this->db->query(
            'SELECT n.* FROM document_notes n JOIN documents d ON d.id = n.document_id WHERE n.id = ? AND n.user_id = ?',
            [$id, $userId]
        )->fetch() ?: null;
    }

    public function forDocument(string $documentId, string $userId): array {
        return $this->db->query(
            'SELECT id, document_id, page_number, title, content, annotation_id, created_at, updated_at FROM document_notes WHERE document_id = ? AND user_id = ? ORDER BY page_number, created_at',
            [$documentId, $userId]
        )->fetchAll();
    }

    public function create(string $id, string $documentId, string $userId, ?int $page, string $title, string $content, ?string $annotationId = null): void {
        $this->db->query(
            'INSERT INTO document_notes (id, document_id, user_id, page_number, title, content, annotation_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$id, $documentId, $userId, $page, $title, $content, $annotationId]
        );
    }

    public function update(string $id, string $userId, string $title, string $content, ?int $page): void {
        $this->db->query(
            'UPDATE document_notes SET title = ?, content = ?, page_number = ? WHERE id = ? AND user_id = ?',
            [$title, $content, $page, $id, $userId]
        );
    }

    public function delete(string $id, string $userId): bool {
        return $this->db->query(
            'DELETE FROM document_notes WHERE id = ? AND user_id = ?',
            [$id, $userId]
        )->rowCount() > 0;
    }

    public function search(string $userId, string $query): array {
        $like = '%' . $query . '%';
        return $this->db->query(
            'SELECT n.id, n.document_id, n.page_number, n.title, n.content, n.created_at, d.title AS document_title FROM document_notes n JOIN documents d ON d.id = n.document_id WHERE n.user_id = ? AND (n.title LIKE ? OR n.content LIKE ?) ORDER BY n.updated_at DESC LIMIT 50',
            [$userId, $like, $like]
        )->fetchAll();
    }
}
