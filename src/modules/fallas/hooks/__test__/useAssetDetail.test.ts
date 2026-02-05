// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssetDetail } from '../useAssetDetail';

// Mock Data
const mockData: any[] = [
  { equipo: 'MOTOR_X', semana: 5, gasto: 1000, duracionMinutos: 60, fecha: new Date('2026-02-01') },
  { equipo: 'MOTOR_X', semana: 6, gasto: 500, duracionMinutos: 30, fecha: new Date('2026-02-08') },
  { equipo: 'OTRO_EQ', semana: 5, gasto: 9999, duracionMinutos: 999, fecha: new Date('2026-02-01') }
];

describe('useAssetDetail Hook', () => {

  it('debería filtrar datos solo del equipo seleccionado', () => {
    const { result } = renderHook(() => useAssetDetail(mockData, 'MOTOR_X'));
    
    // Debería ignorar 'OTRO_EQ'
    expect(result.current.tableData).toHaveLength(2);
    expect(result.current.stats.totalGasto).toBe(1500);
  });

  it('debería calcular el gráfico de línea de tiempo correctamente', () => {
    const { result } = renderHook(() => useAssetDetail(mockData, 'MOTOR_X'));
    
    const { chartData } = result.current.timelineData;
    
    // Debe haber datos para semana 5 y 6
    const s5 = chartData.find(d => d.semana === 5);
    const s6 = chartData.find(d => d.semana === 6);
    
    expect(s5?.count).toBe(1);
    expect(s6?.count).toBe(1);
  });

  it('debería filtrar tabla y KPIs al seleccionar una semana', () => {
    const { result } = renderHook(() => useAssetDetail(mockData, 'MOTOR_X'));

    // Seleccionamos semana 6
    act(() => {
        result.current.setSemSelected(6);
    });

    // Ahora la tabla solo debe tener 1 elemento
    expect(result.current.tableData).toHaveLength(1);
    expect(result.current.tableData[0].semana).toBe(6);

    // Y los KPIs deben reflejar solo esa semana
    expect(result.current.stats.totalGasto).toBe(500);
    expect(result.current.stats.totalTiempo).toBe(30);
  });

  it('debería resetear el filtro al deseleccionar la semana', () => {
    const { result } = renderHook(() => useAssetDetail(mockData, 'MOTOR_X'));

    act(() => {
        result.current.setSemSelected(6);
    });
    // Reset a null
    act(() => {
        result.current.setSemSelected(null);
    });

    // Vuelve a mostrar todo
    expect(result.current.tableData).toHaveLength(2);
    expect(result.current.stats.totalGasto).toBe(1500);
  });
});