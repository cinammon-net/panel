<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Server extends Model
{
    use HasFactory;

    protected $table = 'servers';

    protected $fillable = [
        'uuid', 'uuidShort', 'node', 'name','active', 'owner', 'memory', 'swap',
        'disk', 'io', 'cpu', 'egg_id','oom_disabled', 'ip', 'port',
        'service', 'option', 'startup', 'daemonSecret', 'username', 'installed',
    ];

    /**
     * Relación: Egg al que pertenece el servidor
     */
    public function egg()
    {
        return $this->belongsTo(Egg::class);
    }

    /**
     * Relación opcional: Nodo al que pertenece el servidor
     * (si el campo 'node' es una foreign key, puedes hacer esto)
     */
    public function node()
    {
        return $this->belongsTo(Node::class, 'node');
    }

    /**
     * Relación opcional: Usuario que es dueño del servidor
     * (si tienes una tabla 'users' con ID igual al campo 'owner')
     */
    public function ownerUser()
    {
        return $this->belongsTo(User::class, 'owner');
    }
}
