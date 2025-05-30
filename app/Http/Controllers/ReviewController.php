<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        $sort = $request->get('sort', 'created_at');
        $direction = $request->get('direction', 'desc');

        $reviewsQuery = Review::query()->with('user:id,name');

        if ($sort === 'user.name') {
            $reviewsQuery
                ->join('users', 'users.id', '=', 'reviews.user_id')
                ->orderBy('users.name', $direction)
                ->select('reviews.*'); // Importante para evitar conflictos
        } else {
            $reviewsQuery->orderBy($sort, $direction);
        }

        $reviews = $reviewsQuery
            ->paginate($request->get('per_page', 10))
            ->withQueryString();

        return Inertia::render('Reviews', [
            'reviews' => $reviews,
            'filters' => $request->only(['sort', 'direction', 'per_page']),
        ]);
    }


    public function create()
    {
        return Inertia::render('Reviews/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $request->user()->reviews()->create($validated);

        return Redirect::route('reviews.index')->with('success', 'Valoración eliminada con éxito.');
    }

    public function show(Review $review)
    {
        return Inertia::render('Reviews/Show', [
            'review' => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'created_at' => $review->created_at->format('d/m/Y H:i'),
                'user' => $review->user->only(['name']),
            ]
        ]);
    }

    public function edit(Review $review)
    {
        return Inertia::render('Reviews/Edit', [
            'review' => $review->only(['id', 'rating', 'comment']),
        ]);
    }

    public function update(Request $request, Review $review)
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review->update($validated);

        return Redirect::route('reviews.index')
            ->with('success', 'Valoración actualizada con éxito.');
    }
    public function destroy(Review $review)
    {
        $review->delete();

        return Redirect::route('reviews.index')
            ->with('success', 'Valoración eliminada con éxito.');
    }
}
