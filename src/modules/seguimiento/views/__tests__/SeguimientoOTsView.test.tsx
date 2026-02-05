// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeguimientoOTsView } from '../SeguimientoOTsView';
import { DatabaseService } from '../../../../shared/db/DatabaseService';
import { confirm } from '@tauri-apps/plugin-dialog';

// =============================================================================
// 1. CORRECCIÓN DE RUTAS EN MOCKS (CRÍTICO)
// =============================================================================

vi.mock('../../components/ResumenTable', () => ({
  ResumenTable: ({ titulo }: any) => <div data-testid="resumen-table">{titulo}</div>
}));

vi.mock('../../components/ComplianceCard', () => ({
  ComplianceCard: ({ planta }: any) => <div data-testid="compliance-card">{planta}</div>
}));

vi.mock('../../components/EvolutionDashboard', () => ({
  EvolutionDashboard: () => <div data-testid="evolution-dashboard">Grafico</div>
}));

// ¡FALTABAN ESTOS MOCKS! Son cruciales para evitar que se ejecute useDashboardList
vi.mock('../../components/AnalysisDashboard', () => ({
  AnalysisDashboard: () => <div data-testid="analysis-dashboard">Analysis Mock</div>
}));

vi.mock('../../components/SeguimientoModal', () => ({
  SeguimientoModal: () => <div data-testid="seguimiento-modal">Modal Mock</div>
}));

vi.mock('../../components/SeguimientoHeader', () => ({
  SeguimientoHeader: ({ setModoVista, onEliminarReporte }: any) => (
    <div data-testid="seguimiento-header">
      <button onClick={() => setModoVista('ATRASOS')}>Ver Atrasos</button>
      <button onClick={() => setModoVista('CUMPLIDAS')}>Ver Cumplimiento</button>
      <button onClick={onEliminarReporte}>Eliminar Reporte</button>
    </div>
  )
}));

vi.mock('../../../../shared/components/ExportButton', () => ({
  ExportButton: () => <button>Export Mock</button>
}));

vi.mock('../../../../shared/db/DatabaseService', () => ({
  DatabaseService: {
    deleteSnapshot: vi.fn(() => Promise.resolve()),
  }
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  confirm: vi.fn(),
}));

vi.mock('../../logic/backlogAnalysis', () => ({
  analyzeBacklogFlow: () => ({ nuevas: 10, finalizadas: 5, conAvance: 2 })
}));

// =============================================================================
// 2. DATA DUMMY Y SETUP
// =============================================================================

const mockData = [
  { ot: '100', planta: 'PF1', periodo: '2026', semana: '2026-S05', clasificacion: 'TECNICO', esOB: false, descripcion: 'T1' },
];

const baseSeguimientoData = {
    dataActual: mockData,
    dataAnterior: [],
    dataCumplimiento: [],
    reporteActual: '2026-S05',
    semanaComparar: '2026-S04', 
    isLoading: false,
    cargarReporte: vi.fn(),
    cambiarComparacion: vi.fn(),
    limpiarComparacion: vi.fn(),
    setReporteActual: vi.fn(),
    setDatosManuales: vi.fn(),
    resetTodo: vi.fn()
};

describe('SeguimientoOTsView Component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar correctamente en modo ATRASOS por defecto', () => {
    render(
        <SeguimientoOTsView 
            seguimientoData={baseSeguimientoData as any} 
            historialCompleto={['2026-S05']} 
        />
    );

    expect(screen.getByText(/Consolidado OM/i)).toBeInTheDocument();
    expect(screen.getByTestId('evolution-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('compliance-card')).not.toBeInTheDocument();
  });

  it('debería cambiar a vista CUMPLIDAS al interactuar con el header', () => {
    render(
        <SeguimientoOTsView 
            seguimientoData={baseSeguimientoData as any} 
            historialCompleto={['2026-S05']} 
        />
    );

    const btnCumplimiento = screen.getByText('Ver Cumplimiento');
    fireEvent.click(btnCumplimiento);

    const cards = screen.getAllByTestId('compliance-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('debería mostrar el Overlay de Carga si isLoading es true', () => {
    const loadingData = { ...baseSeguimientoData, isLoading: true };
    
    render(
        <SeguimientoOTsView 
            seguimientoData={loadingData as any} 
            historialCompleto={['2026-S05']} 
        />
    );
    
    expect(screen.getByText(/Procesando datos/i)).toBeInTheDocument();
  });

  it('debería intentar cargar el reporte inicial si no hay reporte actual', () => {
    const emptyData = { ...baseSeguimientoData, reporteActual: '' };
    
    render(
        <SeguimientoOTsView 
            seguimientoData={emptyData as any} 
            historialCompleto={['2026-S05']} 
        />
    );

    expect(emptyData.cargarReporte).toHaveBeenCalledWith('2026-S05');
  });

  it('debería eliminar un reporte si el usuario confirma', async () => {
    (confirm as any).mockResolvedValue(true);
    const onReporteEliminadoMock = vi.fn();

    render(
        <SeguimientoOTsView 
            seguimientoData={baseSeguimientoData as any} 
            historialCompleto={['2026-S05']} 
            onReporteEliminado={onReporteEliminadoMock}
        />
    );

    const btnEliminar = screen.getByText('Eliminar Reporte');
    fireEvent.click(btnEliminar);

    await waitFor(() => {
        expect(confirm).toHaveBeenCalled();
        expect(DatabaseService.deleteSnapshot).toHaveBeenCalledWith('2026-S04', 'SEGUIMIENTO'); 
        expect(baseSeguimientoData.limpiarComparacion).toHaveBeenCalled();
        expect(onReporteEliminadoMock).toHaveBeenCalled();
    });
  });
});