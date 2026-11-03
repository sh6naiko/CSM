<?php
declare(strict_types=1);
date_default_timezone_set('UTC');ini_set('display_errors','0');
(function(): void {
    $envFile = dirname(__DIR__) . '/.env';
    if (!is_file($envFile)) return;
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) return;
    foreach ($lines as $line) {
        $line = preg_replace('/^\xEF\xBB\xBF/', '', trim($line));
        if (str_starts_with($line, 'export ')) $line = ltrim(substr($line, 7));
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (preg_match('/^(["\'])(.*)\1$/s', $value, $matches)) $value = $matches[2];
        if ($name !== '' && (getenv($name) === false || trim((string)getenv($name)) === '')) {
            putenv("$name=$value");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
})();
(function(): void {
    $envFile = dirname(__DIR__) . '/mailer/.env';
    if (!is_file($envFile)) return;
    $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) return;
    foreach ($lines as $line) {
        $line = preg_replace('/^\xEF\xBB\xBF/', '', trim($line));
        if (str_starts_with($line, 'export ')) $line = ltrim(substr($line, 7));
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        if (!in_array($name, ['GEMINI_API_KEY', 'GEMINI_MODEL'], true)) continue;
        $value = trim($value);
        if (preg_match('/^("|\')(.*)\1$/s', $value, $matches)) $value = $matches[2];
        if (getenv($name) === false || trim((string)getenv($name)) === '') {
            putenv("$name=$value");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
})();
foreach(glob(dirname(__DIR__).'/classes/*.php') as $classFile)require_once $classFile;
function sync_tab_session_context():void{
 if(session_status()!==PHP_SESSION_ACTIVE)return;
 $key=$GLOBALS['csmTabSessionKey']??null;
 if(is_string($key)&&$key!==''){
  $_SESSION['tab_sessions']=$_SESSION['tab_sessions']??[];
  if(!empty($GLOBALS['csmForgetTabSession']))unset($_SESSION['tab_sessions'][$key]);
  else $_SESSION['tab_sessions'][$key]=[
   'user_id'=>$_SESSION['user_id']??null,'auth_version'=>$_SESSION['auth_version']??null,
   'expires_at'=>$_SESSION['expires_at']??null,'last_activity'=>$_SESSION['last_activity']??null,
   'csrf'=>$_SESSION['csrf']??bin2hex(random_bytes(32)),'idle_logout'=>!empty($_SESSION['idle_logout']),
  ];
  foreach(['user_id','auth_version','expires_at','last_activity','csrf','idle_logout'] as $field)unset($_SESSION[$field]);
 }
}
function respond($data,int $status=200):void{sync_tab_session_context();if(session_status()===PHP_SESSION_ACTIVE)session_write_close();http_response_code($status);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
function fail(int $status,string $message,array $extra=[]):void{if(isset($GLOBALS['db'])&&$GLOBALS['db']->inTransaction())$GLOBALS['db']->rollBack();respond(array_merge(['error'=>$message],$extra),$status);}
function security_headers():void{
    if(PHP_SAPI==='cli')return;
    if(function_exists('header_remove'))@header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('Cross-Origin-Resource-Policy: same-origin');
    header("Content-Security-Policy: object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
    if((!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')||($_SERVER['SERVER_PORT']??'')==='443')header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}
security_headers();
set_exception_handler(function(Throwable $error){if(isset($GLOBALS['db'])&&$GLOBALS['db']->inTransaction())$GLOBALS['db']->rollBack();error_log((string)$error);fail(500,'The server could not complete the request. Please try again.');});
if(!is_file(__DIR__.'/config.local.php'))fail(503,'Server setup is incomplete. Copy server/config.example.php to config.local.php and configure MySQL.');
$config=require __DIR__.'/config.local.php';$config+=[
 'app_env'=>getenv('APP_ENV')?:'local',
 'app_base_url'=>getenv('APP_BASE_URL')?:'',
 'admin_base_url'=>getenv('ADMIN_BASE_URL')?:'',
 'admin_host'=>getenv('ADMIN_HOST')?:'',
 'admin_ip_allowlist'=>getenv('ADMIN_IP_ALLOWLIST')?:'',
 'mailer_url'=>getenv('CSM_MAILER_URL')?:'http://127.0.0.1:8091/send',
 'mailer_secret'=>getenv('CSM_MAILER_SECRET')?:'',
 'gemini_api_key'=>getenv('GEMINI_API_KEY')?:($config['gemini_api_key']??''),
 'gemini_model'=>getenv('GEMINI_MODEL')?:'gemini-3.8-flash',
];$database=new Database($config);$db=$database->getConnection();
foreach(['APP_BASE_URL'=>'app_base_url','ADMIN_BASE_URL'=>'admin_base_url','ADMIN_HOST'=>'admin_host','ADMIN_IP_ALLOWLIST'=>'admin_ip_allowlist','CSM_MAILER_URL'=>'mailer_url','CSM_MAILER_SECRET'=>'mailer_secret','GEMINI_API_KEY'=>'gemini_api_key','GEMINI_MODEL'=>'gemini_model'] as $environmentKey=>$configKey){$environmentValue=getenv($environmentKey);if($environmentValue!==false&&$environmentValue!=='')$config[$configKey]=$environmentValue;}
function normalized_host_value(string $value):string{$value=trim($value);if($value==='')return '';$parsed=parse_url(str_contains($value,'://')?$value:'http://'.$value);if(!is_array($parsed)||empty($parsed['host']))return '';$host=strtolower((string)$parsed['host']);return $host.(isset($parsed['port'])?':'.(int)$parsed['port']:'');}
function configured_admin_host():string{global $config;$host=normalized_host_value((string)($config['admin_host']??''));if($host!=='')return $host;$base=parse_url((string)($config['admin_base_url']??''));if(!is_array($base)||empty($base['host']))return '';return strtolower((string)$base['host']).(isset($base['port'])?':'.(int)$base['port']:'');}
function admin_entry_url():string{global $config;$base=trim((string)($config['admin_base_url']??''));return rtrim($base!==''?$base:app_base_url(),'/').'/admin';}
function enforce_admin_access():void{global $config;$expected=configured_admin_host();if($expected!==''&&normalized_host_value((string)($_SERVER['HTTP_HOST']??''))!==$expected)fail(404,'Not found.');$allowlist=preg_split('/[\s,]+/',trim((string)($config['admin_ip_allowlist']??'')),-1,PREG_SPLIT_NO_EMPTY);if($allowlist&& !in_array((string)($_SERVER['REMOTE_ADDR']??''),$allowlist,true))fail(404,'Not found.');}
if(($config['app_env']??'local')==='production'){
 $base=parse_url((string)($config['app_base_url']??''));
 $adminBase=parse_url((string)($config['admin_base_url']??''));
 if(empty($config['secure_cookie'])||!is_array($base)||($base['scheme']??'')!=='https')fail(503,'Production requires HTTPS and secure session cookies.');
 if(!is_array($adminBase)||($adminBase['scheme']??'')!=='https'||configured_admin_host()===''||strtolower((string)($adminBase['host']??''))===strtolower((string)($base['host']??'')))fail(503,'Production requires a separate HTTPS admin host.');
}
$users=new User($database);$passwordRecovery=new PasswordRecovery($database,$users);$decksService=new Deck($database);$bombcardsService=new Bombcard($database);$materialsService=new Material($database);$progressService=new StudyProgress($database);$bombstyleService=new BombstyleSession($database);$deckSharesService=new DeckShare($database);$documentPagesService=new DocumentPage($database);$documentNotesService=new DocumentNote($database);$studyDecksService=new StudyDeck($database);$studyCardsService=new StudyCard($database);$studyReviewService=new StudyReview($database);
function app_base_url():string{global $config;if(!empty($config['app_base_url']))return rtrim($config['app_base_url'],'/');$scheme=(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')||(isset($_SERVER['SERVER_PORT'])&&(int)$_SERVER['SERVER_PORT']===443)?'https':'http';$host=$_SERVER['HTTP_HOST']??'localhost';$script=str_replace('\\','/',$_SERVER['SCRIPT_NAME']??'');$basePath=preg_replace('~/api(?:/index\.php)?$~i','',dirname($script));$basePath=rtrim(str_replace('\\','/',$basePath),'/');return $scheme.'://'.$host.($basePath!==''?'/'.ltrim($basePath,'/'):'');}
function query(string $sql,array $params=[]):PDOStatement{global $database;return $database->query($sql,$params);}
function uid():string{return bin2hex(random_bytes(16));}
function now_ms():int{return (int)floor(microtime(true)*1000);}
function timestamp_ms(?string $date):?int{return $date?(int)round(strtotime($date.' UTC')*1000):null;}
function input():array{if((int)($_SERVER['CONTENT_LENGTH']??0)>2*1024*1024)fail(413,'Request too large.');try{$value=json_decode(file_get_contents('php://input'),true,64,JSON_THROW_ON_ERROR);}catch(JsonException $e){fail(400,'Invalid JSON.');}if(!is_array($value))fail(400,'Expected a JSON object.');return $value;}
function text_length(string $value):int{return function_exists('mb_strlen')?mb_strlen($value,'UTF-8'):strlen($value);}
function field(array $data,string $key,int $max,bool $required=true):string{$value=$data[$key]??'';if(!is_string($value))fail(422,"$key must be text.");$value=trim($value);if(($required&&$value==='')||text_length($value)>$max)fail(422,"Invalid $key (maximum $max characters).");return $value;}
function canonical_deck_title(string $value):string{$collapsed=preg_replace('/\s+/u',' ',trim($value));return $collapsed===null?trim($value):$collapsed;}
function normalized_deck_title(string $value):string{$value=canonical_deck_title($value);return function_exists('mb_strtolower')?mb_strtolower($value,'UTF-8'):strtolower($value);}
function assert_unique_reviewer_title(string $user,string $title,?string $excludeId=null):void{$sql='SELECT id,title FROM decks WHERE user_id=? AND deleted_at IS NULL';$params=[$user];if($excludeId!==null){$sql.=' AND id<>?';$params[]=$excludeId;}$key=normalized_deck_title($title);foreach(query($sql,$params)->fetchAll() as $row){if(normalized_deck_title((string)$row['title'])===$key)fail(409,'A deck with this title already exists. Choose a different title.');}}
function assert_unique_study_deck_title(string $user,string $title,?string $excludeId=null):void{$sql='SELECT id,title FROM study_decks WHERE user_id=?';$params=[$user];if($excludeId!==null){$sql.=' AND id<>?';$params[]=$excludeId;}$key=normalized_deck_title($title);foreach(query($sql,$params)->fetchAll() as $row){if(normalized_deck_title((string)$row['title'])===$key)fail(409,'A study deck with this title already exists. Choose a different title.');}}
function selection_json(array $data):?string{$selection=$data['selection']??null;if($selection===null)return null;if(!is_array($selection)||count($selection)>300)fail(422,'Invalid PDF selection.');$clean=[];foreach($selection as $rect){if(!is_array($rect))fail(422,'Invalid PDF selection.');$values=[];foreach(['x','y','width','height'] as $key){$value=$rect[$key]??null;if(!is_numeric($value)||!is_finite((float)$value))fail(422,'Invalid PDF selection.');$values[$key]=(float)$value;}if($values['x']<0||$values['y']<0||$values['width']<=0||$values['height']<=0||$values['x']+$values['width']>1.02||$values['y']+$values['height']>1.02)fail(422,'PDF selection is outside the page.');$clean[]=$values;}if(!$clean)fail(422,'Select text in the PDF first.');return json_encode($clean,JSON_THROW_ON_ERROR);}
function id_field(array $data,string $key='id'):string{$id=field($data,$key,32);if(!preg_match('/^[a-f0-9]{32}$/D',$id))fail(422,"Invalid $key.");return $id;}
function password_value(array $data,string $key):string{$value=$data[$key]??null;if(!is_string($value)||strlen($value)<8||strlen($value)>72||str_contains($value,"\0"))fail(422,'Passwords must contain 8–72 bytes.');return $value;}
function owned_deck(string $id,string $user):array{global $decksService;$row=$decksService->owned($id,$user);if(!$row)fail(404,'Reviewer not found.');return $row;}
function owned_document(string $id,string $user):array{global $materialsService;$row=$materialsService->owned($id,$user);if(!$row)fail(404,'Material not found.');return $row;}
class DatabaseSessionHandler implements SessionHandlerInterface{
 public function open($path,$name):bool{return true;}public function close():bool{return true;}
 public function read($id):string{$row=query('SELECT payload FROM web_sessions WHERE id=? AND expires_at>?',[$id,time()])->fetch();return $row?(string)$row['payload']:'';}
 public function write($id,$data):bool{query('INSERT INTO web_sessions (id,payload,expires_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),expires_at=VALUES(expires_at)',[$id,$data,$_SESSION['expires_at']??time()+7200]);return true;}
 public function destroy($id):bool{query('DELETE FROM web_sessions WHERE id=?',[$id]);return true;}public function gc($lifetime):int{return query('DELETE FROM web_sessions WHERE expires_at<?',[time()])->rowCount();}
}
const CSM_IDLE_TIMEOUT_SECONDS=1200;
session_set_save_handler(new DatabaseSessionHandler(),true);ini_set('session.use_only_cookies','1');ini_set('session.use_trans_sid','0');ini_set('session.use_strict_mode','1');session_name('csm_session');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>(bool)$config['secure_cookie'],'httponly'=>true,'samesite'=>'Lax']);session_start();
$csmTabSessionKey=request_tab_hash();
$GLOBALS['csmTabSessionKey']=$csmTabSessionKey;
if(is_string($csmTabSessionKey)&&$csmTabSessionKey!==''){
 $_SESSION['tab_sessions']=$_SESSION['tab_sessions']??[];
 if(!isset($_SESSION['tab_sessions'][$csmTabSessionKey])&&isset($_SESSION['user_id']))$_SESSION['tab_sessions'][$csmTabSessionKey]=[
  'user_id'=>$_SESSION['user_id'],'auth_version'=>$_SESSION['auth_version']??null,'expires_at'=>$_SESSION['expires_at']??null,
  'last_activity'=>$_SESSION['last_activity']??null,'csrf'=>$_SESSION['csrf']??bin2hex(random_bytes(32)),'idle_logout'=>!empty($_SESSION['idle_logout']),
 ];
 $tabContext=$_SESSION['tab_sessions'][$csmTabSessionKey]??['user_id'=>null,'auth_version'=>null,'expires_at'=>null,'last_activity'=>null,'csrf'=>bin2hex(random_bytes(32)),'idle_logout'=>false];
 foreach(['user_id','auth_version','expires_at','last_activity','csrf'] as $field){if(array_key_exists($field,$tabContext))$_SESSION[$field]=$tabContext[$field];else unset($_SESSION[$field]);}
 if(!empty($tabContext['idle_logout']))$_SESSION['idle_logout']=true;else unset($_SESSION['idle_logout']);
}
$sessionTimedOut=false;
$sessionExpired=($_SESSION['expires_at']??PHP_INT_MAX)<=time();
$idleExpired=isset($_SESSION['user_id'])&&isset($_SESSION['last_activity'])&&(int)$_SESSION['last_activity']+CSM_IDLE_TIMEOUT_SECONDS<=time();
if($sessionExpired||$idleExpired){foreach(['user_id','auth_version','expires_at','last_activity'] as $field)unset($_SESSION[$field]);$_SESSION['csrf']=bin2hex(random_bytes(32));unset($_SESSION['idle_logout']);$sessionTimedOut=$idleExpired;}
if($sessionTimedOut)$_SESSION['idle_logout']=true;
$_SESSION['csrf']=$_SESSION['csrf']??bin2hex(random_bytes(32));
if(isset($_SESSION['user_id'])&&($_GET['r']??'')!=='auth/session')$_SESSION['last_activity']=time();
function csrf():void{if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))fail(403,'Invalid CSRF token. Reload and try again.');}
function recovery_delivery_configured():bool{
 global $config;
 $secret=(string)($config['mailer_secret']??'');$service=parse_url((string)($config['mailer_url']??''));$app=parse_url((string)($config['app_base_url']??''));
 $localHosts=['127.0.0.1','localhost'];
 $validService=is_array($service)&&($service['scheme']??'')==='http'&&in_array(strtolower($service['host']??''),$localHosts,true)&&isset($service['port'])&&($service['path']??'')==='/send'&&empty($service['user'])&&empty($service['pass'])&&empty($service['query'])&&empty($service['fragment']);
 $localApp=is_array($app)&&($app['scheme']??'')==='http'&&in_array(strtolower($app['host']??''),$localHosts,true);
 $secureApp=is_array($app)&&($app['scheme']??'')==='https'&&isset($app['host']);
 $httpsRequired=($config['app_env']??'local')==='production';
 return strlen($secret)>=32&&!str_starts_with($secret,'replace-')&&$validService&&($localApp||$secureApp)&&(!$httpsRequired||$secureApp)&&empty($app['user'])&&empty($app['pass'])&&empty($app['query'])&&empty($app['fragment']);
}
function throttle_allows(string $bucket,int $limit,int $window):bool{$now=time();$cutoff=$now-$window;query('INSERT INTO auth_attempts (bucket,attempts,window_start) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(window_start<=?,1,attempts+1),window_start=IF(window_start<=?,VALUES(window_start),window_start)',[$bucket,$now,$cutoff,$cutoff]);return (int)query('SELECT attempts FROM auth_attempts WHERE bucket=?',[$bucket])->fetchColumn()<=$limit;}
function send_password_recovery_email(string $email,string $url):bool{global $config;if(!recovery_delivery_configured())return false;$payload=json_encode(['to'=>$email,'resetUrl'=>$url,'expiresMinutes'=>30],JSON_THROW_ON_ERROR);$context=stream_context_create(['http'=>['method'=>'POST','header'=>'Content-Type: application/json'."\r\n".'Authorization: Bearer '.$config['mailer_secret'],'content'=>$payload,'timeout'=>0.25,'ignore_errors'=>true,'follow_location'=>0,'max_redirects'=>0]]);$response=@file_get_contents($config['mailer_url'],false,$context);if($response===false)return false;$status=$http_response_header[0]??'';$data=json_decode($response,true);return preg_match('/\s200\s/',$status)===1&&is_array($data)&&($data['sent']??false)===true;}
function request_tab_id():?string{$tab=$_SERVER['HTTP_X_CSM_TAB_ID']??null;if(!is_string($tab)&&in_array($_GET['r']??'', ['documents/file','admin/documents/file'],true))$tab=$_GET['tabId']??null;return is_string($tab)&&preg_match('/^[a-f0-9]{32}$/D',$tab)?$tab:null;}
function request_browser_id():?string{$browser=$_SERVER['HTTP_X_CSM_BROWSER_ID']??null;if(!is_string($browser)&&in_array($_GET['r']??'', ['documents/file','admin/documents/file'],true))$browser=$_GET['browserId']??null;return is_string($browser)&&preg_match('/^[a-f0-9]{32}$/D',$browser)?$browser:null;}
function request_tab_hash():?string{$tab=request_tab_id();return $tab?hash('sha256',$tab):null;}
function request_browser_hash():?string{$browser=request_browser_id();return $browser?hash('sha256',$browser):null;}
function same_origin_request():bool{
 $site=strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE']??''));
 if($site==='cross-site')return false;
 $origin=(string)($_SERVER['HTTP_ORIGIN']??'');
 if($origin==='')return true;
 $parsed=parse_url($origin);$hostHeader=(string)($_SERVER['HTTP_HOST']??'');$expected=parse_url('http://'.$hostHeader);
 if(!is_array($parsed)||!is_array($expected)||empty($parsed['host'])||empty($expected['host']))return false;
 $scheme=(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')?'https':'http';
 $originPort=(int)($parsed['port']??($parsed['scheme']==='https'?443:80));$expectedPort=(int)($expected['port']??($scheme==='https'?443:80));
 return strtolower((string)$parsed['scheme'])===$scheme&&strtolower((string)$parsed['host'])===strtolower((string)$expected['host'])&&$originPort===$expectedPort;
}
function tab_session_matches(string $user,?array $row=null):bool{$tabHash=request_tab_hash();$browserHash=request_browser_hash();if(!$tabHash||!$browserHash)return false;$row=$row??query('SELECT auth_version FROM users WHERE id=?',[$user])->fetch();if(!$row||(int)$row['auth_version']!==(int)($_SESSION['auth_version']??0))return false;query('INSERT IGNORE INTO user_active_tabs(user_id,browser_hash,active_tab_hash) VALUES(?,?,?)',[$user,$browserHash,$tabHash]);$active=query('SELECT active_tab_hash FROM user_active_tabs WHERE user_id=? AND browser_hash=?',[$user,$browserHash])->fetchColumn();$matches=is_string($active)&&hash_equals($active,$tabHash);if($matches)query('UPDATE user_active_tabs SET updated_at=UTC_TIMESTAMP(3) WHERE user_id=? AND browser_hash=? AND active_tab_hash=?',[$user,$browserHash,$tabHash]);return $matches;}
function user_id():string{$id=$_SESSION['user_id']??'';if(!$id&&isset($_SESSION['idle_logout']))fail(401,'Your account was signed out after 20 minutes of inactivity.',['code'=>'idle_timeout']);$row=$id?query('SELECT auth_version FROM users WHERE id=?',[$id])->fetch():false;if(!$row||(int)$row['auth_version']!==(int)($_SESSION['auth_version']??0))fail(401,'Your account was signed in on another device or tab. Please sign in again.',['code'=>'session_replaced']);if(!tab_session_matches($id,$row))fail(401,'Your account was signed in from another tab. Please sign in again.',['code'=>'another_tab']);return $id;}
function current_role(string $user):string{$role=query('SELECT role FROM users WHERE id=?',[$user])->fetchColumn();if(!is_string($role))fail(401,'Please sign in.');return $role;}
function audit_event(?string $actor,string $event,?string $target=null,array $details=[],string $targetType='user'):void{global $database;(new Admin($database))->audit($actor,$event,$target,$details,$targetType);}
function notify_user(string $recipient,string $type,string $title,string $message,?string $deckId=null):void{$slice=static fn(string $value,int $limit):string=>function_exists('mb_substr')?mb_substr($value,0,$limit,'UTF-8'):substr($value,0,$limit);query('INSERT INTO user_notifications(user_id,deck_id,notification_type,title,message) VALUES(?,?,?,?,?)',[$recipient,$deckId,$type,$slice($title,160),$slice($message,1000)]);}
function system_setting(string $key,string $default=''):string{$value=query('SELECT value_text FROM system_settings WHERE setting_key=?',[$key])->fetchColumn();return $value===false?$default:(string)$value;}
function maintenance_enabled():bool{return system_setting('maintenance_mode','0')==='1';}
function profile(string $user):array{global $users;return $users->profile($user);}
function activity(string $user,?string $deck,string $material,string $mode,string $screen,string $status,?float $accuracy=null):void{query('INSERT INTO study_activity (id,user_id,deck_id,material,mode,screen,status,accuracy) VALUES (?,?,?,?,?,?,?,?)',[uid(),$user,$deck,$material,$mode,$screen,$status,$accuracy]);}
function card_data(array $row):array{$opts=query('SELECT * FROM card_options WHERE card_id=? ORDER BY position',[$row['id']])->fetchAll();$correct=0;foreach($opts as $i=>$option)if((int)$option['is_correct']===1)$correct=$i;return ['id'=>$row['id'],'type'=>$row['type'],'prompt'=>$row['prompt'],'hint'=>$row['hint'],'correctAnswer'=>$row['correct_answer'],'alternates'=>$row['alternates'],'explanation'=>$row['explanation'],'options'=>array_column($opts,'answer_text'),'correctIndex'=>$correct];}
function deck_data(array $row):array{global $bombcardsService,$materialsService;$cards=array_map('card_data',$bombcardsService->forDeck($row['id']));$docs=$materialsService->byDeck($row['id']);$tabId=request_tab_id();$browserId=request_browser_id();foreach($docs as &$doc){$doc['deckId']=$row['id'];$doc['url']='api/index.php?r=documents/file&id='.$doc['id'].($tabId&&$browserId?'&tabId='.$tabId.'&browserId='.$browserId:'');}unset($doc);$shareRow=query('SELECT share_token,is_active FROM deck_shares WHERE deck_id=?',[$row['id']])->fetch();$shareInfo=null;if($shareRow){$shareInfo=['token'=>$shareRow['share_token'],'isActive'=>(bool)$shareRow['is_active'],'url'=>app_base_url().'/shared/deck/'.$shareRow['share_token']];}return ['id'=>$row['id'],'code'=>$row['title'],'title'=>$row['title'],'subject'=>$row['subject'],'category'=>$row['category'],'visibility'=>$row['visibility']??'inherit','owner'=>'You','lastModified'=>$row['updated_at'],'section'=>strtotime($row['updated_at'])>time()-604800?'recent':'older','cards'=>$cards,'documents'=>$docs,'share'=>$shareInfo];}
function save_card(array $data,string $deck,?string $id=null,int $position=0):string{global $bombcardsService;return $bombcardsService->save($data,$deck,$id,$position);}
function workspace(string $user):array{
 global $config,$decksService,$progressService,$bombstyleService,$users,$database;
 if(in_array(current_role($user),['admin','superadmin'],true))return ['profile'=>$users->profile($user),'decks'=>[],'activities'=>[],'stats'=>['decks'=>0,'cards'=>0,'documents'=>0,'decksTrend'=>0,'cardsTrend'=>0,'studyDays'=>0,'studyBestDays'=>0,'accuracy'=>0,'accuracyTrend'=>0,'activityChart'=>[],'arenaChart'=>[]],'sessions'=>[],'studyProgress'=>[],'aiConfigured'=>!empty($config['gemini_api_key'])];
 $decks=array_map('deck_data',$decksService->allForUser($user));
 $activities=query('SELECT id,deck_id AS deckId,material,mode,screen,status,accuracy,created_at FROM study_activity WHERE user_id=? ORDER BY created_at DESC LIMIT 100',[$user])->fetchAll();
 foreach($activities as &$a){$a['timestamp']=timestamp_ms($a['created_at']);$a['accuracy']=$a['accuracy']===null?'—':round((float)$a['accuracy']).'%';}
 $stats=query("SELECT COALESCE(MAX(max_streak),0) bestStreak,COALESCE(SUM(correct_count),0) correctCount,COALESCE(SUM(current_index),0) answerCount FROM arena_sessions WHERE user_id=? AND status<>'active'",[$user])->fetch();
 $stats['accuracy']=(int)$stats['answerCount']?round(100*$stats['correctCount']/$stats['answerCount']):0;$stats['decks']=count($decks);$stats['cards']=array_sum(array_map(fn($d)=>count($d['cards']),$decks));$stats['documents']=array_sum(array_map(fn($d)=>count($d['documents']),$decks));
 $monthStart=new DateTimeImmutable('first day of this month',new DateTimeZone('UTC'));$nextMonth=$monthStart->modify('+1 month');$lastMonth=$monthStart->modify('-1 month');
 $deckPeriod=query('SELECT SUM(created_at>=? AND created_at<?) current_count,SUM(created_at>=? AND created_at<?) previous_count FROM decks WHERE user_id=? AND deleted_at IS NULL',[$monthStart->format('Y-m-d H:i:s'),$nextMonth->format('Y-m-d H:i:s'),$lastMonth->format('Y-m-d H:i:s'),$monthStart->format('Y-m-d H:i:s'),$user])->fetch();
 $cardPeriod=query('SELECT SUM(c.created_at>=? AND c.created_at<?) current_count,SUM(c.created_at>=? AND c.created_at<?) previous_count FROM cards c JOIN decks d ON d.id=c.deck_id WHERE d.user_id=? AND d.deleted_at IS NULL',[$monthStart->format('Y-m-d H:i:s'),$nextMonth->format('Y-m-d H:i:s'),$lastMonth->format('Y-m-d H:i:s'),$monthStart->format('Y-m-d H:i:s'),$user])->fetch();
 $growth=static function($current,$previous):int{$current=(int)$current;$previous=(int)$previous;return $previous? (int)round(100*($current-$previous)/$previous):($current?100:0);};
 $stats['decksTrend']=$growth($deckPeriod['current_count'],$deckPeriod['previous_count']);$stats['cardsTrend']=$growth($cardPeriod['current_count'],$cardPeriod['previous_count']);
 $weekStart=new DateTimeImmutable('monday this week',new DateTimeZone('UTC'));$previousWeek=$weekStart->modify('-7 days');$nextWeek=$weekStart->modify('+7 days');
 $accuracyPeriods=query("SELECT (a.submitted_at>=?) current_week,SUM(a.result='correct') correct_count,COUNT(*) answer_count FROM arena_answers a JOIN arena_sessions s ON s.id=a.session_id WHERE s.user_id=? AND a.submitted_at>=? AND a.submitted_at<? GROUP BY (a.submitted_at>=?)",[$weekStart->format('Y-m-d H:i:s'),$user,$previousWeek->format('Y-m-d H:i:s'),$nextWeek->format('Y-m-d H:i:s'),$weekStart->format('Y-m-d H:i:s')])->fetchAll();
 $currentAccuracy=0;$previousAccuracy=0;foreach($accuracyPeriods as $period){$value=(int)$period['answer_count']?round(100*(int)$period['correct_count']/(int)$period['answer_count']):0;if((int)$period['current_week'])$currentAccuracy=$value;else $previousAccuracy=$value;}$stats['accuracyTrend']=$currentAccuracy-$previousAccuracy;
 $activityRows=query('SELECT DATE(created_at) activity_date,COUNT(*) activity_count FROM study_activity WHERE user_id=? AND created_at>=? AND created_at<? GROUP BY DATE(created_at)',[$user,$previousWeek->format('Y-m-d H:i:s'),$nextWeek->format('Y-m-d H:i:s')])->fetchAll();$activityCounts=[];foreach($activityRows as $row)$activityCounts[$row['activity_date']]=(int)$row['activity_count'];$stats['activityChart']=[];
 for($i=0;$i<7;$i++){$date=$weekStart->modify("+$i days");$previousDate=$date->modify('-7 days');$stats['activityChart'][]=['day'=>$date->format('D'),'current'=>$activityCounts[$date->format('Y-m-d')]??0,'previous'=>$activityCounts[$previousDate->format('Y-m-d')]??0];}
 $arenaRows=query('SELECT DATE(started_at) activity_date,COUNT(*) session_count FROM arena_sessions WHERE user_id=? AND started_at>=? AND started_at<? GROUP BY DATE(started_at)',[$user,$previousWeek->format('Y-m-d H:i:s'),$nextWeek->format('Y-m-d H:i:s')])->fetchAll();$arenaCounts=[];foreach($arenaRows as $row)$arenaCounts[$row['activity_date']]=(int)$row['session_count'];$stats['arenaChart']=[];
 for($i=0;$i<7;$i++){$date=$weekStart->modify("+$i days");$previousDate=$date->modify('-7 days');$stats['arenaChart'][]=['day'=>$date->format('D'),'current'=>$arenaCounts[$date->format('Y-m-d')]??0,'previous'=>$arenaCounts[$previousDate->format('Y-m-d')]??0];}
 $days=query('SELECT DISTINCT DATE(started_at) FROM arena_sessions WHERE user_id=? ORDER BY DATE(started_at)',[$user])->fetchAll(PDO::FETCH_COLUMN);$streak=0;$day=gmdate('Y-m-d');if(!in_array($day,$days,true))$day=gmdate('Y-m-d',time()-86400);while(in_array($day,$days,true)){$streak++;$day=gmdate('Y-m-d',strtotime($day)-86400);}$stats['studyDays']=$streak;
 $best=0;$run=0;$previousDay=null;foreach($days as $date){$run=$previousDay!==null&&strtotime($date)===strtotime($previousDay.' +1 day')?$run+1:1;$best=max($best,$run);$previousDay=$date;}$stats['studyBestDays']=$best;
 $sessions=$bombstyleService->history($user);$sessions=array_map(fn($s)=>['id'=>$s['id'],'deckId'=>$s['deck_id'],'title'=>$s['deck_title'],'difficulty'=>$s['difficulty'],'status'=>$s['status'],'correctCount'=>(int)$s['correct_count'],'answered'=>(int)$s['current_index'],'bestStreak'=>(int)$s['max_streak'],'started_at'=>$s['started_at'],'ended_at'=>$s['ended_at']],$sessions);
 $achievements=(new Achievements($database))->sync($user,$stats,$sessions);
 return ['profile'=>$users->profile($user),'decks'=>$decks,'activities'=>$activities,'stats'=>$stats,'sessions'=>$sessions,'achievements'=>$achievements,'studyProgress'=>$progressService->forUser($user),'aiConfigured'=>!empty($config['gemini_api_key'])];
}
