import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Eye,
    Heart,
    Newspaper,
    Printer,
    Share2,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

interface ArticleData {
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
        name?: string;
    };
    created_at?: string;
}

interface RelatedStory {
    id: number;
    title: string;
    category?: string;
    summary?: string;
    picture?: string;
    created_at?: string;
}

interface Props {
    article: ArticleData;
    related?: RelatedStory[];
    canManage?: boolean;
    edition?: {
        date_formatted: string;
    };
}

export default function NewsPaperArticle({
    article,
    related = [],
    canManage = false,
    edition = {
        date_formatted: 'Viernes, 13 de Noviembre de 2026',
    },
}: Props) {
    const [likes, setLikes] = useState({
        liked: Boolean(article.liked),
        count: article.likes_count || 0,
    });
    const [paperTheme, setPaperTheme] = useState<'dark' | 'vintage'>('dark');

    const isVintage = paperTheme === 'vintage';

    const handleToggleLike = async () => {
        const newLiked = !likes.liked;
        const newCount = Math.max(0, likes.count + (newLiked ? 1 : -1));
        setLikes({ liked: newLiked, count: newCount });

        try {
            const csrfToken =
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/posts/${article.id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
            });
            if (res.ok) {
                const data = await res.json();
                setLikes({ liked: data.liked, count: data.likes_count });
            }
        } catch {}
    };

    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href).then(() => {
                toast.success('Enlace del artículo copiado al portapapeles');
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const words = article.content.trim().split(/\s+/).length;
    const readMinutes = Math.max(1, Math.ceil(words / 180));

    return (
        <div
            className={`min-h-screen transition-colors duration-300 font-serif antialiased ${
                isVintage
                    ? 'bg-[#f4efe4] text-[#1c1813]'
                    : 'bg-[#09080b] text-[#eae5dc]'
            }`}
        >
            <Head title={`${article.title} — El Diario de Cinammon`} />
            <Toaster position="top-center" richColors />

            {/* BARRA SUPERIOR EDITORIAL */}
            <div
                className={`border-b text-xs font-mono tracking-wider py-2.5 px-4 sm:px-6 transition-colors print:hidden ${
                    isVintage
                        ? 'border-[#d4c9b5] bg-[#eae2d0] text-[#554b3c]'
                        : 'border-yellow-500/20 bg-neutral-950/90 text-neutral-400'
                }`}
            >
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 font-sans font-bold hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Volver a la Portada del Periódico</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setPaperTheme(isVintage ? 'dark' : 'vintage')}
                            className="text-[11px] font-sans underline"
                        >
                            {isVintage ? 'Tinta Nocturna' : 'Papel Prensa'}
                        </button>
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1 font-sans text-[11px] hover:underline"
                            title="Imprimir artículo"
                        >
                            <Printer className="h-3.5 w-3.5" /> Imprimir
                        </button>
                    </div>
                </div>
            </div>

            {/* ARTÍCULO DE PRENSA */}
            <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
                {/* CABECERA DE NOTICIA */}
                <header className="space-y-4">
                    <div className={`flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider ${isVintage ? 'text-yellow-700' : 'text-yellow-400'}`}>
                        <span className="border-b-2 border-current pb-0.5">
                            {article.category || 'ACTUALIDAD'}
                        </span>
                        <span>·</span>
                        <span>EDICIÓN DIGITAL</span>
                    </div>

                    {/* TITULAR PRINCIPAL */}
                    <h1 className={`font-[Orbitron,serif] text-3xl sm:text-5xl font-black leading-[1.1] tracking-tight uppercase ${isVintage ? 'text-[#1c1813]' : 'text-white'}`}>
                        {article.title}
                    </h1>

                    {/* SUBTÍTULO / ENTRADILLA EN CURSIVA */}
                    {article.summary && (
                        <p
                            className={`font-serif italic text-lg sm:text-xl leading-relaxed ${
                                isVintage ? 'text-[#483e30]' : 'text-neutral-300'
                            }`}
                        >
                            «{article.summary}»
                        </p>
                    )}

                    {/* BYLINE / FIRMA DE REDACCIÓN */}
                    <div
                        className={`border-y py-3 text-xs font-mono flex flex-wrap items-center justify-between gap-3 ${
                            isVintage ? 'border-[#d8ccb8] text-[#5e5343]' : 'border-neutral-800 text-neutral-400'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span>
                                POR <strong className="uppercase">{article.author?.name || 'Redacción Cinammon'}</strong>
                            </span>
                            <span>·</span>
                            <span>MADRID</span>
                        </div>

                        <div className="flex items-center gap-4 text-[11px]">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {readMinutes} min de lectura
                            </span>
                            <span>
                                {new Date(article.created_at || '').toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </span>
                        </div>
                    </div>
                </header>

                {/* FOTOGRAFÍA CON PIE DE FOTO */}
                {article.picture && (
                    <figure className="space-y-2">
                        <div
                            className={`overflow-hidden rounded-lg border p-1 shadow-2xl ${
                                isVintage ? 'border-[#c7b9a2] bg-[#ebe2cf]' : 'border-neutral-800 bg-black/60'
                            }`}
                        >
                            <img
                                src={article.picture}
                                alt={article.title}
                                className="w-full max-h-[500px] object-cover object-top rounded"
                            />
                        </div>
                        <figcaption
                            className={`text-xs font-sans italic text-right ${
                                isVintage ? 'text-[#6e6250]' : 'text-neutral-500'
                            }`}
                        >
                            Archivo Gráfico Cinammon Network · Documento de la red en producción.
                        </figcaption>
                    </figure>
                )}

                {/* CUERPO DEL ARTÍCULO EDITORIAL */}
                <div
                    className={`prose max-w-none text-base sm:text-lg leading-relaxed font-serif space-y-6 text-justify ${
                        isVintage ? 'text-[#241c10]' : 'text-[#ded7cc]'
                    }`}
                >
                    {/* Primer párrafo con Drop Cap (Letra Capitular grande de prensa) */}
                    <p className={`first-letter:float-left first-letter:text-6xl first-letter:pr-3.5 first-letter:font-black first-letter:font-[Orbitron] ${isVintage ? 'first-letter:text-yellow-700' : 'first-letter:text-yellow-400'} first-letter:leading-none`}>
                        {article.content.split('\n')[0]}
                    </p>

                    {/* Párrafos restantes */}
                    {article.content.split('\n').slice(1).map((p, i) => (
                        p.trim() && <p key={i}>{p}</p>
                    ))}
                </div>

                {/* BARRA INFERIOR DE ACCIONES & REACCIONES */}
                <div
                    className={`pt-6 border-t flex flex-wrap items-center justify-between gap-4 font-sans text-xs print:hidden ${
                        isVintage ? 'border-[#d8ccb8]' : 'border-neutral-800'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleToggleLike}
                            className={`inline-flex items-center gap-2 rounded px-4 py-2 font-bold transition text-xs ${
                                likes.liked
                                    ? 'bg-rose-500/20 text-rose-600 border border-rose-500/40 shadow-sm'
                                    : 'border border-current/20 hover:text-rose-500'
                            }`}
                        >
                            <Heart className={`h-4 w-4 ${likes.liked ? 'fill-current' : ''}`} />
                            <span>{likes.count}</span>
                            <span>Me gusta</span>
                        </button>

                        <button
                            onClick={handleShare}
                            className="inline-flex items-center gap-1.5 rounded border border-current/20 px-3.5 py-2 font-semibold hover:border-yellow-500 transition"
                        >
                            <Share2 className="h-4 w-4" />
                            <span>Compartir</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 text-neutral-500 font-mono text-xs">
                        <span>{article.views_count || 0} lecturas</span>
                        <span>·</span>
                        <Link href="/" className={`font-bold hover:underline ${isVintage ? 'text-yellow-700' : 'text-yellow-400'}`}>
                            Volver al periódico →
                        </Link>
                    </div>
                </div>

                {/* OTRAS NOTICIAS RELACIONADAS */}
                {related.length > 0 && (
                    <section
                        className={`pt-10 border-t-2 space-y-6 print:hidden ${
                            isVintage ? 'border-[#332a1e]' : 'border-neutral-800'
                        }`}
                    >
                        <h3 className={`font-[Orbitron] text-xs font-black uppercase tracking-[0.2em] ${isVintage ? 'text-yellow-700' : 'text-yellow-400'}`}>
                            MÁS NOTICIAS DE LA EDICIÓN DE HOY
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {related.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/articulo/${item.id}`}
                                    className={`p-4 border flex gap-3 items-center group transition ${
                                        isVintage ? 'border-[#d3c6af] bg-[#ede5d3] hover:border-[#332a1e]' : 'border-neutral-800/80 bg-black/40 hover:border-yellow-500/40'
                                    }`}
                                >
                                    {item.picture && (
                                        <img
                                            src={item.picture}
                                            alt={item.title}
                                            className="h-16 w-16 object-cover shrink-0 border border-current/20"
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <span className={`text-[10px] font-mono uppercase font-bold ${isVintage ? 'text-yellow-700' : 'text-yellow-400'}`}>
                                            {item.category || 'ACTUALIDAD'}
                                        </span>
                                        <h4 className="font-serif font-bold text-xs line-clamp-2 group-hover:text-yellow-500 transition">
                                            {item.title}
                                        </h4>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
