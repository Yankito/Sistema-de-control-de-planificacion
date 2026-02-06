import { useState, useMemo, useEffect } from "react";
import { AtrasoRow } from "../types";
import { BarChart3, PieChart, Factory, History, FileText, Trash2, Database } from "lucide-react";
import { ResumenTable } from "../components/ResumenTable";
import { confirm } from '@tauri-apps/plugin-dialog';
import { DatabaseService } from "../../../shared/db/DatabaseService";
import { exportarReporteCompleto } from "../utils/exportUtils";
import { ExportButton } from "../../../shared/components/ExportButton";

// COMPONENTES
import { SeguimientoHeader } from "../components/SeguimientoHeader";
import { ComplianceCard } from "../components/ComplianceCard";
import { SeguimientoModal } from "../components/SeguimientoModal";
import { AnalysisDashboard } from "../components/AnalysisDashboard";
import { EvolutionDashboard } from "../components/EvolutionDashboard";
import { LoadingOverlay } from "../../../shared/components/ui/LoadingOverlay"; 
import { analyzeBacklogFlow } from "../logic/backlogAnalysis";

// IMPORTAR EL NUEVO HOOK (Solo para tipado, no para ejecutar)
import { useSeguimientoData } from "../hooks/useSeguimientoData";

interface Props {
    seguimientoData: ReturnType<typeof useSeguimientoData>; // Tipado automático del hook
    historialCompleto: string[];
    onReporteEliminado?: () => void;
}

