<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Announcements/Index', [
            'announcements' => Announcement::with('creator:id,name')->latest()->limit(100)->get()
                ->map(fn (Announcement $a) => [
                    ...$a->toPublic(),
                    'enabled' => $a->enabled,
                    'status' => $a->status(),
                    'clicks' => $a->clicks,
                    'created_by' => $a->creator?->name,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Announcement::create([...$this->validated($request), 'created_by' => $request->user()->id]);

        return back()->with('success', 'Anuncio publicado.');
    }

    public function update(Request $request, Announcement $announcement): RedirectResponse
    {
        $announcement->update($this->validated($request));

        return back()->with('success', 'Anuncio actualizado.');
    }

    /** Pausa o reanuda un anuncio sin borrarlo. */
    public function toggle(Announcement $announcement): RedirectResponse
    {
        $announcement->update(['enabled' => !$announcement->enabled]);

        return back()->with('success', $announcement->enabled ? 'Anuncio reanudado.' : 'Anuncio pausado.');
    }

    public function destroy(Announcement $announcement): RedirectResponse
    {
        $announcement->delete();

        return back()->with('success', 'Anuncio eliminado.');
    }

    /** Lista pública para la tienda y otros servicios (sin sesión). */
    public function feed(Request $request): JsonResponse
    {
        $place = $request->query('place');
        $items = collect(Announcement::liveList())
            ->when(in_array($place, Announcement::PLACES, true), fn ($c) => $c->filter(fn ($a) => in_array($place, $a['places'], true)))
            ->values();

        return response()->json(['data' => $items])
            ->header('Cache-Control', 'public, max-age=60')
            ->header('Access-Control-Allow-Origin', '*');
    }

    /** Cuenta un clic en el botón del anuncio (métrica para el admin). */
    public function click(Announcement $announcement): JsonResponse
    {
        if ($announcement->enabled) {
            // Sin disparar eventos ni tocar updated_at: no invalida la caché.
            Announcement::whereKey($announcement->id)->increment('clicks');
        }

        return response()->json(['ok' => true])->header('Access-Control-Allow-Origin', '*');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(Announcement::TYPES)],
            'title' => ['required', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:1000'],
            'highlight' => ['nullable', 'string', 'max:20'],
            'coupon_code' => ['nullable', 'string', 'max:40', 'regex:/^[A-Za-z0-9_\-]+$/'],
            'cta_label' => ['nullable', 'string', 'max:40'],
            // Solo enlaces https o rutas internas (nada de javascript: ni similares)
            'cta_url' => ['nullable', 'string', 'max:500', 'regex:#^(https://|/)#i'],
            'places' => ['required', 'array', 'min:1'],
            'places.*' => [Rule::in(Announcement::PLACES)],
            'popup' => ['boolean'],
            'enabled' => ['boolean'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ], [
            'cta_url.regex' => 'El enlace debe empezar por https:// o por /.',
            'coupon_code.regex' => 'El cupón solo puede tener letras, números, guiones y guiones bajos.',
        ]);

        $data['places'] = array_values(array_unique($data['places']));
        $data['popup'] = (bool) ($data['popup'] ?? false);
        $data['enabled'] = (bool) ($data['enabled'] ?? true);
        $data['coupon_code'] = isset($data['coupon_code']) ? strtoupper($data['coupon_code']) : null;

        return $data;
    }
}
