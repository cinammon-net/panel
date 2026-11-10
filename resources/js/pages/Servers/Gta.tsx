import GtaPanel, { gtaModsTitle } from '@/components/server/gta-panel';
import ServerLayout from '@/layouts/server-layout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Puzzle, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
    server: { id: number; name: string; owner_id?: number; egg?: string | null; kind: string };
    view: 'online' | 'mods';
};

/** Jugadores o Resources/Mods de un servidor de GTA (páginas del menú lateral). */
export default function Gta({ server, view }: Props) {
    const [running, setRunning] = useState(false);

    // Estado del servidor para saber si se puede consultar y expulsar.
    useEffect(() => {
        let alive = true;
        const check = async () => {
            try {
                const { data } = await axios.get<{ state: string }>(`/servers/${server.id}/usage`);
                if (alive) setRunning(data.state === 'running');
            } catch {
                /* se mantiene el último estado */
            }
        };
        void check();
        const timer = window.setInterval(() => !document.hidden && void check(), 15000);
        return () => {
            alive = false;
            window.clearInterval(timer);
        };
    }, [server.id]);

    const mods = view === 'mods';
    const title = mods ? gtaModsTitle(server.kind) : 'Jugadores';
    const Icon = mods ? Puzzle : UsersRound;

    return (
        <ServerLayout server={server} section={mods ? 'gta-mods' : 'gta-players'}>
            <Head title={`${server.name} · ${title} - Cinammon`} />

            <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-5 dark:border-cyan-900/60">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase sm:text-2xl dark:text-white">{title}</h1>
                        <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                            {mods
                                ? `Todo lo instalado en ${server.egg ?? 'el servidor'} y si arranca con el servidor.`
                                : 'Quién está conectado ahora mismo, con su ping y puntuación.'}
                        </p>
                    </div>
                </div>

                <GtaPanel serverId={server.id} running={running} view={view} />
            </div>
        </ServerLayout>
    );
}
