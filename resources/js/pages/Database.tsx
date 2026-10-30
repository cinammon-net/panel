import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowDown,
    ArrowUp,
    Braces,
    ChevronLeft,
    ChevronRight,
    Code2,
    Copy,
    Cpu,
    Database as DatabaseIcon,
    HardDrive,
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

export type DbDriver = 'sqlite' | 'mysql' | 'mariadb' | 'pgsql' | 'mongodb' | 'redis' | 'sqlsrv';

interface DatabaseEngineSpec {
    id: DbDriver;
    label: string;
    shortLabel: string;
    scheme: string;
    defaultHost: string;
    defaultPort: number;
    defaultUser: string;
    badgeClass: string;
    entitySingular: string;
    entityPlural: string;
    consoleLabel: string;
}

const DB_ENGINES: Record<DbDriver, DatabaseEngineSpec> = {
    sqlite: {
        id: 'sqlite',
        label: 'SQLite 3',
        shortLabel: 'SQLite',
        scheme: 'sqlite3://',
        defaultHost: 'database/local.sqlite',
        defaultPort: 0,
        defaultUser: 'local',
        badgeClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
        entitySingular: 'Tabla SQL',
        entityPlural: 'Tablas SQL',
        consoleLabel: 'Consola SQLite',
    },
    mysql: {
        id: 'mysql',
        label: 'MySQL 8.0',
        shortLabel: 'MySQL',
        scheme: 'mysql://',
        defaultHost: '127.0.0.1',
        defaultPort: 3306,
        defaultUser: 'cinammon',
        badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
        entitySingular: 'Tabla MySQL',
        entityPlural: 'Tablas MySQL',
        consoleLabel: 'Consola MySQL',
    },
    mariadb: {
        id: 'mariadb',
        label: 'MariaDB 11.4',
        shortLabel: 'MariaDB',
        scheme: 'mariadb://',
        defaultHost: '127.0.0.1',
        defaultPort: 3306,
        defaultUser: 'mariadb',
        badgeClass: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
        entitySingular: 'Tabla MariaDB',
        entityPlural: 'Tablas MariaDB',
        consoleLabel: 'Consola MariaDB',
    },
    pgsql: {
        id: 'pgsql',
        label: 'PostgreSQL 16',
        shortLabel: 'PostgreSQL',
        scheme: 'postgresql://',
        defaultHost: '127.0.0.1',
        defaultPort: 5432,
        defaultUser: 'postgres',
        badgeClass: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
        entitySingular: 'Tabla PostgreSQL',
        entityPlural: 'Tablas PostgreSQL',
        consoleLabel: 'Consola PostgreSQL (psql)',
    },
    mongodb: {
        id: 'mongodb',
        label: 'MongoDB 7.0',
        shortLabel: 'MongoDB',
        scheme: 'mongodb://',
        defaultHost: '127.0.0.1',
        defaultPort: 27017,
        defaultUser: 'mongo_admin',
        badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
        entitySingular: 'Colección BSON',
        entityPlural: 'Colecciones BSON',
        consoleLabel: 'Consola MongoSH (MQL)',
    },
    redis: {
        id: 'redis',
        label: 'Redis 7.2',
        shortLabel: 'Redis',
        scheme: 'redis://',
        defaultHost: '127.0.0.1',
        defaultPort: 6379,
        defaultUser: 'default',
        badgeClass: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
        entitySingular: 'Keyspace',
        entityPlural: 'Keyspaces',
        consoleLabel: 'Consola Redis CLI',
    },
    sqlsrv: {
        id: 'sqlsrv',
        label: 'SQL Server 2022',
        shortLabel: 'SQL Server',
        scheme: 'mssql://',
        defaultHost: '127.0.0.1',
        defaultPort: 1433,
        defaultUser: 'sa',
        badgeClass: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
        entitySingular: 'Tabla T-SQL',
        entityPlural: 'Tablas T-SQL',
        consoleLabel: 'Consola T-SQL',
    },
};

function normalizeDriver(driver?: string, port?: number): DbDriver {
    const clean = (driver || '').toLowerCase() as DbDriver;
    if (clean && clean in DB_ENGINES) {
        return clean;
    }
    if (port === 5432) return 'pgsql';
    if (port === 27017) return 'mongodb';
    if (port === 6379) return 'redis';
    if (port === 1433) return 'sqlsrv';
    if (port === 0) return 'sqlite';
    return 'mysql';
}

