<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SftpCredential extends Model
{
    protected $fillable = ['server_id', 'user_id', 'username', 'password_hash', 'rotated_at', 'last_used_at', 'last_used_ip'];

    protected $hidden = ['password_hash'];

    protected function casts(): array
    {
        return ['rotated_at' => 'datetime', 'last_used_at' => 'datetime'];
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Usuario SFTP propio de cada persona y servidor: «<nombre><id>.<8 primeros del servidor>». */
    public static function usernameFor(User $user, Server $server): string
    {
        $name = substr(Str::slug($user->name, ''), 0, 16) ?: 'user';

        return strtolower($name.$user->id.'.'.$server->uuid_short);
    }

    /** Contraseña aleatoria de 24 caracteres: la genera el panel, nunca la elige la persona. */
    public static function generatePassword(): string
    {
        return Str::password(24, letters: true, numbers: true, symbols: false);
    }
}
