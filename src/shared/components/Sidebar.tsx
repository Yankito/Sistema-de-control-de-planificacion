// components/Sidebar.tsx
import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, Calendar, CalendarCheck, RotateCcw, Clock,
  ClipboardList, BarChart2, ChevronLeft, ChevronRight, Briefcase, ChevronDown
} from "lucide-react";
import { SidebarItem } from "./SidebarItem";

interface SidebarProps {
  archivoCargado: boolean;
  tieneSeguimiento: boolean;
  tieneFallas: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLimpiar: () => void;
}

export const Sidebar = ({
  archivoCargado, tieneSeguimiento, tieneFallas,
  activeTab, setActiveTab, onLimpiar
}: SidebarProps) => {

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const hayDatos = archivoCargado || tieneSeguimiento || tieneFallas;

  const menuStructure = useMemo(() => [
    { type: 'link', id: 'dash', label: 'Dashboard', icon: LayoutDashboard, locked: false },
    {
      type: 'group',
      id: 'group-plan',
      label: 'Planificación',
      icon: Briefcase,
      locked: !archivoCargado,
      children: [
        { id: 'plan', label: 'Asignación Horaria', icon: CalendarCheck },
        { id: 'gantt', label: 'Gantt Turnos', icon: Calendar },
        { id: 'carga', label: 'Seguimiento Técnicos', icon: ClipboardList },
      ]
    },
    { type: 'link', id: 'seguimiento', label: 'Atrasos / KPI', icon: Clock, locked: !tieneSeguimiento },
    { type: 'link', id: 'fallas', label: 'Fallas Activos', icon: BarChart2, locked: !tieneFallas },
  ], [archivoCargado, tieneSeguimiento, tieneFallas]);

  // Efecto para auto-abrir grupos
  useEffect(() => {
    menuStructure.forEach((item: any) => {
      if (item.type === 'group' && item.children?.some((c: any) => c.id === activeTab)) {
        setOpenGroups(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
      }
    });
  }, [activeTab, menuStructure]);

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenGroups(prev => prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]);
  };

  return (
    <aside className={`bg-pf-sidebar border-r border-pf-border flex flex-col h-full shadow-sm transition-all duration-300 relative z-50 ${isCollapsed ? 'w-20' : 'w-64'}`}>

      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 bg-white border border-pf-border rounded-full p-1 text-slate-400 hover:text-pf-red shadow-sm z-50 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* HEADER */}
      <div className={`p-6 flex flex-col items-center transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        <img
          src="./Logo_PF_Alimentos.png"
          alt="PF Logo"
          className={`object-contain transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-32 mb-4'}`}
        />
        <div className={`h-0.5 w-16 bg-pf-red/20 rounded-full transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}></div>
        <p className={`text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold text-center mt-2 whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`}>
          Control Industrial
        </p>
      </div>

      {/* MENU NAV */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-x-hidden overflow-y-auto custom-scrollbar">
        {menuStructure.map((item: any) => {

          // RENDER: GRUPO
          if (item.type === 'group') {
            const isOpen = openGroups.includes(item.id);
            const hasActiveChild = item.children.some((c: any) => c.id === activeTab);

            return (
              <div key={item.id} className="mb-2">
                {/* Cabecera del Grupo */}
                <button
                  onClick={() => !item.locked && toggleGroup(item.id)}
                  disabled={item.locked}
                  className={`
                    flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative
                    ${isCollapsed ? 'justify-center' : 'justify-between'}
                    ${item.locked ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-slate-100'}
                    ${hasActiveChild && !isOpen ? 'bg-slate-50 text-pf-red' : 'text-slate-600'}
                  `}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4'}`}>
                    <item.icon size={20} className={hasActiveChild ? 'text-pf-red' : ''} />
                    <span className={`font-black text-sm uppercase tracking-tight transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-4'}`}>
                      {item.label}
                    </span>
                  </div>
                  {!isCollapsed && !item.locked && (
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Hijos del Grupo */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen && !isCollapsed ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  <div className="ml-4 pl-2 border-l-2 border-slate-100 space-y-1 mt-1">
                    {item.children.map((child: any) => (
                      <SidebarItem
                        key={child.id}
                        id={child.id}
                        label={child.label}
                        icon={child.icon}
                        isActive={activeTab === child.id}
                        isCollapsed={false} // Siempre expandido en la sub-vista
                        onClick={() => setActiveTab(child.id)}
                        className="py-2 text-xs font-medium" // Estilo override para hijos
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // RENDER: ITEM SIMPLE
          return (
            <SidebarItem
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              isActive={activeTab === item.id}
              isCollapsed={isCollapsed}
              locked={item.locked}
              onClick={() => setActiveTab(item.id)}
              className="py-2 text-sm font-medium"
            />
          );
        })}

        {/* BOTÓN REINICIAR */}
        {hayDatos && (
          <div className="pt-4 mt-4 border-t border-pf-border/50">
            <SidebarItem
              id="reset"
              label="Reiniciar Sistema"
              icon={RotateCcw}
              isActive={false}
              isCollapsed={isCollapsed}
              onClick={onLimpiar}
              className="text-slate-400 hover:text-pf-red hover:bg-pf-red/5"
            />
          </div>
        )}
      </nav>

      {/* FOOTER STATUS */}
      <div className={`border-t border-pf-border transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-6'}`}>
        <div className={`flex items-center bg-slate-50 rounded-xl border border-pf-border transition-all duration-300 ${isCollapsed ? 'justify-center p-2 aspect-square' : 'space-x-3 p-3'}`}>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hayDatos ? 'bg-green-500 shadow-green-200 shadow-md' : 'bg-slate-300'}`}></div>
          <div className={`flex flex-col overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
            <span className="text-[10px] font-bold text-slate-600 uppercase">Complejo Ind.</span>
            <span className="text-[9px] text-slate-400 font-medium">{hayDatos ? 'SISTEMA ONLINE' : 'ESPERANDO DATOS'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};