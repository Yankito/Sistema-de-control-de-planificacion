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
  clasificacion: "TECNICO / SERVICIO" | "PROGRAMADOR" | "OC / OTRO" | "CUMPLIDA"; 
  periodo: "2025" | "ENE-26" | "S/A";
  esOB: boolean; // Si es Orden Base (Preventivo) o Correctivo
  detallesTecnicos?: TecnicoEstado[];
  rmd?: string;
  rse?: string;
}

export const processAtrasos = (sheets: { [key: string]: XLSX.WorkSheet }): AtrasoRow[] => {
  
  // 1. DETECCIÓN DE HISTÓRICO
  if (sheets["RESUMEN_DATA"]) {
    const rawData = XLSX.utils.sheet_to_json(sheets["RESUMEN_DATA"]) as any[];
    return rawData.map(item => ({
      ...item,
      detallesTecnicos: typeof item.detallesTecnicos === 'string' 
        ? JSON.parse(item.detallesTecnicos) 
        : (item.detallesTecnicos || [])
    })) as AtrasoRow[];
  }

  const hojasPlantas = ["PF1", "PF2", "MP3"];
  if (!sheets["CUMPLIMIENTO"] || !sheets["MASIVO"]) return [];

  // 2. PROCESAR CUMPLIMIENTO (Status de Técnicos)
  const dataCumplimiento = XLSX.utils.sheet_to_json(sheets["CUMPLIMIENTO"]) as any[];
  const mapaCumplimiento = new Map<string, { total: boolean, tecnicos: TecnicoEstado[] }>();

  dataCumplimiento.forEach(r => {
    const ot = String(r["NRO_OT"] || "").trim();
    if (!ot) return;

    const nombreEmpleado = String(r["EMPLEADO"] || "Sin Nombre").trim();
    // Normalizamos respuesta SI/NO
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

  // 3. PROCESAR MASIVO (Logística)
  // Usamos header:1 para acceder por índice, más rápido
  const rawMasivo = XLSX.utils.sheet_to_json(sheets["MASIVO"], { header: 1 }) as any[][];
  
  // 4. PROCESAR ACTIVOS (Mapeo de CC a Planta)
  const dfActivos = sheets["ACTIVOS"] ? normalizarColumnas(XLSX.utils.sheet_to_json(sheets["ACTIVOS"])) : [];

  const resultados: AtrasoRow[] = [];

  // 5. CRUCE DE DATOS
  hojasPlantas.forEach(nombreHoja => {
    if (!sheets[nombreHoja]) return;
    const dfPlanta = normalizarColumnas(XLSX.utils.sheet_to_json(sheets[nombreHoja]));

    dfPlanta.forEach(fila => {
      const estado = String(fila["ESTADO"] || "").trim();
      // Ajusta este filtro según tus necesidades reales (ej. "LIB", "EN PROCESO")
      if (estado !== "Liberado") return; 

      const nroOT = String(fila["PEDIDO DE TRABAJO"] || "").trim();
      const infoCumple = mapaCumplimiento.get(nroOT);
      
      // Buscar en Masivo (Indices basados en tu excel: 11=RMD, 12=RSE)
      const masivoFila = rawMasivo.find(r => String(r[0] || "").trim() === nroOT);
      const valRmd = masivoFila ? String(masivoFila[11] || "").toUpperCase().trim() : "N/A";
      const valRse = masivoFila ? String(masivoFila[12] || "").toUpperCase().trim() : "N/A";

      // --- CLASIFICACIÓN DE CUELLO DE BOTELLA ---
      let clasificacion: AtrasoRow["clasificacion"];

      if (!infoCumple) {
        // No está en cumplimiento: Error administrativo o falta asignar
        clasificacion = "OC / OTRO"; 
      } else if (!infoCumple.total) {
        // Está en cumplimiento y alguien no terminó: Culpa de Mantenimiento
        clasificacion = "TECNICO / SERVICIO";
      } else {
        // Mantenimiento terminó, revisamos logística
        const rmdPendiente = valRmd === "NO";
        const rsePendiente = valRse === "NO";

        if (rmdPendiente || rsePendiente) {
            clasificacion = "MATERIALES";
        } else {
            // Si todo está OK logísticamente y técnicamente, es Programación/Cierre
            clasificacion = "PROGRAMADOR";
        }
      }

      // --- DETECCIÓN DE PLANTA (MP3) ---
      let plantaReal = nombreHoja;
      if (nombreHoja === "MP3") {
        const nroActivoFull = String(fila["NÚMERO DE ACTIVO"] || "");
        // Regex para capturar (X)(XXX) -> Digito Planta + CC
        const matchCC = nroActivoFull.match(/\((\d)(\d{3})\)/); 
        
        if (matchCC) {
            const primerDigito = matchCC[1]; // ej: "1" de 1630
            
            // Intento 1: Buscar en hoja de activos
            const activoMatch = dfActivos.find(a => String(a["CC"] || "").includes(matchCC[2])); // Buscamos por el 630
            
            if (activoMatch && activoMatch["PLANTA"]) {
                plantaReal = String(activoMatch["PLANTA"]).trim().toUpperCase();
            } else {
                // Intento 2: Fallback por primer dígito
                const mapeo: { [key: string]: string } = { 
                    "1": "PF1", "2": "PF2", "3": "PF3", "4": "PF4", "5": "PF5", "6": "PF6" 
                };
                plantaReal = mapeo[primerDigito] || "OTROS";
            }
        } else {
            plantaReal = "OTROS";
        }
      }

      // --- DETECCIÓN DE PERIODO ---
      const fechaRaw = fila["FECHA INICIAL PROGRAMADA"];
      let periodo: any = "S/A";
      if (fechaRaw && typeof fechaRaw === 'number') {
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
        esOB: nroOT.startsWith("OB"), // Lógica simple para detectar Preventivo
        detallesTecnicos: infoCumple?.tecnicos || [],
        rmd: valRmd,
        rse: valRse
      });
    });
  });

  return resultados;
};