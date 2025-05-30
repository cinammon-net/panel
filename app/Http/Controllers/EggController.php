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
        $query = Egg::query();

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
            'tags' => 'nullable|array',
            'update_url' => 'nullable|url',
            'docker_images' => 'nullable|array',
            'variables' => 'nullable|array',
        ]);

        $egg->update($validated);

        if (isset($validated['variables'])) {
            $egg->variables()->sync($validated['variables']);
        } else {
            $egg->variables()->detach();
        }

        return redirect()->route('eggs.edit', $egg)->with('success', 'Egg actualizado correctamente.');
    }

    public function store(Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'author' => 'nullable|string|max:255',
            'description' => 'nullable|string',
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
            'tags' => 'nullable|array',
            'update_url' => 'nullable|url',
            'docker_images' => 'nullable|array',
            'variables' => 'nullable|array',
        ]);

        $validated['uuid'] = Str::uuid()->toString();

        $egg = Egg::create($validated);

        if (isset($validated['variables'])) {
            $egg->variables()->sync($validated['variables']);
        }

        return redirect()->route('eggs.index')->with('success', 'Egg creado correctamente.');
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
