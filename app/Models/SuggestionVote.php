<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SuggestionVote extends Model
{
    use HasFactory;

    protected $fillable = [
        'suggestion_id',
        'user_id',
        'discord_id',
        'direction',
    ];

    protected $casts = [
        'direction' => 'integer',
    ];

    public function suggestion(): BelongsTo
    {
        return $this->belongsTo(Suggestion::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
