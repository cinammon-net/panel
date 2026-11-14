<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class MakeUserCommand extends Command
{
    protected $signature = 'p:user:make
                            {--email= : Correo electronico del usuario.}
                            {--name= : Nombre completo o de usuario.}
                            {--password= : Contrasena de acceso.}
                            {--admin : Asignar rango Owner / Administrador.}';

    protected $description = 'Crea un nuevo usuario en la base de datos a traves de la consola.';

    public function handle(): int
    {
        $this->line('');
        $this->info('====================================================');
        $this->info('       ✦ CINAMMON - CREACION DE USUARIO POR CMD ✦    ');
        $this->info('====================================================');
        $this->line('');

        $email = $this->option('email') ?: $this->ask('Correo electronico (Email)');
        $validator = Validator::make(['email' => $email], [
            'email' => 'required|email|unique:users,email',
        ]);

        if ($validator->fails()) {
            $this->error($validator->errors()->first('email'));
            return 1;
        }

        $name = $this->option('name') ?: $this->ask('Nombre de usuario o completo', 'Administrador');
        $password = $this->option('password') ?: $this->secret('Contrasena (minimo 8 caracteres)');

        if (strlen((string) $password) < 8) {
            $this->error('La contrasena debe tener al menos 8 caracteres.');
            return 1;
        }

        $isAdmin = $this->option('admin') ? true : $this->confirm('Deseas asignar permisos de Administrador (Owner) a esta cuenta?', true);

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'email_verified_at' => now(),
        ]);

        if ($isAdmin) {
            $user->syncRoles(['Owner']);
            $this->info("Usuario [{$user->email}] creado con exito con rango [Owner].");
        } else {
            $user->syncRoles(['Members']);
            $this->info("Usuario [{$user->email}] creado con exito con rango [Members].");
        }

        return 0;
    }
}
