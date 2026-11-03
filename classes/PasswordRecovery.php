<?php
declare(strict_types=1);

final class PasswordRecovery {
    public function __construct(private Database $db, private User $users) {}

    /** Creates a one-use reset token; the plaintext token is returned only for email delivery. */
    public function issue(string $email): ?array {
        return $this->db->transaction(function() use ($email): ?array {
            $user=$this->db->query('SELECT id,email FROM users WHERE email=? FOR UPDATE',[$email])->fetch();
            if(!$user)return null;

            $this->db->query('UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP(3) WHERE user_id=? AND used_at IS NULL',[$user['id']]);
            $token=bin2hex(random_bytes(32));
            $this->db->query('INSERT INTO password_reset_tokens (user_id,token_hash,expires_at) VALUES (?,?,?)',[
                $user['id'],hash('sha256',$token),gmdate('Y-m-d H:i:s',time()+1800)
            ]);
            return ['email'=>$user['email'],'token'=>$token];
        });
    }

    public function revoke(string $token): void {
        $this->db->query('UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP(3) WHERE token_hash=? AND used_at IS NULL',[hash('sha256',$token)]);
    }

    /** Checks a reset link before showing the password form without consuming it. */
    public function isUsable(string $token): bool {
        if(!preg_match('/^[a-f0-9]{64}$/D',$token))return false;
        $row=$this->db->query('SELECT expires_at,used_at FROM password_reset_tokens WHERE token_hash=?',[hash('sha256',$token)])->fetch();
        return $row && $row['used_at']===null && strtotime($row['expires_at'].' UTC')>time();
    }

    /** Consumes the token and changes the password atomically, invalidating old sessions. */
    public function consume(string $token,string $passwordHash,string $newPassword): void {
        if(!preg_match('/^[a-f0-9]{64}$/D',$token))fail(422,'This reset link is invalid. Request a new password reset link.');
        $this->db->transaction(function() use ($token,$passwordHash,$newPassword): void {
            $candidate=$this->db->query('SELECT user_id FROM password_reset_tokens WHERE token_hash=?',[hash('sha256',$token)])->fetch();
            if(!$candidate)fail(422,'This reset link is invalid. Request a new password reset link.');
            // Use the same user-then-token lock order as issue() to avoid reset/request deadlocks.
            $user=$this->db->query('SELECT id,password_hash FROM users WHERE id=? FOR UPDATE',[$candidate['user_id']])->fetch();
            if(!$user)fail(422,'This reset link is invalid. Request a new password reset link.');
            $row=$this->db->query('SELECT id,user_id,expires_at,used_at FROM password_reset_tokens WHERE token_hash=? FOR UPDATE',[hash('sha256',$token)])->fetch();
            if(!$row)fail(422,'This reset link is invalid. Request a new password reset link.');
            if($row['used_at']!==null)fail(422,'This reset link has already been used. You can sign in or request a new link.');
            if(strtotime($row['expires_at'].' UTC')<=time())fail(422,'This reset link has expired. Request a new password reset link.');
            if(password_verify($newPassword,(string)$user['password_hash']))fail(422,'You cannot reuse your current password. Choose a new password.');

            $used=$this->db->query('UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP(3) WHERE id=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP(3)',[$row['id']]);
            if($used->rowCount()!==1)fail(422,'This reset link has expired or has already been used. Request a new link.');
            $this->users->setPassword($row['user_id'],$passwordHash);
        });
    }
}
