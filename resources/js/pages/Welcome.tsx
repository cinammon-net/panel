import ReviewModal from '@/components/ReviewModal';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import aos from 'aos';
import 'aos/dist/aos.css';
import 'aos/dist/aos.js';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Heart } from 'lucide-react'; // Para el icono de corazón
import { useEffect, useState } from 'react';

const CookieBanner: React.FC = () => {
    const [cookiesAccepted, setCookiesAccepted] = useState<boolean>(false);

    useEffect(() => {
        const accepted = localStorage.getItem('cookiesAccepted') === 'true';
        setCookiesAccepted(accepted);
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('cookiesAccepted', 'true');
        setCookiesAccepted(true);
    };

    if (cookiesAccepted) return null;

    
    return (
        <div className="fixed bottom-0 left-0 z-50 w-full bg-black/70 p-4 text-center text-white">
            <p>
                We use cookies to enhance your experience. By continuing to use this site, you accept our{' '}
                <a href="/privacy" className="text-[#30D5F6] underline">
                    Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/terms" className="text-[#30D5F6] underline">
                    Terms & Conditions
                </a>
                .
            </p>
            <button onClick={acceptCookies} className="mt-2 rounded-md bg-pink-500 px-4 py-2 text-white transition hover:bg-pink-600">
                Accept Cookies
            </button>
        </div>
    );
};



export default function WelcomePanel() {
    const { auth, reviews, posts, galleryImages, stats } = usePage<
        SharedData & {
            reviews: { comment: string; rating: number; user: { name: string } }[];
            posts: { id: number; title: string; content: string; picture?: string; created_at: string }[];
            galleryImages?: string[];
            stats?: { users: number; servers: number; nodes: number; eggs: number };
        }
    >().props;

    const [isModalOpen, setIsModalOpen] = useState(false);
    useEffect(() => {
        aos.init({
            duration: 800,
            once: false,
            easing: 'ease-out',
        });
    }, []);

    const [images] = useState<string[]>(
        galleryImages && galleryImages.length > 0
            ? galleryImages
            : [
                  '/storage/gallery/Dashboard.png',
                  '/storage/gallery/Servers.png',
                  '/storage/gallery/Nodes.png',
                  '/storage/gallery/Create Node.png',
                  '/storage/gallery/Database.png',
                  '/storage/gallery/Users.png',
              ],
    );

    const getImageTitle = (url: string, index: number) => {
        const cleanUrl = url.split('?')[0];
        const fileName = decodeURIComponent(cleanUrl.split('/').pop() || '')
            .replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
        return fileName || `Vista ${index + 1}`;
    };

    // Estado para manejar la imagen seleccionada para el modal
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(1); // Estado para controlar el zoom

    // Función para abrir el modal y mostrar la imagen seleccionada
    const openModal = (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setZoom(1); // Reseteamos el zoom al abrir el modal
    };

    // Función para cerrar el modal
    const closeModal = () => {
        setSelectedImage(null);
        setZoom(1); // Reseteamos el zoom al cerrar el modal
    };

    // Función para hacer zoom en la imagen
    const handleZoomIn = () => {
        setZoom((prevZoom) => prevZoom + 0.1); // Aumenta el zoom
    };

    const handleZoomOut = () => {
        setZoom((prevZoom) => Math.max(1, prevZoom - 0.1)); // Disminuye el zoom, pero no menos de 1
    };
    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&display=swap" rel="stylesheet" />
            </Head>

            <div id="top" className="relative flex min-h-screen flex-col overflow-x-hidden scroll-smooth bg-black font-[Orbitron] text-white">
                <div className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full bg-[radial-gradient(circle,#ffffff_1px,transparent_1px)] bg-[length:22px_22px] opacity-20" />

                {/* NAVBAR FIJO */}
                <header className="animate-fade-in fixed top-0 z-50 flex w-full flex-wrap items-center justify-between gap-4 border-b border-pink-600 bg-black/70 p-6 backdrop-blur-md">
                    <Link href={route('home')} data-aos="fade-right">
                        <img src="/favicon.ico" alt="Cinammon.net Logo" className="h-10 transition hover:opacity-80 sm:h-12" draggable={false} />
                    </Link>
                    <nav className="flex gap-3" data-aos="fade-left">
                        {auth?.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-md bg-pink-500 px-4 py-2 font-semibold text-white shadow transition hover:bg-pink-600"
                            >
                                Panel
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="rounded-md bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 font-semibold text-white shadow hover:from-pink-600 hover:to-fuchsia-700"
                                >
                                    Iniciar sesión
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-md border border-pink-400 px-4 py-2 font-semibold text-pink-300 transition hover:bg-pink-400 hover:text-black"
                                >
                                    Registrarse
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                {/* SECCIÓN 1 */}
                <section
                    className="relative z-10 mt-28 flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center sm:px-10"
                    data-aos="fade-up"
                    data-aos-anchor-placement="top-bottom"
                >
                    <div
                        className="w-full max-w-3xl rounded-xl border-2 border-pink-500 bg-black/60 px-6 py-12 shadow-[0_0_30px_5px_rgba(255,0,150,0.3)] backdrop-blur-sm sm:px-10 sm:py-16"
                        data-aos="zoom-in"
                    >
                        <h1 className="mb-4 text-4xl font-extrabold tracking-widest text-pink-400 sm:text-5xl" data-aos="fade-up">
                            <span className="text-[#00f7ff]">cinammon</span>.net
                        </h1>
                        <p className="text-xl font-semibold text-pink-300 sm:text-2xl" data-aos="fade-up" data-aos-delay="100">
                            Tu red. Tu dominio. Tu juego.
                        </p>
                        <p className="mt-4 text-sm text-pink-400 sm:text-base" data-aos="fade-up" data-aos-delay="200">
                            ¡Únete a nosotros y forma parte de la comunidad desplegando tu panel!
                        </p>
                        <div className="mt-6 sm:mt-8" data-aos="zoom-in" data-aos-delay="300">
                            <Link
                                href={route('register')}
                                className="rounded-md bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-2 font-semibold text-white shadow hover:from-pink-600 hover:to-fuchsia-700"
                            >
                                DEMO
                            </Link>
                        </div>
                    </div>

                    {/* FLECHA HACIA ABAJO */}
                    <div className="mt-10 flex justify-center" data-aos="zoom-in" data-aos-delay="400">
                        <a href="#seccion-siguiente">
                            <img
                                src="https://img.icons8.com/?size=100&id=44002&format=png&color=ff4da6"
                                alt="Desplazar hacia abajo"
                                className="h-10 w-10 animate-bounce drop-shadow-[0_0_6px_#ff4da6] sm:h-10 sm:w-12"
                                draggable={false}
                            />
                        </a>
                    </div>
                </section>

                {/* Banner de cookies */}
                <CookieBanner />

                {/* SECCIÓN DESCRIPCIÓN */}
                <section
                    id="seccion-siguiente"
                    className="relative z-10 flex flex-col items-center justify-center gap-10 px-6 py-20 text-center text-white sm:px-10"
                >
                    <h1 className="mb-6 text-3xl font-bold text-pink-400 sm:text-4xl" data-aos="fade-up">
                        ¿Por qué elegir el Panel Cinammon?
                    </h1>
                    <p className="text-lg font-semibold text-pink-300 sm:text-xl" data-aos="fade-up" data-aos-delay="100">
                        El Panel Cinammon es la solución perfecta para gestionar tu red de forma rápida y sencilla. Con un diseño moderno y una
                        interfaz intuitiva, podrás administrar usuarios, roles y configuraciones del sistema sin complicaciones. Además, su
                        rendimiento optimizado garantiza una experiencia fluida y rápida, con estadísticas en tiempo real para que siempre estés al
                        tanto de la actividad de tu red.
                    </p>
                    <div
                        className="w-full max-w-4xl rounded-xl border-2 border-fuchsia-600 bg-black/50 px-6 py-12 shadow-[0_0_30px_5px_rgba(255,0,150,0.3)] backdrop-blur-md"
                        data-aos="zoom-in"
                        data-aos-delay="200"
                    >
                        <h2 className="mb-6 text-3xl font-bold text-pink-400 sm:text-4xl" data-aos="fade-up" data-aos-delay="300">
                            Características del Panel Cinammon
                        </h2>
                        <div className="grid grid-cols-1 gap-8 text-left text-sm text-pink-100 sm:grid-cols-2 sm:text-base">
                            <div data-aos="fade-up" data-aos-delay="400">
                                <h3 className="mb-1 text-lg font-semibold text-pink-400">⚙️ Control total</h3>
                                <p>Gestiona usuarios, roles y configuraciones del sistema con una interfaz clara y rápida.</p>
                            </div>
                            <div data-aos="fade-up" data-aos-delay="500">
                                <h3 className="mb-1 text-lg font-semibold text-pink-400">🎨 Personalización visual</h3>
                                <p>Cambia colores, temas y diseño con un solo clic. Estilo cyber garantizado.</p>
                            </div>
                            <div data-aos="fade-up" data-aos-delay="600">
                                <h3 className="mb-1 text-lg font-semibold text-pink-400">🚀 Rendimiento extremo</h3>
                                <p>Panel optimizado para ofrecerte velocidad, fluidez y animaciones suaves.</p>
                            </div>
                            <div data-aos="fade-up" data-aos-delay="700">
                                <h3 className="mb-1 text-lg font-semibold text-pink-400">📈 Estadísticas en vivo</h3>
                                <p>Consulta actividad en tiempo real con gráficos, logs y métricas clave.</p>
                            </div>
                        </div>
                        <div className="mt-10" data-aos="zoom-in" data-aos-delay="800">
                            <Link
                                href={route('dashboard')}
                                className="rounded-md bg-gradient-to-r from-fuchsia-600 to-pink-500 px-6 py-2 font-semibold text-white shadow hover:from-fuchsia-700 hover:to-pink-600"
                            >
                                Acceder al Panel
                            </Link>
                        </div>
                    </div>
                </section>

                {/* SECCIÓN DE POSTS */}
                <section className="relative z-10 flex flex-col items-center justify-center gap-12 px-6 py-20 text-center text-white sm:px-10">
                    <h2 className="text-2xl font-bold text-pink-400 sm:text-4xl" data-aos="fade-up">
                        📝 Últimos posts
                    </h2>

                    <div className="grid w-full max-w-4xl grid-cols-1 gap-8 sm:grid-cols-1">
                        {posts.length > 0 ? (
                            posts.map((post, i) => (
                                <div
                                    key={post.id}
                                    className="group relative max-w-sm rounded-lg bg-[#2b182e] shadow-lg"
                                    data-aos="fade-up"
                                    data-aos-delay={i * 50}
                                >
                                    {/* Imagen */}
                                    {post.picture && <img src={post.picture} alt={post.title} className="h-48 w-full rounded-t-lg object-cover" />}

                                    {/* Corazón y contador arriba derecha */}
                                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-sm text-white shadow-md">
                                        <Heart className="h-4 w-4" />3
                                    </div>

                                    {/* Texto dentro de la caja */}
                                    <div className="relative px-4 py-4 text-center text-white">
                                        <h3 className="mb-2 text-lg font-bold">{post.title}</h3>
                                        <p className="mb-4 line-clamp-3 max-h-16 overflow-hidden text-sm leading-relaxed text-gray-300">
                                            {post.content}
                                        </p>

                                        {/* Botón leer, oculto hasta hover */}
                                        <Link
                                            href={`/posts/${post.id}`}
                                            className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded bg-orange-500 px-6 py-2 text-sm font-semibold text-black shadow-md transition-opacity duration-300 group-hover:block group-hover:opacity-100"
                                        >
                                            Leer
                                        </Link>
                                    </div>

                                    {/* Pestaña fecha relativa */}
                                    <div className="rounded-b-lg bg-[#4a2d57] px-4 py-2 text-center text-xs text-gray-300 shadow-inner">
                                        {post.created_at
                                            ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })
                                            : 'Fecha no disponible'}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-pink-400">No hay posts disponibles.</p>
                        )}
                    </div>
                </section>

                {/* SECCIÓN ESTADÍSTICAS */}
                <section className="relative z-10 flex flex-col items-center justify-center gap-12 px-6 py-20 text-center text-white sm:px-10">
                    <h2 className="text-3xl font-bold text-pink-400 sm:text-4xl" data-aos="fade-up">
                        📊 Nuestras estadísticas
                    </h2>
                    <div className="grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
                        <div className="rounded-lg bg-black/60 p-6 shadow-md backdrop-blur-md" data-aos="fade-up" data-aos-delay="100">
                            <p className="text-3xl font-extrabold text-fuchsia-400">{stats?.users ?? 0}</p>
                            <p className="text-sm text-pink-100">Usuarios registrados</p>
                        </div>
                        <div className="rounded-lg bg-black/60 p-6 shadow-md backdrop-blur-md" data-aos="fade-up" data-aos-delay="200">
                            <p className="text-3xl font-extrabold text-fuchsia-400">{stats?.nodes ?? 1}</p>
                            <p className="text-sm text-pink-100">Nodos activos</p>
                        </div>
                        <div className="rounded-lg bg-black/60 p-6 shadow-md backdrop-blur-md" data-aos="fade-up" data-aos-delay="300">
                            <p className="text-3xl font-extrabold text-fuchsia-400">{stats?.servers ?? 0}</p>
                            <p className="text-sm text-pink-100">Servidores activos</p>
                        </div>
                        <div className="rounded-lg bg-black/60 p-6 shadow-md backdrop-blur-md" data-aos="fade-up" data-aos-delay="400">
                            <p className="text-3xl font-extrabold text-fuchsia-400">{stats?.eggs ?? 0}</p>
                            <p className="text-sm text-pink-100">Eggs disponibles</p>
                        </div>
                    </div>
                </section>

                {/* SECCIÓN GALERÍA */}
                <section className="relative z-10 flex flex-col items-center justify-center gap-12 px-6 py-20 text-center text-white sm:px-10">
                    <div className="space-y-3" data-aos="fade-up">
                        <h2 className="text-3xl font-bold text-pink-400 sm:text-4xl">
                            🖼️ Galería de Cinammon
                        </h2>
                        <p className="mx-auto max-w-2xl text-sm text-neutral-400 sm:text-base">
                            Explora las vistas reales de nuestro panel de control para servidores, nodos, bases de datos y monitoreo en tiempo real.
                        </p>
                    </div>

                    {/* Muestra las imágenes en una cuadrícula */}
                    <div className="grid w-full max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {images.map((imageUrl, index) => {
                            const title = getImageTitle(imageUrl, index);
                            return (
                                <div
                                    key={index}
                                    onClick={() => openModal(imageUrl)}
                                    className="group cursor-pointer overflow-hidden rounded-xl border border-pink-500/30 bg-neutral-950/95 shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/70 hover:shadow-[0_0_25px_rgba(236,72,153,0.25)]"
                                    data-aos="zoom-in"
                                    data-aos-delay={index * 80}
                                >
                                    <div className="flex items-center justify-between border-b border-white/10 bg-neutral-900/90 px-4 py-2.5 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                                        </div>
                                        <span className="font-mono font-medium tracking-wide text-pink-300">{title}</span>
                                        <span className="text-[11px] text-neutral-400 transition group-hover:text-pink-400">Ampliar ↗</span>
                                    </div>
                                    <div className="aspect-video w-full overflow-hidden bg-black">
                                        <img
                                            src={imageUrl}
                                            alt={`Cinammon - ${title}`}
                                            className="h-full w-full object-cover object-left-top transition-transform duration-500 group-hover:scale-[1.03]"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* SECCIÓN TESTIMONIOS */}
                <section className="relative z-10 flex flex-col items-center justify-center gap-12 px-6 py-20 text-center text-white sm:px-10">
                    <h2 className="text-2xl font-bold text-pink-400 sm:text-4xl" data-aos="fade-up">
                        💬 Testimonios de nuestros usuarios
                    </h2>

                    <div
                        className={`flex w-full items-center justify-center rounded-lg p-6 text-pink-500 ${
                            reviews && reviews.length === 0 ? '' : 'gap-6'
                        }`}
                        style={{ width: '100%' }}
                    >
                        {reviews && reviews.length > 0 ? (
                            reviews.map((review, i) => (
                                <div
                                    key={i}
                                    className={`scroll-snap-align-start flex-shrink-0 rounded-lg border border-pink-600 bg-transparent p-6 shadow-md ${
                                        reviews.length === 1 ? 'mx-auto w-full max-w-md' : 'w-[48%]'
                                    }`}
                                    data-aos="fade-up"
                                    data-aos-delay={i * 50}
                                >
                                    <p className="text-lg font-semibold text-pink-600">"{review.comment}"</p>
                                    <p className="font-size-16 mt-2 text-3xl text-yellow-600">
                                        {'★'.repeat(review.rating)} {'☆'.repeat(5 - review.rating)}
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-pink-500">— {review.user.name}</p>
                                </div>
                            ))
                        ) : (
                            <div className="flex w-full items-center justify-center rounded-lg p-6 text-pink-500">No hay reseñas disponibles.</div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-6 inline-block rounded-md border border-pink-500 px-5 py-2 font-semibold text-pink-300 transition hover:bg-pink-500 hover:text-black"
                    >
                        Deja tu reseña
                    </button>
                </section>

                {/* Modal de galería a nivel raíz para evitar problemas de z-index con secciones AOS */}
                {selectedImage && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md sm:p-8"
                        onClick={closeModal}
                    >
                        <div
                            className="relative flex max-h-[90vh] max-w-6xl flex-col overflow-hidden rounded-2xl border border-pink-500/40 bg-neutral-950 shadow-[0_0_50px_rgba(236,72,153,0.3)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-white/10 bg-neutral-900 px-5 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-rose-500" />
                                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                                    <span className="ml-2 font-mono text-sm font-semibold text-pink-300">
                                        Cinammon Panel — {getImageTitle(selectedImage, 0)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleZoomOut}
                                        className="rounded-md border border-white/15 bg-neutral-800 px-2.5 py-1 text-sm font-bold text-white transition hover:border-pink-500 hover:bg-neutral-700"
                                        title="Reducir zoom"
                                    >
                                        −
                                    </button>
                                    <span className="min-w-[3.5rem] text-center font-mono text-xs text-neutral-300">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <button
                                        onClick={handleZoomIn}
                                        className="rounded-md border border-white/15 bg-neutral-800 px-2.5 py-1 text-sm font-bold text-white transition hover:border-pink-500 hover:bg-neutral-700"
                                        title="Aumentar zoom"
                                    >
                                        +
                                    </button>
                                    <button
                                        onClick={closeModal}
                                        className="ml-2 rounded-md bg-pink-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-pink-500"
                                        title="Cerrar"
                                    >
                                        ✕ Cerrar
                                    </button>
                                </div>
                            </div>
                            <div className="scrollbar-hide overflow-auto bg-black p-2 sm:p-4">
                                <img
                                    src={selectedImage}
                                    alt="Vista ampliada del panel Cinammon"
                                    className="mx-auto max-h-[78vh] w-auto rounded-lg object-contain transition-transform duration-200"
                                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal */}
                <ReviewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

                <style>
                    {`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}
                </style>

                {/* FLECHA PARA SUBIR */}
                <a href="#top" className="fixed right-6 bottom-6 z-50 animate-bounce p-7 transition hover:opacity-90">
                    <img
                        src="https://img.icons8.com/?size=100&id=71020&format=png&color=ff4da6"
                        alt="Subir arriba"
                        className="h-8 w-8 drop-shadow-[0_0_6px_#ff4da6] sm:h-9 sm:w-9"
                        draggable={false}
                    />
                </a>
            </div>

            {/* FOOTER */}
            <footer className="w-full border-t border-neutral-700 bg-black text-neutral-300">
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-10 text-sm sm:grid-cols-3">
                    <div className="flex flex-col items-start gap-4">
                        <img src="/favicon.ico" alt="Logo Cinammon" className="h-12 w-auto" draggable={false} />
                        <p className="leading-relaxed text-neutral-400">
                            cinammon.net es una plataforma de gestión moderna para redes y comunidades digitales.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h3 className="mb-1 font-semibold text-white">Secciones</h3>
                        <Link href={route('home')} className="hover:text-white hover:underline">
                            Inicio
                        </Link>
                        <Link href={route('dashboard')} className="hover:text-white hover:underline">
                            Panel
                        </Link>
                        <Link href={route('register')} className="hover:text-white hover:underline">
                            Registro
                        </Link>
                        <Link href={route('login')} className="hover:text-white hover:underline">
                            Acceso
                        </Link>
                    </div>
                    <div className="flex flex-col gap-2">
                        <h3 className="mb-1 font-semibold text-white">Información</h3>
                        <a href="mailto:soporte@cinammon.net" className="hover:text-white hover:underline">
                            Contacto
                        </a>
                        <a href="/privacy" className="hover:text-white hover:underline">
                            Política de privacidad
                        </a>
                        <a href="/terms" className="hover:text-white hover:underline">
                            Términos y condiciones
                        </a>
                        <a href="/sponsors" className="hover:text-white hover:underline">
                            Política de Sponsors
                        </a>
                    </div>
                </div>
                <div className="border-t border-neutral-700 px-6 py-4 text-center text-xs text-neutral-500">
                    © {new Date().getFullYear()} cinammon.net — Todos los derechos reservados.
                </div>
                <a
                    href="https://discord.gg/hikarinet"
                    target="_blank"
                    className="fixed bottom-6 left-6 z-50 rounded-full bg-[#5865F2] p-3 shadow-lg transition hover:scale-110"
                    data-aos="fade-left"
                >
                    <img src="https://img.icons8.com/?size=100&id=30998&format=png&color=ffffff" alt="Discord" className="h-8 w-8" />
                </a>
            </footer>
        </>
    );
}
