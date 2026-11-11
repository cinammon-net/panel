import { FolderOpen, Lock, Settings, Terminal } from 'lucide-react';
import { type ReactNode } from 'react';

const CONSOLE_LINES = [
    '[12:13:12 INFO]: Done (8.230s)! For help, type "help"',
    '[12:13:21 INFO]: [Server] Cargando mundo y complementos...',
    '[12:14:02 INFO]: Steve joined the game',
    '[12:14:40 INFO]: Steve: bienvenido a mi servidor',
    '[12:15:08 INFO]: Guardando estado del servidor...',
];

export function ServerConsolePreview({
    serverName = 'mi-servidor',
    badge = 'EN LÍNEA',
    footer = '✔ Acceso concedido: consola, archivos y ajustes disponibles.',
}: {
    serverName?: string;
    badge?: string;
    footer?: string;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-black/85 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-3 text-neutral-300">
                    <span className="flex items-center gap-1.5 font-medium text-neutral-100">
                        <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                        {serverName} · Consola
                    </span>
                    <span className="hidden items-center gap-2 text-[11px] text-neutral-500 sm:inline-flex">
                        <span className="inline-flex items-center gap-1 text-emerald-300/80">
                            <FolderOpen className="h-3 w-3" /> Archivos
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Settings className="h-3 w-3" /> Ajustes
                        </span>
                    </span>
                </div>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {badge}
                </span>
            </div>

            <div className="space-y-1.5 p-3.5 font-mono text-[11px] text-emerald-200/90">
                {CONSOLE_LINES.map((line) => (
                    <p key={line} className="truncate">
                        {line}
                    </p>
                ))}
            </div>

            <p className="border-t border-neutral-800 px-3.5 py-2 text-[11px] text-emerald-300">{footer}</p>
        </div>
    );
}

export function BlurredLockOverlay({
    serverName = 'mi-servidor',
    badge,
    title,
    message,
    note,
    children,
    minHeightClass = 'min-h-[220px]',
}: {
    serverName?: string;
    badge?: string;
    title: string;
    message?: string;
    note?: string;
    children?: ReactNode;
    minHeightClass?: string;
}) {
    return (
        <div className={`relative overflow-hidden rounded-xl border border-pink-500/30 bg-neutral-950/90 ${minHeightClass}`}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 scale-[1.02] opacity-55 blur-[6px] select-none">
                <ServerConsolePreview serverName={serverName} />
            </div>

            <div className={`relative z-10 flex flex-col items-center justify-center bg-black/55 p-5 text-center backdrop-blur-xs ${minHeightClass}`}>
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-pink-500/45 bg-neutral-950/90 text-pink-300 shadow-[0_0_24px_rgba(245,158,11,0.18)]">
                    <Lock className="h-6 w-6" />
                </div>

                {badge && (
                    <span className="mb-1.5 rounded-full border border-pink-500/35 bg-pink-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-pink-200 uppercase">
                        {badge}
                    </span>
                )}

                <h3 className="text-base font-bold text-neutral-100">{title}</h3>
                {message && <p className="mt-1 max-w-md text-xs text-neutral-300">{message}</p>}
                {note && <p className="mt-2 max-w-md text-[11px] text-neutral-400">{note}</p>}

                {children && <div className="mt-4 w-full max-w-sm">{children}</div>}
            </div>
        </div>
    );
}
