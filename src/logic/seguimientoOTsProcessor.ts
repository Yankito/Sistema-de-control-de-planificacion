import * as XLSX from "xlsx";
import { normalizarColumnas } from "./excelProcessor";

// --- TIPOS ---
export interface TecnicoEstado {
  tecnico: string;
  finalizada: boolean;
}

export interface AtrasoRow {
  planta: string;
  ot: string;
  descripcion: string;
  estado: string;
  clasificacion: "CUMPLIDA" | "TECNICO / SERVICIO" | "PROGRAMADOR" | "OC / OTRO";
  periodo: string;
  semana: string; 
  esOB: boolean;
  detallesTecnicos?: TecnicoEstado[];
  rmd?: string;
  rse?: string;
}

// --- HELPER: Obtener Rango de Fechas ---
const getWeekLabel = (d: Date): string => {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

    const lunes = new Date(d.valueOf());
    const diaSemana = (lunes.getDay() + 6) % 7; 
    lunes.setDate(lunes.getDate() - diaSemana); 

    const domingo = new Date(lunes.valueOf());
    domingo.setDate(lunes.getDate() + 6);

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const formato = (f: Date) => `${f.getDate()} ${meses[f.getMonth()]}`;

    return `W${weekNumber.toString().padStart(2, '0')} (${formato(lunes)} - ${formato(domingo)})`;
};

