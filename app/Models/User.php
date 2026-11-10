<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use App\Models\Ticket;
use App\Models\Role;


class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'timezone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'lock_code',
    ];

    /** La foto de perfil ya resuelta (URL) va con el usuario a todas las páginas. */
    protected $appends = ['avatar_url'];

    /**
     * URL de la foto de perfil: las subidas se guardan como "avatars/x.png" en el disco public
     * (se sirven en /storage/...), las de Discord u otros proveedores ya son una URL completa.
     */
    public static function avatarUrlFor(?string $avatar): ?string
    {
        $avatar = trim((string) $avatar);
        if ($avatar === '') {
            return null;
        }
        if (preg_match('#^(https?:)?//#i', $avatar) || str_starts_with($avatar, '/') || str_starts_with($avatar, 'data:')) {
            return $avatar;
        }

        return '/storage/'.ltrim($avatar, '/');
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return self::avatarUrlFor($this->attributes['avatar'] ?? null);
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'lock_code_set_at' => 'datetime',
            'lock_enabled_until' => 'datetime',
        ];
    }

    public function hasSecurityCode(): bool
    {
        return $this->lock_code !== null;
    }

    /** El bloqueo está activo hasta `lock_enabled_until`; después se apaga solo. */
    public function securityLockActive(): bool
    {
        return $this->hasSecurityCode() && $this->lock_enabled_until?->isFuture() === true;
    }

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    public function servers()
    {
        return $this->hasMany(Server::class, 'owner_id');
    }

    public function subusers()
    {
        return $this->hasMany(Subuser::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    protected static function booted()
    {
        static::created(function ($user) {
            // Asegura que existan los roles necesarios
            $ownerRole = Role::firstOrCreate(['name' => 'Owner', 'guard_name' => 'web']);
            $membersRole = Role::firstOrCreate(['name' => 'Members', 'guard_name' => 'web']);

            if (User::count() === 1) {
                $user->assignRole($ownerRole);
            } else {
                $user->assignRole($membersRole);
            }
        });
    }
}
