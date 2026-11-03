<?php
declare(strict_types=1);

// ============================================================================
// 7. Decks & Sharing Management
// ============================================================================
if ($route === 'decks') {
    if ($method === 'GET') {
        respond(deck_data(owned_deck(id_field($_GET), $user)));
    }

    if (in_array($method, ['POST', 'PATCH'], true)) {
        $data = input();
        $title = canonical_deck_title(field($data, 'title', 160));
        $subject = field($data, 'subject', 160, false);
        $category = field($data, 'category', 80, false) ?: 'Recent';
        $id = $method === 'PATCH' ? id_field($data) : uid();
        $visibility = 'inherit';

        $db->beginTransaction();
        query('SELECT id FROM users WHERE id=? FOR UPDATE', [$user]);
        if ($method === 'PATCH') {
            $old = owned_deck($id, $user);
            $visibility = (string)($old['visibility'] ?? 'inherit');
            if (array_key_exists('visibility', $data)) {
                if (!is_string($data['visibility']) || !in_array($data['visibility'], ['inherit', 'private', 'public'], true)) fail(422, 'Choose inherited, public, or private deck visibility.');
                $visibility = $data['visibility'];
            }
            if (normalized_deck_title((string)$old['title']) !== normalized_deck_title($title)) {
                assert_unique_reviewer_title($user, $title, $id);
            }
            $decksService->update($id, $title, $subject, $category, $visibility);
        } else {
            assert_unique_reviewer_title($user, $title);
            $decksService->create($id, $user, $title, $subject, $category);
        }

        if (array_key_exists('cards', $data)) {
            if (!is_array($data['cards']) || count($data['cards']) > 1000) {
                fail(422, 'Invalid card list.');
            }
            $keep = [];
            foreach ($data['cards'] as $i => $card) {
                if (!is_array($card)) {
                    fail(422, 'Invalid Bombcard.');
                }
                $cardId = isset($card['id']) && preg_match('/^[a-f0-9]{32}$/D', (string)$card['id']) ? $card['id'] : null;
                $keep[] = save_card($card, $id, $cardId, $i);
            }
            foreach ($bombcardsService->forDeck($id) as $card) {
                if (!in_array($card['id'], $keep, true)) {
                    $bombcardsService->delete($card['id'], $id);
                }
            }
        }

        activity($user, $id, $title, 'Reviewer', 'library', $method === 'POST' ? 'Created' : 'Edited');
        $db->commit();
        respond(deck_data(owned_deck($id, $user)), $method === 'POST' ? 201 : 200);
    }

    if ($method === 'DELETE') {
        $id = id_field(input());
        owned_deck($id, $user);
        arena_stop_hidden_deck($id);
        $decksService->archive($id, $user);
        audit_event($user, 'deck_archived', $id, [], 'deck');
        respond(['ok' => true, 'archived' => true]);
    }
}

if ($route === 'archive/decks' && $method === 'GET') {
    $limit = max(1, min(50, (int)($_GET['limit'] ?? 10)));
    $offset = max(0, min(100000, (int)($_GET['offset'] ?? 0)));
    respond([
        'decks' => $decksService->archivedForUser($user, $limit, $offset),
        'total' => $decksService->archivedCountForUser($user),
        'limit' => $limit,
        'offset' => $offset,
    ]);
}

if ($route === 'archive/decks/restore' && $method === 'POST') {
    $id = id_field(input());
    $deck = $decksService->ownedArchived($id, $user);
    if (!$deck) fail(404, 'Archived reviewer not found.');
    assert_unique_reviewer_title($user, (string)$deck['title'], $id);
    $decksService->restore($id, $user);
    audit_event($user, 'deck_restored_from_archive', $id, [], 'deck');
    respond(['ok' => true]);
}

if ($route === 'archive/decks/permanent' && $method === 'DELETE') {
    $id = id_field(input());
    $deck = $decksService->ownedArchived($id, $user);
    if (!$deck) fail(404, 'Archived reviewer not found.');
    $names = query('SELECT stored_name FROM documents WHERE deck_id=? AND user_id=?', [$id, $user])->fetchAll(PDO::FETCH_COLUMN);
    $decksService->delete($id, $user);
    foreach ($names as $name) {
        $path = $config['upload_dir'] . '/' . $name;
        if (is_file($path)) unlink($path);
    }
    audit_event($user, 'deck_permanently_deleted', $id, [], 'deck');
    respond(['ok' => true]);
}

