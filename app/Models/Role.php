<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    public const OWNER = 'Owner';
    public const ADMIN = 'Admin';
    public const MOD = 'Moderador';
    public const HELPER = 'Helper';
    public const SPONSERS = 'Sponsers';
    public const MIEMBROS = 'Miembros';

    protected $fillable = ['name', 'guard_name', 'node_id'];

    /**
     * Relación con los usuarios que tienen este rol.
     */
    public function users(): MorphToMany
    {
        return $this->morphedByMany(User::class, 'model', 'model_has_roles', 'role_id', 'model_id');
    }

    /**
     * Relación con el nodo (si está asociado a uno).
     */
    public function node(): BelongsTo
    {
        return $this->belongsTo(Node::class);
    }
}
