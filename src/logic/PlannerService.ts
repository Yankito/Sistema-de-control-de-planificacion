import { PlanResult } from "../types";

const excelDateToJS = (serial: any) => {
  if (serial instanceof Date) return serial;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? new Date() : date;
};

export class PlannerService {
  
  private static evitarDomingo(fecha: Date): Date {
    const copiaFecha = new Date(fecha);
    if (copiaFecha.getDay() === 0) {
      copiaFecha.setDate(copiaFecha.getDate() + 1);
    }
    return copiaFecha;
  }

  private static formatearFecha(fecha: Date): string {
    return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
  }

  private static limpiarKey(valor: any): string {
    if (!valor) return "";
    return String(valor).toUpperCase().trim().replace(/^0+/, '').replace(/\s\s+/g, ' ');
  }

  private static buscarNocheComun(fechaProyectada: Date, listaTurnos: string[][]): Date | null {
    const diaInicio = fechaProyectada.getDate(); 
    
    const todosTienenNoche = (diaIndex: number) => {
       return listaTurnos.every(turnosDelTecnico => 
          turnosDelTecnico[diaIndex]?.trim().toUpperCase() === 'N'
       );
    };

    for (let i = diaInicio; i <= 31; i++) {
      if (todosTienenNoche(i - 1)) {
        const nuevaFecha = new Date(fechaProyectada);
        nuevaFecha.setDate(i);
        return nuevaFecha;
      }
    }
    for (let i = diaInicio; i >= 1; i--) {
      if (todosTienenNoche(i - 1)) {
        const nuevaFecha = new Date(fechaProyectada);
        nuevaFecha.setDate(i);
        return nuevaFecha;
      }
    }
    return null; 
  }

  private static buscarNombreEnFila(fila: any): string {
    const keys = Object.keys(fila);
    const keyNombre = keys.find(k => {
        const cleanK = k.toUpperCase();
        return (cleanK.includes("EMPLEADO") || cleanK.includes("TECNICO") || cleanK.includes("RESPONSABLE")) 
               && !cleanK.includes("SOLICITA") && !cleanK.includes("CREADO");
    });
    if (keyNombre && fila[keyNombre]) return String(fila[keyNombre]).trim().toUpperCase();
    return "";
  }

  static generarPlanificacion(
    dfAct: any[], 
    dfAnt: any[], 
    dfCumplimiento: any[], 
    empleadosMap: Map<string, any>,
    mapaHorarios: Map<string, string[]>
  ): { resultados: PlanResult[], sinAsignar: any[] } {
    const resultados: PlanResult[] = [];
    const sinAsignar: any[] = [];

    dfAct.forEach(filaAct => {
      const deptoKey = Object.keys(filaAct).find(k => k.includes("DEPARTAMENTO")) || "";
      const plantaActual = this.mapDepartamentoAPlanta(String(filaAct[deptoKey] || ""));
      
      const otKeyAct = Object.keys(filaAct).find(k => k.includes("PEDIDO") || k.includes("TRABAJO")) || "";
      const nroOrdenActual = String(filaAct[otKeyAct] || "PENDIENTE");
      const actRaw = this.limpiarKey(filaAct["NÚMERO DE ACTIVO"] || filaAct["NUMERO DE ACTIVO"]);
      const descRaw = this.limpiarKey(filaAct["DESCRIPCIÓN"] || filaAct["DESCRIPCION"]);
      
      if (!actRaw || !descRaw || actRaw === "0") {
         sinAsignar.push({ ...filaAct, tecnicos: [], error: "DATOS INCOMPLETOS", planta: plantaActual });
         return;
      }

      const keyBusqueda = `${actRaw}|${descRaw}`;
      const matchAnt = dfAnt.find(filaAnt => {
        const actAnt = this.limpiarKey(filaAnt["NÚMERO DE ACTIVO"] || filaAnt["NUMERO DE ACTIVO"]);
        const descAnt = this.limpiarKey(filaAnt["DESCRIPCIÓN"] || filaAnt["DESCRIPCION"]);
        return `${actAnt}|${descAnt}` === keyBusqueda;
      });

      if (matchAnt) {
        const fechaKeyAnt = Object.keys(matchAnt).find(k => k.includes("FECHA INICIAL PROGRAMADA")) || "";
        const fechaAntJS = excelDateToJS(matchAnt[fechaKeyAnt]);
        const fechaAntStr = this.formatearFecha(fechaAntJS);

        const otKeyAnt = Object.keys(matchAnt).find(k => k.includes("PEDIDO") || k.includes("TRABAJO")) || "";
        const otAntId = String(matchAnt[otKeyAnt] || "").trim();

        const colOtC = Object.keys(dfCumplimiento[0] || {}).find(c => c.includes("NRO_OT") || c.includes("PEDIDO") || c.includes("TRABAJO")) || "";
        const cumplimientos = dfCumplimiento.filter(cum => String(cum[colOtC]).includes(otAntId));

        let listaNombres: string[] = [];
        if (cumplimientos.length > 0) {
           listaNombres = cumplimientos.map(c => {
              const colEmp = Object.keys(c).find(k => k.includes("EMPLEADO")) || "EMPLEADO";
              return String(c[colEmp] || "").trim().toUpperCase();
           }).filter(n => n !== "");
        } 
        
        if (listaNombres.length === 0) {
            const n = this.buscarNombreEnFila(matchAnt);
            if (n) listaNombres.push(n);
        }

        if (listaNombres.length === 0) listaNombres.push("SIN HISTORIAL");
        listaNombres = [...new Set(listaNombres)];

        const tecnicosData = listaNombres.map(nombre => {
            const datos = empleadosMap.get(nombre);
            const turnos = mapaHorarios.get(nombre);
            return {
                nombre,
                rol: datos?.rol || "M",
                turnos: turnos || null,
                existe: !!datos
            };
        });

        const objetoOT = {
            nroOrden: nroOrdenActual,
            equipo: actRaw,
            descripcion: descRaw,
            fechaAnterior: fechaAntStr,
            tecnicos: tecnicosData,
            planta: plantaActual // VITAL PARA FILTRADO
        };

        const turnosValidos = tecnicosData.map(t => t.turnos).filter(t => t !== null) as string[][];

        if (turnosValidos.length > 0) {
            let fechaSugerida = new Date(fechaAntJS);
            fechaSugerida.setMonth(fechaSugerida.getMonth() + 1);
            
            let fechaFinal = this.buscarNocheComun(fechaSugerida, turnosValidos);

            if (fechaFinal) {
                fechaFinal = this.evitarDomingo(fechaFinal);
                resultados.push({
                    ...objetoOT,
                    fechaSugerida: this.formatearFecha(fechaFinal)
                });
            } else {
                sinAsignar.push({ ...objetoOT, error: "EQUIPO SIN NOCHE COMÚN" });
            }
        } else {
            sinAsignar.push({ ...objetoOT, error: "SIN TURNOS CARGADOS" });
        }

      } else {
        // --- CORRECCIÓN AQUÍ: Asegurar propiedad 'planta' para que App.tsx no lo filtre ---
        sinAsignar.push({ 
            ...filaAct, 
            nroOrden: nroOrdenActual,
            equipo: actRaw,
            descripcion: descRaw,
            tecnicos: [{ nombre: "OT NUEVA", rol: "M" }],
            fechaAnterior: "N/A",
            planta: plantaActual 
        }); 
      }
    });

    return { resultados, sinAsignar };
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
  }
}