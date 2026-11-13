<?php

namespace App\Http\Controllers;

use App\Models\CommunityAnswer;
use App\Models\CommunityQuestion;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Dudas de la comunidad (solo con cuenta): cualquiera pregunta, cualquiera responde,
 * quien pregunta marca la respuesta que le sirvió y el resto vota "me sirvió".
 * Se sincroniza con #soporte de Discord a través del bot (ver BotCommunityController).
 */
class CommunityController extends Controller
{
    private const QUESTIONS_PER_DAY = 5;

    public static function isStaff(?User $user): bool
    {
        return (bool) $user?->hasAnyRole(['Owner', 'Admin', 'Moderator', 'Helper']);
    }

    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $cat = (string) $request->query('categoria', '');
        $filter = (string) $request->query('ver', '');

        $list = CommunityQuestion::with('user:id,name,avatar')
            ->withCount('answers')
            ->when(isset(CommunityQuestion::CATEGORIES[$cat]), fn ($w) => $w->where('category', $cat))
            ->when($filter === 'resueltas', fn ($w) => $w->whereNotNull('solved_at'))
            ->when($filter === 'sin-responder', fn ($w) => $w->whereNull('solved_at')->doesntHave('answers'))
            ->when($q !== '', fn ($w) => $this->search($w, $q))
            ->orderByDesc('pinned')->latest()
            ->paginate(20)->withQueryString()
            ->through(fn (CommunityQuestion $x) => $this->summary($x));

