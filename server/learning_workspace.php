<?php
declare(strict_types=1);

/**
 * PDF Learning Workspace Backend Routes
 * Handles document page extraction, search, notes, study flashcard decks, and AI assistance.
 */

function gemini_execute_prompt(string $prompt, bool $jsonMode = false, float $temperature = 0.3): string {
    global $config;
    $apiKey = (string)($config['gemini_api_key'] ?? '');
    if ($apiKey === '') {
        fail(503, 'Gemini AI is not configured on this server. Please configure GEMINI_API_KEY.');
    }

    $modelsToTry = array_values(array_unique(array_filter([
        trim((string)($config['gemini_model'] ?? 'gemini-3.8-flash')),
        'gemini-3.8-flash',
        'gemini-3.5-flash-lite',
        'gemini-2.5-flash',
    ])));
    $geminiResponse = null;
    $lastErr = '';

    foreach ($modelsToTry as $mName) {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $mName . ':generateContent';
        $reqData = [
            'contents' => [['parts' => [['text' => $prompt]]]],
            'generationConfig' => [
                'temperature' => $temperature,
                'maxOutputTokens' => 4096,
            ],
        ];
        if ($jsonMode) {
            $reqData['generationConfig']['responseMimeType'] = 'application/json';
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($reqData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'x-goog-api-key: ' . $apiKey]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 45);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cErr = curl_error($ch);
        curl_close($ch);

        if ($code === 200 && is_string($raw) && $raw !== '') {
            $p = json_decode($raw, true);
            $txt = $p['candidates'][0]['content']['parts'][0]['text'] ?? '';
            if ($txt !== '') {
                $geminiResponse = $txt;
                break;
            }
        } else {
            $lastErr = "Model $mName HTTP $code: " . ($raw ?: $cErr);
        }
    }

    if (!$geminiResponse) {
        error_log("Gemini prompt failed across all models: $lastErr");
        fail(502, 'Could not complete AI request with Gemini. Please try again.');
    }

    return $geminiResponse;
}

function parse_gemini_json(string $text): mixed {
    $clean = trim($text);
    if (str_starts_with($clean, '```')) {
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);
        $clean = trim($clean);
    }
    $decoded = json_decode($clean, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        // Try to extract json substring
        if (preg_match('/(\[[\s\S]*\]|\{[\s\S]*\})/', $clean, $matches)) {
            $decoded = json_decode($matches[1], true);
        }
    }
    return $decoded;
}

