<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunityAnswer extends Model
{
    protected $fillable = ['question_id', 'user_id', 'author_name', 'body', 'source', 'discord_message_id', 'helpful'];

    public function question(): BelongsTo
    {
        return $this->belongsTo(CommunityQuestion::class, 'question_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function authorName(): string
    {
        if ($this->source === 'assistant') {
            return 'Asistente de Cinammon';
        }

        return $this->user?->name ?? $this->author_name ?? 'Alguien de Discord';
    }
}
