import Heading from '@/components/heading';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

const sidebarNavItems: NavItem[] = [
    { title: 'Profile', href: '/settings/profile', icon: null },
    { title: 'Password', href: '/settings/password', icon: null },
    { title: 'Appearance', href: '/settings/appearance', icon: null },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    if (typeof window === 'undefined') return null;

    const currentPath = window.location.pathname;

    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            <div className="min-h-screen bg-white px-4 py-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <Heading
                    title="SETTINGS"
                    description="Manage your profile and account settings"
                    className="text-purple-700 drop-shadow-none dark:text-purple-400 dark:drop-shadow-[0_0_6px_#c084fc]"
                />

                <div className="mt-8 flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                    {/* Sidebar */}
                    <aside className="w-full max-w-xl lg:w-64">
                        <nav className="flex flex-col gap-3">
                            {sidebarNavItems.map((item, index) => {
                                const isActive = currentPath === item.href;
                                return (
                                    <Link
                                        key={index}
                                        href={item.href}
                                        className={cn(
                                            'block w-full rounded-md border px-4 py-2 text-sm font-semibold transition',
                                            isActive
                                                ? 'border-purple-600 bg-purple-900/30 text-purple-200 shadow dark:shadow-[0_0_10px_#c084fc55]'
                                                : 'border-neutral-300 bg-white text-neutral-700 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-600 dark:border-neutral-700 dark:bg-black dark:text-neutral-300 dark:hover:bg-purple-800/30 dark:hover:text-purple-200',
                                        )}
                                    >
                                        {item.title}
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    <Separator className="my-6 border-neutral-300 md:hidden dark:border-purple-700" />

                    {/* Main Content */}
                    <div className="flex-1 md:max-w-2xl">
                        <section className="max-w-xl space-y-12 rounded-lg border border-neutral-200 bg-white p-6 shadow dark:border-purple-800 dark:bg-neutral-900 dark:shadow-[0_0_10px_#c084fc33]">
                            {children}
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}
