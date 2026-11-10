import ServerLayout from '@/layouts/server-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    Cloud,
    CloudOff,
    Copy,
    ExternalLink,
    Globe,
    KeyRound,
    Link2,
    Loader2,
    Lock,
    Plus,
    RefreshCw,
    Trash2,
    Unplug,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DnsRecord {
    type: string;
    name: string;
    value: string;
    proxied: boolean;
    detail: string | null;
}

interface DomainItem {
    id: number;
    domain: string;
    provider: 'cloudflare' | 'manual';
    kind: 'game' | 'web';
    status: 'active' | 'pending' | 'error';
    zone_name: string | null;
    address: string;
    last_error: string | null;
    verified_at: string | null;
    created_at: string | null;
    records: DnsRecord[];
    can_delete: boolean;
}

interface Zone {
    id: string;
    name: string;
    active: boolean;
}

interface PageProps {
    server: { id: number; name: string; uuid: string; owner_id?: number };
    allowed: boolean;
    demo: boolean;
    storeUrl: string;
    kind: 'game' | 'web';
    usesSrv: boolean;
    port: number | null;
    max: number;
    cloudflare: { hint: string | null; zones_count: number; verified_at: string | null } | null;
    zones: Zone[];
    zonesError: string | null;
    domains: DomainItem[];
}

const firstError = (errors: Record<string, string>, fallback: string) => Object.values(errors)[0] || fallback;
const flashOk = (page: any, fallback: string) => toast.success(page?.props?.flash?.success || fallback);

const inputClass =
    'w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-cyan-800/80 dark:bg-neutral-900 dark:text-white';
const labelClass = 'mb-2 block text-xs font-bold tracking-wider text-neutral-700 uppercase dark:text-cyan-300';

function StatusBadge({ status, warn }: { status: DomainItem['status']; warn: boolean }) {
    if (status === 'active' && !warn) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> ACTIVO
            </span>
        );
    }
    if (status === 'error' || warn) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                <AlertTriangle className="h-3 w-3" /> {status === 'error' ? 'REVISAR' : 'AVISO'}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-400/40 bg-neutral-500/10 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
            <Loader2 className="h-3 w-3" /> PENDIENTE DE DNS
        </span>
    );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            title={label || 'Copiar'}
            onClick={() => {
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }}
            className="shrink-0 rounded-md border border-neutral-300 bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:border-cyan-500 hover:text-cyan-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

