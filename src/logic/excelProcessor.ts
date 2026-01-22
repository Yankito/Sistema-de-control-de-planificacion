// src/logic/excelProcessor.ts
import * as XLSX from "xlsx";

export interface PlanResult {
  nroOrden: string;
  equipo: string;
  descripcion: string;
  planta: string;
  mecanico: string;
  rol: string;
  fechaSugerida: string;
}

export interface HorarioTecnico {
  nombre: string;
  rol: string;
  planta: string;
  turnos: string[];
}

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

const excelDateToJS = (serial: any) => {
  if (serial instanceof Date) return serial;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? new Date() : date;
};

export const mapDepartamentoAPlanta = (deptoRaw: string): string => {
  const d = String(deptoRaw || "").trim().toUpperCase();
  if (!d) return "OTROS";
  if (d.includes("PF3")) return "PF3";
  if (d.includes("PF4")) return "PF4";
  if (d.includes("PF5")) return "PF5";
  if (d.includes("PF6")) return "PF6";
  if (d.includes("JAMON") || d.includes("JAMÓN")) return "PF4";
  if (d.includes("PIZZA")) return "PF5";
  if (d.includes("PLATO")) return "PF6";
  if (d.includes("MANTENCION") || d.includes("MANTENCIÓN") || d.includes("MANT.")) return "PF3";
  if (d.includes("VENTAS") || d.includes("DATA") || d.includes("LOGISTICA") || d.includes("CDT")) return "CDT";
  return "OTROS";
};

export const processExcelData = (datosExcel: any): PlanResult[] => {
  const dfAnt = normalizarColumnas(XLSX.utils.sheet_to_json(datosExcel["B.ANT"]));
  const dfAct = normalizarColumnas(XLSX.utils.sheet_to_json(datosExcel["B.ACT"]));
  const dfCumplimiento = normalizarColumnas(XLSX.utils.sheet_to_json(datosExcel["CUMPLIMIENTO"]));
  const dfEmpleados = normalizarColumnas(XLSX.utils.sheet_to_json(datosExcel["EMPLEADOS"]));

  const empleadosMap = new Map();
  dfEmpleados.forEach(emp => {
    const colEmp = Object.keys(emp).find(k => k.includes("EMPLEADO")) || "EMPLEADO";
    const colPlanta = Object.keys(emp).find(k => k.includes("PLANTA")) || "PLANTA";
    const colRol = Object.keys(emp).find(k => k.includes("ROL")) || "ROL";

    const key = String(emp[colEmp] || "").trim().toUpperCase();
    if (key) {
      empleadosMap.set(key, {
        planta: String(emp[colPlanta] || "SIN PLANTA").trim().toUpperCase(),
        rol: String(emp[colRol] || "M").trim().toUpperCase() // M o E
      });
    }
  });

  const resultados: PlanResult[] = [];

  dfAct.forEach(filaAct => {
    const deptoKey = Object.keys(filaAct).find(k => k.includes("DEPARTAMENTO")) || "";
    const plantaOrden = mapDepartamentoAPlanta(String(filaAct[deptoKey] || ""));

    const actRaw = String(filaAct["NÚMERO DE ACTIVO"] || filaAct["NUMERO DE ACTIVO"] || "").trim().replace(/^0+/, '');
    const descRaw = String(filaAct["DESCRIPCIÓN"] || filaAct["DESCRIPCION"] || "").trim().toUpperCase();
    const keyBusqueda = actRaw + descRaw;

    const matchAnt = dfAnt.find(filaAnt => {
      const actAnt = String(filaAnt["NÚMERO DE ACTIVO"] || filaAnt["NUMERO DE ACTIVO"] || "").trim().replace(/^0+/, '');
      const descAnt = String(filaAnt["DESCRIPCIÓN"] || filaAnt["DESCRIPCION"] || "").trim().toUpperCase();
      return (actAnt + descAnt) === keyBusqueda;
    });

    if (matchAnt) {
      const otKeyAnt = Object.keys(matchAnt).find(k => k.includes("PEDIDO") || k.includes("TRABAJO")) || "";
      const otAntId = String(matchAnt[otKeyAnt] || "").trim();
      
      const colOtC = Object.keys(dfCumplimiento[0] || {}).find(c => c.includes("NRO_OT") || c.includes("PEDIDO") || c.includes("TRABAJO")) || "";
      const cumple = dfCumplimiento.find(cum => String(cum[colOtC]).includes(otAntId));

      if (cumple) {
        const colEmpC = Object.keys(cumple).find(c => c.includes("EMPLEADO")) || "EMPLEADO";
        const nombreMec = String(cumple[colEmpC] || "").trim().toUpperCase();
        const datosEmp = empleadosMap.get(nombreMec);

        if (datosEmp) {
          const fechaKey = Object.keys(matchAnt).find(k => k.includes("FECHA INICIAL PROGRAMADA")) || "";
          const fechaBase = excelDateToJS(matchAnt[fechaKey]);
          
          const nuevaFecha = new Date(fechaBase);
          nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);

          // FORZAMOS FORMATO DD/MM/YYYY CON BARRAS
          const dia = String(nuevaFecha.getDate()).padStart(2, '0');
          const mes = String(nuevaFecha.getMonth() + 1).padStart(2, '0');
          const anio = nuevaFecha.getFullYear();
          const fechaFinal = `${dia}/${mes}/${anio}`;

          const otKeyAct = Object.keys(filaAct).find(k => k.includes("PEDIDO") || k.includes("TRABAJO")) || "";

          resultados.push({
            nroOrden: String(filaAct[otKeyAct] || "PENDIENTE"),
            equipo: actRaw,
            descripcion: descRaw,
            fechaSugerida: fechaFinal,
            mecanico: nombreMec,
            rol: datosEmp.rol,
            planta: plantaOrden
          });
        }
      }
    }
  });
  return resultados;
};

