/**
 * Funciones de comunidad y utilidades del servidor de Discord:
 * - Roles de notificación opt-in y panel interactivo en #bienvenida
 * - Canales comunitarios (foros #sugerencias y #guias, #proyectos, #resenas, #sorteos, voz temporal)
 * - Salas de voz temporales ("Crear sala +")
 * - Feed automático de reseñas verificadas desde el panel
 * - Auto-ayuda rápida para errores frecuentes en #soporte
 * - Sorteos interactivos con /sorteo
 */

const fs = require('node:fs');
const crypto = require('node:crypto');

const VIEW = 1n << 10n;
const SEND = 1n << 11n;
const MANAGE_CHANNELS = 1n << 4n;
const CONNECT = 1n << 20n;
const SPEAK = 1n << 21n;
const MOVE_MEMBERS = 1n << 24n;
const MANAGE_THREADS = 1n << 34n;
const PUBLIC_THREADS = 1n << 35n;
const PRIVATE_THREADS = 1n << 36n;
const SEND_THREADS = 1n << 38n;
const THREADS = PUBLIC_THREADS | PRIVATE_THREADS | SEND_THREADS;

const EPH = 64;
const V2 = 1 << 15;

const NOTIFY_ROLES = [
    { key: 'notify:status', name: 'Alertas de Red', label: 'Alertas de red', color: 0xef4444, desc: 'Incidencias, cortes y mantenimientos en vivo' },
    { key: 'notify:offers', name: 'Ofertas y Temporadas', label: 'Ofertas y sorteos', color: 0xfacc15, desc: 'Promociones, cupones y nuevos sorteos' },
    { key: 'notify:updates', name: 'Novedades y Eggs', label: 'Novedades', color: 0xec4899, desc: 'Nuevos juegos, mejoras del panel y cambios' },
    { key: 'notify:mc', name: 'Comunidad Minecraft', label: 'Minecraft', color: 0x10b981, desc: 'Guías, optimización y avisos de Minecraft' },
    { key: 'notify:dev', name: 'Bots y Desarrollo', label: 'Bots y Dev', color: 0x8b5cf6, desc: 'Node.js, Python, bases de datos y webs' },
];

const STARTER_GUIDES = [
    {
        tag: 'Minecraft',
        title: 'Primeros pasos y optimización en Minecraft (Paper / Purpur)',
        body: [
            '**1. Elige el software adecuado**',
            'Para supervivencia o plugins usa **Paper** o **Purpur**. Evita Vanilla puro si planeas tener más de 4-5 jugadores o usar plugins.',
            '',
            '**2. Elige la versión de Java correcta**',
            '- Minecraft 1.20.5+ y 1.21+: **Java 21**',
            '- Minecraft 1.18 – 1.20.4: **Java 17**',
            '- Minecraft 1.12 – 1.16.5: **Java 8 u 11**',
            'Puedes cambiarla en **Panel → tu servidor → Inicio → Imagen de Docker**.',
            '',
            '**3. Evita tirones de TPS**',
            '- Baja `simulation-distance` a `6` o `8` y `view-distance` a `8` o `10` en `server.properties`.',
            '- Pregenera el mapa con Chunky antes de abrir al público.',
            '- Si tienes lag puntual, instala el plugin **Spark** y ejecuta `/spark profiler start`.',
        ].join('\n'),
    },
    {
        tag: 'Bots',
        title: 'Desplegar un bot de Discord, WhatsApp o Telegram 24/7',
        body: [
            '**1. Variables y tokens seguros**',
            'Nunca subas tu token a GitHub ni lo pegues en chat público. Guárdalo en `.env` o en la pestaña **Inicio** del panel.',
            '',
            '**2. Puerto e IP para webhooks / Express**',
            'Si tu bot levanta un servidor web o webhook, escucha siempre en `0.0.0.0` y usa `process.env.SERVER_PORT` (o la variable `PORT` asignada).',
            '',
            '**3. Bots de Discord: Intents obligatorios**',
            'Si tu bot no lee mensajes o miembros, activa **Server Members Intent** y **Message Content Intent** en Discord Developer Portal → Bot.',
        ].join('\n'),
    },
    {
        tag: 'Web y Dominios',
        title: 'Conectar tu dominio propio con Cloudflare o registros DNS',
        body: [
            '**1. Para webs (HTTP / HTTPS)**',
            'Crea un registro `A` apuntando a la IP de tu servidor web, o `CNAME` al subdominio indicado en tu panel.',
            '',
            '**2. Para Minecraft con dominio propio**',
            '1. Crea un registro `A` (por ejemplo `play` → IP numérica del nodo, **sin proxy naranja** / solo DNS).',
            '2. Si tu puerto no es `25565`, añade un registro `SRV`: servicio `_minecraft`, protocolo `_tcp`, prioridad `0`, peso `5`, puerto `<tu_puerto>`, destino `play.tudominio.com`.',
        ].join('\n'),
    },
    {
        tag: 'Bases de Datos',
        title: 'Cómo conectar tu aplicación o plugin a MySQL / MariaDB',
        body: [
            '**1. Crea la base de datos en el panel**',
            'Entra a **tu servidor → Bases de Datos → Nueva Base de Datos** para generar host, puerto, usuario, contraseña y nombre de esquema.',
            '',
            '**2. No uses `localhost` si es externa**',
            'Usa siempre el **Endpoint (Host)** que aparece en la tarjeta de la base de datos en el panel, junto con el puerto `3306`.',
            '',
            '**3. Cadena JDBC típica para plugins Java**',
            '`jdbc:mysql://<HOST>:<PUERTO>/<BASE_DE_DATOS>?useSSL=false&allowPublicKeyRetrieval=true`',
        ].join('\n'),
    },
];

