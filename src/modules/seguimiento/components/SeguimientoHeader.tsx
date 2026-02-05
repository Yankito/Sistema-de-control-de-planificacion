// src/components/seguimiento/SeguimientoHeader.tsx
import { Filter, History, Trash2, Calendar, FileText, Database } from "lucide-react";

interface SeguimientoHeaderProps {
  modoVista: "ATRASOS" | "CUMPLIDAS";
  setModoVista: (m: "ATRASOS" | "CUMPLIDAS") => void;
  
  // Nivel 1: Selección del Reporte (Snapshot)
  reporteSeleccionado: string; // Ej: "2026-S05"
  setReporteSeleccionado: (r: string) => void;
  listaReportesDisponibles: string[]; // Historial de cargas de la DB

  // Nivel 2: Filtros Internos (Filas)
  selectedYear: string;
  setSelectedYear: (y: string) => void;
  yearsInRows: string[]; // Años detectados en las filas
  
  selectedSemana: string;
  setSelectedSemana: (s: string) => void;
  semanasInRows: string[]; // Semanas detectadas en las filas
  
  // Otros
  semanaComparar: string;
  onCambiarComparacion: (s: string) => void;
  onEliminarReporte: () => void;
  onExportarReporte: () => void;
  resetViewDetail: () => void;
}

export const SeguimientoHeader = ({
  modoVista, setModoVista,
  // Nivel 1
  reporteSeleccionado, setReporteSeleccionado, listaReportesDisponibles,
  // Nivel 2
  selectedYear, setSelectedYear, yearsInRows,
  selectedSemana, setSelectedSemana, semanasInRows,
  // Otros
  semanaComparar, onCambiarComparacion, onEliminarReporte, onExportarReporte, resetViewDetail
}: SeguimientoHeaderProps) => {

  const formatLabel = (val: string) => val === "TODAS" ? val : val.split('-')[1] || val;

  return (
    <div className="flex flex-col gap-4 mb-8 border-b pb-4 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-20 pt-2">
      
      {/* FILA SUPERIOR: TÍTULO Y SELECCIÓN DE REPORTE BASE (NIVEL 1) */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Seguimiento OTs</h2>
            
            {/* SELECTOR DE SNAPSHOT (CARGA DE DB) */}
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                <Database size={14} className="text-blue-600"/>
                <span className="text-xs font-bold text-blue-800">Viendo Reporte:</span>
                <select 
                    value={reporteSeleccionado} 
                    onChange={(e) => setReporteSeleccionado(e.target.value)} 
                    className="text-xs font-bold bg-transparent outline-none text-blue-900 cursor-pointer min-w-[120px]"
                >
                    <option value="" disabled>Seleccionar...</option>
                    {listaReportesDisponibles.map(r => (
                        <option key={r} value={r} className="bg-white text-slate-800">{r}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button onClick={() => { setModoVista("ATRASOS"); resetViewDetail(); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${modoVista === 'ATRASOS' ? 'bg-pf-red text-white shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}>ATRASOS</button>
          <button onClick={() => { setModoVista("CUMPLIDAS"); resetViewDetail(); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${modoVista === 'CUMPLIDAS' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}>CUMPLIDAS</button>
        </div>
      </div>

      {/* FILA INFERIOR: FILTROS INTERNOS Y ACCIONES (NIVEL 2) */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase self-center mr-2">Filtrar filas:</span>
            
            {/* Filtro Año (Interno) */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-sm">
              <Calendar size={14} className="text-slate-400"/>
              <select value={selectedYear} onChange={(e) => { setSelectedYear(e.target.value); setSelectedSemana("TODAS"); }} className="text-xs font-bold bg-transparent outline-none text-slate-700 cursor-pointer">
                  {yearsInRows.length === 0 && <option>Sin datos</option>}
                  {yearsInRows.map(y => (<option key={y} value={y} className="bg-white text-slate-800">{y}</option>))}
              </select>
            </div>

            {/* Filtro Semana (Interno) */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-sm">
              <Filter size={14} className="text-slate-400"/>
              <select value={selectedSemana} onChange={(e) => setSelectedSemana(e.target.value)} className="text-xs font-bold bg-transparent outline-none text-slate-700 cursor-pointer min-w-[80px]">
                  {semanasInRows.length === 0 && <option>---</option>}
                  {semanasInRows.map(sem => (<option key={sem} value={sem} className="bg-white text-slate-800">{formatLabel(sem)}</option>))}
              </select>
            </div>

            {/* Comparación (Solo visual) */}
            {modoVista === "ATRASOS" && (
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 ml-4">
                    <History size={14} className="text-indigo-500"/>
                    <span className="text-xs font-bold text-slate-500">Comparar vs:</span>
                    <select value={semanaComparar} onChange={(e) => onCambiarComparacion(e.target.value)} className="text-xs font-bold bg-transparent outline-none text-indigo-600 cursor-pointer">
                        <option value="">Ninguna</option>
                        {listaReportesDisponibles.filter(r => r !== reporteSeleccionado).map(s => (
                            <option key={s} value={s} className="bg-white text-slate-800">{s}</option>
                        ))}
                    </select>
                    {semanaComparar && <button onClick={onEliminarReporte} className="ml-2 text-red-400 hover:text-red-600"><Trash2 size={14}/></button>}
                </div>
            )}
        </div>

        <div className="flex gap-2">
            {modoVista === "ATRASOS" && <button onClick={onExportarReporte} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-lg hover:bg-slate-900 transition-colors"><FileText size={14} /> Reporte</button>}
        </div>
      </div>
    </div>
  );
};