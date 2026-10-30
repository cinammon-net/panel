<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Inertia\Inertia;
use App\Models\Post;
use App\Models\User;
use App\Models\Server;
use App\Models\Node;
use App\Models\Egg;
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

        return Inertia::render('Welcome', [
            'reviews' => $reviews,
            'posts' => $posts,
            'galleryImages' => $galleryImages,
            'stats' => [
                'users' => User::count(),
                'servers' => Server::count(),
                'nodes' => Node::count(),
                'eggs' => Egg::count(),
            ],
        ]);
    }
}