export const obtenerHorariosPorPlanta = (workbook: XLSX.WorkBook, plantaSel: string): HorarioTecnico[] => {
  const sheet = workbook.Sheets["HORARIOS"];
  const sheetEmp = workbook.Sheets["EMPLEADOS"];
  if (!sheet || !sheetEmp) return [];

  const dfHorarios = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
  const dfEmpleados = normalizarColumnas(XLSX.utils.sheet_to_json(sheetEmp));

  // MAPA DE ROLES DINÁMICO
  const rolesMap = new Map();
  dfEmpleados.forEach(e => {
    const colEmp = Object.keys(e).find(k => k.includes("EMPLEADO")) || "EMPLEADO";
    const colRol = Object.keys(e).find(k => k.includes("ROL")) || "ROL";
    rolesMap.set(String(e[colEmp]).trim().toUpperCase(), String(e[colRol] || "M").trim().toUpperCase());
  });

  const tecnicosPlanta = dfEmpleados
    .filter(e => String(e["PLANTA"] || "").trim().toUpperCase().includes(plantaSel.toUpperCase()))
    .map(e => {
      const colEmp = Object.keys(e).find(k => k.includes("EMPLEADO")) || "EMPLEADO";
      return String(e[colEmp] || "").trim().toUpperCase();
    });

  return dfHorarios
    .filter(fila => {
      const nombreEnFila = String(Object.values(fila)[0] || "").trim().toUpperCase();
      return tecnicosPlanta.includes(nombreEnFila);
    })
    .map(fila => {
      const entries = Object.entries(fila);
      const nombreTec = String(entries[0][1]).trim().toUpperCase();
      return {
        nombre: nombreTec,
        rol: rolesMap.get(nombreTec) || "M", // Recuperamos el rol real
        planta: plantaSel,
        // Limpieza de turnos: si está vacío va como "L"
        turnos: entries.slice(1, 32).map(entry => String(entry[1] || "L").trim().toUpperCase())
      };
    });
};