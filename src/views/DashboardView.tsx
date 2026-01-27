// src/views/DashboardView.tsx
import { PlanResult } from "../types";
import { 
  PlayCircle, 
  Users, 
  ClipboardCheck, 
  Activity, 
  CalendarCheck,
  Zap
} from "lucide-react";

interface DashboardProps {
  planResult: PlanResult[];
  onEjecutarPlan: () => void;
}

export const DashboardView = ({ planResult, onEjecutarPlan }: DashboardProps) => {
  const tienePlan = planResult.length > 0;
  const mecanicosUnicos = [...new Set(planResult.map(r => r.mecanico))].length;

  // Calculamos cuántas OTs se mantienen en el mismo día del mes (Frecuencia perfecta)
  const frecuenciaEstable = planResult.filter(p => {
    const diaAnt = p.fechaAnterior.split('/')[0];
    const diaSug = p.fechaSugerida.split('/')[0];
    return diaAnt === diaSug;
  }).length;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* SECCIÓN HERO / ACCIÓN PRINCIPAL */}
      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-pf-red text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">
                Sistema de Planificación
              </span>
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">v2.0</span>
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tighter uppercase italic">Panel de Control</h2>
            <p className="text-slate-400 font-medium max-w-md">
              Generación de mantenimiento preventivo basado en el historial del mes anterior y cumplimiento SAP.
            </p>
          </div>
          
          <button 
            onClick={onEjecutarPlan}
            disabled={tienePlan}
            className={`px-8 py-5 rounded-[2rem] font-black flex items-center space-x-3 transition-all transform hover:scale-105 shadow-xl 
              ${tienePlan 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' 
                : 'bg-pf-red hover:bg-white hover:text-pf-red text-white shadow-pf-red/20'
              }`}
          >
            <PlayCircle size={28} />
            <span className="uppercase text-sm tracking-tight">
              {tienePlan ? "Planificación Generada" : "Generar Planificación"}
            </span>
          </button>
        </div>
        
        {/* Decoración de fondo */}
        <Activity className="absolute right-[-40px] top-[-40px] text-white/[0.03] w-96 h-96 rotate-12" />
      </div>

      {tienePlan ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* CARD: TOTAL OTS */}
          <div className="p-8 bg-white border border-pf-border rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <ClipboardCheck className="text-slate-900" size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">OTs Proyectadas</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-4xl font-black text-slate-900">{planResult.length}</p>
              <span className="text-xs font-bold text-slate-400">Órdenes</span>
            </div>
          </div>

          {/* CARD: PERSONAL */}
          <div className="p-8 bg-white border border-pf-border rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Users className="text-slate-900" size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Técnicos Activos</p>
            <p className="text-4xl font-black text-slate-900">{mecanicosUnicos}</p>
          </div>

          {/* CARD: FRECUENCIA (NUEVA) */}
          <div className="p-8 bg-white border border-pf-border rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <CalendarCheck className="text-blue-600" size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Estabilidad 30D</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-4xl font-black text-blue-600">
                {Math.round((frecuenciaEstable / planResult.length) * 100)}%
              </p>
            </div>
          </div>

          {/* CARD: ESTADO */}
          <div className="p-8 bg-white border border-pf-border rounded-[2.5rem] shadow-sm border-b-4 border-b-green-500">
            <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="text-green-600" size={24} fill="currentColor" />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Estado de Datos</p>
            <p className="text-xl font-black text-green-600 uppercase italic leading-none">Proceso Finalizado</p>
          </div>

        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center">
          <div className="max-w-xs mx-auto">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="text-slate-300 animate-pulse" size={40} />
            </div>
            <h3 className="text-slate-900 font-black text-lg uppercase italic mb-2">Esperando Ejecución</h3>
            <p className="text-slate-400 text-sm font-medium">
              Cargue los archivos maestros y presione el botón superior para iniciar el algoritmo de cruce.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};