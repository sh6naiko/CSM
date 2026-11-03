<?php
final class Bombcard {
    public function __construct(private Database $db) {}
    public function forDeck(string $deckId): array { return $this->db->query('SELECT * FROM cards WHERE deck_id=? ORDER BY position,created_at,id',[$deckId])->fetchAll(); }
    public function owned(string $id,string $deckId): ?array { return $this->db->query('SELECT * FROM cards WHERE id=? AND deck_id=?',[$id,$deckId])->fetch() ?: null; }
    public function delete(string $id,string $deckId): int { return $this->db->query('DELETE FROM cards WHERE id=? AND deck_id=?',[$id,$deckId])->rowCount(); }
    public function save(array $data,string $deck,?string $id,int $position): string {
        $type=field($data,'type',32);
        if(!in_array($type,['MULTIPLE_CHOICE','TRUE_FALSE','IDENTIFICATION'],true))fail(422,'Invalid Bombcard type.');
        $prompt=field($data,'prompt',10000); $hint=field($data,'hint',500,false); $answer=field($data,'correctAnswer',10000);
        $alternates=field($data,'alternates',10000,false); $explanation=field($data,'explanation',10000,false); $options=$data['options']??[]; $correct=$data['correctIndex']??0;
        if($type==='MULTIPLE_CHOICE'){
            if(!is_array($options)||count($options)<2||count($options)>8||!is_int($correct)||!isset($options[$correct]))fail(422,'Choose 2–8 options and a correct answer.');
            foreach($options as &$option)$option=field(['option'=>$option],'option',2000); unset($option); $answer=$options[$correct];
        } elseif($type==='TRUE_FALSE'){
            $normalizedAnswer=strtoupper(trim($answer));
            if(!in_array($normalizedAnswer,['TRUE','FALSE'],true))fail(422,'Choose True or False as the correct answer.');
            $answer=$normalizedAnswer==='TRUE'?'True':'False'; $options=['True','False']; $correct=$normalizedAnswer==='TRUE'?0:1;
        } else $options=[];
        if($id){if(!$this->owned($id,$deck))fail(404,'Bombcard not found.');$this->db->query('UPDATE cards SET type=?,prompt=?,hint=?,correct_answer=?,alternates=?,explanation=?,position=? WHERE id=?',[$type,$prompt,$hint,$answer,$alternates,$explanation,$position,$id]);$this->db->query('DELETE FROM card_options WHERE card_id=?',[$id]);}
        else{$id=uid();$this->db->query('INSERT INTO cards (id,deck_id,type,prompt,hint,correct_answer,alternates,explanation,position) VALUES (?,?,?,?,?,?,?,?,?)',[$id,$deck,$type,$prompt,$hint,$answer,$alternates,$explanation,$position]);}
        foreach($options as $i=>$option)$this->db->query('INSERT INTO card_options (card_id,position,answer_text,is_correct) VALUES (?,?,?,?)',[$id,$i,$option,(int)($i===$correct)]);
        $this->db->query('UPDATE decks SET updated_at=CURRENT_TIMESTAMP(3) WHERE id=?',[$deck]);return $id;
    }
}
