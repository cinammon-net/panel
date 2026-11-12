import STEPS from '@/data/guide-steps.json';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { BookOpen, Clock, ExternalLink, Play, PlayCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/*
 * Guías en vídeo. Cada vídeo está grabado en el panel real (cuenta "Tutorial") y resume
 * la guía escrita del foro #guias de Discord, que es la versión completa.
 * Los archivos viven en public/videos/guias/<key>.mp4 (+ .jpg como portada).
 */

const GUILD = '1190032384096206909';
const V = 1;

interface Guide {
    key: string;
    tag: string;
    title: string;
    text: string;
    duration: string;
    /** Hilo del foro #guias de Discord; sin hilo no sale el botón de «guía completa». */
    thread?: string;
    video?: string;
    poster?: string;
    /** Solo la ven quienes tienen alguno de estos roles (el Owner las ve todas). */
    roles?: string[];
    /** Versión propia de sus archivos (sube cuando se rehacen el vídeo o las fotos). */
    v?: number;
}

const GUIDES: Guide[] = [
    {
        key: 'start',
        tag: 'Empieza aquí',
        title: 'Primeros pasos: tu primer servidor',
        text: 'Dónde está cada cosa en el panel: tu lista de servidores, la consola, encender y apagar, y los datos para conectarte.',
        duration: '0:42',
        thread: '1570174592377557092',
    },
    {
        key: 'buy',
        tag: 'Empieza aquí',
        title: 'Cómo comprar desde Discord',
        text: 'Elegir plan, ciclo y nombre con el bot de Discord y pagar la factura, sin salir del servidor.',
        duration: '0:48',
        thread: '1570456346942382151',
        video: 'https://billing.cinammon.net/discord/tutorial-comprar.mp4?v=1',
    },
    {
        key: 'mc-optimize',
        tag: 'Minecraft',
        title: 'Minecraft: versión, Java y quitar el lag',
        text: 'Cambiar la versión y la imagen de Java del servidor y ajustar lo básico para que vaya fluido.',
        duration: '0:43',
        thread: '1570141423322406962',
    },
    {
        key: 'mc-addons',
        tag: 'Minecraft',
        title: 'Minecraft: plugins y mods sin romper nada',
        text: 'Instalar plugins y mods desde el panel, en qué carpeta va cada cosa y cómo volver atrás.',
        duration: '0:35',
        thread: '1570174598803234969',
    },
    {
        key: 'bots',
        tag: 'Bots',
        title: 'Bots de Discord, WhatsApp o Telegram 24/7',
        text: 'Subir el código de tu bot, poner el token en las variables y dejarlo encendido todo el día.',
        duration: '0:37',
        thread: '1570141424643608686',
    },
    {
        key: 'domains',
        tag: 'Web y Dominios',
        title: 'Tu dominio propio con Cloudflare',
        text: 'Conectar play.tudominio.com a tu servidor con los registros DNS que te da el panel.',
        duration: '0:26',
        thread: '1570141425918672959',
    },
    {
        key: 'databases',
        tag: 'Bases de Datos',
        title: 'Bases de datos MySQL / MariaDB',
        text: 'Crear una base de datos para tus plugins o tu bot y dónde ver el usuario, la contraseña y el host.',
        duration: '0:26',
        thread: '1570141427772686480',
    },
    {
        key: 'files',
        tag: 'Archivos y copias',
        title: 'Archivos por SFTP y copias de seguridad',
        text: 'El gestor de archivos, los datos de SFTP y cómo hacer y restaurar una copia de seguridad.',
        duration: '0:26',
        thread: '1570174612371808326',
    },
    {
        key: 'sftp-filezilla',
        tag: 'Archivos y copias',
        title: 'Tus archivos con FileZilla, paso a paso',
        text: 'Generar la contraseña SFTP, descargar la configuración del panel e importarla en FileZilla para conectarte sin escribir nada.',
        duration: '1:14',
        thread: '1570566419471663315',
        v: 2,
    },
    {
        key: 'team',
        tag: 'Empieza aquí',
        title: 'Dar acceso a tu equipo',
        text: 'Invitar a otra persona a tu servidor con solo los permisos que necesita, sin darle tu contraseña.',
        duration: '0:27',
        thread: '1570174613722501144',
    },
    {
        key: 'amigos',
        tag: 'Amigos',
        title: 'Rincón de Amigos: tu servidor gratis, el muro y los deseos',
        text: 'Todo lo que puedes hacer con el rol Amigo de Cinammon: crear tu servidor de amigo, dejar notas en el muro y pedir deseos.',
        duration: '0:40',
        roles: ['Amigo de Cinammon'],
        v: 2,
    },
];

const videoOf = (g: Guide) => g.video ?? `/videos/guias/${g.key}.mp4?v=${g.v ?? V}`;
const posterOf = (g: Guide) => g.poster ?? `/videos/guias/${g.key}.jpg?v=${g.v ?? V}`;
const stepImg = (g: Guide, n: number) =>
    g.key === 'buy' ? `https://billing.cinammon.net/discord/comprar-${n}.png?v=1` : `/videos/guias/pasos/${g.key}-${n}.jpg?v=${g.v ?? V}`;
const threadOf = (g: Guide) => `https://discord.com/channels/${GUILD}/${g.thread}`;

const TAG_COLOR: Record<string, string> = {
    'Empieza aquí': 'bg-pink-500/15 text-pink-400 ring-pink-500/30',
    Minecraft: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    Bots: 'bg-violet-500/15 text-violet-400 ring-violet-500/30',
    'Web y Dominios': 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
    'Bases de Datos': 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    'Archivos y copias': 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
    Amigos: 'bg-sky-500/15 text-sky-300 ring-sky-400/40',
};

function Tag({ name }: { name: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${TAG_COLOR[name] ?? 'bg-neutral-500/15 text-neutral-400 ring-neutral-500/30'}`}
        >
            {name}
        </span>
    );
}

export default function Guides() {
    const { discordInvite, auth } = usePage<{ discordInvite?: string; auth?: { user?: { roles?: string[] } | null } }>().props;
    const myRoles = auth?.user?.roles ?? [];
    const guides = GUIDES.filter((g) => !g.roles || myRoles.includes('Owner') || g.roles.some((r) => myRoles.includes(r)));
    const initial = () => {
        const k = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
        return guides.find((g) => g.key === k) ?? guides[0];
    };
    const [current, setCurrent] = useState<Guide>(initial);
    const player = useRef<HTMLVideoElement>(null);
    const top = useRef<HTMLDivElement>(null);

    const [zoom, setZoom] = useState<string | null>(null);
    const steps = (STEPS as Record<string, { title: string; text: string }[]>)[current.key] ?? [];

    const pick = (g: Guide) => {
        setCurrent(g);
        window.history.replaceState(null, '', `#${g.key}`);
        top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        const v = player.current;
        if (!v) return;
        v.load();
        if (window.location.hash) v.play().catch(() => {});
    }, [current.key]);

    return (
        <AppLayout breadcrumbs={[{ title: 'Guías en vídeo', href: '/guias' }]}>
            <Head title="Guías en vídeo" />

            <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6">
                <header className="flex flex-col gap-2">
                    <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-emerald-400 uppercase">
                        <PlayCircle className="h-4 w-4" />
                        Aprende a usar Cinammon
                    </p>
                    <h1 className="font-[Orbitron] text-3xl font-bold text-neutral-900 sm:text-4xl dark:text-white">Guías en vídeo</h1>
                    <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
                        Vídeos cortos grabados en este mismo panel. Cada uno tiene su guía escrita, más detallada, en el canal #guías de nuestro
                        Discord.
                    </p>
                </header>

                <section ref={top} className="grid scroll-mt-20 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-lg dark:border-white/10">
                        <video
                            ref={player}
                            className="aspect-video w-full bg-black"
                            controls
                            playsInline
                            preload="metadata"
                            poster={posterOf(current)}
                        >
                            <source src={videoOf(current)} type="video/mp4" />
                        </video>
                    </div>

                    <aside className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-neutral-900/60">
                        <div className="flex items-center gap-2">
                            <Tag name={current.tag} />
                            {current.duration && (
                                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    {current.duration}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg leading-snug font-semibold text-neutral-900 dark:text-white">{current.title}</h2>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{current.text}</p>
                        <div className="mt-auto flex flex-col gap-2">
                            {current.thread ? (
                                <a
                                    href={threadOf(current)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                                >
                                    <BookOpen className="h-4 w-4" />
                                    Leer la guía completa
                                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                                </a>
                            ) : (
                                <p className="text-xs text-neutral-500">La guía completa es el paso a paso de aquí abajo.</p>
                            )}
                            {current.thread && discordInvite && (
                                <a
                                    href={discordInvite}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-center text-xs text-neutral-500 underline-offset-2 hover:underline"
                                >
                                    ¿Aún no estás en el Discord? Únete aquí
                                </a>
                            )}
                        </div>
                    </aside>
                </section>

                {steps.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="font-[Orbitron] text-xl font-bold text-neutral-900 dark:text-white">Paso a paso con fotos</h2>
                        <ol className="grid gap-5 md:grid-cols-2">
                            {steps.map((s, i) => (
                                <li
                                    key={`${current.key}-${i}`}
                                    className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900/60"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setZoom(stepImg(current, i + 1))}
                                        className="block bg-neutral-900"
                                        title="Ver en grande"
                                    >
                                        <img
                                            src={stepImg(current, i + 1)}
                                            alt={`Paso ${i + 1}: ${s.title}`}
                                            loading="lazy"
                                            className="aspect-video w-full object-cover"
                                        />
                                    </button>
                                    <div className="flex gap-3 p-4">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
                                            {i + 1}
                                        </span>
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{s.title}</h3>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{s.text}</p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                <h2 className="font-[Orbitron] text-xl font-bold text-neutral-900 dark:text-white">Todas las guías</h2>
                <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {guides.map((g) => {
                        const active = g.key === current.key;
                        return (
                            <button
                                key={g.key}
                                type="button"
                                onClick={() => pick(g)}
                                className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition ${
                                    active
                                        ? 'border-emerald-400/70 ring-2 ring-emerald-400/40'
                                        : 'border-neutral-200 hover:-translate-y-0.5 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/25'
                                } bg-white dark:bg-neutral-900/60`}
                            >
                                <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
                                    <img
                                        src={posterOf(g)}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-neutral-900 opacity-0 shadow-lg transition group-hover:opacity-100">
                                            <Play className="ml-0.5 h-5 w-5 fill-current" />
                                        </span>
                                    </span>
                                    {g.duration && (
                                        <span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                                            {g.duration}
                                        </span>
                                    )}
                                    {active && (
                                        <span className="absolute top-2 left-2 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                                            Viendo
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col gap-2 p-4">
                                    <Tag name={g.tag} />
                                    <h3 className="text-sm leading-snug font-semibold text-neutral-900 dark:text-white">{g.title}</h3>
                                    <p className="line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">{g.text}</p>
                                </div>
                            </button>
                        );
                    })}
                </section>
            </div>

            {zoom && (
                <button
                    type="button"
                    onClick={() => setZoom(null)}
                    className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
                    aria-label="Cerrar"
                >
                    <img src={zoom} alt="" className="max-h-full max-w-full rounded-lg shadow-2xl" />
                </button>
            )}
        </AppLayout>
    );
}
