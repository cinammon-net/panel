import { cinLogo } from '@/lib/brand';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Award,
    Calendar,
    Clock,
    Eye,
    Globe,
    Heart,
    MessageSquare,
    Newspaper,
    PenTool,
    Pin,
    Plus,
    Radio,
    Share2,
    Shield,
    Sparkles,
    Star,
    Tag,
    TrendingUp,
    Volume2,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

interface Story {
    id: number;
    title: string;
    category?: string;
    summary?: string;
    content: string;
    picture?: string;
    is_pinned?: boolean;
    views_count?: number;
    likes_count?: number;
    liked?: boolean;
    author?: {
        id?: number;
        name?: string;
    };
    created_at?: string;
}

interface LetterToEditor {
    author: string;
    rating: number;
    comment: string;
    date?: string;
}

interface Classified {
    section: string;
    title: string;
    text: string;
    tag: string;
}

interface Props {
    leadStory?: Story | null;
    secondaryStories?: Story[];
    briefs?: Story[];
    allStories?: Story[];
    lettersToEditor?: LetterToEditor[];
    breakingNews?: string[];
    classifieds?: Classified[];
    canManage?: boolean;
    edition?: {
        number: number;
        date_formatted: string;
        weather: string;
        price: string;
    };
}

export default function NewsPaper({
    leadStory,
    secondaryStories = [],
    briefs = [],
    allStories = [],
    lettersToEditor = [],
    breakingNews = [],
    classifieds = [],
    canManage = false,
    edition = {
        number: 26,
        date_formatted: 'Viernes, 13 de Noviembre de 2026',
        weather: 'Red Operativa · Ping 8ms',
        price: 'Edición Abierta · 0,00 €',
    },
}: Props) {
    const [selectedCategory, setSelectedCategory] = useState<string>('todos');
    const [likeCounts, setLikeCounts] = useState<Record<number, { liked: boolean; count: number }>>({});
    const [paperTheme, setPaperTheme] = useState<'dark' | 'vintage'>('dark');

    const handleToggleLike = async (postId: number, initialLiked: boolean = false, initialCount: number = 0) => {
        const current = likeCounts[postId] ?? { liked: initialLiked, count: initialCount };
        const newLiked = !current.liked;
        const newCount = Math.max(0, current.count + (newLiked ? 1 : -1));

        setLikeCounts((prev) => ({
            ...prev,
            [postId]: { liked: newLiked, count: newCount },
        }));

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
            });
            if (res.ok) {
                const data = await res.json();
                setLikeCounts((prev) => ({
                    ...prev,
                    [postId]: { liked: data.liked, count: data.likes_count },
                }));
            }
        } catch {}
    };

    const getLikes = (post: Story) => {
        return likeCounts[post.id] ?? { liked: Boolean(post.liked), count: post.likes_count || 0 };
    };

    const formatCategoryName = (cat: string = 'actualizacion') => {
        const map: Record<string, string> = {
            actualizacion: 'Actualización Técnica',
            anuncio: 'Comunicado Oficial',
            mantenimiento: 'Infraestructura',
            evento: 'Evento & Comunidad',
            comunidad: 'Crónica Social',
            general: 'Información General',
        };
        return map[cat] || cat.toUpperCase();
    };

    const isVintage = paperTheme === 'vintage';

    return (
        <div
            className={`min-h-screen transition-colors duration-300 font-serif antialiased ${
                isVintage
                    ? 'bg-[#f4efe4] text-[#1c1813]'
                    : 'bg-[#09080b] text-[#eae5dc]'
            }`}
        >
            <Head title="El Diario de Cinammon — Periódico Oficial & Crónica Digital" />
            <Toaster position="top-center" richColors />

            {/* BARRA SUPERIOR DE CABECERA EDITORIAL */}
            <div
                className={`border-b text-[11px] font-mono tracking-wider transition-colors ${
                    isVintage
                        ? 'border-[#d4c9b5] bg-[#eae2d0] text-[#554b3c]'
                        : 'border-yellow-500/20 bg-neutral-950/90 text-neutral-400'
                }`}
            >
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-bold text-yellow-600 dark:text-yellow-400">
                            AÑO II · EDICIÓN Nº {edition.number}
                        </span>
                        <span className="hidden sm:inline">|</span>
                        <span className="capitalize">{edition.date_formatted}</span>
                        <span className="hidden md:inline">|</span>
                        <span className="hidden md:inline font-sans text-emerald-600 dark:text-emerald-400">
                            ● {edition.weather}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Selector de estilo de papel */}
                        <button
                            onClick={() => setPaperTheme(isVintage ? 'dark' : 'vintage')}
                            className={`rounded px-2 py-0.5 text-[10px] font-sans font-semibold border transition ${
                                isVintage
                                    ? 'border-[#b5a68c] bg-[#e2d7c0] text-[#2e261a]'
                                    : 'border-yellow-500/30 bg-neutral-900 text-yellow-400'
                            }`}
                            title="Cambiar entre papel periódico clásico y prensa nocturna"
                        >
                            {isVintage ? '🌙 Tinta Nocturna' : '📜 Papel Prensa'}
                        </button>

                        <a
                            href="https://cinammon.net"
                            className="hover:underline font-sans hidden sm:inline"
                        >
                            Web Principal
                        </a>
                        <a
                            href="https://panel.cinammon.net/dashboard"
                            className="rounded bg-yellow-600 dark:bg-yellow-500 px-2.5 py-0.5 font-sans font-bold text-black hover:opacity-90 transition text-[11px]"
                        >
                            Ir al Panel →
                        </a>
                    </div>
                </div>
            </div>

            {/* CONTENEDOR PRINCIPAL DEL PERIÓDICO */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
                {/* CABECERA PRINCIPAL — THE MASTHEAD (Estilo The New York Times / El País) */}
                <header className="text-center space-y-4">
                    {/* Doble línea superior de prensa */}
                    <div className={`border-t-2 border-b ${isVintage ? 'border-[#332a1e]' : 'border-yellow-500/40'} py-1`} />

                    <div className="py-2 sm:py-4">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <span className="h-[1px] w-12 sm:w-24 bg-yellow-600/50"></span>
                            <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-yellow-600 dark:text-yellow-400 font-bold">
                                LA VOZ INDEPENDIENTE DE LA INFRAESTRUCTURA & EL GAMING
                            </span>
                            <span className="h-[1px] w-12 sm:w-24 bg-yellow-600/50"></span>
                        </div>

                        {/* TÍTULO GIGANTE DE PRENSA */}
                        <h1 className="font-[Orbitron] text-3xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase text-black dark:text-white drop-shadow-sm">
                            EL DIARIO DE CINAMMON
                        </h1>

                        <p className={`mt-2 font-serif italic text-xs sm:text-sm max-w-2xl mx-auto ${isVintage ? 'text-[#5d5242]' : 'text-neutral-400'}`}>
                            «Crónica diaria, avisos técnicos, comunicados directivos y novedades del ecosistema de servidores y comunidad»
                        </p>
                    </div>

                    {/* Doble línea inferior de prensa con metadatos */}
                    <div className={`border-t border-b-2 ${isVintage ? 'border-[#332a1e]' : 'border-yellow-500/40'} py-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider`}>
                        <span>Precio: {edition.price}</span>
                        <span className="font-bold text-yellow-700 dark:text-yellow-400">
                            EDICIÓN DIGITAL VERIFICADA
                        </span>
                        <span>MADRID · SERVIDORES GLOBALES</span>
                    </div>
                </header>

                {/* TELETIPO DE NOTICIAS DE ÚLTIMA HORA (BREAKING NEWS TICKER) */}
                {breakingNews.length > 0 && (
                    <div
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs font-sans overflow-hidden ${
                            isVintage
                                ? 'border-[#cbbfa9] bg-[#e6ddca]'
                                : 'border-yellow-500/30 bg-yellow-950/20'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-0.5 font-bold uppercase text-[10px] text-white shrink-0 animate-pulse">
                            <Radio className="h-3 w-3" />
                            ÚLTIMA HORA
                        </span>
                        <div className="overflow-hidden whitespace-nowrap">
                            <div className="inline-block animate-marquee font-medium">
                                {breakingNews.map((news, i) => (
                                    <span key={i} className="mx-6">
                                        • {news}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* BARRA DE SECCIONES DEL PERIÓDICO */}
                <nav
                    className={`flex items-center gap-1 sm:gap-2 overflow-x-auto border-y py-2 text-xs font-sans font-bold uppercase tracking-wider scrollbar-none ${
                        isVintage
                            ? 'border-[#d0c4ae] text-[#4d4233]'
                            : 'border-neutral-800 text-neutral-300'
                    }`}
                >
                    {[
                        { id: 'todos', label: '📰 Portada' },
                        { id: 'actualizacion', label: '🚀 Actualizaciones' },
                        { id: 'anuncio', label: '📢 Comunicados' },
                        { id: 'mantenimiento', label: '🔧 Infraestructura' },
                        { id: 'evento', label: '🎁 Eventos & Promos' },
                        { id: 'comunidad', label: '👥 Comunidad' },
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`rounded-md px-3 py-1.5 transition whitespace-nowrap ${
                                selectedCategory === cat.id
                                    ? isVintage
                                        ? 'bg-[#2b2216] text-[#f4efe4]'
                                        : 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                                    : 'hover:opacity-80'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}

                    {canManage && (
                        <a
                            href="https://panel.cinammon.net/posts"
                            className="ml-auto inline-flex items-center gap-1.5 rounded bg-yellow-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-yellow-500 transition"
                        >
                            <Plus className="h-3.5 w-3.5" /> Redactar Noticia
                        </a>
                    )}
                </nav>

                {/* PORTADA EN COLUMNAS DE PRENSA (THE BROADSHEET) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* COLUMNA PRINCIPAL — LA NOTICIA DE PORTADA (LEAD STORY) (Cols 1-8) */}
                    <main className="lg:col-span-8 space-y-8">
                        {leadStory ? (
                            <article className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                                    <span className="inline-flex items-center gap-1 rounded border border-current px-2 py-0.5 text-[10px]">
                                        <Sparkles className="h-2.5 w-2.5" />
                                        {formatCategoryName(leadStory.category)}
                                    </span>
                                    {leadStory.is_pinned && (
                                        <span className="font-bold flex items-center gap-1">
                                            <Pin className="h-3 w-3 fill-current" /> TEMA DEL DÍA
                                        </span>
                                    )}
                                </div>

                                {/* GRAN TITULAR EDITORIAL */}
                                <h2 className="font-[Orbitron,serif] text-2xl sm:text-4xl md:text-5xl font-black leading-[1.1] tracking-tight uppercase hover:text-yellow-600 dark:hover:text-yellow-400 transition cursor-pointer">
                                    <Link href={`/articulo/${leadStory.id}`}>
                                        {leadStory.title}
                                    </Link>
                                </h2>

                                {/* SUBTÍTULO / BAJADA DE NOTICIA */}
                                {leadStory.summary && (
                                    <p
                                        className={`font-serif italic text-base sm:text-lg leading-relaxed ${
                                            isVintage ? 'text-[#483e30]' : 'text-neutral-300'
                                        }`}
                                    >
                                        «{leadStory.summary}»
                                    </p>
                                )}

                                {/* FIRMA DE PRENSA & METADATOS */}
                                <div
                                    className={`border-y py-2 text-xs font-mono flex items-center justify-between ${
                                        isVintage ? 'border-[#d8ccb8] text-[#5e5343]' : 'border-neutral-800 text-neutral-400'
                                    }`}
                                >
                                    <span>
                                        POR <strong className="uppercase">{leadStory.author?.name || 'Redacción Cinammon'}</strong> · ENVIADO ESPECIAL
                                    </span>
                                    <span>
                                        {new Date(leadStory.created_at || '').toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </span>
                                </div>

                                {/* FOTOGRAFÍA PRINCIPAL CON PIE DE FOTO EDITORIAL */}
                                {leadStory.picture && (
                                    <figure className="space-y-2">
                                        <div
                                            className={`overflow-hidden border p-1 ${
                                                isVintage ? 'border-[#c7b9a2] bg-[#ebe2cf]' : 'border-neutral-800 bg-neutral-950'
                                            }`}
                                        >
                                            <img
                                                src={leadStory.picture}
                                                alt={leadStory.title}
                                                className="w-full h-72 sm:h-96 object-cover"
                                            />
                                        </div>
                                        <figcaption
                                            className={`text-[11px] font-sans italic text-right ${
                                                isVintage ? 'text-[#6e6250]' : 'text-neutral-500'
                                            }`}
                                        >
                                            Fotoperiodismo Cinammon · Instantánea oficial de infraestructura y despliegue en tiempo real.
                                        </figcaption>
                                    </figure>
                                )}

                                {/* CUERPO DEL ARTÍCULO MAQUETADO CON LETRA CAPITULAR (DROP CAP) */}
                                <div
                                    className={`prose max-w-none text-sm sm:text-base leading-relaxed font-serif space-y-4 text-justify ${
                                        isVintage ? 'text-[#2b2317]' : 'text-[#ded7cc]'
                                    }`}
                                >
                                    {/* Párrafo con Drop Cap en la primera letra */}
                                    <p className="first-letter:float-left first-letter:text-5xl sm:first-letter:text-6xl first-letter:pr-3 first-letter:font-black first-letter:font-[Orbitron] first-letter:text-yellow-600 dark:first-letter:text-yellow-400 first-letter:leading-none">
                                        {leadStory.content.split('\n')[0]}
                                    </p>

                                    {/* Resto del contenido */}
                                    {leadStory.content.split('\n').slice(1, 4).map((paragraph, idx) => (
                                        paragraph.trim() && (
                                            <p key={idx}>{paragraph}</p>
                                        )
                                    ))}
                                </div>

                                {/* BARRA DE ACCIONES DEL ARTÍCULO */}
                                <div
                                    className={`pt-4 border-t flex items-center justify-between gap-4 font-sans text-xs ${
                                        isVintage ? 'border-[#d8ccb8]' : 'border-neutral-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={`/articulo/${leadStory.id}`}
                                            className="inline-flex items-center gap-1.5 font-bold text-yellow-700 dark:text-yellow-400 hover:underline text-sm"
                                        >
                                            Continuar leyendo la noticia completa <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Botón de like de prensa */}
                                        <button
                                            onClick={() => {
                                                const l = getLikes(leadStory);
                                                handleToggleLike(leadStory.id, l.liked, l.count);
                                            }}
                                            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold transition ${
                                                getLikes(leadStory).liked
                                                    ? 'bg-rose-500/20 text-rose-600 border border-rose-500/40'
                                                    : 'border border-current/20 hover:text-rose-500'
                                            }`}
                                        >
                                            <Heart className={`h-3.5 w-3.5 ${getLikes(leadStory).liked ? 'fill-current' : ''}`} />
                                            <span>{getLikes(leadStory).count}</span>
                                        </button>

                                        <span className="font-mono text-neutral-500 text-[11px]">
                                            {leadStory.views_count || 0} lecturas
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ) : (
                            <div className="border border-dashed p-12 text-center text-neutral-500 font-mono">
                                No hay noticias de portada registradas en la edición de hoy.
                            </div>
                        )}

                        {/* SEGUNDA PLANA — CRÓNICAS SECUNDARIAS (COLUMNAS DE 2) */}
                        {secondaryStories.length > 0 && (
                            <div className={`pt-8 border-t-2 ${isVintage ? 'border-[#332a1e]' : 'border-neutral-800'}`}>
                                <h3 className="font-[Orbitron] text-xs uppercase tracking-[0.2em] font-black text-yellow-600 dark:text-yellow-400 mb-6 flex items-center gap-2">
                                    <Newspaper className="h-4 w-4" />
                                    INFORMACIONES DE SEGUNDA PLANA
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {secondaryStories.map((story) => (
                                        <article
                                            key={story.id}
                                            className={`p-4 border flex flex-col justify-between ${
                                                isVintage ? 'border-[#d3c6af] bg-[#ede5d3]' : 'border-neutral-800/80 bg-black/40'
                                            }`}
                                        >
                                            {story.picture && (
                                                <div className="h-40 w-full overflow-hidden mb-3 border border-current/20">
                                                    <img
                                                        src={story.picture}
                                                        alt={story.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <span className="font-mono text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-400">
                                                    {formatCategoryName(story.category)}
                                                </span>

                                                <h4 className="font-[Orbitron] font-bold text-base mt-1 line-clamp-2 hover:text-yellow-500 transition">
                                                    <Link href={`/articulo/${story.id}`}>
                                                        {story.title}
                                                    </Link>
                                                </h4>

                                                <p className="font-serif text-xs leading-relaxed mt-2 line-clamp-3 text-neutral-600 dark:text-neutral-400">
                                                    {story.summary || story.content}
                                                </p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-current/10 flex items-center justify-between text-[11px] font-mono">
                                                <span>
                                                    {new Date(story.created_at || '').toLocaleDateString('es-ES', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                    })}
                                                </span>
                                                <Link
                                                    href={`/articulo/${story.id}`}
                                                    className="font-bold text-yellow-600 dark:text-yellow-400 hover:underline"
                                                >
                                                    Leer artículo →
                                                </Link>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* COLUMNA LATERAL DE PRENSA — LO MÁS LEÍDO & CARTAS (Cols 9-12) */}
                    <aside className={`lg:col-span-4 lg:border-l lg:pl-8 space-y-8 ${isVintage ? 'border-[#d0c3ab]' : 'border-neutral-800'}`}>
                        {/* SECCIÓN: LO MÁS LEÍDO (RANKING NUMERADO) */}
                        <div
                            className={`p-5 border ${
                                isVintage ? 'border-[#cfc2aa] bg-[#ede5d3]' : 'border-neutral-800 bg-neutral-950/60'
                            }`}
                        >
                            <h3 className="font-[Orbitron] text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400 pb-3 border-b border-current/20 flex items-center justify-between">
                                <span>LO MÁS LEÍDO</span>
                                <TrendingUp className="h-4 w-4" />
                            </h3>

                            <div className="divide-y divide-current/10">
                                {allStories.slice(0, 5).map((post, index) => (
                                    <div key={post.id} className="py-3 flex items-start gap-3">
                                        <span className="font-[Orbitron] text-2xl font-black text-yellow-600/70 dark:text-yellow-500/70 shrink-0 leading-none">
                                            0{index + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <span className="text-[10px] font-mono uppercase text-neutral-500">
                                                {formatCategoryName(post.category)}
                                            </span>
                                            <h4 className="font-serif font-bold text-xs leading-snug line-clamp-2 hover:text-yellow-600 dark:hover:text-yellow-400 transition cursor-pointer">
                                                <Link href={`/articulo/${post.id}`}>
                                                    {post.title}
                                                </Link>
                                            </h4>
                                            <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                                                {post.likes_count || 0} recomendaciones · {post.views_count || 0} lecturas
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SECCIÓN: EDITORIAL DE LA DIRECCIÓN */}
                        <div
                            className={`p-5 border ${
                                isVintage ? 'border-[#bcae96] bg-[#e4dac5]' : 'border-yellow-500/30 bg-yellow-950/10'
                            }`}
                        >
                            <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-yellow-700 dark:text-yellow-400 mb-2">
                                EDITORIAL
                            </h4>
                            <p className="font-serif italic text-sm leading-relaxed text-justify">
                                «Cinammon Network no es solo una plataforma de hosting; es una comunidad construida para que cualquier creador o comunidad pueda desplegar su mundo sin barreras técnicas ni económicas.»
                            </p>
                            <div className="mt-3 text-right text-xs font-mono font-bold">
                                — Consejo Editorial de Cinammon
                            </div>
                        </div>

                        {/* SECCIÓN: CARTAS AL DIRECTOR (OPINIÓN DE LA COMUNIDAD) */}
                        {lettersToEditor.length > 0 && (
                            <div
                                className={`p-5 border ${
                                    isVintage ? 'border-[#cfc2aa] bg-[#ede5d3]' : 'border-neutral-800 bg-neutral-950/60'
                                }`}
                            >
                                <h3 className="font-[Orbitron] text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400 pb-3 border-b border-current/20 flex items-center justify-between">
                                    <span>CARTAS AL DIRECTOR</span>
                                    <MessageSquare className="h-4 w-4" />
                                </h3>

                                <div className="space-y-4 mt-4">
                                    {lettersToEditor.map((letter, i) => (
                                        <blockquote
                                            key={i}
                                            className="border-l-2 border-yellow-600/50 pl-3 space-y-1 text-xs font-serif"
                                        >
                                            <div className="flex items-center gap-1 text-amber-500">
                                                {Array.from({ length: letter.rating }).map((_, s) => (
                                                    <Star key={s} className="h-3 w-3 fill-amber-500" />
                                                ))}
                                            </div>
                                            <p className="italic text-neutral-600 dark:text-neutral-300">
                                                «{letter.comment}»
                                            </p>
                                            <footer className="font-mono text-[10px] text-neutral-500">
                                                — {letter.author} ({letter.date || 'Reciente'})
                                            </footer>
                                        </blockquote>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN: ANUNCIOS CLASIFICADOS DE ÉPOCA */}
                        <div
                            className={`p-5 border ${
                                isVintage ? 'border-[#cfc2aa] bg-[#ede5d3]' : 'border-neutral-800 bg-neutral-950/60'
                            }`}
                        >
                            <h3 className="font-[Orbitron] text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400 pb-3 border-b border-current/20">
                                ANUNCIOS POR PALABRAS & CLASIFICADOS
                            </h3>

                            <div className="space-y-3 mt-3 divide-y divide-current/10">
                                {classifieds.map((ad, i) => (
                                    <div key={i} className="pt-2.5 text-xs font-sans">
                                        <div className="flex items-center justify-between font-mono text-[10px] text-yellow-700 dark:text-yellow-400 font-bold mb-0.5">
                                            <span>[{ad.section}]</span>
                                            <span className="rounded bg-black/10 dark:bg-yellow-500/10 px-1.5 py-0.2">
                                                {ad.tag}
                                            </span>
                                        </div>
                                        <strong className="font-serif block text-sm">{ad.title}</strong>
                                        <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-tight mt-0.5">
                                            {ad.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>

                {/* PIE DE IMPRENTA EDITORIAL (THE NEWSPAPER COLOPHON) */}
                <footer
                    className={`mt-16 pt-8 border-t-2 border-b text-center space-y-4 font-mono text-xs ${
                        isVintage ? 'border-[#332a1e] text-[#594d3c]' : 'border-yellow-500/40 text-neutral-400'
                    }`}
                >
                    <div className="flex items-center justify-center gap-4 text-sm font-bold uppercase tracking-widest font-[Orbitron]">
                        <span>Cinammon Network</span>
                        <span>·</span>
                        <span>Diario Digital</span>
                        <span>·</span>
                        <span>Edición General</span>
                    </div>

                    <p className="max-w-3xl mx-auto text-[11px] leading-relaxed">
                        Publicación periódica digital editada por Cinammon Network. Todos los derechos reservados. Redacción central e infraestructura Anycast protegida en tiempo real.
                    </p>

                    <div className="flex flex-wrap justify-center gap-6 text-[11px] font-sans pt-2 pb-4">
                        <a href="https://cinammon.net" className="hover:underline">Inicio</a>
                        <a href="https://panel.cinammon.net" className="hover:underline">Panel de Control</a>
                        <a href="https://status.cinammon.net" className="hover:underline">Estado en Vivo</a>
                        <a href="https://cinammon.net/terms" className="hover:underline">Términos de Servicio</a>
                        <a href="https://cinammon.net/privacy" className="hover:underline">Privacidad</a>
                        <a href="https://discord.gg/cinammon" className="hover:underline">Discord Oficial</a>
                    </div>
                </footer>
            </div>
        </div>
    );
}
