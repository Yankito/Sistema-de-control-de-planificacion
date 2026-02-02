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
import { PlanResult, HorarioTecnico } from "./types";
import { FileUploader, FileType } from "./components/FileUploader";
import { DashboardView } from "./views/DashboardView";
import { HorariosView } from "./views/HorariosView";
import { PlanificacionView } from "./views/PlanificacionView";
import { processSeguimientoOTs } from "./logic/seguimientoOTsProcessor";
import { SeguimientoOTsView } from "./views/SeguimientoOTsView";
import { processSeguimiento } from "./logic/seguimientoProcessor";
import { SeguimientoView } from "./views/SeguimientoView";
import { SeguimientoResult } from "./types";
import { AtrasoRow } from "./logic/atrasosProcessor";
import { ModalAsignacionTecnico } from './components/planificacion/ModalAsignacionTecnico';
import { SeguimientoTecnicosView } from "./views/SeguimientoTecnicosView";
import {  
  necesitaValidacionTurno,  
} from "./utils/planificacionUtils";
import { processFallasData } from "./logic/fallasProcessor";
import { FallasView } from "./views/FallasView";
import { FallaRow } from "./types"; // Asegúrate de importar esto

function App() {
  const [activeTab, setActiveTab] = useState("dash");
  const [planResult, setPlanResult] = useState<PlanResult[]>([]);
  const [planResultSinAsignar, setPlanResultSinAsignar] = useState<any[]>([]);
  const [horariosResult, setHorariosResult] = useState<HorarioTecnico[]>([]);
  const [workbookActual, setWorkbookActual] = useState<XLSX.WorkBook | null>(null);
  const [plantas] = useState(["PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"]);
  const [empleadosMap, setEmpleadosMap] = useState<Map<string, any>>(new Map());
  const [archivoCargado, setArchivoCargado] = useState(false);
  const [atrasosResult, setAtrasosResult] = useState<AtrasoRow[]>([]);
  const [atrasosAnterior, setAtrasosAnterior] = useState<AtrasoRow[]>([]);
  const [cargandoPlan, setCargandoPlan] = useState(false);
  const [cargandoAtrasos, setCargandoAtrasos] = useState(false);
  const [plantaHorarios, setPlantaHorarios] = useState("PF3");
  const [plantaPlan, setPlantaPlan] = useState("PF3");
  const [seguimientoResult, setSeguimientoResult] = useState<SeguimientoResult>({ mantencion: [], infraestructura: [] });
  const [cargandoSeguimiento, setCargandoSeguimiento] = useState(false);
  const [mapaHorariosActual, setMapaHorariosActual] = useState<Map<string, string[]>>(new Map());
  const [fechaFoco, setFechaFoco] = useState<string | null>(null);

  // ESTADOS PARA EL MODAL DE ASIGNACIÓN
  const [modalTecnicoOpen, setModalTecnicoOpen] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState<any>(null);

  const [fallasResult, setFallasResult] = useState<FallaRow[]>([]);
  const [cargandoFallas, setCargandoFallas] = useState(false);

  const [highlightedModule, setHighlightedModule] = useState<FileType | null>(null);

  // NUEVA FUNCIÓN: Maneja la solicitud de subida
  const handleRequestUpload = (tipo: FileType) => {
    setHighlightedModule(tipo);
    
    // Scrollear hacia arriba para que el usuario vea el uploader
    const uploaderElement = document.getElementById("uploader-section");
    if (uploaderElement) {
        uploaderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Quitar el resaltado después de 2 segundos
    setTimeout(() => {
      setHighlightedModule(null);
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR' | 'SEGUIMIENTO' | 'FALLAS') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipo === 'PLAN') setCargandoPlan(true);
    else if (tipo === 'SEGUIMIENTO') setCargandoSeguimiento(true);
    else if (tipo === 'FALLAS') setCargandoFallas(true);
    else setCargandoAtrasos(true);

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
          } else if (tipo === 'FALLAS') {
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
          setCargandoSeguimiento(false);
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
    setArchivoCargado(false);
    setActiveTab("dash");
    setSeguimientoResult({ mantencion: [], infraestructura: [] });
    setFallasResult([]);
  };

  const cambiarPlantaHorarios = (nueva: string) => {
    setPlantaHorarios(nueva);
    if (workbookActual) {
      setHorariosResult(obtenerHorariosPorPlanta(workbookActual, nueva));
    }
  };

  // --- EJECUCIÓN DE PLANIFICACIÓN (CONECTADA AL DASHBOARD) ---
  const ejecutarPlanificacion = (modo: 'STRICT' | 'BALANCED') => {
    if (workbookActual) {
      // 1. Activar estado de carga para feedback visual (opcional)
      setCargandoPlan(true);

      // 2. Usamos setTimeout para que React pueda renderizar el estado de "Cargando..."
      // antes de que el cálculo pesado congele momentáneamente el navegador.
      setTimeout(() => {
        try {
          console.log(`Ejecutando algoritmo: ${modo}`);

          // 3. Llamamos al procesador pasando el MODO seleccionado
          const { resultados, sinAsignar, empleadosMap: mapaCargado } = processExcelData(
            workbookActual.Sheets, 
            modo 
          );
          
          const horarios = obtenerMapaHorarios(workbookActual.Sheets);
          
          // 4. Actualizamos todos los estados con la nueva data calculada
          setPlanResult(resultados);
          setPlanResultSinAsignar(sinAsignar);
          setEmpleadosMap(mapaCargado);
          setMapaHorariosActual(horarios);
          
          // 5. Navegación Automática: Llevamos al usuario a la vista de resultados
          setActiveTab("plan");
          
          // Opcional: Mostrar un toast o alerta de éxito
          // alert(`Planificación ${modo === 'STRICT' ? 'Estricta' : 'Balanceada'} generada con éxito.`);

        } catch (error) {
          console.error("Error crítico en planificación:", error);
          alert("Ocurrió un error al procesar los datos. Revisa la consola.");
        } finally {
          // 6. Desactivar carga
          setCargandoPlan(false);
        }
      }, 100);
    } else {
      alert("Por favor carga el archivo Maestro Plan primero.");
    }
  };

  // --- MANEJO DE CAMBIO DE TURNO (HORARIOS VIEW) ---
  const handleCambioTurno = (nombreTecnico: string, diaIndex: number) => {
    setHorariosResult((prev) => {
      return prev.map((tecnico) => {
        if (tecnico.nombre === nombreTecnico) {
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

  // --- MANEJO DE ASIGNACIÓN DE TÉCNICO (MODAL) ---
  const handleAsignarTecnico = (nroOrden: string, indexTecnico: number, nuevoNombre: string, esAutomatico: boolean = false) => {
    
      // Función auxiliar para actualizar
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

      // Actualizar también el estado local del modal para verlo reflejado al instante
      setOrdenEditando((prev: any) => {
          if (prev && prev.nroOrden === nroOrden) {
              return actualizarOrden(prev);
          }
          return prev;
      });
  };


  const handleModificarCupos = (nroOrden: string, accion: 'ADD' | 'REMOVE', rol?: string, indice?: number) => {
    // Función auxiliar para actualizar una orden específica
    const actualizarOrden = (ot: any) => {
        const nuevosTecnicos = [...ot.tecnicos];
        
        if (accion === 'ADD' && rol) {
            // Agregamos un nuevo slot vacante con el rol pedido
            nuevosTecnicos.push({
                nombre: "VACANTE",
                rol: rol,
                turnos: null,
                existe: true
            });
        } else if (accion === 'REMOVE' && typeof indice === 'number') {
            // Eliminamos el slot del índice indicado
            nuevosTecnicos.splice(indice, 1);
        }
        
        return { ...ot, tecnicos: nuevosTecnicos };
    };

    // Actualizamos el estado principal (PlanResult)
    setPlanResult(prev => prev.map(ot => 
        ot.nroOrden === nroOrden ? actualizarOrden(ot) : ot
    ));

    // Y también actualizamos la orden que se está editando en el modal
    setOrdenEditando((prev: any) => {
        if (prev && prev.nroOrden === nroOrden) {
            return actualizarOrden(prev);
        }
        return prev;
    });
  };

  const handleNavegarDesdeCarga = (plantaDestino: string, fechaDestino: string) => {
    // Cambiamos a la tab de planificación
    setActiveTab("plan");

    // Cambiamos la planta para ver la orden correcta
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
        tieneSeguimiento={seguimientoResult.mantencion.length > 0}
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
                
                {/* Pasamos la prop de resaltado al Uploader */}
                <FileUploader 
                  onFileUpload={handleFileUpload} 
                  isLoading={cargandoPlan || cargandoAtrasos || cargandoSeguimiento || cargandoFallas}
                  status={{ 
                    plan: archivoCargado, 
                    atrasos: atrasosResult.length > 0,
                    anterior: atrasosAnterior.length > 0 ,
                    seguimiento: seguimientoResult.mantencion.length > 0,
                    fallas: fallasResult.length > 0
                  }}
                  highlightedModule={highlightedModule} // <--- AQUÍ
                />
              </div>

              {/* MUESTRA EL DASHBOARD SIEMPRE (Quitamos la condición {archivoCargado && ...}) */}
              <DashboardView 
                planResult={planResult} 
                onEjecutarPlan={ejecutarPlanificacion}
                atrasosResult={atrasosResult}
                fallasResult={fallasResult}
                setActiveTab={setActiveTab}
                archivoCargado={archivoCargado}
                onRequestUpload={handleRequestUpload} // <--- AQUÍ
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
          {activeTab === "atrasos" && atrasosResult.length > 0 && <SeguimientoOTsView data={atrasosResult} dataAnterior={atrasosAnterior} />}
          {activeTab === "seguimiento" && <SeguimientoView dataMantencion={seguimientoResult.mantencion} dataInfra={seguimientoResult.infraestructura} />}
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