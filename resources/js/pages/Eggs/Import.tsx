import { useState } from 'react';
import { router} from '@inertiajs/react';
import ImportModal from '@/components/EggFormModal';

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
                        alert('Archivo subido y eggs importados correctamente');
                        setIsImportModalOpen(false);
                        // refrescar lista o limpiar estados
                    },
                    onError: (errors) => {
                        alert('Error al importar: ' + JSON.stringify(errors));
                    },
                    preserveScroll: true,
                });
            } else if (data.url) {
                alert('Importar desde URL no implementado');
            }
        } catch (error) {
            alert('Error en la importación: ' + (error instanceof Error ? error.message : String(error)));
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