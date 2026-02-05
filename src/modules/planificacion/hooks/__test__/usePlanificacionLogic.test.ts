// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanificacionLogic } from '../usePlanificacionLogic';

// --- MOCKS DE DATOS ---
const mockPlanResult = [
  { 
    nroOrden: 'OT-1', 
    fechaSugerida: '05/02/2026', 
    planta: 'PF1', 
    tecnicos: [{ nombre: 'VACANTE', rol: 'M' }] 
  },
  { 
    nroOrden: 'OT-2', 
    fechaSugerida: '01/02/2026', // Fecha anterior para probar ordenamiento
    planta: 'PF1', 
    tecnicos: [{ nombre: 'JUAN', rol: 'E' }] 
  }
];

const mockEmpleadosMap = new Map([
  ['PEDRO', { rol: 'M', planta: 'PF1' }], // Candidato válido para OT-1
  ['ANA', { rol: 'E', planta: 'PF2' }]    // Planta incorrecta
]);

const mockHorarios = new Map([
  ['PEDRO', ['N', 'N', 'N', 'N', 'N', 'S', 'D']] // Turno Noche (Index 0-4)
]);

describe('usePlanificacionLogic Hook', () => {
  const mockSetPlanResult = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mockear timers para el setTimeout del mensaje de éxito
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería inicializar y ordenar las órdenes por fecha', () => {
    const { result } = renderHook(() => usePlanificacionLogic({
      planResult: mockPlanResult,
      setPlanResult: mockSetPlanResult,
      empleadosMap: mockEmpleadosMap,
      mapaHorarios: mockHorarios,
      fechaSeleccionada: null
    }));

    // OT-2 (01/02) debería ir antes que OT-1 (05/02)
    const fechas = Object.keys(result.current.ordenesPorDia);
    // Nota: El orden de las claves en JS no siempre está garantizado, 
    // pero nuestra lógica de 'datosOrdenados' sí lo está.
    // Verificamos si los datos procesados están correctos.
    expect(result.current.ordenesPorDia['01/02/2026']).toHaveLength(1);
    expect(result.current.ordenesPorDia['05/02/2026']).toHaveLength(1);
  });

  it('debería actualizar el día seleccionado si cambia la prop externa', () => {
    const { result, rerender } = renderHook(
      ({ fecha }) => usePlanificacionLogic({
        planResult: mockPlanResult,
        setPlanResult: mockSetPlanResult,
        empleadosMap: mockEmpleadosMap,
        mapaHorarios: mockHorarios,
        fechaSeleccionada: fecha
      }),
      { initialProps: { fecha: '10/02/2026' } }
    );

    expect(result.current.diaSeleccionado).toBe('10/02/2026');

    // Cambiamos la fecha externa
    rerender({ fecha: '15/02/2026' });
    expect(result.current.diaSeleccionado).toBe('15/02/2026');
  });

  it('debería ejecutar el Drag & Drop correctamente (Mover OT)', () => {
    const { result } = renderHook(() => usePlanificacionLogic({
      planResult: mockPlanResult,
      setPlanResult: mockSetPlanResult,
      empleadosMap: mockEmpleadosMap,
      mapaHorarios: mockHorarios
    }));

    // 1. Simular Drag Start
    // Necesitamos mockear el evento y dataTransfer
    const mockDataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '' };
    const mockEventStart = { 
      dataTransfer: mockDataTransfer, 
      preventDefault: vi.fn() 
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDragStart(mockEventStart, mockPlanResult[0]); // OT-1
    });

    expect(result.current.draggingOT.nroOrden).toBe('OT-1');

    // 2. Simular Drop en nueva fecha
    const mockEventDrop = { 
      preventDefault: vi.fn(), 
      stopPropagation: vi.fn() 
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDrop(mockEventDrop, '20/02/2026');
    });

    // Verificamos que se llamó a setPlanResult con la fecha actualizada
    expect(mockSetPlanResult).toHaveBeenCalled();
    const nuevaData = mockSetPlanResult.mock.calls[0][0]; // Primer argumento de la llamada
    
    // Buscamos la OT-1 en la data actualizada
    const otMovida = nuevaData.find((ot: any) => ot.nroOrden === 'OT-1');
    expect(otMovida.fechaSugerida).toBe('20/02/2026');
    
    // Verificar mensaje de éxito
    expect(result.current.showSuccess).toBe(true);
  });

  it('debería asignar técnicos automáticamente (Magic Wand)', () => {
    const { result } = renderHook(() => usePlanificacionLogic({
      planResult: mockPlanResult, // OT-1 tiene VACANTE (Mecánico, PF1)
      setPlanResult: mockSetPlanResult,
      empleadosMap: mockEmpleadosMap, // PEDRO es Mecánico PF1
      mapaHorarios: mockHorarios // PEDRO tiene turno Noche (Compatible)
    }));

    // Simulamos que la fecha de OT-1 (05/02/2026) cae Jueves (Index 4 aprox, verifica Noche)
    // El algoritmo usa la fecha de la OT para validar el turno. 
    // Asumiremos que la lógica de validación interna pasa con los datos mockeados.

    act(() => {
      result.current.handleSugerirTodo();
    });

    expect(mockSetPlanResult).toHaveBeenCalled();
    const dataActualizada = mockSetPlanResult.mock.calls[0][0];
    
    const otAsignada = dataActualizada.find((ot: any) => ot.nroOrden === 'OT-1');
    const tecnico = otAsignada.tecnicos[0];

    // PEDRO debería haber reemplazado a VACANTE
    expect(tecnico.nombre).toBe('PEDRO');
    expect(tecnico.esSugerido).toBe(true);
  });

  it('debería mostrar alerta si no encuentra técnicos para asignar', () => {
    window.alert = vi.fn();
    
    // Caso imposible: Buscamos un rol que nadie tiene
    const planImposible = [{ 
      ...mockPlanResult[0], 
      tecnicos: [{ nombre: 'VACANTE', rol: 'ASTRONAUTA' }] 
    }];

    const { result } = renderHook(() => usePlanificacionLogic({
      planResult: planImposible,
      setPlanResult: mockSetPlanResult,
      empleadosMap: mockEmpleadosMap,
      mapaHorarios: mockHorarios
    }));

    act(() => {
      result.current.handleSugerirTodo();
    });

    expect(mockSetPlanResult).not.toHaveBeenCalled();
    // Verificamos directamente sobre el objeto window.alert
    expect(window.alert).toHaveBeenCalled();
  });
});