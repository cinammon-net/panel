/**
 * Contenido fijo de los canales comunitarios y biblioteca de guías.
 *
 * - Tarjeta de presentación (Components V2 + banner) en #general, #nuevas-cuentas, #compras,
 *   #reseñas, #proyectos y #sorteos: explica para qué es cada canal. Se mantiene con upsert().
 * - #guias (foro): guías oficiales escritas a partir de lo que hay de verdad en el panel
 *   (nombres de pestañas incluidos), un índice fijado y etiquetas. Las guías se editan en su sitio
 *   cuando cambia el texto (hash en sync-state `content.guides`).
 * - #sugerencias (foro): publicación fijada con cómo proponer algo y qué significa cada etiqueta.
 * - Relleno inicial (una vez): las cuentas, compras y reseñas recientes que el bot se saltó al
 *   arrancar los feeds se publican debajo de la presentación, de la más antigua a la más nueva.
 */
const crypto = require('node:crypto');

let env = null; // { discord, log, saveState, upsert, st, ctx, accent, ui, PANEL, BILLING, signupPost, purchasePost, reviewCard }

const V2 = 1 << 15;
const VIEW = 1n << 10n, SEND = 1n << 11n, SEND_THREADS = 1n << 38n, PUBLIC_THREADS = 1n << 35n, PRIVATE_THREADS = 1n << 36n;
const CONTENT_VERSION = 1;
const hash = (v) => crypto.createHash('sha1').update(JSON.stringify(v)).digest('hex');

function init(e) {
    env = e;
}

function state() {
    const st = env.st();
    st.content ??= { guides: {}, pins: {} };
    st.content.guides ??= {};
    st.content.pins ??= {};
    return st.content;
}

/* ------------------------------------------------------------ banners */

const BANNERS = {
    general: { title: 'GENERAL', subtitle: 'Charla de la comunidad', icon: 'welcome' },
    signups: { title: 'NUEVAS CUENTAS', subtitle: 'Quién se une a Cinammon', icon: 'join' },
    purchases: { title: 'COMPRAS', subtitle: 'Servicios nuevos y renovaciones', icon: 'plans' },
    reviews: { title: 'RESEÑAS', subtitle: 'Opiniones de clientes reales', icon: 'ranks' },
    showcase: { title: 'PROYECTOS', subtitle: 'Lo que la comunidad aloja aquí', icon: 'announcements' },
    giveaways: { title: 'SORTEOS', subtitle: 'Monedas, mejoras y servidores', icon: 'offers' },
};

/* ------------------------------------------------ tarjetas de los canales */

