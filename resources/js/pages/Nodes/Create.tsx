import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Lock, LockOpen, Server, Settings, Shield, ArrowRight, BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

// Función para validar dominio tipo FQDN
function validateDomain(domain: string): boolean {
    const fqdnRegex = /^(?!-)(?!.*--)([a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,}$/;
    return fqdnRegex.test(domain.trim());
}

export default function CreateNode() {
    const [step, setStep] = useState(1);
    const [node, setNode] = useState({
        fqdn: '',
        daemon_listen: 8080,
        name: '',
        scheme: 'https',
        maintenance_mode: false,
        deployments: false,
        upload_limit: 1024,
        sftp_port: 2022,
        sftp_alias: '',
        tags: '',
        uuid: uuidv4(),
        memory: 'unlimited',
        disk: 'unlimited',
        cpu: 'unlimited',
    });
    const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
    const [dnsValid, setDnsValid] = useState<boolean | null>(null);
    const [dnsIp, setDnsIp] = useState('...');
    const [sslMode, setSslMode] = useState('https');
    const [maintenanceMode, setMaintenanceMode] = useState<'enabled' | 'disabled'>('disabled');
    const [useDeployments, setUseDeployments] = useState<'yes' | 'no'>('no');
    
    const [memory, setMemory] = useState<'unlimited' | 'limited'>('unlimited');
    const [memoryLimit, setMemoryLimit] = useState('');
    const [memoryOverallocate, setMemoryOverallocate] = useState('');

    const [disk, setDisk] = useState<'unlimited' | 'limited'>('unlimited');
    const [diskLimit, setDiskLimit] = useState('');
    const [diskOverallocate, setDiskOverallocate] = useState('');

    const [cpu, setCpu] = useState<'unlimited' | 'limited'>('unlimited');
    const [cpuLimit, setCpuLimit] = useState('');
    const [cpuOverallocate, setCpuOverallocate] = useState('');

    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    const validateAndFetchIp = async (domain: string) => {
        const isValidFormat = validateDomain(domain);
        if (!isValidFormat) {
            setDnsValid(false);
            setDnsIp('Invalid domain');
            return;
        }

        try {
            const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
            const data = await response.json();

            type DnsAnswer = { name: string; type: number; TTL: number; data: string };

            if (data?.Answer && data.Answer.length > 0) {
                const ipAnswer = data.Answer.find((ans: DnsAnswer) => ans.type === 1);
                if (ipAnswer && ipAnswer.data) {
                    setDnsIp(ipAnswer.data);
                    setDnsValid(true);
                } else {
                    setDnsIp('No IP found');
                    setDnsValid(false);
                }
            } else {
                setDnsIp('No IP found');
                setDnsValid(false);
            }
        } catch {
            setDnsIp('Error fetching IP');
            setDnsValid(false);
        }
    };

    const canGoNext = () => {
        return node.fqdn.trim() !== '' && node.name.trim() !== '' && node.daemon_listen !== null && dnsValid === true;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;

        if (name === 'fqdn') {
            validateAndFetchIp(value);
        }

        setNode((prev) => {
            if (name === 'fqdn' && !nameManuallyEdited) {
                const autoName = value.split('.')[0] || '';
                return { ...prev, fqdn: value, name: autoName };
            }
            if (name === 'name') {
                setNameManuallyEdited(true);
            }
            return { ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value };
        });
    };

    const handleSubmit = () => {
        router.post(
            '/nodes',
            { ...node, ssl_mode: sslMode },
            {
                onSuccess: () => {
                    toast.success('Nodo creado correctamente');
                },
                onError: ($error) => {
                    console.error($error);
                    toast.error('Error al crear el nodo. Por favor, revisa los campos e intenta nuevamente.');
                },
            },
        );
    };
    

    const TagInput = ({ tags, onChange }: { tags: string[]; onChange: (newTags: string[]) => void }) => {
        const [inputValue, setInputValue] = useState('');
        const addTag = () => {
            const val = inputValue.trim();
            if (val && !tags.includes(val)) {
                onChange([...tags, val]);
                setInputValue('');
            }
        };
        const removeTag = (tagToRemove: string) => {
            onChange(tags.filter((t) => t !== tagToRemove));
        };
        return (
            <div className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600">
                <input
                    type="text"
                    className="w-full rounded-md bg-[#1a1a1a] px-2 py-2 text-cyan-400 placeholder:text-cyan-600 hover:bg-[#1a1a1a] focus:outline-none"
                    placeholder="New tag"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />

                {/* Línea de separación sin margen */}
                <div className="border-b border-cyan-600" />
                <div className="flex flex-wrap items-center gap-1 rounded-b-md bg-[#1a1a1a] px-2 py-1">
                    {tags.map((tag) => (
                        <div key={tag} className="flex items-center gap-1 rounded bg-cyan-600 px-3 py-1 text-xs font-semibold text-white">
                            {tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="rounded px-1 transition hover:bg-cyan-800 hover:text-white"
                                aria-label={`Remove tag ${tag}`}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const breadcrumbs = [
        { title: 'Nodes', href: '/nodes' },
        { title: 'Create', href: '/nodes/create' },
    ];

    if (step === 1) {
        breadcrumbs.push({ title: 'Basic Settings', href: '/nodes/create' });
    } else if (step === 2) {
        breadcrumbs.push({ title: 'Advanced Settings', href: '/nodes/create' });
    }


    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Nodes', href: '/nodes' },
                { title: 'Create', href: '/nodes/create' },
                ...(step === 1
                    ? [{ title: 'Basic Settings', href: '/nodes/create' }]
                    : step === 2
                      ? [{ title: 'Advanced Settings', href: '/nodes/create' }]
                      : []),
            ]}
        >
            <Head>
                <title>Create Node</title>
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="mb-6 flex items-center justify-between border-cyan-600">
                    <h1 className="text-3xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400 dark:drop-shadow-[0_0_5px_#0ff]">
                        CREATE NODE
                    </h1>
                </div>

                <div className="rounded-lg border-2 border-cyan-600 md:px-0">
                    <div className="mb-6 flex flex-wrap border-b border-cyan-700">
                        <ol
                            id="ol-1"
                            className="scrollbar-hide grid w-full grid-cols-[220px_270px] grid-rows-[62px] gap-x-62 overflow-y-hidden border-b border-cyan-700"
                        >
                            <li className="relative left-[20px] flex h-full items-center">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className={`appearance-button flex max-w-[200px] items-center gap-3 rounded-full border-1 px-4 py-2 transition-colors duration-300 ${
                                        step === 1
                                            ? 'border-cyan-500 text-cyan-400'
                                            : 'border-transparent text-cyan-500 hover:border-cyan-600 hover:text-cyan-600'
                                    }`}
                                >
                                    {step > 1 ? <BadgeCheck size={24} className="text-cyan-400" /> : <Server size={24} />}
                                    <span className="select-none">Basic Settings</span>
                                </button>

                                <div className="absolute left-[370px] h-full w-7 text-cyan-600 md:block">
                                    <svg fill="none" preserveAspectRatio="none" viewBox="0 0 22 80" className="h-full w-full">
                                        <path
                                            d="M0 -2L20 40L0 82"
                                            stroke="currentColor"
                                            strokeLinejoin="round"
                                            vectorEffect="non-scaling-stroke"
                                            fill="none"
                                        />
                                    </svg>
                                </div>
                            </li>

                            <li className="relative flex items-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (canGoNext()) {
                                            setStep(2);
                                        } else {
                                            toast.error('Por favor completa todos los campos requeridos correctamente antes de continuar.');
                                        }
                                    }}
                                    className={`appearance-button flex items-center gap-4 rounded-full border-1 px-5 py-2 transition-colors duration-300 ${
                                        step === 2
                                            ? 'border-cyan-500 text-cyan-400'
                                            : 'border-transparent text-cyan-500 hover:border-cyan-600 hover:text-cyan-600'
                                    }`}
                                >
                                    {step > 2 ? <BadgeCheck size={24} className="text-green-400" /> : <Settings size={24} />}
                                    <span className="select-none">Advanced Settings</span>
                                </button>
                            </li>
                        </ol>
                    </div>

                    <div className="mb-5 flex flex-col gap-4 px-6">
                        {step === 1 && (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {/* Selector FQDN sin constante */}
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="fqdn">
                                        Domain Name *
                                    </label>
                                    <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
                                        <Server className="ml-2 h-5 w-5 text-cyan-500" />
                                        <input
                                            id="fqdn"
                                            name="fqdn"
                                            type="text"
                                            placeholder="node.example.com"
                                            value={node.fqdn}
                                            onChange={handleChange}
                                            className="border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                        />
                                    </div>
                                    <p
                                        className={`mt-1 text-xs ${
                                            dnsValid === false ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                    >
                                        {dnsValid === false
                                            ? 'Invalid domain format. Example: node.example.com'
                                            : "This is the domain name that points to your node's IP Address."}
                                    </p>
                                </div>

                                {/* Selector DNS sin constante */}
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="dns-BadgeCheck" className="flex items-center text-sm font-semibold">
                                        DNS Record BadgeCheck
                                        <span
                                            className={`ml-auto ${
                                                dnsValid === null
                                                    ? 'text-gray-500 dark:text-gray-400'
                                                    : dnsValid
                                                      ? 'text-green-500'
                                                      : 'text-red-600 dark:text-red-400'
                                            }`}
                                        >
                                            {dnsIp}
                                        </span>
                                    </label>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <button
                                            className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                dnsValid
                                                    ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                    : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                            }`}
                                            disabled={!dnsValid}
                                            onClick={() => {}}
                                        >
                                            Valid
                                        </button>

                                        <button
                                            className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                dnsValid === false
                                                    ? 'border-red-600 bg-red-600 text-white dark:bg-red-700/80 dark:text-white dark:hover:bg-red-800'
                                                    : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                            }`}
                                            disabled={dnsValid !== false}
                                            onClick={() => {}}
                                        >
                                            Invalid
                                        </button>
                                    </div>
                                </div>

                                {/* Selector Port sin constante */}
                                <div>
                                    <label htmlFor="port" className="mb-1 block text-sm font-semibold text-cyan-400">
                                        Port*
                                    </label>
                                    <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
                                        <Server className="ml-2 h-5 w-5 text-cyan-500" />
                                        <input
                                            id="port"
                                            name="daemon_listen"
                                            type="number"
                                            placeholder="8080"
                                            value={node.daemon_listen}
                                            onChange={handleChange}
                                            className="border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        If you are running the daemon behind Cloudflare you should set the daemon port to 8443 to allow websocket
                                        proxying over SSL.
                                    </p>
                                </div>

                                {/* Selector Name sin constante */}
                                <div>
                                    <label htmlFor="name" className="mb-1 block text-sm font-semibold text-cyan-400">
                                        Node Name *
                                    </label>
                                    <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
                                        <Server className="ml-2 h-5 w-5 text-cyan-500" />
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            placeholder="My Node"
                                            value={node.name}
                                            onChange={handleChange}
                                            className="border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        This is the name that will be displayed in the panel for this node.
                                    </p>
                                </div>

                                {/* Selector SSL sin constante */}
                                <div className="grid">
                                    <label className="mb block font-semibold text-white">Communicate over SSL</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div
                                            role="radio"
                                            aria-checked={sslMode === 'http'}
                                            tabIndex={-1}
                                            className="text-white-600 flex items-center gap-3 rounded border border-cyan-700 bg-cyan-800 px-4 py-2 dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60"
                                            aria-disabled="true"
                                        >
                                            <LockOpen size={18} />
                                            <span>HTTP</span>
                                        </div>

                                        <div
                                            role="radio"
                                            aria-checked={sslMode === 'https'}
                                            tabIndex={0}
                                            onClick={() => setSslMode('https')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSslMode('https');
                                                }
                                            }}
                                            className={`flex items-center gap-3 rounded border px-4 py-2 select-none ${
                                                sslMode === 'https'
                                                    ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                    : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                            } `}
                                        >
                                            <Lock size={18} />
                                            <span>HTTPS (SSL)</span>
                                        </div>

                                        <div
                                            role="radio"
                                            aria-checked={sslMode === 'https-reverse'}
                                            tabIndex={0}
                                            onClick={() => setSslMode('https-reverse')}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSslMode('https-reverse');
                                                }
                                            }}
                                            className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                sslMode === 'https-reverse'
                                                    ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                    : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                            } `}
                                        >
                                            <Shield size={38} />
                                            <span>HTTPS with (reverse) proxy</span>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-300">
                                        {sslMode === 'http' && 'Not secure connection'}
                                        {sslMode === 'https' && 'Your Panel is using a secure SSL connection, so your Daemon must too.'}
                                        {sslMode === 'https-reverse' && 'Secure connection behind a reverse proxy'}
                                    </p>
                                </div>

                                {/* Selector Daemon sin constante */}
                                <div className="mt-6 flex items-center justify-end sm:mt-12">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (canGoNext()) {
                                                setStep(2);
                                            } else {
                                                toast.error('Por favor completa todos los campos requeridos correctamente antes de continuar.');
                                            }
                                        }}
                                        disabled={!canGoNext()}
                                        className={`flex items-center justify-center rounded bg-cyan-600 px-4 py-2 text-white transition-colors duration-300 ${
                                            canGoNext() ? 'hover:bg-cyan-700' : 'cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        Next Step
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="grid grid-cols-1 gap-6">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {' '}
                                    {/* Selector Maintenance Mode, Use for Deployments, Tags */}
                                    {/* Selector Deployments */}
                                    <div>
                                        <label
                                            onMouseEnter={() => setActiveTooltip('maintenance')}
                                            onMouseLeave={() => setActiveTooltip(null)}
                                            className="mb-1 block flex items-center gap-64 text-sm font-semibold text-white"
                                        >
                                            Maintenance Mode
                                            <div
                                                className="relative flex h-5 w-5 cursor-pointer items-center justify-center font-bold text-white"
                                                aria-label="Help"
                                            >
                                                ?
                                                {activeTooltip === 'maintenance' && (
                                                    <div className="absolute bottom-full mb-2 w-48 rounded bg-cyan-900 p-2 text-xs text-white shadow-lg">
                                                        If the node is marked 'Under Maintenance' users won't be able to access servers that are on
                                                        that node
                                                        <div className="absolute top-full left-1/2 -ml-2 h-2 w-2 rotate-45 bg-gray-900"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </label>

                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <button
                                                type="button"
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                    maintenanceMode === 'enabled'
                                                        ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                        : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                                onClick={() => setMaintenanceMode('enabled')}
                                            >
                                                Enabled
                                            </button>

                                            <button
                                                type="button"
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                    maintenanceMode === 'disabled'
                                                        ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                        : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                                onClick={() => setMaintenanceMode('disabled')}
                                            >
                                                Disabled
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold text-white">Use for Deployments?</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                    useDeployments === 'yes'
                                                        ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                        : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                                onClick={() => setUseDeployments('yes')}
                                            >
                                                Yes
                                            </button>

                                            <button
                                                type="button"
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                    useDeployments === 'no'
                                                        ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                        : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                                onClick={() => setUseDeployments('no')}
                                            >
                                                No
                                            </button>
                                        </div>
                                    </div>
                                    {/* Selector Tags */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold text-white">Tags</label>
                                        <TagInput
                                            tags={node.tags
                                                .split(',')
                                                .map((tag) => tag.trim())
                                                .filter((tag) => tag !== '')}
                                            onChange={(newTags) => setNode({ ...node, tags: newTags.join(',') })}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {/* Upload Limit, SFTP Port, SFTP Alias */}
                                    {/* Upload Limit */}
                                    <div>
                                        <label
                                            onMouseEnter={() => setActiveTooltip('uploadLimit')}
                                            onMouseLeave={() => setActiveTooltip(null)}
                                            htmlFor="uploadLimit"
                                            className="mb-1 block flex items-center gap-73 text-sm font-semibold text-white"
                                        >
                                            <div>
                                                Upload Limit <span className="text-red-500">*</span>
                                            </div>
                                            <div
                                                className="relative flex h-5 w-5 cursor-pointer items-center justify-center rounded text-xs font-bold text-white"
                                                aria-label="Help"
                                            >
                                                ?
                                                {activeTooltip === 'uploadLimit' && (
                                                    <div className="absolute bottom-full mb-2 w-64 rounded bg-cyan-900 p-2 text-xs text-white shadow-lg">
                                                        Make sure your webserver supports file uploads of this size!
                                                        <div className="absolute top-full left-1/2 -ml-2 h-2 w-2 rotate-45 bg-cyan-900"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </label>

                                        <div className="relative flex w-full items-center rounded border border-cyan-700 bg-[#1a1a1a]">
                                            {/* Input */}
                                            <input
                                                id="uploadLimit"
                                                name="upload_limit"
                                                type="number"
                                                placeholder="256"
                                                value={node.upload_limit}
                                                onChange={(e) => setNode({ ...node, upload_limit: Number(e.target.value) })}
                                                className="w-full bg-transparent p-2 pl-3 text-cyan-300 placeholder-cyan-600 focus:outline-none"
                                                style={{ border: 'none' }} // quitamos border para que solo se vea el contenedor
                                            />

                                            {/* Unidad con línea vertical */}
                                            <span className="pointer-events-none absolute top-0 right-3 bottom-0 flex items-center border-l border-cyan-500 px-3 text-cyan-400 select-none">
                                                MB
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400">
                                            Enter the maximum size of files that can be uploaded through the web-based file manager.
                                        </p>
                                    </div>
                                    {/* SFTP Port */}
                                    <div>
                                        <label htmlFor="sftpPort" className="mb-1 block text-sm font-semibold text-white">
                                            SFTP Port <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative flex w-full items-center rounded border border-cyan-700 bg-[#1a1a1a]">
                                            <input
                                                id="sftpPort"
                                                name="sftp_port"
                                                type="number"
                                                placeholder="22"
                                                value={node.sftp_port}
                                                onChange={(e) => setNode({ ...node, sftp_port: Number(e.target.value) })}
                                                className="w-full bg-transparent p-2 pl-3 text-cyan-300 placeholder-cyan-600 focus:outline-none"
                                                style={{ border: 'none' }} // quitamos border para que solo se vea el contenedor
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400">
                                            The port used for SFTP connections. Make sure this port is open in your firewall.
                                        </p>
                                    </div>
                                    {/* SFTP Alias */}
                                    <div>
                                        <label htmlFor="sftpAlias" className="mb-1 block text-sm font-semibold text-white">
                                            SFTP Alias <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative flex w-full items-center rounded border border-cyan-700 bg-[#1a1a1a]">
                                            <input
                                                id="sftpAlias"
                                                name="sftp_alias"
                                                type="text"
                                                placeholder="my-node-sftp"
                                                value={node.sftp_alias}
                                                onChange={(e) => setNode({ ...node, sftp_alias: e.target.value })}
                                                className="w-full bg-transparent p-2 pl-3 text-cyan-300 placeholder-cyan-600 focus:outline-none"
                                                style={{ border: 'none' }} // quitamos border para que solo se vea el contenedor
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400">
                                            Display alias for the SFTP address. Leave empty to use the Node FQDN.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-1 gap-6 text-sm text-white sm:grid-cols-2 md:grid-cols-3">
                                    {/* Memory */}
                                    <div>
                                        <span>
                                            Memory <span className="text-red-500">*</span>
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setMemory('unlimited')}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                    memory === 'unlimited'
                                                        ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                        : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                            >
                                                Unlimited
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMemory('limited')}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                    memory === 'limited'
                                                        ? 'border-[#ff9f00] bg-[#ff9f00] text-white dark:bg-[#cc8700] dark:text-white dark:hover:bg-[#e0a629]'
                                                        : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                            >
                                                Limited
                                            </button>
                                        </div>
                                        {memory === 'limited' ? (
                                            <>
                                                <span className="justify-self-end pr-2 whitespace-nowrap">
                                                    Memory Limit <span className="text-red-500">*</span>
                                                </span>
                                                <div className="relative flex w-full items-center">
                                                    <input
                                                        type="number"
                                                        value={memoryLimit}
                                                        onChange={(e) => setMemoryLimit(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-12 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                    >
                                                        MiB
                                                    </button>
                                                </div>

                                                <span className="justify-self-end pr-2 whitespace-nowrap">
                                                    Overallocate <span className="text-red-500">*</span>
                                                </span>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="number"
                                                        value={memoryOverallocate}
                                                        onChange={(e) => setMemoryOverallocate(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-10 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                    >
                                                        %
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </>
                                        )}
                                    </div>

                                    {/* Disk */}
                                    <div>
                                        <span>
                                            Disk <span className="text-red-500">*</span>
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDisk('unlimited')}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                    disk === 'unlimited'
                                                        ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                        : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                            >
                                                Unlimited
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDisk('limited')}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                    disk === 'limited'
                                                        ? 'border-[#ff9f00] bg-[#ff9f00] text-white dark:bg-[#cc8400]/80 dark:text-white dark:hover:bg-[#e6a600]'
                                                        : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                            >
                                                Limited
                                            </button>
                                        </div>
                                        {disk === 'limited' ? (
                                            <>
                                                <span className="justify-self-end pr-2 whitespace-nowrap">
                                                    Disk Limit <span className="text-red-500">*</span>
                                                </span>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="number"
                                                        value={diskLimit}
                                                        onChange={(e) => setDiskLimit(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-12 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                    >
                                                        MiB
                                                    </button>
                                                </div>

                                                <span className="justify-self-end pr-2 whitespace-nowrap">
                                                    Overallocate <span className="text-red-500">*</span>
                                                </span>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="number"
                                                        value={diskOverallocate}
                                                        onChange={(e) => setDiskOverallocate(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-10 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                    >
                                                        %
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </>
                                        )}
                                    </div>

                                    {/* CPU */}
                                    <div>
                                        <span>
                                            CPU <span className="text-red-500">*</span>
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCpu('unlimited')}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                    cpu === 'unlimited'
                                                        ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                        : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                            >
                                                Unlimited
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCpu('limited')}
                                                className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                    cpu === 'limited'
                                                        ? 'border-[#ff9f00] bg-[#ff9f00] text-white dark:bg-[#cc8400]/80 dark:text-white dark:hover:bg-[#e6a600]'
                                                        : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                }`}
                                            >
                                                Limited
                                            </button>
                                        </div>
                                        {cpu === 'limited' ? (
                                            <>
                                                <span className="justify-self-end pr-2 whitespace-nowrap">
                                                    CPU Limit <span className="text-red-500">*</span>
                                                </span>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="number"
                                                        value={cpuLimit}
                                                        onChange={(e) => setCpuLimit(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-12 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                    >
                                                        %
                                                    </button>
                                                </div>

                                                <span className="justify-self-end pr-2 whitespace-nowrap">
                                                    Overallocate <span className="text-red-500">*</span>
                                                </span>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="number"
                                                        value={cpuOverallocate}
                                                        onChange={(e) => setCpuOverallocate(e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-10 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                    >
                                                        %
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    {/* Botón para crear el nodo */}
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={!canGoNext()}
                                        className={`flex items-center justify-center rounded bg-cyan-600 px-4 py-2 text-white transition-colors duration-300 ${
                                            canGoNext() ? 'hover:bg-cyan-700' : 'cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        Create Node
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
