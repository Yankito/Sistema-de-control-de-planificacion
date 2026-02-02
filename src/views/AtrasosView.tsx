import { useState, useMemo } from "react";
import { AtrasoRow } from "../logic/atrasosProcessor";
import { 
  Users, 
  Package, 
  CalendarClock, 
  FileWarning, 
  Search, 
  X,
  Filter,
  Download
} from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  data: AtrasoRow[];
  dataAnterior?: AtrasoRow[]; // Para comparar si bajó o subió
}

export const AtrasosView = ({ data }: Props) => {
  const [filtroPlanta, setFiltroPlanta] = useState("TODAS");
  const [busqueda, setBusqueda] = useState("");
  const [drillDown, setDrillDown] = useState<{ tipo: string, valor: string } | null>(null);

  // --- 1. ESTADÍSTICAS GLOBALES ---
  const stats = useMemo(() => {
    const filtrada = filtroPlanta === "TODAS" ? data : data.filter(d => d.planta === filtroPlanta);
    
    return {
      total: filtrada.length,
      tecnico: filtrada.filter(d => d.clasificacion === "TECNICO / SERVICIO").length,
      materiales: filtrada.filter(d => d.clasificacion === "MATERIALES" || d.clasificacion === "OC / OTRO").length,
      programador: filtrada.filter(d => d.clasificacion === "PROGRAMADOR").length,
      prev: filtrada.filter(d => d.esOB).length,
      corr: filtrada.filter(d => !d.esOB).length
    };
  }, [data, filtroPlanta]);

  // --- 2. DATA PARA LA MATRIZ (Heatmap) ---
  const matrizData = useMemo(() => {
    const plantas = ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"];
    return plantas.map(p => {
      const dePlanta = data.filter(d => d.planta === p);
      return {
        planta: p,
        tecnico: dePlanta.filter(d => d.clasificacion === "TECNICO / SERVICIO").length,
        materiales: dePlanta.filter(d => d.clasificacion === "MATERIALES" || d.clasificacion === "OC / OTRO").length,
        programador: dePlanta.filter(d => d.clasificacion === "PROGRAMADOR").length,
        total: dePlanta.length
      };
    }).sort((a,b) => b.total - a.total); // Ordenar por quien tiene más problemas
  }, [data]);

  // --- 3. DATA FILTRADA (LISTA) ---
  const listaDetalle = useMemo(() => {
    let base = data;
    if (filtroPlanta !== "TODAS") base = base.filter(d => d.planta === filtroPlanta);
    
    if (drillDown) {
       if (drillDown.tipo === 'PLANTA') base = base.filter(d => d.planta === drillDown.valor);
       if (drillDown.tipo === 'RESP') base = base.filter(d => d.clasificacion === drillDown.valor);
    }

    if (busqueda) {
        const lower = busqueda.toLowerCase();
        base = base.filter(d => d.ot.toLowerCase().includes(lower) || d.descripcion.toLowerCase().includes(lower));
    }

    return base;
  }, [data, filtroPlanta, drillDown, busqueda]);

  const exportarExcel = () => {
     const ws = XLSX.utils.json_to_sheet(listaDetalle.map(row => ({
         OT: row.ot,
         Planta: row.planta,
         Descripcion: row.descripcion,
         Responsable: row.clasificacion,
         Tipo: row.esOB ? 'Preventiva (OB)' : 'Correctiva',
         Tecnicos_Pendientes: row.detallesTecnicos?.filter(t => !t.finalizada).map(t => t.tecnico).join(", ")
     })));
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Detalle Atrasos");
     XLSX.writeFile(wb, "Reporte_Atrasos.xlsx");
  };

  // --- COMPONENTES UI ---
  const KpiCard = ({ title, count, total, icon: Icon, color, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all group relative overflow-hidden`}
    >
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 text-${color}`}>
            <Icon size={64} />
        </div>
        <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg bg-${color}/10 text-${color}`}>
                <Icon size={20} />
            </div>
            <span className="text-xs font-bold uppercase text-slate-400">{title}</span>
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{count}</span>
            <span className="text-xs font-medium text-slate-400">
                {Math.round((count/total)*100)}%
            </span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className={`h-full bg-${color}`} style={{ width: `${(count/total)*100}%` }}></div>
        </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestión de Backlog</h2>
            <p className="text-slate-400 text-sm font-medium">Análisis de órdenes pendientes de cierre</p>
        </div>
        <div className="flex gap-2">
            <select 
                value={filtroPlanta} 
                onChange={(e) => setFiltroPlanta(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-pf-red/20"
            >
                <option value="TODAS">Todas las Plantas</option>
                {matrizData.map(m => <option key={m.planta} value={m.planta}>{m.planta}</option>)}
            </select>
            <button onClick={exportarExcel} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition-colors">
                <Download size={16} /> Excel
            </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
            title="Pendiente Mantenimiento" 
            count={stats.tecnico} 
            total={stats.total} 
            icon={Users} 
            color="pf-red" 
            onClick={() => setDrillDown({ tipo: 'RESP', valor: 'TECNICO / SERVICIO' })}
        />
        <KpiCard 
            title="Logística / Materiales" 
            count={stats.materiales} 
            total={stats.total} 
            icon={Package} 
            color="amber-500" 
            onClick={() => setDrillDown({ tipo: 'RESP', valor: 'MATERIALES' })} // Ajustado para hacer match con filtro
        />
        <KpiCard 
            title="Programación / Cierre" 
            count={stats.programador} 
            total={stats.total} 
            icon={CalendarClock} 
            color="blue-600" 
            onClick={() => setDrillDown({ tipo: 'RESP', valor: 'PROGRAMADOR' })}
        />
        <div className="bg-slate-900 rounded-2xl p-4 text-white flex flex-col justify-between shadow-lg">
            <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Total Backlog</span>
                <p className="text-4xl font-black mt-1">{stats.total}</p>
            </div>
            <div className="flex gap-2 mt-4">
                <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">OB: {stats.prev}</span>
                <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold">OM: {stats.corr}</span>
            </div>
        </div>
      </div>

      {/* MATRIX & LIST */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* COLUMNA 1: MATRIZ DE CALOR */}
        <div className="xl:col-span-1 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm h-fit">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-black text-slate-700 flex items-center gap-2">
                    <Filter size={16} /> Distribución por Planta
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
                        <tr>
                            <th className="px-4 py-3">Planta</th>
                            <th className="px-2 py-3 text-center text-pf-red">Mant.</th>
                            <th className="px-2 py-3 text-center text-amber-600">Log.</th>
                            <th className="px-2 py-3 text-center text-blue-600">Prog.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {matrizData.map((row) => (
                            <tr 
                                key={row.planta} 
                                onClick={() => setDrillDown({ tipo: 'PLANTA', valor: row.planta })}
                                className="hover:bg-slate-50 cursor-pointer transition-colors group"
                            >
                                <td className="px-4 py-3 font-bold text-slate-700">{row.planta}</td>
                                <td className={`px-2 py-3 text-center font-bold ${row.tecnico > 0 ? 'bg-red-50 text-pf-red' : 'text-slate-300'}`}>
                                    {row.tecnico}
                                </td>
                                <td className={`px-2 py-3 text-center font-medium ${row.materiales > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                                    {row.materiales}
                                </td>
                                <td className={`px-2 py-3 text-center font-medium ${row.programador > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                                    {row.programador}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* COLUMNA 2 y 3: DETALLE FILTRABLE */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[600px]">
             {/* Toolbar Lista */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                        type="text" 
                        placeholder="Buscar por OT o Descripción..." 
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border-none bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-pf-red/20 text-sm"
                    />
                </div>
                {drillDown && (
                    <button 
                        onClick={() => setDrillDown(null)}
                        className="flex items-center gap-1 px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                    >
                        {drillDown.valor} <X size={14} />
                    </button>
                )}
            </div>

            {/* Lista Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {listaDetalle.length > 0 ? (
                    <div className="space-y-2">
                        {listaDetalle.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 hover:border-pf-red/30 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.esOB ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {item.esOB ? 'OB' : 'OM'}
                                        </span>
                                        <span className="font-mono font-bold text-slate-700">{item.ot}</span>
                                        <span className="text-[10px] font-bold text-slate-400 px-2 border-l border-slate-200">{item.planta}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                                        item.clasificacion === 'TECNICO / SERVICIO' ? 'bg-pf-red text-white' :
                                        item.clasificacion === 'MATERIALES' ? 'bg-amber-100 text-amber-700' :
                                        'bg-blue-50 text-blue-700'
                                    }`}>
                                        {item.clasificacion}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 font-medium line-clamp-1 group-hover:line-clamp-none transition-all">
                                    {item.descripcion}
                                </p>
                                
                                {/* Si es culpa de técnico, mostramos quiénes faltan */}
                                {item.clasificacion === 'TECNICO / SERVICIO' && item.detallesTecnicos && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {item.detallesTecnicos.filter(t => !t.finalizada).map((t, i) => (
                                            <span key={i} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-pf-red rounded-md text-[10px] font-bold border border-red-100">
                                                <FileWarning size={10} /> {t.tecnico}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <Package size={48} className="mb-4 opacity-50"/>
                        <p className="font-bold text-sm">No se encontraron registros</p>
                    </div>
                )}
            </div>
            
            {/* Footer Lista */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-400 font-bold">Mostrando {listaDetalle.length} registros</p>
            </div>
        </div>
      </div>
    </div>
  );
};