function channelPosts() {
    const { text, sep, row, linkBtn, container } = env.ui;
    const ch = env.ctx().layout.channels;
    const at = (k, fallback) => (ch[k] ? `<#${ch[k]}>` : fallback);
    const accent = env.accent();
    const msg = (...components) => ({ flags: V2, components, allowed_mentions: { parse: [] } });
    const P = env.PANEL, B = env.BILLING;
    const posts = [];

    if (ch.general) posts.push(['general', ch.general, msg(container(accent, [
        text('# Charla general\nEl sitio para hablar de lo que quieras: juegos, tus proyectos, ideas o simplemente pasar el rato.'),
        sep(),
        text([
            '### Cada cosa en su canal',
            `- **Dudas de servidores o del panel:** ${at('help', '#soporte')}; mira antes ${at('guides', '#guias')}.`,
            `- **Tu cuenta, pagos o un servidor caído:** ticket en ${at('tickets', '#tickets')}.`,
            `- **Enseñar lo que alojas:** ${at('showcase', '#proyectos')}.`,
            `- **Ideas para mejorar Cinammon:** ${at('suggestions', '#sugerencias')}.`,
            `- **Comandos del bot:** ${at('commands', '#comandos')}.`,
        ].join('\n')),
        text([
            '### Voz',
            'Entra en **Crear sala +** y el bot te crea una sala propia que puedes renombrar y gestionar. Se borra sola cuando se queda vacía.',
        ].join('\n')),
        text(`-# Elige qué avisos quieres recibir en ${at('welcome', '#bienvenida')}. Las normas están en ${at('rules', '#normas')}.`),
    ]))]);

    if (ch.signups) posts.push(['signups', ch.signups, msg(container(accent, [
        text('# Nuevas cuentas\nCada vez que alguien se registra en cinammon.net aparece aquí, sin que nadie tenga que hacer nada.'),
        sep(),
        text('Solo se muestra el nombre de usuario de la web y, si la persona ha vinculado su Discord, su mención. **Nunca** se publican correos ni datos personales.'),
        text('-# ¿Aún no tienes cuenta? Es gratis y con ella puedes conseguir monedas para un servidor sin pagar nada.'),
        sep(2),
        row(linkBtn('Crear mi cuenta', `${P}/register`), linkBtn('Entrar al panel', P)),
    ]))]);

    if (ch.purchases) posts.push(['purchases', ch.purchases, msg(container(accent, [
        text('# Compras\nServidores contratados, renovaciones y servidores gratuitos creados con monedas. Se publica solo.'),
        sep(),
        text([
            '### Qué se publica',
            '- El plan, la RAM y el precio por ciclo (día, semana, mes…).',
            '- El nombre de usuario de la web y su Discord si está vinculado.',
            '- Nada de correos, facturas ni datos de pago.',
        ].join('\n')),
        text([
            '### Servidor gratis',
            '1. Consigue monedas: `/diario` cada día (con racha), sorteos y eventos.',
            '2. Mira tu saldo con `/monedas`.',
            '3. Canjéalas en la tienda por un servidor gratuito.',
        ].join('\n')),
        sep(2),
        row(linkBtn('Ver planes', `${B}/store`), linkBtn('Servidor con monedas', `${B}/coins`)),
    ]))]);

    if (ch.reviews) posts.push(['reviews', ch.reviews, msg(container(accent, [
        text('# Reseñas\nOpiniones de personas con cuenta en Cinammon, publicadas tal cual llegan: buenas y malas.'),
        sep(),
        text([
            '### Deja la tuya',
            `Entra en el panel, menú **Reviews**, elige de 1 a 5 y escribe un comentario si quieres. Aparecerá aquí en un minuto.`,
            '',
            `Si algo no ha ido bien, cuéntanoslo también por ticket en ${at('tickets', '#tickets')}: así podemos arreglarlo.`,
        ].join('\n')),
        sep(2),
        row(linkBtn('Escribir una reseña', `${P}/reviews/create`), linkBtn('Ver planes', `${B}/store`)),
    ]))]);

    if (ch.showcase) posts.push(['showcase', ch.showcase, msg(container(accent, [
        text('# Proyectos\nEnseña tu servidor, bot o web alojado en Cinammon y consigue tus primeros jugadores o usuarios.'),
        sep(),
        text([
            '### Cómo presentarlo',
            '- **Nombre** y una frase de qué es.',
            '- **Cómo entrar:** IP o dominio, versión del juego, enlace de invitación o web.',
            '- **Qué lo hace especial:** modalidades, comandos, horario de eventos…',
            '- Una o dos **capturas**.',
        ].join('\n')),
        text([
            '### Normas del canal',
            '- Solo proyectos alojados en Cinammon.',
            '- Una presentación por proyecto; para novedades, responde en el hilo de tu mensaje.',
            '- Los comentarios, en hilo para que el canal se pueda leer.',
            '- Nada de invitaciones a otros servidores de hosting ni contenido que incumpla las normas.',
        ].join('\n')),
        text(`-# ¿Quieres tu propio dominio para el servidor? Mira la guía de dominios en ${at('guides', '#guias')}.`),
    ]))]);

    if (ch.giveaways) posts.push(['giveaways', ch.giveaways, msg(container(accent, [
        text('# Sorteos\nMonedas, mejoras y servidores gratuitos. Participar es un clic.'),
        sep(),
        text([
            '### Cómo funciona',
            '1. El staff publica el sorteo aquí con el premio, cuántos ganadores hay y cuándo termina.',
            '2. Pulsa **Participar**. Puedes salirte volviendo a pulsar.',
            '3. Al terminar, el bot elige a los ganadores al azar y los anuncia en este canal.',
        ].join('\n')),
        text([
            '### Para poder cobrar el premio',
            '- Ten tu cuenta de cinammon.net **vinculada** con `/vincular` (Ajustes → Perfil → Código para el bot).',
            `- Si ganas, abre un ticket en ${at('tickets', '#tickets')} si en 48 h no lo tienes en tu cuenta.`,
            '- Una cuenta por persona: las cuentas duplicadas quedan fuera.',
        ].join('\n')),
        text(`-# Para enterarte de cada sorteo, activa el aviso **Ofertas y sorteos** en ${at('welcome', '#bienvenida')}.`),
    ]))]);

    return posts;
}

/* ------------------------------------------------------------------ guías */

const GUIDE_TAGS = ['Empieza aquí', 'Minecraft', 'Bots', 'Web y Dominios', 'Bases de Datos', 'Archivos y copias'];

