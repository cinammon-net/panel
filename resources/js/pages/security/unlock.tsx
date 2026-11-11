import InputError from '@/components/input-error';
import { ServerConsolePreview } from '@/components/server-lock-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { Clock, Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface RememberOption {
    minutes: number;
    label: string;
}

interface UnlockProps {
    defaultRememberMinutes?: number;
    rememberOptions?: RememberOption[];
}

const FALLBACK_OPTIONS: RememberOption[] = [
    { minutes: 15, label: '15 minutos' },
    { minutes: 30, label: '30 minutos (recomendado)' },
    { minutes: 120, label: '2 horas' },
    { minutes: 720, label: '12 horas' },
    { minutes: 1440, label: '24 horas' },
];

export default function Unlock({ defaultRememberMinutes = 30, rememberOptions = FALLBACK_OPTIONS }: UnlockProps) {
    const [showCode, setShowCode] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        remember_minutes: defaultRememberMinutes,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('server-lock.unlock.submit'), { onFinish: () => reset('code') });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 py-10 font-sans text-white">
            <Head title="Servidor protegido" />

            {/* Vista previa del servidor difuminada detrás del candado */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 opacity-45 blur-[8px] select-none">
                <div className="w-full max-w-4xl scale-105 space-y-4">
                    <ServerConsolePreview
                        serverName="mi-servidor"
                        badge="LISTO PARA ABRIR"
                        footer="Consola, archivos, copias de seguridad y ajustes del servidor."
                    />
                </div>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-black/60 backdrop-blur-xs" />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-pink-500/35 bg-neutral-950/90 p-7 shadow-2xl">
                <div className="mb-6 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-pink-500/45 bg-pink-500/10 text-pink-300 shadow-[0_0_25px_rgba(245,158,11,0.18)]">
                            <Lock className="h-7 w-7" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-wide text-pink-400">Servidor protegido</h1>
                    <p className="mt-1.5 text-sm text-neutral-300">Introduce tu código de seguridad para abrir tus servidores.</p>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="code">Código de seguridad</Label>
                        <div className="relative">
                            <Input
                                id="code"
                                type={showCode ? 'text' : 'password'}
                                name="code"
                                autoComplete="off"
                                autoFocus
                                placeholder="••••••"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCode((v) => !v)}
                                className="absolute inset-y-0 right-2.5 flex items-center text-neutral-400 hover:text-neutral-200"
                                aria-label={showCode ? 'Ocultar código' : 'Mostrar código'}
                            >
                                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <InputError message={errors.code} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="remember_minutes" className="flex items-center gap-1.5 text-xs text-neutral-300">
                            <Clock className="h-3.5 w-3.5 text-pink-300" />
                            Mantener guardado si no pasan más de
                        </Label>
                        <select
                            id="remember_minutes"
                            value={data.remember_minutes}
                            onChange={(e) => setData('remember_minutes', Number(e.target.value))}
                            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100 focus:border-pink-500/60 focus:outline-none"
                        >
                            {rememberOptions.map((opt) => (
                                <option key={opt.minutes} value={opt.minutes}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.remember_minutes} />
                    </div>

                    <Button type="submit" className="mt-1 w-full" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Desbloquear
                    </Button>

                    <p className="pt-1 text-center text-xs text-neutral-400">
                        ¿No funciona o olvidaste tu código? El Owner del panel puede restablecerlo o cambiarlo desde{' '}
                        <span className="text-neutral-200">Usuarios</span>.{' '}
                        <Link href="/servers" className="text-pink-300 hover:underline">
                            Volver a mis servidores
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
