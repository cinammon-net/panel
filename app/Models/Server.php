<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Server extends Model
{
    use HasFactory;

    protected $table = 'servers';

    protected $fillable = ['image', 'banner', 'oom_killer', 'uuid', 'uuid_short', 'node_id', 'name', 'active', 'owner_id', 'memory', 'swap', 'disk', 'io', 'cpu', 'egg_id', 'oom_disabled', 'ip', 'port', 'service', 'option', 'startup', 'daemon_secret', 'username', 'installed_at', 'description', 'status', 'database_limit', 'allocation_limit', 'threads', 'backup_limit', 'docker_labels', 'allocation_id', 'primary_allocation', 'additional_allocations', 'run_install_script', 'start_after_install', 'bungee_version', 'bungee_jar_file', 'cpu_pinning', 'swap_memory'];

    protected $appends = ['short_uuid'];

    public function getShortUuidAttribute()
    {
        return substr($this->uuid, 0, 8);
    }

    public function egg()
    {
        return $this->belongsTo(Egg::class);
    }

    public function node()
    {
        return $this->belongsTo(Node::class, 'node_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function allocation()
    {
        return $this->belongsTo(Allocation::class, 'allocation_id');
    }

    /** Web hosting servers (egg category "web") are published as <slug>-<uuid4>.<sites_domain> behind Cloudflare. */
    public function isWebSite(): bool
    {
        return $this->egg?->category === 'web';
    }

    /** Web con PHP de Cinammon (WebHost o WordPress): admite el instalador de WordPress del panel. */
    public function supportsWordpress(): bool
    {
        return $this->isWebSite() && str_contains(str_replace('\\/', '/', (string) $this->egg?->docker_images), 'cinammon-net/webhost');
    }

    /**
     * Public hostname of a web hosting server, e.g. "mi-tienda-45c5.cinammon.net", or null when
     * this is not a web server or PANEL_SITES_DOMAIN is empty. The 4-char uuid suffix keeps it unique
     * and avoids clashing with real subdomains (panel, billing...). Renaming the server changes it.
     */
    public function siteHost(): ?string
    {
        $domain = trim((string) config('panel.sites_domain', ''));
        if ($domain === '' || ! $this->isWebSite() || ! $this->uuid) {
            return null;
        }

        $slug = trim(substr(\Illuminate\Support\Str::slug((string) $this->name), 0, 40), '-');

        return ($slug !== '' ? $slug : 'web') . '-' . substr($this->uuid, 0, 4) . '.' . $domain;
    }

    /**
     * Servidores de pago: los de la tienda pagados con dinero (no los gratuitos con monedas) y los que
     * crea el equipo a mano (sin pedido de la tienda). Solo estos pueden usar dominios propios.
     */
    public function hasPaidPlan(): bool
    {
        $external = (string) $this->external_id;
        if (str_starts_with($external, 'billing-')) {
            return (bool) $this->billing_paid;
        }

        return true;
    }

    public function siteUrl(): ?string
    {
        $host = $this->siteHost();

        return $host ? 'https://' . $host : null;
    }

    /** Address shown to customers: the site hostname for web servers, otherwise public host:port. */
    public function publicAddress(): ?string
    {
        return $this->siteHost() ?? $this->allocation?->publicAddress();
    }

    public function subusers()
    {
        return $this->hasMany(Subuser::class, 'server_id');
    }

    public function sftpCredentials()
    {
        return $this->hasMany(SftpCredential::class);
    }

    protected static function booted()
    {
        static::deleting(function (Server $server) {
            // Dominios propios: quitar sus registros de Cloudflare
            try {
                \App\Support\ServerDomains::removeAllFor($server);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("No se pudieron quitar los dominios del servidor {$server->id}: " . $e->getMessage());
            }

            // 0. Borrar de MariaDB las bases de datos reales del servidor y sus usuarios
            try {
                foreach (\App\Models\ServerDatabase::where('server_id', $server->id)->get() as $database) {
                    app(\App\Support\DatabaseProvisioner::class)->drop($database);
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("No se pudieron borrar las bases de datos del servidor {$server->id}: " . $e->getMessage());
            }

            // 1. Eliminar contenedor Docker y archivos en disco a través de Wings
            try {
                if ($server->node && $server->uuid) {
                    app(\App\Services\Daemon\WingsClient::class)->delete($server);
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("No se pudo eliminar el servidor {$server->uuid} de Wings: " . $e->getMessage());
            }

            // 2. Liberar asignaciones de red y puertos asociados
            try {
                Allocation::where('server_id', $server->id)
                    ->orWhere('assigned_to', $server->id)
                    ->update([
                        'server_id' => null,
                        'assigned_to' => null,
                    ]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Error liberando allocations del servidor {$server->id}: " . $e->getMessage());
            }

            // 3. Eliminar accesos de subusuarios asociados
            try {
                $server->subusers()->delete();
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Error eliminando subusers del servidor {$server->id}: " . $e->getMessage());
            }

            // 4. Eliminar variables de configuración del servidor
            try {
                \Illuminate\Support\Facades\DB::table('server_variables')->where('server_id', $server->id)->delete();
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Error eliminando variables del servidor {$server->id}: " . $e->getMessage());
            }

            // 5. Limpiar claves de caché asociadas
            try {
                \Illuminate\Support\Facades\Cache::forget("server_databases_{$server->id}");
                \Illuminate\Support\Facades\Cache::forget("cinammon_server_banner_{$server->id}");
                \Illuminate\Support\Facades\Cache::forget("server_stats_{$server->id}");
            } catch (\Throwable $e) {
                // Silencioso
            }
        });
    }
}
