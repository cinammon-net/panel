import PostFormModal from '@/components/PostFormModal';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    FileText,
    Image as ImageIcon,
    Newspaper,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Publicaciones', href: '/posts' }];

interface PostItem {
    id: number;
    title: string;
    content: string;
    picture?: string;
    created_at?: string;
}

export default function Posts() {
    const { posts = [], canManage: canManageProp, auth, flash } = usePage<{
        posts: PostItem[];
        canManage?: boolean;
        auth?: { user?: { roles?: string[] } | null };
        flash?: { success?: string; error?: string };
    }>().props;

    const userRoles = auth?.user?.roles ?? [];
    const canManage = canManageProp ?? (userRoles.includes('Owner') || userRoles.includes('Admin'));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const openModal = (post: PostItem | null = null) => {
        if (!canManage) return;
        setSelectedPost(post);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (!canManage) return;
        if (!confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;

        router.delete(`/posts/${id}`, {
            onSuccess: () => {
                toast.success('Publicación eliminada correctamente');
            },
            onError: () => {
                toast.error('Error al eliminar la publicación');
            },
        });
    };

    const filteredPosts = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return posts;
        return posts.filter(
            (p) =>
                p.title.toLowerCase().includes(q) ||
                p.content.toLowerCase().includes(q)
        );
    }, [posts, searchQuery]);

    const stats = useMemo(() => {
        const total = posts.length;
        const withImage = posts.filter((p) => Boolean(p.picture)).length;
        return { total, withImage };
    }, [posts]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Publicaciones y Novedades — Cinammon" />
            <Toaster position="top-center" richColors />

            <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6 font-sans">
                {/* Cabecera futurista estilo Sugerencias */}
                <header className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-neutral-950 via-[#16120d] to-neutral-950 p-6 md:p-8 shadow-2xl">
                    <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-yellow-500/10 blur-3xl" />
                    <div className="absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-pink-500/10 blur-2xl" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-yellow-400 uppercase">
                                <Newspaper className="h-3.5 w-3.5" />
                                Noticias & Comunicados
                            </div>
                            <h1 className="mt-2 font-[Orbitron] text-2xl md:text-3xl font-bold tracking-wide text-white drop-shadow-[0_0_12px_rgba(250,204,21,0.25)]">
                                PUBLICACIONES Y NOVEDADES
                            </h1>
                            <p className="mt-2 text-sm text-neutral-300 max-w-2xl leading-relaxed">
                                Entérate de los últimos lanzamientos, eventos, mejoras en la infraestructura y noticias oficiales del equipo de Cinammon.
                            </p>
                        </div>

                        {canManage && (
                            <button
                                onClick={() => openModal()}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400 bg-gradient-to-r from-yellow-500 to-amber-500 px-5 py-3 text-sm font-bold text-black shadow-[0_0_20px_rgba(234,179,8,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(234,179,8,0.5)] active:scale-95"
                            >
                                <Plus className="h-4 w-4 stroke-[3]" />
                                Nueva publicación
                            </button>
                        )}
                    </div>

                    {/* Contadores rápidos de estadísticas */}
                    <div className="mt-6 pt-5 border-t border-yellow-500/20 grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg border border-neutral-800 bg-black/40 p-2.5">
                            <span className="text-xl font-bold text-white font-[Orbitron]">{stats.total}</span>
                            <p className="text-xs text-neutral-400">Total publicaciones</p>
                        </div>
                        <div className="rounded-lg border border-yellow-500/20 bg-yellow-950/20 p-2.5">
                            <span className="text-xl font-bold text-yellow-400 font-[Orbitron]">{stats.withImage}</span>
                            <p className="text-xs text-yellow-300/80">Con imagen</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5">
                            <span className="text-xl font-bold text-emerald-400 font-[Orbitron]">
                                <Sparkles className="inline h-5 w-5 mb-1" />
                            </span>
                            <p className="text-xs text-emerald-300/80">Oficial Cinammon</p>
                        </div>
                    </div>
                </header>

                {/* Barra de búsqueda */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por título o contenido…"
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    />
                </div>

                {/* Lista / Grid de publicaciones */}
                {filteredPosts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredPosts.map((post) => (
                            <article
                                key={post.id}
                                className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950/70 backdrop-blur transition-all duration-300 hover:border-yellow-500/50 hover:shadow-[0_0_25px_rgba(234,179,8,0.12)] hover:-translate-y-0.5"
                            >
                                {post.picture && (
                                    <div className="relative h-48 w-full overflow-hidden bg-neutral-900 border-b border-neutral-800/60">
                                        <img
                                            src={post.picture}
                                            alt={post.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent" />
                                    </div>
                                )}

                                <div className="flex flex-1 flex-col p-6">
                                    <div className="flex items-center justify-between gap-3 text-xs text-neutral-400 mb-3">
                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 font-medium text-yellow-300">
                                            <Sparkles className="h-3 w-3" />
                                            Novedad
                                        </div>

                                        {post.created_at && (
                                            <span className="inline-flex items-center gap-1.5 text-neutral-400">
                                                <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                                                {new Date(post.created_at).toLocaleDateString('es-ES', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="font-[Orbitron] text-lg font-bold text-white tracking-wide group-hover:text-yellow-400 transition-colors">
                                        {post.title}
                                    </h2>

                                    <p className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-neutral-300 font-sans">
                                        {post.content}
                                    </p>

                                    {/* Acciones de administración */}
                                    {canManage && (
                                        <div className="mt-5 pt-4 border-t border-neutral-800/70 flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openModal(post)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-300 hover:bg-yellow-500 hover:text-black transition"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500 hover:text-white transition"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-12 text-center">
                        <Newspaper className="mx-auto h-12 w-12 text-yellow-500/30" />
                        <h3 className="mt-3 font-[Orbitron] text-lg font-bold text-white">
                            No se encontraron publicaciones
                        </h3>
                        <p className="mt-1 text-sm text-neutral-400">
                            {searchQuery ? 'Prueba con otros términos de búsqueda.' : 'Aún no hay publicaciones en el tablón.'}
                        </p>
                        {canManage && !searchQuery && (
                            <button
                                onClick={() => openModal()}
                                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-yellow-400 bg-yellow-500 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-400 transition"
                            >
                                <Plus className="h-4 w-4" /> Crear la primera publicación
                            </button>
                        )}
                    </div>
                )}
            </div>

            {canManage && (
                <PostFormModal isOpen={isModalOpen} closeModal={() => setIsModalOpen(false)} post={selectedPost} />
            )}
        </AppLayout>
    );
}
