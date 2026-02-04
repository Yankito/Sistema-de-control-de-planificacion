// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeguimientoData } from '../useSeguimientoData';
import { DatabaseService } from '../../../../shared/db/DatabaseService';

// --- 1. MOCK ROBUSTO (FACTORY PATTERN) ---
// Definimos la implementación aquí mismo para asegurar que SIEMPRE retornen promesas.
// Esto evita que el código intente ir a la BD real y se cuelgue.
vi.mock('../../../../shared/db/DatabaseService', () => ({
  DatabaseService: {
    getSnapshot: vi.fn().mockImplementation(() => Promise.resolve([])),
    getSnapshotLite: vi.fn().mockImplementation(() => Promise.resolve([])),
    deleteSnapshot: vi.fn().mockImplementation(() => Promise.resolve()),
  }
}));

// --- 2. DATA DE PRUEBA (FIXTURES) ---
import type { AtrasoRow } from '../../types';

const mockDataActual: AtrasoRow[] = [
  { ot: '100', planta: 'PF1', descripcion: 'Test Actual', estado: 'Liberado', clasificacion: 'TECNICO / SERVICIO' as const, periodo: '2026', semana: '2026-S05', esOB: false }
];
const mockDataAnterior: AtrasoRow[] = [
  { ot: '99', planta: 'PF1', descripcion: 'Test Anterior', estado: 'Liberado', clasificacion: 'TECNICO / SERVICIO' as const, periodo: '2026', semana: '2026-S04', esOB: false }
];
const mockDataCumple: AtrasoRow[] = [
  { ot: '100', planta: 'PF1', descripcion: 'Test Cumple', estado: 'Finalizada', clasificacion: 'PROGRAMADOR' as const, periodo: '2026', semana: '2026-S05', esOB: false }
];

const historialMock = ['2026-S05', '2026-S04', '2025-S52'];

describe('useSeguimientoData Hook', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Reseteamos a la implementación segura por defecto antes de cada test
    (DatabaseService.getSnapshot as any).mockImplementation(() => Promise.resolve([]));
    (DatabaseService.getSnapshotLite as any).mockImplementation(() => Promise.resolve([]));
  });

  it('debería inicializarse con los datos pasados por props', () => {
    const { result } = renderHook(() => 
      useSeguimientoData(mockDataActual, mockDataAnterior, mockDataCumple, historialMock)
    );

    expect(result.current.dataActual).toEqual(mockDataActual);
    expect(result.current.dataAnterior).toEqual(mockDataAnterior);
    expect(result.current.dataCumplimiento).toEqual(mockDataCumple);
    expect(result.current.isLoading).toBe(false);
  });

  describe('cargarReporte', () => {
    
    it('debería cargar datos, calcular semana anterior y actualizar estados', async () => {
      // Configuramos el comportamiento específico para este test usando mockImplementation
      // para discriminar entre las llamadas (ATRASOS vs CUMPLIMIENTO)
      (DatabaseService.getSnapshot as any).mockImplementation((semana: string, tipo: string) => {
          if (tipo === 'ATRASOS') return Promise.resolve(mockDataActual);
          if (tipo === 'CUMPLIMIENTO') return Promise.resolve(mockDataCumple);
          return Promise.resolve([]);
      });

      (DatabaseService.getSnapshotLite as any).mockImplementation(() => Promise.resolve(mockDataAnterior));

      const { result } = renderHook(() => 
        useSeguimientoData([], [], [], historialMock)
      );

      // Act async para esperar a que el hook termine sus promesas
      await act(async () => {
        await result.current.cargarReporte('2026-S05');
      });

      // Validamos que la lógica de negocio funcionó
      expect(result.current.semanaComparar).toBe('2026-S04');
      expect(result.current.dataActual).toEqual(mockDataActual);
      expect(result.current.dataAnterior).toEqual(mockDataAnterior);
      expect(result.current.dataCumplimiento).toEqual(mockDataCumple);
      
      // Validamos las llamadas exactas
      expect(DatabaseService.getSnapshot).toHaveBeenCalledWith('2026-S05', 'ATRASOS');
      expect(DatabaseService.getSnapshot).toHaveBeenCalledWith('2026-S05', 'CUMPLIMIENTO');
      expect(DatabaseService.getSnapshotLite).toHaveBeenCalledWith('2026-S04', 'ATRASOS');
    });

    it('debería manejar correctamente el cambio de año (S01 -> S52)', async () => {
      const historialConAnioPasado = ['2026-S01', '2025-S52'];
      
      const { result } = renderHook(() => 
        useSeguimientoData([], [], [], historialConAnioPasado)
      );

      await act(async () => {
        await result.current.cargarReporte('2026-S01');
      });

      expect(result.current.semanaComparar).toBe('2025-S52');
      expect(DatabaseService.getSnapshotLite).toHaveBeenCalledWith('2025-S52', 'ATRASOS');
    });

    it('no debería cargar semana anterior si no existe en el historial', async () => {
      const historialCorto = ['2026-S05']; 
      
      const { result } = renderHook(() => 
        useSeguimientoData([], [], [], historialCorto)
      );

      await act(async () => {
        await result.current.cargarReporte('2026-S05');
      });

      expect(result.current.semanaComparar).toBe('');
      // No debería intentar cargar nada si no existe en el historial
      expect(DatabaseService.getSnapshotLite).not.toHaveBeenCalled();
    });

    it('debería ejecutar los callbacks si se proporcionan', async () => {
        const onCargarMock = vi.fn();
        const onCambioMock = vi.fn();
        
        (DatabaseService.getSnapshotLite as any).mockResolvedValue(mockDataAnterior);

        const { result } = renderHook(() => 
          useSeguimientoData([], [], [], historialMock, { 
            onCargarSemana: onCargarMock,
            onCambioComparacion: onCambioMock
          })
        );
  
        await act(async () => {
          await result.current.cargarReporte('2026-S05');
        });
  
        expect(onCargarMock).toHaveBeenCalledWith('2026-S05');
        // El callback se ejecuta con la data que devuelve el servicio
        expect(onCambioMock).toHaveBeenCalled(); 
    });
  });

  describe('cambiarComparacion', () => {
    it('debería actualizar dataAnterior manualmente', async () => {
      const nuevaDataComparacion = [{ ot: 'NEW', planta: 'PF2' }] as any;
      (DatabaseService.getSnapshotLite as any).mockImplementation(() => Promise.resolve(nuevaDataComparacion));

      const { result } = renderHook(() => 
        useSeguimientoData([], [], [], historialMock)
      );

      await act(async () => {
        await result.current.cambiarComparacion('2026-S01');
      });

      expect(result.current.semanaComparar).toBe('2026-S01');
      expect(result.current.dataAnterior).toEqual(nuevaDataComparacion);
    });

    it('debería limpiar dataAnterior si se pasa string vacío', async () => {
      const { result } = renderHook(() => 
        useSeguimientoData([], mockDataAnterior, [], historialMock)
      );

      // Estado inicial
      expect(result.current.dataAnterior).toEqual(mockDataAnterior);

      await act(async () => {
        await result.current.cambiarComparacion('');
      });

      expect(result.current.semanaComparar).toBe('');
      expect(result.current.dataAnterior).toEqual([]);
    });
  });
});