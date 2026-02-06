import * as XLSX from "xlsx-js-style"; 
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { AtrasoRow } from "../types";

// --- CONSTANTES ---
const PLANTAS_INDIVIDUALES = ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "MPS", "DC", "VENTAS", "OTROS"];
const CATEGORIAS = ["TECNICO / SERVICIO", "PROGRAMADOR", "OC / OTRO"];

const DEFINICION_GRUPOS = {
    "COMPLEJO": ["PF3", "PF4", "PF5", "PF6", "CDT", "DC", "VENTAS", "OTROS"], 
    "PF ALIMENTOS": ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "DC", "VENTAS", "OTROS"] 
};

// --- ESTILOS VISUALES ---
const BORDER_ALL = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

const STYLE_HEADER_MAIN = {
    fill: { fgColor: { rgb: "FFFF00" } }, 
    font: { bold: true },
    alignment: { horizontal: "center" },
    border: BORDER_ALL
};

// --- LÓGICA DE COLORES DEL SEMÁFORO ---
const getTrafficLightStyle = (current: number, previous: number, isBold: boolean = false) => {
    let color = "FFFF99"; // Amarillo (Igual)
    if (current > previous) color = "FF8888"; // Rojo (Subió - Malo)
    if (current < previous) color = "90EE90"; // Verde (Bajó - Bueno)

    return {
        fill: { fgColor: { rgb: color } },
        font: { bold: isBold },
        alignment: { horizontal: "center" },
        border: BORDER_ALL
    };
};

