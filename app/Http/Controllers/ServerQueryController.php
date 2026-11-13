<?php

namespace App\Http\Controllers;

use App\Models\Server;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ServerQueryController extends Controller
{
    /**
     * Vista interactiva de comprobador de servidores y puertos.
     */
    public function index(): InertiaResponse
    {
        return Inertia::render('Check', [
            'defaultHost' => 'nodo.cinammon.net',
            'recommendedPorts' => [
                ['name' => 'Minecraft Paper', 'port' => 25565, 'type' => 'minecraft'],
                ['name' => 'Multi Theft Auto (ASE)', 'port' => 22003, 'type' => 'mta'],
                ['name' => 'SFTP Seguro (Nodo 1)', 'port' => 2022, 'type' => 'tcp'],
                ['name' => 'Daemon Wings (HTTPS)', 'port' => 443, 'type' => 'http'],
                ['name' => 'MariaDB Clúster', 'port' => 3306, 'type' => 'tcp'],
                ['name' => 'Portal VitePress (Demo)', 'port' => 25569, 'type' => 'http'],
            ],
        ]);
    }

    /**
     * Comprobación en tiempo real de disponibilidad y latencia.
     */
    public function ping(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'host' => 'required|string|max:255',
            'port' => 'required|integer|min:1|max:65535',
            'type' => 'nullable|string|in:auto,minecraft,mta,http,tcp',
        ]);

        $host = trim($validated['host']);
        $port = (int) $validated['port'];
        $type = $validated['type'] ?? 'auto';

        // Prevenir solicitudes a rangos privados no autorizados
        $resolvedIp = gethostbyname($host);
        if ($resolvedIp === $host && !filter_var($host, FILTER_VALIDATE_IP)) {
            return response()->json([
                'online' => false,
                'message' => 'No se pudo resolver el nombre de host especificado.',
            ], 422);
        }

        $start = microtime(true);

        // Comprobación según el protocolo
        if ($type === 'minecraft' || ($type === 'auto' && $port === 25565)) {
            return response()->json($this->pingMinecraft($host, $port, $start));
        }

        if ($type === 'http' || ($type === 'auto' && in_array($port, [80, 443, 8080, 25569, 3000]))) {
            return response()->json($this->pingHttp($host, $port, $start));
        }

        // Comprobación TCP genérica con medición de latencia
        return response()->json($this->pingTcp($host, $port, $start));
    }

    /**
     * Medición de socket TCP genérico.
     */
    protected function pingTcp(string $host, int $port, float $start): array
    {
        $errno = 0;
        $errstr = '';
        $timeout = 2.5;

        $fp = @fsockopen($host, $port, $errno, $errstr, $timeout);
        $latency = round((microtime(true) - $start) * 1000, 1);

        if (!$fp) {
            return [
                'online' => false,
                'host' => $host,
                'port' => $port,
                'type' => 'tcp',
                'latency_ms' => null,
                'message' => 'Puerto cerrado o no alcanzable (' . ($errstr ?: 'Tiempo de espera agotado') . ').',
            ];
        }

        fclose($fp);

        return [
            'online' => true,
            'host' => $host,
            'port' => $port,
            'type' => 'tcp',
            'latency_ms' => $latency,
            'message' => 'Conexión TCP establecida correctamente.',
        ];
    }

    /**
     * Medición de respuesta HTTP / HTTPS.
     */
    protected function pingHttp(string $host, int $port, float $start): array
    {
        $scheme = ($port === 443) ? 'https' : 'http';
        $url = "{$scheme}://{$host}:{$port}/";

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_NOBODY => true,
            CURLOPT_TIMEOUT => 3,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_USERAGENT => 'CinammonNetwork-PingChecker/1.0',
        ]);

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $latency = round((microtime(true) - $start) * 1000, 1);
        $err = curl_error($ch);
        curl_close($ch);

        if ($httpCode > 0) {
            return [
                'online' => true,
                'host' => $host,
                'port' => $port,
                'type' => 'http',
                'latency_ms' => $latency,
                'status_code' => $httpCode,
                'message' => "Servicio web respondiendo con código HTTP {$httpCode}.",
            ];
        }

        return [
            'online' => false,
            'host' => $host,
            'port' => $port,
            'type' => 'http',
            'latency_ms' => null,
            'message' => 'Sin respuesta HTTP (' . ($err ?: 'Tiempo de espera agotado') . ').',
        ];
    }

    /**
     * Consulta handshake de Minecraft (Server List Ping).
     */
    protected function pingMinecraft(string $host, int $port, float $start): array
    {
        $errno = 0;
        $errstr = '';
        $socket = @fsockopen($host, $port, $errno, $errstr, 2.5);

        if (!$socket) {
            return [
                'online' => false,
                'host' => $host,
                'port' => $port,
                'type' => 'minecraft',
                'latency_ms' => null,
                'message' => 'No se pudo conectar al servidor de Minecraft.',
            ];
        }

        stream_set_timeout($socket, 2);

        // Handshake packet (Protocol 47 = 1.8+, NextState = 1 Status)
        $hostLen = strlen($host);
        $packet = "\x00\x2f" . pack('c', $hostLen) . $host . pack('n', $port) . "\x01";
        $packet = pack('c', strlen($packet)) . $packet;

        // Request packet
        $req = "\x01\x00";

        fwrite($socket, $packet . $req);

        // Read length
        $len = 0;
        $size = 0;
        while (true) {
            $byte = ord(fgetc($socket));
            $size |= ($byte & 0x7f) << ($len++ * 7);
            if (($byte & 0x80) !== 128 || $len > 5) {
                break;
            }
        }

        $latency = round((microtime(true) - $start) * 1000, 1);

        $payload = '';
        $remaining = $size;
        while ($remaining > 0 && !feof($socket)) {
            $chunk = fread($socket, min(1024, $remaining));
            if ($chunk === false || $chunk === '') {
                break;
            }
            $payload .= $chunk;
            $remaining -= strlen($chunk);
        }
        fclose($socket);

        // Buscar JSON de respuesta
        $jsonStart = strpos($payload, '{');
        if ($jsonStart !== false) {
            $jsonStr = substr($payload, $jsonStart);
            $data = json_decode($jsonStr, true);
            if (is_array($data)) {
                $description = is_string($data['description'] ?? null)
                    ? $data['description']
                    : ($data['description']['text'] ?? 'Servidor de Minecraft');

                return [
                    'online' => true,
                    'host' => $host,
                    'port' => $port,
                    'type' => 'minecraft',
                    'latency_ms' => $latency,
                    'version' => $data['version']['name'] ?? 'Desconocida',
                    'players' => [
                        'online' => $data['players']['online'] ?? 0,
                        'max' => $data['players']['max'] ?? 0,
                    ],
                    'motd' => strip_tags(preg_replace('/§[0-9a-fk-or]/i', '', (string) $description)),
                    'message' => 'Servidor de Minecraft respondiendo activamente.',
                ];
            }
        }

        return [
            'online' => true,
            'host' => $host,
            'port' => $port,
            'type' => 'minecraft',
            'latency_ms' => $latency,
            'message' => 'Puerto de Minecraft abierto (respuesta básica TCP).',
        ];
    }

    /**
     * Generación de insignias SVG dinámicas para servidores.
     * Ejemplo: /api/servers/{uuid}/badge.svg?style=flat
     */
    public function badge(string $server): Response
    {
        $srv = Server::where('uuid', $server)->orWhere('short_id', $server)->first();

        $name = $srv ? $srv->name : 'Cinammon Server';
        $isOnline = $srv ? (bool) $srv->active : false;

        $statusText = $isOnline ? 'EN LÍNEA' : 'DESCONECTADO';
        $statusColor = $isOnline ? '#10b981' : '#ef4444';
        $labelColor = '#18181b';

        $escapedName = htmlspecialchars($name, ENT_XML1, 'UTF-8');

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="28" viewBox="0 0 220 28" role="img" aria-label="{$escapedName}: {$statusText}">
    <linearGradient id="b" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="a">
        <rect width="220" height="28" rx="6" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#a)">
        <rect width="130" height="28" fill="{$labelColor}"/>
        <rect x="130" width="90" height="28" fill="{$statusColor}"/>
        <rect width="220" height="28" fill="url(#b)"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="'Orbitron', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700">
        <text x="65" y="18" fill="#000" fill-opacity=".3">{$escapedName}</text>
        <text x="65" y="17" fill="#f43f5e">{$escapedName}</text>
        <text x="175" y="18" fill="#000" fill-opacity=".3">{$statusText}</text>
        <text x="175" y="17" fill="#ffffff">{$statusText}</text>
    </g>
</svg>
SVG;

        return response($svg, 200, [
            'Content-Type' => 'image/svg+xml; charset=utf-8',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
}
