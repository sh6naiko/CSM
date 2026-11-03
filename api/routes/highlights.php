<?php
declare(strict_types=1);

// ============================================================================
// 10. PDF Highlights & Excerpt-to-Card
// ============================================================================
if ($route === 'highlights/card' && $method === 'POST') {
    $data = input();
    $doc = owned_document(id_field($data, 'documentId'), $user);
    $text = field($data, 'text', 10000);
    $counterpart = field($data, 'counterpart', 10000);
    $page = $data['page'] ?? 1;
    $color = field($data, 'color', 7);
    $purpose = field($data, 'purpose', 16);
    $selection = selection_json($data);

    if (!$selection || !in_array($purpose, ['question', 'answer'], true) || !is_int($page) || $page < 1 || $page > 100000 || !preg_match('/^#[0-9a-fA-F]{6}$/D', $color)) {
        fail(422, 'Choose whether the excerpt is the question or answer.');
    }

    $prompt = $purpose === 'question' ? $text : $counterpart;
    $answer = $purpose === 'answer' ? $text : $counterpart;
    $position = (int)query('SELECT COALESCE(MAX(position),-1)+1 FROM cards WHERE deck_id=?', [$doc['deck_id']])->fetchColumn();

    $db->beginTransaction();
    $cardId = save_card(['type' => 'IDENTIFICATION', 'prompt' => $prompt, 'correctAnswer' => $answer], $doc['deck_id'], null, $position);
    $id = uid();
    query(
        'INSERT INTO highlights(id,document_id,page_number,note_text,color,purpose,selection_json,card_id) VALUES(?,?,?,?,?,?,?,?)',
        [$id, $doc['id'], $page, $text, $color, $purpose, $selection, $cardId]
    );
    activity($user, $doc['deck_id'], $doc['title'], 'PDF-to-Bombcard', 'highlighter', 'Created');
    $db->commit();

    respond([
        'cardId' => $cardId,
        'highlight' => [
            'id' => $id,
            'text' => $text,
            'page' => $page,
            'color' => $color,
            'purpose' => $purpose,
            'selection' => json_decode($selection, true),
            'cardId' => $cardId,
        ],
    ], 201);
}

if ($route === 'highlights') {
    $data = $method === 'GET' ? $_GET : input();
    $doc = owned_document(id_field($data, 'documentId'), $user);

    if ($method === 'GET') {
        $rows = query(
            'SELECT id,note_text text,page_number page,color,purpose,selection_json,card_id cardId FROM highlights WHERE document_id=? ORDER BY page_number,created_at',
            [$doc['id']]
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['selection'] = $row['selection_json'] ? json_decode($row['selection_json'], true) : [];
            unset($row['selection_json']);
        }
        respond($rows);
    }

    if ($method === 'DELETE') {
        if (isset($data['id'])) {
            query('DELETE FROM highlights WHERE id=? AND document_id=?', [id_field($data), $doc['id']]);
        } else {
            query('DELETE FROM highlights WHERE document_id=?', [$doc['id']]);
        }
        respond(['ok' => true]);
    }

    if (in_array($method, ['POST', 'PATCH'], true)) {
        $text = field($data, 'text', 10000);
        $page = $data['page'] ?? 1;
        $color = field($data, 'color', 7);
        $purpose = $data['purpose'] ?? 'note';
        $selection = selection_json($data);

        if (!is_int($page) || $page < 1 || $page > 100000 || !preg_match('/^#[0-9a-fA-F]{6}$/D', $color) || !is_string($purpose) || !in_array($purpose, ['note', 'question', 'answer'], true)) {
            fail(422, 'Invalid note page, role, or color.');
        }

        $id = $method === 'PATCH' ? id_field($data) : uid();
        if ($method === 'PATCH') {
            if (!query('SELECT id FROM highlights WHERE id=? AND document_id=?', [$id, $doc['id']])->fetch()) {
                fail(404, 'Note not found.');
            }
            query(
                'UPDATE highlights SET note_text=?,page_number=?,color=?,purpose=?,selection_json=? WHERE id=?',
                [$text, $page, $color, $purpose, $selection, $id]
            );
        } else {
            query(
                'INSERT INTO highlights(id,document_id,page_number,note_text,color,purpose,selection_json) VALUES(?,?,?,?,?,?,?)',
                [$id, $doc['id'], $page, $text, $color, $purpose, $selection]
            );
        }

        respond([
            'id' => $id,
            'text' => $text,
            'page' => $page,
            'color' => $color,
            'purpose' => $purpose,
            'selection' => $selection ? json_decode($selection, true) : [],
        ], $method === 'POST' ? 201 : 200);
    }
}
