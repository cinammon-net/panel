import { useState } from 'react';
import { router} from '@inertiajs/react';
import ImportModal from '@/components/EggFormModal';
import { toast } from 'sonner';

export default function Ets() {
    // estados
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleImportEgg = async (data: { file?: File; url?: string }) => {
        try {
            if (data.file) {
                const formData = new FormData();
                formData.append('file', data.file);

                router.post('/eggs/import', formData, {
                    onSuccess: () => {
                        toast.success('Archivo importado correctamente');
                        setIsImportModalOpen(false);
                        // refrescar lista o limpiar estados
                    },
                    onError: (errors) => {
                        toast.error('Error al importar: ' + JSON.stringify(errors));
                        setIsImportModalOpen(false);
                    },
                    preserveScroll: true,
                });
            } else if (data.url) {
                toast.error('Importación desde URL no implementada');
            } else {
                toast.error('No se proporcionaron datos para importar');
            }
        } catch (error) {
            console.error('Error al importar huevo:', error);
            toast.error('Error al importar el huevo');
            setIsImportModalOpen(false);
        }
    };

    return (
        <>
            {/* Aquí abres el modal */}
            <button onClick={() => setIsImportModalOpen(true)}>Import</button>
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSubmit={handleImportEgg} />
            {/* Resto de tu componente */}
        </>
    );
}