const SUPPORT_TIPS = [
    {
        key: 'java_version',
        match: /UnsupportedClassVersionError|compiled by a more recent version of the Java Runtime|class file version \d+/i,
        title: 'Error de versión de Java detectado',
        body: 'El `.jar` del servidor o un plugin está compilado con una versión de Java superior a la actual.\n\n**Solución:** entra en **Panel → tu servidor → Inicio → Imagen de Docker**, selecciona **Java 21** (para 1.20.5+ / 1.21+) o **Java 17** (para 1.18-1.20.4) y reinicia.',
    },
    {
        key: 'oom',
        match: /OutOfMemoryError|Exit code 137|SIGKILL|Killed\s*$|Java heap space/i,
        title: 'Posible falta de memoria RAM (OOM / Exit 137)',
        body: 'El proceso superó la RAM asignada y el sistema lo cerró para proteger el nodo.\n\n**Qué revisar:**\n- Revisa cuántos plugins o mods tienes cargados y reduce `view-distance` / `simulation-distance`.\n- Si acabas de generar chunks rápidamente o tienes muchos jugadores, considera ampliar la RAM desde la tienda.',
    },
    {
        key: 'port_bind',
        match: /EADDRINUSE|FAILED TO BIND TO PORT|Address already in use/i,
        title: 'Conflicto de puerto al iniciar',
        body: 'Tu servidor o aplicación intenta usar un puerto ocupado o distinto al asignado.\n\n**Solución:**\n- Usa `0.0.0.0` como host y el puerto asignado en la pestaña **Red y Puertos** (en bots web suele ser `process.env.SERVER_PORT`).\n- En Minecraft, deja `server-ip=` vacío en `server.properties`.',
    },
    {
        key: 'discord_token_intents',
        match: /Used disallowed intents|DisallowedIntent|Improper token has been passed|TOKEN_INVALID/i,
        title: 'Error de token o Intents de Discord',
        body: 'Discord rechazó la conexión del bot por token inválido o Intents desactivados.\n\n**Solución:** entra en **Discord Developer Portal → tu app → Bot**, activa **Server Members Intent** y **Message Content Intent**, y si regeneraste el token actualiza la variable en **Inicio** o en tu `.env`.',
    },
    {
        key: 'db_conn',
        match: /ECONNREFUSED.*3306|Access denied for user|Communications link failure|Unknown database/i,
        title: 'Error de conexión con la base de datos',
        body: 'Tu servidor no logra conectar con MySQL/MariaDB con esos datos.\n\n**Solución:** verifica en **Panel → tu servidor → Bases de Datos** que el **Host/Endpoint**, usuario, contraseña y nombre exacto de base de datos coincidan (evita `localhost` si conectas a la base de datos del panel).',
    },
];

