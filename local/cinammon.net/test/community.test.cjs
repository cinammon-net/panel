const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const community = require('../src/sync/community');
const commands = require('../src/sync/commands');

function makeHarness() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cinammon-bot-test-'));
    const layoutPath = path.join(tmpDir, 'discord-layout.json');
    const st = {};
    const ctx = {
        guild: 'g-1',
        appId: 'app-1',
        layout: {
            guild_id: 'g-1',
            categories: { community: 'cat-comm', support: 'cat-supp', store: 'cat-store' },
            roles: { member: 'role-member', owner: 'role-owner', admin: 'role-admin' },
            channels: { welcome: 'ch-welcome', help: 'ch-help', tickets: 'ch-tickets' },
        },
    };
    fs.writeFileSync(layoutPath, JSON.stringify(ctx.layout, null, 2));

    const calls = [];
    let seq = 100;
    const ui = {
        text: (content) => ({ type: 10, content }),
        sep: () => ({ type: 14, divider: true, spacing: 1 }),
        row: (...components) => ({ type: 1, components }),
        linkBtn: (label, url) => ({ type: 2, style: 5, label, url }),
        container: (accent_color, components) => ({ type: 17, accent_color, components: components.filter(Boolean) }),
        cut: (s, n) => String(s || '').slice(0, n),
        ts: (iso) => `<t:1700000000:R>`,
    };

    const discord = async (method, route, body) => {
        calls.push({ method, route, body });
        if (method === 'GET' && route === '/guilds/g-1/roles') {
            return [{ id: 'role-member', name: 'Miembro' }];
        }
        if (method === 'GET' && route.startsWith('/channels/')) {
            const id = route.split('/')[2];
            if (Object.values(ctx.layout.channels).includes(id)) return { id };
            const err = new Error('404');
            err.status = 404;
            throw err;
        }
        seq++;
        return {
            id: `created-${seq}`,
            available_tags: body?.available_tags?.map((t, idx) => ({ id: `tag-${idx}`, name: t.name })) || [],
        };
    };

    community.init({
        discord,
        log: () => {},
        saveState: () => {},
        upsert: async (key, channel, payload) => calls.push({ method: 'UPSERT', key, channel, payload }),
        ui,
        layoutPath,
        st: () => st,
        ctx: () => ctx,
        accent: () => 0xfacc15,
        PANEL: 'https://panel.cinammon.net',
        BILLING: 'https://billing.cinammon.net',
        editOriginal: async (i, payload) => calls.push({ method: 'EDIT_ORIG', payload }),
        followup: async (i, payload) => calls.push({ method: 'FOLLOWUP', payload }),
    });

    return { ctx, st, calls, cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }) };
}

test('matchSupportTip identifies common hosting errors', () => {
    assert.equal(community.matchSupportTip('java.lang.UnsupportedClassVersionError: class file version 65.0')?.key, 'java_version');
    assert.equal(community.matchSupportTip('Container received Exit code 137 / Killed')?.key, 'oom');
    assert.equal(community.matchSupportTip('Error: listen EADDRINUSE: address already in use :::25565')?.key, 'port_bind');
    assert.equal(community.matchSupportTip('DisallowedIntent: Used disallowed intents')?.key, 'discord_token_intents');
    assert.equal(community.matchSupportTip('connect ECONNREFUSED 127.0.0.1:3306')?.key, 'db_conn');
    assert.equal(community.matchSupportTip('Hola, alguien jugando survival?'), null);
});

test('ensureCommunityChannels hides new channels from @everyone behind verification gate', async () => {
    const h = makeHarness();
    try {
        await community.ensureNotificationRoles();
        await community.ensureCommunityChannels();

        const createdChannels = h.calls.filter((c) => c.method === 'POST' && c.route === '/guilds/g-1/channels');
        assert.equal(createdChannels.length, 6);
        for (const call of createdChannels) {
            const everyone = call.body.permission_overwrites.find((o) => o.id === 'g-1');
            assert.ok(everyone, `missing @everyone overwrite for ${call.body.name}`);
            assert.equal(BigInt(everyone.deny) & (1n << 10n), 1n << 10n, `${call.body.name} must deny VIEW to @everyone`);
            const member = call.body.permission_overwrites.find((o) => o.id === 'role-member');
            assert.ok(member, `missing Miembro overwrite for ${call.body.name}`);
            assert.equal(BigInt(member.allow) & (1n << 10n), 1n << 10n);
        }

        const seededThreads = h.calls.filter((c) => c.method === 'POST' && c.route.endsWith('/threads'));
        assert.equal(seededThreads.length, 4);
    } finally {
        h.cleanup();
    }
});

