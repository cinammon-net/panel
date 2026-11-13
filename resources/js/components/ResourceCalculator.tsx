import { Calculator, Cpu, HardDrive, Layers, Server, Shield, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';

interface GameProfile {
    id: string;
    name: string;
    category: string;
    minSlots: number;
    maxSlots: number;
    defaultSlots: number;
    unitLabel: string;
    ramFormula: (val: number) => number;
    cpuFormula: (val: number) => number;
    diskFormula: (val: number) => number;
    description: string;
}

const PROFILES: GameProfile[] = [
    {
        id: 'minecraft',
        name: 'Minecraft Paper',
        category: 'Juegos',
        minSlots: 5,
        maxSlots: 100,
        defaultSlots: 20,
        unitLabel: 'jugadores simultáneos',
        ramFormula: (slots) => Math.max(2, Math.ceil(2 + (slots - 5) * 0.1)),
        cpuFormula: (slots) => (slots > 50 ? 4 : slots > 25 ? 3 : 2),
        diskFormula: (slots) => Math.ceil(15 + slots * 0.35),
        description: 'Optimizado para Paper 1.20+ con recolector ZGC en Java 21 y Aikar flags.',
    },
    {
        id: 'mta',
        name: 'Multi Theft Auto (MTA)',
        category: 'Juegos',
        minSlots: 10,
        maxSlots: 250,
        defaultSlots: 50,
        unitLabel: 'jugadores simultáneos',
        ramFormula: (slots) => Math.max(1, Math.ceil(1 + slots * 0.015)),
        cpuFormula: (slots) => (slots > 120 ? 3 : 2),
        diskFormula: (slots) => Math.ceil(10 + slots * 0.1),
        description: 'Baja latencia UDP para servidores de Roleplay y carreras en el Nodo 1.',
    },
    {
        id: 'nodejs',
        name: 'Node.js & VitePress',
        category: 'Web & Bots',
        minSlots: 1000,
        maxSlots: 100000,
        defaultSlots: 15000,
        unitLabel: 'peticiones / mes',
        ramFormula: (hits) => (hits > 50000 ? 3 : hits > 20000 ? 2 : 1),
        cpuFormula: (hits) => (hits > 40000 ? 2 : 1),
        diskFormula: (hits) => (hits > 40000 ? 20 : 10),
        description: 'Despliegues de sitios estáticos, APIs Express y bots de Discord en Node 22.',
    },
    {
        id: 'mariadb',
        name: 'MariaDB 11.4 Clúster',
        category: 'Bases de Datos',
        minSlots: 1,
        maxSlots: 20,
        defaultSlots: 3,
        unitLabel: 'bases de datos simultáneas',
        ramFormula: (dbCount) => Math.max(1, Math.ceil(dbCount * 0.5)),
        cpuFormula: (dbCount) => (dbCount > 10 ? 2 : 1),
        diskFormula: (dbCount) => Math.ceil(dbCount * 5),
        description: 'Bases de datos transaccionales con motor InnoDB y phpMyAdmin integrado.',
    },
];

export default function ResourceCalculator() {
    const [selectedId, setSelectedId] = useState<string>('minecraft');
    const profile = PROFILES.find((p) => p.id === selectedId) || PROFILES[0];
    const [sliderValue, setSliderValue] = useState<number>(profile.defaultSlots);

    const handleSelectProfile = (p: GameProfile) => {
        setSelectedId(p.id);
        setSliderValue(p.defaultSlots);
    };

    const ramGb = profile.ramFormula(sliderValue);
    const cpuCores = profile.cpuFormula(sliderValue);
    const diskGb = profile.diskFormula(sliderValue);

    return (
        <section id="calculadora" className="relative z-10 w-full px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                {/* Cabecera */}
                <div className="mb-12 text-center" data-aos="fade-up">
                    <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-pink-300">
                        <Calculator className="h-4 w-4 text-pink-400" />
                        <span>SIMULADOR DE RECURSOS</span>
                    </div>
                    <h2 className="mt-4 font-orbitron text-2xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-300 to-amber-200 sm:text-4xl">
                        Calculadora de Recursos & Capacidad
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-neutral-400">
                        Selecciona el tipo de servicio y ajusta la concurrencia estimada para calcular de forma precisa la RAM, CPU y almacenamiento NVMe recomendados.
                    </p>
                </div>

                <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-b from-neutral-900/95 to-neutral-950/95 p-6 sm:p-10 shadow-[0_0_50px_rgba(236,72,153,0.15)] backdrop-blur-xl" data-aos="zoom-in">
                    {/* Selector de perfiles */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {PROFILES.map((p) => {
                            const isSelected = p.id === profile.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectProfile(p)}
                                    className={`flex flex-col items-start rounded-xl p-4 text-left transition ${
                                        isSelected
                                            ? 'border border-pink-500 bg-pink-500/20 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                                            : 'border border-white/10 bg-black/40 text-neutral-400 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-pink-400">
                                        {p.category}
                                    </span>
                                    <span className="mt-1 font-orbitron text-xs font-bold sm:text-sm">
                                        {p.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Descripción del perfil */}
                    <p className="mt-4 text-xs text-neutral-400">
                        {profile.description}
                    </p>

                    {/* Slider de concurrencia */}
                    <div className="mt-8 rounded-xl border border-white/5 bg-black/50 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                Capacidad o Concurrencia Prevista:
                            </span>
                            <span className="font-orbitron text-lg sm:text-xl font-bold text-amber-300">
                                {sliderValue.toLocaleString('es-ES')} {profile.unitLabel}
                            </span>
                        </div>

                        <input
                            type="range"
                            min={profile.minSlots}
                            max={profile.maxSlots}
                            value={sliderValue}
                            onChange={(e) => setSliderValue(parseInt(e.target.value, 10))}
                            className="mt-5 w-full accent-pink-500 cursor-pointer h-2 rounded-lg bg-neutral-800"
                        />

                        <div className="mt-2 flex justify-between font-mono text-[11px] text-neutral-500">
                            <span>{profile.minSlots.toLocaleString('es-ES')}</span>
                            <span>{profile.maxSlots.toLocaleString('es-ES')}</span>
                        </div>
                    </div>

                    {/* Métricas estimadas */}
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-black/40 p-5 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
                                <Layers className="h-5 w-5" />
                            </div>
                            <span className="mt-3 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                Memoria RAM Recomendada
                            </span>
                            <span className="mt-1 block font-orbitron text-2xl font-black text-white">
                                {ramGb} GB DDR4/DDR5
                            </span>
                            <span className="mt-1 block text-[11px] text-neutral-500">
                                Aislamiento dedicado en cgroups
                            </span>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/40 p-5 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                <Cpu className="h-5 w-5" />
                            </div>
                            <span className="mt-3 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                Hilos de CPU (vCPU)
                            </span>
                            <span className="mt-1 block font-orbitron text-2xl font-black text-white">
                                {cpuCores} {cpuCores === 1 ? 'Hilo' : 'Hilos'} Dedicados
                            </span>
                            <span className="mt-1 block text-[11px] text-neutral-500">
                                Frecuencia sostenida sin throttling
                            </span>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/40 p-5 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                <HardDrive className="h-5 w-5" />
                            </div>
                            <span className="mt-3 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                Almacenamiento NVMe
                            </span>
                            <span className="mt-1 block font-orbitron text-2xl font-black text-white">
                                {diskGb} GB PCIe 4.0
                            </span>
                            <span className="mt-1 block text-[11px] text-neutral-500">
                                Transferencia de alta velocidad
                            </span>
                        </div>
                    </div>

                    {/* Botón de acción */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6">
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>Incluye protección perimetral Anti-DDoS, SFTP en puerto 2022 y respaldos automáticos.</span>
                        </div>

                        <a
                            href="https://panel.cinammon.net/servers/create"
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-pink-500 bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-3 font-orbitron text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_25px_rgba(236,72,153,0.4)] transition hover:from-pink-500 hover:to-rose-500"
                        >
                            <Zap className="h-4 w-4" />
                            <span>Crear Servidor en el Panel</span>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
