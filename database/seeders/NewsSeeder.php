<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class NewsSeeder extends Seeder
{
    /**
     * Población de noticias periodísticas para news.cinammon.net y el panel oficial.
     * Toda la información refleja fielmente la infraestructura real del Nodo Cinammon 1.
     */
    public function run(): void
    {
        $author = User::where('id', 2)->first() ?: User::first();
        $authorId = $author?->id;

        // Limpiamos noticias anteriores
        Post::query()->delete();

        $articles = [
            [
                'title' => 'Despliegue y ejecución de portales web con Node.js y VitePress',
                'category' => 'guias',
                'summary' => 'Guía completa sobre cómo compilar y servir documentación moderna o portales comunitarios en Cinammon Network utilizando VitePress y Node 22.',
                'content' => "El auge de la documentación estructurada y los portales informativos ligeros ha consolidado a VitePress como una de las herramientas más eficientes del ecosistema JavaScript. En Cinammon Network, cualquier usuario puede desplegar su propio entorno Node.js con soporte nativo para Vite, VitePress, Astro o Express con escasos clics.\n\nPara iniciar un proyecto con VitePress en el panel:\n\n1. Crea un servidor seleccionando el entorno Node.js / Vite en el catálogo de aplicaciones.\n2. Conéctate vía SFTP a través del puerto 2022 utilizando tus credenciales de panel.\n3. Sube los archivos de tu proyecto al directorio raíz del contenedor (/home/container).\n4. Configura el script de ejecución en package.json asegurando que el comando de escucha apunte al puerto asignado en la pestaña de Puertos de tu servidor (por ejemplo, el puerto 25569).\n5. Inicia el servidor desde la consola interactiva y comprueba en vivo los registros de compilación.\n\nEl contenedor mantiene aislamiento estricto y reinicio automático en caso de fallo, garantizando que tu portal permanezca en línea 24/7 sin requerir gestión manual de demonios en el sistema operativo anfitrión.",
                'picture' => '/storage/news/vitepress-console.png',
                'is_pinned' => true,
                'views_count' => 1420,
                'likes_count' => 68,
                'created_at' => Carbon::now()->subHours(2),
            ],
            [
                'title' => 'Nodo Cinammon 1 en producción: orquestación con demonio Wings y conectividad directa',
                'category' => 'actualizacion',
                'summary' => 'El primer nodo central de la red aloja servidores de juegos, aplicaciones web y bases de datos bajo el demonio Wings con certificados SSL válidos.',
                'content' => "La infraestructura de Cinammon Network opera sobre su nodo principal 'Nodo Cinammon 1' (nodo.cinammon.net). Este servidor físico centraliza la orquestación de contenedores a través del demonio Wings, enlazado de manera segura con el panel web mediante protocolo HTTPS en el puerto 443.\n\nCada servidor creado por los miembros de la comunidad dispone de un espacio de almacenamiento dedicado (/var/lib/cinammon/volumes), cuotas fijadas de memoria y ciclos de CPU, y asignación de puertos exclusiva. El protocolo SFTP corre de forma nativa en el puerto 2022, permitiendo la transferencia fluida de mapas, plugins y archivos de configuración sin depender de servicios FTP convencionales.\n\nLa arquitectura está diseñada para crecer modularmente: futuros nodos podrán incorporarse al clúster manteniendo la misma experiencia unificada de administración.",
                'picture' => '/storage/news/nodes-wings.png',
                'is_pinned' => false,
                'views_count' => 1180,
                'likes_count' => 54,
                'created_at' => Carbon::now()->subHours(8),
            ],
            [
                'title' => 'Gestor integral de bases de datos MariaDB 11.4 con acceso por phpMyAdmin en el nodo',
                'category' => 'actualizacion',
                'summary' => 'Los usuarios pueden crear instancias de MariaDB y administrarlas directamente con phpMyAdmin desde la interfaz del panel.',
                'content' => "El almacenamiento de datos persistentes es un pilar crítico tanto para servidores de juegos (perfiles de usuarios en Minecraft, bases de datos SQL de MTA) como para aplicaciones web. Cinammon Network integra un motor MariaDB 11.4 en el nodo.\n\nDesde el panel de control, los administradores pueden generar bases de datos con un único clic, obteniendo de inmediato el nombre de la base de datos, usuario generado y contraseña cifrada. Además, el panel proporciona un enlace directo al phpMyAdmin oficial de la red, facilitando la importación de esquemas SQL, copias de seguridad de tablas y consultas interactivas sin necesidad de clientes externos de escritorio.",
                'picture' => '/storage/news/database-cluster.png',
                'is_pinned' => false,
                'views_count' => 890,
                'likes_count' => 42,
                'created_at' => Carbon::now()->subDay(),
            ],
            [
                'title' => 'Servidores de Minecraft Paper y Multi Theft Auto optimizados con puertos dedicados',
                'category' => 'comunidad',
                'summary' => 'Detalles sobre las plantillas preparadas para Paper 1.20+ y servidores de San Andreas Multiplayer / MTA con baja latencia.',
                'content' => "La plataforma cuenta con plantillas preconfiguradas para los títulos más populares de la comunidad. En Minecraft, la plantilla Paper incluye el entorno de ejecución Java 21, optimizaciones automáticas de flags de memoria (Aikar's flags) y compatibilidad directa con plugins Spigot y Bukkit.\n\nPara los aficionados a Multi Theft Auto (MTA), el entorno incluye los binarios de servidor actualizados y configuración de recursos en el puerto UDP asignado. Ambos entornos se gestionan desde la consola interactiva con comandos en tiempo real, registro de eventos y botones de apagado seguro.",
                'picture' => '/storage/news/servers-cluster.png',
                'is_pinned' => false,
                'views_count' => 1340,
                'likes_count' => 79,
                'created_at' => Carbon::now()->subDays(2),
            ],
            [
                'title' => 'Sistema de grifo diario y recompensas en monedas para renovación de servidores',
                'category' => 'comunidad',
                'summary' => 'Cada día los miembros de Cinammon pueden reclamar monedas gratuitas para extender la duración de sus servidores sin coste.',
                'content' => "El modelo comunitario de Cinammon premia la fidelidad y la actividad constante. Cada 24 horas, los usuarios pueden ingresar al panel y pulsar el botón de reclamo de créditos diarios (faucet).\n\nLas monedas acumuladas pueden emplearse para ampliar la vigencia de servidores existentes o adquirir recursos adicionales en la tienda interna. Este esquema permite que proyectos emergentes, comunidades de amigos y desarrolladores independientes mantengan sus servidores operativos de forma indefinida sin depender de suscripciones obligatorias.",
                'picture' => '/storage/news/dashboard-overview.png',
                'is_pinned' => false,
                'views_count' => 1650,
                'likes_count' => 91,
                'created_at' => Carbon::now()->subDays(3),
            ],
            [
                'title' => 'Seguridad y aislamiento: contenedores con acceso SFTP seguro en el puerto 2022',
                'category' => 'guias',
                'summary' => 'Cómo conectarse por SFTP a tu servidor utilizando FileZilla, WinSCP o Cyberduck usando el puerto 2022 del nodo.',
                'content' => "Todos los servidores de Cinammon Network funcionan dentro de entornos aislados gestionados por Docker. La transferencia de archivos no utiliza FTP tradicional en texto plano, sino SFTP protegido por SSH en el puerto 2022 del nodo.\n\nPara conectarse:\n1. Abre tu cliente SFTP preferido (FileZilla o WinSCP).\n2. En Servidor / Host introduce nodo.cinammon.net.\n3. En Puerto escribe 2022.\n4. En Usuario introduce tu identificador de usuario seguido del punto y el identificador corto de tu servidor (ejemplo: usuario.7b88d6e1).\n5. Introduce la contraseña de tu cuenta de Cinammon.\n\nEsta configuración cifra todos los paquetes de subida y bajada, garantizando que tus archivos y contraseñas nunca viajen en claro por la red.",
                'picture' => '/storage/news/status-telemetry.png',
                'is_pinned' => false,
                'views_count' => 1020,
                'likes_count' => 61,
                'created_at' => Carbon::now()->subDays(4),
            ],
        ];

        foreach ($articles as $data) {
            Post::create([
                'user_id' => $authorId,
                'title' => $data['title'],
                'category' => $data['category'],
                'summary' => $data['summary'],
                'content' => $data['content'],
                'picture' => $data['picture'],
                'is_pinned' => $data['is_pinned'],
                'views_count' => $data['views_count'],
                'likes_count' => $data['likes_count'],
                'created_at' => $data['created_at'],
                'updated_at' => $data['created_at'],
            ]);
        }
    }
}
