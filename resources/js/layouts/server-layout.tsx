import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import ServerSidebar from '@/components/server/server-sidebar';
import { type BreadcrumbItem } from '@/types';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

export default function ServerLayout({
    server,
    section,
    children,
}: {
    server: { id: number; name: string };
    section: 'console' | 'files' | 'edit';
    children: ReactNode;
}) {
    const sectionTitles: Record<string, string> = {
        console: 'Consola',
        files: 'Archivos',
        edit: 'Configuración',
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Servers', href: '/servers' },
        { title: server.name, href: `/servers/${server.id}/console` },
        { title: sectionTitles[section] ?? section, href: `/servers/${server.id}/${section}` },
    ];

    return (
        <AppShell variant="sidebar">
            <ServerSidebar server={server} section={section} />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
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
