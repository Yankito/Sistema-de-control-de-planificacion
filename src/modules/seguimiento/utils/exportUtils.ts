import * as XLSX from "xlsx";
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { AtrasoRow } from "../types";

export const exportarAtrasosFiltrados = async (
    dataFiltrada: AtrasoRow[], 
    modoVista: "ATRASOS" | "CUMPLIDAS", 
    selectedSemana: string
) => {
    if (dataFiltrada.length === 0) return;
    
    try {
        const dataParaArchivo = dataFiltrada.map(item => ({
            planta: item.planta, 
            ot: item.ot, 
            descripcion: item.descripcion, 
            estado: item.estado,
            clasificacion: item.clasificacion, 
            periodo: item.periodo, 
            semana: item.semana,
            esOB: item.esOB ? "SI" : "NO",
            rmd: item.rmd, 
            rse: item.rse, 
            detallesTecnicos: JSON.stringify(item.detallesTecnicos || []),
            fecha_proceso: new Date().toLocaleString()
        }));

        const ws = XLSX.utils.json_to_sheet(dataParaArchivo);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DATA_FILTRADA");
        
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        const prefijo = modoVista === "ATRASOS" ? "ATRASOS" : "CUMPLIDAS";
        const semLabel = selectedSemana === "TODAS" ? "TODAS" : selectedSemana;
        
        const filePath = await save({ 
            filters: [{ name: 'Excel', extensions: ['xlsx'] }], 
            defaultPath: `Seguimiento_${prefijo}_${semLabel}_${new Date().toISOString().split('T')[0]}.xlsx` 
        });
        
        if (filePath) {
            await writeFile(filePath, new Uint8Array(excelBuffer));
            return true; // Éxito
        }
    } catch (e) {
        console.error("Error al exportar filtrados:", e);
        throw e;
    }
};

export const exportarReporteCompleto = async (
    data: AtrasoRow[], 
    modoVista: "ATRASOS" | "CUMPLIDAS", 
    reporteActual: string
) => {
    const datasetExportar = data.filter(d => modoVista === "CUMPLIDAS" ? d.clasificacion === "CUMPLIDA" : d.clasificacion !== "CUMPLIDA");
    
    if (datasetExportar.length === 0) return;

    try {
        const wb = XLSX.utils.book_new();
        const dataRaw = datasetExportar.map(item => ({
            Planta: item.planta, 
            OT: item.ot, 
            Descripcion: item.descripcion, 
            Estado: item.estado,
            Clasificacion: item.clasificacion, 
            Periodo: item.periodo, 
            Semana: item.semana,
            Es_OB: item.esOB ? "SI" : "NO", 
            Fecha_Proceso: new Date().toLocaleString()
        }));
        
        const wsData = XLSX.utils.json_to_sheet(dataRaw);
        XLSX.utils.book_append_sheet(wb, wsData, "REPORTE_COMPLETO");
        
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        const filePath = await save({ 
            filters: [{ name: 'Excel', extensions: ['xlsx'] }], 
            defaultPath: `Reporte_Completo_${reporteActual}.xlsx` 
        });
        
        if (filePath) {
            await writeFile(filePath, new Uint8Array(excelBuffer));
            return true;
        }
    } catch (e) {
        console.error("Error al exportar completo:", e);
        throw e;
    }
};