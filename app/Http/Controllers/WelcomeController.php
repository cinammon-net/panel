<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Inertia\Inertia;
use App\Models\Post;

class WelcomeController extends Controller
{
    public function index()
    {
        $reviews = Review::with('user:id,name')->latest()->take(5)->get(['id', 'comment', 'rating', 'user_id']);
        $posts = Post::latest()->take(5)->get(['id', 'title', 'content', 'picture']); // toma últimos 5 posts

        return Inertia::render('Welcome', [
            'reviews' => $reviews,
            'posts' => $posts,
        ]);
    }
}
