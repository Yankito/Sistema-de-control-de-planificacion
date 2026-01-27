import { useState, useMemo } from "react";
import { AtrasoRow } from "../logic/atrasosProcessor";
import { X, Search, FileText, LayoutGrid, Factory, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { OTCard } from "./atrasos/OTCard";
import { EmployeeProfile } from "./atrasos/EmployeeProfile";
import { ResumenTable } from "../components/seguimiento/ResumenTable";
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import * as XLSX from "xlsx";

export const SeguimientoOTsView = ({ data, dataAnterior = [] }: { data: AtrasoRow[], dataAnterior?: AtrasoRow[] }) => {
  const [modoVista, setModoVista] = useState<"ATRASOS" | "CUMPLIDAS">("ATRASOS");
  const [viewDetail, setViewDetail] = useState<{ id: string, esOB: boolean, cat?: string, isGlobal?: boolean } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [empFilters, setEmpFilters] = useState({ planta: "TODAS", periodo: "TODOS" });
  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 10;

  const listaPlantas = ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"];

  const dataModo = useMemo(() => data.filter(d => modoVista === "CUMPLIDAS" ? d.clasificacion === "CUMPLIDA" : d.clasificacion !== "CUMPLIDA"), [data, modoVista]);

    const dataAnteriorModo = useMemo(() => {
    return dataAnterior.filter(d => {
        const esFinalizada = d.clasificacion === "CUMPLIDA";
        return modoVista === "CUMPLIDAS" ? esFinalizada : !esFinalizada;
    });
    }, [dataAnterior, modoVista]);

  const filteredGeneral = useMemo(() => {
    if (!viewDetail) return [];
    let f = dataModo.filter(d => {
      const matchTipo = d.esOB === viewDetail.esOB;
      const matchCat = viewDetail.cat ? d.clasificacion === viewDetail.cat : true;
      let matchPlanta = viewDetail.isGlobal ? (viewDetail.id === "COMPLEJO" ? d.planta !== "PF1" && d.planta !== "PF2" : true) : d.planta === viewDetail.id;
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
        clasificacion: item.clasificacion, periodo: item.periodo, esOB: item.esOB ? "SI" : "NO",
        rmd: item.rmd, rse: item.rse, detallesTecnicos: JSON.stringify(item.detallesTecnicos || []),
        fecha_proceso: new Date().toLocaleString()
      }));
      const ws = XLSX.utils.json_to_sheet(dataParaArchivo);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "RESUMEN_DATA");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const prefijo = modoVista === "ATRASOS" ? "ATRASOS" : "CUMPLIDAS";
      const filePath = await save({ filters: [{ name: 'Excel', extensions: ['xlsx'] }], defaultPath: `Seguimiento_OTs_${prefijo}_${new Date().toISOString().split('T')[0]}.xlsx` });
      if (filePath) await writeFile(filePath, new Uint8Array(excelBuffer));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50/50">
      <div className="flex justify-between mb-8 border-b pb-4">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Seguimiento OTs</h2>
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button onClick={() => { setModoVista("ATRASOS"); setViewDetail(null); setPagina(1); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${modoVista === 'ATRASOS' ? 'bg-pf-red text-white shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}>ATRASOS</button>
            <button onClick={() => { setModoVista("CUMPLIDAS"); setViewDetail(null); setPagina(1); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${modoVista === 'CUMPLIDAS' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-300'}`}>CUMPLIDAS</button>
          </div>
        </div>
        <button onClick={handleExportarExcel} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg"><Download size={18} /> Exportar {modoVista}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {[{t:"OM", es:false}, {t:"OB", es:true}].map(tipo => (
          <div key={tipo.t}>
            <h3 className={`text-sm font-black mb-4 uppercase ${modoVista === 'ATRASOS' ? 'text-pf-red' : 'text-green-600'}`}>Consolidado {tipo.t}</h3>
            <ResumenTable 
                titulo="COMPLEJO" 
                dataset={dataModo.filter(d => d.esOB === tipo.es && d.planta !== "PF1" && d.planta !== "PF2")} 
                datasetAnt={dataAnteriorModo.filter(d => d.esOB === tipo.es && d.planta !== "PF1" && d.planta !== "PF2")} 
                esOB={tipo.es} modoVista={modoVista} 
                isGlobal 
                onDetail={(cat) => { setViewDetail({id:"COMPLEJO", esOB:tipo.es, cat, isGlobal:true}); setPagina(1); }}/>
            <ResumenTable titulo="PF ALIMENTOS" dataset={dataModo.filter(d => d.esOB === tipo.es)} datasetAnt={dataAnteriorModo.filter(d => d.esOB === tipo.es)} esOB={tipo.es} modoVista={modoVista} isGlobal onDetail={(cat) => { setViewDetail({id:"PF ALIMENTOS", esOB:tipo.es, cat, isGlobal:true}); setPagina(1); }}/>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[{t:"OM", es:false}, {t:"OB", es:true}].map(tipo => (
          <div key={tipo.t}>
            <h3 className="text-xs font-black text-slate-400 mb-4 uppercase flex items-center gap-2"><Factory size={14}/> Plantas ({tipo.t})</h3>
            {listaPlantas.map(p => (
              <ResumenTable key={p} titulo={p} dataset={dataModo.filter(d => d.planta === p && d.esOB === tipo.es)} datasetAnt={dataAnteriorModo.filter(d => d.planta === p && d.esOB === tipo.es)} esOB={tipo.es} modoVista={modoVista} onDetail={(cat) => { setViewDetail({id:p, esOB:tipo.es, cat}); setPagina(1); }}/>
            ))}
          </div>
        ))}
      </div>

      {viewDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {selectedEmployee ? (
              <EmployeeProfile employeeName={selectedEmployee} orders={employeeData.orders} stats={employeeData.stats} filters={empFilters} setFilters={setEmpFilters} listaPlantas={listaPlantas} onBack={() => { setSelectedEmployee(null); setEmpFilters({planta:"TODAS", periodo:"TODOS"}); }}/>
            ) : (
              <>
                <div className="p-6 border-b bg-white">
                  <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-black">{viewDetail.id} - {viewDetail.cat || 'GLOBAL'}</h2><button onClick={() => setViewDetail(null)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button></div>
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Buscar OT..." className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm outline-none" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPagina(1); }}/></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">{datosPaginados.map((item, idx) => (<OTCard key={idx} item={item} onSelectEmployee={(name) => setSelectedEmployee(name)} />))}</div>
                {totalPaginas > 1 && (<div className="p-4 border-t flex justify-between items-center bg-white shadow-lg"><span className="text-[10px] font-bold text-slate-400 uppercase">Página {pagina} de {totalPaginas}</span><div className="flex gap-2"><button disabled={pagina===1} onClick={()=>setPagina(p=>p-1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={18}/></button><button disabled={pagina===totalPaginas} onClick={()=>setPagina(p=>p+1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={18}/></button></div></div>)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};