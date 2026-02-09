import { AtrasoRow } from "../types";

export interface TechStats {
  nombre: string;
  totalAsignado: number;
  finalizadas: number;
  pendientes: number;
  efectividad: number;
  plantas: string[];
}

// LOGICA PARA PREPARAR DATOS DE EMPLOYEE PROFILE
export const prepareEmployeeProfile = (
  techName: string,
  allOrders: AtrasoRow[],
  plantasDisponibles: string[]
) => {
  const techOrders = allOrders.filter(d => {
    return d.detallesTecnicos?.some(t => t.tecnico === techName);
  });

  // Calcular plantas activas
  const activePlants = Array.from(new Set(techOrders.map(o => o.planta)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  // Deduplicar (Por si una OT está en ambas listas, aunque raro, es seguro hacerlo)
  const uniqueOrders = Array.from(new Map(techOrders.map(item => [item.ot, item])).values());

  // Calcular Stats
  const stats = {
    total: uniqueOrders.length,
    cumplidas: uniqueOrders.filter(o =>
      o.detallesTecnicos?.find(t => t.tecnico === techName)?.finalizada ||
      o.clasificacion === 'CUMPLIDA'
    ).length,
    pendientes: 0
  };
  stats.pendientes = stats.total - stats.cumplidas;

  return {
    employeeName: techName,
    activePlants: activePlants,
    orders: uniqueOrders,
    stats: stats,
    listaPlantas: plantasDisponibles.filter(p => p !== "TODAS")
  };
};

export const analyzeTechnicians = (
  backlogData: AtrasoRow[],
  cumplimientoData: AtrasoRow[]
): TechStats[] => {
  const map = new Map<string, TechStats>();

  // Helper para inicializar o recuperar un técnico
  const getStat = (nombre: string) => {
    const key = nombre.trim();
    if (!map.has(key)) {
      map.set(key, {
        nombre: key,
        totalAsignado: 0,
        finalizadas: 0,
        pendientes: 0,
        efectividad: 0,
        plantas: []
      });
    }
    return map.get(key)!;
  };

  const allData = [...backlogData, ...cumplimientoData];

  allData.forEach(row => {
    row.detallesTecnicos?.forEach(t => {
      const stat = getStat(t.tecnico);

      if (t.finalizada) {
        stat.finalizadas++;
      } else {
        stat.pendientes++;
      }

      stat.totalAsignado++;
      if (!stat.plantas.includes(row.planta)) stat.plantas.push(row.planta);
    });
  });

  return Array.from(map.values()).map(s => ({
    ...s,
    efectividad: s.totalAsignado > 0 ? Math.round((s.finalizadas / s.totalAsignado) * 100) : 0
  })).sort((a, b) => b.totalAsignado - a.totalAsignado);
};