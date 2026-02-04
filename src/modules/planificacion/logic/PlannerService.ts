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

  // --- Helpers nuevos para fecha y semana ---
  private static getMonday(d: Date) {
    const dObj = new Date(d);
    const day = dObj.getDay(); 
    const diff = dObj.getDate() - day + (day == 0 ? -6 : 1); // Ajustar al lunes
    const lunes = new Date(dObj.setDate(diff));
    lunes.setHours(0,0,0,0);
    return lunes;
  }

  // Identificador único de semana (ej: 2026-W05)
  private static getWeekId(d: Date) {
      const lunes = this.getMonday(d);
      const oneJan = new Date(lunes.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((lunes.getTime() - oneJan.getTime()) / (86400000));
      const week = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
      return `${lunes.getFullYear()}-W${week}`;
  }

  private static groupBy(xs: any[], key: string) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  }

  // Lógica original (STRICT MODE) - MANTENIDA IGUAL
  private static buscarNocheComun(fechaProyectada: Date, listaTurnos: string[][]): Date | null {
    const diaTarget = fechaProyectada.getDate(); 
    const diasEnMes = new Date(fechaProyectada.getFullYear(), fechaProyectada.getMonth() + 1, 0).getDate();
    
    const todosTienenNoche = (diaIndex: number) => {
       if (diaIndex < 0 || diaIndex >= listaTurnos[0].length) return false;
       return listaTurnos.every(turnosDelTecnico => 
          turnosDelTecnico[diaIndex]?.trim().toUpperCase() === 'N'
       );
    };

    // 1. Buscar +/- 7 días
    for (let offset = 0; offset <= 7; offset++) {
        const checkOffsets = offset === 0 ? [0] : [offset, -offset];
        for (const k of checkOffsets) {
            const diaCandidato = diaTarget + k;
            if (diaCandidato >= 1 && diaCandidato <= diasEnMes) {
                if (todosTienenNoche(diaCandidato - 1)) {
                    const nuevaFecha = new Date(fechaProyectada);
                    nuevaFecha.setDate(diaCandidato);
                    return nuevaFecha;
                }
            }
        }
    }

    // 2. Sábado más cercano (si no hay bloqueos)
    const CODIGOS_BLOQUEANTES = ['L', 'V', 'LIC', 'LM', 'LP'];
    const alguienBloqueado = (diaIndex: number) => {
        if (diaIndex < 0 || diaIndex >= listaTurnos[0].length) return true;
        return listaTurnos.some(turnosDelTecnico => {
            const turno = turnosDelTecnico[diaIndex]?.trim().toUpperCase() || "";
            return CODIGOS_BLOQUEANTES.some(bloqueo => turno.startsWith(bloqueo));
        });
    };

    let mejorSabado: number | null = null;
    let menorDistancia = Infinity;

    for (let d = 1; d <= diasEnMes; d++) {
        const fechaTemp = new Date(fechaProyectada.getFullYear(), fechaProyectada.getMonth(), d);
        if (fechaTemp.getDay() === 6) {
            if (!alguienBloqueado(d - 1)) {
                const distancia = Math.abs(d - diaTarget);
                if (distancia < menorDistancia) {
                    menorDistancia = distancia;
                    mejorSabado = d;
                }
            }
        }
    }

    if (mejorSabado !== null) {
        const fechaSabado = new Date(fechaProyectada);
        fechaSabado.setDate(mejorSabado);
        return fechaSabado;
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

  // --- MÉTODO 1: PLANIFICACIÓN STRICT (ORIGINAL) ---
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

        const colOtC = Object.keys(dfCumplimiento[0] || {}).find(c => c.includes("NRO_OT") || c.includes("PEDIDO")) || "";
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
            planta: plantaActual
        };

        const turnosValidos = tecnicosData.map(t => t.turnos).filter(t => t !== null) as string[][];

        if (turnosValidos.length > 0) {
            let fechaSugerida = new Date(fechaAntJS);
            fechaSugerida.setMonth(fechaSugerida.getMonth() + 1);
            let fechaFinal = this.buscarNocheComun(fechaSugerida, turnosValidos);
            if (fechaFinal) {
                fechaFinal = this.evitarDomingo(fechaFinal);
                resultados.push({ ...objetoOT, fechaSugerida: this.formatearFecha(fechaFinal) });
            } else {
                sinAsignar.push({ ...objetoOT, error: "SIN HORARIO COMPATIBLE" });
            }
        } else {
            sinAsignar.push({ ...objetoOT, error: "SIN TURNOS CARGADOS" });
        }
      } else {
        sinAsignar.push({ 
            ...filaAct, 
            nroOrden: nroOrdenActual, 
            equipo: actRaw, descripcion: descRaw, 
            tecnicos: [{ nombre: "OT NUEVA", rol: "M" }], 
            fechaAnterior: "N/A", planta: plantaActual 
        }); 
      }
    });
    return { resultados, sinAsignar };
  }

  // --- MÉTODO 2: PLANIFICACIÓN EQUILIBRADA (MEJORADA - PRIORIDAD FECHA) ---
  // --- MÉTODO 2: PLANIFICACIÓN EQUILIBRADA (PEAK SHAVING / MENOR MOVIMIENTO) ---
  // --- MÉTODO 2: PLANIFICACIÓN EQUILIBRADA (PEAK SHAVING / MENOR MOVIMIENTO) ---
  // --- MÉTODO 2: PLANIFICACIÓN EQUILIBRADA (PEAK SHAVING POR PLANTA) ---
  static generarPlanificacionEquilibrada(
    dfAct: any[], 
    dfAnt: any[], 
    dfCumplimiento: any[], 
    empleadosMap: Map<string, any> 
  ): { resultados: PlanResult[], sinAsignar: any[] } {
    
    const resultados: PlanResult[] = [];
    const sinAsignar: any[] = [];
    const ordenesParaDistribuir: any[] = [];

    // 1. PRIMERA PASADA: Identificar OTs, roles y Fecha Ideal
    dfAct.forEach(filaAct => {
      const deptoKey = Object.keys(filaAct).find(k => k.includes("DEPARTAMENTO")) || "";
      const plantaActual = this.mapDepartamentoAPlanta(String(filaAct[deptoKey] || ""));
      const otKeyAct = Object.keys(filaAct).find(k => k.includes("PEDIDO") || k.includes("TRABAJO")) || "";
      const nroOrden = String(filaAct[otKeyAct] || "PENDIENTE");
      const equipo = this.limpiarKey(filaAct["NÚMERO DE ACTIVO"] || filaAct["NUMERO DE ACTIVO"]);
      const descripcion = this.limpiarKey(filaAct["DESCRIPCIÓN"] || filaAct["DESCRIPCION"]);

      if (!equipo || !descripcion || equipo === "0") {
         sinAsignar.push({ ...filaAct, tecnicos: [], error: "DATOS INCOMPLETOS", planta: plantaActual });
         return;
      }

      const keyBusqueda = `${equipo}|${descripcion}`;
      const matchAnt = dfAnt.find(filaAnt => {
        const actAnt = this.limpiarKey(filaAnt["NÚMERO DE ACTIVO"] || filaAnt["NUMERO DE ACTIVO"]);
        const descAnt = this.limpiarKey(filaAnt["DESCRIPCIÓN"] || filaAnt["DESCRIPCION"]);
        return `${actAnt}|${descAnt}` === keyBusqueda;
      });

      let fechaIdeal: Date;
      let tecnicosSlots: any[] = [];
      let fechaAnteriorStr = "N/A";

      if (matchAnt) {
        const fechaKeyAnt = Object.keys(matchAnt).find(k => k.includes("FECHA INICIAL PROGRAMADA")) || "";
        const fechaAntJS = excelDateToJS(matchAnt[fechaKeyAnt]);
        fechaAnteriorStr = this.formatearFecha(fechaAntJS);
        
        // Proyección: +30 días
        fechaIdeal = new Date(fechaAntJS);
        fechaIdeal.setMonth(fechaIdeal.getMonth() + 1);
        
        // Roles
        const otKeyAnt = Object.keys(matchAnt).find(k => k.includes("PEDIDO") || k.includes("TRABAJO")) || "";
        const otAntId = String(matchAnt[otKeyAnt] || "").trim();
        const colOtC = Object.keys(dfCumplimiento[0] || {}).find(c => c.includes("NRO_OT") || c.includes("PEDIDO")) || "";
        const cumplimientos = dfCumplimiento.filter(cum => String(cum[colOtC]).includes(otAntId));

        let rolesRequeridos: string[] = [];
        if (cumplimientos.length > 0) {
           const nombresUnicos = new Set<string>();
           cumplimientos.forEach(c => {
               const colEmp = Object.keys(c).find(k => k.includes("EMPLEADO")) || "EMPLEADO";
               const nombre = String(c[colEmp] || "").trim().toUpperCase();
               if(nombre) nombresUnicos.add(nombre);
           });
           nombresUnicos.forEach(nombre => {
               const datosEmp = empleadosMap.get(nombre);
               rolesRequeridos.push(datosEmp ? datosEmp.rol : "M");
           });
        } 
        if (rolesRequeridos.length === 0) rolesRequeridos.push("M"); 
        rolesRequeridos.sort(); 

        tecnicosSlots = rolesRequeridos.map(rol => ({
            nombre: "VACANTE",
            rol: rol,
            turnos: null,
            existe: true
        }));

      } else {
        // Fallback si no hay historial
        const fechaKeyAct = Object.keys(filaAct).find(k => k.includes("FECHA INICIAL PROGRAMADA")) || "";
        fechaIdeal = filaAct[fechaKeyAct] ? excelDateToJS(filaAct[fechaKeyAct]) : new Date();
        tecnicosSlots = [{ nombre: "VACANTE", rol: "M", turnos: null, existe: true }];
      }

      // Ajuste de fines de semana (Dom->Lun, Sab->Vie)
      let fechaAjustada = new Date(fechaIdeal);
      const diaSem = fechaAjustada.getDay();
      if (diaSem === 0) fechaAjustada.setDate(fechaAjustada.getDate() + 1); 
      if (diaSem === 6) fechaAjustada.setDate(fechaAjustada.getDate() - 1); 

      ordenesParaDistribuir.push({
          nroOrden,
          equipo,
          descripcion,
          fechaAnterior: fechaAnteriorStr,
          tecnicos: tecnicosSlots,
          planta: plantaActual,
          fechaIdeal: fechaAjustada, 
          weekId: this.getWeekId(fechaAjustada)
      });
    });

    // 2. DISTRIBUCIÓN POR PLANTA -> LUEGO POR SEMANA
    // Agrupamos primero por PLANTA para que el balanceo sea independiente por equipo
    const ordenesPorPlanta = this.groupBy(ordenesParaDistribuir, 'planta');

    Object.keys(ordenesPorPlanta).forEach(plantaKey => {
        const ordenesDeLaPlanta = ordenesPorPlanta[plantaKey];
        
        // Dentro de cada planta, agrupamos por SEMANA
        const ordenesPorSemana = this.groupBy(ordenesDeLaPlanta, 'weekId');

        Object.keys(ordenesPorSemana).forEach(weekKey => {
            const ordenesDeLaSemana = ordenesPorSemana[weekKey];
            const fechaReferencia = ordenesDeLaSemana[0].fechaIdeal;
            const lunesSemana = this.getMonday(fechaReferencia);

            // Buckets [Lun, Mar, Mie, Jue, Vie]
            const buckets: any[][] = [[], [], [], [], []];

            // A. Asignación Inicial
            ordenesDeLaSemana.forEach((ot: any) => {
                let diaIdx = ot.fechaIdeal.getDay() - 1; // 0=Lun, 4=Vie
                if (diaIdx < 0) diaIdx = 0; 
                if (diaIdx > 4) diaIdx = 4;
                buckets[diaIdx].push(ot);
            });

            // B. Cálculo del Techo (Específico para esta Planta y esta Semana)
            const totalOTs = ordenesDeLaSemana.length;
            const techo = Math.ceil(totalOTs / 5);

            // C. Peak Shaving (Mover excedentes)
            for (let origen = 0; origen < 5; origen++) {
                while (buckets[origen].length > techo) {
                    const otMover = buckets[origen].pop();
                    
                    let mejorDestino = -1;
                    let menorDistancia = Infinity;

                    for (let destino = 0; destino < 5; destino++) {
                        if (destino === origen) continue;
                        
                        if (buckets[destino].length < techo) {
                            const distancia = Math.abs(destino - origen);
                            if (distancia < menorDistancia) {
                                menorDistancia = distancia;
                                mejorDestino = destino;
                            }
                        }
                    }

                    if (mejorDestino !== -1) {
                        buckets[mejorDestino].push(otMover);
                    } else {
                        buckets[origen].push(otMover);
                        break; 
                    }
                }
            }

            // D. Guardar
            buckets.forEach((listaOts, i) => {
                const fechaDia = new Date(lunesSemana);
                fechaDia.setDate(lunesSemana.getDate() + i);
                const fechaStr = this.formatearFecha(fechaDia);

                listaOts.forEach((ot: any) => {
                    resultados.push({ ...ot, fechaSugerida: fechaStr });
                });
            });
        });
    });

    return { resultados, sinAsignar };
  }

  static mapDepartamentoAPlanta(deptoRaw: string): string {
    const d = String(deptoRaw || "").trim().toUpperCase();
    if (!d) return "OTROS";
    if (d.includes("SADEMA")) return "SADEMA";
    if (d.includes("PF1")) return "PF1";
    if (d.includes("PF2")) return "PF2";
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