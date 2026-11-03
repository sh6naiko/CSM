<?php
final class User {
    public function __construct(private Database $db) {}
    public function find(string $id): ?array { return $this->db->query('SELECT id,username,email,password_hash,auth_version FROM users WHERE id=?',[$id])->fetch() ?: null; }
    public function byUsername(string $username): ?array { return $this->db->query('SELECT * FROM users WHERE username=? LIMIT 1',[$username])->fetch() ?: null; }
    public function register(string $id,string $username,string $email,string $hash,string $firstName,?string $middleName,string $lastName): void {
        $this->db->transaction(function()use($id,$username,$email,$hash,$firstName,$middleName,$lastName){
            $this->db->query('INSERT INTO users (id,username,email,password_hash) VALUES (?,?,?,?)',[$id,$username,$email,$hash]);
            $this->db->query('INSERT INTO profiles (user_id,display_name,first_name,middle_name,last_name) VALUES (?,?,?,?,?)',[$id,$username,$firstName,$middleName,$lastName]);
        });
    }
    public function setPassword(string $id,string $hash): void { $this->db->query('UPDATE users SET password_hash=?,auth_version=auth_version+1,locked_until=NULL WHERE id=?',[$hash,$id]); }
    public function profile(string $id): array {
        $row=$this->db->query('SELECT u.username,u.email,u.role,u.locked_until,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=?',[$id])->fetch();
        if(!$row)fail(404,'Account not found.');return ['id'=>$id,'username'=>$row['username'],'email'=>$row['email'],'role'=>$row['role'],'lockedUntil'=>$row['locked_until'],'displayName'=>$row['display_name'],'firstName'=>$row['first_name'],'middleName'=>$row['middle_name'],'lastName'=>$row['last_name'],'avatar'=>$row['avatar'],'deckVisibility'=>$row['deck_visibility'] ?? 'private','nameChangedAt'=>timestamp_ms($row['name_changed_at'])];
    }
}
