// src/logic/atrasosProcessor.ts
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
  rmd?: string;
  rse?: string;
}

export const processAtrasos = (sheets: { [key: string]: XLSX.WorkSheet }): AtrasoRow[] => {
  
  // --- 1. DETECCIÓN DE ARCHIVO HISTÓRICO (Resumen exportado previamente) ---
  if (sheets["RESUMEN_DATA"]) {
    const rawData = XLSX.utils.sheet_to_json(sheets["RESUMEN_DATA"]) as any[];
    return rawData.map(item => ({
      ...item,
      // Recuperamos el array de técnicos que guardamos como String en el Excel
      detallesTecnicos: typeof item.detallesTecnicos === 'string' 
        ? JSON.parse(item.detallesTecnicos) 
        : (item.detallesTecnicos || [])
    })) as AtrasoRow[];
  }

  const hojasPlantas = ["PF1", "PF2", "MP3"];
  if (!sheets["CUMPLIMIENTO"] || !sheets["MASIVO"]) return [];

  // --- 2. PRE-PROCESAR CUMPLIMIENTO (Agrupación por OT y Estado de Técnicos) ---
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
    
    // Evitar duplicar el mismo técnico en la misma OT (si aparece en varias operaciones)
    const tecnicoExistente = info.tecnicos.find(t => t.tecnico === nombreEmpleado);
    if (!tecnicoExistente) {
      info.tecnicos.push({ tecnico: nombreEmpleado, finalizada });
    } else {
      // Si el técnico ya estaba, pero esta operación no la ha terminado, su estado global es NO
      if (!finalizada) tecnicoExistente.finalizada = false;
    }

    // Regla Maestra: Si una sola operación de la OT es "No", la OT no está finalizada
    if (!finalizada) info.total = false;
  });

  // --- 3. PRE-PROCESAR MASIVO (Para RMD / RSE) ---
  const rawMasivo = XLSX.utils.sheet_to_json(sheets["MASIVO"], { header: 1 }) as any[][];
  
  // --- 4. PRE-PROCESAR ACTIVOS (Para validación de plantas en MP3) ---
  const dfActivos = sheets["ACTIVOS"] ? normalizarColumnas(XLSX.utils.sheet_to_json(sheets["ACTIVOS"])) : [];

  const resultados: AtrasoRow[] = [];

  // --- 5. PROCESAR HOJAS DE PLANTAS (PF1, PF2, MP3) ---
  hojasPlantas.forEach(nombreHoja => {
    if (!sheets[nombreHoja]) return;
    const dfPlanta = normalizarColumnas(XLSX.utils.sheet_to_json(sheets[nombreHoja]));

    dfPlanta.forEach(fila => {
      const estado = String(fila["ESTADO"] || "").trim();
      if (estado !== "Liberado") return;

      const nroOT = String(fila["PEDIDO DE TRABAJO"] || "").trim();
      const infoCumple = mapaCumplimiento.get(nroOT);
      
      // Buscar datos en el Masivo (RMD en col 11, RSE en col 12)
      const masivoFila = rawMasivo.find(r => String(r[0] || "").trim() === nroOT);
      const valRmd = masivoFila ? String(masivoFila[11] || "").toUpperCase().trim() : "N/A";
      const valRse = masivoFila ? String(masivoFila[12] || "").toUpperCase().trim() : "N/A";

      let clasificacion: "TECNICO / SERVICIO" | "PROGRAMADOR" | "OC / OTRO";

      // --- LÓGICA DE CLASIFICACIÓN ---
      if (!infoCumple) {
        // 1. Si no existe en cumplimiento, es un error de proceso o administrativo
        clasificacion = "OC / OTRO";
      } else if (!infoCumple.total) {
        // 2. Si existe pero hay técnicos con "No", es atraso de Técnico
        clasificacion = "TECNICO / SERVICIO";
      } else if (!masivoFila) {
        // 3. Si terminó técnico pero no está en masivo
        clasificacion = "OC / OTRO";
      } else {
        // 4. Si terminó técnico y está en masivo, checkeamos suministros
        const rmdOk = valRmd === "SI" || valRmd === "" || valRmd === "0";
        const rseOk = valRse === "SI" || valRse === "" || valRse === "0";
        clasificacion = (rmdOk && rseOk) ? "PROGRAMADOR" : "OC / OTRO";
      }

      // --- LÓGICA DE PLANTA (Especial para MP3) ---
      let plantaReal = nombreHoja;
      if (nombreHoja === "MP3") {
        const nroActivoFull = String(fila["NÚMERO DE ACTIVO"] || "");
        const matchCC = nroActivoFull.match(/\((\d)(\d{3})\)/); // Busca el Centro de Costo (X000)
        
        if (matchCC) {
          const primerDigito = matchCC[1];
          const activo = dfActivos.find(a => String(a["CC"] || "").trim() === matchCC[0]);
          
          if (activo && activo["PLANTA"]) {
            plantaReal = String(activo["PLANTA"]).trim().toUpperCase();
          } else {
            // Regla de respaldo por dígito
            const mapeo: { [key: string]: string } = { "1": "PF1", "2": "PF2", "3": "PF3", "4": "PF4", "5": "PF5", "6": "PF6" };
            plantaReal = mapeo[primerDigito] || "OTROS";
          }
        }
      }

      // --- LÓGICA DE PERIODO (Fechas de SAP) ---
      const fechaRaw = fila["FECHA INICIAL PROGRAMADA"];
      let periodo: any = "S/A";
      if (fechaRaw) {
        // Excel maneja fechas como números (días desde 1900)
        const fecha = new Date((fechaRaw - 25569) * 86400 * 1000);
        if (fecha.getFullYear() === 2025) {
          periodo = "2025";
        } else if (fecha.getFullYear() === 2026 && fecha.getMonth() === 0) {
          periodo = "ENE-26";
        }
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