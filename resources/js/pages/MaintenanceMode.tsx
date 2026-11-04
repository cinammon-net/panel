import { fmtCountdown, fmtDate, type MaintenanceInfo } from '@/components/maintenance-banner';
import { Head, Link } from '@inertiajs/react';
import { Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Página que ven los usuarios (no admin) mientras el panel está en mantenimiento. */
export default function MaintenanceMode({ maintenance }: { maintenance: MaintenanceInfo }) {
    const [now, setNow] = useState(() => Date.now());
    const end = maintenance.ends_at ? new Date(maintenance.ends_at).getTime() : null;

    useEffect(() => {
        const t = setInterval(() => {
            setNow(Date.now());
            // Al terminar la ventana, recarga para volver al panel.
            if (end && Date.now() > end + 5000) window.location.reload();
        }, 15000);
        return () => clearInterval(t);
    }, [end]);

    return (
        <>
            <Head title="En mantenimiento" />
            <div className="flex min-h-svh items-center justify-center bg-black p-6 font-[Orbitron] text-white">
                <div className="w-full max-w-lg rounded-2xl border border-red-500/40 bg-gradient-to-b from-red-950/40 to-black p-8 text-center shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-red-500/50 bg-red-500/10">
                        <Wrench className="h-7 w-7 animate-pulse text-red-300" />
                    </div>
                    <p className="text-[11px] font-bold tracking-[0.25em] text-red-300 uppercase">En mantenimiento</p>
                    <h1 className="mt-2 text-2xl font-black">{maintenance.title}</h1>
                    {maintenance.message && <p className="mt-4 font-sans text-sm leading-relaxed text-neutral-300">{maintenance.message}</p>}
                    <div className="mt-6 rounded-lg border border-neutral-800 bg-black/60 p-4 text-sm">
                        {end ? (
                            <>
                                <p className="text-neutral-400">Volvemos aproximadamente el</p>
                                <p className="mt-1 text-lg font-bold text-cyan-300">{fmtDate(maintenance.ends_at!)}</p>
                                <p className="mt-1 text-xs text-neutral-500">{end > now ? `quedan ${fmtCountdown(end - now)}` : 'en unos instantes…'}</p>
                            </>
                        ) : (
                            <p className="text-neutral-300">Volveremos lo antes posible.</p>
                        )}
                    </div>
                    <p className="mt-6 font-sans text-xs text-neutral-500">
                        Tus servidores conservan sus archivos. Esta página se actualiza sola.
                    </p>
                    <Link href="/login" className="mt-4 inline-block text-xs text-neutral-600 hover:text-neutral-400">
                        Acceso de administración
                    </Link>
                </div>
            </div>
        </>
    );
}
