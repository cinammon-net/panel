import { Head, useForm, Link } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, ReactNode } from 'react';

import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';

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
                    <h1 className="text-3xl font-bold tracking-wide text-pink-400">Verfica tú correo</h1>
                    {description && <p className="mt-2 text-sm text-pink-200">{description}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <AuthLayout title='Verificación' description="Verifica tu correo haciendo clic en el enlace que te acabamos de enviar.">
            <Head title="Verificación de correo" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-500">
                    Se ha enviado un nuevo enlace de verificación al correo proporcionado.
                </div>
            )}

            <form onSubmit={submit} className="space-y-6 text-center">
                <Button className="bg-pink-600 transition-all hover:bg-pink-700" disabled={processing}>
                    {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Reenviar correo de verificación
                </Button>

                <TextLink href={route('logout')} method="post" className="mx-auto block text-sm text-pink-400 hover:underline">
                    Cerrar sesión
                </TextLink>
            </form>
        </AuthLayout>
    );
}
