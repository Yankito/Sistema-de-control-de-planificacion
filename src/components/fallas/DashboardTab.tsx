import { useState } from "react";
import { Activity, DollarSign, Clock, Zap, BarChart3, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { KpiTile, HeaderSection, InteractiveBar } from "./FallasUI";
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
}

export const DashboardTab = ({ 
    analytics, timelineStats, semanaFiltro, setSemanaFiltro,
    filtroDrill, setFiltroDrill, rangoTexto, topN 
}: Props) => {
  
  const { heroStats } = analytics;
  const [isChartExpanded, setIsChartExpanded] = useState(true);

  const handleBarClick = (tipo: 'EQUIPO' | 'CAUSA', valor: string) => {
    if (filtroDrill && filtroDrill.tipo === tipo && filtroDrill.valor === valor) {
      setFiltroDrill(null); 
    } else {
      setFiltroDrill({ tipo, valor });
    }
  };

  const handleTimelineClick = (semana: number) => {
      const semStr = String(semana);
      if (semanaFiltro === semStr) {
          setSemanaFiltro("TODAS");
      } else {
          setSemanaFiltro(semStr);
      }
  };

  const tituloGrafico = filtroDrill 
    ? `Tendencia: ${filtroDrill.valor}` 
    : "Tendencia Anual Global";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. HERO CARD (Resumen) */}
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

      {/* 2. GRÁFICO DE TENDENCIA */}
      {timelineStats && timelineStats.chartData.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
            
            {/* Header del Gráfico */}
            <div 
                className="p-5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsChartExpanded(!isChartExpanded)}
            >
                 <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shadow-sm transition-colors ${filtroDrill ? 'bg-blue-600 text-white' : (semanaFiltro !== "TODAS" ? 'bg-pf-red text-white' : 'bg-white border border-slate-200 text-slate-700')}`}>
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                            {tituloGrafico}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            {isChartExpanded ? "Evolución semanal de fallas." : "Click para desplegar gráfico."}
                        </p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                     {semanaFiltro !== "TODAS" && (
                         <span onClick={(e) => {e.stopPropagation(); setSemanaFiltro("TODAS")}} className="px-3 py-1 bg-pf-red text-white rounded-full text-xs font-bold shadow-sm cursor-pointer hover:bg-red-700 flex items-center gap-1">
                            Semana {semanaFiltro} <XCircle size={12}/>
                         </span>
                     )}
                     {filtroDrill && (
                         <span onClick={(e) => {e.stopPropagation(); setFiltroDrill(null)}} className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold shadow-sm cursor-pointer hover:bg-blue-700 flex items-center gap-1">
                            Filtro Activo <XCircle size={12}/>
                         </span>
                     )}
                     <button className="text-slate-400 hover:text-slate-600 p-1">
                         {isChartExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                     </button>
                 </div>
            </div>

            {/* Cuerpo del Gráfico */}
            <div className={`transition-all duration-500 ease-in-out bg-white ${isChartExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4">
                    <div className="flex">
                        
                        {/* EJE Y (Escala Izquierda) */}
                        <div className="relative h-48 border-r border-slate-100 pr-3 min-w-[55px] select-none">
                            <span className="absolute top-0 right-1 text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                N° Fallas
                            </span>
                            <div className="flex flex-col justify-between items-end h-full pt-6 pb-0 text-[10px] text-slate-400 font-mono">
                                <span className="-translate-y-1/2">{timelineStats.maxVal}</span>
                                <span className="-translate-y-1/2">{Math.round(timelineStats.maxVal / 2)}</span>
                                <span className="translate-y-0">0</span>
                            </div>
                        </div>

                        {/* ÁREA DE BARRAS (Scrollable) */}
                        {/* IMPORTANTE: pb-12 para dar espacio a las etiquetas absolutas de abajo */}
                        <div className="flex-1 custom-scrollbar pb-12"> 
                            
                            {/* Contenedor Flex de Barras */}
                            {/* border-b border-slate-200 crea la línea base del gráfico */}
                            <div className="h-48 flex items-end gap-2 w-full min-w-[600px] px-2 relative pt-6 border-b border-slate-200">
                                
                                {/* Grid de fondo */}
                                <div className="absolute inset-0 w-full h-full flex flex-col justify-between pointer-events-none px-2 opacity-50">
                                    <div className="w-full h-[1px] bg-slate-100 border-t border-dashed border-slate-200"></div>
                                    <div className="w-full h-[1px] bg-slate-100 border-t border-dashed border-slate-200"></div>
                                    <div className="w-full h-[1px] bg-slate-100 border-t border-dashed border-slate-200"></div>
                                    {/* El último espacio queda vacío para la base */}
                                </div>

                                {timelineStats.chartData.map((item: any) => {
                                    const heightPercent = timelineStats.maxVal === 0 ? 0 : (item.count / timelineStats.maxVal) * 100;
                                    const isZero = item.count === 0;
                                    const isSelected = String(item.semana) === String(semanaFiltro);
                                    const isDimmed = semanaFiltro !== "TODAS" && !isSelected;

                                    return (
                                        <div 
                                            key={item.semana} 
                                            onClick={() => !isZero && handleTimelineClick(item.semana)}
                                            className={`
                                                relative flex-1 flex flex-col justify-end group h-full z-10 min-w-[24px]
                                                ${isZero ? 'cursor-default' : 'cursor-pointer hover:scale-105 transition-transform'}
                                                ${isDimmed ? 'opacity-30 grayscale' : 'opacity-100'}
                                            `}
                                        >
                                            {/* 1. ETIQUETA VALOR (Encima de la barra) */}
                                            {/* mb-1 separa el numero de la barra */}
                                            {!isZero && (
                                                <div className={`
                                                    w-full text-center mb-1 text-xs font-black transition-all
                                                    ${isSelected ? 'text-pf-red scale-110' : 'text-slate-600 group-hover:text-black'}
                                                `}>
                                                    {item.count}
                                                </div>
                                            )}

                                            {/* 2. BARRA */}
                                            <div 
                                                style={{ height: isZero ? '4px' : `${heightPercent}%` }}
                                                className={`
                                                    w-full rounded-t-sm transition-all duration-300
                                                    ${isZero 
                                                        ? 'bg-slate-100' 
                                                        : isSelected 
                                                            ? 'bg-pf-red shadow-lg shadow-pf-red/30' 
                                                            : 'bg-indigo-500 group-hover:bg-indigo-600 shadow-sm'
                                                    }
                                                `}
                                            />

                                            {/* 3. ETIQUETA EJE X (SEMANA + FECHA) - FLOTANTE */}
                                            {/* absolute top-full saca el texto del flujo para no empujar la barra */}
                                            <div className="absolute top-full left-0 w-full flex flex-col items-center mt-2">
                                                <span className={`
                                                    text-[12px] font-bold font-mono transition-colors h-4 flex items-center justify-center
                                                    ${isSelected ? 'text-pf-red' : 'text-slate-500'}
                                                `}>
                                                    {(timelineStats.chartData.length < 25 || item.semana % 2 === 0 || isSelected) 
                                                        ? `S${item.semana}` 
                                                        : <div className="w-1 h-1 rounded-full bg-slate-300"></div>}
                                                </span>

                                                {/* Tooltip de Fecha (Solo visible si seleccionado o hover) */}
                                                { item.rango && (
                                                    <span className="mt-1 text-[9px] font-medium whitespace-nowrap   px-2 py-1 rounded shadow-lg z-50">
                                                        {item.rango}
                                                        {/* Flechita decorativa */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-8 text-center flex flex-col items-center gap-2">
            <BarChart3 className="text-slate-300" size={32}/>
            <p className="text-slate-500 font-medium">No hay datos de tendencia para mostrar con los filtros actuales.</p>
        </div>
      )}

      {/* 3. KPIs TILES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiTile title="Fallas Totales" value={analytics.totalEventos} icon={Activity} color="blue" />
        <KpiTile title="Gasto Acumulado" value={clp(analytics.totalGasto)} icon={DollarSign} color="red" />
        <KpiTile title="Tiempo Perdido" value={`${num(analytics.totalTiempo)}'`} subValue={`${(analytics.totalTiempo/60).toFixed(1)} hrs`} icon={Clock} color="amber" />
        <KpiTile title="MTTR Global" value={`${(analytics.totalTiempo / (analytics.totalEventos || 1)).toFixed(0)}'`} subValue="Promedio Rep." icon={Zap} color="purple" />
      </div>

      {/* 4. GRID DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        
        {/* A. TOP FRECUENCIA */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="flex pt-6 pl-6 pr-6 justify-center items-center mb-2">
                <HeaderSection icon={Activity} title="Equipos con más Fallas" color="text-blue-600" bg="bg-blue-50"/>
            </div>
            <div className="flex-1 mt-4 space-y-3 overflow-y-auto custom-scrollbar">
                {analytics.porFrecuencia.map((item: any, idx: number) => (
                    <InteractiveBar key={idx} label={item.label} value={`${item.count} fallas`} percent={(item.count / analytics.porFrecuencia[0].count) * 100} color="bg-gradient-to-r from-blue-600 to-blue-400" active={filtroDrill?.valor === item.label} onClick={() => handleBarClick('EQUIPO', item.label)} />
                ))}
            </div>
        </div>

        {/* B. TOP COSTOS */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="flex pt-6 pl-6 pr-6 justify-center items-center mb-2">
                <HeaderSection icon={DollarSign} title="Equipos más Costosos" color="text-pf-red" bg="bg-red-50"/>
            </div>
            <div className="flex-1 mt-4 space-y-3 overflow-y-auto custom-scrollbar">
                {analytics.porCosto.map((item: any, idx: number) => (
                    <InteractiveBar key={idx} label={item.label} value={clp(item.gasto)} percent={(item.gasto / analytics.porCosto[0].gasto) * 100} color="bg-gradient-to-r from-pf-red to-red-400" active={filtroDrill?.valor === item.label} onClick={() => handleBarClick('EQUIPO', item.label)} />
                ))}
            </div>
        </div>

        {/* C. TOP MTTR */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="flex pt-6 pl-6 pr-6 justify-center items-center mb-2">
                <HeaderSection icon={Zap} title="Mayor MTTR" color="text-purple-600" bg="bg-purple-50"/>
            </div>
            <div className="flex-1 mt-4 space-y-3 overflow-y-auto custom-scrollbar">
                {analytics.porMTTR.map((item: any, idx: number) => (
                    <InteractiveBar key={idx} label={item.label} value={`${item.mttr.toFixed(0)} min/falla`} percent={(item.mttr / analytics.porMTTR[0].mttr) * 100} color="bg-gradient-to-r from-purple-600 to-purple-400" active={filtroDrill?.valor === item.label} onClick={() => handleBarClick('EQUIPO', item.label)} />
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};