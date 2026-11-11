<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TicketController extends Controller
{
    public function index()
    {
        // Los tickets de usuarios con rango de soporte prioritario salen primero.
        // El equipo ve todos los tickets; cada cliente solo los suyos.
        $tickets = Ticket::with(['messages', 'user'])
            ->when(! $this->isStaff(), fn ($q) => $q->where('user_id', Auth::id()))
            ->get()
            ->each(fn ($t) => $t->setAttribute('priority', \App\Support\Ranks::perks($t->user)['priority']))
            ->sortByDesc('priority')
            ->values();
        $tickets->each->unsetRelation('user');

        return inertia('Tickets', [
            'tickets' => $tickets,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'nullable|string',
        ]);

        $ticket = Ticket::create([
            'subject' => $request->input('subject'),
            'message' => $request->input('message', ''),
            'status' => 'open',
            'user_id' => $request->user()->id,
        ]);

        $this->notify($ticket, 'opened', $request->user()->name, $ticket->message);

        return redirect()->route('tickets.index');
    }

    public function storeMessage(Request $request, $ticketId)
    {
        $request->validate([
            'message' => 'nullable|string',
            'reply_to_id' => 'nullable|exists:ticket_messages,id',
            'audio' => 'nullable|file|mimes:webm,mp3,wav|max:20480',
        ]);

        $ticket = Ticket::findOrFail($ticketId);
        $this->authorizeTicket($ticket);
        $audioUrl = null;

        if ($request->hasFile('audio')) {
            $path = $request->file('audio')->store('audios', 'public');
            $audioUrl = Storage::url($path);
        }

        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'sender_name' => $request->user()->name,
            'sender_avatar' => $request->user()->avatar,
            'message' => $request->input('message'),
            'reply_to_id' => $request->input('reply_to_id'),
            'audio_url' => $audioUrl,
        ]);

        // Aviso por correo: si escribe el equipo, al cliente; si escribe el cliente, a soporte.
        $fromOwner = $request->user()->id === $ticket->user_id;
        $this->notify($ticket, $fromOwner ? 'to_staff' : 'to_client', $request->user()->name,
            $request->input('message') ?: ($audioUrl ? '(Mensaje de voz)' : null));

        return back()->with('success', 'Mensaje enviado correctamente.');
    }

    public function show(Ticket $ticket)
    {
        $this->authorizeTicket($ticket);

        return Inertia::render('TicketChat', [
            'ticket' => $ticket->load(['messages.replyTo', 'user']),
            'auth' => ['user' => Auth::user()],
            'recentTickets' => Ticket::with(['messages', 'user'])->where('user_id', Auth::id())->get(),
        ]);
    }

    public function edit($id)
    {
        $ticket = Ticket::findOrFail($id);
        $this->authorizeTicket($ticket);
        return inertia('Tickets/Edit', compact('ticket'));
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'nullable|string',
            'status' => 'required|in:open,pending,closed',
        ]);

        $ticket = Ticket::findOrFail($id);
        $this->authorizeTicket($ticket);
        $ticket->update($request->only(['subject', 'message', 'status']));

        return redirect()->route('tickets.index');
    }

    public function destroy(Ticket $ticket)
    {
        $this->authorizeTicket($ticket);
        $ticket->delete();
        return redirect()->route('tickets.index')->with('success', 'Ticket eliminado');
    }

    public function destroyMessage($ticketId, $messageId)
    {
        $ticket = Ticket::findOrFail($ticketId);
        $this->authorizeTicket($ticket);
        $message = $ticket->messages()->findOrFail($messageId);

        if ($message->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $message->delete();

        return response()->json(['success' => true]);
    }

    private function isStaff(): bool
    {
        return (bool) Auth::user()?->hasAnyRole(['Owner', 'Admin', 'Moderator', 'Helper']);
    }

    /** Solo el dueño del ticket y el equipo de soporte pueden verlo o tocarlo. */
    private function authorizeTicket(Ticket $ticket): void
    {
        abort_unless($ticket->user_id === Auth::id() || $this->isStaff(), 403, 'Este ticket no es tuyo.');
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
            \Illuminate\Support\Facades\Mail::to($to)->queue(new \App\Mail\TicketActivity($ticket, $kind, $author, $excerpt));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
