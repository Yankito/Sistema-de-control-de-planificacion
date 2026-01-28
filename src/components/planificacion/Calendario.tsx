import { useMemo } from "react";
import { 
  CalendarDays, LayoutGrid, List, Moon, CheckCircle2 
} from "lucide-react";

interface CalendarioProps {
  planResult: any[];
  plantaSeleccionada: string;
  plantas: string[];
  onCambiarPlanta: (planta: string) => void;
  viewMode: string;
  setViewMode: (mode: any) => void;
  diaSeleccionado: string | null;
  setDiaSeleccionado: (dia: string | null) => void;
  draggingOT: any;
  handleDragEnter: (e: React.DragEvent, fecha: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, fecha: string) => void;
  isNocheValid: (tecnicos: any[], fecha: string) => boolean;
  showSuccess: boolean;
  dragOverDate: string | null;
  ordenesPorDia: any;
}

export const Calendario = ({
  planResult,
  plantaSeleccionada,
  plantas,
  onCambiarPlanta,
  viewMode,
  setViewMode,
  diaSeleccionado,
  setDiaSeleccionado,
  draggingOT,
  handleDragEnter,
  handleDragOver,
  handleDrop,
  isNocheValid,
  showSuccess,
  dragOverDate,
  ordenesPorDia
}: CalendarioProps) => {

  const { diasMes, espaciosVacios } = useMemo(() => {
    const base = planResult[0]?.fechaSugerida || "01/02/2026"; 
    const [, mes, anio] = base.split('/').map(Number);
    const primerDia = new Date(anio, mes - 1, 1);
    let startIdx = primerDia.getDay() - 1;
    if (startIdx === -1) startIdx = 6;
    const ultimo = new Date(anio, mes, 0).getDate();
    const dias = Array.from({ length: ultimo }, (_, i) => {
      const d = (i + 1).toString().padStart(2, '0');
      const m = mes.toString().padStart(2, '0');
      return `${d}/${m}/${anio}`;
    });
    return { diasMes: dias, espaciosVacios: Array.from({ length: startIdx }) };
  }, [planResult]);

  return (
    <div className="flex-1 space-y-6 relative">
      {/* Notificación de Éxito */}
      {showSuccess && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 size={20} />
          <span className="font-black uppercase text-xs tracking-widest">Planificación Actualizada</span>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-pf-border shadow-sm">
        <div className="flex items-center space-x-6">
          <h3 className="text-xl font-black text-slate-900 uppercase italic">Planificación</h3>
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

      {viewMode === "calendar" && (
        <div className="bg-white p-8 rounded-[3rem] border border-pf-border shadow-sm">
          <div className="grid grid-cols-7 gap-3">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">{d}</div>
            ))}
            
            {espaciosVacios.map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}

            {diasMes.map((fecha) => {
              const cantidad = ordenesPorDia[fecha]?.length || 0;
              const diaNum = parseInt(fecha.split('/')[0]);
              const esNocheOk = draggingOT && isNocheValid(draggingOT.tecnicos, fecha);
              const isHovered = dragOverDate === fecha;

              return (
                <div 
                  key={fecha} 
                  onDragEnter={(e) => handleDragEnter(e, fecha)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, fecha)}
                  onClick={() => setDiaSeleccionado(fecha === diaSeleccionado ? null : fecha)}
                  className={`aspect-square group rounded-[2rem] border-2 transition-all duration-200 flex flex-col items-center justify-center p-2 cursor-pointer relative
                    ${diaSeleccionado === fecha ? 'border-pf-red bg-pf-red/[0.02]' : 'border-slate-50'}
                    ${isHovered ? 'bg-slate-100 ring-4 ring-pf-red/20 scale-110 z-20' : ''} 
                    ${esNocheOk && !isHovered ? 'bg-pf-red/5 border-pf-red/30' : ''}
                    ${draggingOT && !esNocheOk && !isHovered ? 'opacity-30 blur-[1px]' : 'opacity-100'}
                    hover:border-slate-200
                  `}
                >
                  {esNocheOk && <Moon size={14} className="absolute top-3 right-3 text-pf-red fill-pf-red animate-pulse" />}
                  <span className={`text-2xl font-black ${cantidad > 0 ? 'text-slate-800' : 'text-slate-200'}`}>{diaNum}</span>
                  {cantidad > 0 && (
                    <div className="mt-1 px-2 py-0.5 bg-pf-red text-white rounded-full font-black text-[9px] uppercase">
                      {cantidad} OTS
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};