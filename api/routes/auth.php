<?php
declare(strict_types=1);

// ============================================================================
// 2. Authentication & Session Endpoints
// ============================================================================

// Check active session & return profile
if ($route === 'auth/session' && $method === 'GET') {
    $ok = false;
    $sessionReason = null;
    if (isset($_SESSION['user_id'])) {
        $u = query('SELECT auth_version FROM users WHERE id=?', [$_SESSION['user_id']])->fetch();
        if (!$u || (int)$u['auth_version'] !== (int)($_SESSION['auth_version'] ?? 0)) {
            $sessionReason = 'session_replaced';
        } elseif (!tab_session_matches((string)$_SESSION['user_id'], $u)) {
            $sessionReason = 'another_tab';
        } else {
            $ok = true;
        }
    }
    $sessionProfile = $ok ? profile($_SESSION['user_id']) : null;
    respond([
        'authenticated' => (bool)$ok,
        'timedOut' => $sessionTimedOut,
        'reason' => $sessionReason,
        'csrf' => $_SESSION['csrf'],
        'profile' => $sessionProfile,
        'adminUrl' => $sessionProfile && in_array($sessionProfile['role'] ?? '', ['admin', 'superadmin'], true) ? admin_entry_url() : null,
    ]);
}

// Password reset request (send recovery email)
if ($route === 'auth/password/request' && $method === 'POST') {
    $started = microtime(true);
    $data = input();
    $email = $data['email'] ?? '';
    $email = is_string($email) ? trim($email) : '';
    $validEmail = strlen($email) <= 254 && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    $normalized = $validEmail ? (function_exists('mb_strtolower') ? mb_strtolower($email, 'UTF-8') : strtolower($email)) : '';
    $key = (string)($config['mailer_secret'] ?: 'local-reset-throttle-key-change-this');
    $address = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');

    $allowed = throttle_allows(hash_hmac('sha256', 'reset-ip:' . $address, $key), 30, 900);
    if ($validEmail) {
        $allowed = throttle_allows(hash_hmac('sha256', 'reset-email:' . $normalized, $key), 3, 900) && $allowed;
    }

    if ($allowed && $validEmail && recovery_delivery_configured()) {
        $issued = $passwordRecovery->issue($normalized);
        if ($issued) {
            $base = rtrim($config['app_base_url'], '/');
            $resetUrl = $base . '/login.html?mode=reset#token=' . rawurlencode($issued['token']);
            $target = query('SELECT id FROM users WHERE email=?', [$normalized])->fetchColumn();
            $sent = false;
            try {
                $sent = send_password_recovery_email($issued['email'], $resetUrl);
            } catch (Throwable $ignored) {
            }

            if (!$sent) {
                $passwordRecovery->revoke($issued['token']);
                audit_event(null, 'password_reset_delivery_failed', is_string($target) ? $target : null, ['channel' => 'email']);
                error_log('Password recovery mail delivery failed.');
            } else {
                audit_event(null, 'password_reset_requested', is_string($target) ? $target : null, ['channel' => 'email']);
            }
        }
    }

    $delay = 500000 - (int)((microtime(true) - $started) * 1000000);
    if ($delay > 0) {
        usleep($delay);
    }

    respond(['message' => 'If an account exists for that email and email delivery is configured, password reset instructions will be sent.']);
}

// Check a one-time reset link before rendering the password form; this does not consume it.
if ($route === 'auth/password/validate' && $method === 'POST') {
    $data = input();
    $token = $data['token'] ?? '';
    respond(['valid' => is_string($token) && $passwordRecovery->isUsable($token)]);
}

// Password reset consume token
if ($route === 'auth/password/reset' && $method === 'POST') {
    $data = input();
    $token = field($data, 'token', 64);
    $next = password_value($data, 'newPassword');
    $confirm = password_value($data, 'confirmPassword');

    if (!hash_equals($next, $confirm)) {
        fail(422, 'The new password and confirmation do not match.');
    }

    $target = query('SELECT user_id FROM password_reset_tokens WHERE token_hash=?', [hash('sha256', $token)])->fetchColumn();
    $passwordRecovery->consume($token, password_hash($next, PASSWORD_DEFAULT), $next);
    audit_event(null, 'password_reset_completed', is_string($target) ? $target : null, ['channel' => 'email']);
    respond(['ok' => true, 'message' => 'Password reset. You can now sign in with your new password.']);
}

