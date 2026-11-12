<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FriendPost extends Model
{
    protected $fillable = ['user_id', 'kind', 'body', 'color', 'granted_at', 'reply'];

    protected $casts = ['granted_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
