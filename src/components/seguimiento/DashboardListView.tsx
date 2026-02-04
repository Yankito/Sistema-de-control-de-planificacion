import { useState, useMemo, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, TrendingUp, User, ArrowRight, Plus, Factory, CheckCircle2, X } from "lucide-react";
import { TechStats } from "../../logic/technicianAnalysis";
import { OTFlowResult, BacklogStats } from "../../logic/backlogAnalysis";

interface DashboardListViewProps {
  onClose: () => void;
  periodoLabel: string;
  flowStats: BacklogStats;
  techStats: TechStats[];
  plantasDisponibles: string[];
  onSelectOT: (item: OTFlowResult) => void;
  onSelectTech: (item: TechStats) => void;
}

export const DashboardListView = ({
  onClose,
  periodoLabel,
  flowStats,
  techStats,
  plantasDisponibles,
  onSelectOT,
  onSelectTech
}: DashboardListViewProps) => {
  
  const [activeTab, setActiveTab] = useState<"FLOW" | "TECNICOS">("FLOW");
  const [subTabFlow, setSubTabFlow] = useState<"NUEVAS" | "CAMBIOS" | "FINALIZADAS">("NUEVAS");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlanta, setFilterPlanta] = useState("TODAS");
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  // Reset página al cambiar filtros
  useEffect(() => { setPage(1); }, [activeTab, subTabFlow, filterPlanta, searchTerm]);

  // Filtrado de Lista
  const listToDisplay = useMemo(() => {
    let list: any[] = [];
    
    if (activeTab === "FLOW") {
        if (subTabFlow === "NUEVAS") list = flowStats.nuevas;
        else if (subTabFlow === "CAMBIOS") list = flowStats.conAvance;
        else list = flowStats.finalizadas;
    } else {
        list = techStats;
    }

    return list.filter(item => {
        // Determinar planta del item (TechStats tiene array, OTFlow tiene string)
        const matchPlanta = filterPlanta === "TODAS" || (
            activeTab === "TECNICOS" 
            ? (item as TechStats).plantas.includes(filterPlanta) 
            : item.planta === filterPlanta
        );

        const term = searchTerm.toLowerCase();
        const matchSearch = !term || (
            'ot' in item 
            ? (item.ot.toLowerCase().includes(term) || item.descripcion.toLowerCase().includes(term)) 
            : item.nombre.toLowerCase().includes(term)
        );
        
        return matchPlanta && matchSearch;
    });
  }, [activeTab, subTabFlow, flowStats, techStats, filterPlanta, searchTerm]);

  const totalPages = Math.ceil(listToDisplay.length / itemsPerPage);
  const paginatedList = listToDisplay.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-white">
        {/* HEADER DE LA LISTA */}
        <div className="p-6 border-b bg-white z-10">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Centro de Análisis</h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">{periodoLabel}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20}/></button>
            </div>

            {/* TABS PRINCIPALES */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button onClick={() => setActiveTab("FLOW")} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'FLOW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <TrendingUp size={14}/> EVOLUCIÓN
                </button>
                <button onClick={() => setActiveTab("TECNICOS")} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'TECNICOS' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    <User size={14}/> TÉCNICOS
                </button>
            </div>

            {/* SUBTABS FLOW */}
            {activeTab === "FLOW" && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
                    <button onClick={() => setSubTabFlow("NUEVAS")} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 ${subTabFlow === 'NUEVAS' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-400 border-slate-200'}`}><Plus size={12}/> NUEVAS ({flowStats.nuevas.length})</button>
                    <button onClick={() => setSubTabFlow("CAMBIOS")} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 ${subTabFlow === 'CAMBIOS' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 border-slate-200'}`}><ArrowRight size={12}/> CAMBIOS ({flowStats.conAvance.length})</button>
                    <button onClick={() => setSubTabFlow("FINALIZADAS")} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 ${subTabFlow === 'FINALIZADAS' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-slate-400 border-slate-200'}`}><CheckCircle2 size={12}/> FINALIZADAS ({flowStats.finalizadas.length})</button>
                </div>
            )}

            {/* FILTROS */}
            <div className="flex gap-2">
                <div className="relative min-w-[120px]">
                    <Factory className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select value={filterPlanta} onChange={(e) => setFilterPlanta(e.target.value)} className="w-full pl-9 pr-2 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-200 cursor-pointer appearance-none">
                        {plantasDisponibles.map(p => (<option key={p} value={p}>{p}</option>))}
                    </select>
                </div>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-xs outline-none border border-slate-200 focus:border-blue-200 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
            {paginatedList.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center gap-2"><Search size={32} className="text-slate-300"/><span className="text-slate-400 text-sm italic">No hay resultados.</span></div>
            ) : (
                paginatedList.map((item: any) => (
                    activeTab === "FLOW" ? (
                        <div key={item.ot} onClick={() => onSelectOT(item)} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all flex justify-between items-start group">
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2 mb-1"><span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{item.planta}</span><span className="font-mono text-xs font-bold text-slate-700 group-hover:text-blue-600">{item.ot}</span></div>
                                <p className="text-xs text-slate-500 truncate">{item.descripcion}</p>
                            </div>
                            {item.estadoAnterior && <div className="text-[9px] text-slate-400 flex flex-col items-end min-w-[60px]"><span className="line-through">{item.estadoAnterior}</span><ArrowRight size={10} className="my-0.5 opacity-50"/><span className="font-bold text-slate-700">{item.estadoActual}</span></div>}
                            {item.tipoMovimiento === 'FINALIZADA' && <div className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{item.estadoActual}</div>}
                        </div>
                    ) : (
                        <div key={item.nombre} onClick={() => onSelectTech(item)} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-3 flex-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${item.efectividad === 100 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'} group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors`}>{item.nombre.substring(0, 2)}</div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-slate-700 group-hover:text-purple-700 truncate">{item.nombre}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${item.efectividad >= 80 ? 'bg-green-500' : 'bg-slate-400'}`} style={{width: `${item.efectividad}%`}}/></div>
                                        <span className="text-[9px] font-bold text-slate-400">{item.efectividad}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 text-right">
                                <div><span className="block text-xs font-black text-green-600">{item.finalizadas}</span><span className="text-[8px] text-slate-300 font-bold uppercase">OK</span></div>
                                <div><span className="block text-xs font-black text-slate-600">{item.totalAsignado}</span><span className="text-[8px] text-slate-300 font-bold uppercase">TOT</span></div>
                            </div>
                        </div>
                    )
                ))
            )}
        </div>

        {/* FOOTER PAGINACIÓN */}
        {totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center bg-white shadow-lg z-10">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Página {page} de {totalPages}</span>
                <div className="flex gap-2">
                    <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronLeft size={16}/></button>
                    <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronRight size={16}/></button>
                </div>
            </div>
        )}
    </div>
  );
};