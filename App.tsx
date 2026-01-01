
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    TwinCategory, TwinStatus, DigitalTwinDefinition, 
    DigitalTwinInstance, TwinEvent, UUID 
} from './types';
import { geminiService } from './services/geminiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// --- Mock Initial Data ---
const INITIAL_DEFINITIONS: DigitalTwinDefinition[] = [
    {
        id: 'def-1',
        name: "Smart ATM Hub",
        description: "Global representation of a bank ATM unit with cash levels and connectivity sensors.",
        category: TwinCategory.SMART_ATM,
        version: "1.2.0",
        schema: {
            properties: {
                cashLevel: { name: "cashLevel", type: "number", description: "Current cash in vault", unit: "USD" },
                temp: { name: "temp", type: "number", description: "Internal cabinet temperature", unit: "C" },
                connectivity: { name: "connectivity", type: "boolean", description: "Online status" },
                transactionsPerHour: { name: "transactionsPerHour", type: "number", description: "Usage density" }
            }
        },
        createdAt: new Date().toISOString()
    }
];

const INITIAL_INSTANCES: DigitalTwinInstance[] = [
    {
        id: 'inst-1',
        definitionId: 'def-1',
        name: "ATM-NYC-001",
        status: TwinStatus.ACTIVE,
        healthScore: 94,
        properties: { cashLevel: 12500, temp: 22, connectivity: true, transactionsPerHour: 45 },
        alerts: [],
        lastUpdate: new Date().toISOString()
    }
];

