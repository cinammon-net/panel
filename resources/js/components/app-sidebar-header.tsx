import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const [eyeComfort, setEyeComfort] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return window.localStorage.getItem('cinammon_eye_comfort') === '1';
        }
        return false;
    });

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('eye-comfort', eyeComfort);
            window.localStorage.setItem('cinammon_eye_comfort', eyeComfort ? '1' : '0');
        }
    }, [eyeComfort]);

    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <button
                type="button"
                onClick={() => setEyeComfort((v) => !v)}
                title="Alternar filtro de Descanso Visual para reducir la fatiga ocular"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    eyeComfort
                        ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
                        : 'border-cyan-500/30 bg-neutral-900/80 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300'
                }`}
            >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{eyeComfort ? 'Descanso Visual: ON' : 'Descanso Visual'}</span>
            </button>
        </header>
    );
}
