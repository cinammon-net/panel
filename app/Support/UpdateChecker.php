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
            $statusPath = (string) config('panel.updates.status_path');
            Cache::forget('updates:wings-current:'.(($statusPath !== '' && is_readable($statusPath)) ? (int) @filemtime($statusPath) : 0));
        }

        $latest = Cache::remember('updates:latest', $ttl, fn () => [
            'panel' => self::latestRelease(config('panel.updates.panel_repo')),
            'wings' => self::latestRelease(config('panel.updates.wings_repo')),
            'billing' => self::latestRelease(config('panel.updates.billing_repo')),
        ]);

        // Si la API falló (rate limit, red), no fijar el fallo durante 30 min:
        // se reintenta en la siguiente petición.
        if ($latest['panel'] === null || $latest['wings'] === null || $latest['billing'] === null) {
            Cache::forget('updates:latest');
        }

        $panelCurrent = (string) config('panel.version', '1.0.0');
        $wingsCurrent = self::wingsCurrentVersion();
        $billingCurrent = self::billingCurrentVersion();

        return [
            'panel' => self::compare($panelCurrent, $latest['panel']),
            'wings' => self::compare($wingsCurrent, $latest['wings']),
            'billing' => self::compare($billingCurrent, $latest['billing']),
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
            $status['billing']['update_available'] ? 'billing' : null,
        ]));

        return [
            'pending' => $pending,
            'panel_latest' => $status['panel']['latest'],
            'wings_latest' => $status['wings']['latest'],
            'billing_latest' => $status['billing']['latest'],
        ];
    }

    /**
     * Changelog completo: todos los releases publicados de cada componente,
     * con autor y fecha, marcando cuál es la versión instalada.
     */
    public static function changelog(): array
    {
        if (Panel::demoMode()) {
            return [];
        }

        $ttl = now()->addMinutes(max(1, (int) config('panel.updates.cache_minutes', 30)));

        $releases = Cache::remember('updates:changelog', $ttl, fn () => [
            'panel' => self::allReleases(config('panel.updates.panel_repo')),
            'wings' => self::allReleases(config('panel.updates.wings_repo')),
            'billing' => self::allReleases(config('panel.updates.billing_repo')),
        ]);

        $installed = [
            'panel' => ltrim((string) config('panel.version', ''), 'v'),
            'wings' => self::wingsCurrentVersion(),
            'billing' => self::billingCurrentVersion(),
        ];

        foreach ($releases as $component => $items) {
            foreach ($items as $i => $release) {
                $releases[$component][$i]['installed'] = $release['tag'] === $installed[$component];
            }
        }

        return $releases;
    }

    private static function allReleases(?string $repo): array
    {
        if (! $repo) {
            return [];
        }

        try {
            $request = Http::timeout(4)->withHeaders([
                'Accept' => 'application/vnd.github+json',
                'User-Agent' => 'cinammon-panel-updater',
            ]);

            if ($token = config('panel.updates.github_token')) {
                $request = $request->withToken($token);
            }

            $response = $request->get("https://api.github.com/repos/{$repo}/releases", ['per_page' => 25]);

            if (! $response->successful()) {
                return [];
            }

            return collect($response->json())
                ->filter(fn ($release) => empty($release['draft']))
                ->map(fn ($release) => [
                    'tag' => ltrim((string) ($release['tag_name'] ?? ''), 'v'),
                    'name' => $release['name'] ?? $release['tag_name'] ?? '',
                    'notes' => (string) ($release['body'] ?? ''),
                    'url' => $release['html_url'] ?? null,
                    'author' => $release['author']['login'] ?? null,
                    'published_at' => $release['published_at'] ?? null,
                ])
                ->values()
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    /** Historial de actualizaciones aplicadas en este servidor (quién y cuándo). */
    public static function history(): array
    {
        $path = (string) config('panel.updates.history_path');

        if ($path === '' || ! is_readable($path)) {
            return [];
        }

        $entries = [];
        foreach (array_filter(explode("\n", (string) file_get_contents($path))) as $line) {
            $entry = json_decode($line, true);
            if (is_array($entry)) {
                $entries[] = $entry;
            }
        }

        return array_slice(array_reverse($entries), 0, 50);
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
            'title' => $latest['name'] ?? null,
            'url' => $latest['url'] ?? null,
            'published_at' => $latest['published_at'] ?? null,
        ];
    }

    private static function wingsCurrentVersion(): string
    {
        // La clave cambia cada vez que el updater escribe su estado: tras actualizar Wings
        // se vuelve a preguntar la versión al momento (antes quedaba la vieja hasta 5 min).
        $statusPath = (string) config('panel.updates.status_path');
        $stamp = ($statusPath !== '' && is_readable($statusPath)) ? (int) @filemtime($statusPath) : 0;
        $key = 'updates:wings-current:'.$stamp;

        $cached = Cache::get($key);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $version = (function () {
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
        })();

        // Si Wings no respondió (p. ej. reiniciándose), no se guarda: se reintenta en la siguiente petición.
        if ($version !== '') {
            Cache::put($key, $version, now()->addMinutes(5));
        }

        return $version;
    }

    /** Versión instalada del billing: BILLING_VERSION en su .env. */
    private static function billingCurrentVersion(): string
    {
        $path = (string) config('panel.updates.billing_env_path');

        if ($path === '' || ! is_readable($path)) {
            return '';
        }

        if (preg_match('/^BILLING_VERSION=["\']?([^"\'\r\n]+)/m', (string) file_get_contents($path), $m)) {
            return ltrim(trim($m[1]), 'v');
        }

        return '';
    }

    /** Lee el JSON de progreso que escribe el updater del host. */
    public static function runnerStatus(): ?array
    {
        $path = (string) config('panel.updates.status_path');

        if ($path === '' || ! is_readable($path)) {
            return null;
        }

        $data = json_decode((string) file_get_contents($path), true);

        if (! is_array($data)) {
            return null;
        }

        // Salida real de los comandos del updater (consola en vivo).
        $outputPath = (string) config('panel.updates.output_path');
        if ($outputPath !== '' && is_readable($outputPath)) {
            $lines = explode("\n", rtrim((string) file_get_contents($outputPath), "\n"));
            // Un \r repinta la línea (barras de progreso): conservar solo el último estado.
            $lines = array_map(function (string $line) {
                $parts = explode("\r", rtrim($line, "\r"));

                return end($parts) ?: '';
            }, $lines);
            $data['output'] = implode("\n", array_slice($lines, -400));
        }

        return $data;
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
            'billing' => [
                'current' => '1.0.0',
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
