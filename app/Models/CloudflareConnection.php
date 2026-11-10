<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Cuenta de Cloudflare de un cliente: su token de API (cifrado) para gestionar el DNS de sus dominios. */
class CloudflareConnection extends Model
{
    protected $fillable = ['user_id', 'token', 'token_hint', 'zones_count', 'verified_at'];

    protected $hidden = ['token'];

    protected $casts = [
        'token' => 'encrypted',
        'verified_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
