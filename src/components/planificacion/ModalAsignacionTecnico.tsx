import { X, UserCheck, UserX, Moon, AlertCircle, UserMinus, Plus, Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orden: any; 
  fecha: string;
  empleados: any[]; 
  mapaHorarios: Map<string, string[]>;
  onAsignar: (ordenId: string, indiceTecnico: number, nuevoNombre: string) => void;
  // NUEVA PROP: Para agregar/eliminar slots enteros
  onModificarCupos: (ordenId: string, accion: 'ADD' | 'REMOVE', rol?: string, indice?: number) => void;
}

const rolesCoinciden = (rolA: string, rolB: string) => {
    const r1 = String(rolA || "").trim().toUpperCase().charAt(0);
    const r2 = String(rolB || "").trim().toUpperCase().charAt(0);
    return r1 === r2;
};

const BLOQUEOS_SABADO = ['L', 'V', 'LIC', 'LM', 'LP'];

export const ModalAsignacionTecnico = ({ 
  isOpen, onClose, orden, fecha, empleados, mapaHorarios, onAsignar, onModificarCupos 
}: Props) => {
    
  if (!isOpen || !orden) return null;

  const [d, m, y] = fecha.split('/').map(Number);
  const diaIndex = d - 1; 
  
  const fechaObj = new Date(y, m - 1, d);
  const esSabado = fechaObj.getDay() === 6;

  // Obtenemos la lista de técnicos YA asignados en esta OT para evitar duplicados
  const tecnicosYaAsignados = orden.tecnicos
    .map((t: any) => t.nombre)
    .filter((n: string) => n !== 'VACANTE');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-wider">Asignar Técnicos</h3>
              <p className="text-slate-400 text-xs font-bold mt-1">{orden.equipo} - {orden.descripcion}</p>
              <div className="mt-2 inline-flex items-center gap-2 bg-pf-red/20 text-pf-red px-3 py-1 rounded-full text-xs font-bold">
                 <Moon size={12} /> 
                 {esSabado 
                   ? `Sábado ${fecha}: Disponible salvo L/V/LIC` 
                   : `Semana ${fecha}: Requiere Turno Noche`}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X/></button>
          </div>

          {/* CONTROLES PARA AGREGAR CUPOS */}
          <div className="flex gap-2 pt-2 border-t border-slate-800">
             <button 
               onClick={() => onModificarCupos(orden.nroOrden, 'ADD', 'M')}
               className="flex items-center gap-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
             >
                <Plus size={12} /> Agregar Mecánico
             </button>
             <button 
               onClick={() => onModificarCupos(orden.nroOrden, 'ADD', 'E')}
               className="flex items-center gap-1 text-[10px] font-bold bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg transition-colors"
             >
                <Plus size={12} /> Agregar Eléctrico
             </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
          {orden.tecnicos.map((slot: any, idx: number) => {
            const rolRequerido = slot.rol;
            const etiquetaRol = String(rolRequerido).startsWith('E') ? 'Eléctrico' : 'Mecánico';
            
            // 1. Filtramos candidatos
            const candidatos = empleados.filter((emp: any) => {
                const mismoRol = rolesCoinciden(emp.rol, rolRequerido);
                const mismaPlanta = emp.planta === orden.planta || orden.planta === 'OTROS';
                return mismoRol && mismaPlanta;
            });

            // 2. Mapeamos disponibilidad
            const candidatosConTurno = candidatos.map(cand => {
                const nombre = cand.key || cand.nombre || "NN";
                const turnos = mapaHorarios.get(nombre);
                const turnoDia = turnos ? turnos[diaIndex] : "?";
                const turnoLimpio = String(turnoDia).trim().toUpperCase();

                let estaDisponible = false;
                if (esSabado) {
                    const estaBloqueado = BLOQUEOS_SABADO.some(b => turnoLimpio.startsWith(b));
                    estaDisponible = !estaBloqueado;
                } else {
                    estaDisponible = turnoLimpio === 'N';
                }
                
                // VALIDACIÓN: ¿Ya está asignado en OTRO slot de esta misma orden?
                // (Ignoramos si es el slot actual, aunque el nombre coincida)
                const yaEnUso = tecnicosYaAsignados.includes(nombre) && slot.nombre !== nombre;

                return { nombre, estaDisponible, turnoDia, yaEnUso };
            });

            // 3. Ordenamos
            candidatosConTurno.sort((a, b) => {
                // Prioridad 1: No estar en uso
                if (a.yaEnUso !== b.yaEnUso) return a.yaEnUso ? 1 : -1;
                // Prioridad 2: Estar disponible (turno)
                if (a.estaDisponible !== b.estaDisponible) return b.estaDisponible ? 1 : -1;
                // Prioridad 3: Alfabético
                return a.nombre.localeCompare(b.nombre);
            });

            return (
              <div key={idx} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm relative group/card">
                
                {/* Cabecera del Slot */}
                <div className="flex justify-between mb-3 items-center border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Puesto {idx + 1}: <span className={etiquetaRol === 'Eléctrico' ? 'text-yellow-600' : 'text-blue-600'}>{etiquetaRol}</span>
                      </span>
                      {/* Botón para ELIMINAR este cupo completo */}
                      <button 
                        onClick={() => onModificarCupos(orden.nroOrden, 'REMOVE', undefined, idx)}
                        className="opacity-0 group-hover/card:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                        title="Eliminar este cupo"
                      >
                        <Trash2 size={12}/>
                      </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${slot.nombre === 'VACANTE' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-700'}`}>
                        Actual: {slot.nombre}
                      </span>
                      {/* Botón para vaciar slot (sin eliminarlo) */}
                      {slot.nombre !== 'VACANTE' && (
                          <button 
                            onClick={() => onAsignar(orden.nroOrden, idx, "VACANTE")}
                            className="p-1 bg-red-50 text-red-500 rounded hover:bg-red-100 hover:text-red-700 transition-colors"
                            title="Quitar técnico (Dejar vacante)"
                          >
                            <UserMinus size={14}/>
                          </button>
                      )}
                  </div>
                </div>

                {candidatosConTurno.length === 0 ? (
                    <div className="flex items-center gap-2 text-slate-400 text-xs p-2 bg-slate-50 rounded-lg">
                        <AlertCircle size={14}/> No se encontraron técnicos con rol {etiquetaRol} en {orden.planta}.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {candidatosConTurno.map((cand) => {
                        const esSeleccionado = cand.nombre === slot.nombre;
                        // Deshabilitar si no tiene turno O si ya está asignado en otro puesto
                        const isDisabled = !cand.estaDisponible || cand.yaEnUso;

                        return (
                            <button
                            key={cand.nombre}
                            disabled={isDisabled && !esSeleccionado} // Permitir click si es el seleccionado (para re-validar visualmente)
                            onClick={() => !isDisabled && onAsignar(orden.nroOrden, idx, cand.nombre)}
                            className={`
                                flex items-center gap-2 p-2 rounded-xl text-left transition-all border group relative
                                ${esSeleccionado 
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-pf-red/50' 
                                    : 'bg-white border-slate-200'}
                                ${!isDisabled && !esSeleccionado ? 'hover:border-pf-red hover:shadow-md cursor-pointer' : ''}
                                ${isDisabled && !esSeleccionado ? 'opacity-40 grayscale cursor-not-allowed bg-slate-50' : ''}
                            `}
                            >
                            <div className={`
                                w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black
                                ${cand.estaDisponible ? 'bg-pf-red text-white' : 'bg-slate-100 text-slate-400'}
                                ${cand.yaEnUso ? '!bg-amber-500 !text-white' : ''} 
                            `}>
                                {cand.yaEnUso ? 'X' : (cand.estaDisponible ? (esSabado ? 'S' : 'N') : cand.turnoDia)}
                            </div>
                            
                            <div className="flex flex-col overflow-hidden min-w-0">
                                <span className="text-[10px] font-bold truncate leading-tight">{cand.nombre}</span>
                                {cand.yaEnUso ? (
                                    <span className="text-[8px] text-amber-600 font-bold">Ya asignado</span>
                                ) : !cand.estaDisponible && (
                                    <span className="text-[8px] text-red-400 font-medium">
                                        {esSabado ? "Bloqueado" : "Sin turno N"}
                                    </span>
                                )}
                            </div>
                            </button>
                        )
                    })}
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};