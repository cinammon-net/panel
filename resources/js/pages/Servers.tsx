import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    Bot,
    Box,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Copy,
    Cpu,
    Database,
    Egg,
    Filter,
    Folder,
    Gamepad2,
    HardDrive,
    Image as ImageIcon,
    Layers,
    LayoutGrid,
    List,
    MapPin,
    Mic,
    Pencil,
    Power,
    Radio,
    Server,
    Sparkles,
    Terminal,
    Trash2,
    User,
    Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface ServerItem {
    id: number;
    uuid: string;
    name: string;
    banner?: string | null;
    author?: string;
    description?: string;
    node: string;
    egg: string;
    category?: string;
    nest?: string;
    status: string;
    servers?: number;
    database: string | number;
    backups?: number;
    allocation: string;
    username: string;
    cpu?: number;
    memory?: number;
    disk?: number;
}

interface Pagination<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number;
    to: number;
    total: number;
    per_page: number;
}

function CopyAddress({ address }: { address: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (!address || address === '–') return;
                navigator.clipboard.writeText(address);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }}
            className="text-cyan-400/80 hover:text-cyan-300 transition-colors p-0.5"
            title="Copiar IP:Puerto"
        >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
        </button>
    );
}

const PRESET_BANNERS = [
    {
        name: 'Minecraft Bosque',
        url: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=1200&q=80',
    },
    {
        name: 'Minecraft Nether',
        url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    },
    {
        name: 'Cyberpunk Neon',
        url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80',
    },
    {
        name: 'Discord Purple Wave',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    },
    {
        name: 'Datacenter Matrix',
        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    },
    {
        name: 'Gaming Red Arena',
        url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    },
];

