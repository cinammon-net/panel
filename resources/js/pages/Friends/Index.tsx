import { RankIcon } from '@/components/rank-badges';
import UserAvatar from '@/components/user-avatar';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Check, Feather, Heart, PenLine, RotateCcw, Send, Sparkles, Trash2, Undo2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Friend {
    id: number;
    number: number;
    name: string;
    avatar: string | null;
    since: string;
    expires_at: string | null;
    me: boolean;
    dedication: string | null;
}

interface Author {
    id: number;
    name: string;
    avatar: string | null;
}

interface Note {
    id: number;
    body: string;
    color: string;
    at: string;
    author: Author;
    can_delete: boolean;
}

interface Wish {
    id: number;
    body: string;
    at: string;
    granted_at: string | null;
    reply: string | null;
    author: Author;
}

interface Props {
    isOwner: boolean;
    max: number;
    friends: Friend[];
    notes: Note[];
    wishes: Wish[];
    colors: string[];
    limits: { notes_per_day: number; open_wishes: number };
    flash?: { success?: string };
    errors?: Record<string, string>;
    [key: string]: unknown;
}

const SKY = '#38bdf8';
const ROSE = '#f472b6';

const NOTE_STYLES: Record<string, { paper: string; pin: string; dot: string }> = {
    sky: { paper: 'bg-sky-200 text-sky-950', pin: 'bg-sky-500', dot: 'bg-sky-300' },
    pink: { paper: 'bg-pink-200 text-pink-950', pin: 'bg-pink-500', dot: 'bg-pink-300' },
    amber: { paper: 'bg-amber-200 text-amber-950', pin: 'bg-amber-500', dot: 'bg-amber-300' },
    lime: { paper: 'bg-lime-200 text-lime-950', pin: 'bg-lime-600', dot: 'bg-lime-300' },
    violet: { paper: 'bg-violet-200 text-violet-950', pin: 'bg-violet-500', dot: 'bg-violet-300' },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const pad = (n: number) => String(n).padStart(2, '0');

/** Número pseudoaleatorio estable (0..1) a partir de una semilla: cada amigo tiene siempre su sitio en el cielo. */
function seeded(seed: number) {
    let t = (seed * 2654435761) >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function daysSince(iso: string) {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export default function FriendsIndex() {
    const { isOwner, max, friends, notes, wishes, colors, limits, flash, errors } = usePage<Props>().props;
    const me = friends.find((f) => f.me) ?? null;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
    }, [flash]);

    return (
        <AppLayout breadcrumbs={[{ title: 'Rincón de Amigos', href: '/amigos' }]}>
            <Head title="Rincón de Amigos" />
            <style>{CSS}</style>

            <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-6 sm:px-6">
                <header className="flex flex-col gap-2">
                    <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-sky-400 uppercase">
                        <RankIcon icon="amigo" role="Amigo de Cinammon" className="h-4 w-4" />
                        Solo para Amigos de Cinammon
                    </p>
                    <h1 className="font-[Orbitron] text-3xl font-bold text-neutral-900 sm:text-4xl dark:text-white">
                        Rincón de <span className="friend-gradient-text">Amigos</span>
                    </h1>
                    <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
                        {isOwner && !me
                            ? `Así ven esta sección tus amigos. Desde aquí les escribes la dedicatoria de su carné y cumples sus deseos. Hay ${friends.length} de ${max}.`
                            : 'Un sitio pequeño y tranquilo, solo para la gente a la que el Owner ha dado este rol. Aquí no se vende nada.'}
                    </p>
                </header>

                <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
                    {me ? <FriendCard friend={me} max={max} /> : <OwnerKey count={friends.length} max={max} />}
                    <Constellation friends={friends} isOwner={isOwner} />
                </section>

                <Wall notes={notes} colors={colors} perDay={limits.notes_per_day} error={errors?.body} />

                <Well wishes={wishes} isOwner={isOwner} canWish={!!me || isOwner} openLimit={limits.open_wishes} error={errors?.body} />
            </div>
        </AppLayout>
    );
}

/* ------------------------------------------------------------------ carné */

function FriendCard({ friend, max }: { friend: Friend; max: number }) {
    const [flipped, setFlipped] = useState(false);

    return (
        <div className="friend-card-scene mx-auto w-full max-w-[380px]">
            <button
                type="button"
                onClick={() => setFlipped((v) => !v)}
                className={`friend-card relative block aspect-[1.586] w-full text-left ${flipped ? 'is-flipped' : ''}`}
                aria-label={flipped ? 'Ver la parte delantera del carné' : 'Girar el carné para leer la dedicatoria'}
            >
                {/* Delante */}
                <div className="friend-card-face friend-holo absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-sky-300/40 p-5 text-white shadow-[0_0_40px_-10px_rgba(56,189,248,0.7)]">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.35em] text-sky-100/80 uppercase">Carné de amigo</p>
                            <p className="font-[Orbitron] text-lg font-bold tracking-wide">CINAMMON</p>
                        </div>
                        <RankIcon icon="amigo" role="Amigo de Cinammon" className="h-9 w-9 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                    </div>
                    <div className="flex items-end gap-4">
                        <UserAvatar name={friend.name} src={friend.avatar} size={64} className="ring-2 ring-white/70" fallbackClassName="bg-sky-700 text-white" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-[Orbitron] text-lg font-bold">{friend.name}</p>
                            <p className="text-xs text-sky-50/90">Desde el {fmtDate(friend.since)}</p>
                            <p className="text-xs text-sky-50/70">
                                {friend.expires_at ? `Hasta el ${fmtDate(friend.expires_at)}` : 'Para siempre'} · {daysSince(friend.since)} días
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] tracking-widest text-sky-100/70 uppercase">Nº</p>
                            <p className="font-[Orbitron] text-3xl leading-none font-bold">{pad(friend.number)}</p>
                            <p className="text-[10px] text-sky-100/70">de {max}</p>
                        </div>
                    </div>
                    <span className="friend-holo-shine pointer-events-none absolute inset-0" />
                </div>

                {/* Detrás: la dedicatoria del Owner */}
                <div className="friend-card-face friend-card-back absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-pink-300/40 bg-neutral-950 p-5 text-white shadow-[0_0_40px_-10px_rgba(244,114,182,0.7)]">
                    <div className="friend-magstripe -mx-5 mb-4 h-8" />
                    <p className="text-[10px] font-semibold tracking-[0.35em] text-pink-300 uppercase">De parte del Owner</p>
                    <div className="mt-2 flex flex-1 items-center">
                        {friend.dedication ? (
                            <p className="friend-handwriting text-lg leading-snug text-neutral-100">“{friend.dedication}”</p>
                        ) : (
                            <p className="text-sm text-neutral-400 italic">Todavía no hay dedicatoria. Vuelve a girar el carné más adelante.</p>
                        )}
                    </div>
                    <p className="text-right text-[10px] text-neutral-500">Toca para girar</p>
                </div>
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                <RotateCcw className="h-3.5 w-3.5" /> Toca el carné para leer lo que hay detrás
            </p>
        </div>
    );
}

