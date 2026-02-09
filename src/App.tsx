import { useEffect, useState, useMemo } from "react";
import "./App.css";

// Components
import { Sidebar } from "./shared/components/Sidebar";
import { FileUploader, FileType } from "./shared/components/FileUploader";
import { DashboardView } from "./shared/views/DashboardView";
import { HorariosView } from "./modules/planificacion/views/HorariosView";
import { PlanificacionView } from "./modules/planificacion/views/PlanificacionView";
import { SeguimientoOTsView } from "./modules/seguimiento/views/SeguimientoOTsView";
import { ModalAsignacionTecnico } from './modules/planificacion/components/ModalAsignacionTecnico';
import { SeguimientoTecnicosView } from "./modules/planificacion/views/SeguimientoTecnicosView";
import { FallasView } from "./modules/fallas/views/FallasView";

// Services & Utils
import { DatabaseService } from "./shared/db/DatabaseService";
import { getWeekOptions } from "./shared/utils/dateUtils";
import { necesitaValidacionTurno } from "./modules/planificacion/utils/planificacionUtils";

// Custom Hooks
import { usePlanificacionManager } from "./hooks/usePlanificacionManager";
import { useFileProcessor } from "./hooks/useFileProcessor";
import { useSeguimientoData } from "./modules/seguimiento/hooks/useSeguimientoData";

// Tipos
import { FallaRow } from "./modules/fallas/types";

