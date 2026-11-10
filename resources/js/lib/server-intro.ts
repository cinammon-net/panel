/**
 * Pantalla de entrada al abrir un servidor: icono del egg, nombre del servidor y del egg.
 * Vive fuera de React (DOM propio) para seguir visible mientras Inertia cambia de página.
 * Sale al entrar en un servidor desde fuera (lista, dashboard...), no al moverse entre sus secciones.
 */
import { router } from '@inertiajs/react';

export type ServerIntroInfo = {
    id: number;
    name: string;
    egg?: string | null;
    egg_icon?: string | null;
    category?: string | null;
    banner?: string | null;
};

const MIN_MS = 1100; // tiempo mínimo visible para que se lea
const STORE_KEY = 'cin-server-intro';
const SERVER_URL = /^\/servers\/(\d+)\//;

const cache = new Map<number, ServerIntroInfo>();
try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}') as Record<string, ServerIntroInfo>;
    Object.values(saved).forEach((s) => s && cache.set(s.id, s));
} catch {
    /* sin almacenamiento */
}

/** Guarda los datos de un servidor para poder mostrarlos antes de que cargue su página. */
export function rememberServer(info: ServerIntroInfo | null | undefined) {
    if (!info || !info.id) return;
    cache.set(info.id, { ...cache.get(info.id), ...info });
    try {
        sessionStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(cache)));
    } catch {
        /* sin almacenamiento */
    }
}

