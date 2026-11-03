<?php
declare(strict_types=1);

final class DocumentPage {
    public function __construct(private Database $db) {}

    public function store(string $documentId, int $pageNumber, string $text): void {
        $this->db->query(
            'INSERT INTO document_pages (document_id, page_number, page_text) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE page_text = VALUES(page_text)',
            [$documentId, $pageNumber, $text]
        );
    }

    public function getPage(string $documentId, int $pageNumber): ?array {
        return $this->db->query(
            'SELECT * FROM document_pages WHERE document_id = ? AND page_number = ?',
            [$documentId, $pageNumber]
        )->fetch() ?: null;
    }

    public function getPages(string $documentId, int $fromPage = 1, int $toPage = 999999): array {
        return $this->db->query(
            'SELECT page_number, page_text FROM document_pages WHERE document_id = ? AND page_number >= ? AND page_number <= ? ORDER BY page_number',
            [$documentId, $fromPage, $toPage]
        )->fetchAll();
    }

    public function getAllText(string $documentId): string {
        $pages = $this->getPages($documentId);
        return implode("\n\n", array_map(fn($p) => "[Page {$p['page_number']}]\n{$p['page_text']}", $pages));
    }

    public function getContextAround(string $documentId, int $page, int $radius = 1): string {
        $from = max(1, $page - $radius);
        $to = $page + $radius;
        $pages = $this->getPages($documentId, $from, $to);
        return implode("\n\n", array_map(fn($p) => "[Page {$p['page_number']}]\n{$p['page_text']}", $pages));
    }

    public function search(string $documentId, string $query): array {
        $like = '%' . $query . '%';
        return $this->db->query(
            'SELECT page_number, page_text FROM document_pages WHERE document_id = ? AND page_text LIKE ? ORDER BY page_number',
            [$documentId, $like]
        )->fetchAll();
    }

    public function hasExtracted(string $documentId): bool {
        return (int)$this->db->query(
            'SELECT COUNT(*) FROM document_pages WHERE document_id = ?',
            [$documentId]
        )->fetchColumn() > 0;
    }

    public function deleteAll(string $documentId): void {
        $this->db->query('DELETE FROM document_pages WHERE document_id = ?', [$documentId]);
    }
}
