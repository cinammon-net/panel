import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    Copy,
    Database as DatabaseIcon,
    Download,
    FileCode,
    FilePlus,
    FileText,
    Folder,
    HardDrive,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Search,
    Server,
    Table as TableIcon,
    Trash2,
    X,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { toast } from 'sonner';

const FileEditor = lazy(() => import('@/components/server/file-editor'));

interface DatabaseHost {
    id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    max_databases: number;
    node_id: number | null;
    node_name: string;
    status: string;
}

interface ServerDbItem {
    id: number;
    name: string;
    user: string;
    host: string;
    port: number;
}

interface ServerDbInfo {
    id: number;
    name: string;
    uuid: string;
    node_name: string;
    database_limit: number;
    databases?: ServerDbItem[];
}

interface DbFileInfo {
    name: string;
    path: string;
    size_kb: number;
    modified_at: string;
    active: boolean;
}

interface DbTableInfo {
    name: string;
    count: number;
    columns: string[];
    rows: Record<string, unknown>[];
}

interface Props {
    hosts: DatabaseHost[];
    servers: ServerDbInfo[];
    nodes: { id: number; name: string }[];
    dbFiles?: DbFileInfo[];
    dbTables?: DbTableInfo[];
}

interface SelectedDatabaseContext {
    title: string;
    subtitle: string;
    endpoint: string;
    username: string;
    serverId?: number;
}

interface DbExplorerEntry {
    name: string;
    directory: boolean;
    size: number;
    modified: string;
    kind: 'table' | 'sqlite' | 'sql' | 'config';
    tableInfo?: DbTableInfo;
    content?: string;
}

const button =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40';
const primary =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-cyan-300 disabled:opacity-40';
const input =
    'w-full rounded-lg border border-white/15 bg-[#151519] px-3 py-2 text-sm text-gray-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400';

const formatSize = (bytes: number) =>
    bytes < 1024
        ? `${bytes} B`
        : bytes < 1024 ** 2
          ? `${(bytes / 1024).toFixed(1)} KiB`
          : bytes < 1024 ** 3
            ? `${(bytes / 1024 ** 2).toFixed(1)} MiB`
            : `${(bytes / 1024 ** 3).toFixed(2)} GiB`;

