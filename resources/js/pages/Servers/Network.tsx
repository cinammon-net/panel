import ServerLayout from '@/layouts/server-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Copy,
    Globe,
    Info,
    Network as NetworkIcon,
    Plus,
    Radio,
    Shield,
    Star,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface AllocationItem {
    id: number;
    ip: string;
    port: number;
    alias?: string | null;
    is_primary: boolean;
}

interface PageProps {
    server: {
        id: number;
        name: string;
        uuid: string;
        owner_id?: number;
        allocation_limit: number;
    };
    allocations: AllocationItem[];
    availableAllocations: Array<{
        id: number;
        ip: string;
        port: number;
        alias?: string | null;
    }>;
}

export default function NetworkPage({
    server,
    allocations = [],
    availableAllocations = [],
}: PageProps) {
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        allocation_id: availableAllocations.length > 0 ? String(availableAllocations[0].id) : '',
        alias: '',
    });

    const copyToClipboard = (text: string, id: number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success(`Dirección ${text} copiada al portapapeles.`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleAssignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/servers/${server.id}/network`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Puerto asignado con éxito al servidor.');
                setIsAssignOpen(false);
                reset();
            },
            onError: (err) => {
                toast.error(err.network || 'No se pudo asignar el puerto.');
            },
        });
    };

    const handleSetPrimary = (allocationId: number) => {
        router.post(
            `/servers/${server.id}/network/primary`,
            { allocation_id: allocationId },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Puerto principal actualizado correctamente.'),
                onError: (err: any) => toast.error(err.network || 'Error al cambiar puerto primario.'),
            }
        );
    };

    const handleDestroy = (alloc: AllocationItem) => {
        if (alloc.is_primary) {
            toast.error('No puedes eliminar el puerto principal del servidor.');
            return;
        }

        if (!confirm(`¿Deseas desasignar el puerto ${alloc.ip}:${alloc.port}?`)) {
            return;
        }

        router.delete(`/servers/${server.id}/network/${alloc.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(`Puerto ${alloc.port} liberado del servidor.`),
            onError: (err: any) => toast.error(err.network || 'Error al desasignar el puerto.'),
        });
    };

    const isLimitReached = allocations.length >= (server.allocation_limit || 3);

    return (
        <ServerLayout server={server} section="network">
            <Head title={`${server.name} · Red y Puertos - Cinammon`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-cyan-900/60 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Radio className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
                                Red y Asignación de Puertos
                            </h1>
                            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                Administra las direcciones IP, puertos de conexión y alias de red vinculados a este servidor.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-cyan-800/60 bg-neutral-100 dark:bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-700 dark:text-cyan-300">
                            <span className="font-semibold text-cyan-500">{allocations.length}</span>
                            <span>/</span>
                            <span>{server.allocation_limit || 3} Puertos asignados</span>
                        </div>

                        <button
                            onClick={() => setIsAssignOpen(true)}
                            disabled={isLimitReached || availableAllocations.length === 0}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                                isLimitReached || availableAllocations.length === 0
                                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500 border border-neutral-700/50'
                                    : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                            }`}
                        >
                            <Plus className="h-4 w-4" />
                            <span>Asignar Puerto</span>
                        </button>
                    </div>
                </div>

                {/* Grid of allocations */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allocations.map((alloc) => {
                        const fullAddress = `${alloc.ip}:${alloc.port}`;
                        const isCopied = copiedId === alloc.id;

                        return (
                            <div
                                key={alloc.id}
                                className={`group relative rounded-xl border p-5 transition-all shadow-lg ${
                                    alloc.is_primary
                                        ? 'border-cyan-500/70 bg-cyan-950/20 dark:bg-cyan-950/30 shadow-[0_0_20px_rgba(34,211,238,0.15)] ring-1 ring-cyan-500/30'
                                        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 hover:border-cyan-500/40'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {alloc.is_primary ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                                                    <Star className="h-3 w-3 fill-cyan-300 text-cyan-300" />
                                                    PUERTO PRINCIPAL
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800/80 px-2.5 py-0.5 text-[10px] font-bold text-neutral-400">
                                                    ADICIONAL
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-lg font-bold text-neutral-900 dark:text-white font-mono tracking-wide mt-2">
                                            {fullAddress}
                                        </p>

                                        {alloc.alias && (
                                            <p className="text-xs text-neutral-500 dark:text-cyan-400/80 font-medium">
                                                Alias: <span className="font-semibold">{alloc.alias}</span>
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => copyToClipboard(fullAddress, alloc.id)}
                                        title="Copiar dirección"
                                        className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 p-2 text-neutral-700 dark:text-neutral-300 transition-colors hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10"
                                    >
                                        {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>

                                <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                                    {!alloc.is_primary ? (
                                        <button
                                            onClick={() => handleSetPrimary(alloc.id)}
                                            className="text-xs font-semibold text-cyan-500 hover:text-cyan-400 hover:underline flex items-center gap-1.5"
                                        >
                                            <Star className="h-3.5 w-3.5" />
                                            <span>Establecer como primario</span>
                                        </button>
                                    ) : (
                                        <span className="text-xs text-cyan-400/80 font-medium flex items-center gap-1">
                                            <Shield className="h-3.5 w-3.5 text-cyan-400" />
                                            Asignado por defecto
                                        </span>
                                    )}

                                    {!alloc.is_primary && (
                                        <button
                                            onClick={() => handleDestroy(alloc)}
                                            className="text-xs text-red-500 hover:text-red-400 hover:underline flex items-center gap-1"
                                            title="Desasignar puerto"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Liberar</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {allocations.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-cyan-900/60 bg-neutral-50 dark:bg-neutral-900/30 p-12 text-center">
                        <NetworkIcon className="h-12 w-12 text-neutral-400 dark:text-cyan-500/40 mb-3" />
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-white">
                            No hay puertos de red asignados
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                            Asigna un puerto primario para que tu servidor pueda recibir conexiones entrantes.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Asignar Puerto */}
            {isAssignOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-white dark:bg-neutral-950 p-6 shadow-[0_0_40px_rgba(34,211,238,0.25)] space-y-5">
                        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-cyan-900/60 pb-3">
                            <div className="flex items-center gap-2">
                                <Radio className="h-5 w-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                                    Asignar Puerto Adicional
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsAssignOpen(false)}
                                className="rounded-lg p-1 text-neutral-400 hover:text-white hover:bg-neutral-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-cyan-300 uppercase tracking-wider mb-2">
                                    Seleccionar Puerto Disponible
                                </label>
                                <select
                                    value={data.allocation_id}
                                    onChange={(e) => setData('allocation_id', e.target.value)}
                                    className="w-full rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                >
                                    {availableAllocations.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.ip}:{a.port} {a.alias ? `(${a.alias})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {availableAllocations.length === 0 && (
                                    <p className="mt-1 text-xs text-amber-400">
                                        No hay puertos libres en el nodo asignado a este servidor.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-cyan-300 uppercase tracking-wider mb-2">
                                    Alias o Etiqueta (Opcional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Puerto Query, RCON, Web, Voz"
                                    value={data.alias}
                                    onChange={(e) => setData('alias', e.target.value)}
                                    className="w-full rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-cyan-900/60">
                                <button
                                    type="button"
                                    onClick={() => setIsAssignOpen(false)}
                                    className="rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || availableAllocations.length === 0}
                                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>{processing ? 'Asignando...' : 'Asignar Puerto'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </ServerLayout>
    );
}
