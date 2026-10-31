import ServerLayout from '@/layouts/server-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Copy,
    Database,
    Eye,
    EyeOff,
    HardDrive,
    Info,
    KeyRound,
    Plus,
    Server,
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
    const [isDeletingId, setIsDeletingId] = useState<number | string | null>(null);

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
                                Gestiona las bases de datos asignadas a este servidor para tus plugins, mods o servicios.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={isLimitReached}
                        onClick={() => {
                            clearErrors();
                            reset();
                            setIsCreateOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400 bg-cyan-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-black hover:bg-cyan-400 transition-all duration-200 shadow-[0_0_15px_rgba(34,211,238,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Plus size={16} />
                        <span>Nueva Base de Datos</span>
                    </button>
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

                            return (
                                <div
                                    key={db.id}
                                    className="group relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-[#080d16] p-5 transition-all hover:border-cyan-500/60 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)]"
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
                                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-neutral-300">
                                                <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-lg border border-neutral-800">
                                                    <span className="text-neutral-500 text-[10px]">HOST:</span>
                                                    <span>{db.host}:{db.port}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(`${db.host}:${db.port}`, 'Host')}
                                                        className="text-neutral-500 hover:text-cyan-300 ml-1"
                                                        title="Copiar host y puerto"
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
                                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0 border-t lg:border-t-0 border-neutral-800 pt-3 lg:pt-0 w-full lg:w-auto justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setConnectionStringDb(db)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-cyan-400 hover:text-cyan-300 transition"
                                            title="Ver cadenas de conexión y variables de entorno"
                                        >
                                            <Info size={13} />
                                            <span>Cadena de Conexión</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isDeletingId === db.id}
                                            onClick={() => handleDelete(db)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400 hover:bg-red-900/40 transition disabled:opacity-50"
                                            title="Eliminar base de datos"
                                        >
                                            <Trash2 size={13} />
                                            <span>Eliminar</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
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
                                            <option value="mysql">MySQL (Puerto 3306)</option>
                                            <option value="mariadb">MariaDB (Puerto 3306)</option>
                                            <option value="pgsql">PostgreSQL (Puerto 5432)</option>
                                            <option value="mongodb">MongoDB (Puerto 27017)</option>
                                            <option value="redis">Redis (Puerto 6379)</option>
                                            <option value="sqlite">SQLite (Archivo local)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                                            Puerto
                                        </label>
                                        <input
                                            type="number"
                                            value={data.port}
                                            onChange={(e) => setData('port', Number(e.target.value))}
                                            className="w-full rounded-xl border border-cyan-800/80 bg-black/70 px-4 py-2.5 text-xs text-cyan-100 focus:border-cyan-400 focus:outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                                            Usuario
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={data.user}
                                            onChange={(e) => setData('user', e.target.value)}
                                            className="w-full rounded-xl border border-cyan-800/80 bg-black/70 px-4 py-2.5 text-xs text-cyan-100 focus:border-cyan-400 focus:outline-none font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                                            Host
                                        </label>
                                        <input
                                            type="text"
                                            value={data.host}
                                            onChange={(e) => setData('host', e.target.value)}
                                            className="w-full rounded-xl border border-cyan-800/80 bg-black/70 px-4 py-2.5 text-xs text-cyan-100 focus:border-cyan-400 focus:outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2.5 border-t border-cyan-900/60 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400 bg-cyan-500 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition shadow-[0_0_12px_rgba(34,211,238,0.25)] disabled:opacity-50"
                                    >
                                        <Check size={14} />
                                        <span>Crear Base de Datos</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Cadena de Conexión */}
                {connectionStringDb && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-lg rounded-2xl border border-cyan-700/80 bg-[#090e17] text-white shadow-2xl p-5 space-y-4 font-[Orbitron]">
                            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
                                <div>
                                    <h3 className="font-bold text-white text-base">Variables de Conexión</h3>
                                    <p className="text-xs text-neutral-400">{connectionStringDb.name}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setConnectionStringDb(null)}
                                    className="p-1 rounded-lg text-neutral-400 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs font-mono">
                                <div>
                                    <div className="flex items-center justify-between text-neutral-400 mb-1">
                                        <span>Formato .env / Configuración:</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                copyToClipboard(
                                                    `DB_CONNECTION=${connectionStringDb.driver}\nDB_HOST=${connectionStringDb.host}\nDB_PORT=${connectionStringDb.port}\nDB_DATABASE=${connectionStringDb.name}\nDB_USERNAME=${connectionStringDb.user}\nDB_PASSWORD=${connectionStringDb.password || ''}`,
                                                    'Configuración .env'
                                                )
                                            }
                                            className="text-cyan-400 hover:underline flex items-center gap-1"
                                        >
                                            <Copy size={11} /> Copiar
                                        </button>
                                    </div>
                                    <pre className="rounded-xl border border-neutral-800 bg-black/80 p-3 text-[11px] text-cyan-200 overflow-x-auto">
{`DB_CONNECTION=${connectionStringDb.driver}
DB_HOST=${connectionStringDb.host}
DB_PORT=${connectionStringDb.port}
DB_DATABASE=${connectionStringDb.name}
DB_USERNAME=${connectionStringDb.user}
DB_PASSWORD=${connectionStringDb.password || ''}`}
                                    </pre>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-neutral-400 mb-1">
                                        <span>URI de Conexión:</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                copyToClipboard(
                                                    `${connectionStringDb.driver}://${connectionStringDb.user}:${connectionStringDb.password || ''}@${connectionStringDb.host}:${connectionStringDb.port}/${connectionStringDb.name}`,
                                                    'URI'
                                                )
                                            }
                                            className="text-cyan-400 hover:underline flex items-center gap-1"
                                        >
                                            <Copy size={11} /> Copiar
                                        </button>
                                    </div>
                                    <pre className="rounded-xl border border-neutral-800 bg-black/80 p-3 text-[11px] text-cyan-300 break-all">
                                        {`${connectionStringDb.driver}://${connectionStringDb.user}:${connectionStringDb.password || ''}@${connectionStringDb.host}:${connectionStringDb.port}/${connectionStringDb.name}`}
                                    </pre>
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-cyan-900/60 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setConnectionStringDb(null)}
                                    className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ServerLayout>
    );
}
