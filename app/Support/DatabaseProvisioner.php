<?php

namespace App\Support;

use App\Models\Server;
use App\Models\ServerDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Crea, cambia la contraseña y borra las bases de datos de los clientes en la MariaDB del VPS.
 * Usa la conexión "provisioner" (un usuario de MariaDB que solo puede tocar las bases srv%).
 * Cada base tiene su propio usuario, accesible desde los contenedores (remote) y desde 127.0.0.1
 * (para phpMyAdmin), con permisos solo sobre esa base.
 */
class DatabaseProvisioner
{
    public static function enabled(): bool
    {
        return ! Panel::demoMode() && (string) config('database.connections.provisioner.username') !== '';
    }

    private function sql(): \Illuminate\Database\Connection
    {
        if (! self::enabled()) {
            throw new RuntimeException('El aprovisionamiento de bases de datos no está configurado.');
        }

        return DB::connection('provisioner');
    }

    /** Nombre que escribe el cliente → solo minúsculas, números y _. */
    public static function cleanName(string $name): string
    {
        return trim(substr(preg_replace('/[^a-z0-9_]+/', '_', Str::lower(Str::ascii($name))), 0, 40), '_');
    }

    private function hosts(ServerDatabase $db): array
    {
        return array_values(array_unique([$db->remote, '127.0.0.1']));
    }

    private static function assertSafe(string $value, string $pattern): string
    {
        if (! preg_match($pattern, $value)) {
            throw new RuntimeException('Identificador no válido.');
        }

        return $value;
    }

    public function create(Server $server, string $name): ServerDatabase
    {
        $clean = self::cleanName($name);
        if ($clean === '') {
            throw new RuntimeException('Escribe un nombre con letras o números.');
        }
        $database = self::assertSafe("srv{$server->id}_{$clean}", '/^srv\d+_[a-z0-9_]{1,40}$/');
        if (ServerDatabase::where('database', $database)->exists()) {
            throw new RuntimeException('Ya existe una base de datos con ese nombre.');
        }
        do {
            $username = 'u'.$server->id.'_'.Str::lower(Str::random(8));
        } while (ServerDatabase::where('username', $username)->exists());
        self::assertSafe($username, '/^u\d+_[a-z0-9]{8}$/');
        $password = Str::password(24, symbols: false);

        $record = new ServerDatabase([
            'server_id' => $server->id,
            'database' => $database,
            'username' => $username,
            'password' => $password,
            'remote' => (string) config('panel.server_databases.remote', '172.18.%'),
        ]);
        $remote = self::assertSafe($record->remote, '/^[0-9a-zA-Z.%_:-]{1,60}$/');

        $sql = $this->sql();
        $pdo = $sql->getPdo();
        $sql->unprepared("CREATE DATABASE `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        try {
            foreach ($this->hosts($record) as $host) {
                $sql->unprepared("CREATE USER '{$username}'@'{$host}' IDENTIFIED BY ".$pdo->quote($password));
                $sql->unprepared("GRANT ALL PRIVILEGES ON `{$database}`.* TO '{$username}'@'{$host}'");
            }
        } catch (\Throwable $e) {
            $this->dropRaw($database, $username, $this->hosts($record));
            throw $e;
        }
        $record->save();

        return $record;
    }

    public function rotate(ServerDatabase $db): string
    {
        $password = Str::password(24, symbols: false);
        $sql = $this->sql();
        $user = self::assertSafe($db->username, '/^u\d+_[a-z0-9]{8}$/');
        foreach ($this->hosts($db) as $host) {
            $host = self::assertSafe($host, '/^[0-9a-zA-Z.%_:-]{1,60}$/');
            $sql->unprepared("ALTER USER '{$user}'@'{$host}' IDENTIFIED BY ".$sql->getPdo()->quote($password));
        }
        $db->forceFill(['password' => $password])->save();

        return $password;
    }

    public function drop(ServerDatabase $db): void
    {
        $this->dropRaw($db->database, $db->username, $this->hosts($db));
        $db->delete();
    }

    private function dropRaw(string $database, string $username, array $hosts): void
    {
        $sql = $this->sql();
        self::assertSafe($database, '/^srv\d+_[a-z0-9_]{1,40}$/');
        self::assertSafe($username, '/^u\d+_[a-z0-9]{8}$/');
        $sql->unprepared("DROP DATABASE IF EXISTS `{$database}`");
        foreach ($hosts as $host) {
            self::assertSafe($host, '/^[0-9a-zA-Z.%_:-]{1,60}$/');
            $sql->unprepared("DROP USER IF EXISTS '{$username}'@'{$host}'");
        }
    }

    /** Lo que ve el cliente en el panel. */
    public static function present(ServerDatabase $db, bool $withPassword = true): array
    {
        return [
            'id' => $db->id,
            'name' => $db->database,
            'driver' => 'mariadb',
            'user' => $db->username,
            'host' => (string) config('panel.server_databases.host_for_servers', '172.18.0.1'),
            'port' => (int) config('panel.server_databases.port', 3306),
            'password' => $withPassword ? $db->password : null,
            'created_at' => $db->created_at?->toIso8601String(),
        ];
    }
}
