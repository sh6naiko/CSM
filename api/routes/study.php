<?php
declare(strict_types=1);

// ============================================================================
// 11. Study Progress, Activity & Account Export
// ============================================================================
if ($route === 'study/daily-goal' && $method === 'GET') {
    $timezone = $_GET['timezone'] ?? 'UTC';
    if (!is_string($timezone) || strlen($timezone) > 64) fail(422, 'Invalid study time zone.');
    try {
        $goal = $progressService->dailyGoal($user, $timezone);
    } catch (InvalidArgumentException $error) {
        fail(422, $error->getMessage());
    }
    respond($goal);
}

if ($route === 'study/progress' && $method === 'GET') {
    respond($progressService->forUser($user));
}

if ($route === 'study/progress' && $method === 'DELETE') {
    $data = input();
    $deck = owned_deck(id_field($data, 'deckId'), $user);
    $deleted = $progressService->resetDeck($user, $deck['id']);
    respond(['ok' => true, 'deleted' => $deleted]);
}

if ($route === 'study/progress' && $method === 'POST') {
    $data = input();
    $card = id_field($data, 'bombcardId');
    if (!query("SELECT c.id FROM cards c JOIN decks d ON d.id=c.deck_id WHERE c.id=? AND d.user_id=? AND d.moderation_status='visible' AND d.deleted_at IS NULL", [$card, $user])->fetch()) {
        fail(404, 'Bombcard not found.');
    }
    $result = field($data, 'result', 16);
    $database->transaction(function () use ($progressService, $user, $card, $result) {
        $progressService->record($user, $card, $result);
        $progressService->recordReview($user, $card);
    });
    respond(['ok' => true], 201);
}

if ($route === 'activity' && $method === 'POST') {
    $data = input();
    $deck = isset($data['deckId']) ? owned_deck(id_field($data, 'deckId'), $user) : null;
    $screen = field($data, 'screen', 32);
    if (!in_array($screen, ['library', 'flashcards', 'highlighter', 'game', 'creator'], true)) {
        fail(422, 'Invalid study screen.');
    }
    activity($user, $deck['id'] ?? null, field($data, 'material', 255), field($data, 'mode', 80), $screen, 'Opened');
    respond(['ok' => true], 201);
}

if ($route === 'account/export' && $method === 'GET') {
    $data = workspace($user);
    $data['exportedAt'] = gmdate(DATE_ATOM);
    $data['highlights'] = [];
    $data['arenaHistory'] = [];
    $data['activities'] = query(
        'SELECT id,deck_id deckId,material,mode,screen,status,accuracy,created_at FROM study_activity WHERE user_id=? ORDER BY created_at DESC',
        [$user]
    )->fetchAll();

    foreach ($data['decks'] as $deck) {
        foreach ($deck['documents'] as $doc) {
            $data['highlights'][$doc['id']] = query(
                'SELECT id,page_number,note_text,color,purpose,selection_json,card_id cardId,created_at FROM highlights WHERE document_id=?',
                [$doc['id']]
            )->fetchAll();
        }
    }

    foreach ($bombstyleService->history($user, 500) as $s) {
        $data['arenaHistory'][] = arena_view($s);
    }

    header('Content-Disposition: attachment; filename="co-studymaxx-export.json"');
    respond($data);
}
