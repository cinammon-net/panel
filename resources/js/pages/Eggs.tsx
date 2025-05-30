import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage, Link } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Copy, Egg, Pencil, Server, Trash2, Upload} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import EggFormModal from '@/components/EggFormModal';
interface Egg {
    id: number;
    uuid: string;
    name: string;
    author: string;
    description: string;
    servers: number;
}

interface Pagination<T> {
    data: T[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    from: number;
    to: number;
    total: number;
    per_page: number;
}


export default function Eggs() {
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const { eggs, filters, availableTags } = usePage<{
        eggs: Pagination<Egg>;
        filters: { search?: string; sort?: string; direction?: string; per_page?: number; tag?: string };
        availableTags: string[];
    }>().props;

    const [search, setSearch] = useState(filters.search || '');
    const [selectedEggs, setSelectedEggs] = useState<number[]>([]);
    const allSelected = selectedEggs.length === eggs.data.length && eggs.data.length > 0;
    const activeFilters = filters.tag ? 1 : 0;
    const [selectedTag, setSelectedTag] = useState(filters.tag || '');
    const [tagSearch, setTagSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showBulkMenu, setShowBulkMenu] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/eggs',
            { search, sort: filters.sort, direction: filters.direction, per_page: filters.per_page },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleSort = () => {
        const newDirection = filters.direction === 'asc' ? 'desc' : 'asc';
        router.get(
            '/eggs',
            { search, sort: 'name', direction: newDirection, per_page: filters.per_page },
            { preserveScroll: true, preserveState: true },
        );
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedEggs([]);
        } else {
            setSelectedEggs(eggs.data.map((egg) => egg.id));
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedEggs((prev) => (prev.includes(id) ? prev.filter((eggId) => eggId !== id) : [...prev, id]));
    };

    const handleImportEgg = (data: { file?: File; url?: string }) => {
        if (data.file) {
            const formData = new FormData();
            formData.append('file', data.file);

            router.post('/eggs/import', formData, {
                preserveScroll: true,
                preserveState: false,
                headers: { 'Content-Type': 'multipart/form-data' },
                onSuccess: () => {
                    toast('Archivo importado correctamente');
                    setIsImportModalOpen(false);
                },
                onError: (errors) => {
                    toast('Error al importar: ' + JSON.stringify(errors));
                },
            });
        } else {
            toast('Importar desde URL no implementado');
        }
    };
      
      
      
    return (
        <AppLayout breadcrumbs={[{ title: 'Eggs', href: '/eggs' }]}>
            <Head title="Eggs">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
    
            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between border-cyan-600">
                    <h1 className="text-3xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400 dark:drop-shadow-[0_0_5px_#0ff]">
                        EGGS
                    </h1>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="rounded border border-cyan-500 bg-cyan-100/50 px-4 py-1.5 text-sm text-cyan-800 transition hover:bg-cyan-200/70 dark:border-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-700/50"
                            onClick={() => setIsImportModalOpen(true)}
                        >
                            Import
                        </button>
                        <EggFormModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSubmit={handleImportEgg} />
                        <Link
                            href={route('eggs.create')}
                            className="rounded border border-cyan-500 bg-cyan-100/50 px-4 py-1.5 text-sm text-cyan-800 transition hover:bg-cyan-200/70 dark:border-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-700/50"
                        >
                            Create Egg
                        </Link>
                    </div>
                </div>
    
                <div className="overflow-hidden rounded-lg border border-cyan-300 bg-white shadow-none transition dark:border-cyan-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                    {/* Search and filters */}
                    {/* ... tu form de búsqueda y filtros se mantiene igual ... */}
    
                    {selectedEggs.length > 0 && (
                        <div className="flex items-center justify-between border-b border-cyan-300 border-cyan-700 bg-white px-4 py-2 shadow-none transition dark:border-cyan-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                            <span className="text-cyan-400">
                                {selectedEggs.length} {selectedEggs.length === 1 ? 'record' : 'records'} selected
                            </span>
                            <div className="flex items-center gap-3">
                                {!allSelected && (
                                    <button onClick={toggleSelectAll} className="text-blue-400 hover:text-blue-200">
                                        Select all {eggs.data.length}
                                    </button>
                                )}
                                <button onClick={() => setSelectedEggs([])} className="text-red-400 hover:text-red-300">
                                    Deselect all
                                </button>
                            </div>
                        </div>
                    )}
    
                    {/* Tabla y paginación con scroll horizontal solo en móvil */}
                    <div className="sm:overflow-visible overflow-x-auto">
                        <div className="bg-cyan overflow-hidden shadow-none transition dark:border-cyan-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3] min-w-full">
                            <table className="min-w-full table-auto text-sm">
                                {/* ... thead y tbody como ya lo tenías ... */}
                            </table>
    
                            {eggs.links.length > 5 && (
                                <div className="mt-6 flex justify-center p-4">
                                    <ul className="max-h-60 overflow-y-auto">
                                        {availableTags
                                            .filter((tag) => tag.toLowerCase().includes(tagSearch.toLowerCase()))
                                            .map((tag) => (
                                                <li
                                                    key={tag}
                                                    onClick={() => {
                                                        setSelectedTag(tag);
                                                        setShowDropdown(false);
                                                        router.get(
                                                            '/eggs',
                                                            {
                                                                ...filters,
                                                                tag,
                                                            },
                                                            {
                                                                preserveScroll: true,
                                                                preserveState: true,
                                                            },
                                                        );
                                                    }}
                                                    className="cursor-pointer px-3 py-2 text-sm text-cyan-600 dark:text-cyan-400"
                                                >
                                                    {tag}
                                                </li>
                                            ))}
                                    </ul>
                                </div>
                            )}
    
                            <div className="flex items-center justify-center border-t border-cyan-300 bg-white px-4 py-2 shadow-none transition dark:border-cyan-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                                <div className="inline-flex items-center overflow-hidden rounded-md border border-cyan-700 text-sm text-cyan-600 dark:border-cyan-700 dark:bg-neutral-950">
                                    <span className="border-r px-4 py-2 text-sm text-cyan-600 dark:text-cyan-400">Per page</span>
                                    <div className="relative">
                                        <select
                                            className="appearance-none px-4 py-2 pr-8 text-sm text-cyan-600 focus:outline-none dark:bg-neutral-950 dark:text-cyan-400"
                                            value={filters.per_page ?? 10}
                                            onChange={(e) => {
                                                const perPage = parseInt(e.target.value, 10);
                                                router.get(
                                                    '/eggs',
                                                    {
                                                        search,
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
                                            <option value="5">5</option>
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">All</option>
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
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
