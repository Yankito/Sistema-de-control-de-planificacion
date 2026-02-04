import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { AtrasoRow } from "../../types";
import { analyzeBacklogFlow, OTFlowResult } from "../../logic/backlogAnalysis";
import { analyzeTechnicians, TechStats, prepareEmployeeProfile } from "../../logic/technicianAnalysis";

import { EmployeeProfile } from "../../views/atrasos/EmployeeProfile";
import { DashboardListView } from "./DashboardListView";

// VISTA DETALLE OT (Estilo Sidebar)
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

// DASHBOARD PRINCIPAL

interface AnalysisDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: AtrasoRow[]; 
  prevData: AtrasoRow[];
  currentCumplimiento: AtrasoRow[];
  periodoLabel: string;
}

type ViewState = 
  | { type: 'LIST' }
  | { type: 'OT_DETAIL', data: OTFlowResult }
  | { type: 'TECH_DETAIL', data: TechStats };

export const AnalysisDashboard = ({ isOpen, onClose, currentData, prevData, currentCumplimiento, periodoLabel }: AnalysisDashboardProps) => {
  
  const [viewStack, setViewStack] = useState<ViewState[]>([{ type: 'LIST' }]);
  const currentView = viewStack[viewStack.length - 1];

  // Estados para EmployeeProfile
  const [empFilters, setEmpFilters] = useState({ planta: "TODAS", periodo: "TODOS" });

  // Cálculos Memoizados
  const flowStats = useMemo(() => analyzeBacklogFlow(currentData, prevData, currentCumplimiento), [currentData, prevData, currentCumplimiento]);
  const techStats = useMemo(() => analyzeTechnicians(currentData, currentCumplimiento), [currentData, currentCumplimiento]);
  const plantasDisponibles = useMemo(() => ["TODAS", ...Array.from(new Set(currentData.map(d => d.planta))).sort()], [currentData]);

  // Navegación
  const pushView = (view: ViewState) => setViewStack([...viewStack, view]);
  const popView = () => { if (viewStack.length > 1) setViewStack(viewStack.slice(0, -1)); };

  // Reseteo al cerrar
  useEffect(() => { if (!isOpen) setViewStack([{ type: 'LIST' }]); }, [isOpen]);

  // LOGICA PARA PREPARAR DATOS DE EMPLOYEE PROFILE
  const employeeProfileProps = useMemo(() => {
      if (currentView.type !== 'TECH_DETAIL') return null;
      
      const rawUniverse = [...currentData, ...currentCumplimiento];
      
      return prepareEmployeeProfile(
          currentView.data.nombre.toUpperCase(),
          rawUniverse,
          plantasDisponibles
      );
  }, [currentView, currentData, currentCumplimiento, plantasDisponibles]);


  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}/>
        
        {/* PANEL LATERAL */}
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
            
            {/* VISTA 2: PERFIL DE TÉCNICO */}
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

            {/* VISTA 3: LISTA PRINCIPAL (REFACTORIZADA) */}
            {currentView.type === 'LIST' && (
                <DashboardListView 
                    onClose={onClose}
                    periodoLabel={periodoLabel}
                    flowStats={flowStats}
                    techStats={techStats}
                    plantasDisponibles={plantasDisponibles}
                    onSelectOT={(item: OTFlowResult) => pushView({ type: 'OT_DETAIL', data: item })}
                    onSelectTech={(item: TechStats) => pushView({ type: 'TECH_DETAIL', data: item })}
                />
            )}
        </div>
    </div>
  );
};