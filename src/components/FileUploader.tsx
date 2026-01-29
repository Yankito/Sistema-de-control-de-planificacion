// src/components/FileUploader.tsx
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Clock, 
  History, 
  FileCheck2, 
  AlertTriangle // Importamos icono para Fallas
} from "lucide-react";
import { useState } from "react";

interface FileUploaderProps {
  // Agregamos 'FALLAS' al tipo
  onFileUpload: (e: any, tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR' | 'SEGUIMIENTO' | 'FALLAS') => void;
  isLoading: boolean;
  status: { 
    plan: boolean; 
    atrasos: boolean; 
    anterior: boolean; 
    seguimiento: boolean;
    fallas: boolean; // Agregamos estado fallas
  };
}

export const FileUploader = ({ onFileUpload, isLoading, status }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    
    // Lógica inteligente de detección por nombre
    let tipo: 'PLAN' | 'ATRASOS' | 'ANTERIOR' | 'SEGUIMIENTO' | 'FALLAS' = 'PLAN';
    
    if (name.includes("resumen") || name.includes("historico")) {
      tipo = 'ANTERIOR';
    } else if (name.includes("atraso") || name.includes("cumplimiento") || name.includes("kpi")) {
      tipo = 'ATRASOS';
    } else if (name.includes("s") && (name.includes("stgo") || name.includes("seguimiento"))) {
      // Ajusté un poco la lógica de seguimiento para ser más específica
      tipo = 'SEGUIMIENTO';
    } else if (name.includes("mtbf") || name.includes("mttr") || name.includes("falla")) {
      // Nueva detección para fallas
      tipo = 'FALLAS';
    }
    
    console.log("Detectado tipo de archivo:", tipo);

    const fakeEvent = { target: { files: [file] } } as any;
    onFileUpload(fakeEvent, tipo);
  };

  return (
    <div className="max-w-5xl mx-auto mt-2">
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-[2rem] p-10 transition-all duration-300
          ${isDragging ? "border-pf-red bg-pf-red/5 scale-[1.01]" : "border-slate-200 bg-white"}
          ${isLoading ? "cursor-wait" : "cursor-default"}
        `}
      >
        {/* OVERLAY DE CARGA */}
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-[2rem] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-20 h-20 relative">
               <div className="absolute inset-0 border-4 border-pf-red/20 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-pf-red rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 font-black text-slate-800 animate-pulse uppercase tracking-widest text-xs">
              Procesando Datos...
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">Por favor, no cierres la ventana</p>
          </div>
        )}

        <div className={`flex flex-col items-center ${isLoading ? 'blur-sm' : ''}`}>
          
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-slate-50 text-pf-red`}>
            <UploadCloud size={32} />
          </div>

          <h2 className="text-xl font-black text-slate-800 mb-2">
            {isDragging ? "¡Suéltalo aquí!" : "Gestión de Reportes"}
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">
            Arrastra los archivos o selecciona manualmente
          </p>

          {/* GRID: Ajustado para acomodar 5 botones de forma estética */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
            
            {/* 1. Maestro Plan */}
            <label className={`flex items-center p-4 rounded-2xl font-bold text-white transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-95 ${status.plan ? 'bg-green-600' : 'bg-pf-red'}`}>
              <FileSpreadsheet size={20} className="mr-3 flex-shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs">Maestro Plan</span>
                <span className="text-[9px] opacity-80 uppercase">{status.plan ? '✓ Activo' : 'Subir B.ACT'}</span>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => onFileUpload(e, 'PLAN')} disabled={isLoading} />
            </label>

            {/* 2. Reporte Actual */}
            <label className={`flex items-center p-4 rounded-2xl font-bold text-white transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-95 ${status.atrasos ? 'bg-green-600' : 'bg-slate-800'}`}>
              <Clock size={20} className="mr-3 flex-shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs">Reporte Actual</span>
                <span className="text-[9px] opacity-80 uppercase">{status.atrasos ? '✓ Cargado' : 'Subir KPI'}</span>
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

            {/* 4. Seguimiento OT */}
            <label className={`flex items-center p-4 rounded-2xl font-bold transition-all cursor-pointer shadow-md border-2 hover:scale-[1.02] active:scale-95 ${
              status.seguimiento 
                ? 'bg-purple-600 border-purple-600 text-white' 
                : 'bg-white border-slate-200 text-purple-600 hover:border-purple-400'
            }`}>
              <FileCheck2 size={20} className={`mr-3 flex-shrink-0 ${status.seguimiento ? 'text-white' : 'text-purple-500'}`} />
              <div className="flex flex-col leading-tight">
                <span className="text-xs">Seguimiento OT</span>
                <span className="text-[9px] opacity-80 uppercase">{status.seguimiento ? '✓ Procesado' : 'Subir Excel'}</span>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => onFileUpload(e, 'SEGUIMIENTO')} disabled={isLoading} />
            </label>

            {/* 5. NUEVO: Fallas / MTBF (Color Ámbar) */}
            <label className={`flex items-center p-4 rounded-2xl font-bold transition-all cursor-pointer shadow-md border-2 hover:scale-[1.02] active:scale-95 ${
              status.fallas 
                ? 'bg-amber-500 border-amber-500 text-white' 
                : 'bg-white border-slate-200 text-amber-500 hover:border-amber-400'
            }`}>
              <AlertTriangle size={20} className={`mr-3 flex-shrink-0 ${status.fallas ? 'text-white' : 'text-amber-500'}`} />
              <div className="flex flex-col leading-tight">
                <span className="text-xs">Fallas / MTBF</span>
                <span className="text-[9px] opacity-80 uppercase">{status.fallas ? '✓ Cargado' : 'Subir Detalle'}</span>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => onFileUpload(e, 'FALLAS')} disabled={isLoading} />
            </label>

          </div>
        </div>
      </div>
    </div>
  );
};