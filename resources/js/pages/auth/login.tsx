import { Head, useForm, Link } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, ReactNode } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
                    <h1 className="font-[Orbitron] text-3xl font-bold tracking-wide text-pink-400">Inicia Sesión</h1>
                    {description && <p className="font-[Orbitron] mt-2 text-sm text-pink-200">{description}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="Incia Sesión" description="Ingresa tu correo y contraseña para acceder al panel">
            <Head title="Iniciar sesión">
                <meta name="description" content="Ingresa tu correo y contraseña para acceder al panel" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <form className="flex flex-col gap-6 font-[Orbitron]" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="tucorreo@cinammon.net"
                            className="border-pink-600/30 bg-black/80 text-white focus:border-pink-500 focus-visible:ring-pink-500"
                        />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Contraseña</Label>
                            {canResetPassword && (
                                <TextLink href={route('password.request')} className="ml-auto text-sm text-pink-400 hover:underline" tabIndex={5}>
                                    ¿Olvidaste tu contraseña?
                                </TextLink>
                            )}
                        </div>
                        <Input
                            id="password"
                            type="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="••••••••"
                            className="border-pink-600/30 bg-black/80 text-white focus:border-pink-500 focus-visible:ring-pink-500"
                        />
                        <InputError message={errors.password} />
                    </div>
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            name="remember"
                            checked={data.remember}
                            onClick={() => setData('remember', !data.remember)}
                            tabIndex={3}
                        />
                        <Label htmlFor="remember">Recordarme</Label>
                    </div>
                    <Button type="submit" className="mt-4 w-full bg-pink-600 transition-all hover:bg-pink-700 font-[Orbitron]" disabled={processing} tabIndex={4}>
                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Entrar al panel
                    </Button>
                </div>
                <div className="mt-6 text-center text-sm text-pink-300">
                    ¿No tienes cuenta?{' '}
                    <TextLink href={route('register')} tabIndex={5} className="text-pink-400 hover:underline">
                        Regístrate
                    </TextLink>
                </div>
            </form>
            {status && <div className="mt-4 text-center text-sm font-medium text-green-500">{status}</div>}
        </AuthLayout>
    );
}
