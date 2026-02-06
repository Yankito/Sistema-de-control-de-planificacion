import Database from "@tauri-apps/plugin-sql";
import { AtrasoRow, ActivoRow, CumplimientoRow } from "../../modules/seguimiento/types";

const DB_NAME = "sqlite:pf_seguimiento.db";

export class DatabaseService {
  private static db: Database | null = null;

  static async init() {
    if (!this.db) {
      this.db = await Database.load(DB_NAME);
      
      // 1. SNAPSHOTS (Se mantiene igual)
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          semana TEXT NOT NULL,
          tipo TEXT CHECK( tipo IN ('SEGUIMIENTO', 'CUMPLIMIENTO') ) NOT NULL,
          fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(semana, tipo)
        );
      `);

      // 2. PEDIDOS DE TRABAJO (Tabla consolidada y renombrada)
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS pedidos_de_trabajo (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          snapshot_id INTEGER,
          planta TEXT, 
          ot TEXT, 
          nro_activo TEXT,
          descripcion TEXT, 
          estado TEXT, 
          clasificacion TEXT,
          es_ob BOOLEAN, 
          periodo TEXT, 
          semana TEXT, 
          rmd TEXT, 
          rse TEXT, 
          detalles_tecnicos TEXT, 
          fecha TEXT,
          FOREIGN KEY(snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
        );
      `);

