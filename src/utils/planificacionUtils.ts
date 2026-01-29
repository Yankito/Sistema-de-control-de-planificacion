export const PLANTAS_CI = ["PF3", "PF4", "PF5", "PF6", "CDT"];
export const ROLES_NO_VALIDAN_TURNO = ["SUPERVISOR", "SE"]; // SE = Servicio Externo

// Valida si la planta del empleado sirve para la OT
export const esPlantaCompatible = (plantaEmpleado: string, plantaOT: string) => {
  const emp = (plantaEmpleado || "").toUpperCase().trim();
  const ot = (plantaOT || "").toUpperCase().trim();

  if (emp === ot) return true;
  if (emp === "CI" && PLANTAS_CI.includes(ot)) return true; // Lógica CI
  if (ot === "OTROS") return true; // Flexibilidad para planta OTROS
  
  return false;
};

// Valida si el rol coincide
export const rolesCoinciden = (rolRequerido: string, rolEmpleado: string) => {
  const req = String(rolRequerido || "").trim().toUpperCase();
  const emp = String(rolEmpleado || "").trim().toUpperCase();
  
  // Comparación estricta para roles especiales
  return req === emp;
};

// Verifica si necesita turno noche (o chequeo de sábado)
export const necesitaValidacionTurno = (rol: string) => {
  const r = String(rol || "").trim().toUpperCase();
  return !ROLES_NO_VALIDAN_TURNO.includes(r);
};