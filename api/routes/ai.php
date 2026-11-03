<?php
declare(strict_types=1);

// ============================================================================
// 8. AI Flashcard Generator (Gemini Integration)
// ============================================================================
if ($route === 'ai/generate' && $method === 'POST') {
    $apiKey = trim((string)($config['gemini_api_key'] ?? ''));
    if ($apiKey === '') {
        fail(503, 'The server did not load GEMINI_API_KEY. Check the root .env variable name and format, then restart the server.');
    }
    if (!throttle_allows(hash_hmac('sha256', 'ai-generate:' . $user, (string)($config['mailer_secret'] ?: 'local-ai-throttle-key-change-this')), 20, 3600)) {
        fail(429, 'AI generation is temporarily rate-limited. Please try again later.');
    }

    $data = input();
    $notes = field($data, 'notes', 60000);
    $deckId = isset($data['deckId']) && is_string($data['deckId']) && $data['deckId'] !== '' ? id_field($data, 'deckId') : null;
    preg_match_all('/[\p{L}\p{N}]+(?:[\'’\-][\p{L}\p{N}]+)*/u', $notes, $wordMatches);
    $sourceWordCount = count($wordMatches[0] ?? []);
    $adaptiveTargetCount = min(50, max(3, (int)ceil($sourceWordCount / 80)));
    $format = field($data, 'format', 32, false) ?: 'MIXED';
    $focus = field($data, 'focus', 64, false) ?: 'comprehensive';
    $deck = $deckId ? owned_deck($deckId, $user) : null;

    $instruction = "You are an expert academic study assistant for Co-StudyMaxx.\nCreate a comprehensive, high-quality set of study flashcards based SOLELY on the study notes below. The source contains about {$sourceWordCount} words; use approximately {$adaptiveTargetCount} cards as a guide, while letting the number reflect the distinct testable concepts and the density of the material. Cover the important concepts without repetition or filler. Never generate more than 50 cards.\n";
    if ($format === 'MULTIPLE_CHOICE') {
        $instruction .= "Every card must be MULTIPLE_CHOICE with 4 distinct options, correctIndex (0-3), and correctAnswer matching options[correctIndex].\n";
    } elseif ($format === 'TRUE_FALSE') {
        $instruction .= "Every card must be a TRUE_FALSE statement with correctAnswer exactly True or False.\n";
    } elseif ($format === 'IDENTIFICATION') {
        $instruction .= "Every card must be IDENTIFICATION with a prompt and clear, concise correctAnswer term/concept.\n";
    } else {
        $instruction .= "Provide a balanced mix of MULTIPLE_CHOICE (4 options, correctIndex, correctAnswer), TRUE_FALSE (correctAnswer exactly True or False), and IDENTIFICATION (prompt, correctAnswer).\n";
    }

    if ($focus === 'key_terms') {
        $instruction .= "Focus: Emphasize key vocabulary, acronyms, and foundational definitions.\n";
    } elseif ($focus === 'conceptual') {
        $instruction .= "Focus: Emphasize conceptual understanding, cause-and-effect relationships, and practical scenarios.\n";
    }

    $instruction .= "Output schema: Return ONLY a raw JSON array matching this structure:\n[{\"type\":\"MULTIPLE_CHOICE\"|\"TRUE_FALSE\"|\"IDENTIFICATION\",\"prompt\":\"...\",\"options\":[\"...\"],\"correctIndex\":0,\"correctAnswer\":\"...\",\"alternates\":\"...\",\"hint\":\"...\"}]\nDo NOT wrap in markdown fences like ```json. Return ONLY valid JSON array.\n\nSTUDY MATERIAL:\n" . $notes;

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
        $payload = json_encode([
            'contents' => [['parts' => [['text' => $instruction]]]],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature' => 0.3,
                'maxOutputTokens' => min(16384, max(4096, $adaptiveTargetCount * 320)),
            ],
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'x-goog-api-key: ' . $apiKey]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 90);
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
            $finishReason = (string)($p['candidates'][0]['finishReason'] ?? 'no candidate text');
            $lastErr = "Model $mName returned HTTP 200 without usable text (finish reason: $finishReason).";
        } else {
            $providerBody = is_string($raw) ? json_decode($raw, true) : null;
            $providerMessage = is_array($providerBody) && is_array($providerBody['error'] ?? null)
                ? (string)($providerBody['error']['message'] ?? '')
                : '';
            $lastErr = "Model $mName HTTP $code";
            if ($providerMessage !== '') {
                $lastErr .= ': ' . preg_replace('/[\r\n\t]+/', ' ', $providerMessage);
            } elseif ($cErr !== '') {
                $lastErr .= ': cURL ' . preg_replace('/[\r\n\t]+/', ' ', $cErr);
            }
        }
    }

    if (!$geminiResponse) {
        error_log('Gemini bombcard generation failed: ' . substr($lastErr ?: 'No response from configured models.', 0, 600));
        fail(502, 'Could not generate flashcards with Gemini. Please try again in a moment.');
    }

    $clean = trim($geminiResponse);
    if (str_starts_with($clean, '```')) {
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);
        $clean = trim($clean);
    }

    $cardsData = json_decode($clean, true);
    if (!is_array($cardsData) && isset($cardsData['cards']) && is_array($cardsData['cards'])) {
        $cardsData = $cardsData['cards'];
    }

    if (!is_array($cardsData)) {
        error_log('Gemini bombcard generation returned invalid JSON; response length: ' . strlen($clean));
        fail(502, 'Gemini returned an unparseable response. Please try again.');
    }

    $normalized = [];
    foreach ($cardsData as $idx => $c) {
        if (!is_array($c) || empty($c['prompt'])) {
            continue;
        }
        $rawType = strtoupper(trim((string)($c['type'] ?? 'MULTIPLE_CHOICE')));
        $type = in_array($rawType, ['MULTIPLE_CHOICE','TRUE_FALSE','IDENTIFICATION'], true) ? $rawType : 'MULTIPLE_CHOICE';
        $prompt = trim((string)$c['prompt']);
        $hint = !empty($c['hint']) ? trim((string)$c['hint']) : null;

        if ($type === 'MULTIPLE_CHOICE') {
            $rawOpts = is_array($c['options'] ?? null) ? $c['options'] : [];
            $options = [];
            foreach ($rawOpts as $opt) {
                if (is_string($opt) || is_numeric($opt)) {
                    $options[] = trim((string)$opt);
                }
            }
            while (count($options) < 4) {
                $options[] = 'Option ' . (count($options) + 1);
            }
            $options = array_slice($options, 0, 4);
            $cIdx = isset($c['correctIndex']) && is_numeric($c['correctIndex']) ? (int)$c['correctIndex'] : 0;
            if ($cIdx < 0 || $cIdx > 3) {
                $cIdx = 0;
            }
            $ans = $options[$cIdx];
            $normalized[] = [
                'id' => 'ai-' . ($idx + 1) . '-' . uid(),
                'type' => 'MULTIPLE_CHOICE',
                'prompt' => $prompt,
                'options' => $options,
                'correctIndex' => $cIdx,
                'correctAnswer' => $ans,
                'hint' => $hint,
            ];
        } elseif ($type === 'TRUE_FALSE') {
            $rawAnswer = $c['correctAnswer'] ?? ($c['answer'] ?? '');
            $ans = is_bool($rawAnswer) ? ($rawAnswer ? 'True' : 'False') : ucfirst(strtolower(trim((string)$rawAnswer)));
            if (!in_array($ans, ['True','False'], true)) {
                continue;
            }
            $normalized[] = [
                'id' => 'ai-' . ($idx + 1) . '-' . uid(),
                'type' => 'TRUE_FALSE',
                'prompt' => $prompt,
                'options' => ['True','False'],
                'correctIndex' => $ans === 'True' ? 0 : 1,
                'correctAnswer' => $ans,
                'hint' => $hint,
            ];
        } else {
            $ans = trim((string)($c['correctAnswer'] ?? ''));
            if ($ans === '') {
                continue;
            }
            $normalized[] = [
                'id' => 'ai-' . ($idx + 1) . '-' . uid(),
                'type' => 'IDENTIFICATION',
                'prompt' => $prompt,
                'correctAnswer' => $ans,
                'alternates' => !empty($c['alternates']) ? trim((string)$c['alternates']) : '',
                'hint' => $hint,
            ];
        }
    }

    if (empty($normalized)) {
        fail(422, 'Could not extract valid questions from the provided notes. Please supply more detailed study text.');
    }

    $saveDirectly = ($data['saveDirectly'] ?? false) === true;
    if ($saveDirectly && $deck) {
        $db->beginTransaction();
        $startPos = (int)query('SELECT COALESCE(MAX(position),-1)+1 FROM cards WHERE deck_id=?', [$deck['id']])->fetchColumn();
        foreach ($normalized as $i => $card) {
            save_card($card, $deck['id'], null, $startPos + $i);
        }
        activity($user, $deck['id'], $deck['title'], 'AI Bombcards', 'creator', 'Created');
        $db->commit();
    }

    respond([
        'ok' => true,
        'count' => count($normalized),
        'deckId' => $deckId,
        'saved' => $saveDirectly && $deck !== null,
        'cards' => $normalized,
    ]);
}

