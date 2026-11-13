import { NavFooter } from '@/components/nav-footer';
import { BrandIcon } from '@/components/social-login';
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
import { Link, usePage } from '@inertiajs/react';
import { type LucideIcon } from 'lucide-react';
import {
    Activity,
    BadgeInfo,
    BookOpenCheck,
    Bookmark,
    CreditCard,
    Database,
    Egg,
    FolderGit2,
    HeartPulse,
    KeyRound,
    LayoutGrid,
    Megaphone,
    Radio,
    Server,
    Settings,
    ShieldCheck,
    Ticket,
    Users,
    Webhook,
    Wrench,
    Coins,
    Sparkles,
    PlayCircle,
    Mail,
    Lightbulb,
    MessagesSquare,
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    // ——— Nivel raíz: Dashboard, Health, Facturación y Settings ———
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
        group: 'main',
        groupColor: 'text-purple-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: ['view_server'],
    },
    {
        title: 'Health',
        href: '/health',
        icon: HeartPulse,
        group: 'main',
        groupColor: 'text-orange-400',
        roles: ['Admin', 'Moderator', 'Helper', 'Sponsors'],
        permissions: ['view_health'],
    },
    {
        title: 'Facturación / Tienda',
        href: '/billing/redirect',
        external: true,
        icon: CreditCard,
        group: 'main',
        groupColor: 'text-pink-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Servidor gratis',
        href: '/billing/redirect?to=coins',
        external: true,
        icon: Coins,
        group: 'main',
        groupColor: 'text-yellow-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Mis correos',
        href: '/correos',
        icon: Mail,
        group: 'main',
        groupColor: 'text-fuchsia-400',
        roles: [],
        permissions: [],
    },
    {
        title: 'Guías en vídeo',
        href: '/guias',
        icon: PlayCircle,
        group: 'main',
        groupColor: 'text-emerald-400',
        roles: [],
        permissions: [],
    },
    {
        title: 'Dudas de la comunidad',
        href: '/dudas',
        icon: MessagesSquare,
        group: 'main',
        groupColor: 'text-sky-400',
        roles: [],
        permissions: [],
    },
    {
        // Solo quien tiene el rol "Amigo de Cinammon" (el Owner lo ve siempre)
        title: 'Rincón de Amigos',
        href: '/amigos',
        icon: Sparkles,
        group: 'main',
        groupColor: 'text-sky-400',
        roles: ['Amigo de Cinammon'],
        permissions: [],
    },
    {
        title: 'Mantenimiento',
        href: '/maintenance',
        icon: Wrench,
        group: 'main',
        groupColor: 'text-amber-400',
        roles: ['Admin'],
        permissions: [],
    },
    {
        title: 'Anuncios',
        href: '/announcements',
        icon: Megaphone,
        group: 'main',
        groupColor: 'text-pink-400',
        roles: ['Admin'],
        permissions: [],
    },
    {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        group: 'main',
        groupColor: 'text-purple-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin'],
        permissions: [],
    },

    // ——— Server: todo lo que toca infraestructura ———
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
        title: 'Nodes',
        href: '/nodes',
        icon: Activity,
        group: 'servers',
        groupColor: 'text-blue-400',
        roles: ['Admin'],
        permissions: ['view_list_node'],
    },
    {
        title: 'Wings',
        href: '/wings',
        icon: ShieldCheck,
        group: 'servers',
        groupColor: 'text-blue-400',
        roles: ['Admin'],
        permissions: ['view_list_node'],
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
        title: 'Database Host',
        href: '/database',
        icon: Database,
        group: 'servers',
        groupColor: 'text-blue-400',
        roles: ['Admin'],
        permissions: ['view_settings'],
    },
    {
        title: 'Mounts',
        href: '/mounts',
        icon: Radio,
        group: 'servers',
        groupColor: 'text-blue-400',
        roles: ['Admin'],
        permissions: ['view_mount'],
    },

    // ——— User: cuentas y acceso ———
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
        title: 'Roles',
        href: '/roles',
        icon: BadgeInfo,
        group: 'users',
        groupColor: 'text-pink-400',
        roles: ['Admin'],
        permissions: ['view_user'],
    },
    {
        title: 'API Keys',
        href: '/api-keys',
        icon: KeyRound,
        group: 'users',
        groupColor: 'text-pink-400',
        roles: ['Admin'],
        permissions: ['view_settings'],
    },
    {
        title: 'Webhooks',
        href: '/webhooks',
        icon: Webhook,
        group: 'users',
        groupColor: 'text-pink-400',
        roles: ['Admin'],
        permissions: ['view_webhook'],
    },
    {
        title: 'Inicio Social',
        href: '/auth-providers',
        icon: ShieldCheck,
        group: 'users',
        groupColor: 'text-pink-400',
        roles: ['Admin'],
        permissions: [],
    },

    // ——— Extra (comunidad) ———
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
    {
        title: 'Sugerencias',
        href: '/sugerencias',
        icon: Lightbulb,
        group: 'extra',
        groupColor: 'text-yellow-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin'],
        permissions: [],
    },
];

// Logo de Discord con la misma firma que un icono de Lucide (solo usa className).
const DiscordLogo = (({ className }: { className?: string }) => <BrandIcon provider="discord" className={className} />) as unknown as LucideIcon;

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/cinammon-net/panel',
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
    const { discordInvite } = usePage<{ discordInvite?: string }>().props;
    const footerItems: NavItem[] = discordInvite
        ? [{ title: 'Discord', href: discordInvite, icon: DiscordLogo, group: 'extra', groupColor: 'text-yellow-400' }, ...footerNavItems]
        : footerNavItems;

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
                    <NavFooter items={footerItems} />
                </div>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
