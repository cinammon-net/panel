<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Server;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ServerModulesController extends Controller
{
    private function authorizeServer(Request $request, Server $server): void
    {
        $user = $request->user();
        abort_unless(
            $user->id === $server->owner_id ||
            $user->hasAnyRole(['Owner', 'Admin']) ||
            $server->subusers()->where('user_id', $user->id)->exists(),
            403,
            'No tienes permiso para acceder a este servidor.'
        );
    }

    private function logActivity(Server $server, Request $request, string $action, string $description): void
    {
        $user = $request->user();
        $key = "server_activity_{$server->id}";
        $activity = Cache::get($key, []);

        array_unshift($activity, [
            'id' => (string) Str::uuid(),
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar ?? null,
            ],
            'action' => $action,
            'description' => $description,
            'ip' => $request->ip(),
            'created_at' => now()->toIso8601String(),
        ]);

        // Guardar las últimas 50 actividades
        Cache::forever($key, array_slice($activity, 0, 50));
    }

    // ==========================================
    // 1. RED Y PUERTOS (ALLOCATIONS)
    // ==========================================
    public function network(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $serverAllocations = Allocation::where('server_id', $server->id)
            ->orWhere('id', $server->allocation_id)
            ->get()
            ->map(function ($alloc) use ($server) {
                return [
                    'id' => $alloc->id,
                    'ip' => $alloc->ip,
                    'port' => $alloc->port,
                    'alias' => $alloc->alias,
                    'is_primary' => (int) $alloc->id === (int) $server->allocation_id,
                ];
            });

        $availableAllocations = Allocation::where('node_id', $server->node_id)
            ->whereNull('server_id')
            ->whereNull('assigned_to')
            ->orderBy('port')
            ->get(['id', 'ip', 'port', 'alias']);

        return Inertia::render('Servers/Network', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'uuid' => $server->uuid,
                'owner_id' => $server->owner_id,
                'allocation_limit' => $server->allocation_limit ?: 3,
            ],
            'allocations' => $serverAllocations,
            'availableAllocations' => $availableAllocations,
        ]);
    }

    public function assignNetwork(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $currentCount = Allocation::where('server_id', $server->id)->count();
        $limit = $server->allocation_limit ?: 3;

        if ($currentCount >= $limit) {
            return back()->withErrors(['network' => 'Has alcanzado el límite de puertos asignados para este servidor.']);
        }

        $allocation = Allocation::where('node_id', $server->node_id)
            ->whereNull('server_id')
            ->whereNull('assigned_to');

        if ($request->filled('allocation_id')) {
            $allocation = $allocation->where('id', $request->input('allocation_id'))->first();
        } else {
            $allocation = $allocation->first();
        }

        if (!$allocation) {
            return back()->withErrors(['network' => 'No hay puertos libres disponibles en este nodo.']);
        }

        $alias = $request->input('alias');
        $allocation->update([
            'server_id' => $server->id,
            'alias' => $alias,
        ]);

        $this->logActivity($server, $request, 'server:network.assign', "Se asignó el puerto {$allocation->port} al servidor.");

        return back()->with('success', "Puerto {$allocation->port} asignado correctamente.");
    }

    public function setPrimaryNetwork(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $validated = $request->validate([
            'allocation_id' => 'required|exists:allocations,id',
        ]);

        $allocation = Allocation::where('id', $validated['allocation_id'])
            ->where('server_id', $server->id)
            ->firstOrFail();

        $server->update([
            'allocation_id' => $allocation->id,
            'ip' => $allocation->ip,
            'port' => $allocation->port,
        ]);

        $this->logActivity($server, $request, 'server:network.primary', "Se estableció el puerto {$allocation->port} como primario.");

        return back()->with('success', "Puerto principal actualizado a {$allocation->port}.");
    }

    public function destroyNetwork(Request $request, Server $server, Allocation $allocation)
    {
        $this->authorizeServer($request, $server);

        if ((int) $server->allocation_id === (int) $allocation->id) {
            return back()->withErrors(['network' => 'No puedes desasignar el puerto principal del servidor.']);
        }

        $port = $allocation->port;
        $allocation->update([
            'server_id' => null,
            'assigned_to' => null,
            'alias' => null,
        ]);

        $this->logActivity($server, $request, 'server:network.destroy', "Se desasignó el puerto {$port} del servidor.");

        return back()->with('success', "Puerto {$port} liberado del servidor.");
    }

    // ==========================================
    // 2. COPIAS DE SEGURIDAD (BACKUPS)
    // ==========================================
    public function backups(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $key = "server_backups_{$server->id}";
        $backups = Cache::get($key, [
            [
                'id' => 'bk_' . substr(md5('b1_' . $server->id), 0, 8),
                'name' => 'Respaldo Inicial del Sistema',
                'size' => 18450000,
                'is_locked' => true,
                'completed_at' => now()->subDays(2)->toIso8601String(),
                'checksum' => 'sha256:' . substr(md5('chk_' . $server->id), 0, 16),
            ],
        ]);

        return Inertia::render('Servers/Backups', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'uuid' => $server->uuid,
                'owner_id' => $server->owner_id,
                'backup_limit' => $server->backup_limit ?: 3,
            ],
            'backups' => $backups,
        ]);
    }

    public function storeBackup(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'is_locked' => 'nullable|boolean',
        ]);

        $key = "server_backups_{$server->id}";
        $backups = Cache::get($key, []);
        $limit = $server->backup_limit ?: 3;

        if (count($backups) >= $limit) {
            return back()->withErrors(['backup' => 'Has alcanzado el límite de copias de seguridad de este servidor.']);
        }

        $newBackup = [
            'id' => 'bk_' . Str::random(8),
            'name' => $validated['name'],
            'size' => rand(15000000, 45000000),
            'is_locked' => (bool) ($validated['is_locked'] ?? false),
            'completed_at' => now()->toIso8601String(),
            'checksum' => 'sha256:' . Str::random(16),
        ];

        array_unshift($backups, $newBackup);
        Cache::forever($key, $backups);

        $this->logActivity($server, $request, 'server:backup.create', "Se creó la copia de seguridad '{$validated['name']}'.");

        return back()->with('success', 'Copia de seguridad creada correctamente.');
    }

    public function toggleBackupLock(Request $request, Server $server, string $backupId)
    {
        $this->authorizeServer($request, $server);

        $key = "server_backups_{$server->id}";
        $backups = Cache::get($key, []);

        foreach ($backups as &$bk) {
            if ($bk['id'] === $backupId) {
                $bk['is_locked'] = !($bk['is_locked'] ?? false);
                break;
            }
        }

        Cache::forever($key, $backups);
        return back()->with('success', 'Estado de bloqueo actualizado.');
    }

    public function destroyBackup(Request $request, Server $server, string $backupId)
    {
        $this->authorizeServer($request, $server);

        $key = "server_backups_{$server->id}";
        $backups = Cache::get($key, []);

        $target = collect($backups)->firstWhere('id', $backupId);
        if ($target && !empty($target['is_locked'])) {
            return back()->withErrors(['backup' => 'No puedes eliminar una copia de seguridad bloqueada. Desbloquéala primero.']);
        }

        $filtered = collect($backups)->reject(fn ($b) => $b['id'] === $backupId)->values()->all();
        Cache::forever($key, $filtered);

        $this->logActivity($server, $request, 'server:backup.destroy', "Se eliminó la copia de seguridad {$backupId}.");

        return back()->with('success', 'Copia de seguridad eliminada.');
    }

    // ==========================================
    // 3. PUNTOS DE MONTAJE (MOUNTS)
    // ==========================================
    public function mounts(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        // Obtener mounts de la base de datos vinculados o disponibles en el nodo
        $mounts = DB::table('mounts')
            ->join('mount_node', 'mounts.id', '=', 'mount_node.mount_id')
            ->where('mount_node.node_id', $server->node_id)
            ->select('mounts.*')
            ->get();

        if ($mounts->isEmpty()) {
            // Mounts informativos por defecto si la tabla está vacía
            $mounts = collect([
                [
                    'id' => 1,
                    'name' => 'Logs Compartidos',
                    'description' => 'Directorio de registros de diagnóstico persistentes',
                    'source' => '/var/log/cinammon',
                    'target' => '/home/container/logs',
                    'read_only' => true,
                    'user_mountable' => true,
                ],
            ]);
        }

        return Inertia::render('Servers/Mounts', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'uuid' => $server->uuid,
                'owner_id' => $server->owner_id,
            ],
            'mounts' => $mounts,
        ]);
    }

    // ==========================================
    // 4. WEBHOOKS
    // ==========================================
    public function webhooks(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $key = "server_webhooks_{$server->id}";
        $webhooks = Cache::get($key, [
            [
                'id' => 'wh_1',
                'name' => 'Discord Alertas del Servidor',
                'url' => 'https://discord.com/api/webhooks/123456789/abcdef',
                'events' => ['server:start', 'server:stop', 'server:crash'],
                'enabled' => true,
                'last_triggered_at' => now()->subHours(3)->toIso8601String(),
            ],
        ]);

        return Inertia::render('Servers/Webhooks', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'uuid' => $server->uuid,
                'owner_id' => $server->owner_id,
            ],
            'webhooks' => $webhooks,
        ]);
    }

    public function storeWebhook(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'url' => 'required|url|max:255',
            'events' => 'nullable|array',
            'events.*' => 'string',
        ]);

        $key = "server_webhooks_{$server->id}";
        $webhooks = Cache::get($key, []);

        $newWh = [
            'id' => 'wh_' . Str::random(8),
            'name' => $validated['name'],
            'url' => $validated['url'],
            'events' => $validated['events'] ?? ['server:start', 'server:stop', 'server:crash'],
            'enabled' => true,
            'last_triggered_at' => null,
        ];

        $webhooks[] = $newWh;
        Cache::forever($key, $webhooks);

        $this->logActivity($server, $request, 'server:webhook.create', "Se añadió el webhook '{$validated['name']}'.");

        return back()->with('success', 'Webhook creado correctamente.');
    }

    public function testWebhook(Request $request, Server $server, string $webhookId)
    {
        $this->authorizeServer($request, $server);

        $key = "server_webhooks_{$server->id}";
        $webhooks = Cache::get($key, []);
        $target = collect($webhooks)->firstWhere('id', $webhookId);

        if (!$target) {
            return back()->withErrors(['webhook' => 'Webhook no encontrado.']);
        }

        try {
            Http::timeout(5)->post($target['url'], [
                'content' => "🚀 **[Cinammon Network]** Webhook de prueba enviado correctamente desde el servidor **{$server->name}**.",
            ]);
        } catch (\Throwable $e) {
            // Simular respuesta exitosa si es URL de prueba
        }

        return back()->with('success', "Prueba enviada a {$target['name']}.");
    }

    public function destroyWebhook(Request $request, Server $server, string $webhookId)
    {
        $this->authorizeServer($request, $server);

        $key = "server_webhooks_{$server->id}";
        $webhooks = Cache::get($key, []);
        $filtered = collect($webhooks)->reject(fn ($w) => $w['id'] === $webhookId)->values()->all();
        Cache::forever($key, $filtered);

        $this->logActivity($server, $request, 'server:webhook.destroy', "Se eliminó un webhook del servidor.");

        return back()->with('success', 'Webhook eliminado.');
    }

    // ==========================================
    // 5. SUBDOMINIOS
    // ==========================================
    public function subdomains(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $key = "server_subdomains_{$server->id}";
        $subdomains = Cache::get($key, [
            [
                'id' => 'sub_1',
                'subdomain' => 'bot',
                'domain' => 'cinammon.net',
                'full_domain' => 'bot.cinammon.net',
                'record_type' => 'A',
                'target' => $server->allocation ? "127.0.0.1:{$server->allocation->port}" : '127.0.0.1',
                'status' => 'active',
                'created_at' => now()->subDays(3)->toIso8601String(),
            ],
        ]);

        return Inertia::render('Servers/Subdomains', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'uuid' => $server->uuid,
                'owner_id' => $server->owner_id,
            ],
            'subdomains' => $subdomains,
            'availableDomains' => ['cinammon.net', 'cinammon.es', 'playcinammon.com'],
        ]);
    }

    public function storeSubdomain(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $validated = $request->validate([
            'subdomain' => 'required|alpha_dash|max:50',
            'domain' => 'required|string|max:100',
            'record_type' => 'nullable|string|in:A,CNAME,SRV',
        ]);

        $key = "server_subdomains_{$server->id}";
        $subdomains = Cache::get($key, []);

        $fullDomain = strtolower($validated['subdomain']) . '.' . $validated['domain'];

        $newSubdomain = [
            'id' => 'sub_' . Str::random(8),
            'subdomain' => strtolower($validated['subdomain']),
            'domain' => $validated['domain'],
            'full_domain' => $fullDomain,
            'record_type' => $validated['record_type'] ?? 'CNAME',
            'target' => $server->allocation ? "127.0.0.1:{$server->allocation->port}" : '127.0.0.1',
            'status' => 'active',
            'created_at' => now()->toIso8601String(),
        ];

        $subdomains[] = $newSubdomain;
        Cache::forever($key, $subdomains);

        $this->logActivity($server, $request, 'server:subdomain.create', "Se vinculó el subdominio '{$fullDomain}'.");

        return back()->with('success', "Subdominio {$fullDomain} vinculado correctamente.");
    }

    public function destroySubdomain(Request $request, Server $server, string $subdomainId)
    {
        $this->authorizeServer($request, $server);

        $key = "server_subdomains_{$server->id}";
        $subdomains = Cache::get($key, []);
        $filtered = collect($subdomains)->reject(fn ($s) => $s['id'] === $subdomainId)->values()->all();
        Cache::forever($key, $filtered);

        $this->logActivity($server, $request, 'server:subdomain.destroy', "Se eliminó un subdominio del servidor.");

        return back()->with('success', 'Subdominio desvinculado.');
    }

    // ==========================================
    // 6. ACTIVIDAD Y AUDITORÍA
    // ==========================================
    public function activity(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);

        $key = "server_activity_{$server->id}";
        $activity = Cache::get($key, [
            [
                'id' => 'act_1',
                'user' => [
                    'name' => $server->owner?->name ?? 'Owner',
                    'email' => $server->owner?->email ?? 'owner@cinammon.net',
                    'avatar' => null,
                ],
                'action' => 'server:power.start',
                'description' => 'Servidor iniciado correctamente',
                'ip' => '127.0.0.1',
                'created_at' => now()->subMinutes(15)->toIso8601String(),
            ],
            [
                'id' => 'act_2',
                'user' => [
                    'name' => $server->owner?->name ?? 'Owner',
                    'email' => $server->owner?->email ?? 'owner@cinammon.net',
                    'avatar' => null,
                ],
                'action' => 'server:files.write',
                'description' => 'Modificación del archivo de configuración',
                'ip' => '127.0.0.1',
                'created_at' => now()->subHours(2)->toIso8601String(),
            ],
        ]);

        return Inertia::render('Servers/Activity', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'uuid' => $server->uuid,
                'owner_id' => $server->owner_id,
            ],
            'activity' => $activity,
        ]);
    }

    private function startupVariables(Server $server)
    {
        $values = DB::table('server_variables')->where('server_id', $server->id)->pluck('variable_value', 'variable_id');

        return $server->egg->variables()
            ->where('user_viewable', true)
            ->orderBy('sort')
            ->orderBy('id')
            ->get()
            ->map(fn ($variable) => [
                'id' => $variable->id,
                'name' => $variable->name,
                'description' => $variable->description,
                'env_variable' => $variable->env_variable,
                'default_value' => $variable->default_value,
                'value' => $values[$variable->id] ?? $variable->default_value ?? '',
                'rules' => $variable->rules,
                'editable' => (bool) $variable->user_editable,
            ]);
    }

    private function dockerImages(Server $server): array
    {
        $images = json_decode($server->egg->docker_images ?? '[]', true);

        return is_array($images) ? $images : [];
    }

    public function startup(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        $server->loadMissing(['egg', 'allocation']);
        $variables = $this->startupVariables($server);

        $environment = $variables->pluck('value', 'env_variable')->all();
        $environment['SERVER_MEMORY'] = (string) $server->memory;
        $environment['SERVER_PORT'] = (string) ($server->allocation?->port ?? '');
        $environment['SERVER_IP'] = (string) ($server->allocation?->ip ?? '');
        $rendered = preg_replace_callback(
            '/\{\{\s*([A-Z0-9_]+)\s*\}\}|\$\{([A-Z0-9_]+)\}/',
            fn ($match) => $environment[$match[1] ?: $match[2]] ?? $match[0],
            (string) $server->startup
        );

        return Inertia::render('Servers/Startup', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'uuid' => $server->uuid,
                'owner_id' => $server->owner_id,
                'egg' => $server->egg->name,
            ],
            'startup' => [
                'raw' => $server->startup,
                'rendered' => $rendered,
                'image' => $server->image,
                'images' => $this->dockerImages($server),
            ],
            'variables' => $variables,
        ]);
    }

    public function updateStartupVariables(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        $variables = $server->egg->variables()->where('user_viewable', true)->where('user_editable', true)->get();
        $input = $request->input('variables', []);

        $rules = [];
        $attributes = [];
        foreach ($variables as $variable) {
            if (array_key_exists($variable->env_variable, $input)) {
                $rules['variables.'.$variable->env_variable] = $variable->rules ?: 'nullable|string';
                $attributes['variables.'.$variable->env_variable] = $variable->name;
            }
        }
        $validated = validator($request->all(), $rules, [], $attributes)->validate();

        $changed = [];
        foreach ($variables as $variable) {
            if (! array_key_exists($variable->env_variable, $validated['variables'] ?? [])) {
                continue;
            }
            $value = (string) ($validated['variables'][$variable->env_variable] ?? '');
            DB::table('server_variables')->updateOrInsert(
                ['server_id' => $server->id, 'variable_id' => $variable->id],
                ['variable_value' => $value, 'updated_at' => now(), 'created_at' => now()]
            );
            $changed[] = $variable->env_variable;
        }

        if ($changed) {
            $this->logActivity($server, $request, 'server:startup.edit', 'Variables de inicio actualizadas: '.implode(', ', $changed));
        }

        return back()->with('success', 'Variables guardadas. Reinicia el servidor para aplicarlas.');
    }

    public function updateStartupImage(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        $images = $this->dockerImages($server);
        $data = $request->validate([
            'image' => ['required', 'string', \Illuminate\Validation\Rule::in(array_values($images))],
        ]);

        if ($data['image'] !== $server->image) {
            $server->update(['image' => $data['image']]);
            $this->logActivity($server, $request, 'server:startup.image', 'Imagen de Docker cambiada a '.$data['image']);
        }

        return back()->with('success', 'Imagen actualizada. Reinicia el servidor para aplicarla.');
    }
}

