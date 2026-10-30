import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { ArrowLeft, FileText, Folder, Lock, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type Entry = { name: string; directory: boolean; size: number; modified: string; private?: boolean; symlink?: boolean };
type Server = { id: number; name: string };
const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

export default function Files({ server }: { server: Server }) {
    const base = `/servers/${server.id}`;
    const [directory, setDirectory] = useState('');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [preview, setPreview] = useState<{ file: string; content: string } | null>(null);
    const [opening, setOpening] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(''); setEntries([]); setPreview(null);
        axios.get<{ data: Entry[] }>(`${base}/files/list`, { params: { directory }, signal: controller.signal })
            .then(response => setEntries(response.data.data.sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name))))
            .catch(error => { if (!axios.isCancel(error)) setError(error.response?.data?.message || 'No se pudo cargar esta carpeta.'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [base, directory, refresh]);

    const open = async (entry: Entry) => {
        if (entry.private || entry.symlink || opening) return;
        const path = [directory, entry.name].filter(Boolean).join('/');
        if (entry.directory) { setDirectory(path); return; }
        setOpening(true); setError(''); setPreview(null);
        try { const response = await axios.get(`${base}/files/contents`, { params: { file: path } }); setPreview(response.data); }
        catch (error) { setError(axios.isAxiosError(error) ? error.response?.data?.message || 'No se pudo abrir el archivo.' : 'No se pudo abrir el archivo.'); }
        finally { setOpening(false); }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Servers', href: '/servers' }, { title: server.name, href: `${base}/console` }, { title: 'Archivos', href: `${base}/files` }]}>
            <Head title={`${server.name} · Archivos`} />
            <main className="min-h-screen space-y-6 bg-[#080c10] p-6 text-slate-100 md:p-8">
                <nav aria-label="Secciones del servidor" className="flex gap-2 border-b border-slate-800 pb-4"><Link href={`${base}/console`} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">Consola</Link><Link href={`${base}/files`} aria-current="page" className="rounded-lg bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">Archivos</Link></nav>
                <header className="flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold tracking-widest text-cyan-400">ARCHIVOS DEL SERVIDOR</p><h1 className="text-2xl font-semibold">{server.name}</h1><p className="mt-2 text-sm text-slate-400">Explora las carpetas y abre los archivos de texto del nodo.</p></div><button onClick={() => setRefresh(value => value + 1)} disabled={loading || opening} className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40"><RefreshCw size={15} />Actualizar</button></header>
                <div className="flex items-center gap-3"><button disabled={!directory || opening} onClick={() => setDirectory(directory.split('/').slice(0, -1).join('/'))} className="rounded-lg border border-slate-700 p-2 disabled:opacity-30" aria-label="Carpeta superior"><ArrowLeft size={16} /></button><button disabled={opening} onClick={() => setDirectory('')} className="text-sm text-cyan-300">Raíz</button><span className="truncate font-mono text-sm text-slate-400">/{directory}</span></div>
                {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#101820]">
                    <table className="w-full text-left text-sm"><thead className="border-b border-slate-800 text-xs text-slate-400"><tr><th className="p-4">Nombre</th><th className="p-4">Tamaño</th><th className="p-4">Modificado</th></tr></thead><tbody>
                        {loading ? <tr><td colSpan={3} className="p-8 text-center text-slate-400">Cargando archivos…</td></tr> : entries.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-slate-400">{error ? 'La carpeta no está disponible.' : 'Esta carpeta está vacía.'}</td></tr> : entries.map(entry => <tr key={entry.name} className="border-b border-slate-800/70 last:border-0 hover:bg-slate-800/40"><td className="p-4"><button disabled={entry.private || entry.symlink || opening} onClick={() => void open(entry)} className="flex items-center gap-3 text-cyan-200 disabled:text-slate-500">{entry.private ? <Lock size={17} /> : entry.directory ? <Folder size={17} /> : <FileText size={17} />}<span>{entry.name}</span>{entry.private && <span className="text-xs">Privado</span>}{entry.symlink && <span className="text-xs">Enlace</span>}</button></td><td className="p-4 text-slate-400">{entry.directory ? 'Carpeta' : formatSize(entry.size)}</td><td className="p-4 whitespace-nowrap text-slate-400">{new Date(entry.modified).toLocaleString('es-ES')}</td></tr>)}
                    </tbody></table>
                </div>
                {opening && <p role="status" className="text-sm text-cyan-300">Abriendo archivo…</p>}
                {preview && <section className="overflow-hidden rounded-xl border border-slate-700 bg-[#05090d]"><header className="flex items-center justify-between border-b border-slate-800 p-4"><h2 className="font-mono text-sm text-cyan-300">{preview.file}</h2><button aria-label="Cerrar vista previa" onClick={() => setPreview(null)}><X size={18} /></button></header><pre aria-label="Contenido del archivo" className="max-h-[600px] overflow-auto p-4 font-mono text-xs leading-6 whitespace-pre-wrap text-slate-300">{preview.content}</pre></section>}
                <p className="text-xs text-slate-500">Vista de lectura. Los archivos binarios, de más de 1 MB y las credenciales no se previsualizan.</p>
            </main>
        </AppLayout>
    );
}
