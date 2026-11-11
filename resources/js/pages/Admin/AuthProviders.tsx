import { BrandIcon } from '@/components/social-login';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Check, Copy, ExternalLink, Eye, EyeOff, KeyRound, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface SocialProviderAdminItem {
    key: string;
    name: string;
    description: string;
    portal_url: string;
    portal_label: string;
    needs_tenant: boolean;
    tenant_label: string;
    tenant_placeholder: string;
    enabled: boolean;
    ready: boolean;
    client_id: string;
    has_secret: boolean;
    secret_hint: string | null;
    tenant: string;
    callback_url: string;
}

interface PageProps {
    providers: SocialProviderAdminItem[];
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inicio Social', href: '/auth-providers' },
];

export default function AuthProviders({ providers }: { providers: SocialProviderAdminItem[] }) {
    const { flash } = usePage<PageProps>().props;
    const readyCount = providers.filter((p) => p.ready).length;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inicio Social (OAuth)" />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-500/20 bg-neutral-950/70 p-5 md:flex-row md:items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className="h-5 w-5 text-amber-400" />
                            <h1 className="font-['Orbitron'] text-xl font-bold tracking-wide text-amber-100">
                                Inicio de sesión social (OAuth)
                            </h1>
                        </div>
                        <p className="text-sm text-neutral-400">
                            Activa y configura aquí Discord, Google, GitHub, Microsoft, Cloudflare, GitLab o Twitch sin editar el{' '}
                            <code className="rounded bg-neutral-900 px-1.5 py-0.5 text-xs text-amber-200">.env</code>. Los botones aparecen en{' '}
                            <code className="rounded bg-neutral-900 px-1.5 py-0.5 text-xs text-neutral-300">/login</code>,{' '}
                            <code className="rounded bg-neutral-900 px-1.5 py-0.5 text-xs text-neutral-300">/register</code> y Perfil en cuanto un
                            proveedor esté activo y completo.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/70 px-4 py-2.5">
                        <KeyRound className="h-4 w-4 text-amber-400" />
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-wider text-neutral-400">Activos en login</div>
                            <div className="font-['Orbitron'] text-sm font-semibold text-amber-200">
                                {readyCount} / {providers.length}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {providers.map((provider) => (
                        <ProviderCard key={provider.key} provider={provider} />
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}

function ProviderCard({ provider }: { provider: SocialProviderAdminItem }) {
    const [enabled, setEnabled] = useState(provider.enabled);
    const [clientId, setClientId] = useState(provider.client_id);
    const [clientSecret, setClientSecret] = useState('');
    const [tenant, setTenant] = useState(provider.tenant);
    const [clearSecret, setClearSecret] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    useEffect(() => {
        setEnabled(provider.enabled);
        setClientId(provider.client_id);
        setTenant(provider.tenant);
        setClientSecret('');
        setClearSecret(false);
    }, [provider.enabled, provider.client_id, provider.tenant, provider.has_secret]);

    const dirty =
        enabled !== provider.enabled ||
        clientId.trim() !== provider.client_id ||
        tenant.trim() !== provider.tenant ||
        clientSecret.trim() !== '' ||
        clearSecret;

    const statusBadge = provider.ready
        ? { label: 'Activo en login', cls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' }
        : provider.enabled
          ? { label: 'Faltan credenciales', cls: 'border-amber-500/40 bg-amber-500/15 text-amber-300' }
          : { label: 'Desactivado', cls: 'border-neutral-700 bg-neutral-900 text-neutral-400' };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(provider.callback_url);
            setCopied(true);
            toast.success(`Callback URL de ${provider.name} copiada`);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error('No se pudo copiar al portapapeles');
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorText(null);
        setSaving(true);

        router.put(
            `/auth-providers/${provider.key}`,
            {
                enabled,
                client_id: clientId.trim(),
                client_secret: clientSecret.trim(),
                tenant: tenant.trim(),
                clear_secret: clearSecret,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    const msg = typeof first === 'string' ? first : `No se pudo guardar ${provider.name}`;
                    setErrorText(msg);
                    toast.error(msg);
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <form
            onSubmit={handleSave}
            className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-950/75 p-5 transition hover:border-amber-500/35"
        >
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-neutral-900 text-amber-200">
                            <BrandIcon provider={provider.key} className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-semibold text-neutral-100">{provider.name}</h2>
                                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadge.cls}`}>
                                    {statusBadge.label}
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-neutral-400">{provider.description}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`Activar ${provider.name}`}
                        onClick={() => setEnabled((prev) => !prev)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition ${
                            enabled ? 'border-amber-400/70 bg-amber-500' : 'border-neutral-700 bg-neutral-800'
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 rounded-full bg-neutral-950 shadow transition-transform ${
                                enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                <div className="rounded-lg border border-neutral-800/90 bg-neutral-900/50 p-2.5">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                        <span>Redirect / Callback URI</span>
                        <a
                            href={provider.portal_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200"
                        >
                            {provider.portal_label}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded bg-neutral-950 px-2 py-1 font-mono text-xs text-neutral-200 select-all">
                            {provider.callback_url}
                        </code>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="inline-flex shrink-0 items-center gap-1 rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 hover:border-amber-500/50 hover:text-amber-200"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copiada' : 'Copiar'}
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-neutral-300">Client ID</label>
                        <input
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder={`Client ID de ${provider.name}`}
                            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-amber-500/60 focus:outline-none"
                        />
                    </div>

                    <div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <label className="text-xs font-medium text-neutral-300">Client Secret</label>
                            {provider.has_secret && !clearSecret && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setClearSecret(true);
                                        setClientSecret('');
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Borrar secreto ({provider.secret_hint})
                                </button>
                            )}
                            {clearSecret && (
                                <button
                                    type="button"
                                    onClick={() => setClearSecret(false)}
                                    className="text-[11px] text-amber-300 hover:text-amber-200"
                                >
                                    Cancelar borrado
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type={showSecret ? 'text' : 'password'}
                                value={clientSecret}
                                disabled={clearSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder={
                                    clearSecret
                                        ? 'Se eliminará al guardar'
                                        : provider.has_secret
                                          ? `Guardado (${provider.secret_hint}) — déjalo vacío para mantenerlo`
                                          : `Pega el Client Secret de ${provider.name}`
                                }
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-2 pr-10 pl-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-amber-500/60 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecret((prev) => !prev)}
                                className="absolute inset-y-0 right-2.5 flex items-center text-neutral-400 hover:text-neutral-200"
                                aria-label={showSecret ? 'Ocultar secreto' : 'Mostrar secreto'}
                            >
                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {provider.needs_tenant && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-300">{provider.tenant_label}</label>
                            <input
                                type="text"
                                value={tenant}
                                onChange={(e) => setTenant(e.target.value)}
                                placeholder={provider.tenant_placeholder}
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-amber-500/60 focus:outline-none"
                            />
                        </div>
                    )}
                </div>

                {errorText && <p className="text-xs text-rose-400">{errorText}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-neutral-800/80 pt-3">
                <span className="text-xs text-neutral-500">
                    {dirty ? 'Cambios sin guardar' : provider.ready ? 'Listo para usuarios' : 'Configura ID y Secret para activarlo'}
                </span>

                <button
                    type="submit"
                    disabled={saving || !dirty}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-neutral-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </form>
    );
}
