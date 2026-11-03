<?php

namespace App\Http\Controllers;

use App\Models\Node;
use App\Models\Server;
use App\Support\DemoWings;
use App\Support\WingsEvents;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Estado y seguridad de Wings para administradores. Nunca muestra IPs, tokens ni registros:
 * en el panel real lee una instantánea que genera root y en la demo muestra el Wings simulado.
 */
class WingsMonitorController extends Controller
{
    private const SNAPSHOT = '/run/cinammon-telemetry/wings.json';
    private const MAX_AGE = 90;

    public function index(Request $request): Response
    {
        $demo = (bool) config('panel.demo');
        $tier = WingsEvents::tier($request->user());
        $telemetry = $demo ? DemoWings::telemetry() : $this->snapshot();
        $node = Node::first();

        // Moderator y Helper ven el estado operativo, no la postura de seguridad del anfitrión.
        $fullView = in_array($tier, [WingsEvents::FULL, WingsEvents::OWNER], true);
        if ($telemetry && ! $fullView) {
            $telemetry['security'] = null;
        }

        return Inertia::render('Wings', [
            'mode' => $demo ? 'demo' : 'real',
            'tier' => $tier,
            'node' => $node ? ['name' => $node->name, 'online' => (bool) $node->online, 'maintenance' => (bool) $node->maintenance_mode] : null,
            'telemetry' => $telemetry ? $this->present($telemetry) : null,
            'checks' => ! $fullView ? [] : ($demo ? $this->demoChecks() : ($telemetry ? $this->realChecks($telemetry) : [])),
        ]);
    }

    private function snapshot(): ?array
    {
        $data = @json_decode((string) @file_get_contents(self::SNAPSHOT), true);

        return is_array($data) && time() - (int) ($data['generated_at'] ?? 0) < self::MAX_AGE ? $data : null;
    }

    /** Sustituye los identificadores de los contenedores por el nombre del servidor. */
    private function present(array $t): array
    {
        $names = Server::whereIn('uuid', array_column($t['containers'] ?? [], 'name'))->pluck('name', 'uuid');
        $t['containers'] = array_map(function ($c) use ($names) {
            $c['server'] = $names[$c['name']] ?? 'servidor desconocido';
            unset($c['name']);

            return $c;
        }, $t['containers'] ?? []);

        return $t;
    }

    private function check(string $label, ?bool $ok, string $detail, string $failLevel = 'fail'): array
    {
        return ['label' => $label, 'status' => $ok === null ? 'info' : ($ok ? 'ok' : $failLevel), 'detail' => $detail];
    }

    private function realChecks(array $t): array
    {
        $s = $t['security'] ?? [];
        $containers = $t['containers'] ?? [];
        $all = fn (callable $test) => $containers !== [] && count(array_filter($containers, fn ($c) => $test($c['isolation'] ?? []))) === count($containers);
        $jails = array_keys($s['fail2ban'] ?? []);

        return [
            $this->check('API de Wings solo en local', ($t['ports']['wings_api'] ?? '') === 'local', 'Wings escucha únicamente en 127.0.0.1; nginx es la única puerta.'),
            $this->check('Cortafuegos activo', $s['firewall_active'] ?? false, 'Entrada denegada por defecto.'),
            $this->check('Puertos web solo desde Cloudflare', $s['web_ports_restricted_to_cloudflare'] ?? false, 'Acceder por la IP directa no conecta.'),
            $this->check('Contenedores sin acceso al servidor', $s['containers_blocked_from_host'] ?? false, 'La interfaz de los contenedores no puede abrir conexiones al anfitrión.', 'warn'),
            $this->check('Descargas remotas de Wings desactivadas', $s['remote_download_disabled'] ?? false, 'Un servidor no puede hacer que Wings descargue URLs arbitrarias.', 'warn'),
            $this->check('El usuario web no controla Docker', ! ($s['web_user_has_docker_access'] ?? true), 'Un fallo en el panel no da control del servidor.'),
            $this->check('Bloqueo automático de IPs en el SFTP', in_array('wings-sftp', $jails, true), $jails ? 'Jaulas activas: '.implode(', ', $jails).'.' : 'fail2ban sin jaulas.', 'warn'),
            $this->check('Contenedores sin privilegios', $all(fn ($i) => ! ($i['privileged'] ?? true) && ($i['no_new_privileges'] ?? false)), 'Sin modo privilegiado y con no-new-privileges.'),
            $this->check('Sistema de archivos de solo lectura', $all(fn ($i) => $i['readonly_rootfs'] ?? false), 'Solo el volumen del servidor es escribible.'),
            $this->check('Límite de memoria en cada servidor', $all(fn ($i) => $i['memory_limited'] ?? false), 'Evita que un servidor agote la RAM del nodo.', 'warn'),
            $this->check('Contenedores aislados entre sí', $s['containers_isolated_from_each_other'] ?? false, 'Un servidor no puede conectar con otro por la red interna.', 'warn'),
            $this->check('SSH sin acceso directo de root', ! ($s['ssh_root_login'] ?? true), 'PermitRootLogin desactivado.'),
            $this->check('SSH sin contraseñas (solo llaves)', ! ($s['ssh_password_login'] ?? true), 'Las contraseñas SSH son lo primero que atacan los robots.'),
        ];
    }

    private function demoChecks(): array
    {
        $db = (string) config('database.connections.'.config('database.default').'.database');
        $user = function_exists('posix_geteuid') ? (posix_getpwuid(posix_geteuid())['name'] ?? '?') : '?';
        $limits = DemoWings::limits();

        return [
            $this->check('Nodo simulado', true, 'No hay Docker ni contenedores reales detrás: todo lo atiende código del panel.'),
            $this->check('Archivos confinados por servidor', true, 'Cada servidor solo ve su carpeta; las rutas con «..» se rechazan.'),
            $this->check('Límites de tamaño', true, sprintf('%d MB por archivo y %d MB por servidor.', $limits['file_bytes'] / 1048576, $limits['server_bytes'] / 1048576)),
            $this->check('Instalación aislada', str_contains($db, 'demo') && $user !== 'www-data', "Base de datos «{$db}» y usuario del sistema «{$user}», distintos del panel real."),
            $this->check('Sin conexión con el billing real', (string) config('services.billing.token') === '', 'La demo no tiene el token del billing: no puede crear pedidos ni servidores reales.'),
            $this->check('Sin SFTP real', true, 'No hay un servicio SFTP al que conectarse.'),
            $this->check('Restablecimiento diario', true, 'Cuentas y servidores vuelven a su estado inicial cada noche.'),
        ];
    }
}
