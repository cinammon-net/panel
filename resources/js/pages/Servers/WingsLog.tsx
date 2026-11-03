import WingsConsole from '@/components/wings-console';
import ServerLayout from '@/layouts/server-layout';
import { Head } from '@inertiajs/react';
import { ScrollText } from 'lucide-react';

interface PageProps {
    server: { id: number; name: string; uuid: string; owner_id?: number };
    tier: 'owner' | 'full' | 'ops' | 'own';
}

export default function WingsLogPage({ server }: PageProps) {
    return (
        <ServerLayout server={server} section="wingslog">
            <Head title={`${server.name} · Registro de Wings - Cinammon`} />
            <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-5 dark:border-cyan-900/60">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                        <ScrollText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase sm:text-2xl dark:text-white">Registro de Wings</h1>
                        <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                            Lo que el nodo hace con <span className="font-semibold text-cyan-500">{server.name}</span>: encendidos, apagados, fallos e instalaciones.
                        </p>
                    </div>
                </div>

                <WingsConsole endpoint={`/servers/${server.id}/wings-log/events`} showServer={false} />

                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Es solo de lectura. La salida del propio servidor (por ejemplo la consola de Minecraft) está en la sección <strong>Consola</strong>.
                </p>
            </div>
        </ServerLayout>
    );
}
