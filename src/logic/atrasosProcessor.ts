import * as XLSX from "xlsx";
import { normalizarColumnas } from "./excelProcessor";

export interface TecnicoEstado {
  tecnico: string;
  finalizada: boolean;
}

export interface AtrasoRow {
  planta: string;
  ot: string;
  descripcion: string;
  estado: string;
  clasificacion: "TECNICO / SERVICIO" | "PROGRAMADOR" | "OC / OTRO";
  periodo: "2025" | "ENE-26" | "S/A";
  esOB: boolean;
  detallesTecnicos?: TecnicoEstado[];
  // NUEVOS CAMPOS PARA EL DETALLE
  rmd?: string;
  rse?: string;
}

export const processAtrasos = (sheets: { [key: string]: XLSX.WorkSheet }): AtrasoRow[] => {
  // 1. Detección de Resumen Histórico
  if (sheets["RESUMEN_DATA"]) {
    const rawData = XLSX.utils.sheet_to_json(sheets["RESUMEN_DATA"]) as any[];
    return rawData.map(item => ({
      ...item,
      detallesTecnicos: typeof item.detallesTecnicos === 'string' 
        ? JSON.parse(item.detallesTecnicos) 
        : item.detallesTecnicos
    })) as AtrasoRow[];
  }

  const hojasPlantas = ["PF1", "PF2", "MP3"];
  if (!sheets["CUMPLIMIENTO"] || !sheets["MASIVO"]) return [];

  // 2. Pre-procesar Cumplimiento
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
    if (!info.tecnicos.find(t => t.tecnico === nombreEmpleado)) {
      info.tecnicos.push({ tecnico: nombreEmpleado, finalizada });
    }
    if (!finalizada) info.total = false;
  });

  const rawMasivo = XLSX.utils.sheet_to_json(sheets["MASIVO"], { header: 1 }) as any[][];
  const dfActivos = sheets["ACTIVOS"] ? normalizarColumnas(XLSX.utils.sheet_to_json(sheets["ACTIVOS"])) : [];
  const resultados: AtrasoRow[] = [];

  hojasPlantas.forEach(nombreHoja => {
    if (!sheets[nombreHoja]) return;
    const dfPlanta = normalizarColumnas(XLSX.utils.sheet_to_json(sheets[nombreHoja]));

    dfPlanta.forEach(fila => {
      const estado = String(fila["ESTADO"] || "").trim();
      if (estado !== "Liberado") return;

      const nroOT = String(fila["PEDIDO DE TRABAJO"] || "").trim();
      const infoCumple = mapaCumplimiento.get(nroOT);
      
      // BUSCAR DATOS EN MASIVO PARA RMD/RSE
      const masivoFila = rawMasivo.find(r => String(r[0] || "").trim() === nroOT);
      const valRmd = masivoFila ? String(masivoFila[11] || "").toUpperCase().trim() : "N/A";
      const valRse = masivoFila ? String(masivoFila[12] || "").toUpperCase().trim() : "N/A";

      let clasificacion: "TECNICO / SERVICIO" | "PROGRAMADOR" | "OC / OTRO";

      // --- NUEVO FILTRO REQUERIDO ---
      if (!infoCumple) {
        // Si no se encuentra en cumplimiento, pasa inmediatamente a Otros
        clasificacion = "OC / OTRO";
      } else if (!infoCumple.total) {
        // Si está en cumplimiento pero hay operaciones "No", es Técnico
        clasificacion = "TECNICO / SERVICIO";
      } else if (!masivoFila) {
        // Si está finalizada pero no está en el masivo
        clasificacion = "OC / OTRO";
      } else {
        // Lógica de Programador vs Otros
        const rmdOk = valRmd === "SI" || valRmd === "" || valRmd === "0";
        const rseOk = valRse === "SI" || valRse === "" || valRse === "0";
        clasificacion = (rmdOk && rseOk) ? "PROGRAMADOR" : "OC / OTRO";
      }

      // Lógica de planta... (se mantiene igual)
      let plantaReal = nombreHoja;
      if (nombreHoja === "MP3") {
        const nroActivoFull = String(fila["NÚMERO DE ACTIVO"] || "");
        const matchCC = nroActivoFull.match(/\((\d)(\d{3})\)/);
        if (matchCC) {
          const activo = dfActivos.find(a => String(a["CC"] || "").trim() === matchCC[0]);
          if (activo && activo["PLANTA"]) plantaReal = String(activo["PLANTA"]).trim().toUpperCase();
          else plantaReal = { "1": "PF1", "2": "PF2", "3": "PF3", "4": "PF4", "5": "PF5", "6": "PF6" }[matchCC[1]] || "OTROS";
        }
      }

      const fechaRaw = fila["FECHA INICIAL PROGRAMADA"];
      let periodo: any = "S/A";
      if (fechaRaw) {
        const fecha = new Date((fechaRaw - 25569) * 86400 * 1000);
        if (fecha.getFullYear() === 2025) periodo = "2025";
        else if (fecha.getFullYear() === 2026 && fecha.getMonth() === 0) periodo = "ENE-26";
      }

      resultados.push({
        planta: plantaReal,
        ot: nroOT,
        descripcion: String(fila["DESCRIPCIÓN"] || ""),
        estado: estado,
        clasificacion,
        periodo,
        esOB: nroOT.startsWith("OB"),
        detallesTecnicos: infoCumple?.tecnicos || [],
        rmd: valRmd,
        rse: valRse
      });
    });
  });

  return resultados;
};