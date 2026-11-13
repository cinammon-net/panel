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
     */
    public function run(): void
    {
        $author = User::where('id', 2)->first() ?: User::first();
        $authorId = $author?->id;

        // Limpiamos noticias anteriores (post_likes se borra por cascada)
        Post::query()->delete();

        $articles = [
            [
                'title' => 'Cinammon Network culmina el despliegue de su troncal de fibra de 40 Gbps y reduce la latencia europea un 42%',
                'category' => 'mantenimiento',
                'summary' => 'La nueva infraestructura interconecta directamente Madrid y Frankfurt con túneles dedicados de fibra oscura y mitigación autónoma de ataques DDoS en capa de transporte.',
                'content' => "La dirección técnica de Cinammon Network ha anunciado esta mañana la culminación con éxito del proyecto de modernización integral de su troncal de datos europea. La nueva red, estructurada sobre enlaces redundantes de 40 Gbps de fibra oscura, interconecta de forma directa los centros de procesamiento de Madrid y Frankfurt, ofreciendo una latencia media inferior a los 8 milisegundos para la península ibérica y menos de 18 milisegundos para el centro y norte de Europa.\n\nSegún el informe técnico remitido por el departamento de telecomunicaciones, la nueva topología de conmutación inteligente analiza los patrones de tráfico en tiempo real y neutraliza ataques volumétricos de denegación de servicio distribuido (DDoS) antes de que alcancen los contenedores de los clientes. Durante los ensayos de estrés realizados en la madrugada del pasado martes, los cortafuegos perimetrales absorbieron picos de tráfico malicioso de hasta 260 Gbps sin registrar incremento en los tiempos de respuesta de las aplicaciones en producción.\n\nLos servidores de juegos de alta demanda y simuladores multijugador —incluyendo modalidades masivas de Minecraft, Grand Theft Auto y servidores dedicados en Java y C++— son los directos beneficiarios de este despliegue. Los administradores comunitarios han corroborado una estabilidad absoluta en la frecuencia de actualización (TPS constante en 20.00) incluso con cientos de jugadores concurrentes explorando terrenos no generados.\n\n«Nuestro compromiso no es únicamente ofrecer almacenamiento o potencia de cálculo, sino garantizar que la información viaje por autopistas digitales limpias, con rutas simétricas y sin cuellos de botella», declaró la dirección de operaciones. La inversión asegura además canales de transferencia ilimitados y réplicas nocturnas automatizadas en almacenamiento secundario independiente.",
                'picture' => '/logos/cinammon-status.png',
                'is_pinned' => true,
                'views_count' => 1840,
                'likes_count' => 86,
                'created_at' => Carbon::now()->subHours(2),
            ],
            [
                'title' => 'El programa de servidores gratuitos por créditos diarios supera los diez mil despliegues comunitarios',
                'category' => 'comunidad',
                'summary' => 'El modelo de economía colaborativa del panel permite a programadores nóveles y comunidades emergentes mantener nodos permanentes sin necesidad de tarjeta de pago.',
                'content' => "Lo que nació hace seis meses como una prueba piloto para facilitar el aprendizaje tecnológico se ha consolidado como uno de los mayores éxitos de la plataforma. El programa de créditos gratuitos de Cinammon Network ha superado esta semana la barrera de los diez mil servidores creados y mantenidos exclusivamente a través de recompensas comunitarias.\n\nEl funcionamiento se basa en un grifo diario: cualquier usuario registrado puede reclamar monedas cada 24 horas a través de la interfaz web, acumularlas y canjearlas por tiempo de procesamiento en procesadores AMD de alto rendimiento. Además, la participación activa en el foro técnico y en los canales oficiales de Discord permite a los usuarios acceder a bonificaciones extraordinarias de recursos.\n\nNumerosos colectivos juveniles y desarrolladores de bots en Node.js y Python han enviado testimonios a la redacción destacando la estabilidad del entorno. A diferencia de otros proveedores que ofrecen planes de prueba recortados o con apagados forzados, Cinammon mantiene los mismos contenedores Docker aislados, con acceso SFTP completo y protección perimetral, que los planes empresariales.\n\nDesde el equipo de desarrollo han confirmado que el grifo de créditos seguirá siendo una prioridad central del proyecto, con nuevos incentivos orientados a la publicación de guías comunitarias y la creación de plugins de código abierto.",
                'picture' => '/logos/cinammon-panel.png',
                'is_pinned' => false,
                'views_count' => 1250,
                'likes_count' => 64,
                'created_at' => Carbon::now()->subHours(6),
            ],
            [
                'title' => 'Blindaje de acceso: Implantación de arquitectura Zero Trust y doble factor de autenticación biométrica',
                'category' => 'actualizacion',
                'summary' => 'El panel generaliza la autenticación en dos fases con códigos TOTP cifrados y verificación estricta de origen para consolas Wings y sesiones SFTP.',
                'content' => "Ante la proliferación de campañas automatizadas de relleno de credenciales en internet, Cinammon Network ha desplegado de manera generalizada su nuevo sistema de protección en dos pasos (2FA). La medida permite a cualquier usuario proteger su cuenta con aplicaciones estándar de códigos temporales de seis dígitos y salvaguardar su panel con códigos de emergencia de un solo uso.\n\nLa renovación trasciende el inicio de sesión web: las conexiones de terminal mediante WebSockets seguros y las sesiones del protocolo SFTP incorporan ahora validación de tokens de corta duración y comprobación de huella de equipo. En caso de detectarse intentos de acceso desde ubicaciones inusuales, el sistema activa de inmediato una cuarentena temporal y alerta al titular por correo electrónico.\n\nLos expertos en seguridad de la red destacan que ningún dato biométrico ni clave privada abandona los equipos de los usuarios. Todo el cómputo de verificación se procesa mediante primitivas criptográficas auditadas sobre librerías OpenSSL de última hornada.",
                'picture' => '/logos/cinammon-admin.png',
                'is_pinned' => false,
                'views_count' => 920,
                'likes_count' => 47,
                'created_at' => Carbon::now()->subHours(14),
            ],
            [
                'title' => 'Lanzamiento del demonio Wings v1.0.4: Optimización del consumo en reposo y recolector ZGC en Java 21',
                'category' => 'actualizacion',
                'summary' => 'La actualización del demonio de contenedores reduce el uso base de memoria a menos de 45 MiB y erradica los microcortes de sincronización en mundos extensos.',
                'content' => "El equipo de desarrollo de infraestructura ha liberado esta semana la versión de mantenimiento v1.0.4 del demonio Wings. El componente, encargado de gobernar los contenedores de software en cada servidor físico, introduce una reconstrucción de su bucle de eventos que rebaja el consumo de memoria en reposo en más de un 60%.\n\nLa principal innovación técnica reside en la integración optimizada con los motores de recolección de basura ZGC y Shenandoah incluidos en las compilaciones de Java 21 LTS. Gracias a esta arquitectura, las pausas de recolección de memoria se sitúan por debajo de un milisegundo, erradicando los tirones en simulaciones de físicas complejas y servidores con cientos de extensiones cargadas.\n\nAsimismo, el módulo de transferencia de ficheros incorpora compresión multihilo para copias de seguridad masivas, lo que permite restaurar mundos de varias decenas de gigabytes en cuestión de segundos.",
                'picture' => '/logos/cinammon-wings.png',
                'is_pinned' => false,
                'views_count' => 780,
                'likes_count' => 39,
                'created_at' => Carbon::now()->subDay(),
            ],
            [
                'title' => 'Convocado el Torneo Intercomunitario de Creación de Mundos con premios en servidores dedicados',
                'category' => 'evento',
                'summary' => 'Más de cuarenta comunidades competirán durante el último fin de semana del mes en pruebas de diseño arquitectónico y desarrollo de mecánicas lúdicas.',
                'content' => "La redacción de El Diario de Cinammon tiene el honor de anunciar la apertura formal del periodo de inscripciones para el Campeonato Inter-Servidores 2026. El certamen congregará a constructores, guionistas y programadores de comunidades hispanohablantes en un entorno compartido con recursos ilimitados.\n\nUn panel de jueces externos puntuará los proyectos en función de tres criterios objetivos: coherencia estilística, optimización de renderizado para clientes modestos y originalidad de las mecánicas interactivas implementadas. Las tres comunidades ganadoras recibirán un año completo de hosting en hardware dedicado Enterprise con procesadores de frecuencia ultra alta y soporte técnico prioritario.\n\nLas bases completas del certamen y la ficha de registro para representantes de clan ya pueden consultarse en el tablón oficial de la comunidad y en los canales designados de Discord.",
                'picture' => '/logos/cinammon-store.png',
                'is_pinned' => false,
                'views_count' => 1120,
                'likes_count' => 73,
                'created_at' => Carbon::now()->subDays(2),
            ],
            [
                'title' => 'Tribuna Editorial: La vigencia del hosting de proximidad frente a la uniformidad de las grandes nubes',
                'category' => 'opinion',
                'summary' => 'Reflexión sobre las ventajas técnicas y humanas del software abierto, el soporte directo y la soberanía de datos ante plataformas comerciales impersonales.',
                'content' => "En un panorama tecnológico cada vez más dominado por tres o cuatro macrocorporaciones multinacionales que imponen tarifas opacas y tratan a los proyectos emergentes como simples renglones contables, la existencia de redes independientes como Cinammon cobra un valor testimonial y práctico de primer orden.\n\nCuando un administrador abre una incidencia en nuestra plataforma, no responde un contestador robotizado ni un formulario prediseñado en otro continente: responde un técnico que comprende la arquitectura del servidor, que conoce la importancia de una partida comunitaria un viernes por la tarde y que tiene potestad para ajustar parámetros en el nodo.\n\nEsa cercanía, combinada con hardware de última generación y software de código abierto rigurosamente auditado, demuestra que internet sigue perteneciendo a quienes crean, experimentan y colaboran sin intermediarios. Mantener esa independencia accesible para todos continúa siendo el principio rector de esta casa editorial.",
                'picture' => null,
                'is_pinned' => false,
                'views_count' => 1430,
                'likes_count' => 95,
                'created_at' => Carbon::now()->subDays(3),
            ],
            [
                'title' => 'Transición completa a cabinas de almacenamiento NVMe PCIe 5.0 con velocidad sostenida de 12 GB/s',
                'category' => 'mantenimiento',
                'summary' => 'Las operaciones de lectura masiva y sincronización de bases de datos se aceleran hasta cuatro veces tras la sustitución de las unidades de estado sólido.',
                'content' => "La división de sistemas ha dado por finalizada la migración de las unidades de disco en todos los armarios del centro de datos principal. Las nuevas unidades de estado sólido sobre bus PCIe 5.0 garantizan tasas de transferencia que cuadruplican los estándares de la generación previa, permitiendo lecturas sostenidas de 12.000 MB por segundo con latencias inferiores a diez microsegundos.\n\nLa repercusión en el uso cotidiano es inmediata: el arranque en frío de entornos pesados de producción se produce en menos de tres segundos, y las copias instantáneas de bases de datos relacionales ya no generan bloqueo de tablas ni incremento de carga en CPU.\n\nCada bloque de datos se replica además en espejo síncrono sobre dos controladores físicos separados, garantizando tolerancia absoluta ante cualquier fallo imprevisto de componentes de almacenamiento.",
                'picture' => '/logos/cinammon-database.png',
                'is_pinned' => false,
                'views_count' => 640,
                'likes_count' => 31,
                'created_at' => Carbon::now()->subDays(4),
            ],
            [
                'title' => 'Nueva suite de publicación web instantánea para portales de clanes con Astro y VitePress',
                'category' => 'anuncio',
                'summary' => 'Los administradores pueden publicar la documentación de su comunidad y portales estáticos con certificados TLS automáticos y DNS instantáneo.',
                'content' => "Cinammon Network ha presentado esta mañana su nueva herramienta de despliegue web automatizado para proyectos comunitarios. A través de este módulo integrado en el panel, cualquier usuario puede vincular un repositorio o subir ficheros estáticos de frameworks modernos como Astro, VitePress o Hugo y disfrutar de publicación perimetral inmediata.\n\nEl sistema se encarga de aprovisionar el subdominio gratuito bajo cinammon.net, gestionar la expedición y renovación periódica de los certificados criptográficos Let's Encrypt y distribuir los ficheros en una red perimetral acelerada.\n\nLa suite incluye además métricas en tiempo real de visitas, registros de errores y compatibilidad total con dominios personalizados propios adquiridos por el cliente.",
                'picture' => null,
                'is_pinned' => false,
                'views_count' => 520,
                'likes_count' => 28,
                'created_at' => Carbon::now()->subDays(5),
            ],
        ];

        foreach ($articles as $data) {
            Post::create([
                'author_id' => $authorId,
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
