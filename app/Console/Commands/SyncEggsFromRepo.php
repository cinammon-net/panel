<?php

namespace App\Console\Commands;

use App\Models\Egg;
use App\Models\EggVariable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SyncEggsFromRepo extends Command
{
    protected $signature = 'eggs:sync-repo {--path= : Ruta personalizada a la carpeta de eggs}';
    protected $description = 'Sincroniza la colección de eggs desde el repositorio oficial cinammon-net/eggs a la base de datos';

    public function handle(): int
    {
        $repoPath = $this->option('path') ?: (is_dir(base_path('../eggs')) ? base_path('../eggs') : storage_path('app/eggs'));

        if (!is_dir($repoPath)) {
            $this->error("No se encontró el repositorio de eggs en: {$repoPath}");
            return 1;
        }

        $this->info("Iniciando sincronización desde: {$repoPath}");

        $categories = ['minecraft', 'games', 'bots', 'database', 'generic', 'software', 'voice'];
        $syncedEggs = 0;
        $syncedVars = 0;

        foreach ($categories as $cat) {
            $catDir = "{$repoPath}/{$cat}";
            if (!is_dir($catDir)) {
                continue;
            }

            $files = glob("{$catDir}/*.json");
            $this->line("Procesando categoría: <comment>{$cat}</comment> (" . count($files) . " eggs)");

            foreach ($files as $file) {
                $raw = file_get_contents($file);
                $data = json_decode($raw, true);

                if (!is_array($data) || empty($data['uuid'])) {
                    continue;
                }

                $eggAttributes = [
                    'name' => $data['name'] ?? basename($file, '.json'),
                    'author' => $data['author'] ?? 'support@cinammon.net',
                    'description' => $data['description'] ?? '',
                    'category' => $cat,
                    'startup' => $data['startup'] ?? '',
                    'config_stop' => $data['config']['stop'] ?? null,
                    'config_startup' => isset($data['config']['startup']) ? (is_string($data['config']['startup']) ? $data['config']['startup'] : json_encode($data['config']['startup'])) : '{}',
                    'config_files' => isset($data['config']['files']) ? (is_string($data['config']['files']) ? $data['config']['files'] : json_encode($data['config']['files'])) : '{}',
                    'config_logs' => isset($data['config']['logs']) ? (is_string($data['config']['logs']) ? $data['config']['logs'] : json_encode($data['config']['logs'])) : '{}',
                    'script_install' => $data['scripts']['installation']['script'] ?? null,
                    'script_container' => $data['scripts']['installation']['container'] ?? 'ghcr.io/parkervcp/installers:debian',
                    'script_entry' => $data['scripts']['installation']['entrypoint'] ?? 'bash',
                    'script_is_privileged' => !empty($data['scripts']['installation']['is_privileged']) ? 1 : 0,
                    'features' => json_encode($data['features'] ?? []),
                    'docker_images' => json_encode($data['docker_images'] ?? []),
                    'update_url' => $data['meta']['update_url'] ?? "https://raw.githubusercontent.com/cinammon-net/eggs/main/{$cat}/" . basename($file),
                    'file_denylist' => json_encode($data['file_denylist'] ?? []),
                    'force_outgoing_ip' => !empty($data['force_outgoing_ip']) ? 1 : 0,
                    'tags' => is_array($data['tags'] ?? null) ? implode(',', $data['tags']) : ($data['tags'] ?? $cat),
                ];

                $egg = Egg::updateOrCreate(
                    ['uuid' => $data['uuid']],
                    $eggAttributes
                );

                $syncedEggs++;

                // Sincronizar variables
                if (!empty($data['variables']) && is_array($data['variables'])) {
                    $sort = 1;
                    foreach ($data['variables'] as $var) {
                        if (empty($var['env_variable'])) {
                            continue;
                        }

                        $rules = $var['rules'] ?? '';
                        if (is_array($rules)) {
                            $rules = implode('|', $rules);
                        }

                        EggVariable::updateOrCreate(
                            [
                                'egg_id' => $egg->id,
                                'env_variable' => $var['env_variable'],
                            ],
                            [
                                'name' => $var['name'] ?? $var['env_variable'],
                                'description' => $var['description'] ?? '',
                                'default_value' => (string)($var['default_value'] ?? ''),
                                'user_viewable' => !empty($var['user_viewable']) ? 1 : 0,
                                'user_editable' => !empty($var['user_editable']) ? 1 : 0,
                                'rules' => (string)$rules,
                                'sort' => $sort++,
                            ]
                        );
                        $syncedVars++;
                    }
                }
            }
        }

        $this->info("✔️ Sincronización completada con éxito:");
        $this->info("   • {$syncedEggs} Eggs sincronizados.");
        $this->info("   • {$syncedVars} Variables registradas.");

        return 0;
    }
}

