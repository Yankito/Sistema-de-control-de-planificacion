import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";

interface ExportButtonProps {
  elementId: string;
  fileName: string;
}

export const ExportButton = ({ elementId, fileName }: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const node = document.getElementById(elementId);
    if (!node) {
      alert("No se encontró el contenido para exportar.");
      return;
    }

    if (isExporting) return;
    setIsExporting(true);

    try {
      // 1. CLONAR
      const clone = node.cloneNode(true) as HTMLElement;

      // 2. CONFIGURAR EL CONTENEDOR FANTASMA
      // "height: auto" es vital aquí para que el contenedor crezca con el contenido expandido
      Object.assign(clone.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "1280px", // Ancho fijo HD
        zIndex: "-9999",
        backgroundColor: "#f8fafc",
        height: "auto", 
        minHeight: "100vh",
        overflow: "visible",
        maxHeight: "none",
      });

      // 3. EXPANSIÓN AGRESIVA (La solución al corte)
      // Buscamos todos los elementos dentro del clon y reseteamos sus alturas
      const allElements = clone.querySelectorAll('*');
      
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        
        // Si el elemento tiene scroll, lo expandimos
        if (style.overflowY === 'auto' || style.overflow === 'auto' || htmlEl.classList.contains('custom-scrollbar')) {
            htmlEl.style.overflow = 'visible';
            htmlEl.style.height = 'auto';
            htmlEl.style.maxHeight = 'none';
        }

        // Si el elemento tiene una altura fija definida por Tailwind (ej: h-[500px]), la quitamos
        // Esto asegura que las tarjetas crezcan para acomodar la lista de 20 items
        if (htmlEl.classList.toString().includes('h-[')) {
             htmlEl.style.height = 'auto';
        }
      });

      // 4. RESET DE ESTILOS Y ANIMACIONES
      const styleReset = document.createElement("style");
      styleReset.innerHTML = `
        * {
          transition: none !important;
          animation: none !important;
          opacity: 1 !important;
        }
        /* Forzamos a las tarjetas a crecer */
        .h-\\[500px\\] { height: auto !important; min-height: 500px !important; }
        .overflow-auto, .overflow-y-auto { overflow: visible !important; height: auto !important; }
      `;
      clone.appendChild(styleReset);

      // 5. HEADER PROFESIONAL
      const headerReport = document.createElement('div');
      headerReport.style.cssText = `
        background: white;
        padding: 40px;
        margin-bottom: 20px;
        border-bottom: 4px solid #ef4444;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: sans-serif;
      `;
      
      headerReport.innerHTML = `
        <div>
          <h1 style="font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase;">
            Reporte de Activos
          </h1>
          <p style="font-size: 14px; color: #64748b; margin: 5px 0 0 0; font-weight: 500;">
            Generado el: ${new Date().toLocaleDateString('es-CL')}
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: 900; color: #ef4444;">PF ALIMENTOS</div>
        </div>
      `;
      clone.prepend(headerReport);

      // 6. INYECTAR Y MEDIR
      document.body.appendChild(clone);
      
      // Espera crítica para renderizado
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Medimos la altura REAL final del clon expandido
      const finalHeight = clone.scrollHeight;

      // 7. CAPTURA
      // Le pasamos la altura explícita a toPng para que no corte nada
      const dataUrl = await toPng(clone, {
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#f8fafc',
        width: 1280,
        height: finalHeight + 50, // Un poco de margen extra abajo
        canvasHeight: finalHeight + 50
      });

      // 8. DESCARGA
      const link = document.createElement('a');
      link.download = `${fileName}_TopReport.png`;
      link.href = dataUrl;
      link.click();

      document.body.removeChild(clone);

    } catch (err) {
      console.error("Error exportando:", err);
      alert("Error al generar la imagen.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting}
      className={`
        flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 border border-slate-800
        ${isExporting 
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
          : 'bg-slate-900 text-white hover:bg-black hover:shadow-pf-red/20'}
      `}
    >
      {isExporting ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Generando...</span>
        </>
      ) : (
        <>
          <Download size={16} />
          <span>Exportar Reporte</span>
        </>
      )}
    </button>
  );
};