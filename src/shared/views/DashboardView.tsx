import { useMemo } from "react";
import { AtrasoRow } from "../../modules/seguimiento/types";
import { PlanResult } from "../../modules/planificacion/types";
import { FallaRow } from "../../modules/fallas/types";
import { FileType } from "../components/FileUploader";
import {  PlayCircle, Scale, CalendarCheck, Clock, AlertTriangle, ArrowRight, BarChart2 } from "lucide-react";
import { EmptyCard } from "../components/ui/EmptyCard";

interface DashboardProps {
  planResult: PlanResult[];
  seguimientoResult: AtrasoRow[];
  fallasResult: FallaRow[];
  onEjecutarPlan: (modo: 'STRICT' | 'BALANCED') => void;
  setActiveTab: (tab: string) => void;
  archivoCargado: boolean;
  onRequestUpload: (tipo: FileType) => void; // NUEVA PROP
}


export const DashboardView = ({ 
  planResult, 
  seguimientoResult, 
  fallasResult, 
  onEjecutarPlan,
  setActiveTab,
  archivoCargado,
  onRequestUpload
}: DashboardProps) => {

  // --- 1. METRICAS PLANIFICACION ---
  const tienePlan = planResult.length > 0;
  const statsPlan = useMemo(() => {
    if (!tienePlan) return null;
    const total = planResult.length;
    const unicos = new Set(planResult.flatMap(r => r.tecnicos.map(t => t.nombre))).size;
    const estables = planResult.filter(p => {
        if (!p.fechaAnterior || p.fechaAnterior === "N/A") return false;
        return p.fechaAnterior.split('/')[0] === p.fechaSugerida.split('/')[0];
    }).length;
    return { total, unicos, estabilidad: Math.round((estables / total) * 100) || 0 };
  }, [planResult, tienePlan]);

  // --- 2. METRICAS ATRASOS ---
  const tieneSeguimiento = seguimientoResult.length > 0;
  const statsSeguimiento = useMemo(() => {
    if (!tieneSeguimiento) return null;
    const total = seguimientoResult.length;
    const vencidas = seguimientoResult.filter(a => a.estado === 'VENCIDA' || (typeof a.periodo === 'string' && a.periodo === 'S/A')).length; 
    const cumplimiento = total > 0 ? Math.round(((total - vencidas) / total) * 100) : 0;
    return { total, vencidas, cumplimiento };
  }, [seguimientoResult, tieneSeguimiento]);

  // --- 3. METRICAS FALLAS ---
  const tieneFallas = fallasResult.length > 0;
  const statsFallas = useMemo(() => {
    if (!tieneFallas) return null;
    const totalEventos = fallasResult.length;
    const totalTiempo = fallasResult.reduce((acc, curr) => acc + curr.duracionMinutos, 0);
    const conteoEquipos: Record<string, number> = {};
    fallasResult.forEach(f => conteoEquipos[f.equipo] = (conteoEquipos[f.equipo] || 0) + 1);
    const topEquipo = Object.entries(conteoEquipos).sort((a,b) => b[1] - a[1])[0];
    return { 
        totalEventos, 
        mttr: totalEventos > 0 ? Math.round(totalTiempo / totalEventos) : 0,
        critico: topEquipo ? topEquipo[0] : 'N/A'
    };
  }, [fallasResult, tieneFallas]);

  const StatusPill = ({ label, active, color }: any) => (
     <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border ${active ? `bg-${color}-100 text-${color}-700 border-${color}-200` : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
        <div className={`w-2 h-2 rounded-full ${active ? `bg-${color}-500 animate-pulse` : 'bg-slate-300'}`}></div>
        {label}
    </div>
  );

  const ActionButton = ({ label, sublabel, icon: Icon, onClick, primary }: any) => (
    <button onClick={onClick} className={`py-3 rounded-xl flex flex-col items-center justify-center transition-all transform active:scale-95 cursor-pointer ${primary ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
        <Icon size={18} className={`mb-1 ${primary ? 'text-pf-red' : ''}`} />
        <span className="text-[9px] font-bold uppercase">{label}</span>
        {sublabel && <span className="text-[8px] opacity-60 font-medium">{sublabel}</span>}
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Control Industrial <span className="text-pf-red">PF</span></h2>
            <p className="text-slate-400 font-medium text-sm">Centro de Operaciones de Mantenimiento</p>
        </div>
        <div className="flex gap-2">
            <StatusPill label="Planificación" active={archivoCargado} color="green" />
            <StatusPill label="KPI Seguimiento" active={tieneSeguimiento} color="blue" />
            <StatusPill label="Fallas" active={tieneFallas} color="amber" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. PLANIFICACION */}
        {archivoCargado ? (
            <div className="bg-white rounded-[2rem] border border-pf-border shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-pf-red/10 rounded-2xl text-pf-red"><CalendarCheck size={24} /></div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${tienePlan ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{tienePlan ? 'Procesado' : 'Esperando'}</span>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Planificación</h3>
                {tienePlan ? (
                    <div className="space-y-3 mb-8">
                         <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{statsPlan?.total} Órdenes Asignadas</p>
                         <div className="flex justify-between text-sm"><span className="text-slate-500">Técnicos</span><span className="font-bold text-slate-800">{statsPlan?.unicos}</span></div>
                    </div>
                ) : (
                    <div className="mb-8 py-4"><p className="text-sm text-slate-600 font-medium">Archivo cargado.</p><p className="text-xs text-slate-400 mt-1">Selecciona algoritmo.</p></div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <ActionButton label="Prioridad Noche" sublabel="Estricto" icon={PlayCircle} onClick={() => onEjecutarPlan('STRICT')} primary />
                    <ActionButton label="Balanceado" sublabel="Equilibrado" icon={Scale} onClick={() => onEjecutarPlan('BALANCED')} />
                </div>
            </div>
        ) : (
            <EmptyCard 
                title="Planificación" 
                colorBase="text-pf-red" colorHover="hover:bg-pf-red/5" colorBorder="hover:border-pf-red"
                icon={CalendarCheck} 
                desc="Gestionar turnos y asignar OTs."
                onClick={() => onRequestUpload('PLAN')}
            />
        )}

        {/* --- CARD 2: SEGUIMIENTO --- */}
        {tieneSeguimiento ? (
            <div className="bg-white rounded-[2rem] border border-pf-border shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Clock size={24} /></div>
                    <button onClick={() => setActiveTab('seguimiento')}><ArrowRight size={20} className="text-slate-300 hover:text-blue-600"/></button>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">KPI Backlog</h3>
                <div className="flex items-center gap-4 mb-6">
                    <span className="text-4xl font-black text-slate-700">{statsSeguimiento?.cumplimiento}%</span>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-400">Total</span><span className="font-black">{statsSeguimiento?.total}</span></div>
                </div>
             </div>
        ) : (
            <EmptyCard 
                title="Control KPI" 
                colorBase="text-blue-600" colorHover="hover:bg-blue-600/5" colorBorder="hover:border-blue-600"
                icon={BarChart2} 
                desc="Analizar cumplimiento y desviaciones."
                onClick={() => onRequestUpload('SEGUIMIENTO')}
            />
        )}

        {/* --- CARD 3: FALLAS --- */}
        {tieneFallas ? (
            <div className="bg-white rounded-[2rem] border border-pf-border shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-500"><AlertTriangle size={24} /></div>
                    <button onClick={() => setActiveTab('fallas')}><ArrowRight size={20} className="text-slate-300 hover:text-amber-500"/></button>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Fallas y MTBF</h3>
                <div className="flex gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl"><span className="block text-[10px] font-bold text-slate-400">MTTR</span><span className="font-black text-xl text-amber-500">{statsFallas?.mttr}m</span></div>
                </div>
             </div>
        ) : (
            <EmptyCard 
                title="Fallas y MTBF" 
                colorBase="text-amber-500" colorHover="hover:bg-amber-500/5" colorBorder="hover:border-amber-500"
                icon={AlertTriangle} 
                desc="Activos críticos y tiempos de reparación."
                onClick={() => onRequestUpload('FALLAS')}
            />
        )}

      </div>
    </div>
  );
};