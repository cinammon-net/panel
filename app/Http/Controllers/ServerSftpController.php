<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Models\SftpCredential;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Credenciales SFTP generadas por el panel: una por persona y servidor, con contraseña
 * aleatoria que solo se muestra al crearla y que se guarda cifrada (bcrypt).
 */
class ServerSftpController extends Controller
{
    private function authorizeServer(Request $request, Server $server): void
    {
        $user = $request->user();
        abort_unless(
            $user->id === $server->owner_id ||
            $user->hasAnyRole(['Owner', 'Admin']) ||
            $server->subusers()->where('user_id', $user->id)->exists(),
            403,
            'No tienes permiso para acceder a este servidor.'
        );
    }

    public function show(Request $request, Server $server): Response
    {
        $this->authorizeServer($request, $server);
        $server->loadMissing(['node', 'allocation']);
        $credential = $server->sftpCredentials()->where('user_id', $request->user()->id)->first();

        return Inertia::render('Servers/Sftp', [
            'server' => ['id' => $server->id, 'name' => $server->name, 'uuid' => $server->uuid, 'owner_id' => $server->owner_id],
            'sftp' => [
                // El SFTP escucha en el nodo; se usa su IP porque el dominio del nodo pasa por Cloudflare, que no admite SFTP.
                'host' => $server->node?->daemon_sftp_alias ?: ($server->allocation?->ip ?: $server->node?->fqdn),
                'port' => (int) ($server->node?->daemon_sftp ?: 2022),
                'username' => $credential?->username ?? SftpCredential::usernameFor($request->user(), $server),
                'has_credentials' => $credential !== null,
                'rotated_at' => $credential?->rotated_at?->toIso8601String(),
                'last_used_at' => $credential?->last_used_at?->toIso8601String(),
                'last_used_ip' => $credential?->last_used_ip,
            ],
            // Se muestra una sola vez, justo después de generarla.
            'generated_password' => $request->session()->pull('sftp_password'),
        ]);
    }

    public function rotate(Request $request, Server $server): RedirectResponse
    {
        $this->authorizeServer($request, $server);
        $password = SftpCredential::generatePassword();

        SftpCredential::updateOrCreate(
            ['server_id' => $server->id, 'user_id' => $request->user()->id],
            [
                'username' => SftpCredential::usernameFor($request->user(), $server),
                'password_hash' => Hash::make($password),
                'rotated_at' => now(),
                'last_used_at' => null,
                'last_used_ip' => null,
            ]
        );

        return redirect()->route('servers.sftp', $server)->with('sftp_password', $password);
    }

    public function revoke(Request $request, Server $server): RedirectResponse
    {
        $this->authorizeServer($request, $server);
        $server->sftpCredentials()->where('user_id', $request->user()->id)->delete();

        return redirect()->route('servers.sftp', $server)->with('success', 'Acceso SFTP revocado.');
    }
}
