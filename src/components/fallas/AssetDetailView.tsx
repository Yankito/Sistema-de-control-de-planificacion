import { useState, useMemo } from "react";
import { ArrowLeft, Table as TableIcon, DollarSign, Clock, Activity, BarChart3, Calendar, Filter, XCircle } from "lucide-react";
import { KpiTile } from "./FallasUI"; 
import { FallaRow } from "../../types";
import { clp, num, fechaFmt, getRangoSemana } from "../../utils/dateUtils";

interface Props {
  assetName: string;
  data: FallaRow[];
  onBack: () => void;
}

export const AssetDetailView = ({ assetName, data, onBack }: Props) => {
  // Estado para el filtro interactivo del gráfico
  const [semSelected, setSemSelected] = useState<number | null>(null);

  // 1. Filtrar datos del activo (Historial Completo - Base para el gráfico)
  const assetData = useMemo(() => {
    return data
      .filter(d => d.equipo === assetName)
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }, [data, assetName]);

  // 2. Datos Filtrados (Base para la Tabla y ahora para los KPIs)
  const tableData = useMemo(() => {
    if (semSelected === null) return assetData;
    return assetData.filter(d => d.semana === semSelected);
  }, [assetData, semSelected]);

  // 3. Stats Dinámicos (AHORA DEPENDEN DE tableData)
  // Si seleccionas una semana, esto mostrará solo los costos de esa semana.
  const stats = useMemo(() => {
    // Usamos tableData en lugar de assetData
    const totalGasto = tableData.reduce((a, b) => a + b.gasto, 0);
    const totalTiempo = tableData.reduce((a, b) => a + b.duracionMinutos, 0);
    const count = tableData.length;
    return { totalGasto, totalTiempo, count };
  }, [tableData]); // <--- Dependencia cambiada

  // 4. Lógica del Gráfico de Evolución (Siempre usa assetData para mostrar todo el panorama)
  const timelineData = useMemo(() => {
    if (assetData.length === 0) return { chartData: [], maxVal: 0 };

    const groups = assetData.reduce((acc, curr) => {
      acc[curr.semana] = (acc[curr.semana] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const weeks = assetData.map(d => d.semana);
    const minW = Math.min(...weeks);
    const maxW = Math.max(...weeks);
    
    const chartData = [];
    let maxVal = 0;

    for (let i = minW; i <= maxW; i++) {
      const count = groups[i] || 0;
      if (count > maxVal) maxVal = count;
      chartData.push({ 
        semana: i, 
        count,
        rango: getRangoSemana(i, assetData[0]?.anio || new Date().getFullYear()) 
      });
    }

    return { chartData, maxVal };
  }, [assetData]);

  return (
    <div className="animate-in slide-in-from-right-8 duration-300 h-full flex flex-col">
      {/* HEADER NAVEGACIÓN */}
      <div className="flex justify-between items-start mb-6">
        <div>
            <button onClick={onBack} className="mb-2 text-sm font-bold text-slate-500 hover:text-pf-red flex items-center gap-2 transition-colors">
                <ArrowLeft size={16}/> Volver al Tablero
            </button>
            <div className="flex items-center gap-4">
                <h2 className="text-3xl font-black text-slate-800">{assetName}</h2>
                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                    Historial Completo
                </span>
            </div>
        </div>
      </div>

      {/* KPI TILES (AHORA DINÁMICOS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Cambiamos el título ligeramente si hay filtro para dar contexto */}
        <KpiTile 
            title={semSelected ? `Costo Semana ${semSelected}` : "Costo Acumulado"} 
            value={clp(stats.totalGasto)} 
            icon={DollarSign} 
            color="red"
        />
        <KpiTile 
            title={semSelected ? `Tiempo Semana ${semSelected}` : "Tiempo Fuera Total"} 
            value={`${num(stats.totalTiempo)}'`} 
            icon={Clock} 
            color="amber"
        />
        <KpiTile 
            title={semSelected ? "Intervenciones (Sem)" : "Total Intervenciones"} 
            value={stats.count} 
            icon={Activity} 
            color="blue"
        />
      </div>

      {/* GRÁFICO DE EVOLUCIÓN INTERACTIVO */}
      {timelineData && timelineData.chartData.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg transition-colors ${semSelected ? 'bg-pf-red text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                        <BarChart3 size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Evolución de Frecuencia</h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                            {semSelected 
                                ? "Has seleccionado una semana. Click de nuevo para ver todo." 
                                : "Click en una barra para filtrar tabla y KPIs."}
                        </p>
                    </div>
                </div>
                {semSelected && (
                    <button 
                        onClick={() => setSemSelected(null)}
                        className="text-xs font-bold text-pf-red flex items-center gap-1 hover:bg-red-50 px-3 py-1 rounded-full transition-colors"
                    >
                        <XCircle size={14}/> Borrar Filtro
                    </button>
                )}
            </div>

            {/* Contenedor del Gráfico */}
            <div className="h-32 flex items-end gap-1 sm:gap-2 w-full px-2">
                {timelineData.chartData.map((item) => {
                    const heightPercent = timelineData.maxVal === 0 ? 0 : (item.count / timelineData.maxVal) * 100;
                    const isZero = item.count === 0;
                    
                    const isSelected = semSelected === item.semana;
                    const isDimmed = semSelected !== null && !isSelected;

                    return (
                        <div 
                            key={item.semana} 
                            onClick={() => {
                                if (isZero) return;
                                setSemSelected(prev => prev === item.semana ? null : item.semana);
                            }}
                            className={`
                                flex-1 flex flex-col items-center justify-end group relative h-full transition-all duration-300
                                ${isZero ? 'cursor-default' : 'cursor-pointer'}
                                ${isDimmed ? 'opacity-30 grayscale hover:opacity-100 hover:grayscale-0' : 'opacity-100'}
                            `}
                        >
                            {/* TOOLTIP */}
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-xl transition-all whitespace-nowrap z-20 pointer-events-none">
                                <div className="font-bold">Semana {item.semana}</div>
                                <div className="text-slate-300 mb-1">{item.rango}</div>
                                <div className="font-mono text-pf-red font-bold text-xs">
                                    {item.count} fallas
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                            </div>

                            {/* BARRA VISUAL */}
                            <div 
                                style={{ height: `${isZero ? 2 : heightPercent}%` }}
                                className={`
                                    w-full max-w-[30px] rounded-t-sm transition-all duration-500 ease-out relative
                                    ${isZero 
                                        ? 'bg-slate-100' 
                                        : isSelected 
                                            ? 'bg-pf-red shadow-lg shadow-pf-red/30 ring-2 ring-offset-2 ring-pf-red scale-105' 
                                            : 'bg-indigo-500 hover:bg-pf-red/70'
                                    }
                                `}
                            >
                                {!isZero && (isSelected || heightPercent > 20) && (
                                    <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white/90">
                                        {item.count}
                                    </span>
                                )}
                            </div>

                            {/* EJE X */}
                            <div className={`text-[9px] mt-2 font-mono h-4 transition-colors ${isSelected ? 'text-pf-red font-bold' : 'text-slate-400'}`}>
                                {timelineData.chartData.length < 15 || item.semana % 2 === 0 || isSelected ? `S${item.semana}` : ''}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* TABLA DE DETALLE (FILTRADA) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
         <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-sm flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
                <TableIcon size={16} className="text-slate-400"/> 
                <span>Registro Detallado</span>
                {semSelected && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-pf-red/10 text-pf-red rounded text-[10px] font-bold animate-in fade-in">
                        <Filter size={10}/> Semana {semSelected}
                    </span>
                )}
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">
                {tableData.length} registros
            </span>
         </div>
         
         <div className="overflow-auto flex-1 custom-scrollbar">
            {tableData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10">
                    <Activity size={40} className="mb-2 opacity-20"/>
                    <p className="text-sm">No hay registros en la semana seleccionada.</p>
                </div>
            ) : (
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-xs text-slate-400 uppercase font-bold border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 bg-white backdrop-blur-sm bg-white/90">Fecha</th>
                            <th className="px-6 py-3 bg-white backdrop-blur-sm bg-white/90">Semana</th>
                            <th className="px-6 py-3 bg-white backdrop-blur-sm bg-white/90">Causa Raíz</th>
                            <th className="px-6 py-3 bg-white backdrop-blur-sm bg-white/90">Descripción Operador</th> 
                            <th className="px-6 py-3 bg-white backdrop-blur-sm bg-white/90 text-right">Tiempo</th>
                            <th className="px-6 py-3 bg-white backdrop-blur-sm bg-white/90 text-right">Costo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {tableData.map((f, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors group animate-in slide-in-from-bottom-1 duration-300">
                                <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-600 flex items-center gap-2">
                                    <Calendar size={12} className="text-slate-300 group-hover:text-pf-red transition-colors"/>
                                    {fechaFmt(f.fecha)}
                                </td>
                                <td className="px-6 py-3 text-slate-400 text-xs whitespace-nowrap">
                                    <span className={`font-bold ${semSelected === f.semana ? 'text-pf-red' : 'text-slate-600'}`}>S{f.semana}</span>
                                </td>
                                <td className="px-6 py-3 max-w-[200px] truncate text-slate-700 font-medium" title={f.causa}>
                                    {f.causa}
                                </td>
                                <td className="px-6 py-3 max-w-[250px] text-slate-500 italic text-xs leading-tight" title={f.descripcionOperador}>
                                    {f.descripcionOperador || "-"}
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-amber-600 font-bold">
                                    {num(f.duracionMinutos)}'
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-pf-red font-bold">
                                    {clp(f.gasto)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
         </div>
      </div>
    </div>
  );
};