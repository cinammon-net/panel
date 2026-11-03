import ServerLayout from '@/layouts/server-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Check, Copy, KeyRound, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PageProps {
    server: { id: number; name: string; uuid: string; owner_id?: number };
    sftp: {
        host: string;
        port: number;
        username: string;
        has_credentials: boolean;
        rotated_at: string | null;
        last_used_at: string | null;
        last_used_ip: string | null;
    };
    generated_password: string | null;
}

const fmtDate = (value: string | null) => (value ? new Date(value).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function CopyRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(`${label} copiado.`);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">{label}</span>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-black/60">
                <code className={`flex-1 font-mono text-sm break-all ${secret ? 'font-bold text-emerald-400' : 'text-neutral-800 dark:text-cyan-100'}`}>{value}</code>
                <button type="button" onClick={copy} title="Copiar" className="text-neutral-400 hover:text-cyan-400">
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}

export default function SftpPage({ server, sftp, generated_password }: PageProps) {
    const { demoMode } = usePage().props as { demoMode?: boolean };
    const [busy, setBusy] = useState(false);

    const rotate = () => {
        if (sftp.has_credentials && !confirm('Se generará una contraseña nueva y la anterior dejará de funcionar. ¿Continuar?')) return;
        router.post(`/servers/${server.id}/sftp/rotate`, {}, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
    };

    const revoke = () => {
        if (!confirm('Se eliminará tu acceso SFTP a este servidor. ¿Continuar?')) return;
        router.delete(`/servers/${server.id}/sftp`, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
    };

    return (
        <ServerLayout server={server} section="sftp">
            <Head title={`${server.name} · Acceso SFTP - Cinammon`} />

            <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-5 dark:border-cyan-900/60">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        <KeyRound className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase sm:text-2xl dark:text-white">Acceso SFTP</h1>
                        <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                            Credenciales generadas por el panel, solo para ti y solo para <span className="font-semibold text-cyan-500">{server.name}</span>.
                        </p>
                    </div>
                </div>

                {demoMode && (
                    <div className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-xs text-yellow-200">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p>En la demo no hay un servidor SFTP real: puedes probar a generar credenciales, pero no se podrá conectar nadie.</p>
                    </div>
                )}

                {generated_password && (
                    <div className="space-y-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-5">
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                            <ShieldCheck className="h-5 w-5" />
                            Tu contraseña SFTP nueva
                        </div>
                        <CopyRow label="Contraseña" value={generated_password} secret />
                        <p className="text-xs text-emerald-200/90">
                            Cópiala ahora: <strong>no se volverá a mostrar</strong>. En el panel solo se guarda cifrada. Si la pierdes, genera otra.
                        </p>
                    </div>
                )}

                <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-cyan-900/60 dark:bg-neutral-900/60">
                    <h2 className="text-sm font-bold tracking-wider text-cyan-600 uppercase dark:text-cyan-400">Datos de conexión</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <CopyRow label="Servidor" value={sftp.host} />
                        <CopyRow label="Puerto" value={String(sftp.port)} />
                    </div>
                    <CopyRow label="Usuario" value={sftp.username} />
                    {!sftp.has_credentials && !generated_password && (
                        <p className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-black/40 dark:text-neutral-300">
                            Aún no tienes contraseña para este servidor. Genérala para poder conectarte.
                        </p>
                    )}
                    <p className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                        Terminal: sftp -P {sftp.port} {sftp.username}@{sftp.host}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            type="button"
                            onClick={rotate}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            {sftp.has_credentials ? 'Generar contraseña nueva' : 'Generar contraseña'}
                        </button>
                        {sftp.has_credentials && (
                            <button
                                type="button"
                                onClick={revoke}
                                disabled={busy}
                                className="inline-flex items-center gap-2 rounded-lg border border-rose-500/50 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                Revocar acceso
                            </button>
                        )}
                    </div>
                </section>

                {sftp.has_credentials && (
                    <section className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-xs sm:grid-cols-3 dark:border-cyan-900/60 dark:bg-neutral-900/60">
                        <div>
                            <p className="font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Contraseña creada</p>
                            <p className="mt-1 text-neutral-800 dark:text-cyan-100">{fmtDate(sftp.rotated_at)}</p>
                        </div>
                        <div>
                            <p className="font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Último uso</p>
                            <p className="mt-1 text-neutral-800 dark:text-cyan-100">{fmtDate(sftp.last_used_at)}</p>
                        </div>
                        <div>
                            <p className="font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Desde la IP</p>
                            <p className="mt-1 font-mono text-neutral-800 dark:text-cyan-100">{sftp.last_used_ip ?? '—'}</p>
                        </div>
                    </section>
                )}

                <ul className="space-y-1.5 rounded-xl border border-neutral-200 p-4 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                    <li>• Este acceso solo abre los archivos de <strong>este servidor</strong>; no sirve para tu cuenta ni para otros servidores.</li>
                    <li>• Cada persona con acceso al servidor tiene su propio usuario y contraseña, y puede revocar la suya.</li>
                    <li>• Tras varios intentos fallidos el acceso se bloquea temporalmente.</li>
                    <li>• Si dejas de tener acceso al servidor, tu contraseña SFTP deja de funcionar automáticamente.</li>
                </ul>
            </div>
        </ServerLayout>
    );
}
