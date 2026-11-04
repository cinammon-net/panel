import { usePage } from '@inertiajs/react';

export interface Badge {
    name: string;
    kind: 'rank' | 'auto';
    color: string;
    icon: string;
    hint: string | null;
    expires_at: string | null;
}

/** Insignias del usuario: rangos comprados (con brillo) y roles automáticos. */
export default function RankBadges({ max = 6 }: { max?: number }) {
    const { badges = [] } = usePage<{ badges?: Badge[] }>().props;
    if (!badges.length) return null;

    const shown = badges.slice(0, max);
    const rest = badges.length - shown.length;

    return (
        <div className="flex flex-wrap gap-1 px-2 pb-2 group-data-[collapsible=icon]:hidden" aria-label="Tus rangos e insignias">
            {shown.map((b) => {
                const title =
                    b.kind === 'rank'
                        ? `Rango ${b.name}${b.expires_at ? ` · hasta ${new Date(b.expires_at).toLocaleDateString('es-ES')}` : ''}`
                        : `${b.name} · ${b.hint ?? 'insignia automática'}`;
                return (
                    <span
                        key={b.name}
                        title={title}
                        className={`rounded-full border px-2 py-0.5 font-[Orbitron] text-[9px] font-bold tracking-wide ${b.kind === 'rank' ? 'uppercase' : ''}`}
                        style={{
                            color: b.color,
                            borderColor: `${b.color}80`,
                            backgroundColor: `${b.color}${b.kind === 'rank' ? '26' : '12'}`,
                            boxShadow: b.kind === 'rank' ? `0 0 8px ${b.color}55` : undefined,
                        }}
                    >
                        {b.kind === 'rank' ? '★ ' : ''}
                        {b.name}
                    </span>
                );
            })}
            {rest > 0 && <span className="px-1 text-[9px] text-neutral-500">+{rest}</span>}
        </div>
    );
}
