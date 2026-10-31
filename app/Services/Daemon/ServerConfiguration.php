<?php

namespace App\Services\Daemon;

use App\Models\Server;
use Illuminate\Support\Facades\DB;

class ServerConfiguration
{
    private function decode($value): array
    {
        // Older imports saved config.files as a JSON string inside a JSON string.
        for ($i = 0; $i < 2 && is_string($value); $i++) {
            $value = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
        }
        return is_array($value) ? $value : [];
    }

    public function forServer(Server $server): array
    {
        $server->loadMissing(['egg.variables', 'allocation']);
        abort_unless($server->egg && $server->allocation && $server->image, 422, 'Server requires an egg, allocation and Docker image.');
        $egg = $server->egg;
        $environment = $egg->variables->pluck('default_value', 'env_variable')->all();
        foreach (DB::table('server_variables')->where('server_id', $server->id)->get() as $variable) {
            $name = $egg->variables->firstWhere('id', $variable->variable_id)?->env_variable;
            if ($name) $environment[$name] = $variable->variable_value;
        }
        $environment['SERVER_MEMORY'] = (string) $server->memory;
        $environment['SERVER_PORT'] = (string) $server->allocation->port;
        $environment['SERVER_IP'] = $server->allocation->ip;
        $mappings = [];
        $allocations = DB::table('allocations')->where('server_id', $server->id)->get();
        foreach ($allocations as $allocation) $mappings[$allocation->ip][] = (int) $allocation->port;
        $mappings[$server->allocation->ip][] = (int) $server->allocation->port;
        $mappings = array_map(fn ($ports) => array_values(array_unique($ports)), $mappings);
        $port = (string) $server->allocation->port;
        $ip = '0.0.0.0';
        $replace = [
            '{{server.allocations.default.ip}}' => $ip,
            '{{server.allocations.default.port}}' => $port,
            '{{server.build.default.ip}}' => $ip,
            '{{server.build.default.port}}' => $port,
            '{{config.docker.interface}}' => $ip,
        ];
        foreach ($environment as $key => $value) {
            $val = (string) $value;
            $replace['{{env.'.$key.'}}'] = $val;
            $replace['{{server.build.env.'.$key.'}}'] = $val;
            $replace['{{server.environment.'.$key.'}}'] = $val;
        }
        $files = [];
        foreach ($this->decode($egg->config_files) as $filename => $file) {
            $replacements = [];
            foreach ($file['find'] ?? [] as $match => $value) {
                $replacements[] = ['match' => (string) $match, 'replace_with' => is_string($value) ? strtr($value, $replace) : $value];
            }
            $files[] = ['file' => $filename, 'parser' => $file['parser'], 'replace' => $replacements];
        }
        $startup = $this->decode($egg->config_startup);
        $done = $startup['done'] ?? [];
        return [
            'uuid' => $server->uuid,
            'settings' => [
                'uuid' => $server->uuid,
                'meta' => ['name' => $server->name, 'description' => $server->description ?? ''],
                'suspended' => !$server->active,
                'invocation' => $server->startup,
                'skip_egg_scripts' => !$server->run_install_script,
                'environment' => (object) $environment,
                'labels' => (object) [],
                'allocations' => [
                    'force_outgoing_ip' => (bool) $egg->force_outgoing_ip,
                    'default' => ['ip' => $server->allocation->ip, 'port' => (int) $server->allocation->port],
                    'mappings' => (object) ($egg->category === 'discord' ? [] : $mappings),
                ],
                'build' => [
                    'memory_limit' => (int) $server->memory, 'swap' => (int) $server->swap,
                    'io_weight' => (int) ($server->io ?: 500), 'cpu_limit' => (int) $server->cpu,
                    'disk_space' => (int) $server->disk, 'threads' => '', 'oom_killer' => (bool) $server->oom_killer,
                ],
                'crash_detection_enabled' => true,
                'mounts' => [],
                'egg' => ['id' => $egg->uuid, 'file_denylist' => $this->decode($egg->file_denylist), 'features' => (object) []],
                'container' => ['image' => $server->image],
            ],
            'process_configuration' => [
                'startup' => ['done' => is_array($done) ? $done : [$done], 'user_interaction' => [], 'strip_ansi' => false],
                'stop' => ['type' => str_starts_with($egg->config_stop ?? '', '^') ? 'signal' : 'command', 'value' => $egg->config_stop ?: 'stop'],
                'configs' => $files,
            ],
        ];
    }
}
