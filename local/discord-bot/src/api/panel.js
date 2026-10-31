const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const CONFIG_PATH = path.join(ROOT_DIR, 'bot-config.json');
const STATUS_PATH = path.join(ROOT_DIR, 'bot-status.json');

const DEFAULT_CANDIDATE_URLS = [
    process.env.PANEL_URL,
    'http://172.18.0.1:8000',
    'http://172.17.0.1:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'http://host.docker.internal:8000',
    'http://192.168.5.2:8000',
].filter(Boolean);

let discoveredPanelUrl = null;

const state = {
    connected: false,
    configured: false,
    tag: null,
    application_id: null,
    guilds: 0,
    ui_engine: 'Discord Components V2 (IS_COMPONENTS_V2)',
    panel_url: DEFAULT_CANDIDATE_URLS[0] || 'http://127.0.0.1:8000',
    billing_synced: true,
    mode: process.env.VPS_HOST ? 'VPS Production' : 'Hybrid Local/VPS',
    message: 'Iniciando motor Node.js de Cinammon Bot (Components V2)...',
    updated_at: new Date().toISOString(),
};

function log(msg) {
    const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${ts}] [CinammonBot] ${msg}`);
}

function readConfig() {
    let fileCfg = {};
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            fileCfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
    } catch (err) {
        log(`Aviso al leer bot-config.json: ${err.message}`);
    }
    return {
        token: (process.env.DISCORD_TOKEN || fileCfg.token || '').trim(),
        prefix: (process.env.DISCORD_PREFIX || fileCfg.prefix || '!').trim(),
        guild_id: (process.env.DISCORD_GUILD_ID || fileCfg.guild_id || '').trim(),
        panel_url: (process.env.PANEL_URL || fileCfg.panel_url || state.panel_url || 'http://127.0.0.1:8000').replace(/\/+$/, ''),
        bot_secret: (process.env.BOT_INTERNAL_SECRET || fileCfg.bot_secret || '').trim(),
        status_text: (process.env.DISCORD_STATUS_TEXT || fileCfg.status_text || 'Cinammon Network 🥽').trim(),
    };
}

function writeStatus(patch = {}) {
    Object.assign(state, patch, { updated_at: new Date().toISOString() });
    try {
        fs.writeFileSync(STATUS_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
    } catch {}
}

async function discoverPanelUrl(preferredUrl, force = false) {
    if (discoveredPanelUrl && !force) return discoveredPanelUrl;
    const candidates = Array.from(new Set([preferredUrl, ...DEFAULT_CANDIDATE_URLS].filter(Boolean)));
    for (const base of candidates) {
        try {
            const res = await fetch(`${base}/api/bot/overview`, {
                headers: {
                    Accept: 'application/json',
                    'X-Cinammon-Bot-Secret': readConfig().bot_secret,
                },
                signal: AbortSignal.timeout(3000),
            });
            if (res.ok) {
                state.panel_url = base;
                discoveredPanelUrl = base;
                return base;
            }
            if (res.status === 401) {
                log(`El panel en ${base} rechazó el secreto del bot (401).`);
            }
        } catch {}
    }
    return preferredUrl || 'http://127.0.0.1:8000';
}

async function callPanelApi(endpoint, method = 'GET', body = null) {
    const cfg = readConfig();
    const baseUrl = await discoverPanelUrl(cfg.panel_url);
    const opts = {
        method,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Cinammon-Bot-Secret': cfg.bot_secret,
        },
        signal: AbortSignal.timeout(8000),
    };
    if (body && method !== 'GET') {
        opts.body = JSON.stringify(body);
    }
    let response;
    try {
        response = await fetch(`${baseUrl}${endpoint}`, opts);
    } catch (err) {
        discoveredPanelUrl = null;
        log(`[API ERROR] ${method} ${endpoint} (en ${baseUrl}): ${err.message}`);
        throw err;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const errMsg = data.error || data.message || `HTTP ${response.status}`;
        log(`[API ERROR] ${method} ${endpoint} -> ${errMsg}`);
        throw new Error(errMsg);
    }
    return data;
}

module.exports = {
    CONFIG_PATH,
    STATUS_PATH,
    state,
    log,
    readConfig,
    writeStatus,
    discoverPanelUrl,
    callPanelApi,
};

