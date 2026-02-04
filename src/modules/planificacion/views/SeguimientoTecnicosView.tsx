import { useState, useMemo } from "react";
import { PlanResult } from "../types";
import { User, AlertTriangle, CheckCircle2, Search, X, ArrowRightCircle } from "lucide-react";

interface Props {
  planResult: PlanResult[];
  plantas: string[];
  onNavegar: (planta: string, fecha: string) => void;
}

export const SeguimientoTecnicosView = ({ planResult, plantas, onNavegar }: Props) => {
  const [plantaSel, setPlantaSel] = useState("TODAS"); // CAMBIO: Iniciar en TODAS para ver datos al instante
  const [busqueda, setBusqueda] = useState("");
  const [celdaSeleccionada, setCeldaSeleccionada] = useState<{ nombre: string, fecha: string, ots: any[] } | null>(null);

  const { datosTecnicos, diasMes } = useMemo(() => {
    const mapaTecnicos = new Map<string, { rol: string, carga: Record<string, any[]> }>();
    
    // Si no hay planResult, retornamos estructuras vacías
    if (!planResult || planResult.length === 0) return { datosTecnicos: [], diasMes: [] };

    // Intentamos obtener el mes/año de la primera OT válida
    let mes = 1, anio = 2026;
    const primeraConFecha = planResult.find(p => p.fechaSugerida && p.fechaSugerida.includes('/'));
    
    if (primeraConFecha) {
        const parts = primeraConFecha.fechaSugerida.split('/');
        if(parts.length === 3) {
            mes = parseInt(parts[1]);
            anio = parseInt(parts[2]);
        }
    }

    const ultimoDia = new Date(anio, mes, 0).getDate();
    const dias = Array.from({ length: ultimoDia }, (_, i) => {
        const d = (i + 1).toString().padStart(2, '0');
        const m = mes.toString().padStart(2, '0');
        return `${d}/${m}/${anio}`;
    });

    // Llenar mapa
    planResult.forEach(ot => {
        // Normalización de planta para comparación segura
        const plantaOT = (ot.planta || "").toUpperCase().trim();
        const plantaFiltro = plantaSel.toUpperCase().trim();

        if (plantaFiltro !== "TODAS" && plantaOT !== plantaFiltro) return;

        ot.tecnicos.forEach((tec: any) => {
            if (!tec.nombre || tec.nombre === "VACANTE" || tec.nombre === "OT NUEVA" || tec.nombre === "SIN HISTORIAL") return;

            if (!mapaTecnicos.has(tec.nombre)) {
                mapaTecnicos.set(tec.nombre, { rol: tec.rol, carga: {} });
            }

            const registro = mapaTecnicos.get(tec.nombre)!;
            // Aseguramos que la fecha sea válida
            if (ot.fechaSugerida) {
                if (!registro.carga[ot.fechaSugerida]) {
                    registro.carga[ot.fechaSugerida] = [];
                }
                registro.carga[ot.fechaSugerida].push(ot);
            }
        });
    });

    // Convertir a array y ordenar
    const lista = Array.from(mapaTecnicos.entries()).map(([nombre, data]) => ({
        nombre,
        rol: data.rol,
        carga: data.carga
    }));

    return { datosTecnicos: lista.sort((a, b) => a.nombre.localeCompare(b.nombre)), diasMes: dias };
  }, [planResult, plantaSel]);

  // Filtro de búsqueda por nombre
  const tecnicosFiltrados = datosTecnicos.filter(t => 
      !busqueda || t.nombre.toUpperCase().includes(busqueda.toUpperCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in">
      
      {/* HEADER DE CONTROL */}
      <div className="bg-white p-6 rounded-3xl border border-pf-border shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
            <h2 className="text-xl font-black uppercase italic text-slate-900">Carga de Trabajo</h2>
            <p className="text-xs text-slate-400 font-bold">
                {tecnicosFiltrados.length} Técnicos encontrados en {plantaSel}
            </p>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input 
                    type="text" 
                    placeholder="Buscar técnico..." 
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-pf-red transition-all w-48"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
            <select 
                value={plantaSel} 
                onChange={(e) => setPlantaSel(e.target.value)} 
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none cursor-pointer hover:border-pf-red transition-colors"
            >
                <option value="TODAS">TODAS LAS PLANTAS</option>
                {plantas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
        </div>
      </div>

      {/* TABLA HEATMAP */}
      <div className="bg-white border border-pf-border rounded-[2.5rem] shadow-sm flex-1 overflow-hidden flex flex-col relative">
        <div className="overflow-auto custom-scrollbar flex-1">
            {tecnicosFiltrados.length > 0 ? (
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-20">
                        <tr>
                            <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-r border-pf-border min-w-[200px] sticky left-0 bg-slate-50 z-30 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">
                                Técnico
                            </th>
                            {diasMes.map(dia => {
                                const [d, ,] = dia.split('/');
                                return (
                                    <th key={dia} className="p-2 text-center border-b border-r border-pf-border min-w-[40px]">
                                        <span className="text-xs font-black text-slate-600">{d}</span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {tecnicosFiltrados.map((tec) => (
                            <tr key={tec.nombre} className="group hover:bg-slate-50/50 transition-colors">
                                {/* COLUMNA NOMBRE FIJA */}
                                <td className="p-4 border-r border-b border-pf-border sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg shrink-0 ${tec.rol === 'E' ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600'}`}>
                                            <User size={14} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-black text-slate-800 truncate max-w-[140px]" title={tec.nombre}>{tec.nombre}</p>
                                            <p className="text-[9px] font-bold text-slate-400">{tec.rol === 'E' ? 'Eléctrico' : 'Mecánico'}</p>
                                        </div>
                                    </div>
                                </td>

                                {/* CELDAS DE CARGA */}
                                {diasMes.map(dia => {
                                    const trabajos = tec.carga[dia] || [];
                                    const cantidad = trabajos.length;
                                    
                                    let bgClass = "";
                                    if (cantidad < 1) bgClass = "";
                                    else if (cantidad < 4) bgClass = "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200"; 
                                    else if (cantidad < 6) bgClass = "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200";   
                                    else if (cantidad < 8) bgClass = "bg-red-500 text-white hover:bg-red-600 shadow-red-200";
                                    else bgClass = "bg-red-800 text-white hover:bg-red-900 animate-pulse shadow-red-200";         

                                    return (
                                        <td key={dia} className="p-1 border-r border-b border-slate-100 text-center h-12 relative">
                                            {cantidad > 0 && (
                                                <button 
                                                    onClick={() => setCeldaSeleccionada({ nombre: tec.nombre, fecha: dia, ots: trabajos })}
                                                    className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-black shadow-md transition-transform active:scale-90 ${bgClass}`}
                                                >
                                                    {cantidad}
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <p className="text-sm font-bold">No se encontraron técnicos con carga asignada.</p>
                    <p className="text-xs mt-1">Verifique que la planificación tenga nombres asignados (no vacantes).</p>
                </div>
            )}
        </div>
      </div>

      {/* MODAL DETALLE DE CARGA */}
      {celdaSeleccionada && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="text-lg font-black uppercase italic">{celdaSeleccionada.nombre}</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">Carga del día {celdaSeleccionada.fecha}</p>
                    </div>
                    <button onClick={() => setCeldaSeleccionada(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-3 overflow-y-auto bg-slate-50/50">
                    {celdaSeleccionada.ots.map((ot: any, i: number) => (
                        <div key={i} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm flex gap-4 items-start">
                            <div className={`p-3 rounded-xl shadow-sm border border-slate-100 shrink-0 ${ot.tecnicos.length > 1 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                {ot.tecnicos.length > 1 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-black text-pf-red uppercase mb-1 bg-pf-red/5 px-2 py-0.5 rounded w-fit">OT: {ot.nroOrden}</p>
                                    <span className="text-[9px] font-bold text-slate-400">{ot.planta}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-800 leading-tight mb-2">{ot.descripcion}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200">
                                    {ot.equipo}
                                </p>
                            </div>
                            {/* BOTÓN DE NAVEGACIÓN */}
                            <button 
                                onClick={() => onNavegar(ot.planta, ot.fechaSugerida)}
                                className="p-2 text-slate-300 hover:text-pf-red hover:bg-pf-red/5 rounded-full transition-all"
                                title="Ver en Planificación"
                            >
                                <ArrowRightCircle size={24} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};