import { useState } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import * as XLSX from "xlsx";
import { 
  processExcelData, 
  obtenerHorariosPorPlanta, 
  obtenerMapaHorarios  
} from "./logic/excelProcessor";
import { PlannerService } from "./logic/PlannerService";
import { PlanResult, HorarioTecnico, FallaRow } from "./types"; // Asegúrate de importar FallaRow
import { FileUploader, FileType } from "./components/FileUploader";
import { DashboardView } from "./views/DashboardView";
import { HorariosView } from "./views/HorariosView";
import { PlanificacionView } from "./views/PlanificacionView";
// IMPORTANTE: Importamos solo el procesador unificado y su vista
import { processSeguimientoOTs, AtrasoRow } from "./logic/seguimientoOTsProcessor";
import { SeguimientoOTsView } from "./views/SeguimientoOTsView";

import { ModalAsignacionTecnico } from './components/planificacion/ModalAsignacionTecnico';
import { SeguimientoTecnicosView } from "./views/SeguimientoTecnicosView";
import {  
  necesitaValidacionTurno,  
} from "./utils/planificacionUtils";
import { processFallasData } from "./logic/fallasProcessor";
import { FallasView } from "./views/FallasView";

function App() {
  const [activeTab, setActiveTab] = useState("dash");
  
  // Estado Planificación
  const [planResult, setPlanResult] = useState<PlanResult[]>([]);
  const [planResultSinAsignar, setPlanResultSinAsignar] = useState<any[]>([]);
  const [horariosResult, setHorariosResult] = useState<HorarioTecnico[]>([]);
  const [workbookActual, setWorkbookActual] = useState<XLSX.WorkBook | null>(null);
  const [plantas] = useState(["PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"]);
  const [empleadosMap, setEmpleadosMap] = useState<Map<string, any>>(new Map());
  const [archivoCargado, setArchivoCargado] = useState(false);
  const [cargandoPlan, setCargandoPlan] = useState(false);
  const [plantaHorarios, setPlantaHorarios] = useState("PF3");
  const [plantaPlan, setPlantaPlan] = useState("PF3");
  const [mapaHorariosActual, setMapaHorariosActual] = useState<Map<string, string[]>>(new Map());
  const [fechaFoco, setFechaFoco] = useState<string | null>(null);

  // Estado Seguimiento (Unificado)
  const [atrasosResult, setAtrasosResult] = useState<AtrasoRow[]>([]);
  const [atrasosAnterior, setAtrasosAnterior] = useState<AtrasoRow[]>([]);
  const [cargandoAtrasos, setCargandoAtrasos] = useState(false);

  // Estado Fallas
  const [fallasResult, setFallasResult] = useState<FallaRow[]>([]);
  const [cargandoFallas, setCargandoFallas] = useState(false);

  // Estado UI
  const [modalTecnicoOpen, setModalTecnicoOpen] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState<any>(null);
  const [highlightedModule, setHighlightedModule] = useState<FileType | null>(null);

  const handleRequestUpload = (tipo: FileType) => {
    setHighlightedModule(tipo);
    const uploaderElement = document.getElementById("uploader-section");
    if (uploaderElement) {
        uploaderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedModule(null);
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR' | 'SEGUIMIENTO' | 'FALLAS') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipo === 'PLAN') setCargandoPlan(true);
    else if (tipo === 'FALLAS') setCargandoFallas(true);
    else setCargandoAtrasos(true); // 'ATRASOS', 'ANTERIOR' o 'SEGUIMIENTO' usan este loader

    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          if (tipo === 'PLAN') {
            setWorkbookActual(workbook);
            setHorariosResult(obtenerHorariosPorPlanta(workbook, plantaHorarios));
            setArchivoCargado(true);
            setPlanResult([]);
            setPlanResultSinAsignar([]);
          } 
          // UNIFICACIÓN: Tanto 'ATRASOS' como 'SEGUIMIENTO' usan el mismo procesador
          else if (tipo === 'ATRASOS' || tipo === 'SEGUIMIENTO') {
            const { actual, anterior } = processSeguimientoOTs(workbook.Sheets);
            setAtrasosResult(actual);
            setAtrasosAnterior(anterior);
            setActiveTab("atrasos");
          } 
          else if (tipo === 'ANTERIOR') {
            setAtrasosAnterior(processSeguimientoOTs(workbook.Sheets).actual);
          } 
          else if (tipo === 'FALLAS') {
            const datosFallas = processFallasData(workbook.Sheets);
            setFallasResult(datosFallas);
            if (datosFallas.length > 0) setActiveTab("fallas");
          }
        } catch (e) {
          console.error("Error:", e);
          alert("Error al leer el archivo.");
        } finally {
          setCargandoPlan(false);
          setCargandoAtrasos(false);
          setCargandoFallas(false);
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
    setFallasResult([]);
    setArchivoCargado(false);
    setActiveTab("dash");
  };

  const cambiarPlantaHorarios = (nueva: string) => {
    setPlantaHorarios(nueva);
    if (workbookActual) {
      setHorariosResult(obtenerHorariosPorPlanta(workbookActual, nueva));
    }
  };

  const ejecutarPlanificacion = (modo: 'STRICT' | 'BALANCED') => {
    if (workbookActual) {
      setCargandoPlan(true);
      setTimeout(() => {
        try {
          const { resultados, sinAsignar, empleadosMap: mapaCargado } = processExcelData(
            workbookActual.Sheets, 
            modo 
          );
          const horarios = obtenerMapaHorarios(workbookActual.Sheets);
          setPlanResult(resultados);
          setPlanResultSinAsignar(sinAsignar);
          setEmpleadosMap(mapaCargado);
          setMapaHorariosActual(horarios);
          setActiveTab("plan");
        } catch (error) {
          console.error("Error crítico en planificación:", error);
          alert("Ocurrió un error al procesar los datos.");
        } finally {
          setCargandoPlan(false);
        }
      }, 100);
    } else {
      alert("Por favor carga el archivo Maestro Plan primero.");
    }
  };

  const handleCambioTurno = (nombreTecnico: string, diaIndex: number) => {
    setHorariosResult((prev) => {
      return prev.map((tecnico) => {
        if (tecnico.nombre === nombreTecnico) {
          const ciclo = ['M', 'T', 'N', 'L', 'V'];
          const turnoActual = tecnico.turnos[diaIndex];
          const siguienteIndex = (ciclo.indexOf(turnoActual) + 1) % ciclo.length;
          const nuevosTurnos = [...tecnico.turnos];
          nuevosTurnos[diaIndex] = ciclo[siguienteIndex];
          return { ...tecnico, turnos: nuevosTurnos };
        }
        return tecnico;
      });
    });
  };

  const handleAsignarTecnico = (nroOrden: string, indexTecnico: number, nuevoNombre: string, esAutomatico: boolean = false) => {
      const actualizarOrden = (ot: any) => {
          const nuevosTecnicos = [...ot.tecnicos];
          nuevosTecnicos[indexTecnico] = {
              ...nuevosTecnicos[indexTecnico],
              nombre: nuevoNombre,
              esSugerido: esAutomatico
          };
          return { ...ot, tecnicos: nuevosTecnicos };
      };

      setPlanResult(prev => prev.map(ot => 
          ot.nroOrden === nroOrden ? actualizarOrden(ot) : ot
      ));

      setOrdenEditando((prev: any) => {
          if (prev && prev.nroOrden === nroOrden) {
              return actualizarOrden(prev);
          }
          return prev;
      });
  };

  const handleModificarCupos = (nroOrden: string, accion: 'ADD' | 'REMOVE', rol?: string, indice?: number) => {
    const actualizarOrden = (ot: any) => {
        const nuevosTecnicos = [...ot.tecnicos];
        if (accion === 'ADD' && rol) {
            nuevosTecnicos.push({ nombre: "VACANTE", rol: rol, turnos: null, existe: true });
        } else if (accion === 'REMOVE' && typeof indice === 'number') {
            nuevosTecnicos.splice(indice, 1);
        }
        return { ...ot, tecnicos: nuevosTecnicos };
    };

    setPlanResult(prev => prev.map(ot => ot.nroOrden === nroOrden ? actualizarOrden(ot) : ot));
    setOrdenEditando((prev: any) => (prev && prev.nroOrden === nroOrden ? actualizarOrden(prev) : prev));
  };

  const handleNavegarDesdeCarga = (plantaDestino: string, fechaDestino: string) => {
    setActiveTab("plan");
    setPlantaPlan(plantaDestino);
    setFechaFoco(fechaDestino);
  };

  const isNocheValid = (tecnicos: any[], fechaStr: string) => {
    if (!mapaHorariosActual || !tecnicos || tecnicos.length === 0) return false;
    return tecnicos.every((tec: any) => {
       if (["OT NUEVA", "SIN HISTORIAL", "VACANTE"].includes(tec.nombre)) return true;
       const datosEmp = empleadosMap.get(tec.nombre);
       const rolEmp = datosEmp ? datosEmp.rol : "M";
       if (!necesitaValidacionTurno(rolEmp)) return true;
       const turnos = mapaHorariosActual.get(tec.nombre);
       if (!turnos) return false; 
       const dia = parseInt(fechaStr.split('/')[0]);
       return turnos[dia - 1]?.trim().toUpperCase() === 'N';
    });
  };

  return (
    <div className="flex h-screen bg-pf-light text-slate-800 font-sans">
      <Sidebar 
        archivoCargado={archivoCargado || atrasosResult.length > 0} 
        tieneAtrasos={atrasosResult.length > 0}
        // Usamos la misma longitud para activar el botón, ya no hay distinción
        tieneSeguimiento={atrasosResult.length > 0} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLimpiar={limpiarDatos} 
        tieneFallas={fallasResult.length > 0}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <section className="flex-1 p-10 overflow-y-auto">
          
          {activeTab === "dash" && (
            <div className="space-y-10">
              <div className="bg-white p-8 rounded-3xl border border-pf-border shadow-sm">
                <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">Gestión de Datos</h2>
                <FileUploader 
                  onFileUpload={handleFileUpload} 
                  isLoading={cargandoPlan || cargandoAtrasos || cargandoFallas}
                  status={{ 
                    plan: archivoCargado, 
                    atrasos: atrasosResult.length > 0,
                    anterior: atrasosAnterior.length > 0 ,
                    seguimiento: atrasosResult.length > 0, // Unificado
                    fallas: fallasResult.length > 0
                  }}
                  highlightedModule={highlightedModule}
                />
              </div>

              <DashboardView 
                planResult={planResult} 
                onEjecutarPlan={ejecutarPlanificacion}
                atrasosResult={atrasosResult}
                fallasResult={fallasResult}
                setActiveTab={setActiveTab}
                archivoCargado={archivoCargado}
                onRequestUpload={handleRequestUpload}
              />
            </div>
          )}
          {archivoCargado && (
            <>
              {activeTab === "plan" && (
                <PlanificacionView 
                  planResult={planResult.filter(p => p.planta === plantaPlan)}
                  planResultSinAsignar={planResultSinAsignar.filter(o => {
                    if (o.planta) return o.planta === plantaPlan;
                    const deptoKey = Object.keys(o).find(k => k.includes("DEPARTAMENTO")) || "";
                    return PlannerService.mapDepartamentoAPlanta(o[deptoKey]) === plantaPlan;
                  })}
                  setPlanResult={setPlanResult}
                  plantas={plantas} 
                  plantaSeleccionada={plantaPlan} 
                  onCambiarPlanta={setPlantaPlan}
                  empleadosMap={empleadosMap}
                  mapaHorarios={mapaHorariosActual}
                  onEditTecnicos={(orden: any) => {
                      setOrdenEditando(orden);
                      setModalTecnicoOpen(true);
                  }}
                  fechaSeleccionada={fechaFoco}
                  isNocheValid={isNocheValid}
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

          {/* VISTA UNIFICADA: Si es "atrasos" o "seguimiento" mostramos la misma vista */}
          {(activeTab === "atrasos" || activeTab === "seguimiento") && atrasosResult.length > 0 && (
             <SeguimientoOTsView data={atrasosResult} dataAnterior={atrasosAnterior} />
          )}

          {activeTab === "carga" && (
            <SeguimientoTecnicosView 
                planResult={planResult} 
                plantas={plantas}
                onNavegar={handleNavegarDesdeCarga}
            />
          )}
          {activeTab === "fallas" && fallasResult.length > 0 && (
             <FallasView data={fallasResult} />
          )}
        </section>
      </main>

      <ModalAsignacionTecnico
        isOpen={modalTecnicoOpen}
        onClose={() => setModalTecnicoOpen(false)}
        orden={ordenEditando}
        fecha={ordenEditando?.fechaSugerida || ""}
        empleados={Array.from(empleadosMap.values()).map((v: any, i) => ({
             ...v, 
             key: Array.from(empleadosMap.keys())[i]
        }))} 
        mapaHorarios={mapaHorariosActual} 
        onAsignar={handleAsignarTecnico}
        onModificarCupos={handleModificarCupos}
      />
    </div>
  );
}

export default App;