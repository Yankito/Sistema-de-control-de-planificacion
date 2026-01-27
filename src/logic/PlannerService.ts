import { PlanResult, HorarioTecnico } from "../types"; // Mueve las interfaces a un archivo de tipos

const excelDateToJS = (serial: any) => {
  if (serial instanceof Date) return serial;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? new Date() : date;
};

export class PlannerService {
  /**
   * Procesa la lógica de cruce entre Activos, Anteriores y Cumplimiento
   */
  static generarPlanificacion(
    dfAct: any[], 
    dfAnt: any[], 
    dfCumplimiento: any[], 
    empleadosMap: Map<string, any>
  ): PlanResult[] {
    const resultados: PlanResult[] = [];

    dfAct.forEach(filaAct => {
        const deptoKey = Object.keys(filaAct).find(k => k.includes("DEPARTAMENTO")) || "";
        const plantaOrden = this.mapDepartamentoAPlanta(String(filaAct[deptoKey] || ""));

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

                    // 1. Guardamos la fecha anterior formateada
                    const fechaAnteriorFormateada = `${String(fechaBase.getDate()).padStart(2, '0')}/${String(fechaBase.getMonth() + 1).padStart(2, '0')}/${fechaBase.getFullYear()}`;
                    
                    // 2. Calculamos la nueva fecha (Sugerida)
                    const nuevaFecha = new Date(fechaBase);
                    nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
                    const fechaSugeridaFormateada = `${String(nuevaFecha.getDate()).padStart(2, '0')}/${String(nuevaFecha.getMonth() + 1).padStart(2, '0')}/${nuevaFecha.getFullYear()}`;

                    const otKeyAct = Object.keys(filaAct).find(k => k.includes("PEDIDO") || k.includes("TRABAJO")) || "";

                    resultados.push({
                        nroOrden: String(filaAct[otKeyAct] || "PENDIENTE"),
                        equipo: actRaw,
                        descripcion: descRaw,
                        fechaSugerida: fechaSugeridaFormateada,
                        fechaAnterior: fechaAnteriorFormateada, // <--- Nuevo campo asignado
                        mecanico: nombreMec,
                        rol: datosEmp.rol,
                        planta: plantaOrden
                    });
                }
            }
        }
    });
    return resultados;
  }

  static mapDepartamentoAPlanta(deptoRaw: string): string {
    const d = String(deptoRaw || "").trim().toUpperCase();
    if (!d) return "OTROS";
    if (d.includes("SADEMA")) return "SADEMA";
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
}