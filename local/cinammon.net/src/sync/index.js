/**
 * Sincronización web -> Discord (y tickets en ambos sentidos).
 *
 * Usa discord-layout.json (IDs de canales y roles creados por scripts/restructure-guild.js)
 * y guarda lo ya publicado en sync-state.json para no repetir mensajes al reiniciar.
 *
 *  - #anuncios / #ofertas: anuncios publicados en el panel.
 *  - #estado: panel de estado (nodos + mantenimientos) que se edita solo, y un aviso por mantenimiento nuevo.
 *  - #planes, #rangos-vip, #metodos-de-pago: catálogo de billing.cinammon.net.
 *  - #bienvenida, #normas, #tickets: mensajes fijos (se editan si cambia el texto).
 *  - Roles: rangos VIP, Cliente Cinammon y Miembro según la cuenta vinculada con Discord.
 *  - Tickets: cada ticket abierto es un hilo privado en #tickets; los mensajes van y vienen.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readConfig, discoverPanelUrl, log } = require('../api/panel');
const art = require('./art');
const commands = require('./commands');
const community = require('./community');
const members = require('./members');
const suggestions = require('./suggestions');
const verify = require('./verify');
const content = require('./content');
const assistant = require('./assistant');
const birthdays = require('./birthdays');
const shop = require('./shop');
const support = require('./support');
const moderation = require('./moderation');

const ART_VERSION = 1; // súbelo para volver a dibujar todos los banners

const ROOT = process.cwd();
const LAYOUT_PATH = path.join(ROOT, 'discord-layout.json');
const STATE_PATH = path.join(ROOT, 'sync-state.json');
const BILLING = 'https://billing.cinammon.net';
const PANEL_PUBLIC = 'https://panel.cinammon.net';
const API = 'https://discord.com/api/v10';

const SYNC_EVERY = 60 * 1000;
const CATALOG_EVERY = 10 * 60 * 1000;
const ROLES_RECHECK = 30 * 60 * 1000;

let ctx = null; // { token, layout, guild }
let st = null;
let accent = 0xec4899;
let pal = art.palette(null);
let lastCatalog = 0;
let lastContent = 0;
let timer = null;
let queue = Promise.resolve();
let lastData = null;
let lastSeason = null;
let presenceTimer = null;
let presenceStep = 0;

/** Estado personalizado del bot (como "Moxi en 29 servidores."), rotando con datos reales. */
function statusLines() {
    const d = lastData;
    const lines = [];
    const active = (d?.maintenances || []).filter((m) => m.active);
    if (active.length) return [`⚠ Mantenimiento en curso · /estado`];
    if (lastSeason?.promotion && lastSeason?.discount) lines.push(`✦ ${lastSeason.promotion}: -${lastSeason.discount}% en la tienda`);
    if (d?.stats?.servers) lines.push(`✦ Cuidando ${d.stats.servers} servidores`);
    if (d?.stats?.users) lines.push(`✦ ${d.stats.users} usuarios en cinammon.net`);
    if (d?.nodes?.length && d.nodes.every((n) => n.online && !n.maintenance)) lines.push('✦ Todos los nodos en línea');
    lines.push('✦ Servidor gratis en cinammon.net');
    lines.push('✦ /ayuda para empezar');
    return lines;
}

function rotatePresence() {
    const lines = statusLines();
    const text = lines[presenceStep++ % lines.length];
    try {
        require('../api/panel').state.updatePresence?.(text);
    } catch {}
}
let runTimer = null;

/* ---------------------------------------------------------------- utilidades */