// Deck Share links
if ($route === 'decks/share') {
    $deckId = id_field($method === 'GET' ? $_GET : input(), 'deckId');
    owned_deck($deckId, $user);

    if ($method === 'GET') {
        $share = $deckSharesService->getForDeck($deckId, $user);
        if (!$share) {
            respond(['isShared' => false, 'isActive' => false, 'token' => null, 'url' => null]);
        }
        respond([
            'isShared' => true,
            'isActive' => (bool)$share['is_active'],
            'token' => $share['share_token'],
            'url' => app_base_url() . '/shared/deck/' . $share['share_token'],
            'createdAt' => $share['created_at'],
            'updatedAt' => $share['updated_at'],
        ]);
    }

    if ($method === 'POST') {
        $data = input();
        $action = $data['action'] ?? 'create';

        if ($action === 'create') {
            $share = $deckSharesService->createOrGet($deckId, $user);
        } elseif ($action === 'regenerate') {
            $share = $deckSharesService->regenerate($deckId, $user);
        } elseif ($action === 'toggle') {
            $active = (bool)($data['active'] ?? true);
            $share = $deckSharesService->setActive($deckId, $user, $active);
        } else {
            fail(422, 'Invalid share action.');
        }

        respond([
            'ok' => true,
            'isShared' => true,
            'isActive' => (bool)$share['is_active'],
            'token' => $share['share_token'],
            'url' => app_base_url() . '/shared/deck/' . $share['share_token'],
            'action' => $action,
        ]);
    }

    if ($method === 'DELETE') {
        $share = $deckSharesService->setActive($deckId, $user, false);
        respond(['ok' => true, 'isShared' => true, 'isActive' => false]);
    }
}

// Bombcard CRUD
if ($route === 'cards/bulk-delete' && $method === 'POST') {
    $data = input();
    $deck = owned_deck(id_field($data, 'deckId'), $user);
    $rawIds = $data['ids'] ?? null;
    if (!is_array($rawIds) || count($rawIds) < 1 || count($rawIds) > 500) {
        fail(422, 'Select between 1 and 500 Bombcards to delete.');
    }

    $ids = array_values(array_unique(array_filter($rawIds, static fn($id) => is_string($id) && $id !== '')));
    if (count($ids) !== count($rawIds)) {
        fail(422, 'The selected Bombcard list is invalid.');
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $matchingCount = (int)query(
        "SELECT COUNT(*) FROM cards WHERE deck_id=? AND id IN ($placeholders)",
        array_merge([$deck['id']], $ids)
    )->fetchColumn();
    if ($matchingCount !== count($ids)) {
        fail(404, 'One or more selected Bombcards were not found in this reviewer.');
    }

    $db->beginTransaction();
    foreach ($ids as $id) {
        $bombcardsService->delete($id, $deck['id']);
    }
    activity($user, $deck['id'], $deck['title'], 'Bombcards', 'library', 'Removed');
    $db->commit();
    respond(['ok' => true, 'deleted' => count($ids)]);
}

if ($route === 'cards' && in_array($method, ['POST', 'PATCH', 'DELETE'], true)) {
    $data = input();
    $deck = owned_deck(id_field($data, 'deckId'), $user);
    $db->beginTransaction();

    if ($method === 'DELETE') {
        $id = id_field($data);
        if (!$bombcardsService->delete($id, $deck['id'])) {
            fail(404, 'Bombcard not found.');
        }
    } else {
        $position = (int)query('SELECT COALESCE(MAX(position),-1)+1 FROM cards WHERE deck_id=?', [$deck['id']])->fetchColumn();
        $id = save_card($data, $deck['id'], $method === 'PATCH' ? id_field($data) : null, $position);
    }

    activity($user, $deck['id'], $deck['title'], 'Bombcards', 'library', $method === 'DELETE' ? 'Removed' : ($method === 'POST' ? 'Created' : 'Edited'));
    $db->commit();
    respond(['id' => $id], $method === 'POST' ? 201 : 200);
}
