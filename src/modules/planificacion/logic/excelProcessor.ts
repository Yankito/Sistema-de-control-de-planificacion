// src/logic/excelProcessor.ts
import * as XLSX from "xlsx-js-style";
import { PlannerService } from "./PlannerService";
import { HorarioTecnico } from "../types";

export const normalizarColumnas = (df: any[]) => {
  if (df.length === 0) return [];
  const keys = Object.keys(df[0]);
  return df.map(row => {
    const newRow: any = {};
    keys.forEach(k => {
      newRow[String(k).trim().toUpperCase()] = row[k];
    });
    return newRow;
  });
};

export const obtenerMapaHorarios = (sheets: { [key: string]: XLSX.WorkSheet }): Map<string, string[]> => {
  const sheet = sheets["HORARIOS"];
  if (!sheet) return new Map();

  const dfHorarios = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
  const mapa = new Map<string, string[]>();

  dfHorarios.forEach(fila => {
    const entries = Object.entries(fila);
    if (entries.length > 0) {
      const nombreTec = String(entries[0][1]).trim().toUpperCase();
      const turnos = entries.slice(1, 32).map(entry => String(entry[1] || "L").trim().toUpperCase());
      mapa.set(nombreTec, turnos);
    }
  });

  return mapa;
};

// --- CAMBIO PRINCIPAL AQUÍ ---
export const processExcelData = (
  sheets: { [key: string]: XLSX.WorkSheet }, 
  modo: 'STRICT' | 'BALANCED' = 'STRICT' // Recibimos el modo (por defecto STRICT)
) => {
  const dfAnt = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["B.ANT"]));
  const dfAct = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["B.ACT"]));
  const dfCumplimiento = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["CUMPLIMIENTO"]));
  const dfEmpleados = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["EMPLEADOS"]));

  const empleadosMap = new Map();
  dfEmpleados.forEach(emp => {
    const key = String(emp["EMPLEADO"] || "").trim().toUpperCase();
    if (key) {
      empleadosMap.set(key, {
        planta: String(emp["PLANTA"] || "SIN PLANTA").trim().toUpperCase(),
        rol: String(emp["ROL"] || "M").trim().toUpperCase()
      });
    }
  });

  const mapaHorarios = obtenerMapaHorarios(sheets);

  // DECIDIR QUÉ ALGORITMO EJECUTAR
  let resultadoPlanificacion;

  if (modo === 'BALANCED') {
    // Modo Nuevo: Carga Equilibrada
    resultadoPlanificacion = PlannerService.generarPlanificacionEquilibrada(
      dfAct, 
      dfAnt, 
      dfCumplimiento, 
      empleadosMap
    );
  } else {
    // Modo Original: Prioridad Turnos (STRICT)
    resultadoPlanificacion = PlannerService.generarPlanificacion(
      dfAct, 
      dfAnt, 
      dfCumplimiento, 
      empleadosMap, 
      mapaHorarios
    );
  }
  
  return {
    resultados: resultadoPlanificacion.resultados,
    sinAsignar: resultadoPlanificacion.sinAsignar,
    empleadosMap
  };
};

export const obtenerHorariosPorPlanta = (workbook: XLSX.WorkBook, plantaSel: string): HorarioTecnico[] => {
  const sheet = workbook.Sheets["HORARIOS"];
  const sheetEmp = workbook.Sheets["EMPLEADOS"];
  if (!sheet || !sheetEmp) return [];

  const dfHorarios = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
  const dfEmpleados = normalizarColumnas(XLSX.utils.sheet_to_json(sheetEmp));

  const rolesMap = new Map();
  dfEmpleados.forEach(e => {
    const colEmp = Object.keys(e).find(k => k.includes("EMPLEADO")) || "EMPLEADO";
    const colRol = Object.keys(e).find(k => k.includes("ROL")) || "ROL";
    rolesMap.set(String(e[colEmp]).trim().toUpperCase(), String(e[colRol] || "M").trim().toUpperCase());
  });

  const tecnicosFiltrados = dfEmpleados
    .filter(e => {
      const plantaEmp = String(e["PLANTA"] || "").trim().toUpperCase();
      const seleccion = plantaSel.toUpperCase();
      return seleccion === "SADEMA" ? plantaEmp === "SADEMA" : plantaEmp.includes(seleccion);
    })
    .map(e => String(e["EMPLEADO"] || "").trim().toUpperCase());

  return dfHorarios
    .filter(fila => {
      const nombreEnFila = String(Object.values(fila)[0] || "").trim().toUpperCase();
      return tecnicosFiltrados.includes(nombreEnFila);
    })
    .map(fila => {
      const entries = Object.entries(fila);
      const nombreTec = String(entries[0][1]).trim().toUpperCase();
      return {
        nombre: nombreTec,
        rol: rolesMap.get(nombreTec) || "M",
        planta: plantaSel,
        turnos: entries.slice(1, 32).map(entry => String(entry[1] || "L").trim().toUpperCase())
      };
    });
};