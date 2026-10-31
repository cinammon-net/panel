import AppHeaderLayout from '@/layouts/app/app-header-layout';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from 'sonner';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    variant?: 'sidebar' | 'header';
}

export default function AppLayout({ children, breadcrumbs, variant = 'sidebar' }: AppLayoutProps) {
    const LayoutComponent = variant === 'header' ? AppHeaderLayout : AppSidebarLayout;

    return (
        <LayoutComponent breadcrumbs={breadcrumbs}>
            {children}
            <Toaster position="top-center" richColors />
        </LayoutComponent>
    );
}
