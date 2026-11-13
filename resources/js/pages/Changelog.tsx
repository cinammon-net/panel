import { cinLogo } from '@/lib/brand';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Code2,
    GitBranch,
    History,
    Shield,
    Sparkles,
    Zap,
} from 'lucide-react';

interface Release {
    version: string;
    date: string;
    title: string;
    description: string;
    changes: string[];
}

interface ChangelogProps {
    releases: Release[];
}

export default function Changelog({ releases }: ChangelogProps) {
    return (
        <div className="min-h-screen bg-[#090a0f] text-neutral-100 font-sans selection:bg-pink-500 selection:text-white">
            <Head title="Historial de Actualizaciones & Changelog — Cinammon Network" />

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
                            CHANGELOG OFICIAL
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
            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
                <div className="mb-12 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1 text-xs font-semibold text-pink-400">
                        <History className="h-3.5 w-3.5" />
                        <span>REGISTRO DE CAMBIOS</span>
                    </div>
                    <h1 className="mt-3 font-orbitron text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
                        Notas de Versión de la Plataforma
                    </h1>
                    <p className="mt-2 text-xs sm:text-sm text-neutral-400">
                        Evolución técnica continua de Cinammon Panel, Wings Daemon y clúster del Nodo 1.
                    </p>
                </div>

                {/* Línea de tiempo */}
                <div className="relative border-l border-white/10 pl-6 sm:pl-8 ml-4 sm:ml-6 space-y-12">
                    {releases.map((rel, idx) => (
                        <div key={idx} className="relative group">
                            {/* Punto en la línea de tiempo */}
                            <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-pink-500 bg-[#090a0f] text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                                <div className="h-2 w-2 rounded-full bg-pink-500" />
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-6 sm:p-7 shadow-xl backdrop-blur-xl">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-lg border border-pink-500/40 bg-pink-500/10 px-3 py-1 font-mono text-xs font-bold text-pink-400">
                                            {rel.version}
                                        </span>
                                        <h2 className="font-orbitron text-base sm:text-lg font-bold text-white">
                                            {rel.title}
                                        </h2>
                                    </div>
                                    <span className="font-mono text-xs text-neutral-500">
                                        {rel.date}
                                    </span>
                                </div>

                                <p className="mt-3 text-xs sm:text-sm text-neutral-300">
                                    {rel.description}
                                </p>

                                <div className="mt-5 space-y-2.5">
                                    {rel.changes.map((ch, chIdx) => (
                                        <div key={chIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-400">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                                            <span>{ch}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
