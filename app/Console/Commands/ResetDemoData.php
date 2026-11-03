<?php

namespace App\Console\Commands;

use App\Models\Allocation;
use App\Models\Egg;
use App\Models\Server;
use App\Models\User;
use App\Support\DemoWings;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

class ResetDemoData extends Command
{
    public const PASSWORD = 'cinammon';
    public const LOCK_CODE = 'demo1234';

    protected $signature = 'demo:reset {--force : No pedir confirmación}';

    protected $description = 'Recrea la base de datos de la instalación demo con cuentas y servidores de ejemplo';

    public function handle(): int
    {
        $demo = (string) config('database.connections.'.config('database.default').'.database');

        // Borra todas las tablas de la base configurada: solo puede ejecutarse en la instalación demo.
        if (! config('panel.demo') || ! str_contains($demo, 'demo')) {
            $this->error("Abortado: solo se ejecuta con PANEL_DEMO_MODE=true y una base de datos con «demo» en su nombre (esta usa «{$demo}»).");

            return self::FAILURE;
        }

        $catalogPath = database_path('demo/catalog.json');
        if (! is_file($catalogPath)) {
            $this->error('Falta database/demo/catalog.json. Genéralo en el panel real con «php artisan demo:export-catalog».');

            return self::FAILURE;
        }

        if (! $this->option('force') && ! $this->confirm("Se borrarán y recrearán TODAS las tablas de «{$demo}». ¿Continuar?")) {
            return self::FAILURE;
        }

        $catalog = json_decode((string) file_get_contents($catalogPath), true, 512, JSON_THROW_ON_ERROR);

        Artisan::call('migrate:fresh', ['--force' => true]);
        $this->info('Esquema recreado en '.$demo);

        // El seeder crea además cuentas de prueba con los correos antiguos en modo demo: solo queremos roles y permisos.
        config(['panel.demo' => false]);
        Artisan::call('db:seed', ['--class' => RolePermissionSeeder::class, '--force' => true]);
        config(['panel.demo' => true]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($catalog as $table => $rows) {
            foreach (array_chunk($rows, 50) as $chunk) {
                DB::table($table)->insert($chunk);
            }
            $this->line('  '.$table.': '.count($rows).' del catálogo');
        }

        DemoWings::wipe();
        $users = $this->createUsers();
        $this->createServers($users);

        File::deleteDirectory(storage_path('app/public/demo'));
        foreach (range(1, 20) as $id) {
            Cache::forget("server_activity_{$id}");
            Cache::forget("servers:{$id}:has-bot-status");
        }

        $this->info('Demo restablecida. Cuentas (contraseña «'.self::PASSWORD.'»): '.implode(', ', array_keys($users)));

        return self::SUCCESS;
    }

    /** @return array<string, User> */
    private function createUsers(): array
    {
        $definitions = [
            'demo-owner@cinammon.net' => ['Owner', 'Owner'],
            'demo-admin@cinammon.net' => ['Admin', 'Admin'],
            'demo-moderator@cinammon.net' => ['Moderator', 'Moderator'],
            'demo-helper@cinammon.net' => ['Helper', 'Helper'],
            'demo-sponsors@cinammon.net' => ['Sponsors', 'Sponsors'],
            'demo-members@cinammon.net' => ['Members', 'Members'],
        ];

        $users = [];
        foreach ($definitions as $email => [$name, $role]) {
            $user = new User();
            $user->forceFill([
                'name' => $name,
                'email' => $email,
                'password' => self::PASSWORD,
                'email_verified_at' => now(),
            ])->save();
            $user->syncRoles($role);
            $users[$email] = $user;
        }

        // Con el bloqueo desactivado (sin código) y con él activo, para comparar el comportamiento.
        $users['demo-owner@cinammon.net']->forceFill([
            'lock_code' => Hash::make(self::LOCK_CODE),
            'lock_code_set_at' => now(),
            'lock_enabled_until' => null,
        ])->save();
        $users['demo-members@cinammon.net']->forceFill([
            'lock_code' => Hash::make(self::LOCK_CODE),
            'lock_code_set_at' => now(),
            'lock_enabled_until' => now()->addDays(30),
        ])->save();

        return $users;
    }

    private function createServers(array $users): void
    {
        $nodeId = DB::table('nodes')->insertGetId([
            'online' => 1,
            'public' => 1,
            'name' => 'Nodo Demo',
            'fqdn' => 'nodo-demo.invalid',
            'scheme' => 'https',
            'memory' => 8192,
            'disk' => 51200,
            'cpu' => 400,
            'daemon_token' => Str::random(64),
            'daemon_token_id' => (string) Str::uuid(),
            'daemon_listen' => 443,
            'daemon_sftp' => 2022,
            'daemon_base' => '/var/lib/cinammon/volumes',
            'behind_proxy' => 1,
            'description' => 'Nodo de demostración: no ejecuta servidores reales.',
            'uuid' => (string) Str::uuid(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 203.0.113.0/24 es un rango reservado para documentación: no apunta a ninguna máquina real.
        $allocations = collect(range(25565, 25575))->map(fn ($port) => Allocation::forceCreate([
            'node_id' => $nodeId,
            'ip' => '203.0.113.10',
            'port' => $port,
            'alias' => 'demo.cinammon.net',
        ]));

        $servers = [
            ['survival-paper', 'demo-owner@cinammon.net', 'Paper', 'ghcr.io/parkervcp/yolks:java_21', 4096, 20480, 200],
            ['bot-discord', 'demo-owner@cinammon.net', 'node.js generic', 'ghcr.io/parkervcp/yolks:nodejs_22', 512, 2048, 50],
            ['mi-servidor-protegido', 'demo-members@cinammon.net', 'Paper', 'ghcr.io/parkervcp/yolks:java_21', 2048, 10240, 100],
        ];

        foreach ($servers as $i => [$name, $ownerEmail, $eggName, $image, $memory, $disk, $cpu]) {
            $egg = Egg::where('name', $eggName)->firstOrFail();
            $allocation = $allocations[$i];

            $server = Server::create([
                'uuid' => (string) Str::uuid(),
                'uuid_short' => substr((string) Str::uuid(), 0, 8),
                'node_id' => $nodeId,
                'allocation_id' => $allocation->id,
                'name' => $name,
                'active' => 1,
                'owner_id' => $users[$ownerEmail]->id,
                'memory' => $memory,
                'swap' => 0,
                'disk' => $disk,
                'io' => 500,
                'cpu' => $cpu,
                'egg_id' => $egg->id,
                'startup' => $egg->startup ?? '',
                'image' => $image,
                'status' => 0,
                'installed_at' => now(),
            ]);

            $allocation->forceFill(['server_id' => $server->id])->save();
            DemoWings::seed($server->uuid, DemoWings::kindFor($egg->category, $egg->name));
        }
    }
}
