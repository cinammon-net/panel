import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    Bot,
    Box,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Database,
    Egg,
    Filter,
    Gamepad2,
    Layers,
    MapPin,
    Mic,
    Pencil,
    Radio,
    Server,
    Sparkles,
    Trash2,
    User,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface ServerItem {
    id: number;
    uuid: string;
    name: string;
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
}

interface Pagination<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number;
    to: number;
    total: number;
    per_page: number;
}

export default function Servers() {
    const { servers, filters, categoryCounts, statusCounts } = usePage<{
        servers: Pagination<ServerItem>;
        filters: { search?: string; sort?: string; direction?: string; per_page?: number; category?: string; status?: string };
        categoryCounts?: Record<string, number>;
        statusCounts?: { all: number; online: number; offline: number };
    }>().props;

    const [search, setSearch] = useState(filters.search || '');
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
        <AppLayout breadcrumbs={[{ title: 'Servers', href: '/servers' }]}>
            <Head title="Servers">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <div className="min-h-screen bg-white p-3 sm:p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                {/* Header Superior */}
                <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/50 pb-4">
                    <div className="flex items-center gap-3">
                        <Server className="h-7 w-7 sm:h-8 sm:w-8 text-cyan-400 shrink-0" />
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400">
                                SERVERS
                            </h1>
                            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-cyan-600">
                                Centro de control de nodos y servidores en Cinammon.net
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.visit('/servers/create')}
                            className="rounded border border-cyan-400 bg-cyan-100/50 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-cyan-800 transition hover:bg-cyan-200/70 dark:border-cyan-500 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-700/50"
                        >
                            + New Server
                        </button>
                    </div>
                </div>

                {/* BOTÓN COLAPSABLE PARA MÓVILES (Filtros & Categorías) */}
                <div className="mb-4 lg:hidden">
                    <button
                        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                        className="flex w-full items-center justify-between rounded-lg border border-cyan-700/60 bg-neutral-900/70 px-4 py-2.5 text-xs font-semibold text-cyan-300"
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-cyan-400" />
                            <span>Filtrar por Categoría & Estado</span>
                            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300">
                                {selectedCategory.toUpperCase()} • {selectedStatus.toUpperCase()}
                            </span>
                        </div>
                        {isMobileSidebarOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>

                {/* Layout Principal: Lateral (Sidebar) + Tabla Contenido */}
                <div className="flex flex-col gap-5 lg:flex-row">
                    {/* PANEL LATERAL (SIDEBAR) */}
                    <aside
                        className={`w-full shrink-0 space-y-4 lg:w-72 ${
                            isMobileSidebarOpen ? 'block' : 'hidden lg:block'
                        }`}
                    >
                        {/* 1. Filtro por Estado (Activos / Inactivos) */}
                        <div className="rounded-lg border border-cyan-800/40 bg-neutral-100/80 p-3.5 backdrop-blur dark:border-cyan-800/50 dark:bg-neutral-950">
                            <div className="mb-2.5 flex items-center justify-between px-1">
                                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-cyan-800 dark:text-cyan-400">
                                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                                    ESTADO
                                </span>
                                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                                    {statusCounts?.all ?? servers.total} total
                                </span>
                            </div>

                            <div className="space-y-1">
                                <button
                                    onClick={() => handleSelectStatus('all')}
                                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition ${
                                        selectedStatus === 'all'
                                            ? 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-900 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.2)] dark:text-cyan-300 dark:bg-cyan-900/40'
                                            : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-cyan-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Radio className="h-3.5 w-3.5 text-cyan-400" />
                                        <span>Todos los Estados</span>
                                    </div>
                                    <span className="font-mono text-[11px] opacity-80">{statusCounts?.all ?? servers.total}</span>
                                </button>

                                <button
                                    onClick={() => handleSelectStatus('online')}
                                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition ${
                                        selectedStatus === 'online'
                                            ? 'border border-green-500 bg-green-500/20 text-green-900 font-semibold shadow-[0_0_10px_rgba(34,197,94,0.3)] dark:text-green-300 dark:bg-green-950/60'
                                            : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-green-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
                                        </span>
                                        <span>Activos / En Línea</span>
                                    </div>
                                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-green-500">
                                        {statusCounts?.online ?? 0}
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleSelectStatus('offline')}
                                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition ${
                                        selectedStatus === 'offline'
                                            ? 'border border-red-500/50 bg-red-500/10 text-red-900 font-semibold dark:text-red-300 dark:bg-red-950/40'
                                            : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-red-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-neutral-400 dark:bg-neutral-600"></span>
                                        <span>Inactivos / Offline</span>
                                    </div>
                                    <span className="font-mono text-[11px] opacity-80">{statusCounts?.offline ?? 0}</span>
                                </button>
                            </div>
                        </div>

                        {/* 2. Categorías en Lateral */}
                        <div className="rounded-lg border border-cyan-800/40 bg-neutral-100/80 p-3.5 backdrop-blur dark:border-cyan-800/50 dark:bg-neutral-950">
                            <div className="mb-2.5 flex items-center justify-between px-1">
                                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-cyan-800 dark:text-cyan-400">
                                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                                    CATEGORÍAS
                                </span>
                            </div>

                            <div className="space-y-1">
                                {categoryTabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = selectedCategory === tab.id;
                                    return (
                                        <div key={tab.id} className="space-y-1">
                                            <button
                                                onClick={() => handleSelectCategory(tab.id)}
                                                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition ${
                                                    isActive
                                                        ? 'border border-cyan-500/50 bg-cyan-500/20 text-cyan-900 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.25)] dark:text-cyan-300 dark:bg-cyan-900/40'
                                                        : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-cyan-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="truncate">{tab.label}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                                                            isActive
                                                                ? 'bg-cyan-500/30 text-cyan-900 dark:bg-cyan-400/20 dark:text-cyan-200'
                                                                : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
                                                        }`}
                                                    >
                                                        {tab.count}
                                                    </span>
                                                    {tab.hasSubcats && (
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsMcExpanded(!isMcExpanded);
                                                            }}
                                                            className="text-cyan-500 hover:text-cyan-300 p-0.5"
                                                        >
                                                            {isMcExpanded ? (
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <ChevronRight className="h-3.5 w-3.5" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Subcategorías de Minecraft en el Lateral */}
                                            {tab.id === 'minecraft' && isMcExpanded && (
                                                <div className="ml-3 space-y-0.5 border-l-2 border-cyan-800/40 pl-2 pt-1">
                                                    {mcSubcategories.map((subcat) => {
                                                        const isSubActive =
                                                            selectedCategory === 'minecraft' &&
                                                            selectedMcSubcat === subcat.id;
                                                        return (
                                                            <button
                                                                key={subcat.id}
                                                                onClick={() => {
                                                                    setSelectedCategory('minecraft');
                                                                    setSelectedMcSubcat(subcat.id);
                                                                }}
                                                                className={`flex w-full items-center justify-between rounded px-2 py-1 text-[11px] transition ${
                                                                    isSubActive
                                                                        ? 'bg-cyan-500/30 font-semibold text-cyan-800 dark:text-cyan-200'
                                                                        : 'text-neutral-500 hover:bg-neutral-200/50 hover:text-cyan-600 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-cyan-300'
                                                                }`}
                                                            >
                                                                <span className="truncate">{subcat.label}</span>
                                                                <span className="font-mono text-[10px] opacity-70">
                                                                    {subcat.count}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Resumen Rápido de Nodos */}
                        <div className="rounded-lg border border-cyan-900/30 bg-neutral-950/40 p-3 text-[11px] text-neutral-400">
                            <div className="flex items-center justify-between">
                                <span className="text-cyan-400">Nodo Principal:</span>
                                <span className="font-semibold text-neutral-200">Cinammon Nodo</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                                <span className="text-cyan-400">Wings Daemon:</span>
                                <span className="flex items-center gap-1 text-green-400 font-semibold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span> Online
                                </span>
                            </div>
                        </div>
                    </aside>

                    {/* CONTENIDO PRINCIPAL: TABLA DE SERVIDORES */}
                    <main className="flex-1 min-w-0">
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

                            {/* Indicador de desplazamiento horizontal en móvil */}
                            <div className="flex items-center justify-between border-b border-cyan-900/30 bg-cyan-950/30 px-4 py-1.5 text-[11px] text-cyan-400 lg:hidden">
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block animate-pulse">👈👉</span>
                                    <span>Desplaza horizontalmente para ver todas las columnas</span>
                                </span>
                            </div>

                            {/* Contenedor de la Tabla con Scroll Horizontal Fluido */}
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-700 scrollbar-track-neutral-900" style={{ WebkitOverflowScrolling: 'touch' }}>
                                <table className="w-full min-w-[950px] table-auto border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-cyan-800/50 bg-cyan-100/60 dark:bg-cyan-950/70">
                                            <th className="w-32 min-w-[120px] px-3.5 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Activity className="h-3.5 w-3.5 shrink-0" />
                                                    <span>Status</span>
                                                </div>
                                            </th>

                                            <th className="w-64 min-w-[220px] px-3.5 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400 whitespace-nowrap">
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

                                            <th className="w-48 min-w-[160px] px-3.5 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400 whitespace-nowrap">
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

                                            <th className="w-28 min-w-[110px] px-3.5 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400 whitespace-nowrap">
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

                                            <th className="w-44 min-w-[160px] px-3.5 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400 whitespace-nowrap">
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

                                            <th className="w-24 min-w-[85px] px-3.5 py-3 text-xs font-semibold text-cyan-800 dark:text-cyan-400 whitespace-nowrap">
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

                                            <th className="w-36 min-w-[130px] px-3.5 py-3 text-right text-xs font-semibold text-cyan-500 whitespace-nowrap">
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
                                                        <td className="px-3.5 py-3 whitespace-nowrap">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
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
                                                        <td className="px-3.5 py-3 min-w-[220px]">
                                                            <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[260px]" title={item.name}>
                                                                {item.name}
                                                            </div>
                                                            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate font-mono">
                                                                {item.node}
                                                            </div>
                                                        </td>
                                                        <td className="px-3.5 py-3 min-w-[160px]">
                                                            <span className="text-xs text-neutral-700 dark:text-cyan-300 truncate max-w-[170px] block" title={item.egg}>
                                                                {item.egg}
                                                            </span>
                                                        </td>
                                                        <td className="px-3.5 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                                                            {item.username}
                                                        </td>
                                                        <td className="px-3.5 py-3 font-mono text-xs text-neutral-700 dark:text-cyan-400 whitespace-nowrap tracking-wide">
                                                            {item.allocation || <span className="italic text-neutral-500">–</span>}
                                                        </td>
                                                        <td className="px-3.5 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono">
                                                            {item.backups ?? item.database ?? 0}
                                                        </td>
                                                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
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
                                                                <td className="px-3.5 py-3 whitespace-nowrap">
                                                                    <span
                                                                        className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
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
                                                                <td className="px-3.5 py-3 min-w-[220px]">
                                                                    <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[260px]" title={item.name}>
                                                                        {item.name}
                                                                    </div>
                                                                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate font-mono">
                                                                        {item.node}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3.5 py-3 min-w-[160px]">
                                                                    <span className="text-xs text-neutral-700 dark:text-cyan-300 truncate max-w-[170px] block" title={item.egg}>
                                                                        {item.egg}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3.5 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                                                                    {item.username}
                                                                </td>
                                                                <td className="px-3.5 py-3 font-mono text-xs text-neutral-700 dark:text-cyan-400 whitespace-nowrap tracking-wide">
                                                                    {item.allocation || <span className="italic text-neutral-500">–</span>}
                                                                </td>
                                                                <td className="px-3.5 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono">
                                                                    {item.backups ?? item.database ?? 0}
                                                                </td>
                                                                <td className="px-3.5 py-3 text-right whitespace-nowrap">
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
                    </main>
                </div>
            </div>
        </AppLayout>
    );
}
