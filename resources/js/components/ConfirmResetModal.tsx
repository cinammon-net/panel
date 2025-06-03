import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface ConfirmResetModalProps {
  isOpen: boolean;
  onCancel: () => void;
  nodeId: number;
  onResetSuccess: () => void;
}

export default function ConfirmResetModal({ isOpen, onCancel, nodeId, onResetSuccess }: ConfirmResetModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/nodes/${nodeId}/reset`); 
      onResetSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Error al resetear el nodo');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black bg-opacity-90">
      <div className="max-w-md rounded border border-red-600 bg-black p-6 font-[Orbitron] text-cyan-400 relative">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-700 p-3 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h2 className="mb-4 text-center text-lg font-bold text-white">Reset Authorization Token</h2>
        <p className="mb-6 px-2 text-center text-sm text-gray-400 leading-relaxed">
          Resetting the daemon token will void any request coming from the old token. This token is used for all sensitive operations on the daemon including server creation and deletion. We suggest changing this token regularly for security.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              console.log('Reset canceled');
              onCancel();
            }}
            disabled={loading}
            className="rounded border border-cyan-600 bg-transparent px-6 py-2 text-cyan-400 transition-colors hover:bg-cyan-600 hover:text-black"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`rounded px-6 py-2 font-semibold text-white transition-colors ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
            type="button"
          >
            {loading ? 'Resetting...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
