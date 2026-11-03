<?php
declare(strict_types=1);
// Promote an existing account exactly once. This script is intentionally CLI-only.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
if($argc!==2){fwrite(STDERR,"Usage: php database/bootstrap-superadmin.php <existing-username-or-email>\n");exit(2);}
$login=trim((string)$argv[1]);
if($login===''||strlen($login)>254){fwrite(STDERR,"Provide an existing username or email address.\n");exit(2);}
$config=require dirname(__DIR__).'/server/config.local.php';
try{$pdo=new PDO($config['dsn'],$config['user'],$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);}
catch(Throwable $error){fwrite(STDERR,"Could not connect to MySQL; check server/config.local.php.\n");exit(1);}
$locked=(int)$pdo->query("SELECT GET_LOCK('csm-first-superadmin',10)")->fetchColumn();
if($locked!==1){fwrite(STDERR,"Could not acquire the one-time superadmin setup lock. Try again.\n");exit(1);}
try{
    $pdo->beginTransaction();
    // GET_LOCK serializes bootstrap invocations while the account table is inspected.
    $existing=(int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='superadmin'")->fetchColumn();
    if($existing>0){$pdo->rollBack();fwrite(STDERR,"A superadmin already exists; this bootstrap command cannot be reused.\n");exit(1);}
    $find=$pdo->prepare('SELECT id,username,role FROM users WHERE username=? OR email=? LIMIT 1 FOR UPDATE');
    $find->execute([$login,$login]);$account=$find->fetch();
    if(!$account){$pdo->rollBack();fwrite(STDERR,"No existing account matches that username or email. Create and verify the account first.\n");exit(1);}
    fwrite(STDOUT,"Promote existing account @{$account['username']} to the initial superadmin? This does not change its password. Type YES to continue: ");
    $answer=trim((string)fgets(STDIN));
    if($answer!=='YES'){$pdo->rollBack();fwrite(STDOUT,"No changes made.\n");exit(0);}
    $update=$pdo->prepare("UPDATE users SET role='superadmin' WHERE id=? AND role='user'");$update->execute([$account['id']]);
    if($update->rowCount()!==1){$pdo->rollBack();fwrite(STDERR,"Account was not a regular user; no changes made.\n");exit(1);}
    $event=$pdo->prepare("INSERT INTO security_events(actor_user_id,target_user_id,target_type,target_id,event_code,details_json) VALUES(NULL,?,'user',?,'initial_superadmin_bootstrap',?)");
    $event->execute([$account['id'],$account['id'],json_encode(['source'=>'cli_existing_account'],JSON_THROW_ON_ERROR)]);
    $pdo->commit();
    fwrite(STDOUT,"@{$account['username']} is now the initial superadmin. Sign out and back in to refresh the role in the interface.\n");
}catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();fwrite(STDERR,"Could not initialize the superadmin account. No password or credential data was changed.\n");exit(1);}
finally{$pdo->query("SELECT RELEASE_LOCK('csm-first-superadmin')");}
