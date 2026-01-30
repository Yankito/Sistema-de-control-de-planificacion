import { Filter, TrendingUp, TrendingDown, Minus } from "lucide-react";

// --- SELECT PILL (Sin cambios) ---
export const SelectPill = ({ value, onChange, options, label, allLabel }: any) => (
  <div className="flex items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
    <span className="text-[10px] font-bold text-slate-400 uppercase mr-2 tracking-wider">{label}:</span>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-pf-red transition-colors"
    >
      {allLabel && <option value="TODAS">{allLabel}</option>}
      {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// --- HEADER SECTION (Sin cambios) ---
export const HeaderSection = ({ icon: Icon, title, color, bg }: any) => (
  <div className="flex items-center gap-3 mb-2">
    <div className={`p-2 rounded-xl shadow-sm ${bg} ${color}`}><Icon size={18}/></div>
    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
  </div>
);

// --- KPI TILE ACTUALIZADO (Muestra Cantidad) ---
interface KpiTileProps {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  subValue?: string;
  previousValue?: number; 
  currentValue?: number;  
  inverse?: boolean;      
  formatter?: (val: number) => string; // <-- NUEVA PROP: Para dar formato a la diferencia (ej: $)
}

export const KpiTile = ({ title, value, subValue, icon: Icon, color, previousValue, currentValue, inverse = false, formatter }: KpiTileProps) => {
  
  const theme: any = {
    red: 'text-pf-red bg-red-50', 
    amber: 'text-amber-600 bg-amber-50', 
    blue: 'text-blue-600 bg-blue-50', 
    purple: 'text-purple-600 bg-purple-50',
    green: 'text-emerald-600 bg-emerald-50'
  };

  // Lógica de cálculo de DIFERENCIA (Cantidad)
  let diff = 0;
  let isUp = false;
  let isGood = false;
  let hasData = false;

  if (previousValue !== undefined && currentValue !== undefined && previousValue !== 0) {
    hasData = true;
    diff = currentValue - previousValue; // Resta directa
    isUp = diff > 0;
    isGood = inverse ? isUp : !isUp; 
  }

  // Formateamos la diferencia (si no hay formatter, muestra el número tal cual)
  const absDiff = Math.abs(diff);
  const diffDisplay = formatter ? formatter(absDiff) : absDiff;

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-full group hover:shadow-md transition-all relative overflow-hidden">
      
      <div className="flex justify-between items-start mb-2">
        <div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
           <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme[color] || theme.blue}`}>
           <Icon size={20}/>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        {/* Indicador de Cantidad (+/-) */}
        {hasData && Math.abs(diff) > 0 && (
            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {isUp ? <TrendingUp size={10} strokeWidth={3}/> : <TrendingDown size={10} strokeWidth={3}/>}
                {/* Aquí mostramos la cantidad formateada (ej: $20.000) */}
                <span>{diffDisplay}</span>
            </div>
        )}
        
        {hasData && Math.abs(diff) === 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                <Minus size={10} /> <span>Sin cambio</span>
            </div>
        )}

        {subValue && <p className="text-[10px] text-slate-400 font-medium ml-auto">{subValue}</p>}
      </div>
    </div>
  );
};

// --- INTERACTIVE BAR (Sin cambios) ---
export const InteractiveBar = ({ label, value, subValue, percent, color, active, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`
      group relative p-2 rounded-xl cursor-pointer transition-all duration-300 border
      ${active ? 'bg-slate-100 border-slate-300 shadow-inner ring-1 ring-slate-200' : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'}
    `}
  >
    <div className="flex justify-between items-end relative z-10 mb-2">
      <span className={`text-xs font-bold transition-colors truncate max-w-[65%] ${active ? 'text-slate-900' : 'text-slate-600 group-hover:text-pf-red'}`} title={label}>
        {label}
      </span>
      <div className="text-right">
        <span className="block text-sm font-bold text-slate-800">{value}</span>
        {subValue && <span className="block text-[10px] text-slate-400">{subValue}</span>}
      </div>
    </div>
    
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
      <div className={`h-full rounded-full absolute left-0 top-0 ${color} transition-all duration-1000 ease-out`} style={{ width: `${Math.max(percent, 2)}%` }}></div>
    </div>
    
    {active && <div className="absolute right-2 top-2 text-pf-red animate-bounce"><Filter size={10} fill="currentColor"/></div>}
  </div>
);