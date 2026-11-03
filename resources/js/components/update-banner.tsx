import { Link, usePage } from '@inertiajs/react';
import { ArrowUpCircle, X } from 'lucide-react';
import { useState } from 'react';

interface UpdatesShared {
    pending: string[];
    panel_latest: string | null;
    wings_latest: string | null;
    billing_latest: string | null;
}

/**
 * Aviso global para admins cuando hay una versión nueva del panel o de Wings
 * (banner persistente hasta actualizar).
 */
export default function UpdateBanner() {
    const { updates } = usePage<{ updates?: UpdatesShared | null }>().props;
    const [dismissed, setDismissed] = useState(false);

    if (dismissed || !updates || !updates.pending?.length) return null;

    const parts = updates.pending.map((target) =>
        target === 'panel'
            ? `Panel v${updates.panel_latest}`
            : target === 'wings'
              ? `Wings v${updates.wings_latest}`
              : `Billing v${updates.billing_latest}`,
    );

    return (
        <div className="flex items-center justify-between gap-3 border-b border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-950/80 via-purple-950/80 to-fuchsia-950/80 px-4 py-2 font-[Orbitron] text-xs text-fuchsia-100">
            <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 animate-pulse text-fuchsia-300" />
                <span>
                    Nueva actualización disponible: <strong>{parts.join(' · ')}</strong>
                </span>
                <Link
                    href="/dashboard"
                    className="ml-2 rounded-lg border border-fuchsia-400/60 bg-fuchsia-500/20 px-3 py-1 font-bold text-fuchsia-200 transition hover:bg-fuchsia-400 hover:text-black"
                >
                    Ver y actualizar
                </Link>
            </div>
            <button onClick={() => setDismissed(true)} className="text-fuchsia-300/70 hover:text-white" aria-label="Cerrar aviso">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
