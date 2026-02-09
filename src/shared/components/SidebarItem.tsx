// components/SidebarItem.tsx
import { Lock } from "lucide-react";

interface SidebarItemProps {
  id: string;
  label: string;
  icon: any;
  isActive: boolean;
  isCollapsed: boolean;
  locked?: boolean;
  onClick: () => void;
  className?: string;
}

export const SidebarItem = ({
  label, icon: Icon, isActive, isCollapsed, locked, onClick, className = ""
}: SidebarItemProps) => {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      title={isCollapsed ? label : ''}
      className={`
        flex items-center w-full p-2 rounded-xl transition-all duration-200 group relative
        ${isCollapsed ? 'justify-center' : 'justify-between'}
        ${locked ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:bg-slate-100'}
        ${isActive && !locked ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-600'}
        ${className}
      `}
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-4'}`}>
        <Icon size={20} className={`min-w-[20px] ${isActive && !locked ? 'text-pf-red' : ''}`} />

        <span className={`
          font-black whitespace-nowrap overflow-hidden transition-all duration-300 uppercase tracking-tight
          ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-4'}
        `}>
          {label}
        </span>
      </div>

      {!isCollapsed && locked && <Lock size={12} className="text-slate-400 min-w-[12px]" />}
    </button>
  );
};