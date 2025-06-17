import { useState } from 'react';
import { toast } from 'sonner';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { file?: File; url?: string }) => void;
}

export default function ImportModal({ isOpen, onClose, onSubmit }: ImportModalProps) {
    const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');
    const [uploadComplete, setUploadComplete] = useState(false);
    const [isUploaded, setIsUploaded] = useState(false); // <-- NUEVO

    if (!isOpen) return null;

    // Drag & Drop handlers (igual que antes)
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setSelectedFile(e.dataTransfer.files[0]);
            setUploadComplete(true);
            e.dataTransfer.clearData();
            setIsUploaded(false); // reset upload status cuando se cambia archivo
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
            setUploadComplete(true);
            setIsUploaded(false); // reset upload status
        }
    };

    // El "Submit" solo marca como subido pero NO envía
    const handleSubmit = () => {
        if (activeTab === 'file' && selectedFile) {
            setIsUploaded(true);
        } else if (activeTab === 'url' && url.trim() !== '') {
            setIsUploaded(true);
        } else {
            toast.error('Please select a file or enter a URL before submitting.');
        }
    };

    // Botón de Confirmar Subida: envía los datos al padre y cierra modal
    const handleConfirmUpload = () => {
        if (activeTab === 'file' && selectedFile) {
            onSubmit({ file: selectedFile });
        } else if (activeTab === 'url' && url.trim() !== '') {
            onSubmit({ url: url.trim() });
        }
        setSelectedFile(null);
        setUploadComplete(false);
        setIsUploaded(false);
        onClose();
    };

    const handleUndo = () => {
        setSelectedFile(null);
        setUploadComplete(false);
        setIsUploaded(false);
    };

    return (
        <div className="bg-opacity-70 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="w-full max-w-lg rounded bg-[#121212] p-6 text-cyan-400 shadow-lg">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Import</h2>
                    <button onClick={onClose} aria-label="Close modal" className="text-xl font-bold text-cyan-400 hover:text-cyan-600">
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex border-b border-cyan-600 text-sm font-semibold">
                    <button
                        className={`flex-1 py-2 ${activeTab === 'file' ? 'border-b-2 border-cyan-500 text-cyan-500' : 'text-cyan-400 hover:text-cyan-500'}`}
                        onClick={() => setActiveTab('file')}
                    >
                        File
                    </button>
                    <button
                        className={`flex-1 py-2 ${activeTab === 'url' ? 'border-b-2 border-cyan-500 text-cyan-500' : 'text-cyan-400 hover:text-cyan-500'}`}
                        onClick={() => setActiveTab('url')}
                    >
                        URL
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'file' && (
                    <>
                        {!uploadComplete ? (
                            <label
                                htmlFor="fileUpload"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                className="flex h-28 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-cyan-600 bg-[#1a1a1a] p-4 text-center text-cyan-300 hover:border-cyan-500"
                            >
                                <svg
                                    className="mb-2 h-8 w-8 text-cyan-400"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>
                                    Drag & Drop your files or <span className="underline">Browse</span>
                                </span>
                                <input id="fileUpload" type="file" accept=".json" className="hidden" onChange={handleFileChange} />
                            </label>
                        ) : (
                            <div className="mb-4 flex items-center justify-between rounded bg-green-600 p-3 text-white">
                                <span>{selectedFile?.name} - Ready to upload</span>
                                <button onClick={handleUndo} className="font-bold hover:text-gray-300">
                                    ×
                                </button>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'url' && (
                    <input
                        type="url"
                        placeholder="Paste URL here (e.g., egg-minecraft.json)"
                        className="w-full rounded border border-cyan-600 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                )}

                {/* Buttons */}
                <div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="rounded bg-gray-700 px-4 py-2 text-cyan-400 hover:bg-gray-600">
                        Cancel
                    </button>

                    {/* Si ya está listo para subir, muestra el botón de confirmar */}
                    {isUploaded ? (
                        <button type="button" onClick={handleConfirmUpload} className="rounded bg-green-600 px-4 py-2 text-black hover:bg-green-700">
                            Confirm Upload
                        </button>
                    ) : (
                        <button type="button" onClick={handleSubmit} className="rounded bg-cyan-600 px-4 py-2 text-black hover:bg-cyan-700">
                            Submit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
