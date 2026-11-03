<?php
if (PHP_SAPI !== 'cli') {
    header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('Cross-Origin-Resource-Policy: same-origin');
    header("Content-Security-Policy: object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
    if ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') === '443') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}
$path=rawurldecode(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
if (preg_match('~(?:^|/)(?:\.|server|classes|database|tests|docs|test-results|storage)(?:[^/]*)(?:/|$)~i',$path)
    || preg_match('~\.(?:sql|log|md|py)$~i',$path) || str_contains($path,'..')) { http_response_code(404); exit; }
if (preg_match('~/(?:CSM/)?shared/deck/([a-zA-Z0-9_-]+)/?$~i',$path,$m)) {
    $_GET['share_token']=$m[1];
    require __DIR__.'/shared.html';
    return true;
}
if (preg_match('~/admin/$~i', $path)) {
    header('Location: ' . rtrim($path, '/'));
    http_response_code(302);
    exit;
}
if (preg_match('~/admin$~i', $path)) { readfile(__DIR__.'/index.html'); return true; }
if ($path==='/') { readfile(__DIR__.'/landing.html'); return true; }
return false;
