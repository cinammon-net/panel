<?php

namespace App\Console\Commands;

use App\Models\Server;
use Illuminate\Console\Command;

/**
 * Lists the web hosting servers and where nginx must proxy each one.
 * Read by the root script /usr/local/sbin/cinammon-sites-sync on the node, which writes the
 * nginx host map and blocks the direct IP:port access to those containers.
 */
class ExportSites extends Command
{
    protected $signature = 'sites:export';

    protected $description = 'Exporta en JSON las webs de hosting (host público -> IP:puerto del contenedor)';

    public function handle(): int
    {
        $sites = Server::with(['egg', 'allocation'])
            ->whereNotNull('allocation_id')
            ->get()
            ->filter(fn (Server $server) => $server->siteHost() !== null && $server->allocation !== null)
            ->map(fn (Server $server) => [
                'host' => $server->siteHost(),
                'ip' => in_array((string) $server->allocation->ip, ['', '0.0.0.0', '::'], true)
                    ? '127.0.0.1'
                    : (string) $server->allocation->ip,
                'port' => (int) $server->allocation->port,
                'server' => $server->uuid,
            ])
            ->values();

        // Dominios propios de las webs (registro A con proxy en el Cloudflare del cliente).
        $custom = \App\Models\ServerSubdomain::where('kind', 'web')->where('status', 'active')->get()
            ->map(function (\App\Models\ServerSubdomain $sub) use ($sites) {
                $site = $sites->firstWhere('server', $sub->server?->uuid);

                return $site ? ['host' => $sub->domain] + $site + ['custom' => true] : null;
            })
            ->filter()
            ->values();
        $sites = $sites->concat($custom)->values();

        $this->line($sites->toJson(JSON_UNESCAPED_SLASHES));

        return self::SUCCESS;
    }
}