// `legacy`: título de la guía antigua equivalente, para editarla en su sitio en lugar de duplicarla.
const GUIDES = [
    {
        key: 'start', tag: 'Empieza aquí', title: 'Primeros pasos: tu primer servidor en Cinammon',
        body: () => [
            '## 1. Crea tu cuenta y consigue el servidor',
            `- Regístrate en ${env.PANEL}/register.`,
            `- **De pago:** elige plan en ${env.BILLING}/store. Pagas por días, semanas, meses o años.`,
            '- **Gratis:** junta monedas con `/diario` y sorteos, y canjéalas en la tienda.',
            '',
            '## 2. Las pestañas del servidor en el panel',
            '- **Consola:** encender, reiniciar, apagar y escribir comandos.',
            '- **Inicio:** versión de Java/Node, variables y comando de arranque.',
            '- **Archivos:** editor y subida de archivos (para muchos, mejor **Acceso SFTP**).',
            '- **Ajustes del juego:** las opciones típicas sin tocar archivos.',
            '- **Plugins / Mods:** instalar desde Modrinth en un clic.',
            '- **Bases de Datos**, **Red y Puertos**, **Subdominios**, **Copias de Seguridad** y **Usuarios**.',
            '',
            '## 3. Cómo se conecta la gente',
            'La dirección es la IP y el puerto que ves en la **Consola** (o en **Red y Puertos**). Si quieres algo como `play.tudominio.com`, mira la guía de dominios.',
            '',
            '## 4. Vincula Discord',
            'Panel → **Ajustes → Perfil → Código para el bot**, y aquí `/vincular codigo:`. Con eso controlas tu servidor desde Discord (`/servidores`, `/consola`) y recibes tus roles.',
            '',
            '## 5. Si algo falla',
            '1. Lee las últimas líneas de la **Consola**: casi siempre dicen el motivo.',
            '2. Busca en este foro (la barra de arriba).',
            '3. Pregunta en #soporte o abre un ticket si es de tu cuenta o un pago.',
        ],
    },
    {
        key: 'mc-optimize', tag: 'Minecraft', legacy: 'Primeros pasos y optimización en Minecraft (Paper / Purpur)',
        title: 'Minecraft: elegir versión, Java y quitar el lag',
        body: () => [
            '## 1. El software',
            '- **Paper** o **Purpur** para supervivencia y plugins. Rinden mucho mejor que Vanilla.',
            '- **Fabric**, **Forge** o **NeoForge** si quieres mods.',
            '- Vanilla solo para partidas pequeñas sin añadidos.',
            '',
            '## 2. La versión de Java (pestaña **Inicio → Imagen de Docker**)',
            '- 1.20.5 en adelante: **Java 21**',
            '- 1.18 a 1.20.4: **Java 17**',
            '- 1.17: **Java 16 o 17**',
            '- 1.16.5 o anterior: **Java 8 u 11**',
            'Cambia la imagen y **reinicia** el servidor. Si ves `UnsupportedClassVersionError`, es esto.',
            '',
            '## 3. Ajustes que más se notan',
            'En **Ajustes del juego** o en `server.properties`:',
            '- `view-distance` 8 a 10 y `simulation-distance` 6 a 8.',
            '- Pregenera el mapa con el plugin **Chunky** antes de abrir (`/chunky radius 3000` y `/chunky start`).',
            '- Limita granjas enormes y entidades sueltas; en Paper, `paper-world-defaults.yml` tiene límites por chunk.',
            '',
            '## 4. Encontrar la causa del lag',
            'Instala **Spark** desde **Plugins**, juega un rato con lag y ejecuta `/spark profiler start`, espera 2-3 minutos y `/spark profiler stop`. El enlace que da muestra qué plugin o chunk come el tiempo.',
            '',
            '## 5. La RAM',
            'Más RAM no arregla el lag de CPU. Si la consola dice `OutOfMemoryError` o el servidor se cierra con código **137**, entonces sí necesitas más: amplíala en la tienda.',
        ],
    },
    {
        key: 'mc-addons', tag: 'Minecraft', title: 'Minecraft: instalar plugins y mods sin romper nada',
        body: () => [
            '## Desde el panel (lo más fácil)',
            '1. Abre tu servidor → pestaña **Plugins** (o **Mods**).',
            '2. Busca en el catálogo de **Modrinth** y pulsa instalar: se baja la última versión estable compatible con tu servidor.',
            '3. **Reinicia** el servidor para que se cargue.',
            '',
            '## A mano',
            '- Plugins (Paper, Purpur, Spigot): el `.jar` va en la carpeta `plugins/`.',
            '- Mods (Fabric, Forge, NeoForge): en `mods/`. Los jugadores necesitan los mismos mods en su cliente.',
            '- Súbelos desde **Archivos** o por **Acceso SFTP**.',
            '',
            '## Antes de instalar',
            '- Crea una **copia de seguridad** (pestaña **Copias de Seguridad**). Si algo sale mal, la restauras.',
            '- Comprueba que el plugin es para **tu versión** exacta de Minecraft y tu software.',
            '- Fabric necesita **Fabric API** para casi todo; muchos mods de Forge no funcionan en NeoForge y al revés.',
            '- Descarga solo de Modrinth, Hangar, SpigotMC o CurseForge. Un `.jar` de origen dudoso puede robarte el servidor.',
            '',
            '## Si el servidor no arranca después',
            'Mira la **Consola**: el error suele nombrar el plugin. Muévelo fuera de `plugins/`, arranca, y busca una versión compatible.',
        ],
    },
    {
        key: 'bots', tag: 'Bots', legacy: 'Desplegar un bot de Discord, WhatsApp o Telegram 24/7',
        title: 'Bots de Discord, WhatsApp o Telegram 24/7',
        body: () => [
            '## 1. Sube el código',
            '- Por **Archivos** (puedes subir un `.zip` y descomprimirlo) o por **Acceso SFTP**.',
            '- No subas `node_modules` ni `venv`: se instalan solos al arrancar a partir de `package.json` o `requirements.txt`.',
            '',
            '## 2. Arranque',
            'En **Inicio** eliges la versión de Node.js o Python y el archivo principal (`index.js`, `main.py`…). Si tu bot usa `npm start`, comprueba que `package.json` tiene el script `start`.',
            '',
            '## 3. Tokens y claves',
            '- Nunca en el código ni en GitHub. Usa un `.env` (y añádelo a `.gitignore`) o las variables de **Inicio**.',
            '- Si se te escapa un token, **regénéralo** al momento en la web del servicio.',
            '',
            '## 4. Webhooks o una web dentro del bot',
            'Escucha en `0.0.0.0` y en el puerto asignado: `process.env.SERVER_PORT` en Node, `os.environ["SERVER_PORT"]` en Python. Lo ves en **Red y Puertos**.',
            '',
            '## 5. Discord: intents',
            'Si tu bot no ve mensajes o miembros, o sale `Used disallowed intents`: Developer Portal → tu app → **Bot** → activa **Server Members Intent** y **Message Content Intent**.',
            '',
            '## 6. WhatsApp',
            'La sesión se guarda en una carpeta (por ejemplo `auth_info` o `.wwebjs_auth`). No la borres o tendrás que escanear el QR otra vez. El QR sale en la **Consola**.',
            '',
            '## 7. Que no se caiga',
            'Captura los errores (`process.on("unhandledRejection", console.error)` en Node). Si el proceso termina, el panel lo marca como apagado: revisa la **Consola** para ver por qué.',
        ],
    },
    {
        key: 'domains', tag: 'Web y Dominios', legacy: 'Conectar tu dominio propio con Cloudflare o registros DNS',
        title: 'Tu dominio propio (play.tudominio.com) con Cloudflare',
        body: () => [
            '## Opción fácil: que el panel cree los registros',
            '_Disponible en servidores de pago._',
            '1. Tu dominio tiene que estar en Cloudflare (el plan gratuito vale).',
            '2. En Cloudflare: **Mi perfil → Tokens de API → Crear token**, plantilla **Editar DNS de zona**, y en **Recursos de zona** elige tu dominio.',
            '3. En el panel: tu servidor → **Subdominios → Conecta tu Cloudflare** y pega el token.',
            '4. **Añadir dominio**: escribe `play` (o lo que quieras) y elige el dominio.',
            'El panel crea el registro `A` y, si tu puerto no es el de por defecto, el `SRV`. Si borras el subdominio, se borran solos.',
            '',
            '## Opción manual',
            '**Minecraft Java**',
            '1. Registro `A`: nombre `play`, valor la **IP del nodo** (la de la Consola), **nube gris** (solo DNS, sin proxy).',
            '2. Si el puerto no es `25565`, registro `SRV`: servicio `_minecraft`, protocolo `_tcp`, nombre `play`, prioridad `0`, peso `5`, puerto **el tuyo**, destino `play.tudominio.com`.',
            '',
            '**Webs**',
            'Registro `A` a la IP o `CNAME` al destino que indique el panel. Aquí sí puedes dejar la nube naranja.',
            '',
            '## Si no conecta',
            '- Los cambios de DNS pueden tardar unos minutos.',
            '- Minecraft **Bedrock** no lee registros SRV: hay que poner el puerto a mano.',
            '- La nube naranja **no** funciona con juegos: tiene que estar en gris.',
        ],
    },
    {
        key: 'databases', tag: 'Bases de Datos', legacy: 'Cómo conectar tu aplicación o plugin a MySQL / MariaDB',
        title: 'Bases de datos MySQL / MariaDB para plugins y bots',
        body: () => [
            '## 1. Créala',
            'Tu servidor → **Bases de Datos → Nueva Base de Datos**. Te da host, puerto, nombre, usuario y contraseña. El apartado **¿Cómo conectarse?** de esa pestaña tiene los datos listos para copiar.',
            '',
            '## 2. Usa el host que pone el panel',
            'No escribas `localhost`: tu servidor corre en un contenedor y `localhost` es el propio contenedor. Copia el **host y el puerto** tal cual.',
            '',
            '## 3. Ejemplos',
            '**Plugins Java (LuckPerms, CoreProtect…)**: rellena host, puerto, base de datos, usuario y contraseña en su `config.yml`. Si piden URL JDBC:',
            '`jdbc:mysql://HOST:PUERTO/BASE?useSSL=false&allowPublicKeyRetrieval=true`',
            '**Node.js (mysql2)**: `mysql.createPool({ host, port, user, password, database })` con los datos en el `.env`.',
            '**Python (PyMySQL)**: `pymysql.connect(host=..., port=..., user=..., password=..., database=...)`.',
            '',
            '## 4. Verla y hacer copias',
            `- **Examinar Tablas** en la misma pestaña, o phpMyAdmin en https://database.cinammon.net.`,
            '- **Exportar .SQL** descarga un volcado completo: hazlo antes de cambios grandes.',
            '',
            '## Errores típicos',
            '- `Access denied for user`: usuario o contraseña mal copiados (cuidado con espacios).',
            '- `Unknown database`: el nombre lleva prefijo (`s12_…`); cópialo entero.',
            '- `ECONNREFUSED` o `Communications link failure`: host o puerto equivocados.',
        ],
    },
    {
        key: 'files', tag: 'Archivos y copias', title: 'Archivos por SFTP y copias de seguridad',
        body: () => [
            '## Subir archivos por SFTP',
            'Para mundos, modpacks o muchos archivos es mucho más rápido que el navegador.',
            '1. Tu servidor → **Acceso SFTP** y genera tu contraseña. **Solo se muestra una vez**: guárdala.',
            '2. Abre **FileZilla** o **WinSCP**, protocolo **SFTP**, y pon el host, el puerto y el usuario que te da el panel.',
            '3. Arrastra los archivos. Con el servidor **apagado** si vas a cambiar el mundo.',
            '',
            'Ese acceso solo abre los archivos de **ese** servidor. Cada persona con acceso tiene su propio usuario y puede revocar el suyo. Tras varios intentos fallidos se bloquea un rato.',
            '',
            '## Copias de seguridad',
            '- Pestaña **Copias de Seguridad → Crear Respaldo**. Tarda según el tamaño.',
            '- Haz una **siempre** antes de actualizar la versión, instalar plugins o mods o borrar cosas.',
            '- **Bloquear copia de seguridad** evita que se borre sin querer: úsalo con la copia buena.',
            '- **Restaurar** devuelve el servidor a ese momento y sustituye los archivos actuales.',
            '- Descárgate de vez en cuando una copia a tu ordenador: es tu seguro si algo sale muy mal.',
        ],
    },
    {
        key: 'team', tag: 'Empieza aquí', title: 'Dar acceso a tu equipo sin compartir tu contraseña',
        body: () => [
            '## Usuarios del servidor',
            '1. Tu servidor → **Usuarios → Invitar Usuario**.',
            '2. Escribe el correo de su cuenta de cinammon.net (tiene que estar registrada).',
            '3. Elige los **permisos** uno a uno: por ejemplo, consola y archivos sí, borrar copias de seguridad no. **Acceso total** solo a quien te fíes del todo.',
            '',
            'Puedes cambiar los permisos o quitar el acceso cuando quieras, y cada persona tiene su propio SFTP.',
            '',
            '## Ver quién ha hecho qué',
            'La pestaña **Actividad** guarda quién encendió, cambió archivos, entró por SFTP… Útil si algo desaparece.',
            '',
            '## Pasar el servidor a otra persona',
            '**Usuarios → Transferir Servidor**: el nuevo dueño pasa a ser el titular (y quien lo paga). No se puede deshacer tú solo.',
            '',
            '## Nunca',
            '- Compartas la contraseña de tu cuenta: con ella se puede pagar, borrar servidores y cambiar el correo.',
            '- Des acceso a alguien que te lo pide por privado "para ayudarte". El staff nunca lo hace así.',
        ],
    },
];

