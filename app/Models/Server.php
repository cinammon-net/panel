<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Server extends Model
{
    use HasFactory;

    // Especificamos la tabla que este modelo usará
    protected $table = 'servers';

    // Campos que pueden ser asignados masivamente
    protected $fillable = [
        'uuid', 'uuid_short', 'node_id', 'name',
        'active', 'owner_id', 'memory', 'swap',
        'disk', 'io', 'cpu', 'egg_id',
        'oom_disabled', 'ip', 'port', 'service',
        'option', 'startup', 'daemon_secret',
        'username', 'installed_at', 
        'description', 'status',
        'database_limit', 'allocation_limit',
        'threads', 'backup_limit', 'docker_labels',
        'allocation_id', 'primary_allocation',
        'additional_allocations', 'run_install_script',
        'start_after_install', 'bungee_version',
        'bungee_jar_file', 'cpu_pinning', 'swap_memory',
    ];

    /**
     * Relación: Egg al que pertenece el servidor.
     */
    public function egg()
    {
        return $this->belongsTo(Egg::class); // Un servidor pertenece a un solo Egg
    }

    /**
     * Relación: Nodo al que pertenece el servidor.
     */
    public function node()
    {
        return $this->belongsTo(Node::class, 'node_id');  // Un servidor pertenece a un solo Nodo
    }

    /**
     * Relación: Usuario propietario del servidor.
     */
    public function ownerUser()
    {
        return $this->belongsTo(User::class, 'owner_id');  // Un servidor pertenece a un solo propietario (usuario)
    }

}
