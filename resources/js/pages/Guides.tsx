import { cinLogo } from '@/lib/brand';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Clock,
    Copy,
    Database,
    ExternalLink,
    FileCode,
    Globe,
    Layers,
    Server,
    Shield,
    Terminal,
} from 'lucide-react';
import { useState } from 'react';

interface GuideStep {
    title: string;
    content: string;
}

interface Guide {
    slug: string;
    title: string;
    category: string;
    read_time: string;
    summary: string;
    steps: GuideStep[];
}

interface GuidesProps {
    guides: Guide[];
    currentSlug?: string;
    guide?: Guide;
}

export default function Guides({ guides, currentSlug, guide: initialGuide }: GuidesProps) {
    const [selectedSlug, setSelectedSlug] = useState<string>(
        currentSlug || (guides.length > 0 ? guides[0].slug : '')
    );
    const [search, setSearch] = useState('');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const activeGuide =
        guides.find((g) => g.slug === selectedSlug) || initialGuide || guides[0];

    const filteredGuides = guides.filter(
        (g) =>
            g.title.toLowerCase().includes(search.toLowerCase()) ||
            g.category.toLowerCase().includes(search.toLowerCase()) ||
            g.summary.toLowerCase().includes(search.toLowerCase())
    );

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="min-h-screen bg-[#090a0f] text-neutral-100 font-sans selection:bg-pink-500 selection:text-white">
            <Head title="Guías Técnicas Oficiales — Cinammon Network" />

            {/* Cabecera */}
            <header className="sticky top-0 z-40 border-b border-white/5 bg-[#090a0f]/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
                            <img src={cinLogo()} alt="Cinammon Logo" className="h-7 w-7 object-contain" />
                            <span className="font-orbitron text-sm font-bold tracking-wider text-white">
                                CINAMMON<span className="text-pink-500">.NET</span>
                            </span>
                        </Link>
                        <span className="hidden rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-pink-400 sm:inline-block">
                            DOCUMENTACIÓN TÉCNICA
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-neutral-300 transition hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-white"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Volver a la portada</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Contenido principal */}
            <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
                <div className="mb-8 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1 text-xs font-semibold text-pink-400">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>GUÍAS PASO A PASO</span>
                    </div>
                    <h1 className="mt-3 font-orbitron text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                        Centro de Soporte & Guías del Nodo
                    </h1>
                    <p className="mt-2 text-xs sm:text-sm text-neutral-400">
                        Manuales de configuración técnica detallados basados fielmente en la arquitectura del Nodo Cinammon 1.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* Barra lateral de navegación de guías */}
                    <div className="lg:col-span-4">
                        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-4 backdrop-blur-xl">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar en las guías..."
                                className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            />

                            <div className="mt-4 space-y-1.5">
                                {filteredGuides.map((g) => {
                                    const active = g.slug === activeGuide?.slug;
                                    return (
                                        <button
                                            key={g.slug}
                                            onClick={() => setSelectedSlug(g.slug)}
                                            className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                                                active
                                                    ? 'border border-pink-500/40 bg-pink-500/10 text-white'
                                                    : 'border border-transparent text-neutral-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                        >
                                            <div className="mt-0.5 shrink-0">
                                                {g.category.includes('Acceso') && <Terminal className="h-4 w-4 text-pink-400" />}
                                                {g.category.includes('Bases') && <Database className="h-4 w-4 text-amber-400" />}
                                                {g.category.includes('Redes') && <Globe className="h-4 w-4 text-cyan-400" />}
                                                {g.category.includes('Juegos') && <Server className="h-4 w-4 text-emerald-400" />}
                                                {g.category.includes('Web') && <FileCode className="h-4 w-4 text-indigo-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="block font-orbitron text-xs font-bold leading-snug line-clamp-2">
                                                    {g.title}
                                                </span>
                                                <span className="mt-1 block text-[10px] text-neutral-500">
                                                    {g.category} · {g.read_time}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Contenido de la guía seleccionada */}
                    <div className="lg:col-span-8">
                        {activeGuide ? (
                            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
                                <div className="border-b border-white/10 pb-6">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-md border border-pink-500/30 bg-pink-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-pink-400">
                                            {activeGuide.category}
                                        </span>
                                        <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                                            <Clock className="h-3 w-3" />
                                            {activeGuide.read_time} de lectura
                                        </span>
                                    </div>
                                    <h2 className="mt-3 font-orbitron text-xl sm:text-2xl font-black text-white">
                                        {activeGuide.title}
                                    </h2>
                                    <p className="mt-2 text-xs sm:text-sm text-neutral-300">
                                        {activeGuide.summary}
                                    </p>
                                </div>

                                {/* Pasos numerados */}
                                <div className="mt-8 space-y-6">
                                    {activeGuide.steps.map((step, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl border border-white/5 bg-black/40 p-5 transition hover:border-white/10"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-500/20 font-mono text-xs font-bold text-pink-400 border border-pink-500/30">
                                                    {idx + 1}
                                                </span>
                                                <h3 className="font-orbitron text-sm font-bold text-white">
                                                    {step.title}
                                                </h3>
                                            </div>
                                            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-neutral-300 pl-10">
                                                {step.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6">
                                    <span className="text-xs text-neutral-400">
                                        ¿Necesitas asistencia técnica personalizada?
                                    </span>
                                    <a
                                        href="https://discord.gg/U5EaDJerhZ"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl border border-pink-500/40 bg-pink-600/20 px-4 py-2 font-orbitron text-xs font-bold uppercase tracking-wider text-pink-300 transition hover:bg-pink-600/30 hover:text-white"
                                    >
                                        <span>Canal de Soporte en Discord</span>
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-12 text-center">
                                <BookOpen className="mx-auto h-8 w-8 text-neutral-600" />
                                <p className="mt-3 text-sm text-neutral-400">No se encontraron guías con ese criterio.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
