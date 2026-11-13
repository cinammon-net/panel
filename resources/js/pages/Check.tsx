import { cinLogo } from '@/lib/brand';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Copy,
    Globe,
    Radio,
    RefreshCw,
    Server as ServerIcon,
    Shield,
    Terminal,
    Wifi,
    XCircle,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

interface RecommendedPort {
    name: string;
    port: number;
    type: 'minecraft' | 'mta' | 'http' | 'tcp';
}

interface CheckProps {
    defaultHost: string;
    recommendedPorts: RecommendedPort[];
}

interface PingResult {
    online: boolean;
    host: string;
    port: number;
    type: string;
    latency_ms: number | null;
    status_code?: number;
    version?: string;
    players?: {
        online: number;
        max: number;
    };
    motd?: string;
    message: string;
}

export default function Check({ defaultHost, recommendedPorts }: CheckProps) {
    const [host, setHost] = useState(defaultHost);
    const [port, setPort] = useState('25565');
    const [type, setType] = useState('auto');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PingResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedBadge, setCopiedBadge] = useState(false);

    const handlePing = async (targetHost?: string, targetPort?: number, targetType?: string) => {
        const pingHost = targetHost ?? host;
        const pingPort = targetPort ?? parseInt(port, 10);
        const pingType = targetType ?? type;

        if (!pingHost || isNaN(pingPort)) {
            setError('Por favor indica un host y un puerto válidos.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/api/check/ping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token || '',
                },
                body: JSON.stringify({
                    host: pingHost,
                    port: pingPort,
                    type: pingType,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Error en la comprobación.');
                setResult(null);
            } else {
                setResult(data);
            }
        } catch {
            setError('Error de comunicación con el servicio de comprobación.');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPreset = (p: RecommendedPort) => {
        setPort(p.port.toString());
        setType(p.type);
        handlePing(host, p.port, p.type);
    };

    const badgeUrl = `https://cinammon.net/api/servers/nodo-1/badge.svg`;

    const handleCopyBadge = () => {
        navigator.clipboard.writeText(`<img src="${badgeUrl}" alt="Estado Cinammon" />`);
        setCopiedBadge(true);
        setTimeout(() => setCopiedBadge(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#090a0f] text-neutral-100 font-sans selection:bg-pink-500 selection:text-white">
            <Head title="Comprobador de Servidores y Puertos — Cinammon Network" />

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
                            CHECKER TOOL
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

            {/* Cuerpo principal */}
            <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
                {/* Título de la sección */}
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1 text-xs font-semibold text-pink-400">
                        <Radio className="h-3.5 w-3.5 animate-pulse" />
                        <span>DIAGNÓSTICO EN TIEMPO REAL</span>
                    </div>
                    <h1 className="mt-4 font-orbitron text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
                        Comprobador de Servidores & Puertos
                    </h1>
                    <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-neutral-400">
                        Comprueba al instante la disponibilidad, latencia y telemetría de cualquier servidor de Minecraft, Multi Theft Auto, servicios web o puertos TCP del nodo.
                    </p>
                </div>

                {/* Formulario y selector */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-6 shadow-2xl backdrop-blur-xl">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handlePing();
                        }}
                        className="grid grid-cols-1 gap-4 sm:grid-cols-12"
                    >
                        <div className="sm:col-span-6">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                Dirección IP o Hostname
                            </label>
                            <div className="relative mt-1.5">
                                <Globe className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                                <input
                                    type="text"
                                    value={host}
                                    onChange={(e) => setHost(e.target.value)}
                                    placeholder="nodo.cinammon.net"
                                    className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-3 font-mono text-sm text-white placeholder-neutral-600 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                Puerto
                            </label>
                            <input
                                type="number"
                                value={port}
                                onChange={(e) => setPort(e.target.value)}
                                placeholder="25565"
                                min={1}
                                max={65535}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 font-mono text-sm text-white placeholder-neutral-600 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            />
                        </div>

                        <div className="sm:col-span-3 flex items-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-pink-500/50 bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 font-orbitron text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] transition hover:from-pink-500 hover:to-rose-500 disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                <span>{loading ? 'Verificando...' : 'Comprobar'}</span>
                            </button>
                        </div>
                    </form>

                    {/* Presets rápidos */}
                    <div className="mt-6 border-t border-white/5 pt-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                            Pruebas Rápidas en el Nodo Cinammon:
                        </span>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                            {recommendedPorts.map((p, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectPreset(p)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-pink-500/40 hover:bg-pink-500/10 hover:text-white"
                                >
                                    <Zap className="h-3 w-3 text-amber-400" />
                                    <span>{p.name}</span>
                                    <span className="font-mono text-[11px] text-pink-400">:{p.port}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-6 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs sm:text-sm text-rose-300">
                        <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Resultado */}
                {result && (
                    <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-6 shadow-2xl backdrop-blur-xl">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
                            <div className="flex items-center gap-3">
                                {result.online ? (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                        <XCircle className="h-6 w-6" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-orbitron text-lg font-bold text-white">
                                            {result.host}:{result.port}
                                        </h3>
                                        <span
                                            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                                                result.online
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                            }`}
                                        >
                                            {result.online ? 'EN LÍNEA' : 'FUERA DE LÍNEA'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-400">{result.message}</p>
                                </div>
                            </div>

                            {result.latency_ms !== null && (
                                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2 font-mono text-xs">
                                    <Activity className="h-4 w-4 text-pink-400" />
                                    <span className="text-neutral-400">Latencia:</span>
                                    <span className="font-bold text-white">{result.latency_ms} ms</span>
                                </div>
                            )}
                        </div>

                        {/* Detalles de Minecraft si aplica */}
                        {result.type === 'minecraft' && result.online && (
                            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {result.version && (
                                    <div className="rounded-xl border border-white/5 bg-black/30 p-3.5">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                                            Versión del Motor
                                        </span>
                                        <p className="mt-1 font-mono text-sm font-bold text-amber-400">
                                            {result.version}
                                        </p>
                                    </div>
                                )}

                                {result.players && (
                                    <div className="rounded-xl border border-white/5 bg-black/30 p-3.5">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                                            Jugadores Conectados
                                        </span>
                                        <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                                            {result.players.online} / {result.players.max}
                                        </p>
                                    </div>
                                )}

                                {result.motd && (
                                    <div className="rounded-xl border border-white/5 bg-black/30 p-3.5 sm:col-span-3">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                                            Descripción del Servidor (MOTD)
                                        </span>
                                        <p className="mt-1 font-mono text-xs text-neutral-300">
                                            {result.motd}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Generador de Insignia SVG */}
                <div className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-6 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-pink-500" />
                        <h3 className="font-orbitron text-base font-bold text-white">
                            Insignia Dinámica de Estado (SVG Badge)
                        </h3>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm text-neutral-400">
                        Inserta una insignia de disponibilidad en vivo en tu Discord, página web o documentación de GitHub. Se actualiza en tiempo real de forma automática.
                    </p>

                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/5 bg-black/50 p-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-neutral-400">Vista previa:</span>
                            <img src="/api/servers/nodo-1/badge.svg" alt="Insignia Estado" className="h-7 w-auto" />
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyBadge}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                        >
                            <Copy className="h-3.5 w-3.5" />
                            <span>{copiedBadge ? 'Código Copiado' : 'Copiar Código HTML'}</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
