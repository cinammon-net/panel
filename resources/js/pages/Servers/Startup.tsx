import ServerLayout from '@/layouts/server-layout';
import { Head, router } from '@inertiajs/react';
import { Box, Check, Copy, Eye, EyeOff, Info, Lock, Play, Save, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface StartupVariable {
    id: number;
    name: string;
    description?: string | null;
    env_variable: string;
    default_value?: string | null;
    value: string;
    rules?: string | null;
    editable: boolean;
}

interface PageProps {
    server: {
        id: number;
        name: string;
        uuid: string;
        owner_id?: number;
        egg: string;
    };
    startup: {
        raw: string;
        rendered: string;
        image: string;
        images: Record<string, string>;
    };
    variables: StartupVariable[];
}

const SECRET_PATTERN = /(TOKEN|PASSWORD|PASS|SECRET|KEY)/i;

function ruleList(rules?: string | null): string[] {
    return (rules ?? '').split('|').map((rule) => rule.trim());
}

function VariableField({
    variable,
    value,
    onChange,
    error,
}: {
    variable: StartupVariable;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    const [visible, setVisible] = useState(false);
    const rules = ruleList(variable.rules);
    const inRule = rules.find((rule) => rule.startsWith('in:'));
    const isBoolean = rules.includes('boolean');
    const isSecret = SECRET_PATTERN.test(variable.env_variable);
    const inputClass =
        'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-black/60 dark:text-cyan-100';

    let field;
    if (isBoolean) {
        field = (
            <select className={inputClass} value={value} disabled={!variable.editable} onChange={(e) => onChange(e.target.value)}>
                <option value="1">Sí (1)</option>
                <option value="0">No (0)</option>
            </select>
        );
    } else if (inRule) {
        const options = inRule.slice(3).split(',');
        field = (
            <select className={inputClass} value={value} disabled={!variable.editable} onChange={(e) => onChange(e.target.value)}>
                {!options.includes(value) && <option value={value}>{value || '—'}</option>}
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        );
    } else {
        field = (
            <div className="relative">
                <input
                    type={isSecret && !visible ? 'password' : 'text'}
                    className={`${inputClass} ${isSecret ? 'pr-10' : ''}`}
                    value={value}
                    disabled={!variable.editable}
                    placeholder={variable.default_value || ''}
                    autoComplete="off"
                    onChange={(e) => onChange(e.target.value)}
                />
                {isSecret && (
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-cyan-400"
                        title={visible ? 'Ocultar' : 'Mostrar'}
                    >
                        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold text-neutral-900 dark:text-white">{variable.name}</label>
                {!variable.editable && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
                        <Lock className="h-2.5 w-2.5" />
                        SOLO LECTURA
                    </span>
                )}
            </div>
            {field}
            {error && <p className="text-xs text-red-400">{error}</p>}
            {variable.description && <p className="text-xs text-neutral-500 dark:text-neutral-400">{variable.description}</p>}
            <p className="font-mono text-[10px] tracking-wider text-cyan-600 dark:text-cyan-500/80">{variable.env_variable}</p>
        </div>
    );
}

export default function StartupPage({ server, startup, variables = [] }: PageProps) {
    const initialValues = useMemo(() => Object.fromEntries(variables.map((v) => [v.env_variable, v.value ?? ''])), [variables]);
    const [values, setValues] = useState<Record<string, string>>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [image, setImage] = useState(startup.image);
    const [savingImage, setSavingImage] = useState(false);
    const [copied, setCopied] = useState(false);

    const editable = variables.filter((v) => v.editable);
    const dirty = editable.some((v) => (values[v.env_variable] ?? '') !== (initialValues[v.env_variable] ?? ''));
    const imageOptions = Object.entries(startup.images);
    const imageIsCustom = !Object.values(startup.images).includes(startup.image);

    const copyCommand = () => {
        navigator.clipboard.writeText(startup.rendered);
        setCopied(true);
        toast.success('Comando copiado al portapapeles.');
        setTimeout(() => setCopied(false), 2000);
    };

    const saveVariables = () => {
        const payload = Object.fromEntries(editable.map((v) => [v.env_variable, values[v.env_variable] ?? '']));
        setSaving(true);
        router.put(
            `/servers/${server.id}/startup/variables`,
            { variables: payload },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setErrors({});
                    toast.success('Variables guardadas. Reinicia el servidor para aplicarlas.');
                },
                onError: (err: Record<string, string>) => {
                    setErrors(Object.fromEntries(Object.entries(err).map(([key, message]) => [key.replace(/^variables\./, ''), message])));
                    toast.error('Revisa los campos marcados.');
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const saveImage = (next: string) => {
        setImage(next);
        setSavingImage(true);
        router.put(
            `/servers/${server.id}/startup/image`,
            { image: next },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Imagen actualizada. Reinicia el servidor para aplicarla.'),
                onError: (err: Record<string, string>) => {
                    setImage(startup.image);
                    toast.error(err.image || 'No se pudo cambiar la imagen.');
                },
                onFinish: () => setSavingImage(false),
            },
        );
    };

    return (
        <ServerLayout server={server} section="startup">
            <Head title={`${server.name} · Inicio - Cinammon`} />

            <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center dark:border-cyan-900/60">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Play className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase sm:text-2xl dark:text-white">Inicio</h1>
                            <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                                Cómo se ejecuta el egg <span className="font-semibold text-cyan-500">{server.egg}</span> al arrancar el servidor.
                            </p>
                        </div>
                    </div>
                </div>

                <section className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-cyan-900/60 dark:bg-neutral-900/60">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyan-600 uppercase dark:text-cyan-400">
                            <Play className="h-4 w-4" />
                            Comando de inicio
                        </h2>
                        <button
                            type="button"
                            onClick={copyCommand}
                            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-800/60 bg-cyan-950/30 px-2.5 py-1 text-xs text-cyan-300 hover:border-cyan-500"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            Copiar
                        </button>
                    </div>
                    <pre className="overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 font-mono text-xs break-all whitespace-pre-wrap text-neutral-800 dark:border-neutral-800 dark:bg-black/70 dark:text-cyan-100">
                        {startup.rendered || '—'}
                    </pre>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Este es el comando que ejecuta el contenedor, con las variables de abajo ya sustituidas.
                    </p>
                </section>

                <section className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-cyan-900/60 dark:bg-neutral-900/60">
                    <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyan-600 uppercase dark:text-cyan-400">
                        <Box className="h-4 w-4" />
                        Imagen de Docker
                    </h2>
                    {imageOptions.length > 1 || imageIsCustom ? (
                        <select
                            value={image}
                            disabled={savingImage}
                            onChange={(e) => saveImage(e.target.value)}
                            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 outline-none focus:border-cyan-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-black/60 dark:text-cyan-100"
                        >
                            {imageIsCustom && <option value={startup.image}>{startup.image} (personalizada)</option>}
                            {imageOptions.map(([label, value]) => (
                                <option key={value} value={value}>
                                    {label === value ? value : `${label} — ${value}`}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p className="rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-neutral-800 dark:bg-black/60 dark:text-cyan-100">
                            {startup.image}
                        </p>
                    )}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Elige la versión del entorno (por ejemplo Java o Node.js) que necesita tu servidor.
                    </p>
                </section>

                <section className="space-y-4">
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyan-600 uppercase dark:text-cyan-400">
                            <SlidersHorizontal className="h-4 w-4" />
                            Variables
                        </h2>
                        {editable.length > 0 && (
                            <button
                                type="button"
                                onClick={saveVariables}
                                disabled={!dirty || saving}
                                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Guardando…' : 'Guardar variables'}
                            </button>
                        )}
                    </div>

                    {variables.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {variables.map((variable) => (
                                <VariableField
                                    key={variable.id}
                                    variable={variable}
                                    value={values[variable.env_variable] ?? ''}
                                    error={errors[variable.env_variable]}
                                    onChange={(value) => setValues((current) => ({ ...current, [variable.env_variable]: value }))}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-xs text-cyan-200">
                            <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
                            <p>Este egg no tiene variables configurables.</p>
                        </div>
                    )}
                </section>
            </div>
        </ServerLayout>
    );
}
