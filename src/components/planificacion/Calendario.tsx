// src/components/planificacion/Calendario.tsx
import { useMemo } from "react";
import { Moon, CheckCircle2} from "lucide-react";

interface CalendarioProps {
  planResult: any[];
  plantaSeleccionada: string;
  plantas: string[];
  onCambiarPlanta: (planta: string) => void;
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

const getWeekNumber = (d: Date) => {
  // Definimos explícitamente el inicio de la Semana 1: Lunes 5 de Enero de 2026
  const inicioSemana1 = new Date(2026, 0, 5); // Mes 0 es Enero
  
  // Normalizamos las horas para evitar errores por zona horaria
  const fechaActual = new Date(d);
  fechaActual.setHours(0, 0, 0, 0);
  inicioSemana1.setHours(0, 0, 0, 0);

  // Calculamos la diferencia en milisegundos
  const diffTime = fechaActual.getTime() - inicioSemana1.getTime();
  
  // Convertimos a días
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Si la diferencia es negativa (antes del 5 de enero), manejamos casos especiales
  // o devolvemos 0/sem anterior. Para este caso, asumimos fechas >= 5 Enero o cercanas.
  
  // Calculamos la semana: (días transcurridos / 7) + 1
  return Math.floor(diffDays / 7) + 1;
};

export const Calendario = ({
  planResult,
  plantaSeleccionada,
  plantas,
  onCambiarPlanta,
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

  const { semanas, nombreMes, totalOrdenesMes, anioActual } = useMemo(() => {
    const base = planResult[0]?.fechaSugerida || "01/02/2026"; 
    const [, mes, anio] = base.split('/').map(Number);
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const nombreMes = primerDia.toLocaleString('es-ES', { month: 'long' });
    
    // Calcular padding para que el calendario empiece en Lunes
    let startIdx = primerDia.getDay() - 1;
    if (startIdx === -1) startIdx = 6;

    const diasArray = [
      ...Array(startIdx).fill(null),
      ...Array.from({ length: ultimoDia }, (_, i) => {
        const d = (i + 1).toString().padStart(2, '0');
        const m = mes.toString().padStart(2, '0');
        return `${d}/${m}/${anio}`;
      })
    ];

    const semanasArr = [];
    let totalMes = 0;

    // Iteramos de 7 en 7 para armar las filas
    for (let i = 0; i < diasArray.length; i += 7) {
      const chunk = diasArray.slice(i, i + 7);
      
      // Buscamos una fecha válida en esta fila para calcular a qué semana pertenece
      const fechaRefStr = chunk.find(d => d !== null);
      let numSemana = 0;
      let totalSemana = 0;

      if (fechaRefStr) {
        const [d, m, y] = fechaRefStr.split('/').map(Number);
        // Calculamos la semana basándonos en esa fecha
        numSemana = getWeekNumber(new Date(y, m - 1, d));
      } else {
        // Caso borde: Si la fila tiene puros nulls (raro), intentamos calcular basado en el índice
        // Pero con la lógica actual siempre habrá al menos una fecha si es el inicio/fin de mes
      }

      chunk.forEach(fecha => {
        if (fecha && ordenesPorDia[fecha]) totalSemana += ordenesPorDia[fecha].length;
      });
      totalMes += totalSemana;

      semanasArr.push({
        numero: numSemana,
        dias: chunk,
        totalOrdenes: totalSemana,
        idSemana: `WEEK-${numSemana}`
      });
    }

    return { 
      semanas: semanasArr, 
      nombreMes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1), 
      totalOrdenesMes: totalMes, 
      anioActual: anio 
    };
  }, [planResult, ordenesPorDia]);

  return (
    <div className="flex-1 space-y-6 relative">
      {/* Notificación */}
      {showSuccess && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 size={20} />
          <span className="font-black uppercase text-xs tracking-widest">Planificación Actualizada</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-pf-border shadow-sm">
        <div className="flex items-center space-x-6">
          <h3 className="text-xl font-black text-slate-900 uppercase italic">Planificación</h3>
          <div className="flex items-center gap-3 px-4 border-l border-slate-100">
             <div className="text-right hidden xl:block">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">{nombreMes} {anioActual}</span>
             </div>
             <div className="bg-pf-red text-white px-3 py-1 rounded-lg shadow-sm shadow-pf-red/20">
                <span className="text-xs font-black uppercase tracking-wider">{totalOrdenesMes} OTS</span>
             </div>
          </div>
        </div>
        <select value={plantaSeleccionada} onChange={(e) => onCambiarPlanta(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none">
          {plantas.map((p: string) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-pf-border shadow-sm">
        <div className="grid grid-cols-7 gap-3 mb-2 pl-6"> 
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</div>
          ))}
        </div>

        <div className="space-y-4">
          {semanas.map((sem, idx) => {
            const isWeekActive = diaSeleccionado === sem.idSemana;

            return (
              <div key={idx} className="relative group/semana">
                
                {/* INDICADOR SX */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full pr-2">
                  <button 
                    onClick={() => setDiaSeleccionado(isWeekActive ? null : sem.idSemana)}
                    className={`
                      text-[10px] font-black uppercase tracking-tighter transition-all hover:scale-110
                      ${isWeekActive ? 'text-pf-red underline scale-110' : 'text-slate-300 hover:text-pf-red'}
                    `}
                  >
                    S{sem.numero}
                  </button>
                </div>

                {/* Grid de días */}
                <div className={`grid grid-cols-7 gap-3 p-2 rounded-3xl transition-colors duration-300 ${isWeekActive ? 'bg-pf-red/[0.03]' : ''}`}>
                  {sem.dias.map((fecha, i) => {
                    if (!fecha) return <div key={`e-${idx}-${i}`} className="aspect-square" />;

                    const cantidad = ordenesPorDia[fecha]?.length || 0;
                    const diaNum = parseInt(fecha.split('/')[0]);
                    const esNocheOk = draggingOT && isNocheValid(draggingOT.tecnicos, fecha);
                    const isHovered = dragOverDate === fecha;
                    const isDaySelected = diaSeleccionado === fecha;

                    return (
                      <div 
                        key={fecha} 
                        onDragEnter={(e) => handleDragEnter(e, fecha)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, fecha)}
                        onClick={() => setDiaSeleccionado(isDaySelected ? null : fecha)}
                        className={`aspect-square group rounded-[2rem] border-2 transition-all duration-200 flex flex-col items-center justify-center p-2 cursor-pointer relative
                          ${isDaySelected ? 'border-pf-red bg-pf-red/[0.02]' : 'border-slate-50'}
                          ${isWeekActive && !isDaySelected ? 'border-pf-red/10 bg-white' : ''}
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
            );
          })}
        </div>
      </div>
    </div>
  );
};