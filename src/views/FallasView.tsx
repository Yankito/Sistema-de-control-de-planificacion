import { useState, useMemo } from "react";
import { FallaRow } from "../types";
import { Filter, LayoutDashboard, Table as TableIcon, PieChart, XCircle, ArrowRight } from "lucide-react";
import { getRangoSemana } from "../utils/dateUtils";

// Imports componentes
import { SelectPill } from "../components/fallas/FallasUI";
import { AssetDetailView } from "../components/fallas/AssetDetailView";
import { DashboardTab } from "../components/fallas/DashboardTab";
import { CausasTab } from "../components/fallas/CausasTab";
import { TablaTab } from "../components/fallas/TablaTab";
import { ExportButton } from "../components/fallas/ExportButton";

interface Props {
  data: FallaRow[];
}

export const FallasView = ({ data }: Props) => {
  // --- 1. CONFIGURACIÓN ---
  const { semanasDisponibles, aniosDisponibles, plantasDisponibles, anioDefault } = useMemo(() => {
    if (data.length === 0) return { semanasDisponibles: [], aniosDisponibles: [], plantasDisponibles: [], anioDefault: new Date().getFullYear() };
    
    // Listas para selects
    const semanas = Array.from(new Set(data.map(d => d.semana))).sort((a, b) => b - a);
    const anios = Array.from(new Set(data.map(d => d.anio))).sort((a, b) => b - a);
    const plantas = Array.from(new Set(data.map(d => d.planta))).sort();
    
    return { semanasDisponibles: semanas, aniosDisponibles: anios, plantasDisponibles: plantas, anioDefault: anios[0] };
  }, [data]);

  // --- 2. ESTADOS ---
  const [anioFiltro, setAnioFiltro] = useState<number>(anioDefault);
  const [plantaFiltro, setPlantaFiltro] = useState<string>("TODAS");
  const [semanaFiltro, setSemanaFiltro] = useState<string>("TODAS");
  const [activeTab, setActiveTab] = useState<'DASH' | 'CAUSAS' | 'TABLA'>('DASH');
  const [topN, setTopN] = useState<number>(5);
  
  // Navegación
  const [activoSeleccionado, setActivoSeleccionado] = useState<string | null>(null);
  const [filtroDrill, setFiltroDrill] = useState<{tipo: 'EQUIPO' | 'CAUSA', valor: string} | null>(null);

  // --- 3. DATOS PARA LA LÍNEA DE TIEMPO (Ignora filtro de semana) ---
  // Calculamos esto APARTE para que el gráfico siempre muestre todo el año/planta
  const timelineStats = useMemo(() => {
    // 1. Filtramos por Año, Planta Y AHORA TAMBIÉN POR DRILL (Equipo/Causa)
    const datosContexto = data.filter(d => {
        const matchAnio = d.anio === anioFiltro;
        const matchPlanta = plantaFiltro === "TODAS" ? true : d.planta === plantaFiltro;
        
        // Lógica agregada: Si hay un equipo seleccionado, el gráfico solo muestra ese equipo
        let matchDrill = true;
        if (filtroDrill) {
            if (filtroDrill.tipo === 'EQUIPO') matchDrill = d.equipo === filtroDrill.valor;
            if (filtroDrill.tipo === 'CAUSA') matchDrill = (d.causa || "").trim().toUpperCase() === filtroDrill.valor;
        }

        return matchAnio && matchPlanta && matchDrill;
    });

    if (datosContexto.length === 0) return { chartData: [], maxVal: 0 };

    // 2. Agrupar por semana (Igual que antes)
    const groups = datosContexto.reduce((acc, curr) => {
        acc[curr.semana] = (acc[curr.semana] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    // 3. Rellenar huecos (Usamos el rango del año seleccionado para mantener la escala)
    // Nota: Si quieres que el gráfico solo muestre desde que el equipo falló, usa 'datosContexto'. 
    // Si quieres ver todo el año aunque esté vacío, usa lógica de 1 a 52 o el rango de datos globales.
    // Aquí usaremos los datos filtrados para que se "haga zoom" en la actividad del equipo.
    const weeks = datosContexto.map(d => d.semana);
    const minW = Math.min(...weeks);
    const maxW = Math.max(...weeks);
    
    const chartData = [];
    let maxVal = 0;

    // Si hay drill, rellenamos huecos entre el min y max de ese equipo, 
    // o puedes forzar (1 a 52) si prefieres ver el año completo vacío.
    // Aquí uso minW a maxW del contexto actual.
    for (let i = minW; i <= maxW; i++) {
        const count = groups[i] || 0;
        if (count > maxVal) maxVal = count;
        chartData.push({ 
            semana: i, 
            count,
            rango: getRangoSemana(i, anioFiltro) 
        });
    }
    return { chartData, maxVal };
  }, [data, anioFiltro, plantaFiltro, filtroDrill]);
  
  // --- 4. FILTRO MAESTRO (Aplica TODO, incluyendo semana) ---
  const datosFiltrados = useMemo(() => {
    return data.filter(d => {
      const matchAnio = d.anio === anioFiltro;
      const matchPlanta = plantaFiltro === "TODAS" ? true : d.planta === plantaFiltro;
      const matchSemana = semanaFiltro === "TODAS" ? true : d.semana === Number(semanaFiltro);
      let matchDrill = true;
      if (filtroDrill) {
        if (filtroDrill.tipo === 'EQUIPO') matchDrill = d.equipo === filtroDrill.valor;
        if (filtroDrill.tipo === 'CAUSA') matchDrill = (d.causa || "").trim().toUpperCase() === filtroDrill.valor;
      }

      return matchAnio && matchPlanta && matchSemana && matchDrill;
    });
  }, [data, anioFiltro, plantaFiltro, semanaFiltro, filtroDrill]);

  // --- 5. ANALYTICS (Se calcula SOBRE lo filtrado totalmente) ---
  const analytics = useMemo(() => {
    const totalGasto = datosFiltrados.reduce((a, b) => a + b.gasto, 0);
    const totalTiempo = datosFiltrados.reduce((a, b) => a + b.duracionMinutos, 0);
    const totalEventos = datosFiltrados.length;

    const groupBy = (keyFn: (d: FallaRow) => string) => {
        const map = datosFiltrados.reduce((acc, curr) => {
            const key = keyFn(curr);
            if (!acc[key]) acc[key] = { label: key, gasto: 0, tiempo: 0, count: 0 };
            acc[key].gasto += curr.gasto;
            acc[key].tiempo += curr.duracionMinutos;
            acc[key].count += 1;
            return acc;
        }, {} as Record<string, any>);
        return Object.values(map);
    };

    // Rankings DINÁMICOS
    const porFrecuencia = groupBy(d => d.equipo).sort((a, b) => b.count - a.count).slice(0, topN);
    const porCosto = groupBy(d => d.equipo).sort((a, b) => b.gasto - a.gasto).slice(0, topN);
    const porTiempo = groupBy(d => d.equipo).sort((a, b) => b.tiempo - a.tiempo).slice(0, topN);
    const porMTTR = groupBy(d => d.equipo)
        .map(d => ({ ...d, mttr: d.tiempo / (d.count || 1) }))
        .sort((a, b) => b.mttr - a.mttr).slice(0, topN);
    const porCausa = groupBy(d => (d.causa || "S/D").trim().toUpperCase()).sort((a, b) => b.count - a.count).slice(0, Math.max(topN, 10));

    // Datos para el HERO (Tarjeta Oscura) - Usamos lo filtrado
    const heroStats = {
        totalGasto,
        totalEventos,
        totalTiempo,
        topCritico: porFrecuencia.length > 0 ? porFrecuencia[0] : null, // El Top 1 en frecuencia
        // Top 3 lista para los mini-stats del Hero
        topLista: groupBy(d => d.equipo).sort((a,b) => b.count - a.count).slice(0,3) 
    };

    return { totalGasto, totalTiempo, totalEventos, porCosto, porFrecuencia, porMTTR, porTiempo, porCausa, heroStats };
  }, [datosFiltrados, topN]);

  // Texto del Rango para el Header
  const rangoTextoHeader = useMemo(() => {
      if (semanaFiltro !== "TODAS") {
          return getRangoSemana(Number(semanaFiltro), anioFiltro);
      }
      return `Año ${anioFiltro}`;
  }, [semanaFiltro, anioFiltro]);

  // --- RENDER ---

  if (activoSeleccionado) {
      return (
          <AssetDetailView 
            assetName={activoSeleccionado} 
            data={data.filter(d => d.anio === anioFiltro)} 
            onBack={() => setActivoSeleccionado(null)}
          />
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-6">
        <div>
            <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard de Activos</h2>
                {filtroDrill && (
                    <span className="px-3 py-1 bg-pf-red/10 text-pf-red rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-pf-red/20 transition-colors" onClick={() => setFiltroDrill(null)}>
                        <Filter size={12}/> {filtroDrill.valor} <XCircle size={14}/>
                    </span>
                )}
            </div>
            
            <div className="flex items-center gap-4 mt-2">
                <p className="text-sm text-slate-500 font-medium">
                    {/* Texto dinámico de fecha */}
                    Visualizando: <span className="font-bold text-slate-700">{rangoTextoHeader}</span>
                </p>
                {filtroDrill?.tipo === 'EQUIPO' && (
                    <button 
                        onClick={() => setActivoSeleccionado(filtroDrill.valor)}
                        className="flex items-center gap-2 bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-slate-700 hover:scale-105 transition-all shadow-md animate-in fade-in slide-in-from-left-2"
                    >
                        Ver Historial Detallado <ArrowRight size={12}/>
                    </button>
                )}
            </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-end">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <span className="px-2 text-[10px] font-bold text-slate-400 uppercase">Top:</span>
                {[5, 10, 20].map(n => (
                    <button key={n} onClick={() => setTopN(n)} className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${topN === n ? 'bg-white text-pf-red shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{n}</button>
                ))}
            </div>
            {/* BOTÓN DE EXPORTACIÓN */}
            <ExportButton 
                elementId="container-reporte-final" 
                fileName={`Reporte_Fallas_${semanaFiltro === 'TODAS' ? 'Anual' : 'S'+semanaFiltro}`} 
            />
            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
            <div className="bg-slate-100 p-1 rounded-xl flex">
                <button onClick={() => setActiveTab('DASH')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'DASH' ? 'bg-white text-pf-red shadow' : 'text-slate-400'}`}><LayoutDashboard size={14}/> <span className="hidden sm:inline">General</span></button>
                <button onClick={() => setActiveTab('CAUSAS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'CAUSAS' ? 'bg-white text-pf-red shadow' : 'text-slate-400'}`}><PieChart size={14}/> <span className="hidden sm:inline">Causas</span></button>
                <button onClick={() => setActiveTab('TABLA')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'TABLA' ? 'bg-white text-pf-red shadow' : 'text-slate-400'}`}><TableIcon size={14}/> <span className="hidden sm:inline">Datos</span></button>
            </div>
            <div className="flex gap-2">
                <SelectPill value={semanaFiltro} onChange={setSemanaFiltro} options={semanasDisponibles} label="Semana" allLabel="Todas" />
                <SelectPill value={plantaFiltro} onChange={setPlantaFiltro} options={plantasDisponibles} label="Planta" allLabel="Todas" />
                <SelectPill value={anioFiltro} onChange={setAnioFiltro} options={aniosDisponibles} label="Año" />
            </div>
        </div>
      </div>

        {/* CONTENEDOR MAESTRO DE EXPORTACIÓN */}
      <div id="container-reporte-final" className="p-1">
        {activeTab === 'DASH' && (
            <DashboardTab 
                analytics={analytics} 
                semanaFiltro={semanaFiltro} 
                setSemanaFiltro={setSemanaFiltro} // PASAMOS EL SETTER DEL FILTRO
                timelineStats={timelineStats} // PASAMOS LOS DATOS DE TENDENCIA
                filtroDrill={filtroDrill} 
                setFiltroDrill={setFiltroDrill} 
                rangoTexto={rangoTextoHeader}
                topN={topN}
                setActivoSeleccionado={setActivoSeleccionado}
            />
        )}

        {activeTab === 'CAUSAS' && (
            <CausasTab 
                analytics={analytics} 
                filtroDrill={filtroDrill} 
                setFiltroDrill={setFiltroDrill} 
            />
        )}

        {activeTab === 'TABLA' && (
            <TablaTab data={datosFiltrados} />
        )}
        </div>
    </div>
  );
};