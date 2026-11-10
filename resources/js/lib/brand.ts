// Logo de Cinammon según el subdominio: cinammon.panel, .demo, .store, .billing; el dominio principal usa el original (.net).
const SUBS = ['panel', 'demo', 'store', 'billing'];

export function cinLogo(): string {
    if (typeof window === 'undefined') return '/favicon.ico';
    const sub = window.location.hostname.split('.')[0];
    return SUBS.includes(sub) ? `/logos/cinammon-${sub}.png` : '/favicon.ico';
}
