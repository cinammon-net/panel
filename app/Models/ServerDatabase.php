<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Base de datos real de un cliente en la MariaDB del VPS (creada por DatabaseProvisioner). */
class ServerDatabase extends Model
{
    protected $fillable = ['server_id', 'database', 'username', 'password', 'remote'];

    protected $hidden = ['password'];

    protected $casts = ['password' => 'encrypted'];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
