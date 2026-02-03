// src/types.ts
export interface PlanResult {
  nroOrden: string;
  equipo: string;
  descripcion: string;
  planta: string;
  tecnicos: {
    nombre: string;
    rol: string;
    turnos?: string[] | null;
    existe?: boolean;
  }[];
  fechaSugerida: string;
  fechaAnterior: string;
  error?: string;
}

export interface HorarioTecnico {
  nombre: string;
  rol: string;
  planta: string;
  turnos: string[];
}

export interface SeguimientoRow {
  nroOT: string;
  descripcion: string;
  clase: string;
  planta: string;
  estado: string;
  tipo: "MANTENCION" | "INFRAESTRUCTURA";
}

export interface SeguimientoResult {
  mantencion: SeguimientoRow[];
  infraestructura: SeguimientoRow[];
}

export interface FallaRow {
  fecha: Date;
  semana: number;
  planta: string;
  area: string;
  linea: string;
  equipo: string;
  causa: string;
  estadoPedido: string;
  tipoPedido: string;
  tecnico: string;
  duracionMinutos: number; 
  gasto: number; 
  perdidaKg: number; 
  anio: number;
  mes: number;
  descripcionOperador: string;
}

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

export interface ActivoRow {
  codigo: string;
  descripcion: string;
  planta: string;
  ubicacion: string;
}

export interface MasivoRow {
  numero_ot: string;
  activo: string;
  descripcion: string;
  tpt: string;
  fecha_progr: string;
  horas: number;
  rmd: string;
  rse: string;
}

export interface CumplimientoRow {
  planta: string;
  empleado: string;
  nro_ot: string;
  tipo: string;
  estado_om: string; // El dato clave
  fecha_programada: string;
  op_finalizada: string;
}