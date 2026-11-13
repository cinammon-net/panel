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
    Coins,
    CreditCard,
    Database,
    Egg,
    FolderGit2,
    Globe,
    HeartPulse,
    KeyRound,
    LayoutGrid,
    Lightbulb,
    Mail,
    Megaphone,
    MessagesSquare,
    Newspaper,
    PlayCircle,
    Radio,
    Rocket,
    Server,
    Settings,
    ShieldCheck,
    Sparkles,
    Star,
    Ticket,
    Users,
    Webhook,
    Wrench,
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    // ═══════════════════════════════════════════════════════════════
    // 1. PRINCIPAL (Accesos cotidianos clave de cada cliente y staff)
    // ═══════════════════════════════════════════════════════════════
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
        group: 'principal',
        groupColor: 'text-yellow-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: ['view_server'],
    },
    {
        title: 'Mis Servidores',
        href: '/servers',
        icon: Server,
        group: 'principal',
        groupColor: 'text-cyan-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: ['view_server'],
    },
    {
        title: 'Tienda & Facturación',
        href: '/billing/redirect',
        external: true,
        icon: CreditCard,
        group: 'principal',
        groupColor: 'text-pink-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Servidores Gratis',
        href: '/billing/redirect?to=coins',
        external: true,
        icon: Coins,
        group: 'principal',
        groupColor: 'text-amber-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Buzón de Correos',
        href: '/correos',
        icon: Mail,
        group: 'principal',
        groupColor: 'text-indigo-400',
        roles: [],
        permissions: [],
    },

    // ═══════════════════════════════════════════════════════════════
    // 2. COMUNIDAD & SOPORTE (Interacción, tickets, guías y feedback)
    // ═══════════════════════════════════════════════════════════════
    {
        title: 'Tickets de Soporte',
        href: '/tickets',
        icon: Ticket,
        group: 'comunidad',
        groupColor: 'text-amber-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Sugerencias',
        href: '/sugerencias',
        icon: Lightbulb,
        group: 'comunidad',
        groupColor: 'text-yellow-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'El Diario de Cinammon',
        href: 'https://news.cinammon.net',
        external: true,
        icon: Newspaper,
        group: 'comunidad',
        groupColor: 'text-amber-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Valoraciones & Reseñas',
        href: '/reviews',
        icon: Star,
        group: 'comunidad',
        groupColor: 'text-yellow-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Dudas de la Comunidad',
        href: '/dudas',
        icon: MessagesSquare,
        group: 'comunidad',
        groupColor: 'text-sky-400',
        roles: [],
        permissions: [],
    },
    {
        title: 'Guías en Vídeo',
        href: '/guias',
        icon: PlayCircle,
        group: 'comunidad',
        groupColor: 'text-rose-400',
        roles: [],
        permissions: [],
    },
    {
        title: 'Rincón de Amigos',
        href: '/amigos',
        icon: Sparkles,
        group: 'comunidad',
        groupColor: 'text-fuchsia-400',
        roles: ['Amigo de Cinammon', 'Owner'],
        permissions: [],
    },

    // ═══════════════════════════════════════════════════════════════
    // 3. INFRAESTRUCTURA & SERVIDORES (Nodos, Wings, Eggs, bases)
    // ═══════════════════════════════════════════════════════════════
    {
        title: 'Nodos de Juego',
        href: '/nodes',
        icon: Activity,
        group: 'infraestructura',
        groupColor: 'text-cyan-400',
        roles: ['Admin', 'Owner'],
        permissions: ['view_list_node'],
    },
    {
        title: 'Wings Daemon',
        href: '/wings',
        icon: ShieldCheck,
        group: 'infraestructura',
        groupColor: 'text-cyan-400',
        roles: ['Admin', 'Owner'],
        permissions: ['view_list_node'],
    },
    {
        title: 'Eggs & Plantillas',
        href: '/eggs',
        icon: Egg,
        group: 'infraestructura',
        groupColor: 'text-orange-400',
        roles: ['Admin', 'Owner'],
        permissions: ['view_list_egg'],
    },
    {
        title: 'Host Bases de Datos',
        href: '/database',
        icon: Database,
        group: 'infraestructura',
        groupColor: 'text-blue-400',
        roles: ['Admin', 'Owner'],
        permissions: ['view_settings'],
    },
    {
        title: 'Puntos de Montaje',
        href: '/mounts',
        icon: Radio,
        group: 'infraestructura',
        groupColor: 'text-violet-400',
        roles: ['Admin', 'Owner'],
        permissions: ['view_mount'],
    },
    {
        title: 'Estado de Salud (Health)',
        href: '/health',
        icon: HeartPulse,
        group: 'infraestructura',
        groupColor: 'text-rose-400',
        roles: ['Admin', 'Moderator', 'Helper', 'Sponsors', 'Owner'],
        permissions: ['view_health'],
    },
    {
        title: 'Mantenimiento',
        href: '/maintenance',
        icon: Wrench,
        group: 'infraestructura',
        groupColor: 'text-amber-400',
        roles: ['Admin', 'Owner'],
        permissions: [],
    },

    // ═══════════════════════════════════════════════════════════════
    // 4. GESTIÓN & ADMINISTRACIÓN (Cuentas, roles, API y seguridad)
    // ═══════════════════════════════════════════════════════════════
    {
        title: 'Usuarios',
        href: '/users',
        icon: Users,
        group: 'gestion',
        groupColor: 'text-pink-400',
        roles: ['Admin', 'Moderator', 'Helper', 'Owner'],
        permissions: ['view_list_user'],
    },
    {
        title: 'Roles y Permisos',
        href: '/roles',
        icon: BadgeInfo,
        group: 'gestion',
        groupColor: 'text-purple-400',
        roles: ['Admin', 'Owner'],
        permissions: ['view_user'],
    },
    {
        title: 'API Keys',
        href: '/api-keys',
        icon: KeyRound,
        group: 'gestion',
        groupColor: 'text-amber-400',
        roles: ['Admin', 'Owner'],
        permissions: ['view_settings'],
    },
    {
        title: 'Webhooks',
        href: '/webhooks',
        icon: Webhook,
        group: 'gestion',
        groupColor: 'text-sky-400',
        roles: ['Admin', 'Owner'],
        permissions: ['view_webhook'],
    },
    {
        title: 'Inicio Social (SSO)',
        href: '/auth-providers',
        icon: ShieldCheck,
        group: 'gestion',
        groupColor: 'text-indigo-400',
        roles: ['Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Anuncios Globales',
        href: '/announcements',
        icon: Megaphone,
        group: 'gestion',
        groupColor: 'text-pink-400',
        roles: ['Admin', 'Owner'],
        permissions: [],
    },

    // ═══════════════════════════════════════════════════════════════
    // 5. SISTEMA & AJUSTES (Configuración personal, updates y estado)
    // ═══════════════════════════════════════════════════════════════
    {
        title: 'Ajustes de Cuenta',
        href: '/settings',
        icon: Settings,
        group: 'ajustes',
        groupColor: 'text-neutral-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Actualizaciones',
        href: '/updates',
        icon: Rocket,
        group: 'ajustes',
        groupColor: 'text-fuchsia-400',
        roles: ['Admin', 'Owner'],
        permissions: [],
    },
    {
        title: 'Estado de la Red',
        href: 'https://status.cinammon.net',
        external: true,
        icon: Globe,
        group: 'ajustes',
        groupColor: 'text-emerald-400',
        roles: ['Members', 'Sponsors', 'Helper', 'Moderator', 'Admin', 'Owner'],
        permissions: [],
    },
];

