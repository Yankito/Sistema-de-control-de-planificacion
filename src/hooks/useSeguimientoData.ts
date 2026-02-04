// src/hooks/useSeguimientoData.ts
import { useState, useEffect, useCallback } from "react";
import { AtrasoRow } from "../types";
import { DatabaseService } from "../db/DatabaseService";

export const useSeguimientoData = (
    initialData: AtrasoRow[],
    initialAnterior: AtrasoRow[],
    initialCumplimiento: AtrasoRow[],
    historialCompleto: string[],
    callbacks?: {
        onCargarSemana?: (s: string) => void;
        onCambioComparacion?: (d: AtrasoRow[]) => void;
    }
) => {
    const [dataActual, setDataActual] = useState(initialData);
    const [dataAnterior, setDataAnterior] = useState(initialAnterior);
    const [dataCumplimiento, setDataCumplimiento] = useState(initialCumplimiento);
    
    // Estado interno para la UI
    const [reporteActual, setReporteActual] = useState<string>("");
    const [semanaComparar, setSemanaComparar] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    // Sincronizar props iniciales cuando cambian desde el padre (App.tsx)
    useEffect(() => { setDataActual(initialData); }, [initialData]);
    useEffect(() => { setDataAnterior(initialAnterior); }, [initialAnterior]);
    useEffect(() => { setDataCumplimiento(initialCumplimiento); }, [initialCumplimiento]);

    // Lógica principal de carga
    const cargarReporte = useCallback(async (nuevoReporte: string) => {
        setIsLoading(true);
        setReporteActual(nuevoReporte);
        
        try {
            // 1. Calcular label anterior automáticamente
            const match = nuevoReporte.match(/(\d{4})-S(\d+)/);
            let prevLabel = "";
            if (match) {
                 const year = parseInt(match[1]);
                 const week = parseInt(match[2]);
                 prevLabel = week > 1 
                    ? `${year}-S${(week - 1).toString().padStart(2, '0')}`
                    : `${year - 1}-S52`;
            }
            
            // Verificar si existe en el historial
            const existeAnterior = historialCompleto.includes(prevLabel);
            const labelAnterior = existeAnterior ? prevLabel : "";
            setSemanaComparar(labelAnterior);

            // 2. Fetch Paralelo
            const [resActual, resAnterior, resCumple] = await Promise.all([
                DatabaseService.getSnapshot(nuevoReporte, 'ATRASOS'),
                labelAnterior ? DatabaseService.getSnapshotLite(labelAnterior, 'ATRASOS') : Promise.resolve([]),
                DatabaseService.getSnapshot(nuevoReporte, 'CUMPLIMIENTO')
            ]);

            setDataActual(resActual);
            setDataAnterior(resAnterior);
            setDataCumplimiento(resCumple);

            // Ejecutar callbacks si existen
            if (callbacks?.onCargarSemana) callbacks.onCargarSemana(nuevoReporte);
            if (callbacks?.onCambioComparacion) callbacks.onCambioComparacion(resAnterior);

        } catch (error) {
            console.error("Error cargando reporte", error);
        } finally {
            setIsLoading(false);
        }
    }, [historialCompleto, callbacks]);

    // Lógica para cambiar comparación manualmente
    const cambiarComparacion = useCallback(async (semana: string) => {
        setIsLoading(true);
        setSemanaComparar(semana);
        try {
            if (semana === "") {
                setDataAnterior([]);
                if (callbacks?.onCambioComparacion) callbacks.onCambioComparacion([]);
            } else {
                const datos = await DatabaseService.getSnapshotLite(semana, 'ATRASOS');
                setDataAnterior(datos);
                if (callbacks?.onCambioComparacion) callbacks.onCambioComparacion(datos);
            }
        } catch(e) { console.error(e); } 
        finally { setIsLoading(false); }
    }, [callbacks]);

    const limpiarComparacion = useCallback(() => {
        setSemanaComparar("");
        setDataAnterior([]);
    }, []);

    return {
        dataActual,
        dataAnterior,
        dataCumplimiento,
        reporteActual,
        semanaComparar,
        isLoading,
        setReporteActual, // Por si necesitas setearlo manualmente sin cargar (inicio)
        cargarReporte,
        cambiarComparacion,
        limpiarComparacion
    };
};