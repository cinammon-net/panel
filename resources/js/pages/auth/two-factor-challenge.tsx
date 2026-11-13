import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cinLogo } from '@/lib/brand';
import { Head, useForm } from '@inertiajs/react';
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function TwoFactorChallenge() {
    const [useRecovery, setUseRecovery] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        code: '',
        recovery_code: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/two-factor-challenge');
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 font-sans text-white">
            <Head title="Verificación en Dos Pasos — Cinammon" />
            <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-pink-500/10 via-purple-700/10 to-blue-500/10" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,#ff44cc33_1px,transparent_1px)] bg-[length:20px_20px] opacity-10" />

            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-pink-500/20 p-8 shadow-2xl">
                <div className="animate-spin-slow absolute top-[-50%] left-[-50%] z-[-2] h-[200%] w-[200%] bg-[conic-gradient(from_0deg,#ff44cc,#5500ff,#44ccff,#ff44cc)]" />
                <div className="absolute inset-1 z-[-1] rounded-[0.625rem] bg-black/90" />

                <div className="mb-6 text-center">
                    <div className="mb-4 flex justify-center">
                        <a href="https://cinammon.net" title="Cinammon.net">
                            <img src={cinLogo()} alt="Cinammon Logo" className="h-16" draggable={false} />
                        </a>
                    </div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-500/40 bg-pink-500/10 text-pink-400 shadow-md shadow-pink-500/20">
                        {useRecovery ? <KeyRound className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                    </div>
                    <h1 className="font-[Orbitron] text-2xl font-bold tracking-wide text-pink-400">
                        Verificación 2FA
                    </h1>
                    <p className="mt-2 text-xs text-neutral-300">
                        {useRecovery
                            ? 'Introduce uno de tus códigos de recuperación de respaldo de un solo uso.'
                            : 'Introduce el código de 6 dígitos que aparece en tu aplicación de autenticación.'}
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {!useRecovery ? (
                        <div className="space-y-1">
                            <Label htmlFor="code" className="text-xs text-neutral-300">
                                Código de Autenticación
                            </Label>
                            <Input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                autoFocus
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="border-pink-500/30 bg-neutral-900/80 text-center font-mono text-2xl tracking-[0.3em] text-white focus:border-pink-500"
                            />
                            <InputError message={errors.code} />
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <Label htmlFor="recovery_code" className="text-xs text-neutral-300">
                                Código de Recuperación
                            </Label>
                            <Input
                                id="recovery_code"
                                type="text"
                                autoFocus
                                value={data.recovery_code}
                                onChange={(e) => setData('recovery_code', e.target.value.toUpperCase())}
                                placeholder="ABCDE-12345"
                                className="border-pink-500/30 bg-neutral-900/80 text-center font-mono text-base tracking-wider text-white focus:border-pink-500"
                            />
                            <InputError message={errors.code} />
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:from-pink-600 hover:to-purple-700"
                    >
                        {processing ? 'Verificando...' : 'Confirmar y Acceder'}
                    </Button>

                    <div className="pt-2 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setUseRecovery(!useRecovery);
                                setData({ code: '', recovery_code: '' });
                            }}
                            className="text-xs text-pink-400 transition hover:text-pink-300 hover:underline"
                        >
                            {useRecovery
                                ? '← Usar código de la aplicación de autenticación'
                                : '¿No tienes acceso a tu app? Usar código de recuperación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