let env = null;
const supportCooldown = new Map(); // userId -> timestamp
const voiceMembers = new Map(); // userId -> channelId
const voiceCreating = new Set(); // userId

function init(deps) {
    env = deps;
}

function state() {
    const st = env.st();
    st.community ??= { reviewsSeeded: false, reviewsSeen: [], tempVoice: {}, giveaways: {} };
    st.community.reviewsSeen ??= [];
    st.community.tempVoice ??= {};
    st.community.giveaways ??= {};
    return st.community;
}

function staffIds(L) {
    return [L.roles?.owner, L.roles?.admin, L.roles?.moderator, L.roles?.helper].filter(Boolean);
}

function isStaffMember(member) {
    if (!member) return false;
    try {
        const perms = BigInt(member.permissions || '0');
        if ((perms & 8n) || (perms & 32n)) return true;
    } catch {}
    const L = env.ctx().layout;
    const allowed = new Set(staffIds(L));
    return (member.roles || []).some((r) => allowed.has(r));
}

function baseOverwrites(L, mode) {
    const { ctx } = env;
    const memberRole = L.roles?.member;
    const appId = ctx().appId;
    const guild = ctx().guild;
    const staff = staffIds(L);

    if (mode === 'voice_creator') {
        const list = [
            { id: guild, type: 0, allow: memberRole ? '0' : String(VIEW | CONNECT), deny: memberRole ? String(VIEW) : '0' },
            { id: appId, type: 1, allow: String(VIEW | CONNECT | MOVE_MEMBERS | MANAGE_CHANNELS), deny: '0' },
        ];
        if (memberRole) list.push({ id: memberRole, type: 0, allow: String(VIEW | CONNECT | SPEAK), deny: '0' });
        for (const id of staff) list.push({ id, type: 0, allow: String(VIEW | CONNECT | MOVE_MEMBERS | MANAGE_CHANNELS), deny: '0' });
        return list;
    }

    const memberAllow = mode === 'forum'
        ? VIEW | SEND | SEND_THREADS
        : mode === 'community_text'
            ? VIEW | SEND | PUBLIC_THREADS | SEND_THREADS
            : VIEW;
    const memberDeny = mode === 'readonly' ? SEND | THREADS : 0n;

    const list = [
        {
            id: guild,
            type: 0,
            allow: memberRole ? '0' : String(memberAllow),
            deny: memberRole ? String(VIEW) : String(memberDeny),
        },
        {
            id: appId,
            type: 1,
            allow: String(VIEW | SEND | THREADS | MANAGE_THREADS),
            deny: '0',
        },
    ];
    if (memberRole) {
        list.push({ id: memberRole, type: 0, allow: String(memberAllow), deny: String(memberDeny) });
    }
    for (const id of staff) {
        list.push({ id, type: 0, allow: String(VIEW | SEND | THREADS | MANAGE_THREADS), deny: '0' });
    }
    return list;
}

function saveLayout() {
    fs.writeFileSync(env.layoutPath, JSON.stringify(env.ctx().layout, null, 2));
}

/* ----------------------------------------------------- roles de notificación */

async function ensureNotificationRoles() {
    const L = env.ctx().layout;
    L.roles ??= {};
    const existing = await env.discord('GET', `/guilds/${env.ctx().guild}/roles`);
    let changed = false;

    for (const def of NOTIFY_ROLES) {
        if (L.roles[def.key] && existing.some((r) => r.id === L.roles[def.key])) continue;
        const foundByName = existing.find((r) => r.name.toLowerCase() === def.name.toLowerCase());
        if (foundByName) {
            L.roles[def.key] = foundByName.id;
            changed = true;
            continue;
        }
        const created = await env.discord('POST', `/guilds/${env.ctx().guild}/roles`, {
            name: def.name,
            color: def.color,
            hoist: false,
            mentionable: false,
            permissions: '0',
        }, `Rol de notificación: ${def.name}`);
        L.roles[def.key] = created.id;
        changed = true;
        env.log(`[SYNC] Rol ${def.name} creado (${created.id}).`);
    }

    if (changed) saveLayout();
}

