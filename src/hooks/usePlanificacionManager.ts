import { useState } from "react";
import { PlanResult, HorarioTecnico } from "../modules/planificacion/types";
import { processExcelData, obtenerHorariosPorPlanta, obtenerMapaHorarios } from "../modules/planificacion/logic/excelProcessor";
import * as XLSX from "xlsx-js-style";
import { mapDepartamentoAPlanta } from "../modules/planificacion/utils/excelHelpers";

export const usePlanificacionManager = () => {
    // Estado de Datos
    const [planResult, setPlanResult] = useState<PlanResult[]>([]);
    const [planResultSinAsignar, setPlanResultSinAsignar] = useState<any[]>([]);
    const [horariosResult, setHorariosResult] = useState<HorarioTecnico[]>([]);
    const [workbookActual, setWorkbookActual] = useState<XLSX.WorkBook | null>(null);
    const [empleadosMap, setEmpleadosMap] = useState<Map<string, any>>(new Map());
    const [mapaHorariosActual, setMapaHorariosActual] = useState<Map<string, string[]>>(new Map());
    
    // Estado de UI
    const [cargandoPlan, setCargandoPlan] = useState(false);
    const [plantaPlan, setPlantaPlan] = useState("PF3");
    const [plantaHorarios, setPlantaHorarios] = useState("PF3");
    const [fechaFoco, setFechaFoco] = useState<string | null>(null);
    
    // Estado Modal
    const [modalTecnicoOpen, setModalTecnicoOpen] = useState(false);
    const [ordenEditando, setOrdenEditando] = useState<any>(null);

    // --- ACCIONES ---

    const cargarDatosDesdeExcel = (workbook: XLSX.WorkBook) => {
        setWorkbookActual(workbook);
        setHorariosResult(obtenerHorariosPorPlanta(workbook, plantaHorarios));
        setPlanResult([]);
        setPlanResultSinAsignar([]);
    };

    const ejecutarPlanificacion = (modo: 'STRICT' | 'BALANCED') => {
        if (!workbookActual) return alert("Carga el archivo maestro primero");
        
        setCargandoPlan(true);
        setTimeout(() => {
            try {
                const { resultados, sinAsignar, empleadosMap: mapaCargado } = processExcelData(workbookActual.Sheets, modo);
                const horarios = obtenerMapaHorarios(workbookActual.Sheets);
                
                setPlanResult(resultados);
                setPlanResultSinAsignar(sinAsignar);
                setEmpleadosMap(mapaCargado);
                setMapaHorariosActual(horarios);
                // Retornamos true para indicar éxito y cambiar tab
                return true;
            } catch (error) {
                console.error(error);
                alert("Error al procesar planificación");
            } finally {
                setCargandoPlan(false);
            }
        }, 100);
    };

    const cambiarPlantaHorarios = (nueva: string) => {
        setPlantaHorarios(nueva);
        if (workbookActual) {
            setHorariosResult(obtenerHorariosPorPlanta(workbookActual, nueva));
        }
    };

    const handleCambioTurno = (nombreTecnico: string, diaIndex: number) => {
        setHorariosResult(prev => prev.map(tecnico => {
            if (tecnico.nombre === nombreTecnico) {
                const ciclo = ['M', 'T', 'N', 'L', 'V'];
                const turnoActual = tecnico.turnos[diaIndex];
                const siguienteIndex = (ciclo.indexOf(turnoActual) + 1) % ciclo.length;
                const nuevosTurnos = [...tecnico.turnos];
                nuevosTurnos[diaIndex] = ciclo[siguienteIndex];
                return { ...tecnico, turnos: nuevosTurnos };
            }
            return tecnico;
        }));
    };

    const handleAsignarTecnico = (nroOrden: string, indexTecnico: number, nuevoNombre: string, esAutomatico = false) => {
        const actualizar = (ot: any) => {
            const nuevos = [...ot.tecnicos];
            nuevos[indexTecnico] = { ...nuevos[indexTecnico], nombre: nuevoNombre, esSugerido: esAutomatico };
            return { ...ot, tecnicos: nuevos };
        };
        setPlanResult(prev => prev.map(ot => ot.nroOrden === nroOrden ? actualizar(ot) : ot));
        setOrdenEditando((prev: any) => prev && prev.nroOrden === nroOrden ? actualizar(prev) : prev);
    };

    const handleModificarCupos = (nroOrden: string, accion: 'ADD' | 'REMOVE', rol?: string, indice?: number) => {
        const actualizar = (ot: any) => {
            const nuevos = [...ot.tecnicos];
            if (accion === 'ADD' && rol) nuevos.push({ nombre: "VACANTE", rol, turnos: null, existe: true });
            else if (accion === 'REMOVE' && typeof indice === 'number') nuevos.splice(indice, 1);
            return { ...ot, tecnicos: nuevos };
        };
        setPlanResult(prev => prev.map(ot => ot.nroOrden === nroOrden ? actualizar(ot) : ot));
        setOrdenEditando((prev: any) => prev && prev.nroOrden === nroOrden ? actualizar(prev) : prev);
    };

    // Filtros de Vista
    const planFiltrado = planResult.filter(p => p.planta === plantaPlan);
    const sinAsignarFiltrado = planResultSinAsignar.filter(o => {
        if (o.planta) return o.planta === plantaPlan;
        const deptoKey = Object.keys(o).find(k => k.includes("DEPARTAMENTO")) || "";
        return mapDepartamentoAPlanta(o[deptoKey]) === plantaPlan;
    });

    return {
        // Datos
        planResult,
        setPlanResult,
        planFiltrado,
        sinAsignarFiltrado,
        planResultSinAsignar,
        horariosResult,
        empleadosMap,
        mapaHorariosActual,
        cargandoPlan,
        workbookActual,
        
        // UI State
        plantaPlan, setPlantaPlan,
        plantaHorarios, 
        fechaFoco, setFechaFoco,
        modalTecnicoOpen, setModalTecnicoOpen,
        ordenEditando, setOrdenEditando,

        // Actions
        cargarDatosDesdeExcel,
        ejecutarPlanificacion,
        cambiarPlantaHorarios,
        handleCambioTurno,
        handleAsignarTecnico,
        handleModificarCupos,
        
        // Helper para resetear
        reset: () => {
            setWorkbookActual(null);
            setPlanResult([]);
            setHorariosResult([]);
        }
    };
};