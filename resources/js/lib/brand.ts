// Logo de Cinammon según el subdominio: cinammon.panel, .demo, .store, .billing, .news, .status; cinammon.net usa cinammon-net.png
const SUBS = ['panel', 'demo', 'store', 'billing', 'news', 'status', 'admin', 'database', 'mail', 'nodo', 'wings'];

export function cinLogo(): string {
    if (typeof window === 'undefined') return '/logos/cinammon-net.png?v=6';
    const host = window.location.hostname;
    const parts = host.split('.');
    // Si estamos en el dominio principal cinammon.net o www -> cinammon-net.png
    if (parts.length <= 2 || parts[0] === 'www' || parts[0] === 'cinammon' || parts[0] === 'localhost') {
        return '/logos/cinammon-net.png?v=6';
    }
    const sub = parts[0];
    return SUBS.includes(sub) ? `/logos/cinammon-${sub}.png?v=6` : '/logos/cinammon-net.png?v=6';
}
