import * as XLSX from "xlsx-js-style";

// ==========================================
// 1. DEFINICIONES DE COLUMNAS (CONSTANTES)
// ==========================================

// --- PLAN (Ya existente) ---
const COLS_PLAN_B = [
  "Pedido de Trabajo", "Número de Activo", "Grupo de Activos", "Descripción", 
  "Fecha Inicial Programada", "Duración(horas)", "Departamento de Propiedad", "Estado"
];
const COLS_PLAN_CUMPL = [
  "PLANTA", "EMPLEADO", "NRO_OT", "TIPO", "ESTADO_OM", 
  "FECHA_PROGRAMADA_INICIO", "NRO_OPERACION", "NRO_SEQ_RECURSO", "OP_FINALIZADA"
];
const COLS_EMPLEADOS = ["PLANTA", "EMPLEADO", "ROL"];

// --- FALLAS ---
const COLS_FALLAS_DETALLE = [
  "Fecha", "Secuencia", "Planta", "Descripcion Area", "Nombre Línea Prod", 
  "Equipo Nombre", "Descripcion Causa", "Solicitud Trabajo", "Pedido Trabajo", 
  "Pedido Trabajo", // Nota: Aparece duplicado en tu especificación, lo mantengo así
  "Estado Pedido", "Tipo Pedido Trabajo", "Técnico", "Descripción Operador", 
  "Descripcion OM", "Fecha Fin OM", "Hora Inicio Paro", "Hora Fin Paro", 
  "Duración Reparación Tablet [min]", "Duración Paro Oracle [min]", 
  "Gasto OM [$]", "Pérdida por Paro [kg]"
];

// --- ATRASOS ---
const COLS_ATRASOS_CUMPLIMIENTO = [
  "PLANTA", "EMPLEADO", "NRO_OT", "TIPO", "ESTADO_OM", 
  "FECHA_PROGRAMADA_INICIO", "NRO_OPERACION", "NRO_SEQ_RECURSO", "OP_FINALIZADA"
];
const COLS_ATRASOS_MASIVO = [
  "Número", "Activo", "Descripción", "TPT", "Fecha Progr.", "Anx", 
  "Art. Inv.", "Art. Dir.", "N° Sol.", "Serv. Ex.", "Horas", "RMD", "RSE"
];
const COLS_ATRASOS_PLANTAS = [ // Para PF1, PF2, MP3, MPS
  "Pedido de Trabajo", "Número de Activo", "Grupo de Activos", "Descripción", 
  "Fecha Inicial Programada", "Duración(horas)", "Departamento de Propiedad", "Estado"
];
const COLS_ATRASOS_ACTIVOS = [
  "GRUPO_DE_ACTIVO", "DESC_GRUPO_DE_ACTIVO", "NRO_DE_SERIE", "MANTENIBLE", "CC", 
  "NRO_DE_ACTIVO", "DESC_NRO_DE_ACTIVO", "NRO_DE_ACTIVO_PADRE", "ORGANIZACION", 
  "CLASE_CONTABLE", "PLANTA"
];


// ==========================================
// 2. HELPERS GENERADORES
// ==========================================

const crearHojaSimple = (wb: XLSX.WorkBook, columnas: string[], nombreHoja: string) => {
  const ws = XLSX.utils.aoa_to_sheet([columnas]);
  // Ajuste visual de ancho de columnas
  ws['!cols'] = columnas.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
};

const generarHojaHorarios = (): XLSX.WorkSheet => {
  const diasDelMes = Array.from({ length: 31 }, (_, i) => i + 1);
  const diasSemana = Array.from({ length: 31 }, (_, i) => ["L","M","M","J","V","S","D"][i % 7]);

  const data = [
    ["PF3"], 
    ["", "ENERO 2026", ...Array(30).fill(null)], 
    ["", ...diasDelMes], 
    ["", ...diasSemana], 
    ["JUAN PEREZ", ...Array(31).fill("M")], 
    [], 
    ["PF4"], 
    ["", "ENERO 2026"],
    ["", ...diasDelMes],
    ["", ...diasSemana],
    ["MARIA GOMEZ", ...Array(31).fill("T")]
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = [
    { s: { r: 1, c: 1 }, e: { r: 1, c: 31 } },
    { s: { r: 7, c: 1 }, e: { r: 7, c: 31 } }
  ];
  ws['!cols'] = [{ wch: 25 }, ...Array(31).fill({ wch: 3 })];
  return ws;
};


// ==========================================
// 3. FUNCIONES DE DESCARGA EXPORTABLES
// ==========================================

// --- PLANTILLA: PLAN ---
export const descargarPlantillaPlan = () => {
  const wb = XLSX.utils.book_new();
  crearHojaSimple(wb, COLS_PLAN_B, "B.ANT");
  crearHojaSimple(wb, COLS_PLAN_B, "B.ACT");
  crearHojaSimple(wb, COLS_PLAN_CUMPL, "CUMPLIMIENTO");
  XLSX.utils.book_append_sheet(wb, generarHojaHorarios(), "HORARIOS");
  crearHojaSimple(wb, COLS_EMPLEADOS, "EMPLEADOS");
  XLSX.writeFile(wb, "Plantilla_Maestro_PLAN.xlsx");
};

// --- PLANTILLA: FALLAS ---
export const descargarPlantillaFallas = () => {
  const wb = XLSX.utils.book_new();
  crearHojaSimple(wb, COLS_FALLAS_DETALLE, "Detalle MTBF MTTR");
  XLSX.writeFile(wb, "Plantilla_FALLAS.xlsx");
};

// --- PLANTILLA: ATRASOS ---
export const descargarPlantillaAtrasos = () => {
  const wb = XLSX.utils.book_new();
  
  crearHojaSimple(wb, COLS_ATRASOS_CUMPLIMIENTO, "CUMPLIMIENTO");
  crearHojaSimple(wb, COLS_ATRASOS_MASIVO, "MASIVO");
  
  // Hojas de Plantas (Misma estructura)
  ["PF1", "PF2", "MP3", "MPS"].forEach(planta => {
    crearHojaSimple(wb, COLS_ATRASOS_PLANTAS, planta);
  });

  crearHojaSimple(wb, COLS_ATRASOS_ACTIVOS, "ACTIVOS");
  
  // Hoja vacía para RESUMEN_DATA (Opcional, pero para que exista)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), "RESUMEN_DATA");

  XLSX.writeFile(wb, "Plantilla_Reporte_ATRASOS.xlsx");
};

// --- GENÉRICO (Para Anterior/Seguimiento si no requieren algo complejo) ---
export const descargarPlantillaSimple = (nombre: string, columnas: string[]) => {
  const wb = XLSX.utils.book_new();
  crearHojaSimple(wb, columnas, "Datos");
  XLSX.writeFile(wb, `Plantilla_${nombre}.xlsx`);
};