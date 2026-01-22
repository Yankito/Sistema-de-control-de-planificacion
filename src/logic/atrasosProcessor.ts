import * as XLSX from "xlsx";
import { normalizarColumnas } from "./excelProcessor";

export interface AtrasoRow {
  planta: string;
  ot: string;
  descripcion: string;
  estado: string;
  clasificacion: "TECNICO / SERVICIO" | "PROGRAMADOR" | "OC / OTRO";
  periodo: "2025" | "ENE-26" | "S/A";
  esOB: boolean;
}

export const processAtrasos = (sheets: { [key: string]: XLSX.WorkSheet }): AtrasoRow[] => {
  // PRIORIDAD 1: Si el archivo tiene nuestra hoja de resumen, es data ya procesada
  if (sheets["RESUMEN_DATA"]) {
    return XLSX.utils.sheet_to_json(sheets["RESUMEN_DATA"]) as AtrasoRow[];
  }

  const hojasPlantas = ["PF1", "PF2", "MP3"];
  if (!sheets["CUMPLIMIENTO"] || !sheets["MASIVO"]) return [];

  const dataCumplimiento = XLSX.utils.sheet_to_json(sheets["CUMPLIMIENTO"], { header: 1 }) as any[][];
  const dataMasivo = XLSX.utils.sheet_to_json(sheets["MASIVO"], { header: 1 }) as any[][];
  const dfActivos = sheets["ACTIVOS"] ? normalizarColumnas(XLSX.utils.sheet_to_json(sheets["ACTIVOS"])) : [];

  const resultados: AtrasoRow[] = [];

  hojasPlantas.forEach(nombreHoja => {
    if (!sheets[nombreHoja]) return;
    const dfPlanta = normalizarColumnas(XLSX.utils.sheet_to_json(sheets[nombreHoja]));

    dfPlanta.forEach(fila => {
      const estado = String(fila["ESTADO"] || "").trim();
      if (estado !== "Liberado") return;

      const nroOT = String(fila["PEDIDO DE TRABAJO"] || "").trim();
      
      // 1. Clasificación RMD/RSE
      const cumpleFila = dataCumplimiento.find(r => String(r[2] || "").trim() === nroOT);
      const masivoFila = dataMasivo.find(r => String(r[0] || "").trim() === nroOT);
      const opFinalizada = cumpleFila ? String(cumpleFila[8] || "").toUpperCase().trim() : "NO";
      
      let clasificacion: any = "OC / OTRO";
      if (opFinalizada !== "SI") clasificacion = "TECNICO / SERVICIO";
      else if (!masivoFila) clasificacion = "OC / OTRO";
      else {
        const rmd = String(masivoFila[11] || "").toUpperCase().trim();
        const rse = String(masivoFila[12] || "").toUpperCase().trim();
        clasificacion = (rmd === "SI" || rmd === "" || rmd === "0") && (rse === "SI" || rse === "" || rse === "0") 
          ? "PROGRAMADOR" : "OC / OTRO";
      }

      // 2. Lógica de Planta (MP3 Debug)
      // 4. Lógica de Planta (MP3 con regla de respaldo por primer dígito)
        let plantaReal = nombreHoja;

        if (nombreHoja === "MP3") {
        const nroActivoFull = String(fila["NÚMERO DE ACTIVO"] || "");
        const matchCC = nroActivoFull.match(/\((\d)(\d{3})\)/); // Capturamos el primer dígito por separado

        if (matchCC) {
            const ccCompleto = matchCC[0]; // Ejemplo: "(1080)"
            const primerDigito = matchCC[1]; // Ejemplo: "1"
            
            // Intento 1: Buscar en el maestro de ACTIVOS
            const activo = dfActivos.find(a => String(a["CC"] || "").trim() === ccCompleto);
            
            if (activo && activo["PLANTA"]) {
            plantaReal = String(activo["PLANTA"]).trim().toUpperCase();
            } else {
              // Intento 2: Regla del primer dígito (Respaldo)
              const mapeoPlantas: { [key: string]: string } = {
                  "1": "PF1",
                  "2": "PF2",
                  "3": "PF3",
                  "4": "PF4",
                  "5": "PF5",
                  "6": "PF6"
              };
              
              plantaReal = mapeoPlantas[primerDigito] || "OTROS";
              
            }
        } else {
            plantaReal = "SIN_CC";
        }
        }

      // 4. Periodo
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
        esOB: nroOT.startsWith("OB")
      });
    });
  });

  return resultados;
};