import { router } from '@inertiajs/react';
import {
    Image as ImageIcon,
    Loader2,
    Newspaper,
    Pin,
    Sparkles,
    Tag,
    UploadCloud,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface PostFormData {
    id?: number;
    title: string;
    category?: string;
    summary?: string;
    content: string;
    picture?: string;
    is_pinned?: boolean;
}

interface Props {
    isOpen: boolean;
    closeModal: () => void;
    post?: PostFormData | null;
}

const CATEGORIES = [
    { id: 'actualizacion', label: 'Actualización', color: 'emerald' },
    { id: 'anuncio', label: 'Anuncio Oficial', color: 'amber' },
    { id: 'mantenimiento', label: 'Mantenimiento', color: 'orange' },
    { id: 'evento', label: 'Evento & Promo', color: 'purple' },
    { id: 'comunidad', label: 'Comunidad', color: 'cyan' },
    { id: 'opinion', label: 'Opinión & Editorial', color: 'yellow' },
];

export default function PostFormModal({ isOpen, closeModal, post }: Props) {
    const [formData, setFormData] = useState<PostFormData>({
        title: '',
        category: 'actualizacion',
        summary: '',
        content: '',
        picture: '',
        is_pinned: false,
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (post) {
            setFormData({
                title: post.title || '',
                category: post.category || 'actualizacion',
                summary: post.summary || '',
                content: post.content || '',
                picture: post.picture || '',
                is_pinned: Boolean(post.is_pinned),
            });
            setPreview(post.picture || '');
            setSelectedFile(null);
        } else {
            setFormData({
                title: '',
                category: 'actualizacion',
                summary: '',
                content: '',
                picture: '',
                is_pinned: false,
            });
            setPreview('');
            setSelectedFile(null);
        }
    }, [post, isOpen]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: checked }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            toast.error('El título es obligatorio.');
            return;
        }
        if (!formData.content.trim()) {
            toast.error('El contenido de la noticia es obligatorio.');
            return;
        }

        setIsSubmitting(true);
        const data = new FormData();
        data.append('title', formData.title);
        data.append('category', formData.category || 'actualizacion');
        if (formData.summary) {
            data.append('summary', formData.summary);
        }
        data.append('content', formData.content);
        data.append('is_pinned', formData.is_pinned ? '1' : '0');

        if (selectedFile) {
            data.append('picture', selectedFile);
        }

        const successMessage = post?.id ? '¡Noticia actualizada!' : '¡Noticia publicada con éxito!';
        const errorMessage = post?.id ? 'Error al actualizar la noticia.' : 'Error al crear la noticia.';

        if (post?.id) {
            data.append('_method', 'PUT');
            router.post(`/posts/${post.id}`, data, {
                onSuccess: () => {
                    toast.success(successMessage);
                    setIsSubmitting(false);
                    closeModal();
                },
                onError: () => {
                    toast.error(errorMessage);
                    setIsSubmitting(false);
                },
            });
        } else {
            router.post('/posts', data, {
                onSuccess: () => {
                    toast.success(successMessage);
                    setIsSubmitting(false);
                    closeModal();
                },
                onError: () => {
                    toast.error(errorMessage);
                    setIsSubmitting(false);
                },
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-yellow-500/40 bg-gradient-to-b from-neutral-950 via-[#13100a] to-neutral-950 p-6 md:p-8 text-white shadow-[0_0_50px_rgba(234,179,8,0.2)]">
                {/* Botón cerrar */}
                <button
                    onClick={closeModal}
                    type="button"
                    className="absolute right-5 top-5 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Cabecera del modal */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-2.5 text-yellow-400">
                        <Newspaper className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="font-[Orbitron] text-xl font-bold tracking-wide text-white">
                            {post?.id ? 'EDITAR NOTICIA' : 'NUEVA PUBLICACIÓN'}
                        </h2>
                        <p className="text-xs text-neutral-400">
                            {post?.id
                                ? 'Modifica los datos de la noticia para actualizar a la comunidad.'
                                : 'Publica una novedad oficial, actualización o comunicado en el tablón.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Título */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-1.5">
                            Título de la noticia *
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Ej: Nuevo sistema de monedas y servidores gratuitos..."
                            required
                            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2.5 text-sm text-white placeholder-neutral-500 transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />
                    </div>

                    {/* Categoría y Fijado */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-1.5 flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5" />
                                Categoría
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3.5 py-2.5 text-sm text-white transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.id} value={cat.id} className="bg-neutral-900 text-white">
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-1.5 flex items-center gap-1.5">
                                <Pin className="h-3.5 w-3.5" />
                                Visibilidad
                            </label>
                            <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2.5 cursor-pointer hover:border-yellow-500/40 transition">
                                <input
                                    type="checkbox"
                                    name="is_pinned"
                                    checked={formData.is_pinned}
                                    onChange={handleCheckboxChange}
                                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-yellow-500 focus:ring-yellow-500"
                                />
                                <span className="text-xs font-medium text-neutral-300">
                                    Fijar noticia destacada al inicio
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Resumen breve */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-1.5">
                            Resumen corto (opcional, para la tarjeta previa)
                        </label>
                        <input
                            type="text"
                            name="summary"
                            value={formData.summary}
                            onChange={handleChange}
                            maxLength={300}
                            placeholder="Breve introducción que engancha al lector..."
                            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2 text-sm text-white placeholder-neutral-500 transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />
                    </div>

                    {/* Contenido completo */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-yellow-400">
                                Contenido de la noticia *
                            </label>
                            <span className="text-[11px] text-neutral-500">
                                Admite saltos de línea y párrafos
                            </span>
                        </div>
                        <textarea
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            rows={6}
                            required
                            placeholder="Escribe aquí toda la noticia con detalles, novedades, instrucciones o enlaces..."
                            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 text-sm text-white placeholder-neutral-500 transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 leading-relaxed font-sans"
                        />
                    </div>

                    {/* Portada / Imagen */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-1.5 flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5" />
                            Imagen de portada (opcional)
                        </label>

                        <div className="mt-1 flex items-center gap-4">
                            <label className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50 p-4 cursor-pointer hover:border-yellow-500/60 hover:bg-neutral-900/80 transition">
                                <UploadCloud className="h-6 w-6 text-neutral-400 mb-1" />
                                <span className="text-xs font-medium text-neutral-300">
                                    {selectedFile ? selectedFile.name : 'Subir imagen desde tu equipo'}
                                </span>
                                <span className="text-[10px] text-neutral-500 mt-0.5">
                                    PNG, JPG o WEBP (Máx. 4MB)
                                </span>
                                <input
                                    type="file"
                                    name="picture"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>

                            {preview && (
                                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-yellow-500/30 bg-neutral-900">
                                    <img src={preview} alt="Vista previa" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setPreview('');
                                            setFormData((prev) => ({ ...prev, picture: '' }));
                                        }}
                                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-rose-600 transition"
                                        title="Eliminar imagen"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={isSubmitting}
                            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-xl border border-yellow-400 bg-gradient-to-r from-yellow-500 to-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:scale-[1.02] active:scale-95 transition disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    {post?.id ? 'Guardar cambios' : 'Publicar noticia'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
