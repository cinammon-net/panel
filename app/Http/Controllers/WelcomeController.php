<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Inertia\Inertia;
use App\Models\Post;
use App\Models\User;
use App\Models\Server;
use App\Models\Node;
use App\Models\Egg;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class WelcomeController extends Controller
{
    public function index()
    {
        $reviews = Review::with('user:id,name,avatar')->latest()->take(5)->get(['id', 'comment', 'rating', 'user_id']);
        $posts = Post::latest()->take(5)->get(['id', 'title', 'content', 'picture', 'created_at']); // toma últimos 5 posts

        $preferredOrder = [
            'gallery/Console.png',
            'gallery/Dashboard.png',
            'gallery/Servers.png',
            'gallery/Store.png',
            'gallery/Billing.png',
            'gallery/Nodes.png',
            'gallery/Database.png',
            'gallery/Health.png',
            'gallery/Eggs.png',
            'gallery/Users.png',
        ];
        $files = collect(Storage::disk('public')->files('gallery'))
            ->filter(fn ($file) => preg_match('/\.(png|jpe?g|webp|svg)$/i', $file));

        $ordered = collect($preferredOrder)->filter(fn ($f) => $files->contains($f));
        $remaining = $files->diff($ordered);

        $galleryImages = $ordered->concat($remaining)
            ->take(10)
            ->map(fn ($file) => Storage::url($file) . '?v=' . Storage::disk('public')->lastModified($file))
            ->values()
            ->all();

        $billingUrl = rtrim((string) config('services.billing.url'), '/');

        // Catálogo de planes de billing para la landing unificada (cacheado 60 s)
        $billingCategories = Cache::remember('billing.plans', 60, function () use ($billingUrl) {
            try {
                $response = Http::withoutVerifying()->acceptJson()->connectTimeout(2)->timeout(4)->get("{$billingUrl}/api/plans");

                if ($response->successful() && !empty($response->json('categories'))) {
                    return $response->json('categories');
                }
            } catch (\Throwable) {
                // Si la llamada HTTP falla, consultar directamente la base de datos de billing como fallback
            }

            try {
                $categoriesMeta = [
                    'minecraft' => ['title' => 'Minecraft Hosting', 'tagline' => 'Java y Bedrock. Paper, Fabric, Forge, Purpur y más.'],
                    'games' => ['title' => 'Servidores de Juegos', 'tagline' => 'Palworld, Rust, CS2, ARK, Valheim y +50 juegos más.'],
                    'bots' => ['title' => 'Hosting de Bots', 'tagline' => 'Bots de Discord, Twitch y TeamSpeak siempre online.'],
                    'databases' => ['title' => 'Bases de Datos', 'tagline' => 'Redis, MariaDB, PostgreSQL y MongoDB gestionados.'],
                ];

                $plans = \Illuminate\Support\Facades\DB::table('cinammon_billing.plans')->orderBy('sort')->get();
                if ($plans->isNotEmpty()) {
                    return collect($categoriesMeta)->map(function ($meta, $key) use ($plans) {
                        return [
                            'key' => $key,
                            ...$meta,
                            'plans' => $plans->where('category', $key)->values()->map(function ($p) {
                                return [
                                    'id' => $p->id,
                                    'category' => $p->category,
                                    'name' => $p->name,
                                    'slug' => $p->slug,
                                    'ram_mb' => (int) $p->ram_mb,
                                    'cpu_pct' => (int) $p->cpu_pct,
                                    'storage_gb' => (int) $p->storage_gb,
                                    'price' => (float) $p->price,
                                    'popular' => (bool) $p->popular,
                                    'features' => json_decode($p->features ?? '[]', true) ?: [],
                                    'sort' => (int) $p->sort,
                                ];
                            })->all(),
                        ];
                    })->values()->all();
                }
            } catch (\Throwable) {
                // Fallback silencioso
            }

            return [];
        });

        return Inertia::render('Welcome', [
            'reviews' => $reviews,
            'posts' => $posts,
            'galleryImages' => $galleryImages,
            'billingUrl' => $billingUrl,
            'billingCategories' => $billingCategories,
            'stats' => [
                'users' => User::visible()->count(),
                'servers' => Server::count(),
                'nodes' => Node::count(),
                'eggs' => Egg::count(),
            ],
        ]);
    }
}
