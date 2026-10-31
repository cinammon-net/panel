import ServerLayout from '@/layouts/server-layout';
import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Copy,
    FolderTree,
    HardDrive,
    Info,
    Lock,
    ShieldCheck,
    Unlock,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface MountItem {
    id: number;
    name: string;
    description?: string | null;
    source: string;
    target: string;
    read_only: boolean;
    user_mountable?: boolean;
}

interface PageProps {
    server: {
        id: number;
        name: string;
        uuid: string;
        owner_id?: number;
    };
    mounts: MountItem[];
}

export default function MountsPage({ server, mounts = [] }: PageProps) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const copyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        toast.success(`Ruta copiada al portapapeles.`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <ServerLayout server={server} section="mounts">
            <Head title={`${server.name} · Puntos de Montaje - Cinammon`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-cyan-900/60 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <FolderTree className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
                                Puntos de Montaje (Mounts)
                            </h1>
                            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                Directorios y volúmenes del sistema anfitrión vinculados al contenedor de este servidor.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-cyan-800/60 bg-cyan-950/30 px-3.5 py-1.5 text-xs text-cyan-300">
                        <ShieldCheck className="h-4 w-4 text-cyan-400" />
                        <span>Aislamiento de Contenedores Activo</span>
                    </div>
                </div>

                {/* Info Alert */}
                <div className="flex items-start gap-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-xs text-cyan-200">
                    <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-semibold text-cyan-300">¿Qué son los puntos de montaje?</p>
                        <p className="text-neutral-300">
                            Los mounts permiten inyectar carpetas compartidas entre el host (nodo físico) y tu servidor de forma segura, como logs centralizados, configuraciones globales o almacenamiento compartido.
                        </p>
                    </div>
                </div>

                {/* Mounts List */}
                <div className="grid grid-cols-1 gap-4">
                    {mounts.map((mount) => {
                        return (
                            <div
                                key={mount.id}
                                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-5 transition-all shadow-lg hover:border-cyan-500/40 space-y-4"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                                            {mount.name}
                                        </h3>
                                        {mount.read_only ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
                                                <Lock className="h-2.5 w-2.5" />
                                                SOLO LECTURA
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                                <Unlock className="h-2.5 w-2.5" />
                                                LECTURA Y ESCRITURA
                                            </span>
                                        )}
                                    </div>

                                    <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-800/50 self-start sm:self-auto">
                                        Vínculo Automático
                                    </span>
                                </div>

                                {mount.description && (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {mount.description}
                                    </p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                    {/* Source Path */}
                                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black/50 p-3 space-y-1">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                            <span>Ruta Origen (Nodo Host)</span>
                                            <button
                                                onClick={() => copyText(mount.source, `src_${mount.id}`)}
                                                className="text-neutral-400 hover:text-cyan-400"
                                            >
                                                {copiedKey === `src_${mount.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                        <p className="font-mono text-xs text-neutral-800 dark:text-neutral-200 truncate" title={mount.source}>
                                            {mount.source}
                                        </p>
                                    </div>

                                    {/* Target Path */}
                                    <div className="rounded-lg border border-neutral-200 dark:border-cyan-900/40 bg-white dark:bg-cyan-950/20 p-3 space-y-1">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-cyan-500">
                                            <span>Ruta Destino (Contenedor)</span>
                                            <button
                                                onClick={() => copyText(mount.target, `tgt_${mount.id}`)}
                                                className="text-cyan-400 hover:text-cyan-300"
                                            >
                                                {copiedKey === `tgt_${mount.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                        <p className="font-mono text-xs text-cyan-300 font-semibold truncate" title={mount.target}>
                                            {mount.target}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {mounts.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-cyan-900/60 bg-neutral-50 dark:bg-neutral-900/30 p-12 text-center">
                        <FolderTree className="h-12 w-12 text-neutral-400 dark:text-cyan-500/40 mb-3" />
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-white">
                            No hay puntos de montaje configurados
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                            Este servidor opera en su contenedor aislado sin puntos de montaje compartidos.
                        </p>
                    </div>
                )}
            </div>
        </ServerLayout>
    );
}
