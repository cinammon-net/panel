<?php

namespace App\Http\Controllers;

use App\Models\FriendPost;
use App\Models\RoleGrant;
use App\Models\User;
use App\Support\FriendServers;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Rincón de Amigos: sección privada para quien tiene el rol "Amigo de Cinammon" (y el Owner).
 * Carné con dedicatoria, constelación de amigos, muro de notas y pozo de los deseos.
 */
class FriendCornerController extends Controller
{
    public const COLORS = ['sky', 'pink', 'amber', 'lime', 'violet'];

    private const NOTES_PER_DAY = 3;

    private const OPEN_WISHES = 3;

    public function index(Request $request)
    {
        $user = $request->user();
        $owner = $user->hasRole('Owner');
        $grants = $this->grants();
        $mine = $grants->firstWhere('user_id', $user->id);
        abort_unless($owner || $mine, 403, 'Esta sección es solo para los Amigos de Cinammon.');

        $friends = $grants->values()->map(fn (RoleGrant $g, int $i) => [
            'id' => $g->user_id,
            'number' => $i + 1,
            'name' => $g->user?->name,
            'avatar' => $g->user?->avatar_url,
            'since' => $g->created_at?->toIso8601String(),
            'expires_at' => $g->expires_at?->toIso8601String(),
            'me' => $g->user_id === $user->id,
            // La dedicatoria es privada: solo la ve el propio amigo (y el Owner, que la escribe)
            'dedication' => ($owner || $g->user_id === $user->id) ? $g->dedication : null,
        ]);

        $notes = FriendPost::with('user:id,name,avatar')->where('kind', 'note')->latest()->limit(60)->get()
            ->map(fn (FriendPost $p) => [
                'id' => $p->id,
                'body' => $p->body,
                'color' => $p->color,
                'at' => $p->created_at->toIso8601String(),
                'author' => ['id' => $p->user_id, 'name' => $p->user?->name, 'avatar' => $p->user?->avatar_url],
                'can_delete' => $owner || $p->user_id === $user->id,
            ]);

        $wishes = FriendPost::with('user:id,name,avatar')->where('kind', 'wish')
            ->when(! $owner, fn ($q) => $q->where('user_id', $user->id))
            ->orderByRaw('granted_at is not null')->latest()->limit(60)->get()
            ->map(fn (FriendPost $p) => [
                'id' => $p->id,
                'body' => $p->body,
                'at' => $p->created_at->toIso8601String(),
                'granted_at' => $p->granted_at?->toIso8601String(),
                'reply' => $p->reply,
                'author' => ['id' => $p->user_id, 'name' => $p->user?->name, 'avatar' => $p->user?->avatar_url],
            ]);

        $fs = FriendServers::settings();
        $mineServers = FriendServers::query($user)->with('egg:id,name,category,image,uuid,updated_at')->get()->map(fn ($srv) => [
            'id' => $srv->id,
            'name' => $srv->name,
            'egg' => $srv->egg?->name,
            'category' => $srv->egg?->category,
            'icon' => $srv->egg?->image_url,
            'memory' => (int) $srv->memory,
            'cpu' => (int) $srv->cpu,
            'disk' => (int) $srv->disk,
            'active' => (int) ($srv->active ?? 1) !== 0,
            'address' => $srv->publicAddress(),
        ]);
        $canCreate = $fs['enabled'] && ($mine || $owner) && $mineServers->count() < (int) $fs['per_friend'];

        return Inertia::render('Friends/Index', [
            'friendServer' => [
                'enabled' => (bool) $fs['enabled'],
                'per_friend' => (int) $fs['per_friend'],
                'limits' => ['memory' => $fs['memory'], 'cpu' => $fs['cpu'], 'disk' => $fs['disk']],
                'servers' => $mineServers,
                'can_create' => $canCreate,
                // La lista de juegos solo hace falta si todavía puede crear uno
                'eggs' => $canCreate ? FriendServers::eggs() : [],
            ],
            'isOwner' => $owner,
            'max' => (int) config('ranks.special.amigo.max', 25),
            'friends' => $friends,
            'notes' => $notes,
            'wishes' => $wishes,
            'colors' => self::COLORS,
            'limits' => ['notes_per_day' => self::NOTES_PER_DAY, 'open_wishes' => self::OPEN_WISHES],
        ]);
    }

