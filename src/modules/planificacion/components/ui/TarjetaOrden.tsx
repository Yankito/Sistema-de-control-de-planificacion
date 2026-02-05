import { Move, User, Sparkles, Calendar } from "lucide-react";
import { CONFIG_ROLES } from "../../utils/planificacionUtils";

export const TarjetaOrden = ({ orden, handleDragStart, handleDragEnd, esAsignada, onEditTecnicos }: any) => {
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