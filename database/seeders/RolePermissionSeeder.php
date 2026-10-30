<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            'Api Key' => ['view list', 'view', 'create', 'update', 'delete'],
            'Database Host' => ['view list', 'view', 'create', 'update', 'delete'],
            'Database' => ['view list', 'view', 'create', 'update', 'delete'],
            'Egg' => ['view list', 'view', 'create', 'update', 'delete', 'import', 'export'],
            'Mount' => ['view list', 'view', 'create', 'update', 'delete'],
            'Node' => ['view list', 'view', 'create', 'update', 'delete'],
            'Role' => ['view list', 'view', 'create', 'update', 'delete'],
            'Server' => ['view list', 'view', 'create', 'update', 'delete'],
            'User' => ['view list', 'view', 'create', 'update', 'delete'],
            'Webhook' => ['view list', 'view', 'create', 'update', 'delete'],
            'Settings' => ['view', 'update'],
            'Health' => ['view'],
            'Activity' => ['see tips'],
        ];

        $rolesPermissions = [
            'Owner' => 'all',
            'Admin' => [
                'view_list_user',
                'view_user',
                'update_user',
                'view_list_server',
                'view_server',
                'update_server',
                'view_list_egg',
                'view_egg',
                'view_list_node',
                'view_node',
                'view_list_mount',
                'view_mount',
                'view_list_webhook',
                'view_webhook',
                'view_settings',
                'view_health',
                'see_tips_activity',
            ],
            'Moderator' => [
                'view_list_user',
                'view_user',
                'view_list_server',
                'view_server',
                'view_list_webhook',
                'view_webhook',
                'view_health',
            ],
            'Helper' => [
                'view_list_user',
                'view_user',
                'view_list_server',
                'view_server',
                'view_health',
            ],
            'Sponsors' => [
                'view_list_server',
                'view_server',
                'view_health',
            ],
            'Members' => [
                'view_user',
                'view_server',
            ],
        ];

        $this->command->line("\033[1;36m〄──────────────────────────────────────────────\033[0m");
        $this->command->line("\033[1;35m⌁ C I N A M M O N . N E T ┊ Role y Permission Seeder\033[0m");
        $this->command->line("\033[1;36m〄──────────────────────────────────────────────\033[0m");

        // Crear permisos
        foreach ($groups as $module => $actions) {
            $this->command->line("\033[1;33m✔ Creado módulo: {$module}\033[0m");
            foreach ($actions as $action) {
                $name = str_replace(' ', '_', strtolower($action . '_' . $module));
                $created = Permission::firstOrCreate([
                    'name' => $name,
                    'guard_name' => 'web',
                ]);

                if ($created->wasRecentlyCreated) {
                    $this->command->line("    \033[1;36m└─ Permiso creado:\033[0m \033[1;35m{$name}\033[0m");
                } else {
                    $this->command->line("    \033[1;36m└─ Permiso ya existe:\033[0m \033[1;31m{$name}\033[0m");
                }
            }
            $this->command->line('');
        }

        // Crear roles y asignar permisos
        foreach ($rolesPermissions as $roleName => $perms) {
            $this->command->line("\033[1;36m〄──────────────────────────────────────────────\033[0m");
            $this->command->line("\033[1;35m⌁ Rol detectado: {$roleName}\033[0m");
            $this->command->line("\033[1;33m⌁ Asignación de permisos activa\033[0m");
            $this->command->line("\033[1;36m〄──────────────────────────────────────────────\033[0m");

            $role = Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'web'],
                ['is_default' => true]
            );

            if (!$role->is_default) {
                $role->is_default = true;
                $role->save();
            }

            if ($perms === 'all') {
                $allPermissions = Permission::pluck('name')->toArray();
                $role->syncPermissions($allPermissions);
                $this->command->line("    \033[1;32m└─ Permisos asignados: TODOS los permisos\033[0m");
            } else {
                $missingPerms = [];
                $assignedPerms = [];

                foreach ($perms as $permName) {
                    $perm = Permission::where('name', $permName)->first();
                    if (!$perm) {
                        $missingPerms[] = $permName;
                    } else {
                        $assignedPerms[] = $permName;
                    }
                }

                foreach ($missingPerms as $missing) {
                    $this->command->line("    \033[1;31m└─ Permiso NO encontrado: {$missing}\033[0m");
                }

                foreach ($assignedPerms as $assigned) {
                    $this->command->line("    \033[1;32m└─ Permiso asignado: {$assigned}\033[0m");
                }

                $role->syncPermissions($assignedPerms);
            }

            $this->command->line("\033[1;32m✔ {$roleName} listo\033[0m");
            $this->command->line('');
        }

        // Crear usuarios y asignar roles
        $users = [
            ['name' => 'Owner',     'email' => 'owner@cinammon.net',     'role' => 'Owner'],
            ['name' => 'Admin',     'email' => 'admin@cinammon.net',     'role' => 'Admin'],
            ['name' => 'Moderator', 'email' => 'moderator@cinammon.net', 'role' => 'Moderator'],
            ['name' => 'Helper',    'email' => 'helper@cinammon.net',    'role' => 'Helper'],
            ['name' => 'Sponsors',  'email' => 'sponsors@cinammon.net',  'role' => 'Sponsors'],
            ['name' => 'Members',   'email' => 'members@cinammon.net',   'role' => 'Members'],
        ];

        $this->command->line("\033[1;35m⌁ Creación de usuarios de prueba...\033[0m");

        foreach ($users as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make('cinammon'),
                    'email_verified_at' => now(),
                ]
            );

            $user->syncRoles($data['role']);

            $this->command->line("    \033[1;36m✔ Usuario\033[0m \033[1;32m{$data['email']}\033[0m \033[1;36masignado al rol\033[0m \033[1;33m{$data['role']}\033[0m");
        }
    }
}
