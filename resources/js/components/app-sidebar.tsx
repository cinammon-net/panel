import { NavFooter } from '@/components/nav-footer';
import { NavMain, NavItem } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link } from '@inertiajs/react';
import {
    Activity,
    BadgeInfo,
    BookOpenCheck,
    Bookmark,
    Database,
    Egg,
    FolderGit2,
    HeartPulse,
    KeyRound,
    LayoutGrid,
    Radio,
    Server,
    Settings,
    Ticket,
    Users,
    Webhook,
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
        group: 'main',
        groupColor: 'text-purple-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin'],
        permissions: ['view_server'],
    },
    {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        group: 'main',
        groupColor: 'text-purple-400',
        roles: ['Admin'],
        permissions: ['view_settings'],
    },

    {
        title: 'Eggs',
        href: '/eggs',
        icon: Egg,
        group: 'servers',
        groupColor: 'text-blue-400',
        roles: ['Admin'],
        permissions: ['view_list_egg'],
    },
    {
        title: 'Nodes',
        href: '/nodes',
        icon: Activity,
        group: 'servers',
        groupColor: 'text-blue-400',
        roles: ['Admin'],
        permissions: ['view_list_node'],
    },
    {
        title: 'Servers',
        href: '/servers',
        icon: Server,
        group: 'servers',
        groupColor: 'text-blue-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin'],
        permissions: ['view_server'],
    },

    {
        title: 'Roles',
        href: '/roles',
        icon: BadgeInfo,
        group: 'users',
        groupColor: 'text-pink-400',
        roles: ['Admin'],
        permissions: ['view_user'],
    },
    {
        title: 'Users',
        href: '/users',
        icon: Users,
        group: 'users',
        groupColor: 'text-pink-400',
        roles: ['Admin', 'Moderator', 'Helper'], 
        permissions: ['view_list_user'],
    },

    {
        title: 'Health',
        href: '/health',
        icon: HeartPulse,
        group: 'advanced',
        groupColor: 'text-orange-400',
        roles: ['Admin', 'Moderator', 'Helper', 'Sponsors'],
        permissions: ['view_health'],
    },
    {
        title: 'API Keys',
        href: '/api-keys',
        icon: KeyRound,
        group: 'advanced',
        groupColor: 'text-orange-400',
        roles: ['Admin'],
        permissions: ['view_settings'],
    },
    {
        title: 'Database Host',
        href: '/database',
        icon: Database,
        group: 'advanced',
        groupColor: 'text-orange-400',
        roles: ['Admin'],
        permissions: ['view_settings'],
    },
    {
        title: 'Mounts',
        href: '/mounts',
        icon: Radio,
        group: 'advanced',
        groupColor: 'text-orange-400',
        roles: ['Admin'],
        permissions: ['view_mount'],
    },
    {
        title: 'Webhooks',
        href: '/webhooks',
        icon: Webhook,
        group: 'advanced',
        groupColor: 'text-orange-400',
        roles: ['Admin'],
        permissions: ['view_webhook'],
    },

    {
        title: 'Posts',
        href: '/posts',
        icon: Bookmark,
        group: 'extra',
        groupColor: 'text-yellow-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin'],
        permissions: [],
    },
    {
        title: 'Tickets',
        href: '/tickets',
        icon: Ticket,
        group: 'extra',
        groupColor: 'text-yellow-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin'],
        permissions: [],
    },
    {
        title: 'Reviews',
        href: '/reviews',
        icon: HeartPulse,
        group: 'extra',
        groupColor: 'text-yellow-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin'],
        permissions: [],
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/cinammon-es/panel',
        icon: FolderGit2,
        group: 'extra',
        groupColor: 'text-yellow-400',
    },
    {
        title: 'Documentation',
        href: 'https://cinammon.net/docs/panel',
        icon: BookOpenCheck,
        group: 'extra',
        groupColor: 'text-yellow-400',
    },
];

export function AppSidebar() {
    return (
        <Sidebar
            collapsible="icon"
            variant="floating"
            className="border-r border-neutral-300 bg-white font-[Orbitron] transition-colors dark:border-pink-500 dark:bg-black"
        >
            <SidebarHeader className="border-b border-neutral-300 dark:border-pink-500">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <div className="flex items-center justify-center gap-2">
                                    <AppLogo />
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-6">
                <div className="space-y-2 [&_a]:flex [&_a]:items-center [&_a]:gap-3 [&_a]:rounded-md [&_a]:px-3 [&_a]:py-2 [&_a]:transition-all [&_a]:hover:bg-neutral-100 [&_a]:hover:text-black dark:[&_a]:hover:bg-pink-500/10 dark:[&_a]:hover:text-pink-400">
                    <NavMain items={mainNavItems} />
                </div>
            </SidebarContent>

            <SidebarFooter className="mt-auto border-t border-neutral-300 dark:border-pink-500">
                <div className="space-y-2 [&_a]:flex [&_a]:items-center [&_a]:gap-3 [&_a]:rounded-md [&_a]:px-3 [&_a]:py-2 [&_a]:transition-all [&_a]:hover:bg-neutral-100 [&_a]:hover:text-black dark:[&_a]:hover:bg-pink-500/10 dark:[&_a]:hover:text-pink-400">
                    <NavFooter items={footerNavItems} />
                </div>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
