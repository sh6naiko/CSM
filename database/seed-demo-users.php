<?php
declare(strict_types=1);

// Opt-in local/demo seed. These fictional accounts use reserved .invalid emails
// and random, undisclosed passwords, so they cannot receive mail or be logged in to.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

if (($argv[1] ?? '') !== '--apply' || $argc !== 2) {
    fwrite(STDERR, "Usage: php database/seed-demo-users.php --apply\nThis inserts fictional demo accounts, private reviewer decks, Bombcards, and study activity.\n");
    exit(2);
}

$configPath = dirname(__DIR__) . '/server/config.local.php';
if (!is_file($configPath)) {
    fwrite(STDERR, "Local database configuration was not found.\n");
    exit(1);
}
$config = require $configPath;
if (!in_array($config['app_env'] ?? '', ['local', 'development'], true)) {
    fwrite(STDERR, "Demo seeding is disabled outside local/development environments.\n");
    exit(1);
}

try {
    $pdo = new PDO($config['dsn'], $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $error) {
    fwrite(STDERR, "Could not connect to MySQL. Check that XAMPP MySQL is running and review server/config.local.php.\n");
    exit(1);
}

$demos = [
    [
        'username' => 'maya.santos', 'email' => 'maya.santos@sample.invalid',
        'first' => 'Maya', 'last' => 'Santos', 'avatar' => 'violet', 'daysAgo' => 14,
        'subject' => 'History', 'deck' => 'Philippine History — Demo Set',
        'cards' => [
            ['prompt' => 'What event is commemorated on June 12 in the Philippines?', 'options' => ['Independence Day', 'National Heroes Day', 'Bonifacio Day', 'Araw ng Kagitingan'], 'correct' => 0, 'explanation' => 'June 12 marks the declaration of Philippine independence in 1898.'],
            ['prompt' => 'Who wrote the novels Noli Me Tangere and El Filibusterismo?', 'options' => ['Andrés Bonifacio', 'José Rizal', 'Apolinario Mabini', 'Emilio Jacinto'], 'correct' => 1, 'explanation' => 'José Rizal wrote both novels as critiques of colonial society.'],
            ['prompt' => 'Where was Philippine independence declared in 1898?', 'options' => ['Malolos, Bulacan', 'Kawit, Cavite', 'Cebu City', 'Manila'], 'correct' => 1, 'explanation' => 'The declaration took place at the Aguinaldo ancestral home in Kawit, Cavite.'],
        ],
    ],
    [
        'username' => 'noah.reyes', 'email' => 'noah.reyes@sample.invalid',
        'first' => 'Noah', 'last' => 'Reyes', 'avatar' => 'ember', 'daysAgo' => 11,
        'subject' => 'Biology', 'deck' => 'Cell Biology — Demo Set',
        'cards' => [
            ['prompt' => 'Which organelle is primarily responsible for producing ATP?', 'options' => ['Ribosome', 'Mitochondrion', 'Golgi apparatus', 'Lysosome'], 'correct' => 1, 'explanation' => 'Mitochondria produce most cellular ATP through cellular respiration.'],
            ['prompt' => 'What is the basic structural and functional unit of life?', 'options' => ['Tissue', 'Organ', 'Cell', 'Molecule'], 'correct' => 2, 'explanation' => 'Cells are the smallest units capable of carrying out life processes.'],
            ['prompt' => 'Which molecule carries genetic instructions in most living organisms?', 'options' => ['DNA', 'ATP', 'Glucose', 'Hemoglobin'], 'correct' => 0, 'explanation' => 'DNA stores the hereditary information used in growth and reproduction.'],
        ],
    ],
    [
        'username' => 'ava.lim', 'email' => 'ava.lim@sample.invalid',
        'first' => 'Ava', 'last' => 'Lim', 'avatar' => 'slate', 'daysAgo' => 8,
        'subject' => 'Mathematics', 'deck' => 'Algebra Foundations — Demo Set',
        'cards' => [
            ['prompt' => 'Solve for x: 3x + 5 = 20.', 'options' => ['3', '5', '8', '15'], 'correct' => 1, 'explanation' => 'Subtract 5 from both sides, then divide 15 by 3.'],
            ['prompt' => 'What is the slope of the line y = 2x − 7?', 'options' => ['−7', '−2', '2', '7'], 'correct' => 2, 'explanation' => 'In slope-intercept form y = mx + b, m is the slope.'],
            ['prompt' => 'Which property is shown by a(b + c) = ab + ac?', 'options' => ['Associative', 'Commutative', 'Distributive', 'Identity'], 'correct' => 2, 'explanation' => 'Multiplication is distributed over addition.'],
        ],
    ],
    [
        'username' => 'liam.cruz', 'email' => 'liam.cruz@sample.invalid',
        'first' => 'Liam', 'last' => 'Cruz', 'avatar' => 'mint', 'daysAgo' => 5,
        'subject' => 'Computer Science', 'deck' => 'Programming Basics — Demo Set',
        'cards' => [
            ['prompt' => 'What does a loop help a program do?', 'options' => ['Repeat instructions', 'Encrypt a file', 'Create a variable', 'Close a connection'], 'correct' => 0, 'explanation' => 'Loops repeat a block of instructions while a condition is met or for a set number of times.'],
            ['prompt' => 'Which data structure follows First In, First Out?', 'options' => ['Stack', 'Queue', 'Tree', 'Graph'], 'correct' => 1, 'explanation' => 'A queue removes items in the order they were added.'],
            ['prompt' => 'What is the purpose of a function?', 'options' => ['Group reusable instructions', 'Store only images', 'Sort every list automatically', 'Replace a database'], 'correct' => 0, 'explanation' => 'Functions package reusable behavior behind a named operation.'],
        ],
    ],
    [
        'username' => 'zara.mendoza', 'email' => 'zara.mendoza@sample.invalid',
        'first' => 'Zara', 'last' => 'Mendoza', 'avatar' => 'rose', 'daysAgo' => 2,
        'subject' => 'Earth Science', 'deck' => 'Weather and Climate — Demo Set',
        'cards' => [
            ['prompt' => 'What instrument measures air pressure?', 'options' => ['Anemometer', 'Barometer', 'Hygrometer', 'Thermometer'], 'correct' => 1, 'explanation' => 'A barometer measures atmospheric pressure.'],
            ['prompt' => 'Which layer of the atmosphere contains most weather?', 'options' => ['Troposphere', 'Stratosphere', 'Mesosphere', 'Thermosphere'], 'correct' => 0, 'explanation' => 'Most clouds and weather systems form in the troposphere.'],
            ['prompt' => 'What primarily drives the water cycle?', 'options' => ['Earth’s magnetic field', 'Solar energy', 'Tides alone', 'Volcanic activity'], 'correct' => 1, 'explanation' => 'Energy from the Sun drives evaporation and helps power the water cycle.'],
        ],
    ],
];

$inserted = 0;
$skipped = 0;
$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$createdAt = static function (int $daysAgo, DateTimeImmutable $now): string {
    return $now->modify("-$daysAgo days")->format('Y-m-d H:i:s.v');
};

try {
    $pdo->beginTransaction();
    $findUser = $pdo->prepare('SELECT id,username,email FROM users WHERE username=? OR email=? LIMIT 1');
    $renameUser = $pdo->prepare('UPDATE users SET username=? WHERE id=? AND email=? AND username=?');
    $insertUser = $pdo->prepare('INSERT INTO users (id,username,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)');
    $insertProfile = $pdo->prepare('INSERT INTO profiles (user_id,display_name,first_name,last_name,avatar) VALUES (?,?,?,?,?)');
    $insertDeck = $pdo->prepare('INSERT INTO decks (id,user_id,title,subject,category,created_at,updated_at) VALUES (?,?,?,?,?,?,?)');
    $insertCard = $pdo->prepare('INSERT INTO cards (id,deck_id,type,prompt,hint,correct_answer,alternates,explanation,position,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $insertOption = $pdo->prepare('INSERT INTO card_options (card_id,position,answer_text,is_correct) VALUES (?,?,?,?)');
    $insertActivity = $pdo->prepare('INSERT INTO study_activity (id,user_id,deck_id,material,mode,screen,status,accuracy,created_at) VALUES (?,?,?,?,?,?,?,?,?)');

    foreach ($demos as $demo) {
        $findUser->execute([$demo['username'], $demo['email']]);
        $existing = $findUser->fetch();
        if ($existing) {
            if ($existing['email'] === $demo['email'] && str_starts_with($existing['username'], 'demo_')) {
                $renameUser->execute([$demo['username'], $existing['id'], $demo['email'], $existing['username']]);
            }
            $skipped++;
            continue;
        }

        $userId = bin2hex(random_bytes(16));
        $deckId = bin2hex(random_bytes(16));
        $accountCreated = $createdAt($demo['daysAgo'], $now);
        $insertUser->execute([
            $userId,
            $demo['username'],
            $demo['email'],
            password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
            'user',
            $accountCreated,
        ]);
        $insertProfile->execute([$userId, $demo['first'] . ' ' . $demo['last'], $demo['first'], $demo['last'], $demo['avatar']]);
        $insertDeck->execute([$deckId, $userId, $demo['deck'], $demo['subject'], 'Demo', $accountCreated, $accountCreated]);

        foreach ($demo['cards'] as $position => $card) {
            $cardId = bin2hex(random_bytes(16));
            $created = $createdAt(max(0, $demo['daysAgo'] - 1), $now);
            $insertCard->execute([$cardId, $deckId, 'MULTIPLE_CHOICE', $card['prompt'], '', $card['options'][$card['correct']], '', $card['explanation'], $position, $created, $created]);
            foreach ($card['options'] as $optionPosition => $option) {
                $insertOption->execute([$cardId, $optionPosition, $option, (int)($optionPosition === $card['correct'])]);
            }
        }

        foreach ([0, min(6, $demo['daysAgo'])] as $activityIndex => $offset) {
            $activityAt = $createdAt($offset, $now);
            $insertActivity->execute([
                bin2hex(random_bytes(16)), $userId, $deckId, $demo['deck'], 'flashcards', 'study', 'completed',
                $activityIndex === 0 ? 80.00 : 67.00, $activityAt,
            ]);
        }
        $inserted++;
    }

    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "Demo seed failed; all changes from this run were rolled back. Check that the database schema is current.\n");
    exit(1);
}

fwrite(STDOUT, "Demo seed complete: {$inserted} fictional user(s) added with a private reviewer, 3 Bombcards, and sample study activity each; {$skipped} already present and skipped.\n");
fwrite(STDOUT, "All seeded accounts have user role, .invalid email addresses, and random undisclosed passwords.\n");
$demoEmails = array_column($demos, 'email');
$summary = $pdo->prepare('SELECT COUNT(DISTINCT u.id) users,COUNT(DISTINCT d.id) decks,COUNT(DISTINCT c.id) cards,COUNT(DISTINCT a.id) activity_rows FROM users u LEFT JOIN decks d ON d.user_id=u.id LEFT JOIN cards c ON c.deck_id=d.id LEFT JOIN study_activity a ON a.user_id=u.id WHERE u.email IN (' . implode(',', array_fill(0, count($demoEmails), '?')) . ')');
$summary->execute($demoEmails);
$counts = $summary->fetch();
fwrite(STDOUT, "Current demo data: {$counts['users']} users, {$counts['decks']} decks, {$counts['cards']} Bombcards, {$counts['activity_rows']} study activity records.\n");
$names = $pdo->prepare('SELECT username FROM users WHERE email IN (' . implode(',', array_fill(0, count($demoEmails), '?')) . ') ORDER BY username');
$names->execute($demoEmails);
fwrite(STDOUT, 'Usernames: ' . implode(', ', $names->fetchAll(PDO::FETCH_COLUMN)) . "\n");
