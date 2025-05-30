// components/ReviewModal.tsx

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ReviewModal({ isOpen, onClose }: ReviewModalProps) {
    if (!isOpen) return null;

    return (
        <div className="bg-opacity-70 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="relative w-full max-w-md rounded-lg bg-black p-6 text-white shadow-lg">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-2xl font-bold text-pink-400 hover:text-pink-600"
                    aria-label="Cerrar modal"
                >
                    ×
                </button>
                <h3 className="mb-4 text-xl font-semibold">Deja tu reseña</h3>

                {/* Formulario para enviar reseña */}
                <form action="/reviews" method="POST" className="flex flex-col gap-4">
                    <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''} />
                    <textarea
                        name="comment"
                        rows={4}
                        placeholder="Escribe tu reseña aquí..."
                        className="w-full rounded border border-pink-500 bg-transparent p-2 text-white placeholder-pink-500 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                        required
                    />
                    <select
                        name="rating"
                        className="w-full rounded border border-pink-500 bg-black p-2 font-mono text-lg tracking-widest text-yellow-400 focus:ring-2 focus:ring-pink-400 focus:outline-none"
                        required
                        defaultValue=""
                    >
                        <option value="" disabled className="bg-black text-yellow-400">
                            Calificación
                        </option>
                        {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n} className="bg-black text-yellow-400">
                                {'★ '.repeat(n).trim()}
                            </option>
                        ))}
                    </select>

                    <button type="submit" className="rounded bg-pink-600 py-2 font-semibold text-white transition hover:bg-pink-700">
                        Enviar reseña
                    </button>
                </form>
            </div>
        </div>
    );
}
