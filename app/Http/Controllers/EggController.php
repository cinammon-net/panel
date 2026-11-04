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
     * Recorre todas las carpetas de primer nivel del repo (cada carpeta es una
     * categoría), así que una carpeta nueva no necesita tocar el panel.
     */
    public function syncRepo(Request $request)
    {
        $repoPath = is_dir(base_path('../eggs')) ? base_path('../eggs') : null;
        $tempDir = null;

        if (!$repoPath) {
            $zipUrl = 'https://codeload.github.com/cinammon-net/eggs/zip/refs/heads/main';
            $tempZip = sys_get_temp_dir() . '/cinammon-eggs-' . uniqid() . '.zip';
            $tempDir = sys_get_temp_dir() . '/cinammon-eggs-' . uniqid();

            $content = @file_get_contents($zipUrl);
            if ($content !== false) {
                file_put_contents($tempZip, $content);
                $zip = new \ZipArchive();
                if ($zip->open($tempZip) === true) {
                    $zip->extractTo($tempDir);
                    $zip->close();
                    $repoPath = $tempDir . '/eggs-main';
                }
                @unlink($tempZip);
            }
        }

        if (!$repoPath || !is_dir($repoPath)) {
            return back()->withErrors(['sync' => 'No se pudo descargar el repositorio cinammon-net/eggs desde GitHub.']);
        }

        $syncedCount = 0;
        $skipped = [];

        foreach (glob("{$repoPath}/*", GLOB_ONLYDIR) ?: [] as $dir) {
            $folder = basename($dir);
            if ($folder === 'docs' || str_starts_with($folder, '.')) continue;

            $category = Str::slug($folder);

            foreach (glob("{$dir}/*.json") ?: [] as $file) {
                $data = json_decode(file_get_contents($file), true);
                $relative = "{$folder}/" . basename($file);

                if (!is_array($data) || empty($data['name'])) {
                    $skipped[] = "{$relative} (JSON inválido)";
                    continue;
                }

                $data['meta']['update_url'] ??= 'https://raw.githubusercontent.com/cinammon-net/eggs/main/' . rawurlencode($folder) . '/' . rawurlencode(basename($file));

                try {
                    $this->upsertEggFromExport($data, $category);
                    $syncedCount++;
                } catch (\Throwable $e) {
                    report($e);
                    $skipped[] = "{$relative} ({$e->getMessage()})";
                }
            }
        }

        if ($tempDir && is_dir($tempDir)) {
            shell_exec('rm -rf ' . escapeshellarg($tempDir));
        }

        $message = "Se han sincronizado correctamente {$syncedCount} eggs desde el repositorio oficial cinammon-net/eggs.";
        if ($skipped) {
            $message .= ' Omitidos: ' . implode(', ', $skipped);
        }

        return redirect()->route('eggs.index')->with('success', $message);
    }

    /**
     * Importa Eggs desde un archivo JSON (formato PTDL/PLCN exportado).
     */
    public function import(Request $request) {
        $request->validate([
            'file' => 'required|file|mimes:json,txt',
        ]);

        $json = json_decode(file_get_contents($request->file('file')->getRealPath()), true);

        if (!$json || !is_array($json)) {
            return back()->withErrors(['file' => 'JSON inválido']);
        }

        $eggsData = $this->is_assoc_array($json) ? [$json] : $json;
        $imported = 0;

        foreach ($eggsData as $eggData) {
            if (!is_array($eggData) || empty($eggData['name'])) continue;

            $this->upsertEggFromExport($eggData, $eggData['category'] ?? null);
            $imported++;
        }

        if ($imported === 0) {
            return back()->withErrors(['file' => 'El archivo no contiene ningún egg válido (falta "name").']);
        }

        return redirect()->route('eggs.index')->with('success', "{$imported} egg(s) importados correctamente");
    }

    /**
     * Crea o actualiza un Egg (y sus variables) a partir de un JSON exportado.
     *
     * Si el JSON no trae uuid se genera uno determinista a partir del nombre,
     * así reimportar o resincronizar el mismo egg lo actualiza en vez de duplicarlo.
     */
    private function upsertEggFromExport(array $data, ?string $category): Egg
    {
        $uuid = $data['uuid'] ?? null;
        if (!is_string($uuid) || !Str::isUuid($uuid)) {
            $uuid = \Ramsey\Uuid\Uuid::uuid5(\Ramsey\Uuid\Uuid::NAMESPACE_URL, 'cinammon-egg:' . Str::lower(trim($data['name'])))->toString();
        }

        $config = is_array($data['config'] ?? null) ? $data['config'] : [];
        $install = $data['scripts']['installation'] ?? [];
        $asText = fn($v, $default = '{}') => $v === null ? $default : (is_string($v) ? $v : json_encode($v));

        $category = $category ?: 'generic';
        $tags = $data['tags'] ?? null;

        $egg = DB::transaction(function () use ($data, $uuid, $config, $install, $asText, $category, $tags) {
            $egg = Egg::updateOrCreate(
                ['uuid' => $uuid],
                [
                    'name' => $data['name'],
                    'author' => $data['author'] ?? 'support@cinammon.net',
                    'description' => $data['description'] ?? '',
                    'category' => $category,
                    'startup' => $data['startup'] ?? '',
                    'config_stop' => $config['stop'] ?? null,
                    'config_startup' => $asText($config['startup'] ?? null),
                    'config_files' => $asText($config['files'] ?? null),
                    'config_logs' => $asText($config['logs'] ?? null),
                    'script_install' => $install['script'] ?? null,
                    'script_container' => $install['container'] ?? 'ghcr.io/parkervcp/installers:debian',
                    'script_entry' => $install['entrypoint'] ?? 'bash',
                    'script_is_privileged' => !empty($install['is_privileged']) ? 1 : 0,
                    'features' => json_encode($data['features'] ?? []),
                    'docker_images' => json_encode($data['docker_images'] ?? []),
                    'update_url' => $data['meta']['update_url'] ?? null,
                    'file_denylist' => json_encode($data['file_denylist'] ?? []),
                    'force_outgoing_ip' => !empty($data['force_outgoing_ip']) ? 1 : 0,
                    'tags' => is_array($tags) ? implode(',', $tags) : ($tags ?: $category),
                ]
            );

            $sort = 1;
            foreach (($data['variables'] ?? []) as $var) {
                if (!is_array($var) || empty($var['env_variable'])) continue;
                $rules = $var['rules'] ?? '';
                if (is_array($rules)) $rules = implode('|', $rules);

                DB::table('egg_variables')->updateOrInsert(
                    ['egg_id' => $egg->id, 'env_variable' => $var['env_variable']],
                    [
                        'name' => $var['name'] ?? $var['env_variable'],
                        'description' => $var['description'] ?? '',
                        'default_value' => (string) ($var['default_value'] ?? ''),
                        'user_viewable' => !empty($var['user_viewable']) ? 1 : 0,
                        'user_editable' => !empty($var['user_editable']) ? 1 : 0,
                        'rules' => (string) $rules,
                        'sort' => $var['sort'] ?? $sort,
                        'updated_at' => now(),
                    ]
                );
                $sort++;
            }

            return $egg;
        });

        return $egg;
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
