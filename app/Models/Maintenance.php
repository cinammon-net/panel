<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Ventana de mantenimiento programada: se anuncia a los usuarios con antelación
 * y, si block_access, solo los admins pueden usar el panel mientras dura.
 */
class Maintenance extends Model
{
    public const SCOPES = ['panel', 'store', 'servers'];

    /** Con cuánta antelación se empieza a mostrar el aviso. */
    public const ANNOUNCE_DAYS = 7;

    protected $fillable = ['title', 'message', 'starts_at', 'ends_at', 'scope', 'block_access', 'notified_at', 'cancelled_at', 'created_by'];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'notified_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'scope' => 'array',
        'block_access' => 'boolean',
    ];

    public function creator(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->whereNull('cancelled_at')
            ->where('starts_at', '<=', now()->addDays(self::ANNOUNCE_DAYS))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()));
    }

    public function isActive(): bool
    {
        return $this->cancelled_at === null
            && $this->starts_at->isPast()
            && ($this->ends_at === null || $this->ends_at->isFuture());
    }

    public function status(): string
    {
        if ($this->cancelled_at) return 'cancelled';
        if ($this->ends_at && $this->ends_at->isPast()) return 'finished';

        return $this->starts_at->isFuture() ? 'scheduled' : 'active';
    }

    /** Datos públicos (sin autor) para avisos del panel, el login y la tienda. */
    public function toPublic(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'message' => $this->message,
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'scope' => array_values($this->scope ?? []),
            'block_access' => $this->block_access,
            'active' => $this->isActive(),
        ];
    }

    /** El mantenimiento más relevante ahora mismo: el activo, o el próximo. Cacheado 30 s. */
    public static function current(): ?array
    {
        return Cache::remember('maintenance:current', 30, function () {
            $all = self::visible()->orderBy('starts_at')->get();
            $active = $all->first(fn (self $m) => $m->isActive());

            return ($active ?? $all->first())?->toPublic();
        });
    }

    public static function forgetCache(): void
    {
        Cache::forget('maintenance:current');
    }

    protected static function booted(): void
    {
        static::saved(fn () => self::forgetCache());
        static::deleted(fn () => self::forgetCache());
    }
}
