import * as XLSX from "xlsx";
import { normalizarColumnas } from "./excelProcessor";
import { SeguimientoResult, SeguimientoRow } from "../types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const limpiar = (val: any) => String(val || "").trim();

/**
 * Busca el valor de una columna de forma flexible.
 * Elimina espacios y símbolos para comparar.
 * Ej: "Pedido de Trabajo" coincide con "PEDIDODETRABAJO"
 */
const getVal = (row: any, ...nombresPosibles: string[]) => {
  const keys = Object.keys(row);
  
  for (const nombre of nombresPosibles) {
    // 1. Búsqueda exacta
    if (row[nombre] !== undefined) return row[nombre];
    
    // 2. Búsqueda normalizada (mayúsculas y sin símbolos)
    const nombreClean = nombre.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const keyEncontrada = keys.find(k => 
      k.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === nombreClean
    );

    if (keyEncontrada) return row[keyEncontrada];
  }
  return "";
};

/**
 * Extrae el código entre paréntesis.
 * Ej: "PF ... (0351)" -> "(0351)"
 */
const extraerCC = (texto: string): string => {
  if (!texto) return "";
  const match = texto.match(/\(\d+\)/g); 
  if (match && match.length > 0) {
    return match[match.length - 1]; 
  }
  return "";
};

// ============================================================================
// LOGICA PRINCIPAL
// ============================================================================

