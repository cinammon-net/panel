import PostDetailModal, { type NewsItem } from '@/components/PostDetailModal';
import PostFormModal, { type PostFormData } from '@/components/PostFormModal';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    Eye,
    Filter,
    Heart,
    Newspaper,
    Pencil,
    Pin,
    Plus,
    Search,
    Share2,
    Sparkles,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Noticias & Comunicados', href: '/posts' }];

interface CategoryTab {
    id: string;
    label: string;
    color: string;
}

const CATEGORY_MAP: Record<string, { label: string; badgeClass: string; color: string }> = {
    actualizacion: {
        label: 'Actualización',
        badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
        color: 'emerald',
    },
    anuncio: {
        label: 'Anuncio Oficial',
        badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
        color: 'amber',
    },
    mantenimiento: {
        label: 'Mantenimiento',
        badgeClass: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
        color: 'orange',
    },
    evento: {
        label: 'Evento & Promo',
        badgeClass: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
        color: 'purple',
    },
    comunidad: {
        label: 'Comunidad',
        badgeClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
        color: 'cyan',
    },
    general: {
        label: 'General',
        badgeClass: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
        color: 'yellow',
    },
};

export default function Posts() {
    const {
        posts: initialPosts = [],
        canManage: canManageProp,
        categories = [],
        auth,
        flash,
    } = usePage<{
        posts: NewsItem[];
        canManage?: boolean;
        categories?: CategoryTab[];
        auth?: { user?: { roles?: string[] } | null };
        flash?: { success?: string; error?: string };
    }>().props;

    const userRoles = auth?.user?.roles ?? [];
    const canManage = canManageProp ?? (userRoles.includes('Owner') || userRoles.includes('Admin'));

    const [posts, setPosts] = useState<NewsItem[]>(initialPosts);
    useEffect(() => {
        setPosts(initialPosts);
    }, [initialPosts]);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedPostForEdit, setSelectedPostForEdit] = useState<PostFormData | null>(null);

    const [readingPost, setReadingPost] = useState<NewsItem | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('todos');
    const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'pinned'>('pinned');

    // Manejo de flash messages
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Abrir noticia por URL query ?id=123 o ?post=123
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const targetId = params.get('id') || params.get('post');
        if (targetId) {
            const found = posts.find((p) => String(p.id) === targetId);
            if (found) {
                setReadingPost(found);
                setIsDetailModalOpen(true);
            }
        }
    }, [posts]);

    const openCreateModal = () => {
        if (!canManage) return;
        setSelectedPostForEdit(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (post: NewsItem) => {
        if (!canManage) return;
        setSelectedPostForEdit({
            id: post.id,
            title: post.title,
            category: post.category,
            summary: post.summary,
            content: post.content,
            picture: post.picture,
            is_pinned: post.is_pinned,
        });
        setIsFormModalOpen(true);
    };

    const openReadModal = (post: NewsItem) => {
        setReadingPost(post);
        setIsDetailModalOpen(true);

        // Incrementar vista optimista local
        setPosts((prev) =>
            prev.map((p) =>
                p.id === post.id ? { ...p, views_count: (p.views_count || 0) + 1 } : p
            )
        );

        // Notificar al backend de la vista
        fetch(`/posts/${post.id}`, {
            headers: { Accept: 'application/json' },
        }).catch(() => {});
    };

    const handleDelete = (id: number) => {
        if (!canManage) return;
        if (!confirm('¿Estás seguro de que deseas eliminar esta noticia?')) return;

        router.delete(`/posts/${id}`, {
            onSuccess: () => {
                toast.success('Noticia eliminada correctamente.');
                if (readingPost?.id === id) {
                    setIsDetailModalOpen(false);
                    setReadingPost(null);
                }
            },
            onError: () => {
                toast.error('Error al eliminar la noticia.');
            },
        });
    };

    // Toggle Me Gusta con UI optimista
    const handleToggleLike = async (postId: number) => {
        // Actualizar UI de forma inmediata
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id === postId) {
                    const newLiked = !p.liked;
                    const diff = newLiked ? 1 : -1;
                    return {
                        ...p,
                        liked: newLiked,
                        likes_count: Math.max(0, (p.likes_count || 0) + diff),
                    };
                }
                return p;
            })
        );

        if (readingPost?.id === postId) {
            setReadingPost((prev) => {
                if (!prev) return null;
                const newLiked = !prev.liked;
                const diff = newLiked ? 1 : -1;
                return {
                    ...prev,
                    liked: newLiked,
                    likes_count: Math.max(0, (prev.likes_count || 0) + diff),
                };
            });
        }

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
                setPosts((prev) =>
                    prev.map((p) =>
                        p.id === postId
                            ? { ...p, liked: data.liked, likes_count: data.likes_count }
                            : p
                    )
                );
                if (readingPost?.id === postId) {
                    setReadingPost((prev) =>
                        prev
                            ? { ...prev, liked: data.liked, likes_count: data.likes_count }
                            : null
                    );
                }
            }
        } catch {
            // Silencioso o revertir
        }
    };

    // Filtrado y ordenación
    const filteredPosts = useMemo(() => {
        let list = [...posts];

        // Filtro por categoría
        if (activeCategory !== 'todos') {
            list = list.filter((p) => (p.category || 'actualizacion') === activeCategory);
        }

        // Filtro por búsqueda
        const q = searchQuery.toLowerCase().trim();
        if (q) {
            list = list.filter(
                (p) =>
                    p.title.toLowerCase().includes(q) ||
                    p.content.toLowerCase().includes(q) ||
                    (p.summary && p.summary.toLowerCase().includes(q))
            );
        }

        // Ordenación
        if (sortBy === 'pinned') {
            list.sort((a, b) => {
                if (a.is_pinned === b.is_pinned) {
                    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
                }
                return a.is_pinned ? -1 : 1;
            });
        } else if (sortBy === 'popular') {
            list.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        } else {
            list.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        }

        return list;
    }, [posts, activeCategory, searchQuery, sortBy]);

    // Estadísticas rápidas
    const stats = useMemo(() => {
        const total = posts.length;
        const pinnedCount = posts.filter((p) => p.is_pinned).length;
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
        return { total, pinnedCount, totalLikes };
    }, [posts]);

    // Noticia destacada principal (Hero Spotlight) si existe
    const spotlightPost = useMemo(() => {
        if (activeCategory !== 'todos' || searchQuery) return null;
        return posts.find((p) => p.is_pinned);
    }, [posts, activeCategory, searchQuery]);

    // Lista excluyendo el spotlight para no duplicarla si se muestra en Hero
    const listPosts = useMemo(() => {
        if (spotlightPost && activeCategory === 'todos' && !searchQuery) {
            return filteredPosts.filter((p) => p.id !== spotlightPost.id);
        }
        return filteredPosts;
    }, [filteredPosts, spotlightPost, activeCategory, searchQuery]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Noticias, Actualizaciones & Novedades — Cinammon" />
            <Toaster position="top-center" richColors />

            <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8 font-sans">
                {/* Cabecera futurista estilo Sugerencias */}
                <header className="relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-neutral-950 via-[#18120a] to-neutral-950 p-6 md:p-10 shadow-2xl">
                    <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-yellow-500/15 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 left-1/4 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider text-yellow-400 uppercase">
                                <Newspaper className="h-3.5 w-3.5" />
                                Sistema Oficial de Noticias
                            </div>
                            <h1 className="mt-3 font-[Orbitron] text-2xl md:text-4xl font-extrabold tracking-wide text-white drop-shadow-[0_0_16px_rgba(250,204,21,0.3)]">
                                TABLÓN DE NOVEDADES
                            </h1>
                            <p className="mt-2 text-sm md:text-base text-neutral-300 max-w-3xl leading-relaxed">
                                Novedades oficiales, lanzamientos de características, cambios en la infraestructura, guías comunitarias y comunicados del equipo directivo de Cinammon Network.
                            </p>
                        </div>

                        {canManage && (
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400 bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-3.5 text-sm font-bold text-black shadow-[0_0_24px_rgba(234,179,8,0.4)] transition-all hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(234,179,8,0.55)] active:scale-95 shrink-0"
                            >
                                <Plus className="h-4 w-4 stroke-[3]" />
                                Publicar Noticia
                            </button>
                        )}
                    </div>

                    {/* Contadores rápidos de estadísticas */}
                    <div className="mt-8 pt-6 border-t border-yellow-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="rounded-xl border border-neutral-800 bg-black/40 p-3">
                            <span className="text-xl md:text-2xl font-bold text-white font-[Orbitron]">{stats.total}</span>
                            <p className="text-xs text-neutral-400 mt-0.5">Noticias totales</p>
                        </div>
                        <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/20 p-3">
                            <span className="text-xl md:text-2xl font-bold text-yellow-400 font-[Orbitron]">{stats.pinnedCount}</span>
                            <p className="text-xs text-yellow-300/80 mt-0.5">Destacadas</p>
                        </div>
                        <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3">
                            <span className="text-xl md:text-2xl font-bold text-rose-400 font-[Orbitron]">{stats.totalLikes}</span>
                            <p className="text-xs text-rose-300/80 mt-0.5">Me gusta de la comunidad</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                            <span className="text-xl md:text-2xl font-bold text-emerald-400 font-[Orbitron]">
                                <Sparkles className="inline h-5 w-5 mb-1" /> En vivo
                            </span>
                            <p className="text-xs text-emerald-300/80 mt-0.5">Cinammon Network</p>
                        </div>
                    </div>
                </header>

                {/* Filtro por Categorías (Pills) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <button
                        onClick={() => setActiveCategory('todos')}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                            activeCategory === 'todos'
                                ? 'border border-yellow-400 bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                : 'border border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-yellow-500/40 hover:text-white'
                        }`}
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Todas ({posts.length})
                    </button>

                    {Object.entries(CATEGORY_MAP).map(([key, cat]) => {
                        const count = posts.filter((p) => (p.category || 'actualizacion') === key).length;
                        const isActive = activeCategory === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveCategory(key)}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                                    isActive
                                        ? 'border border-yellow-400 bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                        : 'border border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-yellow-500/40 hover:text-white'
                                }`}
                            >
                                <span>{cat.label}</span>
                                <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${isActive ? 'bg-black text-yellow-300' : 'bg-neutral-800 text-neutral-400'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Barra de controles: Búsqueda y Ordenación */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar noticias por título, tema o contenido…"
                            className="w-full rounded-xl border border-neutral-800 bg-neutral-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-neutral-400 flex items-center gap-1">
                            <Filter className="h-3.5 w-3.5" /> Ordenar:
                        </span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-xs font-semibold text-neutral-200 transition focus:border-yellow-500 focus:outline-none"
                        >
                            <option value="pinned">Destacadas primero</option>
                            <option value="recent">Más recientes</option>
                            <option value="popular">Más valoradas (Likes)</option>
                        </select>
                    </div>
                </div>

                {/* Noticia Destacada Hero (Spotlight) */}
                {spotlightPost && (
                    <div className="relative overflow-hidden rounded-3xl border border-yellow-500/50 bg-gradient-to-r from-neutral-950 via-[#1a140a] to-neutral-950 shadow-[0_0_35px_rgba(234,179,8,0.18)] transition-all hover:border-yellow-400">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center">
                            {spotlightPost.picture && (
                                <div className="lg:col-span-5 h-60 sm:h-72 w-full overflow-hidden rounded-2xl border border-yellow-500/30 bg-neutral-900 shadow-xl">
                                    <img
                                        src={spotlightPost.picture}
                                        alt={spotlightPost.title}
                                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                                    />
                                </div>
                            )}

                            <div className={spotlightPost.picture ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400 bg-yellow-500/20 px-3 py-1 text-xs font-bold text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.35)]">
                                        <Pin className="h-3 w-3 fill-yellow-400" />
                                        NOTICIA DESTACADA
                                    </span>

                                    {(() => {
                                        const cat = CATEGORY_MAP[spotlightPost.category || 'actualizacion'] || CATEGORY_MAP.general;
                                        return (
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${cat.badgeClass}`}>
                                                {cat.label}
                                            </span>
                                        );
                                    })()}

                                    {spotlightPost.created_at && (
                                        <span className="text-xs text-neutral-400 flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                                            {new Date(spotlightPost.created_at).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    )}
                                </div>

                                <h2
                                    onClick={() => openReadModal(spotlightPost)}
                                    className="font-[Orbitron] text-xl sm:text-2xl font-bold text-white hover:text-yellow-400 cursor-pointer transition leading-snug drop-shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                                >
                                    {spotlightPost.title}
                                </h2>

                                <p className="text-sm text-neutral-300 line-clamp-3 leading-relaxed">
                                    {spotlightPost.summary || spotlightPost.content}
                                </p>

                                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => openReadModal(spotlightPost)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-yellow-400 bg-yellow-500 px-4 py-2 text-xs font-bold text-black hover:bg-yellow-400 transition shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                                        >
                                            Leer noticia completa →
                                        </button>

                                        <button
                                            onClick={() => handleToggleLike(spotlightPost.id)}
                                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                                                spotlightPost.liked
                                                    ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                                                    : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-rose-400'
                                            }`}
                                        >
                                            <Heart className={`h-3.5 w-3.5 ${spotlightPost.liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                                            <span>{spotlightPost.likes_count || 0}</span>
                                        </button>
                                    </div>

                                    {canManage && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(spotlightPost)}
                                                className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-yellow-300 hover:bg-yellow-500 hover:text-black transition"
                                                title="Editar"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(spotlightPost.id)}
                                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500 hover:text-white transition"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid principal de noticias */}
                {listPosts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listPosts.map((post) => {
                            const cat = CATEGORY_MAP[post.category || 'actualizacion'] || CATEGORY_MAP.general;
                            const words = post.content.trim().split(/\s+/).length;
                            const readMinutes = Math.max(1, Math.ceil(words / 180));

                            return (
                                <article
                                    key={post.id}
                                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950/70 backdrop-blur transition-all duration-300 hover:border-yellow-500/50 hover:shadow-[0_0_30px_rgba(234,179,8,0.14)] hover:-translate-y-1"
                                >
                                    {/* Imagen previa */}
                                    {post.picture ? (
                                        <div
                                            onClick={() => openReadModal(post)}
                                            className="relative h-48 w-full overflow-hidden bg-neutral-900 border-b border-neutral-800/60 cursor-pointer"
                                        >
                                            <img
                                                src={post.picture}
                                                alt={post.title}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-transparent" />
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => openReadModal(post)}
                                            className="relative h-28 w-full bg-gradient-to-br from-yellow-950/20 via-neutral-900 to-neutral-950 border-b border-neutral-800/60 p-4 flex items-center justify-between cursor-pointer"
                                        >
                                            <Newspaper className="h-8 w-8 text-yellow-500/30" />
                                            <Sparkles className="h-5 w-5 text-yellow-500/20" />
                                        </div>
                                    )}

                                    {/* Contenido de la tarjeta */}
                                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                                        <div className="flex items-center justify-between gap-2 text-xs mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cat.badgeClass}`}>
                                                    {cat.label}
                                                </span>
                                                {post.is_pinned && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/60 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                                                        <Pin className="h-2.5 w-2.5 fill-yellow-400" />
                                                        Fijado
                                                    </span>
                                                )}
                                            </div>

                                            <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {readMinutes} min
                                            </span>
                                        </div>

                                        <h3
                                            onClick={() => openReadModal(post)}
                                            className="font-[Orbitron] text-base sm:text-lg font-bold text-white tracking-wide group-hover:text-yellow-400 transition-colors cursor-pointer line-clamp-2"
                                        >
                                            {post.title}
                                        </h3>

                                        <p className="mt-2.5 flex-1 text-xs sm:text-sm leading-relaxed text-neutral-300 font-sans line-clamp-3">
                                            {post.summary || post.content}
                                        </p>

                                        {/* Metadatos inferiores */}
                                        <div className="mt-4 pt-3.5 border-t border-neutral-800/70 flex items-center justify-between text-xs text-neutral-400">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-400 flex items-center justify-center text-[10px] font-bold text-black">
                                                    {post.author?.name ? post.author.name.charAt(0).toUpperCase() : 'C'}
                                                </div>
                                                <span className="text-[11px] text-neutral-300 truncate max-w-[100px]">
                                                    {post.author?.name || 'Equipo'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Botón Like */}
                                                <button
                                                    onClick={() => handleToggleLike(post.id)}
                                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                                                        post.liked
                                                            ? 'text-rose-400 bg-rose-500/10'
                                                            : 'text-neutral-400 hover:text-rose-400'
                                                    }`}
                                                >
                                                    <Heart className={`h-3.5 w-3.5 ${post.liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                    <span>{post.likes_count || 0}</span>
                                                </button>

                                                {/* Botón Leer */}
                                                <button
                                                    onClick={() => openReadModal(post)}
                                                    className="inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-200 hover:border-yellow-500/40 hover:text-white transition"
                                                >
                                                    Leer
                                                </button>
                                            </div>
                                        </div>

                                        {/* Acciones de administración */}
                                        {canManage && (
                                            <div className="mt-3 pt-2.5 border-t border-neutral-900 flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(post)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-semibold text-yellow-300 hover:bg-yellow-500 hover:text-black transition"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500 hover:text-white transition"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-neutral-800 bg-neutral-950/40 p-12 text-center">
                        <Newspaper className="mx-auto h-12 w-12 text-yellow-500/30" />
                        <h3 className="mt-4 font-[Orbitron] text-lg font-bold text-white">
                            No se encontraron noticias
                        </h3>
                        <p className="mt-1.5 text-sm text-neutral-400">
                            {searchQuery
                                ? 'Prueba con otros términos de búsqueda o selecciona otra categoría.'
                                : 'No hay publicaciones en esta categoría todavía.'}
                        </p>
                        {canManage && !searchQuery && (
                            <button
                                onClick={openCreateModal}
                                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-yellow-400 bg-yellow-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-yellow-400 transition shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                            >
                                <Plus className="h-4 w-4" /> Publicar la primera noticia
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Lectura de Noticia */}
            <PostDetailModal
                post={readingPost}
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setReadingPost(null);
                }}
                canManage={canManage}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onToggleLike={handleToggleLike}
            />

            {/* Modal de Creación / Edición */}
            {canManage && (
                <PostFormModal
                    isOpen={isFormModalOpen}
                    closeModal={() => {
                        setIsFormModalOpen(false);
                        setSelectedPostForEdit(null);
                    }}
                    post={selectedPostForEdit}
                />
            )}
        </AppLayout>
    );
}
