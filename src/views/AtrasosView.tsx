import { useState, useMemo } from "react";
import { AtrasoRow } from "../logic/atrasosProcessor";
import { 
  X, Search, FileText, Filter, LayoutGrid, Factory, 
  TrendingUp, TrendingDown, Minus, Download, CheckCircle2, User,
  AlertCircle, ChevronLeft, ClipboardCheck, Clock
} from "lucide-react";
import * as XLSX from "xlsx";
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

interface Props {
  data: AtrasoRow[];
  dataAnterior?: AtrasoRow[];
}

export const AtrasosView = ({ data, dataAnterior = [] }: Props) => {
  const [viewDetail, setViewDetail] = useState<{ id: string, esOB: boolean, cat?: string, isGlobal?: boolean } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  const listaPlantas = ["PF1", "PF2", "PF3", "PF4", "PF5", "PF6", "CDT", "OTROS"];
  const categorias = ["TECNICO / SERVICIO", "PROGRAMADOR", "OC / OTRO"];

  const filteredDetailData = useMemo(() => {
    if (!viewDetail) return [];
    
    let filtered = [];
    if (viewDetail.isGlobal) {
      filtered = data.filter(d => d.esOB === viewDetail.esOB);
      if (viewDetail.id === "COMPLEJO") {
        filtered = filtered.filter(d => d.planta !== "PF1" && d.planta !== "PF2");
      }
    } else {
      filtered = data.filter(d => (d.planta || "OTROS") === viewDetail.id && d.esOB === viewDetail.esOB);
    }
    
    if (viewDetail.cat) filtered = filtered.filter(d => d.clasificacion === viewDetail.cat);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.ot.toLowerCase().includes(term) || d.descripcion.toLowerCase().includes(term)
      );
    }

    const otsAnteriores = new Set(dataAnterior.map(d => d.ot));
    return filtered.map(item => ({
      ...item,
      isNew: dataAnterior.length > 0 && !otsAnteriores.has(item.ot)
    }));
  }, [viewDetail, data, dataAnterior, searchTerm]);

  // NUEVO: OTs de un empleado seleccionado y sus estadísticas
  const employeeOrders = useMemo(() => {
    if (!selectedEmployee) return [];
    return data.filter(d => 
      d.detallesTecnicos?.some(t => t.tecnico === selectedEmployee)
    );
  }, [selectedEmployee, data]);

  const employeeStats = useMemo(() => {
    if (!selectedEmployee) return { cumplidas: 0, pendientes: 0, total: 0 };
    
    let cumplidas = 0;
    let pendientes = 0;

    employeeOrders.forEach(order => {
      const infoTecnico = order.detallesTecnicos?.find(t => t.tecnico === selectedEmployee);
      if (infoTecnico?.finalizada) cumplidas++;
      else pendientes++;
    });

    return { cumplidas, pendientes, total: employeeOrders.length };
  }, [selectedEmployee, employeeOrders]);

  const renderDiferencia = (actual: number, anterior: number) => {
    if (dataAnterior.length === 0) return null;
    const diff = actual - anterior;
    if (diff > 0) return <span className="flex items-center gap-0.5 text-red-600 font-black text-[10px] ml-1"><TrendingUp size={10} /> +{diff}</span>;
    if (diff < 0) return <span className="flex items-center gap-0.5 text-green-600 font-black text-[10px] ml-1"><TrendingDown size={10} /> {diff}</span>;
    return <span className="flex items-center gap-0.5 text-slate-400 font-bold text-[10px] ml-1"><Minus size={10} /> 0</span>;
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
      <div className={`rounded-xl border overflow-hidden shadow-sm mb-6 bg-white`}>
        <table className="w-full text-[11px]">
          <thead>
            <tr 
              onClick={() => { setViewDetail({ id: titulo, esOB, isGlobal }); setSearchTerm(""); }}
              className={`${isGlobal ? 'bg-pf-red text-white' : 'bg-[#FFFF00] text-slate-900'} font-black cursor-pointer hover:opacity-90`}
            >
              <td className="px-3 py-2 text-xs uppercase flex items-center justify-between">
                <span>{titulo} {esOB ? '(OB)' : '(OM)'}</span>
                <Search size={12} className="opacity-40" />
              </td>
              <td className="text-center w-20 border-x border-white/20">
                <div className="flex flex-col items-center">
                  <span>{dataset.filter(f => f.periodo === "2025").length}</span>
                  {renderDiferencia(dataset.filter(f => f.periodo === "2025").length, datasetAnt.filter(f => f.periodo === "2025").length)}
                </div>
              </td>
              <td className="text-center w-20 border-x border-white/20">
                <div className="flex flex-col items-center">
                  <span>{dataset.filter(f => f.periodo === "ENE-26").length}</span>
                  {renderDiferencia(dataset.filter(f => f.periodo === "ENE-26").length, datasetAnt.filter(f => f.periodo === "ENE-26").length)}
                </div>
              </td>
              <td className="text-center w-14">{dataset.filter(f => f.periodo === "S/A").length}</td>
            </tr>
          </thead>
          <tbody>
            {categorias.map(cat => (
              <tr key={cat} onClick={() => setViewDetail({ id: titulo, esOB, cat, isGlobal })} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer group bg-white">
                <td className="px-3 py-1.5 font-bold text-slate-500 uppercase flex items-center justify-between">{cat}</td>
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

  const handleExportarResumen = async () => {
    if (data.length === 0) return;
    try {
      const dataParaExportar = data.map(item => ({ ...item, detallesTecnicos: JSON.stringify(item.detallesTecnicos || []) }));
      const ws = XLSX.utils.json_to_sheet(dataParaExportar);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "RESUMEN_DATA");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const filePath = await save({ filters: [{ name: 'Excel', extensions: ['xlsx'] }], defaultPath: `Resumen_Atrasos_PF_${new Date().toISOString().split('T')[0]}.xlsx` });
      if (filePath) await writeFile(filePath, new Uint8Array(excelBuffer));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6 h-full relative overflow-y-auto bg-slate-50/50">
      {/* ... Headers y Tablas iguales ... */}
      <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">KPI de Atrasos</h2>
          <p className="text-sm text-slate-400 font-medium">Análisis comparativo semanal</p>
        </div>
        <button onClick={handleExportarResumen} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all">
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
          <h3 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2"><Factory size={14}/> Plantas (OM)</h3>
          {listaPlantas.map(p => renderCuadro(p, data.filter(d => d.planta === p && !d.esOB), false))}
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2"><Factory size={14}/> Plantas (OB)</h3>
          {listaPlantas.map(p => renderCuadro(p, data.filter(d => d.planta === p && d.esOB), true))}
        </div>
      </div>

      {/* MODAL DETALLE */}
      {viewDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b bg-white">
              {selectedEmployee ? (
                <button onClick={() => setSelectedEmployee(null)} className="flex items-center gap-2 text-pf-red font-black text-sm mb-4 hover:underline">
                  <ChevronLeft size={16} /> Volver al listado general
                </button>
              ) : (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pf-red/10 rounded-lg"><FileText className="text-pf-red" size={20} /></div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">{viewDetail.id} - {viewDetail.cat || "TODOS"}</h2>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewDetail.esOB ? 'Servicios' : 'Trabajos'}</span>
                    </div>
                  </div>
                  <button onClick={() => setViewDetail(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400" /></button>
                </div>
              )}

              {selectedEmployee ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl text-white">
                    <div className="p-3 bg-white/10 rounded-xl"><User size={24} /></div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Carga de Trabajo de:</p>
                      <h3 className="text-lg font-black">{selectedEmployee}</h3>
                    </div>
                  </div>
                  
                  {/* RESUMEN DE CUMPLIMIENTO DEL TÉCNICO */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total OTs</p>
                      <p className="text-xl font-black text-slate-900">{employeeStats.total}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                      <p className="text-[9px] font-black text-green-600 uppercase mb-1 flex items-center justify-center gap-1">
                        <ClipboardCheck size={10} /> Cumplidas
                      </p>
                      <p className="text-xl font-black text-green-700">{employeeStats.cumplidas}</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-3 rounded-xl shadow-sm text-center">
                      <p className="text-[9px] font-black text-red-600 uppercase mb-1 flex items-center justify-center gap-1">
                        <Clock size={10} /> Pendientes
                      </p>
                      <p className="text-xl font-black text-red-700">{employeeStats.pendientes}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input type="text" placeholder="Buscar OT o descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm outline-none" />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {(selectedEmployee ? employeeOrders : filteredDetailData).map((item: any, idx) => (
                <div key={idx} className={`bg-white p-4 rounded-xl border shadow-sm transition-all ${item.isNew ? 'border-l-4 border-l-red-600' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{item.ot}</span>
                      {item.isNew && <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse">NUEVA</span>}
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${item.clasificacion === 'PROGRAMADOR' ? 'bg-green-100 text-green-700' : item.clasificacion === 'TECNICO / SERVICIO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{item.clasificacion}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase font-medium line-clamp-2 mb-3">{item.descripcion}</p>
                  
                  {item.detallesTecnicos && item.detallesTecnicos.length > 0 && (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-3">
                      <div className="space-y-1.5">
                        {item.detallesTecnicos.map((t: any, i: number) => (
                          <div 
                            key={i} 
                            onClick={() => !selectedEmployee && setSelectedEmployee(t.tecnico)}
                            className={`flex items-center justify-between p-1 rounded transition-colors ${!selectedEmployee ? 'hover:bg-pf-red/5 cursor-pointer group' : ''}`}
                          >
                            <span className={`text-[10px] font-bold ${selectedEmployee === t.tecnico ? 'text-pf-red' : 'text-slate-600 group-hover:text-pf-red'}`}>{t.tecnico}</span>
                            <div className="flex items-center gap-2">
                              {t.finalizada ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-red-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`p-2 rounded-lg border flex flex-col items-center ${item.rmd === 'SI' || item.rmd === '' || item.rmd === '0' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                      <span className="text-[8px] font-black uppercase opacity-60 mb-1 leading-none text-center">RMD</span>
                      <span className="text-[10px] font-bold">{item.rmd || 'N/A'}</span>
                    </div>
                    <div className={`p-2 rounded-lg border flex flex-col items-center ${item.rse === 'SI' || item.rse === '' || item.rse === '0' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                      <span className="text-[8px] font-black uppercase opacity-60 mb-1 leading-none text-center">RSE</span>
                      <span className="text-[10px] font-bold">{item.rse || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Período: {item.periodo}</span>
                    <span className="text-[9px] font-bold text-slate-300 italic">{item.planta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};