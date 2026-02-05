import { useMemo, useState } from "react";
import { PlanResult } from "../types";

export const useTecnicosCarga = (planResult: PlanResult[], plantaSel: string) => {
    
    // 1. Estados Locales
    const [busqueda, setBusqueda] = useState("");
    const [celdaSeleccionada, setCeldaSeleccionada] = useState<{ nombre: string, fecha: string, ots: any[] } | null>(null);

    // 2. Lógica de Transformación (La parte pesada)
    const { datosTecnicos, diasMes } = useMemo(() => {
        const mapaTecnicos = new Map<string, { rol: string, carga: Record<string, any[]> }>();
        
        if (!planResult || planResult.length === 0) return { datosTecnicos: [], diasMes: [] };

        // Obtener mes/año base
        let mes = 1, anio = 2026;
        const primeraConFecha = planResult.find(p => p.fechaSugerida && p.fechaSugerida.includes('/'));
        
        if (primeraConFecha) {
            const parts = primeraConFecha.fechaSugerida.split('/');
            if(parts.length === 3) {
                mes = parseInt(parts[1]);
                anio = parseInt(parts[2]);
            }
        }

        // Generar días del mes
        const ultimoDia = new Date(anio, mes, 0).getDate();
        const dias = Array.from({ length: ultimoDia }, (_, i) => {
            const d = (i + 1).toString().padStart(2, '0');
            const m = mes.toString().padStart(2, '0');
            return `${d}/${m}/${anio}`;
        });

        // Llenar mapa
        planResult.forEach(ot => {
            const plantaOT = (ot.planta || "").toUpperCase().trim();
            const plantaFiltro = plantaSel.toUpperCase().trim();

            if (plantaFiltro !== "TODAS" && plantaOT !== plantaFiltro) return;

            ot.tecnicos.forEach((tec: any) => {
                if (!tec.nombre || ["VACANTE", "OT NUEVA", "SIN HISTORIAL"].includes(tec.nombre)) return;

                if (!mapaTecnicos.has(tec.nombre)) {
                    mapaTecnicos.set(tec.nombre, { rol: tec.rol, carga: {} });
                }

                const registro = mapaTecnicos.get(tec.nombre)!;
                if (ot.fechaSugerida) {
                    if (!registro.carga[ot.fechaSugerida]) {
                        registro.carga[ot.fechaSugerida] = [];
                    }
                    registro.carga[ot.fechaSugerida].push(ot);
                }
            });
        });

        const lista = Array.from(mapaTecnicos.entries()).map(([nombre, data]) => ({
            nombre,
            rol: data.rol,
            carga: data.carga
        }));

        return { datosTecnicos: lista.sort((a, b) => a.nombre.localeCompare(b.nombre)), diasMes: dias };
    }, [planResult, plantaSel]);

    // 3. Filtrado por búsqueda
    const tecnicosFiltrados = useMemo(() => {
        return datosTecnicos.filter(t => 
            !busqueda || t.nombre.toUpperCase().includes(busqueda.toUpperCase())
        );
    }, [datosTecnicos, busqueda]);

    return {
        tecnicosFiltrados,
        diasMes,
        busqueda,
        setBusqueda,
        celdaSeleccionada,
        setCeldaSeleccionada,
        totalTecnicos: tecnicosFiltrados.length
    };
};