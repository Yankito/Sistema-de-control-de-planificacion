// src/views/DashboardView.tsx
import { PlanResult } from "../logic/excelProcessor";
import { PlayCircle, Users, ClipboardCheck, Activity } from "lucide-react";

interface DashboardProps {
  planResult: PlanResult[];
  onEjecutarPlan: () => void;
}

export const DashboardView = ({ planResult, onEjecutarPlan }: DashboardProps) => {
  const tienePlan = planResult.length > 0;
  const mecanicosUnicos = [...new Set(planResult.map(r => r.mecanico))].length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Encabezado Bienvenida */}
      <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">Panel de Control</h2>
          <p className="text-slate-400 font-medium">Generación de mantenimiento preventivo mensual.</p>
          
          {!tienePlan && (
            <button 
              onClick={onEjecutarPlan}
              className="mt-6 bg-pf-red hover:bg-pf-red-hover text-white px-8 py-4 rounded-2xl font-black flex items-center space-x-3 transition-all transform hover:scale-105 shadow-lg shadow-pf-red/20"
            >
              <PlayCircle size={24} />
              <span>GENERAR PLANIFICACIÓN PRÓXIMO MES</span>
            </button>
          )}
        </div>
        <Activity className="absolute right-[-20px] bottom-[-20px] text-white/5 w-64 h-64" />
      </div>

      {tienePlan ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-white border border-pf-border rounded-3xl shadow-sm border-t-4 border-t-pf-red">
            <ClipboardCheck className="text-pf-red mb-4" size={32} />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">OTs Proyectadas</p>
            <p className="text-4xl font-black text-slate-900">{planResult.length}</p>
          </div>

          <div className="p-8 bg-white border border-pf-border rounded-3xl shadow-sm">
            <Users className="text-slate-400 mb-4" size={32} />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Personal Asignado</p>
            <p className="text-4xl font-black text-slate-900">{mecanicosUnicos}</p>
          </div>

          <div className="p-8 bg-white border border-pf-border rounded-3xl shadow-sm">
            <Activity className="text-green-500 mb-4" size={32} />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Estado Proceso</p>
            <p className="text-2xl font-black text-green-600 uppercase">Listo para Exportar</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center">
          <p className="text-slate-400 font-bold">Presione el botón superior para procesar los archivos B.ANT y B.ACT</p>
        </div>
      )}
    </div>
  );
};