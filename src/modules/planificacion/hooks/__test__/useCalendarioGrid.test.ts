// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalendarioGrid } from '../useCalendarioGrid';

// Mock simple
const mockPlan = [{ fechaSugerida: '10/02/2026' }];
const mockOrdenes = { '10/02/2026': [{}, {}] }; // 2 ordenes

describe('useCalendarioGrid Hook', () => {

    it('debería generar las semanas de Febrero 2026', () => {
        const { result } = renderHook(() => useCalendarioGrid(mockPlan, mockOrdenes));

        expect(result.current.nombreMes).toBe('Febrero');
        expect(result.current.anioActual).toBe(2026);
        
        // Febrero 2026 empieza en Domingo (o Lunes dependiendo config, aquí el hook asume lógica visual)
        // Verificamos que genere arrays de 7 días
        expect(result.current.semanas[0].dias).toHaveLength(7);
    });

    it('debería calcular el total de órdenes del mes', () => {
        const { result } = renderHook(() => useCalendarioGrid(mockPlan, mockOrdenes));
        expect(result.current.totalOrdenesMes).toBe(2);
    });
});