const serverIdOf = (path: string) => {
    const m = path.match(SERVER_URL);
    return m ? Number(m[1]) : null;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

let el: HTMLDivElement | null = null;
let shownAt = 0;
let hideTimer = 0;
let current: number | null = null;

function styles() {
    if (document.getElementById('cin-si-style')) return;
    const st = document.createElement('style');
    st.id = 'cin-si-style';
    st.textContent = `
#cin-si{position:fixed;inset:0;z-index:9998;display:grid;place-items:center;overflow:hidden;background:#05070d;
  --si-a:var(--color-pink-500,#ec4899);--si-b:var(--color-cyan-400,#22d3ee);opacity:0;transition:opacity .28s ease;font-family:Orbitron,ui-sans-serif,system-ui,sans-serif}
#cin-si.on{opacity:1}
#cin-si .si-bg{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(28px) saturate(1.1);opacity:.28;transform:scale(1.05)}
#cin-si .si-glow{position:absolute;inset:0;background:radial-gradient(520px 320px at 50% 42%,color-mix(in oklab,var(--si-a) 22%,transparent),transparent 70%),
  radial-gradient(700px 420px at 50% 120%,color-mix(in oklab,var(--si-b) 16%,transparent),transparent 70%)}
#cin-si .si-grid{position:absolute;inset:0;opacity:.35;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
  background-size:44px 44px;mask:radial-gradient(circle at 50% 45%,#000 0,transparent 65%)}
#cin-si .si-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:18px;padding:0 24px;text-align:center;transform:translateY(10px) scale(.97);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
#cin-si.on .si-card{transform:none}
#cin-si .si-icon{position:relative;width:104px;height:104px;border-radius:26px;padding:3px;background:conic-gradient(from var(--si-ang,0deg),var(--si-a),var(--si-b),transparent 70%,var(--si-a));animation:cin-si-ring 2.6s linear infinite;
  box-shadow:0 0 40px color-mix(in oklab,var(--si-a) 35%,transparent)}
#cin-si .si-icon-in{width:100%;height:100%;border-radius:23px;background:#0b0f19;display:grid;place-items:center;overflow:hidden}
#cin-si .si-icon img{width:100%;height:100%;object-fit:cover}
#cin-si .si-mono{font-size:40px;font-weight:800;background:linear-gradient(135deg,var(--si-a),var(--si-b));-webkit-background-clip:text;background-clip:text;color:transparent}
#cin-si .si-kicker{font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.35em;text-transform:uppercase;color:color-mix(in oklab,var(--si-b) 80%,#fff)}
#cin-si .si-name{max-width:min(80vw,640px);font-size:clamp(22px,4.2vw,36px);font-weight:800;letter-spacing:.06em;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  text-shadow:0 0 24px color-mix(in oklab,var(--si-a) 45%,transparent)}
#cin-si .si-egg{display:inline-flex;align-items:center;gap:8px;max-width:min(80vw,520px);padding:5px 14px;border-radius:999px;border:1px solid color-mix(in oklab,var(--si-b) 45%,transparent);
  background:color-mix(in oklab,var(--si-b) 10%,transparent);color:color-mix(in oklab,var(--si-b) 85%,#fff);font:600 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#cin-si .si-bar{width:min(260px,70vw);height:3px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden}
#cin-si .si-bar i{display:block;height:100%;width:40%;border-radius:9px;background:linear-gradient(90deg,var(--si-a),var(--si-b));animation:cin-si-load 1.1s ease-in-out infinite}
@property --si-ang{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes cin-si-ring{to{--si-ang:360deg}}
@keyframes cin-si-load{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}
@media (prefers-reduced-motion:reduce){#cin-si .si-icon,#cin-si .si-bar i{animation:none}#cin-si,#cin-si .si-card{transition:none}}
`;
    document.head.appendChild(st);
}

function render(info: ServerIntroInfo | undefined, id: number) {
    if (!el) return;
    const name = info?.name || `Servidor #${id}`;
    const egg = info?.egg && info.egg !== '–' ? info.egg : null;
    const mono = esc((egg || name).trim().charAt(0).toUpperCase() || 'C');
    const icon = info?.egg_icon
        ? `<img src="${esc(info.egg_icon)}" alt="">`
        : `<span class="si-mono">${mono}</span>`;
    const banner = info?.banner && !info.banner.startsWith('data:') ? `<div class="si-bg" style="background-image:url('${esc(info.banner)}')"></div>` : '';
    el.innerHTML = `${banner}<div class="si-glow"></div><div class="si-grid"></div>
<div class="si-card">
  <div class="si-icon"><div class="si-icon-in">${icon}</div></div>
  <div class="si-kicker">Entrando al servidor</div>
  <div class="si-name">${esc(name)}</div>
  ${egg ? `<div class="si-egg">${esc(egg)}</div>` : ''}
  <div class="si-bar"><i></i></div>
</div>`;
    // Si el icono del egg no carga, se usa la inicial.
    const img = el.querySelector<HTMLImageElement>('.si-icon img');
    img?.addEventListener('error', () => {
        const span = document.createElement('span');
        span.className = 'si-mono';
        span.textContent = (egg || name).trim().charAt(0).toUpperCase() || 'C';
        img.replaceWith(span);
    });
}

function show(id: number) {
    styles();
    window.clearTimeout(hideTimer);
    if (!el) {
        el = document.createElement('div');
        el.id = 'cin-si';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('data-season-ui', '');
        document.body.appendChild(el);
    }
    current = id;
    render(cache.get(id), id);
    shownAt = performance.now();
    requestAnimationFrame(() => el?.classList.add('on'));
}

function hide() {
    if (!el) return;
    const wait = Math.max(0, MIN_MS - (performance.now() - shownAt));
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
        if (!el) return;
        el.classList.remove('on');
        const node = el;
        el = null;
        current = null;
        window.setTimeout(() => node.remove(), 320);
    }, wait);
}

let started = false;

/** Engancha el loader a la navegación de Inertia (una sola vez). */
export function initServerIntro() {
    if (started || typeof window === 'undefined') return;
    started = true;

    router.on('start', (event) => {
        const url = event.detail.visit.url;
        if (event.detail.visit.method !== 'get' || event.detail.visit.prefetch) return;
        const next = serverIdOf(url.pathname);
        if (next === null || next === serverIdOf(window.location.pathname)) return;
        show(next);
    });

    // Los datos reales llegan con la página: se guardan y, si el loader sigue, se completa.
    router.on('navigate', (event) => {
        const info = (event.detail.page.props as { currentServer?: ServerIntroInfo | null }).currentServer;
        if (info?.id) {
            rememberServer(info);
            if (el && current === info.id) render(cache.get(info.id), info.id);
        }
    });

    router.on('finish', () => {
        if (el) hide();
    });
}
