// src/utils/dateUtils.ts

export const getRangoSemana = (semana: number, anio: number) => {
  // LÓGICA ESPECIAL: Semana 1 (Corta, del 1 al 4 de Enero)
  if (semana === 1) {
      return `01/01 - 04/01`;
  }

  // LÓGICA GENERAL: A partir de la semana 2, empezamos desde el 5 de Enero
  // Si es semana 2, han pasado 0 semanas desde el hito (5 de enero).
  // Si es semana 3, ha pasado 1 semana, etc.
  const semanasTranscurridas = semana - 2; 

  const inicioCiclo = new Date(anio, 0, 5); // 5 de Enero (Inicio Semana 2)
  const inicioSemana = new Date(inicioCiclo);
  
  // Sumamos las semanas correspondientes
  inicioSemana.setDate(inicioCiclo.getDate() + (semanasTranscurridas * 7));
  
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6); // La semana dura 7 días

  const fmt = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
  
  return `${fmt(inicioSemana)} - ${fmt(finSemana)}`;
};

export const clp = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);
export const num = (v: number) => new Intl.NumberFormat('es-CL').format(v);
export const fechaFmt = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });