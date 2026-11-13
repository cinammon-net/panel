/**
 * Comandos del bot: lo que se hace en la web, desde Discord.
 *
 * Todo lo de la cuenta va por /api/bot/discord/{id}/... del panel, que comprueba la cuenta
 * vinculada a ese Discord y los mismos permisos que la web. Las respuestas personales son
 * efímeras (solo las ve quien usa el comando).
 */
const moderation = require('./moderation');
const admin = require('./admin');
const assistant = require('./assistant');
const birthdays = require('./birthdays');
const shop = require('./shop');

let api = null;
const gameCache = new Map(); // serverId -> { at, fields }

const EPH = 64;
const V2 = 1 << 15;

function init(a) {
    api = a;
    admin.init(a);
    shop.init(a);
}

/* ------------------------------------------------------------ definiciones */

const S = 3, INT = 4, BOOL = 5, USER = 6, FILE = 11;

function definitions(categories = []) {
    return [...base(categories), ...assistant.definitions(), ...birthdays.definitions(), ...moderation.definitions(), ...admin.definitions()];
}

function base(categories) {
    const catChoices = categories.slice(0, 25).map((c) => ({ name: c.title.slice(0, 100), value: c.key }));
    return [
        { name: 'ayuda', description: 'Qué puedes hacer con el bot de Cinammon' },
        { name: 'ping', description: 'Latencia del bot y del panel' },
        { name: 'estado', description: 'Estado de los nodos y mantenimientos' },
        { name: 'anuncios', description: 'Anuncios y ofertas publicados ahora mismo' },
        { name: 'planes', description: 'Planes y precios de la tienda', options: catChoices.length ? [{ name: 'categoria', description: 'Tipo de servicio', type: S, required: false, choices: catChoices }] : [] },
        { name: 'rangos', description: 'Rangos VIP y sus ventajas' },
        shop.definition,
        { name: 'vincular', description: 'Vincular tu cuenta de cinammon.net con este Discord', options: [{ name: 'codigo', description: 'El código de Ajustes → Perfil en el panel', type: S, required: false, max_length: 20 }] },
        { name: 'cuenta', description: 'Tu cuenta: servidores, monedas, facturas y tickets' },
        {
            name: 'perfil', description: 'Ver o cambiar tu perfil de la web (nombre y foto)', options: [
                { name: 'nombre', description: 'Nuevo nombre', type: S, required: false, max_length: 60 },
                { name: 'foto', description: 'Nueva foto de perfil (png, jpg, webp o gif, máx. 2 MB)', type: FILE, required: false },
                { name: 'foto_de_discord', description: 'Usar tu foto de Discord', type: BOOL, required: false },
                { name: 'quitar_foto', description: 'Quitar la foto de perfil', type: BOOL, required: false },
            ],
        },
        { name: 'servidores', description: 'Tus servidores, con encendido y apagado' },
        { name: 'servidor', description: 'Panel de un servidor tuyo', options: [{ name: 'id', description: 'Número del servidor (lo ves en /servidores)', type: INT, required: true, min_value: 1 }] },
        {
            name: 'consola', description: 'Enviar un comando a la consola de tu servidor', options: [
                { name: 'id', description: 'Número del servidor', type: INT, required: true, min_value: 1 },
                { name: 'comando', description: 'Comando (sin la barra)', type: S, required: true, max_length: 1000 },
            ],
        },
        { name: 'monedas', description: 'Tus monedas, racha diaria y enlace de invitación de la tienda' },
        { name: 'diario', description: 'Recoger el premio diario de monedas' },
        { name: 'facturas', description: 'Tus facturas y pagos pendientes' },
        { name: 'tickets', description: 'Tus tickets de soporte' },
        { name: 'invitaciones', description: 'Cuánta gente ha entrado con tus invitaciones', options: [{ name: 'usuario', description: 'Ver las de otra persona', type: USER, required: false }] },
        { name: 'top-invitaciones', description: 'Quién ha invitado a más gente' },
        { name: 'invitar', description: 'Tu enlace para invitar a gente al servidor de Discord' },
        { name: 'sugerir', description: 'Proponer una idea para mejorar Cinammon' },
        { name: 'top-sugerencias', description: 'Las sugerencias más apoyadas de la comunidad' },
        {
            name: 'anuncio', description: 'Publicar un anuncio en la web y en Discord (staff)', default_member_permissions: '32', options: [
                { name: 'tipo', description: 'Tipo', type: S, required: true, choices: [{ name: 'Oferta', value: 'offer' }, { name: 'Novedad', value: 'new' }, { name: 'Evento', value: 'event' }, { name: 'Noticia', value: 'news' }] },
                { name: 'titulo', description: 'Título', type: S, required: true, max_length: 120 },
                { name: 'mensaje', description: 'Texto', type: S, required: false, max_length: 2000 },
                { name: 'cupon', description: 'Código de cupón', type: S, required: false, max_length: 40 },
                { name: 'dias', description: 'Días que dura (vacío = sin fin)', type: INT, required: false, min_value: 1, max_value: 90 },
            ],
        },
        {
            name: 'mantenimiento', description: 'Programar un mantenimiento (staff)', default_member_permissions: '32', options: [
                { name: 'titulo', description: 'Título', type: S, required: true, max_length: 120 },
                { name: 'empieza_en', description: 'Minutos hasta que empiece (0 = ya)', type: INT, required: true, min_value: 0, max_value: 43200 },
                { name: 'duracion', description: 'Duración en minutos', type: INT, required: true, min_value: 5, max_value: 10080 },
                { name: 'mensaje', description: 'Detalles', type: S, required: false, max_length: 2000 },
                { name: 'bloquear_panel', description: 'Cerrar el acceso al panel durante el mantenimiento', type: BOOL, required: false },
            ],
        },
        { name: 'sincronizar', description: 'Forzar la sincronización con la web (staff)', default_member_permissions: '32' },
        {
            name: 'sorteo',
            description: 'Crear un sorteo en #sorteos (staff)',
            default_member_permissions: '32',
            options: [
                { name: 'premio', description: 'Premio del sorteo (ej. 500 monedas o 1 mes VIP)', type: S, required: true, max_length: 120 },
                { name: 'minutos', description: 'Duración en minutos', type: INT, required: true, min_value: 1, max_value: 20160 },
                { name: 'ganadores', description: 'Número de ganadores (1-10)', type: INT, required: false, min_value: 1, max_value: 10 },
            ],
        },
    ];
}

