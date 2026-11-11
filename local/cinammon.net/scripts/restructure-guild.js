#!/usr/bin/env node
/**
 * Reorganiza el servidor de Discord de Cinammon para que siga la estructura de la web.
 *  - Guarda una copia de la estructura actual (canales, permisos, roles, webhooks) en OUT/backup-*.json.
 *  - Expulsa a todos los bots salvo MoXi y el propio bot.
 *  - Borra todos los canales y categorías salvo #github, y todos los roles propios que el bot pueda gestionar.
 *  - Crea roles (staff, rangos VIP, insignias) y categorías/canales nuevos.
 *  - Escribe OUT/discord-layout.json con los IDs, que usa la sincronización del bot.
 * Uso: node restructure-guild.js <guild_id> <out_dir> [--apply]   (sin --apply solo muestra lo que haría)
 */
const fs = require('fs');
const path = require('path');

const CFG = JSON.parse(fs.readFileSync(path.join(process.env.BOT_DIR || '/home/container', 'bot-config.json'), 'utf8'));
const G = process.argv[2];
const OUT = process.argv[3] || '.';
const APPLY = process.argv.includes('--apply');
const API = 'https://discord.com/api/v10';
const KEEP_CHANNELS = ['1210740436700762112']; // #github y sus webhooks
const KEEP_BOTS = ['1456441655769956436']; // MoXi

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(method, p, body, reason) {
	for (let i = 0; i < 6; i++) {
		const res = await fetch(API + p, {
			method,
			headers: {
				Authorization: 'Bot ' + CFG.token,
				...(body ? { 'Content-Type': 'application/json' } : {}),
				...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
			},
			body: body ? JSON.stringify(body) : undefined,
		});
		if (res.status === 429) {
			const j = await res.json().catch(() => ({}));
			await sleep(Math.ceil((j.retry_after || 1) * 1000) + 100);
			continue;
		}
		const text = await res.text();
		const data = text ? JSON.parse(text) : null;
		if (!res.ok) throw new Error(`${method} ${p} -> ${res.status} ${text.slice(0, 200)}`);
		return data;
	}
	throw new Error(`${method} ${p}: demasiados 429`);
}
const hex = (h) => parseInt(h.replace('#', ''), 16);

// Permisos (bits de Discord)
const P = {
	VIEW: 1n << 10n, SEND: 1n << 11n, SEND_THREADS: 1n << 38n, CREATE_PUBLIC_THREADS: 1n << 35n, CREATE_PRIVATE_THREADS: 1n << 36n,
	ADD_REACTIONS: 1n << 6n, ADMIN: 1n << 3n, KICK: 1n << 1n, BAN: 1n << 2n, MANAGE_MESSAGES: 1n << 13n, MANAGE_THREADS: 1n << 34n,
	MODERATE: 1n << 40n, MANAGE_NICKNAMES: 1n << 27n, MOVE_MEMBERS: 1n << 24n, MUTE_MEMBERS: 1n << 22n, VIEW_AUDIT: 1n << 7n,
};
const bits = (...xs) => xs.reduce((a, b) => a | b, 0n).toString();

const ROLES = [
	// Staff (como los roles del panel)
	{ key: 'owner', name: 'Owner', color: '#facc15', hoist: true, permissions: bits(P.ADMIN) },
	{ key: 'admin', name: 'Admin', color: '#f43f5e', hoist: true, permissions: bits(P.ADMIN) },
	{ key: 'moderator', name: 'Moderador', color: '#fb923c', hoist: true, permissions: bits(P.KICK, P.BAN, P.MANAGE_MESSAGES, P.MANAGE_THREADS, P.MODERATE, P.MANAGE_NICKNAMES, P.MOVE_MEMBERS, P.MUTE_MEMBERS, P.VIEW_AUDIT) },
	{ key: 'helper', name: 'Helper', color: '#f472b6', hoist: true, permissions: bits(P.MANAGE_MESSAGES, P.MANAGE_THREADS) },
	// Rangos VIP de la tienda (mismos nombres y colores que en la web)
	{ key: 'rank:Leyenda Cinammon', name: 'Leyenda Cinammon', color: '#facc15', hoist: true },
	{ key: 'rank:Cibercanela', name: 'Cibercanela', color: '#fb7185', hoist: true },
	{ key: 'rank:Mecenas', name: 'Mecenas', color: '#eab308', hoist: true },
	{ key: 'rank:Synthwave', name: 'Synthwave', color: '#d946ef', hoist: true },
	{ key: 'rank:Comandante de Clan', name: 'Comandante de Clan', color: '#f97316', hoist: true },
	{ key: 'rank:Creador de Contenido', name: 'Creador de Contenido', color: '#f43f5e', hoist: true },
	{ key: 'rank:Neón', name: 'Neón', color: '#e879f9', hoist: true },
	{ key: 'rank:Desarrollador', name: 'Desarrollador', color: '#818cf8', hoist: true },
	{ key: 'rank:Arquitecto de Mundos', name: 'Arquitecto de Mundos', color: '#34d399', hoist: true },
	{ key: 'rank:Chispa', name: 'Chispa', color: '#f59e0b', hoist: true },
	// Insignias automáticas
	{ key: 'client', name: 'Cliente Cinammon', color: '#a78bfa', hoist: false },
	{ key: 'member', name: 'Miembro', color: '#a1a1aa', hoist: false },
];

