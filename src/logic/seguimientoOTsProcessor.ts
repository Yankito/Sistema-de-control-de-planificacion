import * as XLSX from "xlsx";
import { normalizarColumnas } from "./excelProcessor";
import { AtrasoRow, TecnicoEstado } from "./atrasosProcessor";

export const processSeguimientoOTs = (sheets: { [key: string]: XLSX.WorkSheet }) => {
  // --- PARTE 1: LEER EL RESUMEN PEGADO (ANTERIOR) ---
  let dataAnterior: AtrasoRow[] = [];
  const hojaHistorico = Object.keys(sheets).find(n => n.toUpperCase().trim() === "RESUMEN_DATA");

  if (hojaHistorico) {
    const rawAnterior = XLSX.utils.sheet_to_json(sheets[hojaHistorico]) as any[];
    dataAnterior = rawAnterior.map(item => {
      const row: any = {};
      Object.keys(item).forEach(k => { row[k.toLowerCase().trim()] = item[k]; });
      return {
        planta: String(row.planta || "").toUpperCase(),
        ot: String(row.ot || ""),
        clasificacion: String(row.clasificacion || "").toUpperCase().trim(),
        periodo: String(row.periodo || ""),
        esOB: String(row.esob).toUpperCase() === "SI" || row.esob === true,
        // Solo necesitamos estos datos para contar en los cuadros
      } as AtrasoRow;
    });
  }

  // --- PARTE 2: PROCESAR DATA ACTUAL ---
  const resultados: AtrasoRow[] = [];
  const hojasPlantas = ["PF1", "PF2", "MP3"];
  
  if (!sheets["CUMPLIMIENTO"] || !sheets["MASIVO"]) {
      return { actual: resultados, anterior: dataAnterior };
  }

  const dataCumplimiento = XLSX.utils.sheet_to_json(sheets["CUMPLIMIENTO"]) as any[];
  const mapaCumplimiento = new Map<string, { total: boolean, tecnicos: TecnicoEstado[] }>();

  dataCumplimiento.forEach(r => {
    const ot = String(r["NRO_OT"] || "").trim();
    if (!ot) return;
    const nombreEmpleado = String(r["EMPLEADO"] || "Sin Nombre").trim();
    const finalizada = String(r["OP_FINALIZADA"] || "").toUpperCase().trim() === "SI";

    if (!mapaCumplimiento.has(ot)) mapaCumplimiento.set(ot, { total: true, tecnicos: [] });
    const info = mapaCumplimiento.get(ot)!;
    const tecnicoExistente = info.tecnicos.find(t => t.tecnico === nombreEmpleado);
    
    if (!tecnicoExistente) {
      info.tecnicos.push({ tecnico: nombreEmpleado, finalizada });
    } else if (!finalizada) {
      tecnicoExistente.finalizada = false;
    }
    if (!finalizada) info.total = false;
  });

  const rawMasivo = XLSX.utils.sheet_to_json(sheets["MASIVO"], { header: 1 }) as any[][];
  const dfActivos = sheets["ACTIVOS"] ? normalizarColumnas(XLSX.utils.sheet_to_json(sheets["ACTIVOS"])) : [];

  const estadosFinalizados = ["Finalizado", "Finalizado Sin Cargos", "Finalizar - Sin Cargos"];
  const estadosInteres = ["Liberado", ...estadosFinalizados];

  hojasPlantas.forEach(nombreHoja => {
    if (!sheets[nombreHoja]) return;
    const dfPlanta = normalizarColumnas(XLSX.utils.sheet_to_json(sheets[nombreHoja]));

    dfPlanta.forEach(fila => {
      const estado = String(fila["ESTADO"] || "").trim();
      if (!estadosInteres.includes(estado)) return;

      const nroOT = String(fila["PEDIDO DE TRABAJO"] || "").trim();
      const infoCumple = mapaCumplimiento.get(nroOT);
      const masivoFila = rawMasivo.find(r => String(r[0] || "").trim() === nroOT);
      
      const valRmd = masivoFila ? String(masivoFila[11] || "").toUpperCase().trim() : "N/A";
      const valRse = masivoFila ? String(masivoFila[12] || "").toUpperCase().trim() : "N/A";

      let clasificacion: any;
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
      let periodo: any = "S/A";
      if (fechaRaw) {
        const fecha = new Date((fechaRaw - 25569) * 86400 * 1000);
        if (fecha.getFullYear() === 2025) periodo = "2025";
        else if (fecha.getFullYear() === 2026 && fecha.getMonth() === 0) periodo = "ENE-26";
      }

      resultados.push({
        planta: plantaReal, ot: nroOT, descripcion: String(fila["DESCRIPCIÓN"] || ""),
        estado: estado, clasificacion, periodo, esOB: nroOT.startsWith("OB"),
        detallesTecnicos: infoCumple?.tecnicos || [], rmd: valRmd, rse: valRse
      });
    });
  });

  return { actual: resultados, anterior: dataAnterior };
};