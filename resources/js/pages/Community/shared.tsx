import { CheckCircle2, MessageCircle, Pin } from 'lucide-react';

export interface Author {
    name: string;
    avatar: string | null;
}

export interface QuestionSummary {
    id: number;
    title: string;
    excerpt: string | null;
    category: string;
    source: 'web' | 'discord';
    author: Author;
    answers: number;
    views: number;
    solved: boolean;
    pinned: boolean;
    at: string;
}

export const CAT_COLOR: Record<string, string> = {
    general: 'border-neutral-700 text-neutral-300',
    minecraft: 'border-emerald-700/70 text-emerald-300',
    bots: 'border-violet-700/70 text-violet-300',
    web: 'border-sky-700/70 text-sky-300',
    panel: 'border-pink-700/70 text-pink-300',
    bases: 'border-amber-700/70 text-amber-300',
    otros: 'border-cyan-700/70 text-cyan-300',
};

export function timeAgo(iso: string) {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    const steps: [number, string, string][] = [
        [60, 'segundo', 'segundos'],
        [60, 'minuto', 'minutos'],
        [24, 'hora', 'horas'],
        [30, 'día', 'días'],
        [12, 'mes', 'meses'],
    ];
    let v = s;
    for (const [n, one, many] of steps) {
        if (v < n) return `hace ${v} ${v === 1 ? one : many}`;
        v = Math.floor(v / n);
    }
    return `hace ${v} ${v === 1 ? 'año' : 'años'}`;
}

export function CategoryChip({ cat, label }: { cat: string; label: string }) {
    return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${CAT_COLOR[cat] ?? CAT_COLOR.general}`}>{label}</span>;
}

export function StatusChips({ q }: { q: Pick<QuestionSummary, 'solved' | 'pinned' | 'source'> }) {
    return (
        <>
            {q.pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    <Pin className="h-3 w-3" /> Fijada
                </span>
            )}
            {q.solved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Resuelta
                </span>
            )}
            {q.source === 'discord' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
                    <MessageCircle className="h-3 w-3" /> Desde Discord
                </span>
            )}
        </>
    );
}

/** Texto con saltos de línea, bloques ``` y `código` en línea. Sin HTML crudo. */
export function RichText({ text }: { text: string }) {
    const parts = text.split(/```(?:[a-z0-9]+)?\n?([\s\S]*?)```/g);
    return (
        <div className="space-y-2 text-sm leading-relaxed break-words text-neutral-300">
            {parts.map((p, i) =>
                i % 2 === 1 ? (
                    <pre key={i} className="overflow-x-auto rounded-lg border border-neutral-800 bg-black/60 p-3 font-mono text-xs text-cyan-200">
                        {p.trimEnd()}
                    </pre>
                ) : (
                    p
                        .split(/\n{2,}/)
                        .filter((x) => x.trim())
                        .map((para, j) => (
                            <p key={`${i}-${j}`} className="whitespace-pre-line">
                                {para.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|https?:\/\/[^\s)]+)/g).map((t, k) =>
                                    t.startsWith('`') && t.endsWith('`') && t.length > 2 ? (
                                        <code key={k} className="rounded bg-neutral-800 px-1 py-px font-mono text-[0.85em] text-cyan-300">
                                            {t.slice(1, -1)}
                                        </code>
                                    ) : t.startsWith('**') && t.endsWith('**') && t.length > 4 ? (
                                        <strong key={k} className="font-semibold text-white">
                                            {t.slice(2, -2)}
                                        </strong>
                                    ) : /^https?:\/\//.test(t) ? (
                                        <a key={k} href={t} target="_blank" rel="noopener noreferrer nofollow" className="text-pink-300 underline underline-offset-2 hover:text-pink-200">
                                            {t}
                                        </a>
                                    ) : (
                                        t
                                    ),
                                )}
                            </p>
                        ))
                ),
            )}
        </div>
    );
}
