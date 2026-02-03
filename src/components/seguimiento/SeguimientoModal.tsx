import { useState, useMemo } from "react";
import { X, Search, ChevronLeft, ChevronRight, Filter, Sparkles } from "lucide-react";
import { AtrasoRow } from "../../types";
import { EmployeeProfile } from "../../views/atrasos/EmployeeProfile";
import { OTCard } from "../../views/atrasos/OTCard";

interface SeguimientoModalProps {
  viewDetail: { id: string; esOB: boolean; cat?: string; isGlobal?: boolean };
  onClose: () => void;
  dataModo: AtrasoRow[]; 
  dataAnterior?: AtrasoRow[]; 
  selectedSemana: string;
  LISTA_PLANTAS_INDIVIDUALES: string[];
  PLANTAS_COMPLEJO: string[];
  PLANTAS_PF_ALIMENTOS: string[];
  modoVista: "ATRASOS" | "CUMPLIDAS";
}

// 1. HELPER DE NORMALIZACIÓN (Fuera del componente para evitar recrearlo)
const normalizeOT = (val: any) => String(val || "").trim().toUpperCase();

export const SeguimientoModal = ({
  viewDetail, onClose, dataModo, dataAnterior = [], selectedSemana,
  LISTA_PLANTAS_INDIVIDUALES, PLANTAS_COMPLEJO, PLANTAS_PF_ALIMENTOS, modoVista
}: SeguimientoModalProps) => {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [empFilters, setEmpFilters] = useState({ planta: "TODAS", periodo: "TODOS" });
  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 10;

  // 2. CREAR SET NORMALIZADO
  const previousOtSet = useMemo(() => {
      // Creamos un Set con las OTs antiguas normalizadas
      return new Set(dataAnterior.map(d => normalizeOT(d.ot)));
  }, [dataAnterior]);

  // 3. AISLAR DATA
  const baseData = useMemo(() => {
      return dataModo.filter(d => {
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
  }, [dataModo, viewDetail, PLANTAS_COMPLEJO, PLANTAS_PF_ALIMENTOS]);

  // 4. ESTADOS + LOGICA NUEVAS
  const estadosDisponibles = useMemo(() => {
      const estados = new Set(baseData.map(d => d.estado));
      const lista = ["TODOS"];
      if (dataAnterior.length > 0) lista.push("NUEVAS");
      return [...lista, ...Array.from(estados).sort()];
  }, [baseData, dataAnterior]);

  // 5. FILTROS
  const filteredGeneral = useMemo(() => {
    let f = baseData;

    // Filtro NUEVAS Normalizado
    if (filterEstado === "NUEVAS") {
        f = f.filter(d => !previousOtSet.has(normalizeOT(d.ot)));
    } else if (filterEstado !== "TODOS") {
        f = f.filter(d => d.estado === filterEstado);
    }
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        f = f.filter(d => 
            d.ot.toLowerCase().includes(term) || 
            d.descripcion.toLowerCase().includes(term) ||
            (d.detallesTecnicos && d.detallesTecnicos.some(t => t.tecnico.toLowerCase().includes(term)))
        );
    }
    return f;
  }, [baseData, searchTerm, filterEstado, previousOtSet]);

  const datosPaginados = useMemo(() => filteredGeneral.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina), [filteredGeneral, pagina]);
  const totalPaginas = Math.ceil(filteredGeneral.length / itemsPorPagina);

  // 6. LOGICA EMPLEADO (Aplicando Normalización también aquí)
  const employeeData = useMemo(() => {
    if (!selectedEmployee) return { orders: [], stats: { total: 0, cumplidas: 0, pendientes: 0 } };
    
    let orders = dataModo.filter(d => d.detallesTecnicos?.some(t => t.tecnico === selectedEmployee));
    
    if (empFilters.planta !== "TODAS") orders = orders.filter(d => d.planta === empFilters.planta);
    if (empFilters.periodo !== "TODOS") orders = orders.filter(d => d.periodo === empFilters.periodo);
    
    // Inyección de isNew
    const ordersWithFlag = orders.map(o => ({
        ...o,
        // Usamos normalizeOT para comparar manzanas con manzanas
        isNew: dataAnterior.length > 0 && !previousOtSet.has(normalizeOT(o.ot))
    }));

    return { 
        orders: ordersWithFlag, 
        stats: { 
            total: orders.length, 
            cumplidas: orders.filter(o => o.detallesTecnicos?.find(t => t.tecnico === selectedEmployee)?.finalizada).length, 
            pendientes: orders.filter(o => o.detallesTecnicos?.find(t => t.tecnico === selectedEmployee)?.finalizada === false).length 
        } 
    };
  }, [selectedEmployee, dataModo, empFilters, previousOtSet, dataAnterior]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {selectedEmployee ? (
          <EmployeeProfile 
            employeeName={selectedEmployee} 
            orders={employeeData.orders}
            stats={employeeData.stats} 
            filters={empFilters} 
            setFilters={setEmpFilters} 
            listaPlantas={LISTA_PLANTAS_INDIVIDUALES} 
            onBack={() => { setSelectedEmployee(null); setEmpFilters({planta:"TODAS", periodo:"TODOS"}); }}
          />
        ) : (
          <>
            <div className="p-6 border-b bg-white">
              <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-lg font-black text-slate-800">{viewDetail.id}</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">{viewDetail.cat || (modoVista === "CUMPLIDAS" ? 'CUMPLIDAS' : 'GLOBAL')}</span>
                        <span className="text-xs text-slate-400">Semana: {selectedSemana}</span>
                        <span className="text-xs text-slate-300">|</span>
                        <span className="text-xs font-bold text-slate-600">{filteredGeneral.length} OTs</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X/></button>
              </div>
              
              <div className="flex gap-2">
                  <div className="relative min-w-[140px]">
                      {filterEstado === "NUEVAS" ? (
                          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={14} />
                      ) : (
                          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      )}
                      <select 
                        value={filterEstado}
                        onChange={(e) => { setFilterEstado(e.target.value); setPagina(1); }}
                        className={`w-full pl-9 pr-2 py-2 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-blue-200 cursor-pointer appearance-none ${filterEstado === 'NUEVAS' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-700'}`}
                      >
                          {estadosDisponibles.map(est => (
                              <option key={est} value={est}>{est}</option>
                          ))}
                      </select>
                  </div>

                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Buscar OT, Descrip. o Técnico..." 
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm outline-none border border-transparent focus:border-blue-200 transition-all" 
                        value={searchTerm} 
                        onChange={(e) => { setSearchTerm(e.target.value); setPagina(1); }}
                      />
                  </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {datosPaginados.length > 0 ? (
                    datosPaginados.map((item, idx) => {
                        // 7. CALCULO EN LISTA PRINCIPAL (Normalizado)
                        const isItemNew = dataAnterior.length > 0 && !previousOtSet.has(normalizeOT(item.ot));
                        console.log("OT:", item.ot, "isItemNew:", isItemNew);
                        
                        return (
                            <OTCard 
                                key={idx} 
                                item={item}
                                isNew={isItemNew} 
                                onSelectEmployee={(name) => setSelectedEmployee(name)} 
                            />
                        );
                    })
                ) : (
                    <div className="text-center py-10 flex flex-col items-center gap-2">
                        <Search size={32} className="text-slate-300"/>
                        <span className="text-slate-400 text-sm italic">No se encontraron órdenes.</span>
                    </div>
                )}
            </div>

            {totalPaginas > 1 && (
                <div className="p-4 border-t flex justify-between items-center bg-white shadow-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Página {pagina} de {totalPaginas}</span>
                    <div className="flex gap-2">
                        <button disabled={pagina===1} onClick={()=>setPagina(p=>p-1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronLeft size={18}/></button>
                        <button disabled={pagina===totalPaginas} onClick={()=>setPagina(p=>p+1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronRight size={18}/></button>
                    </div>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};