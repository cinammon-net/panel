<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Services\Daemon\WingsClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ServerFilesController extends Controller
{
    private function authorizeServer(Request $request, Server $server): void
    {
        abort_unless($request->user()->id === $server->owner_id || $request->user()->hasAnyRole(['Owner', 'Admin']), 403);
    }

    private function path(string $path): string
    {
        abort_if(strlen($path) > 1024 || str_contains($path, "\0") || str_contains($path, '\\'), 422, 'Ruta no válida.');
        $parts = array_values(array_filter(explode('/', $path), fn ($part) => $part !== ''));
        foreach ($parts as $part) {
            abort_if(in_array($part, ['.', '..'], true), 422, 'Ruta no válida.');
            abort_if($this->privateFile($part), 403, 'Este archivo contiene configuración privada.');
        }
        return implode('/', $parts);
    }

    private function privateFile(string $name): bool
    {
        $name = strtolower($name);
        return $name === 'bot-config.json' || $name === '.env' || str_starts_with($name, '.env.') || $name === '.git';
    }

    private function entries($client, Server $server, string $directory): array
    {
        $current = '';
        // Reject symlinks in every ancestor, including direct requests to nested paths.
        foreach ($directory === '' ? [] : explode('/', $directory) as $part) {
            $entries = $client->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/'.$current])->throw()->json();
            $entry = collect($entries)->firstWhere('name', $part);
            abort_unless($entry && ($entry['directory'] ?? false), 404, 'Carpeta no encontrada.');
            abort_if($entry['symlink'] ?? false, 403, 'No se abren enlaces simbólicos.');
            $current = ltrim($current.'/'.$part, '/');
        }
        return $client->get('/servers/'.$server->uuid.'/files/list-directory', ['directory' => '/'.$directory])->throw()->json() ?? [];
    }

    public function page(Request $request, Server $server)
    {
        $this->authorizeServer($request, $server);
        return Inertia::render('Servers/Files', ['server' => ['id' => $server->id, 'name' => $server->name]]);
    }

    public function listing(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $request->validate(['directory' => 'nullable|string|max:1024']);
        $directory = $this->path($request->query('directory', '') ?? '');
        try {
            $entries = $this->entries($wings->forServer($server)->timeout(10), $server, $directory);
            return response()->json(['directory' => $directory, 'data' => array_map(function ($entry) {
                $entry['private'] = $this->privateFile($entry['name']);
                return $entry;
            }, $entries)]);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo abrir la carpeta del nodo. Comprueba que Wings está encendido.'], 502);
        }
    }

    public function contents(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $request->validate(['file' => 'required|string|max:1024']);
        $file = $this->path($request->query('file'));
        try {
            $client = $wings->forServer($server)->timeout(10);
            $directory = dirname($file) === '.' ? '' : dirname($file);
            $entry = collect($this->entries($client, $server, $directory))->firstWhere('name', basename($file));
            abort_unless($entry && !($entry['directory'] ?? false), 404, 'Archivo no encontrado.');
            abort_if($entry['symlink'] ?? false, 403, 'No se abren enlaces simbólicos.');
            abort_if(($entry['size'] ?? 0) > 1024 * 1024, 413, 'La vista previa admite archivos de hasta 1 MB.');
            $response = $client->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/'.$file])->throw();
            $body = $response->body();
            abort_if(strlen($body) > 1024 * 1024 || str_contains($body, "\0") || !mb_check_encoding($body, 'UTF-8'), 415, 'Este archivo binario no se puede previsualizar como texto.');
            return response()->json(['file' => $file, 'content' => $body]);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo leer el archivo del nodo.'], 502);
        }
    }
}
