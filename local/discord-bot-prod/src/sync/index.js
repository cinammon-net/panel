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
const members = require('./members');

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
let timer = null;
let queue = Promise.resolve();
let lastData = null;
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
    await discord('POST', `/channels/${ch}/messages`, { content: cut(text, 1900), allowed_mentions: { parse: [] } }).catch(() => {});
}

/* --------------------------------------------- color de temporada (como la web) */

async function refreshSeason() {
    try {
        const season = await billing('/api/season');
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
    help: { title: 'SOPORTE', subtitle: 'Dudas rápidas de la comunidad', icon: 'help' },
    commands: { title: 'COMANDOS', subtitle: 'Todo lo de la web, desde Discord', icon: 'commands' },
    staff: { title: 'STAFF', subtitle: 'Herramientas del equipo', icon: 'staff' },
    arrivals: { title: 'LLEGADAS', subtitle: 'Bienvenidas y despedidas', icon: 'join' },
};
const bannerFor = (key) => (BANNERS[key] ? { name: key, ...BANNERS[key] } : undefined);

function staticPosts(season) {
    const ch = ctx.layout.channels;
    const promo = season?.promotion && season?.discount ? `**${season.promotion}:** ${season.discount}% de descuento en la tienda ahora mismo.` : null;
    return [
        ['welcome', ch.welcome, msg(container(accent, [
            text('# Bienvenida a Cinammon Network\nHosting de servidores de juegos, bots, webs y aplicaciones, con panel propio.'),
            sep(),
            text(`### Vincula tu cuenta\nEn el panel, **Ajustes → Perfil → Código para el bot**, y escribe aquí \`/vincular codigo:\` con ese código. Recibirás tus roles: <@&${ctx.layout.roles.client}> si tienes un servicio activo y el de tu rango VIP si lo tienes.`),
            text(`### Por dónde empezar\n<#${ch.rules}> · normas\n<#${ch.help}> · dudas rápidas\n<#${ch.tickets}> · temas de tu cuenta\n<#${ch.plans}> · planes y precios`),
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
                '**3.3** No menciones al staff para que te atienda antes: los tickets se responden por orden.',
            ].join('\n')),
            text('### 4 · Servicios alojados\n' + [
                '**4.1** Tus servidores deben cumplir los Términos: nada de DDoS, minería, phishing, spam ni abuso de recursos.',
                '**4.2** Un servicio que incumpla se suspende sin reembolso y puede suponer el cierre de la cuenta.',
            ].join('\n')),
            text('### 5 · Seguridad\n' + [
                '**5.1** El staff nunca te pedirá tu contraseña, códigos ni que pagues por mensaje privado.',
                '**5.2** Solo son oficiales las webs que terminan en **cinammon.net**. Si alguien se hace pasar por el staff, avísanos por ticket.',
                '**5.3** No compartas datos personales tuyos ni de otras personas.',
            ].join('\n')),
            sep(),
            text('### Sanciones\nAviso → silencio temporal → expulsión → baneo. Según la gravedad se puede saltar directamente al baneo. Si no estás de acuerdo con una sanción, abre un ticket.'),
            sep(2),
            row(linkBtn('Términos de servicio', `${PANEL_PUBLIC}/terms`), linkBtn('Privacidad', `${PANEL_PUBLIC}/privacy`)),
        ]))],
        ['help', ch.help, msg(container(accent, [
            text('# Soporte\nPregunta aquí lo que quieras sobre Cinammon: servidores, la tienda, el panel o cómo empezar. La comunidad y el staff te echan una mano.'),
            sep(),
            text(`**Antes de preguntar**\n- Mira si está en la web o en <#${ch.status}> (caídas y mantenimientos).\n- Nada de contraseñas, correos ni datos de pago aquí: es un canal público.\n- Si es algo de **tu cuenta, un pago o tu servidor**, abre un ticket en <#${ch.tickets}>.`),
            sep(2),
            row({ type: 2, style: 1, label: 'Abrir ticket', custom_id: 'ticket:open' }, linkBtn('Panel', PANEL_PUBLIC)),
        ]))],
        ['commands', ch.commands, msg(container(accent, [
            text('# Comandos\nLo que haces en la web, desde aquí. Las respuestas de tu cuenta solo las ves tú.'),
            sep(),
            text('### Tu cuenta\n`/cuenta` resumen de todo\n`/perfil` cambiar nombre y foto de perfil de la web\n`/servidores` y `/servidor` encender, reiniciar, apagar, editar nombre e info y ajustes del juego\n`/consola` enviar un comando a tu servidor\n`/monedas` y `/diario` saldo, racha y premio diario\n`/facturas` facturas y pagos pendientes\n`/tickets` tus tickets de soporte'),
            text('### Comunidad\n`/estado` · `/anuncios` · `/planes` · `/rangos` · `/invitaciones` · `/top-invitaciones` · `/ping` · `/ayuda`'),
            sep(),
            text('-# Para usar los de tu cuenta, vincúlala primero: `/vincular`.'),
        ]))],
        ['staff', ch.staff, msg(container(accent, [
            text('# Staff\nCanal privado del equipo.'),
            sep(),
            text(`**Desde Discord**\n\`/anuncio\` publica en la web y en <#${ch.announcements}> o <#${ch.offers}>\n\`/mantenimiento\` programa un mantenimiento (aviso en <#${ch.status}>)\n\`/sincronizar\` fuerza la sincronización con la web\n\n**Tickets**: cada ticket del panel es un hilo privado en <#${ch.tickets}>; lo que escribáis ahí le llega al cliente en la web.\n**Registro** de roles, anuncios y tickets en <#${ch.logs}>.`),
            sep(2),
            row(linkBtn('Panel de administración', `${PANEL_PUBLIC}/admin`)),
        ]))],
        ['tickets', ch.tickets, msg(container(accent, [
            text('# Soporte por ticket\nPulsa **Abrir ticket** y se creará un hilo privado entre tú y el equipo.'),
            sep(),
            text(`El ticket es el mismo que en el panel: responde aquí o en ${PANEL_PUBLIC}/tickets y verás los mensajes en los dos sitios.\n-# Necesitas tener tu cuenta del panel vinculada con Discord.`),
            sep(2),
            row({ type: 2, style: 1, label: 'Abrir ticket', custom_id: 'ticket:open' }, linkBtn('Mis tickets en el panel', `${PANEL_PUBLIC}/tickets`)),
        ]))],
    ];
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
        row(linkBtn('Ver la tienda', store)),
    ]))]);

    if (ranks) {
        posts.push(['ranks', ch.ranks, msg(
            container(accent, [text('# Rangos VIP\nAl comprarlo en la tienda, el rango se activa en el panel y, si tu cuenta está vinculada con Discord, recibes aquí su rol.')]),
            ranks.plans.slice(0, 10).map((p) => container(parseInt(String(p.perks?.color || '#ec4899').replace('#', ''), 16), [
                text(cut(`### ${p.name} · ${eur(p.price)}/mes\n${(p.features || []).map((f) => `- ${f}`).join('\n')}`, 330)),
            ])),
            row(linkBtn('Comprar rango', store)),
        )]);
    }

    try {
        const pm = await billing('/api/payment-methods');
        const lines = pm.methods.map((m) => `**${m.label}**\n-# ${m.auto ? 'Se activa al momento' : 'El equipo confirma el pago'}`);
        lines.push('**Monedas Cinammon**\n-# Servidores gratis canjeando monedas en la tienda');
        posts.push(['payments', ch.payments, msg(container(accent, [
            text('# Métodos de pago'),
            sep(),
            text(lines.join('\n')),
            sep(),
            text(`-# Los datos para pagar (IBAN, Bizum…) los ves en la factura, nunca por mensaje privado. Moneda: ${pm.currency}.`),
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

async function syncStatus(data) {
    const ch = ctx.layout.channels.status;
    const active = data.maintenances.filter((m) => m.active);
    const next = data.maintenances.filter((m) => !m.active);
    const nodes = data.nodes.length
        ? data.nodes.map((n) => `${n.maintenance ? '`MANT`' : n.online ? '`OK`' : '`CAÍDO`'} **${n.name}**`).join('\n')
        : 'Sin nodos.';
    const allOk = data.nodes.every((n) => n.online && !n.maintenance) && !active.length;
    const fmt = (m) => `**${m.title}**\n${ts(m.starts_at)}${m.ends_at ? ` – ${ts(m.ends_at, 't')}` : ''}${m.message ? `\n-# ${cut(m.message, 300)}` : ''}`;

    // El panel de estado se publica antes que los avisos para quedar arriba del canal.
    await upsert('status', ch, msg(container(allOk ? 0x10b981 : active.length ? 0xf59e0b : 0xef4444, [
        text(`# ${allOk ? 'Todos los servicios funcionan' : active.length ? 'Mantenimiento en curso' : 'Hay incidencias'}`),
        sep(),
        text(`### Nodos\n${cut(nodes, 1500)}`),
        active.length && text(`### En curso\n${cut(active.map(fmt).join('\n\n'), 1000)}`),
        next.length && text(`### Programados\n${cut(next.map(fmt).join('\n\n'), 1000)}`),
        sep(),
        text(`-# ${data.stats.servers} servidores alojados · se actualiza solo`),
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

const STATUS_ES = { open: 'Abierto', pending: 'Pendiente', closed: 'Cerrado' };

async function createThread(ticket) {
    const parent = ctx.layout.channels.tickets;
    const thread = await discord('POST', `/channels/${parent}/threads`, {
        name: cut(`#${ticket.id} ${ticket.subject}`, 100),
        type: 12, // hilo privado
        invitable: false,
        auto_archive_duration: 10080,
    }, `Ticket #${ticket.id}`);
    if (ticket.user?.discord_id) {
        await discord('PUT', `/channels/${thread.id}/thread-members/${ticket.user.discord_id}`).catch(() => {});
    }
    const who = ticket.user?.discord_id ? `<@${ticket.user.discord_id}>` : ticket.user?.name || 'Cliente';
    await discord('POST', `/channels/${thread.id}/messages`, {
        ...msg(container(accent, [
            text(`-# Ticket #${ticket.id} · ${STATUS_ES[ticket.status] || ticket.status}\n## ${cut(ticket.subject, 200)}`),
            text(`Abierto por ${who}`),
            sep(),
            text(cut(ticket.message || 'Sin descripción.', 3000)),
            sep(),
            text('-# Lo que escribas en este hilo se guarda en el ticket del panel.'),
            row(
                linkBtn('Ver en el panel', ticket.url || `${PANEL_PUBLIC}/tickets/${ticket.id}`),
                { type: 2, style: 4, label: 'Cerrar ticket', custom_id: `ticket:close:${ticket.id}` },
            ),
        ])),
        allowed_mentions: { users: ticket.user?.discord_id ? [ticket.user.discord_id] : [] },
    });
    st.tickets[ticket.id] = { thread: thread.id, last: 0, mine: [] };
    saveState();
    await audit(`Ticket #${ticket.id} conectado con <#${thread.id}>`);
    return thread.id;
}

async function closeThread(id, text) {
    const t = st.tickets[id];
    if (!t) return;
    await discord('POST', `/channels/${t.thread}/messages`, { content: text }).catch(() => {});
    await discord('PATCH', `/channels/${t.thread}`, { archived: true, locked: true }).catch(() => {});
    delete st.tickets[id];
    saveState();
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
        ['actividad', () => syncActivity(data)],
    ];
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
        runNow, runSoon,
        PANEL: PANEL_PUBLIC,
        BILLING,
    });
    commands.initModeration({
        discord, log, saveState,
        ui: { text, sep, row, container, cut, ts },
        st: () => st,
        ctx: () => ({ ...ctx, layout: ctx.layout }),
        accent: () => accent,
    });
    members.init({
        discord, sendFile, log, saveState,
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
        await registerCommands().catch((e) => log(`[SYNC] comandos: ${e.message}`));
        await members.loadInvites();
    });
    setTimeout(run, 5000);
    timer = setInterval(run, SYNC_EVERY);
    log(`[SYNC] Sincronización con el servidor ${ctx.guild} activa (cada ${SYNC_EVERY / 1000} s).`);
}

/** Eventos del gateway que no son mensajes ni interacciones. */
async function onEvent(t, d) {
    if (!ctx || d?.guild_id !== ctx.guild) return;
    try {
        if (t === 'GUILD_MEMBER_ADD') await members.onJoin(d);
        else if (t === 'GUILD_MEMBER_REMOVE') await members.onLeave(d);
        else if (t === 'INVITE_CREATE') members.onInviteCreate(d);
        else if (t === 'INVITE_DELETE') members.onInviteDelete(d);
    } catch (e) {
        log(`[SYNC] ${t}: ${e.message}`);
    }
}

/* ------------------------------------------------ eventos de Discord (gateway) */

/** Mensaje en un hilo de ticket -> se guarda en el panel. */
async function onMessage(message) {
    if (!ctx || !st?.tickets || message.author?.bot || message.webhook_id) return;
    const entry = Object.entries(st.tickets).find(([, t]) => t.thread === message.channel_id);
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

const ephemeral = (content) => ({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });

/** Botones y formularios de tickets. Devuelve true si la interacción era suya. */
async function onInteraction(interaction) {
    const id = interaction.data?.custom_id || '';
    if (!ctx) return false;
    if (!id.startsWith('ticket:')) return commands.handle(interaction);
    const user = interaction.member?.user || interaction.user;

    if (id === 'ticket:open' && interaction.type === 3) {
        await respond(interaction, {
            type: 9,
            data: {
                custom_id: 'ticket:modal',
                title: 'Abrir ticket',
                components: [
                    { type: 1, components: [{ type: 4, custom_id: 'subject', label: 'Asunto', style: 1, min_length: 3, max_length: 120, required: true }] },
                    { type: 1, components: [{ type: 4, custom_id: 'message', label: 'Cuéntanos qué pasa', style: 2, max_length: 3000, required: true }] },
                ],
            },
        });
        return true;
    }

    if (id === 'ticket:modal' && interaction.type === 5) {
        const field = (k) => interaction.data.components.flatMap((r) => r.components).find((c) => c.custom_id === k)?.value || '';
        await respond(interaction, { type: 5, data: { flags: 64 } });
        const edit = (content) => fetch(`${API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        }).catch(() => {});
        await serial(async () => {
            try {
                const res = await panel('POST', '/api/bot/tickets', { discord_id: user.id, subject: field('subject'), message: field('message') });
                const thread = await createThread(res.ticket);
                await edit(`Ticket #${res.ticket.id} abierto: <#${thread}>`);
            } catch (e) {
                if (e.status === 404) {
                    await edit(`Tu Discord no está vinculado con ninguna cuenta del panel. Saca un código en ${PANEL_PUBLIC}/settings/profile y usa \`/vincular codigo:\`.`);
                } else {
                    log(`[SYNC] abrir ticket: ${e.message}`);
                    await edit(`No se pudo abrir el ticket. Puedes abrirlo en ${PANEL_PUBLIC}/tickets`);
                }
            }
        });
        return true;
    }

    if (id.startsWith('ticket:close:') && interaction.type === 3) {
        const ticketId = id.split(':')[2];
        await respond(interaction, { type: 5, data: { flags: 64 } });
        await serial(async () => {
            try {
                await panel('POST', `/api/bot/tickets/${ticketId}/status`, { status: 'closed' });
                await closeThread(ticketId, `Ticket cerrado por <@${user.id}>.`);
            } catch (e) {
                log(`[SYNC] cerrar ticket #${ticketId}: ${e.message}`);
            }
        });
        await fetch(`${API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'Ticket cerrado.' }),
        }).catch(() => {});
        return true;
    }

    await respond(interaction, ephemeral('Esta acción ya no está disponible.'));
    return true;
}

module.exports = { start, onMessage, onInteraction, onEvent, runNow };
