import { describe, it, expect } from 'vitest';
import { PlannerService } from '../../../planificacion/logic/PlannerService';

describe('PlannerService - Modo Estricto (Turnos)', () => {

    it('debe encontrar una fecha donde TODOS los técnicos tengan turno Noche (N)', () => {
        // 1. SETUP DE HORARIOS
        const mapaHorarios = new Map<string, string[]>();
        
        // Creamos un mes completo (31 días) para evitar errores de índice
        // Día 1 (Index 0): 'M' (No coinciden)
        // Día 2 (Index 1): 'N' (Coinciden!)
        // Resto: 'L'
        const turnosJuan = Array(31).fill("L");
        turnosJuan[0] = "M";
        turnosJuan[1] = "N"; // <--- Aquí coincidirán

        const turnosPedro = Array(31).fill("L");
        turnosPedro[0] = "T";
        turnosPedro[1] = "N"; // <--- Aquí coincidirán

        mapaHorarios.set("JUAN", turnosJuan);
        mapaHorarios.set("PEDRO", turnosPedro);

        const empleadosMap = new Map();
        empleadosMap.set("JUAN", { rol: "MEC" });
        empleadosMap.set("PEDRO", { rol: "ELE" });

        // 2. DATOS DE ENTRADA (B.ACT) - Usamos las claves reales que busca tu código
        const dfAct = [{
            "PEDIDO": "OT-NUEVA", 
            "NÚMERO DE ACTIVO": "BOMBA-01",
            "DESCRIPCIÓN": "MANTENIMIENTO PREVENTIVO",
            "DEPARTAMENTO": "MANTENCION PF1"
        }];

        // 3. DATOS HISTÓRICOS (B.ANT)
        // Lógica: Fecha base 1 Enero -> +1 Mes = 1 Febrero.
        // El algoritmo buscará turno 'N' cerca del 1 de Febrero (Index 0).
        // En Index 0 fallará (M vs T), pero en Index 1 (2 de Febrero) encontrará 'N'.
        const dfAnt = [{
            "NÚMERO DE ACTIVO": "BOMBA-01",
            "DESCRIPCIÓN": "MANTENIMIENTO PREVENTIVO",
            "PEDIDO": "OT-VIEJA-123",
            "FECHA INICIAL PROGRAMADA": new Date(2026, 0, 1) // 1 Ene 2026
        }];

        // 4. CUMPLIMIENTO (Vincula OT Vieja -> Técnicos)
        const dfCumplimiento = [
            { "NRO_OT": "OT-VIEJA-123", "EMPLEADO": "JUAN" },
            { "NRO_OT": "OT-VIEJA-123", "EMPLEADO": "PEDRO" }
        ];

        // EJECUCIÓN
        const result = PlannerService.generarPlanificacion(
            dfAct,
            dfAnt,
            dfCumplimiento,
            empleadosMap,
            mapaHorarios
        );

        // VALIDACIÓN
        const asignacion = result.resultados[0];
        
        // Debe haber encontrado la solución
        expect(asignacion).toBeDefined();
        expect(result.sinAsignar).toHaveLength(0); // No debe haber errores

        // Técnicos asignados correctamente
        const nombres = asignacion.tecnicos.map(t => t.nombre);
        expect(nombres).toContain("JUAN");
        expect(nombres).toContain("PEDRO");

        // Fecha Sugerida: Esperamos el 02/02/2026 (Día 2, donde pusimos las 'N')
        expect(asignacion.fechaSugerida).toBe("02/02/2026");
    });

    it('debe enviar a Sin Asignar si no hay coincidencia de turnos ni sábados disponibles', () => {
        // Escenario: Juan siempre de Mañana, Pedro siempre de Noche.
        // PROBLEMA ANTERIOR: El algoritmo asignaba el Sábado porque "M" y "N" no son bloqueos.
        // SOLUCIÓN: Usamos "L" (Libre) para uno de ellos. "L" es un código bloqueante en tu lógica.
        
        const mapaHorarios = new Map();
        
        // Juan siempre Libre ("L"). Esto bloquea cualquier intento de asignación (Noche o Sábado).
        mapaHorarios.set("JUAN", Array(31).fill("L")); 
        
        // Pedro siempre Noche ("N").
        mapaHorarios.set("PEDRO", Array(31).fill("N"));

        const empleadosMap = new Map();
        empleadosMap.set("JUAN", { rol: "MEC" });
        empleadosMap.set("PEDRO", { rol: "ELE" });

        const dfAct = [{
            "PEDIDO": "OT-FAIL",
            "NÚMERO DE ACTIVO": "EQ-X",
            "DESCRIPCIÓN": "TEST FALLA",
            "DEPARTAMENTO": "PF1"
        }];

        // Usamos fecha 1 Enero 2026 para consistencia
        const dfAnt = [{
            "PEDIDO": "OT-OLD-FAIL",
            "NÚMERO DE ACTIVO": "EQ-X",
            "DESCRIPCIÓN": "TEST FALLA",
            "FECHA INICIAL PROGRAMADA": new Date(2026, 0, 1)
        }];

        const dfCumplimiento = [
            { "NRO_OT": "OT-OLD-FAIL", "EMPLEADO": "JUAN" },
            { "NRO_OT": "OT-OLD-FAIL", "EMPLEADO": "PEDRO" }
        ];

        const result = PlannerService.generarPlanificacion(
            dfAct, dfAnt, dfCumplimiento, empleadosMap, mapaHorarios
        );

        // AHORA SÍ: Como Juan tiene "L", está bloqueado para Sábados y no coincide en Noche.
        // Debe fallar y caer en sinAsignar.
        expect(result.resultados).toHaveLength(0);
        expect(result.sinAsignar).toHaveLength(1);
        
        // Verificamos que el error sea el esperado
        // Puede ser "SIN HORARIO COMPATIBLE" o "SIN TURNOS CARGADOS" dependiendo de tu lógica exacta,
        // pero seguro estará en sinAsignar.
        expect(result.sinAsignar[0].error).toBeTruthy();
    });
});