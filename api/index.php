<?php

declare(strict_types=1);

require dirname(__DIR__) . '/server/bootstrap.php';
require dirname(__DIR__) . '/server/arena.php';
require dirname(__DIR__) . '/server/learning_workspace.php';

// ============================================================================
// 1. Request Context & Security Headers
// ============================================================================
$route = $_GET['r'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

header('Referrer-Policy: same-origin');
header('X-Frame-Options: SAMEORIGIN');

if (!is_string($route)) {
    fail(400, 'Invalid endpoint.');
}

if (!in_array($method, ['GET', 'POST', 'PATCH', 'DELETE'], true)) {
    fail(405, 'Method not allowed.');
}

if (str_starts_with($route, 'admin/')) {
    enforce_admin_access();
}

if ($method !== 'GET' && !same_origin_request()) {
    fail(403, 'Cross-origin state-changing requests are not allowed.');
}

$publicSessionRoutes = [
    'auth/session',
    'auth/login',
    'auth/register',
    'auth/password/request',
    'auth/password/validate',
    'auth/password/reset',
    'shared/deck',
    'shared/document',
    'people/document',
];

if (isset($_SESSION['user_id']) && !in_array($route, $publicSessionRoutes, true)) {
    $sessionUserId = (string)$_SESSION['user_id'];
    $currentAuthVersion = query('SELECT auth_version FROM users WHERE id=?', [$sessionUserId])->fetchColumn();
    if ($currentAuthVersion === false || (int)$currentAuthVersion !== (int)($_SESSION['auth_version'] ?? 0)) {
        fail(401, 'Your account was signed in on another device or tab. Please sign in again.', ['code' => 'session_replaced']);
    }
    if (!tab_session_matches($sessionUserId, ['auth_version' => (int)$currentAuthVersion])) {
        fail(401, 'Your account was signed in from another tab. Please sign in again.', ['code' => 'another_tab']);
    }
}

if ($method !== 'GET') {
    csrf();
}
// Route modules are required in their original order because handlers respond and exit.
require __DIR__ . '/routes/auth.php';
require __DIR__ . '/routes/public.php';
require __DIR__ . '/routes/people-notifications.php';
require __DIR__ . '/routes/admin.php';
require __DIR__ . '/routes/workspace.php';
require __DIR__ . '/routes/decks.php';
require __DIR__ . '/routes/ai.php';
require __DIR__ . '/routes/documents.php';
require __DIR__ . '/routes/highlights.php';
require __DIR__ . '/routes/study.php';
require __DIR__ . '/routes/learning-arena.php';

fail(404, 'Endpoint not found.');
