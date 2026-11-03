import { Head, Link, useForm } from '@inertiajs/react';
import { LoaderCircle, Lock } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Unlock() {
    const { data, setData, post, processing, errors, reset } = useForm({ code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('server-lock.unlock.submit'), { onFinish: () => reset('code') });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 font-sans text-white">
            <Head title="Servidor protegido" />
            <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-pink-500/10 via-purple-700/10 to-blue-500/10" />
            <div className="relative z-10 w-full max-w-md rounded-xl border border-pink-500/30 bg-black/90 p-8 shadow-2xl">
                <div className="mb-6 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-pink-500/40 bg-pink-500/10 text-pink-300">
                            <Lock className="h-8 w-8" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-wide text-pink-400">Servidor protegido</h1>
                    <p className="mt-2 text-sm text-pink-200">Introduce tu código de seguridad para acceder a tus servidores.</p>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="code">Código de seguridad</Label>
                        <Input
                            id="code"
                            type="password"
                            name="code"
                            autoComplete="off"
                            autoFocus
                            placeholder="••••••"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                        />
                        <InputError message={errors.code} />
                    </div>

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Desbloquear
                    </Button>

                    <p className="text-center text-xs text-neutral-400">
                        ¿Olvidaste tu código? Contacta con soporte para restablecerlo.{' '}
                        <Link href="/servers" className="text-pink-300 hover:underline">
                            Volver a mis servidores
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
