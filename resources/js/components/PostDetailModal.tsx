import {
    Calendar,
    Clock,
    Eye,
    Heart,
    Newspaper,
    Pencil,
    Pin,
    Share2,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface NewsItem {
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

interface Props {
    post: NewsItem | null;
    isOpen: boolean;
    onClose: () => void;
    canManage?: boolean;
    onEdit?: (post: NewsItem) => void;
    onDelete?: (id: number) => void;
    onToggleLike?: (id: number) => void;
}

const CATEGORY_MAP: Record<string, { label: string; badgeClass: string }> = {
    actualizacion: {
        label: 'Actualización',
        badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    },
    anuncio: {
        label: 'Anuncio Oficial',
        badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    },
    mantenimiento: {
        label: 'Mantenimiento',
        badgeClass: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    },
    evento: {
        label: 'Evento & Promo',
        badgeClass: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    },
    comunidad: {
        label: 'Comunidad',
        badgeClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    },
    general: {
        label: 'General',
        badgeClass: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
    },
};

export default function PostDetailModal({
    post,
    isOpen,
    onClose,
    canManage,
    onEdit,
    onDelete,
    onToggleLike,
}: Props) {
    if (!isOpen || !post) return null;

    const categoryInfo = CATEGORY_MAP[post.category || 'actualizacion'] || CATEGORY_MAP.general;

    // Estimación de tiempo de lectura
    const words = post.content.trim().split(/\s+/).length;
    const readMinutes = Math.max(1, Math.ceil(words / 180));

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/posts?id=${post.id}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                toast.success('Enlace de la noticia copiado al portapapeles');
            });
        } else {
            toast.info(shareUrl);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-yellow-500/40 bg-gradient-to-b from-neutral-950 via-[#14100c] to-neutral-950 text-white shadow-[0_0_60px_rgba(234,179,8,0.25)]">
                {/* Botón cerrar */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-20 rounded-full bg-black/70 p-2 text-neutral-300 backdrop-blur-sm transition hover:bg-neutral-800 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Banner de portada */}
                {post.picture && (
                    <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-neutral-900">
                        <img
                            src={post.picture}
                            alt={post.title}
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                    </div>
                )}

                <div className={`p-6 sm:p-8 ${post.picture ? '-mt-12 relative z-10' : ''}`}>
                    {/* Meta info & insignias */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold uppercase tracking-wider text-[11px] ${categoryInfo.badgeClass}`}
                            >
                                <Sparkles className="h-3 w-3" />
                                {categoryInfo.label}
                            </span>

                            {post.is_pinned && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400 bg-yellow-500/20 px-3 py-1 text-[11px] font-bold text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.3)]">
                                    <Pin className="h-3 w-3 fill-yellow-400" />
                                    Destacado
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-neutral-400 text-xs">
                            <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-neutral-500" />
                                {readMinutes} min de lectura
                            </span>
                            {post.views_count !== undefined && (
                                <span className="inline-flex items-center gap-1">
                                    <Eye className="h-3.5 w-3.5 text-neutral-500" />
                                    {post.views_count} lecturas
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Título de la noticia */}
                    <h1 className="font-[Orbitron] text-2xl sm:text-3xl font-bold tracking-wide text-white leading-tight drop-shadow-[0_0_16px_rgba(250,204,21,0.2)]">
                        {post.title}
                    </h1>

                    {/* Autor & Fecha */}
                    <div className="mt-4 flex items-center justify-between border-y border-neutral-800/80 py-3.5 text-xs text-neutral-400">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-500 to-amber-400 font-bold text-black text-[11px]">
                                {post.author?.name ? post.author.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                                <span className="font-semibold text-neutral-200">
                                    {post.author?.name || 'Equipo Cinammon'}
                                </span>
                                <span className="text-[11px] text-yellow-500/80 ml-1.5 font-mono">
                                    Oficial
                                </span>
                            </div>
                        </div>

                        {post.created_at && (
                            <div className="flex items-center gap-1.5 text-neutral-400">
                                <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                                {new Date(post.created_at).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </div>
                        )}
                    </div>

                    {/* Resumen destacado si existe */}
                    {post.summary && (
                        <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-950/20 p-4 text-sm font-medium text-yellow-200/90 leading-relaxed italic">
                            «{post.summary}»
                        </div>
                    )}

                    {/* Cuerpo completo de la noticia */}
                    <div className="mt-6 text-neutral-200 leading-relaxed font-sans text-base whitespace-pre-line space-y-4">
                        {post.content}
                    </div>

                    {/* Barra de pie: reacciones, compartir, admin */}
                    <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            {/* Botón de Like */}
                            <button
                                onClick={() => onToggleLike && onToggleLike(post.id)}
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                                    post.liked
                                        ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-rose-500/40 hover:text-rose-400'
                                }`}
                            >
                                <Heart
                                    className={`h-4 w-4 ${post.liked ? 'fill-rose-500 text-rose-500' : ''}`}
                                />
                                <span>{post.likes_count || 0}</span>
                                <span className="hidden sm:inline">Me gusta</span>
                            </button>

                            {/* Compartir */}
                            <button
                                onClick={handleShare}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:border-yellow-500/40 hover:text-white transition"
                                title="Copiar enlace"
                            >
                                <Share2 className="h-3.5 w-3.5" />
                                <span>Compartir</span>
                            </button>
                        </div>

                        {/* Controles de administración */}
                        {canManage && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        onClose();
                                        onEdit && onEdit(post);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-300 hover:bg-yellow-500 hover:text-black transition"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => {
                                        onClose();
                                        onDelete && onDelete(post.id);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500 hover:text-white transition"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
