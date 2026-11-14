import AppLayout from '@/layouts/app-layout';
import { cinLogo } from '@/lib/brand';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    BookOpenCheck,
    Clock,
    Database,
    ExternalLink,
    FileCode,
    Globe,
    Layers,
    Play,
    PlayCircle,
    Search,
    Server,
    ShieldCheck,
    Sparkles,
    Terminal,
    Video,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import STEPS_DATA_RAW from '@/data/guide-steps.json';

const STEPS_DATA: Record<string, { title: string; text: string }[]> = STEPS_DATA_RAW as any;
const GUILD = '1190032384096206909';

interface Guide {
    key: string;
    tag: string;
    title: string;
    text: string;
    duration: string;
    thread?: string;
    video?: string;
    poster?: string;
    roles?: string[];
    v?: number;
}

const ALL_GUIDES: Guide[] = [
    {
        key: 'start',
        tag: 'Empieza aquí',
        title: 'Primeros pasos: tu primer servidor',
        text: 'Un recorrido por todo el panel: la consola, archivos, jugadores, plugins, SFTP, bases de datos, copias, dominios, usuarios y cómo controlar tu servidor desde Discord.',
        duration: '1:37',
        thread: '1570174592377557092',
        v: 2,
    },
    {
        key: 'gratis',
        tag: 'Empieza aquí',
        title: 'Tu servidor gratis con monedas',
        text: 'Ganar monedas con la racha diaria, misiones e invitaciones, crear tu servidor gratis eligiendo recursos y renovarlo antes de que caduque.',
        duration: '0:57',
        thread: '1570619956721356800',
    },
    {
        key: 'buy',
        tag: 'Empieza aquí',
        title: 'Cómo comprar desde Discord y Tienda',
        text: 'Elegir plan, ciclo y nombre con el bot de Discord o la tienda web y pagar la factura para entrega automática en el nodo.',
        duration: '0:48',
        thread: '1570456346942382151',
        video: 'https://billing.cinammon.net/discord/tutorial-comprar.mp4?v=1',
    },
    {
        key: 'mc-optimize',
        tag: 'Minecraft',
        title: 'Minecraft: versión, Java 21 y quitar el lag',
        text: 'Cambiar la versión y la imagen de Java del servidor en el selector Docker y ajustar lo básico para mantener 20 TPS sostenidos.',
        duration: '0:43',
        thread: '1570141423322406962',
    },
    {
        key: 'mc-addons',
        tag: 'Minecraft',
        title: 'Minecraft: plugins y mods sin romper nada',
        text: 'Instalar plugins y mods desde el panel con Modrinth en un clic, en qué carpeta va cada cosa y cómo crear respaldos antes de actualizar.',
        duration: '0:35',
        thread: '1570174598803234969',
    },
    {
        key: 'bots',
        tag: 'Bots & Web',
        title: 'Bots de Discord, WhatsApp o Telegram 24/7',
        text: 'Subir el código de tu bot en Node.js, poner el token en las variables de entorno seguras y dejarlo encendido todo el día con autoreinicio.',
        duration: '0:37',
        thread: '1570141424643608686',
    },
    {
        key: 'domains',
        tag: 'Web & Dominios',
        title: 'Tu dominio propio con Cloudflare',
        text: 'Conectar play.tudominio.com a tu servidor con los registros DNS A y SRV que te genera el panel automáticamente.',
        duration: '0:26',
        thread: '1570141425918672959',
    },
    {
        key: 'databases',
        tag: 'Bases de Datos',
        title: 'Bases de datos MySQL / MariaDB 11.4',
        text: 'Crear una base de datos para tus plugins o tu bot, acceso directo a phpMyAdmin y credenciales seguras.',
        duration: '0:26',
        thread: '1570141427772686480',
    },
    {
        key: 'files',
        tag: 'Archivos & SFTP',
        title: 'Archivos por SFTP y copias de seguridad',
        text: 'El gestor de archivos, editor de sintaxis, datos de SFTP y cómo hacer y restaurar una copia de seguridad en segundos.',
        duration: '0:26',
        thread: '1570174612371808326',
    },
    {
        key: 'sftp-filezilla',
        tag: 'Archivos & SFTP',
        title: 'Tus archivos con FileZilla en el puerto 2022',
        text: 'Generar la contraseña SFTP, descargar la configuración del panel e importarla en FileZilla para conectarte sin escribir nada.',
        duration: '1:14',
        thread: '1570566419471663315',
        v: 2,
    },
    {
        key: 'dudas',
        tag: 'Comunidad & Soporte',
        title: 'Dudas y cómo abrir tickets de soporte',
        text: 'Buscar respuestas en las dudas de la comunidad o abrir un ticket privado con el equipo técnico para atención en vivo.',
        duration: '0:44',
        thread: '1570174620131495946',
    },
    {
        key: 'amigos',
        tag: 'Comunidad & Soporte',
        title: 'Rincón de Amigos y servidores compartidos',
        text: 'Invitar a tus amigos con su usuario o correo para que gestionen tu servidor contigo con permisos seguros y sin compartir contraseñas.',
        duration: '0:38',
        thread: '1570141432428367912',
    },
    {
        key: 'team',
        tag: 'Comunidad & Soporte',
        title: 'Subusuarios y roles de equipo',
        text: 'Añadir colaboradores con permisos específicos de consola, archivos o bases de datos, con auditoría de actividad completa.',
        duration: '0:31',
        thread: '1570141431107059732',
    },
];

