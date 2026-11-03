<?php
declare(strict_types=1);

// Run while maintenance mode is enabled. This test never changes the setting.
$base=getenv('CSM_TEST_URL')?:'http://127.0.0.1:8080/api/index.php?r=';
$config=require dirname(__DIR__).'/server/config.local.php';
$suffix=bin2hex(random_bytes(4));
$password='MaintenanceSmoke-2026!';
$roles=['user','admin','superadmin'];
$clients=[];$accounts=[];$cookies=[];

function maintenance_call(array &$client,string $route,string $method='GET',?array $data=null):array{
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
function maintenance_expect(array &$client,string $route,string $method='GET',?array $data=null,int $expected=200):array{
    [$status,$json,$body]=maintenance_call($client,$route,$method,$data);
    if($status!==$expected)throw new RuntimeException("$route expected HTTP $expected; got $status: $body");
    return $json;
}

try{
    $pdo=new PDO($config['dsn'],$config['user'],$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $setting=$pdo->prepare('SELECT value_text FROM system_settings WHERE setting_key=?');$setting->execute(['maintenance_mode']);
    if($setting->fetchColumn()!=='1')throw new RuntimeException('Enable maintenance mode first; this smoke test does not change system settings.');

    foreach($roles as $role){
        $name='mqa'.$suffix.$role;
        $client=['cookie'=>tempnam(sys_get_temp_dir(),'csm-maint-cookie-'),'csrf'=>'','tab'=>bin2hex(random_bytes(16)),'browser'=>bin2hex(random_bytes(16))];
        $clients[]=$client;$index=array_key_last($clients);$cookies[]=$client['cookie'];$accounts[$role]=$name;
        maintenance_expect($clients[$index],'auth/session');
        maintenance_expect($clients[$index],'auth/register','POST',['username'=>$name,'email'=>$name.'@example.invalid','password'=>$password,'firstName'=>'Maintenance','lastName'=>'Tester'],201);
        $update=$pdo->prepare('UPDATE users SET role=? WHERE username=?');$update->execute([$role,$name]);
        maintenance_expect($clients[$index],'auth/login','POST',['username'=>$name,'password'=>$password]);
        if(maintenance_expect($clients[$index],'auth/session')['profile']['role']!==$role)throw new RuntimeException("The test account did not receive the expected $role role.");
    }

    maintenance_expect($clients[0],'workspace','GET',null,503);
    maintenance_expect($clients[1],'workspace');
    maintenance_expect($clients[1],'admin/dashboard');
    maintenance_expect($clients[1],'admin/settings','GET',null,403);
    maintenance_expect($clients[2],'workspace');
    maintenance_expect($clients[2],'admin/settings');
    echo "PASS maintenance mode denies regular users while admin and superadmin retain workspace access; superadmin settings remain restricted.\n";
}finally{
    try{
        $pdo??=new PDO($config['dsn'],$config['user'],$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        foreach($accounts as $name){
            $find=$pdo->prepare('SELECT id FROM users WHERE username=?');$find->execute([$name]);$id=$find->fetchColumn();
            if($id){
                $pdo->prepare('DELETE FROM security_events WHERE actor_user_id=? OR target_user_id=?')->execute([$id,$id]);
                $pdo->prepare('DELETE FROM auth_attempts WHERE bucket IN (?,?)')->execute([hash('sha256','account-login:user:'.$id),hash('sha256','account-login:identifier:'.strtolower($name))]);
                $pdo->prepare('DELETE FROM users WHERE id=?')->execute([$id]);
            }
        }
        foreach($cookies as $cookiePath){
            if(!is_file($cookiePath))continue;
            foreach(file($cookiePath,FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $line){$parts=preg_split('/\s+/',trim($line));if(count($parts)>=7&&$parts[5]==='csm_session'){$pdo->prepare('DELETE FROM web_sessions WHERE id=?')->execute([$parts[6]]);break;}}
        }
    }catch(Throwable $ignored){}
    foreach($cookies as $cookiePath)if(is_file($cookiePath))unlink($cookiePath);
}
