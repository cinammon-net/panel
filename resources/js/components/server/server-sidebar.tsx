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
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Archive,
    ArrowLeft,
    BookOpenCheck,
    Database,
    Files,
    FolderGit2,
    FolderTree,
    Globe,
    Network,
    Settings,
    Terminal,
    Users,
    Webhook,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { ServerSection } from '@/layouts/server-layout';

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
    server: { id: number; name: string; owner_id?: number };
    section: ServerSection;
}) {
    const page = usePage();
    const { auth } = page.props as any;
    const user = auth?.user;
    const userRoles: string[] = user?.roles ?? [];
    const isAdmin = userRoles.includes('Owner') || userRoles.includes('Admin');
    const isServerOwner = user && server?.owner_id ? user.id === server.owner_id : false;
    const canManageServer = isServerOwner || isAdmin;

    const navGroups = [
        {
            title: 'Gestión Principal',
            items: [
                {
                    key: 'console',
                    title: 'Consola',
                    href: `/servers/${server.id}/console`,
                    icon: Terminal,
                    color: 'text-cyan-400',
                    show: true,
                },
                {
                    key: 'files',
                    title: 'Archivos',
                    href: `/servers/${server.id}/files`,
                    icon: Files,
                    color: 'text-cyan-400',
                    show: true,
                },
                {
                    key: 'databases',
                    title: 'Bases de Datos',
                    href: `/servers/${server.id}/databases`,
                    icon: Database,
                    color: 'text-cyan-400',
                    show: true,
                },
                {
                    key: 'backups',
                    title: 'Copias de Seguridad',
                    href: `/servers/${server.id}/backups`,
                    icon: Archive,
                    color: 'text-cyan-400',
                    show: true,
                },
                {
                    key: 'network',
                    title: 'Red y Puertos',
                    href: `/servers/${server.id}/network`,
                    icon: Network,
                    color: 'text-cyan-400',
                    show: true,
                },
            ],
        },
        {
            title: 'Integraciones',
            items: [
                {
                    key: 'subdomains',
                    title: 'Subdominios',
                    href: `/servers/${server.id}/subdomains`,
                    icon: Globe,
                    color: 'text-cyan-400',
                    show: true,
                },
                {
                    key: 'mounts',
                    title: 'Puntos de Montaje',
                    href: `/servers/${server.id}/mounts`,
                    icon: FolderTree,
                    color: 'text-cyan-400',
                    show: true,
                },
                {
                    key: 'webhooks',
                    title: 'Webhooks',
                    href: `/servers/${server.id}/webhooks`,
                    icon: Webhook,
                    color: 'text-cyan-400',
                    show: true,
                },
                {
                    key: 'activity',
                    title: 'Actividad',
                    href: `/servers/${server.id}/activity`,
                    icon: Activity,
                    color: 'text-cyan-400',
                    show: true,
                },
            ],
        },
        {
            title: 'Administración',
            items: [
                {
                    key: 'users',
                    title: 'Usuarios',
                    href: `/servers/${server.id}/subusers`,
                    icon: Users,
                    color: 'text-cyan-400',
                    show: canManageServer,
                },
                {
                    key: 'edit',
                    title: 'Configuración',
                    href: `/servers/${server.id}/edit`,
                    icon: Settings,
                    color: 'text-cyan-400',
                    show: canManageServer,
                },
            ],
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

            <SidebarContent className="pt-2 pb-4 space-y-3">
                {navGroups.map((group) => {
                    const visibleItems = group.items.filter((item) => item.show);
                    if (visibleItems.length === 0) return null;

                    return (
                        <SidebarGroup key={group.title} className="px-2 py-0">
                            <SidebarGroupLabel className="px-2 text-[10px] font-bold text-cyan-500/80 tracking-wider uppercase">
                                {group.title}
                            </SidebarGroupLabel>
                            <SidebarMenu className="mt-1 space-y-0.5">
                                {visibleItems.map((item) => {
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
                                                <Link href={item.href} className="flex items-center gap-2.5 text-xs">
                                                    <item.icon
                                                        className={`h-4 w-4 ${item.color} shrink-0`}
                                                        style={{
                                                            filter: isCurrent ? 'drop-shadow(0 0 6px currentColor)' : undefined,
                                                        }}
                                                    />
                                                    <span className="truncate">{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroup>
                    );
                })}
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

