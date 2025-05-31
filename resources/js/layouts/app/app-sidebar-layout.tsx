import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';


export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
                <footer>
                    <div className="flex justify-center">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 font-[Orbitron] p-1">
                            <div>
                                <div>
                                    <span className="text-neutral-500 dark:text-neutral-400">Powered by </span>
                                    <a
                                        href="https://cinammon.net"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300"
                                    >
                                        Cinammon
                                    </a> at 
                                    <a
                                        href="https://github.com/cinammon-net/panel"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300"
                                    >
                                        {' '}GitHub
                                    </a>

                                    <span className="text-neutral-500 dark:text-neutral-400"> | </span>
                                    <span className="text-neutral-500 dark:text-neutral-400">Version 1.0.0</span>

                                    <span className="text-neutral-500 dark:text-neutral-400"> | </span>
                                    <a
                                        href="https://github.com/cinammon-net/panel/blob/main/LICENSE"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300"
                                    >
                                        {' '}MIT License
                                    </a>
                                </div>
                            </div>
                        </p>
                    </div>
                </footer>
            </AppContent>
        </AppShell>
    );
}
