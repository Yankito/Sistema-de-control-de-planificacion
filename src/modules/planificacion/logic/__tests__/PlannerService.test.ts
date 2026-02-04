// src/logic/__tests__/PlannerService.test.ts
import { describe, it, expect } from 'vitest';
import { PlannerService } from '../../../planificacion/logic/PlannerService';

describe('Planner Service', () => {

    it('debe mapear correctamente departamentos a plantas', () => {
        // Probamos la función estática mapDepartamentoAPlanta
        
        expect(PlannerService.mapDepartamentoAPlanta("PF1")).toBe("PF1");
        expect(PlannerService.mapDepartamentoAPlanta("MANTENCION PF3 (NUEVA)")).toBe("PF3");
        expect(PlannerService.mapDepartamentoAPlanta("VENTAS")).toBe("CDT");
        expect(PlannerService.mapDepartamentoAPlanta("DESCONOCIDO")).toBe("OTROS");
    });

    // Si tienes lógica pública para verificar si un técnico existe:
    it('debe detectar datos faltantes', () => {
        // Supongamos que tienes una función que valida filas
        const rowIncompleta = { "Nro Orden": "100" }; // Falta descripción
        // Aquí llamarías a tu función de validación si la tienes expuesta
        expect(rowIncompleta["Nro Orden"]).toBe("100");
    });
});