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
        $reviews = Review::with('user:id,name')->latest()->take(5)->get(['id', 'comment', 'rating', 'user_id']);
        $posts = Post::latest()->take(5)->get(['id', 'title', 'content', 'picture', 'created_at']); // toma últimos 5 posts

        $preferredOrder = [
            'gallery/Dashboard.png',
            'gallery/Servers.png',
            'gallery/Nodes.png',
            'gallery/Create Node.png',
            'gallery/Database.png',
            'gallery/Users.png',
        ];
        $files = collect(Storage::disk('public')->files('gallery'))
            ->filter(fn ($file) => preg_match('/\.(png|jpe?g|webp|svg)$/i', $file));

        $ordered = collect($preferredOrder)->filter(fn ($f) => $files->contains($f));
        $remaining = $files->diff($ordered);

        $galleryImages = $ordered->concat($remaining)
            ->take(6)
            ->map(fn ($file) => Storage::url($file) . '?v=' . Storage::disk('public')->lastModified($file))
            ->values()
            ->all();

        $billingUrl = rtrim((string) config('services.billing.url'), '/');

        // Catálogo de planes de billing para la landing unificada (cacheado 60 s)
        $billingCategories = Cache::remember('billing.plans', 60, function () use ($billingUrl) {
            try {
                $response = Http::acceptJson()->connectTimeout(2)->timeout(4)->get("{$billingUrl}/api/plans");

                return $response->successful() ? ($response->json('categories') ?? []) : [];
            } catch (\Throwable) {
                return [];
            }
        });

        return Inertia::render('Welcome', [
            'reviews' => $reviews,
            'posts' => $posts,
            'galleryImages' => $galleryImages,
            'billingUrl' => $billingUrl,
            'billingCategories' => $billingCategories,
            'stats' => [
                'users' => User::when(! \App\Support\Panel::demoMode(), fn ($q) => $q->whereNotIn('email', config('panel.demo_emails', [])))->count(),
                'servers' => Server::count(),
                'nodes' => Node::count(),
                'eggs' => Egg::count(),
            ],
        ]);
    }
}
