<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BirthdayCelebration extends Model
{
    protected $fillable = ['user_id', 'year', 'gifts', 'no_gift_reason', 'wishes', 'seen_at', 'card_sent_at'];

    protected $casts = ['gifts' => 'array', 'wishes' => 'array', 'seen_at' => 'datetime', 'card_sent_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
