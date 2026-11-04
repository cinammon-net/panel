import { Fragment, type ReactNode } from 'react';

/**
 * Markdown mínimo y seguro para notas de versión (títulos, listas, negrita, cursiva,
 * código y enlaces). Genera elementos React, nunca HTML crudo.
 */
function inline(text: string, keyBase: string): ReactNode[] {
    const out: ReactNode[] = [];
    const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text))) {
        if (m.index > last) out.push(text.slice(last, m.index));
        const tok = m[0];
        const key = `${keyBase}-${i++}`;
        if (tok.startsWith('**')) {
            out.push(<strong key={key} className="font-semibold text-white">{inline(tok.slice(2, -2), key)}</strong>);
        } else if (tok.startsWith('`')) {
            out.push(<code key={key} className="rounded bg-neutral-800 px-1 py-0.5 font-mono text-[0.95em] text-cyan-300">{tok.slice(1, -1)}</code>);
        } else if (tok.startsWith('[')) {
            const label = tok.slice(1, tok.indexOf(']('));
            out.push(
                <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
                    {label}
                </a>,
            );
        } else {
            out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>);
        }
        last = m.index + tok.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}

export default function Markdown({ source, className = '' }: { source: string; className?: string }) {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const blocks: ReactNode[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    let para: string[] = [];

    const flushPara = () => {
        if (para.length) {
            const k = `p${blocks.length}`;
            blocks.push(<p key={k}>{inline(para.join(' '), k)}</p>);
            para = [];
        }
    };
    const flushList = () => {
        if (list) {
            const k = `l${blocks.length}`;
            const items = list.items.map((it, idx) => <li key={idx}>{inline(it, `${k}-${idx}`)}</li>);
            blocks.push(
                list.ordered ? (
                    <ol key={k} className="list-decimal space-y-1 pl-5">{items}</ol>
                ) : (
                    <ul key={k} className="list-disc space-y-1 pl-5 marker:text-cyan-500">{items}</ul>
                ),
            );
            list = null;
        }
    };

    for (const raw of lines) {
        const line = raw.trimEnd();
        const heading = /^(#{1,6})\s+(.*)$/.exec(line);
        const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
        const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

        if (!line.trim()) {
            flushPara();
            flushList();
        } else if (heading) {
            flushPara();
            flushList();
            const level = heading[1].length;
            const k = `h${blocks.length}`;
            const cls = level <= 2 ? 'text-sm font-bold text-white' : 'text-xs font-bold uppercase tracking-wide text-cyan-400';
            blocks.push(<p key={k} className={`${cls} pt-1`}>{inline(heading[2], k)}</p>);
        } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
            flushPara();
            flushList();
            blocks.push(<hr key={`hr${blocks.length}`} className="border-neutral-800" />);
        } else if (bullet || ordered) {
            flushPara();
            const isOrdered = !bullet;
            if (!list || list.ordered !== isOrdered) {
                flushList();
                list = { ordered: isOrdered, items: [] };
            }
            list.items.push((bullet ?? ordered)![1]);
        } else if (list && /^\s{2,}\S/.test(raw)) {
            // Continuación de un elemento de lista
            list.items[list.items.length - 1] += ' ' + line.trim();
        } else {
            flushList();
            para.push(line.trim());
        }
    }
    flushPara();
    flushList();

    return <div className={`space-y-2 ${className}`}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
