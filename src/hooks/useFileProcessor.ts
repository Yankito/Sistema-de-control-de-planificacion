import { useState } from "react";
import * as XLSX from "xlsx-js-style";
import { processSeguimientoOTs } from "../modules/seguimiento/logic/seguimientoOTsProcessor";
import { processFallasData } from "../modules/fallas/logic/fallasProcessor";
import { DatabaseService } from "../shared/db/DatabaseService";
import { FallaRow } from "../modules/fallas/types";

// Tipos de acciones que este procesador puede disparar en otros hooks
interface ProcessorActions {
    onPlanLoaded: (workbook: XLSX.WorkBook) => void;
    onSeguimientoLoaded: () => void; // Solo avisa para recargar historial
    onFallasLoaded: (data: FallaRow[]) => void;
    setActiveTab: (tab: string) => void;
    targetWeek: string;
}

export const useFileProcessor = ({ 
    onPlanLoaded, 
    onSeguimientoLoaded, 
    onFallasLoaded, 
    setActiveTab,
    targetWeek 
}: ProcessorActions) => {
    
    const [loading, setLoading] = useState({ plan: false, seguimiento: false, fallas: false });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'PLAN' | 'SEGUIMIENTO' | 'FALLAS') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Set loading state
        setLoading(prev => ({ ...prev, [tipo.toLowerCase()]: true }));

        const reader = new FileReader();
        reader.onload = (event) => {
            setTimeout(async () => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: "array" });

                    if (tipo === 'PLAN') {
                        onPlanLoaded(workbook);
                    } 
                    else if (tipo === 'SEGUIMIENTO') {
                        const { actual, activos, masivoRaw, cumplimientoRaw } = processSeguimientoOTs(workbook.Sheets);
                        
                        if (activos.length) await DatabaseService.guardarActivos(activos);
                        await DatabaseService.guardarSnapshot(targetWeek, 'SEGUIMIENTO', actual);
                        if (masivoRaw.length) await DatabaseService.guardarMasivoRaw(targetWeek, masivoRaw);
                        
                        if (cumplimientoRaw.length) {
                            await DatabaseService.guardarCumplimientoRaw(targetWeek, cumplimientoRaw);
                            // Crear snapshot UI rápido
                            const snapshotCumple = cumplimientoRaw.map(c => ({
                                planta: c.planta, ot: c.nro_ot, descripcion: "Desde Cumplimiento",
                                estado: c.estado_om, clasificacion: "CUMPLIDA" as const, esOB: c.tipo.includes("OB"),
                                periodo: targetWeek.split('-')[0], semana: targetWeek, rmd: "SI", rse: "SI", detallesTecnicos: []
                            }));
                            await DatabaseService.guardarSnapshot(targetWeek, 'CUMPLIMIENTO', snapshotCumple);
                        }
                        
                        onSeguimientoLoaded();
                        setActiveTab("seguimiento");
                    }
                    else if (tipo === 'FALLAS') {
                        const datos = processFallasData(workbook.Sheets);
                        onFallasLoaded(datos);
                        if (datos.length > 0) setActiveTab("fallas");
                    }

                } catch (error) {
                    console.error("Error procesando archivo", error);
                    alert("Error al leer el archivo.");
                } finally {
                    setLoading(prev => ({ ...prev, [tipo.toLowerCase()]: false }));
                }
            }, 100);
        };
        reader.readAsArrayBuffer(file);
    };

    return {
        handleFileUpload,
        loading
    };
};