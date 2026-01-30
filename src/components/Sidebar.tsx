import { useState } from "react";
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Calendar, 
  CalendarCheck,
  RotateCcw,
  Clock,
  Lock,
  ClipboardList,
  BarChart2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export const Sidebar = ({ 
  archivoCargado, 
  tieneAtrasos, 
  tieneSeguimiento, 
  activeTab, 
  setActiveTab, 
  onLimpiar,
  tieneFallas
}: any) => {

  // Estado para controlar si está colapsado o expandido
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hayDatos = archivoCargado || tieneAtrasos || tieneSeguimiento || tieneFallas;

  const menuItems = [
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard, locked: false },
    { id: 'maestro', label: 'Maestro Excel', icon: FileSpreadsheet, locked: !archivoCargado },
    { id: 'plan', label: 'Planificación', icon: CalendarCheck, locked: !archivoCargado },
    { id: 'gantt', label: 'Gantt Turnos', icon: Calendar, locked: !archivoCargado },
    { id: 'carga', label: 'Seguimiento Técnicos', icon: ClipboardList, locked: !archivoCargado },
    { id: 'atrasos', label: 'Atrasos/KPI', icon: Clock, locked: !tieneAtrasos },
    { id: 'seguimiento', label: 'Seguimiento OT', icon: ClipboardList, locked: !tieneSeguimiento },
    { id: 'fallas', label: 'Fallas Activos', icon: BarChart2, locked: !tieneFallas },
  ];

  return (
    <aside 
      className={`
        bg-pf-sidebar border-r border-pf-border flex flex-col h-full shadow-sm 
        transition-all duration-300 ease-in-out relative
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Botón de Colapsar/Desplegar (Flotante en el borde) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-white border border-pf-border rounded-full p-1 text-slate-400 hover:text-pf-red shadow-sm z-50 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* HEADER LOGO */}
      <div className={`p-6 flex flex-col items-center transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        <div className="flex flex-col items-center mb-2">
          {/* Logo que se adapta */}
          <img 
            src="./Logo_PF_Alimentos.png" 
            alt="PF Logo" 
            className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-32 mb-4'}`} 
          />
          
          {/* Elementos decorativos que se ocultan al colapsar */}
          <div className={`h-0.5 w-16 bg-pf-red/20 rounded-full transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}></div>
        </div>
        
        {/* Texto de subtítulo */}
        <p className={`
            text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold text-center whitespace-nowrap overflow-hidden transition-all duration-300
            ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}
        `}>
          Control Industrial
        </p>
      </div>

      {/* NAV MENU */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-x-hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            disabled={item.locked}
            title={isCollapsed ? item.label : ''} // Tooltip nativo cuando está colapsado
            className={`
              flex items-center w-full p-3 rounded-xl transition-all duration-200 group
              ${isCollapsed ? 'justify-center' : 'justify-between'}
              ${item.locked 
                ? 'opacity-30 cursor-not-allowed grayscale' 
                : 'hover:bg-slate-100'}
              ${activeTab === item.id 
                ? 'bg-pf-red text-white shadow-lg' 
                : 'text-slate-500'}
            `}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4'}`}>
              <item.icon size={20} className={`min-w-[20px]`} />
              
              {/* Texto del menú */}
              <span className={`
                font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300
                ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-4'}
              `}>
                {item.label}
              </span>
            </div>

            {/* Candado */}
            {!isCollapsed && item.locked && <Lock size={12} className="text-slate-400 min-w-[12px]" />}
          </button>
        ))}

        {/* Separador y Botón de Limpiar */}
        {hayDatos && (
          <div className="pt-4 mt-4 border-t border-pf-border/50">
            <button
              onClick={onLimpiar}
              title="Reiniciar Sistema"
              className={`
                flex items-center w-full p-3 rounded-xl text-slate-400 hover:bg-pf-red/5 hover:text-pf-red transition-all group
                ${isCollapsed ? 'justify-center' : 'space-x-4'}
              `}
            >
              <RotateCcw size={20} className="group-hover:rotate-[-45deg] transition-transform min-w-[20px]" />
              <span className={`
                font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300
                ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
              `}>
                Reiniciar Sistema
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Footer de Estado */}
      <div className={`border-t border-pf-border transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-6'}`}>
        <div className={`
            flex items-center bg-slate-50 rounded-xl border border-pf-border transition-all duration-300
            ${isCollapsed ? 'justify-center p-2 aspect-square' : 'space-x-3 p-3'}
        `}>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hayDatos ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
          
          <div className={`
            flex flex-col overflow-hidden whitespace-nowrap transition-all duration-300
            ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}
          `}>
            <span className="text-[10px] font-bold text-slate-600 uppercase">Complejo Industrial</span>
            <span className="text-[9px] text-slate-400 font-medium">
              {hayDatos ? 'SISTEMA ONLINE' : 'ESPERANDO DATOS'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};