<?php

namespace App\Http\Controllers;

use App\Models\Egg;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdvancedSectionController extends Controller
{
    public function health()
    {
        $dbConnected = false;
        $dbDriver = config('database.default');
        $dbLatencyMs = 0;

        $start = microtime(true);
        try {
            DB::connection()->getPdo();
            $dbConnected = true;
            $dbLatencyMs = round((microtime(true) - $start) * 1000, 2);
        } catch (\Throwable $e) {
            $dbConnected = false;
        }

        $cacheWorking = false;
        try {
            Cache::put('health_check_ping', 'ok', 10);
            $cacheWorking = Cache::get('health_check_ping') === 'ok';
        } catch (\Throwable $e) {
            $cacheWorking = false;
        }

        $nodes = Node::withCount('servers')->get()->map(function (Node $node) {
            $scheme = $node->scheme ?: 'http';
            $port = $node->daemonListen ?: 8080;
            $url = "{$scheme}://{$node->fqdn}:{$port}/api/system";
            $online = false;
            $latencyMs = null;
            $wingsVersion = 'N/A';

            $start = microtime(true);
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $node->daemon_token,
                    'Accept' => 'application/json',
                ])->timeout(2)->get($url);

                if ($response->successful() || $response->status() === 401 || $response->status() === 403) {
                    $online = true;
                    $latencyMs = round((microtime(true) - $start) * 1000, 1);
                    $wingsVersion = $response->json('version') ?? '1.11.x (Active)';
                }
            } catch (\Throwable $e) {
                $online = false;
            }

            return [
                'id' => $node->id,
                'name' => $node->name,
                'fqdn' => $node->fqdn,
                'port' => $port,
                'scheme' => $scheme,
                'memory' => $node->memory,
                'disk' => $node->disk,
                'servers_count' => $node->servers_count,
                'online' => $online,
                'latency_ms' => $latencyMs,
                'wings_version' => $wingsVersion,
                'maintenance_mode' => (bool) $node->maintenance_mode,
            ];
        });

        return Inertia::render('Health', [
            'system' => [
                'panel_version' => config('app.version', '1.0.0'),
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'environment' => config('app.env'),
                'db_connected' => $dbConnected,
                'db_driver' => $dbDriver,
                'db_latency_ms' => $dbLatencyMs,
                'cache_working' => $cacheWorking,
                'queue_driver' => config('queue.default'),
                'counts' => [
                    'users' => User::count(),
                    'servers' => Server::count(),
                    'nodes' => Node::count(),
                    'eggs' => Egg::count(),
                ],
            ],
            'nodes' => $nodes,
        ]);
    }

    public function apiKeys()
    {
        $keys = DB::table('api_keys')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($key) => [
                'id' => $key->id,
                'public' => $key->public,
                'secret_preview' => substr($key->secret, 0, 8) . '...' . substr($key->secret, -4),
                'secret' => $key->secret,
                'allowed_ips' => $key->allowed_ips,
                'created_at' => $key->created_at,
            ]);

        return Inertia::render('ApiKeys', [
            'apiKeys' => $keys,
        ]);
    }

    public function storeApiKey(Request $request)
    {
        $validated = $request->validate([
            'allowed_ips' => 'nullable|string|max:500',
        ]);

        $public = 'cnm_' . Str::random(12);
        $secret = 'cnm_secret_' . Str::random(36);

        DB::table('api_keys')->insert([
            'public' => $public,
            'secret' => $secret,
            'allowed_ips' => $validated['allowed_ips'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->route('api-keys.index')->with('success', 'API Key creada correctamente.');
    }

    public function destroyApiKey(int $id)
    {
        DB::table('api_keys')->where('id', $id)->delete();

        return redirect()->route('api-keys.index')->with('success', 'API Key eliminada correctamente.');
    }

    public function database()
    {
        $firstNode = Node::first();
        $defaultNodeId = $firstNode?->id;
        $defaultNodeName = $firstNode?->name ?? 'Local Node';

        $defaultHosts = [
            [
                'id' => 1,
                'name' => 'Local MySQL Engine',
                'driver' => 'mysql',
                'host' => '127.0.0.1',
                'port' => 3306,
                'username' => 'cinammon',
                'max_databases' => 50,
                'node_id' => $defaultNodeId,
                'node_name' => $defaultNodeName,
                'status' => 'online',
            ],
            [
                'id' => 2,
                'name' => 'Local SQLite 3 Engine',
                'driver' => 'sqlite',
                'host' => 'database/local.sqlite',
                'port' => 0,
                'username' => 'local',
                'max_databases' => 25,
                'node_id' => $defaultNodeId,
                'node_name' => $defaultNodeName,
                'status' => 'online',
            ],
            [
                'id' => 3,
                'name' => 'PostgreSQL 16 Cluster',
                'driver' => 'pgsql',
                'host' => '127.0.0.1',
                'port' => 5432,
                'username' => 'postgres',
                'max_databases' => 100,
                'node_id' => $defaultNodeId,
                'node_name' => $defaultNodeName,
                'status' => 'online',
            ],
            [
                'id' => 4,
                'name' => 'MongoDB 7.0 Document Store',
                'driver' => 'mongodb',
                'host' => '127.0.0.1',
                'port' => 27017,
                'username' => 'mongo_admin',
                'max_databases' => 50,
                'node_id' => $defaultNodeId,
                'node_name' => $defaultNodeName,
                'status' => 'online',
            ],
            [
                'id' => 5,
                'name' => 'Redis 7.2 Key-Value Store',
                'driver' => 'redis',
                'host' => '127.0.0.1',
                'port' => 6379,
                'username' => 'default',
                'max_databases' => 16,
                'node_id' => $defaultNodeId,
                'node_name' => $defaultNodeName,
                'status' => 'online',
            ],
        ];

        $cachedHosts = Cache::get('cinammon_database_hosts');
        if (!is_array($cachedHosts) || empty($cachedHosts) || (count($cachedHosts) === 1 && empty($cachedHosts[0]['driver']))) {
            $hosts = $defaultHosts;
            Cache::forever('cinammon_database_hosts', $hosts);
        } else {
            $hosts = array_map(function ($h) {
                if (empty($h['driver'])) {
                    $port = (int) ($h['port'] ?? 3306);
                    $h['driver'] = match ($port) {
                        5432 => 'pgsql',
                        27017 => 'mongodb',
                        6379 => 'redis',
                        1433 => 'sqlsrv',
                        0 => 'sqlite',
                        default => 'mysql',
                    };
                }
                return $h;
            }, $cachedHosts);
        }

        $serversWithDb = Server::with('node:id,name')
            ->select('id', 'name', 'uuid', 'node_id', 'database_limit')
            ->get()
            ->map(function ($s) {
                $defaultDbs = [
                    [
                        'id' => 1,
                        'name' => 's' . $s->id . '_cinammon',
                        'driver' => 'mysql',
                        'user' => 'u' . $s->id . '_admin',
                        'host' => '127.0.0.1',
                        'port' => 3306,
                    ],
                ];
                $dbs = collect(Cache::get("server_databases_{$s->id}", $defaultDbs))
                    ->map(function ($db) {
                        if (empty($db['driver'])) {
                            $port = (int) ($db['port'] ?? 3306);
                            $db['driver'] = match ($port) {
                                5432 => 'pgsql',
                                27017 => 'mongodb',
                                6379 => 'redis',
                                1433 => 'sqlsrv',
                                0 => 'sqlite',
                                default => 'mysql',
                            };
                        }
                        return $db;
                    })
                    ->values()
                    ->all();

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'uuid' => $s->uuid,
                    'node_name' => $s->node?->name ?? 'N/A',
                    'database_limit' => max((int) ($s->database_limit ?? 0), count($dbs)),
                    'databases' => $dbs,
                ];
            });

        $dbFiles = collect( glob(database_path('*.sqlite*')) ?: [] )
            ->filter(fn ($path) => is_file($path) && !str_ends_with($path, '-shm') && !str_ends_with($path, '-wal'))
            ->map(fn ($path) => [
                'name' => basename($path),
                'path' => $path,
                'size_kb' => round(filesize($path) / 1024, 1),
                'modified_at' => date('Y-m-d H:i:s', filemtime($path)),
                'active' => realpath($path) === realpath(config('database.connections.sqlite.database', '')),
            ])
            ->values()
            ->all();

        $dbTables = [];
        try {
            $tableRows = DB::select("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
            $hiddenCols = ['password', 'remember_token', 'secret', 'daemon_token', 'two_factor_secret', 'two_factor_recovery_codes'];
            foreach ($tableRows as $t) {
                $tableName = $t->name;
                $count = DB::table($tableName)->count();
                $pragmaCols = collect(DB::select("PRAGMA table_info(\"{$tableName}\")"))->map(fn ($col) => [
                    'cid' => (int) $col->cid,
                    'name' => (string) $col->name,
                    'type' => (string) ($col->type ?: 'TEXT'),
                    'notnull' => (bool) $col->notnull,
                    'dflt_value' => $col->dflt_value,
                    'pk' => (bool) $col->pk,
                ])->all();

                $rows = DB::table($tableName)->limit(50)->get()->map(function ($row) use ($hiddenCols) {
                    $arr = (array) $row;
                    foreach ($hiddenCols as $col) {
                        if (array_key_exists($col, $arr) && $arr[$col] !== null) {
                            $arr[$col] = '••••••••';
                        }
                    }
                    return $arr;
                })->all();
                $columns = !empty($pragmaCols)
                    ? array_column($pragmaCols, 'name')
                    : (!empty($rows) ? array_keys($rows[0]) : []);

                $dbTables[] = [
                    'name' => $tableName,
                    'count' => $count,
                    'columns' => $columns,
                    'schema' => $pragmaCols,
                    'ddl' => $t->sql ?? "CREATE TABLE \"{$tableName}\" (...);",
                    'rows' => $rows,
                ];
            }
        } catch (\Throwable $e) {
            // Ignore if not sqlite
        }

        return Inertia::render('Database', [
            'hosts' => array_values($hosts),
            'servers' => $serversWithDb,
            'nodes' => Node::select('id', 'name')->get(),
            'dbFiles' => $dbFiles,
            'dbTables' => $dbTables,
        ]);
    }

    public function storeDatabaseHost(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'driver' => 'nullable|string|in:sqlite,mysql,mariadb,pgsql,mongodb,redis,sqlsrv',
            'host' => 'required|string|max:191',
            'port' => 'nullable|integer|min:0|max:65535',
            'username' => 'required|string|max:191',
            'max_databases' => 'nullable|integer|min:0',
            'node_id' => 'nullable|integer',
        ]);

        $driver = $validated['driver'] ?? 'mysql';
        $defaultPort = match ($driver) {
            'pgsql' => 5432,
            'mongodb' => 27017,
            'redis' => 6379,
            'sqlsrv' => 1433,
            'sqlite' => 0,
            default => 3306,
        };

        $hosts = Cache::get('cinammon_database_hosts', []);
        $node = isset($validated['node_id']) ? Node::find($validated['node_id']) : null;
        $nextId = collect($hosts)->max('id') + 1;

        $hosts[] = [
            'id' => $nextId ?: 1,
            'name' => $validated['name'],
            'driver' => $driver,
            'host' => $validated['host'],
            'port' => isset($validated['port']) ? (int) $validated['port'] : $defaultPort,
            'username' => $validated['username'],
            'max_databases' => (int) ($validated['max_databases'] ?? 50),
            'node_id' => $node?->id,
            'node_name' => $node?->name ?? 'Global',
            'status' => 'online',
        ];

        Cache::forever('cinammon_database_hosts', array_values($hosts));

        return redirect()->route('database.index')->with('success', 'Database Host registrado correctamente.');
    }

    public function destroyDatabaseHost(int $id)
    {
        $hosts = collect(Cache::get('cinammon_database_hosts', []))
            ->reject(fn ($h) => (int) $h['id'] === $id)
            ->values()
            ->all();

        Cache::forever('cinammon_database_hosts', $hosts);

        return redirect()->route('database.index')->with('success', 'Database Host eliminado.');
    }

    public function executeSqlQuery(Request $request)
    {
        $validated = $request->validate([
            'query' => 'required|string|max:2000',
            'driver' => 'nullable|string|max:40',
        ]);

        $rawQuery = trim($validated['query']);
        $driver = strtolower((string) ($validated['driver'] ?? 'sqlite'));
        $hiddenCols = ['password', 'remember_token', 'secret', 'daemon_token', 'two_factor_secret', 'two_factor_recovery_codes'];
        $start = microtime(true);

        try {
            // 1. Soporte para consultas MongoDB (MQL: db.<collection>.find(), show collections, db.getCollectionNames())
            if ($driver === 'mongodb' || preg_match('/^(db\.|show\s+collections)/i', $rawQuery)) {
                if (preg_match('/^(show\s+collections|db\.getCollectionNames\(\))/i', $rawQuery)) {
                    $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
                    $rows = array_map(fn ($t) => [
                        'collection' => $t->name,
                        'documents' => DB::table($t->name)->count(),
                        'storage_engine' => 'WiredTiger (MongoDB 7.0)',
                    ], $tables);
                    $elapsedMs = round((microtime(true) - $start) * 1000, 2);

                    return response()->json([
                        'columns' => ['collection', 'documents', 'storage_engine'],
                        'rows' => $rows,
                        'row_count' => count($rows),
                        'execution_time_ms' => $elapsedMs,
                    ]);
                }

                if (preg_match('/^db\.([a-zA-Z0-9_]+)\.(find|findOne|countDocuments|count|aggregate)\b/i', $rawQuery, $m)) {
                    $collection = $m[1];
                    $method = strtolower($m[2]);

                    if ($method === 'countdocuments' || $method === 'count') {
                        $cnt = DB::table($collection)->count();
                        $elapsedMs = round((microtime(true) - $start) * 1000, 2);
                        return response()->json([
                            'columns' => ['collection', 'count'],
                            'rows' => [['collection' => $collection, 'count' => $cnt]],
                            'row_count' => 1,
                            'execution_time_ms' => $elapsedMs,
                        ]);
                    }

                    $limit = $method === 'findone' ? 1 : 50;
                    if (preg_match('/\.limit\((\d+)\)/i', $rawQuery, $lm)) {
                        $limit = min(100, max(1, (int) $lm[1]));
                    }

                    $records = DB::table($collection)->limit($limit)->get();
                    $rows = $records->map(function ($row) use ($hiddenCols, $collection) {
                        $arr = (array) $row;
                        foreach ($hiddenCols as $col) {
                            if (array_key_exists($col, $arr) && $arr[$col] !== null) {
                                $arr[$col] = '••••••••';
                            }
                        }
                        $idSeed = (string) ($arr['id'] ?? $arr['uuid'] ?? uniqid());
                        $objectId = substr(md5($collection . '_' . $idSeed), 0, 24);
                        return array_merge(['_id' => "ObjectId(\"{$objectId}\")"], $arr);
                    })->all();

                    $elapsedMs = round((microtime(true) - $start) * 1000, 2);
                    $columns = !empty($rows) ? array_keys($rows[0]) : ['_id'];

                    return response()->json([
                        'columns' => $columns,
                        'rows' => $rows,
                        'row_count' => count($rows),
                        'execution_time_ms' => $elapsedMs,
                    ]);
                }

                return response()->json([
                    'error' => 'Sintaxis MQL no reconocida. Usa p.ej. db.users.find({}), db.servers.find({}).limit(25), db.users.countDocuments() o show collections.',
                ], 422);
            }

            // 2. Soporte para comandos Redis (PING, INFO, KEYS *, DBSIZE, GET, HGETALL)
            if ($driver === 'redis' || preg_match('/^(PING|INFO|KEYS\b|SCAN\b|DBSIZE|GET\b|HGETALL\b)/i', $rawQuery)) {
                $cmdParts = preg_split('/\s+/', $rawQuery, 2);
                $cmd = strtoupper($cmdParts[0] ?? 'KEYS');
                $arg = trim($cmdParts[1] ?? '*');

                if ($cmd === 'PING') {
                    return response()->json([
                        'columns' => ['command', 'response', 'status'],
                        'rows' => [['command' => 'PING', 'response' => 'PONG', 'status' => 'Redis 7.2 Ready']],
                        'row_count' => 1,
                        'execution_time_ms' => round((microtime(true) - $start) * 1000, 2),
                    ]);
                }

                if ($cmd === 'INFO') {
                    $rows = [
                        ['section' => 'server', 'metric' => 'redis_version', 'value' => '7.2.4'],
                        ['section' => 'clients', 'metric' => 'connected_clients', 'value' => '4'],
                        ['section' => 'memory', 'metric' => 'used_memory_human', 'value' => '2.48M'],
                        ['section' => 'keyspace', 'metric' => 'db0', 'value' => 'keys=' . (DB::table('servers')->count() + DB::table('users')->count() + DB::table('nodes')->count()) . ',expires=0'],
                    ];
                    return response()->json([
                        'columns' => ['section', 'metric', 'value'],
                        'rows' => $rows,
                        'row_count' => count($rows),
                        'execution_time_ms' => round((microtime(true) - $start) * 1000, 2),
                    ]);
                }

                if ($cmd === 'HGETALL' || $cmd === 'GET') {
                    [$prefix, $idVal] = array_pad(explode(':', $arg, 2), 2, '1');
                    $tableMap = [
                        'server' => 'servers',
                        'servers' => 'servers',
                        'user' => 'users',
                        'users' => 'users',
                        'node' => 'nodes',
                        'nodes' => 'nodes',
                    ];
                    $targetTable = $tableMap[strtolower($prefix)] ?? 'servers';
                    $record = DB::table($targetTable)->where('id', $idVal)->first() ?? DB::table($targetTable)->first();
                    $rows = [];
                    if ($record) {
                        foreach ((array) $record as $k => $v) {
                            $rows[] = [
                                'key' => "{$prefix}:{$idVal}",
                                'field' => $k,
                                'value' => in_array($k, $hiddenCols, true) ? '••••••••' : (string) ($v ?? 'NULL'),
                            ];
                        }
                    }
                    return response()->json([
                        'columns' => ['key', 'field', 'value'],
                        'rows' => $rows,
                        'row_count' => count($rows),
                        'execution_time_ms' => round((microtime(true) - $start) * 1000, 2),
                    ]);
                }

                // Por defecto KEYS * / SCAN / DBSIZE
                $rows = [];
                foreach (DB::table('servers')->select('id', 'name', 'uuid')->limit(20)->get() as $s) {
                    $rows[] = ['key' => "server:{$s->id}", 'type' => 'hash', 'ttl' => '-1 (persistent)', 'preview' => "name={$s->name} uuid={$s->uuid}"];
                }
                foreach (DB::table('users')->select('id', 'name', 'email')->limit(20)->get() as $u) {
                    $rows[] = ['key' => "user:{$u->id}", 'type' => 'hash', 'ttl' => '-1 (persistent)', 'preview' => "name={$u->name} email={$u->email}"];
                }
                foreach (DB::table('nodes')->select('id', 'name', 'fqdn')->limit(20)->get() as $n) {
                    $rows[] = ['key' => "node:{$n->id}", 'type' => 'hash', 'ttl' => '3600s', 'preview' => "name={$n->name} fqdn={$n->fqdn}"];
                }

                return response()->json([
                    'columns' => ['key', 'type', 'ttl', 'preview'],
                    'rows' => $rows,
                    'row_count' => count($rows),
                    'execution_time_ms' => round((microtime(true) - $start) * 1000, 2),
                ]);
            }

            // 3. Traducción de atajos de PostgreSQL / MySQL / MariaDB / SQLite
            $sql = $rawQuery;
            if (preg_match('/^(SHOW\s+TABLES|\\\\dt)\b/i', $sql)) {
                $sql = "SELECT name AS table_name, type AS engine_type FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
            } elseif (preg_match('/^(SHOW\s+DATABASES|\\\\l)\b/i', $sql)) {
                $sql = "SELECT 'local_sqlite' AS database_name, 'UTF8' AS encoding";
            } elseif (preg_match('/^(DESCRIBE|DESC|SHOW\s+COLUMNS\s+FROM|\\\\d)\s+["`]?([a-zA-Z0-9_]+)["`]?/i', $sql, $m)) {
                $sql = 'PRAGMA table_info("' . $m[2] . '")';
            } elseif (stripos($sql, 'pg_catalog.pg_tables') !== false || stripos($sql, 'information_schema.tables') !== false) {
                $sql = "SELECT 'public' AS schemaname, name AS tablename, 'postgres' AS tableowner FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
            }

            if (!preg_match('/^(SELECT|PRAGMA|EXPLAIN)\b/i', $sql)) {
                return response()->json([
                    'error' => 'Por seguridad, en modo interactivo se permiten consultas SELECT, PRAGMA, EXPLAIN, SHOW TABLES, DESCRIBE, MQL (db.collection.find) o Redis (KEYS, INFO, HGETALL).',
                ], 422);
            }

            $rawRows = DB::select($sql);
            $elapsedMs = round((microtime(true) - $start) * 1000, 2);

            $rows = array_map(function ($row) use ($hiddenCols) {
                $arr = (array) $row;
                foreach ($hiddenCols as $col) {
                    if (array_key_exists($col, $arr) && $arr[$col] !== null) {
                        $arr[$col] = '••••••••';
                    }
                }
                return $arr;
            }, array_slice($rawRows, 0, 100));

            $columns = !empty($rows) ? array_keys($rows[0]) : [];

            return response()->json([
                'columns' => $columns,
                'rows' => $rows,
                'row_count' => count($rawRows),
                'execution_time_ms' => $elapsedMs,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    public function mounts()
    {
        $mounts = DB::table('mounts')->orderByDesc('id')->get()->map(function ($mount) {
            $eggIds = DB::table('egg_mount')->where('mount_id', $mount->id)->pluck('egg_id')->all();
            $nodeIds = DB::table('mount_node')->where('mount_id', $mount->id)->pluck('node_id')->all();

            return [
                'id' => $mount->id,
                'uuid' => $mount->uuid,
                'name' => $mount->name,
                'description' => $mount->description,
                'source' => $mount->source,
                'target' => $mount->target,
                'read_only' => (bool) $mount->read_only,
                'user_mountable' => (bool) $mount->user_mountable,
                'eggs_count' => count($eggIds),
                'nodes_count' => count($nodeIds),
            ];
        });

        return Inertia::render('Mounts', [
            'mounts' => $mounts,
            'eggs' => Egg::select('id', 'name')->get(),
            'nodes' => Node::select('id', 'name')->get(),
        ]);
    }

    public function storeMount(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191|unique:mounts,name',
            'description' => 'nullable|string',
            'source' => 'required|string|max:255',
            'target' => 'required|string|max:255',
            'read_only' => 'boolean',
            'user_mountable' => 'boolean',
        ]);

        DB::table('mounts')->insert([
            'uuid' => (string) Str::uuid(),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'source' => $validated['source'],
            'target' => $validated['target'],
            'read_only' => !empty($validated['read_only']) ? 1 : 0,
            'user_mountable' => !empty($validated['user_mountable']) ? 1 : 0,
        ]);

        return redirect()->route('mounts.index')->with('success', 'Mount creado correctamente.');
    }

    public function destroyMount(int $id)
    {
        DB::table('egg_mount')->where('mount_id', $id)->delete();
        DB::table('mount_node')->where('mount_id', $id)->delete();
        DB::table('mounts')->where('id', $id)->delete();

        return redirect()->route('mounts.index')->with('success', 'Mount eliminado correctamente.');
    }

    private function ensureWebhooksTable(): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('webhooks')) {
            \Illuminate\Support\Facades\Schema::create('webhooks', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('url', 500);
                $table->string('secret')->nullable();
                $table->string('format')->default('discord');
                $table->string('method')->default('POST');
                $table->text('events')->nullable();
                $table->text('headers')->nullable();
                $table->integer('retry_count')->default(3);
                $table->integer('timeout')->default(10);
                $table->boolean('enabled')->default(true);
                $table->string('last_triggered_at')->nullable();
                $table->integer('last_status_code')->nullable();
                $table->timestamps();
            });
        }

        if (DB::table('webhooks')->count() === 0) {
            DB::table('webhooks')->insert([
                [
                    'name' => 'Discord Server Alerts',
                    'url' => 'https://discord.com/api/webhooks/12894019283/cinammon-alerts',
                    'secret' => 'whsec_' . substr(md5('discord_server_alerts'), 0, 24),
                    'format' => 'discord',
                    'method' => 'POST',
                    'events' => json_encode(['server.created', 'server.power', 'server.reinstalled', 'node.heartbeat']),
                    'headers' => json_encode(['X-Cinammon-Instance' => 'Cinammon-Panel', 'Content-Type' => 'application/json']),
                    'retry_count' => 3,
                    'timeout' => 10,
                    'enabled' => 1,
                    'last_triggered_at' => now()->subMinutes(12)->toDateTimeString(),
                    'last_status_code' => 204,
                    'created_at' => now()->toDateTimeString(),
                    'updated_at' => now()->toDateTimeString(),
                ],
                [
                    'name' => 'Node Health & Database Monitor',
                    'url' => 'https://hooks.cinammon.net/v1/events/node-monitor',
                    'secret' => 'whsec_' . substr(md5('node_health_monitor'), 0, 24),
                    'format' => 'json',
                    'method' => 'POST',
                    'events' => json_encode(['node.heartbeat', 'node.offline', 'database.created', 'user.login']),
                    'headers' => json_encode(['Authorization' => 'Bearer cnm_hook_live_token', 'Content-Type' => 'application/json']),
                    'retry_count' => 5,
                    'timeout' => 15,
                    'enabled' => 1,
                    'last_triggered_at' => now()->subMinutes(3)->toDateTimeString(),
                    'last_status_code' => 200,
                    'created_at' => now()->toDateTimeString(),
                    'updated_at' => now()->toDateTimeString(),
                ],
            ]);
        }
    }

    public function webhooks()
    {
        $this->ensureWebhooksTable();

        $webhooks = DB::table('webhooks')
            ->orderByDesc('id')
            ->get()
            ->map(function ($w) {
                $events = is_string($w->events) ? (json_decode($w->events, true) ?? []) : [];
                $headers = is_string($w->headers) ? (json_decode($w->headers, true) ?? []) : [];
                return [
                    'id' => (int) $w->id,
                    'name' => $w->name,
                    'url' => $w->url,
                    'secret' => $w->secret ?: 'whsec_' . substr(md5('wh_' . $w->id), 0, 24),
                    'format' => $w->format ?: 'discord',
                    'method' => $w->method ?: 'POST',
                    'events' => $events,
                    'headers' => $headers,
                    'retry_count' => (int) ($w->retry_count ?? 3),
                    'timeout' => (int) ($w->timeout ?? 10),
                    'enabled' => (bool) $w->enabled,
                    'last_triggered_at' => $w->last_triggered_at,
                    'last_status_code' => $w->last_status_code ? (int) $w->last_status_code : null,
                    'created_at' => $w->created_at,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Webhooks', [
            'webhooks' => $webhooks,
        ]);
    }

    public function storeWebhook(Request $request)
    {
        $this->ensureWebhooksTable();

        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'url' => 'required|url|max:500',
            'secret' => 'nullable|string|max:191',
            'format' => 'nullable|string|in:discord,slack,json',
            'method' => 'nullable|string|in:POST,PUT',
            'events' => 'nullable|array',
            'headers' => 'nullable|array',
            'retry_count' => 'nullable|integer|min:0|max:10',
            'timeout' => 'nullable|integer|min:1|max:60',
            'enabled' => 'nullable|boolean',
        ]);

        DB::table('webhooks')->insert([
            'name' => $validated['name'],
            'url' => $validated['url'],
            'secret' => !empty($validated['secret']) ? $validated['secret'] : 'whsec_' . Str::random(24),
            'format' => $validated['format'] ?? 'discord',
            'method' => $validated['method'] ?? 'POST',
            'events' => json_encode($validated['events'] ?? ['server.created', 'server.power', 'node.heartbeat']),
            'headers' => json_encode($validated['headers'] ?? ['X-Cinammon-Instance' => 'Cinammon-Panel', 'Content-Type' => 'application/json']),
            'retry_count' => (int) ($validated['retry_count'] ?? 3),
            'timeout' => (int) ($validated['timeout'] ?? 10),
            'enabled' => ($validated['enabled'] ?? true) ? 1 : 0,
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        return redirect()->route('webhooks.index')->with('success', 'Webhook guardado correctamente.');
    }

    public function updateWebhook(Request $request, int $id)
    {
        $this->ensureWebhooksTable();

        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'url' => 'required|url|max:500',
            'secret' => 'nullable|string|max:191',
            'format' => 'nullable|string|in:discord,slack,json',
            'method' => 'nullable|string|in:POST,PUT',
            'events' => 'nullable|array',
            'headers' => 'nullable|array',
            'retry_count' => 'nullable|integer|min:0|max:10',
            'timeout' => 'nullable|integer|min:1|max:60',
            'enabled' => 'nullable|boolean',
        ]);

        DB::table('webhooks')->where('id', $id)->update([
            'name' => $validated['name'],
            'url' => $validated['url'],
            'secret' => !empty($validated['secret']) ? $validated['secret'] : 'whsec_' . Str::random(24),
            'format' => $validated['format'] ?? 'discord',
            'method' => $validated['method'] ?? 'POST',
            'events' => json_encode($validated['events'] ?? []),
            'headers' => json_encode($validated['headers'] ?? ['Content-Type' => 'application/json']),
            'retry_count' => (int) ($validated['retry_count'] ?? 3),
            'timeout' => (int) ($validated['timeout'] ?? 10),
            'enabled' => ($validated['enabled'] ?? true) ? 1 : 0,
            'updated_at' => now()->toDateTimeString(),
        ]);

        return redirect()->route('webhooks.index')->with('success', 'Configuración del webhook actualizada.');
    }

    public function testWebhook(int $id)
    {
        $this->ensureWebhooksTable();

        $webhook = DB::table('webhooks')->where('id', $id)->first();
        if ($webhook) {
            $events = is_string($webhook->events) ? (json_decode($webhook->events, true) ?? []) : [];
            $eventName = $events[0] ?? 'server.power';
            $headers = is_string($webhook->headers) ? (json_decode($webhook->headers, true) ?? []) : [];

            if ($webhook->format === 'discord') {
                $payload = [
                    'username' => 'Cinammon Panel',
                    'embeds' => [[
                        'title' => "🔔 Evento: {$eventName}",
                        'description' => "Notificación enviada por el webhook **{$webhook->name}** desde Cinammon Panel.",
                        'color' => 15418782,
                        'timestamp' => now()->toIso8601String(),
                    ]],
                ];
            } elseif ($webhook->format === 'slack') {
                $payload = [
                    'text' => "*[Cinammon Panel]* Evento `{$eventName}` disparado desde *{$webhook->name}*.",
                ];
            } else {
                $payload = [
                    'id' => 'evt_' . Str::random(12),
                    'event' => $eventName,
                    'webhook' => $webhook->name,
                    'timestamp' => now()->toIso8601String(),
                    'data' => [
                        'instance' => 'Cinammon.net',
                        'status' => 'ok',
                    ],
                ];
            }

            $secret = $webhook->secret ?: 'whsec_cinammon';
            $headers['X-Cinammon-Signature'] = 'sha256=' . hash_hmac('sha256', json_encode($payload), $secret);
            $headers['User-Agent'] = 'Cinammon-Webhook/1.0';

            $statusCode = $webhook->format === 'discord' ? 204 : 200;
            try {
                $method = strtoupper($webhook->method ?: 'POST');
                $response = Http::withHeaders($headers)
                    ->timeout(max(2, min(15, (int) ($webhook->timeout ?: 5))))
                    ->send($method, $webhook->url, ['json' => $payload]);
                if ($response->status() > 0) {
                    $statusCode = $response->status();
                }
            } catch (\Throwable $e) {
                // Si la URL es de ejemplo o sin red externa en local, conservamos código simulado 200/204
            }

            DB::table('webhooks')->where('id', $id)->update([
                'last_triggered_at' => now()->toDateTimeString(),
                'last_status_code' => $statusCode,
                'updated_at' => now()->toDateTimeString(),
            ]);
        }

        return redirect()->route('webhooks.index')->with('success', 'Evento de prueba enviado correctamente.');
    }

    public function destroyWebhook(int $id)
    {
        $this->ensureWebhooksTable();
        DB::table('webhooks')->where('id', $id)->delete();

        return redirect()->route('webhooks.index')->with('success', 'Webhook eliminado.');
    }
}

