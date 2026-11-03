<?php

namespace App\Http\Controllers;

use App\Support\Panel;
use App\Support\UpdateChecker;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UpdateController extends Controller
{
    public function index()
    {
        return Inertia::render('Updates', [
            'status' => UpdateChecker::status(),
        ]);
    }

    /** Fuerza una nueva consulta a GitHub. */
    public function check()
    {
        UpdateChecker::status(fresh: true);

        return redirect()->route('updates.index')->with('success', 'Búsqueda de actualizaciones completada.');
    }

    /** Estado del updater del host (lo consume el polling de la página). */
    public function runnerStatus()
    {
        return response()->json([
            'runner' => UpdateChecker::runnerStatus(),
        ]);
    }

    /** Encola la actualización para que la ejecute el updater privilegiado. */
    public function run(Request $request)
    {
        $validated = $request->validate([
            'target' => 'required|in:panel,wings,billing',
        ]);

        if (Panel::demoMode()) {
            return back()->with('success', 'Demo: la actualización se ha simulado correctamente.');
        }

        $status = UpdateChecker::status();
        $target = $validated['target'];

        if (! ($status[$target]['update_available'] ?? false)) {
            return back()->with('error', 'No hay ninguna actualización pendiente para ' . $target . '.');
        }

        $queued = UpdateChecker::requestUpdate(
            $target,
            (string) $status[$target]['latest'],
            (string) $request->user()->email,
        );

        if (! $queued) {
            return back()->with('error', 'El updater del host no está instalado (no se pudo escribir la petición). Revisa deploy/updater/README.md.');
        }

        return back()->with('success', 'Actualización de ' . $target . ' iniciada. El progreso se muestra abajo.');
    }
}
