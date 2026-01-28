import { useState, useMemo, useEffect } from "react";
import { Calendario } from "../components/planificacion/Calendario";
import { PanelLateral } from "../components/planificacion/PanelLateral";

export const PlanificacionView = ({ 
  planResult, 
  setPlanResult, 
  plantaSeleccionada, 
  plantas, 
  onCambiarPlanta, 
  empleadosMap, 
  planResultSinAsignar,
  mapaHorarios,
  onEditTecnicos
}: any) => {
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [draggingOT, setDraggingOT] = useState<any>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('dragover', preventDefault);
    document.addEventListener('drop', preventDefault);
    return () => {
      document.removeEventListener('dragover', preventDefault);
      document.removeEventListener('drop', preventDefault);
    };
  }, []);

  const datosOrdenados = useMemo(() => {
    return [...planResult].sort((a, b) => {
      const [dA, mA, aA] = a.fechaSugerida.split('/');
      const [dB, mB, aB] = b.fechaSugerida.split('/');
      return new Date(`${aA}-${mA}-${dA}`).getTime() - new Date(`${aB}-${mB}-${dB}`).getTime();
    });
  }, [planResult]);

  const ordenesPorDia = useMemo(() => {
    return datosOrdenados.reduce((acc: any, orden: any) => {
      const fecha = orden.fechaSugerida;
      if (!acc[fecha]) acc[fecha] = [];
      acc[fecha].push(orden);
      return acc;
    }, {});
  }, [datosOrdenados]);

  // --- LOGICA DRAG & DROP ---
  const handleDragStart = (e: React.DragEvent, ot: any) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(ot));
    e.dataTransfer.effectAllowed = "move";
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    setDraggingOT(ot);
  };

  const handleDragEnd = () => {
    setDraggingOT(null);
    setDragOverDate(null);
  };

  const handleDragEnter = (e: React.DragEvent, fecha: string) => {
    e.preventDefault();
    setDragOverDate(fecha);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, fechaDestino: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingOT) return;
    
    const existeEnPlan = planResult.some((p: any) => p.nroOrden === draggingOT.nroOrden);
    if (existeEnPlan) {
      setPlanResult(planResult.map((p: any) => 
        p.nroOrden === draggingOT.nroOrden ? { ...p, fechaSugerida: fechaDestino } : p
      ));
    } else {
      setPlanResult([...planResult, { ...draggingOT, fechaSugerida: fechaDestino }]);
    }
    
    setDraggingOT(null);
    setDragOverDate(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const isNocheValid = (tecnicos: any[], fechaStr: string) => {
    if (!mapaHorarios || !tecnicos || tecnicos.length === 0) return false;
    
    // Verificamos CADA técnico del grupo
    return tecnicos.every((tec: any) => {
       // Si es "OT NUEVA" o "SIN HISTORIAL", asumimos que es válido para no bloquear
       if (tec.nombre === "OT NUEVA" || tec.nombre === "SIN HISTORIAL") return true;

       const turnos = mapaHorarios.get(tec.nombre);
       if (!turnos) return false; // Si no tiene turnos cargados, falla
       
       const dia = parseInt(fechaStr.split('/')[0]);
       return turnos[dia - 1]?.trim().toUpperCase() === 'N';
    });
  };

  return (
    <div className="flex h-full gap-6 animate-in fade-in duration-500 relative select-none">
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
      />
      <PanelLateral 
        diaSeleccionado={diaSeleccionado}
        setDiaSeleccionado={setDiaSeleccionado}
        ordenesPorDia={ordenesPorDia}
        planResultSinAsignar={planResultSinAsignar}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        plantaSeleccionada={plantaSeleccionada}
        onEditTecnicos={onEditTecnicos}
      />
    </div>
  );
};