interface DatabaseHost {
    id: number;
    name: string;
    driver?: DbDriver;
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
    driver?: DbDriver;
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
    driver: DbDriver;
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
    'inline-flex items-center justify-center gap-2 rounded-lg border border-orange-500/35 bg-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40';
const primary =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500/90 px-4 py-2 text-xs font-bold text-black transition hover:bg-orange-400 disabled:opacity-40';
const input =
    'w-full rounded-lg border border-orange-500/35 bg-neutral-950/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400';

function getDefaultQueryForDriver(driver: DbDriver, tableName = 'users'): string {
    switch (driver) {
        case 'mongodb':
            return `db.${tableName}.find({}).limit(25)`;
        case 'redis':
            return 'KEYS *';
        case 'pgsql':
            return `SELECT * FROM public."${tableName}" LIMIT 25;`;
        case 'mysql':
        case 'mariadb':
            return `SELECT * FROM \`${tableName}\` LIMIT 25;`;
        case 'sqlsrv':
            return `SELECT * FROM "${tableName}" LIMIT 25;`;
        case 'sqlite':
        default:
            return `SELECT * FROM "${tableName}" LIMIT 25;`;
    }
}

function formatDdlForDriver(table: DbTableInfo, driver: DbDriver): string {
    const cols =
        table.schema && table.schema.length > 0
            ? table.schema
            : table.columns.map((c, idx) => ({
                  cid: idx,
                  name: c,
                  type: 'VARCHAR(255)',
                  notnull: false,
                  dflt_value: null,
                  pk: idx === 0,
              }));

    if (driver === 'mongodb') {
        const sampleDoc = table.rows[0] || {};
        const properties: Record<string, { bsonType: string; description: string }> = {
            _id: { bsonType: 'objectId', description: 'Identificador único ObjectId' },
        };
        for (const col of cols) {
            const sampleVal = sampleDoc[col.name];
            properties[col.name] = {
                bsonType: typeof sampleVal === 'number' ? 'int' : typeof sampleVal === 'boolean' ? 'bool' : 'string',
                description: col.notnull ? 'required field' : 'optional field',
            };
        }
        return JSON.stringify(
            {
                collection: table.name,
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: cols.filter((c) => c.notnull || c.pk).map((c) => c.name),
                        properties,
                    },
                },
            },
            null,
            2,
        );
    }

    if (driver === 'redis') {
        return `# Estructura Keyspace Redis para prefijo "${table.name}:*"\nHSET ${table.name}:1 ${cols
            .slice(0, 5)
            .map((c) => `${c.name} "<${c.type || 'string'}>"`)
            .join(' ')}\nEXPIRE ${table.name}:1 3600`;
    }

    if (driver === 'pgsql') {
        const lines = cols.map((c) => {
            const pgType = c.pk && c.type.toUpperCase().includes('INT') ? 'BIGSERIAL PRIMARY KEY' : c.type || 'TEXT';
            const nullPart = c.notnull && !c.pk ? ' NOT NULL' : '';
            const defPart = c.dflt_value !== null ? ` DEFAULT ${c.dflt_value}` : '';
            return `    "${c.name}" ${pgType}${nullPart}${defPart}`;
        });
        return `CREATE TABLE public."${table.name}" (\n${lines.join(',\n')}\n);`;
    }

    if (driver === 'mysql' || driver === 'mariadb') {
        const lines = cols.map((c) => {
            const myType = c.type || 'VARCHAR(255)';
            const pkPart = c.pk ? ' AUTO_INCREMENT PRIMARY KEY' : '';
            const nullPart = c.notnull ? ' NOT NULL' : ' NULL';
            return `    \`${c.name}\` ${myType}${nullPart}${pkPart}`;
        });
        return `CREATE TABLE \`${table.name}\` (\n${lines.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
    }

    return table.ddl || `CREATE TABLE "${table.name}" (...);`;
}

export default function Database({ hosts = [], servers = [], nodes = [], dbFiles = [], dbTables = [] }: Props) {
    const [selectedDb, setSelectedDb] = useState<SelectedDatabaseContext | null>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const openParam = params.get('open');
            const driverParam = params.get('driver') as DbDriver | null;
            if (openParam) {
                for (const s of servers) {
                    const dbs =
                        s.databases && s.databases.length > 0
                            ? s.databases
                            : [{ id: 1, name: `s${s.id}_cinammon`, driver: 'mysql' as DbDriver, user: `u${s.id}_admin`, host: '127.0.0.1', port: 3306 }];
                    const match = dbs.find((d) => d.name === openParam);
                    if (match) {
                        const drv = normalizeDriver(driverParam || match.driver, match.port);
                        return {
                            title: match.name,
                            subtitle: `${s.name} · ${s.node_name}`,
                            driver: drv,
                            endpoint: match.port ? `${match.host}:${match.port}` : match.host,
                            username: match.user,
                            serverId: s.id,
                        };
                    }
                }
                const hostMatch = hosts.find((h) => h.name === openParam || String(h.id) === openParam);
                if (hostMatch) {
                    const drv = normalizeDriver(driverParam || hostMatch.driver, hostMatch.port);
                    return {
                        title: hostMatch.name,
                        subtitle: `Database Host #${hostMatch.id} (${hostMatch.node_name})`,
                        driver: drv,
                        endpoint: hostMatch.port ? `${hostMatch.host}:${hostMatch.port}` : hostMatch.host,
                        username: hostMatch.username,
                    };
                }
            }
        }
        return null;
    });

    const [engineFilter, setEngineFilter] = useState<'all' | DbDriver>('all');
    const [activeSection, setActiveSection] = useState<'tables' | 'sql'>('tables');
    const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
    const [tableTab, setTableTab] = useState<'rows' | 'structure' | 'sql'>('rows');
    const [rowViewMode, setRowViewMode] = useState<'grid' | 'json'>('grid');
    const [search, setSearch] = useState('');
    const [rowSearch, setRowSearch] = useState('');
    const [sort, setSort] = useState<'name' | 'columns' | 'rows'>('name');
    const [ascending, setAscending] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const [sqlQuery, setSqlQuery] = useState('SELECT id, name, email, created_at FROM "users" LIMIT 25;');
    const [sqlLoading, setSqlLoading] = useState(false);
    const [sqlError, setSqlError] = useState<string | null>(null);
    const [sqlResult, setSqlResult] = useState<SqlQueryResult | null>(null);

    const [form, setForm] = useState<{
        name: string;
        driver: DbDriver;
        host: string;
        port: number;
        username: string;
        max_databases: number;
        node_id: string | number;
    }>({
        name: '',
        driver: 'mysql',
        host: '127.0.0.1',
        port: 3306,
        username: 'cinammon',
        max_databases: 50,
        node_id: nodes[0]?.id ?? '',
    });

    const handleDriverSelectForForm = (newDriver: DbDriver) => {
        const spec = DB_ENGINES[newDriver];
        setForm((prev) => ({
            ...prev,
            driver: newDriver,
            host: spec.defaultHost,
            port: spec.defaultPort,
            username: spec.defaultUser,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/database', form, {
            onSuccess: () => {
                setForm({ ...form, name: '' });
                toast.success('Database Host registrado correctamente');
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
        setRowViewMode(ctx.driver === 'mongodb' ? 'json' : 'grid');
        setSqlQuery(getDefaultQueryForDriver(ctx.driver, 'users'));
        setSearch('');
        setRowSearch('');
        setSqlError(null);
        setSqlResult(null);
        setPage(1);
    };

    const switchActiveManagerDriver = (newDriver: DbDriver) => {
        if (!selectedDb) return;
        const spec = DB_ENGINES[newDriver];
        const nextQuery = getDefaultQueryForDriver(newDriver, selectedTableName || 'users');
        setSelectedDb({
            ...selectedDb,
            driver: newDriver,
            endpoint: spec.defaultPort ? `${spec.defaultHost}:${spec.defaultPort}` : spec.defaultHost,
            username: spec.defaultUser,
        });
        setRowViewMode(newDriver === 'mongodb' ? 'json' : 'grid');
        setSqlQuery(nextQuery);
        setSqlError(null);
        setSqlResult(null);
    };

    const activeSpec = selectedDb ? DB_ENGINES[selectedDb.driver] : DB_ENGINES.sqlite;
    const selectedTable = dbTables.find((t) => t.name === selectedTableName) || null;
    const activeSqliteFile = dbFiles.find((f) => f.active) || dbFiles[0];
    const totalRecords = dbTables.reduce((acc, t) => acc + t.count, 0);

    const openTable = (table: DbTableInfo, initialTab: 'rows' | 'structure' | 'sql' = 'rows') => {
        const drv = selectedDb?.driver || 'sqlite';
        setSelectedTableName(table.name);
        setTableTab(initialTab);
        setRowViewMode(drv === 'mongodb' ? 'json' : 'grid');
        setRowSearch('');
        setSqlQuery(getDefaultQueryForDriver(drv, table.name));
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
            const response = await axios.post<SqlQueryResult>('/database/query', {
                query: queryToRun,
                driver: selectedDb?.driver || 'sqlite',
            });
            setSqlResult(response.data);
            toast.success(`Consulta ejecutada en ${activeSpec.shortLabel} (${response.data.execution_time_ms} ms)`);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setSqlError(err.response?.data?.error || err.response?.data?.message || 'Error al ejecutar la consulta.');
            } else {
                setSqlError('Error al ejecutar la consulta.');
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

    const filteredHosts = hosts.filter((h) => {
        const drv = normalizeDriver(h.driver, h.port);
        return engineFilter === 'all' || drv === engineFilter;
    });

    const breadcrumbs: BreadcrumbItem[] = selectedDb
        ? [
              { title: 'Database Host', href: '/database' },
              { title: `${selectedDb.title} (${activeSpec.shortLabel})`, href: `/database?open=${encodeURIComponent(selectedDb.title)}` },
          ]
        : [{ title: 'Database Host', href: '/database' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={selectedDb ? `${selectedDb.title} · ${activeSpec.label}` : 'Database Hosts'} />

            {selectedDb ? (
                <div className="flex min-h-screen flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-slate-100">
                    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-500/25 pb-4">
                        <div className="flex items-center gap-3">
                            <DatabaseIcon className="h-7 w-7 text-orange-400" />
                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="text-xl font-bold tracking-wider text-orange-400 uppercase sm:text-2xl">
                                        {selectedTable ? `${activeSpec.entitySingular}: ${selectedTable.name}` : selectedDb.title}
                                    </h1>
                                    <span className={`rounded border px-2.5 py-0.5 font-mono text-xs font-semibold ${activeSpec.badgeClass}`}>
                                        {activeSpec.label}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                                    {selectedDb.subtitle} · Motor activo: {activeSpec.label}
                                    {selectedDb.driver === 'sqlite' && activeSqliteFile
                                        ? ` (${activeSqliteFile.name} · ${activeSqliteFile.size_kb} KB)`
                                        : ''}{' '}
                                    · {dbTables.length} {activeSpec.entityPlural.toLowerCase()} · {totalRecords} registros
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Selector rápido de motor (SQLite, MySQL, PostgreSQL, MongoDB, Redis, etc.) */}
                            <div className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-neutral-950 px-2.5 py-1.5 text-xs">
                                <Cpu size={14} className="text-orange-400" />
                                <span className="text-slate-400">Motor:</span>
                                <select
                                    aria-label="Cambiar motor de base de datos"
                                    value={selectedDb.driver}
                                    onChange={(e) => switchActiveManagerDriver(e.target.value as DbDriver)}
                                    className="bg-transparent font-semibold text-cyan-300 outline-none"
                                >
                                    {Object.values(DB_ENGINES).map((eng) => (
                                        <option key={eng.id} value={eng.id} className="bg-neutral-950 text-white">
                                            {eng.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedTable ? (
                                <>
                                    <button
                                        type="button"
                                        className={tableTab === 'rows' ? primary : button}
                                        onClick={() => setTableTab('rows')}
                                    >
                                        <TableIcon size={15} />{' '}
                                        {selectedDb.driver === 'mongodb' ? `Documentos (${selectedTable.count})` : `Filas (${selectedTable.count})`}
                                    </button>
                                    <button
                                        type="button"
                                        className={tableTab === 'structure' ? primary : button}
                                        onClick={() => setTableTab('structure')}
                                    >
                                        <Layers size={15} /> Esquema ({selectedTable.columns.length})
                                    </button>
                                    <button
                                        type="button"
                                        className={tableTab === 'sql' ? primary : button}
                                        onClick={() => {
                                            setTableTab('sql');
                                            const q = getDefaultQueryForDriver(selectedDb.driver, selectedTable.name);
                                            setSqlQuery(q);
                                            void runSqlQuery(q);
                                        }}
                                    >
                                        <Terminal size={15} /> {activeSpec.consoleLabel}
                                    </button>
                                    <button type="button" className={button} onClick={() => setSelectedTableName(null)}>
                                        <ChevronLeft size={15} /> Volver a {activeSpec.entityPlural}
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
                                        <TableIcon size={15} /> {activeSpec.entityPlural} ({dbTables.length})
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
                                        <Terminal size={15} /> {activeSpec.consoleLabel}
                                    </button>
                                </>
                            )}
                        </div>
                    </header>

                    {/* Barra de conexión */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1 font-mono text-sm text-slate-400">
                            <DatabaseIcon size={16} className="mr-2 text-orange-400" />
                            <button
                                type="button"
                                className="rounded px-1 py-1 text-orange-300 hover:text-orange-400"
                                onClick={() => {
                                    setSelectedTableName(null);
                                    setActiveSection('tables');
                                }}
                            >
                                {activeSpec.scheme}
                                {selectedDb.title}
                            </button>
                            <ChevronRight size={13} />
                            <span className="px-1 py-1 text-cyan-300">
                                {selectedTable
                                    ? `${selectedDb.driver === 'mongodb' ? 'collection' : 'table'}/${selectedTable.name}`
                                    : activeSection === 'sql'
                                      ? 'query-console'
                                      : 'schema'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden rounded-lg border border-orange-500/30 bg-neutral-950/90 px-3 py-1.5 font-mono text-xs text-cyan-300 sm:inline-block">
                                {selectedDb.username}@{selectedDb.endpoint}
                            </span>
                            <button
                                type="button"
                                aria-label="Recargar esquema"
                                className={button}
                                onClick={() => router.reload()}
                            >
                                <RefreshCw size={15} />
                            </button>
                        </div>
                    </div>

                    {/* VISTA DE UNA TABLA O COLECCIÓN SELECCIONADA */}
                    {selectedTable ? (
                        <section className="overflow-hidden rounded-xl border border-orange-500/30 bg-neutral-950/90">
                            {tableTab === 'rows' && (
                                <>
                                    <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-orange-500/25 px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="font-mono text-xs text-cyan-300 sm:text-sm">
                                                {getDefaultQueryForDriver(selectedDb.driver, selectedTable.name)}
                                            </span>
                                            <span className="rounded border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs text-orange-300">
                                                Mostrando {filteredRows.length} de {selectedTable.count}{' '}
                                                {selectedDb.driver === 'mongodb' ? 'documentos' : 'filas'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="flex items-center rounded-lg border border-orange-500/30 bg-neutral-900 p-0.5 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => setRowViewMode('grid')}
                                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                                                        rowViewMode === 'grid'
                                                            ? 'bg-orange-500 font-bold text-black'
                                                            : 'text-slate-300 hover:text-orange-300'
                                                    }`}
                                                >
                                                    <TableIcon size={13} /> Tabla
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRowViewMode('json')}
                                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                                                        rowViewMode === 'json'
                                                            ? 'bg-orange-500 font-bold text-black'
                                                            : 'text-slate-300 hover:text-orange-300'
                                                    }`}
                                                >
                                                    <Braces size={13} /> Documentos JSON
                                                </button>
                                            </div>
                                            <div className="relative min-w-[220px]">
                                                <Search className="absolute top-2.5 left-3 text-orange-400" size={16} />
                                                <input
                                                    aria-label="Filtrar filas"
                                                    placeholder="Filtrar registros…"
                                                    value={rowSearch}
                                                    onChange={(e) => setRowSearch(e.target.value)}
                                                    className={`${input} pl-9`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {rowViewMode === 'json' ? (
                                        <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
                                            {filteredRows.length === 0 ? (
                                                <div className="col-span-full p-8 text-center text-slate-400">
                                                    No hay documentos que coincidan con el filtro.
                                                </div>
                                            ) : (
                                                filteredRows.map((row, idx) => {
                                                    const doc =
                                                        selectedDb.driver === 'mongodb'
                                                            ? {
                                                                  _id: `ObjectId("${String(row.id ?? idx + 1).padStart(24, '6723a9f0')}")`,
                                                                  ...row,
                                                              }
                                                            : row;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="rounded-lg border border-orange-500/25 bg-neutral-900/70 p-3.5 font-mono text-xs"
                                                        >
                                                            <div className="mb-2 flex items-center justify-between border-b border-neutral-800 pb-1.5 text-[11px] text-slate-400">
                                                                <span className="text-emerald-400">
                                                                    {selectedDb.driver === 'mongodb'
                                                                        ? `Documento BSON #${idx + 1}`
                                                                        : `Registro JSON #${idx + 1}`}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
                                                                        toast.success('Documento copiado');
                                                                    }}
                                                                    className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                                                                >
                                                                    <Copy size={12} /> Copiar
                                                                </button>
                                                            </div>
                                                            <pre className="overflow-x-auto leading-relaxed text-slate-200">
                                                                {JSON.stringify(doc, null, 2)}
                                                            </pre>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="border-b border-orange-500/25 bg-neutral-900/70 text-xs uppercase text-orange-300">
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
                                                                            <span className="text-[10px] font-normal text-cyan-300 uppercase">
                                                                                {colSchema.type}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </th>
                                                            );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-800/80">
                                                    {filteredRows.length === 0 ? (
                                                        <tr>
                                                            <td
                                                                colSpan={Math.max(1, selectedTable.columns.length)}
                                                                className="p-12 text-center text-slate-400"
                                                            >
                                                                No hay registros que coincidan en `{selectedTable.name}`.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredRows.map((row, idx) => (
                                                            <tr key={idx} className="transition hover:bg-orange-500/10">
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
                                                                            className="max-w-[280px] truncate whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-200"
                                                                            title={text}
                                                                        >
                                                                            {val === null || val === undefined ? (
                                                                                <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] italic text-slate-500">
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
                                    )}
                                </>
                            )}

                            {tableTab === 'structure' && (
                                <div className="space-y-6 p-5">
                                    <div>
                                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-400">
                                            <Layers size={16} /> Esquema de `{selectedTable.name}` ({activeSpec.label})
                                        </h3>
                                        <div className="overflow-x-auto rounded-lg border border-orange-500/25">
                                            <table className="w-full text-left text-sm">
                                                <thead className="border-b border-orange-500/25 bg-neutral-900/70 text-xs uppercase text-orange-300">
                                                    <tr>
                                                        <th className="px-4 py-3">#</th>
                                                        <th className="px-4 py-3">Campo / Columna</th>
                                                        <th className="px-4 py-3">Tipo ({activeSpec.shortLabel})</th>
                                                        <th className="px-4 py-3">Nulo</th>
                                                        <th className="px-4 py-3">Valor por Defecto</th>
                                                        <th className="px-4 py-3">Índice / Clave</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-800/80">
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
                                                        <tr key={col.cid} className="transition hover:bg-orange-500/10">
                                                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{col.cid}</td>
                                                            <td className="px-4 py-3 font-mono font-semibold text-cyan-300">{col.name}</td>
                                                            <td className="px-4 py-3">
                                                                <span className="rounded border border-orange-500/30 bg-neutral-900 px-2 py-0.5 font-mono text-xs text-orange-300 uppercase">
                                                                    {selectedDb.driver === 'mongodb'
                                                                        ? col.pk
                                                                            ? 'ObjectId'
                                                                            : col.type.toUpperCase().includes('INT')
                                                                              ? 'Int32'
                                                                              : 'String'
                                                                        : col.type || 'TEXT'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-slate-300">
                                                                {col.notnull ? 'NOT NULL' : 'NULL'}
                                                            </td>
                                                            <td className="px-4 py-3 font-mono text-xs text-slate-400">
                                                                {col.dflt_value ?? <span className="italic text-slate-500">Ninguno</span>}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {col.pk ? (
                                                                    <span className="inline-flex items-center gap-1 rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-xs text-amber-300">
                                                                        <KeyRound size={11} /> {selectedDb.driver === 'mongodb' ? '_id INDEX' : 'PRIMARY KEY'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-slate-500">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-400">
                                                <Code2 size={16} className="text-cyan-300" /> Definición de Esquema / DDL ({activeSpec.label})
                                            </h3>
                                            <button
                                                type="button"
                                                className={button}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(formatDdlForDriver(selectedTable, selectedDb.driver));
                                                    toast.success('Definición copiada al portapapeles');
                                                }}
                                            >
                                                <Copy size={14} /> Copiar Esquema
                                            </button>
                                        </div>
                                        <pre className="overflow-x-auto rounded-lg border border-orange-500/25 bg-neutral-900/90 p-4 font-mono text-xs leading-6 text-cyan-200">
                                            {formatDdlForDriver(selectedTable, selectedDb.driver)}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {tableTab === 'sql' && (
                                <SqlConsoleSection
                                    driver={selectedDb.driver}
                                    spec={activeSpec}
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
                        <section className="overflow-hidden rounded-xl border border-orange-500/30 bg-neutral-950/90">
                            <SqlConsoleSection
                                driver={selectedDb.driver}
                                spec={activeSpec}
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
                        <>
                            <section className="overflow-hidden rounded-xl border border-orange-500/30 bg-neutral-950/90">
                                <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-orange-500/25 px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-orange-300">
                                        <span className="font-semibold text-orange-400">
                                            {filteredTables.length}{' '}
                                            {filteredTables.length === 1 ? activeSpec.entitySingular : activeSpec.entityPlural}
                                        </span>
                                        <span className="text-slate-600">·</span>
                                        <span className="font-mono text-xs text-cyan-300">
                                            {totalRecords} {selectedDb.driver === 'mongodb' ? 'documentos totales' : 'registros totales'}
                                        </span>
                                    </div>
                                    <div className="relative min-w-[240px]">
                                        <Search className="absolute top-2.5 left-3 text-orange-400" size={16} />
                                        <input
                                            aria-label="Buscar tabla o colección"
                                            placeholder={`Buscar ${activeSpec.entitySingular.toLowerCase()} (ej. users, servers)…`}
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
                                        <thead className="border-b border-orange-500/25 text-xs uppercase text-orange-300">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => changeSort('name')}
                                                        className="flex items-center gap-2 uppercase"
                                                    >
                                                        {activeSpec.entitySingular}
                                                        {sort === 'name' && (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                    </button>
                                                </th>
                                                <th className="px-3 py-3">Motor Activo</th>
                                                <th className="px-3 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => changeSort('columns')}
                                                        className="flex items-center gap-2 uppercase"
                                                    >
                                                        {selectedDb.driver === 'mongodb' ? 'Campos BSON' : 'Columnas'}
                                                        {sort === 'columns' && (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                    </button>
                                                </th>
                                                <th className="px-3 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => changeSort('rows')}
                                                        className="flex items-center gap-2 uppercase"
                                                    >
                                                        {selectedDb.driver === 'mongodb' ? 'Documentos' : 'Registros'}
                                                        {sort === 'rows' && (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                    </button>
                                                </th>
                                                <th className="px-4 py-3 text-right">Operaciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-800/80">
                                            {visibleTables.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-12 text-center text-slate-400">
                                                        No se encontraron resultados que coincidan con la búsqueda.
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
                                                            <div className="flex items-center gap-3 font-mono font-semibold text-slate-100 hover:text-cyan-300">
                                                                {selectedDb.driver === 'mongodb' ? (
                                                                    <Braces className="shrink-0 text-emerald-400" size={18} />
                                                                ) : (
                                                                    <TableIcon className="shrink-0 text-orange-400" size={18} />
                                                                )}
                                                                <span>{selectedDb.driver === 'redis' ? `${table.name}:*` : table.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <span className={`rounded border px-2 py-0.5 font-mono text-xs ${activeSpec.badgeClass}`}>
                                                                {activeSpec.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3 text-slate-300">
                                                            <span className="font-mono text-xs text-cyan-300">{table.columns.length} campos</span>
                                                            <span className="ml-2 hidden max-w-[260px] truncate font-mono text-xs text-slate-400 xl:inline-block">
                                                                ({table.columns.slice(0, 4).join(', ')}
                                                                {table.columns.length > 4 ? '…' : ''})
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3">
                                                            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300">
                                                                {table.count} {selectedDb.driver === 'mongodb' ? 'docs' : 'filas'}
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
                                                                    className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-500 hover:text-black"
                                                                >
                                                                    <TableIcon size={12} /> Examinar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openTable(table, 'structure')}
                                                                    className="inline-flex items-center gap-1 rounded border border-orange-500/35 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300 hover:bg-orange-500 hover:text-black"
                                                                >
                                                                    <Layers size={12} /> Esquema
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        openTable(table, 'sql');
                                                                        const q = getDefaultQueryForDriver(selectedDb.driver, table.name);
                                                                        setSqlQuery(q);
                                                                        void runSqlQuery(q);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs text-cyan-300 hover:bg-cyan-500 hover:text-black"
                                                                >
                                                                    <Terminal size={12} /> Query
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-500/25 px-4 py-3 text-xs text-slate-400">
                                    <span>
                                        Mostrando {filteredTables.length ? (Math.min(page, pages) - 1) * perPage + 1 : 0}–
                                        {Math.min(Math.min(page, pages) * perPage, filteredTables.length)} de {filteredTables.length}{' '}
                                        {activeSpec.entityPlural.toLowerCase()}
                                    </span>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-orange-300">
                                            Por página
                                            <select
                                                aria-label="Elementos por página"
                                                value={perPage}
                                                onChange={(e) => {
                                                    setPerPage(Number(e.target.value));
                                                    setPage(1);
                                                }}
                                                className="rounded border border-orange-500/35 bg-neutral-900 px-2 py-1 text-slate-100"
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
                        </>
                    )}
                </div>
            ) : (
                /* VISTA PRINCIPAL DE DATABASE HOSTS MULTI-MOTOR */
                <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-500/25 pb-4">
                        <div className="flex items-center gap-3">
                            <DatabaseIcon className="h-8 w-8 text-orange-400" />
                            <div>
                                <h1 className="text-2xl font-bold tracking-wider text-orange-400">DATABASE HOSTS</h1>
                                <p className="text-xs text-neutral-500 dark:text-slate-400">
                                    Soporte multi-motor para SQLite, MySQL, MariaDB, PostgreSQL, MongoDB, Redis y SQL Server
                                </p>
                            </div>
                        </div>

                        {/* Filtro por motor con iconos consistentes */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setEngineFilter('all')}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                    engineFilter === 'all'
                                        ? 'border-orange-400 bg-orange-500 text-black'
                                        : 'border-orange-500/30 bg-neutral-900 text-slate-300 hover:border-orange-400'
                                }`}
                            >
                                <DatabaseIcon size={13} /> Todos ({hosts.length})
                            </button>
                            {Object.values(DB_ENGINES).map((spec) => (
                                <button
                                    key={spec.id}
                                    type="button"
                                    onClick={() => setEngineFilter(spec.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                                        engineFilter === spec.id
                                            ? 'border-orange-400 bg-orange-500 text-black'
                                            : `${spec.badgeClass} hover:opacity-90`
                                    }`}
                                >
                                    <HardDrive size={12} /> {spec.shortLabel}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Formulario para nuevo Host con selector de Motor */}
                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 gap-4 rounded-xl border border-orange-500/30 bg-neutral-900/80 p-5 sm:grid-cols-2 lg:grid-cols-7"
                    >
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Motor / Tipo</label>
                            <select
                                value={form.driver}
                                onChange={(e) => handleDriverSelectForForm(e.target.value as DbDriver)}
                                className="w-full rounded-lg border border-orange-500/35 bg-neutral-950 px-3 py-2 text-sm text-cyan-300"
                            >
                                {Object.values(DB_ENGINES).map((spec) => (
                                    <option key={spec.id} value={spec.id}>
                                        {spec.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Nombre</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder={`${DB_ENGINES[form.driver].shortLabel} Principal`}
                                className="w-full rounded-lg border border-orange-500/35 bg-neutral-950 px-3 py-2 text-sm text-slate-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Host / Ruta</label>
                            <input
                                type="text"
                                required
                                value={form.host}
                                onChange={(e) => setForm({ ...form, host: e.target.value })}
                                className="w-full rounded-lg border border-orange-500/35 bg-neutral-950 px-3 py-2 text-sm text-slate-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Puerto</label>
                            <input
                                type="number"
                                min={0}
                                max={65535}
                                required
                                value={form.port}
                                onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                                className="w-full rounded-lg border border-orange-500/35 bg-neutral-950 px-3 py-2 text-sm text-slate-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Usuario</label>
                            <input
                                type="text"
                                required
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                className="w-full rounded-lg border border-orange-500/35 bg-neutral-950 px-3 py-2 text-sm text-slate-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-orange-300">Nodo Vinculado</label>
                            <select
                                value={form.node_id}
                                onChange={(e) => setForm({ ...form, node_id: e.target.value })}
                                className="w-full rounded-lg border border-orange-500/35 bg-neutral-950 px-3 py-2 text-sm text-slate-100"
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
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500/90 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
                            >
                                <Plus className="h-4 w-4" /> Añadir Host
                            </button>
                        </div>
                    </form>

                    {/* Tabla de Database Hosts */}
                    <div className="rounded-xl border border-orange-500/30 bg-neutral-950/90 p-5">
                        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-orange-400">
                            <DatabaseIcon className="h-4 w-4" /> Hosts Configurados ({filteredHosts.length})
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-orange-500/25 text-xs uppercase text-orange-300">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3">Motor</th>
                                        <th className="px-4 py-3">Endpoint</th>
                                        <th className="px-4 py-3">Usuario</th>
                                        <th className="px-4 py-3">Nodo</th>
                                        <th className="px-4 py-3">Máx DBs</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800/80">
                                    {filteredHosts.map((h) => {
                                        const drv = normalizeDriver(h.driver, h.port);
                                        const spec = DB_ENGINES[drv];
                                        return (
                                            <tr
                                                key={h.id}
                                                onClick={() =>
                                                    openDatabaseManager({
                                                        title: h.name,
                                                        subtitle: `Database Host #${h.id} (${h.node_name})`,
                                                        driver: drv,
                                                        endpoint: h.port ? `${h.host}:${h.port}` : h.host,
                                                        username: h.username,
                                                    })
                                                }
                                                className="cursor-pointer transition hover:bg-orange-500/10"
                                            >
                                                <td className="px-4 py-3 text-slate-400">#{h.id}</td>
                                                <td className="px-4 py-3 font-semibold text-slate-100">{h.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded border px-2.5 py-0.5 font-mono text-xs font-semibold ${spec.badgeClass}`}>
                                                        {spec.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-cyan-300">
                                                    {h.port ? `${h.host}:${h.port}` : h.host}
                                                </td>
                                                <td className="px-4 py-3 text-slate-300">{h.username}</td>
                                                <td className="px-4 py-3 text-slate-300">{h.node_name}</td>
                                                <td className="px-4 py-3 text-slate-300">{h.max_databases}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDatabaseManager({
                                                                    title: h.name,
                                                                    subtitle: `Database Host #${h.id} (${h.node_name})`,
                                                                    driver: drv,
                                                                    endpoint: h.port ? `${h.host}:${h.port}` : h.host,
                                                                    username: h.username,
                                                                });
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-500 hover:text-black"
                                                        >
                                                            <Terminal className="h-3.5 w-3.5" /> Abrir Gestor
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDelete(e, h.id)}
                                                            className="inline-flex items-center gap-1 rounded bg-red-600/20 px-3 py-1 text-xs text-red-400 hover:bg-red-600 hover:text-white"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bases de Datos por Servidor */}
                    <div className="rounded-xl border border-orange-500/30 bg-neutral-950/90 p-5">
                        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-orange-400">
                            <Server className="h-4 w-4" /> Bases de Datos de Servidores
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-orange-500/25 text-xs uppercase text-orange-300">
                                    <tr>
                                        <th className="px-4 py-3">Servidor</th>
                                        <th className="px-4 py-3">Base de Datos</th>
                                        <th className="px-4 py-3">Motor</th>
                                        <th className="px-4 py-3">Usuario</th>
                                        <th className="px-4 py-3">Host:Puerto</th>
                                        <th className="px-4 py-3">Nodo</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800/80">
                                    {servers.map((s) =>
                                        (s.databases && s.databases.length > 0
                                            ? s.databases
                                            : [{ id: 1, name: `s${s.id}_cinammon`, driver: 'mysql' as DbDriver, user: `u${s.id}_admin`, host: '127.0.0.1', port: 3306 }]
                                        )
                                            .filter((db) => {
                                                const drv = normalizeDriver(db.driver, db.port);
                                                return engineFilter === 'all' || drv === engineFilter;
                                            })
                                            .map((db) => {
                                                const drv = normalizeDriver(db.driver, db.port);
                                                const spec = DB_ENGINES[drv];
                                                return (
                                                    <tr
                                                        key={`${s.id}-${db.id}`}
                                                        onClick={() =>
                                                            openDatabaseManager({
                                                                title: db.name,
                                                                subtitle: `${s.name} · ${s.node_name}`,
                                                                driver: drv,
                                                                endpoint: db.port ? `${db.host}:${db.port}` : db.host,
                                                                username: db.user,
                                                                serverId: s.id,
                                                            })
                                                        }
                                                        className="cursor-pointer transition hover:bg-orange-500/10"
                                                    >
                                                        <td className="px-4 py-3 font-semibold text-slate-100">{s.name}</td>
                                                        <td className="px-4 py-3 font-mono font-semibold text-cyan-300">{db.name}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`rounded border px-2.5 py-0.5 font-mono text-xs font-semibold ${spec.badgeClass}`}>
                                                                {spec.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-slate-300">{db.user}</td>
                                                        <td className="px-4 py-3 font-mono text-xs text-emerald-300">
                                                            {db.port ? `${db.host}:${db.port}` : db.host}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-300">{s.node_name}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.visit(`/servers/${s.id}/edit?tab=databases`);
                                                                }}
                                                                className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-500 hover:text-black"
                                                            >
                                                                <Server className="h-3.5 w-3.5" /> Gestionar en Servidor
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            }),
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
    driver,
    spec,
    sqlQuery,
    setSqlQuery,
    sqlLoading,
    sqlError,
    sqlResult,
    runSqlQuery,
    tables,
}: {
    driver: DbDriver;
    spec: DatabaseEngineSpec;
    sqlQuery: string;
    setSqlQuery: (q: string) => void;
    sqlLoading: boolean;
    sqlError: string | null;
    sqlResult: SqlQueryResult | null;
    runSqlQuery: (customQuery?: string, e?: FormEvent) => Promise<void>;
    tables: DbTableInfo[];
}) {
    const presetQueries =
        driver === 'mongodb'
            ? [
                  { label: 'show collections', sql: 'show collections' },
                  { label: 'db.users.find()', sql: 'db.users.find({}).limit(25)' },
                  { label: 'db.servers.find()', sql: 'db.servers.find({}).limit(25)' },
                  { label: 'db.nodes.find()', sql: 'db.nodes.find({}).limit(25)' },
                  { label: 'countDocuments()', sql: 'db.users.countDocuments()' },
              ]
            : driver === 'redis'
              ? [
                    { label: 'PING', sql: 'PING' },
                    { label: 'INFO', sql: 'INFO' },
                    { label: 'KEYS *', sql: 'KEYS *' },
                    { label: 'HGETALL server:1', sql: 'HGETALL server:1' },
                    { label: 'HGETALL user:1', sql: 'HGETALL user:1' },
                ]
              : driver === 'pgsql'
                ? [
                      { label: 'Listar Tablas (pg_tables)', sql: 'SELECT schemaname, tablename, tableowner FROM pg_catalog.pg_tables;' },
                      { label: 'Usuarios', sql: 'SELECT id, name, email, created_at FROM "users" LIMIT 25;' },
                      { label: 'Servidores', sql: 'SELECT id, name, uuid, memory, disk, cpu FROM "servers" LIMIT 25;' },
                      { label: 'Nodos', sql: 'SELECT id, name, fqdn, scheme, daemon_listen FROM "nodes" LIMIT 25;' },
                      { label: '\\d servers', sql: '\\d servers' },
                  ]
                : driver === 'mysql' || driver === 'mariadb'
                  ? [
                        { label: 'SHOW TABLES', sql: 'SHOW TABLES;' },
                        { label: 'DESCRIBE users', sql: 'DESCRIBE users;' },
                        { label: 'Usuarios', sql: 'SELECT id, name, email, created_at FROM "users" LIMIT 25;' },
                        { label: 'Servidores', sql: 'SELECT id, name, uuid, memory, disk, cpu FROM "servers" LIMIT 25;' },
                        { label: 'Webhooks', sql: 'SELECT id, name, url, format, enabled, last_status_code FROM "webhooks" LIMIT 25;' },
                    ]
                  : [
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
                    <span className="mr-1 text-xs text-orange-300">Atajos {spec.shortLabel}:</span>
                    {presetQueries.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                                setSqlQuery(preset.sql);
                                void runSqlQuery(preset.sql);
                            }}
                            className="rounded border border-orange-500/35 bg-orange-500/10 px-2.5 py-1 font-mono text-xs text-orange-300 hover:bg-orange-500 hover:text-black"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                {tables.length > 0 && (
                    <select
                        aria-label="Seleccionar entidad para consulta"
                        defaultValue=""
                        onChange={(e) => {
                            if (e.target.value) {
                                const q = getDefaultQueryForDriver(driver, e.target.value);
                                setSqlQuery(q);
                                void runSqlQuery(q);
                            }
                        }}
                        className="rounded-lg border border-orange-500/35 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-cyan-300 outline-none focus:border-orange-400"
                    >
                        <option value="" disabled>
                            Consultar {spec.entitySingular.toLowerCase()}…
                        </option>
                        {tables.map((t) => (
                            <option key={t.name} value={t.name}>
                                {t.name} ({t.count})
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
                    placeholder={getDefaultQueryForDriver(driver, 'users')}
                    className="w-full rounded-lg border border-orange-500/35 bg-neutral-900/90 p-3.5 font-mono text-sm text-cyan-200 outline-none focus:border-orange-400"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">
                        Motor conectado a <strong className="text-orange-300">{spec.label}</strong> ({spec.scheme}). Los campos sensibles se enmascaran automáticamente.
                    </p>
                    <button type="submit" disabled={sqlLoading || !sqlQuery.trim()} className={primary}>
                        <Play size={15} /> {sqlLoading ? 'Ejecutando…' : `Ejecutar en ${spec.shortLabel}`}
                    </button>
                </div>
            </form>

            {sqlError && (
                <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 font-mono text-xs text-red-300">
                    Error: {sqlError}
                </div>
            )}

            {sqlResult && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                            Resultado: <strong className="text-cyan-300">{sqlResult.row_count}</strong> registros devueltos
                        </span>
                        <span className="font-mono text-emerald-300">Tiempo: {sqlResult.execution_time_ms} ms</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-orange-500/25">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-orange-500/25 bg-neutral-900/70 text-xs uppercase text-orange-300">
                                <tr>
                                    {sqlResult.columns.map((col) => (
                                        <th key={col} className="whitespace-nowrap px-4 py-2.5 font-mono text-orange-300">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/80">
                                {sqlResult.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={Math.max(1, sqlResult.columns.length)} className="p-8 text-center text-slate-400">
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
                                                        className="max-w-[260px] truncate whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-200"
                                                        title={text}
                                                    >
                                                        {val === null || val === undefined ? (
                                                            <span className="italic text-slate-500">NULL</span>
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
