import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/**
 * Confirmación con el estilo del panel (sustituye al confirm() nativo del navegador).
 */
export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Aceptar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(value) => !value && onCancel()}>
            <DialogContent className="border border-fuchsia-500/50 bg-neutral-950 font-[Orbitron] text-white shadow-[0_0_35px_rgba(217,70,239,0.25)] sm:max-w-md">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <DialogTitle className="text-sm font-bold tracking-wider text-fuchsia-300">{title}</DialogTitle>
                        <DialogDescription className="mt-2 text-xs leading-relaxed text-neutral-300">
                            {description}
                        </DialogDescription>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-neutral-800 pt-4">
                    <button
                        onClick={onCancel}
                        className="rounded-lg border border-neutral-700 bg-black/60 px-4 py-2 text-xs font-semibold text-neutral-300 transition hover:border-neutral-500 hover:text-white"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="rounded-lg border border-fuchsia-500 bg-fuchsia-600/20 px-4 py-2 text-xs font-bold text-fuchsia-200 transition hover:bg-fuchsia-500 hover:text-black"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
