import { useState } from "react";
import { Activity, DollarSign, Clock, Zap, History, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { KpiTile, HeaderSection } from "./FallasUI";
import { TrendChart } from "./TrendChart"; // <--- IMPORTAMOS EL NUEVO COMPONENTE
import { clp, num } from "../../utils/dateUtils";

interface Props {
  analytics: any;
  timelineStats: any;
  semanaFiltro: string;
  setSemanaFiltro: (s: string) => void;
  filtroDrill: { tipo: string, valor: string } | null;
  setFiltroDrill: (f: { tipo: 'EQUIPO' | 'CAUSA', valor: string } | null) => void;
  rangoTexto: string;
  topN: number;
  anioFiltro: number;
}

export const DashboardTab = ({ 
    analytics, timelineStats, semanaFiltro, setSemanaFiltro,
    filtroDrill, setFiltroDrill, rangoTexto, anioFiltro 
}: Props) => {
  
  const { heroStats } = analytics;
  const [showComparison, setShowComparison] = useState(false); 

  const handleBarClick = (tipo: 'EQUIPO' | 'CAUSA', valor: string) => {
    if (filtroDrill && filtroDrill.tipo === tipo && filtroDrill.valor === valor) {
      setFiltroDrill(null); 
    } else {
      setFiltroDrill({ tipo, valor });
    }
  };

  // --- COMPONENTE CUSTOM: FILA COMPARATIVA (Igual que antes) ---
  const ComparativeRow = ({ item, maxValGlobal, formatFn, type, onClick, active }: any) => {
      // ... (Misma lógica de ComparativeRow que ya tenías, no hace falta cambiarla)
      const currentVal = type === 'FREQ' ? item.count : (type === 'COST' ? item.gasto : item.mttr);
      const prevVal = type === 'FREQ' ? item.prevCount : (type === 'COST' ? item.prevGasto : item.prevMttr);
      const diff = currentVal - prevVal;
      const isBetter = diff < 0;
      const isWorse = diff > 0;
      const isNeutral = diff === 0;

      let scaleBase = 1;
      if (showComparison) {
          scaleBase = Math.max(prevVal, currentVal);
      } else {
          scaleBase = maxValGlobal;
      }
      if (scaleBase === 0) scaleBase = 1;

      const currentPercent = (currentVal / scaleBase) * 100;
      const prevPercent = (prevVal / scaleBase) * 100;

      let barColor = "bg-slate-400";
      if (showComparison) {
          if (isBetter) barColor = "bg-emerald-500";
          if (isWorse) barColor = "bg-red-500";
      } else {
          if (type === 'FREQ') barColor = "bg-blue-600";
          if (type === 'COST') barColor = "bg-pf-red";
          if (type === 'MTTR') barColor = "bg-purple-600";
      }

      return (
        <div 
            onClick={onClick}
            className={`group p-3 rounded-xl cursor-pointer transition-all duration-300 border mb-2 ${active ? 'bg-slate-50 border-slate-300 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
        >
            <div className="flex justify-between items-end mb-2">
                <span className={`text-xs font-bold truncate max-w-[50%] ${active ? 'text-slate-900' : 'text-slate-600'}`}>
                    {item.label}
                </span>
                <div className="text-right flex items-center gap-1">
                    {showComparison && !isNeutral && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isBetter ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {isBetter ? <TrendingDown size={10}/> : <TrendingUp size={10}/>}
                            {formatFn(Math.abs(diff))}
                        </span>
                    )}
                    <span className="block text-sm font-black text-slate-800">{formatFn(currentVal)}</span>
                </div>
            </div>

            <div className="relative w-full flex flex-col justify-center gap-1">
                {showComparison && (
                     <div className="flex items-center gap-1">
                        <div className="relative h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden border border-slate-300">
                            <div className="absolute top-0 left-0 h-full rounded-full bg-slate-400 transition-all duration-500" style={{ width: `${Math.max(prevPercent, 0)}%` }}></div>
                        </div>
                        <span className="text-[9px] font-medium text-slate-400 w-12 text-right">{anioFiltro - 1}</span>
                    </div>
                )}
                <div className="flex items-center gap-1">
                    <div className="relative h-2.5 flex-1 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-300">
                        <div className={`absolute top-0 left-0 h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.max(currentPercent, 0)}%` }}></div>
                    </div>
                    {showComparison && <span className="text-[9px] font-bold text-slate-600 w-12 text-right">{anioFiltro}</span>}
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. HERO CARD */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 group">
         <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-pf-red/20 to-transparent"></div>
         <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-pf-red px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {semanaFiltro !== "TODAS" ? `Foco: Semana ${semanaFiltro}` : "Visión Global"}
                </span>
                <span className="text-white/80 text-[15px] font-mono font-bold">{rangoTexto}</span>
            </div>
            <h3 className="text-3xl font-light">
                <span className="font-bold">{heroStats.topCritico?.label || "Sin Datos"}</span> es el equipo crítico.
            </h3>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
                Registró <span className="text-white font-bold text-lg">{heroStats.topCritico?.count || 0} fallas</span> y acumuló {num(heroStats.topCritico?.tiempo || 0)} min de detención.
            </p>
         </div>

         <div className="flex gap-4 relative z-10">
            <div className="text-center"><p className="text-[10px] text-slate-400 uppercase font-bold">Fallas</p><p className="text-xl font-bold text-blue-400">{heroStats.topCritico?.count || 0}</p></div>
            <div className="w-[1px] bg-white/10"></div>
            <div className="text-center"><p className="text-[10px] text-slate-400 uppercase font-bold">Costo</p><p className="text-xl font-bold text-pf-red">{clp(heroStats.topCritico?.gasto || 0)}</p></div>
            <div className="w-[1px] bg-white/10"></div>
            <div className="text-center"><p className="text-[10px] text-slate-400 uppercase font-bold">Tiempo</p><p className="text-xl font-bold text-amber-400">{num(heroStats.topCritico?.tiempo || 0)}'</p></div>
         </div>
      </div>

      {/* 2. GRÁFICO DE TENDENCIA (Componente Externo) */}
      <TrendChart 
        timelineStats={timelineStats} 
        semanaFiltro={semanaFiltro} 
        setSemanaFiltro={setSemanaFiltro} 
        filtroDrill={filtroDrill} 
        setFiltroDrill={setFiltroDrill} 
      />

      {/* 3. KPIs TILES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiTile title="Fallas Totales" value={analytics.totalEventos} currentValue={analytics.totalEventos} previousValue={analytics.totalEventosPrev} icon={Activity} color="blue" />
        <KpiTile title="Gasto Acumulado" value={clp(analytics.totalGasto)} currentValue={analytics.totalGasto} previousValue={analytics.totalGastoPrev} formatter={clp} icon={DollarSign} color="red" />
        <KpiTile title="Tiempo Perdido" value={`${num(analytics.totalTiempo)}'`} subValue={`${(analytics.totalTiempo/60).toFixed(1)} hrs`} currentValue={analytics.totalTiempo} previousValue={analytics.totalTiempoPrev} formatter={(v) => `${num(v)} min`} icon={Clock} color="amber" />
        <KpiTile title="MTTR Global" value={`${(analytics.totalTiempo / (analytics.totalEventos || 1)).toFixed(0)}'`} subValue="Promedio Rep." currentValue={analytics.mttrGlobal} previousValue={analytics.mttrGlobalPrev} formatter={(v) => `${v.toFixed(0)}'`} icon={Zap} color="purple" />
      </div>

      {/* 4. GRID DE GRÁFICOS */}
      <div className="flex justify-end mb-[-10px] relative z-20">
          <button 
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showComparison ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
          >
             <History size={14} className={showComparison ? "text-pf-red" : ""} />
             Comparar vs {anioFiltro - 1}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* A. TOP FRECUENCIA */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="flex pt-6 pl-6 pr-6 justify-center items-center mb-2">
                <HeaderSection icon={Activity} title="Equipos con más Fallas" color="text-blue-600" bg="bg-blue-50"/>
            </div>
            <div className="flex-1 mt-4 space-y-2 overflow-y-auto custom-scrollbar p-2">
                {analytics.porFrecuencia.map((item: any, idx: number) => (
                    <ComparativeRow 
                        key={idx} 
                        item={item}
                        maxValGlobal={analytics.porFrecuencia[0].count}
                        formatFn={(v: number) => `${v} fallas`}
                        type="FREQ"
                        active={filtroDrill?.valor === item.label}
                        onClick={() => handleBarClick('EQUIPO', item.label)}
                    />
                ))}
            </div>
        </div>

        {/* B. TOP COSTOS */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="flex pt-6 pl-6 pr-6 justify-center items-center mb-2">
                <HeaderSection icon={DollarSign} title="Equipos más Costosos" color="text-pf-red" bg="bg-red-50"/>
            </div>
            <div className="flex-1 mt-4 space-y-2 overflow-y-auto custom-scrollbar p-2">
                {analytics.porCosto.map((item: any, idx: number) => (
                     <ComparativeRow 
                        key={idx} 
                        item={item}
                        maxValGlobal={analytics.porCosto[0].gasto}
                        formatFn={(v: number) => clp(v)}
                        type="COST"
                        active={filtroDrill?.valor === item.label}
                        onClick={() => handleBarClick('EQUIPO', item.label)}
                    />
                ))}
            </div>
        </div>

        {/* C. TOP MTTR */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="flex pt-6 pl-6 pr-6 justify-center items-center mb-2">
                <HeaderSection icon={Zap} title="Mayor MTTR" color="text-purple-600" bg="bg-purple-50"/>
            </div>
            <div className="flex-1 mt-4 space-y-2 overflow-y-auto custom-scrollbar p-2">
                {analytics.porMTTR.map((item: any, idx: number) => (
                     <ComparativeRow 
                        key={idx} 
                        item={item}
                        maxValGlobal={analytics.porMTTR[0].mttr}
                        formatFn={(v: number) => `${v.toFixed(0)} min`}
                        type="MTTR"
                        active={filtroDrill?.valor === item.label}
                        onClick={() => handleBarClick('EQUIPO', item.label)}
                    />
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};