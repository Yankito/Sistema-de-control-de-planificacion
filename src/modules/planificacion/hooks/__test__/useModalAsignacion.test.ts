// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalAsignacion } from '../useModalAsignacion';

// --- DATA MOCK ---
const mockEmpleados = [
    { nombre: 'JUAN', rol: 'M', planta: 'PF1' },      // Mecánico PF1 (Candidato Ideal)
    { nombre: 'PEDRO', rol: 'M', planta: 'PF1' },     // Mecánico PF1 (Turno Incorrecto)
    { nombre: 'ANA', rol: 'E', planta: 'PF1' },       // Eléctrico (Rol Incorrecto)
    { nombre: 'LUIS', rol: 'M', planta: 'PF2' },      // Mecánico PF2 (Planta Incorrecta)
    { nombre: 'JEFE', rol: 'SUPERVISOR', planta: 'PF1' } // Supervisor (Exento de validación)
];

// Simulamos turnos para el día 2 (Índice 1)
// Fecha: 02/02/2026 (Lunes) -> Requiere Turno 'N'
const mockHorarios = new Map<string, string[]>();
// Llenamos con 'L' (Libre) por defecto
const emptyMonth = Array(31).fill('L');

// JUAN: Tiene Noche en el día 2 (Index 1) -> OK
const turnosJuan = [...emptyMonth]; turnosJuan[1] = 'N'; 
mockHorarios.set('JUAN', turnosJuan);

// PEDRO: Tiene Mañana en el día 2 (Index 1) -> NO DISPONIBLE
const turnosPedro = [...emptyMonth]; turnosPedro[1] = 'M';
mockHorarios.set('PEDRO', turnosPedro);

// JEFE: Tiene Mañana -> OK PORQUE ES EXENTO
const turnosJefe = [...emptyMonth]; turnosJefe[1] = 'M';
mockHorarios.set('JEFE', turnosJefe);


describe('useModalAsignacion Hook', () => {
    
    const mockOnAsignar = vi.fn();
    const ordenBase = {
        nroOrden: 'OT-100',
        planta: 'PF1',
        tecnicos: [
            { nombre: 'VACANTE', rol: 'M' } // Slot 0
        ]
    };

    it('debería detectar correctamente si es sábado', () => {
        const { result } = renderHook(() => useModalAsignacion({
            orden: ordenBase,
            fecha: '07/02/2026', // Sábado
            empleados: [],
            mapaHorarios: new Map(),
            onAsignar: mockOnAsignar
        }));

        expect(result.current.esSabado).toBe(true);
    });

    it('debería filtrar candidatos por Rol y Planta', () => {
        // Buscamos candidatos para el Slot de "Mecánico" en "PF1"
        // Fecha: 02/02/2026 (Lunes, index 1)
        const { result } = renderHook(() => useModalAsignacion({
            orden: ordenBase,
            fecha: '02/02/2026', 
            empleados: mockEmpleados,
            mapaHorarios: mockHorarios,
            onAsignar: mockOnAsignar
        }));

        const candidatos = result.current.getCandidatosParaSlot('M', 'VACANTE');

        // Deberían estar JUAN y PEDRO (Mecánicos PF1). 
        // ANA (Eléctrico) y LUIS (PF2) no deben aparecer.
        const nombres = candidatos.map(c => c.nombre);
        expect(nombres).toContain('JUAN');
        expect(nombres).toContain('PEDRO');
        expect(nombres).not.toContain('ANA');
        expect(nombres).not.toContain('LUIS');
    });

    it('debería validar disponibilidad de turno (Semana = Noche)', () => {
        const { result } = renderHook(() => useModalAsignacion({
            orden: ordenBase,
            fecha: '02/02/2026', // Lunes -> Exige 'N'
            empleados: mockEmpleados,
            mapaHorarios: mockHorarios,
            onAsignar: mockOnAsignar
        }));

        const candidatos = result.current.getCandidatosParaSlot('M', 'VACANTE');
        
        const juan = candidatos.find(c => c.nombre === 'JUAN');
        const pedro = candidatos.find(c => c.nombre === 'PEDRO');

        expect(juan?.estaDisponible).toBe(true); // Tiene 'N'
        expect(pedro?.estaDisponible).toBe(false); // Tiene 'M'
    });

    it('debería permitir roles exentos (Supervisor) aunque no tengan noche', () => {
        // Cambiamos la OT para pedir un SUPERVISOR
        const ordenSup = { ...ordenBase, tecnicos: [{ nombre: 'VACANTE', rol: 'SUPERVISOR' }] };

        const { result } = renderHook(() => useModalAsignacion({
            orden: ordenSup,
            fecha: '02/02/2026',
            empleados: mockEmpleados,
            mapaHorarios: mockHorarios,
            onAsignar: mockOnAsignar
        }));

        const candidatos = result.current.getCandidatosParaSlot('SUPERVISOR', 'VACANTE');
        const jefe = candidatos.find(c => c.nombre === 'JEFE');

        // Jefe tiene turno 'M', pero es Supervisor -> Disponible
        expect(jefe?.estaDisponible).toBe(true);
        expect(jefe?.esExento).toBe(true);
    });

    it('debería marcar como "yaEnUso" si el técnico ya está en otra línea de la misma OT', () => {
        // Simulamos que JUAN ya está asignado en el slot 0
        const ordenOcupada = {
            ...ordenBase,
            tecnicos: [
                { nombre: 'JUAN', rol: 'M' },    // Slot 0 (Ocupado por Juan)
                { nombre: 'VACANTE', rol: 'M' }  // Slot 1 (Buscamos candidato aquí)
            ]
        };

        const { result } = renderHook(() => useModalAsignacion({
            orden: ordenOcupada,
            fecha: '02/02/2026',
            empleados: mockEmpleados,
            mapaHorarios: mockHorarios,
            onAsignar: mockOnAsignar
        }));

        // Pedimos candidatos para el Slot 1 ('VACANTE'), pasando 'VACANTE' como nombre actual
        const candidatos = result.current.getCandidatosParaSlot('M', 'VACANTE');
        const juan = candidatos.find(c => c.nombre === 'JUAN');

        expect(juan?.yaEnUso).toBe(true); // Juan aparece pero marcado como usado
    });

    it('debería sugerir automáticamente al mejor candidato disponible', () => {
        const { result } = renderHook(() => useModalAsignacion({
            orden: ordenBase,
            fecha: '02/02/2026',
            empleados: mockEmpleados,
            mapaHorarios: mockHorarios,
            onAsignar: mockOnAsignar
        }));

        // Ejecutamos la sugerencia
        act(() => {
            result.current.sugerirTecnicosFaltantes();
        });

        // Debería haber elegido a JUAN (Mecánico, PF1, Turno Noche)
        // PEDRO falla por turno, ANA por rol, LUIS por planta.
        expect(mockOnAsignar).toHaveBeenCalledWith(
            'OT-100', // ID Orden
            0,        // Índice Slot
            'JUAN',   // Nombre Sugerido
            true      // Es Automático
        );
    });
});