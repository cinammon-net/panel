<?php

namespace App\Http\Controllers;

use App\Models\Egg;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EggController extends Controller
{

    /**
     * Muestra una lista de Eggs con filtros y paginación.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Inertia\Response
     */
    public function index(Request $request): Response
    {
        $query = Egg::withCount('servers');

        if ($request->filled('tag')) {
            $query->where('tags', 'like', '%' . $request->input('tag') . '%');
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->input('search') . '%');
        }

        if ($request->filled('sort') && $request->filled('direction')) {
            $query->orderBy($request->input('sort'), $request->input('direction'));
        }

        $eggs = $query->paginate($request->input('per_page', 10))->withQueryString();
        $eggs->getCollection()->transform(function ($egg) {
            $egg->servers = $egg->servers_count ?? 0;
            return $egg;
        });

        $tags = Egg::pluck('tags')
            ->filter()
            ->flatMap(fn($item) => explode(',', $item))
            ->map(fn($tag) => trim($tag))
            ->filter()
            ->unique()
            ->values();

        return Inertia::render('Eggs', [
            'eggs' => $eggs,
            'filters' => $request->only(['search', 'sort', 'direction', 'per_page', 'tag']),
            'availableTags' => $tags,
        ]);
    }

    /**
     * Muestra el formulario de creación de un nuevo Egg.
     *
     * @return Response
     */

    public function create(): Response
    {
        $eggs = Egg::all();

        return Inertia::render('Eggs/Create', [
            'eggs' => $eggs,
        ]);
    }

    /**
     * Muestra el formulario de edición de un Egg.
     *
     * @param Egg $egg
     * @return Response
     */

    public function edit(Egg $egg): Response {
        $egg->load('variables', 'servers');

        $egg->features = json_decode($egg->features) ?: [];
        $egg->docker_images = json_decode($egg->docker_images, true) ?: [];
        $egg->tags = (is_string($egg->tags) && strlen($egg->tags) > 0) ? explode(',', $egg->tags) : (is_array($egg->tags) ? $egg->tags : []);

        return Inertia::render('Eggs/Edit', [
            'egg' => $egg,
            'eggs' => Egg::all(),
        ]);
    }

    /**
     * Actualiza un Egg y sus variables asociadas.
     *
     * @param \Illuminate\Http\Request $request
     * @param Egg $egg
     * @return \Illuminate\Http\RedirectResponse
     */

    public function update(Request $request, Egg $egg) {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'author' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'startup' => 'nullable|string',
            'config_stop' => 'nullable|string',
            'config_startup' => 'nullable|string',
            'config_files' => 'nullable|string',
            'config_logs' => 'nullable|string',
            'script_container' => 'nullable|string',
            'script_entry' => 'nullable|string',
            'install_script' => 'nullable|string',
            'file_denylist' => 'nullable|string',
            'features' => 'nullable|array',
            'force_outgoing_ip' => 'boolean',
            'tags' => 'nullable',
            'update_url' => 'nullable|url',
            'docker_images' => 'nullable|array',
            'variables' => 'nullable|array',
        ]);

        $variables = $validated['variables'] ?? null;
        unset($validated['variables']);

        if (isset($validated['tags']) && is_array($validated['tags'])) {
            $validated['tags'] = implode(',', $validated['tags']);
        }
        if (isset($validated['features']) && is_array($validated['features'])) {
            $validated['features'] = json_encode($validated['features']);
        }
        if (isset($validated['docker_images']) && is_array($validated['docker_images'])) {
            $imagesAssoc = [];
            foreach ($validated['docker_images'] as $key => $val) {
                if (is_array($val) && isset($val['name'], $val['uri'])) {
                    $imagesAssoc[$val['name']] = $val['uri'];
                } elseif (is_string($key) && is_string($val)) {
                    $imagesAssoc[$key] = $val;
                }
            }
            $validated['docker_images'] = json_encode($imagesAssoc);
        }

        $egg->update($validated);

        if (is_array($variables)) {
            $this->syncEggVariables($egg, $variables);
        }

        return redirect()->route('eggs.edit', $egg)->with('success', 'Egg actualizado correctamente.');
    }

    public function store(Request $request) {
        $request->merge([
            'config_stop' => $request->input('config_stop', $request->input('stopCommand')),
            'config_startup' => $request->input('config_startup', $request->input('startConfig')),
            'config_files' => $request->input('config_files', $request->input('configFiles')),
            'config_logs' => $request->input('config_logs', $request->input('logConfig')),
            'script_container' => $request->input('script_container', $request->input('scriptContainer')),
            'script_entry' => $request->input('script_entry', $request->input('scriptEntry')),
            'install_script' => $request->input('install_script', $request->input('installScript')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'author' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'startup' => 'nullable|string',
            'config_stop' => 'nullable|string',
            'config_startup' => 'nullable|string',
            'config_files' => 'nullable|string',
            'config_logs' => 'nullable|string',
            'script_container' => 'nullable|string',
            'script_entry' => 'nullable|string',
            'install_script' => 'nullable|string',
            'file_denylist' => 'nullable|string',
            'features' => 'nullable|array',
            'force_outgoing_ip' => 'boolean',
            'tags' => 'nullable',
            'update_url' => 'nullable|url',
            'docker_images' => 'nullable|array',
            'variables' => 'nullable|array',
        ]);

        $variables = $validated['variables'] ?? [];
        unset($validated['variables']);

        $validated['uuid'] = Str::uuid()->toString();
        if (isset($validated['tags']) && is_array($validated['tags'])) {
            $validated['tags'] = implode(',', $validated['tags']);
        }
        $validated['features'] = isset($validated['features']) ? json_encode($validated['features']) : json_encode([]);
        $validated['docker_images'] = isset($validated['docker_images']) ? json_encode($validated['docker_images']) : json_encode([]);

        $egg = Egg::create($validated);

        if (is_array($variables)) {
            $this->syncEggVariables($egg, $variables);
        }

        return redirect()->route('eggs.index')->with('success', 'Egg creado correctamente.');
    }

    private function syncEggVariables(Egg $egg, array $variables): void
    {
        foreach ($variables as $index => $var) {
            if (empty($var['name']) && empty($var['env_variable']) && empty($var['envVariable'])) {
                continue;
            }
            $envVar = $var['env_variable'] ?? $var['envVariable'] ?? strtoupper(Str::snake($var['name'] ?? 'VAR_' . $index));
            DB::table('egg_variables')->updateOrInsert(
                [
                    'egg_id' => $egg->id,
                    'env_variable' => $envVar,
                ],
                [
                    'name' => $var['name'] ?? $envVar,
                    'description' => $var['description'] ?? '',
                    'default_value' => $var['default_value'] ?? $var['defaultValue'] ?? '',
                    'user_viewable' => (int) ($var['user_viewable'] ?? $var['userPermissions']['viewable'] ?? 1),
                    'user_editable' => (int) ($var['user_editable'] ?? $var['userPermissions']['editable'] ?? 1),
                    'rules' => is_array($var['rules'] ?? null) ? json_encode($var['rules']) : ($var['rules'] ?? 'required|string'),
                    'sort' => $var['sort'] ?? ($index + 1),
                ]
            );
        }
    }

    /**
     * Verifica si un array es asociativo.
     *
     * @param array $arr
     * @return bool
     */
    private function is_assoc_array(array $arr): bool {
        if ([] === $arr) return false;
        return array_keys($arr) !== range(0, count($arr) - 1);
    }

    /**
     * Sincroniza todos los eggs desde el repositorio oficial cinammon-net/eggs.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function syncRepo(Request $request)
    {
        $repoPath = is_dir(base_path('../eggs')) ? base_path('../eggs') : storage_path('app/eggs');
        $categories = ['minecraft', 'games', 'bots', 'database', 'generic', 'software', 'voice'];
        $syncedCount = 0;

        if (is_dir($repoPath)) {
            foreach ($categories as $cat) {
                $files = glob("{$repoPath}/{$cat}/*.json");
                if (!$files) continue;

                foreach ($files as $file) {
                    $raw = file_get_contents($file);
                    $data = json_decode($raw, true);
                    if (!is_array($data) || empty($data['uuid'])) continue;

                    $egg = Egg::updateOrCreate(
                        ['uuid' => $data['uuid']],
                        [
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
                        ]
                    );

                    $syncedCount++;

                    if (!empty($data['variables']) && is_array($data['variables'])) {
                        $sort = 1;
                        foreach ($data['variables'] as $var) {
                            if (empty($var['env_variable'])) continue;
                            $rules = $var['rules'] ?? '';
                            if (is_array($rules)) $rules = implode('|', $rules);

                            DB::table('egg_variables')->updateOrInsert(
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
                        }
                    }
                }
            }
        }

        return redirect()->route('eggs.index')->with('success', "Se han sincronizado correctamente {$syncedCount} eggs desde el repositorio oficial cinammon-net/eggs.");
    }

    /**
     * Importa Eggs desde un archivo JSON.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\RedirectResponse
     */

    public function import(Request $request) {
        $request->validate([
            'file' => 'required|file|mimes:json',
        ]);

        $jsonContent = file_get_contents($request->file('file')->getRealPath());
        $json = json_decode($jsonContent, true);

        if (!$json || !is_array($json)) {
            return back()->withErrors(['file' => 'JSON inválido']);
        }

        $eggsData = $this->is_assoc_array($json) ? [$json] : $json;

        foreach ($eggsData as $eggData) {
            if (!isset($eggData['uuid'])) {
                continue; // Saltar si no hay UUID
            }

            // Guardar el config.stop y config.startup antes de eliminar config
            $configStop = $eggData['config']['stop'] ?? null;
            $configStartup = $eggData['config']['startup'] ?? null;

            unset($eggData['_comment'], $eggData['meta'], $eggData['config']);

            if (isset($eggData['tags']) && is_array($eggData['tags'])) {
                $eggData['tags'] = implode(',', $eggData['tags']);
            }

            if (isset($eggData['features']) && is_array($eggData['features'])) {
                $eggData['features'] = json_encode($eggData['features']);
            }

            if (isset($eggData['docker_images']) && is_array($eggData['docker_images'])) {
                $eggData['docker_images'] = json_encode($eggData['docker_images']);
            }

            if (isset($eggData['file_denylist']) && is_array($eggData['file_denylist'])) {
                $eggData['file_denylist'] = json_encode($eggData['file_denylist']);
            }

            // Asignar stop y startup command directamente
            $eggData['config_stop'] = $configStop;
            $eggData['config_startup'] = $configStartup;

            if (isset($eggData['scripts']['installation'])) {
                $installation = $eggData['scripts']['installation'];
                $eggData['script_install'] = $installation['script'] ?? null;
                $eggData['script_container'] = $installation['container'] ?? null;
                $eggData['script_entry'] = $installation['entrypoint'] ?? null;
                $eggData['script_is_privileged'] = $installation['is_privileged'] ?? 0;
            }

            unset($eggData['scripts']);

            $egg = Egg::updateOrCreate(['uuid' => $eggData['uuid']], $eggData);

            if (isset($eggData['variables']) && is_array($eggData['variables'])) {
                $sortOrder = 1;
                foreach ($eggData['variables'] as $varData) {
                    $varData['egg_id'] = $egg->id;

                    if (isset($varData['rules']) && is_array($varData['rules'])) {
                        $varData['rules'] = json_encode($varData['rules']);
                    }

                    if (!isset($varData['sort']) || $varData['sort'] === null) {
                        $varData['sort'] = $sortOrder;
                    }

                    DB::table('egg_variables')->updateOrInsert(
                        ['env_variable' => $varData['env_variable'], 'egg_id' => $egg->id],
                        $varData
                    );

                    $sortOrder++;
                }
            }
        }

        return redirect()->route('eggs.index')->with('success', 'Eggs importados correctamente');
    }

    /**
     * Elimina un Egg y sus variables asociadas.
     *
     * @param int $id
     * @return \Illuminate\Http\RedirectResponse
     */

    public function destroy($id)
    {
        $egg = Egg::findOrFail($id);
        $egg->variables()->delete();  // elimina variables asociadas
        $egg->delete();

        return redirect()->route('eggs.index')->with('success', 'Egg y sus variables eliminados correctamente.');
    }
}
