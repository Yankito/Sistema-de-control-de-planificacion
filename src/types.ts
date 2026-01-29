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
  duracionMinutos: number; // Duración Paro Oracle [min]
  gasto: number; // Gasto OM [$]
  perdidaKg: number; // Pérdida por Paro [kg]
  anio: number;
  mes: number;
  descripcionOperador: string;
}