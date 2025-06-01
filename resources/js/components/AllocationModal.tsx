/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog } from '@headlessui/react';
import { useEffect, useState } from 'react';

export default function AllocationModal({
    isOpen,
    onClose,
    onSubmit,
    fqdn,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { ip: string; alias: string; ports: string }) => void;
    ipOptions: string[];
    fqdn: string;
}) {
    const [ip, setIp] = useState('');
    const [alias, setAlias] = useState('');
    const [ports, setPorts] = useState('');
    const [availableIps, setAvailableIps] = useState<string[]>([]);
    const [autoDetected, setAutoDetected] = useState<string | null>(null);

    useEffect(() => {
        const fetchIPs = async () => {
            const localIps: string[] = [];
            let resolved: string | null = null;

            try {
                const res = await fetch(`/api/network/ips`);
                const data = await res.json();
                localIps.push(...data);
            } catch {
                console.warn('No se pudieron obtener IPs locales');
            }

            try {
                const dnsRes = await fetch(`https://dns.google/resolve?name=${fqdn}&type=A`);
                const dnsData = await dnsRes.json();
                resolved = dnsData.Answer?.find((a: any) => a.type === 1)?.data || null;
            } catch {
                resolved = null;
            }

            const all = [...localIps, ...(resolved ? [resolved] : [])];
            const unique = Array.from(new Set(all));
            setAvailableIps(unique);

            if (resolved && unique.includes(resolved)) {
                setIp(resolved);
                setAutoDetected(resolved);
            }
        };

        fetchIPs();
    }, [fqdn]);
    
    const handleSubmit = () => {
        if (!ip) return alert('You must select an IP');
        onSubmit({ ip, alias, ports });
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 font-[Orbitron]">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
            <div className="relative z-50 w-full max-w-md rounded-xl border border-cyan-400 bg-neutral-950 p-6 text-white transition-all">
                <Dialog.Title className="mb-4 text-xl font-bold tracking-wider text-cyan-300">CREATE ALLOCATION</Dialog.Title>

                {/* IP Select */}
                <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-cyan-200">
                        IP Address <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                        className="w-full rounded border border-cyan-500 bg-neutral-900 p-2 text-white"
                    >
                        <option value="">Select an IP</option>
                        {availableIps.map((option, idx) => (
                            <option key={idx} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                    {autoDetected && (
                        <p className="mt-1 text-xs text-cyan-400">
                            Auto-detected from FQDN <code className="font-mono">{fqdn}</code>
                        </p>
                    )}
                </div>

                {/* Alias */}
                <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-cyan-200">Alias</label>
                    <input
                        type="text"
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        className="w-full rounded border border-cyan-500 bg-neutral-900 p-2 text-white placeholder-cyan-300"
                        placeholder="Optional display name"
                    />
                </div>

                {/* Ports */}
                <div className="mb-6">
                    <label className="mb-1 block text-sm font-medium text-cyan-200">Ports</label>
                    <input
                        type="text"
                        value={ports}
                        onChange={(e) => setPorts(e.target.value)}
                        className="w-full rounded border border-cyan-500 bg-neutral-900 p-2 text-white placeholder-cyan-300"
                        placeholder="27015, 27017-27019"
                        disabled={!ip}
                    />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded border border-cyan-400 bg-neutral-800 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-900/30"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="rounded border border-cyan-600 bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-600"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
