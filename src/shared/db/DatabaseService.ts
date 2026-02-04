import Database from "@tauri-apps/plugin-sql";
import { AtrasoRow, ActivoRow, MasivoRow, CumplimientoRow } from "../../types";

const DB_NAME = "sqlite:pf_seguimiento.db";

export class DatabaseService {
  private static db: Database | null = null;

  static async init() {
    if (!this.db) {
      this.db = await Database.load(DB_NAME);
      
      // 1. SNAPSHOTS: Actualizamos el CHECK para permitir los nuevos tipos RAW
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          semana TEXT NOT NULL,
          tipo TEXT CHECK( tipo IN ('ATRASOS', 'CUMPLIMIENTO', 'MASIVO_RAW', 'CUMPLIMIENTO_RAW') ) NOT NULL,
          fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(semana, tipo)
        );
      `);

      // 2. REGISTROS (Tabla procesada para UI - Se mantiene igual)
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS registros (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          snapshot_id INTEGER,
          planta TEXT, ot TEXT, descripcion TEXT, estado TEXT, clasificacion TEXT,
          es_ob BOOLEAN, periodo TEXT, semana TEXT, rmd TEXT, rse TEXT, detalles_tecnicos TEXT, 
          FOREIGN KEY(snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
        );
      `);

      // 3. NUEVA TABLA: DATOS MASIVO (Estructura espejo del Excel)
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS datos_masivo (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          snapshot_id INTEGER,
          numero_ot TEXT,
          activo TEXT,
          descripcion TEXT,
          tpt TEXT,
          fecha_progr TEXT,
          horas REAL,
          rmd TEXT,
          rse TEXT,
          FOREIGN KEY(snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
        );
      `);

      // 4. NUEVA TABLA: DATOS CUMPLIMIENTO (Estructura espejo del Excel)
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS datos_cumplimiento (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          snapshot_id INTEGER,
          planta TEXT,
          empleado TEXT,
          nro_ot TEXT,
          tipo_orden TEXT,
          estado_om TEXT,
          fecha_programada TEXT,
          op_finalizada TEXT,
          FOREIGN KEY(snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
        );
      `);
      
