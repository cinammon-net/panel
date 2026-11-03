<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ResetServerLock extends Command
{
    protected $signature = 'lock:reset {email : Correo del cliente} {--force : No pedir confirmación}';

    protected $description = 'Borra el código y el bloqueo de seguridad de un cliente (el cliente creará uno nuevo al entrar)';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();

        if (! $user) {
            $this->error('No existe ningún usuario con ese correo.');

            return self::FAILURE;
        }

        if (! $this->option('force') && ! $this->confirm("¿Restablecer el bloqueo de seguridad de {$user->email}?")) {
            return self::FAILURE;
        }

        $user->forceFill(['lock_code' => null, 'lock_code_set_at' => null, 'lock_enabled_until' => null])->save();
        Log::warning("Server lock restablecido por consola para {$user->email} (id {$user->id}).");
        $this->info("Bloqueo restablecido. {$user->email} tendrá que crear un código nuevo al abrir sus servidores.");

        return self::SUCCESS;
    }
}
