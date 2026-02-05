import { FileSpreadsheet, Clock, AlertTriangle, Loader2, CalendarDays } from "lucide-react";

import { UploadCard } from "./UploadCard";


export type FileType = 'PLAN' | 'SEGUIMIENTO' | 'FALLAS';

interface FileUploaderProps {
  onFileUpload: (e: any, tipo: FileType) => void;
  isLoading: boolean;
  status: { 
    plan: boolean; 
    seguimiento: boolean; 
    fallas: boolean;
  };
  highlightedModule: FileType | null;
  targetWeek: string;
  weekOptions: { label: string, value: string }[];
  setTargetWeek: (w: string) => void;
}


export const FileUploader = ({ onFileUpload, isLoading, status, highlightedModule, targetWeek, weekOptions, setTargetWeek }: FileUploaderProps) => {
  
  const cardsConfig = [
    { type: 'PLAN' as FileType, label: 'Maestro Plan', sublabel: 'Arrastra "B.ACT.xlsx" aquí', icon: FileSpreadsheet, color: 'text-pf-red', bg: 'bg-pf-red', active: status.plan },
    { type: 'SEGUIMIENTO' as FileType, label: 'Reporte Actual', sublabel: 'Arrastra "KPI Cumplimiento"', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-600', active: status.seguimiento },
    { type: 'FALLAS' as FileType, label: 'Fallas / MTBF', sublabel: 'Arrastra detalle de avisos', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500', active: status.fallas }
  ];

  return (
    <div className="relative scroll-mt-10" id="uploader-section">
      {/* HEADER DEL UPLOADER CON SELECTOR DE SEMANA */}
      <div className="flex justify-between items-end mb-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Zona de Carga</h3>
          
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
              <CalendarDays className="text-blue-600" size={18} />
              <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Asignar reporte a semana:</span>
                  <select 
                      value={targetWeek}
                      onChange={(e) => setTargetWeek(e.target.value)}
                      className="text-sm font-black text-slate-700 bg-transparent outline-none cursor-pointer min-w-[200px]"
                  >
                      {/* CORRECCIÓN VISUAL AQUÍ: Agregamos clases bg-white y text-slate-800 */}
                      {weekOptions.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-white text-slate-800 font-bold">
                            {opt.label}
                          </option>
                      ))}
                  </select>
              </div>
          </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center border border-slate-100">
            <Loader2 className="text-pf-red animate-spin mb-3" size={40} />
            <p className="font-black text-slate-800 uppercase tracking-widest text-xs">Procesando y Guardando...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cardsConfig.map((card) => (
          <UploadCard
            key={card.type}
            type={card.type}
            label={card.label}
            sublabel={card.sublabel}
            icon={card.icon}
            colorClass={card.color}
            bgClass={card.bg}
            isUploaded={card.active}
            isLoading={isLoading}
            isHighlighted={highlightedModule === card.type} 
            onUpload={onFileUpload}
          />
        ))}
      </div>
    </div>
  );
};