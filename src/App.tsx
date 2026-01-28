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
import { processSeguimientoOTs } from "./logic/seguimientoOTsProcessor";
import { SeguimientoOTsView } from "./views/SeguimientoOTsView";
import { processSeguimiento } from "./logic/seguimientoProcessor";
import { SeguimientoView } from "./views/SeguimientoView";
import { SeguimientoResult } from "./types";
import { FileSpreadsheet } from "lucide-react";
import { AtrasoRow } from "./logic/atrasosProcessor";
import {obtenerMapaHorarios} from "./logic/excelProcessor";

function App() {
  const [activeTab, setActiveTab] = useState("dash");
  const [datosCrudos, setDatosCrudos] = useState<any[]>([]);
  const [planResult, setPlanResult] = useState<PlanResult[]>([]);
  const [planResultSinAsignar, setPlanResultSinAsignar] = useState<any[]>([]);
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
  const [mapaHorariosActual, setMapaHorariosActual] = useState<Map<string, string[]>>(new Map());

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR' | 'SEGUIMIENTO') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipo === 'PLAN') setCargandoPlan(true);
    else if (tipo === 'SEGUIMIENTO') setCargandoSeguimiento(true);
    else setCargandoAtrasos(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          if (tipo === 'PLAN') {
            setWorkbookActual(workbook);
            const rawAct = XLSX.utils.sheet_to_json(workbook.Sheets["B.ACT"]);
            setDatosCrudos(normalizarColumnas(rawAct));
            setHorariosResult(obtenerHorariosPorPlanta(workbook, plantaHorarios));
            setArchivoCargado(true);
            setPlanResult([]);
            setPlanResultSinAsignar([]);
          } else if (tipo === 'ATRASOS') {
            const { actual, anterior } = processSeguimientoOTs(workbook.Sheets);
            setAtrasosResult(actual);
            setAtrasosAnterior(anterior);
            setActiveTab("atrasos");
          } else if (tipo === 'ANTERIOR') {
            setAtrasosAnterior(processSeguimientoOTs(workbook.Sheets).actual);
          } else if (tipo === 'SEGUIMIENTO') {
            const resultados = processSeguimiento(workbook.Sheets);
            setSeguimientoResult(resultados);
            if (resultados.mantencion.length > 0 || resultados.infraestructura.length > 0) setActiveTab("seguimiento");
          }
        } catch (e) {
          console.error("Error:", e);
          alert("Error al leer el archivo.");
        } finally {
          setCargandoPlan(false);
          setCargandoAtrasos(false);
          setCargandoSeguimiento(false);
        }
      }, 100);
    };
    reader.readAsArrayBuffer(file);
  };

  const limpiarDatos = () => {
    setWorkbookActual(null);
    setPlanResult([]);
    setPlanResultSinAsignar([]);
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

  const ejecutarPlanificacion = () => {
    if (workbookActual) {
      const { resultados, sinAsignar, empleadosMap: mapaCargado } = processExcelData(workbookActual.Sheets);
      const horarios = obtenerMapaHorarios(workbookActual.Sheets);
      
      setPlanResult(resultados);
      setPlanResultSinAsignar(sinAsignar);
      setEmpleadosMap(mapaCargado);
      setMapaHorariosActual(horarios); // Guardamos para el Drag & Drop
    }
  };

  const handleCambioTurno = (nombreTecnico: string, diaIndex: number) => {
    setHorariosResult((prev) => {
      return prev.map((tecnico) => {
        if (tecnico.nombre === nombreTecnico) {
          // Ciclo de turnos: M -> T -> N -> L -> V -> M
          const ciclo = ['M', 'T', 'N', 'L', 'V'];
          const turnoActual = tecnico.turnos[diaIndex];
          const siguienteIndex = (ciclo.indexOf(turnoActual) + 1) % ciclo.length;
          const nuevoTurno = ciclo[siguienteIndex];

          const nuevosTurnos = [...tecnico.turnos];
          nuevosTurnos[diaIndex] = nuevoTurno;
          
          return { ...tecnico, turnos: nuevosTurnos };
        }
        return tecnico;
      });
    });
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
              {archivoCargado && <DashboardView planResult={planResult} onEjecutarPlan={ejecutarPlanificacion} />}
            </div>
          )}
          {archivoCargado && (
            <>
              {activeTab === "maestro" && (
                <MaestroView 
                  datosCrudos={datosCrudos.filter(orden => {
                    const deptoKey = Object.keys(orden).find(k => k.includes("DEPARTAMENTO")) || "";
                    return PlannerService.mapDepartamentoAPlanta(orden[deptoKey]) === plantaMaestro;
                  })}
                  plantas={plantas} plantaSeleccionada={plantaMaestro} onCambiarPlanta={setPlantaMaestro} 
                />
              )}
              {activeTab === "plan" && (
                <PlanificacionView 
                  planResult={planResult.filter(p => p.planta === plantaPlan)}
                  
                  // Filtro para el Panel Lateral (Órdenes pendientes)
                  planResultSinAsignar={planResultSinAsignar.filter(o => {
                    // 1. Intentamos obtener la planta desde el objeto ya procesado
                    if (o.planta) return o.planta === plantaPlan;
                    
                    // 2. Si es una OT Nueva/Sin procesar, mapeamos el departamento original
                    const deptoKey = Object.keys(o).find(k => k.includes("DEPARTAMENTO")) || "";
                    return PlannerService.mapDepartamentoAPlanta(o[deptoKey]) === plantaPlan;
                  })}
                  
                  setPlanResult={setPlanResult}
                  plantas={plantas} 
                  plantaSeleccionada={plantaPlan} 
                  onCambiarPlanta={setPlantaPlan}
                  empleadosMap={empleadosMap}
                  mapaHorarios={mapaHorariosActual}
                />
              )}

              {activeTab === "gantt" && (
                <HorariosView 
                  horariosResult={horariosResult} 
                  plantas={plantas}
                  plantaSeleccionada={plantaHorarios} 
                  onCambiarPlanta={cambiarPlantaHorarios} 
                  onCambioTurno={handleCambioTurno}
                />
              )}
            </>
          )}
          {activeTab === "atrasos" && atrasosResult.length > 0 && <SeguimientoOTsView data={atrasosResult} dataAnterior={atrasosAnterior} />}
          {activeTab === "seguimiento" && <SeguimientoView dataMantencion={seguimientoResult.mantencion} dataInfra={seguimientoResult.infraestructura} />}
        </section>
      </main>
    </div>
  );
}

export default App;