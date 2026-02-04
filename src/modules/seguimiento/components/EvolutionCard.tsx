import { useState } from "react";
import { ArrowRight, PlusCircle, CheckCircle2, ArrowRightCircle, ChevronDown, ChevronUp } from "lucide-react";
import { OTFlowResult } from "../logic/backlogAnalysis";

interface EvolutionGroupProps {
  title: string;
  data: OTFlowResult[];
  color: string;
  icon: any;
  sublabel: string;
}

const EvolutionGroup = ({ title, data, color, icon: Icon, sublabel }: EvolutionGroupProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`border rounded-xl bg-white overflow-hidden shadow-sm ${isOpen ? 'ring-2 ring-offset-1' : ''} ring-${color}-200 transition-all`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
            <Icon size={20} />
          </div>
          <div>
            <h4 className="font-black text-sm text-slate-700 uppercase">{title}</h4>
            <span className="text-xs text-slate-400 font-medium">{sublabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-black text-${color}-600`}>{data.length}</span>
          {isOpen ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
        </div>
      </div>

      {isOpen && data.length > 0 && (
        <div className="border-t border-slate-100 max-h-60 overflow-y-auto bg-slate-50/50 p-2">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 font-bold uppercase">
              <tr>
                <th className="px-2 py-1">Planta</th>
                <th className="px-2 py-1">OT</th>
                <th className="px-2 py-1">Cambio</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.ot} className="border-b border-slate-200/50 last:border-0 hover:bg-white transition-colors">
                  <td className="px-2 py-2 font-bold text-slate-600 w-16">{row.planta}</td>
                  <td className="px-2 py-2 font-mono text-slate-500 w-20">{row.ot}</td>
                  <td className="px-2 py-2 text-slate-700">
                    <div className="flex flex-col">
                        <span className="truncate max-w-[200px] font-medium">{row.descripcion}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            {row.estadoAnterior || 'N/A'} <ArrowRight size={8}/> {row.estadoActual || 'Fin'}
                        </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface EvolutionCardProps {
  nuevas: OTFlowResult[];
  finalizadas: OTFlowResult[];
  conAvance: OTFlowResult[];
  semanaActual: string;
  semanaAnterior: string;
}

export const EvolutionDashboard = ({ nuevas, finalizadas, conAvance, semanaActual, semanaAnterior }: EvolutionCardProps) => {
  if (!semanaAnterior) return <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl text-sm font-bold">Selecciona una semana de comparación en el filtro superior para ver la evolución.</div>;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRightCircle className="text-purple-600" />
        <h3 className="text-lg font-black uppercase text-slate-700">Flujo de OTs</h3>
        <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            {semanaAnterior} <ArrowRight size={10} className="inline"/> {semanaActual}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EvolutionGroup 
            title="Nuevas Entradas" 
            sublabel="OTs que no existían la semana pasada"
            data={nuevas} 
            color="red" 
            icon={PlusCircle} 
        />
        <EvolutionGroup 
            title="Salieron / Finalizadas" 
            sublabel="OTs que desaparecieron del backlog"
            data={finalizadas} 
            color="green" 
            icon={CheckCircle2} 
        />
        <EvolutionGroup 
            title="Cambio de Estado" 
            sublabel="OTs que avanzaron (ej: Lib -> Trat)"
            data={conAvance} 
            color="blue" 
            icon={ArrowRightCircle} 
        />
      </div>
    </div>
  );
};