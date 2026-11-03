<?php
declare(strict_types=1);

// ============================================================================
// 6. Maintenance & Workspace Routing
// ============================================================================
// Maintenance blocks regular accounts only. Keep the allow-list explicit so
// administrators can reach the workspace and turn maintenance back off.
if ($route !== 'auth/logout' && maintenance_enabled() && !in_array($currentRole, ['admin', 'superadmin'], true)) {
    fail(503, 'The workspace is temporarily in maintenance mode. Please try again later.');
}

// Logout
if ($route === 'auth/logout' && $method === 'POST') {
    audit_event($user, 'logout', $user);
    $tabHash = request_tab_hash();
    $browserHash = request_browser_hash();
    if ($tabHash && $browserHash) {
        query('DELETE FROM user_active_tabs WHERE user_id=? AND browser_hash=? AND active_tab_hash=?', [$user, $browserHash, $tabHash]);
    }
    $GLOBALS['csmForgetTabSession'] = true;
    foreach (['user_id','auth_version','expires_at','last_activity','idle_logout'] as $field) unset($_SESSION[$field]);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    respond(['ok' => true]);
}

// Staff accounts cannot access personal library or game arena
if (in_array($currentRole, ['admin', 'superadmin'], true) && (in_array($route, ['decks', 'decks/share', 'cards', 'documents', 'highlights', 'study/progress', 'activity', 'account/export'], true) || str_starts_with($route, 'arena/'))) {
    fail(403, 'Personal library and Arena features are not available to staff accounts.');
}

// Full user workspace
if ($route === 'workspace' && $method === 'GET') {
    respond(workspace($user));
}

// Profile management
if ($route === 'profile' && $method === 'PATCH') {
    $data = input();
    $p = query('SELECT * FROM profiles WHERE user_id=? FOR UPDATE', [$user])->fetch();

    if (isset($data['displayName'])) {
        $name = field($data, 'displayName', 40);
        if ($name !== $p['display_name']) {
            if ($p['name_changed_at'] && strtotime($p['name_changed_at']) > time() - 604800) {
                fail(409, 'Display names can only change once every 7 days.');
            }
            query('UPDATE profiles SET display_name=?,name_changed_at=CURRENT_TIMESTAMP(3) WHERE user_id=?', [$name, $user]);
        }
    }

    if (isset($data['avatar'])) {
        $avatar = field($data, 'avatar', 16);
        if (!in_array($avatar, ['ember', 'ocean', 'mint', 'violet', 'sunset', 'slate'], true)) {
            fail(422, 'Invalid avatar.');
        }
        query('UPDATE profiles SET avatar=? WHERE user_id=?', [$avatar, $user]);
    }

    if (array_key_exists('deckVisibility', $data)) {
        $visibility = $data['deckVisibility'];
        if (!is_string($visibility) || !in_array($visibility, ['private', 'public'], true)) fail(422, 'Choose public or private deck visibility.');
        query('UPDATE profiles SET deck_visibility=? WHERE user_id=?', [$visibility, $user]);
    }

    respond(profile($user));
}

// Password change
if ($route === 'auth/password' && $method === 'POST') {
    $data = input();
    $old = password_value($data, 'currentPassword');
    $next = password_value($data, 'newPassword');
    $row = query('SELECT password_hash,auth_version FROM users WHERE id=? FOR UPDATE', [$user])->fetch();

    if (!password_verify($old, $row['password_hash'])) {
        fail(422, 'Current password is incorrect.');
    }

    $users->setPassword($user, password_hash($next, PASSWORD_DEFAULT));
    audit_event($user, 'password_changed', $user);
    $_SESSION['auth_version'] = (int)$row['auth_version'] + 1;
    session_regenerate_id(true);
    respond(['ok' => true]);
}