function App() {
  const [activeTab, setActiveTab] = useState("dash");
  const [historialSemanas, setHistorialSemanas] = useState<string[]>([]);
  const weekConfig = useMemo(() => getWeekOptions(), []);
  const [targetUploadWeek, setTargetUploadWeek] = useState(weekConfig.default);
  const [highlightedModule, setHighlightedModule] = useState<FileType | null>(null);

  const planning = usePlanificacionManager();

  const [fallasResult, setFallasResult] = useState<FallaRow[]>([]);

  const seguimiento = useSeguimientoData(historialSemanas);

  // GESTIÓN DE ARCHIVOS 
  const fileProcessor = useFileProcessor({
    targetWeek: targetUploadWeek,
    setActiveTab,
    onPlanLoaded: planning.cargarDatosDesdeExcel,
    onFallasLoaded: setFallasResult,
    onSeguimientoLoaded: () => {
      const initData = async () => {
        try {
          const semanas = await DatabaseService.getSemanasDisponibles('SEGUIMIENTO');
          setHistorialSemanas(semanas);
          await seguimiento.cargarReporte(targetUploadWeek);
        } catch (error) {
          console.error("Error cargando seguimiento:", error);
        }
      };
      initData();
    }
  });

  // EFECTOS INICIALES
  useEffect(() => {
    const initApp = async () => {
      await DatabaseService.init();
      const semanas = await DatabaseService.getSemanasDisponibles('SEGUIMIENTO');
      setHistorialSemanas(semanas);

      if (semanas.length > 0) {
        const ultimaSemana = semanas[0];
        await seguimiento.cargarReporte(ultimaSemana);

        // Si hay una semana anterior, la cargamos automáticamente para el Dashboard
        if (semanas.length > 1) {
          await seguimiento.cambiarComparacion(semanas[1]);
        }

        setActiveTab("seguimiento");
      }
    };
    initApp();
  }, []);

  //  UTILS DE UI 
  const handleRequestUpload = (tipo: FileType) => {
    setHighlightedModule(tipo);
    document.getElementById("uploader-section")?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedModule(null), 2000);
  };

  const handleLimpiarTodo = () => {
    planning.reset();
    setFallasResult([]);
    seguimiento.resetTodo();
    setActiveTab("dash");
  };

  // Helper para validación de noche
  const isNocheValid = (tecnicos: any[], fechaStr: string) => {
    if (!planning.mapaHorariosActual || !tecnicos || tecnicos.length === 0) return false;
    return tecnicos.every((tec: any) => {
      if (["OT NUEVA", "SIN HISTORIAL", "VACANTE"].includes(tec.nombre)) return true;
      const datosEmp = planning.empleadosMap.get(tec.nombre);
      const rolEmp = datosEmp ? datosEmp.rol : "M";
      if (!necesitaValidacionTurno(rolEmp)) return true;
      const turnos = planning.mapaHorariosActual.get(tec.nombre);
      if (!turnos) return false;
      const dia = parseInt(fechaStr.split('/')[0]);
      return turnos[dia - 1]?.trim().toUpperCase() === 'N';
    });
  };

  // Plantas estáticas
  const plantas = ["PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"];

  return (
    <div className="flex h-screen bg-pf-light text-slate-800 font-sans">
      <Sidebar
        archivoCargado={!!planning.workbookActual}
        tieneSeguimiento={historialSemanas.length > 0}
        tieneFallas={fallasResult.length > 0}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLimpiar={handleLimpiarTodo}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <section className="flex-1 p-10 overflow-y-auto">

          {/* VISTA: DASHBOARD & UPLOAD */}
          {activeTab === "dash" && (
            <div className="space-y-10">
              <div className="bg-white p-8 rounded-3xl border border-pf-border shadow-sm">
                <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">Gestión de Datos</h2>
                <FileUploader
                  onFileUpload={fileProcessor.handleFileUpload}
                  isLoading={planning.cargandoPlan || fileProcessor.loading.seguimiento || fileProcessor.loading.fallas}
                  status={{
                    plan: !!planning.workbookActual,
                    seguimiento: historialSemanas.length > 0,
                    fallas: fallasResult.length > 0
                  }}
                  highlightedModule={highlightedModule}
                  targetWeek={targetUploadWeek}
                  setTargetWeek={setTargetUploadWeek}
                  weekOptions={weekConfig.options}
                />
              </div>
              <DashboardView
                planResult={planning.planResult}
                onEjecutarPlan={(modo) => {
                  planning.ejecutarPlanificacion(modo);
                  setActiveTab("plan");
                }}
                seguimientoResult={seguimiento.dataActual}
                seguimientoPrevio={seguimiento.dataAnterior}

                reporteActual={seguimiento.reporteActual}
                semanaComparar={seguimiento.semanaComparar}

                fallasResult={fallasResult}
                setActiveTab={setActiveTab}
                archivoCargado={!!planning.workbookActual}
                onRequestUpload={handleRequestUpload}
              />
            </div>
          )}

          {/* VISTA: PLANIFICACIÓN */}
          {planning.workbookActual && (
            <>
              {activeTab === "plan" && (
                <PlanificacionView
                  planResult={planning.planFiltrado}
                  planResultSinAsignar={planning.sinAsignarFiltrado}
                  setPlanResult={planning.setPlanResult}
                  plantas={plantas}
                  plantaSeleccionada={planning.plantaPlan}
                  onCambiarPlanta={planning.setPlantaPlan}
                  empleadosMap={planning.empleadosMap}
                  mapaHorarios={planning.mapaHorariosActual}
                  onEditTecnicos={(orden: any) => {
                    planning.setOrdenEditando(orden);
                    planning.setModalTecnicoOpen(true);
                  }}
                  fechaSeleccionada={planning.fechaFoco}
                  isNocheValid={isNocheValid}
                />
              )}
              {activeTab === "gantt" && (
                <HorariosView
                  horariosResult={planning.horariosResult}
                  plantas={plantas}
                  plantaSeleccionada={planning.plantaHorarios}
                  onCambiarPlanta={planning.cambiarPlantaHorarios}
                  onCambioTurno={planning.handleCambioTurno}
                />
              )}
              {activeTab === "carga" && (
                <SeguimientoTecnicosView
                  planResult={planning.planResult}
                  plantas={plantas}
                  onNavegar={(p, f) => {
                    setActiveTab("plan");
                    planning.setPlantaPlan(p);
                    planning.setFechaFoco(f);
                  }}
                />
              )}
            </>
          )}

          {/* VISTA: SEGUIMIENTO */}
          {activeTab === "seguimiento" && (
            <SeguimientoOTsView
              seguimientoData={seguimiento}
              historialCompleto={historialSemanas}
              onReporteEliminado={async () => {
                const semanas = await DatabaseService.getSemanasDisponibles('SEGUIMIENTO');
                setHistorialSemanas(semanas);
                if (semanas.length === 0) setActiveTab("dash");
              }}
            />
          )}

          {/* VISTA: FALLAS */}
          {activeTab === "fallas" && fallasResult.length > 0 && (
            <FallasView data={fallasResult} />
          )}

        </section>
      </main>

      <ModalAsignacionTecnico
        isOpen={planning.modalTecnicoOpen}
        onClose={() => planning.setModalTecnicoOpen(false)}
        orden={planning.ordenEditando}
        fecha={planning.ordenEditando?.fechaSugerida || ""}
        empleados={Array.from(planning.empleadosMap.values()).map((v: any, i) => ({ ...v, key: Array.from(planning.empleadosMap.keys())[i] }))}
        mapaHorarios={planning.mapaHorariosActual}
        onAsignar={planning.handleAsignarTecnico}
        onModificarCupos={planning.handleModificarCupos}
      />
    </div>
  );
}

export default App;