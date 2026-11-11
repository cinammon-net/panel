<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::withCount(['servers', 'subusers'])
            // Las cuentas de demostración solo se listan en modo demo
            ->when(! \App\Support\Panel::demoMode(), fn ($query) => $query->whereNotIn('email', config('panel.demo_emails', [])))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', "%{$request->search}%")
                        ->orWhere('email', 'like', "%{$request->search}%");
                });
            })
            ->when($request->filled('sort') && in_array($request->sort, ['name', 'email']), function ($query) use ($request) {
                $query->orderBy($request->sort, $request->get('direction', 'asc'));
            }, fn($query) => $query->orderBy('name'))
            ->paginate($request->get('per_page', 10))
            ->withQueryString();

        return Inertia::render('Users', [
            'users' => $users->through(fn($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar_url,
                'roles' => $user->getRoleNames(),
                'has2fa' => !is_null($user->two_factor_secret),
                'servers' => $user->servers_count,
                'subusers' => $user->subusers_count,
            ]),
            'filters' => $request->only('search', 'sort', 'direction', 'per_page'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Users/Create', [
            'roles' => Role::select('id', 'name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:4',
            'roles' => 'required|array',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
        ]);

        $user->assignRole($validated['roles']);

        return redirect()->route('users.index')->with('success', 'User created successfully.');
    }

    public function edit(Request $request, User $user)
    {
        $isOwner = $request->user()?->hasRole('Owner') === true;

        return Inertia::render('Users/Edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
                'has2fa' => !is_null($user->two_factor_secret),
                'security_lock' => $isOwner ? [
                    'has_code' => $user->hasSecurityCode(),
                    'active' => $user->securityLockActive(),
                    'until' => $user->lock_enabled_until?->toIso8601String(),
                    'set_at' => $user->lock_code_set_at?->toIso8601String(),
                ] : null,
            ],
            'canManageSecurityLock' => $isOwner,
            'roles' => Role::select('id', 'name')->get(),
        ]);
    }

    public function updateSecurityLock(Request $request, User $user)
    {
        abort_unless($request->user()?->hasRole('Owner'), 403, 'Solo el Owner del panel puede modificar el código de seguridad.');

        $data = $request->validate([
            'action' => ['required', 'string', 'in:set,disable,reset'],
            'code' => ['required_if:action,set', 'nullable', 'string', 'min:4', 'max:32'],
            'activate' => ['nullable', 'boolean'],
        ]);

        if ($data['action'] === 'set') {
            $activate = array_key_exists('activate', $data) ? (bool) $data['activate'] : true;
            $user->forceFill([
                'lock_code' => Hash::make((string) $data['code']),
                'lock_code_set_at' => now(),
                'lock_enabled_until' => $activate ? now()->addMonth() : null,
            ])->save();

            Log::warning("Owner ({$request->user()->email}) actualizó el código de seguridad de {$user->email} (id {$user->id}).");

            return back()->with('success', "Código de seguridad actualizado para {$user->name}.");
        }

        if ($data['action'] === 'disable') {
            $user->forceFill(['lock_enabled_until' => null])->save();
            Log::warning("Owner ({$request->user()->email}) desactivó el bloqueo de seguridad de {$user->email} (id {$user->id}).");

            return back()->with('success', "Bloqueo temporal desactivado para {$user->name}.");
        }

        $user->forceFill([
            'lock_code' => null,
            'lock_code_set_at' => null,
            'lock_enabled_until' => null,
        ])->save();

        Log::warning("Owner ({$request->user()->email}) restableció el bloqueo de seguridad de {$user->email} (id {$user->id}).");

        return back()->with('success', "Código de seguridad restablecido para {$user->name}.");
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|unique:users,email,{$user->id}",
            'password' => 'nullable|string|min:4',
            'roles' => 'required|array',
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'] ? bcrypt($validated['password']) : $user->password,
        ]);

        $user->syncRoles($validated['roles']);

        return redirect()->route('users.index')->with('success', 'User updated successfully.');
    }

    public function destroy(User $user)
    {
        if ($user->id === Auth::id()) {
            return redirect()->route('users.index')->with('error', 'You cannot delete your own account.');
        }

        $user->delete();

        return redirect()->route('users.index')->with('success', 'User deleted successfully.');
    }

    public function destroyRole(User $user, Role $role)
    {
        if ($user->id === Auth::id()) {
            return redirect()->route('users.index')->with('error', 'You cannot remove your own role.');
        }

        $user->removeRole($role);

        return redirect()->route('users.index')->with('success', 'Role removed successfully.');
    }
}
