import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

type NavGroup = 'main' | 'servers' | 'users' | 'advanced' | 'extra';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const grouped: Record<NavGroup, NavItem[]> = {
        main: [],
        servers: [],
        users: [],
        advanced: [],
        extra: [],
    };

    items.forEach((item) => {
        const group = (item.group || 'main') as NavGroup;
        grouped[group].push(item);
    });

    const renderGroup = (title: string, key: NavGroup) =>
        grouped[key].length > 0 && (
            <>
                {key !== 'main' && <SidebarGroupLabel className="mt-3 mb-1 px-2 text-xs font-bold text-pink-500">{title}</SidebarGroupLabel>}
                <SidebarMenu>
                    {grouped[key].map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={item.href === page.url} tooltip={{ children: item.title }}>
                                <Link href={item.href}>
                                    {item.icon && (
                                        <item.icon
                                            className={`h-4 w-4 ${item.groupColor ?? 'text-white'}`}
                                            style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
                                        />
                                    )}

                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </>
        );

    return (
        <SidebarGroup className="px-2 py-1">
            {renderGroup('Main', 'main')}
            {renderGroup('Server', 'servers')}
            {renderGroup('User', 'users')}
            {renderGroup('Advanced', 'advanced')}
            {renderGroup('Extra', 'extra')}
        </SidebarGroup>
    );
}
