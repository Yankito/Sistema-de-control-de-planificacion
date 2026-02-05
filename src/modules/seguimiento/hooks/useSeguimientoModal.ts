// src/modules/seguimiento/hooks/useSeguimientoModal.ts
import { useState, useMemo } from "react";
import { AtrasoRow } from "../types";
import { filterOrders, normalizeOT } from "../logic/filterUtils";

interface UseSeguimientoModalProps {
    dataModo: AtrasoRow[];
    dataAnterior: AtrasoRow[];
    viewDetail: { id: string; esOB: boolean; cat?: string; isGlobal?: boolean };
    PLANTAS_COMPLEJO: string[];
    PLANTAS_PF_ALIMENTOS: string[];
}

export const useSeguimientoModal = ({
    dataModo,
    dataAnterior,
    viewDetail,
    PLANTAS_COMPLEJO,
    PLANTAS_PF_ALIMENTOS
}: UseSeguimientoModalProps) => {
    
    // Estados de Filtros
    const [searchTerm, setSearchTerm] = useState("");
    const [filterEstado, setFilterEstado] = useState("TODOS");
    const [pagina, setPagina] = useState(1);
    const itemsPorPagina = 10;

    // Estados de Empleado
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [empFilters, setEmpFilters] = useState({ planta: "TODAS", periodo: "TODOS" });

    // 1. Set Normalizado (Memoizado)
    const previousOtSet = useMemo(() => {
        return new Set(dataAnterior.map(d => normalizeOT(d.ot)));
    }, [dataAnterior]);

    // 2. Lógica de Filtrado General
    const { filteredGeneral, estadosDisponibles } = useMemo(() => {
        const { filteredData, baseDataForStates } = filterOrders(
            dataModo,
            { viewDetail, filterEstado, searchTerm },
            { plantasComplejo: PLANTAS_COMPLEJO, plantasPfAlimentos: PLANTAS_PF_ALIMENTOS, previousOtSet }
        );

        const estados = new Set(baseDataForStates.map(d => d.estado));
        const lista = ["TODOS"];
        if (dataAnterior.length > 0) lista.push("NUEVAS");
        
        return { 
            filteredGeneral: filteredData, 
            estadosDisponibles: [...lista, ...Array.from(estados).sort()] 
        };
    }, [dataModo, viewDetail, PLANTAS_COMPLEJO, PLANTAS_PF_ALIMENTOS, filterEstado, searchTerm, previousOtSet, dataAnterior.length]);

    // 3. Paginación
    const datosPaginados = useMemo(() => 
        filteredGeneral.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina), 
    [filteredGeneral, pagina]);
    
    const totalPaginas = Math.ceil(filteredGeneral.length / itemsPorPagina);

    // 4. Lógica de Datos del Empleado Seleccionado
    const employeeData = useMemo(() => {
        if (!selectedEmployee) return { orders: [], stats: { total: 0, cumplidas: 0, pendientes: 0 } };
        
        let orders = dataModo.filter(d => d.detallesTecnicos?.some(t => t.tecnico === selectedEmployee));
        
        if (empFilters.planta !== "TODAS") orders = orders.filter(d => d.planta === empFilters.planta);
        if (empFilters.periodo !== "TODOS") orders = orders.filter(d => d.periodo === empFilters.periodo);
        
        const ordersWithFlag = orders.map(o => ({
            ...o,
            isNew: dataAnterior.length > 0 && !previousOtSet.has(normalizeOT(o.ot))
        }));

        const total = orders.length;
        const cumplidas = orders.filter(o => o.detallesTecnicos?.find(t => t.tecnico === selectedEmployee)?.finalizada).length;

        return { 
            orders: ordersWithFlag, 
            stats: { total, cumplidas, pendientes: total - cumplidas } 
        };
    }, [selectedEmployee, dataModo, empFilters, previousOtSet, dataAnterior]);

    // Helpers de Reset
    const handleSearchChange = (val: string) => { setSearchTerm(val); setPagina(1); };
    const handleFilterChange = (val: string) => { setFilterEstado(val); setPagina(1); };
    const resetEmployee = () => { setSelectedEmployee(null); setEmpFilters({planta:"TODAS", periodo:"TODOS"}); };

    return {
        // Estado UI General
        searchTerm, handleSearchChange,
        filterEstado, handleFilterChange,
        pagina, setPagina,
        totalPaginas,
        datosPaginados,
        totalItems: filteredGeneral.length,
        estadosDisponibles,
        previousOtSet, // Por si se necesita fuera

        // Estado Empleado
        selectedEmployee, setSelectedEmployee,
        empFilters, setEmpFilters,
        employeeData,
        resetEmployee
    };
};