const App: React.FC = () => {
    // --- State ---
    const [view, setView] = useState<'dashboard' | 'models' | 'instances' | 'ai'>('dashboard');
    const [definitions, setDefinitions] = useState<DigitalTwinDefinition[]>(INITIAL_DEFINITIONS);
    const [instances, setInstances] = useState<DigitalTwinInstance[]>(INITIAL_INSTANCES);
    const [events, setEvents] = useState<TwinEvent[]>([]);
    const [selectedInstanceId, setSelectedInstanceId] = useState<UUID | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);

    // --- Derived State ---
    const selectedInstance = useMemo(() => 
        instances.find(i => i.id === selectedInstanceId), 
    [instances, selectedInstanceId]);

    // --- Ingestion Simulation ---
    useEffect(() => {
        const interval = setInterval(() => {
            setInstances(prev => prev.map(inst => {
                if (inst.status !== TwinStatus.ACTIVE) return inst;
                
                const updatedProps = { ...inst.properties };
                // Random walk simulation
                if (updatedProps.cashLevel) updatedProps.cashLevel -= Math.floor(Math.random() * 100);
                if (updatedProps.temp) updatedProps.temp += (Math.random() - 0.5);
                if (updatedProps.transactionsPerHour !== undefined) {
                    updatedProps.transactionsPerHour = Math.max(0, updatedProps.transactionsPerHour + Math.floor(Math.random() * 5 - 2));
                }

                return {
                    ...inst,
                    properties: updatedProps,
                    lastUpdate: new Date().toISOString()
                };
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // --- Handlers ---
    const handleGenerateSchema = async () => {
        if (!aiPrompt) return;
        setIsAiLoading(true);
        try {
            const result = await geminiService.generateSchema(aiPrompt);
            setAiResult({ type: 'schema', data: result });
            // For demo purposes, automatically add the generated schema
            const newDef: DigitalTwinDefinition = {
                id: `def-${Date.now()}`,
                name: result.name || "AI Generated Model",
                description: result.description || aiPrompt,
                category: result.category || TwinCategory.INFRASTRUCTURE_ASSET,
                version: result.version || "1.0.0",
                schema: result.schema,
                createdAt: new Date().toISOString()
            };
            setDefinitions(prev => [...prev, newDef]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleRunAnomalyDetection = async (inst: DigitalTwinInstance) => {
        setIsAiLoading(true);
        try {
            const def = definitions.find(d => d.id === inst.definitionId);
            const result = await geminiService.detectAnomalies(inst, def);
            setAiResult({ type: 'anomaly', data: result });
        } catch (e) {
            console.error(e);
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- Sub-components ---
    const SidebarItem = ({ icon, label, id, active }: { icon: string, label: string, id: any, active: boolean }) => (
        <button 
            onClick={() => setView(id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-cyan-600/20 text-cyan-400 border-l-4 border-cyan-500' : 'text-gray-400 hover:bg-gray-800'}`}
        >
            <i className={`fas ${icon} w-5`}></i>
            <span className="font-medium">{label}</span>
        </button>
    );

    const StatCard = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl shadow-sm">
            <p className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
                <div className="flex items-center space-x-2 px-2 mb-10">
                    <div className="bg-cyan-500 p-2 rounded-lg">
                        <i className="fas fa-microchip text-gray-950 text-xl"></i>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">OMNIBANK <span className="text-cyan-500 text-xs">TWIN</span></h1>
                </div>
                
                <nav className="flex-1 space-y-2">
                    <SidebarItem icon="fa-chart-pie" label="Dashboard" id="dashboard" active={view === 'dashboard'} />
                    <SidebarItem icon="fa-dna" label="Twin Models" id="models" active={view === 'models'} />
                    <SidebarItem icon="fa-server" label="Active Instances" id="instances" active={view === 'instances'} />
                    <SidebarItem icon="fa-brain" label="AI Workbench" id="ai" active={view === 'ai'} />
                </nav>

                <div className="mt-auto p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                    <div className="flex items-center space-x-3">
                        <img src="https://picsum.photos/40/40" className="rounded-full ring-2 ring-cyan-500/20" alt="User" />
                        <div>
                            <p className="text-sm font-bold">Admin User</p>
                            <p className="text-xs text-gray-500">Security Officer</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-950 p-8">
                
                {/* Dashboard View */}
                {view === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <header className="flex justify-between items-end">
                            <div>
                                <h2 className="text-4xl font-extrabold tracking-tight">Ecosystem Health</h2>
                                <p className="text-gray-400 mt-2">Real-time status of all digital twin deployments.</p>
                            </div>
                            <div className="flex space-x-3">
                                <button className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors border border-gray-700">
                                    <i className="fas fa-download mr-2"></i> Report
                                </button>
                                <button className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                                    <i className="fas fa-plus mr-2"></i> Deploy New
                                </button>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard label="Total Twin Models" value={definitions.length} color="text-white" />
                            <StatCard label="Active Instances" value={instances.length} color="text-emerald-400" />
                            <StatCard label="Active Alerts" value={instances.reduce((acc, i) => acc + i.alerts.length, 0)} color="text-rose-400" />
                            <StatCard label="System Health" value="98.2%" color="text-cyan-400" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
                                <h3 className="text-xl font-bold mb-6">Aggregate Ingestion Rate</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={[
                                            { time: '10:00', rate: 400 },
                                            { time: '10:05', rate: 600 },
                                            { time: '10:10', rate: 550 },
                                            { time: '10:15', rate: 900 },
                                            { time: '10:20', rate: 850 },
                                            { time: '10:25', rate: 1100 },
                                        ]}>
                                            <defs>
                                                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                            <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} />
                                            <Area type="monotone" dataKey="rate" stroke="#06b6d4" fillOpacity={1} fill="url(#colorRate)" strokeWidth={3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                                <h3 className="text-xl font-bold mb-6">Recent Alerts</h3>
                                <div className="space-y-4">
                                    {instances.flatMap(i => i.alerts).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                                            <i className="fas fa-shield-check text-4xl mb-4 text-emerald-500/20"></i>
                                            <p>No critical alerts detected</p>
                                        </div>
                                    ) : (
                                        instances.flatMap(i => i.alerts).map(a => (
                                            <div key={a.id} className="p-4 bg-gray-800 rounded-xl border-l-4 border-rose-500">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-sm">{a.message}</p>
                                                    <span className="text-xs text-rose-400 font-bold uppercase tracking-tighter">{a.severity}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{new Date(a.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Instances View */}
                {view === 'instances' && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                        <header>
                            <h2 className="text-4xl font-extrabold tracking-tight">Active Instances</h2>
                            <p className="text-gray-400 mt-2">Manage and monitor live digital twin instances.</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {instances.map(inst => (
                                <div 
                                    key={inst.id} 
                                    className={`bg-gray-900 border ${selectedInstanceId === inst.id ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-gray-800'} p-6 rounded-2xl transition-all cursor-pointer hover:border-gray-600`}
                                    onClick={() => setSelectedInstanceId(inst.id)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-xl font-bold">{inst.name}</h4>
                                            <p className="text-xs text-gray-500 font-mono mt-1 uppercase tracking-widest">{inst.id}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${inst.status === TwinStatus.ACTIVE ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                            {inst.status}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 my-6">
                                        <div className="p-3 bg-gray-800 rounded-xl">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Health Score</p>
                                            <p className={`text-xl font-bold ${inst.healthScore > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{inst.healthScore}%</p>
                                        </div>
                                        <div className="p-3 bg-gray-800 rounded-xl">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Alert Count</p>
                                            <p className="text-xl font-bold">{inst.alerts.length}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {Object.entries(inst.properties).slice(0, 3).map(([k, v]) => (
                                            <div key={k} className="flex justify-between items-center text-sm border-b border-gray-800 pb-2">
                                                <span className="text-gray-500 capitalize">{k}</span>
                                                <span className="font-mono text-cyan-400">{typeof v === 'boolean' ? (v ? 'YES' : 'NO') : v}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRunAnomalyDetection(inst); setView('ai'); }}
                                        className="w-full mt-6 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-sm font-bold transition-colors border border-gray-700"
                                    >
                                        <i className="fas fa-brain mr-2 text-cyan-400"></i> Run AI Analysis
                                    </button>
                                </div>
                            ))}
                        </div>

                        {selectedInstance && (
                            <div className="mt-12 bg-gray-900 border border-gray-800 rounded-2xl p-8 animate-in fade-in zoom-in duration-300">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-bold">Deep Dive: {selectedInstance.name}</h3>
                                    <div className="flex space-x-2">
                                        <button className="bg-emerald-600/20 text-emerald-400 px-4 py-2 rounded-lg text-sm font-bold border border-emerald-500/20">
                                            Live Stream Active
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6">Property Real-time Stream</h4>
                                        <div className="h-64 bg-gray-800/50 rounded-2xl border border-gray-700 p-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={[
                                                    { time: 'T-5', val: selectedInstance.properties.cashLevel || 0 },
                                                    { time: 'T-4', val: (selectedInstance.properties.cashLevel || 0) - 100 },
                                                    { time: 'T-3', val: (selectedInstance.properties.cashLevel || 0) + 50 },
                                                    { time: 'T-2', val: (selectedInstance.properties.cashLevel || 0) - 20 },
                                                    { time: 'T-1', val: (selectedInstance.properties.cashLevel || 0) },
                                                ]}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                                    <XAxis dataKey="time" hide />
                                                    <YAxis hide domain={['auto', 'auto']} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none' }} />
                                                    <Line type="stepAfter" dataKey="val" stroke="#06b6d4" strokeWidth={3} dot={false} isAnimationActive={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500">Diagnostics</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {Object.entries(selectedInstance.properties).map(([k, v]) => (
                                                <div key={k} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">{k}</p>
                                                    <p className="text-xl font-mono text-white truncate">{String(v)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Workbench View */}
                {view === 'ai' && (
                    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
                        <header className="text-center">
                            <div className="inline-block bg-cyan-600/10 text-cyan-400 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-cyan-500/20">
                                Powering by Gemini 3 Flash
                            </div>
                            <h2 className="text-5xl font-black tracking-tight mb-4">AI Workbench</h2>
                            <p className="text-gray-400 text-lg">Use advanced generative models to design, analyze, and predict twin behavior.</p>
                        </header>

                        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl rounded-full -mr-20 -mt-20"></div>
                            
                            <h3 className="text-2xl font-bold mb-6 flex items-center">
                                <i className="fas fa-magic mr-3 text-cyan-400"></i> Design Agent
                            </h3>
                            <p className="text-gray-400 mb-6">Describe a banking asset to automatically generate its digital twin architecture, schema, and validation rules.</p>
                            
                            <div className="relative">
                                <textarea 
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g., A smart commercial bank vault with multi-factor auth sensors, vibration detectors, and humidity controls..."
                                    className="w-full bg-gray-950 border border-gray-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-2xl p-6 text-lg transition-all h-40 resize-none outline-none"
                                />
                                <button 
                                    onClick={handleGenerateSchema}
                                    disabled={isAiLoading || !aiPrompt}
                                    className="absolute bottom-6 right-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/20"
                                >
                                    {isAiLoading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-sparkles mr-2"></i>}
                                    Generate Twin Architecture
                                </button>
                            </div>
                        </div>

                        {aiResult && (
                            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 animate-in slide-in-from-bottom duration-500">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-2xl font-bold">Analysis Results</h3>
                                    <button 
                                        onClick={() => setAiResult(null)}
                                        className="text-gray-500 hover:text-white"
                                    >
                                        <i className="fas fa-times text-xl"></i>
                                    </button>
                                </div>

                                {aiResult.type === 'schema' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-2">Model Name</h4>
                                                <p className="text-2xl font-bold">{aiResult.data.name}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-2">Architectural Logic</h4>
                                                <p className="text-gray-400 leading-relaxed">{aiResult.data.description}</p>
                                            </div>
                                            <div className="flex items-center space-x-2 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                                <i className="fas fa-check-circle text-emerald-400"></i>
                                                <span className="text-emerald-400 font-bold text-sm">Successfully integrated into Model Library</span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Schema Map</h4>
                                            <div className="space-y-3">
                                                {Object.entries(aiResult.data.schema.properties).map(([name, prop]: [string, any]) => (
                                                    <div key={name} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                                                        <div>
                                                            <p className="text-sm font-bold">{name}</p>
                                                            <p className="text-[10px] text-gray-500 uppercase">{prop.type}</p>
                                                        </div>
                                                        {prop.unit && <span className="text-[10px] bg-cyan-900/40 text-cyan-400 px-2 py-1 rounded border border-cyan-500/20 font-bold uppercase">{prop.unit}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {aiResult.type === 'anomaly' && (
                                    <div className="space-y-8">
                                        <div className="p-6 bg-gray-950 rounded-2xl border border-gray-800">
                                            <h4 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-2">Executive Summary</h4>
                                            <p className="text-xl italic font-medium">"{aiResult.data.summary}"</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {aiResult.data.anomalies.map((a: any, i: number) => (
                                                <div key={i} className={`p-5 rounded-2xl border ${a.severity === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <i className={`fas ${a.severity === 'CRITICAL' ? 'fa-radiation' : 'fa-triangle-exclamation'} ${a.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}></i>
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${a.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}>{a.severity} RISK</span>
                                                    </div>
                                                    <p className="text-sm font-medium">{a.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
