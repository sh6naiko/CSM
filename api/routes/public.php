<?php
declare(strict_types=1);

// ============================================================================
// 3. Public Sharing Endpoints (Guest Access)
// ============================================================================

// View shared deck
if ($route === 'shared/deck' && $method === 'GET') {
    $token = $_GET['token'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-zA-Z0-9_-]{3,64}$/D', $token)) {
        fail(404, 'Shared deck link is invalid or not found.');
    }
    $share = $deckSharesService->getByToken($token);
    if (!$share) {
        fail(404, 'Shared deck link not found.');
    }
    if ($share['moderation_status'] !== 'visible') {
        fail(404, 'This deck is currently unavailable.');
    }
    if (!(bool)$share['is_active']) {
        fail(403, 'This shared deck link has been deactivated by the owner.');
    }

    $cards = array_map('card_data', $bombcardsService->forDeck($share['deck_id']));
    $docs = $materialsService->byDeck($share['deck_id']);
    foreach ($docs as &$doc) {
        $doc['deckId'] = $share['deck_id'];
        $doc['url'] = app_base_url() . '/api/index.php?r=shared/document&token=' . rawurlencode($token) . '&id=' . rawurlencode((string)$doc['id']);
    }
    unset($doc);

    respond([
        'deck' => [
            'id' => $share['deck_id'],
            'code' => $share['title'],
            'title' => $share['title'],
            'subject' => $share['subject'],
            'category' => $share['category'],
            'owner' => $share['owner_name'],
            'lastModified' => $share['updated_at'],
            'section' => 'recent',
            'cards' => $cards,
            'documents' => $docs,
            'share' => [
                'token' => $share['share_token'],
                'isActive' => true,
                'url' => app_base_url() . '/shared/deck/' . $share['share_token'],
            ],
        ],
        'share' => [
            'token' => $share['share_token'],
            'isActive' => true,
            'url' => app_base_url() . '/shared/deck/' . $share['share_token'],
        ],
    ]);
}

// Download/view shared document
if ($route === 'shared/document' && $method === 'GET') {
    $token = $_GET['token'] ?? '';
    $docId = $_GET['id'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-zA-Z0-9_-]{3,64}$/D', $token)) {
        fail(404, 'Invalid share token.');
    }
    if (!is_string($docId) || !preg_match('/^[a-f0-9]{32}$/D', $docId)) {
        fail(404, 'Invalid document ID.');
    }
    $share = $deckSharesService->getByToken($token);
    if (!$share || $share['moderation_status'] !== 'visible' || !(bool)$share['is_active']) {
        fail(403, 'This shared document is not available.');
    }

    $document = query("SELECT m.id,m.title,m.stored_name FROM documents m WHERE m.id=? AND m.deck_id=?", [$docId, $share['deck_id']])->fetch();
    if (!$document) {
        fail(404, 'PDF not found.');
    }
    $path = $config['upload_dir'] . '/' . $document['stored_name'];
    if (!is_file($path)) {
        fail(404, 'PDF missing from file storage.');
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($path));
    $disp = ($_GET['download'] ?? '') === '1' ? 'attachment' : 'inline';
    header("Content-Disposition: $disp; filename=\"document.pdf\"; filename*=UTF-8''" . rawurlencode((string)$document['title']));
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: frame-ancestors 'self'; base-uri 'none'");
    readfile($path);
    exit;
}

// Public PDFs attached to a deck that is currently shared through Discover.
// Visibility is checked on every request so changing a deck back to private revokes access.
if ($route === 'people/document' && $method === 'GET') {
    $docId = $_GET['id'] ?? '';
    if (!is_string($docId) || !preg_match('/^[a-f0-9]{32}$/D', $docId)) fail(404, 'Invalid document ID.');
    $document = query("SELECT m.id,m.title,m.stored_name FROM documents m
        JOIN decks d ON d.id=m.deck_id JOIN users u ON u.id=d.user_id JOIN profiles p ON p.user_id=d.user_id
        WHERE m.id=? AND u.role='user' AND u.banned_at IS NULL AND d.deleted_at IS NULL AND d.moderation_status='visible'
          AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))", [$docId])->fetch();
    if (!$document) fail(404, 'This PDF is private or unavailable.');
    $path = $config['upload_dir'] . '/' . $document['stored_name'];
    if (!is_file($path)) fail(404, 'PDF missing from file storage.');
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($path));
    header("Content-Disposition: inline; filename=\"document.pdf\"; filename*=UTF-8''" . rawurlencode((string)$document['title']));
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: frame-ancestors 'self'; base-uri 'none'");
    readfile($path);
    exit;
}
