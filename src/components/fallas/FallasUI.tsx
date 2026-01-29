// src/components/fallas/FallasUI.tsx

import { Filter } from "lucide-react";

export const SelectPill = ({ value, onChange, options, label, allLabel }: any) => (
  <div className="flex items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
    <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">{label}:</span>
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

export const HeaderSection = ({ icon: Icon, title, color, bg }: any) => (
  <div className="flex items-center gap-3 mb-2">
    <div className={`p-2 rounded-xl ${bg} ${color}`}><Icon size={18}/></div>
    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
  </div>
);

export const KpiTile = ({ title, value, subValue, icon: Icon, color }: any) => {
  const theme:any = {
    red: 'text-pf-red bg-red-50', 
    amber: 'text-amber-600 bg-amber-50', 
    blue: 'text-blue-600 bg-blue-50', 
    purple: 'text-purple-600 bg-purple-50'
  };
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme[color]}`}><Icon size={24}/></div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
        {subValue && <p className="text-[10px] text-slate-400 font-medium">{subValue}</p>}
      </div>
    </div>
  );
};

interface InteractiveBarProps {
  label: string;
  value: string | number;
  subValue?: string;
  percent: number;
  color: string;
  active?: boolean;
  onClick: () => void;
}

export const InteractiveBar = ({ label, value, subValue, percent, color, active, onClick }: InteractiveBarProps) => (
  <div 
    onClick={onClick}
    className={`
      group relative p-2 rounded-xl cursor-pointer transition-all duration-300 border
      ${active ? 'bg-slate-100 border-slate-300 shadow-inner ring-1 ring-slate-200' : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'}
    `}
  >
    <div className="flex justify-between items-end relative z-10 mb-2">
      <span className={`text-xs font-bold transition-colors truncate max-w-[70%] ${active ? 'text-slate-900' : 'text-slate-600 group-hover:text-pf-red'}`} title={label}>
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
