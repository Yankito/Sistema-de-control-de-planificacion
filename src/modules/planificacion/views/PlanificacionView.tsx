import { Calendario } from "../components/Calendario";
import { PanelLateral } from "../components/PanelLateral";
import { Wand2 } from "lucide-react";
import { usePlanificacionLogic } from "../hooks/usePlanificacionLogic"; // Importa el hook creado

export const PlanificacionView = ({ 
  planResult, 
  setPlanResult, 
  plantaSeleccionada, 
  plantas, 
  onCambiarPlanta, 
  empleadosMap, 
  planResultSinAsignar,
  mapaHorarios,
  onEditTecnicos,
  fechaSeleccionada,
  isNocheValid
}: any) => {
  
  // Usamos el hook personalizado para toda la lógica
  const {
    diaSeleccionado, setDiaSeleccionado,
    draggingOT,
    dragOverDate,
    showSuccess,
    mensajeExito,
    mostrarSoloVacantes, setMostrarSoloVacantes,
    ordenesPorDia,
    handleSugerirTodo,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragOver,
    handleDrop
  } = usePlanificacionLogic({
    planResult,
    setPlanResult,
    fechaSeleccionada,
    empleadosMap,
    mapaHorarios
  });

  return (
    <div className="flex h-full gap-6 animate-in fade-in duration-500 relative select-none">
      
      <div className="flex-1 flex flex-col gap-6 relative">
         {/* BARRA DE ACCIONES SUPERIOR */}
         <div className="flex justify-end mb-[-60px] relative z-20 px-8 pointer-events-none">
            <button 
                onClick={handleSugerirTodo}
                className="pointer-events-auto bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-900/20 transition-all transform hover:scale-105 active:scale-95"
            >
                <Wand2 size={16} />
                Auto-Completar Vacantes
            </button>
         </div>

         <Calendario 
            planResult={planResult}
            plantaSeleccionada={plantaSeleccionada}
            plantas={plantas}
            onCambiarPlanta={onCambiarPlanta}
            diaSeleccionado={diaSeleccionado}
            setDiaSeleccionado={setDiaSeleccionado}
            draggingOT={draggingOT}
            handleDragEnter={handleDragEnter}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            isNocheValid={isNocheValid}
            showSuccess={showSuccess}
            dragOverDate={dragOverDate}
            ordenesPorDia={ordenesPorDia}
            mostrarSoloVacantes={mostrarSoloVacantes}
            setMostrarSoloVacantes={setMostrarSoloVacantes}
            mensajeExito={mensajeExito} 
         />
      </div>

      <PanelLateral 
        diaSeleccionado={diaSeleccionado}
        setDiaSeleccionado={setDiaSeleccionado}
        ordenesPorDia={ordenesPorDia}
        planResultSinAsignar={planResultSinAsignar}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        plantaSeleccionada={plantaSeleccionada}
        onEditTecnicos={onEditTecnicos}
        mostrarSoloVacantes={mostrarSoloVacantes}
      />
    </div>
  );
};