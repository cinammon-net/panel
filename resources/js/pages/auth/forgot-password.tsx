import { Head, useForm, Link } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, ReactNode } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
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
                    <h1 className="text-2xl font-bold tracking-wide text-pink-400 font-[Orbitron]">¿Olvidaste contraseña?</h1>
                    {description && <p className="mt-2 text-sm text-pink-200 font-[Orbitron]">{description}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm<Required<{ email: string }>>({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <AuthLayout title="Recuperación" description="Ingresa tu correo para recibir un enlace de recuperación">
            <Head title="Recuperar contraseña"> 
                <meta name="description" content="Ingresa tu correo para recibir un enlace de recuperación" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            {status && <div className="mb-4 text-center text-sm font-medium text-green-500">{status}</div>}

            <form onSubmit={submit} className="flex flex-col gap-6 font-[Orbitron]">
                <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="off"
                        value={data.email}
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="tucorreo@cinammon.net"
                        className="border-pink-600/30 bg-black/80 text-white focus:border-pink-500 focus-visible:ring-pink-500"
                    />
                    <InputError message={errors.email} />
                </div>

                <div className="my-6">
                    <Button className="w-full bg-pink-600 transition-all hover:bg-pink-700" disabled={processing}>
                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar enlace de recuperación
                    </Button>
                </div>

                <div className="text-center text-sm text-pink-300">
                    <span>¿Ya lo recordaste?</span>{' '}
                    <TextLink href={route('login')} className="text-pink-400 hover:underline">
                        Inicia sesión
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