// Logo de Discord con la misma firma que un icono de Lucide
const DiscordLogo = (({ className }: { className?: string }) => <BrandIcon provider="discord" className={className} />) as unknown as LucideIcon;

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/cinammon-net/panel',
        icon: FolderGit2,
        group: 'ajustes',
        groupColor: 'text-neutral-400',
    },
    {
        title: 'Documentación',
        href: 'https://cinammon.net/docs/panel',
        icon: BookOpenCheck,
        group: 'ajustes',
        groupColor: 'text-neutral-400',
    },
];

export function AppSidebar() {
    const { discordInvite } = usePage<{ discordInvite?: string }>().props;
    const footerItems: NavItem[] = discordInvite
        ? [{ title: 'Discord', href: discordInvite, icon: DiscordLogo, group: 'ajustes', groupColor: 'text-indigo-400' }, ...footerNavItems]
        : footerNavItems;

    return (
        <Sidebar
            collapsible="icon"
            variant="floating"
            className="border-r border-neutral-800/80 bg-neutral-950/95 font-[Orbitron] backdrop-blur transition-all dark:border-neutral-800 dark:bg-black"
        >
            <SidebarHeader className="border-b border-neutral-800/80 px-3 py-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-neutral-900/80 transition-all rounded-xl">
                            <Link href="/dashboard" prefetch>
                                <div className="flex items-center justify-center gap-2">
                                    <AppLogo />
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-2 px-1">
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="mt-auto border-t border-neutral-800/80 pt-2 pb-3 px-2">
                <NavFooter items={footerItems} />
                <div className="pt-2">
                    <NavUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
