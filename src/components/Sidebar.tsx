// src/components/Sidebar.tsx
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Calendar, 
  CalendarCheck,
  RotateCcw,
  Clock,
  Lock
} from "lucide-react";

export const Sidebar = ({ archivoCargado, activeTab, setActiveTab, onLimpiar }: any) => {
  const menuItems = [
    { id: 'dash', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'maestro', label: 'Maestro Excel', icon: FileSpreadsheet },
    { id: 'plan', label: 'Planificación', icon: CalendarCheck }, // Agregada vista independiente
    { id: 'gantt', label: 'Gantt Turnos', icon: Calendar },
    { id: 'atrasos', label: 'Atrasos/KPI', icon: Clock },
  ];

  return (
    <aside className="w-64 bg-pf-sidebar border-r border-pf-border flex flex-col h-full shadow-sm">
      <div className="p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="./Logo_PF_Alimentos.png" alt="PF Logo" className="w-32 mb-4 object-contain" />
          <div className="h-0.5 w-16 bg-pf-red/20 rounded-full"></div>
        </div>
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold text-center">
          Control Industrial
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1.5">
        {menuItems.map((item) => (
          // Dentro del mapeo de menuItems en Sidebar.tsx
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            disabled={!archivoCargado && item.id !== 'dash'}
            className={`
              flex items-center justify-between w-full p-3 rounded-xl transition-all duration-200
              ${!archivoCargado && item.id !== 'dash' 
                ? 'opacity-30 cursor-not-allowed grayscale' 
                : 'hover:bg-slate-100'}
              ${activeTab === item.id 
                ? 'bg-pf-red text-white shadow-lg' 
                : 'text-slate-500'}
            `}
          >
            <div className="flex items-center space-x-4">
              <item.icon size={18} />
              <span className="font-semibold text-sm">{item.label}</span>
            </div>
            {!archivoCargado && item.id !== 'dash' && <Lock size={12} className="text-slate-400" />}
          </button>
        ))}

        {/* Separador y Botón de Limpiar */}
        {archivoCargado && (
          <div className="pt-4 mt-4 border-t border-pf-border/50">
            <button
              onClick={onLimpiar}
              className="flex items-center w-full p-3 space-x-4 rounded-xl text-slate-400 hover:bg-pf-red/5 hover:text-pf-red transition-all group"
            >
              <RotateCcw size={18} className="group-hover:rotate-[-45deg] transition-transform" />
              <span className="font-semibold text-sm">Reiniciar Sistema</span>
            </button>
          </div>
        )}
      </nav>

      <div className="p-6 border-t border-pf-border">
        <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-pf-border">
          <div className={`w-2.5 h-2.5 rounded-full ${archivoCargado ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-600 uppercase">Complejo Industrial</span>
            <span className="text-[9px] text-slate-400 font-medium">
              {archivoCargado ? 'SISTEMA ONLINE' : 'ESPERANDO DATOS'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};