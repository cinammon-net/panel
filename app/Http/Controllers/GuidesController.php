<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GuidesController extends Controller
{
    /**
     * Catálogo técnico de guías y documentación paso a paso.
     */
    public function index(): Response
    {
        return Inertia::render('Guides', [
            'guides' => $this->getGuides(),
        ]);
    }

    /**
     * Vista de guía individual por slug.
     */
    public function show(string $slug): Response
    {
        $validKeys = [
            'start', 'gratis', 'buy', 'mc-optimize', 'mc-addons', 'bots',
            'domains', 'databases', 'files', 'sftp-filezilla', 'dudas', 'amigos', 'team',
            'sftp-filezilla-puerto-2022', 'mariadb-phpmyadmin-gestion',
            'dominios-propios-cloudflare-dns', 'minecraft-paper-optimizaciones-aikar',
            'despliegue-web-nodejs-vitepress',
        ];

        // Mapeo de slugs largos a keys cortas
        $alias = [
            'sftp-filezilla-puerto-2022' => 'sftp-filezilla',
            'mariadb-phpmyadmin-gestion' => 'databases',
            'dominios-propios-cloudflare-dns' => 'domains',
            'minecraft-paper-optimizaciones-aikar' => 'mc-optimize',
            'despliegue-web-nodejs-vitepress' => 'bots',
        ];

        $targetKey = $alias[$slug] ?? $slug;

        if (!in_array($slug, $validKeys, true)) {
            abort(404);
        }

        return Inertia::render('Guides', [
            'currentSlug' => $targetKey,
        ]);
    }

    /**
     * Listado estructurado de guías técnicas reales del Nodo Cinammon 1.
     */
    protected function getGuides(): array
    {
        return [
            [
                'slug' => 'sftp-filezilla-puerto-2022',
                'title' => 'Conexión SFTP con FileZilla y WinSCP en el Puerto 2022',
                'category' => 'Acceso y Archivos',
                'read_time' => '3 min',
                'summary' => 'Configuración de clientes SFTP para transferir mapas, plugins y archivos con cifrado SSH seguro en el puerto 2022 del nodo.',
                'steps' => [
                    [
                        'title' => 'Localizar credenciales en el panel',
                        'content' => 'Accede a la pestaña Acceso SFTP dentro de la vista de gestión de tu servidor. Observa la dirección del nodo (nodo.cinammon.net), el puerto asignado (2022) y tu nombre de usuario con identificador de servidor (por ejemplo, nini.7b88d6e1).',
                    ],
                    [
                        'title' => 'Configurar FileZilla',
                        'content' => "Abre FileZilla y accede a Archivo > Gestor de Sitios > Nuevo Sitio. Selecciona Protocolo: SFTP - SSH File Transfer Protocol. En Servidor introduce nodo.cinammon.net y en Puerto escribe 2022. Modo de acceso: Normal. Introduce tu usuario y la contraseña de tu cuenta de Cinammon.",
                    ],
                    [
                        'title' => 'Comprobación de huella de clave SSH',
                        'content' => 'En la primera conexión, FileZilla mostrará un diálogo para verificar la huella del servidor SSH (ED25519/RSA). Marca la casilla para confiar siempre en este host y pulsa Aceptar. Tendrás acceso inmediato al directorio raíz /home/container.',
                    ],
                ],
            ],
            [
                'slug' => 'mariadb-phpmyadmin-gestion',
                'title' => 'Administración de Bases de Datos MariaDB 11.4 con phpMyAdmin',
                'category' => 'Bases de Datos',
                'read_time' => '4 min',
                'summary' => 'Creación de esquemas relacionales, obtención de credenciales y acceso directo a phpMyAdmin para servidores de juego y webs.',
                'steps' => [
                    [
                        'title' => 'Generar una base de datos en el panel',
                        'content' => 'Dentro del menú de tu servidor, pulsa en la sección Bases de Datos y haz clic en el botón Nueva Base de Datos. El panel provisionará automáticamente una base de datos con prefijo único, un usuario asignado y una contraseña de alta entropía.',
                    ],
                    [
                        'title' => 'Acceso a phpMyAdmin',
                        'content' => 'Haz clic en el botón Abrir en phpMyAdmin que figura en la tarjeta de la base de datos creada. La interfaz web de phpMyAdmin cargará de inmediato; introduce el usuario y contraseña proporcionados en el panel para iniciar sesión.',
                    ],
                    [
                        'title' => 'Conexión desde plugins y scripts',
                        'content' => 'Para enlazar la base de datos con un plugin (LuckPerms, CoreProtect) o backend Node/PHP, utiliza como Host la IP interna 172.18.0.1 (o 127.0.0.1 según la red de tu contenedor) y el puerto estándar 3306.',
                    ],
                ],
            ],
            [
                'slug' => 'dominios-propios-cloudflare-dns',
                'title' => 'Vinculación de Dominios y Subdominios Propios con Cloudflare',
                'category' => 'Redes y DNS',
                'read_time' => '5 min',
                'summary' => 'Cómo apuntar un dominio personalizado a la IP de tu servidor mediante registros A, CNAME y registros SRV para Minecraft.',
                'steps' => [
                    [
                        'title' => 'Identificar la IP y el puerto asignado',
                        'content' => 'En la pestaña Red y Puertos de tu servidor, comprueba la IP física del nodo (216.173.77.178) y el puerto público asignado a tu contenedor (por ejemplo, 25565 o 25569).',
                    ],
                    [
                        'title' => 'Crear registro A en tu panel DNS',
                        'content' => 'En Cloudflare o en tu registrador de dominio, añade un registro tipo A. Nombre: subdominio deseado (ej. mc o play). Contenido: 216.173.77.178. En el caso de servidores de juegos o protocolos no HTTP, desactiva el proxy naranja de Cloudflare (DNS Only).',
                    ],
                    [
                        'title' => 'Configurar registro SRV para omitir el puerto (Minecraft)',
                        'content' => 'Si tu puerto de Minecraft es diferente al estándar 25565, crea un registro SRV en Cloudflare: Servicio: _minecraft, Protocolo: TCP, Nombre: play, Prioridad: 0, Peso: 5, Puerto: tu_puerto_asignado, Destino: play.tudominio.com. Así tus jugadores podrán entrar directamente escribiendo play.tudominio.com.',
                    ],
                ],
            ],
            [
                'slug' => 'minecraft-paper-optimizaciones-aikar',
                'title' => 'Optimización de Rendimiento en Servidores Minecraft Paper',
                'category' => 'Juegos',
                'read_time' => '4 min',
                'summary' => 'Ajustes en paper-world-defaults.yml y flags de recolección de basura Java 21 para mantener 20 TPS sostenidos.',
                'steps' => [
                    [
                        'title' => 'Instalación del núcleo Paper',
                        'content' => 'Cinammon Network actualiza automáticamente los binarios de Paper. Puedes subir tu archivo paper.jar o purpur.jar por SFTP reemplazando el ejecutable principal en /home/container.',
                    ],
                    [
                        'title' => 'Configuración de distancia de simulación',
                        'content' => 'En server.properties, fija view-distance en 8 y simulation-distance en 5. Esto reduce drásticamente el cálculo de entidades y físicas en zonas alejadas de los jugadores sin mermar la visibilidad visual.',
                    ],
                    [
                        'title' => 'Flags de arranque ZGC / Aikar',
                        'content' => 'El contenedor arranca por defecto con flags de memoria optimizados para Java 21 LTS, eliminando paradas de recolector (stop-the-world) y repartiendo la carga de cálculo de chunks entre los hilos del procesador.',
                    ],
                ],
            ],
            [
                'slug' => 'despliegue-web-nodejs-vitepress',
                'title' => 'Publicación de Portales Web con Node.js, Vite y VitePress',
                'category' => 'Desarrollo Web',
                'read_time' => '4 min',
                'summary' => 'Instrucciones paso a paso para servir aplicaciones JavaScript y sitios estáticos directamente en tu servidor.',
                'steps' => [
                    [
                        'title' => 'Selección de la plantilla Node.js',
                        'content' => 'Crea un servidor seleccionando la plantilla Node / Vite. Dispondrás de Node 22 LTS y npm listos para usar.',
                    ],
                    [
                        'title' => 'Configuración del puerto de escucha',
                        'content' => 'En tu archivo de configuración (vite.config.ts o server.js), especifica host: "0.0.0.0" y el puerto que figure en la sección Red y Puertos de tu servidor en el panel.',
                    ],
                    [
                        'title' => 'Arranque continuo',
                        'content' => 'Ejecuta npm run build && npm run preview (o tu script de producción) desde la consola interactiva. La web estará disponible en tiempo real en la dirección asignada.',
                    ],
                ],
            ],
        ];
    }
}
