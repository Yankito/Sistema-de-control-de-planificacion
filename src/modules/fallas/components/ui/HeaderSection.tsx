export const HeaderSection = ({ icon: Icon, title, color, bg }: any) => (
  <div className="flex items-center gap-3 mb-2">
    <div className={`p-2 rounded-xl shadow-sm ${bg} ${color}`}><Icon size={18}/></div>
    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
  </div>
);
