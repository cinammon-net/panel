import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Link, usePage } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

type NavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    group: 'main' | 'servers' | 'users' | 'advanced' | 'extra';
    groupColor: string;
    roles?: string[];
};

type NavGroup = 'main' | 'servers' | 'users' | 'advanced' | 'extra';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const { auth } = page.props as {
        auth?: { user?: { roles?: string[] } };
    };
    const userRoles: string[] = auth?.user?.roles ?? [];

    const isOwner = userRoles.includes('Owner');
    const isMember = userRoles.some((r) => ['Members', 'Sponsors', 'Helper', 'Moderator'].includes(r));

    if (isOwner) {
        ['Admin', 'Moderator', 'Helper', 'Sponsors', 'Members'].forEach((role) => {
            if (!userRoles.includes(role)) userRoles.push(role);
        });
    }
    const allowedGroups: NavGroup[] = isOwner ? ['main', 'servers', 'users', 'advanced', 'extra'] : isMember ? ['main', 'servers'] : ['main'];

    const grouped: Record<NavGroup, NavItem[]> = {
        main: [],
        servers: [],
        users: [],
        advanced: [],
        extra: [],
    };

    for (const item of items) {
        const group = item.group as NavGroup;
        const allowedRoles = item.roles ?? [];
        const hasAccess = isOwner || allowedRoles.length === 0 || allowedRoles.some((r) => userRoles.includes(r));

        if (allowedGroups.includes(group) && hasAccess) {
            grouped[group].push(item);
        }
    }

    return (
        <SidebarGroup className="px-2 py-1">
            {Object.entries(grouped).map(([key, items]) =>
                items.length > 0 ? (
                    <div key={key}>
                        {key !== 'main' && (
                            <SidebarGroupLabel className="mt-3 mb-1 px-2 text-xs font-bold text-pink-500">
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </SidebarGroupLabel>
                        )}
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={item.href === page.url} tooltip={{ children: item.title }}>
                                        <Link href={item.href}>
                                            {item.icon && (
                                                <item.icon
                                                    className={`h-4 w-4 ${item.groupColor ?? 'text-white'}`}
                                                    style={{
                                                        filter: 'drop-shadow(0 0 6px currentColor)',
                                                    }}
                                                />
                                            )}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </div>
                ) : null,
            )}
        </SidebarGroup>
    );
}

export default NavMain;
