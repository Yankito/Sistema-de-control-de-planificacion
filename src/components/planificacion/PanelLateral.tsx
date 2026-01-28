import { X, Move, User, Info, Calendar } from "lucide-react";

interface PanelLateralProps {
  diaSeleccionado: string | null;
  setDiaSeleccionado: (dia: string | null) => void;
  ordenesPorDia: any;
  planResultSinAsignar: any[];
  handleDragStart: (e: React.DragEvent, ot: any) => void;
  handleDragEnd: () => void;
  plantaSeleccionada: string;
}

export const PanelLateral = ({
  diaSeleccionado,
  setDiaSeleccionado,
  ordenesPorDia,
  planResultSinAsignar,
  handleDragStart,
  handleDragEnd,
  plantaSeleccionada
}: PanelLateralProps) => {
  return (
    <div className="w-96 flex flex-col">
      <div className="bg-white rounded-[2.5rem] border border-pf-border shadow-xl flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
          <div>
            <h4 className="font-black uppercase tracking-tighter text-lg leading-none">
              {diaSeleccionado ? `Día ${parseInt(diaSeleccionado.split('/')[0])}` : "Pendientes"}
            </h4>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
              {diaSeleccionado ? "Órdenes de trabajo" : "Sin turno de noche"}
            </p>
          </div>
          {diaSeleccionado && (
            <button onClick={() => setDiaSeleccionado(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          {diaSeleccionado ? (
            ordenesPorDia[diaSeleccionado]?.map((orden: any, i: number) => (
              <TarjetaOrden 
                key={i} 
                orden={orden} 
                handleDragStart={handleDragStart} 
                handleDragEnd={handleDragEnd} 
                esAsignada={true}
              />
            ))
          ) : (
            planResultSinAsignar.map((ot: any, i: number) => (
              <TarjetaOrden 
                key={i} 
                orden={{
                  // PRIORIDAD 1: Llaves ya procesadas por el Service (planas)
                  // PRIORIDAD 2: Llaves originales de Excel (si el Service falló o es OT Nueva)
                  nroOrden: ot.nroOrden || ot["PEDIDO DE TRABAJO"] || `PEND-${i}`,
                  equipo: ot.equipo || ot["NÚMERO DE ACTIVO"] || "SIN ACTIVO",
                  descripcion: ot.descripcion || ot["DESCRIPCIÓN"] || "SIN DESCRIPCIÓN",
                  
                  // Manejo de técnicos
                  tecnicos: ot.tecnicos || [{ nombre: ot.mecanico || "SIN ASIGNAR", rol: ot.rol || "M" }],
                  
                  planta: ot.planta || plantaSeleccionada,
                  fechaAnterior: ot.fechaAnterior || "N/A",
                  error: ot.error
                }} 
                handleDragStart={handleDragStart} 
                handleDragEnd={handleDragEnd} 
                esAsignada={false}
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

const TarjetaOrden = ({ orden, handleDragStart, handleDragEnd, esAsignada }: any) => {
  // Extraemos la lista de técnicos (si no existe, creamos un array con el técnico individual por compatibilidad)
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
        {/* LISTA DE TÉCNICOS EN LA CUADRILLA */}
        <div className="flex flex-col gap-1">
          {listaTecnicos.map((tec: any, idx: number) => (
            <div key={idx} className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
              <User size={10} className={tec.rol === 'E' ? "text-yellow-500" : "text-blue-500"} /> 
              <span className={tec.nombre === "SIN ASIGNAR" || tec.nombre === "SIN HISTORIAL" ? "text-slate-300 italic" : ""}>
                {tec.nombre}
              </span>
            </div>
          ))}
        </div>
        
        {/* FECHA ANTERIOR */}
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