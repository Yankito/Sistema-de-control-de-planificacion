import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportarReporteCompleto } from '../exportUtils'; // Ajusta la ruta si es necesario
import * as XLSX from 'xlsx-js-style';
import { save } from '@tauri-apps/plugin-dialog';

// --- MOCKS ---
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: vi.fn() }));

vi.mock('xlsx-js-style', async () => {
  const actual = await vi.importActual<typeof import('xlsx-js-style')>('xlsx-js-style');
  return {
    ...actual,
    utils: {
      ...actual.utils,
      book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
      book_append_sheet: vi.fn(),
      json_to_sheet: vi.fn(() => ({})),
      aoa_to_sheet: vi.fn((matrix) => ({ '!data': matrix })),
    },
    write: vi.fn(() => new Uint8Array([1, 2, 3])),
  };
});

// --- FIXTURES ---
const mockDataActual = [
  { planta: 'PF1', periodo: 'ENE-26', clasificacion: 'TECNICO / SERVICIO', esOB: false, ot: '100', semana: '2026-S05' },
  { planta: 'PF1', periodo: 'ENE-26', clasificacion: 'TECNICO / SERVICIO', esOB: false, ot: '101', semana: '2026-S05' },
  { planta: 'DC', periodo: 'ENE-26', clasificacion: 'PROGRAMADOR', esOB: true, ot: '200', semana: '2026-S05' },
  { planta: 'PF1', periodo: 'ENE-26', clasificacion: 'CUMPLIDA', esOB: false, ot: '999', semana: '2026-S05' },
] as any;

const mockDataAnterior = [
  { planta: 'PF1', periodo: 'ENE-26', clasificacion: 'TECNICO / SERVICIO', esOB: false },
  { planta: 'DC', periodo: 'ENE-26', clasificacion: 'PROGRAMADOR', esOB: true },
] as any;

describe('ExportUtils Tests', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportarReporteCompleto (Lógica de Negocio y Semáforos)', () => {
    
    it('debería calcular correctamente los DELTAS y asignar colores', async () => {
      (save as any).mockResolvedValue('/path/reporte_completo.xlsx');

      await exportarReporteCompleto(mockDataActual, mockDataAnterior, 'ATRASOS', '2026-S05');

      const calls = (XLSX.utils.aoa_to_sheet as any).mock.calls;
      const matrix = calls[0][0];

      // CORRECCIÓN AQUÍ: Usamos ?.v para evitar crash en filas vacías []
      const filaPF1 = matrix.find((row: any[]) => row[0]?.v === 'PF1 (OM)');
      
      expect(filaPF1).toBeDefined();

      // Verificación de Cálculos
      const celdaEne26 = filaPF1[1]; 
      expect(celdaEne26.v).toBe(2); 

      const celdaTotalAnt = filaPF1[filaPF1.length - 2]; 
      expect(celdaTotalAnt.v).toBe(1);

      const celdaDelta = filaPF1[filaPF1.length - 1];
      expect(celdaDelta.v).toBe(1); 
      
      // Verificación de Semáforo (Rojo)
      expect(celdaDelta.s.fill.fgColor.rgb).toBe('FF8888');
    });

    it('debería agrupar correctamente DC y VENTAS dentro de COMPLEJO', async () => {
      (save as any).mockResolvedValue('/path/reporte.xlsx');
      await exportarReporteCompleto(mockDataActual, mockDataAnterior, 'ATRASOS', '2026-S05');

      const matrix = (XLSX.utils.aoa_to_sheet as any).mock.calls[0][0];
      
      // CORRECCIÓN AQUÍ: Usamos ?.v para evitar crash en filas vacías []
      const filaComplejo = matrix.find((row: any[]) => row[0]?.v === 'COMPLEJO (OB)');
      
      expect(filaComplejo).toBeDefined();

      const celdaTotalAct = filaComplejo.find((c: any) => c.f && c.f.startsWith('SUM'));
      expect(celdaTotalAct).toBeDefined();
      expect(celdaTotalAct.f).toContain('SUM');
      
      expect(celdaTotalAct.v).toBe(1);
    });

    it('debería generar el nombre de archivo con la semana correcta', async () => {
      (save as any).mockResolvedValue('/path/ok.xlsx');
      await exportarReporteCompleto(mockDataActual, [], 'ATRASOS', '2026-S05');

      expect(save).toHaveBeenCalledWith(expect.objectContaining({
        defaultPath: 'Dashboard_Atrasos_S05.xlsx'
      }));
    });

    it('debería asignar color VERDE si los atrasos bajaron', async () => {
      const dataActualBaja = [
        { planta: 'PF2', periodo: 'ENE-26', clasificacion: 'TECNICO', esOB: false } 
      ] as any;

      const dataAnteriorAlta = [
        { planta: 'PF1', periodo: 'ENE-26', clasificacion: 'TECNICO', esOB: false } // 1 atraso en PF1 (Anterior)
      ] as any;

      (save as any).mockResolvedValue('/path/reporte_verde.xlsx');

      await exportarReporteCompleto(dataActualBaja, dataAnteriorAlta, 'ATRASOS', '2026-S05');

      const calls = (XLSX.utils.aoa_to_sheet as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0); // Verificación de seguridad
      
      const matrix = calls[0][0];
      
      // Buscamos la fila PF1. En dataActual no tiene nada (0), en Anterior tiene (1).
      const filaPF1 = matrix.find((row: any[]) => row[0]?.v === 'PF1 (OM)');
      
      expect(filaPF1).toBeDefined();

      // Delta: 0 (Actual) - 1 (Anterior) = -1
      // La celda Delta es la última de la fila
      const celdaDelta = filaPF1[filaPF1.length - 1];
      
      expect(celdaDelta.v).toBe(-1);
      
      // Verificamos color VERDE (90EE90)
      expect(celdaDelta.s.fill.fgColor.rgb).toBe('90EE90');
    });
  });
});