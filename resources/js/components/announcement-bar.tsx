import { usePage } from '@inertiajs/react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Copy, Flame, Gift, Megaphone, Rocket, ShieldCheck, Sparkles, Tag, X, Zap } from 'lucide-react';
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

export const TYPE_STYLES: Record<
    AnnouncementType,
    { label: string; icon: typeof Tag; bar: string; chip: string; glow: string; border: string; cta: string }
> = {
    offer: {
        label: 'Oferta Flash',
        icon: Flame,
        bar: 'border-pink-500/60 from-pink-950/95 via-fuchsia-950/95 to-pink-950/95 text-pink-50',
        chip: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
        glow: 'from-pink-500/35 via-fuchsia-500/20 to-amber-500/30',
        border: 'border-pink-500 shadow-[0_0_60px_rgba(236,72,153,0.45)]',
        cta: 'from-pink-500 via-fuchsia-500 to-amber-500 text-white shadow-[0_0_30px_rgba(236,72,153,0.55)]',
    },
    new: {
        label: '100% Gratis',
        icon: Sparkles,
        bar: 'border-cyan-500/60 from-cyan-950/95 via-emerald-950/95 to-cyan-950/95 text-cyan-50',
        chip: 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black',
        glow: 'from-emerald-500/35 via-cyan-500/25 to-teal-500/30',
        border: 'border-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.45)]',
        cta: 'from-emerald-400 via-teal-400 to-cyan-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.55)]',
    },
    event: {
        label: 'Evento Especial',
        icon: CalendarDays,
        bar: 'border-violet-500/60 from-violet-950/95 via-purple-950/95 to-violet-950/95 text-violet-50',
        chip: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white',
        glow: 'from-violet-500/35 via-fuchsia-500/25 to-amber-500/25',
        border: 'border-violet-400 shadow-[0_0_60px_rgba(167,139,250,0.45)]',
        cta: 'from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-[0_0_30px_rgba(167,139,250,0.55)]',
    },
    news: {
        label: 'Noticia',
        icon: Megaphone,
        bar: 'border-emerald-500/60 from-emerald-950/95 via-teal-950/95 to-emerald-950/95 text-emerald-50',
        chip: 'bg-emerald-400 text-black',
        glow: 'from-emerald-500/30 via-teal-500/20 to-cyan-500/25',
        border: 'border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.4)]',
        cta: 'from-emerald-400 to-cyan-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.45)]',
    },
};

const DISMISS_KEY = 'announcements-dismissed';
const POPUP_KEY = 'announcements-popup-seen-v2';
const OPEN_EVENT = 'cinammon:open-announcement-popup';

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
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
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

/** Detecta si un anuncio es el de Servidores Gratis para darle estética verde/neón ultra atractiva. */
function isFreeServerAnnouncement(a: AnnouncementInfo): boolean {
    const text = `${a.highlight || ''} ${a.title || ''} ${a.cta_url || ''}`.toLowerCase();
    return text.includes('gratis') || text.includes('0,00') || text.includes('0€') || text.includes('/free') || text.includes('/coins');
}

/** Píldoras visuales ultra-cortas para no saturar con texto. */
function visualPills(a: AnnouncementInfo): string[] {
    if (isFreeServerAnnouncement(a)) {
        return ['⚡ Activo en 60s', '🪙 0 € con monedas', '🕹️ Juegos, Bots y Web'];
    }
    if (a.type === 'event') {
        return ['🎁 1 Regalo diario', '👑 2x Clientes VIP', '⏳ +13 días gratis'];
    }
    if (a.type === 'offer') {
        return ['⚡ Descuento directo', '🛡️ Anti-DDoS Pro', '🚀 Activación al instante'];
    }
    return ['⚡ Alto rendimiento', '🛡️ DDoS incluido', '🚀 Panel inmediato'];
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
    const copy = (e: React.MouseEvent) => {
        e.stopPropagation();
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
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-yellow-300/70 bg-yellow-400/15 px-2.5 py-1 font-mono text-xs font-extrabold tracking-wider text-yellow-200 hover:bg-yellow-400/25"
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? '¡COPIADO!' : code}
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
            {a.cta_label || 'Entrar ahora'} →
        </a>
    );
}

/**
 * Barra superior compacta. Rota entre anuncios cada 6 s y permite abrir el cartel grande con 1 clic.
 */
