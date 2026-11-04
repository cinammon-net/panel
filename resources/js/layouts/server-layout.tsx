import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import MaintenanceBanner from '@/components/maintenance-banner';
import ServerSidebar from '@/components/server/server-sidebar';
import { type BreadcrumbItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LockOpen } from 'lucide-react';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

export type ServerSection =
    | 'console'
    | 'startup'
    | 'files'
    | 'addons'
    | 'sftp'
    | 'wingslog'
    | 'databases'
    | 'network'
    | 'backups'
    | 'mounts'
    | 'webhooks'
    | 'subdomains'
    | 'activity'
    | 'users'
    | 'edit';

export default function ServerLayout({
    server,
    section,
    children,
}: {
    server: { id: number; name: string; owner_id?: number };
    section: ServerSection;
    children: ReactNode;
}) {
    const { auth, serverLock, currentServer } = usePage<{
        auth?: { user?: { id: number } | null };
        serverLock?: { has_code: boolean; active: boolean } | null;
        currentServer?: { minecraft: boolean; addons: string | null } | null;
    }>().props;
    const showLockNotice =
        auth?.user?.id !== undefined && server.owner_id === auth.user.id && serverLock?.has_code === true && !serverLock.active;

    const sectionTitles: Record<string, string> = {
        console: 'Consola',
        startup: 'Inicio',
        files: 'Archivos',
        addons: currentServer?.addons === 'plugins' ? 'Plugins' : currentServer?.addons === 'mods' ? 'Mods' : 'Plugins y mods',
        sftp: 'Acceso SFTP',
        wingslog: 'Registro de Wings',
        databases: 'Bases de Datos',
        network: 'Red y Puertos',
        backups: 'Copias de Seguridad',
        mounts: 'Puntos de Montaje',
        webhooks: 'Webhooks',
        subdomains: 'Subdominios',
        activity: 'Actividad',
        users: 'Usuarios',
        edit: 'Configuración',
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Servers', href: '/servers' },
        { title: server.name, href: `/servers/${server.id}/console` },
        {
            title: sectionTitles[section] ?? section,
            href:
                section === 'users'
                    ? `/servers/${server.id}/subusers`
                    : `/servers/${server.id}/${section}`,
        },
    ];

    return (
        <AppShell variant="sidebar">
            <ServerSidebar server={server} section={section} />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <MaintenanceBanner />
                {showLockNotice && (
                    <Link
                        href="/settings/security"
                        className="flex items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                    >
                        <LockOpen className="h-4 w-4" />
                        El bloqueo de seguridad de tus servidores está desactivado. Pulsa aquí para reactivarlo.
                    </Link>
                )}
                <div className="min-h-screen bg-white font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                    <div className="min-w-0 flex-1">{children}</div>
                </div>
                <footer>
                    <div className="flex justify-center p-3">
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 font-[Orbitron]">
                            <span>© {new Date().getFullYear()} - Powered by </span>
                            <a
                                href="https://wiki.cinammon.net"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300"
                            >
                                Cinammon
                            </a>
                        </div>
                    </div>
                </footer>
                <Toaster position="top-center" richColors />
            </AppContent>
        </AppShell>
    );
}
