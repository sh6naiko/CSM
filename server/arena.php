<?php
function arena_finish(array &$s,string $status):void{
 if($s['status']!=='active')return;
 $s['status']=$status;$s['paused']=0;
 query('UPDATE arena_sessions SET status=?,ended_at=CURRENT_TIMESTAMP(3) WHERE id=?',[$status,$s['id']]);
 $accuracy=$s['current_index']?round(100*$s['correct_count']/$s['current_index']):0;
 $activityId=query("SELECT id FROM study_activity WHERE user_id=? AND deck_id <=> ? AND material=? AND mode='Bombstyle Arena' AND screen='arena' AND status='In progress' AND created_at>=? ORDER BY created_at ASC LIMIT 1",[$s['user_id'],$s['deck_id'],$s['deck_title'],$s['started_at']])->fetchColumn();
 if(is_string($activityId))query('UPDATE study_activity SET status=?,accuracy=? WHERE id=?',[$status,$accuracy,$activityId]);
 else activity($s['user_id'],$s['deck_id'],$s['deck_title'],'Bombstyle Arena','arena',$status,$accuracy);
}
function arena_save(array $s):void{query('UPDATE arena_sessions SET remaining_ms=?,clock_at_ms=?,paused=?,status=?,current_index=?,correct_count=?,streak=?,max_streak=?,duration_ms=? WHERE id=?',[$s['remaining_ms'],$s['clock_at_ms'],$s['paused'],$s['status'],$s['current_index'],$s['correct_count'],$s['streak'],$s['max_streak'],$s['duration_ms'],$s['id']]);}
function arena_tick(array &$s):void{$now=now_ms();if($s['status']==='active'&&!(int)$s['paused']){$elapsed=max(0,$now-(int)$s['clock_at_ms']);$s['duration_ms']+=(int)min($elapsed,$s['remaining_ms']);$s['remaining_ms']=max(0,(int)$s['remaining_ms']-$elapsed);if($s['remaining_ms']===0){$p=(int)$s['current_index'];if(query('SELECT position FROM arena_questions WHERE session_id=? AND position=?',[$s['id'],$p])->fetch()){query("INSERT IGNORE INTO arena_answers (id,session_id,position,result,adjustment_seconds,remaining_ms) VALUES (?,?,?,'timeout',0,0)",[uid(),$s['id'],$p]);$s['current_index']++;}$GLOBALS['progressService']->record($s['user_id'],(string)(query('SELECT card_id FROM arena_questions WHERE session_id=? AND position=?',[$s['id'],$p])->fetchColumn()?:''),'unknown');arena_finish($s,'timeout');}}$s['clock_at_ms']=$now;}
function arena_view(array $s):array{$questions=query('SELECT snapshot FROM arena_questions WHERE session_id=? ORDER BY position',[$s['id']])->fetchAll(PDO::FETCH_COLUMN);$answers=query('SELECT position,result,adjustment_seconds adjustment,remaining_ms remainingMs,submitted_at FROM arena_answers WHERE session_id=? ORDER BY position',[$s['id']])->fetchAll();return ['id'=>$s['id'],'version'=>(int)$s['clock_at_ms'],'deckId'=>$s['deck_id'],'deckTitle'=>$s['deck_title'],'difficulty'=>$s['difficulty'],'startingSeconds'=>(int)$s['starting_seconds'],'remainingMs'=>(int)$s['remaining_ms'],'paused'=>(bool)$s['paused'],'status'=>$s['status'],'index'=>(int)$s['current_index'],'correct'=>(int)$s['correct_count'],'streak'=>(int)$s['streak'],'maxStreak'=>(int)$s['max_streak'],'durationMs'=>(int)$s['duration_ms'],'queue'=>array_map(fn($q)=>json_decode($q,true),$questions),'answers'=>$answers];}
function arena_locked(string $id,string $user):array{global $db;$db->beginTransaction();$s=query('SELECT * FROM arena_sessions WHERE id=? AND user_id=? FOR UPDATE',[$id,$user])->fetch();if(!$s)fail(404,'Session not found.');if($s['deck_id']&&query("SELECT id FROM decks WHERE id=? AND moderation_status='visible' AND deleted_at IS NULL",[$s['deck_id']])->fetchColumn()===false)fail(404,'Session not found.');arena_tick($s);return $s;}
function arena_stop_hidden_deck(string $deckId):void{foreach(query("SELECT * FROM arena_sessions WHERE deck_id=? AND status='active' FOR UPDATE",[$deckId])->fetchAll() as $session){arena_tick($session);arena_finish($session,'abandoned');arena_save($session);}}
function arena_normalize_answer(string $answer):string{$answer=preg_replace('/\s+/u',' ',trim($answer));return strtolower((string)$answer);}
function arena_answer_matches(array $card,string $answer):bool{
 $candidate=arena_normalize_answer($answer);$correct=arena_normalize_answer((string)($card['correctAnswer']??''));
 if(($card['type']??'')==='TRUE_FALSE')return in_array($candidate,['true','false'],true)&&$candidate===$correct;
 if(($card['type']??'')==='MULTIPLE_CHOICE'){
  $options=is_array($card['options']??null)?$card['options']:[];$index=isset($card['correctIndex'])?(int)$card['correctIndex']:-1;
  $optionCorrect=$index>=0&&isset($options[$index])?arena_normalize_answer((string)$options[$index]):'';
  return $candidate!==''&&($candidate===$correct||($optionCorrect!==''&&$candidate===$optionCorrect));
 }
 $accepted=array_merge([$correct],preg_split('/[,;\n]+/',(string)($card['alternates']??''),-1,PREG_SPLIT_NO_EMPTY));
 foreach($accepted as $value)if($candidate!==''&&$candidate===arena_normalize_answer((string)$value))return true;
 return false;
}
function arena_routes(string $route,string $method,string $user):void{
 global $db,$decksService,$bombcardsService,$bombstyleService,$progressService;
 if($route==='arena/start'&&$method==='POST'){
  $data=input();$deckId=id_field($data,'deckId');$deck=query("SELECT * FROM decks WHERE id=? AND user_id=? AND moderation_status='visible' AND deleted_at IS NULL",[$deckId,$user])->fetch();
  if(!$deck)$deck=query("SELECT d.* FROM decks d JOIN users u ON u.id=d.user_id JOIN profiles p ON p.user_id=d.user_id WHERE d.id=? AND u.role='user' AND u.banned_at IS NULL AND d.deleted_at IS NULL AND d.moderation_status='visible' AND (d.visibility='public' OR (d.visibility='inherit' AND p.deck_visibility='public'))",[$deckId])->fetch();
  if(!$deck)fail(404,'Reviewer not found or this deck is private.');
  $difficulty=field($data,'difficulty',10);$times=['easy'=>60,'normal'=>45,'hard'=>30];if(!isset($times[$difficulty]))fail(422,'Choose a difficulty.');$cards=$bombcardsService->forDeck($deck['id']);
  if(isset($data['retrySessionId'])){$old=$bombstyleService->owned(id_field($data,'retrySessionId'),$user);if(!$old||$old['status']==='active'||$old['deck_id']!==$deck['id'])fail(404,'Previous session not found.');$missed=query("SELECT q.card_id FROM arena_questions q JOIN arena_answers a ON a.session_id=q.session_id AND a.position=q.position WHERE q.session_id=? AND a.result<>'correct'",[$old['id']])->fetchAll(PDO::FETCH_COLUMN);$cards=array_values(array_filter($cards,fn($c)=>in_array($c['id'],$missed,true)));}
  if(!$cards)fail(422,'This reviewer has no playable Bombcards.');shuffle($cards);$db->beginTransaction();query('SELECT id FROM users WHERE id=? FOR UPDATE',[$user]);foreach(query("SELECT * FROM arena_sessions WHERE user_id=? AND status='active' FOR UPDATE",[$user])->fetchAll() as $old){arena_tick($old);arena_finish($old,'abandoned');arena_save($old);}$id=uid();$time=$times[$difficulty];query('INSERT INTO arena_sessions (id,user_id,deck_id,deck_title,difficulty,starting_seconds,remaining_ms,clock_at_ms) VALUES (?,?,?,?,?,?,?,?)',[$id,$user,$deck['id'],$deck['title'],$difficulty,$time,$time*1000,now_ms()]);activity($user,$deck['id'],$deck['title'],'Bombstyle Arena','arena','In progress');foreach($cards as $i=>$card)query('INSERT INTO arena_questions (session_id,position,card_id,snapshot) VALUES (?,?,?,?)',[$id,$i,$card['id'],json_encode(card_data($card),JSON_UNESCAPED_UNICODE)]);$s=query('SELECT * FROM arena_sessions WHERE id=?',[$id])->fetch();$view=arena_view($s);$db->commit();respond($view,201);
 }
 if($route==='arena/active'&&$method==='GET'){$s=$bombstyleService->activeForUser($user);if(!$s)respond(null);$s=arena_locked($s['id'],$user);arena_save($s);$view=arena_view($s);$db->commit();respond($view);}
 if($route==='arena/session'&&$method==='GET'){$s=arena_locked(id_field($_GET),$user);arena_save($s);$view=arena_view($s);$db->commit();respond($view);}
 if($route==='arena/answer'&&$method==='POST'){
  $data=input();$s=arena_locked(id_field($data),$user);$position=$data['position']??null;
  if(!is_int($position)||$position<0)fail(422,'Invalid answer.');
  $answerProvided=array_key_exists('answer',$data);
  if($answerProvided&&!is_string($data['answer']))fail(422,'Invalid answer.');
  $result=null;
  if($answerProvided){
   $snapshot=query('SELECT snapshot FROM arena_questions WHERE session_id=? AND position=?',[$s['id'],$position])->fetchColumn();
   $card=is_string($snapshot)?json_decode($snapshot,true):null;
   if(!is_array($card))fail(404,'Question not found.');
   $result=arena_answer_matches($card,(string)$data['answer'])?'correct':'wrong';
  } else {$result=field($data,'result',10);if(!in_array($result,['correct','wrong'],true))fail(422,'Invalid answer.');}
  $exists=query('SELECT result FROM arena_answers WHERE session_id=? AND position=?',[$s['id'],$position])->fetch();
  if(!$exists&&$s['status']==='active'){
   if($s['paused'])fail(409,'Resume this session first.');if($position!==(int)$s['current_index'])fail(409,'This is not the current question.');
   $q=query('SELECT card_id FROM arena_questions WHERE session_id=? AND position=?',[$s['id'],$position])->fetch();if(!$q)fail(404,'Question not found.');
   $delta=$result==='correct'?8:-5;$s['remaining_ms']=max(0,$s['remaining_ms']+$delta*1000);$s['current_index']++;$s['correct_count']+=(int)($result==='correct');$s['streak']=$result==='correct'?$s['streak']+1:0;$s['max_streak']=max($s['max_streak'],$s['streak']);
   query('INSERT INTO arena_answers (id,session_id,position,result,adjustment_seconds,remaining_ms) VALUES (?,?,?,?,?,?)',[uid(),$s['id'],$position,$result,$delta,$s['remaining_ms']]);if($q['card_id'])$progressService->record($user,$q['card_id'],$result==='correct'?'known':'unknown');
   $count=(int)query('SELECT COUNT(*) FROM arena_questions WHERE session_id=?',[$s['id']])->fetchColumn();if(!$s['remaining_ms'])arena_finish($s,'timeout');elseif($s['current_index']>=$count)arena_finish($s,'completed');
  }
  arena_save($s);$view=arena_view($s);$view['answerResult']=$result;$db->commit();respond($view);
 }
 if(in_array($route,['arena/answer','arena/pause','arena/resume','arena/abandon'],true)&&$method==='POST'){
  $data=input();$s=arena_locked(id_field($data),$user);
  if($route==='arena/answer'){$position=$data['position']??null;$result=field($data,'result',10);if(!is_int($position)||$position<0||!in_array($result,['correct','wrong'],true))fail(422,'Invalid answer.');$exists=query('SELECT result FROM arena_answers WHERE session_id=? AND position=?',[$s['id'],$position])->fetch();if(!$exists&&$s['status']==='active'){if($s['paused'])fail(409,'Resume this session first.');if($position!==(int)$s['current_index'])fail(409,'This is not the current question.');$q=query('SELECT card_id FROM arena_questions WHERE session_id=? AND position=?',[$s['id'],$position])->fetch();if(!$q)fail(404,'Question not found.');$delta=$result==='correct'?8:-5;$s['remaining_ms']=max(0,$s['remaining_ms']+$delta*1000);$s['current_index']++;$s['correct_count']+=(int)($result==='correct');$s['streak']=$result==='correct'?$s['streak']+1:0;$s['max_streak']=max($s['max_streak'],$s['streak']);query('INSERT INTO arena_answers (id,session_id,position,result,adjustment_seconds,remaining_ms) VALUES (?,?,?,?,?,?)',[uid(),$s['id'],$position,$result,$delta,$s['remaining_ms']]);if($q['card_id'])$progressService->record($user,$q['card_id'],$result==='correct'?'known':'unknown');$count=(int)query('SELECT COUNT(*) FROM arena_questions WHERE session_id=?',[$s['id']])->fetchColumn();if(!$s['remaining_ms'])arena_finish($s,'timeout');elseif($s['current_index']>=$count)arena_finish($s,'completed');}}
  elseif($s['status']==='active'){if($route==='arena/abandon')arena_finish($s,'abandoned');else$s['paused']=(int)($route==='arena/pause');}
  arena_save($s);$view=arena_view($s);$db->commit();respond($view);
 }
}
