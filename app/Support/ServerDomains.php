<?php

namespace App\Support;

use App\Models\CloudflareConnection;
use App\Models\Server;
use App\Models\ServerSubdomain;
use App\Models\User;
use App\Services\Cloudflare\CloudflareClient;
use App\Services\Cloudflare\CloudflareException;
use Illuminate\Support\Facades\Log;

/**
 * Dominios propios de los clientes (solo servidores de pago).
 *
 *  - Servidor de juego: CNAME sin proxy (nube gris) hacia el host público del nodo, y en Minecraft Java
 *    además un SRV para entrar sin escribir el puerto. Cloudflare no puede hacer de proxy de juegos.
 *  - Web de hosting: registro A con proxy (nube naranja) hacia el nodo; nginx lo enruta a la web
 *    gracias a sites:export y al script cinammon-sites-sync.
 *
 * Con Cloudflare conectado el panel crea y borra los registros en la zona del cliente; sin él,
 * el cliente los crea a mano y el panel comprueba el DNS.
 */
class ServerDomains
{
    public const MAX_PER_SERVER = 5;

    /** Dominios de la casa: nadie los usa como dominio propio (salvo el equipo). */
    private const PROTECTED_SUFFIXES = ['cinammon.net', 'cinammon.es', 'playcinammon.com'];

    public static function allowed(Server $server, ?User $user): bool
    {
        return $server->hasPaidPlan() || ($user && $user->hasAnyRole(['Owner', 'Admin']));
    }

    public static function kind(Server $server): string
    {
        return $server->isWebSite() ? 'web' : 'game';
    }

    /** Minecraft Java (admite registros SRV). Bedrock y compañía no los usan. */
    public static function usesSrv(Server $server): bool
    {
        if (MinecraftAddons::kind($server) === null) {
            return false;
        }
        $name = strtolower((string) $server->egg?->name);
        foreach (['bedrock', 'pocketmine', 'nukkit', 'gomint', 'waterdog'] as $word) {
            if (str_contains($name, $word)) {
                return false;
            }
        }

        return true;
    }

    /** Host público del nodo (registro solo DNS, p. ej. play.cinammon.net) o null si no hay. */
    public static function nodeHost(): ?string
    {
        $host = strtolower(trim((string) config('panel.public_host', '')));

        return $host !== '' && ! filter_var($host, FILTER_VALIDATE_IP) ? $host : null;
    }

