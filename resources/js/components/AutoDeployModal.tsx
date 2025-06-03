import { useState } from 'react';
import { ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';

interface AutoDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  panelUrl: string;
  token: string;
  nodeId: number;
}

export default function AutoDeployModal({ isOpen, onClose, panelUrl, token, nodeId }: AutoDeployModalProps) {
  if (!isOpen) return null;

  const [installType, setInstallType] = useState<'standalone' | 'docker'>('standalone');

  const command =
    installType === 'standalone'
      ? `sudo wings configure --panel-url ${panelUrl} --token ${token} --node ${nodeId}`
      : `docker compose exec -it wings configure --panel-url ${panelUrl} --token ${token} --node ${nodeId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    toast.success('Comando copiado al portapapeles');
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-transparent backdrop-blur-sm">
      <div className="max-w-[500px] w-full rounded border border-cyan-500 bg-black p-6 font-[Orbitron] text-cyan-400 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-extrabold tracking-wide">Auto Deploy Command</h2>
          <button
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-600 font-extrabold text-xl leading-none transition-colors duration-200"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <p className="mb-4 text-sm text-cyan-400">Types</p>
        <div className="mb-4 flex gap-4">
          <button
            onClick={() => setInstallType('standalone')}
            className={`rounded border border-cyan-500 px-3 py-2 font-bold transition-colors ${
              installType === 'standalone' ? 'bg-cyan-700 hover:bg-cyan-600 text-white' : 'bg-transparent hover:bg-cyan-600 text-cyan-400'
            }`}
          >
            Standalone
          </button>
          <button
            onClick={() => setInstallType('docker')}
            className={`rounded border border-cyan-500 px-4 py-2 font-bold transition-colors ${
              installType === 'docker' ? 'bg-cyan-700 hover:bg-cyan-600 text-white' : 'bg-transparent hover:bg-cyan-600 text-cyan-400'
            }`}
          >
            Docker
          </button>
        </div>
        <label className="block mb-2 text-sm font-semibold tracking-wide text-cyan-400 relative">
          Command
          <button
            onClick={handleCopy}
            className="absolute right-2 top-0 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold text-cyan-300 hover:text-cyan-500"
            aria-label="Copy command"
            type="button"
          >
            <ClipboardCopy size={14} />
            Copy
          </button>
        </label>
        <pre className="relative max-w-full max-h-[110px] overflow-auto rounded border border-cyan-500 bg-black p-3 font-mono text-sm text-cyan-300 whitespace-pre-wrap break-words">
          {command}
        </pre>
      </div>
    </div>
  );
}