export const processSeguimiento = (sheets: { [key: string]: XLSX.WorkSheet }): SeguimientoResult => {
  
  // 1. Verificación de hojas
  const hojas = ["STGO", "PF1", "PF2", "CI", "ACTIVOS", "CUMPLIMIENTO"];
  const faltantes = hojas.filter(h => !sheets[h]);
  
  if (faltantes.length > 0) {
    console.warn("Faltan hojas:", faltantes);
    alert(`Faltan hojas: ${faltantes.join(", ")}`);
    return { mantencion: [], infraestructura: [] };
  }

  console.log("--- PROCESANDO SEGUIMIENTO (HEADERS CONFIRMADOS) ---");

  // 2. Lectura y Normalización
  // IMPORTANTE: { defval: "" } obliga a leer la columna CLASE_CONTABLE aunque esté vacía en la fila 2
  const opts = { defval: "" };

  const dfStgo = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["STGO"], opts));
  const dfPf1 = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["PF1"], opts));
  const dfPf2 = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["PF2"], opts));
  const dfCi = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["CI"], opts));
  const dfActivos = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["ACTIVOS"], opts));
  const dfCumplimiento = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["CUMPLIMIENTO"], opts));

  // -----------------------------------------------------------------------
  // PASO 1: MAESTRO DE ACTIVOS
  // -----------------------------------------------------------------------
  const mapActivos = new Map<string, string>();
  
  console.groupCollapsed("DEBUG: Mapa Activos");
  
  // Imprimimos las columnas leídas para confirmar que CLASE_CONTABLE está ahí
  if (dfActivos.length > 0) console.log("Columnas leídas en ACTIVOS:", Object.keys(dfActivos[0]));

  dfActivos.forEach((row, i) => {
    // Encabezados: NRO_DE_ACTIVO, CLASE_CONTABLE
    const nroActivo = limpiar(getVal(row, "NRO_DE_ACTIVO", "NRODEACTIVO"));
    const cc = extraerCC(nroActivo); 
    const clase = limpiar(getVal(row, "CLASE_CONTABLE", "CLASECONTABLE"));

    if (cc) {
      mapActivos.set(cc, clase);
      // Logueamos si encontramos una clase que NO sea vacía para verificar
      if (clase !== "" && i < 20) console.log(`CC: ${cc} -> Clase: ${clase}`);
    }
  });
  console.log(`Activos mapeados: ${mapActivos.size}`);
  console.groupEnd();

  // -----------------------------------------------------------------------
  // PASO 2: MAPAS PLANTAS (PF1, PF2, STGO)
  // -----------------------------------------------------------------------
  const crearMapaDesc = (df: any[]) => {
    const map = new Map<string, string>();
    df.forEach(row => {
      // Encabezados: Pedido de Trabajo, Descripción
      const ot = limpiar(getVal(row, "Pedido de Trabajo", "PEDIDODETRABAJO", "NRO_OT"));
      const desc = limpiar(getVal(row, "Descripción", "DESCRIPCION"));
      if (ot) map.set(ot, desc);
    });
    return map;
  };

  const mapStgo = crearMapaDesc(dfStgo);
  const mapPf1 = crearMapaDesc(dfPf1);
  const mapPf2 = crearMapaDesc(dfPf2);

  // -----------------------------------------------------------------------
  // PASO 3: MAPA CI (PLANTA 3) - LÓGICA DOBLE SALTO
  // -----------------------------------------------------------------------
  const mapCiDesc = new Map<string, string>();
  const mapCiClase = new Map<string, string>();

  console.groupCollapsed("DEBUG: Cruce CI");
  dfCi.forEach((row) => {
    // Encabezados CI: Pedido de Trabajo, Descripción, Número de Activo
    const ot = limpiar(getVal(row, "Pedido de Trabajo", "PEDIDODETRABAJO"));
    const desc = limpiar(getVal(row, "Descripción", "DESCRIPCION"));
    const activoEnCi = limpiar(getVal(row, "Número de Activo", "NUMERODEACTIVO", "NRO_DE_ACTIVO"));
    
    // Extraemos CC (ej: "(5522)") del activo de CI
    const cc = extraerCC(activoEnCi); 

    // Buscamos en ACTIVOS
    const claseCalculada = mapActivos.get(cc);

    if (ot) {
      mapCiDesc.set(ot, desc);
      mapCiClase.set(ot, claseCalculada || "S/D");
    }
  });
  console.groupEnd();

  // -----------------------------------------------------------------------
  // PASO 4: CUMPLIMIENTO
  // -----------------------------------------------------------------------
  const mantencion: SeguimientoRow[] = [];
  const infraestructura: SeguimientoRow[] = [];

  dfCumplimiento.forEach(row => {
    // Encabezados CUMPLIMIENTO: ESTADO_OM, NRO_OT, PLANTA
    const estado = limpiar(getVal(row, "ESTADO_OM", "ESTADO"));
    if (estado === "Cancelado") return;

    const nroOT = limpiar(getVal(row, "NRO_OT", "ORDEN"));
    if (nroOT.toLowerCase().startsWith("mob")) return;

    const plantaRaw = limpiar(getVal(row, "PLANTA"));
    const planta = plantaRaw.toUpperCase();

    let descripcion = "";
    let clase = "";

    // Lógica Plantas
    if (planta.includes("SANTIAGO") || planta.includes("CDS") || planta.includes("DISTRIBUCION")) {
      descripcion = mapStgo.get(nroOT) || "";
      clase = "MPS";
    } 
    else if (planta.includes("PLANTA III") || planta.includes("PLANTA 3")) {
      descripcion = mapCiDesc.get(nroOT) || "";
      clase = mapCiClase.get(nroOT) || "S/D";
    }
    else if (planta.includes("PLANTA II") || planta.includes("PLANTA 2")) {
      descripcion = mapPf2.get(nroOT) || "";
      clase = "PF2";
    }
    else if (planta.includes("PLANTA I") || planta.includes("PLANTA 1")) {
      descripcion = mapPf1.get(nroOT) || "";
      clase = "PF1";
    }

    // Fallbacks
    if (!descripcion) descripcion = "Sin Descripción";
    if (!clase) clase = "S/D";

    const rowObj: SeguimientoRow = {
      nroOT,
      descripcion,
      clase,
      planta: plantaRaw,
      estado,
      tipo: "MANTENCION"
    };

    // Separación Infraestructura
    const esOB = nroOT.toUpperCase().startsWith("OB");
    const esInfra = rowObj.descripcion.toLowerCase().includes("(infra)");

    if (esOB || esInfra) {
      rowObj.tipo = "INFRAESTRUCTURA";
      infraestructura.push(rowObj);
    } else {
      mantencion.push(rowObj);
    }
  });

  return { mantencion, infraestructura };
};