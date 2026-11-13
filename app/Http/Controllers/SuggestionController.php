<?php

namespace App\Http\Controllers;

use App\Models\Suggestion;
use App\Models\SuggestionVote;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SuggestionController extends Controller
{
    private const MAX_PER_DAY = 5;

    public static function isStaff(?User $user): bool
    {
        return (bool) $user?->hasAnyRole(['Owner', 'Admin', 'Moderator', 'Helper']);
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $isStaff = self::isStaff($user);

        $q = trim((string) $request->query('q', ''));
        $cat = (string) $request->query('categoria', '');
        $filter = (string) $request->query('ver', 'todas');
        $sort = (string) $request->query('orden', 'populares');

        $query = Suggestion::with('user:id,name,avatar');

        // Categoría
        if (isset(Suggestion::CATEGORIES[$cat])) {
            $query->where('category', $cat);
        }

        // Filtro de estado
        if ($filter === 'abiertas') {
            $query->whereIn('status', ['pending', 'review', 'accepted']);
        } elseif (isset(Suggestion::STATUSES[$filter])) {
            $query->where('status', $filter);
        }

        // Búsqueda por palabras clave
        if ($q !== '') {
            $this->applySearch($query, $q);
        }

        // Orden
        if ($sort === 'recientes') {
            $query->latest();
        } elseif ($sort === 'mas-apoyadas') {
            $query->orderByDesc('upvotes')->latest();
        } else {
            // populares: mayor score, luego fecha
            $query->orderByDesc('score')->latest();
        }

        $paginated = $query->paginate(15)->withQueryString();

        // Mapeo de votos del usuario actual
        $userVotes = [];
        if ($user) {
            $ids = $paginated->pluck('id')->all();
            if (! empty($ids)) {
                $userVotes = SuggestionVote::where('user_id', $user->id)
                    ->whereIn('suggestion_id', $ids)
                    ->pluck('direction', 'suggestion_id')
                    ->all();
            }
        }

        $items = $paginated->through(fn (Suggestion $s) => [
            'id' => $s->id,
            'title' => $s->title,
            'what' => $s->what,
            'why' => $s->why,
            'category' => $s->category,
            'category_label' => Suggestion::CATEGORIES[$s->category] ?? $s->category,
            'status' => $s->status,
            'status_meta' => Suggestion::STATUSES[$s->status] ?? Suggestion::STATUSES['pending'],
            'staff_note' => $s->staff_note,
            'upvotes' => (int) $s->upvotes,
            'downvotes' => (int) $s->downvotes,
            'score' => (int) $s->score,
            'author' => [
                'name' => $s->authorName(),
                'avatar' => $s->authorAvatar(),
            ],
            'is_author' => $user ? ($s->user_id === $user->id) : false,
            'my_vote' => $userVotes[$s->id] ?? null,
            'discord_thread_id' => $s->discord_thread_id,
            'created_at' => $s->created_at?->toIso8601String(),
        ]);

        return Inertia::render('Suggestions/Index', [
            'suggestions' => $items,
            'filters' => [
                'q' => $q,
                'categoria' => $cat,
                'ver' => $filter,
                'orden' => $sort,
            ],
            'categories' => Suggestion::CATEGORIES,
            'statuses' => Suggestion::STATUSES,
            'isStaff' => $isStaff,
            'stats' => [
                'total' => Suggestion::count(),
                'open' => Suggestion::whereIn('status', ['pending', 'review', 'accepted'])->count(),
                'review' => Suggestion::where('status', 'review')->count(),
                'accepted' => Suggestion::where('status', 'accepted')->count(),
                'done' => Suggestion::where('status', 'done')->count(),
            ],
        ]);
    }

    /** Sugerencias parecidas mientras se escribe en el modal de propuesta */
    public function similar(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 4) {
            return response()->json([]);
        }

        $query = Suggestion::query();
        $this->applySearch($query, $q);

        $results = $query->orderByDesc('score')->limit(4)->get(['id', 'title', 'status', 'score', 'category'])
            ->map(fn (Suggestion $s) => [
                'id' => $s->id,
                'title' => $s->title,
                'status' => $s->status,
                'status_label' => Suggestion::STATUSES[$s->status]['label'] ?? $s->status,
                'score' => $s->score,
            ]);

        return response()->json($results);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $isStaff = self::isStaff($user);

        $data = $request->validate([
            'title' => 'required|string|min:8|max:90',
            'what' => 'required|string|min:15|max:1500',
            'why' => 'nullable|string|max:800',
            'category' => 'required|in:' . implode(',', array_keys(Suggestion::CATEGORIES)),
        ]);

        if (! $isStaff) {
            $today = Suggestion::where('user_id', $user->id)
                ->where('created_at', '>=', now()->subDay())
                ->count();
            if ($today >= self::MAX_PER_DAY) {
                throw ValidationException::withMessages([
                    'title' => 'Has alcanzado el límite diario de ' . self::MAX_PER_DAY . ' sugerencias. ¡Vuelve mañana!',
                ]);
            }
        }

        Suggestion::create([
            'user_id' => $user->id,
            'discord_id' => $user->discord_id ? (string) $user->discord_id : null,
            'author_name' => $user->name,
            'title' => trim($data['title']),
            'what' => trim($data['what']),
            'why' => trim((string) ($data['why'] ?? '')) ?: null,
            'category' => $data['category'],
            'status' => 'pending',
            'status_updated_at' => now(),
        ]);

        return back()->with('success', '¡Sugerencia publicada! Se sincronizará con #sugerencias de Discord.');
    }

    public function vote(Request $request, Suggestion $suggestion)
    {
        $user = $request->user();
        if ($suggestion->user_id === $user->id) {
            return back()->with('error', 'No puedes votar tu propia sugerencia: tu apoyo ya se da por hecho.');
        }

        if (! $suggestion->isOpen()) {
            return back()->with('error', 'Esta sugerencia ya está cerrada y no admite nuevos votos.');
        }

        $data = $request->validate([
            'direction' => 'required|in:1,-1',
        ]);
        $dir = (int) $data['direction'];

        DB::transaction(function () use ($suggestion, $user, $dir) {
            $existing = SuggestionVote::where('suggestion_id', $suggestion->id)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                if ($existing->direction === $dir) {
                    // Mismo voto: quitar voto
                    $existing->delete();
                } else {
                    // Cambiar de signo
                    $existing->update([
                        'direction' => $dir,
                        'discord_id' => $user->discord_id ? (string) $user->discord_id : $existing->discord_id,
                    ]);
                }
            } else {
                SuggestionVote::create([
                    'suggestion_id' => $suggestion->id,
                    'user_id' => $user->id,
                    'discord_id' => $user->discord_id ? (string) $user->discord_id : null,
                    'direction' => $dir,
                ]);
            }

            $suggestion->recalculateVotes();
        });

        return back();
    }

    public function status(Request $request, Suggestion $suggestion)
    {
        abort_unless(self::isStaff($request->user()), 403, 'Solo el equipo puede cambiar el estado.');

        $data = $request->validate([
            'status' => 'required|in:' . implode(',', array_keys(Suggestion::STATUSES)),
            'staff_note' => 'nullable|string|max:900',
        ]);

        $suggestion->update([
            'status' => $data['status'],
            'staff_note' => trim((string) ($data['staff_note'] ?? '')) ?: null,
            'status_updated_at' => now(),
        ]);

        $label = Suggestion::STATUSES[$data['status']]['label'] ?? $data['status'];
        return back()->with('success', "Sugerencia marcada como '{$label}'.");
    }

    private function applySearch($query, string $text): void
    {
        $words = collect(preg_split('/[^\p{L}\p{N}.\-]+/u', mb_strtolower($text)))
            ->filter(fn ($w) => mb_strlen($w) >= 3)
            ->reject(fn ($w) => in_array($w, ['para', 'por', 'con', 'una', 'los', 'las', 'del', 'que', 'como', 'más', 'mas', 'idea', 'sugerencia'], true))
            ->unique()->take(6);

        if ($words->isEmpty()) {
            $like = '%' . addcslashes($text, '%_') . '%';
            $query->where('title', 'like', $like);
            return;
        }

        $query->where(function ($w) use ($words) {
            foreach ($words as $word) {
                $like = '%' . addcslashes($word, '%_') . '%';
                $w->orWhere('title', 'like', $like)
                  ->orWhere('what', 'like', $like)
                  ->orWhere('why', 'like', $like);
            }
        });
    }
}
