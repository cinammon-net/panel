<?php

namespace App\Http\Controllers;

use App\Services\Daemon\ServerConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DaemonController extends Controller
{
    private function server(Request $request, string $uuid)
    {
        return $request->attributes->get('node')->servers()->where('uuid', $uuid)->firstOrFail();
    }

    public function servers(Request $request, ServerConfiguration $configuration)
    {
        $page = $request->attributes->get('node')->servers()->with(['egg.variables', 'allocation'])
            ->paginate(min(100, max(1, $request->integer('per_page', 50))));
        return response()->json([
            'data' => $page->getCollection()->map(fn ($server) => $configuration->forServer($server)),
            'meta' => [
                'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(), 'total' => $page->total(),
                'from' => $page->firstItem() ?? 0, 'to' => $page->lastItem() ?? 0,
            ],
        ]);
    }

    public function configuration(Request $request, string $uuid, ServerConfiguration $configuration)
    {
        return response()->json($configuration->forServer($this->server($request, $uuid)));
    }

    public function installScript(Request $request, string $uuid)
    {
        $egg = $this->server($request, $uuid)->egg;
        return response()->json([
            'container_image' => $egg->script_container,
            'entrypoint' => $egg->script_entry,
            'script' => $egg->script_install,
        ]);
    }

    public function installed(Request $request, string $uuid)
    {
        $data = $request->validate(['successful' => 'required|boolean', 'reinstall' => 'sometimes|boolean']);
        $this->server($request, $uuid)->forceFill([
            'installed_at' => $data['successful'] ? now() : null,
            'status' => false,
        ])->save();
        return response()->noContent();
    }

    public function state(Request $request, string $uuid)
    {
        $data = $request->validate(['data.new_state' => 'required|in:offline,starting,running,stopping', 'data.previous_state' => 'sometimes|string']);
        $this->server($request, $uuid)->update(['status' => $data['data']['new_state'] === 'running']);
        return response()->noContent();
    }

    public function reset(Request $request)
    {
        $request->attributes->get('node')->servers()->update(['status' => false]);
        return response()->noContent();
    }

    public function activity(Request $request)
    {
        $data = $request->validate(['data' => 'present|array|max:100']);
        if ($data['data']) {
            Log::channel('single')->info('Wings activity', ['node_id' => $request->attributes->get('node')->id, 'events' => $data['data']]);
            foreach ($data['data'] as $event) {
                $serverUuid = $event['server'] ?? null;
                $eventName = $event['event'] ?? '';
                if ($serverUuid) {
                    if (str_contains($eventName, 'crashed') || str_contains($eventName, 'stop') || str_contains($eventName, 'kill')) {
                        \App\Models\Server::where('uuid', $serverUuid)->update(['status' => 0]);
                    } elseif (str_contains($eventName, 'start') || str_contains($eventName, 'power:start') || str_contains($eventName, 'running')) {
                        \App\Models\Server::where('uuid', $serverUuid)->update(['status' => 1]);
                    }
                }
            }
        }
        return response()->noContent();
    }

    public function sftpAuth(Request $request)
    {
        $rawUsername = (string) $request->input('username', '');
        $password = (string) $request->input('password', '');
        $node = $request->attributes->get('node');

        if (empty($rawUsername) || empty($password)) {
            return response()->json(['error' => 'Missing username or password'], 400);
        }

        // 1. Probar coincidencia directa con el nombre o email
        $user = \App\Models\User::where('email', $rawUsername)
            ->orWhere('name', $rawUsername)
            ->first();
        $serverIdentifier = null;

        // 2. Si no coincide directo, puede venir como "<user>.<server_id>"
        if (!$user) {
            $lastDotPos = strrpos($rawUsername, '.');
            if ($lastDotPos !== false) {
                $userIdentifier = substr($rawUsername, 0, $lastDotPos);
                $serverIdentifier = substr($rawUsername, $lastDotPos + 1);

                $user = \App\Models\User::where('email', $userIdentifier)
                    ->orWhere('name', $userIdentifier)
                    ->first();
            }
        }

        if (!$user || !\Illuminate\Support\Facades\Hash::check($password, $user->password)) {
            return response()->json(['error' => 'Invalid credentials'], 403);
        }

        $serverQuery = $node->servers();
        if ($serverIdentifier) {
            $serverQuery->where(function ($q) use ($serverIdentifier) {
                $q->where('uuid', 'LIKE', "{$serverIdentifier}%")
                  ->orWhere('uuid_short', $serverIdentifier);
            });
        }

        $isAdmin = $user->hasRole('admin') || $user->hasRole('owner') || $user->hasRole('super-admin');

        if (!$isAdmin) {
            $serverQuery->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhereHas('subusers', function ($sq) use ($user) {
                      $sq->where('user_id', $user->id);
                  });
            });
        }

        $server = $serverQuery->first();

        if (!$server) {
            return response()->json(['error' => 'Server not found or access denied'], 403);
        }

        return response()->json([
            'server' => $server->uuid,
            'permissions' => ['*'],
        ]);
    }
}
