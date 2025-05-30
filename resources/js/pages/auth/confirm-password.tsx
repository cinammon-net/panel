import { Head, useForm, Link } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, ReactNode } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function AuthLayout({ description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 font-sans text-white">
            <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-pink-500/10 via-purple-700/10 to-blue-500/10" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,#ff44cc33_1px,transparent_1px)] bg-[length:20px_20px] opacity-10" />
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-pink-500/20 p-8 shadow-2xl">
                <div className="animate-spin-slow absolute top-[-50%] left-[-50%] z-[-2] h-[200%] w-[200%] bg-[conic-gradient(from_0deg,#ff44cc,#5500ff,#44ccff,#ff44cc)]" />
                <div className="absolute inset-1 z-[-1] rounded-[0.625rem] bg-black/90" />
                <div className="mb-6 text-center">
                    <div className="mb-4 flex justify-center">
                        <Link href="/">
                            <img src="favicon.ico" alt="Cinammon.net Logo" className="h-20 transition hover:opacity-80 sm:h-22" draggable={false} />
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-wide text-pink-400">Confirma correo </h1>
                    {description && <p className="mt-2 text-sm text-pink-200">{description}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm<Required<{ password: string }>>({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="Confirmación" description="Confirma tu contraseña para continuar.">
            <Head title="Confirmar contraseña" />

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={data.password}
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        className="border-pink-600/30 bg-black/80 text-white focus:border-pink-500 focus-visible:ring-pink-500"
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="mt-4">
                    <Button className="w-full bg-pink-600 transition-all hover:bg-pink-700" disabled={processing}>
                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar contraseña
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}
