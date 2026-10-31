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
        abort_if(strlen($path) > 1024 || preg_match('/[\x00-\x1f\x7f]/', $path) || str_contains($path, '\\'), 422, 'Ruta no válida.');
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
    private function fileEntry($client, Server $server, string $file): array
    {
        $directory = dirname($file) === '.' ? '' : dirname($file);
        $entry = collect($this->entries($client, $server, $directory))->firstWhere('name', basename($file));
        abort_unless($entry, 404, 'Archivo no encontrado.');
        abort_if($entry['symlink'] ?? false, 403, 'No se abren enlaces simbólicos.');
        return $entry;
    }

    private function leaf(string $name): string
    {
        $clean = $this->path($name);
        abort_if($clean === '' || str_contains($clean, '/') || $clean !== $name, 422, 'El nombre no puede incluir carpetas.');
        return $clean;
    }

    public function write(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate(['file' => 'required|string|max:1024', 'content' => 'present|nullable|string|max:1048576', 'create' => 'sometimes|boolean']);
        $file = $this->path($data['file']);
        $body = $data['content'] ?? '';
        abort_if(strlen($body) > 1048576, 413);
        try {
            $client = $wings->forServer($server);
            $directory = dirname($file) === '.' ? '' : dirname($file);
            $entry = collect($this->entries($client, $server, $directory))->firstWhere('name', basename($file));
            if ($data['create'] ?? false) {
                abort_if($entry, 409, 'Ya existe un archivo con ese nombre.');
            } else {
                abort_unless($entry && !($entry['directory'] ?? false), 404);
                abort_if($entry['symlink'] ?? false, 403);
            }
            $client->withBody($body, 'application/octet-stream')->withHeaders(['Content-Length' => (string) strlen($body)])
                ->post('/servers/'.$server->uuid.'/files/write?'.http_build_query(['file' => '/'.$file]))->throw();
            return response()->noContent();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo guardar el archivo en Wings.'], 502);
        }
    }

    public function download(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $request->validate(['file' => 'required|string|max:1024']);
        $file = $this->path($request->query('file'));
        try {
            $client = $wings->forServer($server)->timeout(120);
            $entry = $this->fileEntry($client, $server, $file);
            abort_if($entry['directory'] ?? false, 422, 'Comprime la carpeta antes de descargarla.');
            $stream = $client->withOptions(['stream' => true])->get('/servers/'.$server->uuid.'/files/contents', ['file' => '/'.$file])->throw()->toPsrResponse()->getBody();
            return response()->streamDownload(function () use ($stream) {
                try { while (!$stream->eof()) echo $stream->read(65536); }
                finally { $stream->close(); }
            }, basename($file), ['Content-Type' => 'application/octet-stream', 'Cache-Control' => 'private, no-store']);
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'No se pudo descargar el archivo.'], 502);
        }
    }

    public function upload(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $request->validate(['directory' => 'nullable|string|max:1024', 'upload' => 'required|file|max:102400']);
        $directory = $this->path($request->input('directory', '') ?? '');
        $upload = $request->file('upload');
        $name = $this->leaf($upload->getClientOriginalName());
        try {
            $client = $wings->forServer($server)->timeout(120);
            $entries = $this->entries($client, $server, $directory);
            abort_if(collect($entries)->contains('name', $name), 409, 'Ya existe un archivo con ese nombre; renómbralo antes de subirlo.');
            $stream = fopen($upload->getRealPath(), 'rb');
            try {
                $client->withBody($stream, 'application/octet-stream')->withHeaders(['Content-Length' => (string) $upload->getSize()])
                    ->post('/servers/'.$server->uuid.'/files/write?'.http_build_query(['file' => '/'.ltrim($directory.'/'.$name, '/')]))->throw();
            } finally { if (is_resource($stream)) fclose($stream); }
            return response()->noContent();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'Wings no pudo recibir el archivo.'], 502);
        }
    }

    private function archiveSafe($client, Server $server, string $directory, int $depth = 0): void
    {
        abort_if($depth > 16, 422, 'La carpeta es demasiado profunda para comprimirla.');
        foreach ($this->entries($client, $server, $directory) as $entry) {
            abort_if($this->privateFile($entry['name']) || ($entry['symlink'] ?? false), 403, 'La selección contiene credenciales o enlaces simbólicos.');
            if ($entry['directory'] ?? false) $this->archiveSafe($client, $server, $directory.'/'.$entry['name'], $depth + 1);
        }
    }

    public function action(Request $request, Server $server, WingsClient $wings)
    {
        $this->authorizeServer($request, $server);
        $data = $request->validate([
            'action' => 'required|in:mkdir,rename,move,copy,delete,compress,decompress,chmod',
            'directory' => 'nullable|string|max:1024', 'files' => 'sometimes|array|max:100',
            'files.*' => 'required|string|max:255|distinct', 'name' => 'nullable|string|max:255',
            'destination' => 'nullable|string|max:1024', 'mode' => ['nullable', 'regex:/^[0-7]{3,4}$/'],
        ]);
        $directory = $this->path($data['directory'] ?? '');
        $files = array_map(fn ($name) => $this->leaf($name), $data['files'] ?? []);
        $name = in_array($data['action'], ['mkdir', 'rename', 'compress', 'decompress'], true) && isset($data['name']) ? $this->leaf($data['name']) : '';
        $root = '/'.$directory;
        $prefix = '/servers/'.$server->uuid.'/files/';
        try {
            $client = $wings->forServer($server)->timeout(120);
            $entries = collect($this->entries($client, $server, $directory));
            if ($data['action'] === 'mkdir') {
                abort_if($name === '', 422, 'Introduce el nombre de la carpeta.');
                abort_if($entries->contains('name', $name), 409, 'Ese nombre ya existe.');
                $client->post($prefix.'create-directory', ['path' => $root, 'name' => $name])->throw();
                return response()->noContent();
            }
            abort_if(!$files, 422, 'Selecciona al menos un archivo.');
            foreach ($files as $file) {
                $entry = $entries->firstWhere('name', $file);
                abort_unless($entry, 404);
                abort_if($entry['symlink'] ?? false, 403);
            }
            switch ($data['action']) {
                case 'rename':
                    abort_if(count($files) !== 1 || $name === '', 422);
                    abort_if($entries->contains('name', $name), 409, 'Ese nombre ya existe.');
                    $client->put($prefix.'rename', ['root' => $root, 'files' => [['from' => $files[0], 'to' => $name]]])->throw();
                    break;
                case 'move':
                    $destination = $this->path($data['destination'] ?? '');
                    $targetEntries = collect($this->entries($client, $server, $destination));
                    $moves = [];
                    foreach ($files as $file) {
                        $source = ltrim($directory.'/'.$file, '/');
                        abort_if($destination === $source || str_starts_with($destination, $source.'/'), 422, 'No puedes mover una carpeta dentro de sí misma.');
                        abort_if($targetEntries->contains('name', $file), 409, 'Ya existe un archivo en el destino.');
                        $moves[] = ['from' => $source, 'to' => ltrim($destination.'/'.$file, '/')];
                    }
                    $client->put($prefix.'rename', ['root' => '/', 'files' => $moves])->throw();
                    break;
                case 'copy':
                    foreach ($files as $file) {
                        abort_if($entries->firstWhere('name', $file)['directory'] ?? false, 422, 'Solo se pueden duplicar archivos.');
                        $client->post($prefix.'copy', ['location' => ltrim($directory.'/'.$file, '/')])->throw();
                    }
                    break;
                case 'delete':
                    $client->post($prefix.'delete', ['root' => $root, 'files' => $files])->throw();
                    break;
                case 'chmod':
                    abort_unless(isset($data['mode']), 422);
                    $client->post($prefix.'chmod', ['root' => $root, 'files' => array_map(fn ($file) => ['file' => $file, 'mode' => $data['mode']], $files)])->throw();
                    break;
                case 'compress':
                    foreach ($files as $file) if ($entries->firstWhere('name', $file)['directory'] ?? false) $this->archiveSafe($client, $server, ltrim($directory.'/'.$file, '/'));
                    $client->post($prefix.'compress', ['root' => $root, 'files' => $files, 'name' => $name])->throw();
                    break;
                case 'decompress':
                    abort_if(count($files) !== 1 || $name === '', 422, 'Indica la carpeta de extracción.');
                    abort_if($entries->contains('name', $name), 409, 'La carpeta de extracción ya existe.');
                    $client->post($prefix.'create-directory', ['path' => $root, 'name' => $name])->throw();
                    $target = ltrim($directory.'/'.$name, '/');
                    // Copy the archive into a fresh directory so extraction cannot replace running server files.
                    $source = $wings->forServer($server)->withOptions(['stream' => true])->get($prefix.'contents', ['file' => $root.'/'.$files[0]])->throw()->toPsrResponse()->getBody();
                    try {
                        $wings->forServer($server)->withBody($resource = $source->detach(), 'application/octet-stream')
                            ->withHeaders(['Content-Length' => (string) $entries->firstWhere('name', $files[0])['size']])
                            ->post($prefix.'write?'.http_build_query(['file' => '/'.$target.'/'.$files[0]]))->throw();
                    } finally { if (isset($resource) && is_resource($resource)) fclose($resource); $source->close(); }
                    $client->post($prefix.'decompress', ['root' => '/'.$target, 'file' => $files[0]])->throw();
                    break;
            }
            return response()->noContent();
        } catch (ConnectionException|RequestException $exception) {
            return response()->json(['message' => 'Wings no pudo completar la operación. Comprueba espacio, permisos y que el archivo no esté en uso.'], 502);
        }
    }

}