async function syncRolePicker() {
    const L = env.ctx().layout;
    const ch = L.channels?.welcome;
    if (!ch) return;
    const ready = NOTIFY_ROLES.every((r) => L.roles?.[r.key]);
    if (!ready) return;

    const { text, sep, row, container } = env.ui;
    const lines = NOTIFY_ROLES.map((r) => `<@&${L.roles[r.key]}> — ${r.desc}`).join('\n');
    const buttons = NOTIFY_ROLES.map((r) => ({
        type: 2,
        style: 2,
        label: r.label,
        custom_id: `role:toggle:${r.key}`,
    }));

    const payload = {
        flags: V2,
        components: [container(env.accent(), [
            text('## Elige tus avisos\nActiva solo los avisos que te interesen para evitar menciones innecesarias. Puedes activarlos o quitarlos en cualquier momento.'),
            sep(),
            text(lines),
            sep(),
            row(...buttons),
        ])],
        allowed_mentions: { parse: [] },
    };

    await env.upsert('notify_roles', ch, payload);
}

/* -------------------------------------------------- canales comunitarios */

async function ensureChannelValid(id) {
    if (!id) return false;
    return env.discord('GET', `/channels/${id}`).then(() => true).catch((e) => e.status !== 404);
}

async function seedGuidesForum(channel) {
    const tagByName = new Map((channel.available_tags || []).map((t) => [t.name, t.id]));
    for (const g of STARTER_GUIDES) {
        const tagId = tagByName.get(g.tag);
        await env.discord('POST', `/channels/${channel.id}/threads`, {
            name: g.title,
            applied_tags: tagId ? [tagId] : [],
            message: {
                content: g.body,
                allowed_mentions: { parse: [] },
            },
        }, 'Guía inicial').catch((e) => env.log(`[SYNC] guía inicial (${g.title}): ${e.message}`));
    }
}

async function ensureCommunityChannels() {
    const L = env.ctx().layout;
    L.channels ??= {};
    let changed = false;

    const specs = [
        {
            key: 'suggestions',
            name: '├・sugerencias',
            type: 15,
            parentKey: 'community',
            mode: 'forum',
            topic: 'Propuestas para mejorar Cinammon Network: nuevos eggs, planes, panel o Discord.',
            extra: {
                default_auto_archive_duration: 10080,
                default_thread_rate_limit_per_user: 60,
                available_tags: [
                    { name: 'Pendiente' },
                    { name: 'En estudio' },
                    { name: 'Aceptada' },
                    { name: 'Implementada' },
                ],
            },
        },
        {
            key: 'guides',
            name: '├・guias',
            type: 15,
            parentKey: 'support',
            mode: 'forum',
            topic: 'Guías prácticas de Minecraft, bots de WhatsApp/Telegram, dominios y bases de datos.',
            extra: {
                default_auto_archive_duration: 10080,
                available_tags: [
                    { name: 'Minecraft' },
                    { name: 'Bots' },
                    { name: 'Web y Dominios' },
                    { name: 'Bases de Datos' },
                ],
            },
            onCreated: seedGuidesForum,
        },
        {
            key: 'showcase',
            name: '├・proyectos',
            type: 0,
            parentKey: 'community',
            mode: 'community_text',
            topic: 'Enseña tu servidor, bot o web alojada en Cinammon y consigue tus primeros usuarios.',
        },
        {
            key: 'reviews',
            name: '├・resenas',
            type: 0,
            parentKey: 'store',
            mode: 'readonly',
            topic: 'Reseñas verificadas enviadas por clientes desde el panel.',
        },
        {
            key: 'giveaways',
            name: '├・sorteos',
            type: 0,
            parentKey: 'community',
            mode: 'readonly',
            topic: 'Sorteos activos de monedas, mejoras y servidores gratuitos. Participa en un clic.',
        },
        {
            key: 'invites',
            name: '├・invitaciones',
            type: 0,
            parentKey: 'community',
            mode: 'readonly',
            topic: 'Consigue tu enlace personal, invita a tus amigos y sube en el ranking.',
        },
        {
            key: 'voiceCreator',
            name: 'Crear sala +',
            type: 2,
            parentKey: 'community',
            mode: 'voice_creator',
        },
    ];

    for (const spec of specs) {
        if (await ensureChannelValid(L.channels[spec.key])) continue;
        const parentId = L.categories?.[spec.parentKey] || L.categories?.community || null;
        const body = {
            name: spec.name,
            type: spec.type,
            ...(parentId ? { parent_id: parentId } : {}),
            ...(spec.topic ? { topic: spec.topic } : {}),
            permission_overwrites: baseOverwrites(L, spec.mode),
            ...(spec.extra || {}),
        };
        try {
            const created = await env.discord('POST', `/guilds/${env.ctx().guild}/channels`, body, `Canal comunitario ${spec.name}`);
            L.channels[spec.key] = created.id;
            changed = true;
            env.log(`[SYNC] Canal ${spec.name} creado (${created.id}).`);
            if (spec.onCreated) await spec.onCreated(created);
        } catch (e) {
            env.log(`[SYNC] crear ${spec.name}: ${e.message}`);
        }
    }

    if (changed) saveLayout();
}

