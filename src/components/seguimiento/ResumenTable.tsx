import { Search, TrendingUp, TrendingDown, Minus, CheckCircle } from "lucide-react";
import { AtrasoRow } from "../../logic/atrasosProcessor";

interface ResumenProps {
  titulo: string;
  dataset: AtrasoRow[];
  datasetAnt: AtrasoRow[];
  esOB: boolean;
  modoVista: "ATRASOS" | "CUMPLIDAS";
  isGlobal?: boolean;
  onDetail: (cat?: string) => void;
}

export const ResumenTable = ({ titulo, dataset, datasetAnt, esOB, modoVista, isGlobal, onDetail }: ResumenProps) => {
  const categorias = ["TECNICO / SERVICIO", "PROGRAMADOR", "OC / OTRO"];

  const renderDiff = (actual: number, anterior: number) => {
    if (!datasetAnt || datasetAnt.length === 0) return null;
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
            <td className="w-24 py-1">
              <div className="flex items-center justify-center">
                2025 {renderDiff(getCount(dataset, "2025"), getCount(datasetAnt, "2025"))}
              </div>
            </td>
            <td className="w-24 py-1">
              <div className="flex items-center justify-center">
                ENE-26 {renderDiff(getCount(dataset, "ENE-26"), getCount(datasetAnt, "ENE-26"))}
              </div>
            </td>
            <td className="text-center w-14">S/A</td>
          </tr>
        </thead>
        <tbody>
          {modoVista === "ATRASOS" ? (
            <>
              {/* FILA DE TOTAL ATRASOS */}
              <tr onClick={() => onDetail()} className="border-b border-slate-100 bg-slate-50/30 hover:bg-slate-50 cursor-pointer font-black text-slate-900">
                <td className="px-3 py-2 uppercase text-left">TOTAL ATRASOS</td>
                <td>
                  <div className="flex items-center justify-center">
                    {getCount(dataset, "2025")} {renderDiff(getCount(dataset, "2025"), getCount(datasetAnt, "2025"))}
                  </div>
                </td>
                <td>
                  <div className="flex items-center justify-center">
                    {getCount(dataset, "ENE-26")} {renderDiff(getCount(dataset, "ENE-26"), getCount(datasetAnt, "ENE-26"))}
                  </div>
                </td>
                <td className="text-center text-slate-400">{getCount(dataset, "S/A")}</td>
              </tr>
              
              {/* FILAS DE CATEGORÍAS */}
              {categorias.map(cat => (
                <tr key={cat} onClick={() => onDetail(cat)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer text-slate-600">
                  <td className="px-3 py-1.5 font-bold uppercase text-left pl-6 text-[10px]">{cat}</td>
                  <td>
                    <div className="flex items-center justify-center">
                      {getCount(dataset, "2025", cat)} {renderDiff(getCount(dataset, "2025", cat), getCount(datasetAnt, "2025", cat))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-center font-bold">
                      {getCount(dataset, "ENE-26", cat)} {renderDiff(getCount(dataset, "ENE-26", cat), getCount(datasetAnt, "ENE-26", cat))}
                    </div>
                  </td>
                  <td className="text-center text-slate-300">{getCount(dataset, "S/A", cat)}</td>
                </tr>
              ))}
            </>
          ) : (
            /* MODO CUMPLIDAS */
            <tr onClick={() => onDetail()} className="hover:bg-green-50/50 cursor-pointer font-bold text-green-700">
              <td className="px-3 py-3 uppercase text-left">TOTAL FINALIZADAS</td>
              <td>
                <div className="flex items-center justify-center text-lg">
                  {getCount(dataset, "2025")} {renderDiff(getCount(dataset, "2025"), getCount(datasetAnt, "2025"))}
                </div>
              </td>
              <td>
                <div className="flex items-center justify-center text-lg">
                  {getCount(dataset, "ENE-26")} {renderDiff(getCount(dataset, "ENE-26"), getCount(datasetAnt, "ENE-26"))}
                </div>
              </td>
              <td className="text-center text-slate-300">{getCount(dataset, "S/A")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};