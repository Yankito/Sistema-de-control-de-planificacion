// src/views/SeguimientoView.tsx
import { useState } from "react";
import { SeguimientoRow } from "../types";
import { Hammer, HardHat } from "lucide-react";

interface SeguimientoViewProps {
  dataMantencion: SeguimientoRow[];
  dataInfra: SeguimientoRow[];
}

export const SeguimientoView = ({ dataMantencion, dataInfra }: SeguimientoViewProps) => {
  const [tab, setTab] = useState<"MANT" | "INFRA">("MANT");

  const dataActual = tab === "MANT" ? dataMantencion : dataInfra;

  // Cálculo de conteo distinto (Distinct Count de NRO_OT)
  const uniqueOTs = new Set(dataActual.map(r => r.nroOT)).size;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header y Stats */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl border border-pf-border shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Seguimiento OTs</h2>
          <p className="text-slate-400 text-sm font-medium">Clasificación automática de operaciones y fallas.</p>
        </div>
        
        <div className="flex items-center space-x-6 mt-4 md:mt-0">
           <div className="text-right">
             <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Filas</p>
             <p className="text-2xl font-black text-slate-800">{dataActual.length}</p>
           </div>
           <div className="h-10 w-px bg-slate-200"></div>
           <div className="text-right">
             <p className="text-[10px] font-bold uppercase tracking-widest text-pf-red">OTs Únicas</p>
             <p className="text-3xl font-black text-pf-red">{uniqueOTs}</p>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/50 rounded-2xl w-fit">
        <button
          onClick={() => setTab("MANT")}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
            tab === "MANT" ? "bg-white text-pf-red shadow-md" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Hammer size={18} />
          <span>MANTENCIÓN</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] text-slate-500 ml-2">
            {dataMantencion.length}
          </span>
        </button>
        <button
          onClick={() => setTab("INFRA")}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
            tab === "INFRA" ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <HardHat size={18} />
          <span>INFRAESTRUCTURA</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] text-slate-500 ml-2">
            {dataInfra.length}
          </span>
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-pf-border rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nro OT</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Clase</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Planta Origen</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dataActual.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="p-10 text-center text-slate-400 italic">No hay datos en esta categoría.</td>
                 </tr>
              ) : (
                dataActual.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-bold text-slate-700">{row.nroOT}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        row.clase === 'MPS' ? 'bg-orange-100 text-orange-600' :
                        row.clase.includes('PF') ? 'bg-blue-100 text-blue-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {row.clase}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600 truncate max-w-md" title={row.descripcion}>
                      {row.descripcion}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500 font-medium">{row.planta}</td>
                    <td className="px-6 py-3 text-xs text-slate-500">{row.estado}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};