function ServerCard({ item }: { item: ServerItem }) {
    const isOnline = item.status === 'online';
    const cpuVal = item.cpu ? `${item.cpu}%` : '∞';
    const memVal = item.memory
        ? item.memory >= 1024
            ? `${(item.memory / 1024).toFixed(1)} GiB`
            : `${item.memory} MiB`
        : '∞';
    const diskVal = item.disk
        ? item.disk >= 1024
            ? `${(item.disk / 1024).toFixed(1)} GiB`
            : `${item.disk} MiB`
        : '∞';

    // Determinar fondo por defecto según huevo/categoría
    const defaultBanner = useMemo(() => {
        const cat = (item.category || '').toLowerCase();
        const egg = (item.egg || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        if (cat.includes('bot') || egg.includes('discord') || name.includes('bot')) {
            return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
        }
        if (cat.includes('minecraft') || egg.includes('minecraft') || egg.includes('paper') || egg.includes('purpur')) {
            return 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=1200&q=80';
        }
        if (cat.includes('game')) {
            return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
        }
        return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80';
    }, [item.category, item.egg, item.name]);

    const [bannerUrl, setBannerUrl] = useState<string>(() => {
        if (item.banner) return item.banner;
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(`cinammon_server_banner_${item.id}`);
            if (cached) return cached;
        }
        return defaultBanner;
    });

    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [customInput, setCustomInput] = useState(bannerUrl || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleApplyBanner = (url: string) => {
        setBannerUrl(url);
        if (typeof window !== 'undefined') {
            if (url) {
                localStorage.setItem(`cinammon_server_banner_${item.id}`, url);
            } else {
                localStorage.removeItem(`cinammon_server_banner_${item.id}`);
            }
        }
        setIsSaving(true);
        router.post(
            `/servers/${item.id}/banner`,
            { banner: url || null },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setIsSaving(false);
                    setIsBannerModalOpen(false);
                },
            }
        );
    };

    return (
        <div
            onClick={() => router.visit(`/servers/${item.id}/console`)}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border min-h-[240px] transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl ${
                isOnline
                    ? 'border-emerald-500/40 bg-neutral-950/90 hover:border-emerald-400 hover:shadow-[0_0_35px_rgba(16,185,129,0.25)]'
                    : 'border-neutral-800 bg-neutral-950/90 hover:border-cyan-500/70 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]'
            }`}
        >
            {/* Imagen de fondo con zoom suave en hover */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                style={{ backgroundImage: `url(${bannerUrl || defaultBanner})` }}
            />

            {/* Capa de degradado oscuro de alto contraste y legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#040711] via-[#040711]/92 to-[#040711]/70 backdrop-blur-[1px] transition-opacity duration-300 group-hover:via-[#040711]/85" />

            {/* Borde lateral de estado */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-2 transition-all ${
                    isOnline ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-neutral-700'
                }`}
            />

            {/* Contenido Superior e Intermedio */}
            <div className="relative z-10 p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 pl-1">
                        <div className="flex items-center gap-3">
                            <span
                                className={`flex h-3 w-3 shrink-0 rounded-full ${
                                    isOnline
                                        ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse'
                                        : 'bg-neutral-600'
                                }`}
                            />
                            <h3
                                className="truncate text-lg sm:text-xl font-bold tracking-wide text-white group-hover:text-cyan-300 transition-colors"
                                title={item.name}
                            >
                                {item.name}
                            </h3>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-md bg-cyan-950/90 border border-cyan-800/80 px-2.5 py-0.5 text-cyan-300 font-semibold tracking-wide">
                                {item.egg}
                            </span>
                            <span className="text-neutral-300 font-mono text-[11px] flex items-center gap-1 bg-black/60 px-2.5 py-0.5 rounded border border-neutral-800">
                                <MapPin size={11} className="text-cyan-500" /> {item.node}
                            </span>
                            <span className="text-neutral-300 font-mono text-[11px] flex items-center gap-1 bg-black/60 px-2.5 py-0.5 rounded border border-neutral-800">
                                <User size={11} className="text-purple-400" /> {item.username}
                            </span>
                        </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Botón Cambiar Fondo */}
                        <button
                            type="button"
                            onClick={() => {
                                setCustomInput(bannerUrl || '');
                                setIsBannerModalOpen(true);
                            }}
                            className="p-2 rounded-lg border border-purple-500/50 bg-purple-950/40 text-purple-300 hover:border-purple-400 hover:bg-purple-900/60 transition shadow-sm"
                            title="Personalizar imagen de fondo del servidor"
                        >
                            <ImageIcon size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => router.visit(`/servers/${item.id}/console`)}
                            className="p-2 rounded-lg border border-cyan-700/60 bg-cyan-950/50 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-900/60 transition shadow-sm"
                            title="Consola"
                        >
                            <Terminal size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => router.visit(`/servers/${item.id}/files`)}
                            className="p-2 rounded-lg border border-cyan-700/60 bg-cyan-950/50 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-900/60 transition shadow-sm"
                            title="Archivos"
                        >
                            <Folder size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => router.visit(`/servers/${item.id}/edit`)}
                            className="p-2 rounded-lg border border-neutral-700 bg-neutral-900/80 text-neutral-400 hover:text-white hover:border-neutral-500 transition shadow-sm"
                            title="Configuración"
                        >
                            <Pencil size={15} />
                        </button>
                    </div>
                </div>

                {/* Dirección y Estado */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div
                        className="inline-flex items-center gap-2 rounded-lg bg-black/85 border border-cyan-900/80 px-3 py-1.5 text-cyan-300 font-mono text-xs shadow-inner"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Radio size={13} className="text-cyan-400 shrink-0" />
                        <span className="tracking-wider">{item.allocation}</span>
                        <CopyAddress address={item.allocation} />
                    </div>

                    <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                            isOnline
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                        }`}
                    >
                        <Power size={12} className={isOnline ? 'text-emerald-400' : 'text-neutral-500'} />
                        <span>{isOnline ? 'En línea' : 'Detenido'}</span>
                    </span>
                </div>
            </div>

            {/* Barras de Recursos (Gauges visuales de CPU, RAM y Disco) */}
            <div className="relative z-10 border-t border-cyan-950/80 bg-black/75 p-4 sm:px-6">
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                    {/* CPU */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-neutral-400 flex items-center gap-1.5">
                                <Cpu size={12} className="text-cyan-400" /> CPU
                            </span>
                            <span className="font-bold text-neutral-200">{cpuVal}</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-900/90 rounded-full overflow-hidden border border-cyan-950">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    isOnline ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-neutral-700'
                                }`}
                                style={{ width: item.cpu ? `${Math.min(100, item.cpu)}%` : isOnline ? '25%' : '0%' }}
                            />
                        </div>
                    </div>

                    {/* RAM */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-neutral-400 flex items-center gap-1.5">
                                <Zap size={12} className="text-purple-400" /> RAM
                            </span>
                            <span className="font-bold text-neutral-200 truncate">{memVal}</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-900/90 rounded-full overflow-hidden border border-cyan-950">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    isOnline ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_8px_#ec4899]' : 'bg-neutral-700'
                                }`}
                                style={{ width: item.memory ? '50%' : isOnline ? '30%' : '0%' }}
                            />
                        </div>
                    </div>

                    {/* DISCO */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-neutral-400 flex items-center gap-1.5">
                                <HardDrive size={12} className="text-blue-400" /> DISCO
                            </span>
                            <span className="font-bold text-neutral-200 truncate">{diskVal}</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-900/90 rounded-full overflow-hidden border border-cyan-950">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    isOnline ? 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_#06b6d4]' : 'bg-neutral-700'
                                }`}
                                style={{ width: item.disk ? '40%' : isOnline ? '20%' : '0%' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para personalizar Fondo del Servidor */}
            {isBannerModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-[Orbitron]"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsBannerModalOpen(false);
                    }}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl border border-cyan-700/80 bg-[#090e17] p-6 text-white shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
                            <div className="flex items-center gap-2 text-cyan-300">
                                <ImageIcon className="h-5 w-5 text-cyan-400" />
                                <h3 className="text-base font-bold tracking-wider">FONDO DEL SERVIDOR</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBannerModalOpen(false)}
                                className="text-neutral-400 hover:text-white text-lg font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-neutral-400">
                            Elige una imagen de fondo predefinida o introduce una URL (Minecraft, Discord bot, Cyberpunk, etc.).
                        </p>

                        {/* Presets */}
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-cyan-400">Fondos recomendados:</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {PRESET_BANNERS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => {
                                            setCustomInput(preset.url);
                                            handleApplyBanner(preset.url);
                                        }}
                                        className="group/preset relative h-16 rounded-lg overflow-hidden border border-cyan-900/60 hover:border-cyan-400 transition"
                                    >
                                        <img src={preset.url} alt={preset.name} className="h-full w-full object-cover group-hover/preset:scale-110 transition duration-300" />
                                        <div className="absolute inset-0 bg-black/60 flex items-end p-1.5">
                                            <span className="text-[10px] font-bold text-neutral-200 truncate">{preset.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* URL Personalizada */}
                        <div className="space-y-2 pt-2">
                            <label className="text-xs font-semibold text-cyan-400">O introduce una URL de imagen:</label>
                            <input
                                type="url"
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                placeholder="https://ejemplo.com/mi-fondo.png"
                                className="w-full rounded-lg border border-cyan-800 bg-black/80 px-3 py-2 text-xs text-cyan-200 outline-none focus:border-cyan-400"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-cyan-950">
                            <button
                                type="button"
                                onClick={() => handleApplyBanner('')}
                                className="text-xs text-rose-400 hover:text-rose-300 underline"
                            >
                                Restaurar por defecto
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsBannerModalOpen(false)}
                                    className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleApplyBanner(customInput)}
                                    className="rounded-lg bg-cyan-500 hover:bg-cyan-400 px-4 py-1.5 text-xs font-bold text-black transition shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50"
                                >
                                    {isSaving ? 'Guardando…' : 'Guardar fondo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Servers() {
    const { servers, filters, categoryCounts, statusCounts } = usePage<{
        servers: Pagination<ServerItem>;
        filters: { search?: string; sort?: string; direction?: string; per_page?: number; category?: string; status?: string };
        categoryCounts?: Record<string, number>;
        statusCounts?: { all: number; online: number; offline: number };
    }>().props;

    const [search, setSearch] = useState(filters.search || '');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>(filters.category || 'all');
    const [selectedStatus, setSelectedStatus] = useState<string>(filters.status || 'all');
    const [selectedMcSubcat, setSelectedMcSubcat] = useState<string>('all');
    const [isMcExpanded, setIsMcExpanded] = useState<boolean>(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
    const [groupBy, setGroupBy] = useState<'none' | 'category' | 'status' | 'node' | 'username' | 'egg'>('none');
    const [groupDirection, setGroupDirection] = useState<'asc' | 'desc'>('asc');

    // Categorías principales
    const categoryTabs = [
        { id: 'all', label: 'All Categories', icon: Server, count: categoryCounts?.all ?? servers.total },
        { id: 'minecraft', label: 'Minecraft', icon: Box, count: categoryCounts?.minecraft ?? 0, hasSubcats: true },
        { id: 'games', label: 'Games', icon: Gamepad2, count: categoryCounts?.games ?? 0 },
        { id: 'bots', label: 'Bots & Discord', icon: Bot, count: categoryCounts?.bots ?? 0 },
        { id: 'database', label: 'Databases', icon: Database, count: categoryCounts?.database ?? 0 },
        { id: 'voice', label: 'Voice & Audio', icon: Mic, count: categoryCounts?.voice ?? 0 },
        { id: 'software', label: 'Software', icon: Layers, count: categoryCounts?.software ?? 0 },
    ];

    // Subcategorías de Minecraft
    const mcSubcategories = [
        { id: 'all', label: 'All Minecraft', count: 30 },
        { id: 'mods', label: '⚙️ Mods & Híbridos', count: 13 },
        { id: 'plugins', label: '⚡ Plugins & Perf', count: 6 },
        { id: 'proxies', label: '🌐 Proxies & Redes', count: 6 },
        { id: 'vanilla', label: '🧱 Vanilla & Bedrock', count: 5 },
    ];

    const getMcSubcategory = (eggName: string): string => {
        const lower = (eggName || '').toLowerCase();
        if (
            lower.includes('forge') ||
            lower.includes('fabric') ||
            lower.includes('quilt') ||
            lower.includes('mohist') ||
            lower.includes('magma') ||
            lower.includes('ketting') ||
            lower.includes('ftb') ||
            lower.includes('beast') ||
            lower.includes('curseforge') ||
            lower.includes('modrinth')
        ) {
            return 'mods';
        }
        if (
            lower.includes('paper') ||
            lower.includes('purpur') ||
            lower.includes('folia') ||
            lower.includes('spigot') ||
            lower.includes('spongevanilla')
        ) {
            return 'plugins';
        }
        if (
            lower.includes('velocity') ||
            lower.includes('bungeecord') ||
            lower.includes('waterfall') ||
            lower.includes('limbo') ||
            lower.includes('nanolimbo') ||
            lower.includes('waterdog')
        ) {
            return 'proxies';
        }
        if (lower.includes('vanilla') || lower.includes('bedrock') || lower.includes('cuberite') || lower.includes('generic java')) {
            return 'vanilla';
        }
        return 'mods';
    };

    const applyFilters = (newCategory: string, newStatus: string) => {
        setSelectedCategory(newCategory);
        setSelectedStatus(newStatus);
        router.get(
            '/servers',
            {
                ...filters,
                category: newCategory,
                status: newStatus,
                search,
                page: 1,
            },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleSelectCategory = (catId: string) => {
        if (catId === 'minecraft') {
            setIsMcExpanded(true);
        }
        applyFilters(catId, selectedStatus);
    };

    const handleSelectStatus = (statusId: string) => {
        applyFilters(selectedCategory, statusId);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/servers',
            { ...filters, search, category: selectedCategory, status: selectedStatus },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleSort = (field: string) => {
        const isSameField = filters.sort === field;
        const newDirection = isSameField && filters.direction === 'asc' ? 'desc' : 'asc';

        router.get(
            '/servers',
            {
                ...filters,
                sort: field,
                direction: newDirection,
                search,
                category: selectedCategory,
                status: selectedStatus,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const toggleGroupDirection = () => {
        setGroupDirection(groupDirection === 'asc' ? 'desc' : 'asc');
    };

    // Filtrar localmente por subcategoría de Minecraft si aplica
    const filteredServers = useMemo(() => {
        if (selectedCategory === 'minecraft' && selectedMcSubcat !== 'all') {
            return servers.data.filter((s) => getMcSubcategory(s.egg) === selectedMcSubcat);
        }
        return servers.data;
    }, [servers.data, selectedCategory, selectedMcSubcat]);

    // Agrupación
    const groupedServers = useMemo(() => {
        return filteredServers.reduce((acc: Record<string, ServerItem[]>, server) => {
            let key = 'General';
            if (groupBy === 'category') {
                key = server.category ? server.category.toUpperCase() : 'OTHER';
            } else if (groupBy === 'status') {
                key = server.status === 'online' ? '🟢 EN LÍNEA (ONLINE)' : '⚪ APAGADOS (OFFLINE)';
            } else if (groupBy === 'node') {
                key = server.node || 'Unknown';
            } else if (groupBy === 'username') {
                key = server.username || 'Unknown';
            } else if (groupBy === 'egg') {
                key = server.egg || 'Unknown';
            }
            if (!acc[key]) acc[key] = [];
            acc[key].push(server);
            return acc;
        }, {});
    }, [filteredServers, groupBy]);

    const sortedGroups = useMemo(() => {
        if (groupBy === 'none') return [];
        return Object.keys(groupedServers).sort((a, b) =>
            groupDirection === 'asc' ? a.localeCompare(b) : b.localeCompare(a),
        );
    }, [groupedServers, groupBy, groupDirection]);

    return (
        <AppLayout variant="header" breadcrumbs={[{ title: 'Servers', href: '/servers' }]}>
            <Head title="Servers">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white p-3 sm:p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                {/* Header Superior con Filtros Rápidos Pelican */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-900/50 pb-4">
                    <div className="flex items-center gap-3">
                        <Server className="h-7 w-7 text-cyan-400 shrink-0" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400">
                                SERVERS
                            </h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                                {statusCounts?.all ?? servers.total} servidores registrados
                            </p>
                        </div>
                    </div>

                    {/* Filtros rápidos de estado estilo Pelican */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleSelectStatus('all')}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                selectedStatus === 'all'
                                    ? 'bg-cyan-500 text-black shadow-md'
                                    : 'border border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-cyan-300'
                            }`}
                        >
                            Todos <span className="opacity-70 font-mono text-[11px] ml-1">({statusCounts?.all ?? servers.total})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSelectStatus('online')}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                selectedStatus === 'online'
                                    ? 'bg-emerald-500 text-black shadow-md'
                                    : 'border border-neutral-800 bg-neutral-900/80 text-emerald-400/90 hover:text-emerald-300'
                            }`}
                        >
                            En línea <span className="opacity-70 font-mono text-[11px] ml-1">({statusCounts?.online ?? 0})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSelectStatus('offline')}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                selectedStatus === 'offline'
                                    ? 'bg-neutral-700 text-white shadow-md'
                                    : 'border border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-neutral-200'
                            }`}
                        >
                            Detenidos <span className="opacity-70 font-mono text-[11px] ml-1">({statusCounts?.offline ?? 0})</span>
                        </button>

                        {/* Botón para desplegar filtros avanzados de categoría */}
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
                                showFilters || selectedCategory !== 'all'
                                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                                    : 'border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-cyan-300 hover:border-cyan-800'
                            }`}
                            title="Filtros avanzados por categoría y juego"
                        >
                            <Filter size={13} className={selectedCategory !== 'all' ? 'text-cyan-400' : ''} />
                            <span>Categorías {selectedCategory !== 'all' ? `(${selectedCategory})` : ''}</span>
                            {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>

                        <button
                            onClick={() => router.visit('/servers/create')}
                            className="rounded-lg border border-cyan-400 bg-cyan-500/20 px-4 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_12px_rgba(34,211,238,0.2)] ml-2"
                        >
                            + New Server
                        </button>
                    </div>
                </div>

                {/* Cajón de Filtros Desplegable */}
                {showFilters && (
                    <div className="mb-5 rounded-xl border border-cyan-800/60 bg-neutral-950/90 p-4 shadow-xl backdrop-blur-md space-y-3">
                        <div className="flex items-center justify-between border-b border-cyan-950 pb-2">
                            <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                                <Layers size={13} /> Filtrar por Categoría
                            </span>
                            {selectedCategory !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory('all');
                                        setSelectedMcSubcat('all');
                                    }}
                                    className="text-[11px] text-cyan-500 hover:underline"
                                >
                                    Restablecer categorías
                                </button>
                            )}
                        </div>

                        {/* Pills de categorías */}
                        <div className="flex flex-wrap items-center gap-2">
                            {categoryTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = selectedCategory === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => handleSelectCategory(tab.id)}
                                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                            isActive
                                                ? 'border border-cyan-400 bg-cyan-500 text-black shadow-sm'
                                                : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-cyan-700 hover:text-cyan-300'
                                        }`}
                                    >
                                        <Icon size={13} className={isActive ? 'text-black' : 'text-cyan-400'} />
                                        <span>{tab.label}</span>
                                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${isActive ? 'bg-black/20 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Subcategorías de Minecraft si está activo */}
                        {selectedCategory === 'minecraft' && (
                            <div className="pt-2 border-t border-cyan-950/80 flex flex-wrap items-center gap-2">
                                <span className="text-[11px] text-cyan-500 font-bold uppercase tracking-wider mr-1">Edición:</span>
                                {mcSubcategories.map((subcat) => {
                                    const isSubActive = selectedMcSubcat === subcat.id;
                                    return (
                                        <button
                                            key={subcat.id}
                                            type="button"
                                            onClick={() => setSelectedMcSubcat(subcat.id)}
                                            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                                                isSubActive
                                                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 font-semibold'
                                                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-cyan-300'
                                            }`}
                                        >
                                            {subcat.label} ({subcat.count})
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* CONTENIDO PRINCIPAL: ANCHO COMPLETO */}
                <div className="w-full min-w-0">
                        <div className="overflow-hidden rounded-lg border border-cyan-300 bg-white shadow-none transition dark:border-cyan-700 dark:bg-neutral-950">
                            {/* Barra de Filtros, Agrupación y Búsqueda */}
                            <form
                                onSubmit={handleSearch}
                                className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-800/40 p-3 sm:px-4 sm:py-3 text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <select
                                        value={groupBy}
                                        onChange={(e) =>
                                            setGroupBy(
                                                e.target.value as 'none' | 'category' | 'status' | 'node' | 'username' | 'egg',
                                            )
                                        }
                                        className="flex items-center gap-2 rounded-md border border-cyan-700 bg-white px-2.5 py-1.5 text-xs text-neutral-800 dark:bg-neutral-950 dark:text-cyan-200"
                                    >
                                        <option value="none">Group by: None</option>
                                        <option value="category">Group by: Category</option>
                                        <option value="status">Group by: Status</option>
                                        <option value="node">Group by: Node</option>
                                        <option value="username">Group by: User</option>
                                        <option value="egg">Group by: Egg</option>
                                    </select>

                                    {groupBy !== 'none' && (
                                        <button
                                            type="button"
                                            onClick={toggleGroupDirection}
                                            className="flex items-center gap-1 rounded-md border border-cyan-700 bg-white px-2.5 py-1.5 text-xs text-cyan-800 dark:bg-neutral-950 dark:text-cyan-200"
                                        >
                                            {groupDirection === 'asc' ? (
                                                <>
                                                    Asc <ChevronUp className="h-3.5 w-3.5" />
                                                </>
                                            ) : (
                                                <>
                                                    Desc <ChevronDown className="h-3.5 w-3.5" />
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Selector de Vista: Tarjetas vs Tabla */}
                                <div className="flex items-center rounded-lg border border-cyan-800/60 bg-neutral-900/90 p-0.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('grid')}
                                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                            viewMode === 'grid'
                                                ? 'bg-cyan-500 text-black shadow-sm'
                                                : 'text-neutral-400 hover:text-cyan-300'
                                        }`}
                                        title="Vista en Tarjetas"
                                    >
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Tarjetas</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('table')}
                                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                            viewMode === 'table'
                                                ? 'bg-cyan-500 text-black shadow-sm'
                                                : 'text-neutral-400 hover:text-cyan-300'
                                        }`}
                                        title="Vista en Tabla"
                                    >
                                        <List className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Tabla</span>
                                    </button>
                                </div>

                                {/* Campo de búsqueda */}
                                <div className="relative w-full sm:w-64 md:w-72">
                                    <input
                                        type="text"
                                        placeholder="Search server name..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-md border border-cyan-700 px-3 py-1.5 pl-8 text-xs transition focus:ring-2 focus:ring-cyan-500 focus:outline-none dark:bg-neutral-950 dark:text-cyan-200"
                                    />
                                    <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-cyan-600">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M21 21l-6-6m0 0A7 7 0 103 10a7 7 0 0012 5z"
                                            />
                                        </svg>
                                    </span>
                                </div>
                            </form>

                            {viewMode === 'grid' ? (
                                <div className="p-4 sm:p-5">
                                    {filteredServers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cyan-800/60 bg-neutral-950/40 py-16 text-center">
                                            <Server className="h-12 w-12 text-cyan-600/50 mb-3" />
                                            <h3 className="text-base font-bold text-neutral-200">No se encontraron servidores</h3>
                                            <p className="mt-1 text-xs text-neutral-400 max-w-sm">
                                                No hay servidores que coincidan con los filtros o la búsqueda actual.
                                            </p>
                                        </div>
                                    ) : groupBy !== 'none' ? (
                                        <div className="space-y-6">
                                            {sortedGroups.map((group) => {
                                                const groupItems = groupedServers[group] || [];
                                                if (groupItems.length === 0) return null;
                                                return (
                                                    <div key={group} className="space-y-3">
                                                        <div className="flex items-center gap-2 border-b border-cyan-900/60 pb-2">
                                                            <span className="h-2 w-2 rounded-full bg-cyan-400" />
                                                            <h3 className="text-sm font-bold text-cyan-300 tracking-wider uppercase">
                                                                {group}
                                                            </h3>
                                                            <span className="rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-mono text-cyan-400 border border-cyan-800/40">
                                                                {groupItems.length}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                                                            {groupItems.map((item) => (
                                                                <ServerCard key={item.id} item={item} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className={`grid gap-6 w-full max-w-full ${filteredServers.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                                            {filteredServers.map((item) => (
                                                <ServerCard key={item.id} item={item} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full max-w-full overflow-hidden">
                                    <table className="w-full table-auto border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-cyan-800/50 bg-cyan-100/60 dark:bg-cyan-950/70">
                                                <th className="px-3 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <Activity className="h-3.5 w-3.5 shrink-0" />
                                                        <span>Status</span>
                                                    </div>
                                                </th>

                                                <th className="px-3 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400">
                                                    <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-cyan-300">
                                                        <Server className="h-3.5 w-3.5 shrink-0" />
                                                        <span>Name</span>
                                                        {filters.sort === 'name' &&
                                                            (filters.direction === 'asc' ? (
                                                                <ChevronUp className="h-3 w-3" />
                                                            ) : (
                                                                <ChevronDown className="h-3 w-3" />
                                                            ))}
                                                    </button>
                                                </th>

                                                <th className="hidden sm:table-cell px-3 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400">
                                                    <button onClick={() => handleSort('egg')} className="flex items-center gap-1.5 hover:text-cyan-300">
                                                        <Egg className="h-3.5 w-3.5 shrink-0" />
                                                        <span>Egg</span>
                                                        {filters.sort === 'egg' &&
                                                            (filters.direction === 'asc' ? (
                                                                <ChevronUp className="h-3 w-3" />
                                                            ) : (
                                                                <ChevronDown className="h-3 w-3" />
                                                            ))}
                                                    </button>
                                                </th>

                                                <th className="hidden md:table-cell px-3 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400">
                                                    <button onClick={() => handleSort('username')} className="flex items-center gap-1.5 hover:text-cyan-300">
                                                        <User className="h-3.5 w-3.5 shrink-0" />
                                                        <span>User</span>
                                                        {filters.sort === 'username' &&
                                                            (filters.direction === 'asc' ? (
                                                                <ChevronUp className="h-3 w-3" />
                                                            ) : (
                                                                <ChevronDown className="h-3 w-3" />
                                                            ))}
                                                    </button>
                                                </th>

                                                <th className="hidden lg:table-cell px-3 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400">
                                                    <button onClick={() => handleSort('allocation')} className="flex items-center gap-1.5 hover:text-cyan-300">
                                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                        <span>Port / IP</span>
                                                        {filters.sort === 'allocation' &&
                                                            (filters.direction === 'asc' ? (
                                                                <ChevronUp className="h-3 w-3" />
                                                            ) : (
                                                                <ChevronDown className="h-3 w-3" />
                                                            ))}
                                                    </button>
                                                </th>

                                                <th className="hidden xl:table-cell px-3 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400">
                                                    <button onClick={() => handleSort('backups')} className="flex items-center gap-1.5 hover:text-cyan-300">
                                                        <Database className="h-3.5 w-3.5 shrink-0" />
                                                        <span>Backups</span>
                                                        {filters.sort === 'backups' &&
                                                            (filters.direction === 'asc' ? (
                                                                <ChevronUp className="h-3 w-3" />
                                                            ) : (
                                                                <ChevronDown className="h-3 w-3" />
                                                            ))}
                                                    </button>
                                                </th>

                                                <th className="px-3 py-3 text-right text-xs font-semibold text-cyan-500 whitespace-nowrap">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-cyan-900/30">
                                            {groupBy === 'none' ? (
                                                filteredServers.length > 0 ? (
                                                    filteredServers.map((item) => (
                                                        <tr
                                                            key={item.id}
                                                            className="cursor-pointer hover:bg-cyan-500/5 transition"
                                                            onClick={() => router.visit(`/servers/${item.id}/files`)}
                                                        >
                                                            <td className="px-3 py-3 whitespace-nowrap">
                                                                <span
                                                                    className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                                        item.status === 'offline'
                                                                            ? 'border border-red-500/60 bg-red-950/40 text-red-400'
                                                                            : 'border border-green-500/60 bg-green-950/40 text-green-400'
                                                                    }`}
                                                                >
                                                                    <span
                                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                                            item.status === 'offline' ? 'bg-red-400' : 'bg-green-400'
                                                                        }`}
                                                                    ></span>
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[200px] sm:max-w-[260px]" title={item.name}>
                                                                    {item.name}
                                                                </div>
                                                                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate font-mono">
                                                                    {item.node}
                                                                </div>
                                                            </td>
                                                            <td className="hidden sm:table-cell px-3 py-3">
                                                                <span className="text-xs text-neutral-700 dark:text-cyan-300 truncate max-w-[150px] block" title={item.egg}>
                                                                    {item.egg}
                                                                </span>
                                                            </td>
                                                            <td className="hidden md:table-cell px-3 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                                                                {item.username}
                                                            </td>
                                                            <td className="hidden lg:table-cell px-3 py-3 font-mono text-xs text-neutral-700 dark:text-cyan-400 whitespace-nowrap tracking-wide">
                                                                {item.allocation || <span className="italic text-neutral-500">–</span>}
                                                            </td>
                                                            <td className="hidden xl:table-cell px-3 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono">
                                                                {item.backups ?? item.database ?? 0}
                                                            </td>
                                                            <td className="px-3 py-3 text-right whitespace-nowrap">
                                                                <div className="flex justify-end items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        title="Consola"
                                                                        onClick={() => router.visit(`/servers/${item.id}/console`)}
                                                                        className="rounded border border-cyan-600/60 bg-cyan-950/30 px-2 py-0.5 text-xs text-cyan-300 hover:border-cyan-400 hover:text-cyan-100"
                                                                    >
                                                                        Console
                                                                    </button>
                                                                    <button
                                                                        title="Edit"
                                                                        onClick={() => router.visit(`/servers/${item.id}/edit`)}
                                                                        className="text-cyan-400 hover:text-cyan-200 p-1"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button
                                                                        title="Delete"
                                                                        onClick={() => {
                                                                            if (confirm(`¿Eliminar el servidor "${item.name}"?`)) {
                                                                                router.delete(`/servers/${item.uuid}`);
                                                                            }
                                                                        }}
                                                                        className="text-pink-400 hover:text-pink-200 p-1"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-neutral-500 dark:text-cyan-600">
                                                            No se encontraron servidores con estos filtros de estado o categoría.
                                                        </td>
                                                    </tr>
                                                )
                                            ) : (
                                                sortedGroups.map((groupName) => (
                                                    <React.Fragment key={groupName}>
                                                        <tr className="bg-cyan-950/40 border-y border-cyan-800/40">
                                                            <td colSpan={7} className="px-3.5 py-2 text-xs font-semibold tracking-wider text-cyan-300">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                                                                    <span>
                                                                        {groupBy === 'category' && `Categoría: ${groupName}`}
                                                                        {groupBy === 'status' && `${groupName}`}
                                                                        {groupBy === 'node' && `Node: ${groupName}`}
                                                                        {groupBy === 'egg' && `Egg: ${groupName}`}
                                                                        {groupBy === 'username' && `User: ${groupName}`}
                                                                    </span>
                                                                    <span className="ml-2 rounded-full border border-cyan-500/40 bg-cyan-900/40 px-2 py-0.2 text-[10px] text-cyan-200 font-mono">
                                                                        {(groupedServers[groupName] ?? []).length} servidores
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {(groupedServers[groupName] ?? []).length > 0 ? (
                                                            groupedServers[groupName].map((item) => (
                                                                <tr
                                                                    key={item.id}
                                                                    className="cursor-pointer hover:bg-cyan-500/5 transition"
                                                                    onClick={() => router.visit(`/servers/${item.id}/files`)}
                                                                >
                                                                    <td className="px-3 py-3 whitespace-nowrap">
                                                                        <span
                                                                            className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                                                item.status === 'offline'
                                                                                    ? 'border border-red-500/60 bg-red-950/40 text-red-400'
                                                                                    : 'border border-green-500/60 bg-green-950/40 text-green-400'
                                                                            }`}
                                                                        >
                                                                            <span
                                                                                className={`h-1.5 w-1.5 rounded-full ${
                                                                                    item.status === 'offline' ? 'bg-red-400' : 'bg-green-400'
                                                                                }`}
                                                                            ></span>
                                                                            {item.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-3">
                                                                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[200px] sm:max-w-[260px]" title={item.name}>
                                                                            {item.name}
                                                                        </div>
                                                                        <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate font-mono">
                                                                            {item.node}
                                                                        </div>
                                                                    </td>
                                                                    <td className="hidden sm:table-cell px-3 py-3">
                                                                        <span className="text-xs text-neutral-700 dark:text-cyan-300 truncate max-w-[150px] block" title={item.egg}>
                                                                            {item.egg}
                                                                        </span>
                                                                    </td>
                                                                    <td className="hidden md:table-cell px-3 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                                                                        {item.username}
                                                                    </td>
                                                                    <td className="hidden lg:table-cell px-3 py-3 font-mono text-xs text-neutral-700 dark:text-cyan-400 whitespace-nowrap tracking-wide">
                                                                        {item.allocation || <span className="italic text-neutral-500">–</span>}
                                                                    </td>
                                                                    <td className="hidden xl:table-cell px-3 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono">
                                                                        {item.backups ?? item.database ?? 0}
                                                                    </td>
                                                                    <td className="px-3 py-3 text-right whitespace-nowrap">
                                                                    <div className="flex justify-end items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                        <button
                                                                            title="Consola"
                                                                            onClick={() => router.visit(`/servers/${item.id}/console`)}
                                                                            className="rounded border border-cyan-600/60 bg-cyan-950/30 px-2 py-0.5 text-xs text-cyan-300 hover:border-cyan-400 hover:text-cyan-100"
                                                                        >
                                                                            Console
                                                                        </button>
                                                                        <button
                                                                            title="Edit"
                                                                            onClick={() => router.visit(`/servers/${item.id}/edit`)}
                                                                            className="text-cyan-400 hover:text-cyan-200 p-1"
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <button
                                                                            title="Delete"
                                                                            onClick={() => {
                                                                                if (confirm(`¿Eliminar el servidor "${item.name}"?`)) {
                                                                                    router.delete(`/servers/${item.uuid}`);
                                                                                }
                                                                            }}
                                                                            className="text-pink-400 hover:text-pink-200 p-1"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="px-4 py-4 text-center text-xs text-neutral-500 dark:text-cyan-600">
                                                                No servers found in this group.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            )}

                            <div className="bg-cyan-100/40 dark:bg-cyan-950/30">
                                {/* Pagination */}
                                {servers.links.length > 5 && (
                                    <div className="flex justify-center p-3 sm:p-4">
                                        <ul className="flex flex-wrap gap-1.5 text-xs font-medium">
                                            {servers.links.map((link, i) => (
                                                <li key={i}>
                                                    <button
                                                        disabled={!link.url}
                                                        onClick={() => {
                                                            if (!link.url) return;
                                                            const url = new URL(link.url);
                                                            const page = url.searchParams.get('page');
                                                            router.get(
                                                                '/servers',
                                                                {
                                                                    page,
                                                                    search,
                                                                    category: selectedCategory,
                                                                    status: selectedStatus,
                                                                    sort: filters.sort,
                                                                    direction: filters.direction,
                                                                    per_page: filters.per_page,
                                                                },
                                                                { preserveScroll: true, preserveState: true },
                                                            );
                                                        }}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                        className={`rounded border px-2.5 py-1 text-xs transition ${
                                                            link.active
                                                                ? 'border-cyan-500 bg-cyan-500 text-black font-semibold'
                                                                : 'border-cyan-700/60 bg-black text-cyan-400 hover:bg-cyan-800/30 hover:text-white'
                                                        } ${!link.url ? 'cursor-not-allowed opacity-40' : ''}`}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-300 bg-white px-3 sm:px-4 py-2 text-xs transition dark:border-cyan-700/50 dark:bg-neutral-950">
                                    <span className="text-neutral-500 dark:text-cyan-600 text-[11px] sm:text-xs">
                                        Showing {servers.from ?? 0} to {servers.to ?? 0} of {servers.total} servers
                                    </span>
                                    <div className="inline-flex items-center overflow-hidden rounded-md border border-cyan-700/60 text-xs text-cyan-600 dark:border-cyan-700/60 dark:bg-neutral-950">
                                        <span className="border-r border-cyan-700/60 px-2.5 py-1 text-neutral-600 dark:text-cyan-400 text-[11px]">
                                            Per page
                                        </span>
                                        <div className="relative">
                                            <select
                                                className="appearance-none bg-transparent px-2.5 py-1 pr-6 text-neutral-600 focus:outline-none dark:text-cyan-400 text-[11px]"
                                                value={filters.per_page ?? 50}
                                                onChange={(e) => {
                                                    const perPage = parseInt(e.target.value, 10);
                                                    router.get(
                                                        '/servers',
                                                        {
                                                            search,
                                                            category: selectedCategory,
                                                            status: selectedStatus,
                                                            sort: filters.sort,
                                                            direction: filters.direction,
                                                            per_page: perPage,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                        },
                                                    );
                                                }}
                                            >
                                                <option value="10">10</option>
                                                <option value="25">25</option>
                                                <option value="50">50</option>
                                                <option value="100">All</option>
                                            </select>
                                            <ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2 text-cyan-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>
            </div>
        </AppLayout>
    );
}
