// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeguimientoData } from '../useSeguimientoData';
import { DatabaseService } from '../../../../shared/db/DatabaseService';

// Mock DB
vi.mock('../../../../shared/db/DatabaseService', () => ({
  DatabaseService: {
    getSnapshot: vi.fn(),
    getSnapshotLite: vi.fn(),
  }
}));

const mockHistorial = ['2026-S05', '2026-S04'];

describe('useSeguimientoData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (DatabaseService.getSnapshot as any).mockResolvedValue([]);
    (DatabaseService.getSnapshotLite as any).mockResolvedValue([]);
  });

  it('debería inicializarse con estados vacíos', () => {
    const { result } = renderHook(() => useSeguimientoData(mockHistorial));
    
    expect(result.current.dataActual).toEqual([]);
    expect(result.current.reporteActual).toBe("");
  });

  it('debería cargar reporte y calcular automáticamente la semana anterior', async () => {
    const { result } = renderHook(() => useSeguimientoData(mockHistorial));

    await act(async () => {
      await result.current.cargarReporte('2026-S05');
    });

    expect(result.current.reporteActual).toBe('2026-S05');
    // Como 2026-S04 existe en el historial, debería seleccionarla automáticamente
    expect(result.current.semanaComparar).toBe('2026-S04');
    
    expect(DatabaseService.getSnapshot).toHaveBeenCalledWith('2026-S05', 'SEGUIMIENTO');
    expect(DatabaseService.getSnapshotLite).toHaveBeenCalledWith('2026-S04', 'SEGUIMIENTO');
  });

  it('debería setear datos manuales correctamente (Upload Excel)', () => {
    const { result } = renderHook(() => useSeguimientoData(mockHistorial));
    const mockRow = [{ ot: '1' }] as any;

    act(() => {
      result.current.setDatosManuales(mockRow, [], [], '2026-S05');
    });

    expect(result.current.dataActual).toEqual(mockRow);
    expect(result.current.reporteActual).toBe('2026-S05');
  });
});