// type: 0 texto, 2 voz, 5 anuncios. ro = solo lectura para @everyone; staff = privado del equipo.
const LAYOUT = [
	{ key: 'info', name: 'Información', channels: [
		{ key: 'welcome', name: 'bienvenida', type: 0, ro: true, topic: 'Bienvenida a Cinammon Network.' },
		{ key: 'rules', name: 'normas', type: 0, ro: true, topic: 'Normas de la comunidad.' },
		{ key: 'announcements', name: 'anuncios', type: 5, ro: true, topic: 'Anuncios publicados desde el panel de cinammon.net.' },
		{ key: 'offers', name: 'ofertas', type: 5, ro: true, topic: 'Ofertas y descuentos de la tienda.' },
		{ key: 'status', name: 'estado', type: 0, ro: true, topic: 'Estado de los servicios y mantenimientos programados. Se actualiza solo.' },
	] },
	{ key: 'store', name: 'Tienda', channels: [
		{ key: 'plans', name: 'planes', type: 0, ro: true, topic: 'Planes y precios de billing.cinammon.net. Se actualiza solo.' },
		{ key: 'ranks', name: 'rangos-vip', type: 0, ro: true, topic: 'Rangos VIP: ventajas en la web y rol en Discord.' },
		{ key: 'payments', name: 'metodos-de-pago', type: 0, ro: true, topic: 'Métodos de pago aceptados.' },
	] },
	{ key: 'support', name: 'Soporte', channels: [
		{ key: 'help', name: 'soporte', type: 0, topic: 'Dudas rápidas. Para algo de tu cuenta, abre un ticket.' },
		{ key: 'tickets', name: 'tickets', type: 0, ro: true, threads: true, topic: 'Abre un ticket: se crea un hilo privado conectado con tu ticket del panel.' },
	] },
	{ key: 'community', name: 'Comunidad', channels: [
		{ key: 'general', name: 'general', type: 0 },
		{ key: 'commands', name: 'comandos', type: 0, topic: 'Comandos del bot: /estado, /servidores, /tienda, /perfil…' },
		{ key: 'voice', name: 'General', type: 2 },
	] },
	{ key: 'dev', name: 'Desarrollo', channels: [{ key: 'github', keep: '1210740436700762112' }] },
	{ key: 'staff', name: 'Staff', staff: true, channels: [
		{ key: 'staff', name: 'staff', type: 0 },
		{ key: 'logs', name: 'registros', type: 0, topic: 'Registro de sincronización entre la web y Discord.' },
	] },
];

(async () => {
	const me = await api('GET', '/users/@me');
	const guild = await api('GET', `/guilds/${G}`);
	const roles = await api('GET', `/guilds/${G}/roles`);
	const channels = await api('GET', `/guilds/${G}/channels`);
	const hooks = await api('GET', `/guilds/${G}/webhooks`).catch(() => []);
	const meMember = await api('GET', `/guilds/${G}/members/${me.id}`);
	const myTop = Math.max(0, ...roles.filter((r) => meMember.roles.includes(r.id)).map((r) => r.position));
	console.log(`Bot ${me.username} en «${guild.name}» · rol más alto del bot: ${myTop}`);

	fs.mkdirSync(OUT, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	fs.writeFileSync(path.join(OUT, `backup-${stamp}.json`), JSON.stringify({ guild, roles, channels, webhooks: hooks.map((w) => ({ ...w, token: undefined, url: undefined })) }, null, 2));
	console.log(`Copia de la estructura: backup-${stamp}.json`);

	// 1) Bots
	const botIds = [...new Set(roles.filter((r) => r.tags && r.tags.bot_id).map((r) => r.tags.bot_id))].filter((id) => id !== me.id && !KEEP_BOTS.includes(id));
	console.log(`\n[Bots] expulsar ${botIds.length}:`, roles.filter((r) => r.tags && botIds.includes(r.tags.bot_id)).map((r) => r.name).join(', '));
	// 2) Canales
	const delChannels = channels.filter((c) => !KEEP_CHANNELS.includes(c.id));
	console.log(`[Canales] borrar ${delChannels.length}, conservar: ${channels.filter((c) => KEEP_CHANNELS.includes(c.id)).map((c) => c.name).join(', ')}`);
	// 3) Roles propios gestionables (no @everyone, no integraciones, por debajo del bot, y no los que tiene el propio bot)
	const delRoles = roles.filter((r) => r.id !== G && !r.managed && r.position < myTop && !meMember.roles.includes(r.id));
	const keptRoles = roles.filter((r) => r.id !== G && !r.managed && !delRoles.includes(r));
	console.log(`[Roles] borrar ${delRoles.length}: ${delRoles.map((r) => r.name).join(', ')}`);
	console.log(`[Roles] no se pueden borrar (por encima del bot o del propio bot): ${keptRoles.map((r) => r.name).join(', ') || '-'}`);
	console.log(`[Crear] ${ROLES.length} roles y ${LAYOUT.length} categorías con ${LAYOUT.reduce((n, c) => n + c.channels.filter((x) => !x.keep).length, 0)} canales nuevos`);

	if (!APPLY) return console.log('\nSimulación: no se ha cambiado nada. Ejecuta con --apply para aplicarlo.');

	for (const id of botIds) {
		try { await api('DELETE', `/guilds/${G}/members/${id}`, null, 'Reorganización: solo MoXi y Cinammon'); console.log('  expulsado', id); } catch (e) { console.log('  !', e.message); }
	}
	for (const c of delChannels.sort((a, b) => (a.type === 4) - (b.type === 4))) {
		try { await api('DELETE', `/channels/${c.id}`, null, 'Reorganización del servidor'); console.log('  canal borrado', c.name); } catch (e) { console.log('  !', e.message); }
	}
	for (const r of delRoles) {
		try { await api('DELETE', `/guilds/${G}/roles/${r.id}`, null, 'Reorganización del servidor'); console.log('  rol borrado', r.name); } catch (e) { console.log('  !', e.message); }
	}

	const layout = { guild_id: G, roles: {}, channels: {}, categories: {}, created_at: new Date().toISOString() };
	for (const def of ROLES) {
		const r = await api('POST', `/guilds/${G}/roles`, { name: def.name, color: hex(def.color), hoist: def.hoist, mentionable: false, permissions: def.permissions ?? '0' }, 'Roles de cinammon.net');
		layout.roles[def.key] = r.id;
		console.log('  rol creado', def.name);
	}
	// Orden: los roles nuevos justo debajo del rol del bot, en el orden de ROLES.
	const positions = ROLES.map((def, i) => ({ id: layout.roles[def.key], position: Math.max(1, myTop - 1 - i) }));
	await api('PATCH', `/guilds/${G}/roles`, positions, 'Orden de roles').catch((e) => console.log('  ! orden de roles:', e.message));

	const staffIds = ['owner', 'admin', 'moderator', 'helper'].map((k) => layout.roles[k]);
	const everyoneRO = { id: G, type: 0, allow: '0', deny: bits(P.SEND, P.CREATE_PUBLIC_THREADS, P.CREATE_PRIVATE_THREADS) };
	const staffAllow = staffIds.map((id) => ({ id, type: 0, allow: bits(P.VIEW, P.SEND, P.SEND_THREADS, P.MANAGE_THREADS), deny: '0' }));
	const botAllow = { id: me.id, type: 1, allow: bits(P.VIEW, P.SEND, P.SEND_THREADS, P.CREATE_PRIVATE_THREADS, P.MANAGE_THREADS, P.MANAGE_MESSAGES), deny: '0' };

	let catPos = 0;
	for (const cat of LAYOUT) {
		const catOverwrites = cat.staff ? [{ id: G, type: 0, allow: '0', deny: bits(P.VIEW) }, ...staffAllow, botAllow] : [];
		const c = await api('POST', `/guilds/${G}/channels`, { name: cat.name, type: 4, position: catPos++, permission_overwrites: catOverwrites }, 'Estructura de cinammon.net');
		layout.categories[cat.key] = c.id;
		console.log('  categoría', cat.name);
		let pos = 0;
		for (const ch of cat.channels) {
			if (ch.keep) {
				await api('PATCH', `/channels/${ch.keep}`, { parent_id: c.id, position: pos++, lock_permissions: false }, 'Mover a Desarrollo').catch((e) => console.log('  !', e.message));
				layout.channels[ch.key] = ch.keep;
				console.log('    movido #github');
				continue;
			}
			const ow = cat.staff ? catOverwrites : ch.ro ? [everyoneRO, ...staffAllow, botAllow] : [];
			const created = await api('POST', `/guilds/${G}/channels`, { name: ch.name, type: ch.type, parent_id: c.id, position: pos++, topic: ch.topic, permission_overwrites: ow }, 'Estructura de cinammon.net');
			layout.channels[ch.key] = created.id;
			console.log('    #' + ch.name);
		}
	}
	await api('PATCH', `/guilds/${G}`, { system_channel_id: layout.channels.welcome }, 'Canal de bienvenida').catch((e) => console.log('  ! canal de sistema:', e.message));

	fs.writeFileSync(path.join(OUT, 'discord-layout.json'), JSON.stringify(layout, null, 2));
	console.log('\nListo. IDs guardados en discord-layout.json');
})().catch((e) => {
	console.error('ERROR', e.message);
	process.exit(1);
});
