import { Link } from '@inertiajs/react';
import { ArrowLeft, Files, Menu, Terminal, X } from 'lucide-react';
import { ReactNode, useState } from 'react';

export default function ServerLayout({ server, section, children }: { server: { id: number; name: string }; section: 'console' | 'files'; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    return <div className="min-h-screen bg-[#080c10] font-[Orbitron] text-slate-100 md:flex">
        <button aria-label="Abrir menú del servidor" onClick={() => setOpen(true)} className="m-4 flex items-center gap-2 rounded-lg border border-cyan-400/20 px-3 py-2 text-cyan-300 md:hidden"><Menu size={18} />{server.name}</button>
        {open && <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/70 md:hidden" onClick={() => setOpen(false)} />}
        <aside className={`${open ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col border-r border-cyan-400/20 bg-[#0b1118] md:sticky md:top-0 md:flex md:h-screen`}>
            <div className="flex items-center justify-between border-b border-cyan-400/15 p-6"><Link href="/servers" className="flex items-center gap-3 font-semibold tracking-widest text-cyan-300"><ArrowLeft size={19} /> CINAMMON</Link><button aria-label="Cerrar menú del servidor" onClick={() => setOpen(false)} className="md:hidden"><X size={18} /></button></div>
            <div className="p-6"><p className="mb-2 text-[10px] tracking-[0.25em] text-slate-500">SERVIDOR</p><p className="break-words text-lg font-semibold">{server.name}</p><span className="mt-3 inline-block rounded border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 font-mono text-[10px] tracking-wider text-cyan-400">CONTROL PANEL</span></div>
            <nav aria-label="Secciones del servidor" className="space-y-2 px-3">{[{ key: 'console', label: 'Consola', icon: Terminal }, { key: 'files', label: 'Archivos', icon: Files }].map(item => <Link key={item.key} href={`/servers/${server.id}/${item.key}`} aria-current={section === item.key ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg border-l-2 px-4 py-4 text-sm transition-colors ${section === item.key ? 'border-cyan-400 bg-cyan-400/10 font-semibold text-cyan-300 shadow-[inset_0_0_24px_#22d3ee08]' : 'border-transparent text-slate-400 hover:bg-cyan-400/5 hover:text-white'}`}><item.icon size={20} />{item.label}</Link>)}</nav>
            <div className="mt-auto p-6 text-xs text-slate-600">Cinammon Network</div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
    </div>;
}
