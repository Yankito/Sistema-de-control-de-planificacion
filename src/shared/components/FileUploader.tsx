import { useState } from "react";
import { FileSpreadsheet, Clock, AlertTriangle, Loader2, CalendarDays, Check } from "lucide-react";
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

  const [pendingFile, setPendingFile] = useState<{ event: any, tipo: FileType } | null>(null);

  const cardsConfig = [
    { type: 'PLAN' as FileType, label: 'Maestro Plan', sublabel: 'Arrastra "B.ACT.xlsx" aquí', icon: FileSpreadsheet, color: 'text-pf-red', bg: 'bg-pf-red', active: status.plan },
    { type: 'SEGUIMIENTO' as FileType, label: 'Reporte Actual', sublabel: 'Arrastra "KPI Cumplimiento"', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-600', active: status.seguimiento },
    { type: 'FALLAS' as FileType, label: 'Fallas / MTBF', sublabel: 'Arrastra detalle de avisos', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500', active: status.fallas }
  ];

  // Interceptor de subida
  const handleInternalUpload = (e: any, tipo: FileType) => {
    if (tipo === 'SEGUIMIENTO') {
      // Si es seguimiento, abrimos el modal de confirmación de semana
      setPendingFile({ event: e, tipo });
    } else {
      // Para los otros, subida directa
      onFileUpload(e, tipo);
    }
  };

  const confirmUpload = () => {
    if (pendingFile) {
      onFileUpload(pendingFile.event, pendingFile.tipo);
      setPendingFile(null);
    }
  };

  return (
    <div className="relative scroll-mt-10" id="uploader-section">
      <div className="flex justify-between items-end mb-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Zona de Carga</h3>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE SEMANA */}
      {pendingFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full mx-4 space-y-6">
            <div className="flex items-center gap-4 text-blue-600">
              <div className="p-3 bg-blue-50 rounded-2xl">
                <CalendarDays size={32} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-800 leading-tight">Confirmar Semana</h4>
                <p className="text-xs text-slate-400 font-bold uppercase">Reporte de Seguimiento</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Selecciona la semana del reporte:</label>
              <select
                value={targetWeek}
                onChange={(e) => setTargetWeek(e.target.value)}
                className="w-full text-base font-black text-slate-700 bg-white border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 ring-blue-500/20"
              >
                {weekOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPendingFile(null)}
                className="flex-1 px-6 py-3 rounded-xl font-black text-xs text-slate-400 hover:bg-slate-100 transition-all uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpload}
                className="flex-[2] bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 uppercase"
              >
                <Check size={16} /> Procesar Reporte
              </button>
            </div>
          </div>
        </div>
      )}

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
            onUpload={handleInternalUpload}
          />
        ))}
      </div>
    </div>
  );
};