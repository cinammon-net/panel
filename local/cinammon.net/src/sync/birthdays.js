/**
 * Cumpleaños en Discord.
 *
 * El panel decide quién cumple hoy (a su medianoche local) y entrega los regalos; el bot:
 *  - le da el rol Cumpleañero durante el día y se lo quita al acabar,
 *  - publica su tarjeta en #general con un botón "Felicitar" (cada firma le llega al panel y,
 *    por la noche, por correo),
 *  - le escribe por privado con su set de regalos,
 *  - y ofrece /cumpleaños para guardar la fecha, verla y ver los próximos.
 */
let env = null; // { discord, sendV2, panel, log, st, ctx, accent, ui, saveState, saveLayout, PANEL, BILLING, followup }

const V2 = 1 << 15;
const PINK = 0xec4899;
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const COUNTER = '-# Firmas en su tarjeta:'; // marca del texto del contador dentro de la tarjeta

function init(deps) {
    env = deps;
}

function state() {
    const st = env.st();
    st.birthdays ??= {};
    return st.birthdays;
}

const ui = () => env.ui;

/* ------------------------------------------------------------------ rol */

async function ensureRole() {
    const L = env.ctx().layout;
    const g = env.ctx().guild;
    const roles = await env.discord('GET', `/guilds/${g}/roles`);
    if (L.roles.birthday && roles.some((r) => r.id === L.roles.birthday)) return L.roles.birthday;
    const role = await env.discord('POST', `/guilds/${g}/roles`, { name: 'Cumpleañero', color: PINK, hoist: true, mentionable: false, permissions: '0' }, 'Rol de cumpleaños (lo da el bot ese día)');
    // Lo más alto que el bot puede asignar, para que se vea arriba en la lista de miembros.
    try {
        const me = await env.discord('GET', `/guilds/${g}/members/${env.ctx().appId}`);
        const top = Math.max(0, ...roles.filter((r) => me.roles.includes(r.id)).map((r) => r.position));
        if (top > 1) await env.discord('PATCH', `/guilds/${g}/roles`, [{ id: role.id, position: top - 1 }]);
    } catch (e) {
        env.log(`[CUMPLE] posición del rol: ${e.message}`);
    }
    L.roles.birthday = role.id;
    env.saveLayout();
    env.log(`[CUMPLE] Rol Cumpleañero creado (${role.id}).`);
    return role.id;
}

/* -------------------------------------------------------------- tarjetas */

function giftLines(gifts) {
    if (!gifts?.store) return [];
    return [
        `**${gifts.coins} monedas** para la tienda`,
        `**-${gifts.discount}%** en un pedido durante ${gifts.discount_days} días`,
        gifts.extended?.length ? `**+${gifts.extra_days} días gratis** en ${gifts.extended.join(', ')}` : null,
        `Rol **Cumpleañero** todo el día`,
    ].filter(Boolean);
}

function counterText(count, recent = []) {
    if (!count) return `${COUNTER} todavía ninguna. ¡Sé la primera persona!`;
    return `${COUNTER} **${count}**${recent.length ? ` · ${recent.slice(0, 8).join(', ')}` : ''}`;
}

function publicCard(c) {
    const { text, sep, row, container } = ui();
    const lines = giftLines(c.gifts);
    return {
        flags: V2,
        components: [container(PINK, [
            text(`# ¡Feliz cumpleaños, <@${c.discord_id}>!\nHoy **${c.name}** está de cumpleaños. Pulsa **Felicitar** para firmar su tarjeta: esta noche le llega por correo con todas las firmas.`),
            lines.length ? sep() : null,
            lines.length ? text(`### Su set de regalo\n${lines.map((l) => `- ${l}`).join('\n')}`) : null,
            sep(),
            text(counterText(c.wish_count)),
            row(
                { type: 2, style: 3, label: 'Felicitar', custom_id: `bday:wish:${c.id}` },
                { type: 2, style: 5, label: 'Pon tu cumpleaños', url: `${env.PANEL}/settings/profile` },
            ),
        ])],
        allowed_mentions: { users: [c.discord_id] },
    };
}

function dmCard(c) {
    const { text, sep, row, container } = ui();
    const lines = giftLines(c.gifts);
    const body = lines.length
        ? `### Tu set de regalo\n${lines.map((l) => `- ${l}`).join('\n')}`
        : c.gifts && !c.gifts.store
            ? `Los regalos de la tienda van a la cuenta de ${env.BILLING} con tu mismo correo, y aún no tienes una. Hoy tienes el rol **Cumpleañero**.`
            : `${c.no_gift_reason || ''}\nHoy tienes el rol **Cumpleañero** y la felicitación de la comunidad.`;
    return {
        flags: V2,
        components: [container(PINK, [
            text(`# ¡Feliz cumpleaños, ${c.name}!\nDe parte de todo el equipo de Cinammon: que tengas un día increíble.`),
            sep(),
            text(body),
            text(c.public ? `-# Tu tarjeta está en <#${env.ctx().layout.channels.general}>: la gente puede firmarla hoy y esta noche te las mandamos por correo.` : '-# Tu cumpleaños no es público, así que no se anuncia en el servidor.'),
            row(
                { type: 2, style: 5, label: 'Abrir mi sorpresa', url: `${env.PANEL}/dashboard` },
                ...(c.gifts?.store ? [{ type: 2, style: 5, label: 'Usar mi descuento', url: `${env.BILLING}/store` }] : []),
            ),
        ])],
        allowed_mentions: { parse: [] },
    };
}

