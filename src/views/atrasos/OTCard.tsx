import { CheckCircle2, AlertCircle } from "lucide-react";

interface OTCardProps {
  item: any;
  onSelectEmployee?: (name: string) => void;
  selectedEmployee?: string | null;
}

export const OTCard = ({ item, onSelectEmployee, selectedEmployee }: OTCardProps) => (
  <div className={`bg-white p-4 rounded-xl border shadow-sm transition-all ${item.isNew ? 'border-l-4 border-l-red-600' : 'border-slate-200'}`}>
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-slate-900">{item.ot}</span>
        {item.isNew && <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse">NUEVA</span>}
      </div>
      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${
        item.clasificacion === 'PROGRAMADOR' ? 'bg-green-100 text-green-700' : 
        item.clasificacion === 'TECNICO / SERVICIO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
      }`}>{item.clasificacion}</span>
    </div>
    
    <p className="text-[10px] text-slate-500 uppercase font-medium line-clamp-2 mb-3">{item.descripcion}</p>
    
    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 mb-3 space-y-1">
      {item.detallesTecnicos?.map((t: any, i: number) => (
        <div 
          key={i} 
          onClick={() => onSelectEmployee && onSelectEmployee(t.tecnico)}
          className={`flex items-center justify-between p-1 rounded transition-colors ${!selectedEmployee ? 'hover:bg-pf-red/5 cursor-pointer group' : ''}`}
        >
          <span className={`text-[10px] font-bold ${selectedEmployee === t.tecnico ? 'text-pf-red' : 'text-slate-600 group-hover:text-pf-red'}`}>
            {t.tecnico}
          </span>
          {t.finalizada ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-red-500" />}
        </div>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-2 mb-3">
      <div className={`p-1.5 rounded-lg border flex flex-col items-center ${item.rmd === 'SI' || item.rmd === '' || item.rmd === '0' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
        <span className="text-[7px] font-black uppercase opacity-60">RMD</span>
        <span className="text-[10px] font-bold">{item.rmd || 'N/A'}</span>
      </div>
      <div className={`p-1.5 rounded-lg border flex flex-col items-center ${item.rse === 'SI' || item.rse === '' || item.rse === '0' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
        <span className="text-[7px] font-black uppercase opacity-60">RSE</span>
        <span className="text-[10px] font-bold">{item.rse || 'N/A'}</span>
      </div>
    </div>

    <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[9px] font-bold text-slate-400 uppercase">
      <span>{item.periodo}</span>
      <span className="italic">{item.planta}</span>
    </div>
  </div>
);