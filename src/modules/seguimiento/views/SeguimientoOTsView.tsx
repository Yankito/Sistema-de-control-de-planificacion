import { useState, useMemo, useEffect } from "react";
import { AtrasoRow } from "../types";
import { BarChart3, PieChart, Factory } from "lucide-react"; // Añade PieChart y Factory si faltaban
import { ResumenTable } from "../components/ResumenTable";
import { confirm } from '@tauri-apps/plugin-dialog';
import { DatabaseService } from "../../../shared/db/DatabaseService";
import { exportarAtrasosFiltrados, exportarReporteCompleto } from "../utils/exportUtils";

// COMPONENTES
import { SeguimientoHeader } from "../components/SeguimientoHeader";
import { ComplianceCard } from "../components/ComplianceCard";
import { SeguimientoModal } from "../components/SeguimientoModal";
import { AnalysisDashboard } from "../components/AnalysisDashboard";
import { EvolutionDashboard } from "../components/EvolutionCard";
import { LoadingOverlay } from "../../../shared/components/ui/LoadingOverlay"; 
import { analyzeBacklogFlow } from "../logic/backlogAnalysis";

// IMPORTAR EL NUEVO HOOK
import { useSeguimientoData } from "../hooks/useSeguimientoData";

export const SeguimientoOTsView = ({ 
    data, 
    dataAnterior = [],
    historialCompleto = [], 
    onCargarSemana,
    onCambioComparacion,
    onReporteEliminado,
    currentCumplimiento = []
}: { 
    data: AtrasoRow[], 
    dataAnterior?: AtrasoRow[],
    historialCompleto?: string[], 
    onCargarSemana?: (s: string) => void,
    onCambioComparacion?: (nuevaDataAnterior: AtrasoRow[]) => void,
    onReporteEliminado?: () => void,
    currentCumplimiento?: AtrasoRow[]
}) => {
    // 1. ESTADO DE UI
    const [modoVista, setModoVista] = useState<"ATRASOS" | "CUMPLIDAS">("ATRASOS");
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string>("TODOS"); 
    const [selectedSemana, setSelectedSemana] = useState("TODAS");
    const [viewDetail, setViewDetail] = useState<{ id: string, esOB: boolean, cat?: string, isGlobal?: boolean } | null>(null);

    // 2. HOOK DE DATOS (Reemplaza toda la lógica de fetch y useState manual)
    const {
        dataActual,
        dataAnterior: localDataAnterior,
        dataCumplimiento,
        reporteActual,
        semanaComparar,
        isLoading,
        cargarReporte,
        cambiarComparacion,
        limpiarComparacion,
        setReporteActual // Para inicialización
    } = useSeguimientoData(
        data, 
        dataAnterior, 
        currentCumplimiento, 
        historialCompleto,
        { onCargarSemana, onCambioComparacion }
    );

    // Constantes de Plantas
    const PLANTAS_COMPLEJO = useMemo(() => ["PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"], []);
    const PLANTAS_PF_ALIMENTOS = useMemo(() => ["PF1", "PF2", ...PLANTAS_COMPLEJO], [PLANTAS_COMPLEJO]);
    const LISTA_CUMPLIMIENTO = useMemo(() => ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "MPS", "OTROS"], []);
    const LISTA_PLANTAS_INDIVIDUALES = useMemo(() => ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS", "MPS"], []);

    // Carga Inicial (Lógica simplificada gracias al hook)
    useEffect(() => {
         if (historialCompleto.length > 0 && !reporteActual) {
             cargarReporte(historialCompleto[0]);
         } else if (historialCompleto.length > 0 && reporteActual && !historialCompleto.includes(reporteActual)) {
             cargarReporte(historialCompleto[0]);
         } else if (data.length > 0 && !reporteActual) {
            // Caso donde data viene por props iniciales y tiene semana
            setReporteActual(data[0].semana);
         }
    }, [historialCompleto, cargarReporte, data]); // quitamos reporteActual del array para evitar loops, o lo manejamos con cuidado

    // --- LÓGICA DE FILTRADO VISUAL (Se mantiene igual) ---
    const filtrarDataset = (dataset: AtrasoRow[], aplicarFiltroModo: boolean) => {
        return dataset.filter(d => {
            if (selectedYear !== "TODOS" && !d.semana.startsWith(selectedYear)) return false;
            if (selectedSemana !== "TODAS" && d.semana !== selectedSemana) return false;
            if (aplicarFiltroModo) {
                if (modoVista === "CUMPLIDAS") return d.clasificacion === "CUMPLIDA";
                return d.clasificacion !== "CUMPLIDA";
            }
            return true;
        });
    };

    const dataFiltrada = useMemo(() => filtrarDataset(dataActual, true), [dataActual, selectedYear, selectedSemana, modoVista]);
    const dataDashboard = useMemo(() => filtrarDataset(dataActual, false), [dataActual, selectedYear, selectedSemana]);
    
    const dataAnteriorFiltrada = useMemo(() => {
        if (!semanaComparar || localDataAnterior.length === 0) return [];
        return filtrarDataset(localDataAnterior, true);
    }, [localDataAnterior, selectedYear, selectedSemana, modoVista, semanaComparar]);

    const statsEvolucion = useMemo(() => {
        if (isLoading) return null;
        if (!semanaComparar || modoVista !== "ATRASOS") return null;
        return analyzeBacklogFlow(dataFiltrada, dataAnteriorFiltrada, dataCumplimiento);
    }, [dataFiltrada, dataAnteriorFiltrada, semanaComparar, modoVista, dataCumplimiento, isLoading]);

    // --- HANDLERS ---
    const handleEliminarReporte = async () => {
        if (!semanaComparar) return;
        if (await confirm(`¿Eliminar reporte: ${semanaComparar}?`, { title: 'Confirmar', kind: 'warning' })) {
            await DatabaseService.deleteSnapshot(semanaComparar, 'ATRASOS');
            await DatabaseService.deleteSnapshot(semanaComparar, 'CUMPLIMIENTO'); 
            limpiarComparacion();
            if (onReporteEliminado) onReporteEliminado();
        }
    };

    const handleExportarExcel = async () => {
        await exportarAtrasosFiltrados(dataFiltrada, modoVista, selectedSemana);
    };

    const handleExportarExcelCompleto = async () => {
        await exportarReporteCompleto(dataActual, modoVista, reporteActual);
    };

    const yearsInRows = useMemo(() => ["TODOS", ...Array.from(new Set(dataActual.map(d => d.semana.split('-')[0]))).sort().reverse()], [dataActual]);
    const semanasInRows = useMemo(() => {
        const filas = selectedYear === "TODOS" ? dataActual : dataActual.filter(d => d.semana.startsWith(selectedYear));
        return ["TODAS", ...Array.from(new Set(filas.map(d => d.semana))).sort((a,b)=>b.localeCompare(a))];
    }, [dataActual, selectedYear]);

    return (
        <div className="relative p-6 h-full overflow-y-auto bg-slate-50/50">
            {isLoading && <LoadingOverlay message="Procesando datos y comparativas..." />}

            <div className="flex justify-end mb-4">
                <button 
                    onClick={() => setShowAnalysis(true)}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg hover:bg-indigo-700 transition-all font-bold text-sm animate-in fade-in disabled:opacity-50"
                >
                    <BarChart3 size={18} />
                    Analizar Evolución y Técnicos
                </button>
            </div>

            <SeguimientoHeader 
                modoVista={modoVista} setModoVista={setModoVista}
                reporteSeleccionado={reporteActual} setReporteSeleccionado={cargarReporte}
                listaReportesDisponibles={historialCompleto}
                selectedYear={selectedYear} setSelectedYear={setSelectedYear} yearsInRows={yearsInRows}
                selectedSemana={selectedSemana} setSelectedSemana={setSelectedSemana} semanasInRows={semanasInRows}
                semanaComparar={semanaComparar} onCambiarComparacion={cambiarComparacion} onEliminarReporte={handleEliminarReporte}
                onExportarDatos={handleExportarExcel} onExportarReporte={handleExportarExcelCompleto}
                resetViewDetail={() => { setViewDetail(null); }}
            />

            {modoVista === "ATRASOS" ? (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 animate-in fade-in duration-500">
                        {[{t:"OM", es:false}, {t:"OB", es:true}].map(tipo => (
                        <div key={tipo.t}>
                            <h3 className="text-sm font-black mb-4 uppercase text-pf-red">Consolidado {tipo.t}</h3>
                            <ResumenTable 
                                titulo="COMPLEJO" 
                                dataset={dataFiltrada.filter(d => (!!d.esOB === tipo.es) && PLANTAS_COMPLEJO.includes(d.planta))} 
                                datasetAnt={dataAnteriorFiltrada.filter(d => (!!d.esOB === tipo.es) && PLANTAS_COMPLEJO.includes(d.planta))} 
                                esOB={tipo.es} modoVista={modoVista} isGlobal showComparison={!!semanaComparar} 
                                onDetail={(cat) => setViewDetail({id:"COMPLEJO", esOB:tipo.es, cat, isGlobal:true})} 
                            />
                            <ResumenTable 
                                titulo="PF ALIMENTOS" 
                                dataset={dataFiltrada.filter(d => (!!d.esOB === tipo.es) && PLANTAS_PF_ALIMENTOS.includes(d.planta))} 
                                datasetAnt={dataAnteriorFiltrada.filter(d => (!!d.esOB === tipo.es) && PLANTAS_PF_ALIMENTOS.includes(d.planta))} 
                                esOB={tipo.es} modoVista={modoVista} isGlobal showComparison={!!semanaComparar}
                                onDetail={(cat) => setViewDetail({id:"PF ALIMENTOS", esOB:tipo.es, cat, isGlobal:true})} 
                            />
                        </div>
                        ))}
                    </div>

                    {!isLoading && statsEvolucion && (
                        <div className="mb-12 border-t border-slate-200 pt-8">
                            <EvolutionDashboard 
                                nuevas={statsEvolucion.nuevas}
                                finalizadas={statsEvolucion.finalizadas}
                                conAvance={statsEvolucion.conAvance}
                                semanaActual={reporteActual}
                                semanaAnterior={semanaComparar}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-700 delay-100">
                        {[{t:"OM", es:false}, {t:"OB", es:true}].map(tipo => (
                        <div key={tipo.t}>
                            <h3 className="text-xs font-black text-slate-400 mb-4 uppercase flex items-center gap-2"><Factory size={14}/> Plantas ({tipo.t})</h3>
                            {LISTA_PLANTAS_INDIVIDUALES.map(p => (
                                <ResumenTable 
                                    key={p} titulo={p} 
                                    dataset={dataFiltrada.filter(d => d.planta === p && (!!d.esOB === tipo.es))} 
                                    datasetAnt={dataAnteriorFiltrada.filter(d => d.planta === p && (!!d.esOB === tipo.es))} 
                                    esOB={tipo.es} modoVista={modoVista} showComparison={!!semanaComparar}
                                    onDetail={(cat) => setViewDetail({id:p, esOB:tipo.es, cat})} 
                                />
                            ))}
                        </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 mb-6"><PieChart className="text-green-600" /><h3 className="text-lg font-black uppercase text-slate-700">Tablero de Cumplimiento</h3><span className="text-sm font-bold text-slate-400">({selectedSemana === "TODAS" ? "Consolidado" : selectedSemana})</span></div>
                    <div className="mb-10"><h4 className="text-sm font-black text-slate-500 mb-4 uppercase border-b pb-2">Mantención (OM)</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{LISTA_CUMPLIMIENTO.map(p => (<ComplianceCard key={`om-${p}`} planta={p} esOB={false} dataSemanaActual={dataDashboard} onClick={() => setViewDetail({ id: p, esOB: false })} />))}</div></div>
                    <div><h4 className="text-sm font-black text-slate-500 mb-4 uppercase border-b pb-2">Infraestructura (OB)</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{LISTA_CUMPLIMIENTO.map(p => (<ComplianceCard key={`ob-${p}`} planta={p} esOB={true} dataSemanaActual={dataDashboard} onClick={() => setViewDetail({ id: p, esOB: true })} />))}</div></div>
                </div>
            )}

            <AnalysisDashboard 
                isOpen={showAnalysis}
                onClose={() => setShowAnalysis(false)}
                currentData={dataDashboard} 
                prevData={dataAnteriorFiltrada} 
                currentCumplimiento={dataCumplimiento} 
                periodoLabel={`${semanaComparar || 'Inicio'} -> ${reporteActual}`}
            />

            {viewDetail && (
                <SeguimientoModal 
                    viewDetail={viewDetail} 
                    onClose={() => setViewDetail(null)} 
                    dataModo={modoVista === "CUMPLIDAS" ? dataDashboard : dataFiltrada} 
                    dataAnterior={modoVista === "ATRASOS" ? dataAnteriorFiltrada : []}
                    selectedSemana={selectedSemana}
                    LISTA_PLANTAS_INDIVIDUALES={LISTA_PLANTAS_INDIVIDUALES}
                    PLANTAS_COMPLEJO={PLANTAS_COMPLEJO}
                    PLANTAS_PF_ALIMENTOS={PLANTAS_PF_ALIMENTOS}
                    modoVista={modoVista}
                />
            )}
        </div>
    );
};