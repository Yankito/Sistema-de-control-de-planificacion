// src/logic/fallasProcessor.ts
import * as XLSX from "xlsx";
import { FallaRow } from "../types";

// Helper para limpiar dinero: "$510.164" -> 510164
const parseDineroLocal = (valor: any): number => {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;

  const str = String(valor);
  const limpio = str
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const numero = parseFloat(limpio);
  return isNaN(numero) ? 0 : numero;
};

// Helper para fecha: Aseguramos horas en 00:00:00 para evitar errores de cálculo
const parseFechaLocal = (valor: any): Date => {
  let fecha: Date | null = null;

  // Caso 1: Excel Serial
  if (typeof valor === 'number') {
    fecha = new Date(Math.round((valor - 25569) * 86400 * 1000));
  }
  // Caso 2: String DD/MM/YYYY
  else if (typeof valor === 'string' && valor.includes('/')) {
    const partes = valor.split('/');
    if (partes.length === 3) {
      const dia = parseInt(partes[0], 10);
      const mes = parseInt(partes[1], 10) - 1;
      const anio = parseInt(partes[2], 10);
      fecha = new Date(anio, mes, dia);
    }
  }
  // Caso 3: Fallback
  else {
    fecha = new Date(valor);
  }

  // Normalizar a media noche para comparaciones limpias
  if (fecha && !isNaN(fecha.getTime())) {
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  }
  
  return new Date(); // Fallback de emergencia
};

// --- LÓGICA CORREGIDA DE SEMANAS ---
const calcularSemana = (fecha: Date): number => {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth(); // 0 = Enero
  const dia = fecha.getDate();

  // REGLA: Del 1 al 4 de Enero es SIEMPRE Semana 1
  if (mes === 0 && dia < 5) {
    return 1;
  }

  // REGLA: Desde el 5 de Enero en adelante, empieza la Semana 2
  const inicioS2 = new Date(anio, 0, 5); // 5 de Enero

  // Calculamos la diferencia en milisegundos
  const diffTime = fecha.getTime() - inicioS2.getTime();
  
  // Si por alguna razón la fecha es menor (ej. año anterior), fallback
  if (diffTime < 0) return 52; 

  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Cálculo: (Días pasados desde el 5 Ene / 7) + 2
  // +2 porque empezamos contando desde la semana 2
  return Math.floor(diffDays / 7) + 2;
};

export const processFallasData = (sheets: XLSX.WorkBook['Sheets']): FallaRow[] => {
  const sheetName = "Detalle MTBF MTTR";
  const sheet = sheets[sheetName];

  if (!sheet) {
    console.error(`La hoja "${sheetName}" no se encuentra en el archivo.`);
    return [];
  }

  const rawData: any[] = XLSX.utils.sheet_to_json(sheet);

  return rawData.map((row) => {
    const fechaObj = parseFechaLocal(row["Fecha"]);
    // Forzamos el recálculo si parseFechaLocal devolvió algo raro, 
    // pero idealmente confiamos en fechaObj
    const semana = calcularSemana(fechaObj);

    const duracion = parseDineroLocal(row["Duración Paro Oracle [min]"]);
    const gasto = parseDineroLocal(row["Gasto OM [$]"]);
    const perdida = parseDineroLocal(row["Pérdida por Paro [kg]"]);

    return {
      fecha: fechaObj,
      anio: fechaObj.getFullYear(),
      mes: fechaObj.getMonth(),
      semana: semana,
      planta: String(row["Planta"] || "S/D").toUpperCase(),
      area: String(row["Descripcion Area"] || ""),
      linea: String(row["Nombre Línea Prod"] || ""),
      equipo: String(row["Equipo Nombre"] || "Equipo Desconocido"),
      causa: String(row["Descripcion Causa"] || ""),
      estadoPedido: row["Estado Pedido"],
      tipoPedido: row["Tipo Pedido Trabajo"],
      tecnico: row["Técnico"],
      duracionMinutos: duracion,
      gasto: gasto,
      perdidaKg: perdida,
      descripcionOperador: String(row["Descripción Operador"] || ""),
    };
  });
};