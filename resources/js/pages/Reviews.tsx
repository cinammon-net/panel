import UserAvatar from '@/components/user-avatar';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Calendar,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    Pencil,
    Plus,
    Quote,
    Search,
    Sparkles,
    Star,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Valoraciones', href: '/reviews' }];

interface ReviewItem {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    user: {
        name: string;
        avatar_url?: string | null;
    };
}

interface Pagination<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

export default function Reviews() {
    const { reviews, filters, flash } = usePage<{
        reviews: Pagination<ReviewItem>;
        filters: { search?: string; sort?: string; direction?: string; per_page?: number };
        flash?: { success?: string; error?: string };
    }>().props;

    const [searchQuery, setSearchQuery] = useState('');
    const [starFilter, setStarFilter] = useState<number | 'all'>('all');

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleSort = (column: string) => {
        const isSameField = filters.sort === column;
        const newDirection = isSameField && filters.direction === 'asc' ? 'desc' : 'asc';

        router.get(
            '/reviews',
            {
                ...filters,
                sort: column,
                direction: newDirection,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleDelete = (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta valoración?')) return;
        router.delete(`/reviews/${id}`, {
            onSuccess: () => toast.success('Valoración eliminada correctamente'),
            onError: () => toast.error('Error al eliminar la valoración'),
        });
    };

    // Estadísticas
    const stats = useMemo(() => {
        const list = reviews?.data || [];
        const total = reviews?.total || 0;
        if (list.length === 0) return { total: 0, average: '5.0', stars5: 0, satisfaction: '100%' };

        const sum = list.reduce((acc, r) => acc + (r.rating || 5), 0);
        const avg = (sum / list.length).toFixed(1);
        const stars5 = list.filter((r) => r.rating === 5).length;
        const satisfaction = Math.round((stars5 / list.length) * 100) + '%';
        return { total, average: avg, stars5, satisfaction };
    }, [reviews]);

    // Filtrado local
    const filteredReviews = useMemo(() => {
        const list = reviews?.data || [];
        return list.filter((r) => {
            if (starFilter !== 'all' && r.rating !== starFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesUser = (r.user?.name || '').toLowerCase().includes(q);
                const matchesComment = (r.comment || '').toLowerCase().includes(q);
                if (!matchesUser && !matchesComment) return false;
            }
            return true;
        });
    }, [reviews, starFilter, searchQuery]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Valoraciones y Reseñas — Cinammon" />

            <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6 font-sans">
                {/* Cabecera futurista estilo Sugerencias */}
                <header className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-neutral-950 via-[#16120d] to-neutral-950 p-6 md:p-8 shadow-2xl">
                    <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-yellow-500/10 blur-3xl" />
                    <div className="absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-pink-500/10 blur-2xl" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-yellow-400 uppercase">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                Opiniones & Satisfacción
                            </div>
                            <h1 className="mt-2 font-[Orbitron] text-2xl md:text-3xl font-bold tracking-wide text-white drop-shadow-[0_0_12px_rgba(250,204,21,0.25)]">
                                VALORACIONES DE LA COMUNIDAD
                            </h1>
                            <p className="mt-2 text-sm text-neutral-300 max-w-2xl leading-relaxed">
                                Descubre las opiniones y experiencias de otros usuarios con el servicio de Cinammon o comparte tu propia valoración.
                            </p>
                        </div>

                        <Link
                            href="/reviews/create"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400 bg-gradient-to-r from-yellow-500 to-amber-500 px-5 py-3 text-sm font-bold text-black shadow-[0_0_20px_rgba(234,179,8,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(234,179,8,0.5)] active:scale-95"
                        >
                            <Plus className="h-4 w-4 stroke-[3]" />
                            Escribir valoración
                        </Link>
                    </div>

                    {/* Contadores rápidos de estadísticas */}
                    <div className="mt-6 pt-5 border-t border-yellow-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="rounded-lg border border-neutral-800 bg-black/40 p-2.5">
                            <span className="text-xl font-bold text-white font-[Orbitron]">{stats.total}</span>
                            <p className="text-xs text-neutral-400">Total reseñas</p>
                        </div>
                        <div className="rounded-lg border border-yellow-500/20 bg-yellow-950/20 p-2.5">
                            <span className="text-xl font-bold text-yellow-400 font-[Orbitron] flex items-center justify-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400" />
                                {stats.average}
                            </span>
                            <p className="text-xs text-yellow-300/80">Puntuación media</p>
                        </div>
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5">
                            <span className="text-xl font-bold text-emerald-400 font-[Orbitron]">{stats.stars5}</span>
                            <p className="text-xs text-emerald-300/80">Con 5 estrellas</p>
                        </div>
                        <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-2.5">
                            <span className="text-xl font-bold text-purple-400 font-[Orbitron]">{stats.satisfaction}</span>
                            <p className="text-xs text-purple-300/80">Satisfacción</p>
                        </div>
                    </div>
                </header>

                {/* Filtros y búsqueda */}
                <div className="space-y-3">
                    {/* Pestañas de estrellas */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-2">
                        {[
                            { key: 'all', label: 'Todas las reseñas' },
                            { key: 5, label: '⭐⭐⭐⭐⭐ 5 estrellas' },
                            { key: 4, label: '⭐⭐⭐⭐ 4 estrellas' },
                            { key: 3, label: '⭐⭐⭐ 3 estrellas' },
                        ].map((tab) => {
                            const active = starFilter === tab.key;
                            return (
                                <button
                                    key={String(tab.key)}
                                    onClick={() => setStarFilter(tab.key as typeof starFilter)}
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

                    {/* Barra de búsqueda y orden */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por usuario o texto de reseña…"
                                className="w-full rounded-xl border border-neutral-800 bg-neutral-950/80 py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            />
                        </div>

                        <button
                            onClick={() => handleSort('rating')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950/80 px-4 py-2 text-xs font-medium text-neutral-200 transition hover:border-yellow-500/60"
                        >
                            <span>Ordenar por puntuación</span>
                            {filters?.sort === 'rating' && (
                                filters.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Lista de reseñas en tarjetas estilo Sugerencias */}
                {filteredReviews.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredReviews.map((review) => (
                            <article
                                key={review.id}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-6 backdrop-blur transition-all duration-200 hover:border-yellow-500/40 hover:shadow-[0_0_25px_rgba(234,179,8,0.08)]"
                            >
                                <div className="space-y-4">
                                    {/* Cabecera de la reseña: Usuario y Estrellas */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-full ring-2 ring-yellow-500/30 p-0.5">
                                                <UserAvatar
                                                    name={review.user?.name || 'Usuario'}
                                                    src={review.user?.avatar_url}
                                                    size={40}
                                                    fallbackClassName="bg-yellow-950 text-yellow-300 font-bold"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-[Orbitron] text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">
                                                    {review.user?.name || 'Cliente Cinammon'}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(review.created_at).toLocaleDateString('es-ES', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Puntuación visual */}
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-0.5">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`h-4 w-4 ${
                                                            i < review.rating
                                                                ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                                                                : 'fill-neutral-800 text-neutral-700'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[11px] font-mono font-bold text-yellow-300">
                                                {review.rating}.0 / 5.0
                                            </span>
                                        </div>
                                    </div>

                                    {/* Comentario */}
                                    <div className="relative pt-2">
                                        <Quote className="absolute -top-1 -left-1 h-5 w-5 text-yellow-500/20 -scale-x-100" />
                                        <p className="pl-4 text-sm leading-relaxed text-neutral-300 font-sans italic">
                                            "{review.comment || 'Sin comentario escrito.'}"
                                        </p>
                                    </div>
                                </div>

                                {/* Acciones de edición y borrado */}
                                <div className="mt-5 pt-4 border-t border-neutral-800/60 flex items-center justify-end gap-2">
                                    <Link
                                        href={`/reviews/${review.id}/edit`}
                                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:border-yellow-500 hover:text-yellow-300 transition"
                                    >
                                        <Pencil className="h-3 w-3" />
                                        Editar
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(review.id)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-900/50 bg-rose-950/30 px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-900/50 hover:text-white transition"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Eliminar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-12 text-center">
                        <Star className="mx-auto h-12 w-12 text-yellow-500/30" />
                        <h3 className="mt-3 font-[Orbitron] text-lg font-bold text-white">
                            No se encontraron valoraciones
                        </h3>
                        <p className="mt-1 text-sm text-neutral-400">
                            {searchQuery || starFilter !== 'all'
                                ? 'No hay valoraciones con los filtros seleccionados.'
                                : 'Sé el primero en dejar una valoración sobre el servicio.'}
                        </p>
                        <Link
                            href="/reviews/create"
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-yellow-400 bg-yellow-500 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-400 transition"
                        >
                            <Plus className="h-4 w-4" /> Escribir la primera valoración
                        </Link>
                    </div>
                )}

                {/* Paginación */}
                {reviews?.links && reviews.links.length > 3 && (
                    <div className="flex items-center justify-center gap-1 pt-4">
                        {reviews.links.map((link, idx) => (
                            <Link
                                key={idx}
                                href={link.url || '#'}
                                preserveScroll
                                preserveState
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    link.active
                                        ? 'border border-yellow-500/60 bg-yellow-500/20 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.2)]'
                                        : link.url
                                          ? 'border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-white'
                                          : 'cursor-not-allowed text-neutral-600'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
