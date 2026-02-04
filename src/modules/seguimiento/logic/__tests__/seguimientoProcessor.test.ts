// src/logic/__tests__/seguimientoProcessor.test.ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { processSeguimientoOTs } from '../seguimientoOTsProcessor';

// Helper para crear hojas de cálculo falsas rápido
const crearHoja = (data: any[]) => XLSX.utils.json_to_sheet(data);

describe('Seguimiento OTs Processor', () => {

    it('debe cruzar Backlog con Cumplimiento correctamente', () => {
        // 1. Mock de Hoja PF1 (Backlog)
        const sheetPF1 = crearHoja([
            { "Pedido de Trabajo": "OT-100", "Estado": "Liberado", "Descripción": "Falla motor", "Fecha Inicial Programada": 45325 }
        ]);

        // 2. Mock de Hcoja CUMPLIMIENTO 
        // OP_FINALIZADA = "NO" hará que la clasificación sea "TECNICO / SERVICIO"
        const sheetCumplimiento = crearHoja([
            { "NRO_OT": "OT-100", "EMPLEADO": "JUAN PEREZ", "OP_FINALIZADA": "No", "ESTADO_OM": "Liberado" }
        ]);

        // 3. Mock de Hoja MASIVO 
        const sheetMasivo = crearHoja([
            { "Número": "OT-100", "RMD": "Si", "RSE": "No" }
        ]);

        const sheets = {
            "PF1": sheetPF1,
            "CUMPLIMIENTO": sheetCumplimiento,
            "MASIVO": sheetMasivo
        };
        

        const result = processSeguimientoOTs(sheets);

        // Validaciones Estructurales
        expect(result.actual).toHaveLength(1);
        const ot = result.actual[0];

        expect(ot.ot).toBe("OT-100");
        expect(ot.planta).toBe("PF1"); 
        expect(ot.rmd).toBe("SI");     
        expect(ot.rse).toBe("NO");
        
        // Validaciones de Cruce
        expect(ot.detallesTecnicos).toHaveLength(1);
        expect(ot.detallesTecnicos?.[0].tecnico).toBe("JUAN PEREZ");

        // Validación de Lógica de Negocio:
        // Como OP_FINALIZADA es "NO", la clasificación debe ser TECNICO / SERVICIO
        expect(ot.clasificacion).toBe("TECNICO / SERVICIO");
    });

    it('debe clasificar como PROGRAMADOR si está finalizada y tiene RMD/RSE correctos', () => {
        const sheetPF1 = crearHoja([
            { "Pedido de Trabajo": "OT-200", "Estado": "Liberado", "Descripción": "Ajuste", "Fecha Inicial Programada": 45325 }
        ]);

        // OP_FINALIZADA = "SI"
        const sheetCumplimiento = crearHoja([
            { "NRO_OT": "OT-200", "EMPLEADO": "ANA GOMEZ", "OP_FINALIZADA": "Si", "ESTADO_OM": "Liberado" }
        ]);

        // RMD y RSE = "SI"
        const sheetMasivo = crearHoja([
            { "Número": "OT-200", "RMD": "SI", "RSE": "SI" }
        ]);

        const sheets = {
            "PF1": sheetPF1,
            "CUMPLIMIENTO": sheetCumplimiento,
            "MASIVO": sheetMasivo
        };

        const result = processSeguimientoOTs(sheets);
        const ot = result.actual[0];

        // Al estar todo OK, debería ser PROGRAMADOR
        expect(ot.clasificacion).toBe("PROGRAMADOR");
        expect(ot.detallesTecnicos?.[0].finalizada).toBe(true);
    });

    it('debe ignorar OTs que no están en estados de interés (ej: CREADO)', () => {
        const sheetPF1 = crearHoja([
            { "PEDIDO DE TRABAJO": "OT-IGNORE", "ESTADO": "CREADO" } 
        ]);
        
        const sheets = {
            "PF1": sheetPF1,
            "CUMPLIMIENTO": crearHoja([]),
            "MASIVO": crearHoja([])
        };

        const result = processSeguimientoOTs(sheets);
        expect(result.actual).toHaveLength(0);
    });
});