/**
 * Comprar desde Discord: /comprar y el botón "Comprar desde Discord" de #planes.
 *
 * Categoría → plan → cada cuánto pagar → billete (nombre + precio con descuento) → reservar.
 * El pedido y la factura los crea la tienda (la misma lógica que la web) a través del panel:
 * POST /api/bot/discord/{id}/store/quote y /store/order. El pago se hace en la web (checkout).
 *
 * custom_id con prefijo "buy:" y sin estado en memoria: todo lo necesario va en el propio id.
 */
let api = null;
const EPH = 64;
const V2 = 1 << 15;

function init(a) {
    api = a;
}

const definition = {
    name: 'comprar',
    description: 'Comprar un servidor o un rango sin salir de Discord',
    options: [{ name: 'plan', description: 'Busca el plan por nombre o juego (opcional)', type: 3, required: false, autocomplete: true }],
};

/* ---------------------------------------------------------------- helpers */

const ui = (k) => (...a) => api.ui[k](...a);
const [text, sep, row, linkBtn, container, cut, eur] = ['text', 'sep', 'row', 'linkBtn', 'container', 'cut', 'eur'].map(ui);
const btn = (label, custom_id, style = 2) => ({ type: 2, style, label, custom_id });
const card = (color, ...components) => ({ flags: V2, components: [container(color ?? api.accent(), components)], allowed_mentions: { parse: [] } });
const fail = (msg) => card(0xef4444, text(msg));
const userOf = (i) => i.member?.user || i.user;
const me = (i, route, body) => api.panel('POST', `/api/bot/discord/${userOf(i).id}${route}`, body);
const gb = (mb) => (mb >= 1024 ? `${+(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

const CYCLE_TEXT = { daily: 'cada día', weekly: 'cada semana', monthly: 'cada mes', quarterly: 'cada 3 meses', semiannual: 'cada 6 meses', yearly: 'cada año' };

async function callback(i, body) {
    await fetch(`https://discord.com/api/v10/interactions/${i.id}/${i.token}/callback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => {});
}

async function edit(i, payload) {
    const res = await fetch(`https://discord.com/api/v10/webhooks/${i.application_id}/${i.token}/messages/@original`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }).catch(() => null);
    if (res && !res.ok) api.log(`[SHOP] respuesta rechazada: ${res.status} ${(await res.text()).slice(0, 300)}`);
}

/** Catálogo público (sin los planes de monedas), cacheado 5 min. */
let catalog = null, catalogAt = 0;
async function categories() {
    if (!catalog || Date.now() - catalogAt > 5 * 60_000) {
        const { categories: cats } = await api.billing('/api/plans');
        catalog = cats
            .map((c) => ({ ...c, plans: c.plans.filter((p) => p.coin_cost === null || p.coin_cost === undefined) }))
            .filter((c) => c.plans.length);
        catalogAt = Date.now();
    }
    return catalog;
}
const findPlan = async (id) => {
    for (const c of await categories()) {
        const p = c.plans.find((x) => String(x.id) === String(id));
        if (p) return { plan: p, cat: c };
    }
    return null;
};

/** Nombre al azar para el servidor (se puede cambiar). */
const NAMES = {
    a: ['mina', 'aldea', 'isla', 'cueva', 'torre', 'base', 'nube', 'luna', 'faro', 'bosque', 'nexo', 'forja'],
    b: ['norte', 'dorada', 'roja', 'secreta', 'brava', 'nova', 'canela', 'alta', 'viva', 'zen'],
};
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const randomName = () => `${pick(NAMES.a)}-${pick(NAMES.b)}-${Math.floor(10 + Math.random() * 90)}`;
const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60);

function storeError(e) {
    const code = e.body?.error;
    if (e.status === 404 && /not_linked/.test(e.message)) return linkView('Primero vincula tu cuenta');
    if (code === 'no_store_account') return fail(`Tu cuenta todavía no está activa en la tienda. Entra una vez en ${api.BILLING} con tu cuenta del panel y vuelve a probar.`);
    if (code === 'plan_not_found') return fail('Ese plan ya no existe. Vuelve a empezar con `/comprar`.');
    if (e.status === 423 || e.status === 422) return fail(cut(e.body?.message || 'No se pudo completar.', 400));
    if (e.status === 429) return fail('Vas muy rápido. Espera un minuto y vuelve a probar.');
    return fail('La tienda no responde ahora mismo. Prueba en un rato o compra desde la web.');
}

/* ---------------------------------------------------------------- vistas */