test('syncReviews seeds initial reviews silently and posts only new ones', async () => {
    const h = makeHarness();
    h.ctx.layout.channels.reviews = 'ch-reviews';
    try {
        await community.syncReviews([{ id: 1, rating: 5, comment: 'Genial', author: 'Ana', at: '2026-11-10T10:00:00Z' }]);
        assert.equal(h.calls.filter((c) => c.method === 'POST' && c.route === '/channels/ch-reviews/messages').length, 0);

        await community.syncReviews([
            { id: 2, rating: 5, comment: 'Rápido', author: 'Luis', discord_id: '42', at: '2026-11-11T10:00:00Z' },
            { id: 1, rating: 5, comment: 'Genial', author: 'Ana', at: '2026-11-10T10:00:00Z' },
        ]);
        const posted = h.calls.filter((c) => c.method === 'POST' && c.route === '/channels/ch-reviews/messages');
        assert.equal(posted.length, 1);
        const raw = JSON.stringify(posted[0].body);
        assert.match(raw, /5\/5/);
        assert.match(raw, /Luis/);
    } finally {
        h.cleanup();
    }
});

test('giveaway lifecycle: create, join, finish picks winner', async () => {
    const h = makeHarness();
    h.ctx.layout.channels.giveaways = 'ch-giveaways';
    const responses = [];
    const respond = async (_i, body) => responses.push(body);
    try {
        const res = await community.createGiveaway({
            interaction: {
                channel_id: 'ch-giveaways',
                member: { permissions: '32', roles: [], user: { id: 'staff-1' } },
            },
            prize: '500 monedas',
            minutes: 10,
            winners: 1,
        });
        assert.ok(res.giveaway);
        const gid = res.giveaway.id;

        const handled = await community.handleInteraction({
            type: 3,
            data: { custom_id: `giveaway:join:${gid}` },
            member: { user: { id: 'user-7' }, roles: [] },
        }, respond);
        assert.equal(handled, true);
        assert.deepEqual(h.st.community.giveaways[gid].participants, ['user-7']);

        const finished = await community.finishGiveaway(gid);
        assert.equal(finished.ended, true);
        assert.deepEqual(finished.winnerIds, ['user-7']);
    } finally {
        h.cleanup();
    }
});

test('temporary voice rooms create on join and delete when empty', async () => {
    const h = makeHarness();
    h.ctx.layout.channels.voiceCreator = 'ch-voice-creator';
    try {
        await community.onVoiceStateUpdate({
            user_id: 'user-9',
            channel_id: 'ch-voice-creator',
            member: { user: { username: 'Nini', bot: false } },
        });
        const createdRoomId = Object.keys(h.st.community.tempVoice)[0];
        assert.ok(createdRoomId);
        assert.ok(h.calls.some((c) => c.method === 'PATCH' && c.route === '/guilds/g-1/members/user-9' && c.body.channel_id === createdRoomId));

        await community.onVoiceStateUpdate({
            user_id: 'user-9',
            channel_id: null,
            member: { user: { username: 'Nini', bot: false } },
        });
        assert.ok(h.calls.some((c) => c.method === 'DELETE' && c.route === `/channels/${createdRoomId}`));
        assert.equal(h.st.community.tempVoice[createdRoomId], undefined);
    } finally {
        h.cleanup();
    }
});

test('slash command definitions include /sorteo', () => {
    const defs = commands.definitions([{ key: 'minecraft', title: 'Minecraft' }]);
    const sorteo = defs.find((d) => d.name === 'sorteo');
    assert.ok(sorteo);
    assert.deepEqual(sorteo.options.map((o) => o.name), ['premio', 'minutos', 'ganadores']);
});
