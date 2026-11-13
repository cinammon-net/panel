import { Breadcrumbs } from '@/components/breadcrumbs';
import { CommandPalette } from '@/components/command-palette';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Eye, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const [paletteOpen, setPaletteOpen] = useState(false);
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

    // Atajo de teclado global ⌘K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Botón de búsqueda rápida (Command Palette) */}
                    <button
                        type="button"
                        onClick={() => setPaletteOpen(true)}
                        title="Buscar rápidamente en todo el panel (⌘ + K)"
                        className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/25 bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-yellow-500/50 hover:text-yellow-300 hover:shadow-[0_0_12px_rgba(250,204,21,0.15)]"
                    >
                        <Search className="h-3.5 w-3.5 text-yellow-400" />
                        <span className="hidden md:inline font-medium">Buscar...</span>
                        <kbd className="hidden rounded-md border border-neutral-700 bg-neutral-800/90 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300 sm:inline-block">
                            ⌘K
                        </kbd>
                    </button>

                    {/* Botón de Descanso Visual */}
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
                </div>
            </header>

            <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </>
    );
}
