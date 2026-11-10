<?php

namespace App\Http\Middleware;

use App\Models\Server;
use App\Support\ServerActivity;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Registra en la Actividad del servidor todo lo que se hace sobre él desde el panel:
 * cualquier petición que cambie algo (POST, PUT, PATCH, DELETE) en /servers/{server}/...
 * y las descargas de archivos. Solo se apunta si salió bien y si el controlador
 * no la registró ya con su propia descripción.
 */
class LogServerActivity
{
    /** Rutas de consulta frecuente que no son acciones (sondeos, listados...). */
    private const IGNORE = [
        'servers/{server}/files/contents' => true,
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        try {
            $route = $request->route();
            $server = $route?->parameter('server');
            $uri = $route?->uri() ?? '';
            $method = $request->method();
            $download = $method === 'GET' && $uri === 'servers/{server}/files/download';

            if (! $route || ! $request->user() || $response->getStatusCode() >= 400
                || ($method === 'GET' && ! $download) || isset(self::IGNORE[$uri])
                || $request->attributes->get('server_activity_logged')
                || ($method === 'DELETE' && $uri === 'servers/{server}')) {
                return $response;
            }
            if (! $server instanceof Server) {
                $server = is_numeric($server) ? Server::find($server) : null;
            }
            if (! $server) {
                return $response;
            }

            [$action, $description] = $this->describe($request, $uri, $method);
            ServerActivity::log($server, $request->user(), $action, $description, $request->ip());
        } catch (\Throwable $e) {
            report($e);
        }

        return $response;
    }

    private function describe(Request $request, string $uri, string $method): array
    {
        $in = fn (string $key) => is_scalar($request->input($key)) ? trim((string) $request->input($key)) : '';
        $path = fn (string $key) => '/'.ltrim($in($key), '/');
        $tail = substr($uri, strlen('servers/{server}/'));

        return match (true) {
            $uri === 'servers/{server}/power' => match ($in('action')) {
                'start' => ['server:power.start', 'Encendió el servidor'],
                'stop' => ['server:power.stop', 'Apagó el servidor'],
                'restart' => ['server:power.restart', 'Reinició el servidor'],
                'kill' => ['server:power.kill', 'Forzó el apagado del servidor'],
                default => ['server:power', 'Cambió el estado del servidor'],
            },
            $uri === 'servers/{server}/command' => ['server:console.command', 'Ejecutó en la consola: '.$in('command')],
            $uri === 'servers/{server}/files/write' => ['server:files.write', ($request->boolean('create') ? 'Creó el archivo ' : 'Editó el archivo ').$path('file')],
            $uri === 'servers/{server}/files/upload' => ['server:files.upload', 'Subió '.($request->file('upload')?->getClientOriginalName() ?? 'un archivo').' a '.$path('directory')],
            $uri === 'servers/{server}/files/download' => ['server:files.download', 'Descargó '.$path('file')],
            $uri === 'servers/{server}/files/action' => $this->fileAction($request, $path('directory')),
            $uri === 'servers/{server}/discord' => ['server:discord', 'Configuró el bot de Discord'],
            $uri === 'servers/{server}/eula' => ['server:eula', 'Aceptó la EULA de Minecraft'],
            str_starts_with($tail, 'game/icon') => ['server:game.icon', $method === 'DELETE' ? 'Quitó el icono del servidor' : 'Cambió el icono del servidor'],
            str_starts_with($tail, 'game/schedule') => ['server:schedule', 'Cambió las tareas programadas'],
            str_starts_with($tail, 'game/settings') => ['server:game.settings', 'Cambió los ajustes del juego'],
            str_starts_with($tail, 'databases') => match (true) {
                str_ends_with($uri, '/rotate') => ['server:database.rotate', 'Cambió la contraseña de una base de datos'],
                $method === 'DELETE' => ['server:database.delete', 'Borró una base de datos'],
                default => ['server:database.create', 'Creó la base de datos '.$in('database')],
            },
            str_starts_with($tail, 'network') => match (true) {
                str_ends_with($uri, '/primary') => ['server:network.primary', 'Cambió el puerto principal'],
                $method === 'DELETE' => ['server:network.delete', 'Quitó un puerto'],
                default => ['server:network.assign', 'Añadió un puerto'],
            },
            str_starts_with($tail, 'backups') => match (true) {
                str_ends_with($uri, '/lock') => ['server:backup.lock', 'Bloqueó o desbloqueó una copia de seguridad'],
                str_ends_with($uri, '/restore') => ['server:backup.restore', 'Restauró una copia de seguridad'],
                $method === 'DELETE' => ['server:backup.delete', 'Borró una copia de seguridad'],
                default => ['server:backup.create', 'Creó una copia de seguridad'.($in('name') ? ' ('.$in('name').')' : '')],
            },
            str_starts_with($tail, 'webhooks') => match (true) {
                str_ends_with($uri, '/test') => ['server:webhook.test', 'Probó un webhook'],
                $method === 'DELETE' => ['server:webhook.delete', 'Borró un webhook'],
                default => ['server:webhook.create', 'Creó un webhook'],
            },
            str_starts_with($tail, 'subdomains') => $method === 'DELETE'
                ? ['server:subdomain.delete', 'Borró un subdominio']
                : ['server:subdomain.create', 'Creó el subdominio '.$in('subdomain')],
            str_starts_with($tail, 'startup/variables') => ['server:startup.variables', 'Cambió las variables de inicio'],
            str_starts_with($tail, 'startup/image') => ['server:startup.image', 'Cambió la imagen de Docker'.($in('image') ? ' a '.$in('image') : '')],
            str_starts_with($tail, 'startup') => ['server:startup', 'Cambió la configuración de inicio'],
            str_starts_with($tail, 'sftp/rotate') => ['server:sftp.rotate', 'Generó una nueva contraseña SFTP'],
            str_starts_with($tail, 'sftp') => ['server:sftp.revoke', 'Revocó el acceso SFTP'],
            str_starts_with($tail, 'banner') => ['server:banner', 'Cambió el banner del servidor'],
            str_starts_with($tail, 'subusers') => match ($method) {
                'DELETE' => ['server:subuser.delete', 'Quitó a un usuario del servidor'],
                'PUT', 'PATCH' => ['server:subuser.update', 'Cambió los permisos de un usuario'],
                default => ['server:subuser.create', 'Invitó a '.($in('email') ?: 'un usuario').' al servidor'],
            },
            str_starts_with($tail, 'transfer-owner') => ['server:owner.transfer', 'Transfirió la propiedad del servidor'],
            str_starts_with($tail, 'mounts') => ['server:mounts', 'Cambió los puntos de montaje'],
            $uri === 'servers/{server}' => ['server:settings', 'Cambió la configuración del servidor'],
            default => ['server:'.str_replace(['{', '}', '/'], ['', '', '.'], $tail ?: 'update'), $this->humanize($method, $tail)],
        };
    }

