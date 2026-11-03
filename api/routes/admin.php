<?php
declare(strict_types=1);

// ============================================================================
// 5. Staff & Administration Routes (`admin/*`)
// ============================================================================
if (str_starts_with($route, 'admin/')) {
    $role = $currentRole;
    if (!in_array($role, ['admin', 'superadmin'], true)) {
        fail(403, 'Administrator access is required.');
    }
    $isSuper = $role === 'superadmin';
    $admin = new Admin($database);
    $sendCsv = static function (string $filename, array $columns, callable $writeRows): void {
        $csvCell = static function ($value): string {
            if ($value === null) return '';
            $cell = is_string($value) ? $value : (string)$value;
            return preg_match('/^[\\s]*[=+\\-@]/u', $cell) ? "'" . $cell : $cell;
        };
        session_write_close();
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: private, no-store');
        header('X-Content-Type-Options: nosniff');
        $output = fopen('php://output', 'wb');
        if ($output === false) fail(500, 'Could not create the CSV export.');
        fwrite($output, "\xEF\xBB\xBF"); // UTF-8 BOM helps Excel identify the encoding.
        fputcsv($output, array_map($csvCell, $columns), ',', '"', '\\');
        $writeRow = static function (array $values) use ($output, $csvCell): void {
            fputcsv($output, array_map($csvCell, $values), ',', '"', '\\');
        };
        $writeRows($writeRow);
        fclose($output);
        exit;
    };

    if ($route === 'admin/dashboard' && $method === 'GET') {
        $from = $_GET['from'] ?? gmdate('Y-m-01');
        $to = $_GET['to'] ?? gmdate('Y-m-d');
        if (!is_string($from) || !is_string($to)) {
            fail(422, 'Invalid date range.');
        }
        respond($admin->dashboard($from, $to));
    }

    if ($route === 'admin/dashboard/export' && $method === 'GET') {
        $from = $_GET['from'] ?? gmdate('Y-m-01');
        $to = $_GET['to'] ?? gmdate('Y-m-d');
        if (!is_string($from) || !is_string($to)) {
            fail(422, 'Invalid date range.');
        }
        $summary = $admin->dashboard($from, $to);
        audit_event($user, 'admin_activity_summary_exported', null, ['from' => $summary['from'], 'to' => $summary['to'], 'format' => 'csv'], 'system');
        $filename = 'co-studymaxx-activity-summary-' . $summary['from'] . '-to-' . $summary['to'] . '.csv';
        $sendCsv($filename, ['record_type','period_start','period_end','date','active_users','new_users','new_decks','documents_uploaded','arena_sessions','sessions_completed'], static function (callable $writeRow) use ($summary): void {
            $period = $summary['period'];
            $writeRow(['summary',$summary['from'],$summary['to'],'',$period['activeUsers'],$period['newUsers'],$period['newDecks'],$period['uploads'],$period['sessions'],$period['completedSessions']]);
            if ($summary['days']) {
                foreach ($summary['days'] as $day) {
                    $writeRow(['daily','','',$day['date'],$day['activeUsers'],'',$day['decks'],$day['uploads'],$day['arenaSessions'],'']);
                }
            } else {
                $writeRow(['daily','','',$summary['from'] === $summary['to'] ? $summary['from'] : 'Selected period',0,'',0,0,0,'']);
            }
        });
    }

    if ($route === 'admin/users/export' && $method === 'GET') {
        audit_event($user, 'admin_users_exported', null, ['format' => 'csv'], 'system');
        $columns = ['user_id','username','email','display_name','role','account_status','locked_until_utc','active_now','deck_count','pdf_count','created_at_utc','last_active_utc'];
        $notArchivedSql = '(GREATEST(u.created_at,COALESCE((SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id),u.created_at),COALESCE((SELECT MAX(e.created_at) FROM security_events e WHERE e.actor_user_id=u.id OR e.target_user_id=u.id),u.created_at),COALESCE((SELECT MAX(t.updated_at) FROM user_active_tabs t WHERE t.user_id=u.id),u.created_at))>=UTC_TIMESTAMP(3)-INTERVAL 7 DAY OR EXISTS(SELECT 1 FROM user_active_tabs live WHERE live.user_id=u.id AND live.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE))';
        $sendCsv('co-studymaxx-users.csv', $columns, static function (callable $writeRow) use ($notArchivedSql): void {
            $statement = query('SELECT u.id,u.username,u.email,COALESCE(p.display_name,u.username) display_name,u.role,CASE WHEN u.locked_until>UTC_TIMESTAMP(3) THEN \'locked\' ELSE \'active\' END account_status,u.locked_until,EXISTS(SELECT 1 FROM user_active_tabs t WHERE t.user_id=u.id AND t.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE) is_active_now,(SELECT COUNT(*) FROM decks d WHERE d.user_id=u.id AND d.deleted_at IS NULL) deck_count,(SELECT COUNT(*) FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.user_id=u.id AND d.deleted_at IS NULL) pdf_count,u.created_at,(SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id) last_active FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE ' . $notArchivedSql . ' ORDER BY is_active_now DESC,LOWER(u.username) ASC,u.id ASC');
            while ($row = $statement->fetch()) {
                $writeRow([$row['id'],$row['username'],$row['email'],$row['display_name'],$row['role'],$row['account_status'],$row['locked_until'],$row['is_active_now'] ? 'Yes' : 'No',$row['deck_count'],$row['pdf_count'],$row['created_at'],$row['last_active']]);
            }
        });
    }

    if ($route === 'admin/users' && $method === 'GET') {
        $search = $_GET['q'] ?? '';
        if (!is_string($search) || text_length($search) > 80) {
            fail(422, 'Search text is too long.');
        }
        $roleFilter = $_GET['role'] ?? 'all';
        if (!is_string($roleFilter) || !in_array($roleFilter, ['all', 'user', 'admin', 'superadmin'], true)) {
            fail(422, 'Invalid user role filter.');
        }
        $like = '%' . trim($search) . '%';
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
        $offset = max(0, min(100000, (int)($_GET['offset'] ?? 0)));
        $notArchivedSql = '(GREATEST(u.created_at,COALESCE((SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id),u.created_at),COALESCE((SELECT MAX(e.created_at) FROM security_events e WHERE e.actor_user_id=u.id OR e.target_user_id=u.id),u.created_at),COALESCE((SELECT MAX(t.updated_at) FROM user_active_tabs t WHERE t.user_id=u.id),u.created_at))>=UTC_TIMESTAMP(3)-INTERVAL 7 DAY OR EXISTS(SELECT 1 FROM user_active_tabs live WHERE live.user_id=u.id AND live.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE))';
        $userWhere = $notArchivedSql . ' AND (u.username LIKE ? OR u.email LIKE ?)' . ($roleFilter === 'all' ? '' : ' AND u.role=?');
        $userParams = [$like, $like];
        if ($roleFilter !== 'all') {
            $userParams[] = $roleFilter;
        }
        $total = (int)query('SELECT COUNT(*) FROM users u WHERE ' . $userWhere, $userParams)->fetchColumn();
        $rows = query(
            'SELECT u.id,u.username,u.email,u.role,u.locked_until,u.banned_at,u.ban_reason,u.created_at,EXISTS(SELECT 1 FROM user_active_tabs t WHERE t.user_id=u.id AND t.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE) is_active_now,COALESCE(p.display_name,u.username) display_name,COALESCE(p.avatar,\'ember\') avatar,(SELECT COUNT(*) FROM decks d WHERE d.user_id=u.id AND d.deleted_at IS NULL) deck_count,(SELECT COUNT(*) FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.user_id=u.id AND d.deleted_at IS NULL) document_count,(SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id) last_active FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE ' . $userWhere . ' ORDER BY is_active_now DESC,LOWER(u.username) ASC,u.id ASC LIMIT ' . $limit . ' OFFSET ' . $offset,
            $userParams
        )->fetchAll();
        $rows = array_map(static function (array $row): array {
            $row['is_active_now'] = (bool)$row['is_active_now'];
            return $row;
        }, $rows);
        respond(['users' => $rows, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
    }

    if ($route === 'admin/users/profile' && $method === 'GET') {
        $target = id_field($_GET, 'id');
        $account = query('SELECT u.id,u.username,u.email,u.role,u.created_at,u.locked_until,u.banned_at,u.ban_reason,COALESCE(p.display_name,u.username) display_name,COALESCE(p.first_name,\'\') first_name,p.middle_name,COALESCE(p.last_name,\'\') last_name,COALESCE(p.avatar,\'ember\') avatar,(SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id) last_active,(SELECT COUNT(*) FROM decks d WHERE d.user_id=u.id AND d.deleted_at IS NULL) deck_count,(SELECT COUNT(*) FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.user_id=u.id AND d.deleted_at IS NULL) document_count FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?', [$target])->fetch();
        if (!$account) fail(404, 'Account not found.');
        $activity = query('SELECT material,mode,screen,status,accuracy,created_at FROM study_activity WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 25', [$target])->fetchAll();
        $submittedReports = query('SELECT r.id,r.reason,r.status,r.moderation_action,r.moderation_reason,r.created_at,r.reviewed_at,d.title deck_title,owner.username deck_owner FROM deck_reports r JOIN decks d ON d.id=r.deck_id JOIN users owner ON owner.id=d.user_id WHERE r.flagged_by_user_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 50', [$target])->fetchAll();
        $receivedReports = query('SELECT r.id,r.reason,r.status,r.moderation_action,r.moderation_reason,r.created_at,r.reviewed_at,d.title deck_title,flagger.username flagged_by FROM deck_reports r JOIN decks d ON d.id=r.deck_id LEFT JOIN users flagger ON flagger.id=r.flagged_by_user_id WHERE d.user_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 50', [$target])->fetchAll();
        respond(['account'=>$account,'activity'=>$activity,'submittedReports'=>$submittedReports,'receivedReports'=>$receivedReports]);
    }

    if ($route === 'admin/decks' && $method === 'GET') {
        $search = $_GET['q'] ?? '';
        if (!is_string($search) || text_length($search) > 100) {
            fail(422, 'Search text is too long.');
        }
        $like = '%' . trim($search) . '%';
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
        $offset = max(0, (int)($_GET['offset'] ?? 0));
        $total = (int)query(
            'SELECT COUNT(*) FROM decks d JOIN users u ON u.id=d.user_id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' AND (d.title LIKE ? OR d.subject LIKE ? OR u.username LIKE ?)',
            [$like, $like, $like]
        )->fetchColumn();
        $rows = query(
            'SELECT d.id,d.title,d.subject,d.category,d.moderation_status,d.created_at,d.updated_at,u.username owner,(SELECT COUNT(*) FROM cards c WHERE c.deck_id=d.id) card_count,(SELECT COUNT(*) FROM documents m WHERE m.deck_id=d.id) document_count,(SELECT COUNT(*) FROM deck_reports r WHERE r.deck_id=d.id AND r.status=\'open\') open_reports FROM decks d JOIN users u ON u.id=d.user_id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' AND (d.title LIKE ? OR d.subject LIKE ? OR u.username LIKE ?) ORDER BY d.updated_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset,
            [$like, $like, $like]
        )->fetchAll();
        respond(['decks' => $rows, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
    }

    if ($route === 'admin/content/export' && $method === 'GET') {
        audit_event($user, 'admin_content_exported', null, ['format' => 'csv'], 'system');
        $columns = ['record_type','deck_id','deck_title','owner_username','subject','category','moderation_status','deck_created_at','deck_updated_at','card_id','card_type','prompt','options_json','correct_answer','accepted_alternates','hint','explanation','card_created_at','document_id','document_title','document_mime_type','document_size_bytes','document_uploaded_at'];
        $sendCsv('co-studymaxx-content.csv', $columns, static function (callable $writeRow): void {
            $decks = query('SELECT d.id,d.title,d.subject,d.category,d.moderation_status,d.created_at,d.updated_at,u.username owner FROM decks d JOIN users u ON u.id=d.user_id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' ORDER BY d.title,d.id');
            while ($deck = $decks->fetch()) {
                $writeRow(['deck',$deck['id'],$deck['title'],$deck['owner'],$deck['subject'],$deck['category'],$deck['moderation_status'],$deck['created_at'],$deck['updated_at']]);
            }

            $cards = query('SELECT c.id card_id,c.deck_id,c.type,c.prompt,c.hint,c.correct_answer,c.alternates,c.explanation,c.created_at card_created_at,d.title deck_title,d.subject,d.category,d.moderation_status,d.created_at deck_created_at,d.updated_at deck_updated_at,u.username owner,o.answer_text option_text,o.is_correct option_correct FROM cards c JOIN decks d ON d.id=c.deck_id JOIN users u ON u.id=d.user_id LEFT JOIN card_options o ON o.card_id=c.id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' ORDER BY d.title,c.position,c.id,o.position');
            $currentCard = null;
            $options = [];
            $writeCard = static function (?array $card, array $cardOptions) use ($writeRow): void {
                if (!$card) return;
                $writeRow(['card',$card['deck_id'],$card['deck_title'],$card['owner'],$card['subject'],$card['category'],$card['moderation_status'],$card['deck_created_at'],$card['deck_updated_at'],$card['card_id'],$card['type'],$card['prompt'],json_encode($cardOptions, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),$card['correct_answer'],$card['alternates'],$card['hint'],$card['explanation'],$card['card_created_at']]);
            };
            while ($row = $cards->fetch()) {
                if ($currentCard !== null && $currentCard['card_id'] !== $row['card_id']) {
                    $writeCard($currentCard, $options);
                    $options = [];
                }
                $currentCard = $row;
                if ($row['option_text'] !== null) $options[] = ['text' => $row['option_text'], 'is_correct' => (bool)$row['option_correct']];
            }
            $writeCard($currentCard, $options);

            $documents = query('SELECT m.id document_id,m.deck_id,m.title document_title,m.mime_type,m.size_bytes,m.created_at uploaded_at,d.title deck_title,d.subject,d.category,d.moderation_status,d.created_at deck_created_at,d.updated_at deck_updated_at,u.username owner FROM documents m JOIN decks d ON d.id=m.deck_id JOIN users u ON u.id=d.user_id WHERE d.deleted_at IS NULL AND d.moderation_status=\'visible\' ORDER BY d.title,m.created_at,m.id');
            while ($document = $documents->fetch()) {
                $writeRow(['document',$document['deck_id'],$document['deck_title'],$document['owner'],$document['subject'],$document['category'],$document['moderation_status'],$document['deck_created_at'],$document['deck_updated_at'],null,null,null,null,null,null,null,null,null,$document['document_id'],$document['document_title'],$document['mime_type'],$document['size_bytes'],$document['uploaded_at']]);
            }
        });
    }

    if ($route === 'admin/decks/view' && $method === 'GET') {
        $deckId = id_field($_GET);
        $deck = query('SELECT d.id,d.title,d.subject,d.category,d.moderation_status,d.updated_at,u.id owner_id,u.username owner FROM decks d JOIN users u ON u.id=d.user_id WHERE d.id=? AND d.deleted_at IS NULL', [$deckId])->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }
        $documents = query('SELECT id,title,mime_type mimeType,size_bytes size,created_at uploadedAt FROM documents WHERE deck_id=? ORDER BY created_at DESC,id', [$deckId])->fetchAll();
        foreach ($documents as &$document) {
            $document['size'] = (int)$document['size'];
            $document['url'] = 'api/index.php?r=admin/documents/file&id=' . rawurlencode((string)$document['id']) . '&tabId=' . rawurlencode((string)request_tab_id()) . '&browserId=' . rawurlencode((string)request_browser_id());
        }
        unset($document);
        $deck['document_count'] = count($documents);
        audit_event($user, 'admin_deck_viewed', $deckId, ['documentCount' => count($documents)], 'deck');
        respond(['deck' => $deck, 'documents' => $documents]);
    }

    if ($route === 'admin/documents/file' && $method === 'GET') {
        $documentId = id_field($_GET);
        $document = query('SELECT m.id,m.deck_id,m.title,m.stored_name FROM documents m JOIN decks d ON d.id=m.deck_id WHERE m.id=? AND d.deleted_at IS NULL', [$documentId])->fetch();
        if (!$document) {
            fail(404, 'PDF not found.');
        }
        $path = $config['upload_dir'] . '/' . $document['stored_name'];
        if (!is_file($path)) {
            fail(404, 'PDF missing from file storage.');
        }
        audit_event($user, 'admin_document_viewed', (string)$document['deck_id'], ['documentId' => (string)$document['id']], 'deck');
        session_write_close();
        header('Content-Type: application/pdf');
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: inline; filename="document.pdf"; filename*=UTF-8\'\'' . rawurlencode((string)$document['title']));
        header('Cache-Control: private, no-store');
        header('X-Content-Type-Options: nosniff');
        header("Content-Security-Policy: frame-ancestors 'self'; base-uri 'none'");
        readfile($path);
        exit;
    }

    if ($route === 'admin/decks/flag' && $method === 'POST') {
        $data = input();
        $deckId = id_field($data, 'deckId');
        $reason = field($data, 'reason', 1000);
        $deck = query('SELECT id,user_id,title FROM decks WHERE id=? AND deleted_at IS NULL', [$deckId])->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }
        $db->beginTransaction();
        query('INSERT INTO deck_reports(deck_id,flagged_by_user_id,reason) VALUES(?,?,?)', [$deckId, $user, $reason]);
        $reportId = (int)$db->lastInsertId();
        $noticeMessage = 'Your deck “' . $deck['title'] . '” was flagged for staff review. Staff note: ' . $reason;
        notify_user((string)$deck['user_id'], 'deck_flagged', 'Your deck was flagged for review', $noticeMessage, $deckId);
        audit_event($user, 'deck_flagged', $deckId, ['reportId' => $reportId], 'deck');
        $db->commit();
        respond(['ok' => true, 'reportId' => $reportId], 201);
    }

    if ($route === 'admin/decks/visibility' && $method === 'PATCH') {
        $data = input();
        $deckId = id_field($data, 'deckId');
        $action = field($data, 'action', 16);
        $reason = field($data, 'reason', 1000);
        if (!in_array($action, ['hide', 'restore'], true)) {
            fail(422, 'Invalid moderation action.');
        }
        $status = $action === 'hide' ? 'hidden' : 'visible';
        $db->beginTransaction();
        $deck = query('SELECT id,user_id,title,moderation_status FROM decks WHERE id=? AND deleted_at IS NULL FOR UPDATE', [$deckId])->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }
        query('UPDATE decks SET moderation_status=? WHERE id=?', [$status, $deckId]);
        if ($action === 'hide') {
            arena_stop_hidden_deck($deckId);
        }
        query(
            'INSERT INTO deck_reports(deck_id,flagged_by_user_id,reason,status,moderation_action,moderation_reason,reviewed_by_user_id,reviewed_at) VALUES(?,?,?,\'actioned\',?,?,?,UTC_TIMESTAMP(3))',
            [$deckId, $user, 'Administrative visibility change', $action, $reason, $user]
        );
        $noticeTitle = $action === 'hide' ? 'Deck hidden after staff review' : 'Deck restored after staff review';
        $noticeMessage = 'Your deck “' . $deck['title'] . '” was ' . ($action === 'hide' ? 'hidden' : 'restored') . '. Staff note: ' . $reason;
        notify_user((string)$deck['user_id'], 'deck_' . $action, $noticeTitle, $noticeMessage, $deckId);
        audit_event($user, 'deck_' . $action, $deckId, ['reason' => $reason], 'deck');
        $db->commit();
        respond(['ok' => true, 'moderationStatus' => $status]);
    }

    if ($route === 'admin/reports' && $method === 'GET') {
        $status = $_GET['status'] ?? 'open';
        if (!in_array($status, ['open', 'dismissed', 'actioned', 'all'], true)) {
            fail(422, 'Invalid report status.');
        }
        $where = $status === 'all' ? '' : 'WHERE r.status=?';
        $params = $status === 'all' ? [] : [$status];
        $rows = query(
            'SELECT r.id,r.deck_id deckId,r.reason,r.status,r.moderation_action moderationAction,r.moderation_reason moderationReason,r.created_at,r.reviewed_at,d.title deckTitle,d.subject,d.moderation_status moderationStatus,u.username owner,flagger.username flaggedBy FROM deck_reports r JOIN decks d ON d.id=r.deck_id JOIN users u ON u.id=d.user_id LEFT JOIN users flagger ON flagger.id=r.flagged_by_user_id WHERE d.deleted_at IS NULL' . ($where !== '' ? ' AND ' . substr($where, 6) : '') . ' ORDER BY (r.status=\'open\') DESC,r.created_at DESC LIMIT 100',
            $params
        )->fetchAll();
        respond(['reports' => $rows]);
    }

    if ($route === 'admin/reports' && $method === 'PATCH') {
        $data = input();
        $reportId = $data['id'] ?? null;
        if (!is_int($reportId) || $reportId < 1) {
            fail(422, 'Invalid report id.');
        }
        $action = field($data, 'action', 16);
        $reason = field($data, 'reason', 1000);
        if (!in_array($action, ['dismiss', 'hide'], true)) {
            fail(422, 'Invalid report action.');
        }
        $db->beginTransaction();
        $report = query('SELECT id,deck_id,status FROM deck_reports WHERE id=? FOR UPDATE', [$reportId])->fetch();
        if (!$report) {
            fail(404, 'Report not found.');
        }
        if ($report['status'] !== 'open') {
            fail(409, 'This report has already been reviewed.');
        }
        $deck = query('SELECT id,user_id,title FROM decks WHERE id=? AND deleted_at IS NULL FOR UPDATE', [$report['deck_id']])->fetch();
        if (!$deck) {
            fail(404, 'Reviewer not found.');
        }
        if ($action === 'hide') {
            query("UPDATE decks SET moderation_status='hidden' WHERE id=?", [$report['deck_id']]);
            arena_stop_hidden_deck($report['deck_id']);
        }
        $nextStatus = $action === 'hide' ? 'actioned' : 'dismissed';
        query(
            'UPDATE deck_reports SET status=?,moderation_action=?,moderation_reason=?,reviewed_by_user_id=?,reviewed_at=UTC_TIMESTAMP(3) WHERE id=?',
            [$nextStatus, $action === 'hide' ? 'hide' : null, $reason, $user, $reportId]
        );
        $noticeTitle = $action === 'hide' ? 'Deck hidden after staff review' : 'Deck review completed';
        $noticeMessage = $action === 'hide'
            ? 'Your deck “' . $deck['title'] . '” was hidden after a report review. Staff note: ' . $reason
            : 'A report about your deck “' . $deck['title'] . '” was reviewed and dismissed. Staff note: ' . $reason;
        notify_user((string)$deck['user_id'], 'deck_report_' . $action, $noticeTitle, $noticeMessage, (string)$deck['id']);
        audit_event($user, 'deck_report_' . $action, $report['deck_id'], ['reportId' => $reportId, 'reason' => $reason], 'deck');
        $db->commit();
        respond(['ok' => true]);
    }

    if ($route === 'admin/users/warn' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $reason = field($data, 'reason', 500);
        if ($target === $user) fail(409, 'You cannot warn your own account.');
        $account = query('SELECT id,username,role FROM users WHERE id=?', [$target])->fetch();
        if (!$account) fail(404, 'Account not found.');
        if ($account['role'] !== 'user') fail(403, 'Only regular user accounts can be warned here.');
        notify_user($target, 'account_warning', 'Account warning', 'A workspace administrator issued a warning: ' . $reason);
        audit_event($user, 'account_warned', $target, ['reason'=>$reason]);
        respond(['ok'=>true]);
    }

    if ($route === 'admin/users/ban' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $reason = field($data, 'reason', 500);
        if ($target === $user) fail(409, 'You cannot ban your own account.');
        $account = query('SELECT id,username,role,banned_at FROM users WHERE id=?', [$target])->fetch();
        if (!$account) fail(404, 'Account not found.');
        if ($account['role'] !== 'user') fail(403, 'Only regular user accounts can be banned here.');
        if ($account['banned_at']) fail(409, 'This account is already banned.');
        $db->beginTransaction();
        query('SELECT id FROM users WHERE id=? FOR UPDATE', [$target]);
        query('UPDATE users SET banned_at=UTC_TIMESTAMP(3),banned_by_user_id=?,ban_reason=?,locked_until=NULL,auth_version=auth_version+1 WHERE id=?', [$user,$reason,$target]);
        query('DELETE FROM user_active_tabs WHERE user_id=?', [$target]);
        audit_event($user, 'account_banned', $target, ['reason'=>$reason]);
        $db->commit();
        respond(['ok'=>true]);
    }

    if ($route === 'admin/users/unban' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $reason = field($data, 'reason', 500);
        $account = query('SELECT id,username,role,banned_at FROM users WHERE id=?', [$target])->fetch();
        if (!$account) fail(404, 'Account not found.');
        if ($account['role'] !== 'user') fail(403, 'Only regular user accounts can be unbanned here.');
        if (!$account['banned_at']) fail(409, 'This account is not banned.');
        query('UPDATE users SET banned_at=NULL,banned_by_user_id=NULL,ban_reason=NULL,auth_version=auth_version+1 WHERE id=?', [$target]);
        audit_event($user, 'account_unbanned', $target, ['reason'=>$reason]);
        respond(['ok'=>true]);
    }

    if ($route === 'admin/users/unlock' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $reason = field($data, 'reason', 500);
        $account = query('SELECT id,locked_until FROM users WHERE id=?', [$target])->fetch();
        if (!$account) {
            fail(404, 'Account not found.');
        }
        $db->beginTransaction();
        query('SELECT id FROM users WHERE id=? FOR UPDATE', [$target]);
        query('UPDATE users SET locked_until=NULL WHERE id=?', [$target]);
        query('DELETE FROM auth_attempts WHERE bucket=?', [hash('sha256', 'account-login:user:' . $target)]);
        audit_event($user, 'account_unlocked', $target, ['reason' => $reason]);
        $db->commit();
        respond(['ok' => true]);
    }

    if ($route === 'admin/users/reset' && $method === 'POST') {
        $data = input();
        $target = id_field($data, 'userId');
        $account = query('SELECT id,email FROM users WHERE id=?', [$target])->fetch();
        if (!$account) {
            fail(404, 'Account not found.');
        }
        if (!$account['email']) {
            fail(409, 'This account has no email address for secure password recovery.');
        }
        $resetBucket = hash('sha256', 'admin-reset:' . $user . ':' . $target);
        if (!throttle_allows($resetBucket, 3, 3600)) {
            fail(429, 'Password reset email requests for this account are temporarily limited.');
        }
        $issued = $passwordRecovery->issue((string)$account['email']);
        if (!$issued) {
            fail(409, 'Password recovery is unavailable for this account.');
        }
        $resetUrl = rtrim((string)$config['app_base_url'], '/') . '/login.html?mode=reset#token=' . rawurlencode($issued['token']);
        $sent = false;
        try {
            $sent = send_password_recovery_email($issued['email'], $resetUrl);
        } catch (Throwable $ignored) {
        }
        if (!$sent) {
            $passwordRecovery->revoke($issued['token']);
            audit_event($user, 'admin_password_reset_delivery_failed', $target, ['reason' => 'mailer_unavailable']);
            fail(502, 'The secure reset email could not be delivered. Check the configured mail service and try again.');
        }
        audit_event($user, 'admin_password_reset_requested', $target, ['channel' => 'registered_email']);
        respond(['ok' => true, 'message' => 'A secure password-reset link was sent to the account email address.']);
    }

    if ($route === 'admin/users/role' && $method === 'POST') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can change account roles.');
        }
        $data = input();
        $target = id_field($data, 'userId');
        $nextRole = field($data, 'role', 16);
        if (!in_array($nextRole, ['user', 'admin', 'superadmin'], true)) {
            fail(422, 'Invalid role.');
        }
        $isPromotingToSuperadmin = $nextRole === 'superadmin' && (string)$target !== (string)$user;
        $confirmationPassword = $data['password'] ?? null;
        if ($isPromotingToSuperadmin && (!is_string($confirmationPassword) || $confirmationPassword === '' || strlen($confirmationPassword) > 72)) {
            fail(422, 'Enter your password to confirm promoting this account to superadmin.');
        }
        if ((string)$target === (string)$user && $nextRole !== 'superadmin') {
            fail(409, 'Use another superadmin to change your own role.');
        }
        $db->beginTransaction();
        $accounts = query('SELECT id,role,password_hash FROM users WHERE id IN (?,?) ORDER BY id FOR UPDATE', [$user, $target])->fetchAll();
        $targetRow = null;
        $actorRow = null;
        foreach ($accounts as $account) {
            if ($account['id'] === $target) {
                $targetRow = $account;
            }
            if ($account['id'] === $user) {
                $actorRow = $account;
            }
        }
        if (!$actorRow || $actorRow['role'] !== 'superadmin') {
            fail(403, 'Only a current superadmin can change account roles.');
        }
        if (!$targetRow) {
            fail(404, 'Account not found.');
        }
        if ($isPromotingToSuperadmin && !password_verify($confirmationPassword, (string)$actorRow['password_hash'])) {
            fail(403, 'Password confirmation failed. No role changes were made.');
        }
        $superCount = (int)query("SELECT COUNT(*) FROM users WHERE role='superadmin'")->fetchColumn();
        if ($targetRow['role'] === 'superadmin' && $nextRole !== 'superadmin' && $superCount <= 1) {
            fail(409, 'The system must retain at least one superadmin.');
        }
        query('UPDATE users SET role=? WHERE id=?', [$nextRole, $target]);
        audit_event($user, 'user_role_changed', $target, ['from' => $targetRow['role'], 'to' => $nextRole]);
        $db->commit();
        respond(['ok' => true, 'role' => $nextRole]);
    }

    if ($route === 'admin/settings' && $method === 'GET') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can view system settings.');
        }
        $storage = (int)query('SELECT COALESCE(SUM(size_bytes),0) FROM documents')->fetchColumn();
        respond([
            'maintenanceMode' => maintenance_enabled(),
            'storageLimitBytes' => (int)system_setting('storage_limit_bytes', '10737418240'),
            'storageUsedBytes' => $storage,
        ]);
    }

    if ($route === 'admin/settings' && $method === 'PATCH') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can change system settings.');
        }
        $data = input();
        $updates = [];
        $db->beginTransaction();

        if (array_key_exists('maintenanceMode', $data)) {
            if (!is_bool($data['maintenanceMode'])) {
                fail(422, 'Maintenance mode must be true or false.');
            }
            $updates['maintenance_mode'] = $data['maintenanceMode'] ? '1' : '0';
        }

        if (array_key_exists('storageLimitBytes', $data)) {
            $limit = $data['storageLimitBytes'];
            if (!is_int($limit) || $limit < 1048576 || $limit > 1099511627776) {
                fail(422, 'Storage limit must be between 1 MiB and 1 TiB.');
            }
            query('SELECT setting_key FROM system_settings WHERE setting_key=? FOR UPDATE', ['storage_limit_bytes'])->fetchColumn();
            $used = (int)query('SELECT COALESCE(SUM(size_bytes),0) FROM documents')->fetchColumn();
            if ($limit < $used) {
                fail(409, 'Storage limit cannot be lower than current stored PDF usage.');
            }
            $updates['storage_limit_bytes'] = (string)$limit;
        }

        if (!$updates) {
            fail(422, 'No valid system settings were supplied.');
        }

        foreach ($updates as $key => $value) {
            query(
                'INSERT INTO system_settings(setting_key,value_text,updated_by_user_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),updated_by_user_id=VALUES(updated_by_user_id)',
                [$key, $value, $user]
            );
        }

        audit_event($user, 'system_settings_updated', null, ['settings' => array_keys($updates)]);
        $db->commit();
        respond([
            'ok' => true,
            'maintenanceMode' => maintenance_enabled(),
            'storageLimitBytes' => (int)system_setting('storage_limit_bytes', '10737418240'),
        ]);
    }

    if ($route === 'admin/sessions/clear' && $method === 'POST') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can clear all sessions.');
        }
        $data = input();
        if (($data['confirm'] ?? false) !== true) {
            fail(422, 'Confirm that all users should be signed out.');
        }
        $actor = $user;
        $_SESSION = [];
        session_write_close();
        $db->beginTransaction();
        $accounts = query('UPDATE users SET auth_version=auth_version+1');
        $sessions = query('DELETE FROM web_sessions');
        query('DELETE FROM user_active_tabs');
        audit_event($actor, 'all_sessions_cleared', null, [
            'accountsInvalidated' => $accounts->rowCount(),
            'sessionsRemoved' => $sessions->rowCount(),
        ]);
        $db->commit();
        setcookie(session_name(), '', [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => (bool)$config['secure_cookie'],
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        respond([
            'ok' => true,
            'sessionsRemoved' => $sessions->rowCount(),
            'accountsInvalidated' => $accounts->rowCount(),
        ]);
    }

    if ($route === 'admin/archive/inactive-users/export' && $method === 'GET') {
        audit_event($user, 'admin_inactive_users_exported', null, ['format' => 'csv'], 'system');
        $activitySql = '(SELECT u.id,GREATEST(u.created_at,COALESCE((SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id),u.created_at),COALESCE((SELECT MAX(e.created_at) FROM security_events e WHERE e.actor_user_id=u.id OR e.target_user_id=u.id),u.created_at),COALESCE((SELECT MAX(t.updated_at) FROM user_active_tabs t WHERE t.user_id=u.id),u.created_at)) last_seen_at FROM users u) activity';
        $filter = 'activity.last_seen_at<UTC_TIMESTAMP(3)-INTERVAL 7 DAY AND NOT EXISTS(SELECT 1 FROM user_active_tabs live WHERE live.user_id=u.id AND live.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE)';
        $sendCsv('co-studymaxx-inactive-users.csv', ['user_id','username','email','role','last_active_utc','inactive_days','joined_at_utc'], static function (callable $writeRow) use ($activitySql, $filter): void {
            $statement = query('SELECT u.id,u.username,u.email,u.role,u.created_at,activity.last_seen_at,TIMESTAMPDIFF(DAY,activity.last_seen_at,UTC_TIMESTAMP(3)) inactive_days FROM users u JOIN ' . $activitySql . ' ON activity.id=u.id WHERE ' . $filter . ' ORDER BY activity.last_seen_at ASC,u.id ASC');
            while ($row = $statement->fetch()) {
                $writeRow([$row['id'],$row['username'],$row['email'],$row['role'],$row['last_seen_at'],$row['inactive_days'],$row['created_at']]);
            }
        });
    }

    if ($route === 'admin/archive/security-events/export' && $method === 'GET') {
        if (!$isSuper) fail(403, 'Only a superadmin can export archived security events.');
        audit_event($user, 'admin_archived_security_log_exported', null, ['format' => 'csv'], 'system');
        $allCount = (int)query('SELECT COUNT(*) FROM security_events')->fetchColumn();
        $cutoff = $allCount > 100 ? query('SELECT id FROM security_events ORDER BY id DESC LIMIT 1 OFFSET 99')->fetchColumn() : false;
        $archivedSql = 'SELECT e.id,e.event_code event,e.created_at,e.ip_hash,e.target_type,a.username actor,COALESCE(t.username,IF(e.target_type=\'deck\',CONCAT(\'Deck \' ,e.target_id),NULL)) target,e.details_json FROM security_events e LEFT JOIN users a ON a.id=e.actor_user_id LEFT JOIN users t ON t.id=e.target_user_id' . ($cutoff === false ? ' WHERE 1=0' : ' WHERE e.id<?') . ' ORDER BY e.id DESC';
        $archivedParams = $cutoff === false ? [] : [(int)$cutoff];
        $sendCsv('co-studymaxx-archived-security-events.csv', ['event_id','occurred_at_utc','event','actor_username','target','target_type','ip_fingerprint','details_json'], static function (callable $writeRow) use ($archivedSql, $archivedParams): void {
            $statement = query($archivedSql, $archivedParams);
            while ($row = $statement->fetch()) {
                $writeRow([$row['id'],$row['created_at'],$row['event'],$row['actor'],$row['target'],$row['target_type'],$row['ip_hash'] ? substr($row['ip_hash'], 0, 16) : '',$row['details_json'] ?: '{}']);
            }
        });
    }

    if ($route === 'admin/archive/notices' && $method === 'GET') {
        $db->beginTransaction();
        query('INSERT IGNORE INTO admin_archive_notice_state(user_id) VALUES(?)', [$user]);
        $state = query('SELECT last_inactive_checked_at,last_security_cutoff_id,pending_inactive_users,pending_security_events FROM admin_archive_notice_state WHERE user_id=? FOR UPDATE', [$user])->fetch();
        if (!$state) {
            $db->rollBack();
            fail(500, 'Could not load archive notifications.');
        }

        $scanTime = (string)query('SELECT UTC_TIMESTAMP(3)')->fetchColumn();
        $activitySql = '(SELECT u.id,GREATEST(u.created_at,COALESCE((SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id),u.created_at),COALESCE((SELECT MAX(e.created_at) FROM security_events e WHERE e.actor_user_id=u.id OR e.target_user_id=u.id),u.created_at),COALESCE((SELECT MAX(t.updated_at) FROM user_active_tabs t WHERE t.user_id=u.id),u.created_at)) last_seen_at FROM users u) activity';
        $inactiveFilter = 'activity.last_seen_at<DATE_SUB(?,INTERVAL 7 DAY) AND NOT EXISTS(SELECT 1 FROM user_active_tabs live WHERE live.user_id=u.id AND live.updated_at>=DATE_SUB(?,INTERVAL 5 MINUTE))';
        $newInactive = (int)query(
            'SELECT COUNT(*) FROM users u JOIN ' . $activitySql . ' ON activity.id=u.id WHERE ' . $inactiveFilter . ' AND DATE_ADD(activity.last_seen_at,INTERVAL 7 DAY)>? AND DATE_ADD(activity.last_seen_at,INTERVAL 7 DAY)<=?',
            [$scanTime, $scanTime, $state['last_inactive_checked_at'], $scanTime]
        )->fetchColumn();

        $securityCutoff = query('SELECT id FROM security_events ORDER BY id DESC LIMIT 1 OFFSET 99')->fetchColumn();
        $securityCutoff = $securityCutoff === false ? 0 : (int)$securityCutoff;
        $previousSecurityCutoff = (int)$state['last_security_cutoff_id'];
        $newSecurity = 0;
        if ($securityCutoff > $previousSecurityCutoff) {
            $newSecurity = $previousSecurityCutoff === 0
                ? (int)query('SELECT COUNT(*) FROM security_events WHERE id<?', [$securityCutoff])->fetchColumn()
                : (int)query('SELECT COUNT(*) FROM security_events WHERE id>=? AND id<?', [$previousSecurityCutoff, $securityCutoff])->fetchColumn();
        }

        query(
            'UPDATE admin_archive_notice_state SET last_inactive_checked_at=?,last_security_cutoff_id=?,pending_inactive_users=pending_inactive_users+?,pending_security_events=pending_security_events+? WHERE user_id=?',
            [$scanTime, max($previousSecurityCutoff, $securityCutoff), $newInactive, $newSecurity, $user]
        );
        $pending = query('SELECT pending_inactive_users,pending_security_events FROM admin_archive_notice_state WHERE user_id=?', [$user])->fetch();
        $db->commit();
        respond([
            'inactiveUsers' => (int)$pending['pending_inactive_users'],
            'archivedSecurityEvents' => $isSuper ? (int)$pending['pending_security_events'] : 0,
        ]);
    }

    if ($route === 'admin/archive/notices' && $method === 'PATCH') {
        query('UPDATE admin_archive_notice_state SET pending_inactive_users=0,pending_security_events=0 WHERE user_id=?', [$user]);
        respond(['ok' => true]);
    }

    if ($route === 'admin/archive/inactive-users' && $method === 'GET') {
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));
        $offset = max(0, min(100000, (int)($_GET['offset'] ?? 0)));
        $activitySql = '(SELECT u.id,GREATEST(u.created_at,COALESCE((SELECT MAX(a.created_at) FROM study_activity a WHERE a.user_id=u.id),u.created_at),COALESCE((SELECT MAX(e.created_at) FROM security_events e WHERE e.actor_user_id=u.id OR e.target_user_id=u.id),u.created_at),COALESCE((SELECT MAX(t.updated_at) FROM user_active_tabs t WHERE t.user_id=u.id),u.created_at)) last_seen_at FROM users u) activity';
        $filter = 'activity.last_seen_at<UTC_TIMESTAMP(3)-INTERVAL 7 DAY AND NOT EXISTS(SELECT 1 FROM user_active_tabs live WHERE live.user_id=u.id AND live.updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE)';
        $total = (int)query('SELECT COUNT(*) FROM users u JOIN ' . $activitySql . ' ON activity.id=u.id WHERE ' . $filter)->fetchColumn();
        $rows = query('SELECT u.id,u.username,u.email,u.role,u.created_at,COALESCE(p.display_name,u.username) display_name,COALESCE(p.avatar,\'ember\') avatar,activity.last_seen_at,TIMESTAMPDIFF(DAY,activity.last_seen_at,UTC_TIMESTAMP(3)) inactive_days FROM users u JOIN ' . $activitySql . ' ON activity.id=u.id LEFT JOIN profiles p ON p.user_id=u.id WHERE ' . $filter . ' ORDER BY activity.last_seen_at ASC,u.id ASC LIMIT ' . $limit . ' OFFSET ' . $offset)->fetchAll();
        respond(['users'=>$rows,'total'=>$total,'limit'=>$limit,'offset'=>$offset,'inactiveAfterDays'=>7]);
    }

    if ($route === 'admin/archive/hidden-decks' && $method === 'GET') {
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));
        $offset = max(0, min(1000000, (int)($_GET['offset'] ?? 0)));
        $total = (int)query("SELECT COUNT(*) FROM decks WHERE moderation_status='hidden' AND deleted_at IS NULL")->fetchColumn();
        $rows = query("SELECT d.id,d.title,d.subject,d.category,d.updated_at,d.created_at,u.username owner,(SELECT COUNT(*) FROM cards c WHERE c.deck_id=d.id) card_count,(SELECT COUNT(*) FROM documents m WHERE m.deck_id=d.id) document_count,(SELECT MAX(r.reviewed_at) FROM deck_reports r WHERE r.deck_id=d.id AND r.moderation_action='hide') hidden_at FROM decks d JOIN users u ON u.id=d.user_id WHERE d.moderation_status='hidden' AND d.deleted_at IS NULL ORDER BY hidden_at DESC,d.updated_at DESC LIMIT " . $limit . ' OFFSET ' . $offset)->fetchAll();
        respond(['decks'=>$rows,'total'=>$total,'limit'=>$limit,'offset'=>$offset]);
    }

    if ($route === 'admin/archive/hidden-decks/delete' && $method === 'DELETE') {
        $data = input();
        $ids = $data['ids'] ?? null;
        if (!is_array($ids) || count($ids) < 1 || count($ids) > 100) {
            fail(422, 'Select between 1 and 100 hidden decks to delete.');
        }
        $ids = array_values(array_unique(array_map(static function ($id): string {
            if (!is_string($id) || !preg_match('/^[a-f0-9]{32}$/D', $id)) fail(422, 'Invalid deck selection.');
            return $id;
        }, $ids)));
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $db->beginTransaction();
        $decksToDelete = query("SELECT d.id,d.title FROM decks d WHERE d.id IN ($placeholders) AND d.moderation_status='hidden' AND d.deleted_at IS NULL FOR UPDATE", $ids)->fetchAll();
        if (count($decksToDelete) !== count($ids)) {
            $db->rollBack();
            fail(404, 'One or more selected decks are no longer hidden. Refresh the archive and try again.');
        }
        $documents = query("SELECT deck_id,stored_name FROM documents WHERE deck_id IN ($placeholders)", $ids)->fetchAll();
        foreach ($decksToDelete as $deck) {
            audit_event($user, 'admin_hidden_deck_permanently_deleted', (string)$deck['id'], ['deckTitle'=>$deck['title']], 'deck');
        }
        query("DELETE FROM decks WHERE id IN ($placeholders) AND moderation_status='hidden' AND deleted_at IS NULL", $ids);
        $db->commit();
        foreach ($documents as $document) {
            $path = $config['upload_dir'] . '/' . $document['stored_name'];
            if (is_file($path)) unlink($path);
        }
        respond(['ok'=>true,'deleted'=>count($decksToDelete)]);
    }

    if ($route === 'admin/archive/security-events' && $method === 'GET') {
        if (!$isSuper) fail(403, 'Only a superadmin can view archived security events.');
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));
        $offset = max(0, min(1000000, (int)($_GET['offset'] ?? 0)));
        $allCount = (int)query('SELECT COUNT(*) FROM security_events')->fetchColumn();
        $cutoff = $allCount > 100 ? query('SELECT id FROM security_events ORDER BY id DESC LIMIT 1 OFFSET 99')->fetchColumn() : false;
        if ($cutoff === false) {
            respond(['events'=>[],'total'=>0,'limit'=>$limit,'offset'=>$offset,'archivedAfterPages'=>10]);
        }
        $cutoff = (int)$cutoff;
        $total = (int)query('SELECT COUNT(*) FROM security_events WHERE id<?', [$cutoff])->fetchColumn();
        $rows = query('SELECT e.id,e.event_code event,e.created_at,e.ip_hash,e.target_type,a.username actor,COALESCE(t.username,IF(e.target_type=\'deck\',CONCAT(\'Deck \',e.target_id),NULL)) target,e.details_json FROM security_events e LEFT JOIN users a ON a.id=e.actor_user_id LEFT JOIN users t ON t.id=e.target_user_id WHERE e.id<? ORDER BY e.id DESC LIMIT ' . $limit . ' OFFSET ' . $offset, [$cutoff])->fetchAll();
        foreach ($rows as &$row) {
            $row['details'] = $row['details_json'] ? json_decode($row['details_json'], true) : new stdClass();
            unset($row['details_json']);
        }
        respond(['events'=>$rows,'total'=>$total,'limit'=>$limit,'offset'=>$offset,'archivedAfterPages'=>10]);
    }

    if ($route === 'admin/audit' && $method === 'GET') {
        if (!$isSuper) {
            fail(403, 'Only a superadmin can view raw security events.');
        }
        $from = $_GET['from'] ?? gmdate('Y-m-01');
        $to = $_GET['to'] ?? gmdate('Y-m-d');
        if (!is_string($from) || !is_string($to)) {
            fail(422, 'Invalid date range.');
        }
        [$start, $end] = $admin->dateRange($from, $to);
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 50)));
        $offset = max(0, min(100000, (int)($_GET['offset'] ?? 0)));
        $allCount = (int)query('SELECT COUNT(*) FROM security_events')->fetchColumn();
        $cutoff = $allCount > 100 ? query('SELECT id FROM security_events ORDER BY id DESC LIMIT 1 OFFSET 99')->fetchColumn() : false;
        $liveClause = $cutoff === false ? '' : ' AND id>=?';
        $auditParams = $cutoff === false ? [$start, $end] : [$start, $end, (int)$cutoff];
        $total = (int)query('SELECT COUNT(*) FROM security_events WHERE created_at>=? AND created_at<?' . $liveClause, $auditParams)->fetchColumn();
        $rowParams = $auditParams;
        $rows = query(
            'SELECT e.id,e.event_code event,e.created_at,e.ip_hash,e.target_type,a.username actor,COALESCE(t.username,IF(e.target_type=\'deck\',CONCAT(\'Deck \',e.target_id),NULL)) target,e.details_json FROM security_events e LEFT JOIN users a ON a.id=e.actor_user_id LEFT JOIN users t ON t.id=e.target_user_id WHERE e.created_at>=? AND e.created_at<?' . ($cutoff === false ? '' : ' AND e.id>=?') . ' ORDER BY e.id DESC LIMIT ' . $limit . ' OFFSET ' . $offset,
            $rowParams
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['details'] = $row['details_json'] ? json_decode($row['details_json'], true) : new stdClass();
            unset($row['details_json']);
        }
        respond([
            'events' => $rows,
            'from' => substr($start, 0, 10),
            'to' => gmdate('Y-m-d', strtotime($end . ' UTC') - 86400),
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }

    if ($route === 'admin/audit/export' && $method === 'GET') {
        $from = $_GET['from'] ?? gmdate('Y-m-01');
        $to = $_GET['to'] ?? gmdate('Y-m-d');
        if (!is_string($from) || !is_string($to)) {
            fail(422, 'Invalid date range.');
        }
        [$start, $end] = $admin->dateRange($from, $to);
        audit_event($user, 'admin_security_log_exported', null, ['from' => $from, 'to' => $to, 'format' => 'csv'], 'system');
        $allCount = (int)query('SELECT COUNT(*) FROM security_events')->fetchColumn();
        $cutoff = $allCount > 100 ? query('SELECT id FROM security_events ORDER BY id DESC LIMIT 1 OFFSET 99')->fetchColumn() : false;
        $auditSql = 'SELECT e.id,e.event_code event,e.created_at,e.ip_hash,e.target_type,a.username actor,COALESCE(t.username,IF(e.target_type=\'deck\',CONCAT(\'Deck \' ,e.target_id),NULL)) target,e.details_json FROM security_events e LEFT JOIN users a ON a.id=e.actor_user_id LEFT JOIN users t ON t.id=e.target_user_id WHERE e.created_at>=? AND e.created_at<?' . ($cutoff === false ? '' : ' AND e.id>=?') . ' ORDER BY e.id DESC';
        $auditParams = $cutoff === false ? [$start, $end] : [$start, $end, (int)$cutoff];
        $sendCsv('co-studymaxx-security-events-' . $from . '-to-' . $to . '.csv', ['event_id','occurred_at_utc','event','actor_username','target','target_type','ip_fingerprint','details_json'], static function (callable $writeRow) use ($auditSql, $auditParams): void {
            $statement = query($auditSql, $auditParams);
            while ($row = $statement->fetch()) {
                $writeRow([$row['id'],$row['created_at'],$row['event'],$row['actor'],$row['target'],$row['target_type'],$row['ip_hash'] ? substr($row['ip_hash'], 0, 16) : '',$row['details_json'] ?: '{}']);
            }
        });
    }

    fail(404, 'Endpoint not found.');
}
