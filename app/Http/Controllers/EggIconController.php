<?php

namespace App\Http\Controllers;

use App\Models\Egg;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Iconos de eggs. Son públicos (logos de juegos/software) para que la tienda
 * y cualquier página puedan mostrarlos sin sesión.
 */
class EggIconController extends Controller
{
    public function show(string $uuid): Response
    {
        $egg = Egg::where('uuid', $uuid)->first(['id', 'uuid', 'image', 'updated_at']);
        $decoded = $egg ? Egg::decodeImage($egg->image) : null;

        abort_if($decoded === null, 404);

        [$mime, $bytes] = $decoded;

        return response($bytes, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=604800, immutable',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'",
            'Access-Control-Allow-Origin' => '*',
        ]);
    }

    /**
     * Catálogo público mínimo (nombre, categoría, icono) para la tienda.
     */
    public function catalog(): JsonResponse
    {
        $eggs = Cache::remember('eggs:icon-catalog', now()->addMinutes(10), fn () => Egg::query()
            ->orderBy('name')
            ->get(['id', 'uuid', 'name', 'category', 'image', 'updated_at'])
            ->map(fn (Egg $egg) => [
                'name' => $egg->name,
                'category' => $egg->category,
                'icon' => $egg->image_url,
            ])
            ->values()
            ->all());

        return response()->json(['data' => $eggs])
            ->header('Cache-Control', 'public, max-age=600')
            ->header('Access-Control-Allow-Origin', '*');
    }
}
