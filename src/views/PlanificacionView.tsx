import { useState, useMemo, useEffect } from "react";
import { Calendario } from "../components/planificacion/Calendario";
import { PanelLateral } from "../components/planificacion/PanelLateral";
import { Wand2, CheckCircle2 } from "lucide-react"; // Importar iconos

// Helpers para lógica de turnos (reutilizados del modal)
const BLOQUEOS_SABADO = ['L', 'V', 'LIC', 'LM', 'LP'];

const rolesCoinciden = (rolA: string, rolB: string) => {
    const r1 = String(rolA || "").trim().toUpperCase().charAt(0);
    const r2 = String(rolB || "").trim().toUpperCase().charAt(0);
    return r1 === r2;
};

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
  const [mensajeExito, setMensajeExito] = useState("Planificación Actualizada"); // Nuevo estado para mensaje
  const [mostrarSoloVacantes, setMostrarSoloVacantes] = useState(false);

  // Convertimos el mapa de empleados a array una sola vez para iterar rápido
  const listaEmpleados = useMemo(() => {
      return Array.from(empleadosMap.values()).map((v: any, i) => ({
          ...v, 
          key: Array.from(empleadosMap.keys())[i]
      }));
  }, [empleadosMap]);

  // --- FUNCIÓN: SUGERIR TÉCNICOS MASIVAMENTE ---
  const handleSugerirTodo = () => {
    let cambiosRealizados = 0;

    const nuevoPlan = planResult.map((ot: any) => {
        // Si la orden no tiene vacantes, la saltamos
        const tieneVacantes = ot.tecnicos.some((t: any) => t.nombre === 'VACANTE');
        if (!tieneVacantes) return ot;

        // Datos de fecha
        const [d, m, y] = ot.fechaSugerida.split('/').map(Number);
        const diaIndex = d - 1;
        const fechaObj = new Date(y, m - 1, d);
        const esSabado = fechaObj.getDay() === 6;

        // Lista local de asignados en esta OT para evitar duplicados internos
        const asignadosEnEstaOT = ot.tecnicos
            .map((t: any) => t.nombre)
            .filter((n: string) => n !== 'VACANTE');

        // Procesar técnicos
        const nuevosTecnicos = ot.tecnicos.map((slot: any) => {
            if (slot.nombre !== 'VACANTE') return slot;

            const rolRequerido = slot.rol;

            // 1. Filtramos candidatos (Mismo Rol y Planta)
            const candidatos = listaEmpleados.filter((emp: any) => {
                const mismoRol = rolesCoinciden(emp.rol, rolRequerido);
                const mismaPlanta = emp.planta === ot.planta || ot.planta === 'OTROS';
                return mismoRol && mismaPlanta;
            });

            // 2. Buscamos el primero disponible
            const mejorCandidato = candidatos.find((cand: any) => {
                const nombre = cand.key || cand.nombre;
                
                // Evitar duplicados en la misma OT
                if (asignadosEnEstaOT.includes(nombre)) return false;

                // Chequear Turno
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
                asignadosEnEstaOT.push(nombreFinal); // Marcar como usado
                
                return { 
                    ...slot, 
                    nombre: nombreFinal,
                    esSugerido: true // <--- MARCA PARA EL ÍCONO
                };
            }

            return slot; // Si no hay nadie, sigue VACANTE
        });

        return { ...ot, tecnicos: nuevosTecnicos };
    });

    if (cambiosRealizados > 0) {
        setPlanResult(nuevoPlan);
        setMensajeExito(`Se asignaron ${cambiosRealizados} técnicos automáticamente`);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    } else {
        alert("No se encontraron técnicos disponibles para cubrir las vacantes restantes.");
    }
  };

  // ... (Resto de useEffects y useMemo igual que antes) ...
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

  // ... (Handlers de Drag & Drop igual) ...
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

  const isNocheValid = (tecnicos: any[], fechaStr: string) => {
    if (!mapaHorarios || !tecnicos || tecnicos.length === 0) return false;
    return tecnicos.every((tec: any) => {
       if (tec.nombre === "OT NUEVA" || tec.nombre === "SIN HISTORIAL" || tec.nombre === "VACANTE") return true;
       const turnos = mapaHorarios.get(tec.nombre);
       if (!turnos) return false; 
       const dia = parseInt(fechaStr.split('/')[0]);
       return turnos[dia - 1]?.trim().toUpperCase() === 'N';
    });
  };

  return (
    <div className="flex h-full gap-6 animate-in fade-in duration-500 relative select-none">
      
      {/* BOTÓN FLOTANTE O EN HEADER PARA SUGERIR TODO */}
      <div className="absolute top-[-80px] right-64 z-50"> 
         {/* Nota: Ajusta la posición según tu layout del Sidebar/Header principal, 
             o mejor pásalo como prop al componente Calendario si prefieres que esté dentro de la caja blanca */}
      </div>

      <div className="flex-1 flex flex-col gap-6 relative">
         {/* Si quieres el botón dentro del Calendario, debes pasarlo como prop o renderizarlo aquí encima */}
         
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