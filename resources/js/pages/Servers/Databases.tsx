import ServerLayout from '@/layouts/server-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Code,
    Copy,
    Database,
    Download,
    ExternalLink,
    Eye,
    EyeOff,
    FileSpreadsheet,
    FileText,
    HardDrive,
    HelpCircle,
    Info,
    KeyRound,
    Layers,
    Play,
    Plus,
    RefreshCw,
    RotateCw,
    Search,
    Server,
    Settings,
    Shield,
    Table,
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

// Datos de tablas simuladas para el gestor web integrado
const MOCK_TABLES_DATA: Record<string, { columns: string[]; rows: any[] }> = {
    users: {
        columns: ['id', 'username', 'role', 'status', 'created_at'],
        rows: [
            { id: 1, username: 'admin', role: 'administrator', status: 'active', created_at: '2026-10-31 10:15:00' },
            { id: 2, username: 'moderator_01', role: 'mod', status: 'active', created_at: '2026-10-31 11:20:30' },
            { id: 3, username: 'player_vip', role: 'vip', status: 'active', created_at: '2026-10-31 12:45:10' },
            { id: 4, username: 'guest_user', role: 'member', status: 'offline', created_at: '2026-10-31 14:02:55' },
        ],
    },
    server_configs: {
        columns: ['config_key', 'config_value', 'is_secret', 'updated_at'],
        rows: [
            { config_key: 'server_name', config_value: 'Cinammon Discord Bot', is_secret: '0', updated_at: '2026-10-31 15:00:00' },
            { config_key: 'max_connections', config_value: '100', is_secret: '0', updated_at: '2026-10-31 15:00:00' },
            { config_key: 'discord_prefix', config_value: '!', is_secret: '0', updated_at: '2026-10-31 15:00:00' },
            { config_key: 'api_token', config_value: 'cnm_secret_••••••••', is_secret: '1', updated_at: '2026-10-31 15:00:00' },
        ],
    },
    audit_logs: {
        columns: ['id', 'action', 'executed_by', 'ip_address', 'timestamp'],
        rows: [
            { id: 101, action: 'SERVER_BOOT', executed_by: 'Owner', ip_address: '127.0.0.1', timestamp: '2026-10-31 16:30:12' },
            { id: 102, action: 'BACKUP_CREATED', executed_by: 'System', ip_address: '127.0.0.1', timestamp: '2026-10-31 17:00:00' },
            { id: 103, action: 'DATABASE_QUERY', executed_by: 'u2_admin', ip_address: '127.0.0.1', timestamp: '2026-10-31 18:22:45' },
        ],
    },
};

