import { ChevronLeft, User, ClipboardCheck, Clock, Factory, Calendar, AlertCircle } from "lucide-react";
import { OTCard } from "./OTCard";

export const EmployeeProfile = ({ 
  employeeName, 
  employeePlants,
  orders, 
  stats, 
  onBack, 
  filters, 
  setFilters, 
  listaPlantas 
}: any) => {
  return (
    <>
      <div className="p-6 border-b bg-white space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-pf-red font-black text-sm hover:underline">
          <ChevronLeft size={16} /> Volver al listado general
        </button>
        
        <div className="flex items-center gap-4 p-5 bg-slate-900 rounded-2xl text-white shadow-lg">
          <div className="p-3 bg-white/10 rounded-xl"><User size={28} /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Técnico / Recurso</p>
            <h3 className="text-xl font-black leading-none">{employeeName}</h3>
            
            {/* --- AQUÍ MOSTRAMOS LAS PLANTAS ACTIVAS --- */}
            <div className="flex flex-wrap gap-1 mt-2">
                {employeePlants && employeePlants.length > 0 ? (
                    employeePlants.map((p: string) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold text-slate-200 border border-white/10">
                            {p}
                        </span>
                    ))
                ) : (
                    <span className="text-[10px] text-slate-500 italic">Sin asignación de planta</span>
                )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 border p-2 rounded-xl text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase">Total OTs</p>
            <p className="text-xl font-black text-slate-700">{stats.total}</p>
          </div>
          <div className="bg-green-50 border border-green-100 p-2 rounded-xl text-center">
            <p className="text-[8px] font-black text-green-600 uppercase flex items-center justify-center gap-1">
              <ClipboardCheck size={10}/> Cumplidas
            </p>
            <p className="text-xl font-black text-green-700">{stats.cumplidas}</p>
          </div>
          <div className="bg-red-50 border border-red-100 p-2 rounded-xl text-center">
            <p className="text-[8px] font-black text-red-600 uppercase flex items-center justify-center gap-1">
              <Clock size={10}/> Pendientes
            </p>
            <p className="text-xl font-black text-red-700">{stats.pendientes}</p>
          </div>
        </div>

        {/* FILTROS INTERNOS */}
        <div className="flex gap-2 pt-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
            <Factory size={14} className="text-slate-400" />
            <select 
              value={filters.planta} 
              onChange={(e) => setFilters({...filters, planta: e.target.value})} 
              className="bg-transparent text-[10px] font-bold outline-none w-full text-slate-600 cursor-pointer"
            >
              <option value="TODAS">TODAS LAS PLANTAS</option>
              {listaPlantas.map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1 flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
            <Calendar size={14} className="text-slate-400" />
            <select 
              value={filters.periodo} 
              onChange={(e) => setFilters({...filters, periodo: e.target.value})} 
              className="bg-transparent text-[10px] font-bold outline-none w-full text-slate-600 cursor-pointer"
            >
              <option value="TODOS">TODOS LOS PERIODOS</option>
              <option value="2025">2025</option>
              <option value="ENE-26">ENE-26</option>
              <option value="FEB-26">FEB-26</option>
              <option value="S/A">S/A</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {orders.length > 0 ? (
          orders.map((item: any, idx: number) => (
            <OTCard 
                key={idx} 
                item={item} 
                // AQUÍ PASAMOS LA BANDERA QUE CALCULAMOS EN EL PADRE
                isNew={item.isNew} 
                selectedEmployee={employeeName} 
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 uppercase">
            <AlertCircle size={40} className="mb-2 opacity-20" />
            <p className="text-xs font-bold">Sin resultados</p>
          </div>
        )}
      </div>
    </>
  );
};