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
        return inertia('Tickets', [
            'tickets' => Ticket::with('messages')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'nullable|string',
        ]);

        Ticket::create([
            'subject' => $request->input('subject'),
            'message' => $request->input('message', ''),
            'status' => $request->input('status', 'open'),
            'user_id' => $request->user()->id,
        ]);

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

        return back()->with('success', 'Mensaje enviado correctamente.');
    }

    public function show(Ticket $ticket)
    {
        return Inertia::render('TicketChat', [
            'ticket' => $ticket->load(['messages.replyTo']),
            'auth' => ['user' => Auth::user()],
            'recentTickets' => Ticket::with('messages')->where('user_id', Auth::id())->get(),
        ]);
    }

    public function edit($id)
    {
        $ticket = Ticket::findOrFail($id);
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
        $ticket->update($request->only(['subject', 'message', 'status']));

        return redirect()->route('tickets.index');
    }

    public function destroy(Ticket $ticket)
    {
        $ticket->delete();
        return redirect()->route('tickets.index')->with('success', 'Ticket eliminado');
    }

    public function destroyMessage($ticketId, $messageId)
    {
        $ticket = Ticket::findOrFail($ticketId);
        $message = $ticket->messages()->findOrFail($messageId);

        if ($message->user_id !== Auth::id()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $message->delete();

        return response()->json(['success' => true]);
    }
}
