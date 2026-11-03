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
        $maxMb=number_format((int)$config['max_upload_bytes']/1048576,1);
        fail(413, "PDFs must be no larger than $maxMb MB on this deployment.");
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

    $id = uid();
    $stored = uid() . '.pdf';
    $contents = file_get_contents($file['tmp_name']);
    if (!is_string($contents) || strlen($contents) !== (int)$file['size']) {
        fail(500, 'Could not read the uploaded PDF.');
    }

    $db->beginTransaction();
    query('SELECT setting_key FROM system_settings WHERE setting_key=? FOR UPDATE', ['storage_limit_bytes'])->fetchColumn();
    $storageLimit = (int)system_setting('storage_limit_bytes', '10737418240');
    $storageUsed = (int)query('SELECT COALESCE(SUM(size_bytes),0) FROM documents')->fetchColumn();

    if ($storageUsed + (int)$file['size'] > $storageLimit) {
        fail(413, 'The system PDF storage limit has been reached.');
    }

    $materialsService->add($id, $deck['id'], $user, $name, $stored, $mime, (int)$file['size'], $contents);
    activity($user, $deck['id'], $name, 'PDF', 'library', 'Uploaded');
    $db->commit();

    respond(['id' => $id, 'title' => $name, 'size' => (int)$file['size'], 'url' => 'api/index.php?r=documents/file&id=' . $id], 201);
}

if ($route === 'documents' && $method === 'DELETE') {
    $documentId=id_field(input());
    $legacyLocal=(bool)query('SELECT file_data IS NULL FROM documents WHERE id=?',[$documentId])->fetchColumn();
    $doc = $materialsService->remove($documentId, $user);
    if (!$doc) {
        fail(404, 'Material not found.');
    }
    if($legacyLocal){$path=rtrim((string)$config['upload_dir'],'/\\').DIRECTORY_SEPARATOR.basename((string)$doc['stored_name']);if(is_file($path))unlink($path);}
    respond(['ok' => true]);
}

if ($route === 'documents/file' && $method === 'GET') {
    $doc = owned_document(id_field($_GET), $user);
    session_write_close();
    $disp = ($_GET['download'] ?? '') === '1' ? 'attachment' : 'inline';
    send_private_pdf($doc,$disp);
}