function OwnerKey({ count, max }: { count: number; max: number }) {
    return (
        <div className="mx-auto w-full max-w-[380px] rounded-2xl border border-pink-500/40 bg-neutral-950 p-6 text-white shadow-[0_0_40px_-12px_rgba(244,114,182,0.7)]">
            <p className="text-[10px] font-semibold tracking-[0.35em] text-pink-300 uppercase">Vista del Owner</p>
            <p className="mt-2 font-[Orbitron] text-5xl font-bold">
                {count}
                <span className="text-xl text-neutral-500"> / {max}</span>
            </p>
            <p className="mt-1 text-sm text-neutral-400">amigos en el cielo</p>
            <ul className="mt-4 space-y-1.5 text-sm text-neutral-300">
                <li className="flex gap-2"><PenLine className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" /> Pulsa una estrella para escribir la dedicatoria de su carné.</li>
                <li className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> En el pozo de los deseos ves todos los deseos y los concedes.</li>
                <li className="flex gap-2"><Heart className="mt-0.5 h-4 w-4 shrink-0 text-pink-400" /> El rol se da y se quita con <code className="text-pink-300">/amigo</code> en Discord.</li>
            </ul>
        </div>
    );
}

/* ------------------------------------------------------------ constelación */

function Constellation({ friends, isOwner }: { friends: Friend[]; isOwner: boolean }) {
    const W = 1000;
    const H = 420;
    const [selected, setSelected] = useState<number | null>(null);

    // Estrellas de fondo (siempre las mismas) y posición fija de cada amigo según su id
    const dust = useMemo(() => {
        const rnd = seeded(7);
        return Array.from({ length: 90 }, () => ({ x: rnd() * W, y: rnd() * H, r: rnd() * 1.3 + 0.3, d: rnd() * 4 }));
    }, []);
    const stars = useMemo(
        () =>
            friends.map((f) => {
                const rnd = seeded(f.id * 97 + 13);
                return { ...f, x: 70 + rnd() * (W - 140), y: 60 + rnd() * (H - 120), d: rnd() * 3 };
            }),
        [friends],
    );
    const path = stars.map((s) => `${s.x},${s.y}`).join(' ');
    const current = stars.find((s) => s.id === selected) ?? null;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-[radial-gradient(ellipse_at_top,#0c1a3a_0%,#05060f_70%)]">
            <div className="absolute top-4 left-5 z-10">
                <p className="font-[Orbitron] text-sm font-bold text-white">La constelación</p>
                <p className="text-xs text-sky-200/70">Cada estrella es un amigo. La línea las une en el orden en que llegaron.</p>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Constelación con ${friends.length} amigos`}>
                <defs>
                    <radialGradient id="friend-star-glow">
                        <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                        <stop offset="40%" stopColor={SKY} stopOpacity="0.7" />
                        <stop offset="100%" stopColor={SKY} stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="friend-star-glow-me">
                        <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                        <stop offset="40%" stopColor={ROSE} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={ROSE} stopOpacity="0" />
                    </radialGradient>
                </defs>
                {dust.map((s, i) => (
                    <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cbd5e1" className="friend-twinkle" style={{ animationDelay: `${s.d}s` }} />
                ))}
                {stars.length > 1 && <polyline points={path} fill="none" stroke={SKY} strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="4 6" className="friend-line" />}
                {stars.map((s) => (
                    <g
                        key={s.id}
                        transform={`translate(${s.x} ${s.y})`}
                        className="friend-star cursor-pointer"
                        onClick={() => setSelected(selected === s.id ? null : s.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelected(selected === s.id ? null : s.id)}
                        aria-label={`${s.name}, amigo número ${s.number}`}
                    >
                        <circle r={s.me ? 26 : 18} fill={`url(#${s.me ? 'friend-star-glow-me' : 'friend-star-glow'})`} className="friend-pulse" style={{ animationDelay: `${s.d}s` }} />
                        <path d="M0,-9 L2.2,-2.2 L9,0 L2.2,2.2 L0,9 L-2.2,2.2 L-9,0 L-2.2,-2.2 Z" fill="#fff" transform={s.me ? 'scale(1.35)' : undefined} />
                        <text y={s.me ? 40 : 32} textAnchor="middle" className="friend-star-label" fill={s.me ? ROSE : '#e0f2fe'}>
                            {s.me ? 'Tú' : s.name}
                        </text>
                    </g>
                ))}
                {!stars.length && (
                    <text x={W / 2} y={H / 2} textAnchor="middle" fill="#94a3b8" fontSize="18">
                        El cielo aún está vacío. Da el rol con /amigo en Discord.
                    </text>
                )}
            </svg>

            {current && <StarInfo friend={current} isOwner={isOwner} onClose={() => setSelected(null)} />}
        </div>
    );
}

