import ServerLayout from '@/layouts/server-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Copy,
    ExternalLink,
    Globe,
    Plus,
    Radio,
    ShieldCheck,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SubdomainItem {
    id: string;
    subdomain: string;
    domain: string;
    full_domain: string;
    record_type: string;
    target: string;
    status: string;
    created_at: string;
}

interface PageProps {
    server: {
        id: number;
        name: string;
        uuid: string;
        owner_id?: number;
    };
    subdomains: SubdomainItem[];
    availableDomains: string[];
}

export default function SubdomainsPage({
    server,
    subdomains = [],
    availableDomains = ['cinammon.net', 'cinammon.es', 'playcinammon.com'],
}: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        subdomain: '',
        domain: availableDomains[0] || 'cinammon.net',
        record_type: 'CNAME',
    });

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success(`Dominio ${text} copiado al portapapeles.`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/servers/${server.id}/subdomains`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Subdominio vinculado correctamente.');
                setIsCreateOpen(false);
                reset();
            },
            onError: (err) => {
                toast.error(err.subdomain || err.domain || 'Error al vincular subdominio.');
            },
        });
    };

    const handleDelete = (sub: SubdomainItem) => {
        if (!confirm(`¿Eliminar la vinculación del subdominio "${sub.full_domain}"?`)) {
            return;
        }

        router.delete(`/servers/${server.id}/subdomains/${sub.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Subdominio desvinculado.'),
            onError: (err: any) => toast.error(err.subdomain || 'Error al eliminar subdominio.'),
        });
    };

    return (
        <ServerLayout server={server} section="subdomains">
            <Head title={`${server.name} · Subdominios - Cinammon`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-cyan-900/60 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
                                Enrutamiento de Subdominios
                            </h1>
                            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                Asigna nombres de dominio legibles a la dirección y puerto de tu servidor.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-all hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.35)]"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Crear Subdominio</span>
                    </button>
                </div>

                {/* Subdomains List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subdomains.map((sub) => {
                        const isCopied = copiedId === sub.id;

                        return (
                            <div
                                key={sub.id}
                                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-5 transition-all shadow-lg hover:border-cyan-500/40 space-y-4"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                                                {sub.record_type}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                                EN LÍNEA
                                            </span>
                                        </div>

                                        <p className="text-lg font-bold text-neutral-900 dark:text-white font-mono tracking-wide mt-2">
                                            {sub.full_domain}
                                        </p>

                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                            <span>Destino:</span>
                                            <span className="font-mono text-cyan-400 font-semibold">{sub.target}</span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => copyToClipboard(sub.full_domain, sub.id)}
                                        title="Copiar subdominio"
                                        className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 p-2 text-neutral-700 dark:text-neutral-300 transition-colors hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10"
                                    >
                                        {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>

                                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500">
                                    <span>Vinculado el {new Date(sub.created_at).toLocaleDateString('es-ES')}</span>
                                    <button
                                        onClick={() => handleDelete(sub)}
                                        className="text-red-500 hover:text-red-400 hover:underline flex items-center gap-1"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Desvincular</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {subdomains.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-cyan-900/60 bg-neutral-50 dark:bg-neutral-900/30 p-12 text-center">
                        <Globe className="h-12 w-12 text-neutral-400 dark:text-cyan-500/40 mb-3" />
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-white">
                            No hay subdominios vinculados
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                            Crea un subdominio personalizado para conectarte a tu servidor sin recordar números de puerto.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Crear Subdominio */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-white dark:bg-neutral-950 p-6 shadow-[0_0_40px_rgba(34,211,238,0.25)] space-y-5">
                        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-cyan-900/60 pb-3">
                            <div className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                                    Vincular Subdominio
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
                                    Prefijo del Subdominio
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        required
                                        placeholder="ej: bot, play, lobby"
                                        value={data.subdomain}
                                        onChange={(e) => setData('subdomain', e.target.value)}
                                        className="flex-1 rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    />
                                    <span className="text-neutral-500 font-bold">.</span>
                                    <select
                                        value={data.domain}
                                        onChange={(e) => setData('domain', e.target.value)}
                                        className="rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    >
                                        {availableDomains.map((d) => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-cyan-300 uppercase tracking-wider mb-2">
                                    Tipo de Registro
                                </label>
                                <select
                                    value={data.record_type}
                                    onChange={(e) => setData('record_type', e.target.value)}
                                    className="w-full rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                >
                                    <option value="CNAME">CNAME (Alias Canónico - Recomendado)</option>
                                    <option value="A">A (Dirección IPv4 Directa)</option>
                                    <option value="SRV">SRV (Servicio con Puerto)</option>
                                </select>
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
                                    <span>{processing ? 'Vinculando...' : 'Vincular'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </ServerLayout>
    );
}
