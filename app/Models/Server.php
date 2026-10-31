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

    public function subusers()
    {
        return $this->hasMany(Subuser::class, 'server_id');
    }

    protected static function booted()
    {
        static::deleting(function (Server $server) {
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
