// src/views/AtrasosView.tsx
import { useState, useMemo } from "react";
import { AtrasoRow } from "../logic/atrasosProcessor";
import { X, Search, FileText, LayoutGrid, Factory, TrendingUp, TrendingDown, Minus, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

// Importamos los nuevos componentes
import { OTCard } from "./atrasos/OTCard";
import { EmployeeProfile } from "./atrasos/EmployeeProfile";

interface Props {
  data: AtrasoRow[];
  dataAnterior?: AtrasoRow[];
}

export const AtrasosView = ({ data, dataAnterior = [] }: Props) => {
  const [viewDetail, setViewDetail] = useState<{ id: string, esOB: boolean, cat?: string, isGlobal?: boolean } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [empFilters, setEmpFilters] = useState({ planta: "TODAS", periodo: "TODOS" });

  const listaPlantas = ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"];
  const categorias = ["TECNICO / SERVICIO", "PROGRAMADOR", "OC / OTRO"];

  // Filtrado General
  const filteredGeneral = useMemo(() => {
    if (!viewDetail) return [];
    let filtered = data.filter(d => {
      const matchTipo = d.esOB === viewDetail.esOB;
      const matchCat = viewDetail.cat ? d.clasificacion === viewDetail.cat : true;
      let matchPlanta = true;
      if (viewDetail.isGlobal) {
        if (viewDetail.id === "COMPLEJO") matchPlanta = d.planta !== "PF1" && d.planta !== "PF2";
      } else { matchPlanta = (d.planta || "OTROS") === viewDetail.id; }
      return matchTipo && matchCat && matchPlanta;
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d => d.ot.toLowerCase().includes(term) || d.descripcion.toLowerCase().includes(term));
    }

    const otsAnteriores = new Set(dataAnterior.map(d => d.ot));
    return filtered.map(item => ({ ...item, isNew: dataAnterior.length > 0 && !otsAnteriores.has(item.ot) }));
  }, [viewDetail, data, dataAnterior, searchTerm]);

  // Lógica del Técnico
  const employeeData = useMemo(() => {
    if (!selectedEmployee) return { orders: [], stats: { total: 0, cumplidas: 0, pendientes: 0 } };
    let orders = data.filter(d => d.detallesTecnicos?.some(t => t.tecnico === selectedEmployee));
    
    if (empFilters.planta !== "TODAS") orders = orders.filter(d => d.planta === empFilters.planta);
    if (empFilters.periodo !== "TODOS") orders = orders.filter(d => d.periodo === empFilters.periodo);

    const stats = {
      total: orders.length,
      cumplidas: orders.filter(o => o.detallesTecnicos?.find(t => t.tecnico === selectedEmployee)?.finalizada).length,
      pendientes: 0
    };
    stats.pendientes = stats.total - stats.cumplidas;
    return { orders, stats };
  }, [selectedEmployee, data, empFilters]);

  const handleExportarResumen = async () => {
    if (data.length === 0) return;
    try {
      const dataExport = data.map(item => ({ ...item, detallesTecnicos: JSON.stringify(item.detallesTecnicos || []) }));
      const ws = XLSX.utils.json_to_sheet(dataExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "RESUMEN_DATA");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const filePath = await save({ filters: [{ name: 'Excel', extensions: ['xlsx'] }], defaultPath: `Resumen_Atrasos_PF_${new Date().toISOString().split('T')[0]}.xlsx` });
      if (filePath) await writeFile(filePath, new Uint8Array(excelBuffer));
    } catch (e) { console.error(e); }
  };

  const renderDiferencia = (actual: number, anterior: number) => {
    if (dataAnterior.length === 0) return null;
    const diff = actual - anterior;
    if (diff > 0) return <span className="flex items-center gap-0.5 text-red-600 font-black text-[10px] ml-1"><TrendingUp size={10} /> +{diff}</span>;
    if (diff < 0) return <span className="flex items-center gap-0.5 text-green-600 font-black text-[10px] ml-1"><TrendingDown size={10} /> {diff}</span>;
    return <span className="flex items-center gap-0.5 text-slate-400 font-bold text-[10px] ml-1"><Minus size={10} /></span>;
  };

  const renderCuadro = (titulo: string, dataset: AtrasoRow[], esOB: boolean, isGlobal = false) => {
    const datasetAnt = dataAnterior.filter(d => {
      if (isGlobal) {
        if (titulo === "COMPLEJO") return d.esOB === esOB && d.planta !== "PF1" && d.planta !== "PF2";
        return d.esOB === esOB;
      }
      return (d.planta || "OTROS") === titulo && d.esOB === esOB;
    });

    return (
      <div className="rounded-xl border overflow-hidden shadow-sm mb-6 bg-white">
        <table className="w-full text-[11px]">
          <thead>
            <tr 
              onClick={() => { setViewDetail({ id: titulo, esOB, isGlobal }); setSearchTerm(""); }}
              className={`${isGlobal ? 'bg-pf-red text-white' : 'bg-[#FFFF00] text-slate-900'} font-black cursor-pointer hover:opacity-90 transition-colors group`}
            >
              <td className="px-3 py-2 text-xs uppercase flex items-center justify-between">
                <span>{titulo} {esOB ? '(OB)' : '(OM)'}</span>
                <Search size={12} className="opacity-40 group-hover:opacity-100" />
              </td>
              <td className="text-center w-20 border-x border-white/20 leading-tight py-1">
                {dataset.filter(f => f.periodo === "2025").length}
                {renderDiferencia(dataset.filter(f => f.periodo === "2025").length, datasetAnt.filter(f => f.periodo === "2025").length)}
              </td>
              <td className="text-center w-20 border-x border-white/20 leading-tight py-1">
                {dataset.filter(f => f.periodo === "ENE-26").length}
                {renderDiferencia(dataset.filter(f => f.periodo === "ENE-26").length, datasetAnt.filter(f => f.periodo === "ENE-26").length)}
              </td>
              <td className="text-center w-14">{dataset.filter(f => f.periodo === "S/A").length}</td>
            </tr>
          </thead>
          <tbody>
            {categorias.map(cat => (
              <tr key={cat} onClick={() => setViewDetail({ id: titulo, esOB, cat, isGlobal })} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer group bg-white">
                <td className="px-3 py-1.5 font-bold text-slate-500 uppercase">{cat}</td>
                <td className="text-center">{dataset.filter(f => f.clasificacion === cat && f.periodo === "2025").length}</td>
                <td className="text-center font-bold text-[#FF0000]">{dataset.filter(f => f.clasificacion === cat && f.periodo === "ENE-26").length}</td>
                <td className="text-center text-slate-300">{dataset.filter(f => f.clasificacion === cat && f.periodo === "S/A").length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 h-full relative overflow-y-auto bg-slate-50/50">
      <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">KPI de Atrasos</h2>
          <p className="text-sm text-slate-400 font-medium tracking-tight">Seguimiento de cumplimiento y personal</p>
        </div>
        <button onClick={handleExportarResumen} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all">
          <Download size={18} /> Exportar Resumen Histórico
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-pf-red mb-4 uppercase"><LayoutGrid size={18}/> Consolidado OM</h3>
          {renderCuadro("COMPLEJO", data.filter(d => !d.esOB && d.planta !== "PF1" && d.planta !== "PF2"), false, true)}
          {renderCuadro("PF ALIMENTOS", data.filter(d => !d.esOB), false, true)}
        </div>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-pf-red mb-4 uppercase"><LayoutGrid size={18}/> Consolidado OB</h3>
          {renderCuadro("COMPLEJO", data.filter(d => d.esOB && d.planta !== "PF1" && d.planta !== "PF2"), true, true)}
          {renderCuadro("PF ALIMENTOS", data.filter(d => d.esOB), true, true)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xs font-black text-slate-400 mb-4 uppercase flex items-center gap-2"><Factory size={14}/> Plantas (OM)</h3>
          {listaPlantas.map(p => renderCuadro(p, data.filter(d => d.planta === p && !d.esOB), false))}
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-400 mb-4 uppercase flex items-center gap-2"><Factory size={14}/> Plantas (OB)</h3>
          {listaPlantas.map(p => renderCuadro(p, data.filter(d => d.planta === p && d.esOB), true))}
        </div>
      </div>

      {viewDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {selectedEmployee ? (
              <EmployeeProfile 
                employeeName={selectedEmployee}
                orders={employeeData.orders}
                stats={employeeData.stats}
                filters={empFilters}
                setFilters={setEmpFilters}
                listaPlantas={listaPlantas}
                onBack={() => { setSelectedEmployee(null); setEmpFilters({planta:"TODAS", periodo:"TODOS"}); }}
              />
            ) : (
              <>
                <div className="p-6 border-b bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pf-red/10 rounded-lg"><FileText className="text-pf-red" size={20} /></div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 leading-none">{viewDetail.id}</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewDetail.cat || "RESUMEN GLOBAL"}</span>
                      </div>
                    </div>
                    <button onClick={() => setViewDetail(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400" /></button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Buscar OT o descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pf-red/20" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                  {filteredGeneral.map((item, idx) => (
                    <OTCard key={idx} item={item} onSelectEmployee={setSelectedEmployee} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};