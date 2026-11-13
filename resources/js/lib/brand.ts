// Logo de Cinammon según el subdominio: cinammon.panel, .demo, .store, .billing, .news, .status; fallback a cinammon-panel.
const SUBS = ['panel', 'demo', 'store', 'billing', 'news', 'status', 'admin', 'database', 'mail', 'nodo', 'wings'];

export function cinLogo(): string {
    if (typeof window === 'undefined') return '/logos/cinammon-panel.png?v=3';
    const sub = window.location.hostname.split('.')[0];
    return SUBS.includes(sub) ? `/logos/cinammon-${sub}.png?v=3` : '/logos/cinammon-panel.png?v=3';
}
