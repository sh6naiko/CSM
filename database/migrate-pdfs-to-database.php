<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$configFile=dirname(__DIR__).'/server/config.local.php';
if(!is_file($configFile)){fwrite(STDERR,"Configure server/config.local.php before running this migration.\n");exit(1);}
$config=require $configFile;
try{$db=new PDO($config['dsn'],$config['user'],$config['password'],[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false,
]);}catch(Throwable $error){fwrite(STDERR,"Could not connect to MySQL.\n");exit(1);}
$root=realpath((string)$config['upload_dir']);
if($root===false){fwrite(STDERR,"The configured private upload directory does not exist.\n");exit(1);}
$select=$db->query('SELECT id,stored_name,size_bytes FROM documents WHERE file_data IS NULL ORDER BY created_at,id');
$update=$db->prepare('UPDATE documents SET file_data=? WHERE id=? AND file_data IS NULL');
$migrated=0;$missing=0;$tooLarge=0;$vercelLimit=4000000;
foreach($select as $row){
    $name=basename((string)$row['stored_name']);$path=$root.DIRECTORY_SEPARATOR.$name;
    if(!is_file($path)){$missing++;continue;}
    $size=filesize($path);
    if($size===false||$size>$vercelLimit){$tooLarge++;continue;}
    $contents=file_get_contents($path);
    if(!is_string($contents)||strlen($contents)!==$size){$missing++;continue;}
    $update->bindValue(1,$contents,PDO::PARAM_LOB);$update->bindValue(2,(string)$row['id']);$update->execute();
    if($update->rowCount()===1)$migrated++;
}
echo "Copied $migrated PDF(s) into MySQL. Skipped $missing missing file(s) and $tooLarge file(s) above the configured upload limit. Original files were kept.\n";
