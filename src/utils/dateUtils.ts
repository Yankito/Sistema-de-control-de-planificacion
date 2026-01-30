// src/utils/dateUtils.ts

export const getRangoSemana = (semana: number, anio: number) => {
  // 1. Creamos una fecha para el 1 de Enero del año solicitado
  const primerDiaAnio = new Date(anio, 0, 1);
  
  // 2. Obtenemos el día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
  const diaSemana = primerDiaAnio.getDay();

  // 3. Ajustamos para encontrar el LUNES de esa primera semana.
  // En JS, el Domingo es 0. Nosotros queremos que Lunes sea el "inicio" (índice 0 relativo).
  // Si es Domingo (0), hay que retroceder 6 días para llegar al lunes anterior.
  // Si es Lunes (1), retrocedemos 0 días.
  // Si es Martes (2), retrocedemos 1 día, etc.
  const diasParaRetroceder = diaSemana === 0 ? 6 : diaSemana - 1;

  // Calculamos la fecha del Lunes de la Semana 1
  const inicioSemana1 = new Date(primerDiaAnio);
  inicioSemana1.setDate(primerDiaAnio.getDate() - diasParaRetroceder);

  // 4. Calculamos el inicio de la semana solicitada
  // Sumamos 7 días por cada semana que ha pasado después de la primera
  const inicioSemanaTarget = new Date(inicioSemana1);
  inicioSemanaTarget.setDate(inicioSemana1.getDate() + ((semana - 1) * 7));

  // 5. Calculamos el fin de la semana (El inicio + 6 días = Domingo)
  const finSemanaTarget = new Date(inicioSemanaTarget);
  finSemanaTarget.setDate(inicioSemanaTarget.getDate() + 6);

  // Formateador simple
  const fmt = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
  
  return `${fmt(inicioSemanaTarget)} - ${fmt(finSemanaTarget)}`;
};

export const clp = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);
export const num = (v: number) => new Intl.NumberFormat('es-CL').format(v);
export const fechaFmt = (d: Date) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });