// src/views/MaestroView.tsx
import { DataTable } from "../components/DataTable";

export const MaestroView = ({ datosCrudos, plantas, plantaSeleccionada, onCambiarPlanta }: any) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-pf-border shadow-sm flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900">Maestro de Órdenes (B.ACT)</h3>
        <select 
          value={plantaSeleccionada}
          onChange={(e) => onCambiarPlanta(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-600"
        >
          {plantas.map((p: string) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="bg-white border border-pf-border rounded-3xl shadow-sm overflow-hidden">
        <DataTable data={datosCrudos} isPlan={false} />
      </div>
    </div>
  );
};