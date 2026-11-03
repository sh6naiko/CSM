<?php
declare(strict_types=1);

// Smoke test for PDF Learning Workspace endpoints
$base = getenv('CSM_TEST_URL') ?: 'http://127.0.0.1:8080/api/index.php?r=';
$suffix = bin2hex(random_bytes(4));
$user = [
    'name' => 'testlw' . $suffix,
    'email' => 'testlw' . $suffix . '@example.invalid',
    'password' => 'WorkspacePass-2026!',
];

function check(bool $ok, string $message): void {
    if (!$ok) throw new RuntimeException("FAIL: " . $message);
}

function client(): array {
    return [
        'cookie' => tempnam(sys_get_temp_dir(), 'csm-test-'),
        'csrf' => '',
        'tab' => bin2hex(random_bytes(16)),
        'browser' => bin2hex(random_bytes(16))
    ];
}

function call_api(array &$client, string $route, string $method = 'GET', ?array $data = null, ?string $upload = null): array {
    global $base;
    $ch = curl_init($base . $route);
    $headers = [
        'Accept: application/json',
        'X-CSM-Tab-Id: ' . $client['tab'],
        'X-CSM-Browser-Id: ' . $client['browser'],
    ];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_COOKIEFILE => $client['cookie'],
        CURLOPT_COOKIEJAR => $client['cookie'],
        CURLOPT_CUSTOMREQUEST => $method,
    ]);
    if ($data !== null) {
        if ($upload !== null) {
            $data['file'] = new CURLFile($upload, 'application/pdf', 'test.pdf');
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        } else {
            $headers[] = 'Content-Type: application/json';
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data, JSON_THROW_ON_ERROR));
        }
    }
    if ($method !== 'GET' && $client['csrf'] !== '') {
        $headers[] = 'X-CSRF-Token: ' . $client['csrf'];
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($body === false) throw new RuntimeException('HTTP client error: ' . $error);
    $decoded = json_decode($body, true);
    if (is_array($decoded) && isset($decoded['csrf'])) {
        $client['csrf'] = $decoded['csrf'];
    }
    return [$status, $decoded, $body];
}

function expect(array &$client, string $route, string $method = 'GET', ?array $data = null, int $status = 200, ?string $upload = null): array {
    $result = call_api($client, $route, $method, $data, $upload);
    check($result[0] === $status, "$route expected HTTP $status, got {$result[0]}: {$result[2]}");
    return $result[1] ?? [];
}

echo "1. Registering test user...\n";
$c = client();
expect($c, 'auth/session');
expect($c, 'auth/register', 'POST', ['username' => $user['name'], 'email' => $user['email'], 'password' => $user['password'], 'firstName' => 'Learning', 'lastName' => 'Tester'], 201);
expect($c, 'auth/login', 'POST', ['username' => $user['name'], 'password' => $user['password']]);

echo "2. Creating reviewer deck and uploading test PDF...\n";
$deck = expect($c, 'decks', 'POST', ['title' => 'Biology Reviewer ' . $suffix, 'subject' => 'Biology', 'category' => 'Recent'], 201);
$deckId = $deck['id'];