if ($route === 'ai/reviewer' && $method === 'POST') {
    $apiKey = trim((string)($config['gemini_api_key'] ?? ''));
    if ($apiKey === '') {
        fail(503, 'Gemini is not configured on the server.');
    }
    if (!throttle_allows(hash_hmac('sha256', 'ai-reviewer:' . $user, (string)($config['mailer_secret'] ?: 'local-ai-throttle-key-change-this')), 10, 3600)) {
        fail(429, 'Reviewer creation is temporarily rate-limited. Please try again later.');
    }

    $data = input();
    $notes = field($data, 'notes', 60000, false);
    $deckTitle = field($data, 'deckTitle', 120, false) ?: 'Generated reviewer';
    $rawCards = $data['cards'] ?? null;
    if (!is_array($rawCards) || count($rawCards) < 1 || count($rawCards) > 50) {
        fail(422, 'The generated Bombcards could not be read. Please generate them again.');
    }
    $limitText = static fn(string $value, int $limit): string => function_exists('mb_substr') ? mb_substr($value, 0, $limit, 'UTF-8') : substr($value, 0, $limit);
    $reviewCards = [];
    foreach ($rawCards as $card) {
        if (!is_array($card)) continue;
        $prompt = trim((string)($card['prompt'] ?? ''));
        $answer = trim((string)($card['correctAnswer'] ?? ''));
        if ($prompt === '' || $answer === '') continue;
        $reviewCards[] = [
            'type' => substr((string)($card['type'] ?? ''), 0, 32),
            'prompt' => $limitText($prompt, 1200),
            'answer' => $limitText($answer, 500),
            'options' => is_array($card['options'] ?? null) ? array_slice(array_map(static fn($value) => is_string($value) || is_numeric($value) ? $limitText((string)$value, 300) : '', $card['options']), 0, 4) : [],
        ];
    }
    if (!$reviewCards) fail(422, 'No usable Bombcards were provided.');

    $instruction = "You are an expert academic study guide writer. Create an actual concept reviewer from the provided study source and generated flashcards. Write organized study notes that explain the subject for learning and offline review. Do not produce an answer sheet: never reproduce the card questions, multiple-choice options, question numbers, or an answer-by-answer list. Group related concepts under useful topic headings. Explain what ideas mean and how they relate, using concise paragraphs, term definitions, and bullet points. Include key facts and distinctions supported by the source; do not invent facts or expand beyond what is supported. Put each key term in the term field so it can be emphasized in bold, and make each core takeaway concise. Return only JSON in this schema: {\"title\":\"...\",\"sections\":[{\"heading\":\"...\",\"blocks\":[{\"type\":\"paragraph\",\"text\":\"...\"},{\"type\":\"definition\",\"term\":\"...\",\"explanation\":\"...\"},{\"type\":\"bullet\",\"text\":\"...\"},{\"type\":\"key_takeaway\",\"text\":\"...\"}]}]}. Include enough explanation to function as a study reviewer, not just a list of terms. Keep it focused and readable, with about 3 to 10 sections depending on the material.\n\nDECK/SUBJECT: " . $deckTitle . "\n\nGENERATED BOMBCARDS (use only to identify concepts and coverage; do not repeat their question format):\n" . json_encode($reviewCards, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($notes !== '') {
        $instruction .= "\n\nSOURCE STUDY NOTES (primary factual source):\n" . $notes;
    }

    $modelsToTry = array_values(array_unique(array_filter([
        trim((string)($config['gemini_model'] ?? 'gemini-3.8-flash')),
        'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash',
    ])));
    $reviewerResponse = null;
    $lastErr = '';
    foreach ($modelsToTry as $mName) {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . $mName . ':generateContent';
        $payload = json_encode([
            'contents' => [['parts' => [['text' => $instruction]]]],
            'generationConfig' => ['responseMimeType' => 'application/json', 'temperature' => 0.35, 'maxOutputTokens' => 9000],
        ]);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'x-goog-api-key: ' . $apiKey]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 90);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cErr = curl_error($ch);
        curl_close($ch);
        if ($code === 200 && is_string($raw) && $raw !== '') {
            $provider = json_decode($raw, true);
            $text = $provider['candidates'][0]['content']['parts'][0]['text'] ?? '';
            if ($text !== '') { $reviewerResponse = $text; break; }
            $lastErr = 'Model ' . $mName . ' returned no reviewer text.';
        } else {
            $lastErr = 'Model ' . $mName . ' HTTP ' . $code . ($cErr !== '' ? ': ' . $cErr : '');
        }
    }
    if (!$reviewerResponse) {
        error_log('Gemini reviewer creation failed: ' . substr($lastErr ?: 'No response from configured models.', 0, 600));
        fail(502, 'Gemini could not create the study reviewer. Please try again.');
    }
    $clean = trim($reviewerResponse);
    if (str_starts_with($clean, '```')) {
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);
    }
    $reviewer = json_decode(trim($clean), true);
    if (!is_array($reviewer) || !is_array($reviewer['sections'] ?? null)) {
        fail(502, 'Gemini returned a reviewer in an unsupported format. Please try again.');
    }
    $sections = [];
    foreach (array_slice($reviewer['sections'], 0, 12) as $section) {
        if (!is_array($section) || trim((string)($section['heading'] ?? '')) === '' || !is_array($section['blocks'] ?? null)) continue;
        $blocks = [];
        foreach (array_slice($section['blocks'], 0, 30) as $block) {
            if (!is_array($block)) continue;
            $type = (string)($block['type'] ?? '');
            if ($type === 'definition') {
                $term = trim((string)($block['term'] ?? ''));
                $explanation = trim((string)($block['explanation'] ?? ''));
                if ($term !== '' && $explanation !== '') $blocks[] = ['type' => 'definition', 'term' => $limitText($term, 180), 'explanation' => $limitText($explanation, 1200)];
            } elseif (in_array($type, ['paragraph', 'bullet', 'key_takeaway'], true)) {
                $text = trim((string)($block['text'] ?? ''));
                if ($text !== '') $blocks[] = ['type' => $type, 'text' => $limitText($text, 1800)];
            }
        }
        if ($blocks) $sections[] = ['heading' => $limitText(trim((string)$section['heading']), 180), 'blocks' => $blocks];
    }
    if (!$sections) fail(502, 'Gemini did not return usable study notes. Please try again.');
    respond(['ok' => true, 'reviewer' => ['title' => $limitText(trim((string)($reviewer['title'] ?? 'Study Reviewer')), 180), 'sections' => $sections]]);
}
