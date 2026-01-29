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

  const listaPlantas = ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS", "MPS"];

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

  const handleExportarExcelCompleto = async () => {
    if (data.length === 0) return;

    try {
      const wb = XLSX.utils.book_new();

      // --- HOJA 1: RESUMEN_DATA ---
      const dataRaw = data.map(item => ({
        Planta: item.planta,
        OT: item.ot,
        Descripcion: item.descripcion,
        Estado: item.estado,
        Clasificacion: item.clasificacion,
        Periodo: item.periodo,
        Es_OB: item.esOB ? "SI" : "NO",
        Fecha_Proceso: new Date().toLocaleString()
      }));
      const wsData = XLSX.utils.json_to_sheet(dataRaw);
      XLSX.utils.book_append_sheet(wb, wsData, "RESUMEN_DATA");

      // --- HOJA 2: RESUMEN_TABLAS ---
      const categorias = ["TECNICO / SERVICIO", "PROGRAMADOR", "OC / OTRO"];
      const plantasBase = ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"];
      
      const contar = (p: string, c: string, per: string, esOB: boolean) => {
        return data.filter(d => 
          d.planta === p && 
          d.clasificacion === c && 
          d.periodo === per && 
          d.esOB === esOB
        ).length;
      };

      const rowsTablas: any[] = [];
      
      [false, true].forEach(esOB => {
        const sufijo = esOB ? " (OB)" : " (OM)";
        
        const generarBloquePlanta = (nombre: string, esAgregado: boolean, componentes: string[] = []) => {
          // Guardamos el índice donde irá la fila del título para poner los totales luego
          const tituloIdx = rowsTablas.length;
          
          rowsTablas.push({ 
            "REPORTE DE ATRASOS": nombre + sufijo, 
            "2025": 0, 
            "ENE-26": 0, 
            "S/A": 0, 
            "Delta": 0 
          });
          
          let total2025 = 0, totalEne = 0, totalSA = 0;

          categorias.forEach(cat => {
            let v2025 = 0, vEne = 0, vSA = 0;

            if (!esAgregado) {
              v2025 = contar(nombre, cat, "2025", esOB);
              vEne = contar(nombre, cat, "ENE-26", esOB);
              vSA = contar(nombre, cat, "S/A", esOB);
            } else {
              componentes.forEach(comp => {
                v2025 += contar(comp, cat, "2025", esOB);
                vEne += contar(comp, cat, "ENE-26", esOB);
                vSA += contar(comp, cat, "S/A", esOB);
              });
            }

            rowsTablas.push({
              "REPORTE DE ATRASOS": cat,
              "2025": v2025,
              "ENE-26": vEne,
              "S/A": vSA,
              "Delta": v2025 - vSA
            });

            total2025 += v2025; totalEne += vEne; totalSA += vSA;
          });
          
          // Actualizamos la fila del título con los totales acumulados
          rowsTablas[tituloIdx]["2025"] = total2025;
          rowsTablas[tituloIdx]["ENE-26"] = totalEne;
          rowsTablas[tituloIdx]["S/A"] = totalSA;
          rowsTablas[tituloIdx]["Delta"] = total2025 - totalSA;
          
          // Fila vacía de separación (manteniendo las mismas llaves para no romper el orden)
          rowsTablas.push({ "REPORTE DE ATRASOS": "", "2025": "", "ENE-26": "", "S/A": "", "Delta": "" });
        };

        plantasBase.forEach(p => generarBloquePlanta(p, false));
        generarBloquePlanta("COMPLEJO", true, ["PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"]);
        generarBloquePlanta("PF ALIMENTOS", true, ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"]);
      });

      // CLAVE: Definir el orden exacto de las cabeceras aquí
      const wsTablas = XLSX.utils.json_to_sheet(rowsTablas, {
        header: ["REPORTE DE ATRASOS", "2025", "ENE-26", "S/A", "Delta"]
      });

      XLSX.utils.book_append_sheet(wb, wsTablas, "RESUMEN_TABLAS");

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const filePath = await save({ 
        filters: [{ name: 'Excel', extensions: ['xlsx'] }], 
        defaultPath: `Reporte_OTs_${new Date().toISOString().split('T')[0]}.xlsx` 
      });
      
      if (filePath) await writeFile(filePath, new Uint8Array(excelBuffer));

    } catch (e) {
      console.error("Error al exportar:", e);
    }
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
        <div className="flex gap-2">
          {/* Botón existente */}
          <button 
            onClick={handleExportarExcel} 
            className="flex items-center gap-2 bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm"
          >
            <Download size={18} /> Solo Datos
          </button>

          {/* NUEVO BOTÓN: Exportar Reporte con Tablas */}
          <button 
            onClick={handleExportarExcelCompleto} 
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-900 transition-colors"
          >
            <FileText size={18} /> Exportar Reporte
          </button>
        </div>
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