function linkView(title = 'Vincular tu cuenta') {
    return card(null,
        text(`## ${title}\nPara comprar desde Discord, el bot tiene que saber cuál es tu cuenta. Solo se hace una vez:\n**1.** Entra en el panel → **Ajustes → Perfil → Código para el bot**.\n**2.** Escribe aquí \`/vincular codigo:\` con ese código.\n**3.** Listo: pulsa otra vez **Comprar desde Discord** o escribe \`/comprar\`.`),
        row(linkBtn('Obtener el código', `${api.PANEL}/settings/profile`), linkBtn('Comprar en la web', `${api.BILLING}/store`)),
    );
}

async function categoriesView() {
    const cats = await categories();
    return card(null,
        text('## ¿Qué quieres comprar?\nElige el tipo de servicio. Luego eliges el plan, cada cuánto pagar y el nombre.'),
        { type: 1, components: [{
            type: 3, custom_id: 'buy:cat', placeholder: 'Elige qué quieres',
            options: cats.slice(0, 25).map((c) => ({
                label: cut(c.title, 100),
                value: c.key,
                description: cut(`${c.plans.length} planes · desde ${eur(Math.min(...c.plans.map((p) => Number(p.price))))}/mes`, 100),
            })),
        }] },
        text('-# Pagar varios meses de una vez sale más barato al mes. Las ofertas se aplican solas.'),
        row(btn('Cancelar', 'buy:x')),
    );
}