/* ----------------------------------------------------- reseñas verificadas */

function reviewCard(r) {
    const { text, sep, row, linkBtn, container, cut, ts } = env.ui;
    const score = Math.max(1, Math.min(5, Number(r.rating) || 5));
    const who = `**${cut(r.author || 'Cliente', 60)}**${r.discord_id ? ` (<@${r.discord_id}>)` : ''}`;
    const body = r.comment ? cut(r.comment, 900) : 'Sin comentario escrito.';
    const color = score >= 4 ? 0x10b981 : score === 3 ? 0xfacc15 : 0xf59e0b;

    return {
        flags: V2,
        components: [container(color, [
            text(`### Reseña verificada · ${score}/5`),
            text(who),
            sep(),
            text(body),
            text(`-# ${ts(r.at, 'R')} · Verificada en panel.cinammon.net`),
            row(linkBtn('Ver planes', `${env.BILLING}/store`), linkBtn('Ir al panel', env.PANEL)),
        ])],
        allowed_mentions: { parse: [] },
    };
}

async function syncReviews(reviews) {
    if (!Array.isArray(reviews)) return;
    const ch = env.ctx().layout.channels?.reviews;
    const S = state();
    const first = !S.reviewsSeeded;
    if (first) S.reviewsSeeded = true;
    let changed = first;

    for (const r of [...reviews].reverse()) {
        if (S.reviewsSeen.includes(r.id)) continue;
        if (!first && ch) {
            await env.discord('POST', `/channels/${ch}/messages`, reviewCard(r));
        }
        S.reviewsSeen.push(r.id);
        changed = true;
    }

    S.reviewsSeen = S.reviewsSeen.slice(-300);
    if (changed) env.saveState();
}

/* ----------------------------------------------- salas de voz temporales */

function seedVoiceStates(states) {
    if (!Array.isArray(states)) return;
    for (const vs of states) {
        if (!vs?.user_id) continue;
        if (vs.channel_id) voiceMembers.set(vs.user_id, vs.channel_id);
        else voiceMembers.delete(vs.user_id);
    }
}

function countInChannel(channelId) {
    let n = 0;
    for (const chId of voiceMembers.values()) {
        if (chId === channelId) n++;
    }
    return n;
}

async function cleanupTempRoom(channelId) {
    const S = state();
    if (!S.tempVoice[channelId]) return;
    if (countInChannel(channelId) > 0) return;
    await env.discord('DELETE', `/channels/${channelId}`, undefined, 'Sala de voz temporal vacía').catch((e) => {
        if (e.status !== 404) env.log(`[VOICE] borrar sala ${channelId}: ${e.message}`);
    });
    delete S.tempVoice[channelId];
    env.saveState();
}

