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
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
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
