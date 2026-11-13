<?php

namespace App\Http\Controllers;

use App\Models\Suggestion;
use App\Models\SuggestionVote;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BotSuggestionController extends Controller
{
    /** Alimentador para /bot/sync: envía sugerencias creadas en la web para abrir hilo en Discord */
    public static function feed(): array
    {
        return [
            'new' => Suggestion::with('user:id,name,avatar,discord_id')
                ->whereNull('discord_thread_id')
                ->where('created_at', '>=', now()->subDays(7))
                ->oldest()
                ->limit(10)
                ->get()
                ->map(fn (Suggestion $s) => [
                    'id' => $s->id,
                    'title' => $s->title,
                    'what' => $s->what,
                    'why' => $s->why,
                    'category' => $s->category,
                    'category_label' => Suggestion::CATEGORIES[$s->category] ?? $s->category,
                    'author' => $s->authorName(),
                    'discord_id' => $s->discord_id ?: ($s->user?->discord_id ? (string) $s->user->discord_id : null),
                    'url' => url('/sugerencias?q=' . urlencode($s->title)),
                ])->values(),

            'statuses' => Suggestion::whereNotNull('discord_thread_id')
                ->whereNotNull('status_updated_at')
                ->where('status_updated_at', '>=', now()->subHours(24))
                ->latest('status_updated_at')
                ->limit(20)
                ->get(['id', 'discord_thread_id', 'status', 'staff_note'])
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'thread_id' => $s->discord_thread_id,
                    'status' => $s->status,
                    'note' => $s->staff_note,
                ])->values(),
        ];
    }

    /** El bot vincula el ID del hilo y de la tarjeta tras publicarlo en Discord */
    public function thread(Request $request, Suggestion $suggestion)
    {
        $data = $request->validate([
            'thread_id' => 'required|string|regex:/^\d{5,25}$/',
            'message_id' => 'nullable|string|regex:/^\d{5,25}$/',
        ]);

        $suggestion->update([
            'discord_thread_id' => $data['thread_id'],
            'discord_message_id' => $data['message_id'] ?? $suggestion->discord_message_id,
        ]);

        return response()->json(['ok' => true]);
    }

    /** Sugerencia propuesta desde Discord (comando /sugerir o modal) */
    public function storeFromDiscord(Request $request)
    {
        $data = $request->validate([
            'thread_id' => 'required|string|regex:/^\d{5,25}$/',
            'message_id' => 'nullable|string|regex:/^\d{5,25}$/',
            'discord_id' => 'required|string|regex:/^\d{5,25}$/',
            'author_name' => 'required|string|max:80',
            'title' => 'required|string|max:140',
            'what' => 'required|string|max:4000',
            'why' => 'nullable|string|max:1000',
            'category' => 'nullable|string|max:30',
        ]);

        $user = User::where('discord_id', $data['discord_id'])->first();

        $cat = $data['category'] ?? 'general';
        if (! isset(Suggestion::CATEGORIES[$cat])) {
            $cat = 'general';
        }

        $suggestion = Suggestion::firstOrCreate(
            ['discord_thread_id' => $data['thread_id']],
            [
                'user_id' => $user?->id,
                'discord_id' => $data['discord_id'],
                'author_name' => $data['author_name'],
                'title' => trim($data['title']),
                'what' => trim($data['what']),
                'why' => trim((string) ($data['why'] ?? '')) ?: null,
                'category' => $cat,
                'status' => 'pending',
                'discord_message_id' => $data['message_id'] ?? null,
                'status_updated_at' => now(),
            ]
        );

        return response()->json(['ok' => true, 'id' => $suggestion->id]);
    }

    /** Voto emitido desde Discord en los botones de la tarjeta */
    public function voteFromDiscord(Request $request)
    {
        $data = $request->validate([
            'thread_id' => 'required|string|regex:/^\d{5,25}$/',
            'discord_id' => 'required|string|regex:/^\d{5,25}$/',
            'direction' => 'required|in:1,-1,0', // 0 = quitar voto
        ]);

        $suggestion = Suggestion::where('discord_thread_id', $data['thread_id'])->first();
        if (! $suggestion) {
            return response()->json(['ok' => false, 'reason' => 'not_found'], 404);
        }

        $user = User::where('discord_id', $data['discord_id'])->first();
        $dir = (int) $data['direction'];

        DB::transaction(function () use ($suggestion, $user, $data, $dir) {
            $existing = SuggestionVote::where('suggestion_id', $suggestion->id)
                ->where(function ($q) use ($user, $data) {
                    $q->where('discord_id', $data['discord_id']);
                    if ($user) {
                        $q->orWhere('user_id', $user->id);
                    }
                })->first();

            if ($dir === 0) {
                $existing?->delete();
            } elseif ($existing) {
                $existing->update([
                    'direction' => $dir,
                    'user_id' => $user?->id ?? $existing->user_id,
                ]);
            } else {
                SuggestionVote::create([
                    'suggestion_id' => $suggestion->id,
                    'user_id' => $user?->id,
                    'discord_id' => $data['discord_id'],
                    'direction' => $dir,
                ]);
            }

            $suggestion->recalculateVotes();
        });

        return response()->json([
            'ok' => true,
            'upvotes' => $suggestion->fresh()->upvotes,
            'downvotes' => $suggestion->fresh()->downvotes,
            'score' => $suggestion->fresh()->score,
        ]);
    }

    /** Cambio de estado emitido por staff desde Discord */
    public function statusFromDiscord(Request $request)
    {
        $data = $request->validate([
            'thread_id' => 'required|string|regex:/^\d{5,25}$/',
            'status' => 'required|in:' . implode(',', array_keys(Suggestion::STATUSES)),
            'staff_note' => 'nullable|string|max:900',
        ]);

        $suggestion = Suggestion::where('discord_thread_id', $data['thread_id'])->first();
        if (! $suggestion) {
            return response()->json(['ok' => false, 'reason' => 'not_found'], 404);
        }

        $suggestion->update([
            'status' => $data['status'],
            'staff_note' => trim((string) ($data['staff_note'] ?? '')) ?: null,
            'status_updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    /** Top sugerencias abiertas para comando /top-sugerencias */
    public function top(Request $request)
    {
        $limit = min(10, max(1, (int) $request->query('limit', 5)));

        $list = Suggestion::whereIn('status', ['pending', 'review', 'accepted'])
            ->orderByDesc('score')
            ->limit($limit)
            ->get()
            ->map(fn (Suggestion $s) => [
                'id' => $s->id,
                'title' => $s->title,
                'category' => Suggestion::CATEGORIES[$s->category] ?? $s->category,
                'status' => Suggestion::STATUSES[$s->status]['label'] ?? $s->status,
                'score' => $s->score,
                'upvotes' => $s->upvotes,
                'downvotes' => $s->downvotes,
                'discord_thread_id' => $s->discord_thread_id,
                'url' => url('/sugerencias?q=' . urlencode($s->title)),
            ]);

        return response()->json($list);
    }
}
