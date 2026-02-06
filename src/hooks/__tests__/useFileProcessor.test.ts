// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileProcessor } from '../useFileProcessor';
import { DatabaseService } from '../../shared/db/DatabaseService';
import * as processor from '../../modules/seguimiento/logic/seguimientoOTsProcessor';

// Mocks de dependencias
vi.mock("../../shared/db/DatabaseService");
vi.mock("../../modules/seguimiento/logic/seguimientoOTsProcessor");

describe('useFileProcessor', () => {
    const mockActions = {
        onPlanLoaded: vi.fn(),
        onSeguimientoLoaded: vi.fn(),
        onFallasLoaded: vi.fn(),
        setActiveTab: vi.fn(),
        targetWeek: '2026-S05'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock de las funciones de la DB
        (DatabaseService.guardarSnapshot as any).mockResolvedValue({ lastInsertId: 1 });
        (DatabaseService.guardarActivos as any).mockResolvedValue(true);
        (DatabaseService.guardarCumplimientoRaw as any).mockResolvedValue(true);
        
        // Mock del procesador de OTs
        (processor.processSeguimientoOTs as any).mockReturnValue({
            actual: [{ ot: '123', planta: 'PF1' }],
            activos: [{ codigo: 'C1' }],
            masivoRaw: [{ numero_ot: '123' }], // Sigue viniendo del procesador pero no se guarda en tabla propia
            cumplimientoRaw: [{ nro_ot: '123' }]
        });
    });

    it('debería procesar y guardar un archivo de SEGUIMIENTO correctamente', async () => {
        const { result } = renderHook(() => useFileProcessor(mockActions));

        // Crear un archivo simulado
        const file = new File(['dummy content'], 'test.xlsx', { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const event = { target: { files: [file] } } as any;

        // Ejecutar la subida
        await act(async () => {
            result.current.handleFileUpload(event, 'SEGUIMIENTO');
        });

        // Esperar el setTimeout de 100ms + margen
        await new Promise(r => setTimeout(r, 200));

        // 1. Verificamos que se procesó el Excel
        expect(processor.processSeguimientoOTs).toHaveBeenCalled();

        // 2. Verificamos guardado en la tabla consolidada (pedidos_de_trabajo vía guardarSnapshot)
        expect(DatabaseService.guardarSnapshot).toHaveBeenCalledWith(
            '2026-S05', 
            'SEGUIMIENTO', 
            expect.any(Array)
        );

        // 3. Verificamos guardado del RAW de cumplimiento (Si tu lógica aún lo pide)
        expect(DatabaseService.guardarCumplimientoRaw).toHaveBeenCalledWith(
            '2026-S05', 
            expect.any(Array)
        );

        // 4. Verificamos acciones de UI
        expect(mockActions.onSeguimientoLoaded).toHaveBeenCalled();
        expect(mockActions.setActiveTab).toHaveBeenCalledWith('seguimiento');
        
        // 5. Estado final
        expect(result.current.loading.seguimiento).toBe(false);
    });

    it('debería manejar errores de lectura o base de datos', async () => {
        // 1. Definir alert en el objeto global si no existe
        if (typeof window.alert === 'undefined') {
            window.alert = vi.fn();
        }

        // 2. Mockear el error en la base de datos
        (DatabaseService.guardarSnapshot as any).mockRejectedValue(new Error("DB_FAIL"));
        
        // 3. Espiar (ahora que ya existen)
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        const { result } = renderHook(() => useFileProcessor(mockActions));
        
        const file = new File([''], 'test.xlsx');
        const event = { target: { files: [file] } } as any;

        await act(async () => {
            result.current.handleFileUpload(event, 'SEGUIMIENTO');
        });

        // Esperar a que el flujo asíncrono termine
        await new Promise(r => setTimeout(r, 200));

        // 4. Verificaciones
        expect(alertSpy).toHaveBeenCalledWith("Error al leer el archivo.");
        expect(result.current.loading.seguimiento).toBe(false);
        
        // 5. Limpieza
        consoleSpy.mockRestore();
        alertSpy.mockRestore();
    });
});