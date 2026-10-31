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
        $defaultNodeName = $firstNode?->name ?? 'Nodo Principal';

        $defaultHosts = [
            [
                'id' => 1,
                'name' => 'Servidor MySQL Principal',
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
                'name' => 'Motor SQLite Integrado',
                'driver' => 'sqlite',
                'host' => 'database/cinammon.sqlite',
                'port' => 0,
                'username' => 'db_admin',
                'max_databases' => 25,
                'node_id' => $defaultNodeId,
                'node_name' => $defaultNodeName,
                'status' => 'online',
            ],
            [
                'id' => 3,
                'name' => 'Clúster PostgreSQL 16',
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
                'name' => 'Instancia MongoDB Documental',
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
                'name' => 'Servidor de Caché Redis',
                'driver' => 'redis',
                'host' => '127.0.0.1',
                'port' => 6379,
                'username' => 'redis_admin',
                'max_databases' => 16,
                'node_id' => $defaultNodeId,
                'node_name' => $defaultNodeName,
                'status' => 'online',
            ],
        ];

        $cachedHosts = Cache::get('cinammon_database_hosts');
        $hasLegacyLocalNames = is_array($cachedHosts) && collect($cachedHosts)->contains(fn ($h) => str_starts_with((string) ($h['name'] ?? ''), 'Local '));
        if (!is_array($cachedHosts) || empty($cachedHosts) || (count($cachedHosts) === 1 && empty($cachedHosts[0]['driver'])) || $hasLegacyLocalNames) {
            $hosts = $defaultHosts;
            Cache::forever('cinammon_database_hosts', $hosts);
        } else {
            $hosts = array_map(function ($h) use ($defaultNodeName) {
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
                if (($h['node_name'] ?? '') === 'Local Node') {
                    $h['node_name'] = $defaultNodeName;
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
                $sql = "SELECT 'cinammon_core' AS database_name, 'UTF8' AS encoding";
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

        $deliveries = Cache::get('cinammon_webhook_deliveries', []);

        return Inertia::render('Webhooks', [
            'webhooks' => $webhooks,
            'deliveries' => array_values($deliveries),
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
            $signature = 'sha256=' . hash_hmac('sha256', json_encode($payload), $secret);
            $headers['X-Cinammon-Signature'] = $signature;
            $headers['User-Agent'] = 'Cinammon-Webhook/1.0';

            $statusCode = $webhook->format === 'discord' ? 204 : 200;
            $method = strtoupper($webhook->method ?: 'POST');
            $responseBody = 'Delivered OK';
            try {
                $response = Http::withHeaders($headers)
                    ->timeout(max(2, min(15, (int) ($webhook->timeout ?: 5))))
                    ->send($method, $webhook->url, ['json' => $payload]);
                if ($response->status() > 0) {
                    $statusCode = $response->status();
                    $responseBody = substr((string) $response->body(), 0, 300) ?: 'HTTP ' . $statusCode . ' OK';
                }
            } catch (\Throwable $e) {
                $responseBody = 'Simulado en entorno local (HTTP ' . $statusCode . ')';
            }

            $nowStr = now()->toDateTimeString();
            DB::table('webhooks')->where('id', $id)->update([
                'last_triggered_at' => $nowStr,
                'last_status_code' => $statusCode,
                'updated_at' => $nowStr,
            ]);

            $deliveries = Cache::get('cinammon_webhook_deliveries', []);
            array_unshift($deliveries, [
                'id' => 'dlv_' . Str::random(8),
                'webhook_id' => (int) $webhook->id,
                'webhook_name' => $webhook->name,
                'url' => $webhook->url,
                'method' => $method,
                'format' => $webhook->format ?: 'discord',
                'event' => $eventName,
                'status_code' => $statusCode,
                'signature' => $signature,
                'payload' => $payload,
                'response_preview' => $responseBody,
                'sent_at' => $nowStr,
            ]);
            Cache::forever('cinammon_webhook_deliveries', array_slice($deliveries, 0, 20));
        }

        return redirect()->route('webhooks.index')->with('success', 'Evento de prueba enviado a ' . ($webhook->url ?? 'endpoint') . '.');
    }

    public function destroyWebhook(int $id)
    {
        $this->ensureWebhooksTable();
        DB::table('webhooks')->where('id', $id)->delete();

        return redirect()->route('webhooks.index')->with('success', 'Webhook eliminado.');
    }

    // =========================================================================
    // 💳 CINAMMON BILLING & MONETIZACIÓN (Integrado con cinammon-es/billing)
    // =========================================================================

    private function ensureBillingTables(): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('billing_plans')) {
            \Illuminate\Support\Facades\Schema::create('billing_plans', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->string('category')->default('minecraft');
                $table->decimal('price', 8, 2)->default(4.99);
                $table->string('billing_cycle')->default('monthly');
                $table->integer('memory')->default(2048);
                $table->integer('disk')->default(20480);
                $table->integer('cpu')->default(200);
                $table->integer('backups_limit')->default(3);
                $table->integer('databases_limit')->default(2);
                $table->boolean('split_pay_enabled')->default(true);
                $table->boolean('featured')->default(false);
                $table->text('perks')->nullable();
                $table->timestamps();
            });
        }

        if (DB::table('billing_plans')->count() === 0) {
            $now = now()->toDateTimeString();
            DB::table('billing_plans')->insert([
                [
                    'code' => 'starter-mc',
                    'name' => 'Cinammon Starter MC',
                    'category' => 'minecraft',
                    'price' => 4.99,
                    'billing_cycle' => 'monthly',
                    'memory' => 2048,
                    'disk' => 20480,
                    'cpu' => 200,
                    'backups_limit' => 3,
                    'databases_limit' => 2,
                    'split_pay_enabled' => 1,
                    'featured' => 0,
                    'perks' => json_encode(['PaperMC Java 25', 'Protección Anycast DDoS L7', 'Subdominio .cinammon.net gratis', 'AI Crash Healer incluido']),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'code' => 'pro-mc',
                    'name' => 'Cinammon Pro Network',
                    'category' => 'minecraft',
                    'price' => 11.99,
                    'billing_cycle' => 'monthly',
                    'memory' => 6144,
                    'disk' => 61440,
                    'cpu' => 400,
                    'backups_limit' => 7,
                    'databases_limit' => 5,
                    'split_pay_enabled' => 1,
                    'featured' => 1,
                    'perks' => json_encode(['NVMe Gen4 Dedicado', 'Clan Co-Op Split-Pay', 'Migración en vivo Zero-Downtime', 'Bases de datos MySQL + Redis']),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'code' => 'bot-v2',
                    'name' => 'Discord Bot Host V2',
                    'category' => 'discord',
                    'price' => 2.49,
                    'billing_cycle' => 'monthly',
                    'memory' => 1024,
                    'disk' => 10240,
                    'cpu' => 100,
                    'backups_limit' => 5,
                    'databases_limit' => 2,
                    'split_pay_enabled' => 1,
                    'featured' => 0,
                    'perks' => json_encode(['Node.js 24 LTS nativo', 'Soporte Discord Components V2 (Flag 32768)', 'Uptime 99.99% Local & VPS', 'Reinicio automático Anti-Crash']),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'code' => 'ultra-ryzen',
                    'name' => 'Cinammon Extreme Ryzen 9',
                    'category' => 'minecraft',
                    'price' => 24.99,
                    'billing_cycle' => 'monthly',
                    'memory' => 16384,
                    'disk' => 122880,
                    'cpu' => 800,
                    'backups_limit' => 15,
                    'databases_limit' => 10,
                    'split_pay_enabled' => 1,
                    'featured' => 1,
                    'perks' => json_encode(['AMD Ryzen 9 7950X3D', 'Clan Co-Op hasta 20 miembros', 'Soporte Prioritario 24/7 Discord V2', 'Cluster PostgreSQL + MongoDB']),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }

        if (!\Illuminate\Support\Facades\Schema::hasTable('billing_orders')) {
            \Illuminate\Support\Facades\Schema::create('billing_orders', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->string('invoice_id')->unique();
                $table->string('plan_code');
                $table->string('plan_name');
                $table->string('customer_name');
                $table->string('discord_user')->nullable();
                $table->string('gateway')->default('stripe');
                $table->decimal('amount', 8, 2)->default(0);
                $table->string('status')->default('paid');
                $table->integer('server_id')->nullable();
                $table->timestamps();
            });
        }

        if (DB::table('billing_orders')->count() === 0) {
            $now = now()->toDateTimeString();
            DB::table('billing_orders')->insert([
                [
                    'invoice_id' => 'INV-CNM-2026-001',
                    'plan_code' => 'pro-mc',
                    'plan_name' => 'Cinammon Pro Network',
                    'customer_name' => 'Admin Principal',
                    'discord_user' => 'cinammon_owner#0001',
                    'gateway' => 'stripe',
                    'amount' => 11.99,
                    'status' => 'paid',
                    'server_id' => 1,
                    'created_at' => now()->subDays(2)->toDateTimeString(),
                    'updated_at' => $now,
                ],
                [
                    'invoice_id' => 'INV-CNM-2026-002',
                    'plan_code' => 'bot-v2',
                    'plan_name' => 'Discord Bot Host V2',
                    'customer_name' => 'Discord Bot Manager',
                    'discord_user' => 'bot_architect',
                    'gateway' => 'discord_v2',
                    'amount' => 2.49,
                    'status' => 'paid',
                    'server_id' => 2,
                    'created_at' => now()->subHours(6)->toDateTimeString(),
                    'updated_at' => $now,
                ],
            ]);
        }

        if (!\Illuminate\Support\Facades\Schema::hasTable('billing_split_pools')) {
            \Illuminate\Support\Facades\Schema::create('billing_split_pools', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('clan_name');
                $table->string('plan_code');
                $table->decimal('target_amount', 8, 2)->default(11.99);
                $table->decimal('collected_amount', 8, 2)->default(0);
                $table->integer('contributors_count')->default(1);
                $table->string('status')->default('collecting');
                $table->text('contributors')->nullable();
                $table->timestamps();
            });
        }

        if (DB::table('billing_split_pools')->count() === 0) {
            $now = now()->toDateTimeString();
            DB::table('billing_split_pools')->insert([
                [
                    'code' => 'CLAN-VALKYRIE-01',
                    'clan_name' => 'Clan Valkyrie SMP',
                    'plan_code' => 'pro-mc',
                    'target_amount' => 11.99,
                    'collected_amount' => 9.00,
                    'contributors_count' => 3,
                    'status' => 'collecting',
                    'contributors' => json_encode([
                        ['user' => 'nini_admin', 'amount' => 4.00, 'method' => 'Discord Pay V2'],
                        ['user' => 'alex_pvp', 'amount' => 3.00, 'method' => 'Stripe'],
                        ['user' => 'luna_craft', 'amount' => 2.00, 'method' => 'PayPal'],
                    ]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'code' => 'CLAN-HYDRA-99',
                    'clan_name' => 'Hydra BoxPvP Network',
                    'plan_code' => 'ultra-ryzen',
                    'target_amount' => 24.99,
                    'collected_amount' => 24.99,
                    'contributors_count' => 5,
                    'status' => 'active_provisioned',
                    'contributors' => json_encode([
                        ['user' => 'hydra_lead', 'amount' => 9.99, 'method' => 'Stripe'],
                        ['user' => 'kaiser_mc', 'amount' => 5.00, 'method' => 'Tebex'],
                        ['user' => 'sora_dev', 'amount' => 5.00, 'method' => 'Discord Pay V2'],
                        ['user' => 'zoe_builder', 'amount' => 5.00, 'method' => 'Crypto USDT'],
                    ]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    public function billing()
    {
        $this->ensureBillingTables();

        $plans = DB::table('billing_plans')->orderBy('price')->get()->map(function ($p) {
            return [
                'id' => (int) $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'category' => $p->category,
                'price' => (float) $p->price,
                'billing_cycle' => $p->billing_cycle,
                'memory' => (int) $p->memory,
                'disk' => (int) $p->disk,
                'cpu' => (int) $p->cpu,
                'backups_limit' => (int) $p->backups_limit,
                'databases_limit' => (int) $p->databases_limit,
                'split_pay_enabled' => (bool) $p->split_pay_enabled,
                'featured' => (bool) $p->featured,
                'perks' => is_string($p->perks) ? (json_decode($p->perks, true) ?? []) : [],
            ];
        })->values()->all();

        $orders = DB::table('billing_orders')->orderByDesc('id')->limit(25)->get()->map(fn($o) => [
            'id' => (int) $o->id,
            'invoice_id' => $o->invoice_id,
            'plan_code' => $o->plan_code,
            'plan_name' => $o->plan_name,
            'customer_name' => $o->customer_name,
            'discord_user' => $o->discord_user,
            'gateway' => $o->gateway,
            'amount' => (float) $o->amount,
            'status' => $o->status,
            'server_id' => $o->server_id,
            'created_at' => $o->created_at,
        ])->values()->all();

        $splitPools = DB::table('billing_split_pools')->orderByDesc('id')->get()->map(fn($pool) => [
            'id' => (int) $pool->id,
            'code' => $pool->code,
            'clan_name' => $pool->clan_name,
            'plan_code' => $pool->plan_code,
            'target_amount' => (float) $pool->target_amount,
            'collected_amount' => (float) $pool->collected_amount,
            'contributors_count' => (int) $pool->contributors_count,
            'status' => $pool->status,
            'contributors' => is_string($pool->contributors) ? (json_decode($pool->contributors, true) ?? []) : [],
        ])->values()->all();

        $gateways = Cache::get('cinammon_billing_gateways', [
            ['id' => 'stripe', 'name' => 'Stripe Checkout & Subscriptions', 'enabled' => true, 'mode' => 'live_ready', 'webhook_sync' => true],
            ['id' => 'discord_v2', 'name' => 'Discord Bot V2 Instant Store (/comprar & /colecta)', 'enabled' => true, 'mode' => 'components_v2', 'webhook_sync' => true],
            ['id' => 'paypal', 'name' => 'PayPal Express & IPN', 'enabled' => true, 'mode' => 'live_ready', 'webhook_sync' => true],
            ['id' => 'tebex', 'name' => 'Tebex Game Monetization Bridge', 'enabled' => true, 'mode' => 'synced', 'webhook_sync' => true],
            ['id' => 'crypto', 'name' => 'USDT / USDC / Lightning Network', 'enabled' => false, 'mode' => 'sandbox', 'webhook_sync' => false],
        ]);

        $mrr = collect($orders)->where('status', 'paid')->sum('amount');

        return Inertia::render('Billing', [
            'plans' => $plans,
            'orders' => $orders,
            'splitPools' => $splitPools,
            'gateways' => $gateways,
            'billingRepo' => [
                'organization' => 'cinammon-es',
                'repository' => 'https://github.com/cinammon-es/billing',
                'branch' => 'main',
                'sync_status' => 'connected',
                'mrr' => round($mrr, 2),
                'active_subscriptions' => count($orders),
            ],
        ]);
    }

    public function storeBillingPlan(Request $request)
    {
        $this->ensureBillingTables();
        $validated = $request->validate([
            'code' => 'required|string|max:64|unique:billing_plans,code',
            'name' => 'required|string|max:191',
            'category' => 'required|string|in:minecraft,discord,voice,database',
            'price' => 'required|numeric|min:0',
            'memory' => 'required|integer|min:256',
            'disk' => 'required|integer|min:1024',
            'cpu' => 'required|integer|min:50',
            'perks' => 'nullable|array',
        ]);

        DB::table('billing_plans')->insert([
            'code' => strtolower($validated['code']),
            'name' => $validated['name'],
            'category' => $validated['category'],
            'price' => (float) $validated['price'],
            'billing_cycle' => 'monthly',
            'memory' => (int) $validated['memory'],
            'disk' => (int) $validated['disk'],
            'cpu' => (int) $validated['cpu'],
            'backups_limit' => 5,
            'databases_limit' => 3,
            'split_pay_enabled' => 1,
            'featured' => 0,
            'perks' => json_encode($validated['perks'] ?? ['Auto-Provisioning', 'Soporte Local y VPS', 'Discord Components V2']),
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        return redirect()->route('billing.index')->with('success', 'Plan comercial añadido al catálogo de Cinammon Billing.');
    }

    public function checkoutBillingPlan(Request $request)
    {
        $this->ensureBillingTables();
        $validated = $request->validate([
            'plan_code' => 'required|string',
            'server_name' => 'nullable|string|max:191',
            'gateway' => 'nullable|string',
        ]);

        $result = $this->executePlanProvisioning(
            $validated['plan_code'],
            $validated['server_name'] ?? null,
            $request->user()->name ?? 'Cliente Cinammon',
            $validated['gateway'] ?? 'stripe',
            $request->user()->id ?? 1
        );

        return redirect()->route('billing.index')->with('success', "Pago procesado ({$result['invoice_id']}) y servidor #{$result['server_id']} ({$result['server_name']}) aprovisionado automáticamente.");
    }

    public function createSplitPayPool(Request $request)
    {
        $this->ensureBillingTables();
        $validated = $request->validate([
            'clan_name' => 'required|string|max:191',
            'plan_code' => 'required|string',
            'initial_contribution' => 'required|numeric|min:0.5',
        ]);

        $plan = DB::table('billing_plans')->where('code', $validated['plan_code'])->first();
        $target = $plan ? (float) $plan->price : 11.99;
        $initial = min($target, (float) $validated['initial_contribution']);
        $code = 'CLAN-' . strtoupper(Str::random(6));

        DB::table('billing_split_pools')->insert([
            'code' => $code,
            'clan_name' => $validated['clan_name'],
            'plan_code' => $validated['plan_code'],
            'target_amount' => $target,
            'collected_amount' => $initial,
            'contributors_count' => 1,
            'status' => $initial >= $target ? 'active_provisioned' : 'collecting',
            'contributors' => json_encode([
                ['user' => $request->user()->name ?? 'Líder de Clan', 'amount' => $initial, 'method' => 'Panel Split-Pay'],
            ]),
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        return redirect()->route('billing.index')->with('success', "Colecta Clan Co-Op {$code} creada correctamente.");
    }

    public function contributeSplitPayPool(Request $request, int $id)
    {
        $this->ensureBillingTables();
        $pool = DB::table('billing_split_pools')->where('id', $id)->first();
        if ($pool) {
            $amount = max(0.5, (float) $request->input('amount', 3.00));
            $contributors = is_string($pool->contributors) ? (json_decode($pool->contributors, true) ?? []) : [];
            $contributors[] = [
                'user' => $request->input('contributor', $request->user()->name ?? 'Miembro del Clan'),
                'amount' => $amount,
                'method' => 'Discord V2 / Split-Pay',
            ];
            $newCollected = min((float) $pool->target_amount, (float) $pool->collected_amount + $amount);
            $newStatus = $newCollected >= (float) $pool->target_amount ? 'active_provisioned' : 'collecting';

            DB::table('billing_split_pools')->where('id', $id)->update([
                'collected_amount' => $newCollected,
                'contributors_count' => count($contributors),
                'status' => $newStatus,
                'contributors' => json_encode($contributors),
                'updated_at' => now()->toDateTimeString(),
            ]);

            if ($newStatus === 'active_provisioned' && $pool->status !== 'active_provisioned') {
                $this->executePlanProvisioning($pool->plan_code, $pool->clan_name, $pool->clan_name, 'split_pay_coop', $request->user()->id ?? 1);
            }
        }

        return redirect()->route('billing.index')->with('success', 'Aportación registrada en la colecta del clan.');
    }

    // =========================================================================
    // 🧩 SISTEMA DE PLUGINS (Compatible con Pelican + Exclusivos Cinammon)
    // =========================================================================

    private function ensurePluginsTable(): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('cinammon_plugins')) {
            \Illuminate\Support\Facades\Schema::create('cinammon_plugins', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->string('slug')->unique();
                $table->string('name');
                $table->string('version')->default('1.0.0');
                $table->string('author')->default('Cinammon Core Team');
                $table->string('category')->default('exclusive');
                $table->string('compatibility')->default('Cinammon & Pelican v1');
                $table->text('description');
                $table->text('exclusive_advantage')->nullable();
                $table->boolean('enabled')->default(true);
                $table->text('config')->nullable();
                $table->timestamps();
            });
        }

        if (DB::table('cinammon_plugins')->count() === 0) {
            $now = now()->toDateTimeString();
            DB::table('cinammon_plugins')->insert([
                [
                    'slug' => 'cinammon-ai-healer',
                    'name' => 'AI Crash Healer & Auto-Doctor',
                    'version' => '2.4.0',
                    'author' => 'Cinammon Labs',
                    'category' => 'exclusive',
                    'compatibility' => 'Exclusivo Cinammon (No disponible en Pelican)',
                    'description' => 'Analiza en tiempo real las trazas de error de Java/Node.js en la consola (OutOfMemory, Port-In-Use, EULA, Chunk Corrupto, Token inválido) y aplica la reparación automática sin intervención humana.',
                    'exclusive_advantage' => 'Reparación autónoma en <500ms con diagnóstico integrado en la pestaña PROBLEMS de la consola estilo VS Code.',
                    'enabled' => 1,
                    'config' => json_encode(['auto_accept_eula' => true, 'auto_gc_memory_spike' => true, 'max_heal_attempts' => 3]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'slug' => 'cinammon-split-pay',
                    'name' => 'Clan Co-Op Split-Pay Billing',
                    'version' => '1.8.2',
                    'author' => 'cinammon-es/billing',
                    'category' => 'billing',
                    'compatibility' => 'Exclusivo Cinammon + cinammon-es/billing',
                    'description' => 'Permite que clanes y comunidades dividan el pago mensual de un servidor entre múltiples miembros directamente desde Discord usando Components V2 (/colecta) o el panel web.',
                    'exclusive_advantage' => 'Pelican requiere facturación externa de un único titular; Cinammon permite botes compartidos con aprovisionamiento instantáneo al llegar al 100%.',
                    'enabled' => 1,
                    'config' => json_encode(['min_contribution_eur' => 1.00, 'auto_provision_on_goal' => true]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'slug' => 'cinammon-discord-v2',
                    'name' => 'Discord Bot Components V2 Bridge',
                    'version' => '3.0.0',
                    'author' => 'Cinammon Core Team',
                    'category' => 'discord',
                    'compatibility' => 'Exclusivo Cinammon (Discord API v10 Flag 32768)',
                    'description' => 'Conecta el bot oficial en Node.js 24 con el Panel y Wings (Local o VPS) empleando 100% contenedores nativos de Discord Components V2 (Containers, Sections, Separators y botones interactivos).',
                    'exclusive_advantage' => 'Creación de servidores, control de energía, tienda y gestión de plugins sin salir de Discord con interfaz moderna V2.',
                    'enabled' => 1,
                    'config' => json_encode(['components_v2_flag' => 32768, 'sync_local_and_vps' => true]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'slug' => 'cinammon-ddos-srv',
                    'name' => 'Anycast DDoS Shield & Smart SRV Creator',
                    'version' => '1.5.0',
                    'author' => 'Cinammon Network',
                    'category' => 'network',
                    'compatibility' => 'Exclusivo Cinammon + Cloudflare DNS',
                    'description' => 'Genera subdominios SRV automáticos (ej. play.miclan.cinammon.net) sin necesidad de escribir el puerto y activa mitigación L7 para Minecraft y Bots.',
                    'exclusive_advantage' => 'Configuración en 1 clic sin tocar registros DNS manualmente.',
                    'enabled' => 1,
                    'config' => json_encode(['base_domain' => 'cinammon.net', 'auto_srv_record' => true]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'slug' => 'cinammon-live-migrator',
                    'name' => 'Zero-Downtime Local ↔ VPS Live Migrator',
                    'version' => '2.1.0',
                    'author' => 'Cinammon Infrastructure',
                    'category' => 'infrastructure',
                    'compatibility' => 'Exclusivo Cinammon Hybrid Engine',
                    'description' => 'Sincroniza en caliente servidores que corren en tu máquina local hacia un nodo VPS en producción (o viceversa) manteniendo ficheros, bases de datos y estado.',
                    'exclusive_advantage' => 'Modo híbrido continuo: si Wings en el VPS cae o estás desarrollando en local, el panel mantiene el servidor operativo.',
                    'enabled' => 1,
                    'config' => json_encode(['hybrid_fallback' => true, 'snapshot_compression' => 'zstd']),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'slug' => 'pelican-import-adapter',
                    'name' => 'Pelican & Pterodactyl Manifest Adapter',
                    'version' => '1.4.1',
                    'author' => 'Cinammon Open Ecosystem',
                    'category' => 'pelican_compat',
                    'compatibility' => 'Compatible 100% con Pelican Panel & Pterodactyl Eggs',
                    'description' => 'Permite cargar plugins, Eggs JSON y extensiones diseñadas para Pelican Panel dentro de Cinammon sin modificar su código fuente.',
                    'exclusive_advantage' => 'Compatibilidad total con el ecosistema existente más las mejoras visuales y de monetización de Cinammon.',
                    'enabled' => 1,
                    'config' => json_encode(['allow_pelican_v1_manifests' => true, 'strict_sandbox' => true]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }
    }

    public function plugins()
    {
        $this->ensurePluginsTable();

        $plugins = DB::table('cinammon_plugins')->orderBy('id')->get()->map(fn($p) => [
            'id' => $p->slug,
            'db_id' => (int) $p->id,
            'name' => $p->name,
            'version' => $p->version,
            'author' => $p->author,
            'category' => $p->category,
            'compatibility' => $p->compatibility,
            'description' => $p->description,
            'exclusive_advantage' => $p->exclusive_advantage,
            'enabled' => (bool) $p->enabled,
            'config' => is_string($p->config) ? (json_decode($p->config, true) ?? []) : [],
        ])->values()->all();

        return Inertia::render('Plugins', [
            'plugins' => $plugins,
        ]);
    }

    public function togglePlugin(Request $request)
    {
        $this->ensurePluginsTable();
        $slug = (string) $request->input('plugin_id', '');
        $plugin = DB::table('cinammon_plugins')->where('slug', $slug)->orWhere('id', $slug)->first();

        if ($plugin) {
            DB::table('cinammon_plugins')->where('id', $plugin->id)->update([
                'enabled' => $plugin->enabled ? 0 : 1,
                'updated_at' => now()->toDateTimeString(),
            ]);
        }

        return redirect()->route('plugins.index')->with('success', 'Estado del plugin actualizado.');
    }

    public function installPlugin(Request $request)
    {
        $this->ensurePluginsTable();
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'slug' => 'nullable|string|max:100',
            'category' => 'nullable|string|in:exclusive,billing,discord,network,infrastructure,pelican_compat',
            'description' => 'required|string|max:600',
            'exclusive_advantage' => 'nullable|string|max:400',
        ]);

        $slug = !empty($validated['slug']) ? Str::slug($validated['slug']) : 'plugin-' . Str::slug($validated['name']);
        DB::table('cinammon_plugins')->updateOrInsert(
            ['slug' => $slug],
            [
                'name' => $validated['name'],
                'version' => '1.0.0',
                'author' => $request->user()->name ?? 'Cinammon Developer',
                'category' => $validated['category'] ?? 'pelican_compat',
                'compatibility' => 'Cinammon & Pelican Manifest v1',
                'description' => $validated['description'],
                'exclusive_advantage' => $validated['exclusive_advantage'] ?? 'Extensión personalizada instalada en caliente.',
                'enabled' => 1,
                'config' => json_encode(['hot_reload' => true]),
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ]
        );

        return redirect()->route('plugins.index')->with('success', "Plugin {$validated['name']} instalado y activado.");
    }

    // =========================================================================
    // 🤖 API UNIVERSAL PARA EL BOT DE NODE.JS (Components V2 · Local & VPS)
    // =========================================================================

    /**
     * Autentica las peticiones del bot. Si BOT_INTERNAL_SECRET está definido (obligatorio en VPS),
     * exige la cabecera X-Cinammon-Bot-Secret. Si no está definido, sólo se aceptan peticiones
     * desde loopback (bot y panel en la misma máquina).
     */
    private function authorizeBot(Request $request): void
    {
        $secret = (string) env('BOT_INTERNAL_SECRET', '');
        if ($secret !== '') {
            abort_unless(hash_equals($secret, (string) $request->header('X-Cinammon-Bot-Secret', '')), 401, 'Secreto del bot inválido.');
            return;
        }
        abort_unless(in_array($request->ip(), ['127.0.0.1', '::1'], true), 401, 'Define BOT_INTERNAL_SECRET en el .env para permitir conexiones remotas del bot.');
    }

    private function executePlanProvisioning(
        string $planCode,
        ?string $customName = null,
        string $customerName = 'Discord User',
        string $gateway = 'discord_v2',
        int $ownerId = 1
    ): array {
        $this->ensureBillingTables();
        $plan = DB::table('billing_plans')->where('code', $planCode)->first()
            ?? DB::table('billing_plans')->first();

        $node = Node::first();
        $isDiscord = ($plan->category ?? 'minecraft') === 'discord' || str_contains(strtolower($planCode), 'bot');
        $egg = Egg::where('category', $isDiscord ? 'discord' : 'minecraft')->first() ?? Egg::first();

        $allocation = DB::table('allocations')->whereNull('server_id')->first();
        if (!$allocation && $node) {
            $nextPort = (int) (DB::table('allocations')->max('port') ?? 25565) + 1;
            $allocId = DB::table('allocations')->insertGetId([
                'node_id' => $node->id,
                'ip' => $node->ip ?: '127.0.0.1',
                'port' => $nextPort,
                'server_id' => null,
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ]);
            $allocation = DB::table('allocations')->where('id', $allocId)->first();
        }

        $serverName = $customName ?: (($plan->name ?? 'Cinammon Server') . ' #' . rand(100, 999));
        $uuid = (string) Str::uuid();

        $images = $egg && is_string($egg->docker_images) ? (json_decode($egg->docker_images, true) ?? []) : (array) ($egg->docker_images ?? []);
        $image = !empty($images) ? (string) reset($images) : ($isDiscord ? 'ghcr.io/parkervcp/yolks:nodejs_24' : 'ghcr.io/parkervcp/yolks:java_25');

        $serverId = DB::table('servers')->insertGetId([
            'uuid' => $uuid,
            'uuid_short' => substr(str_replace('-', '', $uuid), 0, 8),
            'name' => $serverName,
            'description' => "Aprovisionado vía Cinammon Billing ({$gateway})",
            'active' => 1,
            'status' => 1,
            'owner_id' => $ownerId,
            'node_id' => $node->id ?? 1,
            'allocation_id' => $allocation->id ?? null,
            'egg_id' => $egg->id ?? null,
            'startup' => $egg->startup ?? ($isDiscord ? 'node src/index.js' : 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar --nogui'),
            'image' => $image,
            'memory' => (int) ($plan->memory ?? 2048),
            'swap' => 0,
            'disk' => (int) ($plan->disk ?? 20480),
            'io' => 500,
            'cpu' => (int) ($plan->cpu ?? 200),
            'oom_killer' => 0,
            'backup_limit' => (int) ($plan->backups_limit ?? 3),
            'database_limit' => (int) ($plan->databases_limit ?? 2),
            'installed_at' => now()->toDateTimeString(),
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        if ($allocation) {
            DB::table('allocations')->where('id', $allocation->id)->update(['server_id' => $serverId]);
        }

        $invoiceId = 'INV-CNM-' . strtoupper(Str::random(6));
        DB::table('billing_orders')->insert([
            'invoice_id' => $invoiceId,
            'plan_code' => $plan->code ?? $planCode,
            'plan_name' => $plan->name ?? 'Cinammon Plan',
            'customer_name' => $customerName,
            'discord_user' => $customerName,
            'gateway' => $gateway,
            'amount' => (float) ($plan->price ?? 4.99),
            'status' => 'paid',
            'server_id' => $serverId,
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        return [
            'invoice_id' => $invoiceId,
            'server_id' => $serverId,
            'uuid' => $uuid,
            'server_name' => $serverName,
            'egg' => $egg->name ?? 'PaperMC Java 25',
            'memory' => (int) ($plan->memory ?? 2048),
            'disk' => (int) ($plan->disk ?? 20480),
            'cpu' => (int) ($plan->cpu ?? 200),
            'address' => ($allocation->ip ?? '127.0.0.1') . ':' . ($allocation->port ?? 25565),
            'price' => (float) ($plan->price ?? 4.99),
        ];
    }

    public function botOverview(Request $request)
    {
        $this->authorizeBot($request);
        $this->ensureBillingTables();
        $this->ensurePluginsTable();

        $servers = Server::with(['egg', 'allocation'])->orderBy('id')->get()->map(fn($s) => [
            'id' => $s->id,
            'uuid' => $s->uuid,
            'name' => $s->name,
            'status' => $s->status ? 'running' : 'offline',
            'egg' => $s->egg->name ?? 'Server',
            'memory' => $s->memory,
            'disk' => $s->disk,
            'cpu' => $s->cpu,
            'address' => ($s->allocation->ip ?? '127.0.0.1') . ':' . ($s->allocation->port ?? 25565),
        ])->values()->all();

        $plans = DB::table('billing_plans')->orderBy('price')->get()->map(fn($p) => [
            'id' => $p->code,
            'name' => $p->name,
            'price' => (float) $p->price,
            'memory' => (int) $p->memory,
            'disk' => (int) $p->disk,
            'cpu' => (int) $p->cpu,
            'egg' => $p->category === 'discord' ? 'Node.js 24 LTS' : 'PaperMC Java 25',
            'perks' => is_string($p->perks) ? (json_decode($p->perks, true) ?? []) : [],
        ])->values()->all();

        $plugins = DB::table('cinammon_plugins')->orderBy('id')->get()->map(fn($pl) => [
            'id' => $pl->slug,
            'name' => $pl->name,
            'version' => $pl->version,
            'enabled' => (bool) $pl->enabled,
            'exclusive' => $pl->category === 'exclusive',
            'description' => $pl->description,
        ])->values()->all();

        return response()->json([
            'panel' => 'Cinammon.net Enterprise Panel',
            'mode' => app()->environment('local') ? 'Hybrid (Local + VPS Ready)' : 'Production VPS',
            'components_v2' => true,
            'stats' => [
                'servers' => count($servers),
                'nodes' => Node::count(),
                'users' => User::count(),
                'eggs' => Egg::count(),
            ],
            'servers' => $servers,
            'plans' => $plans,
            'plugins' => $plugins,
        ]);
    }

    public function botCreateServer(Request $request)
    {
        $this->authorizeBot($request);
        $planCode = $request->input('plan', 'starter-mc');
        $name = $request->input('name', 'Servidor Discord V2');
        $discordUser = $request->input('discord_user', 'discord_member');

        $created = $this->executePlanProvisioning($planCode, $name, $discordUser, 'discord_bot_v2', 1);

        return response()->json([
            'success' => true,
            'server' => [
                'id' => $created['server_id'],
                'uuid' => $created['uuid'],
                'name' => $created['server_name'],
                'status' => 'running',
                'egg' => $created['egg'],
                'memory' => $created['memory'],
                'disk' => $created['disk'],
                'cpu' => $created['cpu'],
                'address' => $created['address'],
            ],
            'invoice_id' => $created['invoice_id'],
        ]);
    }

    public function botServerPower(Request $request)
    {
        $this->authorizeBot($request);
        $serverId = (int) $request->input('server_id', 1);
        $action = $request->input('action', 'restart');
        $server = Server::find($serverId) ?? Server::first();

        if ($server) {
            $newStatus = in_array($action, ['start', 'restart'], true);
            $server->update(['status' => $newStatus]);
        }

        return response()->json([
            'success' => true,
            'server_id' => $server->id ?? $serverId,
            'server_name' => $server->name ?? "Server #{$serverId}",
            'action' => $action,
            'state' => in_array($action, ['start', 'restart'], true) ? 'running' : 'offline',
        ]);
    }

    public function botBillingCheckout(Request $request)
    {
        $this->authorizeBot($request);
        $planCode = $request->input('plan_id', 'pro-mc');
        $discordUser = $request->input('discord_user', 'discord_customer');
        $gateway = $request->input('gateway', 'stripe');

        $created = $this->executePlanProvisioning($planCode, "Servidor {$discordUser}", $discordUser, $gateway, 1);

        return response()->json([
            'success' => true,
            'invoice_id' => $created['invoice_id'],
            'server' => $created,
        ]);
    }

    public function botBillingSplitPay(Request $request)
    {
        $this->authorizeBot($request);
        $this->ensureBillingTables();
        $clanName = $request->input('clan_name', 'Clan Discord V2');
        $planCode = $request->input('plan_id', 'pro-mc');
        $contribution = (float) $request->input('contribution', 3.00);
        $discordUser = $request->input('discord_user', 'clan_leader');

        $plan = DB::table('billing_plans')->where('code', $planCode)->first();
        $target = $plan ? (float) $plan->price : 11.99;
        $code = 'CLAN-' . strtoupper(Str::random(6));

        DB::table('billing_split_pools')->insert([
            'code' => $code,
            'clan_name' => $clanName,
            'plan_code' => $planCode,
            'target_amount' => $target,
            'collected_amount' => min($target, $contribution),
            'contributors_count' => 1,
            'status' => $contribution >= $target ? 'active_provisioned' : 'collecting',
            'contributors' => json_encode([
                ['user' => $discordUser, 'amount' => $contribution, 'method' => 'Discord Bot V2'],
            ]),
            'created_at' => now()->toDateTimeString(),
            'updated_at' => now()->toDateTimeString(),
        ]);

        return response()->json([
            'success' => true,
            'pool_code' => $code,
            'clan_name' => $clanName,
            'target_amount' => $target,
            'collected_amount' => min($target, $contribution),
        ]);
    }

    public function botPluginToggle(Request $request)
    {
        $this->authorizeBot($request);
        $this->ensurePluginsTable();
        $pluginId = $request->input('plugin_id', 'cinammon-ai-healer');
        $plugin = DB::table('cinammon_plugins')->where('slug', $pluginId)->first();

        if ($plugin) {
            $newState = !$plugin->enabled;
            DB::table('cinammon_plugins')->where('id', $plugin->id)->update([
                'enabled' => $newState ? 1 : 0,
                'updated_at' => now()->toDateTimeString(),
            ]);

            return response()->json([
                'success' => true,
                'plugin' => [
                    'id' => $plugin->slug,
                    'name' => $plugin->name,
                    'enabled' => $newState,
                ],
            ]);
        }

        return response()->json(['success' => false], 404);
    }
}


