import { useMemo } from "react";
import { PlanResult } from "../types";
import { 
  PlayCircle, 
  Users, 
  ClipboardCheck, 
  Activity, 
  CalendarCheck,
  Zap,
  Factory,
  Scale
} from "lucide-react";

interface DashboardProps {
  planResult: PlanResult[];
  // Modificado para recibir el modo
  onEjecutarPlan: (modo: 'STRICT' | 'BALANCED') => void;
}

export const DashboardView = ({ planResult, onEjecutarPlan }: DashboardProps) => {
  const tienePlan = planResult.length > 0;
  const mecanicosUnicos = [...new Set(planResult.map(r => r.mecanico))].length;

  const frecuenciaEstable = planResult.filter(p => {
    if (!p.fechaAnterior || p.fechaAnterior === "N/A") return false;
    const diaAnt = p.fechaAnterior.split('/')[0];
    const diaSug = p.fechaSugerida.split('/')[0];
    return diaAnt === diaSug;
  }).length;

  const cargaPorPlanta = useMemo(() => {
    const conteo: Record<string, number> = {};
    planResult.forEach(r => {
      conteo[r.planta] = (conteo[r.planta] || 0) + 1;
    });
    return Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  }, [planResult]);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* SECCIÓN HERO / ACCIONES PRINCIPALES */}
      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-pf-red text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">
                Sistema de Planificación
              </span>
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tighter uppercase italic">Panel de Control</h2>
            <p className="text-slate-400 font-medium max-w-lg">
              Seleccione el algoritmo de planificación. Puede priorizar el turno de noche existente o buscar un equilibrio de carga.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4">
            {/* BOTÓN 1: MODO STRICT (Original) */}
            <button 
              onClick={() => onEjecutarPlan('STRICT')}
              disabled={tienePlan}
              className={`px-6 py-4 rounded-[2rem] font-black flex items-center space-x-3 transition-all transform hover:scale-105 shadow-xl border-2 border-transparent
                ${tienePlan 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' 
                  : 'bg-pf-red hover:bg-white hover:text-pf-red hover:border-pf-red text-white shadow-pf-red/20'
                }`}
            >
              <PlayCircle size={24} />
              <div className="text-left">
                  <span className="block uppercase text-[10px] opacity-70 leading-none mb-1">Algoritmo</span>
                  <span className="block uppercase text-sm tracking-tight leading-none">Prioridad Turnos</span>
              </div>
            </button>

            {/* BOTÓN 2: MODO BALANCED (Nuevo) */}
            <button 
              onClick={() => onEjecutarPlan('BALANCED')}
              disabled={tienePlan}
              className={`px-6 py-4 rounded-[2rem] font-black flex items-center space-x-3 transition-all transform hover:scale-105 shadow-xl border-2 border-transparent
                ${tienePlan 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' 
                  : 'bg-indigo-600 hover:bg-white hover:text-indigo-600 hover:border-indigo-600 text-white shadow-indigo-600/20'
                }`}
            >
              <Scale size={24} />
              <div className="text-left">
                  <span className="block uppercase text-[10px] opacity-70 leading-none mb-1">Algoritmo</span>
                  <span className="block uppercase text-sm tracking-tight leading-none">Carga Equilibrada</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Decoración */}
        <Activity className="absolute right-[-40px] top-[-40px] text-white/[0.03] w-96 h-96 rotate-12" />
      </div>

      {tienePlan ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* CARDS DE MÉTRICAS */}
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

          <div className="p-8 bg-white border border-pf-border rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Users className="text-slate-900" size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Técnicos Activos</p>
            <p className="text-4xl font-black text-slate-900">{mecanicosUnicos}</p>
          </div>

          <div className="p-8 bg-white border border-pf-border rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <CalendarCheck className="text-blue-600" size={24} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Estabilidad 30D</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-4xl font-black text-blue-600">
                {planResult.length > 0 ? Math.round((frecuenciaEstable / planResult.length) * 100) : 0}%
              </p>
            </div>
          </div>

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
              Cargue los archivos maestros y seleccione el algoritmo de planificación deseado arriba.
            </p>
          </div>
        </div>
      )}

      {/* GRAFICO DE BARRAS SIMPLE */}
      {tienePlan && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-pf-border shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase mb-6 flex items-center gap-2">
            <Factory size={16} /> Distribución de Carga por Planta
          </h3>
          <div className="space-y-4">
            {cargaPorPlanta.map(([planta, cantidad]) => (
              <div key={planta} className="space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                  <span>{planta}</span>
                  <span>{cantidad} OTs</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-pf-red h-full transition-all duration-1000" 
                    style={{ width: `${(cantidad / planResult.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};