function handle_learning_workspace_routes(string $route, string $method, string $user): bool {
    global $database, $db, $documentPagesService, $documentNotesService, $studyDecksService, $studyCardsService, $studyReviewService;

    // -------------------------------------------------------------------------
    // 1. Documents: Extract text and get pages
    // -------------------------------------------------------------------------
    if ($route === 'documents/extract') {
        if ($method === 'POST') {
            $data = input();
            $docId = id_field($data, 'documentId');
            $doc = owned_document($docId, $user);
            $pages = $data['pages'] ?? [];
            $pageCount = isset($data['pageCount']) ? (int)$data['pageCount'] : count($pages);

            $storedCount = 0;
            if (is_array($pages)) {
                foreach ($pages as $p) {
                    $num = (int)($p['page'] ?? 0);
                    $text = trim((string)($p['text'] ?? ''));
                    if ($num > 0 && $text !== '') {
                        $documentPagesService->store($docId, $num, $text);
                        $storedCount++;
                    }
                }
            }

            $query = 'UPDATE documents SET text_extracted = TRUE, processing_status = "ready"';
            $params = [];
            if ($pageCount > 0) {
                $query .= ', page_count = ?';
                $params[] = $pageCount;
            }
            $query .= ' WHERE id = ?';
            $params[] = $docId;
            $database->query($query, $params);

            respond(['ok' => true, 'savedPages' => $storedCount, 'pageCount' => $pageCount]);
        }

        if ($method === 'GET') {
            $docId = id_field($_GET, 'documentId');
            $doc = owned_document($docId, $user);
            $fromPage = isset($_GET['from']) ? max(1, (int)$_GET['from']) : 1;
            $toPage = isset($_GET['to']) ? max($fromPage, (int)$_GET['to']) : 999999;
            $pages = $documentPagesService->getPages($docId, $fromPage, $toPage);
            respond([
                'documentId' => $docId,
                'extracted' => !empty($pages),
                'pages' => $pages,
                'pageCount' => (int)($doc['page_count'] ?? count($pages)),
            ]);
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // 2. Documents: Search within document text
    // -------------------------------------------------------------------------
    if ($route === 'documents/search' && $method === 'GET') {
        $docId = id_field($_GET, 'documentId');
        $doc = owned_document($docId, $user);
        $q = trim((string)($_GET['q'] ?? ''));
        if ($q === '') {
            respond(['results' => []]);
        }
        $results = $documentPagesService->search($docId, $q);
        respond(['documentId' => $docId, 'results' => $results, 'query' => $q]);
        return true;
    }

    // -------------------------------------------------------------------------
    // 3. Documents: Read / update last viewed page
    // -------------------------------------------------------------------------
    if ($route === 'documents/page') {
        if ($method === 'GET') {
            $docId = id_field($_GET, 'documentId');
            $doc = owned_document($docId, $user);
            respond(['documentId' => $docId, 'last_page' => (int)($doc['last_page'] ?? 1)]);
        }

        if ($method === 'POST' || $method === 'PATCH') {
            $data = input();
            $docId = id_field($data, 'documentId');
            $doc = owned_document($docId, $user);
            $page = max(1, (int)($data['page'] ?? 1));
            $database->query('UPDATE documents SET last_page = ? WHERE id = ?', [$page, $docId]);
            respond(['ok' => true, 'documentId' => $docId, 'last_page' => $page]);
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // 4. Document Notes: CRUD
    // -------------------------------------------------------------------------
    if ($route === 'document-notes') {
        if ($method === 'GET') {
            if (!empty($_GET['q'])) {
                $q = trim((string)$_GET['q']);
                $notes = $documentNotesService->search($user, $q);
                respond(['notes' => $notes]);
            }
            $docId = id_field($_GET, 'documentId');
            $doc = owned_document($docId, $user);
            $notes = $documentNotesService->forDocument($docId, $user);
            respond(['documentId' => $docId, 'notes' => $notes]);
        }

        if ($method === 'POST') {
            $data = input();
            $docId = id_field($data, 'documentId');
            $doc = owned_document($docId, $user);
            $title = field($data, 'title', 500, false) ?: 'Untitled Note';
            $content = field($data, 'content', 50000);
            $page = isset($data['page']) && is_numeric($data['page']) ? max(1, (int)$data['page']) : null;
            $annotationId = isset($data['annotationId']) && is_string($data['annotationId']) && preg_match('/^[a-f0-9]{32}$/D', $data['annotationId']) ? $data['annotationId'] : null;
            $id = uid();

            $documentNotesService->create($id, $docId, $user, $page, $title, $content, $annotationId);
            respond([
                'id' => $id,
                'documentId' => $docId,
                'title' => $title,
                'content' => $content,
                'page_number' => $page,
                'annotation_id' => $annotationId,
                'created_at' => gmdate('Y-m-d H:i:s'),
            ], 201);
        }

        if ($method === 'PATCH') {
            $data = input();
            $id = id_field($data, 'id');
            $note = $documentNotesService->owned($id, $user);
            if (!$note) fail(404, 'Note not found.');
            $title = field($data, 'title', 500, false) ?: $note['title'];
            $content = field($data, 'content', 50000, false) ?: $note['content'];
            $page = isset($data['page']) ? (is_numeric($data['page']) ? max(1, (int)$data['page']) : null) : $note['page_number'];

            $documentNotesService->update($id, $user, $title, $content, $page);
            respond(['ok' => true, 'id' => $id, 'title' => $title, 'content' => $content, 'page_number' => $page]);
        }

        if ($method === 'DELETE') {
            $data = $method === 'DELETE' ? (empty($_GET['id']) ? input() : $_GET) : input();
            $id = id_field($data, 'id');
            $deleted = $documentNotesService->delete($id, $user);
            if (!$deleted) fail(404, 'Note not found.');
            respond(['ok' => true, 'id' => $id]);
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // 5. Study Decks: CRUD
    // -------------------------------------------------------------------------
    if ($route === 'study-decks') {
        if ($method === 'GET') {
            if (!empty($_GET['documentId'])) {
                $docId = id_field($_GET, 'documentId');
                $doc = owned_document($docId, $user);
                $decks = $studyDecksService->forDocument($docId, $user);
            } else {
                $decks = $studyDecksService->forUser($user);
            }
            respond(['decks' => $decks]);
        }

        if ($method === 'POST') {
            $data = input();
            $title = canonical_deck_title(field($data, 'title', 255));
            $description = field($data, 'description', 2000, false) ?: '';
            $docId = !empty($data['documentId']) ? id_field($data, 'documentId') : null;
            if ($docId) {
                owned_document($docId, $user);
            }
            $id = uid();
            $db->beginTransaction();
            query('SELECT id FROM users WHERE id=? FOR UPDATE', [$user]);
            assert_unique_study_deck_title($user, $title);
            $studyDecksService->create($id, $user, $title, $description, $docId);
            $db->commit();
            respond(['id' => $id, 'title' => $title, 'description' => $description, 'document_id' => $docId, 'card_count' => 0], 201);
        }

        if ($method === 'PATCH') {
            $data = input();
            $id = id_field($data, 'id');
            $deck = $studyDecksService->owned($id, $user);
            if (!$deck) fail(404, 'Study deck not found.');
            $title = canonical_deck_title(field($data, 'title', 255, false) ?: $deck['title']);
            $description = field($data, 'description', 2000, false) ?: $deck['description'];
            $db->beginTransaction();
            query('SELECT id FROM users WHERE id=? FOR UPDATE', [$user]);
            if (normalized_deck_title((string)$deck['title']) !== normalized_deck_title($title)) {
                assert_unique_study_deck_title($user, $title, $id);
            }
            $studyDecksService->update($id, $user, $title, $description);
            $db->commit();
            respond(['ok' => true, 'id' => $id, 'title' => $title, 'description' => $description]);
        }

        if ($method === 'DELETE') {
            $data = empty($_GET['id']) ? input() : $_GET;
            $id = id_field($data, 'id');
            $deleted = $studyDecksService->delete($id, $user);
            if (!$deleted) fail(404, 'Study deck not found.');
            respond(['ok' => true, 'id' => $id]);
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // 6. Study Cards: CRUD
    // -------------------------------------------------------------------------
    if ($route === 'study-cards') {
        if ($method === 'GET') {
            $deckId = id_field($_GET, 'deckId');
            $deck = $studyDecksService->owned($deckId, $user);
            if (!$deck) fail(404, 'Study deck not found.');
            $cards = $studyCardsService->forDeck($deckId);
            $reviews = $studyReviewService->forDeck($user, $deckId);
            $reviewMap = [];
            foreach ($reviews as $rev) {
                $reviewMap[$rev['flashcard_id']] = $rev;
            }
            foreach ($cards as &$card) {
                $card['review'] = $reviewMap[$card['id']] ?? [
                    'review_count' => 0,
                    'correct_count' => 0,
                    'review_status' => 'new',
                    'last_reviewed_at' => null,
                ];
            }
            unset($card);
            respond(['deck' => $deck, 'cards' => $cards]);
        }

        if ($method === 'POST') {
            $data = input();
            $deckId = id_field($data, 'deckId');
            $deck = $studyDecksService->owned($deckId, $user);
            if (!$deck) fail(404, 'Study deck not found.');

            $question = field($data, 'question', 5000);
            $answer = field($data, 'answer', 5000);
            $explanation = field($data, 'explanation', 5000, false) ?: '';
            $docId = !empty($data['sourceDocumentId']) ? id_field($data, 'sourceDocumentId') : null;
            $page = isset($data['sourcePage']) && is_numeric($data['sourcePage']) ? max(1, (int)$data['sourcePage']) : null;
            $tags = is_array($data['tags'] ?? null) ? $data['tags'] : [];

            $id = uid();
            $pos = $studyCardsService->nextPosition($deckId);
            $studyCardsService->create($id, $deckId, $question, $answer, $explanation, $docId, $page, $pos);
            if (!empty($tags)) {
                $studyCardsService->setTags($id, $tags);
            }

            respond([
                'id' => $id,
                'deck_id' => $deckId,
                'question' => $question,
                'answer' => $answer,
                'explanation' => $explanation,
                'source_document_id' => $docId,
                'source_page' => $page,
                'tags' => array_values(array_filter($tags, 'is_string')),
                'review' => ['review_count' => 0, 'correct_count' => 0, 'review_status' => 'new'],
            ], 201);
        }

        if ($method === 'PATCH') {
            $data = input();
            $id = id_field($data, 'id');
            $card = $studyCardsService->owned($id, $user);
            if (!$card) fail(404, 'Card not found.');

            $question = field($data, 'question', 5000, false) ?: $card['question'];
            $answer = field($data, 'answer', 5000, false) ?: $card['answer'];
            $explanation = field($data, 'explanation', 5000, false) ?: $card['explanation'];
            $studyCardsService->update($id, $user, $question, $answer, $explanation);

            if (isset($data['tags']) && is_array($data['tags'])) {
                $studyCardsService->setTags($id, $data['tags']);
            }

            respond(['ok' => true, 'id' => $id, 'question' => $question, 'answer' => $answer, 'explanation' => $explanation]);
        }

        if ($method === 'DELETE') {
            $data = empty($_GET['id']) ? input() : $_GET;
            $id = id_field($data, 'id');
            $deleted = $studyCardsService->delete($id, $user);
            if (!$deleted) fail(404, 'Card not found.');
            respond(['ok' => true, 'id' => $id]);
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // 7. Study Flashcard Review Progress
    // -------------------------------------------------------------------------
    if ($route === 'study-cards/review') {
        if ($method === 'POST') {
            $data = input();
            $cardId = id_field($data, 'cardId');
            $card = $studyCardsService->owned($cardId, $user);
            if (!$card) fail(404, 'Card not found.');
            $rating = field($data, 'rating', 20); // 'again', 'hard', 'good', 'easy'
            $updated = $studyReviewService->record($user, $cardId, $rating);
            respond(['ok' => true, 'review' => $updated]);
        }

        if ($method === 'GET') {
            $deckId = id_field($_GET, 'deckId');
            $deck = $studyDecksService->owned($deckId, $user);
            if (!$deck) fail(404, 'Deck not found.');
            $reviews = $studyReviewService->forDeck($user, $deckId);
            respond(['reviews' => $reviews]);
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // 8. AI Learning Assist: Explain
    // -------------------------------------------------------------------------
    if ($route === 'ai/explain' && $method === 'POST') {
        $data = input();
        $text = field($data, 'text', 10000);
        $level = field($data, 'level', 30, false) ?: 'clear'; // 'clear', 'simple', 'detailed', 'analogy'
        $docId = !empty($data['documentId']) ? id_field($data, 'documentId') : null;
        $page = isset($data['page']) && is_numeric($data['page']) ? (int)$data['page'] : null;

        $docContext = '';
        if ($docId && $page) {
            $docContext = $documentPagesService->getContextAround($docId, $page, 1);
        }

        $prompt = "You are an expert, encouraging study tutor for Co-StudyMaxx.\n";
        $prompt .= "Explain the following concept or excerpt from the student's study material clearly and insightfully.\n";
        if ($level === 'simple') {
            $prompt .= "Style: Simple and accessible (ELI5 level, break down jargon into intuitive plain language).\n";
        } elseif ($level === 'detailed') {
            $prompt .= "Style: Comprehensive and in-depth academic explanation with nuances and applications.\n";
        } elseif ($level === 'analogy') {
            $prompt .= "Style: Relatable analogy and mental models to make the abstract concept click.\n";
        } else {
            $prompt .= "Style: Clear, high-yield conceptual breakdown.\n";
        }

        if ($docContext !== '') {
            $prompt .= "\nSURROUNDING DOCUMENT CONTEXT:\n" . mb_substr($docContext, 0, 3000, 'UTF-8') . "\n";
        }
        $prompt .= "\nEXCERPT TO EXPLAIN:\n\"{$text}\"\n\n";
        $prompt .= "Format your response with clean markdown headings and bullet points:\n";
        $prompt .= "### Quick Summary\n### In-Depth Explanation\n### Key Takeaway / Memory Aid\n";

        $response = gemini_execute_prompt($prompt, false, 0.4);
        respond(['explanation' => $response, 'text' => $text]);
        return true;
    }

    // -------------------------------------------------------------------------
    // 9. AI Learning Assist: Summarize
    // -------------------------------------------------------------------------
    if ($route === 'ai/summarize' && $method === 'POST') {
        $data = input();
        $text = $data['text'] ?? '';
        $docId = !empty($data['documentId']) ? id_field($data, 'documentId') : null;
        $page = isset($data['page']) && is_numeric($data['page']) ? (int)$data['page'] : null;
        $fromPage = isset($data['fromPage']) && is_numeric($data['fromPage']) ? (int)$data['fromPage'] : null;
        $toPage = isset($data['toPage']) && is_numeric($data['toPage']) ? (int)$data['toPage'] : null;

        if (trim($text) === '' && $docId) {
            if ($fromPage && $toPage) {
                $pages = $documentPagesService->getPages($docId, $fromPage, $toPage);
                $text = implode("\n\n", array_column($pages, 'page_text'));
            } elseif ($page) {
                $p = $documentPagesService->getPage($docId, $page);
                $text = $p ? $p['page_text'] : '';
            } else {
                $text = $documentPagesService->getAllText($docId);
            }
        }

        if (trim($text) === '') {
            fail(422, 'Provide text or select pages to summarize.');
        }

        $trimmedText = mb_substr($text, 0, 15000, 'UTF-8');
        $prompt = "You are an academic synthesis expert for Co-StudyMaxx.\n";
        $prompt .= "Generate an executive study summary of the following academic material.\n";
        $prompt .= "Include:\n";
        $prompt .= "1. Executive TL;DR (2-3 sentences)\n";
        $prompt .= "2. Core Concepts & Definitions (bulleted list)\n";
        $prompt .= "3. Critical Insights & Implications\n";
        $prompt .= "4. High-Yield Exam Takeaway\n\n";
        $prompt .= "STUDY CONTENT:\n" . $trimmedText;

        $response = gemini_execute_prompt($prompt, false, 0.3);
        respond(['summary' => $response]);
        return true;
    }

    // -------------------------------------------------------------------------
    // 10. AI Learning Assist: Practice Questions
    // -------------------------------------------------------------------------
    if ($route === 'ai/questions' && $method === 'POST') {
        $data = input();
        $text = $data['text'] ?? '';
        $docId = !empty($data['documentId']) ? id_field($data, 'documentId') : null;
        $page = isset($data['page']) && is_numeric($data['page']) ? (int)$data['page'] : null;
        $count = isset($data['count']) ? max(1, min(10, (int)$data['count'])) : 3;

        if (trim($text) === '' && $docId && $page) {
            $p = $documentPagesService->getPage($docId, $page);
            $text = $p ? $p['page_text'] : '';
        }

        if (trim($text) === '') {
            fail(422, 'Provide text to generate questions from.');
        }

        $trimmedText = mb_substr($text, 0, 12000, 'UTF-8');
        $prompt = "You are a test preparation specialist for Co-StudyMaxx.\n";
        $prompt .= "Generate {$count} active-recall practice questions based SOLELY on the study material below.\n";
        $prompt .= "Output schema: Return ONLY a raw JSON array matching:\n";
        $prompt .= "[{\"question\":\"...\",\"answer\":\"...\",\"explanation\":\"...\",\"hint\":\"...\"}]\n";
        $prompt .= "Do NOT include markdown backticks. Return valid JSON array.\n\n";
        $prompt .= "STUDY MATERIAL:\n" . $trimmedText;

        $raw = gemini_execute_prompt($prompt, true, 0.3);
        $questions = parse_gemini_json($raw);
        if (!is_array($questions)) {
            $questions = [];
        }

        respond(['questions' => $questions]);
        return true;
    }

    // -------------------------------------------------------------------------
    // 11. AI Learning Assist: Structured Study Notes
    // -------------------------------------------------------------------------
    if ($route === 'ai/notes' && $method === 'POST') {
        $data = input();
        $text = $data['text'] ?? '';
        $docId = !empty($data['documentId']) ? id_field($data, 'documentId') : null;
        $page = isset($data['page']) && is_numeric($data['page']) ? (int)$data['page'] : null;
        $saveDirectly = ($data['save'] ?? false) === true;

        if (trim($text) === '' && $docId && $page) {
            $p = $documentPagesService->getPage($docId, $page);
            $text = $p ? $p['page_text'] : '';
        }

        if (trim($text) === '') {
            fail(422, 'Provide text to generate notes from.');
        }

        $trimmedText = mb_substr($text, 0, 12000, 'UTF-8');
        $prompt = "You are an elite note-taking assistant for Co-StudyMaxx.\n";
        $prompt .= "Synthesize the provided study material into clear, Cornell-style structured study notes.\n";
        $prompt .= "Output schema: Return ONLY a raw JSON object with:\n";
        $prompt .= "{\n  \"title\": \"Descriptive, concise title\",\n  \"content\": \"Clean markdown formatted notes with Cues, Notes, and Summary\",\n  \"tags\": [\"tag1\", \"tag2\"]\n}\n";
        $prompt .= "Return valid JSON only.\n\n";
        $prompt .= "MATERIAL:\n" . $trimmedText;

        $raw = gemini_execute_prompt($prompt, true, 0.3);
        $parsed = parse_gemini_json($raw);
        if (!is_array($parsed) || empty($parsed['content'])) {
            $parsed = [
                'title' => 'Study Notes',
                'content' => $raw,
                'tags' => ['Study'],
            ];
        }

        $savedId = null;
        if ($saveDirectly && $docId) {
            $savedId = uid();
            $documentNotesService->create(
                $savedId,
                $docId,
                $user,
                $page,
                (string)($parsed['title'] ?? 'Generated Note'),
                (string)($parsed['content'] ?? ''),
                null
            );
        }

        respond([
            'note' => $parsed,
            'saved' => (bool)$savedId,
            'noteId' => $savedId,
        ]);
        return true;
    }

    // -------------------------------------------------------------------------
    // 12. AI Learning Assist: Generate Study Flashcards
    // -------------------------------------------------------------------------
    if ($route === 'ai/flashcards' && $method === 'POST') {
        $data = input();
        $text = $data['text'] ?? '';
        $docId = !empty($data['documentId']) ? id_field($data, 'documentId') : null;
        $page = isset($data['page']) && is_numeric($data['page']) ? (int)$data['page'] : null;
        $deckId = !empty($data['deckId']) ? id_field($data, 'deckId') : null;
        $count = isset($data['count']) ? max(1, min(15, (int)$data['count'])) : 5;

        if (trim($text) === '' && $docId && $page) {
            $p = $documentPagesService->getPage($docId, $page);
            $text = $p ? $p['page_text'] : '';
        }

        if (trim($text) === '') {
            fail(422, 'Provide text or material to generate flashcards.');
        }

        $trimmedText = mb_substr($text, 0, 15000, 'UTF-8');
        $prompt = "You are an expert flashcard designer for Co-StudyMaxx.\n";
        $prompt .= "Create {$count} high-retention flashcards from this study content.\n";
        $prompt .= "Requirements:\n";
        $prompt .= "- 'question': Focused, single-concept prompt (avoid vague 'what is' when possible)\n";
        $prompt .= "- 'answer': Crisp, accurate answer (1-3 sentences max)\n";
        $prompt .= "- 'explanation': Memory cue or additional context\n";
        $prompt .= "- 'tags': Array of 1-3 concise category tags\n";
        $prompt .= "Return ONLY a JSON array of objects:\n";
        $prompt .= "[{\"question\":\"...\",\"answer\":\"...\",\"explanation\":\"...\",\"tags\":[\"...\"]}]\n";
        $prompt .= "Return valid JSON array only.\n\n";
        $prompt .= "STUDY CONTENT:\n" . $trimmedText;

        $raw = gemini_execute_prompt($prompt, true, 0.3);
        $cards = parse_gemini_json($raw);
        if (!is_array($cards)) {
            $cards = [];
        }

        $savedCards = [];
        if ($deckId) {
            $deck = $studyDecksService->owned($deckId, $user);
            if ($deck) {
                foreach ($cards as $c) {
                    if (empty($c['question']) || empty($c['answer'])) continue;
                    $cId = uid();
                    $q = trim((string)$c['question']);
                    $a = trim((string)$c['answer']);
                    $exp = trim((string)($c['explanation'] ?? ''));
                    $tags = is_array($c['tags'] ?? null) ? $c['tags'] : [];
                    $pos = $studyCardsService->nextPosition($deckId);

                    $studyCardsService->create($cId, $deckId, $q, $a, $exp, $docId, $page, $pos);
                    if (!empty($tags)) {
                        $studyCardsService->setTags($cId, $tags);
                    }
                    $savedCards[] = [
                        'id' => $cId,
                        'deck_id' => $deckId,
                        'question' => $q,
                        'answer' => $a,
                        'explanation' => $exp,
                        'tags' => $tags,
                    ];
                }
            }
        }

        respond([
            'cards' => !empty($savedCards) ? $savedCards : $cards,
            'saved' => count($savedCards),
            'deckId' => $deckId,
        ]);
        return true;
    }

    return false;
}
