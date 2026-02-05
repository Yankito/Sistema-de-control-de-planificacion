// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeguimientoModal } from '../useSeguimientoModal';

// --- DATA DUMMY ---
const mockDataModo: any = [
  { 
    ot: '100', 
    planta: 'PF1', 
    estado: 'Pendiente', 
    esOB: false, // IMPORTANTE: Coincidir con viewDetail
    clasificacion: 'TECNICO', // IMPORTANTE
    descripcion: 'Test 1',
    detallesTecnicos: [{ tecnico: 'JUAN', finalizada: false }] 
  },
  { 
    ot: '101', 
    planta: 'PF1', 
    estado: 'En Proceso', 
    esOB: false, 
    clasificacion: 'TECNICO',
    descripcion: 'Test 2',
    detallesTecnicos: [{ tecnico: 'JUAN', finalizada: true }] 
  },
  { 
    ot: '102', 
    planta: 'PF2', 
    estado: 'Pendiente', 
    esOB: false, 
    clasificacion: 'TECNICO',
    descripcion: 'Test 3' 
  }, 
];

const mockViewDetail = { 
    id: 'PF1', 
    esOB: false, 
    cat: undefined, 
    isGlobal: false // IMPORTANTE: false para filtrar por planta especifica
};

describe('useSeguimientoModal Hook', () => {

  const defaultProps = {
    dataModo: mockDataModo,
    dataAnterior: [],
    viewDetail: mockViewDetail,
    PLANTAS_COMPLEJO: [],
    PLANTAS_PF_ALIMENTOS: []
  };

  it('debería filtrar datos según viewDetail (id: PF1)', () => {
    const { result } = renderHook(() => useSeguimientoModal(defaultProps));

    // Solo deberían quedar las OTs de PF1 (100 y 101)
    expect(result.current.totalItems).toBe(2);
    expect(result.current.datosPaginados[0].ot).toBe('100');
  });

  it('debería filtrar por estado', () => {
    const { result } = renderHook(() => useSeguimientoModal(defaultProps));

    act(() => {
      result.current.handleFilterChange('En Proceso');
    });

    expect(result.current.totalItems).toBe(1);
    expect(result.current.datosPaginados[0].ot).toBe('101');
  });

  it('debería calcular estados disponibles dinámicamente', () => {
    const { result } = renderHook(() => useSeguimientoModal(defaultProps));
    
    // Debería incluir 'TODOS', 'Pendiente' y 'En Proceso'
    expect(result.current.estadosDisponibles).toContain('TODOS');
    expect(result.current.estadosDisponibles).toContain('Pendiente');
    expect(result.current.estadosDisponibles).toContain('En Proceso');
  });

  it('debería seleccionar un empleado y calcular sus estadísticas', () => {
    const { result } = renderHook(() => useSeguimientoModal(defaultProps));

    act(() => {
      result.current.setSelectedEmployee('JUAN');
    });

    const { stats } = result.current.employeeData;
    
    // Juan tiene 2 OTs: 1 Pendiente, 1 Finalizada
    expect(stats.total).toBe(2);
    expect(stats.cumplidas).toBe(1);
    expect(stats.pendientes).toBe(1);
  });

  it('debería resetear la selección de empleado', () => {
    const { result } = renderHook(() => useSeguimientoModal(defaultProps));

    act(() => {
      result.current.setSelectedEmployee('JUAN');
    });
    expect(result.current.selectedEmployee).toBe('JUAN');

    act(() => {
      result.current.resetEmployee();
    });
    expect(result.current.selectedEmployee).toBeNull();
  });
});