function videoOf(g: Guide): string {
    if (g.video) return g.video;
    const v = g.v ?? 1;
    return `/videos/guias/${g.key}.mp4?v=${v}`;
}

function posterOf(g: Guide): string {
    if (g.poster) return g.poster;
    const v = g.v ?? 1;
    return `/videos/guias/${g.key}.jpg?v=${v}`;
}

function TagBadge({ name }: { name: string }) {
    const color =
        name === 'Empieza aquí'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
            : name === 'Minecraft'
              ? 'border-lime-500/40 bg-lime-500/10 text-lime-400'
              : name === 'Bots & Web'
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                : name === 'Web & Dominios'
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                  : name === 'Bases de Datos'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : name === 'Archivos & SFTP'
                      ? 'border-pink-500/40 bg-pink-500/10 text-pink-400'
                      : 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-400';

    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${color}`}>
            {name}
        </span>
    );
}

interface GuidesProps {
    currentSlug?: string;
}

export default function Guides({ currentSlug }: GuidesProps) {
    const page = usePage();
    const { auth } = page.props as any;
    const user = auth?.user;
    const userRoles: string[] = user?.roles ?? [];
    const isOwner = userRoles.includes('Owner');

    // Filtrar guías por rol si aplica
    const availableGuides = ALL_GUIDES.filter((g) => {
        if (!g.roles || g.roles.length === 0 || isOwner) return true;
        return g.roles.some((r) => userRoles.includes(r));
    });

    const [current, setCurrent] = useState<Guide>(() => {
        const found = availableGuides.find((g) => g.key === currentSlug);
        return found || availableGuides[0];
    });

    const [search, setSearch] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('Todos');
    const [zoom, setZoom] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Si viene hash o slug en la URL
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            const match = availableGuides.find((g) => g.key === hash);
            if (match) setCurrent(match);
        }
    }, []);

    const pick = (g: Guide) => {
        setCurrent(g);
        window.history.replaceState(null, '', `#${g.key}`);
        if (videoRef.current) {
            videoRef.current.load();
            videoRef.current.play().catch(() => {});
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const tags = ['Todos', ...Array.from(new Set(availableGuides.map((g) => g.tag)))];

    const filtered = availableGuides.filter((g) => {
        const matchesTag = selectedTag === 'Todos' || g.tag === selectedTag;
        const matchesSearch =
            search.trim() === '' ||
            g.title.toLowerCase().includes(search.toLowerCase()) ||
            g.text.toLowerCase().includes(search.toLowerCase()) ||
            g.tag.toLowerCase().includes(search.toLowerCase());
        return matchesTag && matchesSearch;
    });

    const steps = STEPS_DATA[current.key] ?? [];

    const content = (
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
            {/* Encabezado */}
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1 text-xs font-semibold text-pink-400">
                        <BookOpenCheck className="h-3.5 w-3.5" />
                        <span>GUÍAS OFICIALES & TUTORIALES</span>
                    </div>
                    <h1 className="mt-3 font-orbitron text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                        Centro de Soporte & Tutoriales
                    </h1>
                    <p className="mt-1.5 text-xs text-neutral-400 sm:text-sm">
                        Vídeos paso a paso grabados en el panel real y manuales técnicos para configurar y exprimir tus servidores al máximo.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href="https://discord.gg/U5EaDJerhZ"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-pink-500/40 bg-pink-600/20 px-4 py-2 font-orbitron text-xs font-bold uppercase tracking-wider text-pink-300 transition hover:bg-pink-600/30 hover:text-white"
                    >
                        <span>Discord Soporte</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>

            {/* Reproductor Destacado de la Guía Actual */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/90 to-neutral-950 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
                    {/* Vídeo */}
                    <div className="lg:col-span-7">
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
                            <video
                                ref={videoRef}
                                key={current.key}
                                controls
                                playsInline
                                poster={posterOf(current)}
                                preload="metadata"
                                className="h-full w-full object-contain"
                            >
                                <source src={videoOf(current)} type="video/mp4" />
                                Tu navegador no soporta reproducción de vídeo HTML5.
                            </video>
                        </div>
                    </div>

                    {/* Ficha informativa */}
                    <div className="flex flex-col justify-between space-y-4 lg:col-span-5">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <TagBadge name={current.tag} />
                                {current.duration && (
                                    <span className="inline-flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                                        <Clock className="h-3 w-3 text-pink-400" />
                                        {current.duration}
                                    </span>
                                )}
                            </div>

                            <h2 className="font-orbitron text-xl font-bold text-white sm:text-2xl">
                                {current.title}
                            </h2>

                            <p className="text-xs leading-relaxed text-neutral-300 sm:text-sm">
                                {current.text}
                            </p>
                        </div>

                        <div className="border-t border-white/10 pt-4 space-y-2.5">
                            {current.thread && (
                                <a
                                    href={`https://discord.com/channels/${GUILD}/${current.thread}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-neutral-200 transition hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-white"
                                >
                                    <span>Ver hilo completo en #guias de Discord</span>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            )}

                            {user ? (
                                <Link
                                    href="/servers"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30 transition hover:bg-pink-500"
                                >
                                    <Server className="h-3.5 w-3.5" />
                                    <span>Aplicar en mis servidores</span>
                                </Link>
                            ) : (
                                <Link
                                    href="/login"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-600/30 transition hover:bg-pink-500"
                                >
                                    <span>Iniciar sesión en el panel</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Pasos Detallados con Capturas si existen */}
            {steps.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-500/20 font-mono text-xs font-bold text-pink-400">
                            {steps.length}
                        </span>
                        <h3 className="font-orbitron text-lg font-bold text-white uppercase tracking-tight">
                            Paso a paso ilustrado
                        </h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {steps.map((s, i) => {
                            const stepImg = `/videos/guias/pasos/${current.key}-${i + 1}.jpg`;
                            return (
                                <div
                                    key={i}
                                    className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-900/60 backdrop-blur-md transition hover:border-white/20"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setZoom(stepImg)}
                                        className="group relative aspect-video w-full overflow-hidden bg-black/50"
                                    >
                                        <img
                                            src={stepImg}
                                            alt={s.title}
                                            loading="lazy"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                        />
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                                            <span className="rounded-lg bg-black/80 px-2.5 py-1 text-xs font-semibold text-white">
                                                Ampliar captura
                                            </span>
                                        </span>
                                    </button>

                                    <div className="flex flex-1 gap-3 p-4">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-pink-500/20 font-mono text-xs font-bold text-pink-400 border border-pink-500/30">
                                            {i + 1}
                                        </span>
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-bold text-white">{s.title}</h4>
                                            <p className="text-[11px] leading-relaxed text-neutral-400">{s.text}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Catálogo Completo de Todas las Guías */}
            <section className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="font-orbitron text-lg font-bold text-white uppercase tracking-tight">
                            Catálogo completo de guías ({filtered.length})
                        </h3>
                        <p className="text-xs text-neutral-400">Selecciona cualquier tutorial para reproducirlo y leer su paso a paso.</p>
                    </div>

                    {/* Buscador */}
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar tutorial..."
                            className="w-full rounded-xl border border-white/10 bg-neutral-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                    </div>
                </div>

                {/* Filtro por Categorías */}
                <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedTag(t)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                selectedTag === t
                                    ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                                    : 'border border-white/5 bg-neutral-900/50 text-neutral-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Grid de Tarjetas de Guías */}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((g) => {
                        const active = g.key === current.key;
                        return (
                            <button
                                key={g.key}
                                type="button"
                                onClick={() => pick(g)}
                                className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition ${
                                    active
                                        ? 'border-pink-500 bg-pink-950/20 ring-2 ring-pink-500/40'
                                        : 'border-white/10 bg-neutral-900/60 hover:-translate-y-0.5 hover:border-pink-500/40 hover:bg-neutral-900'
                                }`}
                            >
                                <div className="relative aspect-video w-full overflow-hidden bg-black">
                                    <img
                                        src={posterOf(g)}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-600 text-white opacity-0 shadow-xl transition duration-200 group-hover:opacity-100 group-hover:scale-110">
                                            <Play className="ml-0.5 h-4 w-4 fill-current" />
                                        </span>
                                    </span>
                                    {g.duration && (
                                        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-md">
                                            {g.duration}
                                        </span>
                                    )}
                                    {active && (
                                        <span className="absolute top-2 left-2 rounded-md bg-pink-600 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                                            Reproduciendo
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col gap-2 p-4">
                                    <TagBadge name={g.tag} />
                                    <h4 className="font-orbitron text-xs font-bold leading-snug text-white transition group-hover:text-pink-300 line-clamp-2">
                                        {g.title}
                                    </h4>
                                    <p className="text-[11px] leading-relaxed text-neutral-400 line-clamp-2">
                                        {g.text}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Modal de Zoom de Captura */}
            {zoom && (
                <div
                    onClick={() => setZoom(null)}
                    className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90 p-4 backdrop-blur-md"
                >
                    <div className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setZoom(null)}
                            className="absolute top-3 right-3 z-10 rounded-full bg-black/70 p-2 text-white transition hover:bg-pink-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <img src={zoom} alt="Captura ampliada" className="max-h-[85vh] w-auto object-contain" />
                    </div>
                </div>
            )}
        </div>
    );

    // Si el usuario está autenticado, renderizar DENTRO del layout del panel
    if (user) {
        return (
            <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Guías & Tutoriales', href: '/guias' }]}>
                <Head title="Guías & Tutoriales Oficiales — Cinammon Panel" />
                {content}
            </AppLayout>
        );
    }

    // Si el usuario es un visitante no autenticado, renderizar en el layout público de cinammon.net
    return (
        <div className="min-h-screen bg-[#090a0f] text-neutral-100 font-sans selection:bg-pink-500 selection:text-white">
            <Head title="Guías & Tutoriales Oficiales — Cinammon Network" />

            {/* Cabecera pública para visitantes */}
            <header className="sticky top-0 z-40 border-b border-white/5 bg-[#090a0f]/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
                        <img src={cinLogo()} alt="Cinammon Logo" className="h-7 w-7 object-contain" />
                        <span className="font-orbitron text-sm font-bold tracking-wider text-white">
                            CINAMMON<span className="text-pink-500">.NET</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-3 text-xs">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-neutral-300 transition hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-white"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Volver a la portada</span>
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600 px-3.5 py-1.5 font-semibold text-white transition hover:bg-pink-500"
                        >
                            <span>Iniciar sesión</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main>{content}</main>
        </div>
    );
}
