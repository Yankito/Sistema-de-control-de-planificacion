import { useMemo } from "react";
import { 
  esPlantaCompatible, 
  rolesCoinciden, 
  necesitaValidacionTurno 
} from "../utils/planificacionUtils";

const BLOQUEOS_SABADO = ['L', 'V', 'LIC', 'LM', 'LP'];

interface UseModalAsignacionProps {
  orden: any;
  fecha: string;
  empleados: any[];
  mapaHorarios: Map<string, string[]>;
  onAsignar: (ordenId: string, indiceTecnico: number, nuevoNombre: string, esAutomatico?: boolean) => void;
}

export const useModalAsignacion = ({
  orden,
  fecha,
  empleados,
  mapaHorarios,
  onAsignar
}: UseModalAsignacionProps) => {

  // 1. Contexto de Fecha
  const { diaIndex, esSabado } = useMemo(() => {
      if (!fecha) return { diaIndex: 0, esSabado: false };
      const [d, m, y] = fecha.split('/').map(Number);
      const fechaObj = new Date(y, m - 1, d);
      return { 
          diaIndex: d - 1, 
          esSabado: fechaObj.getDay() === 6 
      };
  }, [fecha]);

  // 2. Técnicos ya ocupados en esta OT
  const tecnicosYaAsignados = useMemo(() => {
      if (!orden || !orden.tecnicos) return [];
      return orden.tecnicos
        .map((t: any) => t.nombre)
        .filter((n: string) => n !== 'VACANTE');
  }, [orden]);

  // 3. Lógica de Sugerencia Automática
  const sugerirTecnicosFaltantes = () => {
      if (!orden || !orden.tecnicos) return;

      orden.tecnicos.forEach((slot: any, idx: number) => {
          if (slot.nombre === 'VACANTE') {
              const candidatos = empleados.filter((emp: any) => {
                  return rolesCoinciden(slot.rol, emp.rol) && esPlantaCompatible(emp.planta, orden.planta);
              });

              const mejorCandidato = candidatos.find((cand: any) => {
                  const nombre = cand.key || cand.nombre;
                  if (tecnicosYaAsignados.includes(nombre)) return false; 

                  if (!necesitaValidacionTurno(cand.rol)) return true;

                  const turnos = mapaHorarios.get(nombre);
                  const turnoDia = turnos ? turnos[diaIndex] : "?";
                  const turnoLimpio = String(turnoDia).trim().toUpperCase();

                  if (esSabado) return !BLOQUEOS_SABADO.some(b => turnoLimpio.startsWith(b));
                  else return turnoLimpio === 'N';
              });

              if (mejorCandidato) {
                  const nombreFinal = mejorCandidato.key || mejorCandidato.nombre;
                  onAsignar(orden.nroOrden, idx, nombreFinal, true);
                  // Actualizamos localmente para que la siguiente iteración lo sepa
                  tecnicosYaAsignados.push(nombreFinal);
              }
          }
      });
  };

  // 4. Generador de Candidatos por Slot (Helper function para usar en el render)
  const getCandidatosParaSlot = (slotRol: string, slotNombreActual: string) => {
      const candidatos = empleados.filter((emp: any) => {
          return rolesCoinciden(slotRol, emp.rol) && esPlantaCompatible(emp.planta, orden.planta);
      });

      const candidatosProcesados = candidatos.map((cand: any) => {
          const nombre = cand.key || cand.nombre || "NN";
          const turnos = mapaHorarios.get(nombre);
          const turnoDia = turnos ? turnos[diaIndex] : "?";
          const turnoLimpio = String(turnoDia).trim().toUpperCase();

          const esExento = !necesitaValidacionTurno(cand.rol);
          let estaDisponible = esExento ? true : (esSabado ? !BLOQUEOS_SABADO.some(b => turnoLimpio.startsWith(b)) : turnoLimpio === 'N');
          
          const yaEnUso = tecnicosYaAsignados.includes(nombre) && slotNombreActual !== nombre;
          
          return { nombre, estaDisponible, turnoDia, yaEnUso, esExento };
      });

      return candidatosProcesados.sort((a: any, b: any) => {
          if (a.yaEnUso !== b.yaEnUso) return a.yaEnUso ? 1 : -1;
          if (a.estaDisponible !== b.estaDisponible) return b.estaDisponible ? 1 : -1;
          return a.nombre.localeCompare(b.nombre);
      });
  };

  return {
      esSabado,
      sugerirTecnicosFaltantes,
      getCandidatosParaSlot
  };
};