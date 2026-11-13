<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    protected $fillable = [
        'author_id',
        'title',
        'category',
        'summary',
        'content',
        'picture',
        'is_pinned',
        'views_count',
        'likes_count',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'views_count' => 'integer',
        'likes_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Autor de la publicación.
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * Likes de la publicación.
     */
    public function likes(): HasMany
    {
        return $this->hasMany(PostLike::class, 'post_id');
    }

    /**
     * Comprueba si un usuario dado ya ha dado like a la publicación.
     */
    public function isLikedBy(?User $user, ?string $ip = null): bool
    {
        if ($user) {
            return $this->likes()->where('user_id', $user->id)->exists();
        }
        if ($ip) {
            return $this->likes()->where('ip_address', $ip)->exists();
        }
        return false;
    }
}
