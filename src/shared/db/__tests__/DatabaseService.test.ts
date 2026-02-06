// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from '../DatabaseService';
import Database from "@tauri-apps/plugin-sql";

// --- 1. MOCK DE TAURI SQL ---
const mockExecute = vi.fn();
const mockSelect = vi.fn();

// Objeto DB simulado que devolverá el plugin
const mockDbInstance = {
  execute: mockExecute,
  select: mockSelect,
};

vi.mock("@tauri-apps/plugin-sql", () => {
  return {
    default: {
      load: vi.fn(() => Promise.resolve(mockDbInstance))
    }
  };
});

// Datos de prueba
const mockAtrasoRow = {
    planta: 'PF1',
    ot: '100',
    nroActivo: 'A-123',
    descripcion: 'Test',
    estado: 'Pendiente',
    clasificacion: 'TECNICO',
    esOB: true,
    periodo: '2026',
    semana: '2026-S05',
    detallesTecnicos: [{ tecnico: 'JUAN', finalizada: false }]
};

describe('DatabaseService', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Reiniciamos el estado estático para asegurar limpieza
    (DatabaseService as any).db = null;
    
    // Configuración por defecto para que execute no devuelva undefined y rompa cosas
    mockExecute.mockResolvedValue({ lastInsertId: 0, rowsAffected: 1 });
  });

  describe('init', () => {
    it('debería conectar y crear las tablas', async () => {
      await DatabaseService.init();
      
      expect(Database.load).toHaveBeenCalledWith("sqlite:pf_seguimiento.db");
      
      // CORRECCIÓN 1: Son 6 llamadas (4 tablas + 3 índices)
      expect(mockExecute).toHaveBeenCalledTimes(7); 
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS snapshots'));
    });
  });

  describe('guardarSnapshot', () => {
    it('debería hacer un INSERT limpio si el snapshot no existe', async () => {
      // TRUCO: Inyectamos la instancia mockeada directamente en la propiedad estática.
      // Esto hace que 'await this.init()' dentro del código retorne inmediatamente
      // sin ejecutar los CREATE TABLE, evitando que se "coma" nuestros mocks.
      (DatabaseService as any).db = mockDbInstance;

      // 1. Mock Select: No existe snapshot previo (retorna array vacío)
      mockSelect.mockResolvedValueOnce([]); 
      
      // 2. Mock Execute: El INSERT del snapshot retorna ID 123
      mockExecute.mockResolvedValueOnce({ lastInsertId: 123 }); 

      // 3. Mock Execute: El INSERT de los registros (batch)
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });

      await DatabaseService.guardarSnapshot('2026-S05', 'SEGUIMIENTO', [mockAtrasoRow as any]);

      // Verificaciones
      // 1. Buscó si existía
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('SELECT id FROM snapshots'), ['2026-S05', 'SEGUIMIENTO']);
      
      // 2. Insertó el snapshot
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO snapshots'), ['2026-S05', 'SEGUIMIENTO']);

      // 3. Insertó los pedidos_de_trabajo
      // Buscamos la llamada que contiene el INSERT masivo
      const insertCall = mockExecute.mock.calls.find(call => call[0].includes('INSERT INTO pedidos_de_trabajo'));
      expect(insertCall).toBeDefined();
      if (!insertCall) {
        throw new Error('Expected INSERT INTO pedidos_de_trabajo call was not found');
      }

      const params = insertCall[1]; 
      expect(params[0]).toBe(123); 
      expect(params[7]).toBe(1); // esOB (true -> 1)
      expect(params[12]).toBe(JSON.stringify(mockAtrasoRow.detallesTecnicos));
    });

    it('debería borrar pedidos_de_trabajo viejos si el snapshot YA existe (Update)', async () => {
      // Inyectamos DB para saltar init()
      (DatabaseService as any).db = mockDbInstance;

      // 1. Mock: SÍ existe snapshot ID 55
      mockSelect.mockResolvedValueOnce([{ id: 55 }]); 

      await DatabaseService.guardarSnapshot('2026-S05', 'SEGUIMIENTO', []);

      // Verificamos que borró lo viejo usando el ID recuperado (55)
      expect(mockExecute).toHaveBeenCalledWith("DELETE FROM pedidos_de_trabajo WHERE snapshot_id = $1", [55]);
      // Verificamos que actualizó la fecha
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining("UPDATE snapshots"), [55]);
    });
  });

  describe('getSnapshot', () => {
    it('debería recuperar datos y parsear correctamente (JSON y Booleanos)', async () => {
      (DatabaseService as any).db = mockDbInstance;

      // 1. Mock: Encuentra snapshot ID 10
      mockSelect.mockResolvedValueOnce([{ id: 10 }]);

      // 2. Mock: Retorna filas crudas de la BD
      const dbRow = {
          planta: 'PF1', 
          ot: '100', 
          es_ob: 1, // En BD es número
          detalles_tecnicos: '[{"tecnico":"JUAN"}]' // En BD es string
      };
      mockSelect.mockResolvedValueOnce([dbRow]);

      const result = await DatabaseService.getSnapshot('2026-S05', 'SEGUIMIENTO');

      expect(result).toHaveLength(1);
      expect(result[0].esOB).toBe(true); // 1 -> true
      expect(result[0].detallesTecnicos).toEqual([{ tecnico: 'JUAN' }]); // String -> Object
    });

    it('debería retornar array vacío si no existe el snapshot', async () => {
      (DatabaseService as any).db = mockDbInstance;
      
      mockSelect.mockResolvedValueOnce([]); // No encuentra snapshot
      const result = await DatabaseService.getSnapshot('9999', 'SEGUIMIENTO');
      expect(result).toEqual([]);
    });
  });
});