const PAGE = 25;
async function plansView(key, page = 0) {
    const cat = (await categories()).find((c) => c.key === key);
    if (!cat) return categoriesView();
    const pages = Math.ceil(cat.plans.length / PAGE);
    page = Math.max(0, Math.min(page, pages - 1));
    const list = cat.plans.slice(page * PAGE, page * PAGE + PAGE);
    const isRank = key === 'ranks';
    return card(null,
        text(`## ${cat.title}${cat.tagline ? `\n-# ${cut(cat.tagline, 200)}` : ''}\nElige el plan.${pages > 1 ? ` Página ${page + 1} de ${pages}.` : ''}`),
        { type: 1, components: [{
            type: 3, custom_id: 'buy:plan', placeholder: isRank ? 'Elige el rango' : 'Elige el plan',
            options: list.map((p) => ({
                label: cut(`${p.name} · ${eur(p.price)}/mes`, 100),
                value: String(p.id),
                description: cut(isRank ? (p.features || []).slice(0, 2).join(' · ') : `${gb(p.ram_mb)} RAM · ${p.cpu_pct} % CPU · ${p.storage_gb} GB disco`, 100) || undefined,
            })),
        }] },
        row(
            btn('Volver', 'buy:start'),
            ...(pages > 1 ? [
                { ...btn('Anterior', `buy:pg:${key}:${page - 1}`), disabled: page === 0 },
                { ...btn('Siguiente', `buy:pg:${key}:${page + 1}`), disabled: page >= pages - 1 },
            ] : []),
        ),
    );
}

async function cycleView(i, planId) {
    const q = await me(i, '/store/quote', { plan_id: Number(planId) });
    const p = q.plan;
    const found = await findPlan(planId);
    const specs = p.rank ? cut((found?.plan.features || []).slice(0, 3).join(' · '), 200) : `${gb(p.ram_mb)} RAM · ${p.cpu_pct} % CPU · ${p.storage_gb} GB disco`;
    const monthly = q.cycles.find((c) => c.key === 'monthly');
    return card(null,
        text(`## ${found ? `${found.cat.title} · ` : ''}${p.name}\n-# ${specs}`),
        q.store_blocked ? text('**La tienda está en mantenimiento.** Puedes mirar precios, pero no se pueden hacer pedidos hasta que termine.') : null,
        sep(),
        text('**¿Cada cuánto quieres pagar?**'),
        { type: 1, components: [{
            type: 3, custom_id: `buy:cyc:${p.id}`, placeholder: 'Elige cada cuánto pagar',
            options: q.cycles.map((c) => {
                const perMonth = c.price / c.months;
                const save = monthly && c.months > 1 ? Math.round((1 - perMonth / monthly.price) * 100) : 0;
                return {
                    label: cut(`${c.label} · ${eur(c.price)}`, 100),
                    value: c.key,
                    description: cut([
                        c.months > 1 ? `≈ ${eur(perMonth)}/mes` : c.key === 'monthly' ? 'se renueva cada mes' : `se renueva ${CYCLE_TEXT[c.key] || ''}`,
                        save >= 3 ? `ahorras ${save} %` : null,
                        c.discount ? `-${c.discount} % ${c.reason || ''}`.trim() : null,
                    ].filter(Boolean).join(' · '), 100),
                };
            }),
        }] },
        row(btn('Volver', found ? `buy:pg:${found.cat.key}:0` : 'buy:start'), btn('Cancelar', 'buy:x')),
    );
}

async function ticketView(i, planId, cycle, name) {
    const q = await me(i, '/store/quote', { plan_id: Number(planId) });
    const c = q.cycles.find((x) => x.key === cycle);
    if (!c) return cycleView(i, planId);
    const p = q.plan;
    name = p.rank ? null : cleanName(name) || randomName();
    const perMonth = c.months > 1 ? ` (≈ ${eur(c.price / c.months)}/mes)` : '';
    const total = c.discount ? `~~${eur(c.base)}~~ **${eur(c.price)}**` : `**${eur(c.price)}**`;
    const lines = [
        `**Plan:** ${p.name}${p.rank ? ' (rango VIP)' : ` · ${gb(p.ram_mb)} RAM`}`,
        name ? `**Nombre del servidor:** \`${name}\`` : null,
        `**Pagas:** ${CYCLE_TEXT[cycle] || c.label.toLowerCase()}`,
        `**Total:** ${total}${perMonth}`,
    ].filter(Boolean);
    const go = `buy:go:${p.id}:${cycle}${name ? `:${name}` : ''}`;
    return card(0xec4899,
        text('## Tu billete'),
        text(lines.join('\n')),
        c.discount ? text(`-# Descuento ${c.reason || ''} -${c.discount} % aplicado. Solo se aplica el mayor descuento, no se suman.`) : null,
        sep(),
        text(p.rank
            ? '-# Al pulsar **Reservar** se crea tu factura. Pagas en la web y el rango se activa en el panel y en Discord.'
            : '-# Al pulsar **Reservar** se crea tu factura. Pagas en la web y, cuando se confirma el pago, el servidor se crea solo. El nombre lo puedes cambiar después.'),
        row(
            { ...btn('Reservar billete', go.slice(0, 100), 3), disabled: !!q.store_blocked },
            ...(name ? [btn('Cambiar nombre', `buy:name:${p.id}:${cycle}`)] : []),
            btn('Cambiar plazo', `buy:pl:${p.id}`),
            btn('Cancelar', 'buy:x'),
        ),
    );
}

async function placeOrder(i, planId, cycle, name) {
    const r = await me(i, '/store/order', { plan_id: Number(planId), cycle, name: name || undefined });
    const isRank = /^Rango /.test(r.name) && !name;
    return card(0x23a55a,
        text(`## Billete reservado\nFactura **${r.number}** · **${eur(r.amount)}**`),
        text(isRank
            ? 'Pulsa **Pagar ahora**: se abre tu factura en la web y eliges cómo pagar. Cuando se confirme, tu rango se activa solo.'
            : `Pulsa **Pagar ahora**: se abre tu factura en la web y eliges cómo pagar. Cuando se confirme, tu servidor **${cut(r.name, 60)}** se crea solo y aparece en el panel.`),
        text('-# También te ha llegado la factura por correo. Tienes 7 días para pagarla.'),
        row(linkBtn('Pagar ahora', r.checkout_url), btn('Mis facturas', 'c:invoices')),
    );
}

/* ---------------------------------------------------------------- eventos */

async function autocomplete(i) {
    const q = String(i.data.options?.find((o) => o.name === 'plan')?.value || '').toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);
    const all = (await categories()).flatMap((c) => c.plans.map((p) => ({ p, c, hay: `${p.name} ${c.title} ${c.key} ${p.slug || ''}`.toLowerCase() })));
    const hits = all.filter((x) => words.every((w) => x.hay.includes(w)));
    return (words.length ? hits : all.filter((x) => x.p.popular).concat(all)).slice(0, 25).map(({ p, c }) => ({
        name: cut(`${p.name} · ${c.title} · ${eur(p.price)}/mes${p.ram_mb && c.key !== 'ranks' ? ` · ${gb(p.ram_mb)} RAM` : ''}`, 100),
        value: String(p.id),
    }));
}

/** /comprar [plan] */
async function slash(i) {
    await callback(i, { type: 5, data: { flags: EPH } });
    const planId = i.data.options?.find((o) => o.name === 'plan')?.value;
    try {
        if (planId && /^\d+$/.test(String(planId))) {
            await edit(i, await cycleView(i, planId));
        } else if (planId) {
            // Escribió texto sin elegir de la lista: busca el primero que encaje
            const words = String(planId).toLowerCase().split(/\s+/).filter(Boolean);
            const hit = (await categories()).flatMap((c) => c.plans.map((p) => ({ p, hay: `${p.name} ${c.title} ${c.key}`.toLowerCase() })))
                .find((x) => words.every((w) => x.hay.includes(w)));
            await edit(i, hit ? await cycleView(i, hit.p.id) : await categoriesView());
        } else {
            await edit(i, await categoriesView());
        }
    } catch (e) {
        api.log(`[SHOP] /comprar: ${e.message}`);
        await edit(i, storeError(e));
    }
}

