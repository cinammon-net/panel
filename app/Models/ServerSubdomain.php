<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Dominio propio de un cliente apuntando a uno de sus servidores. */
class ServerSubdomain extends Model
{
    protected $fillable = [
        'server_id', 'domain', 'provider', 'kind', 'status', 'zone_id', 'zone_name', 'port',
        'records', 'last_error', 'verified_at', 'created_by',
    ];

    protected $casts = [
        'records' => 'array',
        'port' => 'integer',
        'verified_at' => 'datetime',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
