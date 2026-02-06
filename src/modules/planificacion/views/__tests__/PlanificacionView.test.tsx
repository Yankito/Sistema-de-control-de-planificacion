// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanificacionView } from '../PlanificacionView';
import * as HookModule from '../../hooks/usePlanificacionLogic';

// --- 1. MOCKS DE COMPONENTES HIJOS ---
// No necesitamos renderizar el Calendario real (es muy pesado), solo saber que está ahí.
vi.mock('../../components/Calendario', () => ({
  Calendario: () => <div data-testid="mock-calendario">Calendario</div>
}));

vi.mock('../../components/PanelLateral', () => ({
  PanelLateral: () => <div data-testid="mock-panel">Panel</div>
}));

// --- 2. DATA DUMMY ---
const mockProps = {
  planResult: [],
  setPlanResult: vi.fn(),
  plantaSeleccionada: 'PF3',
  plantas: ['PF3'],
  onCambiarPlanta: vi.fn(),
  empleadosMap: new Map(),
  planResultSinAsignar: [],
  mapaHorarios: new Map(),
  onEditTecnicos: vi.fn(),
  fechaSeleccionada: null,
  isNocheValid: vi.fn()
};

// Mock del retorno del hook
const mockHookReturn = {
  diaSeleccionado: null,
  setDiaSeleccionado: vi.fn(),
  draggingOT: null,
  dragOverDate: null,
  showSuccess: false,
  mensajeExito: '',
  mostrarSoloVacantes: false,
  setMostrarSoloVacantes: vi.fn(),
  ordenesPorDia: {},
  handleSugerirTodo: vi.fn(), // <--- Esto es lo que vamos a probar
  handleDragStart: vi.fn(),
  handleDragEnd: vi.fn(),
  handleDragEnter: vi.fn(),
  handleDragOver: vi.fn(),
  handleDrop: vi.fn()
};

describe('PlanificacionView', () => {
  
  // Espiamos el hook para controlar qué devuelve
  const usePlanificacionSpy = vi.spyOn(HookModule, 'usePlanificacionLogic');

  beforeEach(() => {
    vi.clearAllMocks();
    // Hacemos que el hook devuelva nuestro objeto mockeado por defecto
    usePlanificacionSpy.mockReturnValue(mockHookReturn as any);
  });

  it('debería renderizar los componentes principales', () => {
    render(<PlanificacionView {...mockProps} />);

    // Verificar hijos
    expect(screen.getByTestId('mock-calendario')).toBeInTheDocument();
    expect(screen.getByTestId('mock-panel')).toBeInTheDocument();
    
    // Verificar botón de acción
    expect(screen.getByText(/Auto-Completar Vacantes/i)).toBeInTheDocument();
  });

  it('debería inicializar el hook con las props correctas', () => {
    render(<PlanificacionView {...mockProps} />);

    // Verificamos SOLO lo que realmente consume el hook
    expect(usePlanificacionSpy).toHaveBeenCalledWith(expect.objectContaining({
      planResult: mockProps.planResult,
      setPlanResult: mockProps.setPlanResult, // El hook sí recibe esto
      fechaSeleccionada: mockProps.fechaSeleccionada,
      empleadosMap: mockProps.empleadosMap,   // El hook sí recibe esto
      mapaHorarios: mockProps.mapaHorarios    // El hook sí recibe esto
    }));
    
    // NOTA: No chequeamos 'plantaSeleccionada' porque esa prop se queda 
    // en la Vista para pasársela al Calendario, no entra a la lógica.
  });

  it('debería ejecutar handleSugerirTodo al hacer click en el botón', () => {
    render(<PlanificacionView {...mockProps} />);

    const btnMagico = screen.getByText(/Auto-Completar Vacantes/i);
    fireEvent.click(btnMagico);

    // Verificamos que se llamó a la función que salió del hook
    expect(mockHookReturn.handleSugerirTodo).toHaveBeenCalledTimes(1);
  });
});