function StarInfo({ friend, isOwner, onClose }: { friend: Friend; isOwner: boolean; onClose: () => void }) {
    const form = useForm({ dedication: friend.dedication ?? '' });
    useEffect(() => form.setData('dedication', friend.dedication ?? ''), [friend.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/amigos/dedicatoria/${friend.id}`, { preserveScroll: true });
    };

    return (
        <div className="absolute right-3 bottom-3 left-3 z-10 rounded-xl border border-sky-400/30 bg-neutral-950/90 p-4 text-white backdrop-blur sm:left-auto sm:w-80">
            <button type="button" onClick={onClose} className="absolute top-2 right-2 rounded p-1 text-neutral-400 hover:text-white" aria-label="Cerrar">
                <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
                <UserAvatar name={friend.name} src={friend.avatar} size={44} fallbackClassName="bg-sky-700 text-white" />
                <div className="min-w-0">
                    <p className="truncate font-semibold">{friend.name}</p>
                    <p className="text-xs text-sky-200/80">
                        Amigo nº {pad(friend.number)} · desde el {fmtDate(friend.since)}
                    </p>
                    {friend.expires_at && <p className="text-xs text-neutral-400">Hasta el {fmtDate(friend.expires_at)}</p>}
                </div>
            </div>
            {isOwner && (
                <form onSubmit={save} className="mt-3 space-y-2">
                    <label className="text-xs font-semibold text-pink-300">Dedicatoria de su carné (solo la ve esa persona)</label>
                    <textarea
                        value={form.data.dedication}
                        onChange={(e) => form.setData('dedication', e.target.value)}
                        maxLength={280}
                        rows={3}
                        className="w-full resize-none rounded-md border border-neutral-700 bg-black px-2 py-1.5 text-sm text-white focus:border-pink-500 focus:outline-none"
                        placeholder="Gracias por estar desde el principio..."
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-500">{form.data.dedication.length}/280</span>
                        <button type="submit" disabled={form.processing} className="rounded-md bg-pink-600 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-500 disabled:opacity-50">
                            Guardar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------- muro */

function Wall({ notes, colors, perDay, error }: { notes: Note[]; colors: string[]; perDay: number; error?: string }) {
    const form = useForm({ body: '', color: colors[0] ?? 'sky' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/amigos/notas', { preserveScroll: true, onSuccess: () => form.reset('body') });
    };

    return (
        <section className="space-y-4">
            <SectionTitle icon={<Feather className="h-5 w-5 text-amber-300" />} title="El muro" subtitle={`Deja una nota para el resto de amigos. Hasta ${perDay} al día.`} />

            <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-start dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex-1">
                    <textarea
                        value={form.data.body}
                        onChange={(e) => form.setData('body', e.target.value)}
                        maxLength={280}
                        rows={2}
                        placeholder="Algo bonito, una idea, un saludo..."
                        className="w-full resize-none rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-neutral-700 dark:text-white"
                    />
                    {(form.errors.body || error) && <p className="mt-1 text-xs text-red-500">{form.errors.body || error}</p>}
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <div className="flex gap-1.5" role="radiogroup" aria-label="Color de la nota">
                        {colors.map((c) => (
                            <button
                                key={c}
                                type="button"
                                role="radio"
                                aria-checked={form.data.color === c}
                                aria-label={c}
                                onClick={() => form.setData('color', c)}
                                className={`h-6 w-6 rounded-full ${NOTE_STYLES[c]?.dot ?? 'bg-sky-300'} ${form.data.color === c ? 'ring-2 ring-neutral-900 ring-offset-2 dark:ring-white dark:ring-offset-neutral-950' : ''}`}
                            />
                        ))}
                    </div>
                    <button type="submit" disabled={form.processing || form.data.body.trim().length < 2} className="flex items-center gap-1.5 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50">
                        <Send className="h-4 w-4" /> Pegar
                    </button>
                </div>
            </form>

            {notes.length ? (
                <div className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                    {notes.map((n) => {
                        const st = NOTE_STYLES[n.color] ?? NOTE_STYLES.sky;
                        const tilt = (seeded(n.id)() - 0.5) * 5;
                        return (
                            <article key={n.id} className={`friend-note relative rounded-sm p-4 pt-5 shadow-lg ${st.paper}`} style={{ transform: `rotate(${tilt}deg)` }}>
                                <span className={`absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full shadow ${st.pin}`} />
                                <p className="friend-handwriting text-base leading-snug break-words whitespace-pre-line">{n.body}</p>
                                <footer className="mt-3 flex items-center gap-2 text-xs opacity-80">
                                    <UserAvatar name={n.author.name} src={n.author.avatar} size={20} />
                                    <span className="truncate font-semibold">{n.author.name}</span>
                                    <span className="ml-auto shrink-0">{fmtShort(n.at)}</span>
                                    {n.can_delete && (
                                        <button
                                            type="button"
                                            onClick={() => confirm('¿Quitar esta nota del muro?') && router.delete(`/amigos/posts/${n.id}`, { preserveScroll: true })}
                                            className="shrink-0 rounded p-0.5 hover:bg-black/10"
                                            aria-label="Quitar nota"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </footer>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
                    El muro está en blanco. Sé la primera nota.
                </p>
            )}
        </section>
    );
}

/* ---------------------------------------------------------- pozo de deseos */

function Well({ wishes, isOwner, canWish, openLimit, error }: { wishes: Wish[]; isOwner: boolean; canWish: boolean; openLimit: number; error?: string }) {
    const form = useForm({ body: '' });
    const [dropping, setDropping] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/amigos/deseos', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setDropping(true);
                setTimeout(() => setDropping(false), 1400);
            },
        });
    };

    return (
        <section className="space-y-4">
            <SectionTitle
                icon={<Sparkles className="h-5 w-5 text-pink-400" />}
                title="El pozo de los deseos"
                subtitle={
                    isOwner
                        ? 'Aquí ves los deseos de todos tus amigos. Concédelos cuando los cumplas (un servidor, una idea, lo que sea).'
                        : `Pide algo en privado: un servidor, una función nueva, una idea. Solo lo leéis tú y el Owner. Hasta ${openLimit} a la vez.`
                }
            />

            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                <div className="relative flex flex-col items-center justify-end overflow-hidden rounded-2xl border border-pink-500/30 bg-[radial-gradient(ellipse_at_bottom,#2a0a24_0%,#05060f_75%)] px-4 pt-6 pb-4">
                    <svg viewBox="0 0 200 150" className="w-48" aria-hidden>
                        <ellipse cx="100" cy="70" rx="70" ry="16" fill="#0b0b14" stroke={ROSE} strokeOpacity="0.6" />
                        <ellipse cx="100" cy="70" rx="58" ry="11" fill="#020617" className="friend-water" />
                        <path d="M30 70 V125 Q100 150 170 125 V70" fill="#111827" stroke={ROSE} strokeOpacity="0.5" />
                        <path d="M30 90 Q100 112 170 90 M30 108 Q100 130 170 108" stroke={ROSE} strokeOpacity="0.25" fill="none" />
                        {dropping && <circle cx="100" cy="0" r="5" fill="#facc15" className="friend-coin" />}
                    </svg>
                    {canWish && !isOwner ? (
                        <form onSubmit={submit} className="mt-3 w-full space-y-2">
                            <textarea
                                value={form.data.body}
                                onChange={(e) => form.setData('body', e.target.value)}
                                maxLength={280}
                                rows={3}
                                placeholder="Me gustaría..."
                                className="w-full resize-none rounded-md border border-pink-500/30 bg-black/60 px-3 py-2 text-sm text-white focus:border-pink-400 focus:outline-none"
                            />
                            {(form.errors.body || error) && <p className="text-xs text-red-400">{form.errors.body || error}</p>}
                            <button type="submit" disabled={form.processing || form.data.body.trim().length < 3} className="w-full rounded-md bg-pink-600 py-2 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50">
                                Lanzar moneda
                            </button>
                        </form>
                    ) : (
                        <p className="mt-3 text-center text-xs text-pink-200/70">{wishes.filter((w) => !w.granted_at).length} deseos esperando</p>
                    )}
                </div>

                <div className="space-y-3">
                    {wishes.length ? (
                        wishes.map((w) => <WishRow key={w.id} wish={w} isOwner={isOwner} />)
                    ) : (
                        <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
                            {isOwner ? 'Nadie ha pedido nada todavía.' : 'Aún no has pedido ningún deseo.'}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}

function WishRow({ wish, isOwner }: { wish: Wish; isOwner: boolean }) {
    const [replying, setReplying] = useState(false);
    const [reply, setReply] = useState(wish.reply ?? '');
    const granted = !!wish.granted_at;

    const setGranted = (value: boolean) =>
        router.patch(`/amigos/deseos/${wish.id}`, { granted: value, reply }, { preserveScroll: true, onSuccess: () => setReplying(false) });

    return (
        <article
            className={`relative overflow-hidden rounded-xl border p-4 ${
                granted ? 'border-amber-400/50 bg-amber-50 dark:bg-amber-400/5' : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950'
            }`}
        >
            {granted && <span className="friend-shooting pointer-events-none absolute top-3 -left-10 h-px w-24" />}
            <div className="flex items-start gap-3">
                {isOwner && <UserAvatar name={wish.author.name} src={wish.author.avatar} size={32} />}
                <div className="min-w-0 flex-1">
                    {isOwner && <p className="text-xs font-semibold text-sky-500">{wish.author.name}</p>}
                    <p className="text-sm break-words whitespace-pre-line text-neutral-800 dark:text-neutral-100">{wish.body}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                        {fmtShort(wish.at)}
                        {granted && <span className="ml-2 font-semibold text-amber-500">Concedido el {fmtShort(wish.granted_at!)}</span>}
                    </p>
                    {wish.reply && !replying && (
                        <p className="mt-2 rounded-md border-l-2 border-pink-400 bg-pink-500/5 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                            <span className="text-xs font-semibold text-pink-400">Owner: </span>
                            {wish.reply}
                        </p>
                    )}
                    {isOwner && replying && (
                        <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            maxLength={280}
                            rows={2}
                            placeholder="Respuesta opcional (la verá esa persona)"
                            className="mt-2 w-full resize-none rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm focus:border-pink-500 focus:outline-none dark:border-neutral-700 dark:text-white"
                        />
                    )}
                </div>
                <div className="flex shrink-0 gap-1">
                    {isOwner ? (
                        granted ? (
                            <IconBtn label="Volver a pendiente" onClick={() => setGranted(false)}>
                                <Undo2 className="h-4 w-4" />
                            </IconBtn>
                        ) : replying ? (
                            <IconBtn label="Conceder" onClick={() => setGranted(true)} className="text-amber-500">
                                <Check className="h-4 w-4" />
                            </IconBtn>
                        ) : (
                            <IconBtn label="Conceder deseo" onClick={() => setReplying(true)} className="text-amber-500">
                                <Sparkles className="h-4 w-4" />
                            </IconBtn>
                        )
                    ) : null}
                    {(isOwner || !granted) && (
                        <IconBtn label={isOwner ? 'Borrar deseo' : 'Retirar deseo'} onClick={() => confirm('¿Borrar este deseo?') && router.delete(`/amigos/posts/${wish.id}`, { preserveScroll: true })}>
                            <Trash2 className="h-4 w-4" />
                        </IconBtn>
                    )}
                </div>
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------ piezas */

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-1">{icon}</div>
            <div>
                <h2 className="font-[Orbitron] text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
            </div>
        </div>
    );
}

function IconBtn({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
    return (
        <button type="button" onClick={onClick} title={label} aria-label={label} className={`rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white ${className}`}>
            {children}
        </button>
    );
}

const CSS = `
.friend-gradient-text { background: linear-gradient(90deg, ${SKY}, ${ROSE}, ${SKY}); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; animation: friend-slide 6s linear infinite; }
@keyframes friend-slide { to { background-position: 200% center; } }

.friend-card-scene { perspective: 1200px; }
.friend-card { transform-style: preserve-3d; transition: transform .8s cubic-bezier(.2,.8,.2,1); }
.friend-card.is-flipped { transform: rotateY(180deg); }
.friend-card:hover:not(.is-flipped) { transform: rotateY(-8deg) rotateX(4deg); }
.friend-card-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.friend-card-back { transform: rotateY(180deg); }
.friend-holo { background: conic-gradient(from var(--friend-a, 0deg) at 30% 20%, #0ea5e9, #6366f1, #ec4899, #0ea5e9 60%, #22d3ee, #0ea5e9); animation: friend-spin 9s linear infinite; }
@property --friend-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes friend-spin { to { --friend-a: 360deg; } }
.friend-holo-shine { background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.35) 45%, transparent 60%); background-size: 250% 100%; animation: friend-shine 4.5s ease-in-out infinite; mix-blend-mode: overlay; }
@keyframes friend-shine { 0% { background-position: 120% 0; } 60%, 100% { background-position: -120% 0; } }
.friend-magstripe { background: repeating-linear-gradient(90deg, #111 0 6px, #1f1f1f 6px 9px); }
.friend-handwriting { font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive; }

.friend-twinkle { animation: friend-twinkle 4s ease-in-out infinite; }
@keyframes friend-twinkle { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
.friend-pulse { animation: friend-pulse 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes friend-pulse { 0%, 100% { transform: scale(.85); opacity: .8; } 50% { transform: scale(1.15); opacity: 1; } }
.friend-line { animation: friend-dash 30s linear infinite; }
@keyframes friend-dash { to { stroke-dashoffset: -400; } }
.friend-star-label { font-size: 14px; opacity: 0; transition: opacity .2s; pointer-events: none; }
.friend-star:hover .friend-star-label, .friend-star:focus .friend-star-label { opacity: 1; }
.friend-star:focus { outline: none; }

.friend-note { transition: transform .25s ease; }
.friend-note:hover { transform: rotate(0deg) scale(1.03) !important; z-index: 1; }

.friend-water { animation: friend-water 3s ease-in-out infinite; }
@keyframes friend-water { 0%, 100% { opacity: .9; } 50% { opacity: .6; } }
.friend-coin { animation: friend-drop 1.3s cubic-bezier(.5,0,.8,.6) forwards; }
@keyframes friend-drop { 0% { transform: translateY(0); opacity: 1; } 80% { transform: translateY(70px); opacity: 1; } 100% { transform: translateY(72px) scale(.2); opacity: 0; } }
.friend-shooting { background: linear-gradient(90deg, transparent, #fde68a, #fff); animation: friend-shoot 3.5s ease-in infinite; transform: rotate(-12deg); }
@keyframes friend-shoot { 0% { left: -6rem; opacity: 0; } 10% { opacity: 1; } 40%, 100% { left: 110%; opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .friend-holo, .friend-holo-shine, .friend-twinkle, .friend-pulse, .friend-line, .friend-gradient-text, .friend-shooting, .friend-water { animation: none !important; }
}
`;