/* ---------------------------------------------------------------- helpers */

const ui = (k) => (...a) => api.ui[k](...a);
const [text, sep, row, linkBtn, container, cut, eur, ts] = ['text', 'sep', 'row', 'linkBtn', 'container', 'cut', 'eur', 'ts'].map(ui);

const btn = (label, custom_id, style = 2, disabled = false) => ({ type: 2, style, label, custom_id, disabled });
const card = (...components) => ({ flags: V2, components: [container(api.accent(), components)], allowed_mentions: { parse: [] } });
const fail = (msg) => ({ flags: V2, components: [container(0xef4444, [text(msg)])], allowed_mentions: { parse: [] } });
const opt = (i, name) => {
    const all = (i.data.options || []).flatMap((o) => (o.options ? o.options : [o]));
    return all.find((o) => o.name === name)?.value;
};
const field = (i, k) => (i.data.components || []).flatMap((r) => r.components || [r.component]).find((c) => c?.custom_id === k)?.value ?? '';
const userOf = (i) => i.member?.user || i.user;

async function callback(i, body) {
    await fetch(`https://discord.com/api/v10/interactions/${i.id}/${i.token}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).catch(() => {});
}

async function edit(i, payload) {
    const res = await fetch(`https://discord.com/api/v10/webhooks/${i.application_id}/${i.token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    }).catch(() => null);
    if (res && !res.ok) api.log(`[CMD] respuesta rechazada: ${res.status} ${(await res.text()).slice(0, 300)}`);
}

/** Llama al panel en nombre del usuario de Discord. */
function me(i, method, route, body) {
    return api.panel(method, `/api/bot/discord/${userOf(i).id}${route}`, body);
}

const linkHelp = (title = 'Vincular tu cuenta') => card(
    text(`## ${title}\n1. Entra en el panel y ve a **Ajustes → Perfil → Cuentas vinculadas**.\n2. Pulsa **Código para el bot** en Discord.\n3. Escribe aquí \`/vincular codigo:\` con ese código.\n-# El código caduca en 15 minutos y solo sirve una vez.`),
    row(linkBtn('Obtener el código', `${api.PANEL}/settings/profile`)),
);
const notLinked = () => linkHelp('Tu Discord no está vinculado');

/** Errores de Discord en moderación (403 = el rol del bot está por debajo). */
function modError(name, e) {
    // Errores del panel (llevan body): su mensaje es el bueno ("Solo el Owner...", "no vinculado"...)
    if (e.body) {
        if (e.status === 403) return fail(cut(e.body.message || 'No tienes permiso para hacer eso.', 300));
        return errorCard(e);
    }
    if (name !== 'admin' && e.status === 403) return fail('Discord no me deja: mi rol tiene que estar por encima del de esa persona y tener el permiso necesario.');
    if (name !== 'admin' && e.status === 404) return fail('No encuentro a esa persona o ese canal en el servidor.');
    return errorCard(e);
}

function errorCard(e) {
    if (e.status === 404 && /not_linked/.test(e.message)) return notLinked();
    if (e.status === 403) return fail('No tienes permiso para hacer eso.');
    if (e.status === 422) return fail(cut(e.body?.message || 'Datos no válidos.', 500));
    if (e.status === 409) return fail(cut(e.body?.message || 'Todavía no se puede.', 300));
    return fail(cut(`Algo ha fallado: ${e.body?.error || e.body?.message || e.message}`, 500));
}

const STATE = { running: 'Encendido', starting: 'Arrancando', stopping: 'Apagándose', offline: 'Apagado' };
const human = (sec) => {
    if (!sec) return '-';
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    return [d && `${d} d`, h && `${h} h`, `${m} min`].filter(Boolean).join(' ');
};

/* ---------------------------------------------------------------- vistas */

function accountView(acc) {
    const u = acc.user;
    const b = acc.billing;
    const head = [
        text(`## ${u.name}\n-# ${u.email || ''}${u.roles.length ? `\n${u.roles.map((r) => `\`${r}\``).join(' ')}` : ''}`),
    ];
    const header = u.avatar_url
        ? { type: 9, components: head, accessory: { type: 11, media: { url: u.avatar_url } } }
        : head[0];
    return card(
        header,
        sep(),
        text([
            `**Servidores:** ${acc.servers.length}`,
            `**Tickets abiertos:** ${acc.tickets.open}`,
            b ? `**Monedas:** ${b.coins} · racha de ${b.streak} día(s)${b.checkin_done ? '' : ' · premio diario disponible'}` : null,
            b ? `**Facturas pendientes:** ${b.invoices.filter((x) => x.status !== 'paid' && x.status !== 'cancelled').length}` : null,
        ].filter(Boolean).join('\n')),
        sep(),
        row(btn('Servidores', 'c:servers', 1), btn('Monedas', 'c:coins'), btn('Facturas', 'c:invoices'), btn('Tickets', 'c:tickets'), btn('Perfil', 'c:profile')),
        row(linkBtn('Abrir el panel', api.PANEL), linkBtn('Tienda', `${api.BILLING}/store`)),
    );
}

function profileView(acc, note) {
    const u = acc.user;
    const head = [text(`## Perfil\n**Nombre:** ${u.name}\n**Correo:** ${u.email || '-'}`)];
    return card(
        u.avatar_url ? { type: 9, components: head, accessory: { type: 11, media: { url: u.avatar_url } } } : head[0],
        note ? text(`-# ${note}`) : null,
        sep(),
        text('-# También puedes usar `/perfil nombre:` o `/perfil foto:` para subir una imagen.'),
        row(btn('Cambiar nombre', 'c:pf:name', 1), btn('Usar mi foto de Discord', 'c:pf:discord'), btn('Quitar foto', 'c:pf:remove', 4, !u.avatar_url), btn('Volver', 'c:account')),
        row(linkBtn('Ajustes en el panel', `${api.PANEL}/settings/profile`)),
    );
}

function serversView(acc) {
    if (!acc.servers.length) {
        return card(text('## Tus servidores\nTodavía no tienes ningún servidor.'), row(linkBtn('Ver planes', `${api.BILLING}/store`), btn('Volver', 'c:account')));
    }
    return card(
        text(`## Tus servidores (${acc.servers.length})`),
        sep(),
        text(acc.servers.map((s) => `\`#${s.id}\` **${s.name}** · ${s.suspended ? 'Suspendido' : s.status === 'running' ? 'Encendido' : 'Apagado'}${s.egg ? ` · ${s.egg}` : ''}`).join('\n')),
        {
            type: 1,
            components: [{
                type: 3,
                custom_id: 'c:srvsel',
                placeholder: 'Elige un servidor para gestionarlo',
                options: acc.servers.slice(0, 25).map((s) => ({ label: cut(s.name, 100), value: String(s.id), description: cut(`#${s.id} · ${s.egg || ''}`, 100) })),
            }],
        },
        row(btn('Actualizar', 'c:servers'), btn('Volver', 'c:account')),
    );
}

function serverView(s, note) {
    const live = s.live || {};
    const state = live.state || s.status;
    const on = state === 'running' || state === 'starting';
    const lines = [
        `**Estado:** ${s.suspended ? 'Suspendido' : STATE[state] || state}`,
        s.address ? `**Dirección:** \`${s.address}\`` : null,
        s.egg ? `**Tipo:** ${s.egg}` : null,
        live.cpu !== undefined ? `**CPU:** ${live.cpu}%${s.cpu ? ` de ${s.cpu}%` : ''}` : null,
        live.memory_mb !== undefined ? `**RAM:** ${live.memory_mb} MB${s.memory ? ` de ${s.memory} MB` : ''}` : null,
        live.disk_mb !== undefined ? `**Disco:** ${live.disk_mb} MB${s.disk ? ` de ${s.disk} MB` : ''}` : null,
        on && live.uptime ? `**Encendido desde hace:** ${human(live.uptime)}` : null,
    ].filter(Boolean);
    return {
        flags: V2,
        components: [container(on ? 0x10b981 : 0x71717a, [
            text(`## ${s.name}\n-# Servidor #${s.id}${s.description ? `\n${cut(s.description, 300)}` : ''}`),
            sep(),
            text(lines.join('\n')),
            note ? text(`-# ${note}`) : null,
            sep(),
            row(
                btn('Iniciar', `c:pw:start:${s.id}`, 3, on || s.suspended || !s.installed),
                btn('Reiniciar', `c:pw:restart:${s.id}`, 1, !on || s.suspended),
                btn('Detener', `c:pw:stop:${s.id}`, 4, !on),
                btn('Forzar apagado', `c:pw:kill:${s.id}`, 4, !on),
                btn('Actualizar', `c:srv:${s.id}`),
            ),
            row(
                btn('Enviar comando', `c:cmd:${s.id}`, 2, !on),
                btn('Editar nombre e info', `c:info:${s.id}`),
                btn('Ajustes del juego', `c:game:${s.id}`),
                btn('Mis servidores', 'c:servers'),
                linkBtn('Consola web', s.url),
            ),
        ])],
        allowed_mentions: { parse: [] },
    };
}

function gameView(sid, data, note) {
    const fields = data.fields || [];
    if (!data.exists || !fields.length) {
        return card(text('## Ajustes del juego\nEste servidor no tiene ajustes editables (solo los servidores de Minecraft con server.properties).'), row(btn('Volver', `c:srv:${sid}`)));
    }
    const show = (f) => (f.type === 'bool' ? (f.value ? 'Sí' : 'No') : f.type === 'enum' ? f.options?.[f.value] || f.value : f.value === '' || f.value === null ? '-' : String(f.value));
    return card(
        text(`## Ajustes del juego\n-# Servidor #${sid}${data.running ? ' · se aplican al reiniciar' : ''}`),
        sep(),
        text(cut(fields.map((f) => `**${f.label}:** ${cut(show(f), 80)}`).join('\n'), 3000)),
        note ? text(`-# ${note}`) : null,
        {
            type: 1,
            components: [{
                type: 3,
                custom_id: `c:gsel:${sid}`,
                placeholder: 'Elige un ajuste para cambiarlo',
                options: fields.slice(0, 25).map((f) => ({ label: cut(f.label, 100), value: f.key, description: cut(`Ahora: ${show(f)}`, 100) })),
            }],
        },
        row(btn('Volver al servidor', `c:srv:${sid}`)),
    );
}

function coinsView(b, note) {
    return card(
        text(`## Monedas\n**Saldo:** ${b.coins} monedas\n**Racha diaria:** ${b.streak} día(s)`),
        note ? text(`-# ${note}`) : null,
        sep(),
        text(`### Invita y gana\nTu enlace: ${b.referral.url}\n-# ${b.referral.invited} persona(s) invitada(s), ${b.referral.active} activa(s).`),
        sep(),
        row(btn(b.checkin_done ? 'Premio de hoy recogido' : 'Recoger premio diario', 'c:checkin', 3, b.checkin_done), linkBtn('Canjear en la tienda', b.urls.coins), btn('Volver', 'c:account')),
    );
}

const INV = { paid: 'Pagada', pending: 'Pendiente', unpaid: 'Pendiente', review: 'En revisión', cancelled: 'Cancelada', rejected: 'Rechazada', overdue: 'Vencida' };

function invoicesView(b) {
    const pending = b.invoices.filter((x) => !['paid', 'cancelled'].includes(x.status));
    return card(
        text('## Facturas'),
        sep(),
        text(b.invoices.length
            ? b.invoices.map((x) => `\`${x.number || '#' + x.id}\` ${eur(x.amount)} · ${INV[x.status] || x.status}${x.due_at && x.status !== 'paid' ? ` · vence ${ts(x.due_at, 'd')}` : ''}`).join('\n')
            : 'No tienes facturas.'),
        pending.length ? row(...pending.slice(0, 4).map((x) => linkBtn(`Pagar ${x.number || '#' + x.id}`, x.url)), btn('Volver', 'c:account')) : row(linkBtn('Ver en la tienda', b.urls.invoices), btn('Volver', 'c:account')),
    );
}

const TK = { open: 'Abierto', pending: 'Pendiente', closed: 'Cerrado' };

function ticketsView(list) {
    return card(
        text('## Tus tickets'),
        sep(),
        text(list.length ? list.map((t) => `\`#${t.id}\` **${cut(t.subject, 60)}** · ${TK[t.status] || t.status} · ${ts(t.updated_at, 'R')}`).join('\n') : 'No tienes tickets.'),
        row({ type: 2, style: 1, label: 'Abrir ticket', custom_id: 'ticket:open' }, linkBtn('Tickets en el panel', `${api.PANEL}/tickets`), btn('Volver', 'c:account')),
    );
}

/* ---------------------------------------------------------- vistas públicas */

function helpView() {
    return card(
        text('## Bot de Cinammon\nLo que haces en la web, también desde aquí. Las respuestas de tu cuenta solo las ves tú.'),
        sep(),
        text('### ¿Tienes una duda?\n`/pregunta` te responde al momento. Si no lo sabe, avisa al equipo. Para algo privado (pagos, tu cuenta, un servidor), abre un ticket.'),
        text('### Tu cuenta\n`/cuenta` resumen · `/perfil` nombre y foto · `/servidores` y `/servidor` encender, apagar, ajustes · `/consola` comandos · `/monedas` y `/diario` · `/facturas` · `/tickets`'),
        text('### Comunidad\n`/cumpleaños` guarda tu fecha y recibe un set de regalo ese día\n`/estado` · `/anuncios` · `/planes` · `/comprar` · `/rangos` · `/sugerir` · `/invitar` · `/invitaciones` · `/top-invitaciones` · `/ping`'),
        text('### Staff\n`/anuncio` · `/mantenimiento` · `/sincronizar`'),
        sep(),
        text('-# ¿Aún no lo has hecho? `/vincular` explica cómo conectar tu cuenta.'),
    );
}

async function statusView() {
    const d = api.lastData();
    if (!d) return fail('Todavía no hay datos del panel; prueba en un minuto.');
    const active = d.maintenances.filter((m) => m.active);
    const ok = d.nodes.every((n) => n.online && !n.maintenance) && !active.length;
    return {
        flags: V2,
        components: [container(ok ? 0x10b981 : 0xf59e0b, [
            text(`## ${ok ? 'Todo funciona' : active.length ? 'Mantenimiento en curso' : 'Hay incidencias'}`),
            text(d.nodes.map((n) => `${n.maintenance ? '`MANT`' : n.online ? '`OK`' : '`CAÍDO`'} ${n.name}`).join('\n') || 'Sin nodos.'),
            d.maintenances.length ? text(d.maintenances.map((m) => `**${m.title}** · ${ts(m.starts_at)}`).join('\n')) : null,
            row(linkBtn('Telemetría en vivo', 'https://nodo.cinammon.net')),
        ])],
        allowed_mentions: { parse: [] },
    };
}

function announcementsView() {
    const list = api.lastData()?.announcements || [];
    return card(
        text('## Anuncios'),
        sep(),
        text(list.length ? list.map((a) => `**${a.title}**${a.coupon_code ? ` · cupón \`${a.coupon_code}\`` : ''}${a.ends_at ? ` · hasta ${ts(a.ends_at, 'd')}` : ''}`).join('\n') : 'No hay anuncios ahora mismo.'),
        row(linkBtn('Ver la web', api.PANEL)),
    );
}

async function plansView(cat) {
    const { categories } = await api.billing('/api/plans');
    const c = categories.find((x) => x.key === (cat || '')) || null;
    if (!c) {
        return card(
            text('## Planes'),
            text(categories.filter((x) => x.key !== 'ranks').map((x) => `**${x.title}** · desde ${eur(Math.min(...x.plans.map((p) => Number(p.price))))}/mes`).join('\n')),
            text('-# Usa `/planes categoria:` para ver los planes de un tipo.'),
            row(linkBtn('Tienda', `${api.BILLING}/store`)),
        );
    }
    return card(
        text(`## ${c.title}${c.tagline ? `\n-# ${cut(c.tagline, 200)}` : ''}`),
        sep(),
        text(cut(c.plans.map((p) => `**${p.name}** · ${eur(p.price)}/mes${p.ram_mb ? ` · ${p.ram_mb >= 1024 ? p.ram_mb / 1024 + ' GB' : p.ram_mb + ' MB'} RAM` : ''}`).join('\n'), 3500)),
        row(linkBtn('Contratar en la tienda', `${api.BILLING}/store`)),
    );
}

async function ranksView() {
    const { categories } = await api.billing('/api/plans');
    const r = categories.find((x) => x.key === 'ranks');
    return card(
        text('## Rangos VIP'),
        sep(),
        text(cut((r?.plans || []).map((p) => `**${p.name}** · ${eur(p.price)}/mes\n-# ${(p.features || []).slice(1, 3).join(' · ')}`).join('\n'), 3500)),
        row(linkBtn('Comprar rango', `${api.BILLING}/store`)),
    );
}

function invitesView(target, store) {
    const s = api.members.stats(target.id);
    const r = store?.referral;
    return card(
        text(`## Invitaciones de ${target.global_name || target.username}\n**Discord:** ${s.total} en el servidor · ${s.joins} entradas · ${s.leaves} salidas`),
        r ? text(`**Tienda:** ${r.invited} referido(s) · ${r.active} activo(s)${r.rewards ? `\n-# Ganas ${r.rewards.active} monedas cuando un referido empieza a usar la tienda y ${r.rewards.purchase} con su primera compra.` : ''}`) : null,
        text(store === undefined
            ? '-# Quien entra con tu enlace de `/invitar` y vincula su cuenta pasa a ser tu referido en la tienda.'
            : store ? '-# Cuenta tanto quien entra con tu enlace de `/invitar` y vincula su cuenta como quien se registra con tu enlace de `/monedas`.'
                : '-# Vincula tu cuenta con `/vincular` para que tus invitados cuenten también en la tienda y ganes monedas.'),
    );
}

async function inviteView(user) {
    const code = await api.members.personalInvite(user.id);
    const url = `https://discord.gg/${code}`;
    const s = api.members.stats(user.id);
    return card(
        text(`## Tu enlace de invitación\n\`\`\`\n${url}\n\`\`\`\n-# Pulsa **Copiar enlace**: se abre una página que lo copia con un toque.`),
        text('Quien entre con él suma una invitación para ti. Si además se crea cuenta y la vincula, es tu referido en la tienda y ganáis monedas los dos (lo tienes explicado en el canal de invitaciones).'),
        text(`-# Llevas **${s.total}** invitación(es). Ranking: \`/top-invitaciones\`.`),
        row(linkBtn('Copiar enlace', `https://cinammon.net/invitar/${code}`)),
    );
}

function topView() {
    const top = api.members.leaderboard(10);
    return card(
        text('## Top invitaciones'),
        sep(),
        text(top.length ? top.map((r, n) => `**${n + 1}.** <@${r.id}> · ${r.total} (${r.joins} entradas, ${r.leaves} salidas)`).join('\n') : 'Todavía nadie ha invitado a nadie.'),
    );
}

/* ---------------------------------------------------------------- acciones */

async function slash(i) {
    const name = i.data.name;
    if (assistant.NAMES.has(name) || birthdays.NAMES.has(name)) {
        await callback(i, { type: 5, data: { flags: EPH } });
        try {
            await edit(i, await (birthdays.NAMES.has(name) ? birthdays.run(i) : assistant.ask(i)));
        } catch (e) {
            api.log(`[CMD] /${name}: ${e.message}`);
            await edit(i, errorCard(e));
        }
        return;
    }
    if (moderation.NAMES.has(name) || name === 'admin') {
        await callback(i, { type: 5, data: { flags: EPH } });
        try {
            await edit(i, await (name === 'admin' ? admin.run(i) : moderation.run(i)));
        } catch (e) {
            api.log(`[CMD] /${name}: ${e.message}`);
            await edit(i, e.friendly ? fail(e.message) : modError(name, e));
        }
        return;
    }
    const priv = !['ayuda', 'ping', 'estado', 'anuncios', 'planes', 'rangos', 'invitaciones', 'top-invitaciones'].includes(name);
    await callback(i, { type: 5, data: { flags: priv ? EPH : 0 } });
    try {
        await edit(i, await run(i, name));
    } catch (e) {
        api.log(`[CMD] /${name}: ${e.message}`);
        await edit(i, errorCard(e));
    }
}

async function run(i, name) {
    switch (name) {
        case 'ayuda': return helpView();
        case 'ping': {
            const t = Date.now();
            await api.panel('GET', '/api/bot/overview').catch(() => null);
            return card(text(`## Pong\nPanel: ${Date.now() - t} ms`));
        }
        case 'estado': return statusView();
        case 'anuncios': return announcementsView();
        case 'planes': return plansView(opt(i, 'categoria'));
        case 'rangos': return ranksView();
        case 'vincular': {
            const code = opt(i, 'codigo');
            const verified = api.layout().roles.member;
            if (code && verified && !(i.member?.roles || []).includes(verified)) {
                return fail(`Primero verifícate en <#${api.layout().channels.verify}> (botón Verificarme) y vuelve a usar \`/vincular\`.`);
            }
            if (code) {
                const { user } = await me(i, 'POST', '/link', { code });
                api.runSoon();
                const ref = await api.members.claimReferral(userOf(i).id).catch(() => null);
                return card(
                    text(`## Cuenta vinculada\nEste Discord ya es **${user.name}** en el panel. Prueba \`/cuenta\`; tus roles llegan en un minuto.${ref?.status === 'linked' ? `\n-# Entraste con la invitación de <@${api.members.inviterOf(userOf(i).id)}>: ya eres su referido en la tienda.` : ''}`),
                    row(linkBtn('Abrir el panel', `${api.PANEL}/dashboard`)),
                );
            }
            return linkHelp();
        }
        case 'cuenta': return accountView(await me(i, 'GET', '/account'));
        case 'perfil': return profileCommand(i);
        case 'servidores': return serversView(await me(i, 'GET', '/account'));
        case 'servidor': return serverView((await me(i, 'GET', `/servers/${opt(i, 'id')}`)).server);
        case 'consola': {
            const id = opt(i, 'id');
            await me(i, 'POST', `/servers/${id}/command`, { command: String(opt(i, 'comando')).replace(/^\//, '') });
            return card(text(`Comando enviado al servidor #${id}.`), row(btn('Ver servidor', `c:srv:${id}`)));
        }
        case 'monedas': return coinsOrFail(await me(i, 'GET', '/account'));
        case 'diario': {
            const r = await me(i, 'POST', '/checkin');
            return coinsOrFail(await me(i, 'GET', '/account'), r.message);
        }
        case 'facturas': {
            const acc = await me(i, 'GET', '/account');
            return acc.billing ? invoicesView(acc.billing) : fail('No encontramos tu cuenta en la tienda (se busca por el correo del panel).');
        }
        case 'tickets': return ticketsView((await me(i, 'GET', '/tickets')).tickets);
        case 'invitaciones': {
            const id = opt(i, 'usuario');
            const target = id ? i.data.resolved?.users?.[id] : userOf(i);
            if (target.id !== userOf(i).id) return invitesView(target);
            const acc = await me(i, 'GET', '/account').catch(() => null);
            return invitesView(target, acc?.billing || null);
        }
        case 'top-invitaciones': return topView();
        case 'invitar': return inviteView(userOf(i));
        case 'anuncio': {
            const r = await me(i, 'POST', '/announcements', {
                type: opt(i, 'tipo'), title: opt(i, 'titulo'), message: opt(i, 'mensaje') || '', coupon_code: opt(i, 'cupon') || null, days: opt(i, 'dias') || null,
            });
            api.runSoon();
            return card(text(`Anuncio **${r.announcement.title}** publicado en la web. En menos de un minuto sale también en Discord.`));
        }
        case 'mantenimiento': {
            const r = await me(i, 'POST', '/maintenances', {
                title: opt(i, 'titulo'), message: opt(i, 'mensaje') || null, starts_in: opt(i, 'empieza_en'), duration: opt(i, 'duracion'), block_access: !!opt(i, 'bloquear_panel'),
            });
            api.runSoon();
            return card(text(`Mantenimiento **${r.maintenance.title}** programado para ${ts(r.maintenance.starts_at)}. Se avisará en <#${api.layout().channels.status}>.`));
        }
        case 'sincronizar': {
            const perms = BigInt(i.member?.permissions || '0');
            if (!(perms & 8n) && !(perms & 32n)) return fail('Solo el staff puede forzar la sincronización.');
            await api.runNow();
            return card(text('Sincronización hecha.'));
        }
        case 'sorteo': {
            const r = await api.createGiveaway({
                interaction: i,
                prize: opt(i, 'premio'),
                minutes: opt(i, 'minutos'),
                winners: opt(i, 'ganadores') || 1,
            });
            if (r?.error) return fail(r.error);
            return card(text(`Sorteo publicado en <#${r.giveaway.channelId}>.`));
        }
        default: return fail('Este comando ya no existe. Usa `/ayuda`.');
    }
}

function coinsOrFail(acc, note) {
    return acc.billing ? coinsView(acc.billing, note) : fail('No encontramos tu cuenta en la tienda (se busca por el correo del panel).');
}

async function profileCommand(i) {
    const name = opt(i, 'nombre');
    const fileId = opt(i, 'foto');
    const useDiscord = opt(i, 'foto_de_discord');
    const remove = opt(i, 'quitar_foto');
    const body = {};
    if (name) body.name = name;
    if (remove) body.remove_avatar = true;
    else if (fileId) body.avatar_url = i.data.resolved?.attachments?.[fileId]?.url;
    else if (useDiscord) body.avatar_url = discordAvatar(userOf(i));
    let note = null;
    if (Object.keys(body).length) {
        await me(i, 'POST', '/profile', body);
        note = 'Perfil actualizado en la web.';
    }
    return profileView(await me(i, 'GET', '/account'), note);
}

function discordAvatar(u) {
    if (!u.avatar) return null;
    const ext = u.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext}?size=512`;
}

/** Botones, menús y formularios (custom_id "c:..."). */
async function component(i) {
    const id = i.data.custom_id;
    const parts = id.split(':');
    const kind = parts[1];

    // Los que abren un formulario tienen que responder al momento.
    if (kind === 'pf' && parts[2] === 'name') {
        return callback(i, { type: 9, data: { custom_id: 'c:m:name', title: 'Cambiar nombre', components: [row({ type: 4, custom_id: 'name', label: 'Nombre', style: 1, min_length: 2, max_length: 60, required: true })] } });
    }
    if (kind === 'cmd') {
        return callback(i, { type: 9, data: { custom_id: `c:m:cmd:${parts[2]}`, title: 'Enviar comando', components: [row({ type: 4, custom_id: 'command', label: 'Comando (sin la barra)', style: 1, max_length: 1000, required: true })] } });
    }
    if (kind === 'info') {
        return callback(i, {
            type: 9,
            data: {
                custom_id: `c:m:info:${parts[2]}`,
                title: 'Nombre e información',
                components: [
                    row({ type: 4, custom_id: 'name', label: 'Nombre del servidor', style: 1, min_length: 2, max_length: 60, required: false, placeholder: 'Déjalo vacío para no cambiarlo' }),
                    row({ type: 4, custom_id: 'description', label: 'Descripción', style: 2, max_length: 500, required: false }),
                ],
            },
        });
    }
    if (kind === 'gsel') {
        const sid = parts[2];
        const key = i.data.values?.[0];
        const f = gameCache.get(sid)?.fields?.find((x) => x.key === key);
        if (!f) return callback(i, { type: 4, data: { flags: EPH, content: 'Vuelve a abrir los ajustes del juego.' } });
        const hint = f.type === 'bool' ? 'sí / no' : f.type === 'enum' ? Object.values(f.options || {}).join(' / ') : f.type === 'int' ? `número${f.min !== null ? ` de ${f.min}` : ''}${f.max !== null ? ` a ${f.max}` : ''}` : 'texto';
        const value = f.type === 'bool' ? (f.value ? 'sí' : 'no') : f.type === 'enum' ? f.options?.[f.value] || f.value : f.value ?? '';
        return callback(i, {
            type: 9,
            data: {
                custom_id: `c:m:game:${sid}:${key}`,
                title: cut(f.label, 45),
                components: [row({ type: 4, custom_id: 'value', label: cut(`Valor (${hint})`, 45), style: f.key === 'motd' ? 2 : 1, required: false, value: cut(String(value), 4000), max_length: 400 })],
            },
        });
    }

    await callback(i, { type: 6 }); // se edita el mismo mensaje
    try {
        await edit(i, await componentRun(i, kind, parts));
    } catch (e) {
        api.log(`[CMD] ${id}: ${e.message}`);
        await edit(i, errorCard(e));
    }
}

async function componentRun(i, kind, parts) {
    switch (kind) {
        case 'account': return accountView(await me(i, 'GET', '/account'));
        case 'servers': return serversView(await me(i, 'GET', '/account'));
        case 'srvsel': return serverView((await me(i, 'GET', `/servers/${i.data.values[0]}`)).server);
        case 'srv': return serverView((await me(i, 'GET', `/servers/${parts[2]}`)).server);
        case 'pw': {
            const [, , action, sid] = parts;
            await me(i, 'POST', `/servers/${sid}/power`, { action });
            await new Promise((r) => setTimeout(r, action === 'kill' ? 1000 : 2500));
            const names = { start: 'Arrancando', restart: 'Reiniciando', stop: 'Apagando', kill: 'Apagado forzado' };
            return serverView((await me(i, 'GET', `/servers/${sid}`)).server, `${names[action]}...`);
        }
        case 'game': {
            const data = await me(i, 'GET', `/servers/${parts[2]}/game`);
            gameCache.set(parts[2], { at: Date.now(), fields: data.fields || [] });
            return gameView(parts[2], data);
        }
        case 'coins': return coinsOrFail(await me(i, 'GET', '/account'));
        case 'checkin': {
            const r = await me(i, 'POST', '/checkin');
            return coinsOrFail(await me(i, 'GET', '/account'), r.message);
        }
        case 'invoices': {
            const acc = await me(i, 'GET', '/account');
            return acc.billing ? invoicesView(acc.billing) : fail('No encontramos tu cuenta en la tienda.');
        }
        case 'tickets': return ticketsView((await me(i, 'GET', '/tickets')).tickets);
        case 'profile': return profileView(await me(i, 'GET', '/account'));
        case 'pf': {
            if (parts[2] === 'discord') {
                const url = discordAvatar(userOf(i));
                if (!url) return profileView(await me(i, 'GET', '/account'), 'No tienes foto en Discord.');
                await me(i, 'POST', '/profile', { avatar_url: url });
                return profileView(await me(i, 'GET', '/account'), 'Ahora usas tu foto de Discord.');
            }
            if (parts[2] === 'remove') {
                await me(i, 'POST', '/profile', { remove_avatar: true });
                return profileView(await me(i, 'GET', '/account'), 'Foto quitada.');
            }
            return profileView(await me(i, 'GET', '/account'));
        }
        default: return fail('Esta acción ya no está disponible.');
    }
}

/** Formularios enviados (custom_id "c:m:..."). */
async function modal(i) {
    const parts = i.data.custom_id.split(':');
    const kind = parts[2];
    const fromMessage = !!i.message;
    await callback(i, { type: fromMessage ? 6 : 5, data: { flags: EPH } });
    let payload;
    try {
        if (kind === 'name') {
            await me(i, 'POST', '/profile', { name: field(i, 'name') });
            payload = profileView(await me(i, 'GET', '/account'), 'Nombre cambiado.');
        } else if (kind === 'cmd') {
            await me(i, 'POST', `/servers/${parts[3]}/command`, { command: field(i, 'command').replace(/^\//, '') });
            payload = serverView((await me(i, 'GET', `/servers/${parts[3]}`)).server, 'Comando enviado.');
        } else if (kind === 'info') {
            const body = {};
            if (field(i, 'name').trim()) body.name = field(i, 'name').trim();
            if (field(i, 'description').trim()) body.description = field(i, 'description').trim();
            await me(i, 'POST', `/servers/${parts[3]}/info`, body);
            payload = serverView((await me(i, 'GET', `/servers/${parts[3]}`)).server, 'Datos del servidor actualizados.');
        } else if (kind === 'game') {
            const [, , , sid, key] = parts;
            const f = gameCache.get(sid)?.fields?.find((x) => x.key === key);
            let v = field(i, 'value').trim();
            if (f?.type === 'bool') v = /^(s[ií]|si|true|1|on|activ)/i.test(v);
            else if (f?.type === 'enum') v = Object.entries(f.options || {}).find(([k, label]) => k.toLowerCase() === v.toLowerCase() || label.toLowerCase() === v.toLowerCase())?.[0] ?? v;
            else if (f?.type === 'int') v = v === '' ? null : Number(v);
            await me(i, 'PUT', `/servers/${sid}/game`, { values: { [key]: v } });
            const data = await me(i, 'GET', `/servers/${sid}/game`);
            gameCache.set(sid, { at: Date.now(), fields: data.fields || [] });
            payload = gameView(sid, data, `${f?.label || key} guardado.${data.running ? ' Reinicia el servidor para aplicarlo.' : ''}`);
        } else {
            payload = fail('Formulario desconocido.');
        }
    } catch (e) {
        api.log(`[CMD] formulario ${i.data.custom_id}: ${e.message}`);
        payload = errorCard(e);
    }
    await edit(i, payload);
}

/** Devuelve true si la interacción era suya. */
async function handle(i) {
    if (i.type === 4) {
        const choices = i.data.name === 'admin' ? await admin.autocomplete(i) : i.data.name === 'comprar' ? await shop.autocomplete(i).catch(() => []) : [];
        await callback(i, { type: 8, data: { choices } });
        return true;
    }
    if (i.type === 3 && /^(ast|bday):/.test(i.data?.custom_id || '')) {
        try {
            await callback(i, await (i.data.custom_id.startsWith('bday:') ? birthdays.component(i) : assistant.component(i)));
        } catch (e) {
            api.log(`[CMD] ${i.data.custom_id}: ${e.message}`);
            await callback(i, { type: 4, data: { flags: EPH, content: 'No se pudo completar. Inténtalo otra vez o abre un ticket.' } });
        }
        return true;
    }
    if (i.type === 3 && /^(mod|adm):/.test(i.data?.custom_id || '')) {
        await callback(i, { type: 6 });
        const mod = i.data.custom_id.startsWith('mod:') ? moderation : admin;
        try {
            await edit(i, await mod.component(i));
        } catch (e) {
            api.log(`[CMD] ${i.data.custom_id}: ${e.message}`);
            await edit(i, modError(mod === admin ? 'admin' : 'mod', e));
        }
        return true;
    }
    if (i.type === 2 && i.data?.name === 'comprar') {
        await shop.slash(i);
        return true;
    }
    if ((i.type === 3 || i.type === 5) && (i.data?.custom_id || '').startsWith('buy:')) {
        await shop.component(i);
        return true;
    }
    if (i.type === 2) {
        await slash(i);
        return true;
    }
    const id = i.data?.custom_id || '';
    if (i.type === 3 && id === 'c:invite') {
        await callback(i, { type: 5, data: { flags: EPH } });
        try {
            await edit(i, await inviteView(userOf(i)));
        } catch (e) {
            api.log(`[CMD] c:invite: ${e.message}`);
            await edit(i, errorCard(e));
        }
        return true;
    }
    if (i.type === 5 && id.startsWith('c:m:')) {
        await modal(i);
        return true;
    }
    if (i.type === 3 && id.startsWith('c:')) {
        await component(i);
        return true;
    }
    if (i.type === 3 || i.type === 5) {
        // Botones de mensajes antiguos del bot
        await callback(i, { type: 4, data: { flags: EPH, content: 'Esta acción ya no está disponible. Usa `/ayuda` para ver los comandos.' } });
        return true;
    }
    return false;
}

module.exports = { init, initModeration: (a) => moderation.init(a), definitions, handle };
