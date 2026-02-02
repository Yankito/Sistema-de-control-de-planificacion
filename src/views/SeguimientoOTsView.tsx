import { useState, useMemo } from "react";
import { AtrasoRow } from "../logic/seguimientoOTsProcessor";
import { X, Search, FileText, Factory, Download, Filter, PieChart, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { OTCard } from "./atrasos/OTCard";
import { EmployeeProfile } from "./atrasos/EmployeeProfile";
import { ResumenTable } from "../components/seguimiento/ResumenTable";
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import * as XLSX from "xlsx";

export const SeguimientoOTsView = ({ data, dataAnterior = [] }: { data: AtrasoRow[], dataAnterior?: AtrasoRow[] }) => {
  const [modoVista, setModoVista] = useState<"ATRASOS" | "CUMPLIDAS">("ATRASOS");
  const [selectedSemana, setSelectedSemana] = useState("TODAS");
  const [viewDetail, setViewDetail] = useState<{ id: string, esOB: boolean, cat?: string, isGlobal?: boolean } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [empFilters, setEmpFilters] = useState({ planta: "TODAS", periodo: "TODOS" });
  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 10;

  // CONSTANTES DE AGRUPACIÓN
  const PLANTAS_COMPLEJO = ["PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"];
  const PLANTAS_PF_ALIMENTOS = ["PF1", "PF2", ...PLANTAS_COMPLEJO];
  const LISTA_CUMPLIMIENTO = ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "MPS", "OTROS"];
  const LISTA_PLANTAS_INDIVIDUALES = ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS", "MPS"];

  // Obtener semanas únicas
  const semanasDisponibles = useMemo(() => {
    const semanas = Array.from(new Set(data.map(d => d.semana))).filter(s => s !== "S/D").sort();
    return ["TODAS", ...semanas];
  }, [data]);

  // --- FILTRADO DE DATOS BASE ---
  const dataSemanaActual = useMemo(() => {
    return data.filter(d => selectedSemana === "TODAS" ? true : d.semana === selectedSemana);
  }, [data, selectedSemana]);

  const dataModo = useMemo(() => {
    return dataSemanaActual.filter(d => {
        return modoVista === "CUMPLIDAS" ? d.clasificacion === "CUMPLIDA" : d.clasificacion !== "CUMPLIDA";
    });
  }, [dataSemanaActual, modoVista]);

  const dataAnteriorModo = useMemo(() => {
    return dataAnterior.filter(d => {
        const esFinalizada = d.clasificacion === "CUMPLIDA";
        const matchModo = modoVista === "CUMPLIDAS" ? esFinalizada : !esFinalizada;
        const matchSemana = selectedSemana === "TODAS" ? true : d.semana === selectedSemana;
        return matchModo && matchSemana;
    });
  }, [dataAnterior, modoVista, selectedSemana]);

  // --- LÓGICA DE DETALLE Y PAGINACIÓN ---
  const filteredGeneral = useMemo(() => {
    if (!viewDetail) return [];
    
    let f = dataModo.filter(d => {
      const matchTipo = d.esOB === viewDetail.esOB;
      const matchCat = viewDetail.cat ? d.clasificacion === viewDetail.cat : true;
      let matchPlanta = true;

      if (viewDetail.isGlobal) {
          if (viewDetail.id === "COMPLEJO") matchPlanta = PLANTAS_COMPLEJO.includes(d.planta);
          else if (viewDetail.id === "PF ALIMENTOS") matchPlanta = PLANTAS_PF_ALIMENTOS.includes(d.planta);
      } else {
          matchPlanta = d.planta === viewDetail.id;
      }
      return matchTipo && matchCat && matchPlanta;
    });
    if (searchTerm) f = f.filter(d => d.ot.toLowerCase().includes(searchTerm.toLowerCase()) || d.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    return f;
  }, [viewDetail, dataModo, searchTerm]);

  const datosPaginados = useMemo(() => filteredGeneral.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina), [filteredGeneral, pagina]);
  const totalPaginas = Math.ceil(filteredGeneral.length / itemsPorPagina);

  const employeeData = useMemo(() => {
    if (!selectedEmployee) return { orders: [], stats: { total: 0, cumplidas: 0, pendientes: 0 } };
    let orders = dataModo.filter(d => d.detallesTecnicos?.some(t => t.tecnico === selectedEmployee));
    if (empFilters.planta !== "TODAS") orders = orders.filter(d => d.planta === empFilters.planta);
    if (empFilters.periodo !== "TODOS") orders = orders.filter(d => d.periodo === empFilters.periodo);
    return { orders, stats: { total: orders.length, cumplidas: orders.filter(o => o.detallesTecnicos?.find(t => t.tecnico === selectedEmployee)?.finalizada).length, pendientes: orders.filter(o => o.detallesTecnicos?.find(t => t.tecnico === selectedEmployee)?.finalizada === false).length } };
  }, [selectedEmployee, dataModo, empFilters]);

  const handleExportarExcel = async () => {
    if (dataModo.length === 0) return;
    try {
      const dataParaArchivo = dataModo.map(item => ({
        planta: item.planta, ot: item.ot, descripcion: item.descripcion, estado: item.estado,
        clasificacion: item.clasificacion, periodo: item.periodo, semana: item.semana,
        esOB: item.esOB ? "SI" : "NO",
        rmd: item.rmd, rse: item.rse, detallesTecnicos: JSON.stringify(item.detallesTecnicos || []),
        fecha_proceso: new Date().toLocaleString()
      }));
      const ws = XLSX.utils.json_to_sheet(dataParaArchivo);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "RESUMEN_DATA");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const prefijo = modoVista === "ATRASOS" ? "ATRASOS" : "CUMPLIDAS";
      const filePath = await save({ filters: [{ name: 'Excel', extensions: ['xlsx'] }], defaultPath: `Seguimiento_OTs_${prefijo}_${selectedSemana.split(' ')[0]}_${new Date().toISOString().split('T')[0]}.xlsx` });
      if (filePath) await writeFile(filePath, new Uint8Array(excelBuffer));
    } catch (e) { console.error(e); }
  };

  const handleExportarExcelCompleto = async () => {
     const datasetExportar = dataModo; 
     if (datasetExportar.length === 0) return;

    try {
      const wb = XLSX.utils.book_new();
      const dataRaw = datasetExportar.map(item => ({
        Planta: item.planta, OT: item.ot, Descripcion: item.descripcion, Estado: item.estado,
        Clasificacion: item.clasificacion, Periodo: item.periodo, Semana: item.semana,
        Es_OB: item.esOB ? "SI" : "NO", Fecha_Proceso: new Date().toLocaleString()
      }));
      const wsData = XLSX.utils.json_to_sheet(dataRaw);
      XLSX.utils.book_append_sheet(wb, wsData, "RESUMEN_DATA");
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const filePath = await save({ filters: [{ name: 'Excel', extensions: ['xlsx'] }], defaultPath: `Reporte_${modoVista}_${selectedSemana.split(' ')[0]}_${new Date().toISOString().split('T')[0]}.xlsx` });
      if (filePath) await writeFile(filePath, new Uint8Array(excelBuffer));
    } catch (e) { console.error(e); }
  };

  // --- COMPONENTE: TARJETA DE CUMPLIMIENTO (KPI) ---
  const ComplianceCard = ({ planta, esOB }: { planta: string, esOB: boolean }) => {
    // 1. Universo Raw: Todas las OTs (incluye Mob) para esta planta/tipo/semana
    const universoRaw = dataSemanaActual.filter(d => d.planta === planta && d.esOB === esOB);
    
    // 2. Universo KPI: EXCLUIMOS LAS QUE EMPIEZAN CON "MOB:" PARA EL CÁLCULO
    const universoKPI = universoRaw.filter(d => !d.descripcion.toUpperCase().startsWith("MOB:"));

    // 3. Totales usados para el porcentaje
    const total = universoKPI.length;
    const cumplidas = universoKPI.filter(d => d.clasificacion === "CUMPLIDA").length;
    const pendientes = total - cumplidas;

    const porcentaje = total > 0 ? Math.round((cumplidas / total) * 100) : 0;
    
    // Color según KPI
    let colorBar = "bg-red-500";
    let colorText = "text-red-600";
    let bgCard = "bg-white border-red-100";
    
    if (porcentaje >= 80) {
        colorBar = "bg-green-500";
        colorText = "text-green-600";
        bgCard = "bg-white border-green-100";
    } else if (porcentaje >= 50) {
        colorBar = "bg-yellow-400";
        colorText = "text-yellow-600";
        bgCard = "bg-white border-yellow-100";
    }

    if (total === 0) return null;

    return (
        <div 
            onClick={() => { setViewDetail({ id: planta, esOB }); setPagina(1); }}
            className={`p-5 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer group ${bgCard}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${porcentaje >= 80 ? 'bg-green-100' : 'bg-slate-100'} group-hover:scale-110 transition-transform`}>
                        <Factory size={20} className="text-slate-600" />
                    </div>
                    <div>
                        <h4 className="font-black text-lg text-slate-800">{planta}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{esOB ? 'INFRAESTRUCTURA' : 'MANTENCION'}</span>
                    </div>
                </div>
                <div className={`flex flex-col items-end ${colorText}`}>
                    <span className="text-3xl font-black">{porcentaje}%</span>
                </div>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div 
                    className={`h-full ${colorBar} transition-all duration-1000 ease-out`} 
                    style={{ width: `${porcentaje}%` }}
                />
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-green-600"/>
                    <span>{cumplidas} OK</span>
                </div>
                <div className="flex items-center gap-1">
                    <AlertCircle size={12} className="text-pf-red"/>
                    <span>{pendientes} Pend.</span>
                </div>
                <div className="text-slate-300">|</div>
                <span>Total: {total}</span>
            </div>
        </div>
    );
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex justify-between mb-8 border-b pb-4 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 pt-2">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Seguimiento OTs</h2>
          
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button 
                onClick={() => { setModoVista("ATRASOS"); setViewDetail(null); setPagina(1); }} 
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${modoVista === 'ATRASOS' ? 'bg-pf-red text-white shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}
            >
                ATRASOS
            </button>
            <button 
                onClick={() => { setModoVista("CUMPLIDAS"); setViewDetail(null); setPagina(1); }} 
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${modoVista === 'CUMPLIDAS' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}
            >
                CUMPLIDAS
            </button>
          </div>
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-sm animate-in fade-in slide-in-from-left-4">
            <Filter size={14} className="text-slate-400"/>
            <span className="text-xs font-bold text-slate-500">Semana:</span>
            <select 
                value={selectedSemana} 
                onChange={(e) => { setSelectedSemana(e.target.value); setViewDetail(null); }}
                className="text-xs font-bold bg-transparent outline-none text-slate-700 cursor-pointer min-w-[160px]"
            >
                {semanasDisponibles.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleExportarExcel} className="flex items-center gap-2 bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors">
            <Download size={18} /> Solo Datos
          </button>
          {modoVista === "ATRASOS" && (
              <button onClick={handleExportarExcelCompleto} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-900 transition-colors">
                <FileText size={18} /> Exportar Reporte
              </button>
          )}
        </div>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      
      {modoVista === "ATRASOS" ? (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 animate-in fade-in duration-500">
                {[{t:"OM", es:false}, {t:"OB", es:true}].map(tipo => (
                <div key={tipo.t}>
                    <h3 className="text-sm font-black mb-4 uppercase text-pf-red">Consolidado {tipo.t}</h3>
                    
                    <ResumenTable 
                        titulo="COMPLEJO" 
                        dataset={dataModo.filter(d => d.esOB === tipo.es && PLANTAS_COMPLEJO.includes(d.planta))} 
                        datasetAnt={dataAnteriorModo.filter(d => d.esOB === tipo.es && PLANTAS_COMPLEJO.includes(d.planta))} 
                        esOB={tipo.es} modoVista={modoVista} isGlobal 
                        onDetail={(cat) => { setViewDetail({id:"COMPLEJO", esOB:tipo.es, cat, isGlobal:true}); setPagina(1); }}
                    />
                    
                    <ResumenTable 
                        titulo="PF ALIMENTOS" 
                        dataset={dataModo.filter(d => d.esOB === tipo.es && PLANTAS_PF_ALIMENTOS.includes(d.planta))} 
                        datasetAnt={dataAnteriorModo.filter(d => d.esOB === tipo.es && PLANTAS_PF_ALIMENTOS.includes(d.planta))} 
                        esOB={tipo.es} modoVista={modoVista} isGlobal 
                        onDetail={(cat) => { setViewDetail({id:"PF ALIMENTOS", esOB:tipo.es, cat, isGlobal:true}); setPagina(1); }}
                    />
                </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-700 delay-100">
                {[{t:"OM", es:false}, {t:"OB", es:true}].map(tipo => (
                <div key={tipo.t}>
                    <h3 className="text-xs font-black text-slate-400 mb-4 uppercase flex items-center gap-2"><Factory size={14}/> Plantas ({tipo.t})</h3>
                    {LISTA_PLANTAS_INDIVIDUALES.map(p => (
                    <ResumenTable 
                        key={p} titulo={p} 
                        dataset={dataModo.filter(d => d.planta === p && d.esOB === tipo.es)} 
                        datasetAnt={dataAnteriorModo.filter(d => d.planta === p && d.esOB === tipo.es)} 
                        esOB={tipo.es} modoVista={modoVista} 
                        onDetail={(cat) => { setViewDetail({id:p, esOB:tipo.es, cat}); setPagina(1); }}
                    />
                    ))}
                </div>
                ))}
            </div>
        </>
      ) : (
        <div className="animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 mb-6">
                <PieChart className="text-green-600" />
                <h3 className="text-lg font-black uppercase text-slate-700">Tablero de Cumplimiento Semanal</h3>
                <span className="text-sm font-bold text-slate-400">({selectedSemana})</span>
            </div>

            <div className="mb-10">
                 <h4 className="text-sm font-black text-slate-500 mb-4 uppercase border-b pb-2">Mantención (OM)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {LISTA_CUMPLIMIENTO.map(p => (
                        <ComplianceCard key={`om-${p}`} planta={p} esOB={false} />
                    ))}
                 </div>
            </div>

            <div>
                 <h4 className="text-sm font-black text-slate-500 mb-4 uppercase border-b pb-2">Infraestructura (OB)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {LISTA_CUMPLIMIENTO.map(p => (
                        <ComplianceCard key={`ob-${p}`} planta={p} esOB={true} />
                    ))}
                 </div>
            </div>
        </div>
      )}


      {/* --- MODAL DE DETALLE --- */}
      {viewDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {selectedEmployee ? (
              <EmployeeProfile employeeName={selectedEmployee} orders={employeeData.orders} stats={employeeData.stats} filters={empFilters} setFilters={setEmpFilters} listaPlantas={LISTA_PLANTAS_INDIVIDUALES} onBack={() => { setSelectedEmployee(null); setEmpFilters({planta:"TODAS", periodo:"TODOS"}); }}/>
            ) : (
              <>
                <div className="p-6 border-b bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-800">{viewDetail.id}</h2>
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">{viewDetail.cat || (modoVista === "CUMPLIDAS" ? 'CUMPLIDAS' : 'GLOBAL')}</span>
                             <span className="text-xs text-slate-400">Semana: {selectedSemana}</span>
                        </div>
                    </div>
                    <button onClick={() => setViewDetail(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X/></button>
                  </div>
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Buscar OT..." className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm outline-none border border-transparent focus:border-blue-200 transition-all" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPagina(1); }}/></div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                    {datosPaginados.length > 0 ? (
                        datosPaginados.map((item, idx) => (<OTCard key={idx} item={item} onSelectEmployee={(name) => setSelectedEmployee(name)} />))
                    ) : (
                        <div className="text-center py-10 text-slate-400 text-sm italic">No se encontraron órdenes para este criterio.</div>
                    )}
                </div>

                {totalPaginas > 1 && (<div className="p-4 border-t flex justify-between items-center bg-white shadow-lg"><span className="text-[10px] font-bold text-slate-400 uppercase">Página {pagina} de {totalPaginas}</span><div className="flex gap-2"><button disabled={pagina===1} onClick={()=>setPagina(p=>p-1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={18}/></button><button disabled={pagina===totalPaginas} onClick={()=>setPagina(p=>p+1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={18}/></button></div></div>)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};