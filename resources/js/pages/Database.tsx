import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowDown,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    Code2,
    Copy,
    Database as DatabaseIcon,
    KeyRound,
    Layers,
    Play,
    Plus,
    RefreshCw,
    Search,
    Server,
    Table as TableIcon,
    Terminal,
    Trash2,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';

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

interface DbColumnSchema {
    cid: number;
    name: string;
    type: string;
    notnull: boolean;
    dflt_value: string | null;
    pk: boolean;
}

interface DbTableInfo {
    name: string;
    count: number;
    columns: string[];
    schema?: DbColumnSchema[];
    ddl?: string;
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

interface SqlQueryResult {
    columns: string[];
    rows: Record<string, unknown>[];
    row_count: number;
    execution_time_ms: number;
}

const button =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40';
const primary =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-orange-400 disabled:opacity-40';
const input =
    'w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400';

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

    // Estados del gestor SQLite / SQL (con la estética de Servers/Files.tsx)
    const [activeSection, setActiveSection] = useState<'tables' | 'sql'>('tables');
    const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
    const [tableTab, setTableTab] = useState<'rows' | 'structure' | 'sql'>('rows');
    const [search, setSearch] = useState('');
    const [rowSearch, setRowSearch] = useState('');
    const [sort, setSort] = useState<'name' | 'columns' | 'rows'>('name');
    const [ascending, setAscending] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    // Consola SQL interactiva
    const [sqlQuery, setSqlQuery] = useState('SELECT id, name, email, created_at FROM "users" LIMIT 25;');
    const [sqlLoading, setSqlLoading] = useState(false);
    const [sqlError, setSqlError] = useState<string | null>(null);
    const [sqlResult, setSqlResult] = useState<SqlQueryResult | null>(null);

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

    const openDatabaseManager = (ctx: SelectedDatabaseContext) => {
        setSelectedDb(ctx);
        setSelectedTableName(null);
        setActiveSection('tables');
        setSearch('');
        setRowSearch('');
        setSqlError(null);
        setSqlResult(null);
        setPage(1);
    };

    const selectedTable = dbTables.find((t) => t.name === selectedTableName) || null;
    const activeSqliteFile = dbFiles.find((f) => f.active) || dbFiles[0];
    const totalRecords = dbTables.reduce((acc, t) => acc + t.count, 0);

    const openTable = (table: DbTableInfo, initialTab: 'rows' | 'structure' | 'sql' = 'rows') => {
        setSelectedTableName(table.name);
        setTableTab(initialTab);
        setRowSearch('');
        setSqlQuery(`SELECT * FROM "${table.name}" LIMIT 50;`);
        setSqlError(null);
        setSqlResult(null);
    };

