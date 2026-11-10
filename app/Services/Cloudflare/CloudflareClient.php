<?php

namespace App\Services\Cloudflare;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Cliente mínimo de la API de Cloudflare con el token del propio cliente.
 * Solo usa lo que hace falta para el DNS: verificar el token, listar zonas y crear/editar/borrar registros.
 */
class CloudflareClient
{
    private const API = 'https://api.cloudflare.com/client/v4';

    public function __construct(private readonly string $token)
    {
    }

    private function http(): PendingRequest
    {
        return Http::withToken($this->token)->acceptJson()->timeout(15)->connectTimeout(8);
    }

    /** Lanza CloudflareException con un mensaje en español si Cloudflare devuelve un error. */
    private function call(string $method, string $path, array $data = []): array
    {
        try {
            $response = $this->http()->{$method}(self::API.$path, $data);
        } catch (\Throwable $e) {
            throw new CloudflareException('No se pudo contactar con Cloudflare. Inténtalo de nuevo en un momento.');
        }

        $json = $response->json() ?? [];
        if ($response->successful() && ($json['success'] ?? false)) {
            return $json;
        }

        $error = $json['errors'][0] ?? [];
        $code = (int) ($error['code'] ?? 0);
        $message = match (true) {
            in_array($code, [6003, 6111, 1000, 10000], true), $response->status() === 401 => 'El token de Cloudflare no es válido o ha caducado. Crea uno nuevo con la plantilla «Editar DNS de zona».',
            $response->status() === 403 || $code === 9109 => 'El token no tiene permiso para esto. Necesita «Zona → DNS → Editar» sobre el dominio.',
            $code === 81053, $code === 81057, $code === 81058 => 'Ya existe un registro DNS con ese nombre en tu Cloudflare. Bórralo o usa otro nombre.',
            $code === 1004 => 'Cloudflare ha rechazado el registro DNS: '.($error['message'] ?? 'datos no válidos').'.',
            $response->status() === 429 => 'Cloudflare está limitando las peticiones. Espera un minuto.',
            default => 'Cloudflare ha devuelto un error'.(isset($error['message']) ? ': '.$error['message'] : ' ('.$response->status().')').'.',
        };

        throw new CloudflareException($message, $code);
    }

    /** Comprueba que el token es un token de API activo. */
    public function verify(): void
    {
        if (! preg_match('/^[A-Za-z0-9_\-]{30,80}$/', $this->token)) {
            throw new CloudflareException('Eso no parece un token de API de Cloudflare. Créalo en Mi perfil → Tokens de API → Crear token.');
        }
        $json = $this->call('get', '/user/tokens/verify');
        if (($json['result']['status'] ?? '') !== 'active') {
            throw new CloudflareException('El token de Cloudflare no está activo.');
        }
    }

    /** Zonas (dominios) activas a las que llega el token: [['id','name','status']]. */
    public function zones(): array
    {
        $zones = [];
        for ($page = 1; $page <= 5; $page++) {
            $json = $this->call('get', '/zones', ['per_page' => 50, 'page' => $page]);
            foreach ($json['result'] ?? [] as $zone) {
                $zones[] = ['id' => (string) $zone['id'], 'name' => strtolower((string) $zone['name']), 'status' => (string) ($zone['status'] ?? '')];
            }
            if ($page >= (int) ($json['result_info']['total_pages'] ?? 1)) {
                break;
            }
        }
        usort($zones, fn ($a, $b) => strcmp($a['name'], $b['name']));

        return $zones;
    }

    /** Registros con ese nombre exacto (cualquier tipo). */
    public function recordsNamed(string $zoneId, string $name): array
    {
        return $this->call('get', "/zones/{$zoneId}/dns_records", ['name' => $name, 'per_page' => 50])['result'] ?? [];
    }

    public function createRecord(string $zoneId, array $record): array
    {
        return $this->call('post', "/zones/{$zoneId}/dns_records", $record)['result'];
    }

    public function updateRecord(string $zoneId, string $id, array $record): array
    {
        return $this->call('patch', "/zones/{$zoneId}/dns_records/{$id}", $record)['result'];
    }

    public function deleteRecord(string $zoneId, string $id): void
    {
        try {
            $this->call('delete', "/zones/{$zoneId}/dns_records/{$id}");
        } catch (CloudflareException $e) {
            // Si ya no existe (lo borró el cliente a mano), no es un error.
            if (! in_array($e->getCode(), [81044, 1032], true)) {
                throw $e;
            }
        }
    }
}
