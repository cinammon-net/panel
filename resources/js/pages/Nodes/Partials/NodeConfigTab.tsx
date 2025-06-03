import { useEffect, useState } from 'react';
import { Copy, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NodeConfigTab({ nodeId }: { nodeId: number }) {
  const [yaml, setYaml] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/nodes/${nodeId}/config-yaml`)
      .then(res => res.json())
      .then(data => {
        setYaml(data.yaml);
        setLoading(false);
      });
  }, [nodeId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative rounded bg-[#111] p-6 font-mono text-sm text-white shadow-xl mt-4">
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <LoaderCircle className="animate-spin" />
          Cargando configuración...
        </div>
      ) : (
        <>
          <pre className="whitespace-pre-wrap break-all">{yaml}</pre>
          <Button onClick={handleCopy} size="sm" className="absolute top-4 right-4">
            <Copy className="w-4 h-4 mr-1" />
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </>
      )}
    </div>
  );
}
