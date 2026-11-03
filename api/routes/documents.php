<?php
declare(strict_types=1);

// ============================================================================
// 9. Document & PDF Storage
// ============================================================================
if ($route === 'documents' && $method === 'POST') {
    $deck = owned_deck(id_field($_POST, 'deckId'), $user);
    $file = $_FILES['file'] ?? null;

    if (!$file || !is_array($file) || is_array($file['error'] ?? null)) {
        fail(422, 'Choose a PDF.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        fail(413, 'Upload failed; check the PDF size and PHP limits.');
    }
    if (!isset($file['tmp_name'], $file['name'], $file['size']) || !is_string($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        fail(422, 'The uploaded file could not be verified.');
    }
    if ($file['size'] < 5 || $file['size'] > $config['max_upload_bytes']) {
        fail(413, 'PDFs must be no larger than 10 MB.');
    }

    $name = basename(str_replace('\\', '/', $file['name']));
    if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'pdf' || text_length($name) > 255) {
        fail(422, 'Only PDF files are allowed.');
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $h = fopen($file['tmp_name'], 'rb');
    $magic = fread($h, 5);
    fclose($h);

    if ($mime !== 'application/pdf' || $magic !== '%PDF-') {
        fail(422, 'Invalid PDF content.');
    }

    $dir = $config['upload_dir'];
    if (!is_dir($dir) && !mkdir($dir, 0700, true)) {
        fail(500, 'Private file storage is unavailable.');
    }

    $real = realpath($dir);
    if ($real === false) {
        fail(500, 'Private file storage could not be resolved.');
    }
    $root = realpath(dirname(__DIR__));
    if (str_starts_with(strtolower(str_replace('\\', '/', $real) . '/'), strtolower(str_replace('\\', '/', $root) . '/'))) {
        fail(503, 'PDF storage must be outside the public project directory.');
    }

    $id = uid();
    $stored = uid() . '.pdf';
    $path = $real . DIRECTORY_SEPARATOR . $stored;

    $db->beginTransaction();
    query('SELECT setting_key FROM system_settings WHERE setting_key=? FOR UPDATE', ['storage_limit_bytes'])->fetchColumn();
    $storageLimit = (int)system_setting('storage_limit_bytes', '10737418240');
    $storageUsed = (int)query('SELECT COALESCE(SUM(size_bytes),0) FROM documents')->fetchColumn();

    if ($storageUsed + (int)$file['size'] > $storageLimit) {
        fail(413, 'The system PDF storage limit has been reached.');
    }

    if (!move_uploaded_file($file['tmp_name'], $path)) {
        fail(500, 'Could not store the PDF.');
    }

    try {
        $materialsService->add($id, $deck['id'], $user, $name, $stored, $mime, (int)$file['size']);
        activity($user, $deck['id'], $name, 'PDF', 'library', 'Uploaded');
        $db->commit();
    } catch (Throwable $e) {
        if (is_file($path)) {
            unlink($path);
        }
        throw $e;
    }

    respond(['id' => $id, 'title' => $name, 'size' => (int)$file['size'], 'url' => 'api/index.php?r=documents/file&id=' . $id], 201);
}

if ($route === 'documents' && $method === 'DELETE') {
    $doc = $materialsService->remove(id_field(input()), $user);
    if (!$doc) {
        fail(404, 'Material not found.');
    }
    $path = $config['upload_dir'] . '/' . $doc['stored_name'];
    if (is_file($path)) {
        unlink($path);
    }
    respond(['ok' => true]);
}

if ($route === 'documents/file' && $method === 'GET') {
    $doc = owned_document(id_field($_GET), $user);
    $path = $config['upload_dir'] . '/' . $doc['stored_name'];
    if (!is_file($path)) {
        fail(404, 'PDF missing from file storage.');
    }
    session_write_close();
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($path));
    $disp = ($_GET['download'] ?? '') === '1' ? 'attachment' : 'inline';
    header("Content-Disposition: $disp; filename=\"document.pdf\"; filename*=UTF-8''" . rawurlencode($doc['title']));
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: frame-ancestors 'self'; base-uri 'none'");
    readfile($path);
    exit;
}