      // 5. ACTIVOS (Se mantiene igual)
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS activos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo TEXT UNIQUE, descripcion TEXT, planta TEXT, ubicacion TEXT
        );
      `);

      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_registros_snapshot ON registros(snapshot_id);`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_registros_semana ON registros(semana);`);
    }
    return this.db;
  }

  // --- GESTIÓN DE SNAPSHOTS GENÉRICA ---
  static async deleteSnapshot(semana: string, tipo: string) {
    const db = await this.init();
    await db.execute("DELETE FROM snapshots WHERE semana = $1 AND tipo = $2", [semana, tipo]);
  }

  // --- GUARDAR REPORTE PROCESADO (ATRASOS) ---
  static async guardarSnapshot(semana: string, tipo: string, data: AtrasoRow[]) {
    const db = await this.init();
    // 1. Upsert Snapshot
    const existe = await db.select<any[]>("SELECT id FROM snapshots WHERE semana = $1 AND tipo = $2", [semana, tipo]);
    let snapshotId: number;

    if (existe.length > 0) {
        const idViejo = existe[0].id;
        await db.execute("DELETE FROM registros WHERE snapshot_id = $1", [idViejo]);
        await db.execute("UPDATE snapshots SET fecha_carga = CURRENT_TIMESTAMP WHERE id = $1", [idViejo]);
        snapshotId = idViejo;
    } else {
        const res = await db.execute("INSERT INTO snapshots (semana, tipo) VALUES ($1, $2)", [semana, tipo]);
        snapshotId = (res as any).lastInsertId;
    }

    // 2. Insertar Registros
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);
        const values: string[] = [];
        const params: any[] = [];
        chunk.forEach(row => {
            values.push(`(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            params.push(snapshotId, row.planta, row.ot, row.descripcion, row.estado, row.clasificacion, row.esOB ? 1 : 0, row.periodo, row.semana, row.rmd || "", row.rse || "", JSON.stringify(row.detallesTecnicos || []));
        });
        await db.execute(`INSERT INTO registros (snapshot_id, planta, ot, descripcion, estado, clasificacion, es_ob, periodo, semana, rmd, rse, detalles_tecnicos) VALUES ${values.join(", ")}`, params);
    }
  }

  // --- NUEVO: GUARDAR MASIVO RAW ---
  static async guardarMasivoRaw(semana: string, data: MasivoRow[]) {
    const db = await this.init();
    const existe = await db.select<any[]>("SELECT id FROM snapshots WHERE semana = $1 AND tipo = 'MASIVO_RAW'", [semana]);
    let snapshotId: number;

    if (existe.length > 0) {
        const idViejo = existe[0].id;
        await db.execute("DELETE FROM datos_masivo WHERE snapshot_id = $1", [idViejo]);
        snapshotId = idViejo;
    } else {
        const res = await db.execute("INSERT INTO snapshots (semana, tipo) VALUES ($1, 'MASIVO_RAW')", [semana]);
        snapshotId = (res as any).lastInsertId;
    }

    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);
        const values: string[] = [];
        const params: any[] = [];
        chunk.forEach(r => {
            values.push(`(?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            params.push(snapshotId, r.numero_ot, r.activo, r.descripcion, r.tpt, r.fecha_progr, r.horas, r.rmd, r.rse);
        });
        await db.execute(`INSERT INTO datos_masivo (snapshot_id, numero_ot, activo, descripcion, tpt, fecha_progr, horas, rmd, rse) VALUES ${values.join(", ")}`, params);
    }
  }

  // --- NUEVO: GUARDAR CUMPLIMIENTO RAW ---
  static async guardarCumplimientoRaw(semana: string, data: CumplimientoRow[]) {
    const db = await this.init();
    const existe = await db.select<any[]>("SELECT id FROM snapshots WHERE semana = $1 AND tipo = 'CUMPLIMIENTO_RAW'", [semana]);
    let snapshotId: number;

    if (existe.length > 0) {
        const idViejo = existe[0].id;
        await db.execute("DELETE FROM datos_cumplimiento WHERE snapshot_id = $1", [idViejo]);
        snapshotId = idViejo;
    } else {
        const res = await db.execute("INSERT INTO snapshots (semana, tipo) VALUES ($1, 'CUMPLIMIENTO_RAW')", [semana]);
        snapshotId = (res as any).lastInsertId;
    }

    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);
        const values: string[] = [];
        const params: any[] = [];
        chunk.forEach(r => {
            values.push(`(?, ?, ?, ?, ?, ?, ?, ?)`);
            params.push(snapshotId, r.planta, r.empleado, r.nro_ot, r.tipo, r.estado_om, r.fecha_programada, r.op_finalizada);
        });
        await db.execute(`INSERT INTO datos_cumplimiento (snapshot_id, planta, empleado, nro_ot, tipo_orden, estado_om, fecha_programada, op_finalizada) VALUES ${values.join(", ")}`, params);
    }
  }

  static async getSnapshot(semana: string, tipo: string): Promise<AtrasoRow[]> {
    const db = await this.init();
    const snapshot = await db.select<any[]>("SELECT id FROM snapshots WHERE semana = $1 AND tipo = $2", [semana, tipo]);
    if (snapshot.length === 0) return [];
    const id = snapshot[0].id;
    const registros = await db.select<any[]>(`SELECT * FROM registros WHERE snapshot_id = $1`, [id]);
    
    return registros.map(r => ({
        planta: r.planta, ot: r.ot, descripcion: r.descripcion, estado: r.estado, clasificacion: r.clasificacion,
        esOB: r.es_ob === 1 || r.es_ob === true || r.es_ob === "1", 
        periodo: r.periodo, semana: r.semana, rmd: r.rmd, rse: r.rse, detallesTecnicos: JSON.parse(r.detalles_tecnicos || "[]")
    }));
  }

  static async getLatestSnapshot(tipo: 'ATRASOS' | 'CUMPLIMIENTO'): Promise<AtrasoRow[]> {
    const db = await this.init();
    const snapshot = await db.select<any[]>("SELECT id, semana FROM snapshots WHERE tipo = $1 ORDER BY id DESC LIMIT 1", [tipo]);
    if (snapshot.length === 0) return [];

    const id = snapshot[0].id;
    const registros = await db.select<any[]>(`
        SELECT planta, ot, descripcion, estado, clasificacion, es_ob, periodo, semana, rmd, rse, detalles_tecnicos 
        FROM registros WHERE snapshot_id = $1`, [id]);
    
    return registros.map(r => ({
        planta: r.planta,
        ot: r.ot,
        descripcion: r.descripcion,
        estado: r.estado,
        clasificacion: r.clasificacion,
        // CORRECCIÓN CRÍTICA
        esOB: r.es_ob === 1 || r.es_ob === true || r.es_ob === "1", 
        periodo: r.periodo,
        semana: r.semana,
        rmd: r.rmd,
        rse: r.rse,
        detallesTecnicos: JSON.parse(r.detalles_tecnicos || "[]")
    }));
  }

  static async getSnapshotLite(semana: string, tipo: string): Promise<AtrasoRow[]> {
    const db = await this.init();
    const snapshot = await db.select<any[]>("SELECT id FROM snapshots WHERE semana = $1 AND tipo = $2", [semana, tipo]);
    if (snapshot.length === 0) return [];

    const id = snapshot[0].id;
    // SOLO TRAEMOS LO NECESARIO PARA EL CRUCE DE FLUJO
    const registros = await db.select<any[]>(`
        SELECT planta, ot, descripcion, estado, clasificacion, es_ob, periodo, semana 
        FROM registros WHERE snapshot_id = $1`, [id]);
    
    return registros.map(r => ({
        planta: r.planta,
        ot: r.ot,
        descripcion: r.descripcion,
        estado: r.estado,
        clasificacion: r.clasificacion,
        esOB: r.es_ob === 1 || r.es_ob === true || r.es_ob === "1", 
        periodo: r.periodo,
        semana: r.semana,
        rmd: "", // No necesario para comparar
        rse: "", // No necesario para comparar
        detallesTecnicos: [] // Ahorramos el JSON.parse masivo aquí
    }));
  }

  static async getSemanasDisponibles(tipo: string): Promise<string[]> { 
      const db = await this.init();
      const rows = await db.select<{semana: string}[]>("SELECT semana FROM snapshots WHERE tipo = $1 ORDER BY semana DESC", [tipo]);
      return rows.map(r => r.semana);
  }

  // --- GESTIÓN DE ACTIVOS (Sin Cambios) ---
  static async guardarActivos(activos: ActivoRow[]) {
    if (activos.length === 0) return;
    const db = await this.init();
    const batchSize = 100;
    for (let i = 0; i < activos.length; i += batchSize) {
        const chunk = activos.slice(i, i + batchSize);
        const values: string[] = [];
        const params: any[] = [];
        chunk.forEach(a => {
            values.push(`(?, ?, ?, ?)`);
            params.push(a.codigo, a.descripcion, a.planta, a.ubicacion);
        });
        const query = `INSERT INTO activos (codigo, descripcion, planta, ubicacion) VALUES ${values.join(", ")} 
                       ON CONFLICT(codigo) DO UPDATE SET descripcion=excluded.descripcion, planta=excluded.planta, ubicacion=excluded.ubicacion`;
        await db.execute(query, params);
    }
  }

  static async getActivos(filtro?: string): Promise<ActivoRow[]> {
      const db = await this.init();
      let query = "SELECT codigo, descripcion, planta, ubicacion FROM activos";
      let params: any[] = [];
      if (filtro) {
          query += " WHERE codigo LIKE $1 OR descripcion LIKE $1";
          params.push(`%${filtro}%`);
      }
      return await db.select<ActivoRow[]>(query, params);
  }
}