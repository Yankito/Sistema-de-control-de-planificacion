import { useEffect, useMemo, useState } from "react";
import "./App.css";
// ... imports ...
import { Sidebar } from "./shared/components/Sidebar";
import * as XLSX from "xlsx";
import { 
  processExcelData, 
  obtenerHorariosPorPlanta, 
  obtenerMapaHorarios  
} from "./modules/planificacion/logic/excelProcessor";
import { PlannerService } from "./modules/planificacion/logic/PlannerService";
import { AtrasoRow } from "./modules/seguimiento/types";
import {PlanResult, HorarioTecnico} from "./modules/planificacion/types";

import { FileUploader, FileType } from "./shared/components/FileUploader";
import { DashboardView } from "./views/DashboardView";
import { HorariosView } from "./modules/planificacion/views/HorariosView";
import { PlanificacionView } from "./modules/planificacion/views/PlanificacionView";
import { processSeguimientoOTs } from "./modules/seguimiento/logic/seguimientoOTsProcessor";
import { SeguimientoOTsView } from "./modules/seguimiento/views/SeguimientoOTsView";
import { ModalAsignacionTecnico } from './modules/planificacion/components/ModalAsignacionTecnico';
import { SeguimientoTecnicosView } from "./modules/planificacion/views/SeguimientoTecnicosView";
import { necesitaValidacionTurno } from "./modules/planificacion/utils/planificacionUtils";
import { processFallasData } from "./modules/fallas/logic/fallasProcessor";
import { FallasView } from "./modules/fallas/views/FallasView";
import { FallaRow } from "./modules/fallas/types";
import { DatabaseService } from "./shared/db/DatabaseService";
import { getWeekOptions } from "./shared/utils/dateUtils";

