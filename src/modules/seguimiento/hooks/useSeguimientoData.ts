import { useState, useCallback } from "react";
import { AtrasoRow } from "../types";
import { DatabaseService } from "../../../shared/db/DatabaseService";

export const useSeguimientoData = (
  historialCompleto: string[]
) => {
  const [dataActual, setDataActual] = useState<AtrasoRow[]>([]);
  const [dataAnterior, setDataAnterior] = useState<AtrasoRow[]>([]);
  const [dataCumplimiento, setDataCumplimiento] = useState<AtrasoRow[]>([]);

  const [reporteActual, setReporteActual] = useState<string>("");
  const [semanaComparar, setSemanaComparar] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Función para setear datos manualmente, subida de un archivo Excel
  const setDatosManuales = useCallback((actual: AtrasoRow[], anterior: AtrasoRow[], cumplimiento: AtrasoRow[], reporteLabel: string) => {
    setDataActual(actual);
    setDataAnterior(anterior);
    setDataCumplimiento(cumplimiento);
    setReporteActual(reporteLabel);
  }, []);

  // Lógica de Carga desde DB
  const cargarReporte = useCallback(async (nuevoReporte: string) => {
    // Evitar recarga si ya tenemos ese reporte cargado
    if (nuevoReporte === reporteActual && dataActual.length > 0) return;

    setIsLoading(true);
    setReporteActual(nuevoReporte);

    try {
      // Calcular label anterior automático
      const match = nuevoReporte.match(/(\d{4})-S(\d+)/);
      let prevLabel = "";
      if (match) {
        const year = parseInt(match[1]);
        const week = parseInt(match[2]);
        prevLabel = week > 1
          ? `${year}-S${(week - 1).toString().padStart(2, '0')}`
          : `${year - 1}-S52`;
      }

      const existeAnterior = historialCompleto.includes(prevLabel);
      const labelAnterior = existeAnterior ? prevLabel : "";
      setSemanaComparar(labelAnterior);

      // Fetch Paralelo
      const [resActual, resAnterior, resCumple] = await Promise.all([
        DatabaseService.getSnapshot(nuevoReporte, 'SEGUIMIENTO'),
        labelAnterior ? DatabaseService.getSnapshotLite(labelAnterior, 'SEGUIMIENTO') : Promise.resolve([]),
        DatabaseService.getSnapshot(nuevoReporte, 'CUMPLIMIENTO')
      ]);

      setDataActual(resActual);
      setDataAnterior(resAnterior);
      setDataCumplimiento(resCumple);

    } catch (error) {
      console.error("Error cargando reporte", error);
    } finally {
      setIsLoading(false);
    }
  }, [historialCompleto, reporteActual, dataActual.length]);

  // Comparación Manual
  const cambiarComparacion = useCallback(async (semana: string) => {
    setIsLoading(true);
    setSemanaComparar(semana);
    try {
      if (semana === "") {
        setDataAnterior([]);
      } else {
        const datos = await DatabaseService.getSnapshotLite(semana, 'SEGUIMIENTO');
        setDataAnterior(datos);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  const limpiarComparacion = useCallback(() => {
    setSemanaComparar("");
    setDataAnterior([]);
  }, []);

  const resetTodo = useCallback(() => {
    setDataActual([]);
    setDataAnterior([]);
    setDataCumplimiento([]);
    setReporteActual("");
  }, []);

  return {
    // Datos
    dataActual,
    dataAnterior,
    dataCumplimiento,
    reporteActual,
    semanaComparar,
    isLoading,
    // Acciones
    cargarReporte,
    cambiarComparacion,
    limpiarComparacion,
    setDatosManuales,
    resetTodo
  };
};