/** Botones y menús "buy:..." (y el formulario del nombre). */
async function component(i) {
    const id = i.data.custom_id;
    const parts = id.split(':');
    const kind = parts[1];

    // El nombre se pide con un formulario (tiene que abrirse al momento)
    if (i.type === 3 && kind === 'name') {
        return callback(i, { type: 9, data: {
            custom_id: `buy:m:${parts[2]}:${parts[3]}`,
            title: 'Nombre de tu servidor',
            components: [row({ type: 4, custom_id: 'name', label: 'Nombre (lo puedes cambiar después)', style: 1, min_length: 2, max_length: 40, required: true, placeholder: 'mi-servidor' })],
        } });
    }

    // Desde el mensaje público de #planes se abre uno nuevo que solo ve esa persona;
    // dentro del flujo (mensaje efímero) se edita el mismo.
    const inFlow = !!i.message && (i.message.flags & EPH) === EPH;
    await callback(i, inFlow ? { type: 6 } : { type: 5, data: { flags: EPH } });

    try {
        let payload;
        if (i.type === 5 && kind === 'm') {
            const name = (i.data.components || []).flatMap((r) => r.components || [r.component]).find((c) => c?.custom_id === 'name')?.value;
            payload = await ticketView(i, parts[2], parts[3], name);
        } else {
            switch (kind) {
                case 'start': payload = await categoriesView(); break;
                case 'link': payload = linkView(); break;
                case 'cat': payload = await plansView(i.data.values?.[0]); break;
                case 'pg': payload = await plansView(parts[2], Number(parts[3]) || 0); break;
                case 'plan': payload = await cycleView(i, i.data.values?.[0]); break;
                case 'pl': payload = await cycleView(i, parts[2]); break;
                case 'cyc': payload = await ticketView(i, parts[2], i.data.values?.[0]); break;
                case 'go': payload = await placeOrder(i, parts[2], parts[3], parts.slice(4).join(':')); break;
                case 'x': payload = card(0x71717a, text('Compra cancelada. Cuando quieras, `/comprar`.')); break;
                default: payload = fail('Esta acción ya no está disponible. Escribe `/comprar`.');
            }
        }
        await edit(i, payload);
    } catch (e) {
        api.log(`[SHOP] ${id}: ${e.message}`);
        await edit(i, storeError(e));
    }
}

/** Mensaje fijo de #planes: cómo comprar, explicado fácil. */
function post(methods, tutorialUrl) {
    const pay = methods?.length
        ? methods.map((m) => m.label.toLowerCase().replace(/^bizum$/, 'Bizum')).join(', ').replace(/, ([^,]*)$/, ' o $1')
        : 'los métodos de la tienda';
    return { flags: V2, allowed_mentions: { parse: [] }, components: [container(api.accent(), [
        text('# Cómo comprar\nComprar es fácil y se hace en un minuto. Puedes hacerlo **desde aquí, en Discord**, o desde la web: es lo mismo.'),
        sep(),
        text(`### 3 pasos\n**1. Elige** qué quieres: un servidor de Minecraft, otro juego, un bot, una web o un rango VIP.\n**2. Ponle nombre** a tu servidor. Lo puedes cambiar después.\n**3. Paga** con ${pay}. Cuando se confirma el pago, tu servidor se crea solo y te aparece en el panel.`),
        sep(),
        text('### Para comprar desde Discord\nPulsa **Comprar desde Discord** o escribe `/comprar`. Lo que eliges solo lo ves tú.\nLa primera vez tienes que vincular tu cuenta con `/vincular` (te explicamos cómo en **Vincular mi cuenta**).'),
        { type: 12, items: [{ media: { url: `${api.BILLING}/discord/tutorial-comprar.mp4?v=1` }, description: 'Vídeo: cómo comprar desde Discord en 1 minuto' }] },
        text('-# Si pagas varios meses de una vez, te sale más barato al mes. Las ofertas y tu descuento VIP se aplican solos (se usa el mayor, no se suman).'),
        sep(2),
        row(btn('Comprar desde Discord', 'buy:start', 1), ...(tutorialUrl ? [linkBtn('Ver el tutorial', tutorialUrl)] : []), linkBtn('Ir a la tienda web', `${api.BILLING}/store`), btn('Vincular mi cuenta', 'buy:link')),
    ])] };
}

module.exports = { init, definition, autocomplete, slash, component, post };
