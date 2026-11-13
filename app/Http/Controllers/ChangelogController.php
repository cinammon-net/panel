<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class ChangelogController extends Controller
{
    /**
     * Historial de actualizaciones y notas de versión de la plataforma.
     */
    public function index(): Response
    {
        return Inertia::render('Changelog', [
            'releases' => [
                [
                    'version' => 'v2.4.0',
                    'date' => 'Noviembre 2026',
                    'title' => 'Actualización de Wings Daemon y Mejoras de Conectividad',
                    'description' => 'Despliegue de Wings Daemon v1.0.4 en nodo.cinammon.net con enlace seguro en el puerto 443 y optimización de SFTP en puerto 2022.',
                    'changes' => [
                        'Wings Daemon actualizado a la versión v1.0.4 con recolector de basura ZGC en Java 21.',
                        'Certificados SSL automáticos renovados para nodo.cinammon.net en el puerto 443.',
                        'Transferencia segura por SFTP en el puerto 2022 con compatibilidad directa para FileZilla y WinSCP.',
                        'Mejoras en el aislamiento de almacenamiento bajo /var/lib/cinammon/volumes.',
                    ],
                ],
                [
                    'version' => 'v2.3.2',
                    'date' => 'Octubre 2026',
                    'title' => 'Integración de MariaDB 11.4 y phpMyAdmin en el Panel',
                    'description' => 'Aprovisionamiento automatizado de bases de datos relacionales y acceso unificado a phpMyAdmin.',
                    'changes' => [
                        'Motor de base de datos actualizado a MariaDB 11.4 en el nodo de producción.',
                        'Generador automático de credenciales con prefijo único por usuario.',
                        'Botón de acceso directo a phpMyAdmin sin requerir configuración manual de host.',
                        'Soporte ampliado para conexiones remotas desde plugins de Minecraft y servidores MTA.',
                    ],
                ],
                [
                    'version' => 'v2.2.0',
                    'date' => 'Septiembre 2026',
                    'title' => 'Economía Comunitaria y Grifo Diario de Monedas',
                    'description' => 'Lanzamiento del sistema de recompensas diarias (faucet) para prolongación y mantenimiento de servidores.',
                    'changes' => [
                        'Botón de reclamo diario cada 24 horas directamente desde el panel principal.',
                        'Integración con Discord Bot para reclamos remotos mediante comando /claim.',
                        'Prolongación automática de servidores gratuitos sin requerir tarjeta de crédito.',
                        'Registro de transacciones e historial de saldo en el perfil de usuario.',
                    ],
                ],
                [
                    'version' => 'v2.1.0',
                    'date' => 'Agosto 2026',
                    'title' => 'Consola Interactiva en Tiempo Real y Telemetría',
                    'description' => 'Rediseño de la terminal en vivo con WebSockets protegidos y visualización de recursos.',
                    'changes' => [
                        'Consola en tiempo real con soporte para comandos de servidor y desplazamiento automático.',
                        'Métricas en vivo de porcentaje de CPU, consumo de memoria RAM y espacio de almacenamiento.',
                        'Botones de inicio, reinicio y apagado seguro con confirmación de estado.',
                        'Visor de registros de arranque del contenedor con coloreado de sintaxis.',
                    ],
                ],
                [
                    'version' => 'v2.0.0',
                    'date' => 'Julio 2026',
                    'title' => 'Lanzamiento de Cinammon Panel 2.0',
                    'description' => 'Reestructuración completa del panel sobre Laravel 11, Inertia.js y arquitectura de contenedores Docker.',
                    'changes' => [
                        'Catálogo de juegos y aplicaciones: Minecraft Paper, Multi Theft Auto, Node.js y PHP.',
                        'Interfaz Cyberpunk / Orbitron en modo oscuro nativo de alto contraste.',
                        'Autenticación reforzada con doble factor (2FA) y vinculación con Discord, Google y GitHub.',
                        'Sistema de tickets y soporte técnico integrado con el servidor de Discord oficial.',
                    ],
                ],
            ],
        ]);
    }
}
