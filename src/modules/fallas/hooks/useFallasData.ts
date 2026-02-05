import { useState, useMemo } from "react";
import { FallaRow } from "../types";
import { getRangoSemana } from "../../../shared/utils/dateUtils";

interface FilterState {
    anio: number;
    planta: string;
    semana: string;
    drill: { tipo: 'EQUIPO' | 'CAUSA', valor: string } | null;
    topN: number;
}

export const useFallasData = (data: FallaRow[]) => {
    
    // 1. CONFIGURACIÓN INICIAL (Disponibilidad)
    const config = useMemo(() => {
        if (data.length === 0) return { semanas: [], anios: [], plantas: [], anioDefault: new Date().getFullYear() };
        
        const semanas = Array.from(new Set(data.map(d => d.semana))).sort((a, b) => b - a);
        const anios = Array.from(new Set(data.map(d => d.anio))).sort((a, b) => b - a);
        const plantas = Array.from(new Set(data.map(d => d.planta))).sort();
        
        return { semanas, anios, plantas, anioDefault: anios[0] };
    }, [data]);

    // 2. ESTADOS
    const [anioFiltro, setAnioFiltro] = useState<number>(config.anioDefault);
    const [plantaFiltro, setPlantaFiltro] = useState<string>("TODAS");
    const [semanaFiltro, setSemanaFiltro] = useState<string>("TODAS");
    const [filtroDrill, setFiltroDrill] = useState<{ tipo: 'EQUIPO' | 'CAUSA', valor: string } | null>(null);
    const [topN, setTopN] = useState<number>(5);

    // 3. FILTRADO PRINCIPAL
    const { datosFiltrados, datosAnioAnterior } = useMemo(() => {
        const filtrar = (anioTarget: number) => {
            return data.filter(d => {
                const matchAnio = d.anio === anioTarget;
                const matchPlanta = plantaFiltro === "TODAS" ? true : d.planta === plantaFiltro;
                const matchSemana = semanaFiltro === "TODAS" ? true : d.semana === Number(semanaFiltro);
                
                let matchDrill = true;
                if (filtroDrill) {
                    if (filtroDrill.tipo === 'EQUIPO') matchDrill = d.equipo === filtroDrill.valor;
                    if (filtroDrill.tipo === 'CAUSA') matchDrill = (d.causa || "").trim().toUpperCase() === filtroDrill.valor;
                }
                return matchAnio && matchPlanta && matchSemana && matchDrill;
            });
        };

        return {
            datosFiltrados: filtrar(anioFiltro),
            datosAnioAnterior: filtrar(anioFiltro - 1)
        };
    }, [data, anioFiltro, plantaFiltro, semanaFiltro, filtroDrill]);

    // 4. ANALYTICS (KPIs y Rankings)
    const analytics = useMemo(() => {
        // A. KPIs Globales
        const totalGasto = datosFiltrados.reduce((a, b) => a + b.gasto, 0);
        const totalTiempo = datosFiltrados.reduce((a, b) => a + b.duracionMinutos, 0);
        const totalEventos = datosFiltrados.length;
        const mttrGlobal = totalEventos > 0 ? totalTiempo / totalEventos : 0;

        const totalGastoPrev = datosAnioAnterior.reduce((a, b) => a + b.gasto, 0);
        const totalTiempoPrev = datosAnioAnterior.reduce((a, b) => a + b.duracionMinutos, 0);
        const totalEventosPrev = datosAnioAnterior.length;
        const mttrGlobalPrev = totalEventosPrev > 0 ? totalTiempoPrev / totalEventosPrev : 0;

        // B. Mapa Año Anterior (Comparativa)
        const prevMap = datosAnioAnterior.reduce((acc, curr) => {
            if (!acc[curr.equipo]) acc[curr.equipo] = { gasto: 0, tiempo: 0, count: 0 };
            acc[curr.equipo].gasto += curr.gasto;
            acc[curr.equipo].tiempo += curr.duracionMinutos;
            acc[curr.equipo].count += 1;
            return acc;
        }, {} as Record<string, { gasto: number, tiempo: number, count: number }>);

        // C. Agrupación Dinámica
        const groupBy = (keyFn: (d: FallaRow) => string) => {
            const map = datosFiltrados.reduce((acc, curr) => {
                const key = keyFn(curr);
                if (!acc[key]) {
                    const prevData = prevMap[key] || { gasto: 0, tiempo: 0, count: 0 };
                    acc[key] = { 
                        label: key, 
                        gasto: 0, tiempo: 0, count: 0,
                        prevGasto: prevData.gasto,
                        prevTiempo: prevData.tiempo,
                        prevCount: prevData.count,
                        prevMttr: prevData.count > 0 ? prevData.tiempo / prevData.count : 0
                    };
                }
                acc[key].gasto += curr.gasto;
                acc[key].tiempo += curr.duracionMinutos;
                acc[key].count += 1;
                return acc;
            }, {} as Record<string, any>);
            return Object.values(map);
        };

        // D. Rankings
        const porFrecuencia = groupBy(d => d.equipo).sort((a, b) => b.count - a.count).slice(0, topN);
        const porCosto = groupBy(d => d.equipo).sort((a, b) => b.gasto - a.gasto).slice(0, topN);
        const porTiempo = groupBy(d => d.equipo).sort((a, b) => b.tiempo - a.tiempo).slice(0, topN);
        const porMTTR = groupBy(d => d.equipo)
            .map(d => ({ ...d, mttr: d.tiempo / (d.count || 1) }))
            .sort((a, b) => b.mttr - a.mttr).slice(0, topN);
        const porCausa = groupBy(d => (d.causa || "S/D").trim().toUpperCase()).sort((a, b) => b.count - a.count).slice(0, Math.max(topN, 10));

        const heroStats = {
            totalGasto, totalEventos, totalTiempo,
            topCritico: porFrecuencia.length > 0 ? porFrecuencia[0] : null,
            topLista: groupBy(d => d.equipo).sort((a,b) => b.count - a.count).slice(0,3) 
        };

        return { 
            totalGasto, totalTiempo, totalEventos, mttrGlobal,
            totalGastoPrev, totalTiempoPrev, totalEventosPrev, mttrGlobalPrev,
            porCosto, porFrecuencia, porMTTR, porTiempo, porCausa, heroStats 
        };
    }, [datosFiltrados, datosAnioAnterior, topN]);

    // 5. TIMELINE (Evolución Semanal)
    const timelineStats = useMemo(() => {
        // Nota: Timeline usa los mismos filtros pero IGNORA la semana
        const datosTimeline = data.filter(d => {
            const matchAnio = d.anio === anioFiltro;
            const matchPlanta = plantaFiltro === "TODAS" ? true : d.planta === plantaFiltro;
            let matchDrill = true;
            if (filtroDrill) {
                if (filtroDrill.tipo === 'EQUIPO') matchDrill = d.equipo === filtroDrill.valor;
                if (filtroDrill.tipo === 'CAUSA') matchDrill = (d.causa || "").trim().toUpperCase() === filtroDrill.valor;
            }
            return matchAnio && matchPlanta && matchDrill;
        });

        if (datosTimeline.length === 0) return { chartData: [], maxVal: 0 };

        const groups = datosTimeline.reduce((acc, curr) => {
            acc[curr.semana] = (acc[curr.semana] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        const weeks = datosTimeline.map(d => d.semana);
        const minW = Math.min(...weeks);
        const maxW = Math.max(...weeks);
        const chartData = [];
        let maxVal = 0;

        for (let i = minW; i <= maxW; i++) {
            const count = groups[i] || 0;
            if (count > maxVal) maxVal = count;
            chartData.push({ semana: i, count, rango: getRangoSemana(i, anioFiltro) });
        }
        return { chartData, maxVal };
    }, [data, anioFiltro, plantaFiltro, filtroDrill]);

    return {
        // Datos Calculados
        datosFiltrados,
        analytics,
        timelineStats,
        config,
        
        // Estados y Setters
        anioFiltro, setAnioFiltro,
        plantaFiltro, setPlantaFiltro,
        semanaFiltro, setSemanaFiltro,
        filtroDrill, setFiltroDrill,
        topN, setTopN
    };
};