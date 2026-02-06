import { useMemo } from "react";
import { AtrasoRow } from "../../modules/seguimiento/types";
import { PlanResult } from "../../modules/planificacion/types";
import { FallaRow } from "../../modules/fallas/types";
import { FileType } from "../components/FileUploader";
import { PlayCircle, Scale, CalendarCheck, Clock, AlertTriangle, ArrowRight, BarChart2, Factory } from "lucide-react";
import { EmptyCard } from "../components/ui/EmptyCard";

interface DashboardProps {
    planResult: PlanResult[];
    seguimientoResult: AtrasoRow[];
    seguimientoPrevio: AtrasoRow[];
    fallasResult: FallaRow[];
    onEjecutarPlan: (modo: 'STRICT' | 'BALANCED') => void;
    setActiveTab: (tab: string) => void;
    archivoCargado: boolean;
    onRequestUpload: (tipo: FileType) => void;
    reporteActual: string;   // <-- AGREGADO
    semanaComparar: string;  // <-- AGREGADO
}

export const DashboardView = ({ 
    planResult, seguimientoResult, seguimientoPrevio, fallasResult, 
    onEjecutarPlan, setActiveTab, archivoCargado, onRequestUpload,
    reporteActual, semanaComparar
}: DashboardProps) => {

    // --- 1. METRICAS PLANIFICACION ---
    const tienePlan = planResult.length > 0;
    const statsPlan = useMemo(() => {
        if (!tienePlan) return null;
        const total = planResult.length;
        const unicos = new Set(planResult.flatMap(r => r.tecnicos.map(t => t.nombre))).size;
        const estables = planResult.filter(p => {
            if (!p.fechaAnterior || p.fechaAnterior === "N/A") return false;
            return p.fechaAnterior.split('/')[0] === p.fechaSugerida.split('/')[0];
        }).length;
        return { total, unicos, estabilidad: Math.round((estables / total) * 100) || 0 };
    }, [planResult, tienePlan]);

    // --- 2. METRICAS SEGUIMIENTO (FILTRADO POR SEMANA DE REPORTE) ---
    const tieneSeguimiento = seguimientoResult.length > 0;
    const statsSeguimiento = useMemo(() => {
        if (!seguimientoResult.length || !reporteActual) return null;

        // Solo OTs que corresponden a la semana que estamos mirando (ej: S05)
        const datosSemanaReporte = seguimientoResult.filter(s => s.semana === reporteActual);
        
        const totalSemana = datosSemanaReporte.length;
        const cumplidasSemana = datosSemanaReporte.filter(s => s.clasificacion === 'CUMPLIDA').length;
        const pendientesSemana = datosSemanaReporte.filter(s => s.clasificacion !== 'CUMPLIDA').length;
        const porcentajeSemana = totalSemana > 0 ? Math.round((cumplidasSemana / totalSemana) * 100) : 0;

        // RANKING ACTIVOS
        const mapActivos: Record<string, number> = {};
        datosSemanaReporte.filter(s => s.clasificacion !== 'CUMPLIDA').forEach(s => {
            const key = s.nroActivo || "SIN ACTIVO";
            mapActivos[key] = (mapActivos[key] || 0) + 1;
        });
        const topActivos = Object.entries(mapActivos).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // RANKING TECNICOS
        const mapTecnicos: Record<string, { total: number, ok: number }> = {};
        datosSemanaReporte.forEach(ot => {
            ot.detallesTecnicos?.forEach(tec => {
                if (!mapTecnicos[tec.tecnico]) mapTecnicos[tec.tecnico] = { total: 0, ok: 0 };
                mapTecnicos[tec.tecnico].total++;
                if (tec.finalizada) mapTecnicos[tec.tecnico].ok++;
            });
        });
        

        const rankingTecnicos = Object.entries(mapTecnicos)
            .map(([nombre, stat]) => ({
                nombre: nombre.split(',')[0], 
                porcentaje: Math.round((stat.ok / stat.total) * 100),
                completadas: stat.ok,
                total: stat.total
            }))
            // Ordenar de menor a mayor cumplimiento para ver las desviaciones
            .sort((a, b) => a.porcentaje - b.porcentaje) 
            .slice(0, 5);

        return { 
            totalSemana, cumplidasSemana, pendientesSemana, 
            porcentajeSemana, topActivos, rankingTecnicos,
            semanaEtiqueta: reporteActual.split('-')[1] || reporteActual
        };
    }, [seguimientoResult, reporteActual]);

    // --- 3. METRICAS FALLAS ---
    const tieneFallas = fallasResult.length > 0;
    const statsFallas = useMemo(() => {
        if (!tieneFallas) return null;
        const totalEventos = fallasResult.length;
        const totalTiempo = fallasResult.reduce((acc, curr) => acc + curr.duracionMinutos, 0);
        return { 
            totalEventos, 
            mttr: totalEventos > 0 ? Math.round(totalTiempo / totalEventos) : 0 
        };
    }, [fallasResult, tieneFallas]);

    const StatusPill = ({ label, active, color }: any) => (
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border ${active ? `bg-${color}-100 text-${color}-700 border-${color}-200` : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
           <div className={`w-2 h-2 rounded-full ${active ? `bg-${color}-500 animate-pulse` : 'bg-slate-300'}`}></div>
           {label}
       </div>
    );

    const ActionButton = ({ label, sublabel, icon: Icon, onClick, primary }: any) => (
        <button onClick={onClick} className={`py-3 rounded-xl flex flex-col items-center justify-center transition-all transform active:scale-95 cursor-pointer ${primary ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <Icon size={18} className={`mb-1 ${primary ? 'text-pf-red' : ''}`} />
            <span className="text-[9px] font-bold uppercase">{label}</span>
            {sublabel && <span className="text-[8px] opacity-60 font-medium">{sublabel}</span>}
        </button>
    );

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Control Industrial <span className="text-pf-red">PF</span></h2>
                    <p className="text-slate-400 font-medium text-sm">Centro de Operaciones de Mantenimiento</p>
                </div>
                <div className="flex gap-2">
                    <StatusPill label="Planificación" active={archivoCargado} color="green" />
                    <StatusPill label="KPI Seguimiento" active={tieneSeguimiento} color="blue" />
                    <StatusPill label="Fallas" active={tieneFallas} color="amber" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. PLANIFICACION */}
                {archivoCargado ? (
                    <div className="bg-white rounded-[2rem] border border-pf-border shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-pf-red/10 rounded-2xl text-pf-red"><CalendarCheck size={24} /></div>
                                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${tienePlan ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{tienePlan ? 'Procesado' : 'Esperando'}</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-1 uppercase tracking-tighter">Planificación</h3>
                            {tienePlan ? (
                                <div className="space-y-3 mb-8">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{statsPlan?.total} Órdenes Asignadas</p>
                                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold uppercase text-[10px]">Estabilidad</span><span className="font-black text-slate-800">{statsPlan?.estabilidad}%</span></div>
                                </div>
                            ) : (
                                <div className="mb-8 py-4"><p className="text-sm text-slate-600 font-medium">Archivo cargado.</p><p className="text-xs text-slate-400 mt-1">Selecciona algoritmo.</p></div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <ActionButton label="Prioridad Noche" sublabel="Estricto" icon={PlayCircle} onClick={() => onEjecutarPlan('STRICT')} primary />
                            <ActionButton label="Balanceado" sublabel="Equilibrado" icon={Scale} onClick={() => onEjecutarPlan('BALANCED')} />
                        </div>
                    </div>
                ) : (
                    <EmptyCard title="Planificación" colorBase="text-pf-red" colorHover="hover:bg-pf-red/5" colorBorder="hover:border-pf-red" icon={CalendarCheck} desc="Gestionar turnos y asignar OTs." onClick={() => onRequestUpload('PLAN')} />
                )}

                {/* 2. SEGUIMIENTO (LG-COL-SPAN-2) */}
                {tieneSeguimiento && statsSeguimiento ? (
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col gap-6 group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tighter">Semana {statsSeguimiento.semanaEtiqueta}</span>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Rendimiento Carga Actual</h3>
                                </div>
                                <p className="text-xs text-slate-400 font-bold uppercase">Resumen OTs programadas para este periodo</p>
                            </div>
                            <button onClick={() => setActiveTab('seguimiento')} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><ArrowRight size={20} /></button>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-2 bg-slate-900 rounded-3xl p-6 text-white flex items-center justify-between overflow-hidden relative">
                                <div className="z-10">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumplimiento Real</span>
                                    <span className="block text-4xl font-black tracking-tighter text-blue-400">{statsSeguimiento.porcentajeSemana}%</span>
                                </div>
                                <BarChart2 size={80} className="absolute -right-4 -bottom-4 text-white/5" />
                            </div>
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col justify-center text-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase">OK</span>
                                <span className="text-2xl font-black text-green-600">{statsSeguimiento.cumplidasSemana}</span>
                            </div>
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col justify-center text-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase">PEND.</span>
                                <span className="text-2xl font-black text-red-500">{statsSeguimiento.pendientesSemana}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-2">
                            {/* COLUMNA ACTIVOS */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-2 border-b border-slate-100 pb-2"><Factory size={14} className="text-red-500" /> Activos con más Pendientes</h4>
                                <div className="space-y-2">
                                    {statsSeguimiento.topActivos.map(([id, cant]) => (
                                        <div key={id} className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                                            <span className="text-[11px] font-bold text-slate-600 truncate max-w-[150px]">{id}</span>
                                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">{cant} OTs</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* COLUMNA TECNICOS */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Clock size={14} className="text-amber-500" /> Desviaciones por Técnico
                                </h4>
                                <div className="space-y-4">
                                    {statsSeguimiento.rankingTecnicos.map(tec => (
                                        <div key={tec.nombre} className="space-y-1.5">
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-700 uppercase leading-none">
                                                        {tec.nombre}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {tec.completadas} de {tec.total} finalizadas
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-black ${tec.porcentaje < 50 ? 'text-red-600' : 'text-amber-600'}`}>
                                                    {tec.porcentaje}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${
                                                        tec.porcentaje < 50 ? 'bg-red-500' : 'bg-amber-500'
                                                    }`} 
                                                    style={{ width: `${tec.porcentaje}%` }} 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="lg:col-span-2">
                        <EmptyCard title="Control KPI" colorBase="text-blue-600" colorHover="hover:bg-blue-600/5" colorBorder="hover:border-blue-600" icon={BarChart2} desc="Analizar cumplimiento y desviaciones." onClick={() => onRequestUpload('SEGUIMIENTO')} />
                    </div>
                )}

                {/* 3. FALLAS */}
                {tieneFallas ? (
                    <div className="bg-white rounded-[2rem] border border-pf-border shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-amber-50 rounded-2xl text-amber-500"><AlertTriangle size={24} /></div>
                                <button onClick={() => setActiveTab('fallas')}><ArrowRight size={20} className="text-slate-300 hover:text-amber-500"/></button>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-1 uppercase tracking-tighter">Fallas y MTBF</h3>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 p-3 rounded-xl"><span className="block text-[10px] font-bold text-slate-400 uppercase">MTTR</span><span className="font-black text-xl text-amber-500">{statsFallas?.mttr}m</span></div>
                                <div className="bg-slate-50 p-3 rounded-xl"><span className="block text-[10px] font-bold text-slate-400 uppercase">Eventos</span><span className="font-black text-xl text-slate-700">{statsFallas?.totalEventos}</span></div>
                            </div>
                        </div>
                        <button onClick={() => setActiveTab('fallas')} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all">Ver detalle de avisos</button>
                    </div>
                ) : (
                    <EmptyCard title="Fallas y MTBF" colorBase="text-amber-500" colorHover="hover:bg-amber-500/5" colorBorder="hover:border-amber-500" icon={AlertTriangle} desc="Activos críticos y tiempos de reparación." onClick={() => onRequestUpload('FALLAS')} />
                )}
            </div>
        </div>
    );
};