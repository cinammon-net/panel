/**
 * Bienvenidas, despedidas e invitaciones.
 *
 * Necesita en el portal de desarrolladores "Server Members Intent" (eventos de entrada/salida)
 * y el permiso Gestionar servidor (para leer las invitaciones y saber quién invitó a quién).
 */
const art = require('./art');

let env = null; // { discord, panel, sendFile, st, saveState, ctx, pal, audit, log, forgetRoles }
const invites = new Map(); // code -> { uses, inviter }

function init(e) {
    env = e;
}

async function loadInvites() {
    try {
        const list = await env.discord('GET', `/guilds/${env.ctx().guild}/invites`);
        invites.clear();
        for (const i of list) invites.set(i.code, { uses: i.uses || 0, inviter: i.inviter?.id || null });
    } catch (e) {
        env.log(`[SYNC] invitaciones: ${e.message}`);
    }
}

function onInviteCreate(d) {
    invites.set(d.code, { uses: d.uses || 0, inviter: d.inviter?.id || null });
}

function onInviteDelete(d) {
    invites.delete(d.code);
}

/** Compara usos antes/después para saber qué invitación se usó. */
async function detectInviter() {
    const before = new Map(invites);
    await loadInvites();
    for (const [code, now] of invites) {
        const prev = before.get(code);
        if ((prev?.uses || 0) < now.uses) return { code, inviter: ownerOf(code, now.inviter) };
    }
    // Invitación de un solo uso: desaparece al usarse.
    for (const [code, prev] of before) {
        if (!invites.has(code) && prev.inviter) return { code, inviter: ownerOf(code, prev.inviter) };
    }
    return null;
}

/** Las invitaciones de /invitar las crea el bot: cuentan para quien las pidió. */
function ownerOf(code, inviter) {
    return env.st().invites?.owners?.[code] || inviter;
}

/**
 * Enlace permanente y personal al servidor (sin caducidad ni límite de usos).
 * Se reutiliza mientras siga existiendo; si alguien lo borra, se crea otro.
 */
async function personalInvite(userId) {
    const state = env.st();
    state.invites ??= { counts: {}, members: {} };
    state.invites.links ??= {};
    state.invites.owners ??= {};
    if (!invites.size) await loadInvites();
    const known = state.invites.links[userId];
    if (known && invites.has(known)) return known;

    const ch = env.ctx().layout.channels;
    const channel = ch.verify || ch.rules || ch.general;
    const inv = await env.discord('POST', `/channels/${channel}/invites`, { max_age: 0, max_uses: 0, unique: true });
    if (known) delete state.invites.owners[known];
    state.invites.links[userId] = inv.code;
    state.invites.owners[inv.code] = userId;
    invites.set(inv.code, { uses: inv.uses || 0, inviter: inv.inviter?.id || null });
    env.saveState();
    return inv.code;
}

/**
 * Comprueba los permisos reales del bot para las invitaciones (roles + permisos del canal)
 * y lo deja en el log: Gestionar servidor (ver usos) y Crear invitación (en el canal al que lleva).
 */
