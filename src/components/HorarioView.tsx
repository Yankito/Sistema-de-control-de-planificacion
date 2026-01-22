import { HorarioTecnico } from "../logic/excelProcessor";
import { Wrench, Zap } from "lucide-react";

const COLORES_TURNOS: Record<string, string> = {
  'M': 'bg-blue-500 text-white shadow-sm',      // Mañana
  'T': 'bg-orange-500 text-white shadow-sm',    // Tarde
  'N': 'bg-slate-800 text-white shadow-sm',     // Noche
  'L': 'bg-slate-100 text-slate-300',           // Libre
  'V': 'bg-emerald-500 text-white shadow-sm',   // Vacaciones
  'LIC': 'bg-rose-500 text-white shadow-sm',    // Licencia
};

export const HorarioView = ({ horarios }: { horarios: HorarioTecnico[] }) => {
  return (
    <div className="bg-white border border-pf-border rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-pf-border">
              <th className="sticky left-0 z-20 bg-slate-50 p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-pf-border min-w-[200px]">
                Personal de Mantención
              </th>
              {Array.from({ length: 31 }, (_, i) => (
                <th key={i} className="p-2 text-[10px] font-bold text-slate-400 border-r border-pf-border min-w-[38px] text-center">
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horarios.map((h, idx) => {
              const isElectrico = h.rol?.toLowerCase() === 'e' || h.rol?.toLowerCase() === 'electrico';
              console.log("ROL:", h.rol, "isElectrico:", isElectrico);
              const isMecanico = h.rol?.toLowerCase() === 'm' || h.rol?.toLowerCase() === 'mecanico';

              return (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <td className="sticky left-0 z-10 bg-white p-4 border-r border-pf-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center space-x-3">
                      {/* Icono dinámico según Rol */}
                      <div className={`p-2 rounded-xl shrink-0 ${isElectrico ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600'}`}>
                        {isElectrico ? <Zap size={14} fill="currentColor" /> : <Wrench size={14} fill="currentColor" />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-black text-slate-800 truncate">{h.nombre}</p>
                        <p className={`text-[9px] font-black uppercase tracking-tighter ${isElectrico ? 'text-yellow-600' : 'text-blue-600'}`}>
                          {isElectrico ? 'Especialista Eléctrico' : 'Especialista Mecánico'}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  {h.turnos.map((turno, dayIdx) => (
                    <td key={dayIdx} className="p-1 border-r border-slate-100 text-center">
                      <div 
                        title={`Día ${dayIdx + 1}: ${turno}`}
                        className={`
                          w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all
                          group-hover:scale-105
                          ${COLORES_TURNOS[turno] || 'bg-slate-50 text-slate-200'}
                        `}
                      >
                        {turno}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Leyenda de Colores Mejorada */}
      <div className="p-6 bg-slate-50/50 border-t border-pf-border flex flex-wrap gap-x-8 gap-y-3">
        <div className="w-full mb-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nomenclatura de Turnos</span>
        </div>
        {Object.entries({
          'M': 'Mañana',
          'T': 'Tarde',
          'N': 'Noche',
          'L': 'Libre',
          'V': 'Vacaciones',
          'LIC': 'Licencia'
        }).map(([key, label]) => (
          <div key={key} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[8px] font-black ${COLORES_TURNOS[key]}`}>
              {key}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};