import { useMemo } from "react"; 
import { X, Move, User, Info, Calendar, Sparkles } from "lucide-react";
import { CONFIG_ROLES } from "../utils/planificacionUtils";

const getWeekNumber = (d: Date) => {
  const inicioSemana1 = new Date(2026, 0, 5); 
  const fechaActual = new Date(d);
  fechaActual.setHours(0, 0, 0, 0);
  inicioSemana1.setHours(0, 0, 0, 0);
  const diffTime = fechaActual.getTime() - inicioSemana1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 0;
  return Math.floor(diffDays / 7) + 1;
};

interface PanelLateralProps {
  diaSeleccionado: string | null;
  setDiaSeleccionado: (dia: string | null) => void;
  ordenesPorDia: any;
  planResultSinAsignar: any[];
  handleDragStart: (e: React.DragEvent, ot: any) => void;
  handleDragEnd: () => void;
  plantaSeleccionada: string;
  onEditTecnicos: (orden: any) => void;
  mostrarSoloVacantes: boolean;
}

export const PanelLateral = ({
  diaSeleccionado,
  setDiaSeleccionado,
  ordenesPorDia,
  planResultSinAsignar,
  handleDragStart,
  handleDragEnd,
  plantaSeleccionada,
  onEditTecnicos,
  mostrarSoloVacantes // Recibimos el filtro
}: PanelLateralProps) => {

  const ordenesVisualizadas = useMemo(() => {
    if (!diaSeleccionado) return [];
    
    let listaFiltrada: any[] = [];

    if (diaSeleccionado.startsWith("WEEK-")) {
      const semanaNum = parseInt(diaSeleccionado.split("-")[1]);
      Object.keys(ordenesPorDia).forEach((fecha) => {
        const [d, m, y] = fecha.split("/").map(Number);
        const fechaObj = new Date(y, m - 1, d);
        const semanaDeLaOrden = getWeekNumber(fechaObj);
        if (semanaDeLaOrden === semanaNum) {
          listaFiltrada.push(...ordenesPorDia[fecha]);
        }
      });
    } else {
      listaFiltrada = ordenesPorDia[diaSeleccionado] || [];
    }

    // APLICAR FILTRO DE VACANTES SI ESTÁ ACTIVO
    if (mostrarSoloVacantes) {
        return listaFiltrada.filter(ot => 
            ot.tecnicos.some((t: any) => t.nombre === 'VACANTE')
        );
    }

    return listaFiltrada;
  }, [diaSeleccionado, ordenesPorDia, mostrarSoloVacantes]);

  const tituloPanel = useMemo(() => {
    if (!diaSeleccionado) return "Pendientes";
    if (diaSeleccionado.startsWith("WEEK-")) return `Semana ${diaSeleccionado.split("-")[1]}`;
    return `Día ${parseInt(diaSeleccionado.split('/')[0])}`;
  }, [diaSeleccionado]);

  return (
    <div className="w-96 flex flex-col">
      <div className="bg-white rounded-[2.5rem] border border-pf-border shadow-xl flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
          <div>
            <h4 className="font-black uppercase tracking-tighter text-lg leading-none">
              {tituloPanel}
            </h4>
            <p className="text-[10px] font-bold text-slate-200 uppercase mt-1">
              {diaSeleccionado 
                ? `${ordenesVisualizadas.length} Órdenes ${mostrarSoloVacantes ? 'Incompletas' : 'Asignadas'}` 
                : "Sin turno de noche"}
            </p>
          </div>
          {diaSeleccionado && (
            <button onClick={() => setDiaSeleccionado(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          {diaSeleccionado ? (
            ordenesVisualizadas.length > 0 ? (
              ordenesVisualizadas.map((orden: any, i: number) => (
                <TarjetaOrden 
                  key={`${orden.nroOrden}-${i}`} 
                  orden={orden} 
                  handleDragStart={handleDragStart} 
                  handleDragEnd={handleDragEnd} 
                  esAsignada={true}
                  onEditTecnicos={onEditTecnicos}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
                 <Calendar size={40} className="mb-2 stroke-1" />
                 <span className="text-xs font-bold uppercase tracking-wider text-center">
                    {mostrarSoloVacantes 
                        ? "Todas las órdenes completas" 
                        : "Sin órdenes esta semana"}
                 </span>
              </div>
            )
          ) : (
            planResultSinAsignar.map((ot: any, i: number) => (
              <TarjetaOrden 
                key={i} 
                orden={{
                  nroOrden: ot.nroOrden || ot["PEDIDO DE TRABAJO"] || `PEND-${i}`,
                  equipo: ot.equipo || ot["NÚMERO DE ACTIVO"] || "SIN ACTIVO",
                  descripcion: ot.descripcion || ot["DESCRIPCIÓN"] || "SIN DESCRIPCIÓN",
                  tecnicos: ot.tecnicos || [{ nombre: ot.mecanico || "SIN ASIGNAR", rol: ot.rol || "M" }],
                  planta: ot.planta || plantaSeleccionada,
                  fechaAnterior: ot.fechaAnterior || "N/A",
                  error: ot.error
                }} 
                handleDragStart={handleDragStart} 
                handleDragEnd={handleDragEnd} 
                esAsignada={false}
                onEditTecnicos={onEditTecnicos}
              />
            ))
          )}
        </div>

        {!diaSeleccionado && (
          <div className="p-6 bg-slate-900 border-t border-slate-800 flex items-start gap-3">
            <Info size={16} className="text-pf-red mt-0.5" />
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              <strong className="text-white">Tip de Gestión:</strong> Arrastra estas órdenes a los días resaltados con una <strong className="text-pf-red">Luna</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Componente TarjetaOrden ---
const TarjetaOrden = ({ orden, handleDragStart, handleDragEnd, esAsignada, onEditTecnicos }: any) => {
  const listaTecnicos = Array.isArray(orden.tecnicos) 
    ? orden.tecnicos 
    : [{ nombre: orden.mecanico || "SIN ASIGNAR", rol: orden.rol || "M" }];

  return (
    <div 
      draggable 
      onDragStart={(e) => handleDragStart(e, orden)}
      onDragEnd={handleDragEnd}
      className={`p-5 bg-white rounded-3xl border shadow-sm cursor-grab active:cursor-grabbing hover:border-pf-red transition-all group relative overflow-hidden
        ${esAsignada ? 'border-slate-200' : 'border-amber-200'}
      `}
    >
      {!esAsignada && <div className="absolute top-4 left-0 w-1 h-8 bg-amber-400 rounded-r-full" />}
      
      <div className="flex justify-between items-start mb-3 pl-2">
        <div className="flex flex-col">
          <p className="text-[10px] font-black text-pf-red uppercase italic">OT: {orden.nroOrden}</p>
          {!esAsignada && orden.error && (
             <span className="text-[7px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase mt-1 w-fit">
               {orden.error}
             </span>
          )}
        </div>
        <Move size={14} className="text-slate-300 group-hover:text-pf-red" />
      </div>
      
      <p className="font-bold text-slate-800 text-sm leading-tight mb-3 pl-2">{orden.descripcion}</p>
      
      <div className="pl-2 space-y-2">
        <div className="flex flex-col gap-1">
          {listaTecnicos.map((tec: any, idx: number) => {
            const config = CONFIG_ROLES[tec.rol] || { label: tec.rol, color: 'bg-slate-500', text: 'text-slate-500' };
            return(
            
            <div key={idx} className="flex items-center justify-between"> 
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase w-full">
                  <div className={`flex items-center gap-1 ${config.text}`}>
                      <User size={10} className="fill-current" />
                  </div>
                    
                    <span className={`truncate flex-1 ${tec.nombre === "VACANTE" ? config.text : ""}`}>
                       {tec.nombre}
                    </span>

                    {/* ÍCONO DE SUGERIDO POR ALGORITMO */}
                    {tec.esSugerido && (
                        <div title="Sugerido automáticamente">
                            <Sparkles size={10} className="text-purple-500 ml-1 fill-purple-100" />
                        </div>
                    )}
                </div>
            </div>
            )
          })}
          
          {esAsignada && (
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (onEditTecnicos) onEditTecnicos(orden);
                }}
                className="mt-2 w-full text-[9px] font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-pf-red py-1 rounded border border-slate-200 transition-colors"
              >
                Cambiar Técnicos
              </button>
          )}
        </div>
        
        {orden.fechaAnterior && orden.fechaAnterior !== "N/A" && (
          <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit mt-1">
            <Calendar size={10} />
            <span>Última vez: {orden.fechaAnterior}</span>
          </div>
        )}
      </div>
    </div>
  );
};