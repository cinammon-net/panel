/**
 * Moderación y AutoMod.
 *
 * - Cada comando pide en Discord el permiso que corresponde (default_member_permissions), así que
 *   solo lo ven y usan quienes lo tienen. Además se comprueba la jerarquía: no puedes sancionar a
 *   alguien con un rol igual o superior al tuyo.
 * - Todo queda en el canal de registros. Las advertencias se guardan en sync-state.json y escalan solas.
 * - AutoMod usa las reglas nativas de Discord (filtra Discord, no hace falta leer los mensajes).
 */
let api = null; // { discord, ctx, st, saveState, log, ui, accent }

const P = {
    KICK: 1n << 1n, BAN: 1n << 2n, ADMIN: 1n << 3n, MANAGE_CHANNELS: 1n << 4n, MANAGE_GUILD: 1n << 5n,
    MANAGE_MESSAGES: 1n << 13n, SEND: 1n << 11n, MODERATE: 1n << 40n,
};
const S = 3, INT = 4, USER = 6, CHANNEL = 7;

// 3 advertencias = 1 h silenciado, 5 = 1 día, 7 = expulsión
const ESCALATION = [[7, 'kick'], [5, 1440], [3, 60]];

function init(a) {
    api = a;
}

function definitions() {
    const perm = (p) => String(p);
    const user = { name: 'usuario', description: 'A quién', type: USER, required: true };
    const reason = { name: 'motivo', description: 'Motivo (queda en el registro)', type: S, required: false, max_length: 400 };
    return [
        { name: 'ban', description: 'Banear a alguien del servidor', default_member_permissions: perm(P.BAN), options: [user, reason, { name: 'borrar_mensajes', description: 'Borrar sus mensajes de los últimos días', type: INT, required: false, choices: [{ name: 'No', value: 0 }, { name: '1 día', value: 1 }, { name: '7 días', value: 7 }] }] },
        { name: 'desbanear', description: 'Quitar un baneo', default_member_permissions: perm(P.BAN), options: [{ name: 'id', description: 'ID de Discord de la persona', type: S, required: true }, reason] },
        { name: 'expulsar', description: 'Expulsar a alguien (puede volver con una invitación)', default_member_permissions: perm(P.KICK), options: [user, reason] },
        {
            name: 'silenciar', description: 'Silenciar a alguien un tiempo', default_member_permissions: perm(P.MODERATE), options: [user, {
                name: 'duracion', description: 'Cuánto tiempo', type: INT, required: true,
                choices: [{ name: '5 minutos', value: 5 }, { name: '15 minutos', value: 15 }, { name: '1 hora', value: 60 }, { name: '6 horas', value: 360 }, { name: '1 día', value: 1440 }, { name: '1 semana', value: 10080 }],
            }, reason],
        },
        { name: 'quitar-silencio', description: 'Quitar el silencio a alguien', default_member_permissions: perm(P.MODERATE), options: [user, reason] },
        { name: 'advertir', description: 'Advertir a alguien (3 = 1 h silenciado, 5 = 1 día, 7 = expulsión)', default_member_permissions: perm(P.MODERATE), options: [user, { ...reason, required: true }] },
        { name: 'sanciones', description: 'Historial de sanciones de alguien', default_member_permissions: perm(P.MODERATE), options: [user] },
        { name: 'perdonar', description: 'Borrar las advertencias de alguien', default_member_permissions: perm(P.MODERATE), options: [user, reason] },
        { name: 'limpiar', description: 'Borrar los últimos mensajes del canal', default_member_permissions: perm(P.MANAGE_MESSAGES), options: [{ name: 'cantidad', description: 'Cuántos (1-100)', type: INT, required: true, min_value: 1, max_value: 100 }, { name: 'usuario', description: 'Solo los de esta persona', type: USER, required: false }] },
        { name: 'bloquear', description: 'Bloquear un canal (nadie puede escribir)', default_member_permissions: perm(P.MANAGE_CHANNELS), options: [{ name: 'canal', description: 'Canal (por defecto este)', type: CHANNEL, required: false, channel_types: [0, 5] }, reason] },
        { name: 'desbloquear', description: 'Desbloquear un canal', default_member_permissions: perm(P.MANAGE_CHANNELS), options: [{ name: 'canal', description: 'Canal (por defecto este)', type: CHANNEL, required: false, channel_types: [0, 5] }] },
        { name: 'modo-lento', description: 'Tiempo mínimo entre mensajes en este canal', default_member_permissions: perm(P.MANAGE_CHANNELS), options: [{ name: 'segundos', description: '0 para quitarlo', type: INT, required: true, min_value: 0, max_value: 21600 }] },
        {
            name: 'automod', description: 'Filtros automáticos de Discord para el servidor', default_member_permissions: perm(P.MANAGE_GUILD), options: [
                { name: 'estado', description: 'Ver y activar o desactivar los filtros', type: 1 },
                { name: 'añadir-palabra', description: 'Bloquear una palabra o frase', type: 1, options: [{ name: 'palabra', description: 'Usa * como comodín (ej. *spam*)', type: S, required: true, max_length: 60 }] },
                { name: 'quitar-palabra', description: 'Dejar de bloquear una palabra', type: 1, options: [{ name: 'palabra', description: 'Tal cual la añadiste', type: S, required: true, max_length: 60 }] },
            ],
        },
    ];
}

