<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServerFolder extends Model
{
    protected $table = 'server_folders';

    protected $fillable = [
        'user_id',
        'parent_id',
        'name',
        'color',
        'icon',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ServerFolder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ServerFolder::class, 'parent_id')->orderBy('name');
    }

    public function members(): HasMany
    {
        return $this->hasMany(ServerFolderMember::class, 'folder_id');
    }

    public function servers(): BelongsToMany
    {
        return $this->belongsToMany(Server::class, 'server_folder_members', 'folder_id', 'server_id');
    }

    /** Obtener todos los IDs de esta carpeta y todas sus subcarpetas descendientes. */
    public static function descendantIdsAndSelf(int $folderId, int $userId): array
    {
        $all = static::where('user_id', $userId)->get(['id', 'parent_id']);
        $ids = [$folderId];
        $changed = true;

        while ($changed) {
            $changed = false;
            foreach ($all as $item) {
                if ($item->parent_id && in_array($item->parent_id, $ids, true) && !in_array($item->id, $ids, true)) {
                    $ids[] = $item->id;
                    $changed = true;
                }
            }
        }

        return $ids;
    }
}
