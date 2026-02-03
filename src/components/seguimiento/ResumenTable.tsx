import { Search, TrendingUp, TrendingDown, Minus, CheckCircle } from "lucide-react";
import { AtrasoRow } from "../../types";
import { useMemo } from "react";

interface ResumenProps {
  titulo: string;
  dataset: AtrasoRow[];
  datasetAnt: AtrasoRow[];
  esOB: boolean;
  modoVista: "ATRASOS" | "CUMPLIDAS";
  isGlobal?: boolean;
  showComparison?: boolean; // NUEVA PROP
  onDetail: (cat?: string) => void;
}

export const ResumenTable = ({ titulo, dataset, datasetAnt, esOB, modoVista, isGlobal, showComparison = false, onDetail }: ResumenProps) => {
  const categorias = ["TECNICO / SERVICIO", "PROGRAMADOR", "OC / OTRO"];

  const sortPeriods = (a: string, b: string) => {
      if (a === "S/A") return 1;
      if (b === "S/A") return -1;
      if (a === "2025") return -1; 
      if (b === "2025") return 1;
      const meses: Record<string, number> = { "ENE": 0, "FEB": 1, "MAR": 2, "ABR": 3, "MAY": 4, "JUN": 5, "JUL": 6, "AGO": 7, "SEP": 8, "OCT": 9, "NOV": 10, "DIC": 11 };
      const [mesA, anioA] = a.split('-');
      const [mesB, anioB] = b.split('-');
      if (!anioA || !anioB) return a.localeCompare(b);
      if (anioA !== anioB) return parseInt(anioA) - parseInt(anioB);
      return meses[mesA] - meses[mesB];
  };

  const columnasPeriodo = useMemo(() => {
      const setPeriodos = new Set<string>();
      // Solo tomamos columnas del dataset actual para no mostrar columnas vacías si el anterior tenía otros años
      dataset.forEach(d => {
          if (d.periodo && d.periodo !== "S/A") setPeriodos.add(d.periodo);
      });
      // Si hay comparación, agregamos también las columnas del anterior por si acaso (opcional)
      if (showComparison) {
          datasetAnt.forEach(d => { if(d.periodo && d.periodo !== "S/A") setPeriodos.add(d.periodo); });
      }
      return Array.from(setPeriodos).sort(sortPeriods);
  }, [dataset, datasetAnt, showComparison]);

  const renderDiff = (actual: number, anterior: number) => {
    // CORRECCIÓN: Si showComparison es false, no renderizamos nada
    if (!showComparison || !datasetAnt) return null;
    
    const diff = actual - anterior;
    if (diff === 0) return <span className="text-slate-400 ml-1"><Minus size={10} /></span>;
    const mejoro = modoVista === "CUMPLIDAS" ? diff > 0 : diff < 0;
    const color = mejoro ? "text-green-600" : "text-red-600";
    return (
      <span className={`flex items-center gap-0.5 font-black text-[10px] ml-1 ${color}`}>
        {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(diff)}
      </span>
    );
  };

  const getCount = (data: AtrasoRow[], per: string, cat?: string) => {
    let filtered = data.filter(d => d.periodo === per);
    if (cat) filtered = filtered.filter(d => d.clasificacion === cat);
    return filtered.length;
  };

  return (
    <div className="rounded-xl border overflow-hidden shadow-sm mb-6 bg-white">
      <table className="w-full text-[11px]">
        <thead>
          <tr 
            onClick={() => onDetail()} 
            className={`${modoVista === 'ATRASOS' ? (isGlobal ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900') : (isGlobal ? 'bg-green-800 text-white' : 'bg-green-50 text-slate-900')} font-black cursor-pointer group`}
          >
            <td className="px-3 py-2 text-xs uppercase flex items-center justify-between">
              <span className="flex items-center gap-2">{modoVista === 'CUMPLIDAS' && <CheckCircle size={12}/>} {titulo} {esOB ? '(OB)' : '(OM)'}</span>
              <Search size={12} className="opacity-20 group-hover:opacity-100" />
            </td>
            {columnasPeriodo.map(p => (
                <td key={p} className="w-24 py-1 text-center border-l border-white/10">
                    <div className="flex items-center justify-center">
                        {p}
                    </div>
                </td>
            ))}
            <td className="text-center w-14 border-l border-white/10">S/A</td>
          </tr>
        </thead>
        <tbody>
          {modoVista === "ATRASOS" ? (
            <>
              <tr onClick={() => onDetail()} className="border-b border-slate-100 bg-slate-50/30 hover:bg-slate-50 cursor-pointer font-black text-slate-900">
                <td className="px-3 py-2 uppercase text-left">TOTAL ATRASOS</td>
                {columnasPeriodo.map(p => (
                    <td key={p} className="text-center">
                        <div className="flex items-center justify-center">
                            {getCount(dataset, p)} {renderDiff(getCount(dataset, p), getCount(datasetAnt, p))}
                        </div>
                    </td>
                ))}
                <td className="text-center text-slate-400">{getCount(dataset, "S/A")}</td>
              </tr>
              {categorias.map(cat => (
                <tr key={cat} onClick={() => onDetail(cat)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer text-slate-600">
                  <td className="px-3 py-1.5 font-bold uppercase text-left pl-6 text-[10px]">{cat}</td>
                  {columnasPeriodo.map(p => (
                    <td key={p} className="text-center">
                        <div className="flex items-center justify-center">
                            {getCount(dataset, p, cat)} {renderDiff(getCount(dataset, p, cat), getCount(datasetAnt, p, cat))}
                        </div>
                    </td>
                  ))}
                  <td className="text-center text-slate-300">{getCount(dataset, "S/A", cat)}</td>
                </tr>
              ))}
            </>
          ) : (
            <tr onClick={() => onDetail()} className="hover:bg-green-50/50 cursor-pointer font-bold text-green-700">
              <td className="px-3 py-3 uppercase text-left">TOTAL FINALIZADAS</td>
              {columnasPeriodo.map(p => (
                <td key={p} className="text-center">
                    <div className="flex items-center justify-center text-lg">
                        {getCount(dataset, p)} {renderDiff(getCount(dataset, p), getCount(datasetAnt, p))}
                    </div>
                </td>
              ))}
              <td className="text-center text-slate-300">{getCount(dataset, "S/A")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};