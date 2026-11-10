<?php

namespace App\Http\Controllers;

use App\Models\CloudflareConnection;
use App\Models\Server;
use App\Models\ServerSubdomain;
use App\Services\Cloudflare\CloudflareClient;
use App\Services\Cloudflare\CloudflareException;
use App\Support\ServerActivity;
use App\Support\ServerDomains;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

/**
 * Dominios propios de los servidores de pago, con conexión automática a Cloudflare
 * (o a mano con cualquier otro proveedor de DNS).
 */
class ServerDomainsController extends Controller
{
    private function authorizeServer(Request $request, Server $server): void
    {
        $user = $request->user();
        abort_unless(
            $user->id === $server->owner_id
            || $user->hasAnyRole(['Owner', 'Admin'])
            || $server->subusers()->where('user_id', $user->id)->exists(),
            403,
            'No tienes permiso para acceder a este servidor.'
        );
    }

    private function ensureAllowed(Request $request, Server $server): void
    {
        abort_if(\App\Support\Panel::demoMode(), 403, 'Los dominios propios no están disponibles en la demo.');
        abort_unless(ServerDomains::allowed($server, $request->user()), 403, 'Los dominios propios son solo para servidores de pago.');
    }

    /** Zonas de Cloudflare del cliente (5 minutos en caché para no llamar a la API en cada visita). */
    private function zones(CloudflareConnection $connection, bool $fresh = false): array
    {
        $key = "cf_zones:{$connection->user_id}:".md5((string) $connection->updated_at);
        if ($fresh) {
            Cache::forget($key);
        }

        return Cache::remember($key, 300, fn () => ServerDomains::client($connection)->zones());
    }

    public function page(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        $server->loadMissing(['egg', 'allocation']);
        $user = $request->user();

        // Los subdominios falsos de la versión anterior vivían en la caché: se descartan.
        Cache::forget("server_subdomains_{$server->id}");

        $connection = CloudflareConnection::where('user_id', $user->id)->first();
        $zones = [];
        $zonesError = null;
        if ($connection && ServerDomains::allowed($server, $user)) {
            try {
                $zones = $this->zones($connection);
            } catch (CloudflareException $e) {
                $zonesError = $e->getMessage();
            }
        }

        $domains = ServerSubdomain::where('server_id', $server->id)->orderBy('created_at')->get()
            ->map(fn (ServerSubdomain $sub) => [
                'id' => $sub->id,
                'domain' => $sub->domain,
                'provider' => $sub->provider,
                'kind' => $sub->kind,
                'status' => $sub->status,
                'zone_name' => $sub->zone_name,
                'address' => ServerDomains::address($sub, $server),
                'last_error' => $sub->last_error,
                'verified_at' => $sub->verified_at?->toIso8601String(),
                'created_at' => $sub->created_at?->toIso8601String(),
                // Registros que tiene que tener el dominio (para el modo manual se muestran como instrucciones)
                'records' => collect(ServerDomains::records($server, $sub->domain, $sub->zone_name === $sub->domain))
                    ->map(fn ($r) => self::presentRecord($r))->values(),
                // Solo lo puede quitar quien lo creó (con su Cloudflare), el dueño o el equipo
                'can_delete' => $sub->created_by === $user->id || $server->owner_id === $user->id || $user->hasAnyRole(['Owner', 'Admin']),
            ]);

        return Inertia::render('Servers/Subdomains', [
            'server' => ['id' => $server->id, 'name' => $server->name, 'uuid' => $server->uuid, 'owner_id' => $server->owner_id],
            'allowed' => ServerDomains::allowed($server, $user),
            'demo' => \App\Support\Panel::demoMode(),
            'storeUrl' => rtrim((string) (config('services.billing.url') ?: 'https://store.cinammon.net'), '/'),
            'kind' => ServerDomains::kind($server),
            'usesSrv' => ServerDomains::usesSrv($server),
            'port' => ServerDomains::port($server),
            'max' => ServerDomains::MAX_PER_SERVER,
            'cloudflare' => $connection ? [
                'hint' => $connection->token_hint,
                'zones_count' => count($zones) ?: $connection->zones_count,
                'verified_at' => $connection->verified_at?->toIso8601String(),
            ] : null,
            'zones' => collect($zones)->map(fn ($z) => ['id' => $z['id'], 'name' => $z['name'], 'active' => $z['status'] === 'active'])->values(),
            'zonesError' => $zonesError,
            'domains' => $domains,
        ]);
    }

    private static function presentRecord(array $record): array
    {
        if ($record['type'] === 'SRV') {
            $d = $record['data'];

            return ['type' => 'SRV', 'name' => $record['name'], 'value' => "{$d['priority']} {$d['weight']} {$d['port']} {$d['target']}", 'proxied' => false,
                'detail' => "Prioridad {$d['priority']} · Peso {$d['weight']} · Puerto {$d['port']} · Destino {$d['target']}"];
        }

        return ['type' => $record['type'], 'name' => $record['name'], 'value' => (string) $record['content'], 'proxied' => (bool) ($record['proxied'] ?? false), 'detail' => null];
    }

    // ------------------------------------------------------------------ Cuenta de Cloudflare

