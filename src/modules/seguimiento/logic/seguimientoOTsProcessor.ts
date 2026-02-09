import * as XLSX from "xlsx-js-style";
import { normalizarColumnas } from "../../planificacion/logic/excelProcessor"; // Asegura que la ruta sea correcta
import { AtrasoRow, MasivoRow, CumplimientoRow, ActivoRow, TecnicoEstado } from "../types";

// ... (Helpers de fecha se mantienen igual) ...
const getWeekLabel = (d: Date): string => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-S${weekNumber.toString().padStart(2, '0')}`;
};

const getPeriodoLabel = (d: Date): string => {
  const year = d.getFullYear();
  if (year <= 2025) return "2025";
  const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  return `${meses[d.getMonth()]}-${year.toString().substring(2)}`;
};

export const processSeguimientoOTs = (sheets: { [key: string]: XLSX.WorkSheet }) => {
  let dataAnterior: AtrasoRow[] = [];
  const hojaHistorico = Object.keys(sheets).find(n => n.toUpperCase().trim() === "RESUMEN_DATA");

  if (hojaHistorico) {
    const rawAnterior = XLSX.utils.sheet_to_json(sheets[hojaHistorico], { defval: "" }) as any[];
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

  const resultados: AtrasoRow[] = [];
  const listaActivos: ActivoRow[] = [];
  const rawMasivoData: MasivoRow[] = [];
  const rawCumplimientoData: CumplimientoRow[] = [];

  if (!sheets["CUMPLIMIENTO"] || !sheets["MASIVO"]) {
    return { actual: [], anterior: [], activos: [], masivoRaw: [], cumplimientoRaw: [] };
  }

  // CUMPLIMIENTO
  const rawCumplimiento = XLSX.utils.sheet_to_json(sheets["CUMPLIMIENTO"], { defval: "" });
  const dataCumplimientoNorm = normalizarColumnas(rawCumplimiento);
  const mapaCumplimiento = new Map<string, { total: boolean, tecnicos: TecnicoEstado[] }>();

  dataCumplimientoNorm.forEach(r => {
    const ot = String(r["NRO_OT"] || "").trim();
    if (!ot) return;

    rawCumplimientoData.push({
      planta: String(r["PLANTA"] || ""),
      empleado: String(r["EMPLEADO"] || ""),
      nro_ot: ot,
      tipo: String(r["TIPO"] || ""),
      estado_om: String(r["ESTADO_OM"] || ""),
      fecha_programada: String(r["FECHA_PROGRAMADA_INICIO"] || ""),
      op_finalizada: String(r["OP_FINALIZADA"] || "")
    });

    const empleado = String(r["EMPLEADO"] || "").trim();
    const opFin = String(r["OP_FINALIZADA"] || "").toUpperCase().trim();
    const finalizada = opFin === "SI";

    if (!mapaCumplimiento.has(ot)) { mapaCumplimiento.set(ot, { total: true, tecnicos: [] }); }
    const info = mapaCumplimiento.get(ot)!;
    const tec = info.tecnicos.find(t => t.tecnico === empleado);
    if (!tec) info.tecnicos.push({ tecnico: empleado, finalizada });
    else if (!finalizada) tec.finalizada = false;
    if (!finalizada) info.total = false;
  });

  // PROCESAMIENTO DE MASIVO 
  // { defval: "" } obliga a leer TODAS las columnas del encabezado, 
  const dataMasivo = normalizarColumnas(XLSX.utils.sheet_to_json(sheets["MASIVO"], { defval: "" }));
  const masivoLookup = new Map<string, { rmd: string, rse: string }>();

  dataMasivo.forEach(r => {
    const ot = String(r["NÚMERO"] || r["NUMERO"] || r["NUMBER"] || "").trim();
    if (!ot) return;

    const valRmd = String(r["RMD"] || "").trim().toUpperCase();
    const valRse = String(r["RSE"] || "").trim().toUpperCase();

    rawMasivoData.push({
      numero_ot: ot,
      activo: String(r["ACTIVO"] || "").trim(),
      descripcion: String(r["DESCRIPCIÓN"] || r["DESCRIPCION"] || "").trim(),
      tpt: String(r["TPT"] || "").trim(),
      fecha_progr: String(r["FECHA PROGR."] || "").trim(),
      horas: Number(r["HORAS"]) || 0,
      rmd: valRmd,
      rse: valRse
    });

    masivoLookup.set(ot, { rmd: valRmd, rse: valRse });
  });

  // ACTIVOS
  const dfActivos = sheets["ACTIVOS"] ? normalizarColumnas(XLSX.utils.sheet_to_json(sheets["ACTIVOS"], { defval: "" })) : [];
  if (dfActivos.length > 0) {
    dfActivos.forEach(a => {
      const cc = String(a["CC"] || "").replace(/[()]/g, "").trim();
      if (cc) {
        listaActivos.push({
          codigo: cc,
          descripcion: String(a["DESC_NRO_DE_ACTIVO"] || "").trim(),
          planta: String(a["PLANTA"] || "").trim().toUpperCase(),
          ubicacion: String(a["DESC_GRUPO_DE_ACTIVO"] || "").trim()
        });
      }
    });
  }

  // CRUCE FINAL
  const hojasPlantas = ["PF1", "PF2", "MP3", "MPS"];
  const estadosFinalizados = ["Finalizado", "Finalizado Sin Cargos", "Finalizar - Sin Cargos"];
  const estadosInteres = ["Liberado", ...estadosFinalizados];
  const otsProcesadasEnCiclo = new Set<string>();

  hojasPlantas.forEach(nombreHoja => {
    if (!sheets[nombreHoja]) return;
    const dfPlanta = normalizarColumnas(XLSX.utils.sheet_to_json(sheets[nombreHoja], { defval: "" }));

    dfPlanta.forEach(fila => {
      const nroOT = String(fila["PEDIDO DE TRABAJO"] || "").trim();
      if (!nroOT || otsProcesadasEnCiclo.has(nroOT)) return;

      const estado = String(fila["ESTADO"] || "").trim();
      if (!estadosInteres.includes(estado)) return;

      const descripcion = String(fila["DESCRIPCIÓN"] || "").trim();
      const nroActivo = String(fila["NÚMERO DE ACTIVO"] || "").trim();

      otsProcesadasEnCiclo.add(nroOT);

      const infoCumple = mapaCumplimiento.get(nroOT);
      const infoMasivo = masivoLookup.get(nroOT);

      const valRmd = infoMasivo ? infoMasivo.rmd : "N/A";
      const valRse = infoMasivo ? infoMasivo.rse : "N/A";

      // Lógica de clasificación
      let clasificacion: AtrasoRow['clasificacion'];
      if (estadosFinalizados.includes(estado)) {
        clasificacion = "CUMPLIDA";
      } else {
        if (!infoCumple) {
          clasificacion = "OC / OTRO";
        } else if (!infoCumple.total) {
          clasificacion = "TECNICO / SERVICIO";
        } else if (!infoMasivo) {
          clasificacion = "OC / OTRO";
        } else {
          const rmdOk = valRmd === "SI" || valRmd === "" || valRmd === "0";
          const rseOk = valRse === "SI" || valRse === "" || valRse === "0";
          clasificacion = (rmdOk && rseOk) ? "PROGRAMADOR" : "OC / OTRO";
        }
      }

      // Lógica de Planta Real (MP3 -> Activos)
      let plantaReal = nombreHoja;
      if (nombreHoja === "MP3") {
        const matchCC = nroActivo.match(/\((\d)(\d{3})\)/);
        if (matchCC) {
          const ccPuro = matchCC[1] + matchCC[2];
          const activoFound = listaActivos.find(a => a.codigo === ccPuro);
          if (activoFound && activoFound.planta) plantaReal = activoFound.planta;
          else {
            const mapeo: { [key: string]: string } = { "1": "PF1", "2": "PF2", "3": "PF3", "4": "PF4", "5": "PF5", "6": "PF6" };
            plantaReal = mapeo[matchCC[1]] || "OTROS";
          }
        }
      }

      const fechaRaw = fila["FECHA INICIAL PROGRAMADA"];
      let periodo = "S/A";
      let semana = "S/D";
      let fechaFormateada = "";

      if (fechaRaw) {
        let dateObj: Date;
        if (typeof fechaRaw === 'number') {
          dateObj = new Date((fechaRaw - 25569) * 86400 * 1000);
        } else {
          // Si viene como string "14/05/2025 9:42:15", limpiamos la hora
          const dateStr = String(fechaRaw).split(" ")[0];
          const [d, m, y] = dateStr.split("/");
          dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        }

        if (!isNaN(dateObj.getTime())) {
          semana = getWeekLabel(dateObj);
          periodo = getPeriodoLabel(dateObj);
          fechaFormateada = dateObj.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      }

      // Lógica para identificar Infraestructura (OB)
      // Si empieza con "OB"
      const tienePrefijoOB = nroOT.toUpperCase().startsWith("OB");

      // Si no tiene prefijo pero la descripción dice "(INFRA)"
      const contieneTagInfra = /INFRA/i.test(descripcion);

      const esOB = tienePrefijoOB || contieneTagInfra;

      resultados.push({
        planta: plantaReal,
        ot: nroOT,
        nroActivo: nroActivo,
        descripcion,
        estado,
        clasificacion,
        periodo,
        semana,
        esOB,
        fecha: fechaFormateada,
        detallesTecnicos: infoCumple?.tecnicos || [],
        rmd: valRmd,
        rse: valRse
      });
    });
  });

  return {
    actual: resultados,
    anterior: dataAnterior,
    activos: listaActivos,
    masivoRaw: rawMasivoData,
    cumplimientoRaw: rawCumplimientoData
  };
};