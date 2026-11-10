import { usePage } from '@inertiajs/react';
import { Crown } from 'lucide-react';

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
    const { badges = [], billingUrl } = usePage<{ badges?: Badge[]; billingUrl?: string }>().props;
    const hasRank = badges.some((b) => b.kind === 'rank');

    const shown = badges.slice(0, max);
    const rest = badges.length - shown.length;

    return (
        <div className="flex flex-wrap items-center gap-1 px-2 pb-2 group-data-[collapsible=icon]:hidden" aria-label="Tus rangos e insignias">
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
            {billingUrl && (
                <a
                    href={`${billingUrl}/store/ranks`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full rounded-md border border-yellow-500/50 bg-yellow-500/10 px-2 py-1 text-center font-[Orbitron] text-[10px] font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
                >
                    <Crown className="mr-1 inline h-3 w-3 -translate-y-px" aria-hidden="true" />
                    {hasRank ? 'Mejorar mi rango' : 'Conseguir un rango VIP'}
                </a>
            )}
        </div>
    );
}
