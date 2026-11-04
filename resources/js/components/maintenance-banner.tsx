import { usePage } from '@inertiajs/react';
import { CalendarClock, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface MaintenanceInfo {
    id: number;
    title: string;
    message: string | null;
    starts_at: string;
    ends_at: string | null;
    scope: string[];
    block_access: boolean;
    active: boolean;
}

const SCOPE_LABELS: Record<string, string> = { panel: 'Panel', store: 'Tienda', servers: 'Servidores de juego' };

export function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtCountdown(ms: number) {
    const total = Math.max(0, Math.floor(ms / 60000));
    const d = Math.floor(total / 1440);
    const h = Math.floor((total % 1440) / 60);
    const m = total % 60;
    if (d > 0) return `${d} d ${h} h`;
    if (h > 0) return `${h} h ${m} min`;
    return `${m} min`;
}

const DISMISS_KEY = 'maintenance-dismissed';

/**
 * Aviso global de mantenimiento (panel, login y páginas de servidor):
 * ámbar mientras está programado (se puede ocultar) y rojo mientras dura (fijo).
 */
export default function MaintenanceBanner() {
    const { maintenance } = usePage<{ maintenance?: MaintenanceInfo | null }>().props;
    const [now, setNow] = useState(() => Date.now());
    const [dismissed, setDismissed] = useState<number | null>(() => {
        try {
            return Number(localStorage.getItem(DISMISS_KEY)) || null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    if (!maintenance) return null;

    const start = new Date(maintenance.starts_at).getTime();
    const end = maintenance.ends_at ? new Date(maintenance.ends_at).getTime() : null;
    if (end !== null && end <= now) return null;

    const active = start <= now;
    if (!active && dismissed === maintenance.id) return null;

    const scope = maintenance.scope.map((s) => SCOPE_LABELS[s] ?? s).join(' · ');

    const dismiss = () => {
        setDismissed(maintenance.id);
        try {
            localStorage.setItem(DISMISS_KEY, String(maintenance.id));
        } catch {
            /* sin almacenamiento: solo se oculta en esta vista */
        }
    };

    return (
        <div
            role="status"
            className={`flex items-start justify-between gap-3 border-b px-4 py-2.5 font-[Orbitron] text-xs ${
                active
                    ? 'border-red-500/50 bg-gradient-to-r from-red-950/90 via-rose-950/90 to-red-950/90 text-red-100'
                    : 'border-amber-500/40 bg-gradient-to-r from-amber-950/80 via-orange-950/80 to-amber-950/80 text-amber-100'
            }`}
        >
            <div className="flex min-w-0 items-start gap-2.5">
                {active ? (
                    <Wrench className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-red-300" />
                ) : (
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                )}
                <div className="min-w-0 space-y-0.5">
                    <p>
                        <strong className="tracking-wide">{active ? 'En mantenimiento' : 'Mantenimiento programado'}:</strong>{' '}
                        {maintenance.title}
                        <span className="opacity-80">
                            {' — '}
                            {active
                                ? end
                                    ? `hasta ${fmtDate(maintenance.ends_at!)} (quedan ${fmtCountdown(end - now)})`
                                    : 'sin hora de fin prevista'
                                : `empieza ${fmtDate(maintenance.starts_at)} (en ${fmtCountdown(start - now)})${end ? `, fin previsto ${fmtDate(maintenance.ends_at!)}` : ''}`}
                        </span>
                    </p>
                    {(maintenance.message || scope) && (
                        <p className="font-sans text-[11px] opacity-80">
                            {scope && <span className="mr-2 font-semibold">Afecta a: {scope}.</span>}
                            {maintenance.message}
                        </p>
                    )}
                </div>
            </div>
            {!active && (
                <button onClick={dismiss} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Ocultar aviso">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