function App() {
  const [activeTab, setActiveTab] = useState("dash");
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
  
  // --- ESTADOS DE SEGUIMIENTO ---
  const [atrasosResult, setAtrasosResult] = useState<AtrasoRow[]>([]);
  const [atrasosAnterior, setAtrasosAnterior] = useState<AtrasoRow[]>([]);
  const [dataCumplimiento, setDataCumplimiento] = useState<AtrasoRow[]>([]);
  const [cargandoAtrasos, setCargandoAtrasos] = useState(false);
  const [historialSemanas, setHistorialSemanas] = useState<string[]>([]);
  
  const [fallasResult, setFallasResult] = useState<FallaRow[]>([]);
  const [cargandoFallas, setCargandoFallas] = useState(false);
  const [modalTecnicoOpen, setModalTecnicoOpen] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState<any>(null);
  const [highlightedModule, setHighlightedModule] = useState<FileType | null>(null);

  const weekConfig = useMemo(() => getWeekOptions(), []);
  const [targetUploadWeek, setTargetUploadWeek] = useState(weekConfig.default);

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

  useEffect(() => {
    const initApp = async () => {
        await DatabaseService.init();
        await actualizarListaSemanas();
        try {
            const lastData = await DatabaseService.getLatestSnapshot('ATRASOS');
            if (lastData.length > 0) {
                setAtrasosResult(lastData);
                if (lastData[0]?.semana) {
                    // Cargar comparativa
                    cargarComparativaAutomatica(lastData[0].semana);
                    // Cargar cumplimiento de la misma semana
                    const lastCumple = await DatabaseService.getSnapshot(lastData[0].semana, 'CUMPLIMIENTO');
                    setDataCumplimiento(lastCumple);
                }
                setActiveTab("atrasos"); 
            }
        } catch (e) {
            console.log("No hay datos previos guardados.");
        }
    };
    initApp();
  }, []);

  // Función para cargar datos desde el historial (Vista)
  const cargarSemanaPrincipal = async (semanaSeleccionada: string) => {
      if (!semanaSeleccionada) return;
      setCargandoAtrasos(true);
      try {
          // 1. Cargar Atrasos
          const datos = await DatabaseService.getSnapshot(semanaSeleccionada, 'ATRASOS');
          setAtrasosResult(datos);
          
          // 2. Cargar Cumplimiento (Para el análisis de flujo)
          const cumple = await DatabaseService.getSnapshot(semanaSeleccionada, 'CUMPLIMIENTO');
          setDataCumplimiento(cumple);

          // 3. Cargar Anterior (Para comparativa)
          cargarComparativaAutomatica(semanaSeleccionada);
      } catch (e) {
          console.error(e);
      } finally {
          setCargandoAtrasos(false);
      }
  };

  const cargarComparativaAutomatica = async (semanaActual: string) => {
      const match = semanaActual.match(/S(\d+)/i); 
      const numSemana = match ? parseInt(match[1]) : NaN;

      if (!isNaN(numSemana) && numSemana > 1) {
          const prevLabel = `${semanaActual.split('-')[0]}-S${(numSemana - 1).toString().padStart(2, '0')}`;
          const disponibles = await DatabaseService.getSemanasDisponibles('ATRASOS');
          const found = disponibles.find(s => s === prevLabel);
          
          if (found) {
              const prevData = await DatabaseService.getSnapshot(found, 'ATRASOS');
              setAtrasosAnterior(prevData);
          } else {
              setAtrasosAnterior([]);
          }
      }
  };
  
  const actualizarListaSemanas = async () => {
      const semanas = await DatabaseService.getSemanasDisponibles('ATRASOS');
      setHistorialSemanas(semanas);
  };

  const handleCambiarComparacionManual = (nuevaDataAnterior: AtrasoRow[]) => {
    setAtrasosAnterior(nuevaDataAnterior);
  };

  const handleReporteEliminado = () => {
      actualizarListaSemanas();
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR' | 'SEGUIMIENTO' | 'FALLAS') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipo === 'PLAN') setCargandoPlan(true);
    else if (tipo === 'FALLAS') setCargandoFallas(true);
    else setCargandoAtrasos(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(async () => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          if (tipo === 'ATRASOS' || tipo === 'SEGUIMIENTO') {
            // Procesamos usando la nueva lógica que devuelve RAW y procesado
            const { actual, activos, masivoRaw, cumplimientoRaw } = processSeguimientoOTs(workbook.Sheets);
            
            // 1. Guardar Activos
            if (activos && activos.length > 0) {
                await DatabaseService.guardarActivos(activos);
            }

            // 2. Guardar Atrasos (Vista Procesada)
            await DatabaseService.guardarSnapshot(targetUploadWeek, 'ATRASOS', actual);

            // 3. Guardar RAW DATA (Fuente de verdad)
            if (masivoRaw && masivoRaw.length > 0) {
                await DatabaseService.guardarMasivoRaw(targetUploadWeek, masivoRaw);
            }
            if (cumplimientoRaw && cumplimientoRaw.length > 0) {
                await DatabaseService.guardarCumplimientoRaw(targetUploadWeek, cumplimientoRaw);
                
                // 4. Crear Snapshot de Cumplimiento para la UI (Mapeo rápido)
                // Convertimos la data cruda a AtrasoRow para que la UI pueda leerla uniformemente
                const cumplimientoSnapshot: AtrasoRow[] = cumplimientoRaw.map(c => ({
                    planta: c.planta,
                    ot: c.nro_ot,
                    descripcion: "Desde Cumplimiento",
                    estado: c.estado_om,
                    clasificacion: "CUMPLIDA",
                    esOB: c.tipo.includes("OB"),
                    periodo: targetUploadWeek.split('-')[0], 
                    semana: targetUploadWeek,
                    rmd: "SI", rse: "SI", detallesTecnicos: []
                }));
                
                console.log(`[APP] Guardando ${cumplimientoSnapshot.length} registros de cumplimiento...`);
                await DatabaseService.guardarSnapshot(targetUploadWeek, 'CUMPLIMIENTO', cumplimientoSnapshot);
                setDataCumplimiento(cumplimientoSnapshot); // Actualizamos estado
            }

            await actualizarListaSemanas();
            setAtrasosResult(actual); 
            await cargarComparativaAutomatica(targetUploadWeek);
            setActiveTab("atrasos");
          }
          else if (tipo === 'PLAN') {
            setWorkbookActual(workbook);
            setHorariosResult(obtenerHorariosPorPlanta(workbook, plantaHorarios));
            setArchivoCargado(true);
            setPlanResult([]);
            setPlanResultSinAsignar([]);
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

  // ... (Funciones auxiliares de planificación)
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
          const { resultados, sinAsignar, empleadosMap: mapaCargado } = processExcelData(workbookActual.Sheets, modo);
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
          nuevosTecnicos[indexTecnico] = { ...nuevosTecnicos[indexTecnico], nombre: nuevoNombre, esSugerido: esAutomatico };
          return { ...ot, tecnicos: nuevosTecnicos };
      };
      setPlanResult(prev => prev.map(ot => ot.nroOrden === nroOrden ? actualizarOrden(ot) : ot));
      setOrdenEditando((prev: any) => { if (prev && prev.nroOrden === nroOrden) { return actualizarOrden(prev); } return prev; });
  };

  const handleModificarCupos = (nroOrden: string, accion: 'ADD' | 'REMOVE', rol?: string, indice?: number) => {
    const actualizarOrden = (ot: any) => {
        const nuevosTecnicos = [...ot.tecnicos];
        if (accion === 'ADD' && rol) { nuevosTecnicos.push({ nombre: "VACANTE", rol: rol, turnos: null, existe: true }); } 
        else if (accion === 'REMOVE' && typeof indice === 'number') { nuevosTecnicos.splice(indice, 1); }
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
                  status={{ plan: archivoCargado, atrasos: atrasosResult.length > 0, anterior: atrasosAnterior.length > 0, seguimiento: atrasosResult.length > 0, fallas: fallasResult.length > 0 }}
                  highlightedModule={highlightedModule}
                  targetWeek={targetUploadWeek}
                  setTargetWeek={setTargetUploadWeek}
                  weekOptions={weekConfig.options}
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
                  planResultSinAsignar={planResultSinAsignar.filter(o => { if (o.planta) return o.planta === plantaPlan; const deptoKey = Object.keys(o).find(k => k.includes("DEPARTAMENTO")) || ""; return PlannerService.mapDepartamentoAPlanta(o[deptoKey]) === plantaPlan; })}
                  setPlanResult={setPlanResult}
                  plantas={plantas} 
                  plantaSeleccionada={plantaPlan} 
                  onCambiarPlanta={setPlantaPlan}
                  empleadosMap={empleadosMap}
                  mapaHorarios={mapaHorariosActual}
                  onEditTecnicos={(orden: any) => { setOrdenEditando(orden); setModalTecnicoOpen(true); }}
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
          {(activeTab === "atrasos" || activeTab === "seguimiento") && atrasosResult.length > 0 && (
             <SeguimientoOTsView 
                data={atrasosResult} 
                dataAnterior={atrasosAnterior}
                historialCompleto={historialSemanas}
                onCargarSemana={cargarSemanaPrincipal}
                onCambioComparacion={handleCambiarComparacionManual}
                onReporteEliminado={handleReporteEliminado}
                // PASAMOS LA DATA DE CUMPLIMIENTO AL COMPONENTE HIJO
                currentCumplimiento={dataCumplimiento} 
             />
          )}
          {activeTab === "carga" && (<SeguimientoTecnicosView planResult={planResult} plantas={plantas} onNavegar={handleNavegarDesdeCarga} />)}
          {activeTab === "fallas" && fallasResult.length > 0 && (<FallasView data={fallasResult} />)}
        </section>
      </main>
      <ModalAsignacionTecnico
        isOpen={modalTecnicoOpen}
        onClose={() => setModalTecnicoOpen(false)}
        orden={ordenEditando}
        fecha={ordenEditando?.fechaSugerida || ""}
        empleados={Array.from(empleadosMap.values()).map((v: any, i) => ({ ...v, key: Array.from(empleadosMap.keys())[i] }))} 
        mapaHorarios={mapaHorariosActual} 
        onAsignar={handleAsignarTecnico}
        onModificarCupos={handleModificarCupos}
      />
    </div>
  );
}

export default App;