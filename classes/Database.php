<?php
declare(strict_types=1);

final class Database {
    private PDO $connection;
    public function __construct(array $config) {
        $this->connection=new PDO($config['dsn'],$config['user'],$config['password'],[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES=>false,
        ]);
        $this->connection->exec("SET time_zone = '+00:00'");
    }
    public function getConnection(): PDO { return $this->connection; }
    public function query(string $sql,array $params=[]): PDOStatement {
        $statement=$this->connection->prepare($sql);
        $statement->execute($params);
        return $statement;
    }
    public function transaction(callable $action) {
        $this->connection->beginTransaction();
        try { $result=$action($this); $this->connection->commit(); return $result; }
        catch(Throwable $error) { if($this->connection->inTransaction())$this->connection->rollBack(); throw $error; }
    }
}
