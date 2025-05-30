<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subuser extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'server_id',
        'permissions',
    ];

    /**
     * El subuser pertenece a un usuario.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * El subuser pertenece a un servidor.
     */
    public function server()
    {
        return $this->belongsTo(Server::class);
    }

    /**
     * Si usas permisos en JSON, puedes castearlo como array.
     */
    protected $casts = [
        'permissions' => 'array',
    ];
}
