<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Configuración administrativa de proveedores de inicio de sesión social (OAuth / OIDC).
 * Permite activar, desactivar y guardar credenciales cifradas desde el panel web sin tocar .env.
 */
class SocialProviderSetting extends Model
{
    private const CACHE_KEY = 'social_provider_settings:v1';

    protected $fillable = [
        'provider',
        'enabled',
        'client_id',
        'client_secret',
        'tenant',
        'updated_by',
    ];

    protected $hidden = [
        'client_secret',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'client_secret' => 'encrypted',
    ];

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
    }

    /** Devuelve los registros indexados por proveedor sin romper si la migración aún no corrió. */
    public static function forMap(): array
    {
        if (! Schema::hasTable('social_provider_settings')) {
            return [];
        }

        return Cache::remember(self::CACHE_KEY, 60, fn () => self::query()->get()->keyBy('provider')->all());
    }

    public static function normalizeCloudflareTeamDomain(?string $raw): string
    {
        $v = trim((string) $raw);
        if ($v === '') {
            return '';
        }
        $v = preg_replace('#^https?://#i', '', $v);
        $v = rtrim((string) $v, '/');
        if (! str_contains($v, '.')) {
            $v .= '.cloudflareaccess.com';
        }

        return 'https://'.$v;
    }

    /**
     * Resuelve estado efectivo y credenciales combinando BD (si existe) con fallback en .env/config.
     *
     * @return array{enabled:bool,client_id:string,client_secret:string,tenant:string,redirect:string,ready:bool,has_secret:bool}
     */
    public static function resolveFor(string $provider): array
    {
        $row = self::forMap()[$provider] ?? null;

        $envId = trim((string) config("services.$provider.client_id", ''));
        $envSecret = trim((string) config("services.$provider.client_secret", ''));
        $envTenant = trim((string) config("services.$provider.tenant", $provider === 'microsoft' ? 'common' : ''));
        $envRedirect = trim((string) config("services.$provider.redirect", ''));

        $clientId = $row && filled($row->client_id) ? trim((string) $row->client_id) : $envId;
        $clientSecret = $row && filled($row->client_secret) ? trim((string) $row->client_secret) : $envSecret;
        $tenant = $row && filled($row->tenant) ? trim((string) $row->tenant) : $envTenant;

        if ($provider === 'cloudflare') {
            $tenant = self::normalizeCloudflareTeamDomain($tenant);
        } elseif ($provider === 'microsoft' && $tenant === '') {
            $tenant = 'common';
        }

        $enabled = $row ? (bool) $row->enabled : ($clientId !== '' && $clientSecret !== '');
        $hasCredentials = $clientId !== '' && $clientSecret !== '' && ($provider !== 'cloudflare' || $tenant !== '');

        return [
            'enabled' => $enabled,
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'tenant' => $tenant,
            'redirect' => $envRedirect ?: url("/auth/$provider/callback"),
            'ready' => $enabled && $hasCredentials,
            'has_secret' => $clientSecret !== '',
        ];
    }
}