$tmpPdf = tempnam(sys_get_temp_dir(), 'csm-pdf-');
file_put_contents($tmpPdf, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 2/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
$doc = expect($c, 'documents', 'POST', ['deckId' => $deckId], 201, $tmpPdf);
$docId = $doc['id'];
check(!empty($docId), 'Document ID was not returned.');

echo "3. Testing documents/extract (POST & GET)...\n";
$extractRes = expect($c, 'documents/extract', 'POST', [
    'documentId' => $docId,
    'pageCount' => 2,
    'pages' => [
        ['page' => 1, 'text' => 'Mitochondria are membrane-bound cell organelles that generate most of the chemical energy needed to power the cell.'],
        ['page' => 2, 'text' => 'Cellular respiration converts biochemical energy from nutrients into adenosine triphosphate (ATP).'],
    ]
]);
check(($extractRes['savedPages'] ?? 0) === 2, 'Failed to save extracted pages.');

$getPages = expect($c, 'documents/extract&documentId=' . $docId, 'GET');
check(($getPages['extracted'] ?? false) === true, 'Extracted status false.');
check(count($getPages['pages'] ?? []) === 2, 'Pages count mismatch.');

echo "4. Testing documents/search (GET)...\n";
$searchRes = expect($c, 'documents/search&documentId=' . $docId . '&q=Mitochondria', 'GET');
check(count($searchRes['results'] ?? []) === 1, 'Search did not find Mitochondria.');
check(($searchRes['results'][0]['page_number'] ?? 0) === 1, 'Search match page mismatch.');

echo "5. Testing documents/page (GET & POST)...\n";
$pageRes = expect($c, 'documents/page', 'POST', ['documentId' => $docId, 'page' => 2]);
check(($pageRes['last_page'] ?? 0) === 2, 'Failed to update last_page.');
$getPageRes = expect($c, 'documents/page&documentId=' . $docId, 'GET');
check(($getPageRes['last_page'] ?? 0) === 2, 'Failed to read last_page.');

echo "6. Testing document-notes CRUD...\n";
$note = expect($c, 'document-notes', 'POST', [
    'documentId' => $docId,
    'title' => 'Energy Production Notes',
    'content' => 'ATP is synthesized through cellular respiration in mitochondria.',
    'page' => 1
], 201);
$noteId = $note['id'];
check(!empty($noteId), 'Failed to create document note.');

$notesList = expect($c, 'document-notes&documentId=' . $docId, 'GET');
check(count($notesList['notes'] ?? []) >= 1, 'Notes list empty.');

$patchNote = expect($c, 'document-notes', 'PATCH', [
    'id' => $noteId,
    'title' => 'Energy Production (Updated)',
    'content' => 'ATP is synthesized through oxidative phosphorylation.',
    'page' => 1
]);
check(($patchNote['ok'] ?? false) === true, 'Failed to update note.');

echo "7. Testing study-decks CRUD...\n";
$studyDeck = expect($c, 'study-decks', 'POST', [
    'title' => 'Cell Biology Flashcards',
    'description' => 'Key terms for exam prep',
    'documentId' => $docId
], 201);
$studyDeckId = $studyDeck['id'];
check(!empty($studyDeckId), 'Failed to create study deck.');
expect($c, 'study-decks', 'POST', [
    'title' => '  cell   biology flashcards  ',
    'description' => 'Duplicate title',
    'documentId' => $docId
], 409);

$studyDecksList = expect($c, 'study-decks&documentId=' . $docId, 'GET');
check(count($studyDecksList['decks'] ?? []) >= 1, 'Study decks list empty.');

echo "8. Testing study-cards CRUD & Review tracking...\n";
$card = expect($c, 'study-cards', 'POST', [
    'deckId' => $studyDeckId,
    'question' => 'What organelle produces ATP?',
    'answer' => 'Mitochondria',
    'explanation' => 'Known as the powerhouse of the cell.',
    'tags' => ['Cell Bio', 'Organelles'],
    'sourceDocumentId' => $docId,
    'sourcePage' => 1
], 201);
$cardId = $card['id'];
check(!empty($cardId), 'Failed to create study card.');

$cardsList = expect($c, 'study-cards&deckId=' . $studyDeckId, 'GET');
check(count($cardsList['cards'] ?? []) === 1, 'Cards count mismatch.');

// Record review
$reviewRes = expect($c, 'study-cards/review', 'POST', [
    'cardId' => $cardId,
    'rating' => 'good'
]);
check(($reviewRes['review']['review_status'] ?? '') === 'learning', 'Review status should be learning on first good rating.');
check(($reviewRes['review']['review_count'] ?? 0) === 1, 'Review count mismatch.');

// Clean up test note and study card
expect($c, 'document-notes', 'DELETE', ['id' => $noteId]);
expect($c, 'study-cards', 'DELETE', ['id' => $cardId]);
expect($c, 'study-decks', 'DELETE', ['id' => $studyDeckId]);

echo "\n>>> ALL PDF LEARNING WORKSPACE TESTS PASSED SUCCESSFULLY! <<<\n";
