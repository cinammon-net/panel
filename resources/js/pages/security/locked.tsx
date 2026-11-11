import { BlurredLockOverlay } from '@/components/server-lock-preview';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface LockedProps {
    serverName: string;
    title: string;
    message: string;
    note?: string | null;
}

export default function Locked({ serverName, title, message, note }: LockedProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Servidores', href: '/servers' },
        { title: serverName, href: '/servers' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${title} · ${serverName}`} />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
                <BlurredLockOverlay
                    serverName={serverName}
                    badge="Acceso bloqueado"
                    title={title}
                    message={message}
                    note={note ?? undefined}
                    minHeightClass="min-h-[380px]"
                >
                    <div className="flex justify-center">
                        <Button asChild variant="outline" className="gap-2 border-pink-500/40 bg-black/70 text-pink-200 hover:bg-pink-500/15">
                            <Link href="/servers">
                                <ArrowLeft className="h-4 w-4" />
                                Volver a la lista de servidores
                            </Link>
                        </Button>
                    </div>
                </BlurredLockOverlay>
            </div>
        </AppLayout>
    );
}
