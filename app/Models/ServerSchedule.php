<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Tarea programada de un servidor (de momento, reinicio diario/semanal con avisos en el chat). */
class ServerSchedule extends Model
{
    protected $fillable = ['server_id', 'action', 'time', 'days', 'warn', 'enabled', 'last_run_at'];

    protected $casts = [
        'days' => 'array',
        'warn' => 'boolean',
        'enabled' => 'boolean',
        'last_run_at' => 'datetime',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }
}
