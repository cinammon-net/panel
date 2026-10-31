import ServerLayout from '@/layouts/server-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Archive,
    Check,
    Download,
    HardDrive,
    Lock,
    Plus,
    RefreshCw,
    Shield,
    Trash2,
    Unlock,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface BackupItem {
    id: string;
    name: string;
    size: number;
    is_locked: boolean;
    completed_at: string;
    checksum?: string;
}

interface PageProps {
    server: {
        id: number;
        name: string;
        uuid: string;
        owner_id?: number;
        backup_limit: number;
    };
    backups: BackupItem[];
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function BackupsPage({ server, backups = [] }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: `Respaldo manual - ${new Date().toLocaleDateString('es-ES')}`,
        is_locked: false,
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/servers/${server.id}/backups`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Copia de seguridad iniciada y guardada correctamente.');
                setIsCreateOpen(false);
                reset();
            },
            onError: (err) => {
                toast.error(err.backup || 'No se pudo generar la copia de seguridad.');
            },
        });
    };

    const handleToggleLock = (backupId: string) => {
        router.post(
            `/servers/${server.id}/backups/${backupId}/lock`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Estado de bloqueo del respaldo actualizado.'),
                onError: (err: any) => toast.error(err.backup || 'Error al actualizar bloqueo.'),
            }
        );
    };

    const handleRestore = (backup: BackupItem) => {
        if (!confirm(`¿Estás seguro de restaurar "${backup.name}"? Los datos actuales del servidor se reemplazarán.`)) {
            return;
        }

        setRestoringId(backup.id);
        setTimeout(() => {
            setRestoringId(null);
            toast.success(`Copia "${backup.name}" restaurada con éxito.`);
        }, 1500);
    };

    const handleDelete = (backup: BackupItem) => {
        if (backup.is_locked) {
            toast.error('Este respaldo está bloqueado contra eliminación. Desbloquéalo primero.');
            return;
        }

        if (!confirm(`¿Eliminar de forma permanente el respaldo "${backup.name}"?`)) {
            return;
        }

        router.delete(`/servers/${server.id}/backups/${backup.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Copia de seguridad eliminada.'),
            onError: (err: any) => toast.error(err.backup || 'Error al eliminar respaldo.'),
        });
    };

    const isLimitReached = backups.length >= (server.backup_limit || 3);

    return (
        <ServerLayout server={server} section="backups">
            <Head title={`${server.name} · Copias de Seguridad - Cinammon`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-cyan-900/60 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Archive className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
                                Copias de Seguridad
                            </h1>
                            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                Crea copias completas de archivos y configuraciones del servidor para restaurarlas en cualquier momento.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-cyan-800/60 bg-neutral-100 dark:bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-700 dark:text-cyan-300">
                            <span className="font-semibold text-cyan-500">{backups.length}</span>
                            <span>/</span>
                            <span>{server.backup_limit || 3} Respaldos permitidos</span>
                        </div>

                        <button
                            onClick={() => setIsCreateOpen(true)}
                            disabled={isLimitReached}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                                isLimitReached
                                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500 border border-neutral-700/50'
                                    : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                            }`}
                        >
                            <Plus className="h-4 w-4" />
                            <span>Crear Respaldo</span>
                        </button>
                    </div>
                </div>

                {/* Backups List */}
                <div className="space-y-3">
                    {backups.map((bk) => {
                        const isRestoring = restoringId === bk.id;

                        return (
                            <div
                                key={bk.id}
                                className={`rounded-xl border p-4 sm:p-5 transition-all shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                    bk.is_locked
                                        ? 'border-amber-500/50 bg-amber-950/10 dark:bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 hover:border-cyan-500/40'
                                }`}
                            >
                                <div className="flex items-start gap-3.5">
                                    <div
                                        className={`p-2.5 rounded-lg border shrink-0 ${
                                            bk.is_locked
                                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                                                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                                        }`}
                                    >
                                        <HardDrive className="h-5 w-5" />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                                                {bk.name}
                                            </h3>
                                            {bk.is_locked && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                                    <Lock className="h-2.5 w-2.5" />
                                                    BLOQUEADO
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                                            <span className="font-semibold text-cyan-400">{formatBytes(bk.size)}</span>
                                            <span>•</span>
                                            <span>{new Date(bk.completed_at).toLocaleString('es-ES')}</span>
                                            {bk.checksum && (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-mono text-[10px] text-neutral-500 truncate max-w-[200px]" title={bk.checksum}>
                                                        {bk.checksum}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-center">
                                    <button
                                        onClick={() => handleToggleLock(bk.id)}
                                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                            bk.is_locked
                                                ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                                                : 'border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800'
                                        }`}
                                        title={bk.is_locked ? 'Desbloquear respaldo' : 'Bloquear respaldo contra borrado'}
                                    >
                                        {bk.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                                        <span>{bk.is_locked ? 'Desbloquear' : 'Bloquear'}</span>
                                    </button>

                                    <button
                                        onClick={() => handleRestore(bk)}
                                        disabled={isRestoring}
                                        className="rounded-lg border border-cyan-500/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                                        <span>{isRestoring ? 'Restaurando...' : 'Restaurar'}</span>
                                    </button>

                                    <button
                                        onClick={() => handleDelete(bk)}
                                        disabled={bk.is_locked}
                                        className="rounded-lg border border-neutral-300 dark:border-neutral-700 p-2 text-neutral-400 hover:text-red-400 hover:border-red-500/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Eliminar respaldo"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {backups.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-cyan-900/60 bg-neutral-50 dark:bg-neutral-900/30 p-12 text-center">
                        <Archive className="h-12 w-12 text-neutral-400 dark:text-cyan-500/40 mb-3" />
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-white">
                            No hay copias de seguridad creadas
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                            Genera una copia de seguridad para proteger los archivos y estado actual de tu servidor.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Crear Copia */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-white dark:bg-neutral-950 p-6 shadow-[0_0_40px_rgba(34,211,238,0.25)] space-y-5">
                        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-cyan-900/60 pb-3">
                            <div className="flex items-center gap-2">
                                <Archive className="h-5 w-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                                    Nueva Copia de Seguridad
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-lg p-1 text-neutral-400 hover:text-white hover:bg-neutral-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-cyan-300 uppercase tracking-wider mb-2">
                                    Nombre del Respaldo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
                                <input
                                    type="checkbox"
                                    id="is_locked"
                                    checked={data.is_locked}
                                    onChange={(e) => setData('is_locked', e.target.checked)}
                                    className="h-4 w-4 rounded border-cyan-500 text-cyan-500 focus:ring-cyan-400"
                                />
                                <label htmlFor="is_locked" className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                                    <span className="font-semibold block text-neutral-900 dark:text-white">Bloquear copia de seguridad</span>
                                    Impide que se borre accidentalmente hasta que sea desbloqueada manualmente.
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-cyan-900/60">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>{processing ? 'Generando...' : 'Iniciar Respaldo'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </ServerLayout>
    );
}

