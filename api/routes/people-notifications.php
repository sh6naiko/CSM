<?php
declare(strict_types=1);

// ============================================================================
// 4. Authenticated Context Setup
// ============================================================================
$user = user_id();
$currentRole = current_role($user);

global $users, $decksService, $bombcardsService, $materialsService, $progressService, $bombstyleService, $deckSharesService;

// Searchable public profiles expose only explicitly public reviewer decks.
if ($route === 'people/suggestions' && $method === 'GET') {
    $people = query("SELECT u.id, u.username, p.display_name, p.avatar,
        (SELECT COUNT(*) FROM decks d WHERE d.user_id=u.id AND d.deleted_at IS NULL AND d.moderation_status='visible' AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))) public_deck_count
        FROM users u JOIN profiles p ON p.user_id=u.id
        WHERE u.id<>? AND u.role='user' AND u.banned_at IS NULL
        ORDER BY RAND() LIMIT 12", [$user])->fetchAll();
    respond(['people' => $people]);
}

if ($route === 'people/search' && $method === 'GET') {
    $term = field($_GET, 'q', 60, false);
    if (text_length($term) < 2) respond(['people' => [], 'total' => 0]);
    $limit = max(1, min(20, (int)($_GET['limit'] ?? 12)));
    $offset = max(0, min(1000, (int)($_GET['offset'] ?? 0)));
    $count = (int)query("SELECT COUNT(*) FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.role='user' AND u.banned_at IS NULL AND (LOCATE(LOWER(?),LOWER(u.username))>0 OR LOCATE(LOWER(?),LOWER(p.display_name))>0)", [$term, $term])->fetchColumn();
    $people = query("SELECT u.id, u.username, p.display_name, p.avatar,
        (SELECT COUNT(*) FROM decks d WHERE d.user_id=u.id AND d.deleted_at IS NULL AND d.moderation_status='visible' AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))) public_deck_count
        FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.role='user' AND u.banned_at IS NULL AND (LOCATE(LOWER(?),LOWER(u.username))>0 OR LOCATE(LOWER(?),LOWER(p.display_name))>0)
        ORDER BY p.display_name,u.username LIMIT $limit OFFSET $offset", [$term, $term])->fetchAll();
    respond(['people' => $people, 'total' => $count, 'limit' => $limit, 'offset' => $offset]);
}

if ($route === 'people/profile' && $method === 'GET') {
    $target = id_field($_GET);
    $person = query("SELECT u.id,u.username,p.display_name,p.avatar FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=? AND u.role='user' AND u.banned_at IS NULL", [$target])->fetch();
    if (!$person) fail(404, 'Profile not found.');
    $person['decks'] = query("SELECT d.id,d.title,d.subject,d.category,d.updated_at,
        (SELECT COUNT(*) FROM cards c WHERE c.deck_id=d.id) card_count
        FROM decks d JOIN profiles p ON p.user_id=d.user_id
        WHERE d.user_id=? AND d.deleted_at IS NULL AND d.moderation_status='visible'
          AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))
        ORDER BY d.updated_at DESC,d.id", [$target])->fetchAll();
    respond(['person' => $person]);
}

if ($route === 'people/deck' && $method === 'GET') {
    $deckId = id_field($_GET);
    $deck = query("SELECT d.id,d.title,d.subject,d.category,d.created_at,u.username owner,p.display_name owner_display_name,p.avatar owner_avatar
        FROM decks d JOIN users u ON u.id=d.user_id JOIN profiles p ON p.user_id=u.id
        WHERE d.id=? AND u.role='user' AND u.banned_at IS NULL AND d.deleted_at IS NULL AND d.moderation_status='visible'
          AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))", [$deckId])->fetch();
    if (!$deck) fail(404, 'This deck is private or unavailable.');
    $deck['cards'] = array_map('card_data', $bombcardsService->forDeck($deckId));
    $deck['documents'] = query('SELECT id,title,size_bytes size FROM documents WHERE deck_id=? ORDER BY created_at,id', [$deckId])->fetchAll();
    foreach ($deck['documents'] as &$document) {
        $document['size'] = (int)$document['size'];
        $document['url'] = 'api/index.php?r=people/document&id=' . rawurlencode((string)$document['id']);
    }
    unset($document);
    // Public deck PDFs are shareable; annotations and personal study progress remain private.
    respond(['deck' => $deck]);
}