export const processSeguimientoOTs = (sheets: { [key: string]: XLSX.WorkSheet }) => {
  // --- PARTE 1: HISTÓRICO ---
  let dataAnterior: AtrasoRow[] = [];
  const hojaHistorico = Object.keys(sheets).find(n => n.toUpperCase().trim() === "RESUMEN_DATA");

  if (hojaHistorico) {
    const rawAnterior = XLSX.utils.sheet_to_json(sheets[hojaHistorico]) as any[];
    dataAnterior = rawAnterior.map(item => ({
        planta: String(item.planta || item.Planta || "").toUpperCase(),
        ot: String(item.ot || item.OT || ""),
        clasificacion: String(item.clasificacion || item.Clasificacion || "").toUpperCase().trim(),
        periodo: String(item.periodo || item.Periodo || ""),
        semana: String(item.semana || item.Semana || "S/D"),
        esOB: String(item.esob || item.Es_OB).toUpperCase() === "SI" || item.esob === true,
        detallesTecnicos: [],
        descripcion: String(item.descripcion || item.Descripcion || ""),
        estado: String(item.estado || item.Estado || "")
    } as AtrasoRow));
  }

  // --- PARTE 2: DATA ACTUAL ---
  const resultados: AtrasoRow[] = [];
  const hojasPlantas = ["PF1", "PF2", "MP3", "MPS"];
  
  if (!sheets["CUMPLIMIENTO"] || !sheets["MASIVO"]) {
      return { actual: resultados, anterior: dataAnterior };
  }

  // 2.1 PROCESAMIENTO DE CUMPLIMIENTO
  const dataCumplimiento = XLSX.utils.sheet_to_json(sheets["CUMPLIMIENTO"]) as any[];
  const mapaCumplimiento = new Map<string, { total: boolean, tecnicos: TecnicoEstado[] }>();

  dataCumplimiento.forEach(r => {
    const ot = String(r["NRO_OT"] || "").trim();
    if (!ot) return;
    const nombreEmpleado = String(r["EMPLEADO"] || "Sin Nombre").trim();
    const finalizada = String(r["OP_FINALIZADA"] || "").toUpperCase().trim() === "SI";

    if (!mapaCumplimiento.has(ot)) {
        mapaCumplimiento.set(ot, { total: true, tecnicos: [] });
    }
    const info = mapaCumplimiento.get(ot)!;
    
    const tecnicoExistente = info.tecnicos.find(t => t.tecnico === nombreEmpleado);
    
    if (!tecnicoExistente) {
      info.tecnicos.push({ tecnico: nombreEmpleado, finalizada });
    } else {
       if (!finalizada) tecnicoExistente.finalizada = false;
    }

    if (!finalizada) info.total = false;
  });

  // 2.2 PROCESAMIENTO MASIVO
  const rawMasivo = XLSX.utils.sheet_to_json(sheets["MASIVO"], { header: 1 }) as any[][];
  const dfActivos = sheets["ACTIVOS"] ? normalizarColumnas(XLSX.utils.sheet_to_json(sheets["ACTIVOS"])) : [];

  const estadosFinalizados = ["Finalizado", "Finalizado Sin Cargos", "Finalizar - Sin Cargos", "Cerrado", "Cierre Técnico"];
  const estadosInteres = ["Liberado", ...estadosFinalizados];

  const otsProcesadasEnCiclo = new Set<string>();

  hojasPlantas.forEach(nombreHoja => {
    if (!sheets[nombreHoja]) return;
    const dfPlanta = normalizarColumnas(XLSX.utils.sheet_to_json(sheets[nombreHoja]));

    dfPlanta.forEach(fila => {
      // 1. Obtener OT y verificar duplicados
      const nroOT = String(fila["PEDIDO DE TRABAJO"] || "").trim();
      if (!nroOT || otsProcesadasEnCiclo.has(nroOT)) return;

      // 2. FILTRO NUEVO: Omitir si la descripción comienza con "Mob:"
      const descripcion = String(fila["DESCRIPCIÓN"] || "").trim();
      

      // 3. Verificar Estado
      const estado = String(fila["ESTADO"] || "").trim();
      if (!estadosInteres.includes(estado)) return;

      // 4. Verificar Existencia en Cumplimiento (Regla de Negocio Crítica)
      const infoCumple = mapaCumplimiento.get(nroOT);

      // Marcamos como procesada
      otsProcesadasEnCiclo.add(nroOT);

      const masivoFila = rawMasivo.find(r => String(r[0] || "").trim() === nroOT);
      const valRmd = masivoFila ? String(masivoFila[11] || "").toUpperCase().trim() : "N/A";
      const valRse = masivoFila ? String(masivoFila[12] || "").toUpperCase().trim() : "N/A";

      let clasificacion: "CUMPLIDA" | "TECNICO / SERVICIO" | "PROGRAMADOR" | "OC / OTRO";

      if (estadosFinalizados.includes(estado)) {
        clasificacion = "CUMPLIDA";
      } else {
        if (!infoCumple) clasificacion = "OC / OTRO";
        else if (!infoCumple.total) clasificacion = "TECNICO / SERVICIO";
        else if (!masivoFila) clasificacion = "OC / OTRO";
        else {
          const rmdOk = valRmd === "SI" || valRmd === "" || valRmd === "0";
          const rseOk = valRse === "SI" || valRse === "" || valRse === "0";
          clasificacion = (rmdOk && rseOk) ? "PROGRAMADOR" : "OC / OTRO";
        }
      }

      let plantaReal = nombreHoja;
      if (nombreHoja === "MP3") {
        const nroActivoFull = String(fila["NÚMERO DE ACTIVO"] || "");
        const matchCC = nroActivoFull.match(/\((\d)(\d{3})\)/);
        if (matchCC) {
          const activo = dfActivos.find(a => String(a["CC"] || "").trim() === matchCC[0]);
          if (activo && activo["PLANTA"]) plantaReal = String(activo["PLANTA"]).trim().toUpperCase();
          else {
            const mapeo: { [key: string]: string } = { "1": "PF1", "2": "PF2", "3": "PF3", "4": "PF4", "5": "PF5", "6": "PF6" };
            plantaReal = mapeo[matchCC[1]] || "OTROS";
          }
        }
      }

      const fechaRaw = fila["FECHA INICIAL PROGRAMADA"];
      let periodo = "S/A";
      let semana = "S/D";

      if (fechaRaw) {
        const fecha = new Date((Number(fechaRaw) - 25569) * 86400 * 1000);
        if (fecha.getFullYear() === 2025) periodo = "2025";
        else if (fecha.getFullYear() === 2026 && fecha.getMonth() === 0) periodo = "ENE-26";
        semana = getWeekLabel(fecha);
      }

      resultados.push({
        planta: plantaReal, 
        ot: nroOT, 
        descripcion,
        estado: estado, 
        clasificacion, 
        periodo, 
        semana, 
        esOB: nroOT.startsWith("OB"),
        detallesTecnicos: infoCumple?.tecnicos || [], 
        rmd: valRmd, 
        rse: valRse
      });
    });
  });

  return { actual: resultados, anterior: dataAnterior };
};