export const SeguimientoOTsView = ({ 
    seguimientoData,
    historialCompleto,
    onReporteEliminado
}: Props) => {
    
    // 1. DESESTRUCTURACIÓN DE PROPS (Datos vienen del padre)
    const {
        dataActual,
        dataAnterior, // Ya viene como 'dataAnterior', no necesitamos renombrar si el hook lo expone así
        dataCumplimiento,
        reporteActual,
        semanaComparar,
        isLoading,
        cargarReporte,
        cambiarComparacion,
        limpiarComparacion
    } = seguimientoData;

    // 2. ESTADOS VISUALES (Locales)
    const [modoVista, setModoVista] = useState<"ATRASOS" | "CUMPLIDAS">("ATRASOS");
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [selectedYear, setSelectedYear] = useState<string>("TODOS"); 
    const [selectedSemana, setSelectedSemana] = useState("TODAS");
    const [viewDetail, setViewDetail] = useState<{ id: string, esOB: boolean, cat?: string, isGlobal?: boolean, periodo?: string } | null>(null);

    // 3. CONSTANTES Y MEMOS
    const PLANTAS_COMPLEJO = useMemo(() => ["PF3", "PF4", "PF5", "PF6", "CDT", "OTROS", "DC", "VENTAS"], []);
    const PLANTAS_PF_ALIMENTOS = useMemo(() => ["PF1", "PF2", ...PLANTAS_COMPLEJO], [PLANTAS_COMPLEJO]);
    const LISTA_PLANTAS_INDIVIDUALES = useMemo(() => ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS", "MPS", "DC", "VENTAS"], []);
    const LISTA_CUMPLIMIENTO = useMemo(() => LISTA_PLANTAS_INDIVIDUALES, [LISTA_PLANTAS_INDIVIDUALES]);

    // Lógica de carga inicial simplificada:
    // Si no hay reporte cargado pero hay historial, cargamos el primero.
    // Esto es un "fail-safe", idealmente el padre ya cargó algo.
    useEffect(() => {
         if (!reporteActual && historialCompleto.length > 0 && !isLoading) {
             cargarReporte(historialCompleto[0]);
         }
    }, [historialCompleto, reporteActual, isLoading, cargarReporte]);

    // --- LÓGICA DE FILTRADO VISUAL ---
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
        if (!semanaComparar || dataAnterior.length === 0) return [];
        return filtrarDataset(dataAnterior, true);
    }, [dataAnterior, selectedYear, selectedSemana, modoVista, semanaComparar]);

    const statsEvolucion = useMemo(() => {
        if (isLoading) return null;
        if (!semanaComparar || modoVista !== "ATRASOS") return null;
        return analyzeBacklogFlow(dataFiltrada, dataAnteriorFiltrada, dataCumplimiento);
    }, [dataFiltrada, dataAnteriorFiltrada, semanaComparar, modoVista, dataCumplimiento, isLoading]);

    // --- HANDLERS ---
    const handleEliminarReporte = async () => {
        if (!semanaComparar) return;
        if (await confirm(`¿Eliminar reporte: ${semanaComparar}?`, { title: 'Confirmar', kind: 'warning' })) {
            await DatabaseService.deleteSnapshot(semanaComparar, 'SEGUIMIENTO');
            await DatabaseService.deleteSnapshot(semanaComparar, 'CUMPLIMIENTO'); 
            limpiarComparacion();
            if (onReporteEliminado) onReporteEliminado();
        }
    };

    const handleExportarExcelCompleto = async () => {
        await exportarReporteCompleto(dataActual, dataAnterior, modoVista, reporteActual);
    };

    // Opciones para filtros internos
    const yearsInRows = useMemo(() => ["TODOS", ...Array.from(new Set(dataActual.map(d => d.semana.split('-')[0]))).sort().reverse()], [dataActual]);
    const semanasInRows = useMemo(() => {
        const filas = selectedYear === "TODOS" ? dataActual : dataActual.filter(d => d.semana.startsWith(selectedYear));
        return ["TODAS", ...Array.from(new Set(filas.map(d => d.semana))).sort((a,b)=>b.localeCompare(a))];
    }, [dataActual, selectedYear]);

    return (
        <div className="relative p-6 h-full overflow-y-auto bg-slate-50/50 flex flex-col gap-4">
            {isLoading && <LoadingOverlay message="Procesando datos..." />}

            {/* --- CABECERA PRINCIPAL --- */}
            <header className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-6">
                
                {/* NIVEL 1: GESTIÓN DE REPORTES (SNAPSHOTS) */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-6">
                        <div>
                            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Seguimiento OTs</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Control de Gestión Operativa</p>
                        </div>

                        {/* SELECTOR DE REPORTE PRINCIPAL */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1">
                                <Database size={10}/> Reporte Base
                            </label>
                            <select 
                                value={reporteActual} 
                                onChange={(e) => cargarReporte(e.target.value)} 
                                className="text-xs font-black bg-blue-50 text-blue-900 px-3 py-2 rounded-xl border border-blue-100 outline-none cursor-pointer"
                            >
                                {historialCompleto.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        {/* SELECTOR DE COMPARACIÓN */}
                        {modoVista === "ATRASOS" && (
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1">
                                        <History size={10}/> Comparar con
                                </label>
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={semanaComparar} 
                                        onChange={(e) => cambiarComparacion(e.target.value)} 
                                        className={`text-xs font-black px-3 py-2 rounded-xl border outline-none cursor-pointer transition-colors ${semanaComparar ? 'bg-indigo-50 border-indigo-100 text-indigo-900' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                    >
                                        <option value="">(Sin comparación)</option>
                                        {historialCompleto.filter(r => r !== reporteActual).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    {semanaComparar && (
                                        <button onClick={handleEliminarReporte} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar este reporte de la DB">
                                            <Trash2 size={16}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BOTÓN ANÁLISIS (ACCION PRINCIPAL) */}
                    <button 
                        onClick={() => setShowAnalysis(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all font-black text-xs"
                    >
                        <BarChart3 size={18} />
                        CENTRO DE ANÁLISIS
                    </button>
                </div>

                {/* NIVEL 2: FILTROS Y EXPORTACIÓN */}
                <div className="flex justify-between items-center">
                    <SeguimientoHeader 
                        modoVista={modoVista} setModoVista={setModoVista}
                        // Ya no pasamos los selectores de snapshot aquí para no saturar
                        selectedYear={selectedYear} setSelectedYear={setSelectedYear} yearsInRows={yearsInRows}
                        selectedSemana={selectedSemana} setSelectedSemana={setSelectedSemana} semanasInRows={semanasInRows}
                        resetViewDetail={() => setViewDetail(null)}
                        // Estos ya no se usan en el header simplificado
                        reporteSeleccionado={reporteActual} setReporteSeleccionado={cargarReporte} listaReportesDisponibles={historialCompleto}
                        semanaComparar={semanaComparar} onCambiarComparacion={cambiarComparacion} onEliminarReporte={handleEliminarReporte}
                        onExportarReporte={handleExportarExcelCompleto}
                    />

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        {/* EXPORTAR IMAGEN (Dashboard) */}
                        <ExportButton 
                            elementId="dashboard-atrasos-container"
                            fileName={`Dashboard_${modoVista}_${reporteActual}`}
                            plantaSeleccionada="CONSOLIDADO"
                            rangoTexto={reporteActual} 
                            semana={reporteActual}
                            reportTitle={modoVista === "ATRASOS" ? "Tablero de Atrasos" : "Tablero de Cumplimiento"}
                        />
                        
                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        {/* EXPORTAR EXCEL (Datos) */}
                        {modoVista === "ATRASOS" && (
                            <button 
                                onClick={handleExportarExcelCompleto} 

                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 border border-slate-800 bg-slate-900 text-white hover:bg-black hover:shadow-pf-red/20`}
                            >
                                <FileText size={14} /> 
                                DESCARGAR EXCEL
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div id="dashboard-atrasos-container" className="p-2 bg-slate-50/50"> 
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
                                onDetail={(cat, periodo) => setViewDetail({id:"COMPLEJO", esOB:tipo.es, cat, periodo, isGlobal:true})} 
                            />
                            <ResumenTable 
                                titulo="PF ALIMENTOS" 
                                dataset={dataFiltrada.filter(d => (!!d.esOB === tipo.es) && PLANTAS_PF_ALIMENTOS.includes(d.planta))} 
                                datasetAnt={dataAnteriorFiltrada.filter(d => (!!d.esOB === tipo.es) && PLANTAS_PF_ALIMENTOS.includes(d.planta))} 
                                esOB={tipo.es} modoVista={modoVista} isGlobal showComparison={!!semanaComparar}
                                onDetail={(cat, periodo) => setViewDetail({id:"PF ALIMENTOS", esOB:tipo.es, cat, periodo, isGlobal:true})} 
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
                                    onDetail={(cat, periodo) => setViewDetail({id:p, esOB:tipo.es, cat, periodo})} 
                                />
                            ))}
                        </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="text-green-600" />
                        <h3 className="text-lg font-black uppercase text-slate-700">Tablero de Cumplimiento</h3>
                        <span className="text-sm font-bold text-slate-400">({selectedSemana === "TODAS" ? "Consolidado" : selectedSemana})</span>
                    </div>
                    <div className="mb-10">
                        <h4 className="text-sm font-black text-slate-500 mb-4 uppercase border-b pb-2">Mantención (OM)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {LISTA_CUMPLIMIENTO.map(p => (
                                <ComplianceCard key={`om-${p}`} planta={p} esOB={false} dataSemanaActual={dataDashboard} onClick={() => setViewDetail({ id: p, esOB: false })} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-500 mb-4 uppercase border-b pb-2">Infraestructura (OB)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {LISTA_CUMPLIMIENTO.map(p => (
                                <ComplianceCard key={`ob-${p}`} planta={p} esOB={true} dataSemanaActual={dataDashboard} onClick={() => setViewDetail({ id: p, esOB: true })} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
            </div>

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