if ($route === 'people/deck/report' && $method === 'POST') {
    $data = input();
    $deckId = id_field($data, 'deckId');
    $reason = field($data, 'reason', 1000);
    if (text_length($reason) < 8) fail(422, 'Please provide at least 8 characters explaining the issue.');
    $deck = query("SELECT d.id,d.user_id,d.title FROM decks d JOIN users owner ON owner.id=d.user_id JOIN profiles p ON p.user_id=d.user_id WHERE d.id=? AND owner.role='user' AND owner.banned_at IS NULL AND d.deleted_at IS NULL AND d.moderation_status='visible' AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))", [$deckId])->fetch();
    if (!$deck) fail(404, 'This public deck is no longer available.');
    if ((string)$deck['user_id'] === (string)$user) fail(403, 'You cannot report your own deck.');
    if (query("SELECT 1 FROM deck_reports WHERE deck_id=? AND flagged_by_user_id=? AND status='open' LIMIT 1", [$deckId, $user])->fetchColumn()) {
        fail(409, 'You already have an open report for this deck.');
    }
    $db->beginTransaction();
    query('INSERT INTO deck_reports(deck_id,flagged_by_user_id,reason) VALUES(?,?,?)', [$deckId, $user, $reason]);
    $reportId = (int)$db->lastInsertId();
    $staffRecipients = query("SELECT id FROM users WHERE role IN ('admin','superadmin') AND banned_at IS NULL")->fetchAll();
    foreach ($staffRecipients as $recipient) {
        notify_user((string)$recipient['id'], 'deck_report_received', 'Deck reported', 'A public deck was reported and is waiting in the review queue.', (string)$deckId);
    }
    audit_event($user, 'deck_flagged', $deckId, ['reportId' => $reportId], 'deck');
    $db->commit();
    respond(['ok' => true, 'reportId' => $reportId], 201);
}

// Notifications
if ($route === 'notifications' && $method === 'GET') {
    $items = query(
        'SELECT id,notification_type type,title,message,read_at readAt,created_at createdAt,deck_id deckId FROM user_notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 50',
        [$user]
    )->fetchAll();
    $unread = (int)query('SELECT COUNT(*) FROM user_notifications WHERE user_id=? AND read_at IS NULL', [$user])->fetchColumn();
    $unreadReportDecks = (int)query("SELECT COUNT(DISTINCT deck_id) FROM user_notifications WHERE user_id=? AND notification_type='deck_report_received' AND read_at IS NULL AND deck_id IS NOT NULL", [$user])->fetchColumn();
    foreach ($items as &$item) {
        $item['id'] = (int)$item['id'];
        $item['isRead'] = $item['readAt'] !== null;
    }
    unset($item);
    respond(['notifications' => $items, 'unreadCount' => $unread, 'unreadReportDeckCount' => $unreadReportDecks]);
}

if ($route === 'notifications/read' && $method === 'PATCH') {
    $data = input();
    if (array_key_exists('id', $data)) {
        if (!is_int($data['id']) || $data['id'] < 1) {
            fail(422, 'Invalid notification id.');
        }
        query('UPDATE user_notifications SET read_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND read_at IS NULL', [$data['id'], $user]);
    } elseif (($data['type'] ?? null) === 'deck_report_received') {
        query("UPDATE user_notifications SET read_at=UTC_TIMESTAMP(3) WHERE user_id=? AND notification_type='deck_report_received' AND read_at IS NULL", [$user]);
    } else {
        query('UPDATE user_notifications SET read_at=UTC_TIMESTAMP(3) WHERE user_id=? AND read_at IS NULL', [$user]);
    }
    respond(['ok' => true]);
}

if ($route === 'notifications' && $method === 'DELETE') {
    query('DELETE FROM user_notifications WHERE user_id=?', [$user]);
    respond(['ok' => true]);
}