const NAMES = new Set(definitions().map((d) => d.name));

/* --------------------------------------------------------------- utilidades */

const ui = (k) => (...a) => api.ui[k](...a);
const [text, sep, row, container, cut, ts] = ['text', 'sep', 'row', 'container', 'cut', 'ts'].map(ui);
const V2 = 1 << 15;
const card = (color, ...c) => ({ flags: V2, components: [container(color, c)], allowed_mentions: { parse: [] } });
const ok = (msg) => card(0x10b981, text(msg));
const no = (msg) => card(0xef4444, text(msg));
const btn = (label, custom_id, style = 2, disabled = false) => ({ type: 2, style, label, custom_id, disabled });

function opt(i, name) {
    const flat = (list) => (list || []).flatMap((o) => (o.options ? [o, ...flat(o.options)] : [o]));
    return flat(i.data.options).find((o) => o.name === name)?.value;
}
const sub = (i) => (i.data.options || []).find((o) => o.type === 1)?.name;
const actor = (i) => i.member?.user || i.user;
const reasonOf = (i) => cut(opt(i, 'motivo') || 'Sin motivo', 400);

let rolesCache = { at: 0, roles: [] };
async function guildRoles() {
    if (Date.now() - rolesCache.at > 60_000) rolesCache = { at: Date.now(), roles: await api.discord('GET', `/guilds/${api.ctx().guild}/roles`) };
    return rolesCache.roles;
}
let guildCache = null;
async function guild() {
    guildCache ??= await api.discord('GET', `/guilds/${api.ctx().guild}`);
    return guildCache;
}

async function topPosition(roleIds) {
    const roles = await guildRoles();
    return Math.max(0, ...roles.filter((r) => roleIds.includes(r.id)).map((r) => r.position));
}

/** No se puede sancionar a quien tiene un rol igual o superior, ni al dueño, ni al bot. */
async function checkTarget(i, targetId) {
    const g = await guild();
    const me = actor(i);
    if (targetId === me.id) return 'No puedes sancionarte a ti.';
    if (targetId === g.owner_id) return 'No se puede sancionar al dueño del servidor.';
    if (targetId === api.ctx().appId) return 'No puedo sancionarme a mí.';
    const target = await api.discord('GET', `/guilds/${g.id}/members/${targetId}`).catch(() => null);
    if (!target) return null; // ya no está (p. ej. ban por ID): no hay jerarquía que mirar
    if (me.id !== g.owner_id && (await topPosition(target.roles)) >= (await topPosition(i.member?.roles || []))) {
        return 'Esa persona tiene un rol igual o superior al tuyo.';
    }
    return null;
}

async function log(title, lines, color = 0xf59e0b) {
    const ch = api.ctx().layout.channels.logs;
    if (!ch) return;
    await api.discord('POST', `/channels/${ch}/messages`, card(color, text(`### ${title}`), text(lines.filter(Boolean).join('\n')))).catch(() => {});
}

/** Aviso por privado a la persona sancionada (si tiene los MD cerrados, se ignora). */
async function dm(userId, msg) {
    try {
        const ch = await api.discord('POST', '/users/@me/channels', { recipient_id: userId });
        await api.discord('POST', `/channels/${ch.id}/messages`, card(0xef4444, text(msg)));
    } catch {}
}

