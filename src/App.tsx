// src/App.tsx
import { useState } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import * as XLSX from "xlsx";
import { 
  processExcelData, 
  obtenerHorariosPorPlanta, 
  normalizarColumnas, 
  mapDepartamentoAPlanta,
  PlanResult, 
  HorarioTecnico 
} from "./logic/excelProcessor";
import { FileUploader } from "./components/FileUploader";
import { DashboardView } from "./views/DashboardView";
import { MaestroView } from "./views/MaestroView";
import { HorariosView } from "./views/HorariosView";
import { PlanificacionView } from "./views/PlanificacionView";
import { AtrasosView } from "./views/AtrasosView";
import { processAtrasos, AtrasoRow } from "./logic/atrasosProcessor";
import { FileSpreadsheet } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("dash");
  const [datosCrudos, setDatosCrudos] = useState<any[]>([]);
  const [planResult, setPlanResult] = useState<PlanResult[]>([]);
  const [horariosResult, setHorariosResult] = useState<HorarioTecnico[]>([]);
  const [workbookActual, setWorkbookActual] = useState<XLSX.WorkBook | null>(null);
  const [plantas] = useState(["PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"]);
  
  // Estados de carga independientes
  const [archivoCargado, setArchivoCargado] = useState(false); // Para el Maestro Plan
  const [atrasosResult, setAtrasosResult] = useState<AtrasoRow[]>([]); // Para Atrasos
  const [atrasosAnterior, setAtrasosAnterior] = useState<AtrasoRow[]>([]); // NUEVO: Para el histórico

  const [cargandoPlan, setCargandoPlan] = useState(false);
  const [cargandoAtrasos, setCargandoAtrasos] = useState(false);

  // Estados de filtros de vista
  const [plantaMaestro, setPlantaMaestro] = useState("PF3");
  const [plantaHorarios, setPlantaHorarios] = useState("PF3");
  const [plantaPlan, setPlantaPlan] = useState("PF3");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipo === 'PLAN') setCargandoPlan(true);
    else setCargandoAtrasos(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        if (tipo === 'PLAN') {
          setWorkbookActual(workbook);
          const rawAct = XLSX.utils.sheet_to_json(workbook.Sheets["B.ACT"]);
          setDatosCrudos(normalizarColumnas(rawAct));
          setHorariosResult(obtenerHorariosPorPlanta(workbook, plantaHorarios));
          setArchivoCargado(true);
        } else if (tipo === 'ATRASOS') {
          // Reporte Actual de SAP
          const atrasos = processAtrasos(workbook.Sheets);
          setAtrasosResult(atrasos);
        } else if (tipo === 'ANTERIOR') {
          // Reporte Histórico (el que tiene la hoja RESUMEN_DATA)
          const atrasos = processAtrasos(workbook.Sheets);
          setAtrasosAnterior(atrasos);
        }
      } catch (e) {
        console.error("Error al procesar:", e);
        alert("Error al leer el archivo.");
      } finally {
        setCargandoPlan(false);
        setCargandoAtrasos(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const limpiarDatos = () => {
    setWorkbookActual(null);
    setPlanResult([]);
    setAtrasosResult([]);
    setAtrasosAnterior([]);
    setArchivoCargado(false);
    setActiveTab("dash");
  };

  const cambiarPlantaHorarios = (nueva: string) => {
    setPlantaHorarios(nueva);
    if (workbookActual) {
      // Esta función viene de excelProcessor.ts
      setHorariosResult(obtenerHorariosPorPlanta(workbookActual, nueva));
    }
  };
  
  return (
    <div className="flex h-screen bg-pf-light text-slate-800 font-sans">
      <Sidebar 
        archivoCargado={archivoCargado || atrasosResult.length > 0} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLimpiar={limpiarDatos} 
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <section className="flex-1 p-10 overflow-y-auto">
          
          {/* VISTA DASHBOARD: Siempre accesible para cargar nuevos archivos */}
          {activeTab === "dash" && (
            <div className="space-y-10">
              <div className="bg-white p-8 rounded-3xl border border-pf-border shadow-sm">
                <h2 className="text-2xl font-black mb-6">Gestión de Datos</h2>
                <FileUploader 
                  onFileUpload={handleFileUpload} 
                  isLoading={cargandoPlan || cargandoAtrasos}
                  status={{ 
                    plan: archivoCargado, 
                    atrasos: atrasosResult.length > 0,
                    anterior: atrasosAnterior.length > 0 
                  }}
                />
              </div>
              
              {archivoCargado && (
                <DashboardView planResult={planResult} onEjecutarPlan={() => {
                  if (workbookActual) setPlanResult(processExcelData(workbookActual.Sheets));
                }} />
              )}
            </div>
          )}

          {/* VISTAS DE MAESTRO PLAN (Requieren archivoCargado) */}
          {archivoCargado && (
            <>
              {activeTab === "maestro" && (
                <MaestroView 
                  datosCrudos={datosCrudos.filter(orden => {
                    const deptoKey = Object.keys(orden).find(k => k.includes("DEPARTAMENTO")) || "";
                    return mapDepartamentoAPlanta(orden[deptoKey]) === plantaMaestro;
                  })}
                  plantas={plantas} 
                  plantaSeleccionada={plantaMaestro} 
                  onCambiarPlanta={setPlantaMaestro} 
                />
              )}
              {activeTab === "plan" && (
                <PlanificacionView 
                  planResult={planResult.filter(p => p.planta === plantaPlan)}
                  plantas={plantas}
                  plantaSeleccionada={plantaPlan}
                  onCambiarPlanta={setPlantaPlan}
                />
              )}
              {activeTab === "gantt" && (
                <HorariosView 
                  horariosResult={horariosResult} 
                  plantas={plantas}
                  plantaSeleccionada={plantaHorarios} 
                  onCambiarPlanta={cambiarPlantaHorarios} 
                />
              )}
            </>
          )}
          
          {/* VISTA DE ATRASOS (Requiere atrasosResult) */}
          {activeTab === "atrasos" && atrasosResult.length > 0 && (
            <AtrasosView 
              data={atrasosResult} 
              dataAnterior={atrasosAnterior} 
            />
          )}

          {/* FALLBACK: Si no hay datos cargados para la pestaña seleccionada */}
          {((!archivoCargado && ["maestro", "plan", "gantt"].includes(activeTab)) || 
            (atrasosResult.length === 0 && activeTab === "atrasos")) && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FileSpreadsheet size={64} className="mb-4 opacity-20" />
              <p className="font-bold text-lg">Este módulo requiere que cargues el archivo correspondiente</p>
              <button onClick={() => setActiveTab("dash")} className="mt-4 text-pf-red font-black hover:underline">
                Ir al Gestor de Datos
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
export default App;