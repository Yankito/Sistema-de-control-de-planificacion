// src/views/PlanificacionView.tsx
import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { 
  LayoutGrid, 
  List, 
  CalendarDays, 
  X,
  Wrench,
  Zap,
  Calendar as CalendarIcon,
  User
} from "lucide-react";

export const PlanificacionView = ({ planResult, plantaSeleccionada, plantas, onCambiarPlanta }: any) => {
  const [viewMode, setViewMode] = useState<"table" | "grid" | "calendar">("calendar");
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  // 1. Ordenamiento
  const datosOrdenados = [...planResult].sort((a, b) => {
    // Convertimos DD/MM/YYYY -> YYYY-MM-DD para que Date lo entienda perfecto
    const [dA, mA, aA] = a.fechaSugerida.split('/');
    const [dB, mB, aB] = b.fechaSugerida.split('/');
    
    const fechaA = new Date(`${aA}-${mA}-${dA}`).getTime();
    const fechaB = new Date(`${aB}-${mB}-${dB}`).getTime();
    
    return fechaA - fechaB;
    });

  // 2. Agrupación por fecha
  const ordenesPorDia = datosOrdenados.reduce((acc: any, orden: any) => {
    const fecha = orden.fechaSugerida;
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(orden);
    return acc;
  }, {});

  // --- LÓGICA PARA GENERAR EL MES COMPLETO ---
  const generarDiasDelMes = () => {
    if (!planResult || planResult.length === 0) return [];
    
    // Tomamos la fecha del primer resultado de la lista ORDENADA
    const [dia, mes, anio] = datosOrdenados[0].fechaSugerida.split('/').map(Number);

    // El día 0 del mes siguiente nos da el último día del mes actual
    const ultimoDia = new Date(anio, mes, 0).getDate();
    
    const dias = [];
    for (let d = 1; d <= ultimoDia; d++) {
        const diaF = d.toString().padStart(2, '0');
        const mesF = mes.toString().padStart(2, '0');
        // Mantenemos las BARRAS para que coincida con ordenesPorDia
        const fechaKey = `${diaF}/${mesF}/${anio}`;
        dias.push(fechaKey);
    }
    return dias;
    };

  const listaDiasMes = generarDiasDelMes();

  const obtenerPeriodo = () => {
    if (planResult.length === 0) return "Sin Datos";
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const [,, anio] = planResult[0].fechaSugerida.split('/');
    const [, mes] = planResult[0].fechaSugerida.split('/').map(Number);
    return `${meses[mes - 1]} ${anio}`;
  };

  const renderRolBadge = (rol: string) => {
    const isElectrico = rol?.toLowerCase() === 'e';
    const isMecanico = rol?.toLowerCase() === 'm';
    if (isElectrico) return (
      <span className="flex items-center space-x-1 bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-yellow-100">
        <Zap size={8} fill="currentColor" /> <span>Eléctrico</span>
      </span>
    );
    if (isMecanico) return (
      <span className="flex items-center space-x-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-blue-100">
        <Wrench size={8} fill="currentColor" /> <span>Mecánico</span>
      </span>
    );
    return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">{rol}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-pf-border shadow-sm">
        <div className="flex items-center space-x-6">
          <h3 className="text-xl font-black text-slate-900 uppercase">Planificación</h3>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setViewMode("calendar")} className={`p-2 rounded-lg ${viewMode === "calendar" ? "bg-white text-pf-red shadow-sm" : "text-slate-400"}`}><CalendarDays size={20} /></button>
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-white text-pf-red shadow-sm" : "text-slate-400"}`}><LayoutGrid size={20} /></button>
            <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg ${viewMode === "table" ? "bg-white text-pf-red shadow-sm" : "text-slate-400"}`}><List size={20} /></button>
          </div>
        </div>
        <select value={plantaSeleccionada} onChange={(e) => onCambiarPlanta(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none">
          {plantas.map((p: string) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* VISTA CALENDARIO CON TODOS LOS DÍAS */}
      {viewMode === "calendar" && (
        <div className="bg-white p-10 rounded-[3rem] border border-pf-border shadow-sm">
          <div className="text-center mb-12">
            <h4 className="text-4xl font-black text-slate-800 tracking-tighter italic uppercase">{obtenerPeriodo()}</h4>
          </div>
          <div className="grid grid-cols-7 gap-4">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
              <div key={d} className="text-center text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">{d}</div>
            ))}
            
            {listaDiasMes.map((fecha) => {
              const cantidad = ordenesPorDia[fecha]?.length || 0;
              const diaNum = fecha.split('/')[0];
              
              return (
                <button 
                  key={fecha} 
                  onClick={() => setDiaSeleccionado(fecha)} 
                  className={`aspect-square group rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center p-2
                    ${cantidad > 0 
                      ? 'bg-slate-50 border-transparent hover:border-pf-red hover:bg-white hover:shadow-2xl' 
                      : 'bg-white border-slate-50 hover:border-slate-200'
                    }`}
                >
                  <span className={`text-3xl font-black transition-colors ${cantidad > 0 ? 'text-slate-800' : 'text-slate-200'}`}>
                    {parseInt(diaNum)}
                  </span>
                  
                  <div className={`mt-1 px-2 py-0.5 rounded-full font-black text-[10px] transition-all
                    ${cantidad > 4 ? 'bg-pf-red text-white' : 
                      cantidad > 0 ? 'bg-white text-pf-red border border-pf-red/20' : 
                      'bg-transparent text-slate-200'}
                  `}>
                    {cantidad} {cantidad === 1 ? 'OT' : 'OTS'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA GRID (CAJITAS) */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {datosOrdenados.map((plan: any, i: number) => (
            <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-pf-border shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 bg-pf-red/[0.03] px-3 py-1.5 rounded-xl border border-pf-red/10">
                  <CalendarIcon size={12} className="text-pf-red" />
                  <span className="text-xs font-black text-pf-red">{plan.fechaSugerida}</span>
                </div>
                {renderRolBadge(plan.rol)}
              </div>
              <h4 className="font-black text-slate-800 text-lg leading-tight mb-6 min-h-[3rem] italic">{plan.descripcion}</h4>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-600"><User size={14} /> <span>{plan.mecanico}</span></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">OT {plan.nroOrden}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA TABLA */}
      {viewMode === "table" && (
        <div className="bg-white border border-pf-border rounded-3xl overflow-hidden shadow-sm">
          <DataTable data={datosOrdenados} isPlan={true} />
        </div>
      )}

      {/* MODAL DETALLE (DRAWER) */}
      {diaSeleccionado && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setDiaSeleccionado(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-10 overflow-y-auto animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="text-3xl font-black text-slate-900 leading-none">Día {parseInt(diaSeleccionado.split('/')[0])}</h4>
                <p className="text-pf-red font-bold uppercase text-xs tracking-widest mt-2">{obtenerPeriodo()}</p>
              </div>
              <button onClick={() => setDiaSeleccionado(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={32} className="text-slate-300" /></button>
            </div>
            
            <div className="space-y-4">
              {ordenesPorDia[diaSeleccionado] && ordenesPorDia[diaSeleccionado].length > 0 ? (
                ordenesPorDia[diaSeleccionado].map((orden: any, i: number) => (
                  <div key={i} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 border-l-4 border-l-pf-red">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[12px] font-black text-pf-red uppercase">OT: {orden.nroOrden}</p>
                      {renderRolBadge(orden.rol)}
                    </div>
                    
                    <p className="font-bold text-slate-800 leading-tight mb-3">{orden.descripcion}</p>
                    
                    {/* NUEVA SECCIÓN: FECHA MES ANTERIOR */}
                    <div className="flex items-center space-x-2 mb-4 bg-white/50 w-fit px-3 py-1 rounded-lg border border-slate-100">
                      <CalendarIcon size={10} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500">
                        Mes anterior: <span className="text-slate-700">{orden.fechaAnterior}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter italic">{orden.mecanico}</p>
                      <span className="text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-black italic">
                        {orden.equipo}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold italic text-sm">No hay órdenes programadas para este día.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};