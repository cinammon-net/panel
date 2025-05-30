<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()
            ->withCount(['servers', 'subusers']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('sort') && in_array($request->sort, ['name', 'email'])) {
            $query->orderBy($request->sort, $request->get('direction', 'asc'));
        } else {
            $query->orderBy('name');
        }

        $users = $query->paginate($request->get('per_page', 10))->withQueryString();

        return Inertia::render('Users', [
            'users' => $users->through(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames()->toArray(), // ✅ aquí está el cambio
                    'has2fa' => !is_null($user->two_factor_secret),
                    'servers' => $user->servers_count ?? 0,
                    'subusers' => $user->subusers_count ?? 0,
                ];
            }),
            'filters' => $request->only('search', 'sort', 'direction', 'per_page'),
        ]);
        
    }
}
