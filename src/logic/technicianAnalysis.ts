import { useMemo } from "react";
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
    allOrders: AtrasoRow[], // Data unificada (Backlog + Cumplimiento)
    plantasDisponibles: string[]
) => {
    const techOrders = allOrders.filter(d => 
        d.detallesTecnicos?.some(t => t.tecnico.toUpperCase() === techName)
    );

    // 2. Calcular plantas activas
    const activePlants = Array.from(new Set(techOrders.map(o => o.planta))).sort();

    // 3. Deduplicar (Por si una OT está en ambas listas, aunque raro, es seguro hacerlo)
    const uniqueOrders = Array.from(new Map(techOrders.map(item => [item.ot, item])).values());

    // 4. Calcular Stats
    const stats = {
        total: uniqueOrders.length,
        cumplidas: uniqueOrders.filter(o => 
            o.detallesTecnicos?.find(t => t.tecnico.toUpperCase() === techName)?.finalizada || 
            o.clasificacion === 'CUMPLIDA'
        ).length,
        pendientes: 0 // Se calcula abajo
    };
    stats.pendientes = stats.total - stats.cumplidas;

    return {
        employeeName: techName,
        employeePlants: activePlants,
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
      const key = nombre.toUpperCase().trim();
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

  // 1. PROCESAR BACKLOG (Lo que está pendiente o en proceso)
  backlogData.forEach(row => {
      row.detallesTecnicos?.forEach(t => {
          const stat = getStat(t.tecnico);
          // Si está en backlog, asumimos pendiente A MENOS que tenga flag explicita
          // Pero generalmente backlog = pendiente.
          if (t.finalizada) {
              stat.finalizadas++;
          } else {
              stat.pendientes++;
          }
          stat.totalAsignado++;
          if (!stat.plantas.includes(row.planta)) stat.plantas.push(row.planta);
      });
  });

  // 2. PROCESAR CUMPLIMIENTO (Lo que ya se cerró)
  cumplimientoData.forEach(row => {
      // En cumplimiento, a veces no tenemos el array de técnicos detallado si viene del RAW.
      // Pero si usaste mi procesador anterior, el array detallesTecnicos debería estar lleno.
      // Si está vacío, usamos el nombre del empleado si está disponible en alguna parte (aunque AtrasoRow no tiene campo empleado directo, se guarda en detallesTecnicos).
      
      row.detallesTecnicos?.forEach(t => {
          const stat = getStat(t.tecnico);
          // Si está en cumplimiento, es finalizada sí o sí
          stat.finalizadas++; 
          stat.totalAsignado++;
          if (!stat.plantas.includes(row.planta)) stat.plantas.push(row.planta);
      });
  });

  // 3. CALCULAR PORCENTAJES
  return Array.from(map.values()).map(s => ({
    ...s,
    efectividad: s.totalAsignado > 0 ? Math.round((s.finalizadas / s.totalAsignado) * 100) : 0
  })).sort((a, b) => b.totalAsignado - a.totalAsignado);
};