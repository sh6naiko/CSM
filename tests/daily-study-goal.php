<?php
declare(strict_types=1);
// Real MySQL checks; every fixture is rolled back, including users and their content.
require dirname(__DIR__).'/classes/Database.php';
require dirname(__DIR__).'/classes/StudyProgress.php';
$database = new Database(require dirname(__DIR__).'/server/config.local.php');
$pdo = $database->getConnection();
$progress = new StudyProgress($database);
function check_goal(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
$id = fn() => bin2hex(random_bytes(16));
$user = $id(); $other = $id(); $deck = $id(); $secondDeck = $id(); $foreignDeck = $id();
$now = new DateTimeImmutable('2026-10-27T12:00:00Z');
$pdo->beginTransaction();
try {
    foreach ([$user,$other] as $account) $database->query('INSERT INTO users (id,username,password_hash) VALUES (?,?,?)', [$account,'goal'.substr($account,0,16),'unused-test-password']);
    foreach ([[$deck,$user],[$secondDeck,$user],[$foreignDeck,$other]] as [$deckId,$owner]) $database->query("INSERT INTO decks (id,user_id,title) VALUES (?,?,'Daily goal test')", [$deckId,$owner]);
    $card = function(string $deckId) use ($database,$id): string {
        $cardId = $id();
        $database->query("INSERT INTO cards (id,deck_id,type,prompt,correct_answer,alternates,explanation) VALUES (?,?,'IDENTIFICATION','Question','Answer','','')", [$cardId,$deckId]);
        return $cardId;
    };
    $first = $card($deck); $second = $card($secondDeck); $third = $card($deck); $timeout = $card($deck);
    $foreign = $card($foreignDeck);
    $log = fn(string $owner, string $cardId, string $at) => $database->query('INSERT INTO bombcard_reviews (user_id,bombcard_id,reviewed_at) VALUES (?,?,?)',[$owner,$cardId,$at]);
    $goal = fn(string $zone='Asia/Manila', ?DateTimeImmutable $at=null) => $progress->dailyGoal($user,$zone,$at ?? $now);
    for ($i=0; $i<30; $i++) $database->query("INSERT INTO study_activity (id,user_id,deck_id,material,mode,screen,status,created_at) VALUES (?,?,?,'Question','Bombcards','library','Edited','2026-10-27 04:00:00')",[$id(),$user,$deck]);
    check_goal($goal()['reviewed'] === 0, 'General activity must not count as reviewed cards.');
    $progress->recordReview($user,$first);
    $progress->recordReview($user,$first);
    $database->query("UPDATE bombcard_reviews SET reviewed_at='2026-10-27 04:00:00' WHERE user_id=?",[$user]);
    $progress->recordReview($user,$foreign);
    check_goal($goal()['reviewed'] === 1 && $goal()['percent'] === 5, 'Study repeats or foreign cards inflated the daily count.');
    $log($user,$second,'2026-10-27 04:00:00');
    $log($other,$foreign,'2026-10-27 04:00:00');
    check_goal($goal()['reviewed'] === 2, 'Different decks should count; another user must not.');

    $session = $id();
    $database->query("INSERT INTO arena_sessions (id,user_id,deck_id,deck_title,difficulty,starting_seconds,remaining_ms,clock_at_ms,status) VALUES (?,?,?,'Daily goal test','easy',60,60000,1,'completed')",[$session,$user,$deck]);
    foreach ([[$first,'correct'],[$third,'wrong'],[$timeout,'timeout']] as $position => [$cardId,$result]) {
        $database->query("INSERT INTO arena_questions (session_id,position,card_id,snapshot) VALUES (?,?,?,'{}')",[$session,$position,$cardId]);
        $database->query("INSERT INTO arena_answers (id,session_id,position,result,adjustment_seconds,remaining_ms,submitted_at) VALUES (?,?,?,?,0,60000,'2026-10-27 04:00:00')",[$id(),$session,$position,$result]);
    }
    check_goal($goal()['reviewed'] === 3, 'Arena answers must count once across modes, excluding timeouts.');
    $progress->record($user,$first,'known');
    $progress->resetDeck($user,$deck);
    check_goal($goal()['reviewed'] === 3, 'Resetting mastery must not erase completed daily reviews.');

    $boundary = $card($deck);
    $log($user,$boundary,'2026-10-26 16:00:00'); // Midnight in Manila, but yesterday in UTC.
    check_goal($goal()['reviewed'] === 4 && $goal('UTC')['reviewed'] === 3, 'Local midnight must use a timezone-aware half-open range.');
    $log($user,$card($deck),'2026-10-26 15:59:59.999');
    $log($user,$card($deck),'2026-10-27 16:00:00');
    check_goal($goal()['reviewed'] === 4, 'Reviews immediately outside the local day must not count.');
    check_goal($goal('Asia/Manila',new DateTimeImmutable('2026-10-27T16:00:00Z'))['reviewed'] === 1, 'A new local day must start a new count.');
    $dst = $goal('America/New_York',new DateTimeImmutable('2026-03-08T12:00:00Z'));
    check_goal($dst['resetsAt'] === '2026-03-09T04:00:00+00:00', 'Daylight-saving midnight is incorrect.');
    for ($i=0; $i<26; $i++) $log($user,$card($deck),'2026-10-27 04:00:00');
    check_goal($goal()['reviewed'] === 30 && $goal()['target'] === 20 && $goal()['percent'] === 100, 'Progress must cap at 100% while keeping the full count.');
    try { $goal('Not/A_Timezone'); throw new RuntimeException('Invalid timezone was accepted.'); }
    catch (InvalidArgumentException $expected) {}
    echo "PASS daily goals: real Study/Arena reviews, repeat de-duplication, user isolation, reset preservation, local midnight/DST and percentage cap.\n";
} finally {
    if ($pdo->inTransaction()) $pdo->rollBack();
}