function record(userId, entry) {
    const st = api.st();
    st.sanctions ??= {};
    (st.sanctions[userId] ??= []).push({ ...entry, at: new Date().toISOString() });
    st.sanctions[userId] = st.sanctions[userId].slice(-50);
    api.saveState();
}

const warnings = (userId) => (api.st().sanctions?.[userId] || []).filter((s) => s.type === 'warn' && !s.cleared);

async function timeout(userId, minutes, reason) {
    const until = minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
    await api.discord('PATCH', `/guilds/${api.ctx().guild}/members/${userId}`, { communication_disabled_until: until }, reason);
}

const LABEL = { warn: 'Advertencia', timeout: 'Silencio', kick: 'Expulsión', ban: 'Baneo', unban: 'Baneo retirado', untimeout: 'Silencio retirado', pardon: 'Advertencias borradas' };
const human = (m) => (m >= 1440 ? `${m / 1440} día(s)` : m >= 60 ? `${m / 60} h` : `${m} min`);

/* ---------------------------------------------------------------- comandos */

async function run(i) {
    const name = i.data.name;
    const me = actor(i);
    const g = api.ctx().guild;
    const target = opt(i, 'usuario');
    const targetUser = target ? i.data.resolved?.users?.[target] : null;
    const tag = (u) => (u ? `<@${u.id}> (${u.username})` : '');

    if (['ban', 'expulsar', 'silenciar', 'advertir'].includes(name)) {
        const err = await checkTarget(i, target);
        if (err) return no(err);
    }

    switch (name) {
        case 'ban': {
            const reason = reasonOf(i);
            await dm(target, `Has sido baneado de **Cinammon Network**.\n**Motivo:** ${reason}`);
            await api.discord('PUT', `/guilds/${g}/bans/${target}`, { delete_message_seconds: (opt(i, 'borrar_mensajes') || 0) * 86400 }, `${me.username}: ${reason}`);
            record(target, { type: 'ban', by: me.id, reason });
            await log('Baneo', [`**Usuario:** ${tag(targetUser)}`, `**Por:** <@${me.id}>`, `**Motivo:** ${reason}`], 0xef4444);
            return ok(`${tag(targetUser)} ha sido baneado.`);
        }
        case 'desbanear': {
            const id = String(opt(i, 'id')).replace(/\D/g, '');
            const reason = reasonOf(i);
            await api.discord('DELETE', `/guilds/${g}/bans/${id}`, undefined, `${me.username}: ${reason}`).catch((e) => {
                if (e.status === 404) throw Object.assign(new Error('Esa persona no está baneada.'), { friendly: true });
                throw e;
            });
            record(id, { type: 'unban', by: me.id, reason });
            await log('Baneo retirado', [`**Usuario:** <@${id}>`, `**Por:** <@${me.id}>`, `**Motivo:** ${reason}`], 0x10b981);
            return ok(`<@${id}> ya no está baneado.`);
        }
        case 'expulsar': {
            const reason = reasonOf(i);
            await dm(target, `Has sido expulsado de **Cinammon Network**.\n**Motivo:** ${reason}`);
            await api.discord('DELETE', `/guilds/${g}/members/${target}`, undefined, `${me.username}: ${reason}`);
            record(target, { type: 'kick', by: me.id, reason });
            await log('Expulsión', [`**Usuario:** ${tag(targetUser)}`, `**Por:** <@${me.id}>`, `**Motivo:** ${reason}`], 0xf97316);
            return ok(`${tag(targetUser)} ha sido expulsado.`);
        }
        case 'silenciar': {
            const minutes = opt(i, 'duracion');
            const reason = reasonOf(i);
            await timeout(target, minutes, `${me.username}: ${reason}`);
            record(target, { type: 'timeout', by: me.id, reason, minutes });
            await dm(target, `Te han silenciado **${human(minutes)}** en Cinammon Network.\n**Motivo:** ${reason}`);
            await log('Silencio', [`**Usuario:** ${tag(targetUser)}`, `**Duración:** ${human(minutes)}`, `**Por:** <@${me.id}>`, `**Motivo:** ${reason}`]);
            return ok(`${tag(targetUser)} silenciado ${human(minutes)}.`);
        }
        case 'quitar-silencio': {
            await timeout(target, 0, `${me.username}: ${reasonOf(i)}`);
            record(target, { type: 'untimeout', by: me.id, reason: reasonOf(i) });
            await log('Silencio retirado', [`**Usuario:** ${tag(targetUser)}`, `**Por:** <@${me.id}>`], 0x10b981);
            return ok(`${tag(targetUser)} ya puede hablar.`);
        }
        case 'advertir': {
            const reason = reasonOf(i);
            record(target, { type: 'warn', by: me.id, reason });
            const count = warnings(target).length;
            let extra = '';
            const step = ESCALATION.find(([n]) => count === n);
            if (step) {
                if (step[1] === 'kick') {
                    await dm(target, `Has llegado a ${count} advertencias y has sido expulsado de Cinammon Network.`);
                    await api.discord('DELETE', `/guilds/${g}/members/${target}`, undefined, `${count} advertencias`).catch(() => {});
                    record(target, { type: 'kick', by: api.ctx().appId, reason: `${count} advertencias` });
                    extra = `\nCon ${count} advertencias, expulsado automáticamente.`;
                } else {
                    await timeout(target, step[1], `${count} advertencias`).catch(() => {});
                    record(target, { type: 'timeout', by: api.ctx().appId, reason: `${count} advertencias`, minutes: step[1] });
                    extra = `\nCon ${count} advertencias, silenciado ${human(step[1])} automáticamente.`;
                }
            }
            await dm(target, `Has recibido una advertencia en Cinammon Network (${count}).\n**Motivo:** ${reason}${extra}`);
            await log('Advertencia', [`**Usuario:** ${tag(targetUser)} · ${count} en total`, `**Por:** <@${me.id}>`, `**Motivo:** ${reason}`, extra.trim()]);
            return ok(`${tag(targetUser)} advertido (${count}).${extra}`);
        }
        case 'sanciones': {
            const list = (api.st().sanctions?.[target] || []).slice(-15).reverse();
            return card(api.accent(),
                text(`## Sanciones de ${targetUser?.global_name || targetUser?.username || target}\n**Advertencias activas:** ${warnings(target).length}`),
                sep(),
                text(list.length ? list.map((s) => `${ts(s.at, 'd')} · **${LABEL[s.type] || s.type}**${s.minutes ? ` ${human(s.minutes)}` : ''}${s.cleared ? ' (borrada)' : ''} · <@${s.by}>\n-# ${cut(s.reason || '', 150)}`).join('\n') : 'Sin sanciones.'),
            );
        }
        case 'perdonar': {
            (api.st().sanctions?.[target] || []).forEach((s) => { if (s.type === 'warn') s.cleared = true; });
            record(target, { type: 'pardon', by: me.id, reason: reasonOf(i) });
            await log('Advertencias borradas', [`**Usuario:** ${tag(targetUser)}`, `**Por:** <@${me.id}>`], 0x10b981);
            return ok(`Advertencias de ${tag(targetUser)} borradas.`);
        }
        case 'limpiar': {
            const amount = opt(i, 'cantidad');
            const only = opt(i, 'usuario');
            const msgs = await api.discord('GET', `/channels/${i.channel_id}/messages?limit=100`);
            const limit = Date.now() - 14 * 86400_000 + 60_000; // Discord solo borra en bloque los de menos de 14 días
            const ids = msgs.filter((m) => (!only || m.author.id === only) && new Date(m.timestamp).getTime() > limit).slice(0, amount).map((m) => m.id);
            if (!ids.length) return no('No hay mensajes que se puedan borrar (los de más de 14 días no se pueden en bloque).');
            if (ids.length === 1) await api.discord('DELETE', `/channels/${i.channel_id}/messages/${ids[0]}`);
            else await api.discord('POST', `/channels/${i.channel_id}/messages/bulk-delete`, { messages: ids }, `Limpieza por ${me.username}`);
            await log('Limpieza', [`**Canal:** <#${i.channel_id}>`, `**Mensajes:** ${ids.length}${only ? ` de <@${only}>` : ''}`, `**Por:** <@${me.id}>`], 0x71717a);
            return ok(`${ids.length} mensaje(s) borrado(s).`);
        }
        case 'bloquear':
        case 'desbloquear': {
            const ch = opt(i, 'canal') || i.channel_id;
            const channel = await api.discord('GET', `/channels/${ch}`);
            const everyone = (channel.permission_overwrites || []).find((o) => o.id === g) || { allow: '0', deny: '0' };
            let allow = BigInt(everyone.allow), deny = BigInt(everyone.deny);
            if (name === 'bloquear') { deny |= P.SEND; allow &= ~P.SEND; } else { deny &= ~P.SEND; }
            await api.discord('PUT', `/channels/${ch}/permissions/${g}`, { type: 0, allow: String(allow), deny: String(deny) }, `${name} por ${me.username}`);
            if (name === 'bloquear') await api.discord('POST', `/channels/${ch}/messages`, card(0xef4444, text(`Canal bloqueado por el staff.${opt(i, 'motivo') ? `\n-# ${cut(opt(i, 'motivo'), 200)}` : ''}`))).catch(() => {});
            await log(name === 'bloquear' ? 'Canal bloqueado' : 'Canal desbloqueado', [`**Canal:** <#${ch}>`, `**Por:** <@${me.id}>`], 0x71717a);
            return ok(`<#${ch}> ${name === 'bloquear' ? 'bloqueado' : 'desbloqueado'}.`);
        }
        case 'modo-lento': {
            const s = opt(i, 'segundos');
            await api.discord('PATCH', `/channels/${i.channel_id}`, { rate_limit_per_user: s }, `Modo lento por ${me.username}`);
            return ok(s ? `Modo lento: un mensaje cada ${s} s.` : 'Modo lento desactivado.');
        }
        case 'automod': return automod(i, sub(i));
        default: return no('Comando desconocido.');
    }
}

/* ----------------------------------------------------------------- AutoMod */

// Reglas que gestiona el bot (se reconocen por el nombre).
const RULES = {
    words: { name: 'Cinammon · palabras bloqueadas', label: 'Palabras bloqueadas', trigger_type: 1 },
    preset: { name: 'Cinammon · insultos y contenido sexual', label: 'Insultos, contenido sexual y ofensas', trigger_type: 4 },
    invites: { name: 'Cinammon · invitaciones de otros servidores', label: 'Invitaciones a otros servidores', trigger_type: 1 },
    spam: { name: 'Cinammon · spam', label: 'Spam sospechoso', trigger_type: 3 },
    mentions: { name: 'Cinammon · menciones masivas', label: 'Menciones masivas (raids)', trigger_type: 5 },
};
const DEFAULT_WORDS = ['*nazi*', '*hitler*', '*free nitro*', '*nitro gratis*', '*steamcommunity.ru*', '*grabify*', '*iplogger*'];

function ruleBody(key, enabled, words) {
    const L = api.ctx().layout;
    const exempt = ['owner', 'admin', 'moderator', 'helper'].map((k) => L.roles[k]).filter(Boolean);
    const alert = L.channels.logs ? [{ type: 2, metadata: { channel_id: L.channels.logs } }] : [];
    const block = (msg) => ({ type: 1, metadata: { custom_message: msg } });
    const base = { name: RULES[key].name, event_type: 1, trigger_type: RULES[key].trigger_type, enabled, exempt_roles: exempt };
    switch (key) {
        case 'words': return { ...base, trigger_metadata: { keyword_filter: words.length ? words : DEFAULT_WORDS }, actions: [block('Ese mensaje contiene algo que no está permitido aquí.'), ...alert] };
        case 'preset': return { ...base, trigger_metadata: { presets: [1, 2, 3] }, actions: [block('Mantén el respeto: ese mensaje no está permitido.'), ...alert] };
        case 'invites': return { ...base, trigger_metadata: { regex_patterns: ['(discord\\.(gg|io|me|li)|discord(app)?\\.com/invite)/[a-z0-9-]+'] }, actions: [block('No se permiten invitaciones a otros servidores.'), ...alert] };
        case 'spam': return { ...base, actions: [block('Mensaje bloqueado por parecer spam.'), ...alert] };
        case 'mentions': return { ...base, trigger_metadata: { mention_total_limit: 6, mention_raid_protection_enabled: true }, actions: [block('Demasiadas menciones en un solo mensaje.'), ...alert, { type: 3, metadata: { duration_seconds: 600 } }] };
    }
}

async function rules() {
    const list = await api.discord('GET', `/guilds/${api.ctx().guild}/auto-moderation/rules`);
    const mine = {};
    // Spam, presets y menciones solo admiten una regla por servidor: si ya hay una (p. ej. la de Discord), se reutiliza.
    const single = [3, 4, 5];
    for (const [key, def] of Object.entries(RULES)) {
        mine[key] = list.find((r) => r.name === def.name) || (single.includes(def.trigger_type) ? list.find((r) => r.trigger_type === def.trigger_type) : null) || null;
    }
    return mine;
}

async function upsertRule(key, enabled, words) {
    const current = (await rules())[key];
    const body = ruleBody(key, enabled, words ?? current?.trigger_metadata?.keyword_filter ?? DEFAULT_WORDS);
    if (current) {
        const { trigger_type, ...patch } = body;
        return api.discord('PATCH', `/guilds/${api.ctx().guild}/auto-moderation/rules/${current.id}`, patch, 'AutoMod de Cinammon');
    }
    return api.discord('POST', `/guilds/${api.ctx().guild}/auto-moderation/rules`, body, 'AutoMod de Cinammon');
}

async function automodView(note) {
    const r = await rules();
    const words = r.words?.trigger_metadata?.keyword_filter || [];
    return card(api.accent(),
        text('## AutoMod\nFiltros de Discord: bloquean el mensaje antes de que se publique y avisan en el registro. El staff está exento.'),
        sep(),
        text(Object.entries(RULES).map(([k, d]) => `${r[k]?.enabled ? '`ACTIVO`' : '`APAGADO`'} ${d.label}`).join('\n')),
        words.length ? text(`-# Palabras: ${cut(words.join(', '), 600)}`) : null,
        note ? text(`-# ${note}`) : null,
        row(...['preset', 'invites', 'spam', 'mentions', 'words'].map((k) => btn(r[k]?.enabled ? `Apagar: ${RULES[k].label.split(' ')[0]}` : `Activar: ${RULES[k].label.split(' ')[0]}`, `mod:am:${k}:${r[k]?.enabled ? 0 : 1}`, r[k]?.enabled ? 2 : 3))),
        row(btn('Activar todo', 'mod:am:all:1', 1), btn('Apagar todo', 'mod:am:all:0', 4), btn('Actualizar', 'mod:am:refresh')),
    );
}

async function automod(i, action) {
    if (action === 'añadir-palabra' || action === 'quitar-palabra') {
        const w = String(opt(i, 'palabra')).trim().toLowerCase();
        const current = (await rules()).words;
        let words = current?.trigger_metadata?.keyword_filter || [...DEFAULT_WORDS];
        words = action === 'añadir-palabra' ? [...new Set([...words, w])] : words.filter((x) => x !== w);
        await upsertRule('words', current ? current.enabled : true, words.slice(0, 1000));
        await log('AutoMod', [`**${action === 'añadir-palabra' ? 'Palabra añadida' : 'Palabra quitada'}:** \`${w}\``, `**Por:** <@${actor(i).id}>`], 0x71717a);
        return automodView(action === 'añadir-palabra' ? `"${w}" bloqueada.` : `"${w}" ya no se bloquea.`);
    }
    return automodView();
}

/** Botones del panel de AutoMod (custom_id "mod:am:<regla|all|refresh>:<1|0>"). */
async function component(i) {
    const perms = BigInt(i.member?.permissions || '0');
    if (!(perms & P.MANAGE_GUILD) && !(perms & P.ADMIN)) return no('Necesitas el permiso Gestionar servidor.');
    const [, , key, on] = i.data.custom_id.split(':');
    if (key === 'refresh') return automodView();
    const keys = key === 'all' ? Object.keys(RULES) : [key];
    const failed = [];
    for (const k of keys) {
        try {
            await upsertRule(k, on === '1');
        } catch (e) {
            failed.push(`${RULES[k].label}: ${e.message.replace(/^.*?-> /, '')}`);
        }
    }
    await log('AutoMod', [`**${on === '1' ? 'Activado' : 'Apagado'}:** ${keys.map((k) => RULES[k].label).join(', ')}`, `**Por:** <@${actor(i).id}>`], 0x71717a);
    return automodView(failed.length ? `No se pudo: ${cut(failed.join(' | '), 300)}` : 'Guardado.');
}

module.exports = { init, definitions, NAMES, run, component };
