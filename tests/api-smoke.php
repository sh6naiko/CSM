<?php
declare(strict_types=1);
// Run against the local PHP server: php tests/api-smoke.php
$base = getenv('CSM_TEST_URL') ?: 'http://127.0.0.1:8080/api/index.php?r=';
$suffix = bin2hex(random_bytes(4));
$users = [
    ['name' => 'qa'.$suffix, 'email' => 'qa'.$suffix.'@example.invalid', 'password' => 'SmokeTest-2026!', 'firstName' => 'QA', 'middleName' => 'M', 'lastName' => 'Tester'],
    ['name' => 'qb'.$suffix, 'email' => 'qb'.$suffix.'@example.invalid', 'password' => 'SmokeTest-2026!', 'firstName' => 'Quality', 'lastName' => 'Assurance'],
];
function check(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
function client(): array { return ['cookie' => tempnam(sys_get_temp_dir(), 'csm-cookie-'), 'csrf' => '', 'tab' => bin2hex(random_bytes(16)), 'browser' => bin2hex(random_bytes(16))]; }
function call_api(array &$client, string $route, string $method='GET', ?array $data=null, ?string $upload=null, bool $includeTabHeaders=true): array {
    global $base;
    $ch=curl_init($base.$route);$headers=['Accept: application/json'];if($includeTabHeaders){$headers[]='X-CSM-Tab-Id: '.$client['tab'];$headers[]='X-CSM-Browser-Id: '.$client['browser'];}
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_COOKIEFILE=>$client['cookie'],CURLOPT_COOKIEJAR=>$client['cookie'],CURLOPT_CUSTOMREQUEST=>$method]);
    if($data!==null){if($upload!==null){$data['file']=new CURLFile($upload,'application/pdf','smoke-test.pdf');curl_setopt($ch,CURLOPT_POSTFIELDS,$data);}else{$headers[]='Content-Type: application/json';curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($data,JSON_THROW_ON_ERROR));}}
    if($method!=='GET'&&$client['csrf']!=='')$headers[]='X-CSRF-Token: '.$client['csrf'];
    curl_setopt($ch,CURLOPT_HTTPHEADER,$headers);$body=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);$error=curl_error($ch);curl_close($ch);
    if($body===false)throw new RuntimeException('HTTP client error: '.$error);
    $decoded=json_decode($body,true);if(is_array($decoded)&&isset($decoded['csrf']))$client['csrf']=$decoded['csrf'];
    return [$status,$decoded,$body];
}
function expect(array &$client,string $route,string $method='GET',?array $data=null,int $status=200,?string $upload=null):array{$result=call_api($client,$route,$method,$data,$upload);check($result[0]===$status,"$route expected HTTP $status, got {$result[0]}: {$result[2]}");return $result[1]??[];}
$localConfig=require dirname(__DIR__).'/server/config.local.php';
$skipRecovery=getenv('CSM_TEST_SKIP_RECOVERY')==='1';
$mailerParts=parse_url(getenv('CSM_TEST_MAILER_URL')?:($localConfig['mailer_url']??'http://127.0.0.1:8091/send'));
$mailerOrigin=($mailerParts['scheme']??'http').'://'.($mailerParts['host']??'127.0.0.1').(isset($mailerParts['port'])?':'.$mailerParts['port']:'');
$mailerSecret=(string)($localConfig['mailer_secret']??(getenv('CSM_MAILER_SECRET')?:''));
function mailer_get(string $path):array{global $mailerOrigin,$mailerSecret;$ch=curl_init($mailerOrigin.$path);curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Accept: application/json','Authorization: Bearer '.$mailerSecret]]);$body=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);$err=curl_error($ch);curl_close($ch);if($body===false)throw new RuntimeException('Mailer stub is unavailable: '.$err);$json=json_decode($body,true);check($status===200&&is_array($json),'Mailer stub did not return a valid response.');return $json;}
function recovery_token(string $email):string{$outbox=mailer_get('/__test/outbox?to='.rawurlencode($email));$messages=$outbox['messages']??[];check(count($messages)>0,'The recovery email was not captured by the stub mail transport.');$last=end($messages);$text=(string)($last['text']??'');check((bool)preg_match('~login\.html\?mode=reset#token=([a-f0-9]{64})~',$text,$match),'The stub email did not contain a valid recovery link.');return $match[1];}
$created=[];$accounts=[];$tmpPdf=null;$extraClients=[];$initialMaintenanceSetting=null;$initialStorageLimitSetting=null;
try {
    if(!$skipRecovery){$health=mailer_get('/health');check(($health['ok']??false)===true&&($health['transport']??'')==='stub','Start the mail bridge with MAILER_TRANSPORT=stub before running the recovery smoke tests.');}
    $pdo=new PDO($localConfig['dsn'],$localConfig['user'],$localConfig['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $initialMaintenanceSetting=$pdo->query("SELECT value_text,updated_by_user_id FROM system_settings WHERE setting_key='maintenance_mode'")->fetch();
    $initialStorageLimitSetting=$pdo->query("SELECT value_text,updated_by_user_id FROM system_settings WHERE setting_key='storage_limit_bytes'")->fetch();
    if(($initialMaintenanceSetting['value_text']??'0')==='1')throw new RuntimeException('Maintenance mode is already enabled; disable it before running the full smoke test.');
    $guard=client();expect($guard,'auth/session');$guard['csrf']='';expect($guard,'auth/logout','POST',[],403);
    foreach($users as $u){$c=client();expect($c,'auth/session');$registration=['username'=>$u['name'],'email'=>$u['email'],'password'=>$u['password'],'firstName'=>$u['firstName'],'lastName'=>$u['lastName']];if(isset($u['middleName']))$registration['middleName']=$u['middleName'];expect($c,'auth/register','POST',$registration,201);expect($c,'auth/login','POST',['username'=>$u['name'],'password'=>'incorrect-password'],401);expect($c,'auth/login','POST',['username'=>$u['name'],'password'=>$u['password']]);$session=expect($c,'auth/session');check(($session['profile']['firstName']??'')===$u['firstName']&&($session['profile']['lastName']??'')===$u['lastName'],'Registration names were not saved to the account profile.');check(($session['profile']['middleName']??null)===($u['middleName']??null),'Optional middle name was not saved correctly.');$accounts[]=$c;}
    $a=$accounts[0];$b=$accounts[1];
    // Two browser tabs share one PHP cookie but keep independent sessionStorage IDs.
    $secondTab=['cookie'=>$a['cookie'],'csrf'=>'','tab'=>bin2hex(random_bytes(16)),'browser'=>$a['browser']];$extraClients[]=$secondTab;
    check(expect($secondTab,'auth/session')['authenticated']===false,'A second tab unexpectedly inherited the first tab’s authenticated state.');
    expect($secondTab,'auth/login','POST',['username'=>$users[0]['name'],'password'=>$users[0]['password']]);
    check(expect($a,'auth/session')['authenticated']===false,'Signing in from a second tab did not invalidate the first tab.');
    $staleTab=call_api($a,'workspace');check($staleTab[0]===401,'An invalidated tab could still read private account data.');
    $a['csrf']='stale-token';$staleWrite=call_api($a,'profile','PATCH',['avatar'=>'slate']);check($staleWrite[0]===401,'An invalidated tab did not reject writes before stale CSRF validation.');expect($a,'auth/session');
    expect($a,'auth/login','POST',['username'=>$users[0]['name'],'password'=>$users[0]['password']]);
    check(expect($secondTab,'auth/session')['authenticated']===false,'The previous tab remained active after the original tab signed in again.');
    $freshWorkspace=expect($a,'workspace');$freshStats=$freshWorkspace['stats'];
    check($freshStats['decks']===0&&$freshStats['cards']===0&&$freshStats['studyDays']===0&&$freshStats['studyBestDays']===0&&$freshStats['accuracy']===0&&$freshStats['decksTrend']===0&&$freshStats['cardsTrend']===0&&$freshStats['accuracyTrend']===0,'A newly created account did not start with zero statistics.');
    check(count($freshStats['activityChart'])===7&&array_sum(array_column($freshStats['activityChart'],'current'))===0&&array_sum(array_column($freshStats['activityChart'],'previous'))===0,'A new account received non-zero sample activity.');
    expect($a,'auth/register','POST',['username'=>'duplicate'.$suffix,'email'=>$users[0]['email'],'password'=>$users[0]['password'],'firstName'=>'QA','lastName'=>'Tester'],409);
    $profile=expect($a,'profile','PATCH',['displayName'=>'Smoke Profile '.$suffix,'avatar'=>'mint']);check($profile['avatar']==='mint','Profile avatar was not saved.');
    $deck=expect($a,'decks','POST',['title'=>'Smoke Reviewer '.$suffix,'subject'=>'QA','category'=>'Recent'],201);$deckId=$deck['id'];$created[]=$deckId;
    expect($a,'decks','POST',['title'=>'  smoke   reviewer '.$suffix.'  ','subject'=>'Duplicate','category'=>'Recent'],409);
    $deck=expect($a,'decks','PATCH',['id'=>$deckId,'title'=>'Smoke Reviewer Edited '.$suffix,'subject'=>'QA Edited','category'=>'Recent','cards'=>[]]);
    $card=expect($a,'cards','POST',['deckId'=>$deckId,'type'=>'IDENTIFICATION','prompt'=>'Smoke question?','correctAnswer'=>'Persistent answer','hint'=>'QA'],201);
    check(isset($card['id']),'Card was not created.');
    expect($a,'cards','PATCH',['deckId'=>$deckId,'id'=>$card['id'],'type'=>'IDENTIFICATION','prompt'=>'Edited smoke question?','correctAnswer'=>'Persistent answer','hint'=>'QA edited']);
    $removed=expect($a,'cards','POST',['deckId'=>$deckId,'type'=>'IDENTIFICATION','prompt'=>'Temporary card','correctAnswer'=>'Remove me'],201);
    expect($a,'cards','DELETE',['deckId'=>$deckId,'id'=>$removed['id']]);
    $card2=expect($a,'cards','POST',['deckId'=>$deckId,'type'=>'IDENTIFICATION','prompt'=>'Second smoke question?','correctAnswer'=>'Answer two'],201);
    $tmpPdf=tempnam(sys_get_temp_dir(),'csm-pdf-');file_put_contents($tmpPdf,"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
    $doc=expect($a,'documents','POST',['deckId'=>$deckId],201,$tmpPdf);check(isset($doc['id']),'PDF metadata was not saved.');
    $deck=expect($a,'decks&id='.$deckId);check(count($deck['cards'])===2&&count($deck['documents'])===1,'Deck read did not return saved cards and material metadata.');check(str_contains($deck['documents'][0]['url'],'tabId='.$a['tab'])&&str_contains($deck['documents'][0]['url'],'browserId='.$a['browser']),'PDF viewer URL did not carry its tab/browser binding for range requests.');
    $stream=call_api($a,'documents/file&id='.$doc['id']);check($stream[0]===200&&str_starts_with($stream[2],'%PDF-'),'PDF owner could not read their own upload.');
    $highlight=expect($a,'highlights','POST',['documentId'=>$doc['id'],'page'=>1,'text'=>'Selected PDF passage','color'=>'#f5a23a','selection'=>[['x'=>0.12,'y'=>0.24,'width'=>0.31,'height'=>0.025]]],201);
    $savedHighlights=expect($a,'highlights&documentId='.$doc['id']);check(count($savedHighlights)===1&&$savedHighlights[0]['selection'][0]['x']===0.12,'PDF note selection geometry did not persist.');
    $session=expect($a,'arena/start','POST',['deckId'=>$deckId,'difficulty'=>'normal'],201);check($session['startingSeconds']===45,'Normal difficulty did not start at 45 seconds.');
    $answer=expect($a,'arena/answer','POST',['id'=>$session['id'],'position'=>0,'result'=>'wrong']);check($answer['answers'][0]['adjustment']===-5,'Wrong answer did not subtract exactly 5 seconds.');
    $duplicate=expect($a,'arena/answer','POST',['id'=>$session['id'],'position'=>0,'result'=>'correct']);check($duplicate['answers'][0]['adjustment']===-5,'A repeated submission changed the saved answer.');
    $answer=expect($a,'arena/answer','POST',['id'=>$session['id'],'position'=>1,'result'=>'correct']);check($answer['answers'][1]['adjustment']===8&&$answer['status']==='completed'&&$answer['remainingMs']>45000,'Correct answer did not award +8 seconds to the existing timer and finish the round.');
    foreach(['easy'=>60,'hard'=>30] as $difficulty=>$seconds){$other=expect($a,'arena/start','POST',['deckId'=>$deckId,'difficulty'=>$difficulty],201);check($other['startingSeconds']===$seconds,"$difficulty starting time is not $seconds seconds.");expect($a,'arena/abandon','POST',['id'=>$other['id']]);}
    $work=expect($a,'workspace');check(count(array_filter($work['decks'],fn($d)=>$d['id']===$deckId))===1,'Created deck disappeared on refresh.');check(count($work['sessions'])===3,'Arena results are missing from persisted history.');check(count($work['studyProgress'])===2,'Arena answers did not save per-card progress.');
    $earned=$work['achievements'];sort($earned);
    check($earned===['arena_warrior','first_deck','pdf_scholar','streak_starter'],'Workspace did not persist the four eligible achievements or awarded Sharp Recall too early.');
    $achievementNotices=expect($a,'notifications');
    check(count($achievementNotices['notifications'])===4&&$achievementNotices['unreadCount']===4,'Achievement unlocks did not create four unread notifications.');
    check(count(array_filter($achievementNotices['notifications'],fn($notice)=>$notice['type']==='achievement_unlocked'))===4,'Achievement notifications have the wrong type.');
    expect($a,'workspace');
    check(expect($a,'notifications')['unreadCount']===4,'Refreshing awarded duplicate achievement notifications.');
    check(expect($b,'notifications')['notifications']===[],'Achievement notifications leaked to another user.');
    $achievementNoticeId=$achievementNotices['notifications'][0]['id'];
    expect($b,'notifications/read','PATCH',['id'=>$achievementNoticeId]);
    check(expect($a,'notifications')['unreadCount']===4,'A different account marked an achievement notification as read.');
    expect($a,'notifications/read','PATCH',['id'=>$achievementNoticeId]);
    check(expect($a,'notifications')['unreadCount']===3,'Reading an achievement did not update the unread count.');
    expect($a,'notifications','DELETE');
    $afterClear=expect($a,'workspace');
    check(count($afterClear['achievements'])===4&&expect($a,'notifications')['notifications']===[],'Clearing notifications erased badges or recreated old unlock notifications.');
    $fromHighlight=expect($a,'highlights/card','POST',['documentId'=>$doc['id'],'page'=>1,'text'=>'Selected answer passage','counterpart'=>'What is the PDF excerpt about?','purpose'=>'answer','color'=>'#8dc7ef','selection'=>[['x'=>0.2,'y'=>0.4,'width'=>0.2,'height'=>0.03]]],201);
    $deckAfterHighlightCard=expect($a,'decks&id='.$deckId);$sourceHighlight=array_values(array_filter(expect($a,'highlights&documentId='.$doc['id']),fn($item)=>$item['cardId']===$fromHighlight['cardId']));
    check(count($sourceHighlight)===1&&$sourceHighlight[0]['purpose']==='answer','PDF-created Bombcard was not linked to its source highlight.');
    check(count($deckAfterHighlightCard['cards'])===3&&$deckAfterHighlightCard['cards'][2]['prompt']==='What is the PDF excerpt about?'&&$deckAfterHighlightCard['cards'][2]['correctAnswer']==='Selected answer passage','Answer-selected excerpt did not create the correct Bombcard pair.');
    $answerSource=array_values(array_filter(expect($a,'highlights&documentId='.$doc['id']),fn($item)=>$item['cardId']===$fromHighlight['cardId']));check(count($answerSource)===1&&$answerSource[0]['purpose']==='answer','PDF-created answer Bombcard lost its source highlight metadata.');
    $questionFromHighlight=expect($a,'highlights/card','POST',['documentId'=>$doc['id'],'page'=>1,'text'=>'What is the PDF excerpt about?','counterpart'=>'Cellular energy production','purpose'=>'question','color'=>'#f5a23a','selection'=>[['x'=>0.4,'y'=>0.55,'width'=>0.25,'height'=>0.03]]],201);
    $deckAfterQuestionCard=expect($a,'decks&id='.$deckId);check(count($deckAfterQuestionCard['cards'])===4&&$deckAfterQuestionCard['cards'][3]['prompt']==='What is the PDF excerpt about?'&&$deckAfterQuestionCard['cards'][3]['correctAnswer']==='Cellular energy production','Question-selected excerpt did not create the correct Bombcard pair.');
    $foreign=client();expect($foreign,'auth/session');expect($foreign,'auth/login','POST',['username'=>$users[1]['name'],'password'=>$users[1]['password']]);
    expect($foreign,'decks&id='.$deckId,'GET',null,404);
    expect($foreign,'cards','POST',['deckId'=>$deckId,'prompt'=>'unauthorized','correctAnswer'=>'no','type'=>'IDENTIFICATION'],404);
    expect($foreign,'documents/file&id='.$doc['id'],'GET',null,404);
    expect($foreign,'highlights&documentId='.$doc['id'],'GET',null,404);
    expect($foreign,'highlights/card','POST',['documentId'=>$doc['id'],'page'=>1,'text'=>'Private excerpt','counterpart'=>'Private question','purpose'=>'answer','color'=>'#f5a23a','selection'=>[['x'=>0.1,'y'=>0.1,'width'=>0.1,'height'=>0.02]]],404);
    expect($foreign,'documents','DELETE',['id'=>$doc['id']],404);
    expect($foreign,'study/progress','POST',['bombcardId'=>$card['id'],'result'=>'known'],404);
    expect($foreign,'arena/session&id='.$session['id'],'GET',null,404);

    // Test-only role setup uses these two throwaway accounts; no existing account is promoted.
    $lookup=$pdo->prepare('SELECT id FROM users WHERE username=?');$lookup->execute([$users[0]['name']]);$adminId=(string)$lookup->fetchColumn();
    $lookup->execute([$users[1]['name']]);$superId=(string)$lookup->fetchColumn();
    $setRole=$pdo->prepare('UPDATE users SET role=? WHERE id=?');$setRole->execute(['admin',$adminId]);
    check(expect($a,'auth/session')['profile']['role']==='admin','The authenticated session did not expose the saved admin role to the frontend.');
    expect($foreign,'admin/dashboard','GET',null,403);
    $dashboard=expect($a,'admin/dashboard&from='.gmdate('Y-m-d').'&to='.gmdate('Y-m-d'));
    check(isset($dashboard['totals']['users'],$dashboard['totals']['activeNow'],$dashboard['period']['activeUsers'],$dashboard['days']),'Admin dashboard did not return total, live-presence, and period activity analytics.');
    check($dashboard['totals']['users']>=2,'Admin dashboard did not count registered user accounts.');
    $staffWorkspace=expect($a,'workspace');check($staffWorkspace['decks']===[]&&$staffWorkspace['sessions']===[],'Staff workspace exposed personal library decks or Arena sessions.');
    expect($a,'decks','POST',['title'=>'Staff should not create decks','subject'=>'QA'],403);
    expect($a,'arena/start','POST',['deckId'=>$deckId,'difficulty'=>'normal'],403);
    $adminUsers=expect($a,'admin/users&q='.rawurlencode($users[0]['name']));
    check(count($adminUsers['users'])===1&&!isset($adminUsers['users'][0]['password_hash']),'Admin account search leaked a password hash or failed to find the account.');
    $regularUsers=expect($a,'admin/users&role=user');check(count($regularUsers['users'])>0&&count(array_filter($regularUsers['users'],fn($account)=>$account['role']!=='user'))===0,'The users role filter returned accounts with another role.');
    $adminAccounts=expect($a,'admin/users&role=admin');check(count($adminAccounts['users'])===1&&$adminAccounts['users'][0]['id']===$adminId,'The admin role filter failed to return only the administrator.');
    expect($a,'admin/users&role=invalid','GET',null,422);
    expect($a,'admin/audit','GET',null,403);expect($a,'admin/settings','GET',null,403);
    expect($a,'admin/users/role','POST',['userId'=>$superId,'role'=>'admin'],403);
    if(!$skipRecovery){
        $adminReset=expect($a,'admin/users/reset','POST',['userId'=>$superId]);
        check(!isset($adminReset['token'])&&!isset($adminReset['resetUrl']),'Admin password-reset endpoint exposed a reset token or link.');
        recovery_token($users[1]['email']);
    }

    // Repeated failures lock an account; an administrator can clear the lock.
    $lockedClient=client();$extraClients[]=$lockedClient;expect($lockedClient,'auth/session');
    for($attempt=0;$attempt<9;$attempt++)expect($lockedClient,'auth/login','POST',['username'=>$users[0]['name'],'password'=>'DefinitelyWrong-2026!'],401);
    $lockState=expect($a,'admin/users&q='.rawurlencode($users[0]['name']))['users'][0];
    check(!empty($lockState['locked_until']),'Repeated failed sign-ins did not lock the account.');
    expect($a,'admin/users/unlock','POST',['userId'=>$adminId,'reason'=>'QA unlock verification']);
    expect($lockedClient,'auth/login','POST',['username'=>$users[0]['name'],'password'=>$users[0]['password']]);

    $modDeck=expect($foreign,'decks','POST',['title'=>'Moderation smoke '.$suffix,'subject'=>'QA','category'=>'Recent'],201);$created[]=$modDeck['id'];
    expect($foreign,'cards','POST',['deckId'=>$modDeck['id'],'type'=>'IDENTIFICATION','prompt'=>'Moderation test question','correctAnswer'=>'Moderation test answer'],201);
    $modDoc=expect($foreign,'documents','POST',['deckId'=>$modDeck['id']],201,$tmpPdf);
    $adminPreview=expect($a,'admin/decks/view&id='.$modDeck['id']);check(($adminPreview['deck']['owner']??'')===$users[1]['name']&&!array_key_exists('cards',$adminPreview),'Staff PDF preview exposed Bombcard data or returned the wrong deck owner.');
    check(count($adminPreview['documents']??[])===1&&$adminPreview['documents'][0]['id']===$modDoc['id']&&str_contains($adminPreview['documents'][0]['url'],'tabId='.$a['tab']),'Admin deck preview did not list the deck owner PDF with a tab-bound URL.');
    $adminPdfRoute=substr((string)parse_url($adminPreview['documents'][0]['url'],PHP_URL_QUERY),2);$adminPdf=call_api($a,$adminPdfRoute,'GET',null,null,false);check($adminPdf[0]===200&&str_starts_with($adminPdf[2],'%PDF-'),'Admin could not stream another user\'s PDF through the staff-only route.');
    expect($foreign,'admin/documents/file&id='.$modDoc['id'],'GET',null,403);
    expect($foreign,'admin/decks/view&id='.$deckId,'GET',null,403);
    $hiddenSession=expect($foreign,'arena/start','POST',['deckId'=>$modDeck['id'],'difficulty'=>'easy'],201);
    expect($a,'admin/decks/flag','POST',['deckId'=>$modDeck['id'],'reason'=>'QA report: verify staff moderation queue.'],201);
    $ownerNotices=expect($foreign,'notifications');$flagNotice=array_values(array_filter($ownerNotices['notifications'],fn($item)=>($item['deckId']??null)===$modDeck['id']&&$item['type']==='deck_flagged'));
    check(count($flagNotice)===1&&!$flagNotice[0]['isRead']&&$ownerNotices['unreadCount']===1&&str_contains($flagNotice[0]['message'],'QA report: verify staff moderation queue.'),'Flagging a deck did not create an unread private notification for its owner.');
    $adminNotices=expect($a,'notifications');check(count(array_filter($adminNotices['notifications'],fn($item)=>($item['deckId']??null)===$modDeck['id']))===0,'The flag notification was visible to a different account.');
    expect($foreign,'notifications/read','PATCH',['id'=>$flagNotice[0]['id']]);
    $openReports=expect($a,'admin/reports&status=open')['reports'];$report=array_values(array_filter($openReports,fn($item)=>$item['deckId']===$modDeck['id']));
    check(count($report)===1&&str_contains($report[0]['reason'],'QA report'),'Flagged-deck reason was not visible in the admin queue.');
    expect($a,'admin/reports','PATCH',['id'=>(int)$report[0]['id'],'action'=>'dismiss','reason'=>'QA dismissal']);
    $ownerNotices=expect($foreign,'notifications');$dismissNotice=array_values(array_filter($ownerNotices['notifications'],fn($item)=>($item['deckId']??null)===$modDeck['id']&&$item['type']==='deck_report_dismiss'));
    check(count($dismissNotice)===1&&$ownerNotices['unreadCount']===1&&str_contains($dismissNotice[0]['message'],'QA dismissal'),'A dismissed deck review did not create a private unread owner notification.');
    $adminNotices=expect($a,'notifications');check(count(array_filter($adminNotices['notifications'],fn($item)=>($item['deckId']??null)===$modDeck['id']))===0,'A different account could read another owner’s review notification.');
    expect($foreign,'notifications/read','PATCH',['id'=>$dismissNotice[0]['id']]);
    check(expect($foreign,'notifications')['unreadCount']===0,'Marking a notification as read did not clear its unread status.');
    expect($a,'admin/decks/flag','POST',['deckId'=>$modDeck['id'],'reason'=>'QA report: hide path.'],201);
    $ownerNotices=expect($foreign,'notifications');$secondFlag=array_values(array_filter($ownerNotices['notifications'],fn($item)=>($item['deckId']??null)===$modDeck['id']&&$item['type']==='deck_flagged'&&!$item['isRead']));
    check(count($secondFlag)===1&&str_contains($secondFlag[0]['message'],'QA report: hide path.'),'A repeated deck flag did not create a new unread owner notification.');
    expect($foreign,'notifications/read','PATCH',['id'=>$secondFlag[0]['id']]);
    $openReports=expect($a,'admin/reports&status=open')['reports'];$report=array_values(array_filter($openReports,fn($item)=>$item['deckId']===$modDeck['id']));
    check(count($report)===1,'Second moderation report was not queued.');
    expect($a,'admin/reports','PATCH',['id'=>(int)$report[0]['id'],'action'=>'hide','reason'=>'QA hide verification']);
    $ownerNotices=expect($foreign,'notifications');$hideNotice=array_values(array_filter($ownerNotices['notifications'],fn($item)=>($item['deckId']??null)===$modDeck['id']&&!$item['isRead']));
    check(count($hideNotice)===1&&str_contains($hideNotice[0]['message'],'QA hide verification'),'A deck hidden after review did not notify its owner.');
    expect($foreign,'decks&id='.$modDeck['id'],'GET',null,404);
    $sessionStatus=$pdo->prepare('SELECT status FROM arena_sessions WHERE id=?');$sessionStatus->execute([$hiddenSession['id']]);check($sessionStatus->fetchColumn()==='abandoned','Hiding a reviewer did not safely end its active Arena session.');
    $setRole->execute(['superadmin',$superId]);
    check(expect($foreign,'auth/session')['profile']['role']==='superadmin','The authenticated session did not receive its saved superadmin role.');
    $superPreview=expect($foreign,'admin/decks/view&id='.$deckId);check(($superPreview['deck']['owner']??'')===$users[0]['name'],'Superadmin could not preview a different user’s deck.');
    expect($foreign,'admin/decks/visibility','PATCH',['deckId'=>$modDeck['id'],'action'=>'restore','reason'=>'QA restore verification']);
    $ownerNotices=expect($foreign,'notifications');check(count(array_filter($ownerNotices['notifications'],fn($item)=>($item['deckId']??null)===$modDeck['id']&&!$item['isRead']))===2,'Restoring a reviewed deck did not create a new unread notification.');
    expect($foreign,'decks&id='.$modDeck['id'],'GET',null,403);
    $restoredStatus=$pdo->prepare('SELECT moderation_status FROM decks WHERE id=?');$restoredStatus->execute([$modDeck['id']]);check($restoredStatus->fetchColumn()==='visible','Superadmin restore action did not restore deck visibility.');

    $events=expect($foreign,'admin/audit&from='.gmdate('Y-m-d').'&to='.gmdate('Y-m-d'))['events'];
    check(count(array_filter($events,fn($event)=>in_array($event['event'],['login_failure','login_success'],true)))>0,'Superadmin audit log did not record sign-in attempts.');
    expect($a,'admin/audit','GET',null,403);expect($a,'admin/settings','GET',null,403);expect($a,'admin/sessions/clear','POST',['confirm'=>true],403);
    $system=expect($foreign,'admin/settings');$unchangedSettings=expect($foreign,'admin/settings','PATCH',['storageLimitBytes'=>(int)$system['storageLimitBytes']]);
    check($unchangedSettings['storageLimitBytes']===$system['storageLimitBytes'],'Superadmin storage-limit setting did not persist.');
    expect($foreign,'admin/users/role','POST',['userId'=>$adminId,'role'=>'superadmin'],422);
    expect($foreign,'admin/users/role','POST',['userId'=>$adminId,'role'=>'superadmin','password'=>'wrong-password'],403);
    $notPromoted=expect($foreign,'admin/users&q='.rawurlencode($users[0]['name']))['users'][0];check($notPromoted['role']==='admin','An invalid password confirmation changed the target role.');
    expect($foreign,'admin/users/role','POST',['userId'=>$adminId,'role'=>'superadmin','password'=>$users[1]['password']]);
    $promoted=expect($foreign,'admin/users&q='.rawurlencode($users[0]['name']))['users'][0];check($promoted['role']==='superadmin','Superadmin could not promote an account.');
    $superAccounts=expect($foreign,'admin/users&role=superadmin');check(count($superAccounts['users'])>=1&&count(array_filter($superAccounts['users'],fn($account)=>$account['role']!=='superadmin'))===0,'The superadmin role filter returned an account with another role.');
    expect($foreign,'admin/users/role','POST',['userId'=>$superId,'role'=>'admin'],409);
    expect($foreign,'admin/users/role','POST',['userId'=>$superId,'role'=>'user'],409);
    check(expect($foreign,'auth/session')['profile']['role']==='superadmin','A superadmin self-demotion attempt changed its own role.');
    expect($foreign,'admin/users/role','POST',['userId'=>$adminId,'role'=>'admin']);
    $superCount=(int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='superadmin'")->fetchColumn();
    if($superCount===1)expect($foreign,'admin/users/role','POST',['userId'=>$superId,'role'=>'user'],409);
    expect($foreign,'admin/settings','PATCH',['maintenanceMode'=>true]);
    check(expect($a,'auth/session')['profile']['role']==='admin','The admin role was not active before the maintenance access check.');
    expect($a,'workspace');
    expect($a,'admin/dashboard');
    expect($foreign,'workspace');
    expect($foreign,'admin/settings');
    expect($foreign,'admin/users/role','POST',['userId'=>$adminId,'role'=>'user']);
    expect($a,'workspace','GET',null,503);
    expect($foreign,'workspace');
    expect($foreign,'admin/settings','PATCH',['maintenanceMode'=>false]);

    expect($a,'auth/password','POST',['currentPassword'=>$users[0]['password'],'newPassword'=>'SmokeChanged-2026!']);
    expect($a,'auth/logout','POST',[]);
    expect($a,'auth/session');expect($a,'auth/login','POST',['username'=>$users[0]['name'],'password'=>'SmokeChanged-2026!']);
    $again=expect($a,'workspace');check(count(array_filter($again['decks'],fn($d)=>$d['id']===$deckId))===1,'Data did not survive sign-out and sign-in.');
    expect($a,'decks','DELETE',['id'=>$deckId]);$created=[];

    if(!$skipRecovery){
    $recovery=client();$extraClients[]=$recovery;expect($recovery,'auth/session');
    $unknownResult=call_api($recovery,'auth/password/request','POST',['email'=>'missing-'.$suffix.'@example.invalid']);
    check($unknownResult[0]===200&&is_array($unknownResult[1])&&isset($unknownResult[1]['message']),'Unknown-email recovery did not return the generic confirmation.');
    $knownResult=call_api($recovery,'auth/password/request','POST',['email'=>$users[0]['email']]);
    check($knownResult[0]===200&&($knownResult[1]['message']??null)===$unknownResult[1]['message'],'Known and unknown emails did not receive an identical recovery response.');
    $firstResetToken=recovery_token($users[0]['email']);
    expect($recovery,'auth/password/request','POST',['email'=>$users[0]['email']]);
    $validResetToken=recovery_token($users[0]['email']);
    check($validResetToken!==$firstResetToken,'A repeated recovery request reused the same token.');
    $invalid=call_api($recovery,'auth/password/reset','POST',['token'=>str_repeat('0',64),'newPassword'=>'ResetSmoke-2026!','confirmPassword'=>'ResetSmoke-2026!']);
    check($invalid[0]===422&&str_contains((string)($invalid[1]['error']??''),'invalid'),'Invalid recovery token was not rejected.');
    $older=call_api($recovery,'auth/password/reset','POST',['token'=>$firstResetToken,'newPassword'=>'ResetSmoke-2026!','confirmPassword'=>'ResetSmoke-2026!']);
    check($older[0]===422&&str_contains((string)($older[1]['error']??''),'already been used'),'A previous token was not invalidated by the newer request.');
    $shortPassword=call_api($recovery,'auth/password/reset','POST',['token'=>$validResetToken,'newPassword'=>'short','confirmPassword'=>'short']);
    check($shortPassword[0]===422&&str_contains((string)($shortPassword[1]['error']??''),'8'),'Reset did not enforce the existing password length rule.');
    $mismatch=call_api($recovery,'auth/password/reset','POST',['token'=>$validResetToken,'newPassword'=>'ResetSmoke-2026!','confirmPassword'=>'DifferentSmoke-2026!']);
    check($mismatch[0]===422&&str_contains((string)($mismatch[1]['error']??''),'do not match'),'Reset accepted a mismatched confirmation.');
    $oldSession=client();$extraClients[]=$oldSession;expect($oldSession,'auth/session');expect($oldSession,'auth/login','POST',['username'=>$users[0]['name'],'password'=>'SmokeChanged-2026!']);
    expect($recovery,'auth/password/reset','POST',['token'=>$validResetToken,'newPassword'=>'ResetSmoke-2026!','confirmPassword'=>'ResetSmoke-2026!']);
    $replay=call_api($recovery,'auth/password/reset','POST',['token'=>$validResetToken,'newPassword'=>'ResetSmoke-2026!','confirmPassword'=>'ResetSmoke-2026!']);
    check($replay[0]===422&&str_contains((string)($replay[1]['error']??''),'already been used'),'A successfully consumed reset token could be reused.');
    expect($a,'workspace','GET',null,401);expect($oldSession,'workspace','GET',null,401);
    $newLogin=client();$extraClients[]=$newLogin;expect($newLogin,'auth/session');
    expect($newLogin,'auth/login','POST',['username'=>$users[0]['name'],'password'=>'SmokeChanged-2026!'],401);
    expect($newLogin,'auth/login','POST',['username'=>$users[0]['email'],'password'=>'ResetSmoke-2026!']);
    expect($newLogin,'workspace');
    $expiredToken=bin2hex(random_bytes(32));$owner=$pdo??new PDO($localConfig['dsn'],$localConfig['user'],$localConfig['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $ownerId=$owner->prepare('SELECT id FROM users WHERE email=?');$ownerId->execute([$users[0]['email']]);$ownerId=$ownerId->fetchColumn();
    $expiredInsert=$owner->prepare('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES(?,?,?)');$expiredInsert->execute([$ownerId,hash('sha256',$expiredToken),gmdate('Y-m-d H:i:s',time()-60)]);
    $expired=call_api($recovery,'auth/password/reset','POST',['token'=>$expiredToken,'newPassword'=>'ResetSmoke-2026!','confirmPassword'=>'ResetSmoke-2026!']);
    check($expired[0]===422&&str_contains((string)($expired[1]['error']??''),'expired'),'An expired recovery token was not rejected.');
    }
    if(!$skipRecovery&&getenv('CSM_TEST_ALLOW_SESSION_CLEAR')==='YES'){expect($foreign,'admin/sessions/clear','POST',['confirm'=>true]);expect($newLogin,'workspace','GET',null,401);}
    echo $skipRecovery
        ? "PASS registration/login/lock and admin unlock; reviewer/Bombcard/PDF/highlight/Arena persistence; account data isolation; admin/superadmin authorization and role changes; analytics/moderation/owner-only notifications/maintenance; QA cleanup. Password recovery cases were explicitly skipped.\n"
        : "PASS registration/login/lock and admin unlock; reviewer/Bombcard/PDF/highlight/Arena persistence; account data isolation; admin/superadmin authorization and role changes; analytics/moderation/maintenance; generic password recovery, expired/invalid/used tokens, and password-reset session invalidation; QA cleanup.\n";
} finally {
    if($tmpPdf&&is_file($tmpPdf))unlink($tmpPdf);
    foreach($created as $deckId){try{if(isset($a))expect($a,'decks','DELETE',['id'=>$deckId]);}catch(Throwable $ignored){}}
    $testClients=array_merge($accounts,$extraClients,isset($guard)?[$guard]:[],isset($foreign)?[$foreign]:[]);
    try {
        $cfg=$localConfig;$pdo=$pdo??new PDO($cfg['dsn'],$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        if($initialMaintenanceSetting){$restore=$pdo->prepare("UPDATE system_settings SET value_text=?,updated_by_user_id=? WHERE setting_key='maintenance_mode'");$restore->execute([$initialMaintenanceSetting['value_text'],$initialMaintenanceSetting['updated_by_user_id']]);}
        if($initialStorageLimitSetting){$restore=$pdo->prepare("UPDATE system_settings SET value_text=?,updated_by_user_id=? WHERE setting_key='storage_limit_bytes'");$restore->execute([$initialStorageLimitSetting['value_text'],$initialStorageLimitSetting['updated_by_user_id']]);}
        $clearAttempt=$pdo->prepare('DELETE FROM auth_attempts WHERE bucket=?');
        foreach($testClients as $testClient){if(empty($testClient['cookie'])||!is_file($testClient['cookie']))continue;foreach(file($testClient['cookie'],FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $cookieLine){$parts=preg_split('/\s+/',trim($cookieLine));if(count($parts)>=7&&$parts[5]==='csm_session'){$pdo->prepare('DELETE FROM web_sessions WHERE id=?')->execute([$parts[6]]);break;}}}
        foreach($users as $u){$find=$pdo->prepare('SELECT id FROM users WHERE username=?');$find->execute([$u['name']]);$userId=$find->fetchColumn();if(!$userId)continue;$clearAttempt->execute([hash('sha256','account-login:user:'.$userId)]);$logs=$pdo->prepare('DELETE FROM security_events WHERE actor_user_id=? OR target_user_id=?');$logs->execute([$userId,$userId]);$delete=$pdo->prepare('DELETE FROM users WHERE id=?');$delete->execute([$userId]);}
        if($mailerSecret!==''){$clearThrottle=$pdo->prepare('DELETE FROM auth_attempts WHERE bucket=?');foreach([$users[0]['email'],$users[1]['email'],'missing-'.$suffix.'@example.invalid'] as $address){$normalized=function_exists('mb_strtolower')?mb_strtolower($address,'UTF-8'):strtolower($address);$clearThrottle->execute([hash_hmac('sha256','reset-email:'.$normalized,$mailerSecret)]);}}
    }catch(Throwable $ignored){}
    foreach($testClients as $c){if(isset($c['cookie'])&&is_file($c['cookie']))unlink($c['cookie']);}
}