async function onVoiceStateUpdate(d) {
    if (!d?.user_id) return;
    const L = env.ctx().layout;
    const prevChannel = voiceMembers.get(d.user_id) || null;
    const nextChannel = d.channel_id || null;

    if (nextChannel) voiceMembers.set(d.user_id, nextChannel);
    else voiceMembers.delete(d.user_id);

    if (prevChannel && prevChannel !== nextChannel) {
        await cleanupTempRoom(prevChannel);
    }

    const creatorId = L.channels?.voiceCreator;
    if (!creatorId || nextChannel !== creatorId) return;
    if (d.member?.user?.bot || voiceCreating.has(d.user_id)) return;

    voiceCreating.add(d.user_id);
    try {
        const displayName = (d.member?.nick || d.member?.user?.global_name || d.member?.user?.username || 'Usuario')
            .replace(/[\r\n]+/g, ' ')
            .trim()
            .slice(0, 60) || 'Usuario';

        const memberRole = L.roles?.member;
        const staff = staffIds(L);
        const overwrites = [
            { id: env.ctx().guild, type: 0, allow: '0', deny: String(VIEW) },
            { id: env.ctx().appId, type: 1, allow: String(VIEW | CONNECT | MOVE_MEMBERS | MANAGE_CHANNELS), deny: '0' },
            { id: d.user_id, type: 1, allow: String(VIEW | CONNECT | SPEAK | MOVE_MEMBERS | MANAGE_CHANNELS), deny: '0' },
        ];
        if (memberRole) overwrites.push({ id: memberRole, type: 0, allow: String(VIEW | CONNECT | SPEAK), deny: '0' });
        for (const id of staff) overwrites.push({ id, type: 0, allow: String(VIEW | CONNECT | MOVE_MEMBERS | MANAGE_CHANNELS), deny: '0' });

        const room = await env.discord('POST', `/guilds/${env.ctx().guild}/channels`, {
            name: `Sala · ${displayName}`,
            type: 2,
            ...(L.categories?.community ? { parent_id: L.categories.community } : {}),
            permission_overwrites: overwrites,
        }, `Sala temporal para ${displayName}`);

        const S = state();
        S.tempVoice[room.id] = { ownerId: d.user_id, createdAt: Date.now() };
        env.saveState();

        try {
            await env.discord('PATCH', `/guilds/${env.ctx().guild}/members/${d.user_id}`, { channel_id: room.id }, 'Mover a su sala temporal');
            voiceMembers.set(d.user_id, room.id);
        } catch (e) {
            env.log(`[VOICE] mover a ${d.user_id}: ${e.message}`);
            voiceMembers.delete(d.user_id);
            await cleanupTempRoom(room.id);
        }
    } catch (e) {
        env.log(`[VOICE] crear sala temporal: ${e.message}`);
    } finally {
        voiceCreating.delete(d.user_id);
    }
}

/* ------------------------------------------- auto-ayuda rápida en #soporte */

function matchSupportTip(text) {
    if (!text || text.length < 6) return null;
    for (const tip of SUPPORT_TIPS) {
        if (tip.match.test(text)) return tip;
    }
    return null;
}

async function maybeHelpInSupport(message) {
    const L = env.ctx().layout;
    if (!L.channels?.help || message.channel_id !== L.channels.help) return false;
    if (!message.author || message.author.bot) return false;

    const tip = matchSupportTip(message.content);
    if (!tip) return false;

    const key = `${message.author.id}:${tip.key}`;
    const last = supportCooldown.get(key) || 0;
    if (Date.now() - last < 120_000) return false;
    supportCooldown.set(key, Date.now());

    const { text, sep, container } = env.ui;
    const ticketsMention = L.channels.tickets ? `<#${L.channels.tickets}>` : 'soporte';
    const guidesMention = L.channels.guides ? `<#${L.channels.guides}>` : 'las guías';

    await env.discord('POST', `/channels/${message.channel_id}/messages`, {
        flags: V2,
        components: [container(env.accent(), [
            text(`### ${tip.title}\n${tip.body}`),
            sep(),
            text(`-# Si tras probar esto sigue fallando, revisa ${guidesMention} o abre un ticket en ${ticketsMention}.`),
        ])],
        message_reference: { message_id: message.id, fail_if_not_exists: false },
        allowed_mentions: { parse: [], replied_user: false },
    }).catch((e) => env.log(`[SUPPORT] auto-ayuda: ${e.message}`));

    return true;
}

/* ----------------------------------------------------------------- sorteos */

