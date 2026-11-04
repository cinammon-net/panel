import { ChevronDown } from 'lucide-react';
import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Markdown mínimo y seguro para notas de versión (títulos, listas anidadas, negrita,
 * cursiva, código y enlaces). Genera elementos React, nunca HTML crudo.
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
            out.push(
                <strong key={key} className="font-semibold text-white">
                    {inline(tok.slice(2, -2), key)}
                </strong>,
            );
        } else if (tok.startsWith('`')) {
            out.push(
                <code key={key} className="rounded border border-cyan-900/60 bg-cyan-950/40 px-1.5 py-px font-mono text-[0.85em] text-cyan-300">
                    {tok.slice(1, -1)}
                </code>,
            );
        } else if (tok.startsWith('[')) {
            out.push(
                <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">
                    {tok.slice(1, tok.indexOf(']('))}
                </a>,
            );
        } else {
            out.push(
                <em key={key} className="text-neutral-200">
                    {inline(tok.slice(1, -1), key)}
                </em>,
            );
        }
        last = m.index + tok.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}

interface Item {
    text: string;
    children: Item[];
}

function List({ items, depth, keyBase }: { items: Item[]; depth: number; keyBase: string }) {
    return (
        <ul className={depth === 0 ? 'space-y-1.5' : 'mt-1.5 space-y-1 border-l border-neutral-800 pl-3'}>
            {items.map((item, idx) => (
                <li key={idx} className="flex gap-2.5">
                    <span
                        aria-hidden="true"
                        className={`mt-[0.55em] shrink-0 rounded-full ${depth === 0 ? 'h-1.5 w-1.5 bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'h-1 w-1 bg-fuchsia-400'}`}
                    />
                    <div className="min-w-0 flex-1">
                        {inline(item.text, `${keyBase}-${idx}`)}
                        {item.children.length > 0 && <List items={item.children} depth={depth + 1} keyBase={`${keyBase}-${idx}`} />}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function parse(source: string, hideTitle: boolean): ReactNode[] {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const blocks: ReactNode[] = [];
    let list: Item[] | null = null;
    let stack: { indent: number; item: Item }[] = [];
    let para: string[] = [];
    let first = true;

    const flushPara = () => {
        if (para.length) {
            const k = `p${blocks.length}`;
            const text = para.join(' ');
            // Una línea entera en cursiva («*Publicada el …*») va como nota discreta
            const meta = /^[*_][^*_]+[*_]$/.test(text);
            blocks.push(
                <p key={k} className={meta ? 'text-xs text-neutral-500' : 'text-neutral-300'}>
                    {meta ? text.slice(1, -1) : inline(text, k)}
                </p>,
            );
            para = [];
        }
    };
    const flushList = () => {
        if (list) {
            const k = `l${blocks.length}`;
            blocks.push(<List key={k} items={list} depth={0} keyBase={k} />);
            list = null;
            stack = [];
        }
    };

    for (const raw of lines) {
        const line = raw.replace(/\s+$/, '');
        const heading = /^(#{1,6})\s+(.*)$/.exec(line);
        const bullet = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);

        if (!line.trim()) {
            flushPara();
            continue;
        }

        if (heading) {
            flushPara();
            flushList();
            const level = heading[1].length;
            const text = heading[2];
            // El primer título suele repetir «Panel vX.Y.Z — fecha»: la tarjeta ya lo muestra.
            if (first && hideTitle && level <= 2) {
                first = false;
                continue;
            }
            const k = `h${blocks.length}`;
            blocks.push(
                level <= 2 ? (
                    <h3 key={k} className="pt-1 text-sm font-bold text-white">
                        {inline(text, k)}
                    </h3>
                ) : (
                    <h4 key={k} className="flex items-center gap-2 border-b border-neutral-800/80 pt-3 pb-1.5 text-[11px] font-bold tracking-[0.15em] text-fuchsia-300 uppercase">
                        <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-fuchsia-500" />
                        {inline(text, k)}
                    </h4>
                ),
            );
        } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
            flushPara();
            flushList();
            blocks.push(<hr key={`hr${blocks.length}`} className="border-neutral-800" />);
        } else if (bullet) {
            flushPara();
            const indent = bullet[1].replace(/\t/g, '    ').length;
            const item: Item = { text: bullet[2], children: [] };
            if (!list) list = [];
            while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
            if (stack.length) stack[stack.length - 1].item.children.push(item);
            else list.push(item);
            stack.push({ indent, item });
        } else if (list && stack.length && /^\s{2,}\S/.test(raw)) {
            // Continuación del último elemento de la lista
            stack[stack.length - 1].item.text += ' ' + line.trim();
        } else {
            flushList();
            para.push(line.trim());
        }
        first = false;
    }
    flushPara();
    flushList();
    return blocks;
}

interface MarkdownProps {
    source: string;
    className?: string;
    /** Oculta el primer título (##) si repite la versión. */
    hideTitle?: boolean;
    /** Altura (px) a partir de la cual se recorta con «Ver más». 0 = sin recorte. */
    collapseAt?: number;
}

export default function Markdown({ source, className = '', hideTitle = true, collapseAt = 0 }: MarkdownProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [overflows, setOverflows] = useState(false);
    const [open, setOpen] = useState(false);

    useLayoutEffect(() => {
        if (collapseAt > 0 && ref.current) setOverflows(ref.current.scrollHeight > collapseAt + 24);
    }, [source, collapseAt]);

    const collapsed = collapseAt > 0 && overflows && !open;

    return (
        <div className={`rounded-lg border border-neutral-800/80 bg-gradient-to-b from-neutral-950 to-black/60 p-4 text-[13px] leading-relaxed text-neutral-300 ${className}`}>
            <div className="relative">
                <div ref={ref} className="space-y-2.5 overflow-hidden" style={collapsed ? { maxHeight: collapseAt } : undefined}>
                    {parse(source, hideTitle).map((b, i) => (
                        <Fragment key={i}>{b}</Fragment>
                    ))}
                </div>
                {collapsed && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />}
            </div>
            {collapseAt > 0 && overflows && (
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                    aria-expanded={open}
                >
                    {open ? 'Ver menos' : 'Ver más'}
                    <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            )}
        </div>
    );
}