const TAG_COLOR = {
    'Empieza aquí': 0xec4899, Minecraft: 0x22c55e, Bots: 0x5865f2,
    'Web y Dominios': 0xf59e0b, 'Bases de Datos': 0x06b6d4, 'Archivos y copias': 0xa855f7,
};
const threadUrl = (id) => `https://discord.com/channels/${env.ctx().guild}/${id}`;

/** Parte el texto de una guía en bloques por cada "## Título". */
function sections(lines) {
    const out = [];
    for (const line of lines) {
        if (line.startsWith('## ') || !out.length) out.push([]);
        out[out.length - 1].push(line.startsWith('## ') ? `### ${line.slice(3)}` : line);
    }
    return out.map((b) => b.join('\n').trim()).filter(Boolean);
}

/** Guía como tarjeta: cabecera, bloques separados y botones (panel, duda, ticket, anterior/siguiente). */
function guidePayload(g, threads) {
    const { text, sep, row, container } = env.ui;
    const L = env.ctx().layout;
    const lines = g.body();
    const blocks = sections(lines);
    const minutes = Math.max(1, Math.round(lines.join(' ').split(/\s+/).length / 180));
    const i = GUIDES.indexOf(g);
    const prev = GUIDES.slice(0, i).reverse().find((x) => threads[x.key]);
    const next = GUIDES.slice(i + 1).find((x) => threads[x.key]);
    const nav = [
        prev ? { type: 2, style: 5, label: `Anterior: ${prev.title}`.slice(0, 80), url: threadUrl(threads[prev.key]) } : null,
        next ? { type: 2, style: 5, label: `Siguiente: ${next.title}`.slice(0, 80), url: threadUrl(threads[next.key]) } : null,
        threads.__index ? { type: 2, style: 5, label: 'Índice', url: threadUrl(threads.__index) } : null,
    ].filter(Boolean);
    const comps = [
        text(`-# GUÍA OFICIAL · ${g.tag.toUpperCase()} · ${minutes} min de lectura\n# ${g.title}`),
        sep(2),
    ];
    blocks.forEach((b, n) => {
        if (n) comps.push(sep(1, false));
        comps.push(text(b));
    });
    comps.push(sep(2));
    comps.push(text(`-# ¿Te has atascado? Pulsa **Tengo una duda** y se abre tu pregunta en <#${L.channels.help}>. Si es de tu cuenta o un pago, abre un ticket.`));
    comps.push(row(
        { type: 2, style: 5, label: 'Abrir el panel', url: env.PANEL },
        { type: 2, style: 1, label: 'Tengo una duda', custom_id: 'sup:ask' },
        { type: 2, style: 2, label: 'Abrir ticket', custom_id: 'ticket:open' },
    ));
    if (nav.length) comps.push(row(...nav));
    return { flags: V2, components: [container(TAG_COLOR[g.tag] ?? env.accent(), comps)], allowed_mentions: { parse: [] } };
}