export default function AnnouncementBar({ place }: { place: AnnouncementPlace }) {
    const { items: live, now } = useLive(place);
    const [dismissed, setDismissed] = useState<number[]>(() => readIds(DISMISS_KEY));
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const items = live.filter((a) => !dismissed.includes(a.id));
    const hasPopups = live.some((a) => a.popup);

    useEffect(() => {
        if (items.length < 2 || paused) return;
        const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
        return () => clearInterval(t);
    }, [items.length, paused]);

    if (items.length === 0) return null;
    const a = items[index % items.length];
    const isFree = isFreeServerAnnouncement(a);
    const style = isFree ? TYPE_STYLES.new : (TYPE_STYLES[a.type] ?? TYPE_STYLES.news);
    const Icon = style.icon;
    const left = endsIn(a.ends_at, now);

    const dismiss = () => {
        const next = [...dismissed, a.id];
        setDismissed(next);
        writeIds(DISMISS_KEY, next);
    };

    const openBigPoster = () => {
        window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { id: a.id } }));
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
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${style.chip}`}>
                    <Icon className="h-3 w-3" /> {isFree ? '100% GRATIS' : style.label}
                </span>
                {a.highlight && (
                    <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-sm font-black tracking-wide text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.7)]">
                        {a.highlight}
                    </span>
                )}
                <strong className="tracking-wide text-white">{a.title}</strong>
                {a.coupon_code && <CouponChip code={a.coupon_code} />}
                {left && (
                    <span className="inline-flex items-center gap-1 font-sans text-[11px] font-bold text-yellow-200">
                        <Clock className="h-3 w-3" /> {left}
                    </span>
                )}
                <Cta
                    a={a}
                    className="rounded-lg bg-white px-3 py-1 font-extrabold whitespace-nowrap text-black shadow transition hover:scale-105 hover:bg-yellow-300"
                />
                {hasPopups && (
                    <button
                        type="button"
                        onClick={openBigPoster}
                        className="hidden items-center gap-1 rounded-lg border border-white/25 bg-black/30 px-2 py-0.5 font-sans text-[11px] text-white/85 transition hover:border-white hover:text-white sm:inline-flex"
                    >
                        <Sparkles className="h-3 w-3 text-yellow-300" /> Ver cartel
                    </button>
                )}
            </div>
            {items.length > 1 && (
                <div className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-1">
                    {items.map((it, i) => (
                        <button
                            key={it.id}
                            type="button"
                            aria-label={`Anuncio ${i + 1}`}
                            onClick={() => setIndex(i)}
                            className={`h-1 rounded-full transition-all ${i === index % items.length ? 'w-4 bg-white/90' : 'w-1.5 bg-white/35'}`}
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
 * Cartel en grande (Popup) multi-anuncio:
 * - Soporta el anuncio fijo ("Servidores Gratis") + los anuncios esporádicos (Black Friday, Adviento, Navidad, etc.) a la vez.
 * - Si hay algún anuncio con `popup = true` no visto todavía, abre el cartel mostrando todos los `popup = true` activos.
 * - Diseño ultra-visual con poquísimo texto: cifra gigante, 3 insignias rápidas y botón directo para entrar en 1 clic.
 */
export function AnnouncementPopup({ place, delayMs = 1200 }: { place: AnnouncementPlace; delayMs?: number }) {
    const { items, now } = useLive(place);
    const [visible, setVisible] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const [paused, setPaused] = useState(false);

    // Todos los anuncios en grande activos (tanto los esporádicos de oferta como el fijo de servidores gratis)
    const popups = useMemo(() => items.filter((a) => a.popup), [items]);
    const popupIdsKey = popups.map((p) => p.id).join(',');

    useEffect(() => {
        if (popups.length === 0) return;
        const seen = readIds(POPUP_KEY);
        const firstUnseenIdx = popups.findIndex((p) => !seen.includes(p.id));
        if (firstUnseenIdx === -1) return;

        const t = setTimeout(() => {
            setActiveIdx(firstUnseenIdx);
            setVisible(true);
        }, delayMs);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [popupIdsKey, delayMs]);

    // Permite reabrir el cartel grande desde la barra superior
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ id?: number }>).detail;
            if (popups.length === 0) return;
            const idx = detail?.id ? popups.findIndex((p) => p.id === detail.id) : 0;
            setActiveIdx(idx >= 0 ? idx : 0);
            setVisible(true);
        };
        window.addEventListener(OPEN_EVENT, handler);
        return () => window.removeEventListener(OPEN_EVENT, handler);
    }, [popups]);

    // Rotación suave entre el anuncio esporádico y el fijo de Servidores Gratis si hay más de 1
    useEffect(() => {
        if (!visible || popups.length < 2 || paused) return;
        const t = setInterval(() => {
            setActiveIdx((i) => (i + 1) % popups.length);
        }, 5500);
        return () => clearInterval(t);
    }, [visible, popups.length, paused]);

    useEffect(() => {
        if (!visible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeAll();
            if (e.key === 'ArrowRight' && popups.length > 1) setActiveIdx((i) => (i + 1) % popups.length);
            if (e.key === 'ArrowLeft' && popups.length > 1) setActiveIdx((i) => (i - 1 + popups.length) % popups.length);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, popups.length]);

    if (!visible || popups.length === 0) return null;

    const current = popups[activeIdx % popups.length] ?? popups[0];
    const others = popups.filter((p) => p.id !== current.id);
    const isFree = isFreeServerAnnouncement(current);
    const style = isFree ? TYPE_STYLES.new : (TYPE_STYLES[current.type] ?? TYPE_STYLES.offer);
    const Icon = isFree ? Gift : current.type === 'offer' ? Flame : style.icon;
    const left = endsIn(current.ends_at, now);
    const pills = visualPills(current);

    function closeAll() {
        writeIds(POPUP_KEY, [...readIds(POPUP_KEY), ...popups.map((p) => p.id)]);
        setVisible(false);
    }

    function goTo(a: AnnouncementInfo) {
        if (!a.cta_url) return;
        trackClick(a.id);
        writeIds(POPUP_KEY, [...readIds(POPUP_KEY), a.id]);
        window.location.href = a.cta_url;
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            onClick={closeAll}
            role="dialog"
            aria-modal="true"
            aria-label={current.title}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                className={`animate-in zoom-in-95 fade-in relative w-full max-w-lg overflow-hidden rounded-3xl border-2 bg-[#060913]/95 p-6 sm:p-8 text-center font-[Orbitron] text-white duration-300 ${style.border}`}
            >
                {/* Resplandor neón de fondo */}
                <div className={`pointer-events-none absolute -top-24 left-1/2 h-64 w-80 -translate-x-1/2 rounded-full bg-gradient-to-r ${style.glow} blur-3xl`} />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,#ffffff15_1px,transparent_1px)] bg-[length:20px_20px] opacity-35" />

                {/* Botón cerrar */}
                <button
                    type="button"
                    onClick={closeAll}
                    className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Selector superior cuando hay varios anuncios en grande (ej. Oferta + Servidor Gratis fijo) */}
                {popups.length > 1 && (
                    <div className="relative z-10 mb-5 flex flex-wrap items-center justify-center gap-2 pr-6">
                        {popups.map((p, idx) => {
                            const active = idx === activeIdx % popups.length;
                            const freeTab = isFreeServerAnnouncement(p);
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setActiveIdx(idx)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold tracking-wider uppercase transition ${
                                        active
                                            ? freeTab
                                                ? 'border-emerald-300 bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                                                : 'border-pink-300 bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.6)]'
                                            : 'border-white/15 bg-white/5 text-neutral-300 hover:border-white/40 hover:text-white'
                                    }`}
                                >
                                    <span>{freeTab ? '🎮' : '🔥'}</span>
                                    <span>{p.highlight || (freeTab ? 'GRATIS' : 'OFERTA')}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Cuerpo principal ultra-visual (clicable para ir directo) */}
                <div
                    onClick={() => current.cta_url && goTo(current)}
                    className={`relative z-10 space-y-4 ${current.cta_url ? 'cursor-pointer' : ''}`}
                >
                    <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-black tracking-widest uppercase shadow-lg ${style.chip}">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-black tracking-widest uppercase ${style.chip}`}>
                            <Icon className="h-3.5 w-3.5" /> {isFree ? 'SERVIDORES 100% GRATIS' : style.label}
                            {left && <span className="ml-1 rounded bg-black/25 px-1.5 py-0.5 text-[10px]">⏳ {left}</span>}
                        </span>
                    </div>

                    {/* Reclamo GIGANTE para captar la vista al instante */}
                    <div className="py-1">
                        <p className="text-6xl font-black tracking-tight text-yellow-300 drop-shadow-[0_0_25px_rgba(253,224,71,0.65)] sm:text-7xl">
                            {current.highlight || (isFree ? '0,00 €' : 'OFERTA')}
                        </p>
                    </div>

                    {/* Título directo y corto */}
                    <h2 className="mx-auto max-w-md text-xl leading-tight font-black tracking-wide text-white uppercase sm:text-2xl">
                        {current.title}
                    </h2>

                    {/* 3 Píldoras visuales rápidas en lugar de párrafos largos */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 font-sans text-xs font-bold">
                        {pills.map((pill) => (
                            <span
                                key={pill}
                                className="rounded-xl border border-white/15 bg-white/[0.07] px-3 py-1.5 text-neutral-100 shadow-inner"
                            >
                                {pill}
                            </span>
                        ))}
                    </div>

                    {/* Mensaje breve (máximo 1-2 líneas) */}
                    {current.message && (
                        <p className="mx-auto max-w-sm line-clamp-2 font-sans text-xs leading-relaxed text-neutral-300 sm:text-sm">
                            {current.message}
                        </p>
                    )}

                    {/* Cupón si existe */}
                    {current.coupon_code && (
                        <div className="pt-1">
                            <CouponChip code={current.coupon_code} />
                        </div>
                    )}

                    {/* Botón CTA gigante de acceso directo */}
                    <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                        {current.cta_url && (
                            <a
                                href={current.cta_url}
                                onClick={() => {
                                    trackClick(current.id);
                                    writeIds(POPUP_KEY, [...readIds(POPUP_KEY), current.id]);
                                }}
                                className={`group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r py-4 text-sm font-black tracking-wider uppercase transition duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-95 sm:text-base ${style.cta}`}
                            >
                                <Rocket className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                                <span>{current.cta_label || (isFree ? '¡Crear servidor gratis!' : '¡Aprovechar ahora!')}</span>
                                <span>→</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Tarjeta secundaria integrada: muestra el otro anuncio en grande (ej. Servidor Gratis fijo o la Oferta activa) sin tener que esperar */}
                {others.length > 0 && (
                    <div className="relative z-10 mt-5 space-y-2 border-t border-white/10 pt-4 text-left">
                        {others.slice(0, 2).map((other) => {
                            const otherFree = isFreeServerAnnouncement(other);
                            return (
                                <div
                                    key={other.id}
                                    onClick={() => (other.cta_url ? goTo(other) : setActiveIdx(popups.findIndex((p) => p.id === other.id)))}
                                    className={`group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 transition hover:scale-[1.01] ${
                                        otherFree
                                            ? 'border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-400 hover:bg-emerald-500/20'
                                            : 'border-pink-400/40 bg-pink-500/10 hover:border-pink-400 hover:bg-pink-500/20'
                                    }`}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span
                                            className={`shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-black ${
                                                otherFree ? 'bg-emerald-400 text-black' : 'bg-pink-500 text-white'
                                            }`}
                                        >
                                            {other.highlight || (otherFree ? '0,00 €' : 'OFERTA')}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-extrabold text-white">{other.title}</p>
                                            <p className="truncate font-sans text-[11px] text-neutral-300">
                                                {otherFree ? '⚡ Siempre disponible · Gana monedas y crea gratis' : other.message || 'Pulsa para acceder ahora'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="shrink-0 rounded-xl bg-white/15 px-3 py-1.5 text-[11px] font-extrabold text-white transition group-hover:bg-white group-hover:text-black">
                                        {other.cta_label || 'Ir'} →
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Controles inferiores discretos */}
                <div className="relative z-10 mt-4 flex items-center justify-between font-sans text-xs text-neutral-400">
                    {popups.length > 1 ? (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setActiveIdx((i) => (i - 1 + popups.length) % popups.length)}
                                className="rounded-lg border border-white/10 bg-white/5 p-1 hover:bg-white/15 hover:text-white"
                                aria-label="Anterior"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="px-1 font-mono text-[11px]">
                                {(activeIdx % popups.length) + 1} / {popups.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => setActiveIdx((i) => (i + 1) % popups.length)}
                                className="rounded-lg border border-white/10 bg-white/5 p-1 hover:bg-white/15 hover:text-white"
                                aria-label="Siguiente"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <span />
                    )}
                    <button type="button" onClick={closeAll} className="hover:text-white">
                        Cerrar ventana
                    </button>
                </div>
            </div>
        </div>
    );
}
