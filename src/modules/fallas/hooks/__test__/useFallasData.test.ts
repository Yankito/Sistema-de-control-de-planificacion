// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFallasData } from '../useFallasData';

// --- DATA DUMMY ---
const mockData: any[] = [
  // AÑO 2026 (Actual)
  { planta: 'PF1', anio: 2026, semana: 5, equipo: 'MOTOR_A', gasto: 1000, duracionMinutos: 60, causa: 'ELECTRICO' },
  { planta: 'PF1', anio: 2026, semana: 5, equipo: 'MOTOR_A', gasto: 500, duracionMinutos: 30, causa: 'MECANICO' },
  { planta: 'PF2', anio: 2026, semana: 5, equipo: 'BOMBA_B', gasto: 200, duracionMinutos: 120, causa: 'OPERACIONAL' },
  
  // AÑO 2025 (Anterior - Para comparación)
  { planta: 'PF1', anio: 2025, semana: 5, equipo: 'MOTOR_A', gasto: 800, duracionMinutos: 50, causa: 'ELECTRICO' },
];

describe('useFallasData Hook', () => {

  it('debería inicializar con los años y plantas correctas', () => {
    const { result } = renderHook(() => useFallasData(mockData));
    
    expect(result.current.config.anios).toContain(2026);
    expect(result.current.config.anios).toContain(2025);
    expect(result.current.config.plantas).toContain('PF1');
    expect(result.current.config.plantas).toContain('PF2');
    
    // Por defecto selecciona el año más reciente
    expect(result.current.anioFiltro).toBe(2026);
  });

  it('debería calcular analytics globales correctamente', () => {
    const { result } = renderHook(() => useFallasData(mockData));
    
    const { analytics } = result.current;
    
    // Total Gasto 2026: 1000 + 500 + 200 = 1700
    expect(analytics.totalGasto).toBe(1700);
    
    // Total Eventos 2026: 3
    expect(analytics.totalEventos).toBe(3);
    
    // MTTR Global: (60 + 30 + 120) / 3 = 70
    expect(analytics.mttrGlobal).toBe(70);
  });

  it('debería calcular comparación con año anterior', () => {
    const { result } = renderHook(() => useFallasData(mockData));
    const { analytics } = result.current;

    // Gasto Año Anterior (2025): 800
    expect(analytics.totalGastoPrev).toBe(800);
    
    // Chequear datos específicos de equipo con historia (MOTOR_A)
    const motorA = analytics.porFrecuencia.find(d => d.label === 'MOTOR_A');
    expect(motorA).toBeDefined();
    expect(motorA?.prevGasto).toBe(800); // Gasto del 2025
  });

  it('debería filtrar por Planta', () => {
    const { result } = renderHook(() => useFallasData(mockData));

    act(() => {
        result.current.setPlantaFiltro('PF1');
    });

    // Solo deberían quedar las fallas de PF1 (2 eventos en 2026)
    expect(result.current.datosFiltrados).toHaveLength(2);
    expect(result.current.analytics.totalGasto).toBe(1500); // 1000 + 500
  });

  it('debería generar rankings correctamente (Top Costo)', () => {
    const { result } = renderHook(() => useFallasData(mockData));
    
    const ranking = result.current.analytics.porCosto;
    
    // MOTOR_A (1500) > BOMBA_B (200)
    expect(ranking[0].label).toBe('MOTOR_A');
    expect(ranking[1].label).toBe('BOMBA_B');
  });

  it('debería filtrar por Drill-Down (Causa)', () => {
    const { result } = renderHook(() => useFallasData(mockData));

    act(() => {
        result.current.setFiltroDrill({ tipo: 'CAUSA', valor: 'MECANICO' });
    });

    // Solo 1 falla mecánica en 2026 (PF1, Motor A, 500)
    expect(result.current.datosFiltrados).toHaveLength(1);
    expect(result.current.analytics.totalGasto).toBe(500);
  });
});