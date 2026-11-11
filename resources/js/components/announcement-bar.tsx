import { usePage } from '@inertiajs/react';
import { CalendarDays, Check, Clock, Copy, Gift, Megaphone, Sparkles, Tag, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type AnnouncementType = 'offer' | 'new' | 'event' | 'news';
export type AnnouncementPlace = 'web' | 'panel' | 'store';

export interface AnnouncementInfo {
    id: number;
    type: AnnouncementType;
    title: string;
    message: string | null;
    highlight: string | null;
    coupon_code: string | null;
    cta_label: string | null;
    cta_url: string | null;
    places: AnnouncementPlace[];
    popup: boolean;
    starts_at: string;
    ends_at: string | null;
}

export const TYPE_STYLES: Record<AnnouncementType, { label: string; icon: typeof Tag; bar: string; chip: string }> = {
    offer: {
        label: 'Oferta',
        icon: Tag,
        bar: 'border-pink-500/60 from-pink-950/95 via-fuchsia-950/95 to-pink-950/95 text-pink-50',
        chip: 'bg-pink-500 text-white',
    },
    new: {
        label: 'Novedad',
        icon: Sparkles,
        bar: 'border-amber-500/60 from-amber-950/95 via-orange-950/95 to-amber-950/95 text-amber-50',
        chip: 'bg-amber-400 text-black',
    },
    event: {
        label: 'Evento',
        icon: CalendarDays,
        bar: 'border-violet-500/60 from-violet-950/95 via-purple-950/95 to-violet-950/95 text-violet-50',
        chip: 'bg-violet-500 text-white',
    },
    news: {
        label: 'Noticia',
        icon: Megaphone,
        bar: 'border-emerald-500/60 from-emerald-950/95 via-green-950/95 to-emerald-950/95 text-emerald-50',
        chip: 'bg-emerald-500 text-black',
    },
};

const DISMISS_KEY = 'announcements-dismissed';
const POPUP_KEY = 'announcements-popup-seen';
const POPUP_SESSION_KEY = 'announcements-popup-session';

function readIds(key: string): number[] {
    try {
        const v = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(v) ? v.filter((n) => typeof n === 'number') : [];
    } catch {
        return [];
    }
}

function writeIds(key: string, ids: number[]) {
    try {
        localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids)).slice(-50)));
    } catch {
        /* sin almacenamiento: solo se oculta en esta vista */
    }
}

/** "quedan 2 d 5 h" para ofertas que terminan pronto (menos de 7 días). */
export function endsIn(iso: string | null, now: number): string | null {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - now;
    if (ms <= 0 || ms > 7 * 86400000) return null;
    const mins = Math.floor(ms / 60000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    if (d > 0) return `${d} d ${h} h`;
    if (h > 0) return `${h} h ${m} min`;
    return `${m} min`;
}

export function trackClick(id: number) {
    try {
        const url = `/api/announcements/${id}/click`;
        if (!navigator.sendBeacon?.(url)) fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
    } catch {
        /* métrica opcional */
    }
}

/** Anuncios publicados para una ubicación, sin los caducados en el navegador. */
function useLive(place: AnnouncementPlace) {
    const { announcements } = usePage<{ announcements?: AnnouncementInfo[] }>().props;
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    const items = useMemo(
        () =>
            (announcements ?? []).filter(
                (a) => a.places.includes(place) && new Date(a.starts_at).getTime() <= now && (!a.ends_at || new Date(a.ends_at).getTime() > now),
            ),
        [announcements, place, now],
    );

    return { items, now };
}

function CouponChip({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        });
    };
    return (
        <button
            type="button"
            onClick={copy}
            title="Copiar cupón"
            className="inline-flex items-center gap-1 rounded border border-dashed border-white/50 bg-black/30 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider hover:bg-white/10"
        >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? '¡Copiado!' : code}
        </button>
    );
}

function Cta({ a, className }: { a: AnnouncementInfo; className: string }) {
    if (!a.cta_url) return null;
    const external = a.cta_url.startsWith('http');
    return (
        <a
            href={a.cta_url}
            onClick={() => trackClick(a.id)}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className={className}
        >
            {a.cta_label || 'Ver más'} →
        </a>
    );
}

/**
 * Barra de anuncios (ofertas, novedades, eventos). Si hay varios, rota cada 7 s.
 * Cada anuncio se puede ocultar y no vuelve a salir en ese navegador.
 */