    public static function nodeIp(Server $server): ?string
    {
        $configured = trim((string) config('panel.public_host', ''));
        if (filter_var($configured, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return $configured;
        }
        if ($host = self::nodeHost()) {
            $ip = gethostbyname($host);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
        $ip = (string) $server->allocation?->ip;

        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) ? $ip : null;
    }

    public static function port(Server $server): ?int
    {
        return $server->allocation?->port ? (int) $server->allocation->port : null;
    }

    /**
     * Normaliza lo que escribe el cliente ("https://Play.MiServer.com/" → "play.miserver.com")
     * y comprueba que es un nombre de dominio válido. Devuelve null si no lo es.
     */
    public static function normalize(string $input): ?string
    {
        $domain = strtolower(trim($input));
        $domain = preg_replace('#^[a-z]+://#', '', $domain);
        $domain = rtrim(explode('/', $domain)[0], '.');
        $domain = preg_replace('/:\d+$/', '', $domain);
        if ($domain !== '' && preg_match('/[^\x20-\x7e]/', $domain) && function_exists('idn_to_ascii')) {
            $domain = idn_to_ascii($domain, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46) ?: '';
        }
        $label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
        if (strlen($domain) > 253 || ! preg_match('/^(?:'.$label.'\.)+[a-z][a-z0-9-]{1,62}$/', $domain)) {
            return null;
        }

        return $domain;
    }

    public static function isProtected(string $domain): bool
    {
        foreach (self::PROTECTED_SUFFIXES as $suffix) {
            if ($domain === $suffix || str_ends_with($domain, '.'.$suffix)) {
                return true;
            }
        }

        return false;
    }

    /** Errores comunes antes de crear: devuelve el mensaje o null si todo bien. */
    public static function precheck(Server $server, User $user, string $domain): ?string
    {
        if (self::isProtected($domain) && ! $user->hasAnyRole(['Owner', 'Admin'])) {
            return 'Ese dominio es de Cinammon. Usa un dominio tuyo.';
        }
        if (ServerSubdomain::where('domain', $domain)->exists()) {
            return 'Ese dominio ya está vinculado a un servidor.';
        }
        if (ServerSubdomain::where('server_id', $server->id)->count() >= self::MAX_PER_SERVER) {
            return 'Este servidor ya tiene '.self::MAX_PER_SERVER.' dominios, que es el máximo.';
        }
        if (self::kind($server) === 'web') {
            if (! self::nodeIp($server)) {
                return 'El nodo no tiene una IP pública configurada. Avisa al soporte.';
            }
        } elseif (! self::port($server)) {
            return 'El servidor no tiene un puerto principal asignado.';
        }

        return null;
    }

    /**
     * Registros DNS que necesita el dominio, en formato de la API de Cloudflare
     * (también se usan para mostrar las instrucciones del modo manual).
     */
    public static function records(Server $server, string $domain, bool $apex = false): array
    {
        $records = [];
        if (self::kind($server) === 'web') {
            $records[] = ['type' => 'A', 'name' => $domain, 'content' => self::nodeIp($server), 'proxied' => true, 'ttl' => 1];

            return $records;
        }

        $host = self::nodeHost();
        // En la raíz del dominio muchos proveedores no admiten CNAME: ahí se usa A (Cloudflare sí lo aplana).
        $records[] = $host && ! $apex
            ? ['type' => 'CNAME', 'name' => $domain, 'content' => $host, 'proxied' => false, 'ttl' => 1]
            : ['type' => 'A', 'name' => $domain, 'content' => self::nodeIp($server), 'proxied' => false, 'ttl' => 1];
        if (self::usesSrv($server)) {
            $records[] = [
                'type' => 'SRV',
                'name' => '_minecraft._tcp.'.$domain,
                'data' => ['priority' => 0, 'weight' => 5, 'port' => self::port($server), 'target' => $domain],
                'ttl' => 1,
            ];
        }

        return $records;
    }

    /** Lo que tienen que escribir los jugadores (o la URL de la web). */
    public static function address(ServerSubdomain $sub, Server $server): string
    {
        if ($sub->kind === 'web') {
            return 'https://'.$sub->domain;
        }
        $port = self::port($server);
        $srv = collect($sub->records ?? [])->contains(fn ($r) => ($r['type'] ?? '') === 'SRV')
            || ($sub->provider === 'manual' && self::usesSrv($server) && $sub->status === 'active' && ! $sub->last_error);

        return $srv || ! $port ? $sub->domain : $sub->domain.':'.$port;
    }

    // ------------------------------------------------------------------ Cloudflare

    public static function client(CloudflareConnection $connection): CloudflareClient
    {
        return new CloudflareClient((string) $connection->token);
    }

    /**
     * Crea los registros en la zona de Cloudflare del cliente. Si algo falla a medias, borra lo creado.
     *
     * @throws CloudflareException
     */
    public static function createWithCloudflare(Server $server, User $user, CloudflareConnection $connection, array $zone, string $domain): ServerSubdomain
    {
        $client = self::client($connection);
        $records = self::records($server, $domain, $domain === $zone['name']);

        foreach ($records as $record) {
            foreach ($client->recordsNamed($zone['id'], $record['name']) as $existing) {
                // Un CNAME no puede convivir con otros registros, y no pisamos nada que el cliente ya tenga.
                throw new CloudflareException("Ya tienes un registro {$existing['type']} llamado {$record['name']} en Cloudflare. Bórralo allí o elige otro nombre.");
            }
        }

        $created = [];
        try {
            foreach ($records as $record) {
                $result = $client->createRecord($zone['id'], $record + ['comment' => 'Cinammon: '.$server->name]);
                $created[] = ['id' => (string) $result['id'], 'type' => $record['type'], 'name' => $record['name']];
            }
        } catch (CloudflareException $e) {
            foreach ($created as $record) {
                try {
                    $client->deleteRecord($zone['id'], $record['id']);
                } catch (\Throwable) {
                }
            }
            throw $e;
        }

        return ServerSubdomain::create([
            'server_id' => $server->id,
            'domain' => $domain,
            'provider' => 'cloudflare',
            'kind' => self::kind($server),
            'status' => 'active',
            'zone_id' => $zone['id'],
            'zone_name' => $zone['name'],
            'port' => self::port($server),
            'records' => $created,
            'verified_at' => now(),
            'created_by' => $user->id,
        ]);
    }

    public static function createManual(Server $server, User $user, string $domain): ServerSubdomain
    {
        $sub = ServerSubdomain::create([
            'server_id' => $server->id,
            'domain' => $domain,
            'provider' => 'manual',
            'kind' => self::kind($server),
            'status' => 'pending',
            'port' => self::port($server),
            'created_by' => $user->id,
        ]);
        self::verify($sub, $server);

        return $sub;
    }

    /** Conexión de Cloudflare con la que se crearon los registros (la de quien lo vinculó). */
    public static function connectionFor(ServerSubdomain $sub): ?CloudflareConnection
    {
        return $sub->created_by ? CloudflareConnection::where('user_id', $sub->created_by)->first() : null;
    }

    // ------------------------------------------------------------------ Comprobación y mantenimiento

    /** Comprueba el DNS real del dominio y actualiza su estado. */
    public static function verify(ServerSubdomain $sub, Server $server): ServerSubdomain
    {
        if ($sub->provider === 'cloudflare') {
            $connection = self::connectionFor($sub);
            if (! $connection) {
                $sub->update(['status' => 'error', 'last_error' => 'Se desconectó la cuenta de Cloudflare con la que se creó.']);

                return $sub;
            }
            try {
                $client = self::client($connection);
                $missing = collect($sub->records ?? [])->reject(fn ($r) => collect($client->recordsNamed((string) $sub->zone_id, $r['name']))
                    ->contains(fn ($e) => (string) $e['id'] === (string) $r['id']))->pluck('name')->unique()->values();
                $sub->update($missing->isEmpty()
                    ? ['status' => 'active', 'last_error' => null, 'verified_at' => now()]
                    : ['status' => 'error', 'last_error' => 'Falta en Cloudflare: '.$missing->implode(', ').'. Bórralo y vuelve a vincularlo.']);
            } catch (CloudflareException $e) {
                $sub->update(['status' => 'error', 'last_error' => mb_substr($e->getMessage(), 0, 255)]);
            }

            return $sub;
        }

        // Manual: el dominio tiene que resolver a la misma IP que el nodo.
        $want = array_filter([self::nodeIp($server)]);
        if ($host = self::nodeHost()) {
            $want = array_unique(array_merge($want, gethostbynamel($host) ?: []));
        }
        $got = gethostbynamel($sub->domain) ?: [];
        if (! $got || ! array_intersect($want, $got)) {
            $sub->update([
                'status' => 'pending',
                'last_error' => $got ? 'El dominio apunta a '.implode(', ', $got).', no a tu servidor.' : 'Todavía no existe el registro DNS (puede tardar unos minutos en propagarse).',
            ]);

            return $sub;
        }

        $note = null;
        if (self::usesSrv($server)) {
            $srv = @dns_get_record('_minecraft._tcp.'.$sub->domain, DNS_SRV) ?: [];
            $ok = collect($srv)->contains(fn ($r) => (int) ($r['port'] ?? 0) === self::port($server));
            $note = $ok ? null : 'Falta el registro SRV: de momento hay que poner el puerto al conectarse.';
        }
        $sub->update(['status' => 'active', 'last_error' => $note, 'verified_at' => now(), 'port' => self::port($server)]);

        return $sub;
    }

    /** Tras cambiar el puerto principal: actualiza el SRV en Cloudflare (o marca el manual para revisar). */
    public static function syncPort(Server $server): void
    {
        $server->loadMissing('allocation');
        $port = self::port($server);
        foreach (ServerSubdomain::where('server_id', $server->id)->where('kind', 'game')->get() as $sub) {
            if ($port === null || $sub->port === $port) {
                continue;
            }
            try {
                if ($sub->provider === 'cloudflare' && ($connection = self::connectionFor($sub))) {
                    $client = self::client($connection);
                    foreach ($sub->records ?? [] as $record) {
                        if (($record['type'] ?? '') === 'SRV') {
                            $client->updateRecord((string) $sub->zone_id, $record['id'], [
                                'data' => ['priority' => 0, 'weight' => 5, 'port' => $port, 'target' => $sub->domain],
                            ]);
                        }
                    }
                    $sub->update(['port' => $port]);
                } elseif ($sub->provider === 'manual' && self::usesSrv($server)) {
                    $sub->update(['port' => $port, 'last_error' => "Cambiaste el puerto: actualiza el SRV de {$sub->domain} al puerto {$port}."]);
                } else {
                    $sub->update(['port' => $port]);
                }
            } catch (\Throwable $e) {
                Log::warning("Dominio {$sub->domain}: no se pudo actualizar el puerto: ".$e->getMessage());
                $sub->update(['last_error' => 'No se pudo actualizar el puerto en Cloudflare.']);
            }
        }
    }

    /** Borra los registros de Cloudflare (si los creó el panel) y el dominio. Devuelve un aviso si no pudo. */
    public static function remove(ServerSubdomain $sub): ?string
    {
        $warning = null;
        if ($sub->provider === 'cloudflare' && $sub->records) {
            $connection = self::connectionFor($sub);
            if (! $connection) {
                $warning = 'No se pudieron borrar los registros de Cloudflare (la cuenta ya no está conectada). Bórralos a mano.';
            } else {
                try {
                    $client = self::client($connection);
                    foreach ($sub->records as $record) {
                        $client->deleteRecord((string) $sub->zone_id, (string) $record['id']);
                    }
                } catch (CloudflareException $e) {
                    $warning = 'El dominio se ha quitado, pero Cloudflare no dejó borrar los registros: '.$e->getMessage();
                }
            }
        }
        $sub->delete();

        return $warning;
    }

    public static function removeAllFor(Server $server): void
    {
        foreach (ServerSubdomain::where('server_id', $server->id)->get() as $sub) {
            try {
                self::remove($sub);
            } catch (\Throwable $e) {
                Log::warning("No se pudo quitar el dominio {$sub->domain}: ".$e->getMessage());
            }
        }
    }
}