function loadState() {
    try {
        return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveState() {
    try {
        fs.writeFileSync(STATE_PATH, JSON.stringify(st, null, 2));
    } catch (e) {
        log(`[SYNC] No se pudo guardar sync-state.json: ${e.message}`);
    }
}

/** Ejecuta las tareas de una en una (evita que el sondeo y un mensaje entrante se pisen). */
function serial(fn) {
    const run = queue.then(fn, fn);
    queue = run.catch(() => {});
    return run;
}

const hash = (v) => crypto.createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const ts = (iso, f = 'f') => (iso ? `<t:${Math.floor(new Date(iso).getTime() / 1000)}:${f}>` : '');
const cut = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
const eur = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;

async function discord(method, route, body, reason) {
    for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(API + route, {
            method,
            headers: {
                Authorization: `Bot ${ctx.token}`,
                'Content-Type': 'application/json',
                ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (res.status === 429) {
            const j = await res.json().catch(() => ({}));
            await new Promise((r) => setTimeout(r, Math.ceil((j.retry_after || 1) * 1000) + 100));
            continue;
        }
        if (res.status === 204) return null;
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const err = new Error(`${method} ${route} -> ${res.status} ${data?.message || ''}`.trim());
            err.status = res.status;
            throw err;
        }
        return data;
    }
    throw new Error(`${method} ${route} -> demasiados 429`);
}

async function panel(method, route, body) {
    const cfg = readConfig();
    const base = await discoverPanelUrl(cfg.panel_url);
    const res = await fetch(base + route, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Cinammon-Bot-Secret': cfg.bot_secret },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(`panel ${method} ${route} -> ${res.status} ${data.error || data.message || ''}`.trim());
        err.status = res.status;
        err.body = data;
        throw err;
    }
    return data;
}

async function billing(route) {
    const res = await fetch(BILLING + route, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`billing ${route} -> ${res.status}`);
    return res.json();
}

async function audit(text) {
    const ch = ctx.layout.channels.logs;
    if (!ch) return;
    await discord('POST', `/channels/${ch}/messages`, msg(container(0x71717a, [{ type: 10, content: cut(text, 1900) }]))).catch(() => {});
}

/* --------------------------------------------- color de temporada (como la web) */

async function refreshSeason() {
    try {
        const season = await billing('/api/season');
        lastSeason = season;
        pal = art.palette(season);
        const [r, g, b] = pal.primary;
        accent = (r << 16) | (g << 8) | b;
        return season;
    } catch {
        return null;
    }
}

/** Avatar y banner del perfil del bot con los colores de la temporada (solo cuando cambian). */
async function refreshIdentity() {
    const key = `${pal.key}:${ART_VERSION}`;
    if (st.identity === key) return;
    const uri = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
    const avatar = uri(await art.avatar(pal));
    try {
        await discord('PATCH', '/users/@me', { avatar, banner: uri(await art.profileBanner(pal)) });
    } catch (e) {
        log(`[SYNC] banner del perfil: ${e.message}`);
        await discord('PATCH', '/users/@me', { avatar });
    }
    st.identity = key;
    saveState();
    log(`[SYNC] Avatar del bot actualizado (${pal.key}).`);
}

/* ---------------------------------------------------- banners (adjuntos) */

/**
 * Envía un mensaje V2 con un banner dibujado como adjunto, colocado arriba del primer contenedor.
 * banner = { name, title, subtitle, icon }
 */
/** Petición multipart con imágenes adjuntas (payload_json + files[n]). */
async function discordFiles(method, route, body, files) {
    for (let attempt = 0; attempt < 4; attempt++) {
        const form = new FormData();
        form.append('payload_json', JSON.stringify(body));
        files.forEach((f, n) => form.append(`files[${n}]`, new Blob([f.data], { type: 'image/png' }), f.name));
        const res = await fetch(API + route, { method, headers: { Authorization: `Bot ${ctx.token}` }, body: form });
        if (res.status === 429) {
            const j = await res.json().catch(() => ({}));
            await new Promise((r) => setTimeout(r, Math.ceil((j.retry_after || 1) * 1000) + 100));
            continue;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const err = new Error(`${method} ${route} -> ${res.status} ${data?.message || ''} ${data?.errors ? JSON.stringify(data.errors).slice(0, 300) : ''}`.trim());
            err.status = res.status;
            throw err;
        }
        return data;
    }
    throw new Error(`${method} ${route} -> demasiados 429`);
}

async function sendV2(method, route, payload, banner) {
    if (!banner) return discord(method, route, payload);
    const file = `${banner.name}.png`;
    const body = JSON.parse(JSON.stringify(payload));
    const gallery = { type: 12, items: [{ media: { url: `attachment://${file}` } }] };
    const first = body.components.find((c) => c.type === 17);
    if (first) first.components.unshift(gallery);
    else body.components.unshift(gallery);
    body.attachments = [{ id: 0, filename: file }];

    const png = await art.banner(banner, pal);
    for (let attempt = 0; attempt < 4; attempt++) {
        const form = new FormData();
        form.append('payload_json', JSON.stringify(body));
        form.append('files[0]', new Blob([png], { type: 'image/png' }), file);
        const res = await fetch(API + route, { method, headers: { Authorization: `Bot ${ctx.token}` }, body: form });
        if (res.status === 429) {
            const j = await res.json().catch(() => ({}));
            await new Promise((r) => setTimeout(r, Math.ceil((j.retry_after || 1) * 1000) + 100));
            continue;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const err = new Error(`${method} ${route} -> ${res.status} ${data?.message || ''} ${data?.errors ? JSON.stringify(data.errors).slice(0, 300) : ''}`.trim());
            err.status = res.status;
            throw err;
        }
        return data;
    }
    throw new Error(`${method} ${route} -> demasiados 429`);
}

/* ------------------------------------------------- mensajes fijos y de catálogo */

/* ---------------------------------------------------- Components V2 */

const V2 = 1 << 15; // IS_COMPONENTS_V2
const text = (content) => ({ type: 10, content });
const sep = (spacing = 1, divider = true) => ({ type: 14, divider, spacing });
const linkBtn = (label, url) => ({ type: 2, style: 5, label: cut(label, 80), url });
const row = (...buttons) => ({ type: 1, components: buttons });
const container = (color, components) => ({ type: 17, accent_color: color, components: components.filter(Boolean) });
const msg = (...containers) => ({ flags: V2, components: containers.flat().filter(Boolean), allowed_mentions: { parse: [] } });

/** Publica o edita un mensaje del bot identificado por `key`. */
async function upsert(key, channel, payload, banner) {
    if (!channel) return;
    st.posts ??= {};
    const h = hash([payload, banner, banner ? pal.key : null, ART_VERSION]);
    const prev = st.posts[key];
    if (prev && prev.channel === channel && prev.hash === h && prev.v2) return;
    if (prev && prev.channel === channel && prev.v2) {
        try {
            await sendV2('PATCH', `/channels/${channel}/messages/${prev.id}`, payload, banner);
            st.posts[key] = { ...prev, hash: h };
            saveState();
            return;
        } catch (e) {
            if (e.status !== 404) throw e;
        }
    }
    // Un mensaje con embeds no se puede pasar a Components V2 editándolo: se borra y se vuelve a publicar.
    if (prev && !prev.v2) await discord('DELETE', `/channels/${prev.channel}/messages/${prev.id}`).catch(() => {});
    const m = await sendV2('POST', `/channels/${channel}/messages`, payload, banner);
    st.posts[key] = { channel, id: m.id, hash: h, v2: true };
    saveState();
}

const BANNERS = {
    welcome: { title: 'BIENVENIDA', subtitle: 'Hosting de juegos, bots, webs y aplicaciones', icon: 'welcome' },
    rules: { title: 'NORMAS', subtitle: 'Para que esto siga siendo un buen sitio', icon: 'rules' },
    tickets: { title: 'TICKETS', subtitle: 'Soporte privado con el equipo', icon: 'tickets' },
    plans: { title: 'PLANES', subtitle: 'Precios al día con la tienda', icon: 'plans' },
    ranks: { title: 'RANGOS VIP', subtitle: 'Ventajas en la web y rol en Discord', icon: 'ranks' },
    payments: { title: 'PAGOS', subtitle: 'Métodos de pago aceptados', icon: 'payments' },
    status: { title: 'ESTADO', subtitle: 'Servicios y mantenimientos en directo', icon: 'status' },
    verify: { title: 'VERIFICACIÓN', subtitle: 'Un clic y ves todo el servidor', icon: 'staff' },
    help: { title: 'SOPORTE', subtitle: 'Dudas rápidas de la comunidad', icon: 'help' },
    commands: { title: 'COMANDOS', subtitle: 'Todo lo de la web, desde Discord', icon: 'commands' },
    staff: { title: 'STAFF', subtitle: 'Herramientas del equipo', icon: 'staff' },
    invites: { title: 'INVITACIONES', subtitle: 'Trae a tus amigos y sube en el ranking', icon: 'join' },
    arrivals: { title: 'LLEGADAS', subtitle: 'Bienvenidas y despedidas', icon: 'join' },
};
const bannerFor = (key) => (BANNERS[key] ? { name: key, ...BANNERS[key] } : undefined);

/** Ranking del mes de quienes más ayudan en #soporte (o nada si aún no hay). */
function supportTop() {
    const top = support.topHelpers(5);
    if (!top.length) return text('### Ayudantes del mes\nTodavía nadie. Responde dudas en los hilos y, cuando las marquen como resueltas, aparecerás aquí.');
    return text(`### Ayudantes del mes\n${top.map((h, n) => `**${n + 1}.** <@${h.id}> · ${h.points} ${h.points === 1 ? 'ayuda' : 'ayudas'}`).join('\n')}`);
}

/** Premios de invitación de la tienda (se leen cada 30 min; si falla, se usan los últimos). */
let referralRewards = null, rewardsAt = 0;
async function refreshReferralRewards() {
    if (Date.now() - rewardsAt < 30 * 60_000) return;
    rewardsAt = Date.now();
    referralRewards = (await billing('/api/free-stats').catch(() => null))?.referral || referralRewards;
}

/** Panel de #invitaciones: cómo funciona, botón para el enlace propio y ranking en directo. */
function invitesPost() {
    const top = members.leaderboard(10);
    const r = referralRewards;
    const coins = (n, fallback) => (r ? `**${n} monedas**` : fallback);
    return msg(container(accent, [
        text('# Invita a tus amigos\nPulsa **Conseguir mi enlace** y te damos tu invitación personal al servidor. No caduca, no tiene límite de usos y todo lo que pase con ella cuenta para ti.'),
        sep(),
        text([
            '### 1 · Invitas al Discord',
            '- Comparte tu enlace. Cada persona que entre con él suma **1 invitación** en el ranking.',
            '- Si se va del servidor, se resta. Así no vale meter cuentas y sacarlas.',
        ].join('\n')),
        text([
            '### 2 · Se crea cuenta y la vincula',
            `- Si esa persona se registra en cinammon.net y usa \`/vincular\`, pasa a ser **tu referido en la tienda**, igual que si hubiera usado tu enlace de \`/monedas\`.`,
        ].join('\n')),
        text([
            '**Para que cuente hacen falta dos cosas:**',
            '**a) Que se cree la cuenta después de entrar con tu enlace.** Así sabemos que la has traído tú.',
            '> Luis no conocía Cinammon, entra con tu enlace el lunes y el martes se crea la cuenta: **cuenta**.',
            '> Marta ya era clienta desde hace meses y un día entra con tu enlace: **no cuenta**, porque ya estaba antes.',
            `**b) Que los dos tengáis la cuenta vinculada con \`/vincular\`.** Las monedas van a tu cuenta de la tienda, no a Discord: sin vincular, el bot no sabe a qué cuenta dárselas.`,
            '-# Si aún no la tienes vinculada, no pasa nada: tienes 30 días para hacerlo y la invitación se apunta igual.',
        ].join('\n')),
        text([
            '### 3 · Ganáis monedas los dos',
            `- Cuando empieza a usar la tienda${r ? ` (gana sus primeras ${r.threshold} monedas con \`/diario\` o los minijuegos)` : ''}: tú ganas ${coins(r?.active, 'monedas')} y esa persona ${coins(r?.welcome, 'un regalo de bienvenida')}.`,
            `- Con su primera compra: tú ganas ${coins(r?.purchase, 'más monedas')}.`,
            '-# Las monedas se canjean por servidores en la tienda.',
        ].join('\n')),
        sep(),
        text(`### Ranking\n${top.length ? top.map((x, n) => `**${n + 1}.** <@${x.id}> · ${x.total} ${x.total === 1 ? 'invitación' : 'invitaciones'}`).join('\n') : 'Todavía nadie ha invitado a nadie. Puedes ser la primera persona.'}`),
        text('-# Tus números (Discord y tienda) con `/invitaciones`.'),
        sep(2),
        row({ type: 2, style: 1, label: 'Conseguir mi enlace', custom_id: 'c:invite' }),
    ]));
}

function staticPosts(season) {
    const ch = ctx.layout.channels;
    const promo = season?.promotion && season?.discount ? `**${season.promotion}:** ${season.discount}% de descuento en la tienda ahora mismo.` : null;
    return [
        ...(ch.verify ? [['verify', ch.verify, verify.post()]] : []),
        ['welcome', ch.welcome, msg(container(accent, [
            text('# Bienvenida a Cinammon Network\nHosting de servidores de juegos, bots, webs y bases de datos, con panel propio y soporte en español. Puedes empezar **gratis**: gana monedas cada día y canjéalas por un servidor.'),
            sep(),
            text(`### Empieza en 3 pasos\n**1.** Crea tu cuenta gratis en el panel.\n**2.** Vincúlala con Discord: en el panel, **Ajustes → Perfil → Código para el bot**, y escribe aquí \`/vincular codigo:\` con ese código.\n**3.** Usa \`/diario\` cada día para sumar monedas y canjéalas por un servidor en la tienda.\n-# Al vincularla recibes <@&${ctx.layout.roles.client}> si tienes un servicio activo y el rol de tu rango VIP.`),
            sep(),
            text([
                '### Mapa del servidor',
                `<#${ch.rules}> normas · <#${ch.status}> estado de la red`,
                `<#${ch.plans}> planes y precios · <#${ch.ranks}> rangos VIP`,
                ch.guides ? `<#${ch.guides}> guías paso a paso · <#${ch.help}> dudas rápidas` : `<#${ch.help}> dudas rápidas`,
                `<#${ch.tickets}> tu cuenta, pagos o un servidor caído`,
                `<#${ch.commands}> el bot · <#${ch.general}> charla`,
                ch.invites ? `<#${ch.invites}> tu enlace para invitar a amigos` : null,
                ch.suggestions ? `<#${ch.suggestions}> propón y vota ideas para mejorar Cinammon` : null,
            ].filter(Boolean).join('\n')),
            promo && sep(),
            promo && text(promo),
            sep(2),
            row(linkBtn('Panel', PANEL_PUBLIC), linkBtn('Tienda', BILLING)),
        ]))],
        ['rules', ch.rules, msg(container(accent, [
            text('# Normas de Cinammon\nEstar en este servidor implica aceptar estas normas y los [Términos de servicio](' + PANEL_PUBLIC + '/terms) de cinammon.net.'),
            sep(),
            text('### 1 · Convivencia\n' + [
                '**1.1** Trata a todo el mundo con respeto. Nada de insultos, acoso, amenazas ni provocaciones.',
                '**1.2** Cero tolerancia con el odio o la discriminación por cualquier motivo.',
                '**1.3** Las discusiones se llevan con educación; si algo se calienta, el staff puede cortarla.',
            ].join('\n')),
            text('### 2 · Contenido\n' + [
                '**2.1** Nada de NSFW, gore, contenido ilegal ni enlaces a malware, IP grabbers o cracks.',
                '**2.2** Sin spam, flood, cadenas ni menciones masivas.',
                '**2.3** Nada de publicidad de otros servidores o servicios, ni por privado, sin permiso del staff.',
            ].join('\n')),
            text('### 3 · Canales y soporte\n' + [
                `**3.1** Cada canal tiene su tema: dudas rápidas en <#${ch.help}>, el bot en <#${ch.commands}>.`,
                `**3.2** Pagos, servidores o tu cuenta van por ticket en <#${ch.tickets}>, nunca en público.`,
                '**3.3** No menciones al staff ni a sus roles para que te atiendan antes. La primera vez el bot te avisa; después cuenta como advertencia. Usa `/pregunta`, escribe en <#' + ch.help + '> o abre un ticket.',
            ].join('\n')),
            text('### 4 · Servicios alojados\n' + [
                '**4.1** Tus servidores deben cumplir los Términos: nada de DDoS, minería, phishing, spam ni abuso de recursos.',
                '**4.2** Un servicio que incumpla se suspende sin reembolso (el staff puede suspender todos tus servidores) y puede suponer el cierre de la cuenta.',
            ].join('\n')),
            text('### 5 · Seguridad\n' + [
                '**5.1** El staff nunca te pedirá tu contraseña, códigos ni que pagues por mensaje privado.',
                '**5.2** Solo son oficiales las webs que terminan en **cinammon.net**. Si alguien se hace pasar por el staff, avísanos por ticket.',
                '**5.3** No compartas datos personales tuyos ni de otras personas.',
            ].join('\n')),
            sep(),
            text('### Sanciones\nLas advertencias se acumulan y escalan solas:\n**3** → 1 hora silenciado · **5** → 1 día silenciado · **7** → expulsión\nSegún la gravedad se puede saltar directamente al baneo o a la **suspensión de tus servidores**. Te llega un privado con el motivo de cada sanción; si no estás de acuerdo, abre un ticket.'),
            sep(2),
            row(linkBtn('Términos de servicio', `${PANEL_PUBLIC}/terms`), linkBtn('Privacidad', `${PANEL_PUBLIC}/privacy`)),
        ]))],
        ['help', ch.help, msg(container(accent, [
            text('# Soporte de la comunidad\nPreguntas **públicas** sobre cómo hacer algo: Minecraft, bots, el panel, dominios, bases de datos… Responden el asistente, la comunidad y el equipo.'),
            sep(),
            text('### Cómo funciona\n**1.** Escribe tu pregunta en el canal (o pulsa **Hacer una pregunta**).\n**2.** Se abre un **hilo solo para tu pregunta** y el asistente responde al momento.\n**3.** Si no lo resuelve, la comunidad y el equipo siguen en el hilo.\n**4.** Pulsa **Resuelto** y elige quién te ayudó: se lleva un punto de ayuda.'),
            text(`### Escribe bien tu pregunta\n- Qué servicio es (juego, bot, web…) y la versión.\n- El error **exacto** de la consola o una captura.\n- Qué has probado ya.${ch.status ? `\n-# ¿Se ha caído todo? Mira antes <#${ch.status}>.` : ''}`),
            supportTop(),
            sep(),
            text(`-# Es público: nada de contraseñas, correos ni facturas. Lo de **tu cuenta, un pago o una sanción** va por ticket privado en <#${ch.tickets}>.`),
            row({ type: 2, style: 1, label: 'Hacer una pregunta', custom_id: 'sup:ask' }, ...[ch.guides ? linkBtn('Guías', `https://discord.com/channels/${ctx.guild}/${ch.guides}`) : null].filter(Boolean)),
        ]))],
        ['commands', ch.commands, msg(container(accent, [
            text('# Comandos\nLo que haces en la web, desde aquí. Escribe `/` en este canal y elige. Las respuestas de tu cuenta solo las ves tú.'),
            sep(),
            text('### Primero: vincula tu cuenta\n`/vincular codigo:` con el código de **Ajustes → Perfil → Código para el bot** del panel. Solo hace falta una vez.'),
            text('### Tus servidores\n`/servidores` lista con su estado\n`/servidor` encender, reiniciar, apagar, renombrar y ajustes del juego\n`/consola` enviar un comando a la consola'),
            text('### Tu cuenta\n`/cuenta` resumen de todo · `/perfil` nombre y foto de la web\n`/monedas` saldo y enlace de invitación · `/diario` premio diario con racha\n`/facturas` pagos pendientes · `/tickets` tus tickets'),
            text('### Comunidad\n`/cumpleaños` guarda tu fecha: ese día te felicitamos y te llega un set de regalo\n`/estado` red y mantenimientos · `/anuncios` · `/planes` · `/rangos`\n`/comprar` compra un servidor o un rango sin salir de Discord\n`/sugerir` propón una idea · `/invitar` tu enlace al servidor · `/invitaciones` · `/top-invitaciones` · `/ping` · `/ayuda`'),
            sep(),
            text('-# Si un comando dice que tu Discord no está vinculado, repite el paso de `/vincular`.'),
        ]))],
        ['staff', ch.staff, msg(container(accent, [
            text('# Staff\nCanal privado del equipo.'),
            sep(),
            text(`### Web y avisos\n\`/anuncio\` publica en la web y en <#${ch.announcements}> o <#${ch.offers}>\n\`/mantenimiento\` programa un mantenimiento (aviso en <#${ch.status}>)\n\`/sorteo\` crea un sorteo${ch.giveaways ? ` en <#${ch.giveaways}>` : ''}\n\`/sincronizar\` fuerza la sincronización con la web`),
            text('### Moderación\n`/advertir` (3 = 1 h silenciado, 5 = 1 día, 7 = expulsión) · `/sanciones` (con su cuenta y servidores del panel) · `/perdonar`\n`/suspender-servidores` (Moderador+) · `/reactivar-servidores` (Owner y Admin)\n`/silenciar` · `/quitar-silencio` · `/expulsar` · `/ban` · `/desbanear`\n`/limpiar` · `/bloquear` · `/desbloquear` · `/modo-lento`\n`/automod` filtros automáticos y palabras bloqueadas\n-# No se puede sancionar a nadie con un rol igual o superior al tuyo.'),
            text('### Administración (Owner y Admin)\n`/admin crear-servidor` · `/admin crear-nodo` · `/admin nodos` · `/admin servidor`\n`/amigo` rol Amigo de Cinammon (solo Owner)'),
            text(`### Cómo funciona\n**Tickets:** cada ticket es un hilo privado en <#${ch.tickets}> con su tipo, servidor y prioridad VIP. Pulsa **Me encargo** para quedártelo; lo que escribáis le llega al cliente en la web. Al cerrar, el cliente lo valora del 1 al 5.\n**Asistente:** responde en <#${ch.help}> y con \`/pregunta\`; si no sabe, menciona a Helper y Moderador (como mucho una vez cada 10 min).\n**Menciones al staff:** quien no es del equipo y os menciona recibe un aviso y, la siguiente vez, una advertencia automática. Con 5 advertencias sale un aviso aquí para suspender sus servidores.\n**Registro:** sanciones, AutoMod, roles, anuncios y tickets en <#${ch.logs}>.`),
            sep(2),
            row(linkBtn('Panel de administración', `${PANEL_PUBLIC}/admin`)),
        ]))],
        ['tickets', ch.tickets, msg(container(accent, [
            text('# Atención privada\nPara lo que no se puede contar en público: **tu cuenta, tus pagos o un servidor concreto**. Se abre un hilo privado que solo ves tú y el equipo, conectado con tu cuenta del panel.'),
            sep(),
            text('### Tipos\n**Mi servidor:** no arranca, errores, archivos (eliges cuál y el equipo lo puede revisar)\n**Pagos y facturas:** cobros, renovaciones, reembolsos\n**Cuenta y acceso:** correo, acceso al panel, vinculación\n**Reportar a un usuario:** alguien incumple las normas\n**Otra consulta:** cualquier otra cosa privada'),
            text(`### Qué tiene un ticket\n- Lo atiende el equipo (prioridad para VIP) y queda guardado en ${PANEL_PUBLIC}/tickets: puedes responder aquí o en la web.\n- Avisos cuando te responden y valoración al cerrarlo.\n- Un ticket abierto por persona.`),
            sep(),
            text(`-# ¿Es una duda de cómo hacer algo? Pregúntala en <#${ch.help}>: allí responden al momento el asistente y la comunidad. Para abrir tickets necesitas la cuenta vinculada (\`/vincular\`).`),
            row({ type: 2, style: 1, label: 'Abrir ticket', custom_id: 'ticket:open' }, { type: 2, style: 2, label: 'Mis tickets', custom_id: 'ticket:mine' }, linkBtn('Panel', `${PANEL_PUBLIC}/tickets`)),
        ]))],
    ];
}

/** Iconos de los rangos (dibujados igual que en el panel, servidos en panel /discord/rangos/<clave>.png). */
const RANK_ICON = {
    chispa: 'chispa', 'neón': 'neon', neon: 'neon', synthwave: 'synthwave', cibercanela: 'cibercanela', 'leyenda cinammon': 'leyenda',
    'arquitecto de mundos': 'arquitecto', 'comandante de clan': 'comandante', 'creador de contenido': 'creador', desarrollador: 'desarrollador', mecenas: 'mecenas',
};
const RANK_ICON_V = 1;
function rankIcon(name) {
    const key = RANK_ICON[String(name || '').trim().toLowerCase()];
    return key ? `${PANEL_PUBLIC}/discord/rangos/${key}.png?v=${RANK_ICON_V}` : null;
}

async function catalogPosts(season) {
    const ch = ctx.layout.channels;
    const store = season?.store_url || `${BILLING}/store`;
    const { categories } = await billing('/api/plans');
    const ranks = categories.find((c) => c.key === 'ranks');
    const others = categories.filter((c) => c.key !== 'ranks');
    const posts = [];

    posts.push(['plans', ch.plans, msg(container(accent, [
        text('# Planes de Cinammon\nPrecios por mes. Pagas por días, semanas, meses o años y puedes ampliar cuando quieras.'),
        season?.discount && text(`**${season.promotion}:** ${season.discount}% de descuento.`),
        sep(),
        text(cut(others.map((c) => {
            const min = Math.min(...c.plans.map((p) => Number(p.price)));
            return `**${c.title}**\n-# ${c.plans.length} planes · desde ${eur(min)}/mes`;
        }).join('\n'), 3000)),
        sep(2),
        row({ type: 2, style: 1, label: 'Comprar desde Discord', custom_id: 'buy:start' }, linkBtn('Ver la tienda', store)),
    ]))]);
    // Debajo de los planes: cómo comprar, explicado fácil (con los métodos de pago reales)
    const methods = await billing('/api/payment-methods').then((r) => r.methods).catch(() => null);
    const tutorial = st.content?.guides?.buy?.thread;
    posts.push(['howtobuy', ch.plans, shop.post(methods, tutorial ? `https://discord.com/channels/${ctx.guild}/${tutorial}` : null)]);

    if (ranks) {
        // Cada rango en su tarjeta de color con su icono y sus botones; 7 componentes por rango, así que van en dos mensajes (límite de 40)
        const card = (p) => {
            const body = text(cut(`### ${p.name} · ${eur(p.price)}/mes\n${(p.features || []).map((f) => `- ${f}`).join('\n')}`, 330));
            const icon = rankIcon(p.name);
            return container(parseInt(String(p.perks?.color || '#ec4899').replace('#', ''), 16), [
                icon ? { type: 9, components: [body], accessory: { type: 11, media: { url: icon }, description: `Icono de ${p.name}` } } : body,
                // La web abre la tienda con este rango ya elegido; Discord abre /comprar con él (solo lo ve quien pulsa)
                row(
                    linkBtn('Comprar en la web', `${BILLING}/store/ranks?plan=${p.id}&cycle=monthly`),
                    { type: 2, style: 1, label: 'Comprar desde Discord', custom_id: `buy:pl:${p.id}` },
                ),
            ]);
        };
        const list = ranks.plans.slice(0, 10);
        posts.push(['ranks', ch.ranks, msg(
            container(accent, [text('# Rangos VIP\nAl comprarlo en la tienda, el rango se activa en el panel y, si tu cuenta está vinculada con Discord, recibes aquí su rol.')]),
            list.slice(0, 5).map(card),
        )]);
        posts.push(['ranks2', ch.ranks, msg(
            list.slice(5).map(card),
            row(linkBtn('Ver todos los rangos en la tienda', `${BILLING}/store/ranks`)),
        )]);
    }

    try {
        const pm = await billing('/api/payment-methods');
        const lines = pm.methods.map((m) => `**${m.label}**\n-# ${m.auto ? 'Se activa al momento' : 'El equipo lo confirma y se activa (normalmente en pocas horas)'}`);
        lines.push('**Monedas Cinammon**\n-# Gratis: \`/diario\` cada día, invitaciones y sorteos. Se canjean por servidores en la tienda.');
        if (!pm.methods.length) lines.push('-# Los pagos con dinero se activarán pronto: cuando estén disponibles aparecerán aquí solos.');
        posts.push(['payments', ch.payments, msg(container(accent, [
            text('# Métodos de pago'),
            sep(),
            text(lines.join('\n')),
            sep(),
            text(`-# Los datos para pagar solo aparecen en tu factura del panel. El staff **nunca** te pedirá un pago por mensaje privado. Moneda: ${pm.currency}.`),
            sep(2),
            row(linkBtn('Ir a la tienda', store)),
        ]))]);
    } catch (e) {
        log(`[SYNC] métodos de pago: ${e.message}`);
    }
    return posts;
}

/* ------------------------------------------------------- anuncios y estado */

const TYPE = { offer: 'Oferta', new: 'Novedad', event: 'Evento', news: 'Noticia' };

function announcementPayload(a) {
    const url = a.cta_url ? new URL(a.cta_url, PANEL_PUBLIC).toString() : null;
    const meta = [
        a.coupon_code ? `**Cupón:** \`${a.coupon_code}\`` : null,
        a.ends_at ? `**Termina:** ${ts(a.ends_at)} (${ts(a.ends_at, 'R')})` : null,
    ].filter(Boolean);
    return msg(container(accent, [
        text(`-# ${TYPE[a.type] || 'Anuncio'}\n# ${cut(a.title, 200)}`),
        a.highlight && text(`**${cut(a.highlight, 300)}**`),
        sep(),
        a.message && text(cut(a.message, 3000)),
        meta.length && sep(),
        meta.length && text(meta.join('\n')),
        url && sep(2),
        url && row(linkBtn(a.cta_label || 'Ver más', url)),
    ]));
}

const annBanner = (a) => ({
    name: `anuncio-${a.id}`,
    title: (TYPE[a.type] || 'Anuncio').toUpperCase(),
    subtitle: cut(a.title, 48),
    icon: a.type === 'offer' ? 'offers' : 'announcements',
});

async function syncAnnouncements(list) {
    st.ann ??= {};
    for (const a of list) {
        const channel = a.type === 'offer' ? ctx.layout.channels.offers : ctx.layout.channels.announcements;
        const payload = announcementPayload(a);
        const h = hash([payload, pal.key, ART_VERSION]);
        const prev = st.ann[a.id];
        if (prev && prev.hash === h && prev.v2) continue;
        if (prev && prev.v2) {
            await sendV2('PATCH', `/channels/${prev.channel}/messages/${prev.id}`, payload, annBanner(a)).catch(() => {});
            st.ann[a.id] = { ...prev, hash: h };
        } else {
            if (prev) await discord('DELETE', `/channels/${prev.channel}/messages/${prev.id}`).catch(() => {});
            const m = await sendV2('POST', `/channels/${channel}/messages`, payload, annBanner(a));
            await discord('POST', `/channels/${channel}/messages/${m.id}/crosspost`).catch(() => {});
            st.ann[a.id] = { channel, id: m.id, hash: h, v2: true };
            if (!prev) await audit(`Anuncio publicado: ${a.title}`);
        }
        saveState();
    }
}

const WEB_CHECKS = [
    { name: 'Panel', url: PANEL_PUBLIC },
    { name: 'Tienda', url: BILLING },
    { name: 'Correo', url: 'https://mail.cinammon.net/health' },
    { name: 'Web', url: 'https://cinammon.net' },
];

async function checkWebServices() {
    return Promise.all(WEB_CHECKS.map(async ({ name, url }) => {
        const started = Date.now();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4500);
        try {
            const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
            return { name, ok: res.status < 500, ms: Date.now() - started };
        } catch {
            return { name, ok: false, ms: Date.now() - started };
        } finally {
            clearTimeout(timer);
        }
    }));
}

async function syncStatus(data) {
    const ch = ctx.layout.channels.status;
    const active = data.maintenances.filter((m) => m.active);
    const next = data.maintenances.filter((m) => !m.active);
    const nodes = data.nodes.length
        ? data.nodes.map((n) => `${n.maintenance ? '`MANT`' : n.online ? '`OK`' : '`CAÍDO`'} **${n.name}**`).join('\n')
        : 'Sin nodos.';
    const web = await checkWebServices();
    const webText = web.map((w) => `${w.ok ? '`OK`' : '`CAÍDO`'} **${w.name}** · ${w.ok ? `${w.ms} ms` : 'sin respuesta'}`).join('\n');
    const allOk = data.nodes.every((n) => n.online && !n.maintenance) && web.every((w) => w.ok) && !active.length;
    const fmt = (m) => `**${m.title}**\n${ts(m.starts_at)}${m.ends_at ? ` – ${ts(m.ends_at, 't')}` : ''}${m.message ? `\n-# ${cut(m.message, 300)}` : ''}`;

    // El panel de estado se publica antes que los avisos para quedar arriba del canal.
    await upsert('status', ch, msg(container(allOk ? 0x10b981 : active.length ? 0xf59e0b : 0xef4444, [
        text(`# ${allOk ? 'Todos los servicios funcionan' : active.length ? 'Mantenimiento en curso' : 'Hay incidencias'}`),
        sep(),
        text(`### Nodos\n${cut(nodes, 1500)}`),
        text(`### Servicios Web\n${webText}`),
        active.length && text(`### En curso\n${cut(active.map(fmt).join('\n\n'), 1000)}`),
        next.length && text(`### Programados\n${cut(next.map(fmt).join('\n\n'), 1000)}`),
        sep(),
        text(`-# ${data.stats.servers ? `${data.stats.servers} servidores de clientes · ` : ''}Se actualiza solo cada minuto. Activa el aviso de **Alertas de red** en <#${ctx.layout.channels.welcome}> para enterarte de cada incidencia.`),
        row(linkBtn('Telemetría en vivo', 'https://nodo.cinammon.net')),
    ])), bannerFor('status'));

    st.maint ??= [];
    for (const m of data.maintenances) {
        if (st.maint.includes(m.id)) continue;
        await discord('POST', `/channels/${ch}/messages`, msg(container(0xf59e0b, [
            text(`-# Mantenimiento programado\n## ${cut(m.title, 200)}`),
            m.message && text(cut(m.message, 2500)),
            sep(),
            text(`**Empieza:** ${ts(m.starts_at)} (${ts(m.starts_at, 'R')})` + (m.ends_at ? `\n**Termina:** ${ts(m.ends_at)}` : '') +
                (m.block_access ? '\n-# El panel no estará disponible durante el mantenimiento.' : '')),
        ])));
        st.maint.push(m.id);
        st.maint = st.maint.slice(-100);
        saveState();
        await audit(`Aviso de mantenimiento publicado: ${m.title}`);
    }
}

/* ------------------------------------------------------------------ roles */

function wantedRoles(panelRoles) {
    const r = ctx.layout.roles;
    const want = new Set([r.member]);
    for (const name of panelRoles) {
        if (r[`rank:${name}`]) want.add(r[`rank:${name}`]);
        if (name === 'Cliente Cinammon' && r.client) want.add(r.client);
    }
    return want;
}

function managedRoles() {
    const r = ctx.layout.roles;
    return new Set(Object.entries(r).filter(([k]) => k.startsWith('rank:') || k === 'client' || k === 'member').map(([, id]) => id));
}

async function syncRoles(members) {
    st.roles ??= {};
    const managed = managedRoles();
    const now = Date.now();
    for (const m of members) {
        const want = wantedRoles(m.roles);
        const key = [...want].sort().join(',');
        const prev = st.roles[m.discord_id];
        if (prev && prev.key === key && now - prev.at < ROLES_RECHECK) continue;

        let member;
        try {
            member = await discord('GET', `/guilds/${ctx.guild}/members/${m.discord_id}`);
        } catch (e) {
            if (e.status === 404) {
                st.roles[m.discord_id] = { key, at: now };
                continue;
            }
            throw e;
        }
        const has = new Set(member.roles);
        const changes = [];
        for (const id of want) {
            if (!has.has(id)) {
                await discord('PUT', `/guilds/${ctx.guild}/members/${m.discord_id}/roles/${id}`, undefined, 'Sincronización con cinammon.net');
                changes.push(`+<@&${id}>`);
            }
        }
        for (const id of has) {
            if (managed.has(id) && !want.has(id)) {
                await discord('DELETE', `/guilds/${ctx.guild}/members/${m.discord_id}/roles/${id}`, undefined, 'Sincronización con cinammon.net');
                changes.push(`-<@&${id}>`);
            }
        }
        if (changes.length) await audit(`Roles de <@${m.discord_id}>: ${changes.join(' ')}`);
        st.roles[m.discord_id] = { key, at: now };
    }
    saveState();
}

/* ---------------------------------------------------------------- tickets */

const STATUS_ES = { open: 'Abierto', pending: 'Esperando respuesta', closed: 'Cerrado' };

// Igual que App\Support\TicketCategories del panel. `extra`: tercer campo del formulario.
const TICKET_CATS = {
    servidor: {
        label: 'Mi servidor', hint: 'No arranca, errores, lag, archivos o copias',
        subject: 'Ej.: Mi servidor de Minecraft no arranca',
        details: 'Qué pasa, desde cuándo y qué cambiaste antes.',
        extra: { id: 'extra', label: 'Error de la consola (si lo hay)', style: 2, required: false, placeholder: 'Pega aquí las últimas líneas de la consola' },
    },
    pagos: {
        label: 'Pagos y facturas', hint: 'Cobros, renovaciones, reembolsos',
        subject: 'Ej.: He pagado y no se ha renovado',
        details: 'Qué ha pasado: cobro duplicado, pago no reflejado, reembolso…',
        extra: { id: 'extra', label: 'Número de factura o pedido', style: 1, required: false, placeholder: 'Ej.: 1234' },
    },
    cuenta: {
        label: 'Cuenta y acceso', hint: 'Correo, acceso al panel, datos, vinculación',
        subject: 'Ej.: No puedo entrar en el panel',
        details: 'Qué necesitas cambiar o qué no te deja hacer. Nunca escribas tu contraseña.',
    },
    reporte: {
        label: 'Reportar a un usuario', hint: 'Alguien incumple las normas o te ha estafado',
        subject: 'Ej.: Spam por privado',
        details: 'Qué ha hecho y dónde. Puedes añadir capturas en el hilo después.',
        extra: { id: 'extra', label: '¿A quién reportas? (nombre o ID)', style: 1, required: true, placeholder: 'Nombre de Discord, ID o nombre en el panel' },
    },
    otro: {
        label: 'Otra consulta', hint: 'Cualquier otra cosa',
        subject: 'Resúmelo en una frase',
        details: 'Cuéntanos qué necesitas con el mayor detalle posible.',
    },
};

const staffRoleIds = () => ['owner', 'admin', 'moderator', 'helper'].map((k) => ctx.layout.roles?.[k]).filter(Boolean);
const pingRoleIds = () => ['helper', 'moderator'].map((k) => ctx.layout.roles?.[k]).filter(Boolean);

function isStaffMember(member) {
    if (!member) return false;
    try {
        const p = BigInt(member.permissions || '0');
        if (p & 8n || p & 32n) return true; // Administrador o Gestionar servidor
    } catch {}
    const staff = staffRoleIds();
    return (member.roles || []).some((r) => staff.includes(r));
}

/** Ticket abierto de esta persona que ya tiene hilo, si lo hay. */
function openTicketOf(discordId) {
    const fromState = Object.entries(st.tickets || {}).find(([, t]) => t.user === discordId);
    if (fromState) return { id: fromState[0], thread: fromState[1].thread };
    const t = (lastData?.tickets || []).find((x) => x.user?.discord_id === discordId && x.status !== 'closed' && st.tickets?.[x.id]);
    return t ? { id: t.id, thread: st.tickets[t.id].thread } : null;
}

function ticketCard(ticket, note) {
    const who = ticket.user?.discord_id ? `<@${ticket.user.discord_id}>` : ticket.user?.name || 'Cliente';
    const meta = [
        `Abierto por ${who}`,
        ticket.server ? `Servidor: **${ticket.server.name}**` : null,
        ticket.priority ? '`PRIORIDAD VIP`' : null,
        ticket.claimed_by ? `Lo lleva **${ticket.claimed_by}**` : null,
    ].filter(Boolean).join(' · ');
    return msg(container(accent, [
        text(`-# Ticket #${ticket.id} · ${ticket.category_label || 'Consulta'} · ${STATUS_ES[ticket.status] || ticket.status}\n## ${cut(ticket.subject, 200)}`),
        text(meta),
        sep(),
        text(cut(ticket.message || 'Sin descripción.', 3000)),
        sep(),
        text(note || '### Qué pasa ahora\nEl equipo te responde aquí, por orden de llegada (los VIP con prioridad). No hace falta mencionar a nadie.\n-# Puedes añadir capturas o el error de la consola. Todo lo que escribas aquí se guarda en el ticket del panel.'),
        row(
            { type: 2, style: 1, label: 'Me encargo', custom_id: `ticket:claim:${ticket.id}` },
            { type: 2, style: 4, label: 'Cerrar ticket', custom_id: `ticket:close:${ticket.id}` },
            linkBtn('Ver en el panel', ticket.url || `${PANEL_PUBLIC}/tickets/${ticket.id}`),
        ),
    ]));
}

async function createThread(ticket) {
    const parent = ctx.layout.channels.tickets;
    const thread = await discord('POST', `/channels/${parent}/threads`, {
        name: cut(`#${ticket.id} ${ticket.category_label ? `${ticket.category_label}: ` : ''}${ticket.subject}`, 100),
        type: 12, // hilo privado
        invitable: false,
        auto_archive_duration: 10080,
    }, `Ticket #${ticket.id}`);
    if (ticket.user?.discord_id) {
        await discord('PUT', `/channels/${thread.id}/thread-members/${ticket.user.discord_id}`).catch(() => {});
    }
    const intro = await discord('POST', `/channels/${thread.id}/messages`, {
        ...ticketCard(ticket),
        allowed_mentions: { users: ticket.user?.discord_id ? [ticket.user.discord_id] : [] },
    });
    st.tickets[ticket.id] = { thread: thread.id, intro: intro?.id, last: 0, mine: [], user: ticket.user?.discord_id || null, category: ticket.category || null };
    saveState();

    // Mencionar los roles del equipo los añade al hilo privado y les avisa.
    const roles = pingRoleIds();
    if (roles.length) {
        await discord('POST', `/channels/${thread.id}/messages`, {
            content: `${roles.map((r) => `<@&${r}>`).join(' ')} nuevo ticket${ticket.priority ? ' **VIP**' : ''}: ${ticket.category_label || 'consulta'}.`,
            allowed_mentions: { roles },
        }).catch(() => {});
    }
    // Mientras llega el equipo, el asistente sugiere algo si lo reconoce.
    const hint = await assistant.ticketHint(ticket.subject, ticket.message).catch(() => null);
    if (hint) {
        await discord('POST', `/channels/${thread.id}/messages`, msg(container(0x71717a, [
            text(`### Mientras te atienden: ${hint.title}\n${hint.body}`),
            text('-# Sugerencia automática. Si se resuelve, puedes cerrar el ticket con el botón de arriba.'),
        ]))).catch(() => {});
    }
    await audit(`Ticket #${ticket.id} (${ticket.category_label || 'consulta'}) abierto: <#${thread.id}>${ticket.priority ? ' · VIP' : ''}`);
    return thread.id;
}

/** Pide al cliente que valore la atención (por privado; si los tiene cerrados, en el hilo). */
async function askRating(id, t) {
    if (!t.user) return;
    const payload = msg(container(accent, [
        text(`### ¿Qué tal te hemos atendido?\nTu ticket #${id} se ha cerrado. Valóralo del 1 al 5: nos ayuda a mejorar.`),
        row(...[1, 2, 3, 4, 5].map((n) => ({ type: 2, style: n >= 4 ? 3 : 2, label: `${n}`, custom_id: `ticket:rate:${id}:${n}` }))),
    ]));
    try {
        const dm = await discord('POST', '/users/@me/channels', { recipient_id: t.user });
        await discord('POST', `/channels/${dm.id}/messages`, payload);
    } catch {
        await discord('POST', `/channels/${t.thread}/messages`, payload).catch(() => {});
    }
}

async function closeThread(id, note) {
    const t = st.tickets[id];
    if (!t) return;
    await discord('POST', `/channels/${t.thread}/messages`, { content: note, allowed_mentions: { parse: [] } }).catch(() => {});
    await askRating(id, t);
    await discord('PATCH', `/channels/${t.thread}`, { archived: true, locked: true }).catch(() => {});
    delete st.tickets[id];
    saveState();
    await audit(`Ticket #${id} cerrado. ${note}`);
}

async function pumpTicket(id) {
    const t = st.tickets[id];
    if (!t) return;
    let data;
    try {
        data = await panel('GET', `/api/bot/tickets/${id}/messages?after=${t.last}`);
    } catch (e) {
        if (e.status === 404) return closeThread(id, 'El ticket se ha eliminado en el panel.');
        throw e;
    }
    for (const m of data.messages) {
        t.last = Math.max(t.last, m.id);
        if (t.mine.includes(m.id)) continue;
        const parts = [m.message, m.audio_url ? `Mensaje de voz: ${m.audio_url}` : null].filter(Boolean).join('\n');
        if (!parts) continue;
        await discord('POST', `/channels/${t.thread}/messages`, msg(container(accent, [
            text(`**${m.author}** · desde el panel`),
            text(cut(parts, 3500)),
        ])));
    }
    t.mine = t.mine.filter((x) => x > t.last - 1000).slice(-50);
    if (!t.user && data.ticket.user?.discord_id) t.user = data.ticket.user.discord_id;
    saveState();
    if (data.ticket.status === 'closed') await closeThread(id, 'Ticket cerrado desde el panel.');
}

async function syncTickets(open) {
    st.tickets ??= {};
    for (const t of open) {
        if (!st.tickets[t.id]) {
            await createThread(t);
            // Sin reenviar el historial anterior a crear el hilo: queda en el panel.
            const first = await panel('GET', `/api/bot/tickets/${t.id}/messages?after=0`);
            st.tickets[t.id].last = first.messages.reduce((a, m) => Math.max(a, m.id), 0);
            if (first.messages.length) {
                await discord('POST', `/channels/${st.tickets[t.id].thread}/messages`, {
                    content: `Este ticket ya tiene ${first.messages.length} mensaje(s) en el panel.`,
                });
            }
            saveState();
        }
    }
    // También los que ya no salen como abiertos: pumpTicket ve que están cerrados y archiva el hilo.
    for (const id of Object.keys(st.tickets)) {
        await pumpTicket(id).catch((e) => log(`[SYNC] ticket #${id}: ${e.message}`));
    }
}

/* ------------------------------------------------------------ bucle general */

async function tick() {
    const data = await panel('GET', '/api/bot/sync');
    lastData = data;
    const steps = [
        ['anuncios', () => syncAnnouncements(data.announcements)],
        ['estado', () => syncStatus(data)],
        ['roles', () => syncRoles(data.members)],
        ['tickets', () => syncTickets(data.tickets)],
        ['cumpleaños', () => birthdays.sync(data.birthdays || [])],
        ['actividad', () => syncActivity(data)],
        ['avisos', () => community.syncRolePicker()],
        ['reseñas', () => community.syncReviews(data.reviews)],
        ['sorteos', () => community.tickGiveaways()],
        ['referidos', () => members.retryReferrals()],
        ['invitaciones', async () => { await refreshReferralRewards(); await upsert('invites', ctx.layout.channels.invites, invitesPost(), bannerFor('invites')); }],
    ];
    if (Date.now() - lastContent > CATALOG_EVERY) {
        steps.push(['canales', async () => { await content.sync(data); lastContent = Date.now(); }]);
    }
    if (Date.now() - lastCatalog > CATALOG_EVERY) {
        const season = await refreshSeason();
        await refreshIdentity().catch((e) => log(`[SYNC] avatar: ${e.message}`));
        steps.unshift(['catálogo', async () => {
            for (const [key, ch, payload] of [...staticPosts(season), ...(await catalogPosts(season))]) await upsert(key, ch, payload, bannerFor(key));
            lastCatalog = Date.now();
        }]);
    }
    for (const [name, fn] of steps) {
        try {
            await fn();
        } catch (e) {
            log(`[SYNC] ${name}: ${e.message}`);
        }
    }
}

/* ------------------------------------------- #nuevas-cuentas y #compras */

const CYCLE = { hourly: 'hora', daily: 'día', weekly: 'semana', monthly: 'mes', quarterly: 'trimestre', semiannual: 'semestre', yearly: 'año' };
const CATEGORY = { minecraft: 'Minecraft', games: 'Juegos', bots: 'Bots', database: 'Base de datos', databases: 'Base de datos', web: 'Hosting web', voice: 'Voz', software: 'Aplicaciones', ranks: 'Rango VIP' };

function signupPost(u, total) {
    return msg(container(accent, [
        text(`### Nueva cuenta\n**${cut(u.name, 60)}**${u.discord_id ? ` (<@${u.discord_id}>)` : ''} acaba de unirse a Cinammon Network.`),
        text(`-# ${ts(u.at, 'R')}${total ? ` · ya somos ${total} usuarios` : ''}`),
        row(linkBtn('Crear mi cuenta', `${PANEL_PUBLIC}/register`)),
    ]));
}

function purchasePost(e) {
    const who = `**${cut(e.user || 'Alguien', 60)}**${e.discord_id ? ` (<@${e.discord_id}>)` : ''}`;
    const what = `**${cut(e.plan || CATEGORY[e.category] || 'un servicio', 80)}**`;
    const details = [
        CATEGORY[e.category] && e.plan ? CATEGORY[e.category] : null,
        e.ram_mb ? `${e.ram_mb >= 1024 ? `${+(e.ram_mb / 1024).toFixed(1)} GB` : `${e.ram_mb} MB`} RAM` : null,
        e.type !== 'free' && e.amount != null ? `${eur(e.amount)}${CYCLE[e.cycle] ? ` / ${CYCLE[e.cycle]}` : ''}` : null,
    ].filter(Boolean).join(' · ');
    const view = {
        free: [0x10b981, 'Nuevo servidor gratuito', `${who} ha creado su servidor gratis: ${what}.`, linkBtn('Crear el mío gratis', `${BILLING}/coins`)],
        purchase: [accent, 'Nueva compra', `${who} ha contratado ${what}.`, linkBtn('Ver planes', `${BILLING}/store`)],
        renewal: [0x6366f1, 'Renovación', `${who} ha renovado ${what}.`, linkBtn('Ver planes', `${BILLING}/store`)],
    }[e.type] || [accent, 'Compra', `${who}: ${what}.`, linkBtn('Ver planes', `${BILLING}/store`)];
    return msg(container(view[0], [
        text(`### ${view[1]}\n${view[2]}`),
        details ? text(details) : null,
        text(`-# ${ts(e.at, 'R')}`),
        row(view[3]),
    ].filter(Boolean)));
}

/** Publica cuentas nuevas y compras. La primera vez solo memoriza lo que ya había (no inunda el canal). */
async function syncActivity(data) {
    const ch = ctx.layout.channels;
    const first = !st.activity;
    st.activity ??= { users: [], events: [] };
    const A = st.activity;
    let changed = first;

    for (const u of [...(data.signups || [])].reverse()) {
        if (A.users.includes(u.id)) continue;
        if (!first && ch.signups) await discord('POST', `/channels/${ch.signups}/messages`, signupPost(u, data.stats?.users));
        A.users.push(u.id);
        changed = true;
    }
    if (Array.isArray(data.purchases)) {
        const seed = !A.purchasesSeeded;
        if (seed) { A.purchasesSeeded = true; changed = true; }
        for (const e of data.purchases) {
            if (A.events.includes(e.key)) continue;
            if (!seed && ch.purchases) await discord('POST', `/channels/${ch.purchases}/messages`, purchasePost(e));
            A.events.push(e.key);
            changed = true;
        }
    }
    A.users = A.users.slice(-300);
    A.events = A.events.slice(-500);
    if (changed) saveState();
}

/** Rol "Amigo de Cinammon" (lo da el Owner con /amigo): justo debajo de los rangos VIP. */
async function ensureFriendRole() {
    const L = ctx.layout;
    const key = 'rank:Amigo de Cinammon';
    const roles = await discord('GET', `/guilds/${ctx.guild}/roles`);
    if (L.roles[key] && roles.some((r) => r.id === L.roles[key])) return;
    const role = await discord('POST', `/guilds/${ctx.guild}/roles`, { name: 'Amigo de Cinammon', color: 0x38bdf8, hoist: true, mentionable: false, permissions: '0' }, 'Rol Amigo (lo concede el Owner)');
    const vip = Object.entries(L.roles).filter(([k]) => k.startsWith('rank:') && k !== key).map(([, id]) => roles.find((r) => r.id === id)).filter(Boolean);
    const lowest = Math.min(...vip.map((r) => r.position));
    if (Number.isFinite(lowest)) await discord('PATCH', `/guilds/${ctx.guild}/roles`, [{ id: role.id, position: lowest }]).catch((e) => log(`[SYNC] posición del rol Amigo: ${e.message}`));
    L.roles[key] = role.id;
    fs.writeFileSync(LAYOUT_PATH, JSON.stringify(L, null, 2));
    log(`[SYNC] Rol Amigo de Cinammon creado (${role.id}).`);
}

/** Crea #nuevas-cuentas y #compras (solo lectura) justo debajo de #llegadas. */
async function ensureFeedChannels() {
    const L = ctx.layout;
    const VIEW = 1n << 10n, SEND = 1n << 11n, THREADS = (1n << 35n) | (1n << 36n) | (1n << 38n);
    let created = false;
    for (const [key, name, topic] of [
        ['signups', '├・nuevas-cuentas', 'Cada cuenta nueva en cinammon.net. Se publica sola.'],
        ['purchases', '├・compras', 'Compras, renovaciones y servidores gratuitos. Se publica solo.'],
    ]) {
        if (L.channels[key] && (await discord('GET', `/channels/${L.channels[key]}`).then(() => true).catch((e) => e.status !== 404))) continue;
        const c = await discord('POST', `/guilds/${ctx.guild}/channels`, {
            name, type: 0, parent_id: L.categories.community, topic,
            permission_overwrites: [
                { id: ctx.guild, type: 0, allow: String(VIEW), deny: String(SEND | THREADS) },
                { id: ctx.appId, type: 1, allow: String(VIEW | SEND), deny: '0' },
            ],
        }, 'Canales de actividad');
        L.channels[key] = c.id;
        created = true;
        log(`[SYNC] Canal ${name} creado (${c.id}).`);
    }
    if (!created) return;
    fs.writeFileSync(LAYOUT_PATH, JSON.stringify(L, null, 2));
    // Orden en COMUNIDAD: ... #llegadas, #nuevas-cuentas, #compras, y después el resto (voz incluida)
    const all = (await discord('GET', `/guilds/${ctx.guild}/channels`)).filter((c) => c.parent_id === L.categories.community).sort((a, b) => a.position - b.position);
    const feed = [L.channels.signups, L.channels.purchases];
    const rest = all.filter((c) => !feed.includes(c.id));
    const at = rest.findIndex((c) => c.id === L.channels.arrivals) + 1 || rest.length;
    const ordered = [...rest.slice(0, at).map((c) => c.id), ...feed, ...rest.slice(at).map((c) => c.id)];
    const base = Math.min(...all.map((c) => c.position));
    await discord('PATCH', `/guilds/${ctx.guild}/channels`, ordered.map((id, i) => ({ id, position: base + i })));
}

/** Crea #llegadas (bienvenidas y despedidas) si todavía no existe. */
async function ensureArrivals() {
    const L = ctx.layout;
    if (L.channels.arrivals) {
        const ok = await discord('GET', `/channels/${L.channels.arrivals}`).then(() => true).catch((e) => e.status !== 404);
        if (ok) return;
    }
    const VIEW = 1n << 10n, SEND = 1n << 11n, THREADS = (1n << 35n) | (1n << 36n) | (1n << 38n);
    const ch = await discord('POST', `/guilds/${ctx.guild}/channels`, {
        name: 'llegadas',
        type: 0,
        parent_id: L.categories.community,
        topic: 'Bienvenidas y despedidas. Se publican solas.',
        permission_overwrites: [
            { id: ctx.guild, type: 0, allow: String(VIEW), deny: String(SEND | THREADS) },
            { id: ctx.appId, type: 1, allow: String(VIEW | SEND), deny: '0' },
        ],
    }, 'Canal de bienvenidas');
    L.channels.arrivals = ch.id;
    fs.writeFileSync(LAYOUT_PATH, JSON.stringify(L, null, 2));
    log(`[SYNC] Canal #llegadas creado (${ch.id}).`);
}

async function registerCommands() {
    let categories = [];
    try {
        categories = (await billing('/api/plans')).categories.filter((c) => c.key !== 'ranks');
    } catch {}
    const defs = commands.definitions(categories);
    await discord('PUT', `/applications/${ctx.appId}/guilds/${ctx.guild}/commands`, defs);
    await discord('PUT', `/applications/${ctx.appId}/commands`, []).catch(() => {}); // fuera los comandos globales antiguos
    log(`[SYNC] ${defs.length} comandos registrados.`);
}

/** Mensaje V2 con una imagen adjunta (tarjetas de bienvenida). */
async function sendFile(channel, filename, png, components, mentions, color) {
    if (!channel) return;
    const body = {
        flags: 1 << 15,
        components: [container(color ?? accent, [{ type: 12, items: [{ media: { url: `attachment://${filename}` } }] }, ...components])],
        attachments: [{ id: 0, filename }],
        allowed_mentions: { parse: [], ...(mentions || {}) },
    };
    const form = new FormData();
    form.append('payload_json', JSON.stringify(body));
    form.append('files[0]', new Blob([png], { type: 'image/png' }), filename);
    const res = await fetch(`${API}/channels/${channel}/messages`, { method: 'POST', headers: { Authorization: `Bot ${ctx.token}` }, body: form });
    if (!res.ok) log(`[SYNC] tarjeta: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

const runNow = () => serial(tick);
function runSoon() {
    clearTimeout(runTimer);
    runTimer = setTimeout(() => runNow().catch(() => {}), 3000);
}

function start({ token, guildId, appId }) {
    let layout;
    try {
        layout = JSON.parse(fs.readFileSync(LAYOUT_PATH, 'utf8'));
    } catch {
        log('[SYNC] Falta discord-layout.json: sincronización con Discord desactivada.');
        return;
    }
    ctx = { token, layout, guild: layout.guild_id || guildId, appId };
    st = loadState();

    commands.init({
        ui: { text, sep, row, linkBtn, container, cut, eur, ts },
        panel, billing, log,
        accent: () => accent,
        lastData: () => lastData,
        layout: () => ctx.layout,
        members,
        createGiveaway: (args) => community.createGiveaway(args),
        runNow, runSoon,
        PANEL: PANEL_PUBLIC,
        BILLING,
    });
    community.init({
        discord, log, saveState, upsert,
        ui: { text, sep, row, linkBtn, container, cut, ts },
        layoutPath: LAYOUT_PATH,
        st: () => st,
        ctx: () => ctx,
        accent: () => accent,
        PANEL: PANEL_PUBLIC,
        BILLING,
        editOriginal: (i, payload) => fetch(`${API}/webhooks/${i.application_id}/${i.token}/messages/@original`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        }).catch(() => {}),
        followup: (i, payload) => fetch(`${API}/webhooks/${i.application_id}/${i.token}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        }).catch(() => {}),
    });
    commands.initModeration({
        discord, log, saveState, panel, runSoon, PANEL: PANEL_PUBLIC,
        ui: { text, sep, row, container, cut, ts },
        st: () => st,
        ctx: () => ({ ...ctx, layout: ctx.layout }),
        accent: () => accent,
    });
    assistant.init({
        discord, log, saveState,
        ui: { text, sep, row, container },
        st: () => st,
        ctx: () => ctx,
        accent: () => accent,
        PANEL: PANEL_PUBLIC,
        BILLING,
        matchTip: (t) => community.matchSupportTip(t),
    });
    support.init({
        discord, log, saveState, assistant,
        ui: { text, sep, row, container },
        st: () => st,
        ctx: () => ctx,
        accent: () => accent,
        isStaff: (m) => isStaffMember(m),
        editOriginal: (i, body) => editOriginal(i, body),
    });
    birthdays.init({
        discord, sendV2, panel, log, saveState,
        ui: { text, sep, row, container },
        st: () => st,
        ctx: () => ctx,
        accent: () => accent,
        saveLayout: () => fs.writeFileSync(LAYOUT_PATH, JSON.stringify(ctx.layout, null, 2)),
        PANEL: PANEL_PUBLIC,
        BILLING,
        followup: (i, payload) => fetch(`${API}/webhooks/${i.application_id}/${i.token}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        }).catch(() => {}),
    });
    verify.init({
        discord, log, saveState, audit, members,
        st: () => st,
        ctx: () => ctx,
        accent: () => accent,
        ui: { text, sep, row, container },
        layoutSave: () => fs.writeFileSync(LAYOUT_PATH, JSON.stringify(ctx.layout, null, 2)),
        backupPath: path.join(ROOT, 'permisos-antes-de-verificacion.json'),
        editOriginal: (i, payload) => fetch(`${API}/webhooks/${i.application_id}/${i.token}/messages/@original`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        }).catch(() => {}),
    });
    content.init({
        discord, discordFiles, log, saveState, upsert,
        art, pal: () => pal, ART_VERSION,
        ui: { text, sep, row, linkBtn, container, cut, ts },
        st: () => st,
        ctx: () => ctx,
        accent: () => accent,
        PANEL: PANEL_PUBLIC,
        BILLING,
        signupPost, purchasePost,
        reviewCard: (r) => community.reviewCard(r),
        suggestions,
    });
    suggestions.init({
        discord, log, saveState,
        ui: { text, sep, row, container },
        st: () => st,
        ctx: () => ctx,
        isStaff: (m) => isStaffMember(m),
        editOriginal: (i, body) => editOriginal(i, body),
    });
    members.init({
        discord, panel, sendFile, log, saveState,
        st: () => st,
        ctx: () => ctx,
        pal: () => pal,
        accent: () => accent,
        forgetRoles: (id) => { if (st.roles) delete st.roles[id]; },
    });

    if (timer) clearInterval(timer);
    const run = () => serial(tick).catch((e) => log(`[SYNC] ${e.message}`));
    serial(async () => {
        await ensureArrivals().catch((e) => log(`[SYNC] #llegadas: ${e.message}`));
        await ensureFeedChannels().catch((e) => log(`[SYNC] canales de actividad: ${e.message}`));
        await ensureFriendRole().catch((e) => log(`[SYNC] rol Amigo: ${e.message}`));
        await community.ensureNotificationRoles().catch((e) => log(`[SYNC] roles de avisos: ${e.message}`));
        await community.ensureCommunityChannels().catch((e) => log(`[SYNC] canales comunitarios: ${e.message}`));
        // Primero el canal de verificación; después se cierra el resto (solo una vez)
        await verify.ensureChannel().then(() => verify.lockServer()).catch((e) => log(`[SYNC] verificación: ${e.message}`));
        await registerCommands().catch((e) => log(`[SYNC] comandos: ${e.message}`));
        await members.loadInvites();
        await members.checkPermissions().catch((e) => log(`[SYNC] permisos de invitaciones: ${e.message}`));
    });
    setTimeout(run, 5000);
    timer = setInterval(run, SYNC_EVERY);
    if (presenceTimer) clearInterval(presenceTimer);
    setTimeout(rotatePresence, 15000); // tras la primera sincronización, ya con datos
    presenceTimer = setInterval(rotatePresence, 2 * 60 * 1000);
    log(`[SYNC] Sincronización con el servidor ${ctx.guild} activa (cada ${SYNC_EVERY / 1000} s).`);
}

/** Eventos del gateway que no son mensajes ni interacciones. */
async function onEvent(t, d) {
    const guildId = d?.guild_id || (t === 'GUILD_CREATE' ? d?.id : null);
    if (!ctx || guildId !== ctx.guild) return;
    if (t === 'GUILD_MEMBER_ADD' || t === 'GUILD_MEMBER_REMOVE') {
        const u = d.user || {};
        log(`[SYNC] ${t === 'GUILD_MEMBER_ADD' ? 'Entra' : 'Sale'}: ${u.global_name || u.username} (${u.id})${u.bot ? ' [bot: sin bienvenida]' : ''}`);
    }
    try {
        if (t === 'GUILD_CREATE') community.seedVoiceStates(d.voice_states);
        else if (t === 'GUILD_MEMBER_ADD') await members.onJoin(d);
        else if (t === 'GUILD_MEMBER_REMOVE') await members.onLeave(d);
        else if (t === 'INVITE_CREATE') members.onInviteCreate(d);
        else if (t === 'THREAD_CREATE') await suggestions.onThreadCreate(d);
        else if (t === 'INVITE_DELETE') members.onInviteDelete(d);
        else if (t === 'VOICE_STATE_UPDATE') await community.onVoiceStateUpdate(d);
    } catch (e) {
        log(`[SYNC] ${t}: ${e.message}`);
    }
}

/* ------------------------------------------------ eventos de Discord (gateway) */

/**
 * Mensajes: guardia de menciones al staff, asistente en #soporte y
 * mensajes de los hilos de ticket (se guardan en el panel).
 */
async function onMessage(message) {
    if (!ctx || message.author?.bot || message.webhook_id) return;
    const entry = Object.entries(st?.tickets || {}).find(([, t]) => t.thread === message.channel_id);
    if (message.guild_id === ctx.guild) {
        try {
            if (await moderation.guardMentions(message, !!entry)) return;
            if (ctx.layout.channels?.help && message.channel_id === ctx.layout.channels.help) {
                await support.onChannelMessage(message, isStaffMember(message.member));
            } else if (support.isSupportThread(message.channel_id)) {
                support.onThreadMessage(message);
            }
        } catch (e) {
            log(`[SYNC] mensaje: ${e.message}`);
        }
    }
    if (!entry) return;
    const [id] = entry;
    const text = [message.content, ...(message.attachments || []).map((a) => a.url)].filter(Boolean).join('\n');
    if (!text) return;
    await serial(async () => {
        try {
            const res = await panel('POST', `/api/bot/tickets/${id}/messages`, {
                discord_id: message.author.id,
                discord_name: message.member?.nick || message.author.global_name || message.author.username,
                message: cut(text, 4000),
            });
            st.tickets[id]?.mine.push(res.id);
            saveState();
        } catch (e) {
            log(`[SYNC] mensaje de Discord al ticket #${id}: ${e.message}`);
            await discord('POST', `/channels/${message.channel_id}/messages`, {
                content: 'No se pudo guardar este mensaje en el panel. Inténtalo de nuevo o responde desde la web.',
                message_reference: { message_id: message.id },
            }).catch(() => {});
        }
    });
}

async function respond(interaction, body) {
    await fetch(`${API}/interactions/${interaction.id}/${interaction.token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).catch(() => {});
}

const editOriginal = (interaction, body) => fetch(`${API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // Al editar no se puede tocar la marca de efímero
    body: JSON.stringify(body.flags ? { ...body, flags: body.flags & ~64 } : body),
}).catch(() => {});

const ephemeral = (content) => ({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const ephCard = (color, ...components) => ({ flags: 64 | V2, components: [container(color, components)], allowed_mentions: { parse: [] } });
const NOT_LINKED = `Para abrir tickets desde Discord necesitas tu cuenta vinculada: en el panel ve a **Ajustes → Perfil → Código para el bot** y aquí escribe \`/vincular codigo:\`. También puedes abrirlo en ${PANEL_PUBLIC}/tickets.`;

/** Paso 1: elegir el tipo de ticket. */
function categoryPicker() {
    return ephCard(accent,
        text('## Abrir ticket\n**1.** Elige de qué trata · **2.** Rellena el formulario · **3.** Se abre un hilo privado con el equipo.'),
        { type: 1, components: [{
            type: 3, custom_id: 'ticket:cat', placeholder: 'Elige el tipo de consulta',
            options: Object.entries(TICKET_CATS).map(([value, c]) => ({ value, label: c.label, description: c.hint })),
        }] },
        text('-# ¿Es una duda rápida? Prueba `/pregunta`: el asistente te responde al momento.'),
    );
}

/** Paso 2: formulario según el tipo. */
function ticketModal(cat, serverId = 0) {
    const c = TICKET_CATS[cat] || TICKET_CATS.otro;
    const input = (custom_id, label, style, extra) => ({ type: 1, components: [{ type: 4, custom_id, label, style, ...extra }] });
    return {
        type: 9,
        data: {
            custom_id: `ticket:modal:${cat}:${serverId}`,
            title: cut(`Ticket: ${c.label}`, 45),
            components: [
                input('subject', 'Resúmelo en una frase', 1, { min_length: 3, max_length: 120, required: true, placeholder: c.subject }),
                input('message', 'Cuéntanos los detalles', 2, { min_length: 10, max_length: 2500, required: true, placeholder: c.details }),
                ...(c.extra ? [input(c.extra.id, c.extra.label, c.extra.style, { required: c.extra.required, max_length: c.extra.style === 2 ? 1200 : 100, placeholder: c.extra.placeholder })] : []),
            ],
        },
    };
}

/** Botones, menús y formularios de tickets (y lo demás va a commands). */
async function onInteraction(interaction) {
    const id = interaction.data?.custom_id || '';
    if (!ctx) return false;
    if (await verify.handle(interaction, respond)) return true;
    if (await community.handleInteraction(interaction, respond)) return true;
    if (id.startsWith('sug:') || (interaction.type === 2 && interaction.data?.name === 'sugerir')) {
        try {
            const r = interaction.type === 2 ? suggestions.askModal() : await suggestions.component(interaction, respond);
            if (r) await respond(interaction, r);
        } catch (e) {
            log(`[SUGERENCIAS] ${id || '/sugerir'}: ${e.message}`);
            await respond(interaction, ephemeral('No se pudo completar. Inténtalo otra vez.')).catch(() => {});
        }
        return true;
    }
    if (id.startsWith('sup:')) {
        try {
            const r = await support.component(interaction, respond);
            if (r) await respond(interaction, r);
        } catch (e) {
            log(`[SOPORTE] ${id}: ${e.message}`);
            await respond(interaction, ephemeral('No se pudo completar. Inténtalo otra vez.'));
        }
        return true;
    }
    if (!id.startsWith('ticket:')) return commands.handle(interaction);
    const user = interaction.member?.user || interaction.user;
    const [, action, a1, a2] = id.split(':');

    // Abrir: si ya tiene uno, se le manda allí
    if ((action === 'open' || action === 'new') && interaction.type === 3) {
        const existing = action === 'open' ? openTicketOf(user.id) : null;
        if (existing) {
            await respond(interaction, { type: 4, data: ephCard(accent,
                text(`### Ya tienes un ticket abierto\nEscribe en <#${existing.thread}> (ticket #${existing.id}): el equipo lo verá. Si es de otro tema distinto, puedes abrir otro.`),
                row({ type: 2, style: 2, label: 'Es otro tema: abrir otro', custom_id: 'ticket:new' }),
            ) });
        } else {
            const data = categoryPicker();
            await respond(interaction, action === 'new' ? { type: 7, data: { ...data, flags: V2 } } : { type: 4, data });
        }
        return true;
    }

    // Mis tickets: lista privada con enlace a cada hilo
    if (action === 'mine' && interaction.type === 3) {
        await respond(interaction, { type: 5, data: { flags: 64 } });
        try {
            const { tickets } = await panel('GET', `/api/bot/discord/${user.id}/tickets`);
            const line = (t) => {
                const thread = st.tickets?.[t.id]?.thread;
                return `**#${t.id}** ${cut(t.subject, 60)} · \`${(STATUS_ES[t.status] || t.status).toUpperCase()}\` · ${thread ? `<#${thread}>` : `[ver en el panel](${t.url})`}`;
            };
            await editOriginal(interaction, ephCard(accent,
                text(`## Mis tickets\n${tickets.length ? tickets.map(line).join('\n') : 'No has abierto ningún ticket todavía.'}`),
                text('-# Los abiertos tienen su hilo privado aquí; los cerrados se quedan en el panel.'),
                row({ type: 2, style: 1, label: 'Abrir ticket', custom_id: 'ticket:open' }, linkBtn('Todos en el panel', `${PANEL_PUBLIC}/tickets`)),
            ));
        } catch (e) {
            await editOriginal(interaction, ephCard(0xf59e0b, text(e.status === 404 ? NOT_LINKED : 'No se pudieron cargar tus tickets.')));
        }
        return true;
    }

    // Tipo elegido: "Mi servidor" pide antes cuál; el resto va directo al formulario
    if (action === 'cat' && interaction.type === 3) {
        const cat = interaction.data.values?.[0] || 'otro';
        if (cat !== 'servidor') {
            await respond(interaction, ticketModal(cat));
            return true;
        }
        await respond(interaction, { type: 6 });
        let servers = [];
        try {
            servers = (await panel('GET', `/api/bot/discord/${user.id}/account`)).servers || [];
        } catch (e) {
            await editOriginal(interaction, ephCard(0xf59e0b, text(e.status === 404 ? NOT_LINKED : `No se pudo consultar tu cuenta. Prueba otra vez o ábrelo en ${PANEL_PUBLIC}/tickets`)));
            return true;
        }
        await editOriginal(interaction, ephCard(accent,
            text('## Abrir ticket · Mi servidor\n¿Con qué servidor necesitas ayuda?'),
            { type: 1, components: [{
                type: 3, custom_id: 'ticket:srv', placeholder: 'Elige el servidor',
                options: [
                    ...servers.slice(0, 24).map((s) => ({ value: String(s.id), label: cut(s.name || `Servidor ${s.id}`, 100), description: cut([s.egg?.name || s.egg, s.status].filter((x) => typeof x === 'string').join(' · '), 100) || undefined })),
                    { value: '0', label: servers.length ? 'Otro / no aparece en la lista' : 'Aún no tengo servidor', description: 'Lo explicas en el formulario' },
                ],
            }] },
        ));
        return true;
    }

    if (action === 'srv' && interaction.type === 3) {
        await respond(interaction, ticketModal('servidor', Number(interaction.data.values?.[0]) || 0));
        return true;
    }

    // Formulario enviado (ticket:modal:<tipo>:<servidor>; "ticket:modal" a secas es el formulario antiguo)
    if (action === 'modal' && interaction.type === 5) {
        const field = (k) => interaction.data.components.flatMap((r) => r.components).find((c) => c.custom_id === k)?.value?.trim() || '';
        const cat = TICKET_CATS[a1] ? a1 : 'otro';
        const extra = TICKET_CATS[cat].extra && field('extra') ? `\n\n**${TICKET_CATS[cat].extra.label}:**\n${field('extra')}` : '';
        await respond(interaction, { type: 5, data: { flags: 64 } });
        await serial(async () => {
            try {
                const res = await panel('POST', '/api/bot/tickets', {
                    discord_id: user.id,
                    subject: field('subject'),
                    message: cut(field('message') + extra, 4000),
                    category: cat,
                    server_id: Number(a2) || null,
                });
                const thread = await createThread(res.ticket);
                await editOriginal(interaction, ephCard(0x10b981,
                    text(`### Ticket #${res.ticket.id} abierto\nSigue en <#${thread}>: es privado, solo lo ves tú y el equipo. Te responderemos allí y en el panel.`),
                ));
            } catch (e) {
                if (e.status === 404) await editOriginal(interaction, ephCard(0xf59e0b, text(NOT_LINKED)));
                else {
                    log(`[SYNC] abrir ticket: ${e.message}`);
                    await editOriginal(interaction, ephCard(0xef4444, text(`No se pudo abrir el ticket. Puedes abrirlo en ${PANEL_PUBLIC}/tickets`)));
                }
            }
        });
        return true;
    }

    // "Me encargo": solo staff
    if (action === 'claim' && interaction.type === 3) {
        if (!isStaffMember(interaction.member)) {
            await respond(interaction, ephemeral('Este botón es para el equipo. Escribe aquí y te responderán.'));
            return true;
        }
        await respond(interaction, { type: 5, data: { flags: 64 } });
        const name = interaction.member?.nick || user.global_name || user.username;
        try {
            const { ticket } = await panel('POST', `/api/bot/tickets/${a1}/claim`, { name });
            const t = st.tickets[a1];
            if (t?.intro) await discord('PATCH', `/channels/${t.thread}/messages/${t.intro}`, ticketCard(ticket)).catch(() => {});
            await discord('POST', `/channels/${interaction.channel_id}/messages`, { content: `**${name}** se encarga de este ticket.`, allowed_mentions: { parse: [] } }).catch(() => {});
            await editOriginal(interaction, { content: 'Listo: el ticket es tuyo.' });
        } catch (e) {
            log(`[SYNC] reclamar ticket #${a1}: ${e.message}`);
            await editOriginal(interaction, { content: 'No se pudo asignar el ticket.' });
        }
        return true;
    }

    // Cerrar: primero confirmación
    if (action === 'close' && interaction.type === 3) {
        await respond(interaction, { type: 4, data: ephCard(0xef4444,
            text(`### ¿Cerrar el ticket #${a1}?\nEl hilo se archiva y ya no se podrá escribir. Si vuelve a pasar, abre otro.`),
            row({ type: 2, style: 4, label: 'Sí, cerrar', custom_id: `ticket:closeok:${a1}` }),
        ) });
        return true;
    }

    if (action === 'closeok' && interaction.type === 3) {
        await respond(interaction, { type: 6 });
        await serial(async () => {
            try {
                await panel('POST', `/api/bot/tickets/${a1}/status`, { status: 'closed' });
                await closeThread(a1, `Ticket cerrado por <@${user.id}>.`);
                await editOriginal(interaction, ephCard(0x10b981, text('Ticket cerrado.')));
            } catch (e) {
                log(`[SYNC] cerrar ticket #${a1}: ${e.message}`);
                await editOriginal(interaction, ephCard(0xef4444, text('No se pudo cerrar. Prueba desde el panel.')));
            }
        });
        return true;
    }

    // Valoración 1-5 (por privado o en el hilo)
    if (action === 'rate' && interaction.type === 3) {
        const n = Number(a2);
        try {
            await panel('POST', `/api/bot/tickets/${a1}/rating`, { discord_id: user.id, rating: n });
        } catch (e) {
            await respond(interaction, ephemeral(e.status === 403 ? 'Solo quien abrió el ticket puede valorarlo.' : 'No se pudo guardar la valoración.'));
            return true;
        }
        await respond(interaction, { type: 7, data: { flags: V2, components: [container(0x10b981, [text(`### Gracias\nHas valorado el ticket #${a1} con **${n}/5**.${n <= 2 ? ' Sentimos que no haya ido bien: lo revisaremos.' : ''}`)])] } });
        await audit(`Ticket #${a1} valorado con ${n}/5 por <@${user.id}>`);
        return true;
    }

    await respond(interaction, ephemeral('Esta acción ya no está disponible.'));
    return true;
}

module.exports = { start, onMessage, onInteraction, onEvent, runNow };