export default function AnnouncementBar({ place }: { place: AnnouncementPlace }) {
    const { items: live, now } = useLive(place);
    const [dismissed, setDismissed] = useState<number[]>(() => readIds(DISMISS_KEY));
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const items = live.filter((a) => !dismissed.includes(a.id));

    useEffect(() => {
        if (items.length < 2 || paused) return;
        const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 7000);
        return () => clearInterval(t);
    }, [items.length, paused]);

    if (items.length === 0) return null;
    const a = items[index % items.length];
    const style = TYPE_STYLES[a.type] ?? TYPE_STYLES.news;
    const Icon = style.icon;
    const left = endsIn(a.ends_at, now);

    const dismiss = () => {
        const next = [...dismissed, a.id];
        setDismissed(next);
        writeIds(DISMISS_KEY, next);
    };

    return (
        <div
            role="region"
            aria-label="Anuncios"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className={`relative flex items-center justify-center gap-3 border-b bg-gradient-to-r px-10 py-2 font-[Orbitron] text-xs ${style.bar}`}
        >
            <div key={a.id} className="animate-in fade-in flex min-w-0 flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center duration-500">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${style.chip}`}>
                    <Icon className="h-3 w-3" /> {style.label}
                </span>
                {a.highlight && <span className="text-sm font-extrabold tracking-wide text-yellow-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.6)]">{a.highlight}</span>}
                <strong className="tracking-wide">{a.title}</strong>
                {a.message && <span className="hidden font-sans text-[11px] opacity-80 md:inline">{a.message}</span>}
                {a.coupon_code && <CouponChip code={a.coupon_code} />}
                {left && <span className="inline-flex items-center gap-1 font-sans text-[11px] font-semibold text-yellow-200"><Clock className="h-3 w-3" /> quedan {left}</span>}
                <Cta a={a} className="rounded-md border border-white/40 bg-white/10 px-2.5 py-0.5 font-bold whitespace-nowrap transition hover:bg-white hover:text-black" />
            </div>
            {items.length > 1 && (
                <div className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-1">
                    {items.map((it, i) => (
                        <button
                            key={it.id}
                            type="button"
                            aria-label={`Anuncio ${i + 1}`}
                            onClick={() => setIndex(i)}
                            className={`h-1 rounded-full transition-all ${i === index % items.length ? 'w-4 bg-white/80' : 'w-1.5 bg-white/30'}`}
                        />
                    ))}
                </div>
            )}
            <button onClick={dismiss} className="absolute top-1/2 right-3 -translate-y-1/2 opacity-60 hover:opacity-100" aria-label="Ocultar anuncio">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

/**
 * Ventana emergente para el anuncio destacado (popup = true).
 * Sale automáticamente una sola vez por anuncio y sesión (priorizando ofertas esporádicas activas y luego el anuncio fijo),
 * sin repetirse constantemente.
 */
export function AnnouncementPopup({ place, delayMs = 2500 }: { place: AnnouncementPlace; delayMs?: number }) {
    const { items, now } = useLive(place);
    const [open, setOpen] = useState<AnnouncementInfo | null>(null);

    const candidate = useMemo(() => {
        const seen = readIds(POPUP_KEY);
        const unseen = items.filter((a) => a.popup && !seen.includes(a.id));
        if (unseen.length === 0) return null;
        // Priorizar ofertas/eventos esporádicos con fecha de fin antes que el anuncio fijo permanente
        return unseen.find((a) => a.ends_at !== null) ?? unseen[0];
    }, [items]);

    const candidateId = candidate?.id;

    useEffect(() => {
        if (!candidateId) return;
        try {
            if (sessionStorage.getItem(POPUP_SESSION_KEY) === '1') return;
        } catch {
            /* ignore */
        }
        if (readIds(POPUP_KEY).includes(candidateId)) return;

        const t = setTimeout(() => {
            const target = items.find((a) => a.id === candidateId) ?? null;
            if (target) {
                try {
                    sessionStorage.setItem(POPUP_SESSION_KEY, '1');
                } catch {
                    /* ignore */
                }
                setOpen(target);
            }
        }, delayMs);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidateId, delayMs]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;
    const style = TYPE_STYLES[open.type] ?? TYPE_STYLES.news;
    const Icon = open.type === 'offer' ? Gift : style.icon;
    const left = endsIn(open.ends_at, now);

    function close() {
        if (open) writeIds(POPUP_KEY, [...readIds(POPUP_KEY), open.id]);
        setOpen(null);
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={close} role="dialog" aria-modal="true" aria-label={open.title}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="animate-in zoom-in-95 fade-in relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-pink-500 bg-black/95 p-7 text-center font-[Orbitron] text-white shadow-[0_0_40px_8px_rgba(255,0,150,0.35)] duration-300"
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,#ff44cc33_1px,transparent_1px)] bg-[length:18px_18px] opacity-30" />
                <button onClick={close} className="absolute top-3 right-3 z-10 opacity-60 hover:opacity-100" aria-label="Cerrar">
                    <X className="h-5 w-5" />
                </button>
                <div className="relative space-y-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-widest uppercase ${style.chip}`}>
                        <Icon className="h-3.5 w-3.5" /> {style.label}
                    </span>
                    {open.highlight && (
                        <p className="text-5xl font-extrabold tracking-wider text-yellow-300 drop-shadow-[0_0_14px_rgba(253,224,71,0.6)]">{open.highlight}</p>
                    )}
                    <h2 className="text-xl font-bold tracking-wide text-pink-300">{open.title}</h2>
                    {open.message && <p className="font-sans text-sm whitespace-pre-line text-neutral-300">{open.message}</p>}
                    {open.coupon_code && (
                        <div className="space-y-1">
                            <p className="font-sans text-[11px] text-neutral-400">Usa este cupón al pagar:</p>
                            <div className="text-base">
                                <CouponChip code={open.coupon_code} />
                            </div>
                        </div>
                    )}
                    {left && <p className="inline-flex items-center justify-center gap-1.5 font-sans text-xs font-semibold text-yellow-200"><Clock className="h-3.5 w-3.5" /> La oferta termina en {left}</p>}
                    <div className="flex flex-col gap-2 pt-1" onClick={close}>
                        <Cta
                            a={open}
                            className="rounded-md bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-3 text-sm font-bold tracking-wider text-white shadow-[0_0_20px_rgba(255,0,128,0.4)] transition hover:from-pink-600 hover:to-fuchsia-700"
                        />
                        <button onClick={close} className="font-sans text-xs text-neutral-500 hover:text-neutral-300">
                            Ahora no
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
