<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommunityQuestion extends Model
{
    public const CATEGORIES = [
        'general' => 'General',
        'minecraft' => 'Minecraft',
        'bots' => 'Bots',
        'web' => 'Webs y dominios',
        'panel' => 'Panel y archivos',
        'bases' => 'Bases de datos',
        'otros' => 'Otros juegos',
    ];

    protected $fillable = ['user_id', 'author_name', 'title', 'body', 'category', 'source', 'discord_thread_id', 'best_answer_id', 'solved_at', 'pinned'];

    protected $casts = ['solved_at' => 'datetime', 'pinned' => 'boolean'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(CommunityAnswer::class, 'question_id');
    }

    public function authorName(): string
    {
        return $this->user?->name ?? $this->author_name ?? 'Comunidad de Discord';
    }
}