async function checkPermissions() {
    const g = env.ctx().guild;
    const app = env.ctx().appId;
    const ch = env.ctx().layout.channels;
    const target = ch.verify || ch.rules || ch.general;
    const [guild, me, channel] = await Promise.all([
        env.discord('GET', `/guilds/${g}`),
        env.discord('GET', `/guilds/${g}/members/${app}`),
        target ? env.discord('GET', `/channels/${target}`) : null,
    ]);
    const roles = new Map((guild.roles || []).map((r) => [r.id, BigInt(r.permissions)]));
    let base = roles.get(g) || 0n;
    for (const r of me.roles || []) base |= roles.get(r) || 0n;
    const ADMIN = 1n << 3n, MANAGE_GUILD = 1n << 5n, CREATE_INVITE = 1n << 0n;
    const admin = (base & ADMIN) === ADMIN || guild.owner_id === app;

    // Permisos en el canal: @everyone, luego roles, luego el propio bot
    let inChannel = base;
    if (channel && !admin) {
        const ow = channel.permission_overwrites || [];
        const apply = (o) => { if (o) inChannel = (inChannel & ~BigInt(o.deny)) | BigInt(o.allow); };
        apply(ow.find((o) => o.id === g));
        let deny = 0n, allow = 0n;
        for (const o of ow.filter((o) => o.type === 0 && o.id !== g && (me.roles || []).includes(o.id))) { deny |= BigInt(o.deny); allow |= BigInt(o.allow); }
        inChannel = (inChannel & ~deny) | allow;
        apply(ow.find((o) => o.type === 1 && o.id === app));
    }
    const manage = admin || (base & MANAGE_GUILD) === MANAGE_GUILD;
    const create = admin || (inChannel & CREATE_INVITE) === CREATE_INVITE;
    const result = { admin, manageGuild: manage, createInvite: create, channel: target };
    env.log(`[SYNC] Permisos de invitaciones: ${admin ? 'Administrador (todo permitido)' : `Gestionar servidor ${manage ? 'sí' : 'NO'}, Crear invitación en #${channel?.name || '?'} ${create ? 'sí' : 'NO'}`}.`);
    return result;
}

/* ------------------------------------------------ invitación → referido de la tienda */

const FINAL = new Set(['linked', 'already', 'other', 'existing_customer', 'self']);
const RETRY_DAYS = 30;

/**
 * Si a esta persona la trajo alguien al Discord, la apunta como referida de esa persona en la tienda
 * (mismas monedas que el enlace de /monedas). Hace falta que las dos tengan la cuenta vinculada y
 * que el invitado ya tenga cuenta en la tienda; si falta algo, se reintenta más tarde.
 */
async function claimReferral(userId) {
    const I = env.st().invites;
    const inviter = I?.members?.[userId];
    if (!inviter) return null;
    I.referrals ??= {};
    const prev = I.referrals[userId];
    if (prev && FINAL.has(prev.status)) return prev;

    let joined = I.joined?.[userId];
    if (!joined) {
        const m = await env.discord('GET', `/guilds/${env.ctx().guild}/members/${userId}`).catch(() => null);
        if (!m?.joined_at) return null;
        joined = m.joined_at;
        (I.joined ??= {})[userId] = joined;
    }
    let status;
    try {
        status = (await env.panel('POST', `/api/bot/discord/${userId}/referral`, { inviter, joined_at: joined })).status;
    } catch (e) {
        // 404: alguna de las dos cuentas sin vincular, o sin cuenta en la tienda todavía
        status = e.status === 404 ? 'waiting' : 'error';
        if (e.status !== 404) env.log(`[SYNC] referido ${userId}: ${e.message}`);
    }
    const expired = Date.now() - new Date(joined).getTime() > RETRY_DAYS * 86400_000;
    I.referrals[userId] = { status: !FINAL.has(status) && expired ? 'expired' : status, at: Date.now() };
    env.saveState();
    if (status === 'linked') env.log(`[SYNC] ${userId} queda como referido de ${inviter} en la tienda.`);
    return I.referrals[userId];
}

let lastRetry = 0;
/** Reintenta, como mucho cada 30 min y cada persona cada 6 h, las que aún esperan. */
async function retryReferrals() {
    if (Date.now() - lastRetry < 30 * 60_000) return;
    lastRetry = Date.now();
    const I = env.st().invites;
    for (const id of Object.keys(I?.members || {})) {
        const r = I.referrals?.[id];
        if (r && (FINAL.has(r.status) || r.status === 'expired' || Date.now() - r.at < 6 * 3600_000)) continue;
        await claimReferral(id);
    }
}

const inviterOf = (userId) => env.st().invites?.members?.[userId] || null;

function stats(userId) {
    const s = env.st().invites?.counts?.[userId] || { joins: 0, leaves: 0 };
    return { ...s, total: Math.max(0, s.joins - s.leaves) };
}

const avatarOf = (u) => (u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`);
const nameOf = (u) => u.global_name || u.username;

async function memberCount() {
    const g = await env.discord('GET', `/guilds/${env.ctx().guild}?with_counts=true`).catch(() => null);
    return g?.approximate_member_count || null;
}

async function onJoin(member) {
    const u = member.user;
    if (!u || u.bot) return;
    const { st, saveState, ctx } = env;
    const layout = ctx().layout;
    const state = st();
    state.invites ??= { counts: {}, members: {} };

    // El rol Miembro (acceso a los canales) ya no se da al entrar: se consigue verificándose en #verificación.
    // La tarjeta de bienvenida también sale al verificarse (welcome()).
    env.forgetRoles(u.id);

    const used = await detectInviter();
    if (used?.inviter && used.inviter !== u.id) {
        state.invites.members[u.id] = used.inviter;
        (state.invites.joined ??= {})[u.id] = new Date().toISOString();
        const c = (state.invites.counts[used.inviter] ??= { joins: 0, leaves: 0 });
        c.joins++;
    }
    saveState();
}

/** Tarjeta de bienvenida en #llegadas (se llama al verificarse). */
async function welcome(u) {
    const layout = env.ctx().layout;
    const state = env.st();
    state.invites ??= { counts: {}, members: {} };
    const count = await memberCount();
    const inviter = state.invites.members[u.id];
    const inviterUser = inviter ? await env.discord('GET', `/users/${inviter}`).catch(() => null) : null;
    const line = [count ? `Miembro #${count}` : null, inviterUser ? `invitación de ${nameOf(inviterUser)}` : null].filter(Boolean).join(' | ');
    const png = await art.memberCard({ avatarUrl: avatarOf(u), name: nameOf(u), kind: 'join', line }, env.pal());

    const ch = layout.channels;
    const text = `## Te damos la bienvenida, <@${u.id}>\n` +
        `Pásate por <#${ch.rules}> y saluda en <#${ch.general}>. Si tienes cuenta en cinammon.net, vincúlala con Discord para recibir tus roles.` +
        (inviter ? `\n-# Invitación de <@${inviter}>, que ya lleva ${stats(inviter).total} invitación(es).` : '');
    await env.sendFile(ch.arrivals, 'bienvenida.png', png, [
        { type: 10, content: text },
    ], { users: [u.id] }, env.accent());
}

async function onLeave(d) {
    const u = d.user;
    if (!u || u.bot) return;
    const state = env.st();
    state.invites ??= { counts: {}, members: {} };
    const inviter = state.invites.members[u.id];
    if (inviter && state.invites.counts[inviter]) state.invites.counts[inviter].leaves++;
    delete state.invites.members[u.id];
    env.saveState();

    const count = await memberCount();
    const png = await art.memberCard({ avatarUrl: avatarOf(u), name: nameOf(u), kind: 'leave', line: count ? `Ahora somos ${count}` : '' }, env.pal());
    await env.sendFile(env.ctx().layout.channels.arrivals, 'despedida.png', png, [
        { type: 10, content: `**${nameOf(u)}** ha salido del servidor. ¡Hasta pronto!` },
    ], { users: [] }, 0x71717a);
}

/** Ranking de invitaciones (las salidas restan). */
function leaderboard(limit = 10) {
    const counts = env.st().invites?.counts || {};
    return Object.entries(counts)
        .map(([id, c]) => ({ id, ...c, total: Math.max(0, c.joins - c.leaves) }))
        .filter((r) => r.joins > 0)
        .sort((a, b) => b.total - a.total || b.joins - a.joins)
        .slice(0, limit);
}

module.exports = { init, loadInvites, checkPermissions, personalInvite, claimReferral, retryReferrals, inviterOf, onInviteCreate, onInviteDelete, onJoin, onLeave, welcome, stats, leaderboard };
