// src/components/DataTable.tsx
export const DataTable = ({ data, isPlan }: { data: any[], isPlan: boolean }) => {
  if (!data || data.length === 0) return <div className="p-20 text-center text-slate-400">Sin datos.</div>;

  const headers = isPlan 
    ? ["Nro Orden", "Equipo", "Descripción Mant", "Fecha Sugerida", "Mecánico (Rol)"]
    : ["Pedido de Trabajo", "Número de Activo", "Descripción", "Departamento de Propiedad", "Estado"]; 

  const keyMap: Record<string, string> = {
    "Pedido de Trabajo": "PEDIDO DE TRABAJO",
    "Número de Activo": "NÚMERO DE ACTIVO",
    "Descripción": "DESCRIPCIÓN",
    "Departamento de Propiedad": "DEPARTAMENTO DE PROPIEDAD",
    "Estado": "ESTADO"
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            {headers.map(h => (
              <th key={h} className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-pf-red/5">
              {isPlan ? (
                <>
                  <td className="px-6 py-4 text-sm font-bold">{row.nroOrden}</td>
                  <td className="px-6 py-4 text-sm">{row.equipo}</td>
                  <td className="px-6 py-4 text-sm">{row.descripcion}</td>
                  <td className="px-6 py-4 text-sm font-black text-pf-red">{row.fechaSugerida}</td>
                  <td className="px-6 py-4 text-sm italic">{row.mecanico} ({row.rol})</td>
                </>
              ) : (
                headers.map(h => (
                  <td key={h} className="px-6 py-4 text-sm text-slate-500">
                    {String(row[keyMap[h] || h.toUpperCase()] || "")}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};