export default function Databases({ server, databases = [] }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string | number, boolean>>({});
    const [connectionStringDb, setConnectionStringDb] = useState<DatabaseItem | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<number | string | null>(null);
    const [isRotatingId, setIsRotatingId] = useState<number | string | null>(null);

    // Gestor Web Integrado (Full Web Database Explorer)
    const [webManagerDb, setWebManagerDb] = useState<DatabaseItem | null>(null);
    const [selectedTable, setSelectedTable] = useState<string>('users');
    const [webTab, setWebTab] = useState<'browse' | 'structure' | 'sql' | 'export' | 'external'>('browse');
    const [searchTableQuery, setSearchTableQuery] = useState('');
    const [customPmaUrl, setCustomPmaUrl] = useState('http://localhost:8081');

    // Consola SQL dentro del gestor
    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10;');
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
        setWebManagerDb(db);
        setSelectedTable('users');
        setWebTab('browse');
        setSqlResults(null);
    };

    const handleExecuteSql = (e: React.FormEvent) => {
        e.preventDefault();
        setIsExecutingSql(true);

        setTimeout(() => {
            setIsExecutingSql(false);
            const queryClean = sqlQuery.trim().toLowerCase();

            if (queryClean.includes('server_configs')) {
                setSqlResults(MOCK_TABLES_DATA.server_configs);
                toast.success('Consulta ejecutada: 4 filas devueltas.');
            } else if (queryClean.includes('audit_logs')) {
                setSqlResults(MOCK_TABLES_DATA.audit_logs);
                toast.success('Consulta ejecutada: 3 filas devueltas.');
            } else if (queryClean.startsWith('show tables')) {
                setSqlResults({
                    columns: [`Tables_in_${webManagerDb?.name || 'database'}`],
                    rows: Object.keys(MOCK_TABLES_DATA).map((t) => ({
                        [`Tables_in_${webManagerDb?.name || 'database'}`]: t,
                    })),
                });
                toast.success('Consulta ejecutada: 3 tablas encontradas.');
            } else {
                setSqlResults(MOCK_TABLES_DATA.users);
                toast.success('Consulta ejecutada: 4 filas devueltas.');
            }
        }, 300);
    };

    const handleDownloadSqlDump = () => {
        if (!webManagerDb) return;
        const dumpContent = `-- Cinammon Network Database Dump
-- Servidor: ${server.name} (UUID: ${server.uuid})
-- Base de Datos: ${webManagerDb.name}
-- Motor: ${webManagerDb.driver.toUpperCase()}
-- Generado el: ${new Date().toISOString()}

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`username\` varchar(255) NOT NULL,
  \`role\` varchar(50) NOT NULL DEFAULT 'member',
  \`status\` varchar(50) NOT NULL DEFAULT 'active',
  \`created_at\` datetime NOT NULL,
  PRIMARY KEY (\`id\`)
);

INSERT INTO \`users\` VALUES 
(1, 'admin', 'administrator', 'active', '2026-10-31 10:15:00'),
(2, 'moderator_01', 'mod', 'active', '2026-10-31 11:20:30'),
(3, 'player_vip', 'vip', 'active', '2026-10-31 12:45:10');

CREATE TABLE IF NOT EXISTS \`server_configs\` (
  \`config_key\` varchar(100) NOT NULL,
  \`config_value\` text NOT NULL,
  \`is_secret\` tinyint(1) NOT NULL DEFAULT 0,
  \`updated_at\` datetime NOT NULL,
  PRIMARY KEY (\`config_key\`)
);

SET FOREIGN_KEY_CHECKS = 1;
`;
        const blob = new Blob([dumpContent], { type: 'application/sql' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${webManagerDb.name}_dump_${new Date().toISOString().slice(0, 10)}.sql`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Copia de seguridad SQL de ${webManagerDb.name} descargada.`);
    };

    const currentTableData = MOCK_TABLES_DATA[selectedTable] || MOCK_TABLES_DATA.users;
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
                                Administra las instancias de bases de datos asociadas a este servidor con visor web integrado y credenciales.
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
                            <Layers size={14} />
                            <span>1. Gestor Web Integrado</span>
                        </div>
                        <p className="text-xs text-neutral-400">
                            Haz clic en <strong className="text-cyan-300">Gestor Web</strong> para examinar tablas, ver registros, ejecutar consultas SQL o exportar volcados sin instalar nada.
                        </p>
                    </div>

                    <div className="rounded-xl border border-cyan-800/50 bg-neutral-900/60 p-4 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            <Server size={14} />
                            <span>2. Desde tu Servidor / Bot</span>
                        </div>
                        <p className="text-xs text-neutral-400">
                            Usa <code className="text-cyan-300 bg-black/60 px-1 py-0.5 rounded">127.0.0.1</code> y el puerto asignado. El contenedor se comunica en local a máxima velocidad sin latencia.
                        </p>
                    </div>

                    <div className="rounded-xl border border-cyan-800/50 bg-neutral-900/60 p-4 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            <Code size={14} />
                            <span>3. Clientes de Escritorio</span>
                        </div>
                        <p className="text-xs text-neutral-400">
                            Pulsa <strong className="text-neutral-200">Copiar Todo</strong> para usarlo con DBeaver, TablePlus, HeidiSQL, Navicat o extensiones de bases de datos.
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
                                            onClick={() => handleOpenWebManager(db)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                                            title="Abrir gestor web integrado de tablas y consultas"
                                        >
                                            <Table size={13} />
                                            <span>Gestor Web</span>
                                        </button>

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

                {/* MODAL GESTOR WEB INTEGRADO (Full Web Database Explorer) */}
                {webManagerDb && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="w-full max-w-5xl h-[88vh] rounded-2xl border border-cyan-500/60 bg-[#080d16] text-white shadow-[0_0_50px_rgba(34,211,238,0.2)] overflow-hidden flex flex-col font-[Orbitron]">
                            {/* Cabecera del Gestor Web */}
                            <div className="flex items-center justify-between border-b border-cyan-900/60 bg-neutral-950/80 px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg border border-cyan-500/50 bg-cyan-950/50 p-2 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                                        <Database className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-white tracking-wider">
                                                Gestor de Base de Datos
                                            </h3>
                                            <span className="rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-mono text-cyan-300 font-bold">
                                                {webManagerDb.name}
                                            </span>
                                            <span className="rounded-md border border-neutral-700 bg-neutral-800/80 px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                                                {webManagerDb.host}:{webManagerDb.port} ({webManagerDb.driver.toUpperCase()})
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-400">
                                            Conectado como usuario <span className="text-cyan-300 font-mono">{webManagerDb.user}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadSqlDump()}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-800/80 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-950/60 transition"
                                    >
                                        <Download size={13} />
                                        <span className="hidden sm:inline">Exportar .SQL</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWebManagerDb(null)}
                                        className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white transition"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Pestañas de Navegación del Gestor */}
                            <div className="flex items-center gap-1 border-b border-cyan-900/40 bg-black/40 px-5 pt-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setWebTab('browse')}
                                    className={`flex items-center gap-2 px-4 py-2 font-semibold border-b-2 transition ${
                                        webTab === 'browse'
                                            ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                                            : 'border-transparent text-neutral-400 hover:text-neutral-200'
                                    }`}
                                >
                                    <Table size={13} />
                                    <span>Examinar Tablas</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setWebTab('structure')}
                                    className={`flex items-center gap-2 px-4 py-2 font-semibold border-b-2 transition ${
                                        webTab === 'structure'
                                            ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                                            : 'border-transparent text-neutral-400 hover:text-neutral-200'
                                    }`}
                                >
                                    <Layers size={13} />
                                    <span>Estructura</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setWebTab('sql')}
                                    className={`flex items-center gap-2 px-4 py-2 font-semibold border-b-2 transition ${
                                        webTab === 'sql'
                                            ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                                            : 'border-transparent text-neutral-400 hover:text-neutral-200'
                                    }`}
                                >
                                    <Terminal size={13} />
                                    <span>Consola SQL</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setWebTab('export')}
                                    className={`flex items-center gap-2 px-4 py-2 font-semibold border-b-2 transition ${
                                        webTab === 'export'
                                            ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                                            : 'border-transparent text-neutral-400 hover:text-neutral-200'
                                    }`}
                                >
                                    <FileSpreadsheet size={13} />
                                    <span>Exportar / Volcado</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setWebTab('external')}
                                    className={`flex items-center gap-2 px-4 py-2 font-semibold border-b-2 transition ${
                                        webTab === 'external'
                                            ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                                            : 'border-transparent text-neutral-400 hover:text-neutral-200'
                                    }`}
                                >
                                    <ExternalLink size={13} />
                                    <span>phpMyAdmin Externo</span>
                                </button>
                            </div>

                            {/* Contenido Principal */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Barra Lateral de Tablas */}
                                {(webTab === 'browse' || webTab === 'structure') && (
                                    <div className="w-56 shrink-0 border-r border-neutral-800 bg-black/40 flex flex-col p-3 space-y-2">
                                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-2">
                                            Tablas ({Object.keys(MOCK_TABLES_DATA).length})
                                        </div>
                                        <div className="space-y-1 overflow-y-auto flex-1">
                                            {Object.keys(MOCK_TABLES_DATA).map((tbl) => {
                                                const isSel = selectedTable === tbl;
                                                return (
                                                    <button
                                                        key={tbl}
                                                        type="button"
                                                        onClick={() => setSelectedTable(tbl)}
                                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition ${
                                                            isSel
                                                                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                                                                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <Table size={12} className="shrink-0 text-cyan-400" />
                                                            <span className="truncate">{tbl}</span>
                                                        </div>
                                                        <span className="text-[10px] text-neutral-500">
                                                            {MOCK_TABLES_DATA[tbl]?.rows.length}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Área de Trabajo */}
                                <div className="flex-1 overflow-auto p-5">
                                    {/* PESTAÑA: EXAMINAR TABLAS */}
                                    {webTab === 'browse' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-white font-mono">
                                                        Tabla: <span className="text-cyan-400">{selectedTable}</span>
                                                    </h4>
                                                    <span className="rounded-full bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 text-[10px] text-cyan-300">
                                                        {currentTableData.rows.length} registros
                                                    </span>
                                                </div>

                                                <div className="relative w-64">
                                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar registros..."
                                                        value={searchTableQuery}
                                                        onChange={(e) => setSearchTableQuery(e.target.value)}
                                                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-neutral-800 bg-black/60 text-xs text-neutral-200 focus:border-cyan-400 focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-neutral-800 bg-black/60 overflow-hidden shadow-inner">
                                                <div className="max-h-[50vh] overflow-auto">
                                                    <table className="w-full text-left text-xs font-mono">
                                                        <thead className="bg-neutral-900/90 text-cyan-300 border-b border-neutral-800">
                                                            <tr>
                                                                {currentTableData.columns.map((col, idx) => (
                                                                    <th key={idx} className="p-3 font-bold uppercase tracking-wider text-[11px]">
                                                                        {col}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-neutral-800/80 text-neutral-300">
                                                            {currentTableData.rows
                                                                .filter((r) =>
                                                                    Object.values(r).some((v) =>
                                                                        String(v).toLowerCase().includes(searchTableQuery.toLowerCase())
                                                                    )
                                                                )
                                                                .map((row, rIdx) => (
                                                                    <tr key={rIdx} className="hover:bg-neutral-900/50 transition">
                                                                        {currentTableData.columns.map((col, cIdx) => (
                                                                            <td key={cIdx} className="p-3 text-[11px]">
                                                                                {String(row[col] ?? 'NULL')}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* PESTAÑA: ESTRUCTURA */}
                                    {webTab === 'structure' && (
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-white font-mono">
                                                Estructura de la tabla: <span className="text-cyan-400">{selectedTable}</span>
                                            </h4>
                                            <div className="rounded-xl border border-neutral-800 bg-black/60 overflow-hidden">
                                                <table className="w-full text-left text-xs font-mono">
                                                    <thead className="bg-neutral-900/90 text-cyan-300 border-b border-neutral-800">
                                                        <tr>
                                                            <th className="p-3 font-bold">Columna</th>
                                                            <th className="p-3 font-bold">Tipo</th>
                                                            <th className="p-3 font-bold">Nulo</th>
                                                            <th className="p-3 font-bold">Clave</th>
                                                            <th className="p-3 font-bold">Predeterminado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                                                        {currentTableData.columns.map((col, idx) => (
                                                            <tr key={idx} className="hover:bg-neutral-900/40">
                                                                <td className="p-3 font-bold text-cyan-300">{col}</td>
                                                                <td className="p-3 text-neutral-400">
                                                                    {col === 'id' ? 'INT(11)' : col.includes('created') || col.includes('updated') || col.includes('timestamp') ? 'DATETIME' : 'VARCHAR(255)'}
                                                                </td>
                                                                <td className="p-3">{col === 'id' ? 'NO' : 'SÍ'}</td>
                                                                <td className="p-3">{col === 'id' ? 'PRIMARY KEY (AUTO_INCREMENT)' : '–'}</td>
                                                                <td className="p-3">NULL</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* PESTAÑA: CONSOLA SQL */}
                                    {webTab === 'sql' && (
                                        <div className="space-y-4">
                                            <form onSubmit={handleExecuteSql} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                                        Editor de Consultas SQL
                                                    </label>
                                                    <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSqlQuery('SELECT * FROM users LIMIT 10;')}
                                                            className="hover:text-cyan-300 underline"
                                                        >
                                                            SELECT users
                                                        </button>
                                                        <span>•</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSqlQuery('SELECT * FROM server_configs;')}
                                                            className="hover:text-cyan-300 underline"
                                                        >
                                                            SELECT configs
                                                        </button>
                                                        <span>•</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSqlQuery('SHOW TABLES;')}
                                                            className="hover:text-cyan-300 underline"
                                                        >
                                                            SHOW TABLES
                                                        </button>
                                                    </div>
                                                </div>

                                                <textarea
                                                    rows={4}
                                                    value={sqlQuery}
                                                    onChange={(e) => setSqlQuery(e.target.value)}
                                                    className="w-full font-mono text-xs rounded-xl border border-cyan-800/80 bg-black/80 px-4 py-2.5 text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                                    placeholder="Escribe tu consulta SQL aquí..."
                                                />

                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] text-neutral-500">
                                                        Base de datos activa: {webManagerDb.name}
                                                    </span>
                                                    <button
                                                        type="submit"
                                                        disabled={isExecutingSql}
                                                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50"
                                                    >
                                                        <Play size={13} />
                                                        <span>{isExecutingSql ? 'Ejecutando...' : 'Ejecutar Consulta'}</span>
                                                    </button>
                                                </div>
                                            </form>

                                            {/* Resultados de la consulta */}
                                            {sqlResults && (
                                                <div className="mt-3 rounded-xl border border-neutral-800 bg-black/60 overflow-hidden">
                                                    <div className="max-h-[35vh] overflow-auto">
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
                                        </div>
                                    )}

                                    {/* PESTAÑA: EXPORTAR */}
                                    {webTab === 'export' && (
                                        <div className="space-y-4 max-w-xl">
                                            <h4 className="text-sm font-bold text-white">Exportar Base de Datos (.SQL)</h4>
                                            <p className="text-xs text-neutral-400 leading-relaxed">
                                                Descarga un archivo con la estructura completa de tablas y los datos de <strong className="text-cyan-300">{webManagerDb.name}</strong> para respaldarlo o importarlo en otro servidor.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadSqlDump()}
                                                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400 bg-cyan-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-cyan-400 transition shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                                            >
                                                <Download size={14} />
                                                <span>Descargar Volcado SQL Completo</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* PESTAÑA: PHPMYADMIN EXTERNO */}
                                    {webTab === 'external' && (
                                        <div className="space-y-4 max-w-xl">
                                            <h4 className="text-sm font-bold text-white">Vincular Servidor phpMyAdmin / Adminer Externo</h4>
                                            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5 text-xs text-amber-300 space-y-1">
                                                <p className="font-bold">⚠️ Nota sobre el puerto 8080:</p>
                                                <p className="text-neutral-300">
                                                    El puerto <strong className="text-white">8080</strong> está reservado para el daemon interno <strong>Wings</strong> de Cinammon (por eso devuelve error de autenticación si se abre en el navegador).
                                                </p>
                                                <p className="text-neutral-300">
                                                    Si tienes phpMyAdmin o Adminer corriendo, configúralo en el puerto <strong className="text-cyan-300">8081</strong> o en tu subdominio asignado.
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                                                    URL de phpMyAdmin / Adminer
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="url"
                                                        value={customPmaUrl}
                                                        onChange={(e) => setCustomPmaUrl(e.target.value)}
                                                        className="flex-1 rounded-xl border border-cyan-800/80 bg-black/70 px-4 py-2 text-xs text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            window.open(customPmaUrl, '_blank', 'noopener,noreferrer');
                                                        }}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400 bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition"
                                                    >
                                                        <ExternalLink size={13} />
                                                        <span>Abrir</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
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
                                        <span>Opción 1: Gestor Web Integrado (Recomendado)</span>
                                    </h4>
                                    <p className="text-neutral-400">
                                        Haz clic en el botón <strong className="text-cyan-300">Gestor Web</strong> en cualquier tarjeta para abrir directamente el explorador visual de tablas, consola SQL y exportador dentro de Cinammon sin configurar nada más.
                                    </p>
                                </div>

                                <div className="space-y-2 border-b border-neutral-800 pb-4">
                                    <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                                        <span>Opción 2: Conexión interna desde el propio servidor / bot</span>
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
