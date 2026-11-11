<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

/**
 * Anuncio comercial (ofertas, novedades, eventos) que se muestra en la landing,
 * el panel y la tienda para atraer y retener clientes.
 */
class Announcement extends Model
{
    public const TYPES = ['offer', 'new', 'event', 'news'];

    public const PLACES = ['web', 'panel', 'store'];

    /** Máximo de anuncios simultáneos que se envían al frontend. */
    public const MAX_LIVE = 6;

    protected $fillable = [
        'type', 'title', 'message', 'highlight', 'coupon_code', 'cta_label', 'cta_url',
        'places', 'popup', 'enabled', 'starts_at', 'ends_at', 'created_by',
    ];

    protected $casts = [
        'places' => 'array',
        'popup' => 'boolean',
        'enabled' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'clicks' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Publicados ahora mismo. */
    public function scopeLive(Builder $query): Builder
    {
        return $query->where('enabled', true)
            ->where('starts_at', '<=', now())
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()));
    }

    public function status(): string
    {
        if (!$this->enabled) return 'paused';
        if ($this->ends_at && $this->ends_at->isPast()) return 'finished';

        return $this->starts_at->isFuture() ? 'scheduled' : 'live';
    }

    /** Datos públicos (sin autor ni métricas). */
    public function toPublic(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'highlight' => $this->highlight,
            'coupon_code' => $this->coupon_code,
            'cta_label' => $this->cta_label,
            'cta_url' => $this->cta_url,
            'places' => array_values($this->places ?? []),
            'popup' => $this->popup,
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
        ];
    }

    /** Anuncios publicados (ofertas primero, luego los más recientes). Cacheado 60 s. */
    public static function liveList(): array
    {
        return Cache::remember('announcements:live', 60, fn () => self::live()
            ->orderByRaw("CASE WHEN type = 'offer' THEN 0 ELSE 1 END")
            ->latest('starts_at')
            ->limit(self::MAX_LIVE)
            ->get()
            ->map(fn (self $a) => $a->toPublic())
            ->all());
    }

    public static function forgetCache(): void
    {
        Cache::forget('announcements:live');
    }

    protected static function booted(): void
    {
        static::saved(fn () => self::forgetCache());
        static::deleted(fn () => self::forgetCache());
    }
}
