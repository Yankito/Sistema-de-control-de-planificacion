// test/mocks.ts
import { AtrasoRow } from "../modules/seguimiento/types";

export const MOCK_DATA: AtrasoRow[] = [
    {
        planta: "PF1",
        ot: "OT-100",
        descripcion: "Falla bomba",
        estado: "EN PROCESO",
        clasificacion: "TECNICO / SERVICIO",
        periodo: "2025",
        semana: "2025-S01",
        esOB: false,
        detallesTecnicos: [{ tecnico: "JUAN PEREZ", finalizada: false }]
    },
    {
        planta: "PF2",
        ot: "OT-200",
        descripcion: "Reparación techo",
        estado: "PENDIENTE",
        clasificacion: "OC / OTRO",
        periodo: "2025",
        semana: "2025-S01",
        esOB: true, // Infraestructura
        detallesTecnicos: []
    },
    {
        planta: "PF1",
        ot: "OT-300",
        descripcion: "Ajuste sensor",
        estado: "EN PROCESO",
        clasificacion: "PROGRAMADOR",
        periodo: "2025",
        semana: "2025-S01",
        esOB: false,
        detallesTecnicos: [{ tecnico: "ANA GOMEZ", finalizada: true }]
    }
];