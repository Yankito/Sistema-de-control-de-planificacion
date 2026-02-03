import { useState, useMemo, useEffect } from "react";
import { X, Search, ChevronLeft, ChevronRight, TrendingUp, User, ArrowRight, Plus, Minus, Factory, CheckCircle2 } from "lucide-react";
import { AtrasoRow } from "../../types";
import { analyzeBacklogFlow, OTFlowResult } from "../../logic/backlogAnalysis";
import { analyzeTechnicians, TechStats } from "../../logic/technicianAnalysis";

// IMPORTAMOS TU COMPONENTE EXISTENTE
import { EmployeeProfile } from "../../views/atrasos/EmployeeProfile";

// ==========================================
// VISTA DETALLE OT (Estilo Sidebar)
// ==========================================
const OTDetailView = ({ otItem, allData, onBack, onTechClick }: { otItem: OTFlowResult, allData: AtrasoRow[], onBack: () => void, onTechClick: (tech: string) => void }) => {
  const fullRow = allData.find(d => d.ot === otItem.ot);
  const tecnicos = fullRow?.detallesTecnicos || [];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-slate-100 sticky top-0 z-10 bg-white">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 mb-4 transition-colors"><ChevronLeft size={16}/> VOLVER A LISTA</button>
        <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black border border-blue-100">{otItem.planta}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${otItem.tipoMovimiento === 'NUEVA' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{otItem.tipoMovimiento}</span>
        </div>
        <h2 className="text-2xl font-mono font-black text-slate-800 tracking-tight mb-2">{otItem.ot}</h2>
        <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{otItem.descripcion}</p>
        
        <div className="mt-4 flex items-center justify-between text-xs pt-2 border-t border-slate-50">
            <span className="font-bold text-slate-400 uppercase">Evolución</span>
            <div className="flex items-center gap-2">
                <span className="text-slate-400 line-through">{otItem.estadoAnterior || "-"}</span>
                <ArrowRight size={12} className="text-slate-300"/>
                <span className="font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">{otItem.estadoActual}</span>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-xs font-black text-slate-400 uppercase mb-2 px-1">Técnicos Asignados</h3>
        {tecnicos.length === 0 ? <div className="text-center py-8 text-slate-300 italic text-xs">Sin asignación</div> : tecnicos.map((t, i) => (
            <div key={i} onClick={() => onTechClick(t.tecnico)} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:shadow-md cursor-pointer transition-all bg-white group">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-600">{t.tecnico.substring(0, 2)}</div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-purple-700">{t.tecnico}</span>
                </div>
                {t.finalizada ? <CheckCircle2 size={16} className="text-green-500"/> : <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>}
            </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// DASHBOARD PRINCIPAL
// ==========================================

interface AnalysisDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: AtrasoRow[]; // Backlog
  prevData: AtrasoRow[];
  currentCumplimiento: AtrasoRow[]; // Cumplidas
  periodoLabel: string;
}

type ViewState = 
  | { type: 'LIST' }
  | { type: 'OT_DETAIL', data: OTFlowResult }
  | { type: 'TECH_DETAIL', data: TechStats };

export const AnalysisDashboard = ({ isOpen, onClose, currentData, prevData, currentCumplimiento, periodoLabel }: AnalysisDashboardProps) => {
  
  const [activeTab, setActiveTab] = useState<"FLOW" | "TECNICOS">("FLOW");
  const [subTabFlow, setSubTabFlow] = useState<"NUEVAS" | "CAMBIOS" | "FINALIZADAS">("NUEVAS");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlanta, setFilterPlanta] = useState("TODAS");
  
  // Estados para EmployeeProfile
  const [empFilters, setEmpFilters] = useState({ planta: "TODAS", periodo: "TODOS" });

  const [viewStack, setViewStack] = useState<ViewState[]>([{ type: 'LIST' }]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  const currentView = viewStack[viewStack.length - 1];

  // Cálculos
  const flowStats = useMemo(() => analyzeBacklogFlow(currentData, prevData, currentCumplimiento), [currentData, prevData, currentCumplimiento]);
  const techStats = useMemo(() => analyzeTechnicians(currentData, currentCumplimiento), [currentData, currentCumplimiento]);
  const plantasDisponibles = useMemo(() => ["TODAS", ...Array.from(new Set(currentData.map(d => d.planta))).sort()], [currentData]);

  // Filtrado Lista Principal
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
        const itemPlanta = 'planta' in item ? item.planta : (item as TechStats).plantas.includes(filterPlanta) ? filterPlanta : "TODAS";
        const matchPlanta = filterPlanta === "TODAS" || (activeTab === "TECNICOS" ? (item as TechStats).plantas.includes(filterPlanta) : item.planta === filterPlanta);
        const term = searchTerm.toLowerCase();
        const matchSearch = !term || ('ot' in item && (item.ot.toLowerCase().includes(term) || item.descripcion.toLowerCase().includes(term))) || ('nombre' in item && item.nombre.toLowerCase().includes(term));
        return matchPlanta && matchSearch;
    });
  }, [activeTab, subTabFlow, flowStats, techStats, filterPlanta, searchTerm]);

  const totalPages = Math.ceil(listToDisplay.length / itemsPerPage);
  const paginatedList = listToDisplay.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const pushView = (view: ViewState) => setViewStack([...viewStack, view]);
  const popView = () => { if (viewStack.length > 1) setViewStack(viewStack.slice(0, -1)); };

  useEffect(() => { if (!isOpen) setViewStack([{ type: 'LIST' }]); }, [isOpen]);
  useEffect(() => { setPage(1); }, [activeTab, subTabFlow, filterPlanta, searchTerm]);

  // -----------------------------------------------------------------------
  // LOGICA PARA PREPARAR DATOS DE EMPLOYEE PROFILE (AQUÍ ESTABA EL ERROR)
  // -----------------------------------------------------------------------
  const employeeProfileProps = useMemo(() => {
      if (currentView.type !== 'TECH_DETAIL') return null;
      
      const techName = currentView.data.nombre.toUpperCase();
      
      // 1. Unificar fuentes
      let allOrders = [...currentData, ...currentCumplimiento].filter(d => 
          d.detallesTecnicos?.some(t => t.tecnico.toUpperCase() === techName)
      );

      // --- NUEVO: Calcular plantas activas ANTES de filtrar por el dropdown ---
      // (Para que el usuario vea dónde trabaja el técnico globalmente, no solo en la selección actual)
      const activePlants = Array.from(new Set(allOrders.map(o => o.planta))).sort();

      // 2. Aplicar filtros visuales (Dropdowns dentro del perfil)
      if (empFilters.planta !== "TODAS") {
          allOrders = allOrders.filter(d => d.planta === empFilters.planta);
      }
      if (empFilters.periodo !== "TODOS") {
          allOrders = allOrders.filter(d => d.periodo === empFilters.periodo);
      }

      // 3. Deduplicar
      const uniqueOrders = Array.from(new Map(allOrders.map(item => [item.ot, item])).values());

      // 4. Stats
      const stats = {
          total: uniqueOrders.length,
          cumplidas: uniqueOrders.filter(o => o.detallesTecnicos?.find(t => t.tecnico.toUpperCase() === techName)?.finalizada || o.clasificacion === 'CUMPLIDA').length,
          pendientes: uniqueOrders.filter(o => !(o.detallesTecnicos?.find(t => t.tecnico.toUpperCase() === techName)?.finalizada || o.clasificacion === 'CUMPLIDA')).length
      };

      return {
          employeeName: techName,
          employeePlants: activePlants, // <--- PASAMOS LA LISTA CALCULADA AQUÍ
          orders: uniqueOrders,
          stats: stats,
          listaPlantas: plantasDisponibles.filter(p => p !== "TODAS")
      };

  }, [currentView, currentData, currentCumplimiento, empFilters, plantasDisponibles]);


  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}/>
        
        {/* PANEL LATERAL (Ancho aumentado para el perfil) */}
        <div className={`relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-100 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            
            {/* VISTA 1: DETALLE OT */}
            {currentView.type === 'OT_DETAIL' && (
                <OTDetailView 
                    otItem={currentView.data} 
                    allData={currentData} 
                    onBack={popView} 
                    onTechClick={(techName) => {
                        const stats = techStats.find(t => t.nombre === techName) || { nombre: techName, totalAsignado:0, finalizadas:0, pendientes:0, efectividad:0, plantas:[] };
                        pushView({ type: 'TECH_DETAIL', data: stats });
                    }}
                />
            )}
            
            {/* VISTA 2: PERFIL DE TÉCNICO (REUTILIZADO) */}
            {currentView.type === 'TECH_DETAIL' && employeeProfileProps && (
                <div className="h-full flex flex-col bg-white">
                    <EmployeeProfile 
                        {...employeeProfileProps}
                        filters={empFilters}
                        setFilters={setEmpFilters}
                        onBack={popView}
                    />
                </div>
            )}

            {/* VISTA 3: LISTA PRINCIPAL */}
            {currentView.type === 'LIST' && (
                <>
                    <div className="p-6 border-b bg-white z-10">
                        <div className="flex justify-between items-center mb-4">
                            <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Centro de Análisis</h2><p className="text-xs text-slate-400 font-bold mt-0.5">{periodoLabel}</p></div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20}/></button>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                            <button onClick={() => setActiveTab("FLOW")} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'FLOW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><TrendingUp size={14}/> EVOLUCIÓN</button>
                            <button onClick={() => setActiveTab("TECNICOS")} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'TECNICOS' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><User size={14}/> TÉCNICOS</button>
                        </div>
                        {activeTab === "FLOW" && (
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
                                <button onClick={() => {setSubTabFlow("NUEVAS"); setPage(1);}} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 ${subTabFlow === 'NUEVAS' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-400 border-slate-200'}`}><Plus size={12}/> NUEVAS ({flowStats.nuevas.length})</button>
                                <button onClick={() => {setSubTabFlow("CAMBIOS"); setPage(1);}} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 ${subTabFlow === 'CAMBIOS' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 border-slate-200'}`}><ArrowRight size={12}/> CAMBIOS ({flowStats.conAvance.length})</button>
                                <button onClick={() => {setSubTabFlow("FINALIZADAS"); setPage(1);}} className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 ${subTabFlow === 'FINALIZADAS' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-slate-400 border-slate-200'}`}><CheckCircle2 size={12}/> FINALIZADAS ({flowStats.finalizadas.length})</button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <div className="relative min-w-[120px]"><Factory className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><select value={filterPlanta} onChange={(e) => { setFilterPlanta(e.target.value); setPage(1); }} className="w-full pl-9 pr-2 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-200 cursor-pointer appearance-none">{plantasDisponibles.map(p => (<option key={p} value={p}>{p}</option>))}</select></div>
                            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-xs outline-none border border-slate-200 focus:border-blue-200 transition-all" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} /></div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                        {paginatedList.length === 0 ? <div className="text-center py-10 flex flex-col items-center gap-2"><Search size={32} className="text-slate-300"/><span className="text-slate-400 text-sm italic">No hay resultados.</span></div> : paginatedList.map((item: any, idx) => (
                            activeTab === "FLOW" ? (
                                <div key={item.ot} onClick={() => pushView({ type: 'OT_DETAIL', data: item })} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all flex justify-between items-start group">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2 mb-1"><span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{item.planta}</span><span className="font-mono text-xs font-bold text-slate-700 group-hover:text-blue-600">{item.ot}</span></div>
                                        <p className="text-xs text-slate-500 truncate">{item.descripcion}</p>
                                    </div>
                                    {item.estadoAnterior && <div className="text-[9px] text-slate-400 flex flex-col items-end min-w-[60px]"><span className="line-through">{item.estadoAnterior}</span><ArrowRight size={10} className="my-0.5 opacity-50"/><span className="font-bold text-slate-700">{item.estadoActual}</span></div>}
                                    {item.tipoMovimiento === 'FINALIZADA' && <div className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{item.estadoActual}</div>}
                                </div>
                            ) : (
                                // LISTA DE TÉCNICOS (Estilo Clean)
                                <div key={item.nombre} onClick={() => pushView({ type: 'TECH_DETAIL', data: item })} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group">
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
                        ))}
                    </div>
                    {/* Footer Paginación */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t flex justify-between items-center bg-white shadow-lg z-10">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Página {page} de {totalPages}</span>
                            <div className="flex gap-2">
                                <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronLeft size={16}/></button>
                                <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronRight size={16}/></button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
  );
};