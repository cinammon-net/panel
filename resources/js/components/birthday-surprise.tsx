import { router } from '@inertiajs/react';
import { CalendarHeart, Coins, Gift, Heart, Percent, TimerReset } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type BirthdayToday = {
    id: number;
    name: string;
    gifts: {
        store?: boolean;
        coins?: number;
        discount?: number;
        discount_days?: number;
        discount_until?: string;
        extra_days?: number;
        extended?: string[];
        vip?: boolean;
    } | null;
    no_gift_reason: string | null;
    wishes: string[];
    wish_count: number;
    seen: boolean;
    store_url: string;
};

const COLORS = ['#f472b6', '#a855f7', '#22d3ee', '#facc15', '#34d399', '#fb7185'];

/** Lluvia de confeti hecha con divs (sin librerías); dura unos segundos. */
function Confetti({ burst }: { burst: number }) {
    const pieces = useMemo(
        () =>
            Array.from({ length: 90 }, (_, i) => ({
                left: Math.random() * 100,
                delay: Math.random() * 0.8,
                duration: 2.6 + Math.random() * 2,
                size: 6 + Math.random() * 7,
                color: COLORS[i % COLORS.length],
                rotate: Math.random() * 360,
                round: Math.random() > 0.6,
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [burst],
    );
    const [alive, setAlive] = useState(true);
    useEffect(() => {
        setAlive(true);
        const t = setTimeout(() => setAlive(false), 5200);
        return () => clearTimeout(t);
    }, [burst]);
    if (!alive) return null;
    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
            <style>{`@keyframes cin-confetti{0%{transform:translate3d(0,-10vh,0) rotate(0)}100%{transform:translate3d(var(--dx),110vh,0) rotate(720deg)}}`}</style>
            {pieces.map((p, i) => (
                <span
                    key={`${burst}-${i}`}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: `${p.left}%`,
                        width: p.size,
                        height: p.round ? p.size : p.size * 0.45,
                        background: p.color,
                        borderRadius: p.round ? '50%' : 2,
                        transform: `rotate(${p.rotate}deg)`,
                        animation: `cin-confetti ${p.duration}s cubic-bezier(.2,.6,.4,1) ${p.delay}s forwards`,
                        ['--dx' as string]: `${(Math.random() - 0.5) * 30}vw`,
                    }}
                />
            ))}
        </div>
    );
}

function GiftCard({ icon: Icon, color, title, children }: { icon: typeof Gift; color: string; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-1 flex items-center gap-2">
                <Icon className={`h-5 w-5 ${color}`} />
                <span className="text-sm font-bold">{title}</span>
            </div>
            <p className="font-sans text-xs leading-relaxed text-neutral-300">{children}</p>
        </div>
    );
}

export default function BirthdaySurprise({ birthday }: { birthday: BirthdayToday }) {
    const [open, setOpen] = useState(birthday.seen);
    const [burst, setBurst] = useState(birthday.seen ? 0 : -1);
    const g = birthday.gifts;
    const store = g?.store;

    const unwrap = () => {
        setOpen(true);
        setBurst((b) => b + 1 || 1);
        router.post(route('birthday.seen'), {}, { preserveScroll: true, preserveState: true });
    };

    return (
        <section className="relative overflow-hidden rounded-2xl border border-pink-500/40 bg-gradient-to-br from-pink-950/60 via-purple-950/50 to-black p-6 shadow-[0_0_40px_rgba(236,72,153,0.18)]">
            {burst > 0 && <Confetti burst={burst} />}
            <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-pink-500/20 blur-3xl" />

            {!open ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <p className="text-xs tracking-[0.3em] text-pink-300">HOY ES TU DÍA</p>
                    <h2 className="text-2xl font-black sm:text-3xl">¡Feliz cumpleaños, {birthday.name}!</h2>
                    <button
                        type="button"
                        onClick={unwrap}
                        className="group relative mt-2 flex h-28 w-28 items-center justify-center rounded-2xl border border-pink-400/60 bg-pink-500/20 transition hover:scale-105 hover:bg-pink-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                        aria-label="Abrir regalo"
                    >
                        <Gift className="h-14 w-14 text-pink-200 transition group-hover:-rotate-6 motion-safe:animate-bounce" />
                    </button>
                    <p className="font-sans text-sm text-neutral-300">Tenemos algo para ti. Pulsa la caja para abrirlo.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs tracking-[0.3em] text-pink-300">HOY ES TU DÍA</p>
                            <h2 className="text-2xl font-black">¡Feliz cumpleaños, {birthday.name}!</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setBurst((b) => b + 1)}
                            className="rounded-lg border border-pink-400/50 px-3 py-1.5 text-xs text-pink-200 hover:bg-pink-500/20"
                        >
                            Más confeti
                        </button>
                    </div>

                    {store ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <GiftCard icon={Coins} color="text-amber-400" title={`${g?.coins ?? 0} monedas`}>
                                Ya están en tu saldo de la tienda. Úsalas en un servidor gratis o para alargarlo.
                            </GiftCard>
                            <GiftCard icon={Percent} color="text-pink-400" title={`-${g?.discount ?? 0}% en un pedido`}>
                                Durante {g?.discount_days ?? 7} días, se aplica solo al pedir.{' '}
                                <a href={`${birthday.store_url}/store`} className="text-pink-300 underline">
                                    Ir a la tienda
                                </a>
                            </GiftCard>
                            <GiftCard icon={TimerReset} color="text-emerald-400" title={`+${g?.extra_days ?? 3} días gratis`}>
                                {g?.extended?.length ? `Añadidos a: ${g.extended.join(', ')}.` : 'Se añaden a tus servicios de pago activos; ahora mismo no tienes ninguno.'}
                            </GiftCard>
                            <GiftCard icon={CalendarHeart} color="text-violet-400" title="Rol Cumpleañero">
                                En el Discord de Cinammon todo el día, con tu felicitación en el canal general.
                            </GiftCard>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 font-sans text-sm text-neutral-300">
                            {g && !store
                                ? `Los regalos de la tienda van a la cuenta de ${birthday.store_url} con tu mismo correo, y todavía no tienes una. Hoy tienes el rol Cumpleañero en Discord y la felicitación de la comunidad.`
                                : `${birthday.no_gift_reason ?? ''} Hoy tienes el rol Cumpleañero en Discord y la felicitación de toda la comunidad.`}
                        </div>
                    )}

                    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <p className="mb-2 flex items-center gap-2 text-sm font-bold">
                            <Heart className="h-4 w-4 text-pink-400" />
                            {birthday.wish_count
                                ? `${birthday.wish_count} ${birthday.wish_count === 1 ? 'persona te ha felicitado' : 'personas te han felicitado'} en Discord`
                                : 'Tu tarjeta de felicitaciones'}
                        </p>
                        {birthday.wishes.length ? (
                            <div className="flex flex-wrap gap-1.5">
                                {birthday.wishes.map((n, i) => (
                                    <span key={i} className="rounded-full border border-pink-400/30 bg-pink-500/10 px-2.5 py-0.5 font-sans text-xs text-pink-100">
                                        {n}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="font-sans text-xs text-neutral-400">
                                La comunidad puede felicitarte con el botón de tu tarjeta en Discord. Esta noche te mandamos por correo todas las firmas.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