    public function connect(Request $request)
    {
        abort_if(\App\Support\Panel::demoMode(), 403, 'No disponible en la demo.');
        $data = $request->validate(['token' => ['required', 'string', 'max:200']]);
        $token = trim($data['token']);

        try {
            $client = new CloudflareClient($token);
            $client->verify();
            $zones = $client->zones();
        } catch (CloudflareException $e) {
            return back()->withErrors(['token' => $e->getMessage()]);
        }
        if (! $zones) {
            return back()->withErrors(['token' => 'El token funciona, pero no tiene acceso a ningún dominio. Al crearlo, en «Recursos de zona» elige tu dominio (o «Todas las zonas»).']);
        }

        CloudflareConnection::updateOrCreate(['user_id' => $request->user()->id], [
            'token' => $token,
            'token_hint' => '…'.substr($token, -4),
            'zones_count' => count($zones),
            'verified_at' => now(),
        ]);

        return back()->with('success', 'Cloudflare conectado: '.count($zones).' '.(count($zones) === 1 ? 'dominio disponible.' : 'dominios disponibles.'));
    }

    public function disconnect(Request $request)
    {
        CloudflareConnection::where('user_id', $request->user()->id)->delete();

        return back()->with('success', 'Cuenta de Cloudflare desconectada. Los registros DNS ya creados siguen funcionando.');
    }

    // ------------------------------------------------------------------ Dominios

    public function store(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        $this->ensureAllowed($request, $server);
        $server->loadMissing(['egg', 'allocation']);
        $user = $request->user();

        $data = $request->validate([
            'mode' => ['required', 'in:cloudflare,manual'],
            'zone_id' => ['required_if:mode,cloudflare', 'nullable', 'string', 'max:64'],
            'name' => ['nullable', 'string', 'max:63'],
            'domain' => ['required_if:mode,manual', 'nullable', 'string', 'max:253'],
        ]);

        if ($data['mode'] === 'cloudflare') {
            $connection = CloudflareConnection::where('user_id', $user->id)->first();
            if (! $connection) {
                return back()->withErrors(['domain' => 'Primero conecta tu cuenta de Cloudflare.']);
            }
            try {
                $zone = collect($this->zones($connection))->firstWhere('id', $data['zone_id'])
                    ?? collect($this->zones($connection, true))->firstWhere('id', $data['zone_id']);
            } catch (CloudflareException $e) {
                return back()->withErrors(['domain' => $e->getMessage()]);
            }
            if (! $zone) {
                return back()->withErrors(['zone_id' => 'Ese dominio no está en tu cuenta de Cloudflare.']);
            }
            $name = strtolower(trim((string) ($data['name'] ?? ''), " .\t"));
            if ($name !== '' && $name !== '@' && ! preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/', $name)) {
                return back()->withErrors(['name' => 'El nombre solo puede tener letras, números y guiones (por ejemplo: play, mc, www).']);
            }
            $domain = ServerDomains::normalize(($name === '' || $name === '@') ? $zone['name'] : $name.'.'.$zone['name']);
        } else {
            if (ServerDomains::kind($server) === 'web') {
                return back()->withErrors(['domain' => 'Para las webs hace falta Cloudflare (pone el HTTPS y protege el servidor). Conecta tu cuenta o pasa tu dominio a Cloudflare.']);
            }
            $domain = ServerDomains::normalize((string) $data['domain']);
        }

        if (! $domain) {
            return back()->withErrors(['domain' => 'Ese dominio no es válido. Escríbelo así: play.midominio.com']);
        }
        if ($error = ServerDomains::precheck($server, $user, $domain)) {
            return back()->withErrors(['domain' => $error]);
        }

        try {
            $sub = $data['mode'] === 'cloudflare'
                ? ServerDomains::createWithCloudflare($server, $user, $connection, $zone, $domain)
                : ServerDomains::createManual($server, $user, $domain);
        } catch (CloudflareException $e) {
            return back()->withErrors(['domain' => $e->getMessage()]);
        }

        ServerActivity::log($server, $user, 'server:subdomain.create', ($sub->provider === 'cloudflare'
            ? "Vinculó el dominio {$domain} (registros creados en Cloudflare)"
            : "Añadió el dominio {$domain} (DNS a mano)"), $request->ip());

        return back()->with('success', $sub->provider === 'cloudflare'
            ? "Listo: {$domain} ya apunta a tu servidor. El DNS puede tardar unos minutos en propagarse."
            : ($sub->status === 'active' ? "{$domain} ya apunta a tu servidor." : "Dominio añadido. Crea los registros DNS que te indicamos y pulsa «Comprobar»."));
    }

    public function verify(Request $request, Server $server, ServerSubdomain $subdomain)
    {
        $this->authorizeServer($request, $server);
        abort_unless((int) $subdomain->server_id === (int) $server->id, 404);
        $request->attributes->set('server_activity_logged', true);
        $server->loadMissing(['egg', 'allocation']);

        $sub = ServerDomains::verify($subdomain, $server);

        return $sub->status === 'active' && ! $sub->last_error
            ? back()->with('success', "{$sub->domain} apunta correctamente a tu servidor.")
            : back()->withErrors(['domain' => $sub->last_error ?: 'Todavía no apunta a tu servidor.']);
    }

    public function destroy(Request $request, Server $server, ServerSubdomain $subdomain)
    {
        $this->authorizeServer($request, $server);
        abort_unless((int) $subdomain->server_id === (int) $server->id, 404);
        $user = $request->user();
        abort_unless($subdomain->created_by === $user->id || $server->owner_id === $user->id || $user->hasAnyRole(['Owner', 'Admin']), 403);

        $domain = $subdomain->domain;
        $warning = ServerDomains::remove($subdomain);
        ServerActivity::log($server, $user, 'server:subdomain.delete', "Quitó el dominio {$domain}", $request->ip());

        return $warning
            ? back()->withErrors(['domain' => $warning])
            : back()->with('success', "Dominio {$domain} quitado".($subdomain->provider === 'cloudflare' ? ' y borrado de Cloudflare.' : '. Ya puedes borrar sus registros en tu proveedor de DNS.'));
    }
}
