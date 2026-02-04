import { useState, useMemo, useEffect } from "react";
import { Calendario } from "../components/Calendario";
import { PanelLateral } from "../components/PanelLateral";
import { Wand2 } from "lucide-react"; // Importar iconos

import { 
  esPlantaCompatible, 
  rolesCoinciden, 
  necesitaValidacionTurno 
} from "../utils/planificacionUtils"; 

// Helpers para lógica de turnos (reutilizados del modal)
const BLOQUEOS_SABADO = ['L', 'V', 'LIC', 'LM', 'LP'];

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
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [draggingOT, setDraggingOT] = useState<any>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("Planificación Actualizada"); // Nuevo estado para mensaje
  const [mostrarSoloVacantes, setMostrarSoloVacantes] = useState(false);


  useEffect(() => {
    if (fechaSeleccionada) {
      setDiaSeleccionado(fechaSeleccionada);
    }
  }, [fechaSeleccionada]);

  // --- FUNCIÓN: SUGERIR TÉCNICOS MASIVAMENTE ---
  const handleSugerirTodo = () => {
    let cambiosRealizados = 0;

    // Convertimos mapa a array para filtrar
    const listaEmpleados = Array.from(empleadosMap.values()).map((v: any, i) => ({
        ...v, 
        key: Array.from(empleadosMap.keys())[i]
    }));

    // 1. Calculamos nuevas versiones
    const ordenesDeEstaPlantaActualizadas = planResult.map((ot: any) => {
        const tieneVacantes = ot.tecnicos.some((t: any) => t.nombre === 'VACANTE');
        if (!tieneVacantes) return ot;

        const [d, m, y] = ot.fechaSugerida.split('/').map(Number);
        const diaIndex = d - 1;
        const fechaObj = new Date(y, m - 1, d);
        const esSabado = fechaObj.getDay() === 6;

        const asignadosEnEstaOT = ot.tecnicos
            .map((t: any) => t.nombre)
            .filter((n: string) => n !== 'VACANTE');

        const nuevosTecnicos = ot.tecnicos.map((slot: any) => {
            if (slot.nombre !== 'VACANTE') return slot;

            const rolRequerido = slot.rol;

            // FILTRO 1: Rol Exacto y Planta Compatible (Incluyendo CI)
            const candidatos = listaEmpleados.filter((emp: any) => {
                const rolOk = rolesCoinciden(rolRequerido, emp.rol);
                const plantaOk = esPlantaCompatible(emp.planta, ot.planta);
                return rolOk && plantaOk;
            });

            // FILTRO 2: Disponibilidad (Turnos)
            const mejorCandidato = candidatos.find((cand: any) => {
                const nombre = cand.key || cand.nombre;
                if (asignadosEnEstaOT.includes(nombre)) return false;

                // SI NO REQUIERE VALIDACIÓN (SUPERVISOR/SE), PASA DIRECTO
                if (!necesitaValidacionTurno(cand.rol)) return true;

                // SI REQUIERE, VALIDAMOS TURNO
                const turnos = mapaHorarios.get(nombre);
                if (!turnos) return false;

                const turnoDia = turnos[diaIndex];
                const turnoLimpio = String(turnoDia).trim().toUpperCase();

                if (esSabado) {
                    return !BLOQUEOS_SABADO.some(b => turnoLimpio.startsWith(b));
                } else {
                    return turnoLimpio === 'N';
                }
            });

            if (mejorCandidato) {
                cambiosRealizados++;
                const nombreFinal = mejorCandidato.key || mejorCandidato.nombre;
                asignadosEnEstaOT.push(nombreFinal);
                
                return { 
                    ...slot, 
                    nombre: nombreFinal,
                    esSugerido: true
                };
            }
            return slot;
        });

        return { ...ot, tecnicos: nuevosTecnicos };
    });

    // 2. ACTUALIZAMOS EL ESTADO GLOBAL SIN BORRAR LAS OTRAS PLANTAS
    if (cambiosRealizados > 0) {
        setPlanResult((prevGlobal: any[]) => {
            return prevGlobal.map((otGlobal: any) => {
                const otModificada = ordenesDeEstaPlantaActualizadas.find(
                    (otLocal: any) => otLocal.nroOrden === otGlobal.nroOrden
                );
                return otModificada || otGlobal;
            });
        });

        setMensajeExito(`Se asignaron ${cambiosRealizados} técnicos automáticamente`);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    } else {
        alert("No se encontraron técnicos disponibles para cubrir las vacantes restantes en esta planta.");
    }
  };

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

  const handleDragStart = (e: React.DragEvent, ot: any) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(ot));
    e.dataTransfer.effectAllowed = "move";
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
    setMensajeExito("Planificación Actualizada");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="flex h-full gap-6 animate-in fade-in duration-500 relative select-none">
      
      {/* BOTÓN FLOTANTE O EN HEADER PARA SUGERIR TODO */}
      <div className="absolute top-[-80px] right-64 z-50"> 
      </div>

      <div className="flex-1 flex flex-col gap-6 relative">
         
         {/* BARRA DE ACCIONES SUPERIOR (Opcional, encima del calendario) */}
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
            // Pasamos mensaje personalizado si quieres mostrar "X asignados"
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