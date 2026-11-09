import { useEffect, useState } from 'react';

/** Formatea milisegundos de uptime: "3d 4h", "2h 13m", "5m 12s", "40s". */
export function formatUptime(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

/**
 * Uptime que avanza cada segundo entre sondeos a Wings.
 * `ms` = uptime reportado por Wings (null/0 = apagado o sin datos → devuelve null).
 */
export function useLiveUptime(ms: number | null | undefined): number | null {
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [, tick] = useState(0);

    useEffect(() => {
        setStartedAt(ms && ms > 0 ? Date.now() - ms : null);
    }, [ms]);

    useEffect(() => {
        if (startedAt === null) return;
        const t = window.setInterval(() => tick((n) => n + 1), 1000);
        return () => window.clearInterval(t);
    }, [startedAt]);

    return startedAt === null ? null : Date.now() - startedAt;
}
