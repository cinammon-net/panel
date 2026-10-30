<?php

use App\Models\Node;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Http;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$node = Node::where('name', 'Local Linux')->firstOrFail();
$system = Http::withToken($node->daemon_token)->timeout(5)->get('http://127.0.0.1:8080/api/system')->throw()->json();
$servers = Http::withToken($node->daemon_token_id.'.'.$node->daemon_token)
    ->timeout(5)->get('http://127.0.0.1:8000/api/remote/servers')->throw()->json();
if (!is_string($system['version'] ?? null) || ($servers['data'] ?? null) !== [] || !$node->online) {
    throw new RuntimeException('Local node verification failed.');
}
echo json_encode([
    'node' => $node->name,
    'online' => (bool) $node->online,
    'wings_version' => $system['version'],
    'architecture' => $system['architecture'],
    'cpu_count' => $system['cpu_count'],
    'assigned_servers' => count($servers['data']),
], JSON_PRETTY_PRINT).PHP_EOL;
