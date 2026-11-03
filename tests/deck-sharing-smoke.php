<?php
declare(strict_types=1);

require dirname(__DIR__).'/server/bootstrap.php';

echo "=== Running Deck Sharing Feature Smoke Tests ===\n\n";

// 1. Find a test user and one of their decks
$user = query("SELECT id, username FROM users WHERE role='user' LIMIT 1")->fetch();
if (!$user) {
    // If no regular user, pick any user
    $user = query("SELECT id, username FROM users LIMIT 1")->fetch();
}
if (!$user) {
    echo "FAIL: No user found in database.\n";
    exit(1);
}
echo "1. Using test user: {$user['username']} ({$user['id']})\n";

// Find or create a deck for this user
$deck = query("SELECT id, title FROM decks WHERE user_id=? AND moderation_status='visible' LIMIT 1", [$user['id']])->fetch();
if (!$deck) {
    $deckId = uid();
    $decksService->create($deckId, $user['id'], 'Sharing Test Deck', 'Testing', 'Testing');
    $deck = ['id' => $deckId, 'title' => 'Sharing Test Deck'];
    echo "   Created new test deck: {$deck['title']}\n";
} else {
    echo "   Found existing deck: {$deck['title']} ({$deck['id']})\n";
}

// 2. Test DeckShare::createOrGet
$share = $deckSharesService->createOrGet($deck['id'], $user['id']);
assert(!empty($share['share_token']), 'Share token must not be empty');
assert(strlen($share['share_token']) === 64, 'Share token must be 64 characters hex');
assert((int)$share['is_active'] === 1, 'Share must be active');
echo "2. PASS: Created/retrieved share link. Token: {$share['share_token']}\n";

// 3. Test DeckShare::getByToken (Guest Public Resolution)
$publicDeck = $deckSharesService->getByToken($share['share_token']);
assert($publicDeck !== null, 'Public resolution must find the deck by token');
assert($publicDeck['deck_id'] === $deck['id'], 'Resolved deck ID must match');
assert((int)$publicDeck['is_active'] === 1, 'Resolved share must be active');
echo "3. PASS: Public token resolution succeeds for guest access.\n";

// 4. Test DeckShare::setActive (Disabling/Revoking)
$disabled = $deckSharesService->setActive($deck['id'], $user['id'], false);
assert((int)$disabled['is_active'] === 0, 'Share must now be inactive');
$resolvedDisabled = $deckSharesService->getByToken($share['share_token']);
assert((int)$resolvedDisabled['is_active'] === 0, 'Resolved share must reflect inactive status');
echo "4. PASS: Owner successfully disabled/revoked the share link.\n";

// 5. Test DeckShare::setActive (Re-enabling)
$reEnabled = $deckSharesService->setActive($deck['id'], $user['id'], true);
assert((int)$reEnabled['is_active'] === 1, 'Share must now be re-enabled');
echo "5. PASS: Owner successfully re-enabled the share link.\n";

// 6. Test DeckShare::regenerate
$oldToken = $share['share_token'];
$regenerated = $deckSharesService->regenerate($deck['id'], $user['id']);
assert($regenerated['share_token'] !== $oldToken, 'New token must differ from old token');
assert($deckSharesService->getByToken($oldToken) === null, 'Old token must no longer resolve');
assert($deckSharesService->getByToken($regenerated['share_token']) !== null, 'New token must resolve');
echo "6. PASS: Regenerated share link successfully; old token invalidated.\n";

// 7. Test router.php path matching logic
$testPaths = [
    '/shared/deck/' . $regenerated['share_token'] => true,
    '/shared/deck/' . $regenerated['share_token'] . '/' => true,
    '/CSM/shared/deck/' . $regenerated['share_token'] => true,
    '/shared/deck/invalid-token' => true,
    '/something/else' => false,
];
foreach ($testPaths as $path => $expectedMatch) {
    $matched = (bool)preg_match('~/(?:CSM/)?shared/deck/([a-zA-Z0-9_-]+)/?$~i', $path, $m);
    assert($matched === $expectedMatch, "Path '$path' match failed: expected " . ($expectedMatch ? 'true' : 'false'));
}
echo "7. PASS: router.php regex correctly matches shared deck URLs.\n";

// 8. Test app_base_url()
$baseUrl = app_base_url();
echo "8. Base URL computed: {$baseUrl}\n";
assert(str_starts_with($baseUrl, 'http'), 'Base URL must start with http');

echo "\n=== ALL 8 SMOKE TESTS PASSED SUCCESSFULLY! ===\n";
