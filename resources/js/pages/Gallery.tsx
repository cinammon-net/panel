import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function Gallery() {
    const [images, setImages] = useState<{ url: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null); // Para mostrar la vista previa de la imagen

    // Cargar las imágenes desde el servidor
    const fetchImages = async () => {
        setLoading(true);
        try {
            const res = await fetch('/gallery/list');
            const data = await res.json();
            setImages(data); // Actualiza las URLs de las imágenes
        } catch {
            toast.error('❌ Error al cargar la galería');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string); // Establece la vista previa
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return toast.warning('Selecciona una imagen');

        const formData = new FormData();
        formData.append('image', file);

        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (!token) return toast.error('❌ Token CSRF no encontrado');

        try {
            const res = await fetch('/gallery/upload', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': token,
                    Accept: 'application/json',
                },
                body: formData,
            });

            if (res.ok) {
                fetchImages();
                setFile(null);
                setImagePreview(null); // Limpiar la vista previa
                toast.success('✅ Imagen subida correctamente');
            } else {
                const errorData = await res.json();
                toast.error(`❌ Error al subir la imagen: ${errorData.message || 'Desconocido'}`);
            }
        } catch (error) {
            toast.error('❌ Error al subir la imagen');
            console.error(error);
        }
    };

    const handleDelete = async (url: string) => {
        const fileName = url.split('/').pop();
        if (!fileName || !confirm(`¿Eliminar ${fileName}?`)) return;

        try {
            const res = await fetch(`/gallery/delete/${fileName}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                toast.error(`❌ No se pudo eliminar la imagen: ${errorData.message || 'Desconocido'}`);
            } else {
                fetchImages();
                toast.success('🗑️ Imagen eliminada');
            }
        } catch (error) {
            toast.error('❌ Error al eliminar la imagen');
            console.error(error);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Galería', href: '/gallery' }]}>
            <Head title="Galería de Cinammon">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600&display=swap" rel="stylesheet" />
                <meta name="description" content="Galería de imágenes del sistema Cinammon" />
            </Head>

            <section className="min-h-screen w-full space-y-10 px-6 py-10 font-[Orbitron,sans-serif] text-cyan-300">
                <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-black via-[#0d0118] to-black" />
                <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle,#751aff11_1px,transparent_1px)] bg-[length:18px_18px]" />

                <div>
                    <h1 className="text-3xl font-bold tracking-widest text-purple-300 uppercase">Galería</h1>
                    <p className="text-sm text-purple-500">Sube y gestiona imágenes del sistema Cinammon.</p>
                </div>

                {/* Formulario para subir imágenes */}
                <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-purple-600 bg-purple-600/10 px-4 py-2 text-purple-300 transition hover:bg-purple-600/20">
                        <ImagePlus className="h-5 w-5" />
                        <span>Seleccionar</span>
                        <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                    </label>

                    <button
                        type="submit"
                        disabled={!file || loading}
                        className="flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-white transition hover:bg-pink-700 disabled:opacity-30"
                    >
                        <Upload className="h-5 w-5" />
                        {loading ? 'Subiendo...' : 'Subir Imagen'}
                    </button>

                    {file && <p className="text-sm text-purple-400">📁 {file.name}</p>}
                </form>

                {/* Vista previa de la imagen seleccionada */}
                {imagePreview && (
                    <div className="mt-4">
                        <img src={imagePreview} alt="Vista previa" className="h-60 w-full rounded-md object-cover" />
                    </div>
                )}

                {/* Mostrar imágenes */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        <p className="col-span-full text-center text-lg font-bold text-white">Cargando...</p>
                    ) : (
                        images.map((image) => (
                            <div key={image.url} className="group relative overflow-hidden rounded-lg border border-purple-800/40 shadow-lg">
                                <img
                                    src={image.url}
                                    alt="Imagen subida"
                                    className="h-60 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                        e.currentTarget.alt = 'Imagen no disponible';
                                    }}
                                />
                                <button
                                    onClick={() => handleDelete(image.url)}
                                    className="absolute top-2 right-2 rounded-full bg-red-600 p-2 text-white shadow hover:bg-red-700"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </AppLayout>
    );
}
