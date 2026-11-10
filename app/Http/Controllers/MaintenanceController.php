<?php

namespace App\Http\Controllers;

use App\Mail\MaintenanceScheduled;
use App\Models\Maintenance;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Maintenance/Index', [
            'maintenances' => Maintenance::with('creator:id,name')->latest('starts_at')->limit(50)->get()
                ->map(fn (Maintenance $m) => [
                    ...$m->toPublic(),
                    'status' => $m->status(),
                    'notified_at' => $m->notified_at?->toIso8601String(),
                    'created_by' => $m->creator?->name,
                ]),
            'mailEnabled' => !in_array(config('mail.default'), ['log', 'array'], true),
            'usersCount' => User::visible()->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $m = Maintenance::create([...$data, 'created_by' => $request->user()->id]);
        $this->maybeNotify($m, $request->boolean('notify_email'));

        return back()->with('success', 'Mantenimiento programado. Los usuarios ya ven el aviso.');
    }

    public function update(Request $request, Maintenance $maintenance): RedirectResponse
    {
        $maintenance->update($this->validated($request));
        $this->maybeNotify($maintenance, $request->boolean('notify_email'));

        return back()->with('success', 'Mantenimiento actualizado.');
    }

    /** Termina ahora un mantenimiento en curso (o lo arranca si se pide). */
    public function finish(Maintenance $maintenance): RedirectResponse
    {
        $maintenance->update(['ends_at' => now()]);

        return back()->with('success', 'Mantenimiento finalizado. El aviso ya no se muestra.');
    }

    public function start(Maintenance $maintenance): RedirectResponse
    {
        $maintenance->update(['starts_at' => now()]);

        return back()->with('success', 'Mantenimiento iniciado ahora.');
    }

    public function destroy(Maintenance $maintenance): RedirectResponse
    {
        $maintenance->update(['cancelled_at' => now()]);

        return back()->with('success', 'Mantenimiento cancelado.');
    }

    /** Estado público para la tienda y otros servicios (sin sesión). */
    public function status(): JsonResponse
    {
        return response()->json(['data' => Maintenance::current()])
            ->header('Cache-Control', 'public, max-age=30')
            ->header('Access-Control-Allow-Origin', '*');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:2000'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'scope' => ['required', 'array', 'min:1'],
            'scope.*' => [Rule::in(Maintenance::SCOPES)],
            'block_access' => ['boolean'],
        ]);
        $data['scope'] = array_values(array_unique($data['scope']));
        $data['block_access'] = (bool) ($data['block_access'] ?? false);

        return $data;
    }

    private function maybeNotify(Maintenance $m, bool $notify): void
    {
        if (!$notify || $m->notified_at) {
            return;
        }
        // Un correo por usuario, en cola (el worker cinammonq los envía poco a poco).
        User::query()->whereNotNull('email')->select(['id', 'email', 'name'])->chunkById(200, function ($users) use ($m) {
            foreach ($users as $user) {
                Mail::to($user->email)->queue(new MaintenanceScheduled($m));
            }
        });
        $m->forceFill(['notified_at' => now()])->save();
    }
}