    const runSqlQuery = async (customQuery?: string, e?: FormEvent) => {
        if (e) e.preventDefault();
        const queryToRun = (customQuery ?? sqlQuery).trim();
        if (!queryToRun) return;

        setSqlLoading(true);
        setSqlError(null);
        try {
            const response = await axios.post<SqlQueryResult>('/database/query', { query: queryToRun });
            setSqlResult(response.data);
            toast.success(`Consulta ejecutada (${response.data.execution_time_ms} ms)`);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setSqlError(err.response?.data?.error || err.response?.data?.message || 'Error al ejecutar la consulta SQL.');
            } else {
                setSqlError('Error al ejecutar la consulta SQL.');
            }
        } finally {
            setSqlLoading(false);
        }
    };

    const filteredTables = dbTables
        .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const delta =
                sort === 'name'
                    ? a.name.localeCompare(b.name, undefined, { numeric: true })
                    : sort === 'columns'
                      ? a.columns.length - b.columns.length
                      : a.count - b.count;
            return ascending ? delta : -delta;
        });

    const pages = Math.max(1, Math.ceil(filteredTables.length / perPage));
    const visibleTables = filteredTables.slice((Math.min(page, pages) - 1) * perPage, Math.min(page, pages) * perPage);

    const changeSort = (field: typeof sort) => {
        if (sort === field) setAscending((v) => !v);
        else {
            setSort(field);
            setAscending(true);
        }
    };

    const filteredRows = selectedTable
        ? selectedTable.rows.filter((row) => {
              if (!rowSearch.trim()) return true;
              const q = rowSearch.toLowerCase();
              return Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q));
          })
        : [];

    const breadcrumbs: BreadcrumbItem[] = selectedDb
        ? [
              { title: 'Database Host', href: '/database' },
              { title: selectedDb.title, href: `/database?open=${encodeURIComponent(selectedDb.title)}` },
          ]
        : [{ title: 'Database Host', href: '/database' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={selectedDb ? `${selectedDb.title} · SQLite / SQL` : 'Database Hosts'} />

            {/* GESTOR SQLITE / SQL CON EL MISMO ESTILO HABITUAL DEL PANEL */}
            {selectedDb ? (
                <div className="flex min-h-screen flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-500/30 pb-4">
                        <div className="flex items-center gap-3">
                            <DatabaseIcon className="h-8 w-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-2xl font-bold tracking-wider text-orange-400 uppercase">
                                        {selectedTable ? `TABLA: ${selectedTable.name}` : selectedDb.title}
                                    </h1>
                                    <span className="rounded border border-cyan-500/50 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-xs text-cyan-300">
                                        SQLite 3 · SQL Engine
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                    {selectedDb.subtitle} · Motor activo: {activeSqliteFile?.name || 'local.sqlite'} ({activeSqliteFile?.size_kb ?? 116} KB) · {dbTables.length} tablas · {totalRecords} registros
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedTable ? (
                                <>
                                    <button
                                        type="button"
                                        className={tableTab === 'rows' ? primary : button}
                                        onClick={() => setTableTab('rows')}
                                    >
                                        <TableIcon size={15} /> Examinar Filas ({selectedTable.count})
                                    </button>
                                    <button
                                        type="button"
                                        className={tableTab === 'structure' ? primary : button}
                                        onClick={() => setTableTab('structure')}
                                    >
                                        <Layers size={15} /> Estructura ({selectedTable.columns.length})
                                    </button>
                                    <button
                                        type="button"
                                        className={tableTab === 'sql' ? primary : button}
                                        onClick={() => {
                                            setTableTab('sql');
                                            if (!sqlResult) {
                                                void runSqlQuery(`SELECT * FROM "${selectedTable.name}" LIMIT 50;`);
                                            }
                                        }}
                                    >
                                        <Terminal size={15} /> Consola SQL
                                    </button>
                                    <button type="button" className={button} onClick={() => setSelectedTableName(null)}>
                                        <ChevronLeft size={15} /> Volver a Tablas
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className={button}
                                        onClick={() => {
                                            setSelectedDb(null);
                                            setSelectedTableName(null);
                                            window.history.replaceState({}, '', '/database');
                                        }}
                                    >
                                        <ChevronLeft size={15} /> Volver a Databases
                                    </button>
                                    <button
                                        type="button"
                                        className={activeSection === 'tables' ? primary : button}
                                        onClick={() => setActiveSection('tables')}
                                    >
                                        <TableIcon size={15} /> Esquema de Tablas ({dbTables.length})
                                    </button>
                                    <button
                                        type="button"
                                        className={activeSection === 'sql' ? primary : button}
                                        onClick={() => {
                                            setActiveSection('sql');
                                            if (!sqlResult) {
                                                void runSqlQuery(sqlQuery);
                                            }
                                        }}
                                    >
                                        <Terminal size={15} /> Consola SQLite / SQL
                                    </button>
                                </>
                            )}
                        </div>
                    </header>

                    {/* Barra de conexión SQLite / SQL */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1 font-mono text-sm text-neutral-400">
                            <DatabaseIcon size={16} className="mr-2 text-orange-400" />
                            <button
                                type="button"
                                className="rounded px-1 py-1 text-orange-300 hover:text-orange-400"
                                onClick={() => {
                                    setSelectedTableName(null);
                                    setActiveSection('tables');
                                }}
                            >
                                sqlite3://{selectedDb.title}
                            </button>
                            <ChevronRight size={13} />
                            <span className="px-1 py-1 text-cyan-400">
                                {selectedTable ? `table/${selectedTable.name}` : activeSection === 'sql' ? 'sql-console' : 'schema/tables'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-1.5 font-mono text-xs text-cyan-400 sm:inline-block">
                                {selectedDb.username}@{selectedDb.endpoint}
                            </span>
                            <button
                                type="button"
                                aria-label="Recargar esquema SQLite"
                                className={button}
                                onClick={() => router.reload()}
                            >
                                <RefreshCw size={15} />
                            </button>
                        </div>
                    </div>

                    {/* VISTA DE UNA TABLA SELECCIONADA (FILAS / ESTRUCTURA / SQL) */}
                    {selectedTable ? (
                        <section className="overflow-hidden rounded-xl border border-orange-500/40 bg-neutral-950">
                            {tableTab === 'rows' && (
                                <>
                                    <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-orange-500/30 px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="font-mono text-sm text-cyan-400">
                                                SELECT * FROM &quot;{selectedTable.name}&quot; LIMIT 50;
                                            </span>
                                            <span className="rounded border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs text-orange-300">
                                                Mostrando {filteredRows.length} de {selectedTable.count} filas
                                            </span>
                                        </div>
                                        <div className="relative min-w-[240px]">
                                            <Search className="absolute top-2.5 left-3 text-orange-400" size={16} />
                                            <input
                                                aria-label="Filtrar filas"
                                                placeholder="Filtrar valores en la tabla…"
                                                value={rowSearch}
                                                onChange={(e) => setRowSearch(e.target.value)}
                                                className={`${input} pl-9`}
                                            />
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b border-orange-500/30 bg-neutral-900/80 text-xs uppercase text-orange-300">
                                                <tr>
                                                    {selectedTable.columns.map((col) => {
                                                        const colSchema = selectedTable.schema?.find((s) => s.name === col);
                                                        return (
                                                            <th key={col} className="whitespace-nowrap px-4 py-3 font-mono">
                                                                <div className="flex items-center gap-1.5">
                                                                    {colSchema?.pk && (
                                                                        <span title="Primary Key">
                                                                            <KeyRound size={12} className="text-amber-400" />
                                                                        </span>
                                                                    )}
                                                                    <span className="text-orange-300">{col}</span>
                                                                    {colSchema?.type && (
                                                                        <span className="text-[10px] font-normal text-cyan-400 uppercase">
                                                                            {colSchema.type}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-800">
                                                {filteredRows.length === 0 ? (
                                                    <tr>
                                                        <td
                                                            colSpan={Math.max(1, selectedTable.columns.length)}
                                                            className="p-12 text-center text-neutral-400"
                                                        >
                                                            No hay registros que coincidan en la tabla `{selectedTable.name}`.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredRows.map((row, idx) => (
                                                        <tr
                                                            key={idx}
                                                            className="transition hover:bg-orange-500/10"
                                                        >
                                                            {selectedTable.columns.map((col) => {
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
                                                                        className="max-w-[280px] truncate whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-200"
                                                                        title={text}
                                                                    >
                                                                        {val === null || val === undefined ? (
                                                                            <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] italic text-neutral-500">
                                                                                NULL
                                                                            </span>
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
                                </>
                            )}

                            {tableTab === 'structure' && (
                                <div className="space-y-6 p-5">
                                    <div>
                                        <h3 className="mb-3 text-sm font-semibold text-orange-400">
                                            Columnas de `{selectedTable.name}` (PRAGMA table_info)
                                        </h3>
                                        <div className="overflow-x-auto rounded-lg border border-orange-500/30">
                                            <table className="w-full text-left text-sm">
                                                <thead className="border-b border-orange-500/30 bg-neutral-900/80 text-xs uppercase text-orange-300">
                                                    <tr>
                                                        <th className="px-4 py-3">#</th>
                                                        <th className="px-4 py-3">Columna</th>
                                                        <th className="px-4 py-3">Tipo SQL</th>
                                                        <th className="px-4 py-3">Nulo</th>
                                                        <th className="px-4 py-3">Valor por Defecto</th>
                                                        <th className="px-4 py-3">Clave</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-800">
                                                    {(selectedTable.schema && selectedTable.schema.length > 0
                                                        ? selectedTable.schema
                                                        : selectedTable.columns.map((c, i) => ({
                                                              cid: i,
                                                              name: c,
                                                              type: 'TEXT',
                                                              notnull: false,
                                                              dflt_value: null,
                                                              pk: i === 0,
                                                          }))
                                                    ).map((col) => (
                                                        <tr
                                                            key={col.cid}
                                                            className="transition hover:bg-orange-500/10"
                                                        >
                                                            <td className="px-4 py-3 font-mono text-xs text-neutral-400">{col.cid}</td>
                                                            <td className="px-4 py-3 font-mono font-semibold text-cyan-400">{col.name}</td>
                                                            <td className="px-4 py-3">
                                                                <span className="rounded border border-orange-500/30 bg-neutral-900 px-2 py-0.5 font-mono text-xs text-orange-300 uppercase">
                                                                    {col.type || 'TEXT'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-neutral-300">
                                                                {col.notnull ? 'NOT NULL' : 'NULL'}
                                                            </td>
                                                            <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                                                                {col.dflt_value ?? <span className="italic text-neutral-600">Ninguno</span>}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {col.pk ? (
                                                                    <span className="inline-flex items-center gap-1 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-xs text-amber-300">
                                                                        <KeyRound size={11} /> PRIMARY KEY
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-neutral-600">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {selectedTable.ddl && (
                                        <div>
                                            <div className="mb-2 flex items-center justify-between">
                                                <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-400">
                                                    <Code2 size={16} className="text-cyan-400" /> Sentencia DDL (sqlite_master)
                                                </h3>
                                                <button
                                                    type="button"
                                                    className={button}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(selectedTable.ddl || '');
                                                        toast.success('DDL copiado al portapapeles');
                                                    }}
                                                >
                                                    <Copy size={14} /> Copiar SQL
                                                </button>
                                            </div>
                                            <pre className="overflow-x-auto rounded-lg border border-orange-500/30 bg-neutral-900 p-4 font-mono text-xs leading-6 text-cyan-300">
                                                {selectedTable.ddl}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {tableTab === 'sql' && (
                                <SqlConsoleSection
                                    sqlQuery={sqlQuery}
                                    setSqlQuery={setSqlQuery}
                                    sqlLoading={sqlLoading}
                                    sqlError={sqlError}
                                    sqlResult={sqlResult}
                                    runSqlQuery={runSqlQuery}
                                    tables={dbTables}
                                />
                            )}
                        </section>
                    ) : activeSection === 'sql' ? (
                        <section className="overflow-hidden rounded-xl border border-orange-500/40 bg-neutral-950">
                            <SqlConsoleSection
                                sqlQuery={sqlQuery}
                                setSqlQuery={setSqlQuery}
                                sqlLoading={sqlLoading}
                                sqlError={sqlError}
                                sqlResult={sqlResult}
                                runSqlQuery={runSqlQuery}
                                tables={dbTables}
                            />
                        </section>
                    ) : (
                        /* LISTADO DE TABLAS SQLITE / SQL CON EL ESTILO HABITUAL DE DATABASE HOSTS */
                        <>
                            <section className="overflow-hidden rounded-xl border border-orange-500/40 bg-neutral-950">
                                <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-orange-500/30 px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-orange-300">
                                        <span className="font-semibold text-orange-400">
                                            {filteredTables.length} {filteredTables.length === 1 ? 'Tabla SQL' : 'Tablas SQL'}
                                        </span>
                                        <span className="text-neutral-600">·</span>
                                        <span className="font-mono text-xs text-cyan-400">{totalRecords} filas totales</span>
                                    </div>
                                    <div className="relative min-w-[240px]">
                                        <Search className="absolute top-2.5 left-3 text-orange-400" size={16} />
                                        <input
                                            aria-label="Buscar tabla SQL"
                                            placeholder="Buscar tabla SQL (ej. users, servers)…"
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
                                        <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => changeSort('name')}
                                                        className="flex items-center gap-2 uppercase"
                                                    >
                                                        Tabla SQL
                                                        {sort === 'name' && (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                    </button>
                                                </th>
                                                <th className="px-3 py-3">Motor</th>
                                                <th className="px-3 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => changeSort('columns')}
                                                        className="flex items-center gap-2 uppercase"
                                                    >
                                                        Columnas
                                                        {sort === 'columns' && (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                    </button>
                                                </th>
                                                <th className="px-3 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => changeSort('rows')}
                                                        className="flex items-center gap-2 uppercase"
                                                    >
                                                        Registros (Filas)
                                                        {sort === 'rows' && (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                    </button>
                                                </th>
                                                <th className="px-4 py-3 text-right">Operaciones SQL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-800">
                                            {visibleTables.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-12 text-center text-neutral-400">
                                                        No se encontraron tablas SQL que coincidan con la búsqueda.
                                                    </td>
                                                </tr>
                                            ) : (
                                                visibleTables.map((table) => (
                                                    <tr
                                                        key={table.name}
                                                        onClick={() => openTable(table, 'rows')}
                                                        className="cursor-pointer transition hover:bg-orange-500/10"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3 font-mono font-semibold text-white hover:text-cyan-400">
                                                                <TableIcon className="shrink-0 text-orange-400" size={18} />
                                                                <span>{table.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <span className="rounded border border-orange-500/30 bg-neutral-900 px-2 py-0.5 font-mono text-xs text-orange-300">
                                                                SQLite 3
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3 text-neutral-300">
                                                            <span className="font-mono text-xs text-cyan-400">{table.columns.length} cols</span>
                                                            <span className="ml-2 hidden max-w-[260px] truncate font-mono text-xs text-neutral-400 xl:inline-block">
                                                                ({table.columns.slice(0, 4).join(', ')}
                                                                {table.columns.length > 4 ? '…' : ''})
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-400">
                                                                {table.count} filas
                                                            </span>
                                                        </td>
                                                        <td
                                                            className="whitespace-nowrap px-4 py-3 text-right"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openTable(table, 'rows')}
                                                                    className="rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-500 hover:text-black"
                                                                >
                                                                    Examinar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openTable(table, 'structure')}
                                                                    className="rounded border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs text-orange-300 hover:bg-orange-500 hover:text-black"
                                                                >
                                                                    Estructura
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        openTable(table, 'sql');
                                                                        void runSqlQuery(`SELECT * FROM "${table.name}" LIMIT 50;`);
                                                                    }}
                                                                    className="rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-300 hover:bg-cyan-500 hover:text-black"
                                                                >
                                                                    SQL
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-500/30 px-4 py-3 text-xs text-neutral-400">
                                    <span>
                                        Mostrando {filteredTables.length ? (Math.min(page, pages) - 1) * perPage + 1 : 0}–
                                        {Math.min(Math.min(page, pages) * perPage, filteredTables.length)} de {filteredTables.length} tablas SQL
                                    </span>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-orange-300">
                                            Por página
                                            <select
                                                aria-label="Tablas por página"
                                                value={perPage}
                                                onChange={(e) => {
                                                    setPerPage(Number(e.target.value));
                                                    setPage(1);
                                                }}
                                                className="rounded border border-orange-500/40 bg-neutral-900 px-2 py-1 text-white"
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
                                                className="rounded p-1 text-orange-400 disabled:opacity-30"
                                            >
                                                <ChevronLeft size={17} />
                                            </button>
                                            <span className="text-orange-300">
                                                {Math.min(page, pages)} / {pages}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label="Página siguiente"
                                                disabled={page >= pages}
                                                onClick={() => setPage((v) => v + 1)}
                                                className="rounded p-1 text-orange-400 disabled:opacity-30"
                                            >
                                                <ChevronRight size={17} />
                                            </button>
                                        </div>
                                    </div>
                                </footer>
                            </section>
                            <p className="text-xs text-neutral-400">
                                Haz clic sobre cualquier tabla SQL para examinar sus filas reales, ver su estructura `PRAGMA` o ejecutar consultas SQLite.
                            </p>
                        </>
                    )}
                </div>
            ) : (
                /* VISTA PRINCIPAL DE DATABASE HOSTS */
                <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                    <div className="flex items-center justify-between border-b border-orange-500/30 pb-4">
                        <div className="flex items-center gap-3">
                            <DatabaseIcon className="h-8 w-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                            <div>
                                <h1 className="text-2xl font-bold tracking-wider text-orange-400">DATABASE HOSTS</h1>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Gestiona los motores SQLite / SQL y haz clic en cualquier base de datos para abrir sus tablas y consola SQL
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
                                placeholder="SQLite / MySQL Principal"
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
                                                openDatabaseManager({
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
                                                    openDatabaseManager({
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

function SqlConsoleSection({
    sqlQuery,
    setSqlQuery,
    sqlLoading,
    sqlError,
    sqlResult,
    runSqlQuery,
    tables,
}: {
    sqlQuery: string;
    setSqlQuery: (q: string) => void;
    sqlLoading: boolean;
    sqlError: string | null;
    sqlResult: SqlQueryResult | null;
    runSqlQuery: (customQuery?: string, e?: FormEvent) => Promise<void>;
    tables: DbTableInfo[];
}) {
    const presetQueries = [
        { label: 'Listar Tablas (sqlite_master)', sql: "SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name;" },
        { label: 'Usuarios', sql: 'SELECT id, name, email, created_at FROM "users" LIMIT 25;' },
        { label: 'Servidores', sql: 'SELECT id, name, uuid, memory, disk, cpu FROM "servers" LIMIT 25;' },
        { label: 'Nodos', sql: 'SELECT id, name, fqdn, scheme, daemon_listen FROM "nodes" LIMIT 25;' },
        { label: 'Webhooks', sql: 'SELECT id, name, url, format, enabled, last_status_code FROM "webhooks" LIMIT 25;' },
    ];

    return (
        <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs text-orange-300">Consultas rápidas:</span>
                    {presetQueries.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                                setSqlQuery(preset.sql);
                                void runSqlQuery(preset.sql);
                            }}
                            className="rounded border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 font-mono text-xs text-orange-300 hover:bg-orange-500 hover:text-black"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                {tables.length > 0 && (
                    <select
                        aria-label="Seleccionar tabla para SELECT"
                        defaultValue=""
                        onChange={(e) => {
                            if (e.target.value) {
                                const q = `SELECT * FROM "${e.target.value}" LIMIT 50;`;
                                setSqlQuery(q);
                                void runSqlQuery(q);
                            }
                        }}
                        className="rounded-lg border border-orange-500/40 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-cyan-300 outline-none focus:border-orange-400"
                    >
                        <option value="" disabled>
                            SELECT * FROM tabla…
                        </option>
                        {tables.map((t) => (
                            <option key={t.name} value={t.name}>
                                {t.name} ({t.count} filas)
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <form onSubmit={(e) => void runSqlQuery(undefined, e)} className="space-y-3">
                <textarea
                    rows={4}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM users LIMIT 25;"
                    className="w-full rounded-lg border border-orange-500/40 bg-neutral-900 p-3.5 font-mono text-sm text-cyan-300 outline-none focus:border-orange-400"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-neutral-400">
                        Motor conectado a SQLite (`SELECT`, `PRAGMA`, `EXPLAIN`). Los campos sensibles se enmascaran automáticamente.
                    </p>
                    <button type="submit" disabled={sqlLoading || !sqlQuery.trim()} className={primary}>
                        <Play size={15} /> {sqlLoading ? 'Ejecutando…' : 'Ejecutar SQL'}
                    </button>
                </div>
            </form>

            {sqlError && (
                <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 font-mono text-xs text-red-300">
                    Error SQL: {sqlError}
                </div>
            )}

            {sqlResult && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span>
                            Resultado: <strong className="text-cyan-400">{sqlResult.row_count}</strong> filas devueltas
                        </span>
                        <span className="font-mono text-emerald-400">Tiempo: {sqlResult.execution_time_ms} ms</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-orange-500/30">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-orange-500/30 bg-neutral-900/80 text-xs uppercase text-orange-300">
                                <tr>
                                    {sqlResult.columns.map((col) => (
                                        <th key={col} className="whitespace-nowrap px-4 py-2.5 font-mono text-orange-300">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {sqlResult.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={Math.max(1, sqlResult.columns.length)} className="p-8 text-center text-neutral-400">
                                            La consulta no devolvió filas.
                                        </td>
                                    </tr>
                                ) : (
                                    sqlResult.rows.map((row, idx) => (
                                        <tr key={idx} className="transition hover:bg-orange-500/10">
                                            {sqlResult.columns.map((col) => {
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
                                                        className="max-w-[260px] truncate whitespace-nowrap px-4 py-2.5 font-mono text-xs text-neutral-200"
                                                        title={text}
                                                    >
                                                        {val === null || val === undefined ? (
                                                            <span className="italic text-neutral-500">NULL</span>
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
                </div>
            )}
        </div>
    );
}
