<?php
declare(strict_types=1);

final class Admin {
    public function __construct(private Database $db) {}

    /** Audit details must be a small allow-listed summary; never pass request payloads or secrets. */
    public function audit(?string $actor, string $event, ?string $target=null, array $details=[], string $targetType='user'): void {
        $ip=(string)($_SERVER['REMOTE_ADDR']??'');
        $ipHash=$ip!==''?hash('sha256',$ip):null;
        $json=$details?json_encode($details,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE|JSON_THROW_ON_ERROR):null;
        if($json!==null&&strlen($json)>2000)throw new RuntimeException('Audit details are too large.');
        if(!in_array($targetType,['user','deck','system'],true))$targetType='system';
        $targetUser=$targetType==='user'?$target:null;
        $this->db->query('INSERT INTO security_events(actor_user_id,target_user_id,target_type,target_id,event_code,ip_hash,details_json) VALUES(?,?,?,?,?,?,?)',[$actor,$targetUser,$targetType,$target,$event,$ipHash,$json]);
    }

    public function dateRange(string $from, string $to, int $maxDays=366): array {
        $start=DateTimeImmutable::createFromFormat('!Y-m-d',$from,new DateTimeZone('UTC'));
        $end=DateTimeImmutable::createFromFormat('!Y-m-d',$to,new DateTimeZone('UTC'));
        $errors=DateTimeImmutable::getLastErrors();
        if(!$start||!$end||($errors!==false&&($errors['warning_count']||$errors['error_count']))||$end<$start||$start->diff($end)->days>=$maxDays)fail(422,'Choose a valid date range within the allowed period.');
        return [$start->format('Y-m-d 00:00:00'),$end->modify('+1 day')->format('Y-m-d 00:00:00')];
    }

    public function dashboard(string $from, string $to): array {
        $websiteStartDate=(string)($this->db->query('SELECT DATE(MIN(created_at)) FROM users')->fetchColumn()?:gmdate('Y-m-d'));
        [$start,$end]=$this->dateRange($from,$to,36500);
        $totals=$this->db->query('SELECT
          (SELECT COUNT(*) FROM users) users,
          (SELECT COUNT(DISTINCT user_id) FROM user_active_tabs WHERE updated_at>=UTC_TIMESTAMP(3)-INTERVAL 5 MINUTE) activeNow,
          (SELECT COUNT(*) FROM decks WHERE deleted_at IS NULL) decks,
          (SELECT COUNT(*) FROM documents) documents,
          (SELECT COALESCE(SUM(size_bytes),0) FROM documents) storageBytes,
          (SELECT COUNT(*) FROM arena_sessions) arenaSessions')->fetch();
        if($end<=$websiteStartDate.' 00:00:00'){
            $period=array_fill_keys(['newUsers','activeUsers','newDecks','uploads','sessions','completedSessions'],0);
            return ['from'=>substr($start,0,10),'to'=>gmdate('Y-m-d',strtotime($end.' UTC')-86400),'startDate'=>$websiteStartDate,'beforeLaunch'=>true,'totals'=>array_map('intval',$totals),'period'=>$period,'days'=>[]];
        }
        $period=$this->db->query('SELECT
          (SELECT COUNT(*) FROM users WHERE created_at>=? AND created_at<?) newUsers,
          (SELECT COUNT(DISTINCT user_id) FROM study_activity WHERE created_at>=? AND created_at<?) activeUsers,
          (SELECT COUNT(*) FROM decks WHERE deleted_at IS NULL AND created_at>=? AND created_at<?) newDecks,
          (SELECT COUNT(*) FROM documents WHERE created_at>=? AND created_at<?) uploads,
          (SELECT COUNT(*) FROM arena_sessions WHERE started_at>=? AND started_at<?) sessions,
          (SELECT COUNT(*) FROM arena_sessions WHERE started_at>=? AND started_at<? AND status=\'completed\') completedSessions',[$start,$end,$start,$end,$start,$end,$start,$end,$start,$end,$start,$end])->fetch();
        $series=[];
        foreach([
            ['study_activity','created_at','activeUsers','COUNT(DISTINCT user_id)'],
            ['decks','created_at','decks','COUNT(*)'],
            ['documents','created_at','uploads','COUNT(*)'],
            ['arena_sessions','started_at','arenaSessions','COUNT(*)'],
        ] as [$table,$date,$key,$aggregate]){
            $rows=$this->db->query("SELECT DATE($date) day,$aggregate amount FROM $table WHERE $date>=? AND $date<? GROUP BY DATE($date)",[$start,$end])->fetchAll();
            foreach($rows as $row){$day=(string)$row['day'];$series[$day]??=['date'=>$day,'activeUsers'=>0,'decks'=>0,'uploads'=>0,'arenaSessions'=>0];$series[$day][$key]=(int)$row['amount'];}
        }
        ksort($series);
        return ['from'=>substr($start,0,10),'to'=>gmdate('Y-m-d',strtotime($end.' UTC')-86400),'startDate'=>$websiteStartDate,'beforeLaunch'=>false,'totals'=>array_map('intval',$totals),'period'=>array_map('intval',$period),'days'=>array_values($series)];
    }
}