function giveawayMessage(g) {
    const { text, sep, row, container, ts } = env.ui;
    const epoch = Math.floor(g.endsAt / 1000);
    const count = g.participants.length;
    const partLabel = count === 1 ? '1 participante' : `${count} participantes`;

    if (g.ended) {
        const winnersText = g.winnerIds.length
            ? g.winnerIds.map((id) => `<@${id}>`).join(', ')
            : 'Nadie participó en el sorteo.';
        return {
            flags: V2,
            components: [container(g.winnerIds.length ? 0x10b981 : 0x71717a, [
                text(`## Sorteo finalizado: ${g.prize}`),
                sep(),
                text(`**Ganadores:** ${winnersText}\n**Participantes:** ${partLabel}\n**Organizado por:** <@${g.hostId}>`),
                text(`-# Cerrado ${ts(new Date(g.endedAt || Date.now()).toISOString(), 'R')}`),
                row({ type: 2, style: 2, label: `Finalizado (${count})`, custom_id: `giveaway:done:${g.id}`, disabled: true }),
            ])],
            allowed_mentions: { parse: [] },
        };
    }

    return {
        flags: V2,
        components: [container(0xec4899, [
            text(`## Sorteo: ${g.prize}`),
            sep(),
            text(`**Ganadores:** ${g.winnersCount}\n**Cierra:** <t:${epoch}:R> (<t:${epoch}:f>)\n**Participantes:** ${partLabel}\n**Organizado por:** <@${g.hostId}>`),
            sep(),
            row(
                { type: 2, style: 3, label: `Participar (${count})`, custom_id: `giveaway:join:${g.id}` },
                { type: 2, style: 2, label: 'Cerrar ahora', custom_id: `giveaway:end:${g.id}` },
            ),
        ])],
        allowed_mentions: { parse: [] },
    };
}

function pickRandom(list, count) {
    const pool = [...list];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.max(0, count));
}

async function finishGiveaway(id) {
    const S = state();
    const g = S.giveaways[id];
    if (!g || g.ended) return null;

    g.ended = true;
    g.endedAt = Date.now();
    g.winnerIds = pickRandom(g.participants, g.winnersCount);
    env.saveState();

    await env.discord('PATCH', `/channels/${g.channelId}/messages/${g.messageId}`, giveawayMessage(g)).catch((e) => {
        env.log(`[GIVEAWAY] editar fin ${id}: ${e.message}`);
    });

    const notice = g.winnerIds.length
        ? `Enhorabuena ${g.winnerIds.map((w) => `<@${w}>`).join(', ')}: habéis ganado **${g.prize}**. Abre un ticket si necesitas reclamar el premio.`
        : `El sorteo de **${g.prize}** terminó sin participantes.`;

    await env.discord('POST', `/channels/${g.channelId}/messages`, {
        content: notice,
        message_reference: { message_id: g.messageId, fail_if_not_exists: false },
        allowed_mentions: { users: g.winnerIds },
    }).catch(() => {});

    return g;
}

async function createGiveaway({ interaction, prize, minutes, winners }) {
    if (!isStaffMember(interaction.member)) {
        return { error: 'Solo el staff puede crear sorteos.' };
    }
    const L = env.ctx().layout;
    const targetChannel = L.channels?.giveaways || interaction.channel_id;
    const hostId = interaction.member?.user?.id || interaction.user?.id;
    const id = crypto.randomBytes(4).toString('hex');
    const g = {
        id,
        channelId: targetChannel,
        messageId: null,
        prize: String(prize).trim().slice(0, 120),
        winnersCount: Math.max(1, Math.min(10, Number(winners) || 1)),
        endsAt: Date.now() + Math.max(1, Number(minutes) || 60) * 60_000,
        hostId,
        participants: [],
        ended: false,
        winnerIds: [],
    };

    const posted = await env.discord('POST', `/channels/${targetChannel}/messages`, giveawayMessage(g));
    g.messageId = posted.id;
    state().giveaways[id] = g;
    env.saveState();
    return { giveaway: g };
}

async function tickGiveaways() {
    const S = state();
    const now = Date.now();
    for (const g of Object.values(S.giveaways)) {
        if (!g.ended && now >= g.endsAt) {
            await finishGiveaway(g.id);
        }
    }
}

/* ---------------------------------------------------------- interacciones */

