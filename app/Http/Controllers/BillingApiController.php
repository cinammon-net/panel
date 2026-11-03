<?php

namespace App\Http\Controllers;

use App\Models\Allocation;
use App\Models\Egg;
use App\Models\Server;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * API de integración con Cinammon Billing.
 * Autenticada mediante el token compartido X-Billing-Token.
 */
class BillingApiController extends Controller
{
    private const CATEGORY_MAP = [
        'minecraft' => 'minecraft',
        'games' => 'games',
        'survival' => 'games',
        'shooters' => 'games',
        'sandbox' => 'games',
        'simulation' => 'games',
        'voice' => 'voice',
        'bots' => 'bots',
        'databases' => 'database',
    ];

    // Egg por defecto según la categoría de la tienda (clave de billing),
    // con fallback a la categoría del panel.
    private const DEFAULT_EGGS = [
        'minecraft' => 'Paper',
        'games' => 'Palworld',
        'survival' => 'Rust',
        'shooters' => 'Counter-Strike 2',
        'sandbox' => 'Garrys Mod',
        'simulation' => 'Assetto Corsa',
        'voice' => 'TeaSpeak',
        'bots' => 'JMusicBot',
        'database' => 'MariaDB 10.3',
    ];

    private function authorizeToken(Request $request): void
    {
        $token = (string) config('services.billing.token');

        abort_if($token === '', 503, 'Billing token not configured');
        abort_unless(hash_equals($token, (string) $request->header('X-Billing-Token')), 401, 'Invalid billing token');
    }

    public function provision(Request $request): JsonResponse
    {
        $this->authorizeToken($request);

        $data = $request->validate([
            'external_id' => ['required', 'string', 'max:60'],
            'email' => ['required', 'email'],
            'user_name' => ['required', 'string', 'max:255'],
            'server_name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string'],
            'memory_mb' => ['required', 'integer', 'min:128'],
            'disk_mb' => ['required', 'integer', 'min:512'],
            'cpu_pct' => ['required', 'integer', 'min:25'],
        ]);

        // Idempotente: si el pedido ya se aprovisionó, devolverlo.
        $existing = Server::where('external_id', $data['external_id'])->first();
        if ($existing) {
            return response()->json($this->payload($existing));
        }

        $category = self::CATEGORY_MAP[$data['category']] ?? $data['category'];

        $defaultEgg = self::DEFAULT_EGGS[$data['category']] ?? self::DEFAULT_EGGS[$category] ?? '';
        // El egg por defecto se busca primero por nombre (algunos no tienen categoría asignada)
        $egg = Egg::where('name', $defaultEgg)->first()
            ?? Egg::where('category', $category)->where('name', $defaultEgg)->first()
            ?? Egg::where('category', $category)->orderBy('name')->firstOrFail();

        $user = User::firstOrCreate(
            ['email' => $data['email']],
            [
                'name' => $data['user_name'],
                'password' => Hash::make(Str::random(32)),
                'email_verified_at' => now(),
            ]
        );

        $node = \App\Models\Node::firstOrFail();

        $allocation = Allocation::whereNull('server_id')
            ->where('node_id', $node->id)
            ->whereNotIn('id', Server::whereNotNull('allocation_id')->pluck('allocation_id'))
            ->orderBy('port')
            ->first();

        if (!$allocation) {
            $nextPort = max(25565, (int) Allocation::where('node_id', $node->id)->max('port') + 1);
            $allocation = Allocation::create([
                'node_id' => $node->id,
                'ip' => Allocation::where('node_id', $node->id)->value('ip') ?? '0.0.0.0',
                'port' => $nextPort,
            ]);
        }

        $images = json_decode($egg->docker_images ?? '{}', true) ?: [];

        $server = Server::create([
            'uuid' => (string) Str::uuid(),
            'uuid_short' => substr((string) Str::uuid(), 0, 8),
            'node_id' => $node->id,
            'allocation_id' => $allocation->id,
            'name' => $data['server_name'],
            'active' => 1,
            'owner_id' => $user->id,
            'memory' => $data['memory_mb'],
            'swap' => 0,
            'disk' => $data['disk_mb'],
            'io' => 500,
            'cpu' => $data['cpu_pct'],
            'egg_id' => $egg->id,
            'startup' => $egg->startup ?? '',
            'image' => reset($images) ?: '',
            'status' => 0,
        ]);

        $server->forceFill(['external_id' => $data['external_id']])->save();

        $allocation->forceFill(['server_id' => $server->id])->save();

        try {
            app(\App\Services\Daemon\WingsClient::class)->provision($server);
        } catch (\Throwable $e) {
            Log::warning('Billing provision: no se pudo aprovisionar en Wings: ' . $e->getMessage());
        }

        return response()->json($this->payload($server), 201);
    }

    public function cancel(Request $request, string $externalId): JsonResponse
    {
        $this->authorizeToken($request);

        $server = Server::where('external_id', $externalId)->firstOrFail();
        
        // 1. Marcar el servidor como inactivo y suspendido por cancelación
        $server->forceFill([
            'active' => 0,
            'status' => 2, // Suspendido
            'description' => trim(($server->description ?? '') . ' [⚠️ SERVICIO CANCELADO · Programado para eliminación en 7 días]'),
        ])->save();

        // 2. Detener de inmediato el contenedor en Wings/Docker
        try {
            app(\App\Services\Daemon\WingsClient::class)->power($server, 'stop');
            Log::info("Billing cancel: servidor {$server->name} ({$server->uuid}) detenido exitosamente en Wings.");
        } catch (\Throwable $e) {
            Log::warning("Billing cancel: no se pudo enviar stop a Wings para {$server->uuid}: {$e->getMessage()}");
        }

        return response()->json([
            'ok' => true,
            'server_id' => $server->id,
            'status' => 'suspended_and_stopped',
            'scheduled_deletion_days' => 7,
            'message' => 'Servidor detenido de inmediato. Programado para eliminación en 7 días.',
        ]);
    }

    private function payload(Server $server): array
    {
        return [
            'id' => $server->id,
            'uuid' => $server->uuid,
            'uuid_short' => $server->uuid_short,
            'name' => $server->name,
            'allocation' => $server->allocation
                ? ['ip' => $server->allocation->ip, 'port' => $server->allocation->port]
                : null,
        ];
    }
}
