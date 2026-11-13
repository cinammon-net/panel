const test = require('node:test');
const assert = require('node:assert');
const sug = require('../src/sync/suggestions');

function harness() {
    const state = {};
    const calls = [];
    let n = 0;
    const ui = {
        text: (content) => ({ type: 10, content }),
        sep: () => ({ type: 14 }),
        row: (...c) => ({ type: 1, components: c }),
        container: (color, c) => ({ type: 17, accent_color: color, components: c.filter(Boolean) }),
    };
    sug.init({
        ui, st: () => state, saveState() {}, log() {},
        ctx: () => ({ guild: 'g', appId: 'bot', layout: { channels: { suggestions: 'forum' } } }),
        isStaff: (m) => !!m?.staff,
        editOriginal: async (i, body) => calls.push({ method: 'EDIT', body }),
        discord: async (method, route, body) => {
            calls.push({ method, route, body });
            if (route === '/channels/forum') return { available_tags: Object.values(sug.STATUS).map((s, k) => ({ id: `t${k}`, name: s.tag })) };
            if (method === 'POST' && route === '/channels/forum/threads') return { id: `th${++n}` };
            if (method === 'POST') return { id: `m${++n}` };
            if (route === '/guilds/g/threads/active') return { threads: [{ id: 'old', parent_id: 'forum', owner_id: 'u9', name: 'Egg de Terraria por favor' }, { id: 'pin', parent_id: 'forum', owner_id: 'bot', name: 'Lee esto' }] };
            return {};
        },
    });
    return { state, calls };
}

const click = (custom_id, userId, extra = {}) => ({ type: 3, data: { custom_id, ...extra.data }, member: { user: { id: userId }, ...extra.member } });
const respond = async () => {};

test('suggestions: votes, similar ideas, staff status and closing', async () => {
    const { state, calls } = harness();
    await sug.backfill('pin');
    assert.ok(state.suggestions.posts.old, 'existing posts get a card');
    assert.ok(!state.suggestions.posts.pin, 'pinned guide is skipped');

    await sug.onThreadCreate({ id: 'new', parent_id: 'other', newly_created: true, owner_id: 'u1', name: 'x' });
    assert.ok(!state.suggestions.posts.new, 'other channels ignored');

    // Formulario: crea publicación, la registra y detecta la parecida
    const modal = { type: 5, data: { custom_id: 'sug:modal', components: [
        { components: [{ custom_id: 'title', value: 'Añadir egg de Terraria' }] },
        { components: [{ custom_id: 'what', value: 'Un egg para servidores de Terraria con tModLoader' }] },
    ] }, member: { user: { id: 'u1', username: 'ana' } } };
    assert.equal(await sug.component(modal, respond), null);
    const [id, p] = Object.entries(state.suggestions.posts).find(([, x]) => x.author === 'u1');
    assert.deepEqual(p.similar, ['old']);
    assert.ok(calls.some((c) => c.method === 'PATCH' && c.route === `/channels/${id}` && c.body.applied_tags[0] === 't0'), 'Pendiente tag');

    // Votos: el autor no vota, se alterna y cambia de lado
    assert.match((await sug.component(click(`sug:up:${id}`, 'u1'), respond)).data.content, /propia idea/);
    await sug.component(click(`sug:up:${id}`, 'u2'), respond);
    await sug.component(click(`sug:up:${id}`, 'u3'), respond);
    await sug.component(click(`sug:down:${id}`, 'u3'), respond);
    assert.deepEqual([Object.keys(p.up), Object.keys(p.down)], [['u2'], ['u3']]);
    await sug.component(click(`sug:up:${id}`, 'u2'), respond);
    assert.equal(Object.keys(p.up).length, 0, 'second click removes the vote');
    await sug.component(click(`sug:up:${id}`, 'u4'), respond);
    await sug.component(click(`sug:up:${id}`, 'u5'), respond);
    assert.equal(sug.top(5)[0].id, id);

    // Estado: solo el equipo, con formulario de nota
    assert.match((await sug.component(click(`sug:status:${id}`, 'u2', { data: { values: ['accepted'] } }), respond)).data.content, /Solo el equipo/);
    const m = await sug.component(click(`sug:status:${id}`, 'staff', { data: { values: ['done'] }, member: { staff: true } }), respond);
    assert.equal(m.type, 9);
    await sug.component({ type: 5, data: { custom_id: m.data.custom_id, components: [{ components: [{ custom_id: 'note', value: 'Ya está en el panel' }] }] }, member: { user: { id: 'staff' }, staff: true } }, respond);
    assert.equal(p.status, 'done');
    assert.ok(calls.some((c) => c.method === 'PATCH' && c.route === `/channels/${id}` && c.body.locked === true && c.body.archived === true), 'closed');
    assert.ok(calls.some((c) => c.method === 'POST' && c.route === `/channels/${id}/messages` && /Implementada/.test(JSON.stringify(c.body.components || c.body.content || ''))), 'author notified');
    assert.match((await sug.component(click(`sug:up:${id}`, 'u6'), respond)).data.content, /cerrada/);
    assert.equal(sug.top(5).length, 0, 'closed ideas leave the ranking');
});
