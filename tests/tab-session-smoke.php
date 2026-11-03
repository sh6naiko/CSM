<?php
declare(strict_types=1);

$base=getenv('CSM_TEST_URL')?:'http://127.0.0.1:8080/api/index.php?r=';
$config=require dirname(__DIR__).'/server/config.local.php';
$suffix=bin2hex(random_bytes(5));
$username='tabqa'.$suffix;
$email=$username.'@example.invalid';
$password='TabSmoke-2026!';
$cookie=tempnam(sys_get_temp_dir(),'csm-tab-cookie-');
$browserId=bin2hex(random_bytes(16));
$first=['tab'=>bin2hex(random_bytes(16)),'browser'=>$browserId,'csrf'=>'','cookie'=>$cookie];
$second=['tab'=>bin2hex(random_bytes(16)),'browser'=>$browserId,'csrf'=>'','cookie'=>$cookie];
$otherCookie=tempnam(sys_get_temp_dir(),'csm-other-cookie-');
$otherBrowser=['tab'=>bin2hex(random_bytes(16)),'browser'=>bin2hex(random_bytes(16)),'csrf'=>'','cookie'=>$otherCookie];
$userId=null;

function tab_call(array &$client,string $route,string $method='GET',?array $data=null):array{
    global $base;
    $ch=curl_init($base.$route);
    $headers=['Accept: application/json','X-CSM-Tab-Id: '.$client['tab'],'X-CSM-Browser-Id: '.$client['browser']];
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_COOKIEFILE=>$client['cookie'],CURLOPT_COOKIEJAR=>$client['cookie'],CURLOPT_CUSTOMREQUEST=>$method]);
    if($data!==null){$headers[]='Content-Type: application/json';curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($data,JSON_THROW_ON_ERROR));}
    if($method!=='GET'&&$client['csrf']!=='')$headers[]='X-CSRF-Token: '.$client['csrf'];
    curl_setopt($ch,CURLOPT_HTTPHEADER,$headers);
    $body=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);$error=curl_error($ch);curl_close($ch);
    if($body===false)throw new RuntimeException('API request failed: '.$error);
    $json=json_decode($body,true);if(is_array($json)&&isset($json['csrf']))$client['csrf']=$json['csrf'];
    return [$status,is_array($json)?$json:[],(string)$body];
}
function tab_expect(array &$client,string $route,string $method='GET',?array $data=null,int $expected=200):array{
    [$status,$json,$body]=tab_call($client,$route,$method,$data);
    if($status!==$expected)throw new RuntimeException("$route expected HTTP $expected; got $status: $body");
    return $json;
}

try{
    $session=tab_expect($first,'auth/session');
    tab_expect($first,'auth/register','POST',['username'=>$username,'email'=>$email,'password'=>$password,'firstName'=>'Tab','lastName'=>'Tester'],201);
    tab_expect($first,'auth/login','POST',['username'=>$username,'password'=>$password]);
    if(tab_expect($first,'auth/session')['authenticated']!==true)throw new RuntimeException('The first tab was not authenticated after sign-in.');

    if(tab_expect($second,'auth/session')['authenticated']!==false)throw new RuntimeException('A second tab inherited the first tab’s active login.');
    tab_expect($second,'auth/login','POST',['username'=>$username,'password'=>$password]);
    if(tab_expect($first,'auth/session')['authenticated']!==false)throw new RuntimeException('The previous tab remained authenticated after the second-tab sign-in.');
    [$status]=tab_call($first,'workspace');
    if($status!==401)throw new RuntimeException('The previous tab was able to access the workspace (HTTP '.$status.').');
    $first['csrf']='stale-test-csrf';
    [$status]=tab_call($first,'profile','PATCH',['avatar'=>'slate']);
    if($status!==401)throw new RuntimeException('The previous tab was not rejected before CSRF validation (HTTP '.$status.').');
    if(tab_expect($second,'auth/session')['authenticated']!==true)throw new RuntimeException('The latest tab did not remain authenticated.');
    tab_expect($otherBrowser,'auth/session');
    tab_expect($otherBrowser,'auth/login','POST',['username'=>$username,'password'=>$password]);
    if(tab_expect($second,'auth/session')['authenticated']!==true)throw new RuntimeException('Signing in from another browser incorrectly invalidated this browser’s active tab.');
    tab_expect($otherBrowser,'auth/logout','POST',[]);
    tab_expect($second,'auth/logout','POST',[]);

    echo "PASS separate tab IDs sharing one PHP session cookie; same-browser stale reads/writes are rejected, and another browser remains independent.\n";
}finally{
    try{
        $pdo=new PDO($config['dsn'],$config['user'],$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        $lookup=$pdo->prepare('SELECT id FROM users WHERE username=?');$lookup->execute([$username]);$userId=$lookup->fetchColumn();
        if($userId){$pdo->prepare('DELETE FROM security_events WHERE actor_user_id=? OR target_user_id=?')->execute([$userId,$userId]);$pdo->prepare('DELETE FROM auth_attempts WHERE bucket=?')->execute([hash('sha256','account-login:user:'.$userId)]);$pdo->prepare('DELETE FROM users WHERE id=?')->execute([$userId]);}
        foreach([$cookie,$otherCookie] as $cookiePath){if(!is_file($cookiePath))continue;foreach(file($cookiePath,FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $line){$parts=preg_split('/\s+/',trim($line));if(count($parts)>=7&&$parts[5]==='csm_session'){$pdo->prepare('DELETE FROM web_sessions WHERE id=?')->execute([$parts[6]]);break;}}}
    }catch(Throwable $ignored){}
    if(is_file($cookie))unlink($cookie);
    if(is_file($otherCookie))unlink($otherCookie);
}