/** Índice fijado: una fila por guía con su botón, agrupadas por etiqueta. */
function indexPayload(threads) {
    const { text, sep, row, container } = env.ui;
    const L = env.ctx().layout;
    const comps = [
        text('-# GUÍAS OFICIALES DE CINAMMON\n# Empieza aquí\nGuías escritas por el equipo con los nombres reales de las pestañas del panel. Elige la tuya y pulsa **Abrir**; también puedes usar la barra de búsqueda o filtrar por etiqueta.'),
    ];
    for (const tag of GUIDE_TAGS) {
        const list = GUIDES.filter((g) => g.tag === tag && threads[g.key]);
        if (!list.length) continue;
        // Discord admite 40 componentes por mensaje: el título de la etiqueta va dentro de su primera guía
        comps.push(sep(1));
        list.forEach((g, n) => {
            const words = g.body().join(' ').split(/\s+/).length;
            comps.push({
                type: 9,
                components: [text(`${n ? '' : `### ${tag}\n`}**${g.title}**\n-# ${Math.max(1, Math.round(words / 180))} min de lectura`)],
                accessory: { type: 2, style: 5, label: 'Abrir', url: threadUrl(threads[g.key]) },
            });
        });
    }
    comps.push(sep(2));
    comps.push(text(`### ¿No encuentras lo tuyo?\nPregunta en <#${L.channels.help}>: si sale mucho, lo convertimos en guía.${L.channels.suggestions ? ` Para proponer una guía nueva, usa <#${L.channels.suggestions}>.` : ''}`));
    comps.push(row(
        { type: 2, style: 1, label: 'Hacer una pregunta', custom_id: 'sup:ask' },
        { type: 2, style: 5, label: 'Abrir el panel', url: env.PANEL },
    ));
    return { flags: V2, components: [container(env.accent(), comps)], allowed_mentions: { parse: [] } };
}

/** Etiquetas de un foro: añade las que falten sin tocar las que ya hay; `moderated` para las de estado. */
async function ensureTags(forum, wanted) {
    const tags = [...(forum.available_tags || [])];
    let changed = false;
    for (const w of wanted) {
        const t = tags.find((x) => x.name === w.name);
        if (!t) { tags.push({ name: w.name, moderated: !!w.moderated }); changed = true; }
        else if (w.moderated !== undefined && !!t.moderated !== !!w.moderated) { t.moderated = !!w.moderated; changed = true; }
    }
    if (!changed) return forum;
    return env.discord('PATCH', `/channels/${forum.id}`, { available_tags: tags.slice(0, 20) }, 'Etiquetas del foro');
}

async function allThreads(forumId) {
    const g = env.ctx().guild;
    const active = await env.discord('GET', `/guilds/${g}/threads/active`).then((r) => r.threads || []).catch(() => []);
    const archived = await env.discord('GET', `/channels/${forumId}/threads/archived/public?limit=100`).then((r) => r.threads || []).catch(() => []);
    return [...active.filter((t) => t.parent_id === forumId), ...archived];
}

/**
 * Crea o actualiza una publicación del bot en un foro. Devuelve el id del hilo.
 * `payload` = mensaje con tarjeta (Components V2); si no, `content` en texto.
 */
async function upsertThread(forum, slot, { name, content, payload, tagIds }, known) {
    const message = payload || { content, allowed_mentions: { parse: [] } };
    const h = hash([name, message, tagIds]);
    let prev = slot.get();
    if (!prev && known) prev = { thread: known.id, hash: null };
    if (prev) {
        const exists = await env.discord('GET', `/channels/${prev.thread}`).then(() => true).catch((e) => e.status !== 404);
        if (exists && prev.hash === h) return prev.thread;
        if (exists) {
            await env.discord('PATCH', `/channels/${prev.thread}`, { archived: false, name: name.slice(0, 100), applied_tags: tagIds }).catch((e) => env.log(`[SYNC] guía ${name}: ${e.message}`));
            try {
                // De texto a tarjeta: se vacía el texto en la misma edición
                await env.discord('PATCH', `/channels/${prev.thread}/messages/${prev.thread}`, payload && !prev.v2 ? { content: '', embeds: [], ...message } : message);
                slot.set({ thread: prev.thread, hash: h, v2: !!payload });
                env.saveState();
                return prev.thread;
            } catch (e) {
                if (!payload || prev.v2) throw e;
                // Discord no deja convertir ese mensaje: se rehace la publicación
                env.log(`[SYNC] ${name}: se vuelve a publicar como tarjeta (${e.message})`);
                await env.discord('DELETE', `/channels/${prev.thread}`, undefined, 'Publicación rehecha como tarjeta').catch(() => {});
            }
        }
    }
    const t = await env.discord('POST', `/channels/${forum.id}/threads`, {
        name: name.slice(0, 100),
        auto_archive_duration: 10080,
        applied_tags: tagIds,
        message,
    }, 'Guía oficial');
    slot.set({ thread: t.id, hash: h, v2: !!payload });
    env.saveState();
    return t.id;
}

async function syncGuides() {
    const L = env.ctx().layout;
    if (!L.channels.guides) return;
    let forum = await env.discord('GET', `/channels/${L.channels.guides}`);
    forum = await ensureTags(forum, GUIDE_TAGS.map((name) => ({ name })));
    const tagId = new Map((forum.available_tags || []).map((t) => [t.name, t.id]));
    const S = state();

    // Solo el equipo abre guías; la comunidad responde dentro de cada una.
    if (!S.guidesLocked) {
        const ow = (forum.permission_overwrites || []).map((o) => {
            if (o.id !== L.roles.member) return o;
            return { ...o, allow: String((BigInt(o.allow) | VIEW | SEND_THREADS) & ~SEND), deny: String(BigInt(o.deny) | SEND) };
        });
        await env.discord('PATCH', `/channels/${forum.id}`, {
            permission_overwrites: ow,
            topic: 'Guías oficiales de Cinammon: primeros pasos, Minecraft, bots, dominios, bases de datos y archivos. Responde dentro de cada guía si tienes dudas; para preguntas nuevas usa #soporte.',
            default_sort_order: 0,
        }, 'Guías: solo el equipo publica').catch((e) => env.log(`[SYNC] permisos de #guias: ${e.message}`));
        S.guidesLocked = true;
        env.saveState();
    }

    const existing = await allThreads(forum.id);
    // Enlaces conocidos (para los botones de navegación); si se crea alguna guía, segunda pasada.
    const threads = Object.fromEntries(GUIDES.filter((g) => S.guides[g.key]?.thread).map((g) => [g.key, S.guides[g.key].thread]));
    if (S.pins.guides?.thread) threads.__index = S.pins.guides.thread;
    const before = JSON.stringify(threads);
    for (const pass of [1, 2]) {
    if (pass === 2 && JSON.stringify(threads) === before) break;
    for (const g of GUIDES) {
        const known = g.legacy && !S.guides[g.key] ? existing.find((t) => t.name === g.legacy) : null;
        try {
            threads[g.key] = await upsertThread(forum, {
                get: () => S.guides[g.key],
                set: (v) => { S.guides[g.key] = v; },
            }, { name: g.title, payload: guidePayload(g, threads), tagIds: tagId.get(g.tag) ? [tagId.get(g.tag)] : [] }, known);
        } catch (e) {
            env.log(`[SYNC] guía ${g.key}: ${e.message}`);
        }
    }
    }

    // Índice fijado (un foro solo admite una publicación fijada)
    try {
        const idx = await upsertThread(forum, {
            get: () => S.pins.guides,
            set: (v) => { S.pins.guides = v; },
        }, { name: 'Empieza aquí: índice de guías', payload: indexPayload(threads), tagIds: tagId.get('Empieza aquí') ? [tagId.get('Empieza aquí')] : [] });
        if (!S.pins.guidesPinned) {
            await env.discord('PATCH', `/channels/${idx}`, { flags: 2 }, 'Fijar índice');
            S.pins.guidesPinned = true;
            env.saveState();
        }
    } catch (e) {
        env.log(`[SYNC] índice de guías: ${e.message}`);
    }
}

/* ------------------------------------------------------------ sugerencias */

async function syncSuggestions() {
    const L = env.ctx().layout;
    if (!L.channels.suggestions) return;
    let forum = await env.discord('GET', `/channels/${L.channels.suggestions}`);
    forum = await ensureTags(forum, [
        { name: 'Pendiente', moderated: false },
        { name: 'En estudio', moderated: true },
        { name: 'Aceptada', moderated: true },
        { name: 'Implementada', moderated: true },
        { name: 'Descartada', moderated: true },
    ]);
    const S = state();
    if (!S.suggestionsTopic) {
        await env.discord('PATCH', `/channels/${forum.id}`, {
            topic: 'Una idea por publicación, con un título claro. Busca antes por si ya existe y, si es así, apóyala respondiendo en ella. El estado (En estudio, Aceptada, Implementada, Descartada) lo pone el equipo.',
        }).catch(() => {});
        S.suggestionsTopic = true;
        env.saveState();
    }
    const content = [
        '## Cómo proponer una sugerencia',
        'Aquí decides con nosotros qué se añade a Cinammon: juegos y eggs nuevos, planes, cosas del panel, de la tienda o de este Discord.',
        '',
        '**Antes de publicar**',
        '- Busca con la barra de arriba: si ya existe, responde en ella para apoyarla en vez de repetirla.',
        '- Una idea por publicación. Si tienes tres, abre tres.',
        '',
        '**Cómo escribirla**',
        '- **Título:** la idea en una frase. Mejor "Añadir egg de Terraria" que "Sugerencia".',
        '- **Qué** quieres, **por qué** te vendría bien y, si puedes, un ejemplo o captura.',
        '- Ponle la etiqueta **Pendiente**.',
        '',
        '**Qué pasa después**',
        '- **En estudio:** el equipo la está mirando.',
        '- **Aceptada:** se hará; avisaremos aquí cuando esté.',
        '- **Implementada:** ya está disponible.',
        '- **Descartada:** no encaja ahora; te explicamos por qué en la propia publicación.',
        '',
        `-# Los fallos y problemas de tu cuenta no van aquí: ticket en <#${L.channels.tickets}>.`,
    ].join('\n');
    try {
        const tid = await upsertThread(forum, {
            get: () => S.pins.suggestions,
            set: (v) => { S.pins.suggestions = v; },
        }, { name: 'Lee esto antes de proponer', content, tagIds: [] });
        if (!S.pins.suggestionsPinned) {
            await env.discord('PATCH', `/channels/${tid}`, { flags: 2 }, 'Fijar guía de sugerencias');
            S.pins.suggestionsPinned = true;
            env.saveState();
        }
    } catch (e) {
        env.log(`[SYNC] guía de sugerencias: ${e.message}`);
    }
}

/* ------------------------------------------------------- ajustes de canal */

async function tuneChannels() {
    const S = state();
    if (S.tuned === CONTENT_VERSION) return;
    const ch = env.ctx().layout.channels;
    // #proyectos: una presentación cada 6 h por persona; los comentarios van en hilo.
    if (ch.showcase) await env.discord('PATCH', `/channels/${ch.showcase}`, { rate_limit_per_user: 21600 }, 'Proyectos: una presentación cada 6 h').catch((e) => env.log(`[SYNC] #proyectos: ${e.message}`));
    S.tuned = CONTENT_VERSION;
    env.saveState();
}

/* ------------------------------------------------------ relleno inicial */

/**
 * Los feeds se arrancaron sin publicar lo que ya había. Esto publica una vez lo reciente
 * (máximo 15 por canal) para que los canales no estén vacíos.
 */
async function backfill(data) {
    const S = state();
    if (S.backfilled) return;
    const ch = env.ctx().layout.channels;
    const st = env.st();
    if (!st.activity || !st.community?.reviewsSeeded) return; // aún no se han sembrado los feeds
    const byDate = (a, b) => new Date(a.at || 0) - new Date(b.at || 0);
    if (ch.signups) {
        const list = (data.signups || []).filter((u) => st.activity.users.includes(u.id)).sort(byDate).slice(-15);
        for (const u of list) await env.discord('POST', `/channels/${ch.signups}/messages`, env.signupPost(u, data.stats?.users));
    }
    if (ch.purchases && Array.isArray(data.purchases)) {
        const list = data.purchases.filter((e) => st.activity.events.includes(e.key)).sort(byDate).slice(-15);
        for (const e of list) await env.discord('POST', `/channels/${ch.purchases}/messages`, env.purchasePost(e));
    }
    if (ch.reviews && Array.isArray(data.reviews)) {
        const list = data.reviews.filter((r) => st.community.reviewsSeen.includes(r.id)).sort(byDate).slice(-15);
        for (const r of list) await env.discord('POST', `/channels/${ch.reviews}/messages`, env.reviewCard(r));
    }
    S.backfilled = true;
    env.saveState();
    env.log('[SYNC] Relleno inicial de #nuevas-cuentas, #compras y #reseñas hecho.');
}

/** Un paso del bucle: tarjetas, foros, ajustes y relleno inicial (en ese orden, para que la tarjeta quede arriba). */
async function sync(data) {
    for (const [key, channel, payload] of channelPosts()) {
        await env.upsert(key, channel, payload, BANNERS[key] ? { name: key, ...BANNERS[key] } : undefined)
            .catch((e) => env.log(`[SYNC] tarjeta ${key}: ${e.message}`));
    }
    await tuneChannels().catch((e) => env.log(`[SYNC] ajustes de canales: ${e.message}`));
    await syncGuides().catch((e) => env.log(`[SYNC] guías: ${e.message}`));
    await syncSuggestions().catch((e) => env.log(`[SYNC] sugerencias: ${e.message}`));
    await backfill(data).catch((e) => env.log(`[SYNC] relleno inicial: ${e.message}`));
}

module.exports = { init, sync, GUIDES };
