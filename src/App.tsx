// src/App.tsx
import { useState } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import * as XLSX from "xlsx";
import { 
  processExcelData, 
  obtenerHorariosPorPlanta, 
  normalizarColumnas,   
} from "./logic/excelProcessor";
import { PlannerService } from "./logic/PlannerService";
import { PlanResult, HorarioTecnico } from "./types";

import { FileUploader } from "./components/FileUploader";
import { DashboardView } from "./views/DashboardView";
import { MaestroView } from "./views/MaestroView";
import { HorariosView } from "./views/HorariosView";
import { PlanificacionView } from "./views/PlanificacionView";
import { AtrasosView } from "./views/AtrasosView";
import { processAtrasos, AtrasoRow } from "./logic/atrasosProcessor";
import { FileSpreadsheet } from "lucide-react";

import { processSeguimiento } from "./logic/seguimientoProcessor";
import { SeguimientoView } from "./views/SeguimientoView";
import { SeguimientoResult } from "./types";
import { ClipboardList } from "lucide-react";
import { processSeguimientoOTs } from "./logic/seguimientoOTsProcessor"; // Nuevo
import { SeguimientoOTsView } from "./views/SeguimientoOTsView";       // Nuevo

function App() {
  const [activeTab, setActiveTab] = useState("dash");
  const [datosCrudos, setDatosCrudos] = useState<any[]>([]);
  const [planResult, setPlanResult] = useState<PlanResult[]>([]);
  const [horariosResult, setHorariosResult] = useState<HorarioTecnico[]>([]);
  const [workbookActual, setWorkbookActual] = useState<XLSX.WorkBook | null>(null);
  const [plantas] = useState(["PF3", "PF4", "PF5", "PF6", "CDT", "OTROS", "SADEMA"]);

  const [empleadosMap, setEmpleadosMap] = useState<Map<string, any>>(new Map());
  
  const [archivoCargado, setArchivoCargado] = useState(false);
  const [atrasosResult, setAtrasosResult] = useState<AtrasoRow[]>([]);
  const [atrasosAnterior, setAtrasosAnterior] = useState<AtrasoRow[]>([]);

  const [cargandoPlan, setCargandoPlan] = useState(false);
  const [cargandoAtrasos, setCargandoAtrasos] = useState(false);

  const [plantaMaestro, setPlantaMaestro] = useState("PF3");
  const [plantaHorarios, setPlantaHorarios] = useState("PF3");
  const [plantaPlan, setPlantaPlan] = useState("PF3");

  const [seguimientoResult, setSeguimientoResult] = useState<SeguimientoResult>({ mantencion: [], infraestructura: [] });
  const [cargandoSeguimiento, setCargandoSeguimiento] = useState(false);

  // src/App.tsx

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR' | 'SEGUIMIENTO') => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 1. Activamos el estado de carga inmediatamente
  if (tipo === 'PLAN') setCargandoPlan(true);
  else if (tipo === 'SEGUIMIENTO') setCargandoSeguimiento(true);
  else setCargandoAtrasos(true);

  const reader = new FileReader();
  reader.onload = (event) => {
    // 2. Usamos setTimeout para que el hilo de ejecución se libere 
    // y permita a React renderizar el "Loading" antes del proceso pesado
    setTimeout(() => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        
        // Esta línea es la que más congela el hilo:
        const workbook = XLSX.read(data, { type: "array" });

        if (tipo === 'PLAN') {
          setWorkbookActual(workbook);
          const rawAct = XLSX.utils.sheet_to_json(workbook.Sheets["B.ACT"]);
          setDatosCrudos(normalizarColumnas(rawAct));
          setHorariosResult(obtenerHorariosPorPlanta(workbook, plantaHorarios));
          setArchivoCargado(true);
          setPlanResult([]);
        } else if (tipo === 'ATRASOS') {
          const { actual, anterior } = processSeguimientoOTs(workbook.Sheets);
          setAtrasosResult(actual);
          setAtrasosAnterior(anterior);
          setActiveTab("atrasos");
        } else if (tipo === 'ANTERIOR') {
          setAtrasosAnterior(processSeguimientoOTs(workbook.Sheets));
        } else if (tipo === 'SEGUIMIENTO') {
          const resultados = processSeguimiento(workbook.Sheets);
          setSeguimientoResult(resultados);
          if (resultados.mantencion.length > 0 || resultados.infraestructura.length > 0) {
            setActiveTab("seguimiento");
          }
        }
      } catch (e) {
        console.error("Error:", e);
        alert("Error al leer el archivo.");
      } finally {
        // 3. Apagamos cargas
        setCargandoPlan(false);
        setCargandoAtrasos(false);
        setCargandoSeguimiento(false);
      }
    }, 100); // Pequeño margen para asegurar el renderizado
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
    setSeguimientoResult({ mantencion: [], infraestructura: [] });
  };

  const cambiarPlantaHorarios = (nueva: string) => {
    setPlantaHorarios(nueva);
    if (workbookActual) {
      setHorariosResult(obtenerHorariosPorPlanta(workbookActual, nueva));
    }
  };
  
  // Función para ejecutar la lógica del Planner
  const ejecutarPlanificacion = () => {
    if (workbookActual) {
      // Capturamos el objeto retornado (resultados y el mapa)
      const { resultados, empleadosMap: mapaCargado } = processExcelData(workbookActual.Sheets);
      
      setPlanResult(resultados);
      setEmpleadosMap(mapaCargado); // Guardamos el mapa en el estado
    }
  };

  return (
    <div className="flex h-screen bg-pf-light text-slate-800 font-sans">
      <Sidebar 
        archivoCargado={archivoCargado || atrasosResult.length > 0} 
        tieneAtrasos={atrasosResult.length > 0}
        tieneSeguimiento={seguimientoResult.mantencion.length > 0}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLimpiar={limpiarDatos} 
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <section className="flex-1 p-10 overflow-y-auto">
          
          {activeTab === "dash" && (
            <div className="space-y-10">
              <div className="bg-white p-8 rounded-3xl border border-pf-border shadow-sm">
                <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">Gestión de Datos</h2>
                <FileUploader 
                  onFileUpload={handleFileUpload} 
                  isLoading={cargandoPlan || cargandoAtrasos}
                  status={{ 
                    plan: archivoCargado, 
                    atrasos: atrasosResult.length > 0,
                    anterior: atrasosAnterior.length > 0 ,
                    seguimiento: seguimientoResult.mantencion.length > 0
                  }}
                />
              </div>
              
              {archivoCargado && (
                <DashboardView 
                  planResult={planResult} 
                  onEjecutarPlan={ejecutarPlanificacion} 
                />
              )}
            </div>
          )}

          {archivoCargado && (
            <>
              {activeTab === "maestro" && (
                <MaestroView 
                  datosCrudos={datosCrudos.filter(orden => {
                    const deptoKey = Object.keys(orden).find(k => k.includes("DEPARTAMENTO")) || "";
                    // Usamos el método estático del servicio refactorizado
                    return PlannerService.mapDepartamentoAPlanta(orden[deptoKey]) === plantaMaestro;
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
                  empleadosMap={empleadosMap}
                  setPlanResult={setPlanResult}
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
          
          {activeTab === "atrasos" && atrasosResult.length > 0 && (
            <SeguimientoOTsView 
              data={atrasosResult} 
              dataAnterior={atrasosAnterior}
              
            />
          )}

          {(activeTab === "seguimiento" && seguimientoResult.mantencion.length > 0) && (
            <SeguimientoView 
                dataMantencion={seguimientoResult.mantencion} 
                dataInfra={seguimientoResult.infraestructura} 
            />
          )}

          {/* FALLBACK (PANTALLA DE BLOQUEO) ACTUALIZADA */}
          {/* Esta lógica decide cuándo mostrar el mensaje de "Cargue archivo" */}
          { (
            (!archivoCargado && ["maestro", "plan", "gantt"].includes(activeTab)) || 
            (atrasosResult.length === 0 && activeTab === "atrasos") ||
            (seguimientoResult.mantencion.length === 0 && seguimientoResult.infraestructura.length === 0 && activeTab === "seguimiento")
          ) && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-in fade-in duration-300">
              <FileSpreadsheet size={64} className="mb-4 opacity-20" />
              <p className="font-bold text-lg italic">Este módulo requiere que cargues el archivo correspondiente</p>
              <button onClick={() => setActiveTab("dash")} className="mt-4 text-pf-red font-black hover:underline uppercase text-sm tracking-widest">
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