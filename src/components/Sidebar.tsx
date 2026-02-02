import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Calendar, 
  CalendarCheck,
  RotateCcw,
  Clock,
  Lock,
  ClipboardList,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Briefcase
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

  // Estado para controlar si el sidebar está colapsado
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Estado para controlar qué grupos están desplegados
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const hayDatos = archivoCargado || tieneAtrasos || tieneSeguimiento || tieneFallas;

  // Estructura del Menú Definida Jerárquicamente
  const menuStructure = [
    { 
      type: 'link', 
      id: 'dash', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      locked: false 
    },
    {
      type: 'group',
      label: 'Planificación',
      id: 'group-plan',
      icon: Briefcase, // Icono del grupo
      locked: !archivoCargado,
      children: [
        { id: 'plan', label: 'Asignación Horaria', icon: CalendarCheck },
        { id: 'gantt', label: 'Gantt Turnos', icon: Calendar },
        { id: 'carga', label: 'Seguimiento Técnicos', icon: ClipboardList },
      ]
    },
    { 
      type: 'link', 
      id: 'atrasos', 
      label: 'Atrasos / KPI', 
      icon: Clock, 
      locked: !tieneAtrasos 
    },
    { 
      type: 'link', 
      id: 'seguimiento', 
      label: 'Seguimiento OT', 
      icon: ClipboardList, 
      locked: !tieneSeguimiento 
    },
    { 
      type: 'link', 
      id: 'fallas', 
      label: 'Fallas Activos', 
      icon: BarChart2, 
      locked: !tieneFallas 
    },
  ];

  // Efecto: Cuando cambia el activeTab, aseguramos que el grupo padre esté abierto
  useEffect(() => {
    menuStructure.forEach(item => {
      if (item.type === 'group' && item.children) {
        const hasActiveChild = item.children.some(child => child.id === activeTab);
        if (hasActiveChild && !openGroups.includes(item.id)) {
          setOpenGroups(prev => [...prev, item.id]);
        }
      }
    });
  }, [activeTab]);

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) setIsCollapsed(false); // Si está cerrado y tocas un grupo, se abre el sidebar
    
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(g => g !== groupId) 
        : [...prev, groupId]
    );
  };

  return (
    <aside 
      className={`
        bg-pf-sidebar border-r border-pf-border flex flex-col h-full shadow-sm 
        transition-all duration-300 ease-in-out relative z-50
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Botón de Colapsar/Desplegar */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-white border border-pf-border rounded-full p-1 text-slate-400 hover:text-pf-red shadow-sm z-50 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* HEADER LOGO */}
      <div className={`p-6 flex flex-col items-center transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        <div className="flex flex-col items-center mb-2">
          <img 
            src="./Logo_PF_Alimentos.png" 
            alt="PF Logo" 
            className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-32 mb-4'}`} 
          />
          <div className={`h-0.5 w-16 bg-pf-red/20 rounded-full transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}></div>
        </div>
        
        <p className={`
            text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold text-center whitespace-nowrap overflow-hidden transition-all duration-300
            ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}
        `}>
          Control Industrial
        </p>
      </div>

      {/* NAV MENU */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-x-hidden overflow-y-auto custom-scrollbar">
        {menuStructure.map((item: any) => {
          
          // RENDERIZADO DE GRUPO
          if (item.type === 'group') {
            const isOpen = openGroups.includes(item.id);
            const isActiveGroup = item.children.some((c: any) => c.id === activeTab);

            return (
              <div key={item.id} className="mb-2">
                <button
                  onClick={() => !item.locked && toggleGroup(item.id)}
                  disabled={item.locked}
                  className={`
                    flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative
                    ${isCollapsed ? 'justify-center' : 'justify-between'}
                    ${item.locked ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-slate-100'}
                    ${isActiveGroup && !isOpen ? 'bg-slate-50 text-pf-red' : 'text-slate-600'}
                  `}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4'}`}>
                    <item.icon size={20} className={`min-w-[20px] ${isActiveGroup ? 'text-pf-red' : ''}`} />
                    <span className={`
                      font-black text-sm whitespace-nowrap overflow-hidden transition-all duration-300 uppercase tracking-tight
                      ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-4'}
                    `}>
                      {item.label}
                    </span>
                  </div>
                  
                  {/* Flecha e Icono Candado */}
                  {!isCollapsed && (
                    <div className="flex items-center">
                       {item.locked ? (
                         <Lock size={12} className="text-slate-400" />
                       ) : (
                         <ChevronDown 
                            size={14} 
                            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                         />
                       )}
                    </div>
                  )}
                </button>

                {/* SUB-ITEMS (DESPLEGABLE) */}
                <div className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${isOpen && !isCollapsed ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}
                `}>
                  <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1">
                    {item.children.map((sub: any) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id)}
                        className={`
                          flex items-center w-full p-2.5 rounded-lg transition-all duration-200 text-xs font-medium
                          ${activeTab === sub.id 
                            ? 'bg-pf-red text-white shadow-md translate-x-1' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                        `}
                      >
                         <sub.icon size={16} className="mr-3 min-w-[16px]" />
                         <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // RENDERIZADO DE LINK SIMPLE
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              disabled={item.locked}
              title={isCollapsed ? item.label : ''}
              className={`
                flex items-center w-full p-3 rounded-xl transition-all duration-200 group
                ${isCollapsed ? 'justify-center' : 'justify-between'}
                ${item.locked 
                  ? 'opacity-30 cursor-not-allowed grayscale' 
                  : 'hover:bg-slate-100'}
                ${activeTab === item.id 
                  ? 'bg-slate-800 text-white shadow-lg' 
                  : 'text-slate-500'}
              `}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4'}`}>
                <item.icon size={20} className={`min-w-[20px]`} />
                <span className={`
                  font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300
                  ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-4'}
                `}>
                  {item.label}
                </span>
              </div>
              {!isCollapsed && item.locked && <Lock size={12} className="text-slate-400 min-w-[12px]" />}
            </button>
          );
        })}

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