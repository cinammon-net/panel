<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Inertia\Inertia;
use App\Models\Post;
use Illuminate\Support\Facades\Storage;

class WelcomeController extends Controller
{
    public function index()
    {
        $reviews = Review::with('user:id,name')->latest()->take(5)->get(['id', 'comment', 'rating', 'user_id']);
        $posts = Post::latest()->take(5)->get(['id', 'title', 'content', 'picture', 'created_at']); // toma últimos 5 posts

        $files = Storage::disk('public')->files('gallery');
        $galleryImages = collect($files)
            ->map(fn ($file) => Storage::url($file))
            ->values()
            ->all();

        return Inertia::render('Welcome', [
            'reviews' => $reviews,
            'posts' => $posts,
            'galleryImages' => $galleryImages,
        ]);
    }
}
