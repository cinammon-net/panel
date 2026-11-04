<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Egg extends Model
{
    protected $table = 'eggs';

    protected $fillable = [
        'uuid',
        'author',
        'name',
        'description',
        'category',
        'startup',
        'config_from',
        'config_stop',
        'config_logs',
        'config_startup',
        'config_files',
        'script_install',
        'script_is_privileged',
        'script_entry',
        'script_container',
        'copy_script_from',
        'features',
        'docker_images',
        'update_url',
        'file_denylist',
        'force_outgoing_ip',
        'tags',
        'image',
    ];

    /** El icono puede pesar decenas de KB: nunca viaja en el JSON, solo su URL. */
    protected $hidden = ['image'];

    protected $appends = ['image_url'];

    private const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

    /**
     * Valida un icono (data URI png/jpeg/webp/gif o URL https). Devuelve el valor
     * normalizado o null si no es válido. SVG no se acepta (puede llevar scripts).
     */
    public static function normalizeImage(mixed $value): ?string
    {
        if (!is_string($value) || ($value = trim($value)) === '') {
            return null;
        }
        if (preg_match('#^https://[^\s"\'<>]+$#i', $value) && strlen($value) <= 2048) {
            return $value;
        }

        return self::decodeImage($value) ? $value : null;
    }

    /** @return array{0: string, 1: string}|null [mime, bytes] */
    public static function decodeImage(?string $value): ?array
    {
        if (!$value || !preg_match('#^data:(image/[a-z+]+);base64,([A-Za-z0-9+/=\s]+)$#', $value, $m)) {
            return null;
        }
        $mime = strtolower($m[1]) === 'image/jpg' ? 'image/jpeg' : strtolower($m[1]);
        $bytes = base64_decode($m[2], true);
        if (!in_array($mime, self::IMAGE_MIMES, true) || $bytes === false || strlen($bytes) > 1024 * 1024) {
            return null;
        }
        // Comprueba que el contenido es realmente esa imagen.
        $info = @getimagesizefromstring($bytes);

        return $info && in_array($info['mime'], self::IMAGE_MIMES, true) ? [$info['mime'], $bytes] : null;
    }

    public function getImageUrlAttribute(): ?string
    {
        $image = $this->attributes['image'] ?? null;
        if (!$image) {
            return null;
        }
        if (str_starts_with($image, 'https://')) {
            return $image;
        }

        return route('egg-icons.show', ['uuid' => $this->uuid, 'v' => $this->updated_at?->timestamp]);
    }

    public function servers(): HasMany
    {
        return $this->hasMany(Server::class, 'egg_id');
    }

    public function variables(): HasMany
    {
        return $this->hasMany(EggVariable::class, 'egg_id');
    }
}
