import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowBigDown,
    ArrowBigUp,
    CheckCircle2,
    Clock,
    Compass,
    ExternalLink,
    Filter,
    Flame,
    Lightbulb,
    MessageSquare,
    Plus,
    Search,
    ShieldAlert,
    Sparkles,
    Tag,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface SuggestionItem {
    id: number;
    title: string;
    what: string;
    why?: string | null;
    category: string;
    category_label: string;
    status: 'pending' | 'review' | 'accepted' | 'done' | 'rejected';
    status_meta: {
        label: string;
        color: string;
        open: boolean;
        tag: string;
    };
    staff_note?: string | null;
    upvotes: number;
    downvotes: number;
    score: number;
    author: {
        name: string;
        avatar?: string | null;
    };
    is_author: boolean;
    my_vote?: 1 | -1 | null;
    discord_thread_id?: string | null;
    created_at?: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props {
    suggestions: {
        data: SuggestionItem[];
        links: PaginationLink[];
        total: number;
    };
    filters: {
        q: string;
        categoria: string;
        ver: string;
        orden: string;
    };
    categories: Record<string, string>;
    statuses: Record<string, { label: string; color: string; open: boolean; tag: string }>;
    isStaff: boolean;
    stats: {
        total: number;
        open: number;
        review: number;
        accepted: number;
        done: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sugerencias', href: '/sugerencias' }];

export default function SuggestionsIndex({ suggestions, filters, categories, statuses, isStaff, stats }: Props) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [reviewingItem, setReviewingItem] = useState<SuggestionItem | null>(null);
    const [searchState, setSearchState] = useState(filters);
    const [similar, setSimilar] = useState<{ id: number; title: string; status: string; status_label: string; score: number }[]>([]);

    const createForm = useForm({
        title: '',
        what: '',
        why: '',
        category: 'panel',
    });

    const statusForm = useForm({
        status: 'review',
        staff_note: '',
    });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    useEffect(() => {
        setSearchState(filters);
    }, [filters]);

    // Búsqueda en vivo de sugerencias similares mientras escribe el título
    useEffect(() => {
        setSimilar([]);
        const query = createForm.data.title.trim();
        if (!isCreateOpen || query.length < 4) return;

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`/sugerencias/parecidas?q=${encodeURIComponent(query)}`, {
                signal: controller.signal,
                headers: { Accept: 'application/json' },
            })
                .then((res) => (res.ok ? res.json() : []))
                .then(setSimilar)
                .catch(() => {});
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [isCreateOpen, createForm.data.title]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/sugerencias', searchState, { preserveState: true, preserveScroll: true });
    };

    const handleFilterChange = (key: keyof typeof searchState, value: string) => {
        const next = { ...searchState, [key]: value };
        setSearchState(next);
        router.get('/sugerencias', next, { preserveState: true, preserveScroll: true });
    };

    const handleVote = (suggestion: SuggestionItem, direction: 1 | -1) => {
        if (suggestion.is_author) {
            toast.error('Es tu propia sugerencia: tu apoyo ya se da por hecho.');
            return;
        }
        if (!suggestion.status_meta.open) {
            toast.error('Esta sugerencia ya está cerrada.');
            return;
        }

        router.post(
            `/sugerencias/${suggestion.id}/voto`,
            { direction },
            {
                preserveScroll: true,
                onSuccess: () => {
                    // feedback visual suave
                },
            }
        );
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/sugerencias', {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setIsCreateOpen(false);
            },
        });
    };

    const openReviewModal = (item: SuggestionItem) => {
        setReviewingItem(item);
        statusForm.setData({
            status: item.status,
            staff_note: item.staff_note || '',
        });
    };

    const handleStatusSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewingItem) return;

        statusForm.patch(`/sugerencias/${reviewingItem.id}/estado`, {
            preserveScroll: true,
            onSuccess: () => {
                setReviewingItem(null);
            },
        });
    };

    const getStatusBadge = (status: SuggestionItem['status']) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600 bg-zinc-900/70 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        Pendiente
                    </span>
                );
            case 'review':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/50 bg-sky-950/60 px-2.5 py-0.5 text-xs font-semibold text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.2)]">
                        <Compass className="h-3 w-3 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} />
                        En estudio
                    </span>
                );
            case 'accepted':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/60 bg-emerald-950/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        Aceptada
                    </span>
                );
            case 'done':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/70 bg-purple-950/70 px-2.5 py-0.5 text-xs font-semibold text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.45)]">
                        <Sparkles className="h-3 w-3 text-purple-300" />
                        Implementada
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-600/50 bg-amber-950/50 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                        <ShieldAlert className="h-3 w-3 text-amber-400" />
                        Descartada
                    </span>
                );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sugerencias de la Comunidad — Cinammon" />

            <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6 font-sans">
                {/* Cabecera futurista Orbitron */}
                <header className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-neutral-950 via-[#16120d] to-neutral-950 p-6 md:p-8 shadow-2xl">
                    <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-yellow-500/10 blur-3xl" />
                    <div className="absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-pink-500/10 blur-2xl" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-yellow-400 uppercase">
                                <Lightbulb className="h-3.5 w-3.5" />
                                Feedback & Roadmap
                            </div>
                            <h1 className="mt-2 font-[Orbitron] text-2xl md:text-3xl font-bold tracking-wide text-white drop-shadow-[0_0_12px_rgba(250,204,21,0.25)]">
                                SUGERENCIAS DE LA COMUNIDAD
                            </h1>
                            <p className="mt-2 text-sm text-neutral-300 max-w-2xl leading-relaxed">
                                Decide con el equipo qué novedades se añaden a Cinammon: servidores, eggs, funciones del panel, tienda o Discord.
                                ¡Vota las ideas que más te gusten!
                            </p>
                        </div>

                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400 bg-gradient-to-r from-yellow-500 to-amber-500 px-5 py-3 text-sm font-bold text-black shadow-[0_0_20px_rgba(234,179,8,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(234,179,8,0.5)] active:scale-95"
                        >
                            <Plus className="h-4 w-4 stroke-[3]" />
                            Proponer una idea
                        </button>
                    </div>

                    {/* Contadores rápidos de estadísticas */}
                    <div className="mt-6 pt-5 border-t border-yellow-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="rounded-lg border border-neutral-800 bg-black/40 p-2.5">
                            <span className="text-xl font-bold text-white font-[Orbitron]">{stats.total}</span>
                            <p className="text-xs text-neutral-400">Total ideas</p>
                        </div>
                        <div className="rounded-lg border border-sky-500/20 bg-sky-950/20 p-2.5">
                            <span className="text-xl font-bold text-sky-400 font-[Orbitron]">{stats.review}</span>
                            <p className="text-xs text-sky-300/80">En estudio</p>
                        </div>
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5">
                            <span className="text-xl font-bold text-emerald-400 font-[Orbitron]">{stats.accepted}</span>
                            <p className="text-xs text-emerald-300/80">Aceptadas</p>
                        </div>
                        <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-2.5">
                            <span className="text-xl font-bold text-purple-400 font-[Orbitron]">{stats.done}</span>
                            <p className="text-xs text-purple-300/80">Implementadas</p>
                        </div>
                    </div>
                </header>

                {/* Filtros, Categorías y Búsqueda */}
                <div className="space-y-3">
                    {/* Barra de pestañas de estado */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-2">
                        {[
                            { key: 'todas', label: 'Todas las ideas' },
                            { key: 'abiertas', label: 'Abiertas para votar' },
                            { key: 'review', label: 'En estudio' },
                            { key: 'accepted', label: 'Aceptadas' },
                            { key: 'done', label: 'Implementadas' },
                            { key: 'rejected', label: 'Descartadas' },
                        ].map((tab) => {
                            const active = searchState.ver === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => handleFilterChange('ver', tab.key)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        active
                                            ? 'border border-yellow-500/50 bg-yellow-500/20 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.2)]'
                                            : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Filtros secundarios: Categoría, Orden y Buscador */}
                    <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                            <input
                                type="text"
                                value={searchState.q}
                                onChange={(e) => setSearchState({ ...searchState, q: e.target.value })}
                                placeholder="Buscar en sugerencias…"
                                className="w-full rounded-xl border border-neutral-800 bg-neutral-950/80 py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={searchState.categoria}
                                onChange={(e) => handleFilterChange('categoria', e.target.value)}
                                className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-xs font-medium text-neutral-200 transition focus:border-yellow-500 focus:outline-none"
                            >
                                <option value="">Todas las categorías</option>
                                {Object.entries(categories).map(([k, label]) => (
                                    <option key={k} value={k}>
                                        {label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={searchState.orden}
                                onChange={(e) => handleFilterChange('orden', e.target.value)}
                                className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-xs font-medium text-neutral-200 transition focus:border-yellow-500 focus:outline-none"
                            >
                                <option value="populares">Más populares (apoyo)</option>
                                <option value="recientes">Más recientes</option>
                                <option value="mas-apoyadas">Mayor votos a favor</option>
                            </select>

                            <button
                                type="submit"
                                className="rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                            >
                                Buscar
                            </button>
                        </div>
                    </form>
                </div>

                {/* Lista de Sugerencias */}
                <div className="space-y-4">
                    {suggestions.data.map((item) => {
                        const votedUp = item.my_vote === 1;
                        const votedDown = item.my_vote === -1;
                        const isOpen = item.status_meta.open;

                        return (
                            <article
                                key={item.id}
                                className="group relative rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-5 transition-all hover:border-yellow-500/40 hover:bg-neutral-950 hover:shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Widget de Votación */}
                                    <div className="flex flex-col items-center rounded-xl border border-neutral-800 bg-black/60 p-1.5 shadow-inner">
                                        <button
                                            type="button"
                                            disabled={item.is_author || !isOpen}
                                            onClick={() => handleVote(item, 1)}
                                            title={
                                                item.is_author
                                                    ? 'Tu propia idea'
                                                    : !isOpen
                                                    ? 'Cerrada'
                                                    : votedUp
                                                    ? 'Quitar voto a favor'
                                                    : 'Votar a favor'
                                            }
                                            className={`rounded-lg p-1.5 transition-all ${
                                                votedUp
                                                    ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                                    : 'text-neutral-500 hover:bg-neutral-800 hover:text-emerald-400 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500'
                                            }`}
                                        >
                                            <ArrowBigUp className={`h-6 w-6 ${votedUp ? 'fill-emerald-400' : ''}`} />
                                        </button>

                                        <span
                                            className={`my-0.5 text-sm font-extrabold font-[Orbitron] ${
                                                item.score > 0
                                                    ? 'text-emerald-400'
                                                    : item.score < 0
                                                    ? 'text-rose-400'
                                                    : 'text-neutral-400'
                                            }`}
                                        >
                                            {item.score > 0 ? `+${item.score}` : item.score}
                                        </span>

                                        <button
                                            type="button"
                                            disabled={item.is_author || !isOpen}
                                            onClick={() => handleVote(item, -1)}
                                            title={
                                                item.is_author
                                                    ? 'Tu propia idea'
                                                    : !isOpen
                                                    ? 'Cerrada'
                                                    : votedDown
                                                    ? 'Quitar voto en contra'
                                                    : 'Votar en contra'
                                            }
                                            className={`rounded-lg p-1.5 transition-all ${
                                                votedDown
                                                    ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                                    : 'text-neutral-500 hover:bg-neutral-800 hover:text-rose-400 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500'
                                            }`}
                                        >
                                            <ArrowBigDown className={`h-6 w-6 ${votedDown ? 'fill-rose-400' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Contenido principal de la sugerencia */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {getStatusBadge(item.status)}
                                                <span className="inline-flex items-center gap-1 rounded-md border border-neutral-700/60 bg-neutral-900/60 px-2 py-0.5 text-xs font-medium text-neutral-300">
                                                    <Tag className="h-3 w-3 text-yellow-500" />
                                                    {item.category_label}
                                                </span>
                                            </div>

                                            {/* Acciones de Staff o enlaces externos */}
                                            <div className="flex items-center gap-2">
                                                {item.discord_thread_id && (
                                                    <a
                                                        href={`https://discord.com/channels/1190032384096206909/${item.discord_thread_id}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-sky-400"
                                                        title="Ver hilo en Discord"
                                                    >
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                        #sugerencias
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}

                                                {isStaff && (
                                                    <button
                                                        onClick={() => openReviewModal(item)}
                                                        className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/20"
                                                    >
                                                        Gestionar estado
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                                            {item.title}
                                        </h2>

                                        <div className="space-y-1.5 text-sm text-neutral-300 leading-relaxed">
                                            <p className="whitespace-pre-line">{item.what}</p>
                                            {item.why && (
                                                <p className="text-xs text-neutral-400 italic">
                                                    <strong className="text-neutral-300 not-italic">Motivo:</strong> {item.why}
                                                </p>
                                            )}
                                        </div>

                                        {/* Nota del Equipo / Staff */}
                                        {item.staff_note && (
                                            <div className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-3 text-xs text-yellow-200">
                                                <strong className="font-semibold text-yellow-400 block mb-1">
                                                    Nota del equipo Cinammon
                                                </strong>
                                                <p className="whitespace-pre-line leading-relaxed">{item.staff_note}</p>
                                            </div>
                                        )}

                                        {/* Metadatos de autoría y fecha */}
                                        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-neutral-500">
                                            <div className="flex items-center gap-1.5 text-neutral-400">
                                                {item.author.avatar ? (
                                                    <img
                                                        src={item.author.avatar}
                                                        alt={item.author.name}
                                                        className="h-4 w-4 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-4 w-4 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] flex items-center justify-center font-bold">
                                                        {item.author.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span>{item.author.name}</span>
                                            </div>
                                            <span>·</span>
                                            <span>
                                                {item.created_at
                                                    ? new Date(item.created_at).toLocaleDateString('es-ES', {
                                                          day: '2-digit',
                                                          month: 'short',
                                                          year: 'numeric',
                                                      })
                                                    : 'Reciente'}
                                            </span>
                                            <span>·</span>
                                            <span>{item.upvotes} a favor</span>
                                            <span>·</span>
                                            <span>{item.downvotes} en contra</span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}

                    {suggestions.data.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-12 text-center">
                            <Lightbulb className="mx-auto h-10 w-10 text-neutral-600 mb-3" />
                            <h3 className="text-base font-semibold text-neutral-300">No hay sugerencias con estos filtros</h3>
                            <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
                                ¿Tienes una idea en mente para mejorar Cinammon? ¡Sé el primero en proponerla!
                            </p>
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="mt-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/20 transition"
                            >
                                Proponer idea ahora
                            </button>
                        </div>
                    )}
                </div>

                {/* Paginación */}
                {suggestions.links && suggestions.links.length > 3 && (
                    <nav className="flex flex-wrap items-center justify-center gap-2 pt-4">
                        {suggestions.links.map((link, idx) => {
                            const cleanLabel = link.label
                                .replace(/&laquo;/g, '«')
                                .replace(/&raquo;/g, '»')
                                .replace(/<[^>]*>/g, '');
                            return link.url ? (
                                <Link
                                    key={idx}
                                    href={link.url}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                        link.active
                                            ? 'border border-yellow-500/50 bg-yellow-500/20 text-yellow-300'
                                            : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                                    }`}
                                >
                                    {cleanLabel}
                                </Link>
                            ) : (
                                <span
                                    key={idx}
                                    className="rounded-lg border border-neutral-900 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-600 cursor-not-allowed"
                                >
                                    {cleanLabel}
                                </span>
                            );
                        })}
                    </nav>
                )}

                {/* Modal para proponer una nueva idea */}
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="relative w-full max-w-lg rounded-2xl border border-yellow-500/40 bg-neutral-950 p-6 shadow-2xl">
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="absolute right-4 top-4 text-neutral-400 hover:text-white transition"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="flex items-center gap-2 text-yellow-400 font-[Orbitron] text-lg font-bold">
                                <Lightbulb className="h-5 w-5" />
                                PROPONER UNA IDEA
                            </div>
                            <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                                Tu sugerencia se publicará en el panel y se sincronizará automáticamente en el canal <strong>#sugerencias</strong> de Discord para que la comunidad pueda votarla.
                            </p>

                            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4 text-sm">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                                        La idea en una frase (título) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        minLength={8}
                                        maxLength={90}
                                        value={createForm.data.title}
                                        onChange={(e) => createForm.setData('title', e.target.value)}
                                        placeholder="Ej: Añadir egg para servidores de Terraria tModLoader"
                                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-white placeholder-neutral-500 focus:border-yellow-500 focus:outline-none"
                                    />
                                    {createForm.errors.title && (
                                        <p className="mt-1 text-xs text-rose-400">{createForm.errors.title}</p>
                                    )}

                                    {/* Alerta si ya existen sugerencias parecidas */}
                                    {similar.length > 0 && (
                                        <div className="mt-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
                                            <p className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1.5">
                                                <Flame className="h-3.5 w-3.5" />
                                                Quizá ya se propuso esta idea:
                                            </p>
                                            <div className="space-y-1">
                                                {similar.map((s) => (
                                                    <div key={s.id} className="flex items-center justify-between gap-2">
                                                        <span className="truncate">{s.title}</span>
                                                        <span className="text-[11px] font-bold text-amber-300 font-[Orbitron] shrink-0">
                                                            {s.score >= 0 ? `+${s.score}` : s.score} pts
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="mt-2 text-[11px] text-amber-300/80">
                                                Si ya existe, te recomendamos buscarla y votarla para concentrar el apoyo.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Categoría *</label>
                                    <select
                                        value={createForm.data.category}
                                        onChange={(e) => createForm.setData('category', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-white focus:border-yellow-500 focus:outline-none"
                                    >
                                        {Object.entries(categories).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    {createForm.errors.category && (
                                        <p className="mt-1 text-xs text-rose-400">{createForm.errors.category}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                                        ¿Qué quieres exactamente? *
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        minLength={15}
                                        maxLength={1500}
                                        value={createForm.data.what}
                                        onChange={(e) => createForm.setData('what', e.target.value)}
                                        placeholder="Explica detalladamente la función, juego o mejora que propones..."
                                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-white placeholder-neutral-500 focus:border-yellow-500 focus:outline-none resize-none"
                                    />
                                    {createForm.errors.what && (
                                        <p className="mt-1 text-xs text-rose-400">{createForm.errors.what}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                                        ¿Por qué te vendría bien? (opcional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        maxLength={800}
                                        value={createForm.data.why}
                                        onChange={(e) => createForm.setData('why', e.target.value)}
                                        placeholder="Beneficio para tu comunidad, proyecto o para los demás usuarios..."
                                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-white placeholder-neutral-500 focus:border-yellow-500 focus:outline-none resize-none"
                                    />
                                    {createForm.errors.why && (
                                        <p className="mt-1 text-xs text-rose-400">{createForm.errors.why}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="rounded-xl border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createForm.processing}
                                        className="rounded-xl border border-yellow-500 bg-gradient-to-r from-yellow-500 to-amber-500 px-5 py-2 text-xs font-bold text-black shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:opacity-95 disabled:opacity-50"
                                    >
                                        {createForm.processing ? 'Publicando…' : 'Publicar sugerencia'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal de gestión de Staff (Cambiar Estado y Nota) */}
                {reviewingItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="relative w-full max-w-md rounded-2xl border border-yellow-500/40 bg-neutral-950 p-6 shadow-2xl">
                            <button
                                onClick={() => setReviewingItem(null)}
                                className="absolute right-4 top-4 text-neutral-400 hover:text-white transition"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <h3 className="font-[Orbitron] text-base font-bold text-yellow-400">
                                GESTIONAR ESTADO (STAFF)
                            </h3>
                            <p className="mt-1 text-xs text-neutral-400 truncate">
                                Sugerencia: <strong>{reviewingItem.title}</strong>
                            </p>

                            <form onSubmit={handleStatusSubmit} className="mt-4 space-y-4 text-sm">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Nuevo estado</label>
                                    <select
                                        value={statusForm.data.status}
                                        onChange={(e) => statusForm.setData('status', e.target.value)}
                                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-white focus:border-yellow-500 focus:outline-none"
                                    >
                                        {Object.entries(statuses).map(([key, st]) => (
                                            <option key={key} value={key}>
                                                {st.label} {!st.open ? '(Cierra votación)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                                        Nota del equipo para el autor y la comunidad (opcional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        maxLength={900}
                                        value={statusForm.data.staff_note}
                                        onChange={(e) => statusForm.setData('staff_note', e.target.value)}
                                        placeholder="Explica qué se va a hacer, fechas previstas o motivo del descarte..."
                                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-white placeholder-neutral-500 focus:border-yellow-500 focus:outline-none resize-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setReviewingItem(null)}
                                        className="rounded-xl border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={statusForm.processing}
                                        className="rounded-xl border border-yellow-500 bg-yellow-500 px-4 py-2 text-xs font-bold text-black hover:bg-yellow-400 disabled:opacity-50"
                                    >
                                        {statusForm.processing ? 'Guardando…' : 'Actualizar estado'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