async function handleInteraction(interaction, respond) {
    if (interaction.type !== 3) return false;
    const id = interaction.data?.custom_id || '';
    if (!id.startsWith('role:toggle:') && !id.startsWith('giveaway:')) return false;

    const L = env.ctx().layout;
    const userId = interaction.member?.user?.id || interaction.user?.id;
    const { text, container } = env.ui;

    const replyEph = (color, msgText) => respond(interaction, {
        type: 4,
        data: { flags: V2 | EPH, components: [container(color, [text(msgText)])] },
    });

    if (id.startsWith('role:toggle:')) {
        const key = id.slice('role:toggle:'.length);
        const roleId = L.roles?.[key];
        const def = NOTIFY_ROLES.find((r) => r.key === key);
        if (!roleId || !def) {
            await replyEph(0xef4444, 'Ese rol de aviso todavía no está disponible.');
            return true;
        }
        const memberRoles = interaction.member?.roles || [];
        const has = memberRoles.includes(roleId);
        await respond(interaction, { type: 5, data: { flags: EPH } });
        try {
            const method = has ? 'DELETE' : 'PUT';
            await env.discord(method, `/guilds/${env.ctx().guild}/members/${userId}/roles/${roleId}`, undefined, 'Preferencia de avisos');
            const summary = NOTIFY_ROLES
                .filter((r) => {
                    const rid = L.roles?.[r.key];
                    if (!rid) return false;
                    return r.key === key ? !has : memberRoles.includes(rid);
                })
                .map((r) => `<@&${L.roles[r.key]}>`);
            await env.editOriginal(interaction, {
                flags: V2,
                components: [container(has ? 0x71717a : 0x10b981, [
                    text(has ? `### Aviso desactivado: ${def.name}` : `### Aviso activado: ${def.name}`),
                    text(summary.length ? `**Tus avisos activos:** ${summary.join(', ')}` : 'No tienes ningún aviso activo ahora mismo.'),
                ])],
                allowed_mentions: { parse: [] },
            });
        } catch (e) {
            env.log(`[ROLES] toggle ${key} (${userId}): ${e.message}`);
            await env.editOriginal(interaction, {
                flags: V2,
                components: [container(0xef4444, [text('No he podido actualizar ese rol. Avisa al staff.')])],
            });
        }
        return true;
    }

    if (id.startsWith('giveaway:join:')) {
        const gid = id.slice('giveaway:join:'.length);
        const g = state().giveaways[gid];
        if (!g || g.ended || Date.now() >= g.endsAt) {
            await replyEph(0x71717a, 'Este sorteo ya ha finalizado.');
            return true;
        }
        const idx = g.participants.indexOf(userId);
        const joined = idx === -1;
        if (joined) g.participants.push(userId);
        else g.participants.splice(idx, 1);
        env.saveState();

        await respond(interaction, { type: 6 });
        await env.discord('PATCH', `/channels/${g.channelId}/messages/${g.messageId}`, giveawayMessage(g)).catch(() => {});
        await env.followup(interaction, {
            flags: V2 | EPH,
            components: [container(joined ? 0x10b981 : 0x71717a, [
                text(joined
                    ? `Te has apuntado al sorteo de **${g.prize}**. Suerte.`
                    : `Has salido del sorteo de **${g.prize}**.`),
            ])],
        });
        return true;
    }

    if (id.startsWith('giveaway:end:')) {
        const gid = id.slice('giveaway:end:'.length);
        const g = state().giveaways[gid];
        if (!g || g.ended) {
            await replyEph(0x71717a, 'Este sorteo ya estaba cerrado.');
            return true;
        }
        if (!isStaffMember(interaction.member)) {
            await replyEph(0xef4444, 'Solo el staff puede cerrar un sorteo antes de tiempo.');
            return true;
        }
        await respond(interaction, { type: 6 });
        await finishGiveaway(gid);
        return true;
    }

    return false;
}

module.exports = {
    NOTIFY_ROLES,
    SUPPORT_TIPS,
    init,
    ensureNotificationRoles,
    ensureCommunityChannels,
    syncRolePicker,
    syncReviews,
    reviewCard,
    seedVoiceStates,
    onVoiceStateUpdate,
    maybeHelpInSupport,
    matchSupportTip,
    createGiveaway,
    finishGiveaway,
    tickGiveaways,
    handleInteraction,
};
