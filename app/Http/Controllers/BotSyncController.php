<?php

namespace App\Http\Controllers;

use App\Mail\TicketActivity;
use App\Models\Announcement;
use App\Models\Maintenance;
use App\Models\Node;
use App\Models\Review;
use App\Models\Server;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

/**
 * Datos que el bot de Discord sincroniza con el servidor de la comunidad:
 * anuncios, mantenimientos, estado de nodos, roles de los usuarios con Discord
 * vinculado y tickets (cada ticket es un hilo privado en #tickets).
 */
class BotSyncController extends Controller
{
    public function sync()
    {
        $members = User::visible()
            ->whereNotNull('discord_id')
            ->with('roles:id,name')
            ->get(['id', 'discord_id'])
            ->map(fn (User $u) => [
                'discord_id' => (string) $u->discord_id,
                'roles' => $u->roles->pluck('name')->values(),
            ]);

        $tickets = Ticket::with('user:id,name,discord_id')
            ->where('status', '!=', 'closed')
            ->whereHas('user', fn ($q) => $q->whereNotNull('discord_id'))
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Ticket $t) => $this->ticket($t));

        return response()->json([
            'announcements' => Announcement::live()->latest('starts_at')->limit(20)->get()->map->toPublic(),
            'maintenances' => Maintenance::visible()->orderBy('starts_at')->get()->map->toPublic(),
            'nodes' => Node::orderBy('id')->get(['id', 'name', 'online', 'maintenance_mode'])->map(fn ($n) => [
                'id' => $n->id,
                'name' => $n->name,
                'online' => (bool) $n->online,
                'maintenance' => (bool) $n->maintenance_mode,
            ]),
            'stats' => [
                'servers' => Server::count(),
                'users' => User::visible()->count(),
            ],
            'members' => $members,
            'tickets' => $tickets,
            // Canales #nuevas-cuentas y #compras (últimos 7 días; el bot publica solo lo nuevo)
            'signups' => User::visible()->where('created_at', '>=', now()->subDays(7))
                ->latest()->limit(30)->get(['id', 'name', 'discord_id', 'created_at'])
                ->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'discord_id' => $u->discord_id ? (string) $u->discord_id : null,
                    'at' => $u->created_at?->toIso8601String(),
                ])->values(),
            'purchases' => $this->purchases(),
            'reviews' => Review::with('user:id,name,discord_id')
                ->where('created_at', '>=', now()->subDays(30))
                ->latest()->limit(20)->get()
                ->map(fn (Review $r) => [
                    'id' => $r->id,
                    'rating' => (int) $r->rating,
                    'comment' => (string) ($r->comment ?? ''),
                    'author' => $r->user?->name ?? 'Cliente',
                    'discord_id' => $r->user?->discord_id ? (string) $r->user->discord_id : null,
                    'at' => $r->created_at?->toIso8601String(),
                ])->values(),
        ]);
    }

    /** Compras, renovaciones y servidores gratuitos de la tienda, sin correos (solo el Discord vinculado). */
    private function purchases(): ?array
    {
        $events = Cache::remember('bot:billing-feed', 45, function () {
            $base = rtrim((string) config('services.billing.url'), '/');
            $token = (string) config('services.billing.token');
            if ($base === '' || $token === '') {
                return null;
            }
            try {
                $ca = (string) config('services.billing.ca');
                $res = Http::withHeaders(['X-Billing-Token' => $token])->acceptJson()->timeout(8)
                    ->when($ca !== '', fn ($h) => $h->withOptions(['verify' => $ca]))
                    ->post($base.'/api/panel/bot/feed');

                return $res->successful() ? ($res->json('events') ?? []) : null;
            } catch (\Throwable $e) {
                report($e);

                return null;
            }
        });
        if ($events === null) {
            return null; // la tienda no responde: el bot no toca nada
        }
        $emails = collect($events)->pluck('email')->filter()->map(fn ($e) => strtolower($e))->unique();
        $discord = User::whereIn(\DB::raw('LOWER(email)'), $emails)->whereNotNull('discord_id')
            ->get(['email', 'discord_id'])->mapWithKeys(fn ($u) => [strtolower($u->email) => (string) $u->discord_id]);

        return collect($events)->map(function ($e) use ($discord) {
            $e['discord_id'] = $discord[strtolower((string) ($e['email'] ?? ''))] ?? null;
            unset($e['email']);

            return $e;
        })->values()->all();
    }

    /** Mensajes de un ticket posteriores a ?after=ID (para llevarlos al hilo de Discord). */
    public function messages(Request $request, Ticket $ticket)
    {
        $after = (int) $request->query('after', 0);

        return response()->json([
            'ticket' => $this->ticket($ticket->load('user:id,name,discord_id')),
            'messages' => $ticket->messages()->with('sender:id,discord_id')
                ->where('id', '>', $after)->orderBy('id')->limit(50)->get()
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'author' => $m->sender_name ?: 'Usuario',
                    'discord_id' => $m->sender?->discord_id ? (string) $m->sender->discord_id : null,
                    'message' => $m->message,
                    'audio_url' => $m->audio_url ? url($m->audio_url) : null,
                    'created_at' => $m->created_at?->toIso8601String(),
                ]),
        ]);
    }

    /** Abre un ticket desde Discord para la cuenta vinculada a ese usuario de Discord. */
    public function open(Request $request)
    {
        $data = $request->validate([
            'discord_id' => 'required|string|max:32',
            'subject' => 'required|string|max:255',
            'message' => 'nullable|string|max:4000',
        ]);

        $user = User::where('discord_id', $data['discord_id'])->first();
        if (! $user) {
            return response()->json(['error' => 'not_linked'], 404);
        }

        $ticket = Ticket::create([
            'subject' => $data['subject'],
            'message' => $data['message'] ?? '',
            'status' => 'open',
            'user_id' => $user->id,
        ]);
        $this->notify($ticket, 'opened', $user->name.' (Discord)', $ticket->message);

        return response()->json(['ticket' => $this->ticket($ticket->load('user:id,name,discord_id'))], 201);
    }

    /** Mensaje escrito en el hilo de Discord: se guarda en el ticket del panel. */
    public function reply(Request $request, Ticket $ticket)
    {
        $data = $request->validate([
            'discord_id' => 'required|string|max:32',
            'discord_name' => 'nullable|string|max:100',
            'message' => 'required|string|max:4000',
        ]);

        $author = User::where('discord_id', $data['discord_id'])->first();
        $isOwner = $author && $author->id === $ticket->user_id;
        $isStaff = $author?->hasAnyRole(['Owner', 'Admin', 'Moderator', 'Moderador', 'Helper']);

        // Alguien del equipo sin cuenta vinculada: se guarda a nombre del primer Owner.
        if (! $isOwner && ! $isStaff) {
            $author = User::role('Owner')->orderBy('id')->first();
            if (! $author) {
                return response()->json(['error' => 'no_owner'], 422);
            }
        }

        $name = $isOwner || $isStaff ? $author->name : ($data['discord_name'] ?: 'Equipo').' (Discord)';
        $message = $ticket->messages()->create([
            'user_id' => $author->id,
            'sender_name' => $name,
            'sender_avatar' => $author->avatar,
            'message' => $data['message'],
        ]);

        if ($ticket->status === 'closed') {
            $ticket->update(['status' => 'open']);
        }
        $this->notify($ticket, $isOwner ? 'to_staff' : 'to_client', $name, $data['message']);

        return response()->json(['id' => $message->id], 201);
    }

    public function status(Request $request, Ticket $ticket)
    {
        $data = $request->validate(['status' => 'required|in:open,pending,closed']);
        $ticket->update($data);

        return response()->json(['ticket' => $this->ticket($ticket->load('user:id,name,discord_id'))]);
    }

    private function ticket(Ticket $t): array
    {
        return [
            'id' => $t->id,
            'subject' => $t->subject,
            'message' => $t->message,
            'status' => $t->status,
            'user' => $t->user ? ['name' => $t->user->name, 'discord_id' => $t->user->discord_id ? (string) $t->user->discord_id : null] : null,
            'url' => url('/tickets/'.$t->id),
            'created_at' => $t->created_at?->toIso8601String(),
        ];
    }

    private function notify(Ticket $ticket, string $kind, string $author, ?string $excerpt): void
    {
        if (config('panel.demo')) {
            return;
        }
        $to = $kind === 'to_client' ? $ticket->user?->email : config('services.cloudflare_mail.support');
        if (! $to) {
            return;
        }
        try {
            Mail::to($to)->queue(new TicketActivity($ticket, $kind, $author, $excerpt));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
