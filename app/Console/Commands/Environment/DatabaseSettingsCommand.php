<?php

namespace App\Console\Commands\Environment;

use App\Traits\EnvironmentWriterTrait;
use Illuminate\Console\Command;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\DatabaseManager;

class DatabaseSettingsCommand extends Command
{
    use EnvironmentWriterTrait;

    public const DATABASE_DRIVERS = [
        'sqlite' => 'SQLite (recommended)',
        'mariadb' => 'MariaDB',
        'mysql' => 'MySQL',
    ];

    protected $description = 'Configure database settings for the cinammon.';

    protected $signature = 'p:environment:database
                            {--driver= : The database driver backend to use.}
                            {--database= : The database to use.}
                            {--host= : The connection address for the MySQL/ MariaDB server.}
                            {--port= : The connection port for the MySQL/ MariaDB server.}
                            {--username= : Username to use when connecting to the MySQL/ MariaDB server.}
                            {--password= : Password to use for the MySQL/ MariaDB database.}';

    protected array $variables = [];

    public function __construct(private DatabaseManager $database, private Kernel $console)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        // Cyber Banner
        if ($this->hasGum()) {
            system(<<<'EOD'
gum style \
--border double \
--margin "1 2" \
--padding "1 4" \
--align center \
--width 60 \
--border-foreground "#ff00ff" \
--foreground "#00ffe0" \
":: CINAMMON DATABASE SETUP ::

> Protocol: CYBER_ENV_INIT
> Mode: INTERACTIVE
> Status: READY"
EOD);
        } else {
            $this->line("\033[1;95m:: CINAMMON DATABASE SETUP ::\033[0m");
            $this->line("\033[1;96m> Protocol: CYBER_ENV_INIT\033[0m");
            $this->line("\033[1;96m> Mode: INTERACTIVE\033[0m");
            $this->line("\033[1;96m> Status: READY\033[0m");
        }

        if (!$this->gumConfirm("¿Continuar con la configuración?")) {
            $this->error("Operación cancelada por el usuario.");
            return 1;
        }

        $driver = $this->gumChoose(['sqlite', 'mariadb', 'mysql']);
        if (!$driver) {
            $this->error("No se seleccionó ningún driver.");
            return 1;
        }

        $this->variables['DB_CONNECTION'] = $driver;

        if (in_array($driver, ['mysql', 'mariadb'])) {
            $this->variables['DB_HOST'] = $this->gumInput('Host: ', '127.0.0.1');
            $this->variables['DB_PORT'] = $this->gumInput('Puerto: ', '3306');
            $this->variables['DB_DATABASE'] = $this->gumInput('Base de datos: ', 'cinammon');
            $this->variables['DB_USERNAME'] = $this->gumInput('Usuario: ', 'root');
            $this->variables['DB_PASSWORD'] = $this->gumInput('Contraseña: ', '', true);

            try {
                config()->set('database.connections._gum_test', [
                    'driver' => $driver,
                    'host' => $this->variables['DB_HOST'],
                    'port' => $this->variables['DB_PORT'],
                    'database' => $this->variables['DB_DATABASE'],
                    'username' => $this->variables['DB_USERNAME'],
                    'password' => $this->variables['DB_PASSWORD'],
                    'charset' => 'utf8mb4',
                    'collation' => 'utf8mb4_unicode_ci',
                    'strict' => true,
                ]);

                $this->line("\033[1;94m[STATUS]\033[0m Probando conexión con {$driver}...");
                $this->database->connection('_gum_test')->getPdo();
                $this->line("\033[1;92m[OK]\033[0m Conexión exitosa.");
            } catch (\PDOException $e) {
                $this->error("[ERROR] Conexión fallida: " . $e->getMessage());

                if ($this->gumConfirm("¿Intentar de nuevo?")) {
                    $this->database->disconnect('_gum_test');
                    return $this->handle();
                }

                return 1;
            }
        } elseif ($driver === 'sqlite') {
            $this->variables['DB_DATABASE'] = $this->gumInput('Ruta del archivo .sqlite: ', 'database.sqlite');
        }

        if (!$this->gumConfirm("¿Guardar configuración en .env?")) {
            $this->error("No se guardó la configuración.");
            return 1;
        }

        $this->writeToEnvironment($this->variables);
        $this->line("\033[1;92m[OK]\033[0m Configuración guardada correctamente.");
        $this->line("\033[1;90m:: Proceso completado. Puedes cerrar la terminal.\033[0m");

        return 0;
    }

    protected function gumConfirm(string $message): bool
    {
        if ($this->hasGum()) {
            exec("gum confirm \"$message\"", $_, $exitCode);
            return $exitCode === 0;
        }

        return $this->confirm($message);
    }

    protected function gumInput(string $prompt, string $default = '', bool $password = false): string
    {
        if ($this->hasGum()) {
            $command = $password
                ? "gum input --password --prompt \"$prompt\""
                : "gum input --placeholder \"$default\" --prompt \"$prompt\"";
            $result = trim(shell_exec($command));
            return $result !== '' ? $result : $default;
        }

        return $password
            ? $this->secret($prompt) ?? $default
            : $this->ask($prompt, $default);
    }

    protected function gumChoose(array $options): ?string
    {
        if ($this->hasGum()) {
            return trim(shell_exec("gum choose " . implode(' ', $options)));
        }

        return $this->choice('Elige un driver', $options);
    }

    protected function hasGum(): bool
    {
        return trim(shell_exec("command -v gum")) !== '';
    }
}