/* ---------------------------------------------------------- sincronización */

/** Lista de celebraciones de /api/bot/sync (`birthdays`). */
async function sync(list = []) {
    const S = state();
    const g = env.ctx().guild;
    const L = env.ctx().layout;
    const seen = new Set();

    for (const c of list) {
        const key = String(c.id);
        seen.add(key);
        const s = (S[key] ??= { user: c.discord_id });
        if (c.active && !s.announced) {
            s.announced = true; // aunque algo falle, no repetir anuncios cada minuto
            env.saveState();
            const roleId = await ensureRole().catch((e) => env.log(`[CUMPLE] rol: ${e.message}`));
            if (roleId) {
                await env.discord('PUT', `/guilds/${g}/members/${c.discord_id}/roles/${roleId}`, undefined, 'Cumpleaños')
                    .then(() => { s.role = roleId; })
                    .catch((e) => env.log(`[CUMPLE] dar rol a ${c.discord_id}: ${e.message}`));
            }
            if (c.public && L.channels.general) {
                try {
                    const m = await env.sendV2('POST', `/channels/${L.channels.general}/messages`, publicCard(c), { name: 'cumple', title: 'FELIZ CUMPLEAÑOS', subtitle: c.name, icon: 'cake' });
                    s.channel = L.channels.general;
                    s.message = m.id;
                } catch (e) {
                    env.log(`[CUMPLE] tarjeta de ${c.name}: ${e.message}`);
                }
            }
            try {
                const dm = await env.discord('POST', '/users/@me/channels', { recipient_id: c.discord_id });
                await env.discord('POST', `/channels/${dm.id}/messages`, dmCard(c));
            } catch {}
            env.saveState();
            env.log(`[CUMPLE] Felicitado ${c.name} (${c.discord_id}).`);
        }
        if (!c.active && s.announced && !s.closed) await close(key, s, c.wish_count);
    }

    // Celebraciones que ya no vienen en la lista: cerrar y olvidar
    for (const [key, s] of Object.entries(S)) {
        if (seen.has(key)) continue;
        if (s.announced && !s.closed) await close(key, s);
        if (s.closed) delete S[key];
    }
    env.saveState();
}

/** Fin del día: quita el rol y deja la tarjeta como recuerdo, sin botón. */
async function close(key, s, count) {
    s.closed = true;
    if (s.role) await env.discord('DELETE', `/guilds/${env.ctx().guild}/members/${s.user}/roles/${s.role}`, undefined, 'Fin del cumpleaños').catch(() => {});
    if (s.channel && s.message) {
        try {
            const m = await env.discord('GET', `/channels/${s.channel}/messages/${s.message}`);
            const comps = JSON.parse(JSON.stringify(m.components || []));
            for (const c of comps) {
                if (!c.components) continue;
                c.components = c.components.filter((x) => x.type !== 1);
                const n = count ?? s.count ?? 0;
                c.components.push(ui().text(`-# La fiesta ha terminado${n ? `: ${n} ${n === 1 ? 'firma' : 'firmas'} en su tarjeta` : ''}. ¡Gracias a todos!`));
            }
            await env.discord('PATCH', `/channels/${s.channel}/messages/${s.message}`, { components: comps });
        } catch (e) {
            env.log(`[CUMPLE] cerrar tarjeta ${key}: ${e.message}`);
        }
    }
    env.saveState();
}

/* ---------------------------------------------------------------- botón */

