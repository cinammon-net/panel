<?php

namespace App\Http\Controllers;

use App\Models\CommunityAnswer;
use App\Models\CommunityQuestion;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Puente entre las Dudas de la web y #soporte de Discord (lo usa el bot con su secreto).
 * - feed(): preguntas y respuestas de la web que aún no están en Discord, y lo resuelto hace poco.
 * - El bot avisa del hilo/mensaje que ha creado para no repetirlo.
 * - Las respuestas escritas en el hilo de Discord llegan aquí.
 * - Los hilos de #soporte resueltos llegan resumidos (sin datos personales) como pregunta ya resuelta.
 */
class BotCommunityController extends Controller
{
    public static function feed(): array
    {
        $url = fn (CommunityQuestion $q) => url('/dudas/'.$q->id);

        return [
            'new' => CommunityQuestion::with('user:id,name,discord_id')
                ->where('source', 'web')->whereNull('discord_thread_id')
                ->where('created_at', '>=', now()->subDays(3))->oldest()->limit(10)->get()
                ->map(fn (CommunityQuestion $q) => [
                    'id' => $q->id,
                    'title' => $q->title,
                    'body' => $q->body,
                    'category' => CommunityQuestion::CATEGORIES[$q->category] ?? $q->category,
                    'author' => $q->authorName(),
                    'discord_id' => $q->user?->discord_id ? (string) $q->user->discord_id : null,
                    'url' => $url($q),
                ])->values(),
            'answers' => CommunityAnswer::with(['user:id,name,discord_id', 'question:id,discord_thread_id'])
                ->whereNull('discord_message_id')->where('source', 'web')
                ->where('created_at', '>=', now()->subDays(3))
                ->whereHas('question', fn ($w) => $w->whereNotNull('discord_thread_id'))
                ->oldest()->limit(20)->get()
                ->map(fn (CommunityAnswer $a) => [
                    'id' => $a->id,
                    'thread' => $a->question->discord_thread_id,
                    'body' => $a->body,
                    'author' => $a->authorName(),
                    'discord_id' => $a->user?->discord_id ? (string) $a->user->discord_id : null,
                    'url' => url('/dudas/'.$a->question_id),
                ])->values(),
            'solved' => CommunityQuestion::whereNotNull('discord_thread_id')->where('source', 'web')
                ->where('solved_at', '>=', now()->subDays(3))->limit(20)->get(['id', 'discord_thread_id'])
                ->map(fn ($q) => ['id' => $q->id, 'thread' => $q->discord_thread_id])->values(),
        ];
    }

    public function thread(Request $request, CommunityQuestion $question)
    {
        $data = $request->validate(['thread_id' => 'required|string|regex:/^\d{5,25}$/']);
        $question->update(['discord_thread_id' => $data['thread_id']]);

        return response()->json(['ok' => true]);
    }

    public function mirrored(Request $request, CommunityAnswer $answer)
    {
        $data = $request->validate(['message_id' => 'required|string|regex:/^\d{5,25}$/']);
        $answer->update(['discord_message_id' => $data['message_id']]);

        return response()->json(['ok' => true]);
    }

    /** Respuesta escrita en el hilo de Discord (o la del asistente). */
    public function answer(Request $request)
    {
        $data = $request->validate([
            'thread_id' => 'required|string|regex:/^\d{5,25}$/',
            'message_id' => 'required|string|regex:/^\d{5,25}$/',
            'discord_id' => 'nullable|string|regex:/^\d{5,25}$/',
            'author_name' => 'nullable|string|max:80',
            'body' => 'required|string|min:2|max:4000',
            'source' => 'nullable|in:discord,assistant',
        ]);
        $q = CommunityQuestion::where('discord_thread_id', $data['thread_id'])->first();
        if (! $q) {
            return response()->json(['ok' => false, 'reason' => 'unknown_thread'], 404);
        }
        $user = ! empty($data['discord_id']) ? User::where('discord_id', $data['discord_id'])->first() : null;
        $a = CommunityAnswer::firstOrCreate(['discord_message_id' => $data['message_id']], [
            'question_id' => $q->id,
            'user_id' => $user?->id,
            'author_name' => $data['author_name'] ?? null,
            'body' => $data['body'],
            'source' => $data['source'] ?? 'discord',
        ]);
        $q->touch();

        return response()->json(['ok' => true, 'id' => $a->id]);
    }

    /** "Resuelto" pulsado en Discord en el hilo de una pregunta de la web. */
    public function solved(Request $request)
    {
        $data = $request->validate(['thread_id' => 'required|string|regex:/^\d{5,25}$/']);
        $q = CommunityQuestion::where('discord_thread_id', $data['thread_id'])->first();
        if ($q && ! $q->solved_at) {
            $q->update(['solved_at' => now()]);
        }

        return response()->json(['ok' => (bool) $q]);
    }

    /** Hilo de #soporte resuelto: se guarda resumido como pregunta ya respondida. */
    public function import(Request $request)
    {
        $data = $request->validate([
            'thread_id' => 'required|string|regex:/^\d{5,25}$/',
            'title' => 'required|string|min:5|max:140',
            'body' => 'nullable|string|max:2000',
            'answer' => 'required|string|min:10|max:4000',
            'helpers' => 'nullable|string|max:200',
            'category' => 'nullable|in:'.implode(',', array_keys(CommunityQuestion::CATEGORIES)),
        ]);
        if ($existing = CommunityQuestion::where('discord_thread_id', $data['thread_id'])->first()) {
            return response()->json(['ok' => true, 'id' => $existing->id, 'existing' => true]);
        }
        $q = CommunityQuestion::create([
            'author_name' => 'Comunidad de Discord',
            'title' => $data['title'],
            'body' => $data['body'] ?? null,
            'category' => $data['category'] ?? 'general',
            'source' => 'discord',
            'discord_thread_id' => $data['thread_id'],
            'solved_at' => now(),
        ]);
        $a = $q->answers()->create([
            'author_name' => ($data['helpers'] ?? null) ?: 'Comunidad de Discord',
            'body' => $data['answer'],
            'source' => 'discord',
        ]);
        $q->update(['best_answer_id' => $a->id]);

        return response()->json(['ok' => true, 'id' => $q->id, 'url' => url('/dudas/'.$q->id)]);
    }

    /** Preguntas resueltas parecidas (para sugerirlas en Discord). */
    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 4) {
            return response()->json([]);
        }

        return response()->json(
            CommunityController::search(CommunityQuestion::query(), $q)->whereNotNull('solved_at')
                ->latest()->limit(3)->get(['id', 'title'])
                ->map(fn ($x) => ['id' => $x->id, 'title' => $x->title, 'url' => url('/dudas/'.$x->id)])
        );
    }
}
