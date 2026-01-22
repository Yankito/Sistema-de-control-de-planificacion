import { HorarioView } from "../components/HorarioView";
import { HorarioTecnico } from "../logic/excelProcessor";
import { Wrench, Zap, Users, Filter } from "lucide-react";

interface HorariosViewProps {
  horariosResult: HorarioTecnico[];
  plantas: string[];
  plantaSeleccionada: string;
  onCambiarPlanta: (planta: string) => void;
}

export const HorariosView = ({ 
  horariosResult = [], 
  plantas = [], 
  plantaSeleccionada, 
  onCambiarPlanta 
}: HorariosViewProps) => {
  
  // Contadores precisos basados en el rol normalizado
  const totalMecanicos = horariosResult.filter(h => 
    h.rol?.toLowerCase() === 'm' || h.rol?.toLowerCase() === 'mecanico'
  ).length;
  
  const totalElectricos = horariosResult.filter(h => 
    h.rol?.toLowerCase() === 'e' || h.rol?.toLowerCase() === 'electrico'
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER DE ESTADO Y FILTRO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-8 rounded-[2.5rem] border border-pf-border shadow-sm gap-6">
        <div className="flex items-center space-x-6">
          <div className="bg-pf-red p-4 rounded-3xl shadow-lg shadow-pf-red/20">
            <Users className="text-white" size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Disponibilidad de Técnicos
            </h3>
            <div className="flex items-center gap-4 mt-3">
               <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                 <Wrench size={12} className="mr-2 text-blue-600" />
                 <span className="text-[10px] font-black text-blue-700 uppercase">{totalMecanicos} Mecánicos</span>
               </div>
               <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                 <Zap size={12} className="mr-2 text-yellow-600" />
                 <span className="text-[10px] font-black text-yellow-700 uppercase">{totalElectricos} Eléctricos</span>
               </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col w-full lg:w-72">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex items-center">
            <Filter size={10} className="mr-1" /> Seleccionar Planta
          </label>
          <div className="relative">
            <select 
              value={plantaSeleccionada}
              onChange={(e) => onCambiarPlanta(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold text-slate-700 focus:ring-4 focus:ring-pf-red/10 outline-none transition-all appearance-none cursor-pointer"
            >
              {plantas.length > 0 ? (
                plantas.map((p) => <option key={p} value={p}>{p}</option>)
              ) : (
                <option>Cargando lista...</option>
              )}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* LEYENDA RÁPIDA DE TURNOS (Diseño mejorado) */}
      <div className="flex flex-wrap gap-6 px-6 py-2">
         {[
           { label: 'Mañana', color: 'bg-blue-500', code: 'M' },
           { label: 'Tarde', color: 'bg-orange-500', code: 'T' },
           { label: 'Noche', color: 'bg-slate-800', code: 'N' },
           { label: 'Vacaciones', color: 'bg-emerald-500', code: 'V' }
         ].map(item => (
           <div key={item.code} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{item.label} ({item.code})</span>
           </div>
         ))}
      </div>

      {/* VISTA GANTT PRINCIPAL */}
      <div className="bg-white rounded-[3rem] border border-pf-border shadow-md shadow-slate-200/50 overflow-hidden">
        <HorarioView horarios={horariosResult} />
      </div>
    </div>
  );
};