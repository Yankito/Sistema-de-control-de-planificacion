import { FileSpreadsheet, UploadCloud, Clock, History } from "lucide-react";
import { useState } from "react";

interface FileUploaderProps {
  onFileUpload: (e: any, tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR') => void;
  isLoading: boolean;
  // Actualizamos status para incluir el reporte anterior
  status: { plan: boolean; atrasos: boolean; anterior: boolean };
}

export const FileUploader = ({ onFileUpload, isLoading, status }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    
    // Lógica inteligente de detección por nombre
    let tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR' = 'PLAN';
    
    if (name.includes("resumen") || name.includes("historico")) {
      tipo = 'ANTERIOR';
    } else if (name.includes("atraso") || name.includes("cumplimiento") || name.includes("kpi")) {
      tipo = 'ATRASOS';
    }

    const fakeEvent = { target: { files: [file] } } as any;
    onFileUpload(fakeEvent, tipo);
  };

  return (
    <div className="max-w-5xl mx-auto mt-2">
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-[2rem] p-10 transition-all duration-300
          ${isDragging 
            ? "border-pf-red bg-pf-red/5 scale-[1.01] shadow-xl shadow-pf-red/5" 
            : "border-slate-200 bg-white shadow-sm"}
          ${isLoading ? "opacity-60 cursor-wait" : "cursor-default"}
        `}
      >
        <div className="flex flex-col items-center">
          <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500
            ${isDragging ? "bg-pf-red text-white -rotate-12 scale-110" : "bg-slate-50 text-pf-red"}
          `}>
            <UploadCloud size={32} className={isDragging ? "animate-bounce" : ""} />
          </div>

          <h2 className="text-xl font-black text-slate-800 mb-2">
            {isDragging ? "¡Suéltalo aquí!" : "Gestión de Reportes"}
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">
            Arrastra los archivos o selecciona manualmente
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            
            {/* 1. Maestro Plan */}
            <label className={`flex items-center p-4 rounded-2xl font-bold text-white transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-95 ${status.plan ? 'bg-green-600' : 'bg-pf-red'}`}>
              <FileSpreadsheet size={20} className="mr-3 flex-shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs">Maestro Plan</span>
                <span className="text-[9px] opacity-80 uppercase">{status.plan ? '✓ Activo' : 'Subir B.ACT'}</span>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => onFileUpload(e, 'PLAN')} disabled={isLoading} />
            </label>

            {/* 2. Reporte Actual (SAP) */}
            <label className={`flex items-center p-4 rounded-2xl font-bold text-white transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-95 ${status.atrasos ? 'bg-green-600' : 'bg-slate-800'}`}>
              <Clock size={20} className="mr-3 flex-shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs">Reporte Actual</span>
                <span className="text-[9px] opacity-80 uppercase">{status.atrasos ? '✓ Cargado' : 'Subir KPI SAP'}</span>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => onFileUpload(e, 'ATRASOS')} disabled={isLoading} />
            </label>

            {/* 3. Comparativo Histórico */}
            <label className={`flex items-center p-4 rounded-2xl font-bold transition-all cursor-pointer shadow-md border-2 hover:scale-[1.02] active:scale-95 ${
              status.anterior 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'
            }`}>
              <History size={20} className={`mr-3 flex-shrink-0 ${status.anterior ? 'text-white' : 'text-blue-500'}`} />
              <div className="flex flex-col leading-tight">
                <span className="text-xs">Histórico</span>
                <span className="text-[9px] opacity-80 uppercase">{status.anterior ? '✓ Comparando' : 'Subir Resumen'}</span>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => onFileUpload(e, 'ANTERIOR')} disabled={isLoading} />
            </label>

          </div>
        </div>
      </div>
    </div>
  );
};