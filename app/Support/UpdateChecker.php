<?php

namespace App\Support;

use App\Models\Node;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Comprueba en GitHub Releases si hay versiones nuevas del panel y de Wings
 * y expone el estado del updater privilegiado del host.
 */
class UpdateChecker
{
    public static function status(bool $fresh = false): array
    {
        if (Panel::demoMode()) {
            return self::demoStatus();
        }

        $ttl = now()->addMinutes(max(1, (int) config('panel.updates.cache_minutes', 30)));

        if ($fresh) {
            Cache::forget('updates:latest');
        }

        $latest = Cache::remember('updates:latest', $ttl, fn () => [
            'panel' => self::latestRelease(config('panel.updates.panel_repo')),
            'wings' => self::latestRelease(config('panel.updates.wings_repo')),
        ]);

        $panelCurrent = (string) config('panel.version', '1.0.0');
        $wingsCurrent = self::wingsCurrentVersion();

        return [
            'panel' => self::compare($panelCurrent, $latest['panel']),
            'wings' => self::compare($wingsCurrent, $latest['wings']),
            'runner' => self::runnerStatus(),
            'demo' => false,
        ];
    }

    /** true si hay alguna actualización pendiente (para el banner del layout). */
    public static function available(): ?array
    {
        try {
            $status = self::status();
        } catch (\Throwable) {
            return null;
        }

        $pending = array_values(array_filter([
            $status['panel']['update_available'] ? 'panel' : null,
            $status['wings']['update_available'] ? 'wings' : null,
        ]));

        return [
            'pending' => $pending,
            'panel_latest' => $status['panel']['latest'],
            'wings_latest' => $status['wings']['latest'],
        ];
    }

    private static function latestRelease(?string $repo): ?array
    {
        if (! $repo) {
            return null;
        }

        try {
            $request = Http::timeout(4)->withHeaders([
                'Accept' => 'application/vnd.github+json',
                'User-Agent' => 'cinammon-panel-updater',
            ]);

            if ($token = config('panel.updates.github_token')) {
                $request = $request->withToken($token);
            }

            $response = $request->get("https://api.github.com/repos/{$repo}/releases/latest");

            if (! $response->successful()) {
                return null;
            }

            return [
                'tag' => ltrim((string) $response->json('tag_name'), 'v'),
                'name' => $response->json('name'),
                'notes' => (string) $response->json('body'),
                'url' => $response->json('html_url'),
                'published_at' => $response->json('published_at'),
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    private static function compare(string $current, ?array $latest): array
    {
        $latestTag = $latest['tag'] ?? null;

        return [
            'current' => $current,
            'latest' => $latestTag,
            'update_available' => $latestTag !== null && $current !== ''
                && version_compare($latestTag, ltrim($current, 'v'), '>'),
            'notes' => $latest['notes'] ?? null,
            'url' => $latest['url'] ?? null,
            'published_at' => $latest['published_at'] ?? null,
        ];
    }

    private static function wingsCurrentVersion(): string
    {
        return (string) Cache::remember('updates:wings-current', now()->addMinutes(5), function () {
            $node = Node::query()->first();
            if (! $node) {
                return '';
            }

            try {
                $scheme = $node->scheme ?: 'http';
                $port = $node->daemon_listen ?? 8080;
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $node->daemon_token,
                    'Accept' => 'application/json',
                ])->timeout(2)->get("{$scheme}://{$node->fqdn}:{$port}/api/system");

                return ltrim((string) ($response->json('version') ?? ''), 'v');
            } catch (\Throwable) {
                return '';
            }
        });
    }

    /** Lee el JSON de progreso que escribe el updater del host. */
    public static function runnerStatus(): ?array
    {
        $path = (string) config('panel.updates.status_path');

        if ($path === '' || ! is_readable($path)) {
            return null;
        }

        $data = json_decode((string) file_get_contents($path), true);

        return is_array($data) ? $data : null;
    }

    /** Deja la petición de actualización para el updater privilegiado. */
    public static function requestUpdate(string $target, string $version, string $requestedBy): bool
    {
        $path = (string) config('panel.updates.request_path');
        $dir = dirname($path);

        if (! is_dir($dir) || ! is_writable($dir)) {
            return false;
        }

        $payload = json_encode([
            'target' => $target,
            'version' => $version,
            'requested_by' => $requestedBy,
            'requested_at' => now()->toIso8601String(),
        ], JSON_PRETTY_PRINT);

        return file_put_contents($path, $payload, LOCK_EX) !== false;
    }

    private static function demoStatus(): array
    {
        return [
            'panel' => [
                'current' => (string) config('panel.version', '1.0.0'),
                'latest' => '1.1.0',
                'update_available' => true,
                'notes' => "Demo: esta actualización es simulada.\n\n- Nuevas gráficas del dashboard\n- Mejoras en Health",
                'url' => 'https://github.com/cinammon-net/panel/releases',
                'published_at' => now()->subDay()->toIso8601String(),
            ],
            'wings' => [
                'current' => 'develop',
                'latest' => null,
                'update_available' => false,
                'notes' => null,
                'url' => null,
                'published_at' => null,
            ],
            'runner' => null,
            'demo' => true,
        ];
    }
}
