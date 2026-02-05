// src/hooks/usePlanificacionLogic.ts
import { useState, useMemo, useEffect } from "react";
import { 
  esPlantaCompatible, 
  rolesCoinciden, 
  necesitaValidacionTurno 
} from "../utils/planificacionUtils"; 

const BLOQUEOS_SABADO = ['L', 'V', 'LIC', 'LM', 'LP'];

export const usePlanificacionLogic = ({
  planResult,
  setPlanResult,
  fechaSeleccionada,
  empleadosMap,
  mapaHorarios
}: any) => {
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [draggingOT, setDraggingOT] = useState<any>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("Planificación Actualizada");
  const [mostrarSoloVacantes, setMostrarSoloVacantes] = useState(false);

  // Sincronizar fecha seleccionada externa
  useEffect(() => {
    if (fechaSeleccionada) {
      setDiaSeleccionado(fechaSeleccionada);
    }
  }, [fechaSeleccionada]);

  // Manejo de eventos globales de Drag & Drop
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('dragover', preventDefault);
    document.addEventListener('drop', preventDefault);
    return () => {
      document.removeEventListener('dragover', preventDefault);
      document.removeEventListener('drop', preventDefault);
    };
  }, []);

  // Procesamiento de datos para el calendario
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

  // Lógica de Sugerencia Automática (Magic Wand)
  const handleSugerirTodo = () => {
    let cambiosRealizados = 0;
    const listaEmpleados = Array.from(empleadosMap.values()).map((v: any, i) => ({
        ...v, 
        key: Array.from(empleadosMap.keys())[i]
    }));

    const ordenesActualizadas = planResult.map((ot: any) => {
        const tieneVacantes = ot.tecnicos.some((t: any) => t.nombre === 'VACANTE');
        if (!tieneVacantes) return ot;

        const [d, m, y] = ot.fechaSugerida.split('/').map(Number);
        const diaIndex = d - 1;
        const esSabado = new Date(y, m - 1, d).getDay() === 6;

        const asignados = ot.tecnicos.map((t: any) => t.nombre).filter((n: string) => n !== 'VACANTE');

        const nuevosTecnicos = ot.tecnicos.map((slot: any) => {
            if (slot.nombre !== 'VACANTE') return slot;

            const rolRequerido = slot.rol;
            
            // Filtro de candidatos
            const candidatos = listaEmpleados.filter((emp: any) => 
                rolesCoinciden(rolRequerido, emp.rol) && esPlantaCompatible(emp.planta, ot.planta)
            );

            const mejorCandidato = candidatos.find((cand: any) => {
                const nombre = cand.key || cand.nombre;
                if (asignados.includes(nombre)) return false;
                if (!necesitaValidacionTurno(cand.rol)) return true;

                const turnos = mapaHorarios.get(nombre);
                if (!turnos) return false;

                const turnoDia = String(turnos[diaIndex]).trim().toUpperCase();
                return esSabado ? !BLOQUEOS_SABADO.some(b => turnoDia.startsWith(b)) : turnoDia === 'N';
            });

            if (mejorCandidato) {
                cambiosRealizados++;
                const nombreFinal = mejorCandidato.key || mejorCandidato.nombre;
                asignados.push(nombreFinal);
                return { ...slot, nombre: nombreFinal, esSugerido: true };
            }
            return slot;
        });

        return { ...ot, tecnicos: nuevosTecnicos };
    });

    if (cambiosRealizados > 0) {
        setPlanResult(ordenesActualizadas); // Asumiendo que setPlanResult maneja la actualización global correctamente
        setMensajeExito(`Se asignaron ${cambiosRealizados} técnicos automáticamente`);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    } else {
        alert("No se encontraron técnicos disponibles para cubrir las vacantes restantes.");
    }
  };

  // Handlers de Drag & Drop
  const handleDragStart = (e: React.DragEvent, ot: any) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(ot));
    e.dataTransfer.effectAllowed = "move";
    // Imagen fantasma invisible o personalizada
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    setDraggingOT(ot);
  };

  const handleDragEnd = () => { setDraggingOT(null); setDragOverDate(null); };
  const handleDragEnter = (e: React.DragEvent, fecha: string) => { e.preventDefault(); setDragOverDate(fecha); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; };

  const handleDrop = (e: React.DragEvent, fechaDestino: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingOT) return;

    const existe = planResult.some((p: any) => p.nroOrden === draggingOT.nroOrden);
    let nuevoPlan;
    
    if (existe) {
      nuevoPlan = planResult.map((p: any) => 
        p.nroOrden === draggingOT.nroOrden ? { ...p, fechaSugerida: fechaDestino } : p
      );
    } else {
      nuevoPlan = [...planResult, { ...draggingOT, fechaSugerida: fechaDestino }];
    }
    
    setPlanResult(nuevoPlan);
    setDraggingOT(null);
    setDragOverDate(null);
    setMensajeExito("Planificación Actualizada");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return {
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
  };
};