    private function fileAction(Request $request, string $directory): array
    {
        $files = array_values(array_filter((array) $request->input('files', []), 'is_string'));
        $list = $files ? implode(', ', array_slice($files, 0, 5)).(count($files) > 5 ? ' y '.(count($files) - 5).' más' : '') : '';
        $dir = rtrim($directory, '/').'/';
        $name = is_string($request->input('name')) ? $request->input('name') : '';

        return match ((string) $request->input('action')) {
            'mkdir' => ['server:files.mkdir', 'Creó la carpeta '.$dir.$name],
            'rename' => ['server:files.rename', 'Renombró '.$dir.($files[0] ?? '').' a '.$name],
            'move' => ['server:files.move', 'Movió '.$list.' de '.$dir.' a /'.ltrim((string) $request->input('destination'), '/')],
            'copy' => ['server:files.copy', 'Copió '.$list.' en '.$dir],
            'delete' => ['server:files.delete', 'Borró '.$list.' en '.$dir],
            'chmod' => ['server:files.chmod', 'Cambió los permisos de '.$list.' a '.$request->input('mode')],
            'compress' => ['server:files.compress', 'Comprimió '.$list.' en '.$dir],
            'decompress' => ['server:files.decompress', 'Descomprimió '.$dir.($files[0] ?? $name)],
            default => ['server:files', 'Modificó archivos en '.$dir],
        };
    }

    private function humanize(string $method, string $tail): string
    {
        $verb = ['POST' => 'Ejecutó', 'PUT' => 'Actualizó', 'PATCH' => 'Actualizó', 'DELETE' => 'Borró'][$method] ?? 'Usó';
        $what = trim(preg_replace('/\{[^}]+\}/', '', str_replace(['/', '-', '_'], ' ', $tail)));

        return $verb.' '.($what !== '' ? $what : 'el servidor');
    }
}
