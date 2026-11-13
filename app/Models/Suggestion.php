<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Suggestion extends Model
{
    use HasFactory;

    public const CATEGORIES = [
        'panel' => 'Panel y Web',
        'games' => 'Servidores y Juegos',
        'bot' => 'Bot y Discord',
        'billing' => 'Tienda y Monedas',
        'infra' => 'Infraestructura',
        'general' => 'Otra idea',
    ];

    public const STATUSES = [
        'pending' => ['label' => 'Pendiente', 'color' => '#71717a', 'open' => true, 'tag' => 'Pendiente'],
        'review' => ['label' => 'En estudio', 'color' => '#38bdf8', 'open' => true, 'tag' => 'En estudio'],
        'accepted' => ['label' => 'Aceptada', 'color' => '#10b981', 'open' => true, 'tag' => 'Aceptada'],
        'done' => ['label' => 'Implementada', 'color' => '#a855f7', 'open' => false, 'tag' => 'Implementada'],
        'rejected' => ['label' => 'Descartada', 'color' => '#f59e0b', 'open' => false, 'tag' => 'Descartada'],
    ];

    protected $fillable = [
        'user_id',
        'discord_id',
        'author_name',
        'title',
        'what',
        'why',
        'category',
        'status',
        'staff_note',
        'discord_thread_id',
        'discord_message_id',
        'upvotes',
        'downvotes',
        'score',
        'status_updated_at',
    ];

    protected $casts = [
        'upvotes' => 'integer',
        'downvotes' => 'integer',
        'score' => 'integer',
        'status_updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(SuggestionVote::class);
    }

    public function authorName(): string
    {
        return $this->user?->name ?? $this->author_name ?: 'Anónimo';
    }

    public function authorAvatar(): ?string
    {
        return $this->user?->avatar_url;
    }

    public function isOpen(): bool
    {
        return self::STATUSES[$this->status]['open'] ?? true;
    }

    public function recalculateVotes(): void
    {
        $up = $this->votes()->where('direction', 1)->count();
        $down = $this->votes()->where('direction', -1)->count();

        $this->update([
            'upvotes' => $up,
            'downvotes' => $down,
            'score' => $up - $down,
        ]);
    }
}
