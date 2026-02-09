// src/modules/seguimiento/hooks/useSeguimientoModal.ts
import { useState, useMemo } from "react";
import { AtrasoRow } from "../types";
import { filterOrders, normalizeOT } from "../logic/filterUtils";

interface UseSeguimientoModalProps {
  dataModo: AtrasoRow[];
  dataAnterior: AtrasoRow[];
  viewDetail: { id: string; esOB: boolean; cat?: string; isGlobal?: boolean; periodo?: string };
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
  const [empFilters, setEmpFilters] = useState({ planta: "TODAS", periodo: "TODOS", cumplimiento: "TODOS" });
  const [empSearch, setEmpSearch] = useState("");

  const handleSelectEmployee = (name: string) => {
    setSelectedEmployee(name);
    setEmpFilters({
      // Si el modal está filtrado por una planta individual, la seteamos, si no "TODAS"
      planta: !viewDetail.isGlobal ? viewDetail.id : "TODAS",
      periodo: viewDetail.periodo || "TODOS",
      cumplimiento: "TODOS"
    });
  };

  // Set Normalizado
  const previousOtSet = useMemo(() => {
    return new Set(dataAnterior.map(d => normalizeOT(d.ot)));
  }, [dataAnterior]);

  // Lógica de Filtrado General
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

  // Paginación
  const datosPaginados = useMemo(() =>
    filteredGeneral.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina),
    [filteredGeneral, pagina]);

  const totalPaginas = Math.ceil(filteredGeneral.length / itemsPorPagina);

  // Lógica de Datos del Empleado Seleccionado
  const employeeData = useMemo(() => {
    if (!selectedEmployee) return { orders: [], stats: { total: 0, cumplidas: 0, pendientes: 0 }, activePlants: [], activePeriods: [] };

    const baseOrders = dataModo.filter(d => d.detallesTecnicos?.some(t => t.tecnico === selectedEmployee));

    // STATS (Solo planta y periodo)
    let statsOrders = [...baseOrders];
    if (empFilters.planta !== "TODAS") statsOrders = statsOrders.filter(d => d.planta === empFilters.planta);
    if (empFilters.periodo !== "TODOS") statsOrders = statsOrders.filter(d => d.periodo === empFilters.periodo);

    const total = statsOrders.length;
    const cumplidas = statsOrders.filter(o => o.detallesTecnicos?.find(t => t.tecnico === selectedEmployee)?.finalizada).length;

    // LISTA VISUAL (Planta + Periodo + Cumplimiento + BUSCADOR)
    let listOrders = [...statsOrders];

    if (empFilters.cumplimiento !== "TODOS") {
      const buscarCumplimiento = empFilters.cumplimiento === "CUMPLIDAS";
      listOrders = listOrders.filter(o =>
        o.detallesTecnicos?.find(t => t.tecnico === selectedEmployee)?.finalizada === buscarCumplimiento
      );
    }

    if (empSearch) {
      const term = empSearch.toLowerCase();
      listOrders = listOrders.filter(o =>
        o.ot.toLowerCase().includes(term) ||
        o.descripcion.toLowerCase().includes(term)
      );
    }

    const activePlants = Array.from(new Set(baseOrders.map(o => o.planta))).sort();
    const activePeriods = Array.from(new Set(baseOrders.map(o => o.periodo))).sort();

    return {
      orders: listOrders.map(o => ({
        ...o,
        isNew: dataAnterior.length > 0 && !previousOtSet.has(normalizeOT(o.ot))
      })),
      stats: { total, cumplidas, pendientes: total - cumplidas },
      activePlants,
      activePeriods
    };
  }, [selectedEmployee, dataModo, empFilters, empSearch, previousOtSet, dataAnterior]);

  // Helpers de Reset
  const handleSearchChange = (val: string) => { setSearchTerm(val); setPagina(1); };
  const handleFilterChange = (val: string) => { setFilterEstado(val); setPagina(1); };
  const resetEmployee = () => { setSelectedEmployee(null); };

  return {
    // Estado UI General
    searchTerm, handleSearchChange,
    filterEstado, handleFilterChange,
    pagina, setPagina,
    totalPaginas,
    datosPaginados,
    totalItems: filteredGeneral.length,
    estadosDisponibles,
    previousOtSet,
    empSearch, setEmpSearch,

    // Estado Empleado
    selectedEmployee, handleSelectEmployee,
    empFilters, setEmpFilters,
    employeeData,
    resetEmployee,
  };
};