        return Inertia::render('Community/Index', [
            'questions' => $list,
            'filters' => ['q' => $q, 'categoria' => $cat, 'ver' => $filter],
            'categories' => CommunityQuestion::CATEGORIES,
            'stats' => [
                'total' => CommunityQuestion::count(),
                'solved' => CommunityQuestion::whereNotNull('solved_at')->count(),
                'answers' => CommunityAnswer::count(),
            ],
        ]);
    }

    /** Preguntas parecidas mientras se escribe (antes de publicar una nueva). */
    public function similar(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 4) {
            return response()->json([]);
        }

        return response()->json(
            $this->search(CommunityQuestion::query()->withCount('answers'), $q)
                ->orderByRaw('solved_at is null')->latest()->limit(5)->get()
                ->map(fn (CommunityQuestion $x) => [
                    'id' => $x->id,
                    'title' => $x->title,
                    'solved' => (bool) $x->solved_at,
                    'answers' => $x->answers_count,
                ])
        );
    }

    public function show(Request $request, CommunityQuestion $question)
    {
        $user = $request->user();
        $staff = self::isStaff($user);
        DB::table('community_questions')->where('id', $question->id)->increment('views');
        $question->views++;
        $question->load('user:id,name,avatar');

        $voted = DB::table('community_votes')->where('user_id', $user->id)
            ->whereIn('answer_id', $question->answers()->pluck('id'))->pluck('answer_id')->all();

        $answers = $question->answers()->with('user:id,name,avatar')->get()
            ->sortByDesc(fn (CommunityAnswer $a) => [$a->id === $question->best_answer_id ? 1 : 0, $a->helpful, -$a->id])
            ->values()
            ->map(fn (CommunityAnswer $a) => [
                'id' => $a->id,
                'body' => $a->body,
                'source' => $a->source,
                'author' => ['name' => $a->authorName(), 'avatar' => $a->user?->avatar_url],
                'helpful' => $a->helpful,
                'voted' => in_array($a->id, $voted, true),
                'best' => $a->id === $question->best_answer_id,
                'mine' => $a->user_id === $user->id,
                'can_delete' => $staff || $a->user_id === $user->id,
                'at' => $a->created_at->toIso8601String(),
            ]);

        return Inertia::render('Community/Show', [
            'question' => [
                ...$this->summary($question),
                'body' => $question->body,
                'discord_url' => $question->discord_thread_id
                    ? 'https://discord.com/channels/'.config('services.discord.guild_id', '1190032384096206909').'/'.$question->discord_thread_id
                    : null,
                'can_mark' => $staff || $question->user_id === $user->id,
                'can_delete' => $staff || $question->user_id === $user->id,
            ],
            'answers' => $answers,
            'related' => $this->search(CommunityQuestion::where('id', '!=', $question->id), $question->title)
                ->whereNotNull('solved_at')->latest()->limit(4)->get(['id', 'title'])
                ->map(fn ($x) => ['id' => $x->id, 'title' => $x->title]),
            'isStaff' => $staff,
            'categories' => CommunityQuestion::CATEGORIES,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'title' => 'required|string|min:10|max:140',
            'body' => 'nullable|string|max:4000',
            'category' => 'required|in:'.implode(',', array_keys(CommunityQuestion::CATEGORIES)),
        ]);
        $today = CommunityQuestion::where('user_id', $user->id)->where('created_at', '>=', now()->subDay())->count();
        if (! self::isStaff($user) && $today >= self::QUESTIONS_PER_DAY) {
            throw ValidationException::withMessages(['title' => 'Ya has hecho '.self::QUESTIONS_PER_DAY.' preguntas hoy. Vuelve mañana.']);
        }

        $q = CommunityQuestion::create([
            'user_id' => $user->id,
            'title' => trim($data['title']),
            'body' => trim((string) ($data['body'] ?? '')) ?: null,
            'category' => $data['category'],
        ]);

        return redirect()->route('community.show', $q)->with('success', 'Pregunta publicada.');
    }

    public function answer(Request $request, CommunityQuestion $question)
    {
        $data = $request->validate(['body' => 'required|string|min:2|max:4000']);
        $question->answers()->create(['user_id' => $request->user()->id, 'body' => trim($data['body'])]);
        $question->touch();

        return back()->with('success', 'Respuesta publicada.');
    }

    /** Quien preguntó (o el equipo) marca la respuesta que le sirvió. Volver a pulsarla la desmarca. */
    public function best(Request $request, CommunityQuestion $question, CommunityAnswer $answer)
    {
        abort_unless($answer->question_id === $question->id, 404);
        abort_unless(self::isStaff($request->user()) || $question->user_id === $request->user()->id, 403);
        $unmark = $question->best_answer_id === $answer->id;
        $question->update([
            'best_answer_id' => $unmark ? null : $answer->id,
            'solved_at' => $unmark ? null : ($question->solved_at ?? now()),
        ]);

        return back()->with('success', $unmark ? 'Respuesta desmarcada.' : 'Marcada como la respuesta que te sirvió.');
    }

    /** Resuelta sin elegir respuesta (lo resolvió por su cuenta). */
    public function solved(Request $request, CommunityQuestion $question)
    {
        abort_unless(self::isStaff($request->user()) || $question->user_id === $request->user()->id, 403);
        $question->update([
            'solved_at' => $question->solved_at ? null : now(),
            'best_answer_id' => $question->solved_at ? null : $question->best_answer_id,
        ]);

        return back();
    }

    public function vote(Request $request, CommunityAnswer $answer)
    {
        $user = $request->user();
        abort_if($answer->user_id === $user->id, 422, 'No puedes votar tu propia respuesta.');
        $key = ['answer_id' => $answer->id, 'user_id' => $user->id];
        DB::transaction(function () use ($answer, $key) {
            // Serializa los votos sobre una respuesta para mantener el contador coherente.
            $locked = CommunityAnswer::whereKey($answer->id)->lockForUpdate()->firstOrFail();
            if (DB::table('community_votes')->where($key)->exists()) {
                DB::table('community_votes')->where($key)->delete();
            } else {
                DB::table('community_votes')->insert($key);
            }
            $locked->update(['helpful' => DB::table('community_votes')->where('answer_id', $answer->id)->count()]);
        });

        return back();
    }

    public function update(Request $request, CommunityQuestion $question)
    {
        abort_unless(self::isStaff($request->user()), 403);
        $data = $request->validate([
            'pinned' => 'sometimes|boolean',
            'category' => 'sometimes|in:'.implode(',', array_keys(CommunityQuestion::CATEGORIES)),
        ]);
        $question->update($data);

        return back();
    }

    public function destroy(Request $request, CommunityQuestion $question)
    {
        abort_unless(self::isStaff($request->user()) || $question->user_id === $request->user()->id, 403);
        $question->delete();

        return redirect()->route('community.index')->with('success', 'Pregunta borrada.');
    }

    public function destroyAnswer(Request $request, CommunityAnswer $answer)
    {
        abort_unless(self::isStaff($request->user()) || $answer->user_id === $request->user()->id, 403);
        $q = $answer->question;
        if ($q && $q->best_answer_id === $answer->id) {
            $q->update(['best_answer_id' => null, 'solved_at' => null]);
        }
        $answer->delete();

        return back()->with('success', 'Respuesta borrada.');
    }

    /* ------------------------------------------------------------ */

    /** Busca cada palabra (de 3+ letras) en el título, el texto y las respuestas. */
    public static function search($query, string $text)
    {
        $words = collect(preg_split('/[^\p{L}\p{N}.\-]+/u', mb_strtolower($text)))
            ->filter(fn ($w) => mb_strlen($w) >= 3)
            ->reject(fn ($w) => in_array($w, ['como', 'cómo', 'que', 'qué', 'para', 'por', 'con', 'una', 'los', 'las', 'del', 'mi', 'puedo', 'hago', 'hacer', 'the'], true))
            ->unique()->take(6);
        if ($words->isEmpty()) {
            return $query->where('title', 'like', '%'.addcslashes($text, '%_').'%');
        }

        return $query->where(function ($w) use ($words) {
            foreach ($words as $word) {
                $like = '%'.addcslashes($word, '%_').'%';
                $w->orWhere('title', 'like', $like)->orWhere('body', 'like', $like)
                    ->orWhereHas('answers', fn ($a) => $a->where('body', 'like', $like));
            }
        });
    }

    private function summary(CommunityQuestion $x): array
    {
        return [
            'id' => $x->id,
            'title' => $x->title,
            'excerpt' => $x->body ? mb_strimwidth(preg_replace('/\s+/', ' ', $x->body), 0, 180, '…') : null,
            'category' => $x->category,
            'source' => $x->source,
            'author' => ['name' => $x->authorName(), 'avatar' => $x->user?->avatar_url],
            'answers' => $x->answers_count ?? $x->answers()->count(),
            'views' => $x->views,
            'solved' => (bool) $x->solved_at,
            'pinned' => $x->pinned,
            'at' => $x->created_at->toIso8601String(),
        ];
    }
}