const getColLetter = (colIndex: number) => {
    let letter = '';
    let temp = colIndex + 1; 
    while (temp > 0) {
        let mod = (temp - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        temp = Math.floor((temp - mod) / 26);
    }
    return letter;
};

// Helpers de Conteo
const count = (data: AtrasoRow[], planta: string | string[], esOB: boolean, periodo: string, cat?: string) => {
    return data.filter(d => {
        const matchPlanta = Array.isArray(planta) ? planta.includes(d.planta) : d.planta === planta;
        const matchTipo = d.esOB === esOB;
        const matchPeriodo = d.periodo === periodo;
        const matchCat = cat ? d.clasificacion === cat : true;
        return matchPlanta && matchTipo && matchPeriodo && matchCat;
    }).length;
};

const countTotal = (data: AtrasoRow[], planta: string | string[], esOB: boolean, cat?: string) => {
    return data.filter(d => {
        const matchPlanta = Array.isArray(planta) ? planta.includes(d.planta) : d.planta === planta;
        const matchTipo = d.esOB === esOB;
        const matchCat = cat ? d.clasificacion === cat : true;
        return matchPlanta && matchTipo && matchCat;
    }).length;
};

// --- FUNCIÓN 1: EXPORTAR REPORTE COMPLETO ---
export const exportarReporteCompleto = async (
    dataActual: AtrasoRow[], 
    dataAnterior: AtrasoRow[], 
    modoVista: "ATRASOS" | "CUMPLIDAS", 
    reporteActual: string
) => {
    const datasetAct = dataActual.filter(d => modoVista === "CUMPLIDAS" ? d.clasificacion === "CUMPLIDA" : d.clasificacion !== "CUMPLIDA");
    const datasetAnt = dataAnterior.filter(d => modoVista === "CUMPLIDAS" ? d.clasificacion === "CUMPLIDA" : d.clasificacion !== "CUMPLIDA");
    
    if (datasetAct.length === 0) return;

    try {
        const wb = XLSX.utils.book_new();
        // Obtenemos periodos de ambos para asegurar que la comparativa no falle si falta un mes en uno
        const periodosRaw = Array.from(new Set([...datasetAct.map(d => d.periodo), ...datasetAnt.map(d => d.periodo)]))
            .filter(p => p !== "S/A" && p !== "S/D")
            .sort();
            
        const columnasPeriodos = [...periodosRaw]; 
        const headersLabels = [`REPORTE ${modoVista}`, ...columnasPeriodos, "TOTAL ACT.", "TOTAL ANT.", "DELTA"];

        const headerRow = headersLabels.map(label => ({ v: label, t: 's', s: STYLE_HEADER_MAIN }));
        const matrix: any[][] = [];
        const rowMap = new Map<string, number>();

        matrix.push(headerRow);
        let currentRowIndex = 2;

        const ordenGrupos = [
            ...PLANTAS_INDIVIDUALES.map(p => ({ label: p, id: p, isAgrupado: false })),
            { label: "COMPLEJO", id: "COMPLEJO", isAgrupado: true },
            { label: "PF ALIMENTOS", id: "PF ALIMENTOS", isAgrupado: true }
        ];

        const colIdxTotalAct = columnasPeriodos.length + 1; 
        const colIdxTotalAnt = colIdxTotalAct + 1;
        const letraTotalAct = getColLetter(colIdxTotalAct);
        const letraTotalAnt = getColLetter(colIdxTotalAnt);

        [false, true].forEach(esOB => {
            const suffix = esOB ? "OB" : "OM";
            const suffixDisplay = esOB ? "(OB)" : "(OM)";

            ordenGrupos.forEach(grupo => {
                const rowCells: any[] = [];
                let valTotalAct = 0; 
                let valTotalAnt = 0;
                
                rowCells.push({ v: `${grupo.label} ${suffixDisplay}`, t: 's', s: { font: { bold: true }, border: BORDER_ALL, fill: { fgColor: { rgb: "FFFFE0" } } } });
                
                columnasPeriodos.forEach((per, colIdx) => {
                    const excelColLetter = getColLetter(colIdx + 1);
                    const plantasTarget = grupo.isAgrupado ? DEFINICION_GRUPOS[grupo.id as keyof typeof DEFINICION_GRUPOS] : grupo.id;

                    const curVal = count(datasetAct, plantasTarget, esOB, per);
                    const antVal = count(datasetAnt, plantasTarget, esOB, per);
                    
                    valTotalAct += curVal;
                    valTotalAnt += antVal;

                    const style = getTrafficLightStyle(curVal, antVal, grupo.isAgrupado);

                    if (grupo.isAgrupado) {
                        const plantasHijas = DEFINICION_GRUPOS[grupo.id as keyof typeof DEFINICION_GRUPOS];
                        const filasReferencias = plantasHijas.map(p => rowMap.get(`${p}_${suffix}`)).filter(r => r !== undefined);
                        
                        if (filasReferencias.length > 0) {
                            const refs = filasReferencias.map(r => `${excelColLetter}${r}`).join(",");
                            rowCells.push({ t: 'n', f: `SUM(${refs})`, v: curVal, s: style });
                        } else {
                            rowCells.push({ v: curVal, t: 'n', s: style });
                        }
                    } else {
                        if (colIdx === 0) rowMap.set(`${grupo.id}_${suffix}`, currentRowIndex);
                        rowCells.push({ v: curVal, t: 'n', s: style });
                    }
                });

                const styleTotalAct = getTrafficLightStyle(valTotalAct, valTotalAnt, true);
                if (grupo.isAgrupado) {
                    const plantasHijas = DEFINICION_GRUPOS[grupo.id as keyof typeof DEFINICION_GRUPOS];
                    const filasRefs = plantasHijas.map(p => rowMap.get(`${p}_${suffix}`)).filter(r => r !== undefined);
                    const refs = filasRefs.map(r => `${letraTotalAct}${r}`).join(",");
                    rowCells.push({ t: 'n', f: `SUM(${refs})`, v: valTotalAct, s: styleTotalAct });
                } else {
                    const startCol = getColLetter(1); 
                    const endCol = getColLetter(columnasPeriodos.length);
                    rowCells.push({ t: 'n', f: `SUM(${startCol}${currentRowIndex}:${endCol}${currentRowIndex})`, v: valTotalAct, s: styleTotalAct });
                }

                rowCells.push({ v: valTotalAnt, t: 'n', s: { border: BORDER_ALL, alignment: { horizontal: "center" } } });
                rowCells.push({ t: 'n', f: `${letraTotalAct}${currentRowIndex}-${letraTotalAnt}${currentRowIndex}`, v: valTotalAct - valTotalAnt, s: getTrafficLightStyle(valTotalAct, valTotalAnt, true) });

                matrix.push(rowCells);
                currentRowIndex++;

                CATEGORIAS.forEach(cat => {
                    const filaCat: any[] = [{ v: `   ${cat}`, t: 's', s: { border: BORDER_ALL } }];
                    const plantasTarget = grupo.isAgrupado ? DEFINICION_GRUPOS[grupo.id as keyof typeof DEFINICION_GRUPOS] : grupo.id;

                    columnasPeriodos.forEach(per => {
                        const cVal = count(datasetAct, plantasTarget, esOB, per, cat);
                        const aVal = count(datasetAnt, plantasTarget, esOB, per, cat);
                        filaCat.push({ v: cVal, t: 'n', s: getTrafficLightStyle(cVal, aVal) });
                    });

                    const tActCat = countTotal(datasetAct, plantasTarget, esOB, cat);
                    const tAntCat = countTotal(datasetAnt, plantasTarget, esOB, cat);
                    
                    filaCat.push({ v: tActCat, t: 'n', s: getTrafficLightStyle(tActCat, tAntCat, true) });
                    filaCat.push({ v: tAntCat, t: 'n', s: { border: BORDER_ALL, alignment: { horizontal: "center" } } });
                    filaCat.push({ t: 'n', f: `${letraTotalAct}${currentRowIndex}-${letraTotalAnt}${currentRowIndex}`, v: tActCat - tAntCat, s: getTrafficLightStyle(tActCat, tAntCat, true) });

                    matrix.push(filaCat);
                    currentRowIndex++;
                });

                matrix.push([]); 
                currentRowIndex++;
            });
        });

        const wsResumen = XLSX.utils.aoa_to_sheet(matrix);
        wsResumen['!cols'] = [{ wch: 25 }, ...columnasPeriodos.map(() => ({ wch: 10 })), { wch: 12 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsResumen, "RESUMEN_EJECUTIVO");

        const dataRaw = datasetAct.map(item => ({ Planta: item.planta, OT: item.ot, Descripcion: item.descripcion, Estado: item.estado, Clasificacion: item.clasificacion, Tipo: item.esOB ? "OB" : "OM", Periodo: item.periodo, Semana: item.semana, Tecnicos: item.detallesTecnicos?.map(t => t.tecnico).join(", ") || "" }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataRaw), "DATA_DETALLADA");

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        // --- LÓGICA DE NOMBRE DINÁMICO ---
        // reporteActual suele venir como "2026-S05", queremos extraer el "S05" o "S5"
        const semanaLabel = reporteActual.includes('-') ? reporteActual.split('-')[1] : reporteActual;
        const nombreArchivo = `Dashboard_Atrasos_${semanaLabel}.xlsx`;

        const filePath = await save({ 
            filters: [{ name: 'Excel', extensions: ['xlsx'] }], 
            defaultPath: nombreArchivo 
        });
        
        if (filePath) await writeFile(filePath, new Uint8Array(excelBuffer));

    } catch (e) { console.error(e); }
};