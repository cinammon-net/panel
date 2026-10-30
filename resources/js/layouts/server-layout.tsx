import AppLayout from '@/layouts/app-layout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Files, Settings, Terminal } from 'lucide-react';
import { ReactNode } from 'react';

export default function ServerLayout({
    server,
    section,
    children,
}: {
    server: { id: number; name: string };
    section: 'console' | 'files';
    children: ReactNode;
}) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Servers', href: '/servers' },
                { title: server.name, href: `/servers/${server.id}/${section}` },
                { title: section === 'files' ? 'Archivos' : 'Consola', href: `/servers/${server.id}/${section}` },
            ]}
        >
            <div className="min-h-screen bg-white font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-700 bg-neutral-950 px-6 py-3">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/servers"
                            className="flex items-center gap-2 rounded border border-cyan-500/50 bg-cyan-900/30 px-3 py-1.5 text-xs text-cyan-300 transition hover:bg-cyan-700/50"
                        >
                            <ArrowLeft size={15} /> Volver a Servers
                        </Link>
                        <div>
                            <span className="text-[10px] tracking-widest text-cyan-500 uppercase">SERVIDOR ACTIVO</span>
                            <p className="text-sm font-semibold text-white">{server.name}</p>
                        </div>
                    </div>
                    <nav aria-label="Secciones del servidor" className="flex flex-wrap items-center gap-2">
                        {[
                            { key: 'console', label: 'Consola', icon: Terminal, href: `/servers/${server.id}/console` },
                            { key: 'files', label: 'Archivos', icon: Files, href: `/servers/${server.id}/files` },
                            { key: 'edit', label: 'Configuración', icon: Settings, href: `/servers/${server.id}/edit` },
                        ].map((item) => (
                            <Link
                                key={item.key}
                                href={item.href}
                                aria-current={section === item.key ? 'page' : undefined}
                                className={`flex items-center gap-2 rounded border px-4 py-1.5 text-xs font-semibold transition ${
                                    section === item.key
                                        ? 'border-cyan-400 bg-cyan-500 text-black shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                                        : 'border-cyan-500/40 bg-cyan-900/20 text-cyan-300 hover:bg-cyan-700/40'
                                }`}
                            >
                                <item.icon size={15} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </AppLayout>
    );
}