// User registration & login
if (in_array($route, ['auth/register', 'auth/login'], true) && $method === 'POST') {
    global $users;
    $data = input();
    $login = field($data, 'username', 254);
    $pass = password_value($data, 'password');
    $bucket = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'local') . ':' . $route);
    $now = time();

    query(
        'INSERT INTO auth_attempts (bucket,attempts,window_start) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(window_start<?,1,attempts+1),window_start=IF(window_start<?,VALUES(window_start),window_start)',
        [$bucket, $now, $now - 900, $now - 900]
    );

    if ((int)query('SELECT attempts FROM auth_attempts WHERE bucket=?', [$bucket])->fetchColumn() > 30) {
        fail(429, 'Too many attempts. Try again in 15 minutes.');
    }

    if ($route === 'auth/register') {
        $username = $login;
        if (!preg_match('/^[A-Za-z0-9_]{3,24}$/D', $username)) {
            fail(422, 'Username must contain 3–24 letters, numbers, or underscores.');
        }
        $looksLikeKeyboardSmash = static function (string $value): bool {
            $compact = strtolower((string)preg_replace('/[^A-Za-z0-9]/', '', $value));
            return preg_match('/(.)\\1{3,}/', $compact) === 1
                || preg_match('/^(.{1,3})\\1{2,}$/', $compact) === 1
                || preg_match('/qwerty|asdf|zxcv|poiuy|lkjh|mnbv|qazwsx|1234|4321|123456|654321|abcd|dcba/i', $compact) === 1;
        };
        $looksLikeUsernameSmash = static function (string $value): bool {
            $compact = strtolower((string)preg_replace('/[^A-Za-z0-9]/', '', $value));
            return preg_match('/^(.)\\1{3,}$/', $compact) === 1
                || preg_match('/^(qwerty|asdf|zxcv|poiuy|lkjh|mnbv|qazwsx|abcdef|fedcba)[0-9]*$/', $compact) === 1;
        };
        if ($looksLikeUsernameSmash($username)) {
            fail(422, 'Choose a username that does not use repeated characters or keyboard sequences.');
        }
        $firstName = field($data, 'firstName', 80);
        $middleName = field($data, 'middleName', 80, false);
        $lastName = field($data, 'lastName', 80);
        $validName = static function (string $name) use ($looksLikeKeyboardSmash): bool {
            return preg_match('/^[\p{L}][\p{L}\p{M} .\'\x{2019}-]*$/uD', $name) === 1
                && !$looksLikeKeyboardSmash($name);
        };
        foreach ([$firstName, $lastName] as $namePart) {
            if (!$validName($namePart)) {
                fail(422, 'Enter a valid name using letters, spaces, apostrophes, periods, or hyphens.');
            }
        }
        if ($middleName !== '' && !$validName($middleName)) {
            fail(422, 'Enter a valid middle name or leave it blank.');
        }
        $compactPassword = strtolower((string)preg_replace('/[^A-Za-z0-9]/', '', $pass));
        $commonPasswords = ['12345678', '123456789', '1234567890', 'password', 'password1', 'password123', 'qwerty123', 'qwerty12345', '11111111', '00000000', '87654321', 'admin123', 'abc12345', 'iloveyou', 'letmein', 'welcome1', 'monkey123', 'dragon123', 'football1', 'baseball1'];
        $passwordScore = (strlen($pass) >= 8 ? 1 : 0)
            + (strlen($pass) >= 12 ? 1 : 0)
            + (strlen($pass) >= 16 ? 1 : 0)
            + (preg_match('/[a-z]/', $pass) ? 1 : 0)
            + (preg_match('/[A-Z]/', $pass) ? 1 : 0)
            + (preg_match('/[0-9]/', $pass) ? 1 : 0)
            + (preg_match('/[^A-Za-z0-9]/', $pass) ? 1 : 0);
        if (in_array($compactPassword, $commonPasswords, true) || $looksLikeKeyboardSmash($pass) || $passwordScore < 3) {
            fail(422, 'Choose a less predictable password. Use at least 8 characters and avoid common words, repeated characters, or keyboard sequences.');
        }
        $email = field($data, 'email', 254);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail(422, 'Enter a valid email address.');
        }
        $normalizedEmail = function_exists('mb_strtolower') ? mb_strtolower($email, 'UTF-8') : strtolower($email);
        try {
            $users->register(uid(), $username, $normalizedEmail, password_hash($pass, PASSWORD_DEFAULT), $firstName, $middleName !== '' ? $middleName : null, $lastName);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                fail(409, 'That username or email is already registered.');
            }
            throw $e;
        }
        respond(['message' => 'Account created. Please sign in.'], 201);
    }

    $row = $users->byUsername($login);
    $normalizedLogin = function_exists('mb_strtolower') ? mb_strtolower(trim($login), 'UTF-8') : strtolower(trim($login));
    $accountBucket = $row ? hash('sha256', 'account-login:user:' . $row['id']) : hash('sha256', 'account-login:identifier:' . $normalizedLogin);

    if ($row && !empty($row['banned_at'])) {
        audit_event(null, 'login_blocked', $row['id'], ['reason' => 'account_banned']);
        fail(401, 'This account is unavailable. Contact support if you think this is a mistake.', ['code' => 'account_unavailable']);
    }

    if ($row && $row['locked_until'] && strtotime($row['locked_until'] . ' UTC') > time()) {
        audit_event(null, 'login_blocked', $row['id'], ['reason' => 'account_locked']);
        fail(401, 'This account is temporarily locked. Please try again later.', ['code' => 'account_locked']);
    }

    $hash = $row['password_hash'] ?? '$2y$10$92IXUNpkjJ0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
    if (!$row || !password_verify($pass, $hash)) {
        $withinLimit = throttle_allows($accountBucket, 8, 900);
        $attempts = (int)query('SELECT attempts FROM auth_attempts WHERE bucket=?', [$accountBucket])->fetchColumn();
        if ($row && !$withinLimit) {
            query(
                'UPDATE users SET locked_until=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 MINUTE) WHERE id=? AND (locked_until IS NULL OR locked_until<=UTC_TIMESTAMP(3))',
                [$row['id']]
            );
            audit_event(null, 'account_locked', $row['id'], ['reason' => 'failed_login_threshold']);
        }
        audit_event(null, 'login_failure', $row['id'] ?? null, ['reason' => 'invalid_credentials']);
        if ($row) {
            fail(401, 'You entered the wrong password. Check it and try again, or reset your password.', ['code' => 'wrong_password']);
        }
        fail(401, 'We couldn’t sign you in. Check your username and password.', ['code' => 'invalid_credentials']);
    }

    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
        query('UPDATE users SET password_hash=? WHERE id=?', [password_hash($pass, PASSWORD_DEFAULT), $row['id']]);
    }

    $tabHash = request_tab_hash();
    $browserHash = request_browser_hash();
    if (!$tabHash || !$browserHash) {
        fail(400, 'Refresh the page and try signing in again.');
    }

    // Increment the account-wide auth version so every older device/session is revoked.
    query('UPDATE users SET auth_version=auth_version+1 WHERE id=?', [$row['id']]);
    $newAuthVersion = (int)query('SELECT auth_version FROM users WHERE id=?', [$row['id']])->fetchColumn();

    query(
        'INSERT INTO user_active_tabs(user_id,browser_hash,active_tab_hash) VALUES(?,?,?) ON DUPLICATE KEY UPDATE active_tab_hash=VALUES(active_tab_hash),updated_at=UTC_TIMESTAMP(3)',
        [$row['id'], $browserHash, $tabHash]
    );
    query('DELETE FROM auth_attempts WHERE bucket IN (?,?)', [$bucket, $accountBucket]);
    audit_event($row['id'], 'login_success', $row['id'], ['remembered' => ($data['remember'] ?? false) === true]);

    $tabSessions = $_SESSION['tab_sessions'] ?? [];
    $_SESSION = ['tab_sessions' => $tabSessions];
    session_regenerate_id(true);
    $remember = ($data['remember'] ?? false) === true;
    $until = time() + ($remember ? 2592000 : 43200);
    $_SESSION['user_id'] = $row['id'];
    $_SESSION['auth_version'] = $newAuthVersion;
    $_SESSION['expires_at'] = $until;
    $_SESSION['last_activity'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    unset($_SESSION['idle_logout']);
    setcookie(session_name(), session_id(), [
        'expires' => $remember ? $until : 0,
        'path' => '/',
        'secure' => (bool)$config['secure_cookie'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    respond(['profile' => profile($row['id']), 'csrf' => $_SESSION['csrf']]);
}
