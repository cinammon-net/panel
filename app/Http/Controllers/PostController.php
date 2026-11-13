<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostLike;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    /**
     * Listado principal de noticias y publicaciones.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $posts = Post::with(['author:id,name,email'])
            ->orderByDesc('is_pinned')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Post $post) use ($user, $request) {
                return [
                    'id' => $post->id,
                    'title' => $post->title,
                    'category' => $post->category ?: 'actualizacion',
                    'summary' => $post->summary ?: \Illuminate\Support\Str::limit(strip_tags($post->content), 160),
                    'content' => $post->content,
                    'picture' => $post->picture,
                    'is_pinned' => (bool) $post->is_pinned,
                    'views_count' => (int) $post->views_count,
                    'likes_count' => (int) $post->likes_count,
                    'author' => [
                        'id' => $post->author?->id,
                        'name' => $post->author?->name ?? 'Equipo Cinammon',
                    ],
                    'liked' => $post->isLikedBy($user, $request->ip()),
                    'created_at' => $post->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('Posts', [
            'posts' => $posts,
            'canManage' => (bool) $user?->hasAnyRole(['Owner', 'Admin']),
            'categories' => [
                ['id' => 'todos', 'label' => 'Todas las noticias', 'color' => 'yellow'],
                ['id' => 'actualizacion', 'label' => 'Actualizaciones', 'color' => 'emerald'],
                ['id' => 'anuncio', 'label' => 'Anuncios Oficiales', 'color' => 'amber'],
                ['id' => 'mantenimiento', 'label' => 'Mantenimientos', 'color' => 'orange'],
                ['id' => 'evento', 'label' => 'Eventos & Promos', 'color' => 'purple'],
                ['id' => 'comunidad', 'label' => 'Comunidad', 'color' => 'cyan'],
            ],
        ]);
    }

    /**
     * Detalle de una publicación individual.
     */
    public function show(Request $request, Post $post)
    {
        // Registrar vista única por sesión
        $sessionKey = 'viewed_post_' . $post->id;
        if (!$request->session()->has($sessionKey)) {
            $post->increment('views_count');
            $request->session()->put($sessionKey, true);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'post' => $post->load('author:id,name,email'),
                'liked' => $post->isLikedBy($request->user(), $request->ip()),
            ]);
        }

        return redirect()->route('posts.index', ['post' => $post->id]);
    }

    /**
     * Guardar una nueva publicación.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'nullable|string|max:50',
            'summary' => 'nullable|string|max:500',
            'content' => 'required|string',
            'is_pinned' => 'nullable|boolean',
            'picture' => 'nullable|image|max:4096',
        ]);

        $data = [
            'author_id' => $request->user()?->id,
            'title' => $validated['title'],
            'category' => $validated['category'] ?? 'actualizacion',
            'summary' => $validated['summary'] ?? null,
            'content' => $validated['content'],
            'is_pinned' => (bool) ($request->boolean('is_pinned') ?? false),
        ];

        if ($request->hasFile('picture')) {
            $file = $request->file('picture');
            $fileName = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());
            $path = $file->storeAs('uploads/news', $fileName, 'public');
            $data['picture'] = '/storage/' . $path;
        }

        Post::create($data);

        return redirect()->route('posts.index')->with('success', '¡Noticia publicada con éxito!');
    }

    /**
     * Actualizar una publicación existente.
     */
    public function update(Request $request, Post $post): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'nullable|string|max:50',
            'summary' => 'nullable|string|max:500',
            'content' => 'required|string',
            'is_pinned' => 'nullable|boolean',
            'picture' => 'nullable|image|max:4096',
        ]);

        $data = [
            'title' => $validated['title'],
            'category' => $validated['category'] ?? $post->category ?? 'actualizacion',
            'summary' => $validated['summary'] ?? null,
            'content' => $validated['content'],
            'is_pinned' => (bool) ($request->boolean('is_pinned') ?? false),
        ];

        if ($request->hasFile('picture')) {
            $file = $request->file('picture');
            $fileName = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());
            $path = $file->storeAs('uploads/news', $fileName, 'public');
            $data['picture'] = '/storage/' . $path;
        }

        $post->update($data);

        return redirect()->route('posts.index')->with('success', '¡Noticia actualizada correctamente!');
    }

    /**
     * Eliminar una publicación.
     */
    public function destroy(Post $post): RedirectResponse
    {
        $post->delete();

        return redirect()->route('posts.index')->with('success', 'Noticia eliminada del tablón.');
    }

    /**
     * Reaccionar con Me Gusta a una publicación.
     */
    public function toggleLike(Request $request, Post $post): JsonResponse
    {
        $user = $request->user();
        $ip = $request->ip();

        $query = PostLike::where('post_id', $post->id);
        if ($user) {
            $query->where('user_id', $user->id);
        } else {
            $query->where('ip_address', $ip);
        }

        $existingLike = $query->first();

        if ($existingLike) {
            $existingLike->delete();
            $post->decrement('likes_count');
            $liked = false;
        } else {
            PostLike::create([
                'post_id' => $post->id,
                'user_id' => $user?->id,
                'ip_address' => $ip,
            ]);
            $post->increment('likes_count');
            $liked = true;
        }

        $likesCount = max(0, (int) $post->fresh()->likes_count);

        return response()->json([
            'liked' => $liked,
            'likes_count' => $likesCount,
        ]);
    }
}
