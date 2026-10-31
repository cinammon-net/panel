import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpenCheck,
    Files,
    FolderGit2,
    LayoutGrid,
    Server as ServerIcon,
    Settings,
    Terminal,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';

const footerNavItems = [
    {
        title: 'Repository',
        href: 'https://github.com/cinammon-es/panel',
        icon: FolderGit2,
        group: 'extra' as const,
        groupColor: 'text-yellow-400',
    },
    {
        title: 'Documentation',
        href: 'https://cinammon.net/docs/panel',
        icon: BookOpenCheck,
        group: 'extra' as const,
        groupColor: 'text-yellow-400',
    },
];

export default function ServerSidebar({
    server,
    section,
}: {
    server: { id: number; name: string };
    section: 'console' | 'files' | 'edit';
}) {
    const serverNavItems = [
        {
            key: 'console',
            title: 'Consola',
            href: `/servers/${server.id}/console`,
            icon: Terminal,
            color: 'text-cyan-400',
        },
        {
            key: 'files',
            title: 'Archivos',
            href: `/servers/${server.id}/files`,
            icon: Files,
            color: 'text-cyan-400',
        },
        {
            key: 'edit',
            title: 'Configuración',
            href: `/servers/${server.id}/edit`,
            icon: Settings,
            color: 'text-cyan-400',
        },
    ];

    return (
        <Sidebar
            collapsible="icon"
            variant="floating"
            className="border-r border-neutral-300 bg-white font-[Orbitron] transition-colors dark:border-cyan-500/40 dark:bg-black"
        >
            <SidebarHeader className="border-b border-neutral-300 p-3 dark:border-cyan-900/60 space-y-3">
                <div className="flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <AppLogo />
                    </Link>
                </div>

                <Link
                    href="/servers"
                    className="flex items-center gap-2 rounded-md border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:border-cyan-800/60 dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:border-cyan-500 dark:hover:bg-cyan-900/40"
                >
                    <ArrowLeft size={13} className="shrink-0" />
                    <span>Volver a Servidores</span>
                </Link>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 dark:border-cyan-800/80 dark:bg-neutral-900/90 shadow-inner">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase">
                            SERVIDOR ACTIVO
                        </span>
                        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-neutral-900 dark:text-white" title={server.name}>
                        {server.name}
                    </p>
                </div>
            </SidebarHeader>

            <SidebarContent className="pt-4">
                <SidebarGroup className="px-2 py-1">
                    <SidebarGroupLabel className="px-2 text-xs font-bold text-cyan-500 tracking-wider uppercase">
                        Gestión del Servidor
                    </SidebarGroupLabel>
                    <SidebarMenu className="mt-1 space-y-1">
                        {serverNavItems.map((item) => {
                            const isCurrent = section === item.key;
                            return (
                                <SidebarMenuItem key={item.key}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrent}
                                        tooltip={{ children: item.title }}
                                        className={
                                            isCurrent
                                                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.25)] dark:bg-cyan-950/60'
                                                : 'text-neutral-600 dark:text-neutral-300 hover:text-cyan-400 dark:hover:text-cyan-300 hover:bg-cyan-500/10'
                                        }
                                    >
                                        <Link href={item.href} className="flex items-center gap-3">
                                            <item.icon
                                                className={`h-4 w-4 ${item.color}`}
                                                style={{
                                                    filter: isCurrent ? 'drop-shadow(0 0 6px currentColor)' : undefined,
                                                }}
                                            />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup className="px-2 py-1 mt-4">
                    <SidebarGroupLabel className="px-2 text-xs font-bold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                        Navegación General
                    </SidebarGroupLabel>
                    <SidebarMenu className="mt-1 space-y-1">
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={{ children: 'Servidores' }}>
                                <Link href="/servers" className="flex items-center gap-3 text-neutral-400 hover:text-white">
                                    <ServerIcon className="h-4 w-4 text-blue-400" />
                                    <span>Servidores</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={{ children: 'Dashboard' }}>
                                <Link href="/dashboard" className="flex items-center gap-3 text-neutral-400 hover:text-white">
                                    <LayoutGrid className="h-4 w-4 text-purple-400" />
                                    <span>Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="mt-auto border-t border-neutral-300 dark:border-cyan-900/60">
                <div className="space-y-2 [&_a]:flex [&_a]:items-center [&_a]:gap-3 [&_a]:rounded-md [&_a]:px-3 [&_a]:py-2 [&_a]:transition-all [&_a]:hover:bg-neutral-100 [&_a]:hover:text-black dark:[&_a]:hover:bg-cyan-500/10 dark:[&_a]:hover:text-cyan-400">
                    <NavFooter items={footerNavItems} />
                </div>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

