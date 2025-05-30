import { Appearance, useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import { LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { HTMLAttributes, useEffect, useState } from 'react';

export default function AppearanceToggleTab({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();
    const page = usePage<{ availableFonts?: string[] }>();
    const availableFonts = page.props.availableFonts ?? ['Orbitron']; // fallback

    const [font, setFont] = useState(() => localStorage.getItem('app-font') || availableFonts[0]);

    useEffect(() => {
        if (!font) return;

        document.documentElement.style.setProperty('--app-font', `'${font}', sans-serif`);
        localStorage.setItem('app-font', font);

        const systemFonts = [
            'Arial',
            'Verdana',
            'Tahoma',
            'Trebuchet MS',
            'Times New Roman',
            'Georgia',
            'Courier New',
            'Lucida Console',
            'Segoe UI',
            'Palatino Linotype',
            'Impact',
            'Gill Sans',
            'Franklin Gothic Medium',
            'Calibri',
            'Cambria',
        ];

        if (!systemFonts.includes(font)) {
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${font.replaceAll(' ', '+')}&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);

            return () => {
                if (link.parentNode) {
                    link.parentNode.removeChild(link);
                }
            };
        }
    }, [font]);
    

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
    ];

    return (
        <div className={cn('space-y-4', className)} {...props}>
            <div className="inline-flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                {tabs.map(({ value, icon: Icon, label }) => (
                    <button
                        key={value}
                        onClick={() => updateAppearance(value)}
                        className={cn(
                            'flex items-center rounded-md px-3.5 py-1.5 transition-colors',
                            appearance === value
                                ? 'bg-white shadow-xs dark:bg-neutral-700 dark:text-neutral-100'
                                : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-700/60',
                        )}
                    >
                        <Icon className="-ml-1 h-4 w-4" />
                        <span className="ml-1.5 text-sm">{label}</span>
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="font" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Fuente global
                </label>
                <select
                    id="font"
                    value={font}
                    onChange={(e) => setFont(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-black dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                >
                    {availableFonts.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