export default function Database({ hosts = [], servers = [], nodes = [], dbFiles = [], dbTables = [] }: Props) {
    const [selectedDb, setSelectedDb] = useState<SelectedDatabaseContext | null>(() => {
        if (typeof window !== 'undefined') {
            const openParam = new URLSearchParams(window.location.search).get('open');
            if (openParam) {
                for (const s of servers) {
                    const dbs =
                        s.databases && s.databases.length > 0
                            ? s.databases
                            : [{ id: 1, name: `s${s.id}_cinammon`, user: `u${s.id}_admin`, host: '127.0.0.1', port: 3306 }];
                    const match = dbs.find((d) => d.name === openParam);
                    if (match) {
                        return {
                            title: match.name,
                            subtitle: `${s.name} · ${s.node_name}`,
                            endpoint: `${match.host}:${match.port}`,
                            username: match.user,
                            serverId: s.id,
                        };
                    }
                }
                const hostMatch = hosts.find((h) => h.name === openParam || String(h.id) === openParam);
                if (hostMatch) {
                    return {
                        title: hostMatch.name,
                        subtitle: `Database Host #${hostMatch.id} (${hostMatch.node_name})`,
                        endpoint: `${hostMatch.host}:${hostMatch.port}`,
                        username: hostMatch.username,
                    };
                }
            }
        }
        return null;
    });

    // Estados del explorador de archivos de la DB (mismo diseño que Servers/Files.tsx)
    const [directory, setDirectory] = useState<string>('');
    const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<'name' | 'size' | 'modified'>('name');
    const [ascending, setAscending] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [editingFile, setEditingFile] = useState<{
        file: string;
        content: string;
        language: string;
        tableInfo?: DbTableInfo;
        viewMode: 'table' | 'code';
    } | null>(null);

    const [form, setForm] = useState<{
        name: string;
        host: string;
        port: number;
        username: string;
        max_databases: number;
        node_id: string | number;
    }>({
        name: '',
        host: '127.0.0.1',
        port: 3306,
        username: 'root',
        max_databases: 50,
        node_id: nodes[0]?.id ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/database', form, {
            onSuccess: () => {
                setForm({ ...form, name: '' });
                toast.success('Database Host añadido correctamente');
            },
        });
    };

    const handleDelete = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        router.delete(`/database/${id}`, {
            onSuccess: () => toast.success('Database Host eliminado'),
        });
    };

    const openDatabaseExplorer = (ctx: SelectedDatabaseContext) => {
        setSelectedDb(ctx);
        setDirectory('');
        setSelectedEntries([]);
        setSearch('');
        setEditingFile(null);
        setPage(1);
    };

    // Construir las entradas de archivos/tablas al estilo de Servers/Files.tsx
    const buildEntries = (): DbExplorerEntry[] => {
        if (!selectedDb) return [];
        const nowIso = new Date().toISOString();

        if (directory === 'tables') {
            return dbTables.map((t) => ({
                name: `${t.name}.json`,
                directory: false,
                size: Math.max(512, JSON.stringify(t.rows).length),
                modified: dbFiles[0]?.modified_at || nowIso,
                kind: 'table',
                tableInfo: t,
                content: JSON.stringify(
                    {
                        database: selectedDb.title,
                        table: t.name,
                        total_rows: t.count,
                        columns: t.columns,
                        rows: t.rows,
                    },
                    null,
                    2,
                ),
            }));
        }

        const rootEntries: DbExplorerEntry[] = [
            {
                name: 'tables',
                directory: true,
                size: 0,
                modified: dbFiles[0]?.modified_at || nowIso,
                kind: 'table',
            },
            ...dbFiles.map((f) => ({
                name: f.name,
                directory: false,
                size: Math.round(f.size_kb * 1024),
                modified: f.modified_at || nowIso,
                kind: 'sqlite' as const,
                content: `-- Archivo SQLite: ${f.name}\n-- Ruta: ${f.path}\n-- Tamaño: ${f.size_kb} KB\n-- Estado: ${f.active ? 'ACTIVA' : 'SECUNDARIA'}\n\n` +
                    dbTables
                        .map(
                            (t) =>
                                `-- Tabla: ${t.name} (${t.count} registros)\n-- Columnas: ${t.columns.join(', ')}\nSELECT * FROM "${t.name}" LIMIT 20;`,
                        )
                        .join('\n\n'),
            })),
            {
                name: `${selectedDb.title}_schema.sql`,
                directory: false,
                size: Math.max(1024, dbTables.length * 340),
                modified: dbFiles[0]?.modified_at || nowIso,
                kind: 'sql',
                content:
                    `-- Esquema SQL generado para ${selectedDb.title}\n-- Endpoint: ${selectedDb.endpoint}\n-- Usuario: ${selectedDb.username}\n\n` +
                    dbTables
                        .map(
                            (t) =>
                                `CREATE TABLE IF NOT EXISTS \`${t.name}\` (\n` +
                                t.columns.map((c) => `  \`${c}\` TEXT`).join(',\n') +
                                `\n); -- ${t.count} filas`,
                        )
                        .join('\n\n'),
            },
            {
                name: 'connection.json',
                directory: false,
                size: 384,
                modified: dbFiles[0]?.modified_at || nowIso,
                kind: 'config',
                content: JSON.stringify(
                    {
                        database: selectedDb.title,
                        endpoint: selectedDb.endpoint,
                        username: selectedDb.username,
                        driver: 'sqlite / mysql',
                        charset: 'utf8mb4',
                        collation: 'utf8mb4_unicode_ci',
                        tables_count: dbTables.length,
                    },
                    null,
                    2,
                ),
            },
            ...dbTables.map((t) => ({
                name: `${t.name}.sql`,
                directory: false,
                size: Math.max(256, JSON.stringify(t.rows).length),
                modified: dbFiles[0]?.modified_at || nowIso,
                kind: 'table' as const,
                tableInfo: t,
                content: JSON.stringify(t.rows, null, 2),
            })),
        ];

        return rootEntries;
    };

    const entries = buildEntries();
    const filtered = entries
        .filter((entry) => entry.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (a.directory !== b.directory) return Number(b.directory) - Number(a.directory);
            const delta =
                sort === 'name'
                    ? a.name.localeCompare(b.name, undefined, { numeric: true })
                    : sort === 'size'
                      ? a.size - b.size
                      : Date.parse(a.modified) - Date.parse(b.modified);
            return ascending ? delta : -delta;
        });

    const pages = Math.max(1, Math.ceil(filtered.length / perPage));
    const visible = filtered.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);
    const selectable = visible.map((e) => e.name);
    const allSelected = selectable.length > 0 && selectable.every((name) => selectedEntries.includes(name));
    const parts = directory.split('/').filter(Boolean);

    const changeSort = (field: typeof sort) => {
        if (sort === field) setAscending((v) => !v);
        else {
            setSort(field);
            setAscending(true);
        }
    };

    const openEntry = (entry: DbExplorerEntry) => {
        if (entry.directory) {
            setDirectory(entry.name);
            setSelectedEntries([]);
            setSearch('');
            return;
        }
        const ext = entry.name.split('.').pop() || 'sql';
        setEditingFile({
            file: [directory, entry.name].filter(Boolean).join('/'),
            content: entry.content || '',
            language: ext === 'json' ? 'json' : 'sql',
            tableInfo: entry.tableInfo,
            viewMode: entry.tableInfo ? 'table' : 'code',
        });
    };

    const breadcrumbs: BreadcrumbItem[] = selectedDb
        ? [
              { title: 'Database Host', href: '/database' },
              { title: selectedDb.title, href: `/database?open=${encodeURIComponent(selectedDb.title)}` },
          ]
        : [{ title: 'Database Host', href: '/database' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={selectedDb ? `${selectedDb.title} · Archivos DB` : 'Database Hosts'} />

            {/* VISTA ESTILO ARCHIVOS (Servers/Files.tsx) CUANDO SE HACE CLIC EN UNA DB */}
            {selectedDb ? (
                <main className="min-h-screen space-y-6 bg-[#080c10] p-6 text-gray-100 md:p-8">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                {editingFile ? `Inspeccionar ${editingFile.file}` : 'Archivos de Base de Datos'}
                            </h1>
                            <p className="mt-1 text-sm text-gray-400">
                                {selectedDb.title} · {selectedDb.subtitle} ({selectedDb.endpoint})
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {editingFile ? (
                                <>
                                    {editingFile.tableInfo && (
                                        <button
                                            type="button"
                                            className={button}
                                            onClick={() =>
                                                setEditingFile({
                                                    ...editingFile,
                                                    viewMode: editingFile.viewMode === 'table' ? 'code' : 'table',
                                                })
                                            }
                                        >
                                            <TableIcon size={16} />
                                            {editingFile.viewMode === 'table' ? 'Ver como JSON / SQL' : 'Ver como Tabla'}
                                        </button>
                                    )}
                                    <button type="button" className={button} onClick={() => setEditingFile(null)}>
                                        <ChevronLeft size={16} /> Volver a archivos
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className={button}
                                        onClick={() => {
                                            setSelectedDb(null);
                                            setEditingFile(null);
                                            window.history.replaceState({}, '', '/database');
                                        }}
                                    >
                                        <ChevronLeft size={16} /> Volver a Databases
                                    </button>
                                    <button
                                        type="button"
                                        className={button}
                                        onClick={() =>
                                            setEditingFile({
                                                file: 'query.sql',
                                                content: `SELECT * FROM users LIMIT 20;\n`,
                                                language: 'sql',
                                                viewMode: 'code',
                                            })
                                        }
                                    >
                                        <FilePlus size={16} /> Nueva consulta SQL
                                    </button>
                                    <button
                                        type="button"
                                        className={primary}
                                        onClick={() => {
                                            const schemaEntry = entries.find((e) => e.name.endsWith('_schema.sql'));
                                            if (schemaEntry) openEntry(schemaEntry);
                                        }}
                                    >
                                        <Download size={16} /> Ver Esquema SQL
                                    </button>
                                </>
                            )}
                        </div>
                    </header>

                    {editingFile ? (
                        <section className="overflow-hidden rounded-xl border border-white/10 bg-[#202024]">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
                                <div className="min-w-[220px] flex-1">
                                    <p className="font-mono text-sm text-gray-300">
                                        /database/{selectedDb.title}/{editingFile.file}
                                    </p>
                                </div>
                                {editingFile.tableInfo && (
                                    <span className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-mono text-xs text-cyan-300">
                                        {editingFile.tableInfo.count} registros · {editingFile.tableInfo.columns.length} columnas
                                    </span>
                                )}
                            </div>

                            {editingFile.tableInfo && editingFile.viewMode === 'table' ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-white/10 bg-[#18181c] text-xs text-gray-400">
                                            <tr>
                                                {editingFile.tableInfo.columns.map((col) => (
                                                    <th key={col} className="whitespace-nowrap px-4 py-3 font-mono">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {editingFile.tableInfo.rows.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={Math.max(1, editingFile.tableInfo.columns.length)}
                                                        className="p-12 text-center text-gray-400"
                                                    >
                                                        Esta tabla está vacía.
                                                    </td>
                                                </tr>
                                            ) : (
                                                editingFile.tableInfo.rows.map((row, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.035]"
                                                    >
                                                        {editingFile.tableInfo!.columns.map((col) => {
                                                            const val = row[col];
                                                            const text =
                                                                val === null || val === undefined
                                                                    ? 'NULL'
                                                                    : typeof val === 'object'
                                                                      ? JSON.stringify(val)
                                                                      : String(val);
                                                            return (
                                                                <td
                                                                    key={col}
                                                                    className="max-w-[260px] truncate whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-200"
                                                                    title={text}
                                                                >
                                                                    {val === null ? (
                                                                        <span className="italic text-gray-500">NULL</span>
                                                                    ) : (
                                                                        text
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Suspense fallback={<p className="p-10 text-sm text-gray-400">Cargando visor…</p>}>
                                    <FileEditor
                                        disabled={false}
                                        value={editingFile.content}
                                        language={editingFile.language}
                                        onChange={(content) => setEditingFile({ ...editingFile, content })}
                                        onSave={() => toast.success('Cambios guardados en búfer local')}
                                    />
                                </Suspense>
                            )}

                            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4">
                                <p className="text-xs text-gray-500">
                                    Base de datos: {selectedDb.title} · {new TextEncoder().encode(editingFile.content).length.toLocaleString()} bytes
                                </p>
                                <div className="flex gap-2">
                                    <button type="button" className={button} onClick={() => setEditingFile(null)}>
                                        Cerrar
                                    </button>
                                    <button
                                        type="button"
                                        className={primary}
                                        onClick={() => {
                                            toast.success('Consulta / archivo procesado correctamente');
                                            setEditingFile(null);
                                        }}
                                    >
                                        <Save size={15} /> Guardar
                                    </button>
                                </div>
                            </footer>
                        </section>
                    ) : (
                        <>
                            {/* Barra de ruta estilo Servers/Files.tsx */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-1 font-mono text-sm text-gray-400">
                                    <HardDrive size={16} className="mr-2" />
                                    <button
                                        type="button"
                                        className="rounded px-1 py-1 hover:text-cyan-300"
                                        onClick={() => setDirectory('')}
                                    >
                                        /database/{selectedDb.title}
                                    </button>
                                    {parts.map((part, index) => (
                                        <span className="flex items-center" key={index}>
                                            <ChevronRight size={13} />
                                            <button
                                                type="button"
                                                className="px-1 py-1 hover:text-cyan-300"
                                                onClick={() => setDirectory(parts.slice(0, index + 1).join('/'))}
                                            >
                                                {part}
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    aria-label="Actualizar archivos"
                                    className={button}
                                    onClick={() => router.reload()}
                                >
                                    <RefreshCw size={15} />
                                </button>
                            </div>

                            {/* Tabla de archivos estilo Servers/Files.tsx */}
                            <section className="overflow-hidden rounded-xl border border-white/10 bg-[#202024]">
                                <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                                    {selectedEntries.length > 0 ? (
                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                            <span className="font-medium text-cyan-300">{selectedEntries.length} seleccionados</span>
                                            <button
                                                type="button"
                                                aria-label="Limpiar selección"
                                                onClick={() => setSelectedEntries([])}
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400">
                                            {filtered.length} {filtered.length === 1 ? 'elemento' : 'elementos'}
                                        </p>
                                    )}
                                    <div className="relative min-w-[220px]">
                                        <Search className="absolute top-2.5 left-3 text-gray-500" size={16} />
                                        <input
                                            aria-label="Buscar archivos"
                                            placeholder="Buscar tabla o archivo"
                                            value={search}
                                            onChange={(e) => {
                                                setSearch(e.target.value);
                                                setPage(1);
                                            }}
                                            className={`${input} pl-9`}
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-white/10 text-xs text-gray-400">
                                            <tr>
                                                <th className="w-12 px-4 py-3">
                                                    <input
                                                        aria-label="Seleccionar todos"
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={() =>
                                                            setSelectedEntries(
                                                                allSelected
                                                                    ? selectedEntries.filter((n) => !selectable.includes(n))
                                                                    : [...new Set([...selectedEntries, ...selectable])],
                                                            )
                                                        }
                                                        className="accent-cyan-400"
                                                    />
                                                </th>
                                                {(['name', 'size', 'modified'] as const).map((field, index) => (
                                                    <th className="px-3 py-3" key={field}>
                                                        <button
                                                            type="button"
                                                            onClick={() => changeSort(field)}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {['Nombre', 'Tamaño / Filas', 'Modificado'][index]}
                                                            {sort === field &&
                                                                (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                        </button>
                                                    </th>
                                                ))}
                                                <th className="w-14">
                                                    <span className="sr-only">Acciones</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {directory && (
                                                <tr className="border-b border-white/5 hover:bg-white/[0.03]">
                                                    <td />
                                                    <td colSpan={4} className="px-3 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDirectory('')}
                                                            className="flex items-center gap-3 text-gray-400"
                                                        >
                                                            <Folder size={17} /> ..
                                                        </button>
                                                    </td>
                                                </tr>
                                            )}
                                            {visible.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-12 text-center text-gray-400">
                                                        No hay resultados para esta búsqueda.
                                                    </td>
                                                </tr>
                                            ) : (
                                                visible.map((entry) => (
                                                    <tr
                                                        key={entry.name}
                                                        className={`border-b border-white/5 last:border-0 hover:bg-white/[0.035] ${
                                                            selectedEntries.includes(entry.name) ? 'bg-cyan-400/[0.035]' : ''
                                                        }`}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <input
                                                                aria-label={`Seleccionar ${entry.name}`}
                                                                type="checkbox"
                                                                checked={selectedEntries.includes(entry.name)}
                                                                onChange={() =>
                                                                    setSelectedEntries((curr) =>
                                                                        curr.includes(entry.name)
                                                                            ? curr.filter((n) => n !== entry.name)
                                                                            : [...curr, entry.name],
                                                                    )
                                                                }
                                                                className="accent-cyan-400"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEntry(entry)}
                                                                className="flex items-center gap-3 text-left font-medium text-gray-200 hover:text-cyan-300"
                                                            >
                                                                {entry.directory ? (
                                                                    <Folder className="text-cyan-300" size={18} />
                                                                ) : entry.kind === 'table' ? (
                                                                    <FileCode className="text-cyan-400" size={18} />
                                                                ) : entry.kind === 'sqlite' ? (
                                                                    <DatabaseIcon className="text-amber-400" size={18} />
                                                                ) : (
                                                                    <FileText className="text-gray-400" size={18} />
                                                                )}
                                                                <span>{entry.name}</span>
                                                                {entry.tableInfo && (
                                                                    <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-cyan-300">
                                                                        {entry.tableInfo.count} filas
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-3 text-gray-400">
                                                            {entry.directory ? `${dbTables.length} tablas` : formatSize(entry.size)}
                                                        </td>
                                                        <td className="whitespace-nowrap px-3 py-3 text-gray-400">
                                                            {entry.modified}
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEntry(entry)}
                                                                className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                                                                title="Abrir archivo / tabla"
                                                            >
                                                                <MoreHorizontal size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-gray-400">
                                    <span>
                                        Mostrando {filtered.length ? (Math.min(page, pages) - 1) * perPage + 1 : 0}–
                                        {Math.min(Math.min(page, pages) * perPage, filtered.length)} de {filtered.length}
                                    </span>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2">
                                            Por página
                                            <select
                                                aria-label="Elementos por página"
                                                value={perPage}
                                                onChange={(e) => {
                                                    setPerPage(Number(e.target.value));
                                                    setPage(1);
                                                }}
                                                className="rounded border border-white/10 bg-[#202024] px-2 py-1"
                                            >
                                                {[25, 50, 100].map((v) => (
                                                    <option key={v}>{v}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                aria-label="Página anterior"
                                                disabled={page <= 1}
                                                onClick={() => setPage((v) => v - 1)}
                                                className="rounded p-1 disabled:opacity-30"
                                            >
                                                <ChevronLeft size={17} />
                                            </button>
                                            <span>
                                                {Math.min(page, pages)} / {pages}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label="Página siguiente"
                                                disabled={page >= pages}
                                                onClick={() => setPage((v) => v + 1)}
                                                className="rounded p-1 disabled:opacity-30"
                                            >
                                                <ChevronRight size={17} />
                                            </button>
                                        </div>
                                    </div>
                                </footer>
                            </section>
                            <p className="text-xs text-gray-500">
                                Haz clic sobre cualquier archivo o tabla `.sql` / `.json` para inspeccionar sus filas y estructura.
                            </p>
                        </>
                    )}
                </main>
            ) : (
                /* VISTA PRINCIPAL DE DATABASE HOSTS (SIN ARCHIVOS DEBAJO) */
                <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                    <div className="flex items-center justify-between border-b border-orange-500/30 pb-4">
                        <div className="flex items-center gap-3">
                            <DatabaseIcon className="h-8 w-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                            <div>
                                <h1 className="text-2xl font-bold tracking-wider text-orange-400">DATABASE HOSTS</h1>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Gestiona los servidores MySQL/MariaDB y haz clic en cualquier base de datos para abrir sus archivos
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Formulario para nuevo Host */}
                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 gap-4 rounded-xl border border-orange-500/40 bg-neutral-900/90 p-5 sm:grid-cols-3 lg:grid-cols-6"
                    >
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Nombre</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="MySQL Principal"
                                className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Host / IP</label>
                            <input
                                type="text"
                                required
                                value={form.host}
                                onChange={(e) => setForm({ ...form, host: e.target.value })}
                                className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Puerto</label>
                            <input
                                type="number"
                                required
                                value={form.port}
                                onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                                className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Usuario</label>
                            <input
                                type="text"
                                required
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Nodo Vinculado</label>
                            <select
                                value={form.node_id}
                                onChange={(e) => setForm({ ...form, node_id: e.target.value })}
                                className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                            >
                                <option value="">Global</option>
                                {nodes.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        {n.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
                            >
                                <Plus className="h-4 w-4" /> Añadir Host
                            </button>
                        </div>
                    </form>

                    {/* Tabla de Database Hosts */}
                    <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5">
                        <h2 className="mb-3 text-base font-semibold text-orange-400">Hosts Configurados</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3">Endpoint</th>
                                        <th className="px-4 py-3">Usuario</th>
                                        <th className="px-4 py-3">Nodo</th>
                                        <th className="px-4 py-3">Máx DBs</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {hosts.map((h) => (
                                        <tr
                                            key={h.id}
                                            onClick={() =>
                                                openDatabaseExplorer({
                                                    title: h.name,
                                                    subtitle: `Database Host #${h.id} (${h.node_name})`,
                                                    endpoint: `${h.host}:${h.port}`,
                                                    username: h.username,
                                                })
                                            }
                                            className="cursor-pointer transition hover:bg-orange-500/10"
                                        >
                                            <td className="px-4 py-3 text-neutral-400">#{h.id}</td>
                                            <td className="px-4 py-3 font-semibold text-white">{h.name}</td>
                                            <td className="px-4 py-3 font-mono text-cyan-400">
                                                {h.host}:{h.port}
                                            </td>
                                            <td className="px-4 py-3 text-neutral-300">{h.username}</td>
                                            <td className="px-4 py-3 text-neutral-300">{h.node_name}</td>
                                            <td className="px-4 py-3 text-neutral-300">{h.max_databases}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDelete(e, h.id)}
                                                    className="inline-flex items-center gap-1 rounded bg-red-600/20 px-3 py-1 text-xs text-red-400 hover:bg-red-600 hover:text-white"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bases de Datos por Servidor */}
                    <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5">
                        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-orange-400">
                            <Server className="h-4 w-4" /> Bases de Datos de Servidores
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                    <tr>
                                        <th className="px-4 py-3">Servidor</th>
                                        <th className="px-4 py-3">Base de Datos</th>
                                        <th className="px-4 py-3">Usuario</th>
                                        <th className="px-4 py-3">Host:Puerto</th>
                                        <th className="px-4 py-3">Nodo</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {servers.map((s) =>
                                        (s.databases && s.databases.length > 0
                                            ? s.databases
                                            : [{ id: 1, name: `s${s.id}_cinammon`, user: `u${s.id}_admin`, host: '127.0.0.1', port: 3306 }]
                                        ).map((db) => (
                                            <tr
                                                key={`${s.id}-${db.id}`}
                                                onClick={() =>
                                                    openDatabaseExplorer({
                                                        title: db.name,
                                                        subtitle: `${s.name} · ${s.node_name}`,
                                                        endpoint: `${db.host}:${db.port}`,
                                                        username: db.user,
                                                        serverId: s.id,
                                                    })
                                                }
                                                className="cursor-pointer transition hover:bg-orange-500/10"
                                            >
                                                <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
                                                <td className="px-4 py-3 font-mono font-semibold text-cyan-400">{db.name}</td>
                                                <td className="px-4 py-3 font-mono text-neutral-300">{db.user}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                                                    {db.host}:{db.port}
                                                </td>
                                                <td className="px-4 py-3 text-neutral-300">{s.node_name}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.visit(`/servers/${s.id}/edit?tab=databases`);
                                                        }}
                                                        className="rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-500 hover:text-black"
                                                    >
                                                        Gestionar en Servidor
                                                    </button>
                                                </td>
                                            </tr>
                                        )),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