function RecordsTable({ records }: { records: DnsRecord[] }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-[10px] tracking-wider text-neutral-500 uppercase dark:bg-neutral-900 dark:text-neutral-400">
                    <tr>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Nombre</th>
                        <th className="px-3 py-2">Contenido</th>
                        <th className="px-3 py-2">Proxy</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-mono dark:divide-neutral-800">
                    {records.map((r) => (
                        <tr key={r.type + r.name}>
                            <td className="px-3 py-2 font-bold text-cyan-600 dark:text-cyan-400">{r.type}</td>
                            <td className="px-3 py-2">
                                <span className="flex items-center gap-1.5 break-all text-neutral-800 dark:text-neutral-200">
                                    {r.name} <CopyButton text={r.name} />
                                </span>
                            </td>
                            <td className="px-3 py-2">
                                <span className="flex items-center gap-1.5 break-all text-neutral-800 dark:text-neutral-200">
                                    {r.value} <CopyButton text={r.value} />
                                </span>
                                {r.detail && <span className="mt-0.5 block font-sans text-[10px] text-neutral-500">{r.detail}</span>}
                            </td>
                            <td className="px-3 py-2 font-sans">
                                {r.type === 'SRV' ? (
                                    <span className="text-neutral-400">-</span>
                                ) : r.proxied ? (
                                    <span className="inline-flex items-center gap-1 text-orange-500">
                                        <Cloud className="h-3.5 w-3.5" /> Activado
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-neutral-500">
                                        <CloudOff className="h-3.5 w-3.5" /> Solo DNS
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CloudflareCard({ cloudflare, zonesError, zones }: Pick<PageProps, 'cloudflare' | 'zonesError' | 'zones'>) {
    const form = useForm({ token: '' });
    const [open, setOpen] = useState(false);

    const connect = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/cloudflare/connection', {
            preserveScroll: true,
            onSuccess: (page) => {
                flashOk(page, 'Cloudflare conectado.');
                form.reset();
                setOpen(false);
            },
            onError: (err) => toast.error(firstError(err, 'No se pudo conectar Cloudflare.')),
        });
    };

    const disconnect = () => {
        if (!confirm('¿Desconectar tu cuenta de Cloudflare? Los dominios ya vinculados siguen funcionando, pero el panel no podrá borrar sus registros.')) return;
        router.delete('/cloudflare/connection', { preserveScroll: true, onSuccess: (page) => flashOk(page, 'Cloudflare desconectado.') });
    };

    if (cloudflare) {
        return (
            <div className="flex flex-col gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-500">
                        <Cloud className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">Cloudflare conectado</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Token {cloudflare.hint} · {zones.length || cloudflare.zones_count}{' '}
                            {(zones.length || cloudflare.zones_count) === 1 ? 'dominio' : 'dominios'}. Los registros DNS se crean y se borran solos.
                        </p>
                        {zonesError && <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">{zonesError}</p>}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={disconnect}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:border-red-500 hover:text-red-500 dark:border-neutral-700 dark:text-neutral-300"
                >
                    <Unplug className="h-3.5 w-3.5" /> Desconectar
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-500">
                        <Cloud className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">Conecta tu Cloudflare</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Si tu dominio está en Cloudflare, el panel crea los registros DNS por ti. Si no, también puedes añadirlo a mano.
                        </p>
                    </div>
                </div>
                {!open && (
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-400"
                    >
                        <Link2 className="h-3.5 w-3.5" /> Conectar
                    </button>
                )}
            </div>

            {open && (
                <form onSubmit={connect} className="mt-4 space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    <ol className="list-decimal space-y-1 pl-5 text-xs text-neutral-600 dark:text-neutral-300">
                        <li>
                            Abre{' '}
                            <a
                                href="https://dash.cloudflare.com/profile/api-tokens"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 font-semibold text-orange-500 hover:underline"
                            >
                                Cloudflare → Mi perfil → Tokens de API <ExternalLink className="h-3 w-3" />
                            </a>{' '}
                            y pulsa <b>Crear token</b>.
                        </li>
                        <li>
                            Elige la plantilla <b>Editar DNS de zona</b> (Edit zone DNS).
                        </li>
                        <li>
                            En <b>Recursos de zona</b> elige tu dominio (o todas las zonas), crea el token y pégalo aquí.
                        </li>
                    </ol>
                    <p className="text-[11px] text-neutral-500">
                        Es un token, no la «Global API Key» ni el ID de la cuenta. Solo puede tocar el DNS y se guarda cifrado. Puedes revocarlo en Cloudflare cuando quieras.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                            <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="password"
                                autoComplete="off"
                                required
                                placeholder="Token de API de Cloudflare"
                                value={form.data.token}
                                onChange={(e) => form.setData('token', e.target.value)}
                                className={inputClass + ' pl-9 font-mono'}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-400 disabled:opacity-50"
                        >
                            {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {form.processing ? 'Comprobando...' : 'Conectar'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                        >
                            Cancelar
                        </button>
                    </div>
                    {form.errors.token && <p className="text-xs font-semibold text-red-500">{form.errors.token}</p>}
                </form>
            )}
        </div>
    );
}

function AddDomainModal({ props, onClose }: { props: PageProps; onClose: () => void }) {
    const { cloudflare, zones, kind, server } = props;
    const activeZones = zones.filter((z) => z.active);
    const [mode, setMode] = useState<'cloudflare' | 'manual'>(cloudflare && activeZones.length ? 'cloudflare' : 'manual');
    const form = useForm({ mode, zone_id: activeZones[0]?.id || '', name: kind === 'web' ? 'www' : 'play', domain: '' });

    const zone = activeZones.find((z) => z.id === form.data.zone_id);
    const name = form.data.name.trim().replace(/\.$/, '');
    const preview = mode === 'cloudflare' ? (zone ? (name && name !== '@' ? `${name}.${zone.name}` : zone.name) : '') : form.data.domain.trim().toLowerCase();

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({ ...data, mode }));
        form.post(`/servers/${server.id}/subdomains`, {
            preserveScroll: true,
            onSuccess: (page) => {
                flashOk(page, 'Dominio añadido.');
                onClose();
            },
            onError: (err) => toast.error(firstError(err, 'No se pudo añadir el dominio.')),
        });
    };

    const tab = (value: 'cloudflare' | 'manual', label: string, disabled: boolean) => (
        <button
            type="button"
            disabled={disabled}
            onClick={() => setMode(value)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                mode === value ? 'bg-cyan-500 text-black' : 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-cyan-500/40 bg-white p-6 shadow-[0_0_40px_rgba(34,211,238,0.25)] dark:bg-neutral-950">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-cyan-900/60">
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold tracking-wider text-neutral-900 uppercase dark:text-white">Añadir dominio</h3>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
                    {tab('cloudflare', 'Con Cloudflare (automático)', !cloudflare || !activeZones.length)}
                    {tab('manual', 'A mano', kind === 'web')}
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {mode === 'cloudflare' ? (
                        <>
                            <div>
                                <label className={labelClass}>Dominio</label>
                                <select value={form.data.zone_id} onChange={(e) => form.setData('zone_id', e.target.value)} className={inputClass}>
                                    {activeZones.map((z) => (
                                        <option key={z.id} value={z.id}>
                                            {z.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Subdominio</label>
                                <input
                                    type="text"
                                    placeholder="play  (vacío o @ para el dominio raíz)"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className={labelClass}>Tu dominio</label>
                            <input
                                type="text"
                                required
                                placeholder="play.midominio.com"
                                value={form.data.domain}
                                onChange={(e) => form.setData('domain', e.target.value)}
                                className={inputClass}
                            />
                            <p className="mt-2 text-[11px] text-neutral-500">
                                Al añadirlo te diremos qué registros crear en tu proveedor de DNS (GoDaddy, IONOS, Namecheap...).
                            </p>
                        </div>
                    )}

                    {preview && (
                        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-neutral-600 dark:text-neutral-300">
                            {kind === 'web' ? (
                                <>
                                    Tu web se verá en <b className="font-mono text-cyan-600 dark:text-cyan-300">https://{preview}</b>, con HTTPS y protección de Cloudflare.
                                </>
                            ) : (
                                <>
                                    Los jugadores entrarán con{' '}
                                    <b className="font-mono text-cyan-600 dark:text-cyan-300">
                                        {preview}
                                        {props.usesSrv || !props.port ? '' : `:${props.port}`}
                                    </b>
                                    {props.usesSrv ? ', sin poner el puerto.' : '.'}
                                </>
                            )}
                        </div>
                    )}

                    {kind === 'web' && (
                        <p className="text-[11px] text-neutral-500">
                            En Cloudflare, en SSL/TLS, el modo de cifrado tiene que ser «Completo» (Full). «Flexible» provoca un bucle de redirecciones.
                        </p>
                    )}

                    <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-3 dark:border-cyan-900/60">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-bold tracking-wider text-neutral-700 uppercase hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing || !preview}
                            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold tracking-wider text-black uppercase shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:bg-cyan-400 disabled:opacity-50"
                        >
                            {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            <span>{form.processing ? 'Creando...' : mode === 'cloudflare' ? 'Crear en Cloudflare' : 'Añadir'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DomainCard({ item, serverId }: { item: DomainItem; serverId: number }) {
    const [busy, setBusy] = useState<'verify' | 'delete' | null>(null);
    const manualPending = item.provider === 'manual' && item.status !== 'active';

    const verify = () => {
        setBusy('verify');
        router.post(`/servers/${serverId}/subdomains/${item.id}/verify`, {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const errs = (page.props as any).errors || {};
                if (Object.keys(errs).length) toast.error(firstError(errs, 'Todavía no apunta a tu servidor.'));
                else flashOk(page, 'Comprobado.');
            },
            onError: (err) => toast.error(firstError(err, 'Todavía no apunta a tu servidor.')),
            onFinish: () => setBusy(null),
        });
    };

    const remove = () => {
        const msg =
            item.provider === 'cloudflare'
                ? `¿Quitar ${item.domain}? Se borrarán sus registros de tu Cloudflare.`
                : `¿Quitar ${item.domain}? Después borra sus registros en tu proveedor de DNS.`;
        if (!confirm(msg)) return;
        setBusy('delete');
        router.delete(`/servers/${serverId}/subdomains/${item.id}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                const errs = (page.props as any).errors || {};
                if (Object.keys(errs).length) toast.warning(firstError(errs, ''));
                else flashOk(page, 'Dominio quitado.');
            },
            onError: (err) => toast.error(firstError(err, 'No se pudo quitar el dominio.')),
            onFinish: () => setBusy(null),
        });
    };

    return (
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5 shadow-lg transition-all hover:border-cyan-500/40 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={item.status} warn={!!item.last_error && item.status === 'active'} />
                        {item.provider === 'cloudflare' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-300">
                                <Cloud className="h-3 w-3" /> CLOUDFLARE
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-400/40 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                                DNS A MANO
                            </span>
                        )}
                    </div>
                    <p className="font-mono text-lg font-bold tracking-wide break-all text-neutral-900 dark:text-white">{item.domain}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>{item.kind === 'web' ? 'Web:' : 'Conectarse con:'}</span>
                        <span className="font-mono font-semibold break-all text-cyan-600 dark:text-cyan-400">{item.address}</span>
                        <CopyButton text={item.address} label="Copiar dirección" />
                        {item.kind === 'web' && item.status === 'active' && (
                            <a href={item.address} target="_blank" rel="noreferrer" className="text-cyan-500 hover:text-cyan-400" title="Abrir">
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {item.last_error && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{item.last_error}</span>
                </div>
            )}

            {(manualPending || item.provider === 'manual') && (
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    {manualPending ? 'Crea estos registros en tu proveedor de DNS y pulsa «Comprobar»:' : 'Registros DNS de este dominio:'}
                </p>
            )}
            {item.provider === 'cloudflare' && <p className="text-xs text-neutral-500">Registros creados en tu Cloudflare{item.zone_name ? ` (${item.zone_name})` : ''}:</p>}
            <RecordsTable records={item.records} />

            <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800/80">
                <span>{item.created_at ? `Añadido el ${new Date(item.created_at).toLocaleDateString('es-ES')}` : ''}</span>
                <div className="flex items-center gap-3">
                    <button onClick={verify} disabled={busy !== null} className="flex items-center gap-1 text-cyan-600 hover:underline disabled:opacity-50 dark:text-cyan-400">
                        <RefreshCw className={`h-3.5 w-3.5 ${busy === 'verify' ? 'animate-spin' : ''}`} />
                        <span>Comprobar</span>
                    </button>
                    {item.can_delete && (
                        <button onClick={remove} disabled={busy !== null} className="flex items-center gap-1 text-red-500 hover:text-red-400 hover:underline disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Quitar</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SubdomainsPage(props: PageProps) {
    const { server, allowed, demo, domains = [], max } = props;
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const full = domains.length >= max;

    return (
        <ServerLayout server={server} section="subdomains">
            <Head title={`${server.name} · Dominios - Cinammon`} />

            <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center dark:border-cyan-900/60">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase sm:text-2xl dark:text-white">Dominios propios</h1>
                            <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                                {props.kind === 'web'
                                    ? 'Pon tu propio dominio a tu web, con HTTPS de Cloudflare.'
                                    : 'Usa tu propio dominio para que tus jugadores entren sin recordar la IP ni el puerto.'}
                            </p>
                        </div>
                    </div>

                    {allowed && !demo && (
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            disabled={full}
                            title={full ? `Máximo ${max} dominios por servidor` : undefined}
                            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold tracking-wider text-black uppercase shadow-[0_0_15px_rgba(34,211,238,0.35)] transition-all hover:bg-cyan-400 disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Añadir dominio</span>
                        </button>
                    )}
                </div>

                {demo ? (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
                        Los dominios propios no están disponibles en la demo.
                    </div>
                ) : !allowed ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-500/40 bg-cyan-500/5 p-10 text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
                            <Lock className="h-7 w-7" />
                        </div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">Solo para servidores de pago</h3>
                        <p className="mt-1 max-w-md text-xs text-neutral-500 dark:text-neutral-400">
                            Los servidores gratuitos no pueden usar un dominio propio. Con un plan de pago puedes conectar tu dominio de Cloudflare en un clic.
                        </p>
                        <a
                            href={props.storeUrl}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold tracking-wider text-black uppercase hover:bg-cyan-400"
                        >
                            Ver planes <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </div>
                ) : (
                    <>
                        <CloudflareCard cloudflare={props.cloudflare} zonesError={props.zonesError} zones={props.zones} />

                        {domains.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {domains.map((item) => (
                                    <DomainCard key={item.id} item={item} serverId={server.id} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-cyan-900/60 dark:bg-neutral-900/30">
                                <Globe className="mb-3 h-12 w-12 text-neutral-400 dark:text-cyan-500/40" />
                                <h3 className="text-base font-semibold text-neutral-800 dark:text-white">Todavía no hay dominios</h3>
                                <p className="mt-1 max-w-md text-xs text-neutral-500 dark:text-neutral-400">
                                    Añade tu dominio (por ejemplo <span className="font-mono">play.midominio.com</span>). Con Cloudflare conectado se configura solo.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {isCreateOpen && <AddDomainModal props={props} onClose={() => setIsCreateOpen(false)} />}
        </ServerLayout>
    );
}
