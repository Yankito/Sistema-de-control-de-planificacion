import { useMemo } from "react";

const getWeekNumber = (d: Date) => {
  const inicioSemana1 = new Date(2026, 0, 5); 
  const fechaActual = new Date(d);
  fechaActual.setHours(0, 0, 0, 0);
  inicioSemana1.setHours(0, 0, 0, 0);
  const diffTime = fechaActual.getTime() - inicioSemana1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 0;
  return Math.floor(diffDays / 7) + 1;
};

export const useCalendarioGrid = (planResult: any[], ordenesPorDia: any) => {
    
    return useMemo(() => {
        const base = planResult[0]?.fechaSugerida || "01/02/2026"; 
        const [, mes, anio] = base.split('/').map(Number);
        const primerDia = new Date(anio, mes - 1, 1);
        const ultimoDia = new Date(anio, mes, 0).getDate();
        const nombreMes = primerDia.toLocaleString('es-ES', { month: 'long' });
        
        let startIdx = primerDia.getDay() - 1;
        if (startIdx === -1) startIdx = 6;

        const diasArray = [
            ...Array(startIdx).fill(null),
            ...Array.from({ length: ultimoDia }, (_, i) => {
                const d = (i + 1).toString().padStart(2, '0');
                const m = mes.toString().padStart(2, '0');
                return `${d}/${m}/${anio}`;
            })
        ];

        const semanasArr = [];
        let totalMes = 0;

        for (let i = 0; i < diasArray.length; i += 7) {
            const chunk = diasArray.slice(i, i + 7);
            const fechaRefStr = chunk.find(d => d !== null);
            let numSemana = 0;
            if (fechaRefStr) {
                const [d, m, y] = fechaRefStr.split('/').map(Number);
                numSemana = getWeekNumber(new Date(y, m - 1, d));
            }
            chunk.forEach(fecha => {
                if (fecha && ordenesPorDia[fecha]) totalMes += ordenesPorDia[fecha].length;
            });
            semanasArr.push({
                numero: numSemana,
                dias: chunk,
                idSemana: `WEEK-${numSemana}`
            });
        }

        return { 
            semanas: semanasArr, 
            nombreMes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1), 
            totalOrdenesMes: totalMes, 
            anioActual: anio 
        };
    }, [planResult, ordenesPorDia]);
};