/** custom_id "bday:wish:<celebración>". Devuelve la respuesta de interacción. */
async function component(i) {
    const user = i.member?.user || i.user;
    const [, action, id] = i.data.custom_id.split(':');
    const eph = (content) => ({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
    if (action !== 'wish') return eph('Esta acción ya no está disponible.');
    const name = i.member?.nick || user.global_name || user.username;
    let res;
    try {
        res = await env.panel('POST', `/api/bot/birthdays/${id}/wish`, { discord_id: user.id, name });
    } catch (e) {
        if (e.status === 422) return eph('¡Es tu cumpleaños! No hace falta que te felicites: disfruta del día.');
        if (e.status === 410 || e.status === 404) return eph('La fiesta ya ha terminado, pero gracias por acordarte.');
        throw e;
    }
    const s = state()[id];
    if (s) {
        s.count = res.count;
        env.saveState();
    }
    // Actualiza el contador en la misma tarjeta (conservando el banner y el resto)
    const comps = JSON.parse(JSON.stringify(i.message?.components || []));
    for (const c of comps) {
        const t = (c.components || []).find((x) => x.type === 10 && String(x.content).startsWith(COUNTER));
        if (t) t.content = counterText(res.count, res.recent);
    }
    env.followup(i, { content: '¡Firmado! Tu felicitación le llega al panel y esta noche por correo.', flags: 64 });
    return { type: 7, data: { components: comps, allowed_mentions: { parse: [] } } };
}

/* -------------------------------------------------------------- /cumpleaños */

const definitions = () => [{
    name: 'cumpleaños',
    description: 'Tu cumpleaños en Cinammon: regalo, felicitación y quién cumple pronto',
    options: [
        {
            name: 'guardar', description: 'Guardar tu fecha de cumpleaños (solo día y mes)', type: 1, options: [
                { name: 'dia', description: 'Día', type: 4, required: true, min_value: 1, max_value: 31 },
                { name: 'mes', description: 'Mes', type: 4, required: true, choices: MONTHS.map((m, n) => ({ name: m, value: n + 1 })) },
                { name: 'publico', description: 'Que la comunidad te felicite en #general (por defecto, sí)', type: 5, required: false },
            ],
        },
        { name: 'ver', description: 'Tu cumpleaños, cuánto falta y tu set de regalo', type: 1 },
        { name: 'proximos', description: 'Quién cumple años pronto', type: 1 },
    ],
}];

function infoCard(b, note) {
    const { text, sep, row, container } = ui();
    const p = b.preview;
    const when = b.label
        ? b.days_until === 0 ? '**¡Hoy es tu cumpleaños! Felicidades.**' : `Tu cumpleaños es el **${b.label}**: faltan **${b.days_until}** ${b.days_until === 1 ? 'día' : 'días'}.`
        : 'Aún no has guardado tu cumpleaños. Usa `/cumpleaños guardar`.';
    return {
        flags: V2,
        components: [container(PINK, [
            text(`## Tu cumpleaños\n${when}${note ? `\n${note}` : ''}`),
            sep(),
            text(`### Tu set de regalo${p.vip ? ' (VIP)' : ''}\n- **${p.coins} monedas**\n- **-${p.discount}%** en un pedido durante ${p.discount_days} días\n- **+${p.extra_days} días gratis** en tus servicios de pago\n- Rol **Cumpleañero**, tu tarjeta en #general y las firmas por correo`),
            text(`-# ${b.label && !b.gift.eligible && b.gift.reason ? b.gift.reason : `El regalo llega si la fecha está guardada al menos ${b.min_days} días antes (cambiarla reinicia el plazo).`}${b.label ? ` Felicitación pública: ${b.public ? 'sí' : 'no'}.` : ''}`),
            row({ type: 2, style: 5, label: 'Cambiarlo en el panel', url: `${env.PANEL}/settings/profile` }),
        ])],
        allowed_mentions: { parse: [] },
    };
}

async function run(i) {
    const user = i.member?.user || i.user;
    const sub = i.data.options?.[0];
    const opt = (n) => sub?.options?.find((o) => o.name === n)?.value;
    const { text, container } = ui();
    const plain = (msg, color = PINK) => ({ flags: V2, components: [container(color, [text(msg)])], allowed_mentions: { parse: [] } });
    const notLinked = plain(`Primero vincula tu cuenta: en el panel, **Ajustes → Perfil → Código para el bot**, y aquí \`/vincular codigo:\`.`, 0xf59e0b);

    try {
        if (sub?.name === 'guardar') {
            const b = await env.panel('PUT', `/api/bot/discord/${user.id}/birthday`, { day: opt('dia'), month: opt('mes'), ...(opt('publico') === undefined ? {} : { public: opt('publico') }) });
            return infoCard(b, 'Guardado.');
        }
        if (sub?.name === 'ver') return infoCard(await env.panel('GET', `/api/bot/discord/${user.id}/birthday`));
    } catch (e) {
        if (e.status === 404) return notLinked;
        if (e.status === 422) return plain(e.body?.message || 'Esa fecha no existe.', 0xef4444);
        throw e;
    }

    const { upcoming } = await env.panel('GET', '/api/bot/birthdays/upcoming');
    return plain(`## Próximos cumpleaños\n${upcoming.length
        ? upcoming.map((u) => `${u.days === 0 ? '**¡HOY!**' : u.days === 1 ? '**Mañana**' : `En ${u.days} días`} · <@${u.discord_id}> · ${u.label}`).join('\n')
        : 'Nadie ha compartido su cumpleaños todavía.'}\n-# Añade el tuyo con \`/cumpleaños guardar\`.`);
}

module.exports = { init, sync, component, definitions, run, NAMES: new Set(['cumpleaños']) };
