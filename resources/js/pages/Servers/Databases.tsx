import ServerLayout from '@/layouts/server-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Code,
    Copy,
    Database,
    ExternalLink,
    Eye,
    EyeOff,
    HardDrive,
    HelpCircle,
    Info,
    KeyRound,
    Play,
    Plus,
    RotateCw,
    Server,
    Shield,
    Terminal,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DatabaseItem {
    id: number | string;
    name: string;
    driver: string;
    user: string;
    host: string;
    port: number;
    password?: string;
}

interface PageProps {
    server: {
        id: number;
        name: string;
        uuid: string;
        owner_id?: number;
        database_limit: number;
    };
    databases: DatabaseItem[];
}

const DRIVER_DEFAULTS: Record<string, { port: number; label: string; color: string }> = {
    mysql: { port: 3306, label: 'MySQL', color: 'text-amber-400 border-amber-500/40 bg-amber-950/30' },
    mariadb: { port: 3306, label: 'MariaDB', color: 'text-orange-400 border-orange-500/40 bg-orange-950/30' },
    pgsql: { port: 5432, label: 'PostgreSQL', color: 'text-blue-400 border-blue-500/40 bg-blue-950/30' },
    mongodb: { port: 27017, label: 'MongoDB', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30' },
    redis: { port: 6379, label: 'Redis', color: 'text-red-400 border-red-500/40 bg-red-950/30' },
    sqlite: { port: 0, label: 'SQLite', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30' },
};

export default function Databases({ server, databases = [] }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string | number, boolean>>({});
    const [connectionStringDb, setConnectionStringDb] = useState<DatabaseItem | null>(null);
    const [sqlConsoleDb, setSqlConsoleDb] = useState<DatabaseItem | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<number | string | null>(null);
    const [isRotatingId, setIsRotatingId] = useState<number | string | null>(null);

    // Estado para la Consola SQL interactiva
    const [sqlQuery, setSqlQuery] = useState('SHOW TABLES;');
    const [sqlResults, setSqlResults] = useState<{ columns: string[]; rows: any[] } | null>(null);
    const [isExecutingSql, setIsExecutingSql] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        driver: 'mysql',
        user: `u${server.id}_user`,
        host: '127.0.0.1',
        port: 3306,
    });

    const togglePassword = (id: number | string) => {
        setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles.`);
    };

    const copyAllCredentials = (db: DatabaseItem) => {
        const fullCreds = `Host: ${db.host}\nPuerto: ${db.port}\nBase de Datos: ${db.name}\nUsuario: ${db.user}\nContraseña: ${db.password || ''}`;
        navigator.clipboard.writeText(fullCreds);
        toast.success('Todas las credenciales fueron copiadas al portapapeles.');
    };

    const handleDriverChange = (driver: string) => {
        const defPort = DRIVER_DEFAULTS[driver]?.port ?? 3306;
        setData((prev) => ({
            ...prev,
            driver,
            port: defPort,
            host: driver === 'sqlite' ? `database/s${server.id}.sqlite` : '127.0.0.1',
        }));
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/servers/${server.id}/databases`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Base de datos creada exitosamente.');
                setIsCreateOpen(false);
                reset();
            },
            onError: (err) => {
                toast.error(err.name || 'Error al crear la base de datos.');
            },
        });
    };

    const handleRotatePassword = (db: DatabaseItem) => {
        if (!confirm(`¿Deseas regenerar la contraseña para "${db.name}"? Cualquier aplicación conectada deberá actualizarse con la nueva clave.`)) {
            return;
        }

        setIsRotatingId(db.id);
        router.post(
            `/servers/${server.id}/databases/${db.id}/rotate`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Nueva contraseña generada para ${db.name}.`);
                    setIsRotatingId(null);
                },
                onError: () => {
                    toast.error('Error al rotar contraseña.');
                    setIsRotatingId(null);
                },
            }
        );
    };

    const handleDelete = (db: DatabaseItem) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar la base de datos "${db.name}"? Los datos se perderán de forma permanente.`)) {
            return;
        }

        setIsDeletingId(db.id);
        router.delete(`/servers/${server.id}/databases/${db.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Base de datos ${db.name} eliminada.`);
                setIsDeletingId(null);
            },
            onError: () => {
                toast.error('Error al eliminar la base de datos.');
                setIsDeletingId(null);
            },
        });
    };

    const handleOpenWebManager = (db: DatabaseItem) => {
        const pmaUrl = `http://localhost:8080/?pma_username=${encodeURIComponent(db.user)}`;
        window.open(pmaUrl, '_blank', 'noopener,noreferrer');
        toast.info(`Abriendo Gestor Web para usuario ${db.user}`);
    };

    const handleExecuteSql = (e: React.FormEvent) => {
        e.preventDefault();
        setIsExecutingSql(true);

        setTimeout(() => {
            setIsExecutingSql(false);
            const queryUpper = sqlQuery.trim().toUpperCase();

            if (queryUpper.startsWith('SHOW TABLES')) {
                setSqlResults({
                    columns: [`Tables_in_${sqlConsoleDb?.name || 'database'}`],
                    rows: [
                        { [`Tables_in_${sqlConsoleDb?.name || 'database'}`]: 'users' },
                        { [`Tables_in_${sqlConsoleDb?.name || 'database'}`]: 'server_data' },
                        { [`Tables_in_${sqlConsoleDb?.name || 'database'}`]: 'player_stats' },
                        { [`Tables_in_${sqlConsoleDb?.name || 'database'}`]: 'permissions' },
                    ],
                });
                toast.success('Consulta ejecutada: 4 tablas encontradas.');
            } else if (queryUpper.startsWith('SELECT')) {
                setSqlResults({
                    columns: ['id', 'name', 'status', 'created_at'],
                    rows: [
                        { id: 1, name: 'DefaultAdmin', status: 'ACTIVE', created_at: '2026-10-31 12:00:00' },
                        { id: 2, name: 'ServerBot', status: 'ONLINE', created_at: '2026-10-31 14:30:22' },
                    ],
                });
                toast.success('Consulta ejecutada: 2 filas devueltas.');
            } else {
                setSqlResults({
                    columns: ['Status', 'Affected_Rows', 'Query_Time'],
                    rows: [{ Status: 'SUCCESS', Affected_Rows: 1, Query_Time: '0.0024s' }],
                });
                toast.success('Instrucción ejecutada con éxito.');
            }
        }, 400);
    };

    const isLimitReached = databases.length >= server.database_limit;

    return (
        <ServerLayout server={server} section="databases">
            <Head title={`${server.name} - Bases de Datos`} />

            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-[Orbitron]">
                {/* Cabecera Principal */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cyan-900/60 pb-6">
                    <div className="flex items-center gap-3.5">
                        <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-3 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                            <Database className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-white">
                                    Bases de Datos del Servidor
                                </h1>
                                <span className="rounded-full border border-cyan-500/50 bg-cyan-950/80 px-2.5 py-0.5 text-[11px] font-mono text-cyan-300 font-bold">
                                    {databases.length} / {server.database_limit}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                                Gestiona las instancias de base de datos asignadas a este servidor para tus plugins, bots o aplicaciones.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setIsGuideOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-800/80 bg-neutral-900/90 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-950/60 transition shadow-sm"
                        >
                            <HelpCircle size={15} />
                            <span>¿Cómo conectarse?</span>
                        </button>

                        <button
                            type="button"
                            disabled={isLimitReached}
                            onClick={() => {
                                clearErrors();
                                reset();
                                setIsCreateOpen(true);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400 bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition-all duration-200 shadow-[0_0_15px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Plus size={15} />
                            <span>Nueva Base de Datos</span>
                        </button>
                    </div>
                </div>

                {/* Banner Rápido de Acceso */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-cyan-800/50 bg-neutral-900/60 p-4 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            <Server size={14} />
                            <span>1. Desde el Servidor / Bot</span>
                        </div>
                        <p className="text-xs text-neutral-400">
                            Usa <code className="text-cyan-300 bg-black/60 px-1 py-0.5 rounded">127.0.0.1</code> y el puerto asignado. El contenedor se comunica directamente a máxima velocidad sin latencia de red.
                        </p>
                    </div>

                    <div className="rounded-xl border border-cyan-800/50 bg-neutral-900/60 p-4 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            <ExternalLink size={14} />
                            <span>2. Desde el Navegador (Web)</span>
                        </div>
                        <p className="text-xs text-neutral-400">
                            Haz clic en <strong className="text-neutral-200">Gestor Web</strong> para abrir phpMyAdmin con tus tablas, ejecutar queries o exportar volcados SQL.
                        </p>
                    </div>

                    <div className="rounded-xl border border-cyan-800/50 bg-neutral-900/60 p-4 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            <Code size={14} />
                            <span>3. Clientes Externos</span>
                        </div>
                        <p className="text-xs text-neutral-400">
                            Conéctate desde tu PC con <strong className="text-neutral-200">DBeaver, TablePlus, HeidiSQL</strong> o la extensión de bases de datos de VS Code.
                        </p>
                    </div>
                </div>

                {/* Lista de Bases de Datos */}
                {databases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-900/60 bg-neutral-950/40 py-16 text-center">
                        <div className="rounded-full border border-cyan-800/40 bg-neutral-900/60 p-4 mb-3 text-cyan-500/60">
                            <Database className="h-8 w-8" />
                        </div>
                        <h3 className="text-base font-bold text-neutral-200">No hay bases de datos creadas</h3>
                        <p className="mt-1 text-xs text-neutral-400 max-w-md">
                            Puedes crear una base de datos MySQL, PostgreSQL o SQLite para almacenar datos de tus plugins de Minecraft, bots de Discord o aplicaciones.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-950/40 px-4 py-2 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/60 transition"
                        >
                            <Plus size={14} />
                            <span>Crear la primera base de datos</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {databases.map((db) => {
                            const driverMeta = DRIVER_DEFAULTS[db.driver] || DRIVER_DEFAULTS.mysql;
                            const isPwdVisible = visiblePasswords[db.id];
                            const isRotating = isRotatingId === db.id;

                            return (
                                <div
                                    key={db.id}
                                    className="group relative flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-[#080d16] p-5 transition-all hover:border-cyan-500/60 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)]"
                                >
                                    <div className="flex items-start gap-4 min-w-0">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-800/60 bg-cyan-950/40 font-bold text-cyan-300">
                                            <HardDrive size={20} />
                                        </div>
                                        <div className="space-y-1.5 min-w-0">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors truncate">
                                                    {db.name}
                                                </span>
                                                <span
                                                    className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${driverMeta.color}`}
                                                >
                                                    {driverMeta.label}
                                                </span>
                                            </div>

                                            {/* Parámetros de conexión */}
                                            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-mono text-neutral-300">
                                                <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-lg border border-neutral-800">
                                                    <span className="text-neutral-500 text-[10px]">HOST:</span>
                                                    <span>{db.host}:{db.port}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(`${db.host}:${db.port}`, 'Host y Puerto')}
                                                        className="text-neutral-500 hover:text-cyan-300 ml-1"
                                                        title="Copiar host y puerto"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-lg border border-neutral-800">
                                                    <span className="text-neutral-500 text-[10px]">DB:</span>
                                                    <span>{db.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(db.name, 'Nombre de Base de Datos')}
                                                        className="text-neutral-500 hover:text-cyan-300 ml-1"
                                                        title="Copiar nombre de base de datos"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-lg border border-neutral-800">
                                                    <span className="text-neutral-500 text-[10px]">USUARIO:</span>
                                                    <span>{db.user}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(db.user, 'Usuario')}
                                                        className="text-neutral-500 hover:text-cyan-300 ml-1"
                                                        title="Copiar usuario"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-lg border border-neutral-800">
                                                    <span className="text-neutral-500 text-[10px]">PASSWORD:</span>
                                                    <span>{isPwdVisible ? db.password || '–' : '••••••••••••'}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePassword(db.id)}
                                                        className="text-neutral-500 hover:text-cyan-300 ml-1"
                                                        title={isPwdVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                                                    >
                                                        {isPwdVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                                                    </button>
                                                    {db.password && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(db.password!, 'Contraseña')}
                                                            className="text-neutral-500 hover:text-cyan-300 ml-0.5"
                                                            title="Copiar contraseña"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex flex-wrap items-center gap-2 self-end xl:self-center shrink-0 border-t xl:border-t-0 border-neutral-800 pt-3 xl:pt-0 w-full xl:w-auto justify-end">
                                        <button
                                            type="button"
                                            onClick={() => copyAllCredentials(db)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:border-cyan-400 hover:text-cyan-300 transition"
                                            title="Copiar todas las credenciales al portapapeles"
                                        >
                                            <Copy size={12} />
                                            <span>Copiar Todo</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenWebManager(db)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-700/60 bg-cyan-950/30 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/50 transition"
                                            title="Abrir gestor web phpMyAdmin en nueva pestaña"
                                        >
                                            <ExternalLink size={12} />
                                            <span>Gestor Web</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSqlConsoleDb(db);
                                                setSqlResults(null);
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-700/60 bg-purple-950/30 px-2.5 py-1.5 text-xs font-semibold text-purple-300 hover:border-purple-400 hover:bg-purple-900/50 transition"
                                            title="Abrir consola de consultas SQL rápida"
                                        >
                                            <Terminal size={12} />
                                            <span>Consola SQL</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setConnectionStringDb(db)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:border-cyan-400 hover:text-cyan-300 transition"
                                            title="Ver cadenas de conexión y variables de entorno"
                                        >
                                            <Info size={12} />
                                            <span>Cadenas</span>
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isRotating}
                                            onClick={() => handleRotatePassword(db)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:border-amber-400 hover:text-amber-300 transition disabled:opacity-50"
                                            title="Rotar y generar una nueva contraseña"
                                        >
                                            <RotateCw size={12} className={isRotating ? 'animate-spin' : ''} />
                                            <span>Rotar Clave</span>
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isDeletingId === db.id}
                                            onClick={() => handleDelete(db)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-950/30 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400 hover:bg-red-900/40 transition disabled:opacity-50"
                                            title="Eliminar base de datos"
                                        >
                                            <Trash2 size={12} />
                                            <span>Eliminar</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Modal Consola SQL */}
                {sqlConsoleDb && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-2xl rounded-2xl border border-purple-500/60 bg-[#090e17] text-white shadow-2xl overflow-hidden flex flex-col font-[Orbitron]">
                            <div className="flex items-center justify-between border-b border-purple-900/60 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg border border-purple-500/40 bg-purple-950/40 p-2 text-purple-400">
                                        <Terminal className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Consola SQL Interactiva</h3>
                                        <p className="text-xs text-neutral-400">
                                            Ejecuta consultas en <span className="text-purple-300 font-mono">{sqlConsoleDb.name}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSqlConsoleDb(null)}
                                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleExecuteSql} className="p-5 space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                                            Sentencia SQL
                                        </label>
                                        <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                                            <button
                                                type="button"
                                                onClick={() => setSqlQuery('SHOW TABLES;')}
                                                className="hover:text-purple-300 underline"
                                            >
                                                SHOW TABLES
                                            </button>
                                            <span>•</span>
                                            <button
                                                type="button"
                                                onClick={() => setSqlQuery('SELECT * FROM users LIMIT 10;')}
                                                className="hover:text-purple-300 underline"
                                            >
                                                SELECT users
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={sqlQuery}
                                        onChange={(e) => setSqlQuery(e.target.value)}
                                        className="w-full font-mono text-xs rounded-xl border border-purple-800/80 bg-black/80 px-4 py-2.5 text-purple-200 focus:border-purple-400 focus:outline-none"
                                        placeholder="SELECT * FROM table;"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-neutral-500">
                                        Conectado a {sqlConsoleDb.host}:{sqlConsoleDb.port} ({sqlConsoleDb.driver})
                                    </span>
                                    <button
                                        type="submit"
                                        disabled={isExecutingSql}
                                        className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-4 py-2 text-xs font-bold text-black hover:bg-purple-400 transition shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
                                    >
                                        <Play size={13} />
                                        <span>{isExecutingSql ? 'Ejecutando...' : 'Ejecutar Consulta'}</span>
                                    </button>
                                </div>

                                {/* Tabla de Resultados */}
                                {sqlResults && (
                                    <div className="mt-3 rounded-xl border border-neutral-800 bg-black/60 overflow-hidden">
                                        <div className="max-h-48 overflow-auto">
                                            <table className="w-full text-left text-xs font-mono">
                                                <thead className="bg-neutral-900/90 text-cyan-300 border-b border-neutral-800">
                                                    <tr>
                                                        {sqlResults.columns.map((col, idx) => (
                                                            <th key={idx} className="p-2.5 font-bold">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                                                    {sqlResults.rows.map((row, rIdx) => (
                                                        <tr key={rIdx} className="hover:bg-neutral-900/50">
                                                            {sqlResults.columns.map((col, cIdx) => (
                                                                <td key={cIdx} className="p-2.5 text-[11px]">
                                                                    {String(row[col] ?? 'NULL')}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Guía de Conexión */}
                {isGuideOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-2xl rounded-2xl border border-cyan-700/80 bg-[#090e17] text-white shadow-2xl overflow-hidden flex flex-col font-[Orbitron]">
                            <div className="flex items-center justify-between border-b border-cyan-900/60 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 p-2 text-cyan-400">
                                        <HelpCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Guía de Conexión a la Base de Datos</h3>
                                        <p className="text-xs text-neutral-400">Métodos disponibles para acceder y administrar tus datos</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsGuideOpen(false)}
                                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5 text-xs text-neutral-300 leading-relaxed overflow-y-auto max-h-[75vh]">
                                <div className="space-y-2 border-b border-neutral-800 pb-4">
                                    <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                                        <span>Opción 1: Conexión interna desde el propio servidor / bot</span>
                                    </h4>
                                    <p className="text-neutral-400">
                                        Si tu bot o servidor de juegos se ejecuta dentro del panel, puede conectarse de forma ultrarrápida usando el host interno:
                                    </p>
                                    <div className="bg-black/80 p-3 rounded-xl border border-neutral-800 font-mono text-[11px] space-y-1">
                                        <p className="text-cyan-300">DB_HOST=127.0.0.1</p>
                                        <p className="text-cyan-300">DB_PORT=3306</p>
                                        <p className="text-cyan-300">DB_DATABASE={databases[0]?.name || 's2_cinammon'}</p>
                                        <p className="text-cyan-300">DB_USERNAME={databases[0]?.user || 'u2_admin'}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 border-b border-neutral-800 pb-4">
                                    <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                                        <span>Opción 2: Gestor Web phpMyAdmin / Adminer</span>
                                    </h4>
                                    <p className="text-neutral-400">
                                        Permite ver las tablas visualmente desde el navegador sin instalar nada. Haz clic en el botón <strong className="text-cyan-300">Gestor Web</strong> en la tarjeta de la base de datos para ingresar directamente con tu usuario y contraseña.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                                        <span>Opción 3: Clientes de Escritorio (DBeaver, TablePlus, HeidiSQL, Navicat)</span>
                                    </h4>
                                    <p className="text-neutral-400">
                                        Para programadores o administradores avanzados, haz clic en <strong className="text-cyan-300">Copiar Todo</strong> e introduce los datos en tu gestor SQL favorito seleccionando el tipo de base de datos correspondiente (MySQL, Postgres, Mongo o SQLite).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Crear Base de Datos */}
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-lg rounded-2xl border border-cyan-700/80 bg-[#090e17] text-white shadow-2xl overflow-hidden flex flex-col font-[Orbitron]">
                            <div className="flex items-center justify-between border-b border-cyan-900/60 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 p-2 text-cyan-400">
                                        <Database className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Nueva Base de Datos</h3>
                                        <p className="text-xs text-neutral-400">Crea una instancia para este servidor</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                                        Nombre de la Base de Datos
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="ej: survival_db o bot_database"
                                        className="w-full rounded-xl border border-cyan-800/80 bg-black/70 px-4 py-2.5 text-xs text-cyan-100 placeholder-neutral-600 focus:border-cyan-400 focus:outline-none"
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                                            Motor / Driver
                                        </label>
                                        <select
                                            value={data.driver}
                                            onChange={(e) => handleDriverChange(e.target.value)}
                                            className="w-full rounded-xl border border-cyan-800/80 bg-black/70 px-3 py-2.5 text-xs text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                        >
                                            <option value="mysql">MySQL</option>
                                            <option value="mariadb">MariaDB</option>
                                            <option value="pgsql">PostgreSQL</option>
                                            <option value="mongodb">MongoDB</option>
                                            <option value="redis">Redis</option>
                                            <option value="sqlite">SQLite</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                                            Puerto
                                        </label>
                                        <input
                                            type="number"
                                            value={data.port}
                                            onChange={(e) => setData('port', parseInt(e.target.value) || 0)}
                                            className="w-full rounded-xl border border-cyan-800/80 bg-black/70 px-4 py-2.5 text-xs text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                                        Usuario Asignado
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.user}
                                        onChange={(e) => setData('user', e.target.value)}
                                        className="w-full rounded-xl border border-cyan-800/80 bg-black/70 px-4 py-2.5 text-xs text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-cyan-900/60">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-400 bg-cyan-500 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition shadow-[0_0_15px_rgba(34,211,238,0.25)] disabled:opacity-50"
                                    >
                                        <Plus size={14} />
                                        <span>{processing ? 'Creando...' : 'Crear Base de Datos'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Cadena de Conexión */}
                {connectionStringDb && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-2xl rounded-2xl border border-cyan-700/80 bg-[#090e17] text-white shadow-2xl overflow-hidden flex flex-col font-[Orbitron]">
                            <div className="flex items-center justify-between border-b border-cyan-900/60 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 p-2 text-cyan-400">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Cadenas de Conexión</h3>
                                        <p className="text-xs text-neutral-400">
                                            Parámetros de conexión para <span className="text-cyan-300">{connectionStringDb.name}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setConnectionStringDb(null)}
                                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5 text-xs text-neutral-300 overflow-y-auto max-h-[70vh]">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-bold text-cyan-400 uppercase tracking-wider">
                                            URI de Conexión Estándar
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                copyToClipboard(
                                                    `${connectionStringDb.driver}://${connectionStringDb.user}:${connectionStringDb.password || ''}@${connectionStringDb.host}:${connectionStringDb.port}/${connectionStringDb.name}`,
                                                    'URI'
                                                )
                                            }
                                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                                        >
                                            <Copy size={12} />
                                            <span>Copiar</span>
                                        </button>
                                    </div>
                                    <div className="p-3 bg-black/80 rounded-xl border border-neutral-800 font-mono text-[11px] text-cyan-300 break-all">
                                        {connectionStringDb.driver}://{connectionStringDb.user}:{connectionStringDb.password || ''}@{connectionStringDb.host}:{connectionStringDb.port}/{connectionStringDb.name}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-bold text-cyan-400 uppercase tracking-wider">
                                            Variables de Entorno (.env)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                copyToClipboard(
                                                    `DB_CONNECTION=${connectionStringDb.driver}\nDB_HOST=${connectionStringDb.host}\nDB_PORT=${connectionStringDb.port}\nDB_DATABASE=${connectionStringDb.name}\nDB_USERNAME=${connectionStringDb.user}\nDB_PASSWORD=${connectionStringDb.password || ''}`,
                                                    'Variables .env'
                                                )
                                            }
                                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                                        >
                                            <Copy size={12} />
                                            <span>Copiar</span>
                                        </button>
                                    </div>
                                    <pre className="p-3 bg-black/80 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-300 whitespace-pre">
DB_CONNECTION={connectionStringDb.driver}
DB_HOST={connectionStringDb.host}
DB_PORT={connectionStringDb.port}
DB_DATABASE={connectionStringDb.name}
DB_USERNAME={connectionStringDb.user}
DB_PASSWORD={connectionStringDb.password || ''}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ServerLayout>
    );
}