    public function storeNote(Request $request)
    {
        $user = $this->member($request);
        $data = $request->validate([
            'body' => 'required|string|min:2|max:280',
            'color' => 'nullable|in:'.implode(',', self::COLORS),
        ]);
        $today = FriendPost::where('user_id', $user->id)->where('kind', 'note')->where('created_at', '>=', now()->subDay())->count();
        if (! $user->hasRole('Owner') && $today >= self::NOTES_PER_DAY) {
            throw ValidationException::withMessages(['body' => 'Ya has dejado '.self::NOTES_PER_DAY.' notas hoy. Vuelve mañana.']);
        }

        FriendPost::create(['user_id' => $user->id, 'kind' => 'note', 'body' => trim($data['body']), 'color' => $data['color'] ?? 'sky']);

        return back()->with('success', 'Nota pegada en el muro.');
    }

    public function storeWish(Request $request)
    {
        $user = $this->member($request);
        $data = $request->validate(['body' => 'required|string|min:3|max:280']);
        $open = FriendPost::where('user_id', $user->id)->where('kind', 'wish')->whereNull('granted_at')->count();
        if ($open >= self::OPEN_WISHES) {
            throw ValidationException::withMessages(['body' => 'Ya tienes '.self::OPEN_WISHES.' deseos esperando. Espera a que se cumpla alguno.']);
        }

        FriendPost::create(['user_id' => $user->id, 'kind' => 'wish', 'body' => trim($data['body'])]);

        return back()->with('success', 'Deseo lanzado al pozo.');
    }

    public function destroy(Request $request, FriendPost $post)
    {
        $user = $this->member($request);
        $owner = $user->hasRole('Owner');
        // Las notas las borra su autor o el Owner; un deseo, solo quien lo pidió mientras no esté concedido (o el Owner)
        abort_unless($owner || ($post->user_id === $user->id && ($post->kind === 'note' || ! $post->granted_at)), 403);
        $post->delete();

        return back()->with('success', $post->kind === 'note' ? 'Nota quitada del muro.' : 'Deseo retirado.');
    }

    /** Crear su servidor de amigo eligiendo juego y recursos. */
    public function createServer(Request $request)
    {
        $user = $this->member($request);
        abort_unless(FriendServers::settings()['enabled'], 403, 'Los servidores de amigo están desactivados.');
        $data = $request->validate([
            'name' => 'required|string|min:2|max:60',
            'egg_id' => 'required|integer',
        ] + FriendServers::rules());

        $server = FriendServers::create($user, trim($data['name']), (int) $data['egg_id'], $data);
        \App\Support\Ranks::sync($user);

        return redirect('/servers/'.$server->id.'/console')->with('success', 'Tu servidor de amigo se está instalando.');
    }

    /** Owner: conceder un deseo (con una respuesta opcional) o volver a dejarlo pendiente. */
    public function grant(Request $request, FriendPost $post)
    {
        abort_unless($request->user()->hasRole('Owner') && $post->kind === 'wish', 403);
        $data = $request->validate(['granted' => 'required|boolean', 'reply' => 'nullable|string|max:280']);
        $post->update([
            'granted_at' => $data['granted'] ? now() : null,
            'reply' => isset($data['reply']) ? (trim($data['reply']) ?: null) : $post->reply,
        ]);

        return back()->with('success', $data['granted'] ? 'Deseo concedido.' : 'Deseo marcado como pendiente.');
    }

    /** Owner: dedicatoria que sale en el reverso del carné de un amigo. */
    public function dedication(Request $request, User $user)
    {
        abort_unless($request->user()->hasRole('Owner'), 403);
        $data = $request->validate(['dedication' => 'nullable|string|max:280']);
        $grant = $this->grants()->firstWhere('user_id', $user->id);
        abort_unless($grant, 404, 'Esa persona ya no es Amiga de Cinammon.');
        $grant->update(['dedication' => trim((string) ($data['dedication'] ?? '')) ?: null]);

        return back()->with('success', 'Dedicatoria guardada.');
    }

    /** Concesiones activas del rol Amigo, en orden de llegada. */
    private function grants()
    {
        $role = config('ranks.special.amigo.name', 'Amigo de Cinammon');

        return RoleGrant::with('user:id,name,avatar')->where('source', 'friend')->where('role', $role)
            ->active()->orderBy('created_at')->orderBy('id')->get()
            ->filter(fn (RoleGrant $g) => $g->user)->unique('user_id')->values();
    }

    private function member(Request $request): User
    {
        $user = $request->user();
        abort_unless($user->hasRole('Owner') || $this->grants()->contains('user_id', $user->id), 403, 'Esta sección es solo para los Amigos de Cinammon.');

        return $user;
    }
}
