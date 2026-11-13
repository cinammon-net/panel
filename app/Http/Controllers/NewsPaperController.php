<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostLike;
use App\Models\Review;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NewsPaperController extends Controller
{
    /**
     * Portada del Periódico Digital — news.cinammon.net
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
                    'summary' => $post->summary ?: \Illuminate\Support\Str::limit(strip_tags($post->content), 180),
                    'content' => $post->content,
                    'picture' => $post->picture,
                    'is_pinned' => (bool) $post->is_pinned,
                    'views_count' => (int) $post->views_count,
                    'likes_count' => (int) $post->likes_count,
                    'author' => [
                        'id' => $post->author?->id,
                        'name' => $post->author?->name ?? 'Redacción Cinammon',
                    ],
                    'liked' => $post->isLikedBy($user, $request->ip()),
                    'created_at' => $post->created_at?->toIso8601String(),
                ];
            });

        // Noticia de portada (Lead Story)
        $leadStory = $posts->firstWhere('is_pinned', true) ?: $posts->first();

        // Noticias secundarias
        $secondaryStories = $posts->filter(fn ($p) => $leadStory && $p['id'] !== $leadStory['id'])->take(4)->values();

        // Breves de teletipo (Wire News)
        $briefs = $posts->filter(fn ($p) => $leadStory && $p['id'] !== $leadStory['id'] && !$secondaryStories->contains('id', $p['id']))->take(5)->values();

        // Testimonios de la comunidad como "Cartas al Director"
        $lettersToEditor = Review::with('user:id,name')
            ->whereNotNull('comment')
            ->where('comment', '!=', '')
            ->latest()
            ->take(3)
            ->get()
            ->map(fn ($r) => [
                'author' => $r->user?->name ?? 'Lector Anónimo',
                'rating' => $r->rating,
                'comment' => $r->comment,
                'date' => $r->created_at?->diffForHumans(),
            ]);

        // Teletipo de última hora (Ticker) dinámico con los titulares más recientes
        $postHeadlines = $posts->take(4)->pluck('title')->map(fn ($t) => 'ÚLTIMA HORA: ' . $t)->all();
        $breakingNews = array_merge($postHeadlines, [
            'INFRAESTRUCTURA: Troncal de 40 Gbps activa en Madrid y Frankfurt con latencia ultrabaja.',
            'COMUNIDAD: Despliegue de servidores gratuitos con monedas disponible las 24 horas.',
            'BLACK FRIDAY: -30% en planes Premium de alto rendimiento con código promocional activo.',
            'SEGURIDAD: Filtrado autónomo Anycast operando al 100% sin pérdida de paquetes.',
        ]);

        // Anuncios por palabras / Clasificados de época
        $classifieds = [
            [
                'section' => 'EMPLEO & STAFF',
                'title' => 'Se buscan Colaboradores',
                'text' => 'Equipo de moderación y soporte técnico abierto. Requisitos: pasión por el hosting y ganas de ayudar.',
                'tag' => 'Discord Oficial',
            ],
            [
                'section' => 'MERCADILLO GAMING',
                'title' => 'Monedas Gratis Diarias',
                'text' => 'Reclama tus recompensas diarias en el panel y canjéalas por horas de servidor ilimitadas.',
                'tag' => 'Grifo Activo',
            ],
            [
                'section' => 'SEGURIDAD & NUBE',
                'title' => 'DDoS Shield Anycast',
                'text' => 'Todos los puertos y contenedores blindados bajo capa de mitigación perimetral Cloudflare.',
                'tag' => '100% Protegido',
            ],
        ];

        return Inertia::render('NewsPaper', [
            'leadStory' => $leadStory,
            'secondaryStories' => $secondaryStories,
            'briefs' => $briefs,
            'allStories' => $posts,
            'lettersToEditor' => $lettersToEditor,
            'breakingNews' => $breakingNews,
            'classifieds' => $classifieds,
            'canManage' => (bool) $user?->hasAnyRole(['Owner', 'Admin']),
            'edition' => [
                'number' => 26,
                'date_formatted' => now()->locale('es')->isoFormat('dddd, D [de] MMMM [de] YYYY'),
                'weather' => 'Red Operativa · Ping 8ms',
                'price' => 'Edición Abierta · 0,00 €',
            ],
        ]);
    }

    /**
     * Lectura de una noticia en formato artículo de periódico.
     */
    public function show(Request $request, Post $post): Response
    {
        $sessionKey = 'viewed_post_' . $post->id;
        if (!$request->session()->has($sessionKey)) {
            $post->increment('views_count');
            $request->session()->put($sessionKey, true);
        }

        $user = $request->user();

        // Otras noticias destacadas para la columna lateral del artículo
        $related = Post::where('id', '!=', $post->id)
            ->orderByDesc('created_at')
            ->take(4)
            ->get(['id', 'title', 'category', 'summary', 'picture', 'created_at']);

        return Inertia::render('NewsPaperArticle', [
            'article' => [
                'id' => $post->id,
                'title' => $post->title,
                'category' => $post->category ?: 'actualizacion',
                'summary' => $post->summary,
                'content' => $post->content,
                'picture' => $post->picture,
                'is_pinned' => (bool) $post->is_pinned,
                'views_count' => (int) $post->views_count,
                'likes_count' => (int) $post->likes_count,
                'author' => [
                    'name' => $post->author?->name ?? 'Redacción Cinammon',
                ],
                'liked' => $post->isLikedBy($user, $request->ip()),
                'created_at' => $post->created_at?->toIso8601String(),
            ],
            'related' => $related,
            'canManage' => (bool) $user?->hasAnyRole(['Owner', 'Admin']),
            'edition' => [
                'date_formatted' => $post->created_at ? $post->created_at->locale('es')->isoFormat('dddd, D [de] MMMM [de] YYYY') : now()->locale('es')->isoFormat('dddd, D [de] MMMM [de] YYYY'),
            ],
        ]);
    }
}