      // 3. ACTIVOS (Se mantiene igual)
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS activos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo TEXT UNIQUE, descripcion TEXT, planta TEXT, ubicacion TEXT
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

      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_pedidos_snapshot ON pedidos_de_trabajo(snapshot_id);`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_pedidos_semana ON pedidos_de_trabajo(semana);`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_cumplimiento_snapshot ON datos_cumplimiento(snapshot_id);`);
    }
    return this.db;
  }

  // --- GESTIÓN DE SNAPSHOTS GENÉRICA ---
  static async deleteSnapshot(semana: string, tipo: string) {
    const db = await this.init();
    await db.execute("DELETE FROM snapshots WHERE semana = $1 AND tipo = $2", [semana, tipo]);
  }

  // --- GUARDAR REPORTE PROCESADO ---
  static async guardarSnapshot(semana: string, tipo: string, data: any[]) {
    const db = await this.init();
    
    const existe = await db.select<any[]>("SELECT id FROM snapshots WHERE semana = $1 AND tipo = $2", [semana, tipo]);
    let snapshotId: number;

    if (existe.length > 0) {
        snapshotId = existe[0].id;
        await db.execute("DELETE FROM pedidos_de_trabajo WHERE snapshot_id = $1", [snapshotId]);
        
        await db.execute("UPDATE snapshots SET fecha_carga = CURRENT_TIMESTAMP WHERE id = $1", [snapshotId]);
        
    } else {
        const res = await db.execute("INSERT INTO snapshots (semana, tipo) VALUES ($1, $2)", [semana, tipo]);
        snapshotId = (res as any).lastInsertId;
    }

    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);
        const values: string[] = [];
        const params: any[] = [];
        chunk.forEach(row => {
            // 14 Columnas ahora incluyendo nro_activo
            values.push(`(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            params.push(
                snapshotId, 
                row.planta, 
                row.ot, 
                row.nroActivo || "",
                row.descripcion, 
                row.estado, 
                row.clasificacion, 
                row.esOB ? 1 : 0, 
                row.periodo, 
                row.semana, 
                row.rmd || "", 
                row.rse || "", 
                JSON.stringify(row.detallesTecnicos || []), 
                row.fecha || ""
            );
        });
        await db.execute(`
          INSERT INTO pedidos_de_trabajo (
            snapshot_id, planta, ot, nro_activo, descripcion, estado, 
            clasificacion, es_ob, periodo, semana, rmd, rse, 
            detalles_tecnicos, fecha
          ) VALUES ${values.join(", ")}`, params);
    }
  }

  // --- NUEVO: GUARDAR CUMPLIMIENTO RAW ---
  static async guardarCumplimientoRaw(semana: string, data: CumplimientoRow[]) {
    const db = await this.init();
    const existe = await db.select<any[]>("SELECT id FROM snapshots WHERE semana = $1 AND tipo = 'CUMPLIMIENTO'", [semana]);
    let snapshotId: number;

    if (existe.length > 0) {
        const idViejo = existe[0].id;
        await db.execute("DELETE FROM datos_cumplimiento WHERE snapshot_id = $1", [idViejo]);
        snapshotId = idViejo;
    } else {
        const res = await db.execute("INSERT INTO snapshots (semana, tipo) VALUES ($1, 'CUMPLIMIENTO')", [semana]);
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
    const rows = await db.select<any[]>(`SELECT * FROM pedidos_de_trabajo WHERE snapshot_id = $1`, [id]);
    
    return rows.map(r => ({
        planta: r.planta, ot: r.ot, nroActivo: r.nro_activo, descripcion: r.descripcion, 
        estado: r.estado, clasificacion: r.clasificacion,
        esOB: r.es_ob === 1 || r.es_ob === true || r.es_ob === "1", 
        periodo: r.periodo, semana: r.semana, rmd: r.rmd, rse: r.rse, 
        detallesTecnicos: JSON.parse(r.detalles_tecnicos || "[]"), fecha: r.fecha
    }));
  }

  static async getLatestSnapshot(tipo: 'SEGUIMIENTO' | 'CUMPLIMIENTO'): Promise<AtrasoRow[]> {
    const db = await this.init();
    const snapshot = await db.select<any[]>("SELECT id, semana FROM snapshots WHERE tipo = $1 ORDER BY id DESC LIMIT 1", [tipo]);
    if (snapshot.length === 0) return [];

    const id = snapshot[0].id;
    const pedidosDeTrabajo = await db.select<any[]>(`
        SELECT planta, ot, descripcion, estado, clasificacion, es_ob, periodo, semana, rmd, rse, detalles_tecnicos, fecha
        FROM pedidos_de_trabajo WHERE snapshot_id = $1`, [id]);
    
    return pedidosDeTrabajo.map(r => ({
        planta: r.planta,
        ot: r.ot,
        nroActivo: r.nro_activo,
        descripcion: r.descripcion,
        estado: r.estado,
        clasificacion: r.clasificacion,
        esOB: r.es_ob === 1 || r.es_ob === true || r.es_ob === "1", 
        periodo: r.periodo,
        semana: r.semana,
        rmd: r.rmd,
        rse: r.rse,
        detallesTecnicos: JSON.parse(r.detalles_tecnicos || "[]"),
        fecha: r.fecha
    }));
  }

  static async getSnapshotLite(semana: string, tipo: string): Promise<AtrasoRow[]> {
    const db = await this.init();
    const snapshot = await db.select<any[]>("SELECT id FROM snapshots WHERE semana = $1 AND tipo = $2", [semana, tipo]);
    if (snapshot.length === 0) return [];

    const id = snapshot[0].id;
    // SOLO TRAEMOS LO NECESARIO PARA EL CRUCE DE FLUJO
    const pedidosDeTrabajo = await db.select<any[]>(`
        SELECT planta, ot, descripcion, estado, clasificacion, es_ob, periodo, semana 
        FROM pedidos_de_trabajo WHERE snapshot_id = $1`, [id]);
    
    return pedidosDeTrabajo.map(r => ({
        planta: r.planta,
        ot: r.ot,
        nroActivo: r.nro_activo,
        descripcion: r.descripcion,
        estado: r.estado,
        clasificacion: r.clasificacion,
        esOB: r.es_ob === 1 || r.es_ob === true || r.es_ob === "1", 
        periodo: r.periodo,
        semana: r.semana,
        rmd: "",
        rse: "",
        detallesTecnicos: []
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