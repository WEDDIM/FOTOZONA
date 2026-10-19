--- src/components/ModuleSidebar.tsx (原始)
interface Props {
  activeModule: string;
  setActiveModule: (m: string) => void;
}

const modules = [
  { id: 'skin', icon: 'fa-hand-sparkles', label: 'Кожа', color: '#ec4899' },
  { id: 'face', icon: 'fa-face-smile-beam', label: 'Лицо', color: '#f97316' },
  { id: 'eyes', icon: 'fa-eye', label: 'Глаза', color: '#3b82f6' },
  { id: 'color', icon: 'fa-palette', label: 'Цвет', color: '#a855f7' },
  { id: 'detail', icon: 'fa-gem', label: 'Детали', color: '#10b981' },
  { id: 'light', icon: 'fa-sun', label: 'Свет', color: '#eab308' },
  { id: 'effects', icon: 'fa-wand-magic-sparkles', label: 'Эффекты', color: '#ef4444' },
];

export function ModuleSidebar({ activeModule, setActiveModule }: Props) {
  return (
    <div className="w-[60px] bg-[#252526] border-r border-[#333] flex flex-col items-center py-2 gap-0.5 shrink-0">
      <div className="mb-2 px-2 py-1.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
          <i className="fas fa-camera text-white text-xs"></i>
        </div>
      </div>
      <div className="w-8 h-px bg-[#333] mb-2"></div>
      {modules.map((m) => (
        <button
          key={m.id}
          onClick={() => setActiveModule(m.id)}
          className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-150 group relative
            ${activeModule === m.id
              ? 'bg-[#37373d] text-white shadow-inner'
              : 'text-gray-500 hover:text-gray-300 hover:bg-[#2d2d30]'
            }`}
          title={m.label}
        >
          <i className={`fas ${m.icon} text-[13px]`} style={activeModule === m.id ? { color: m.color } : {}}></i>
          <span className="text-[8px] font-medium leading-none">{m.label}</span>
          {activeModule === m.id && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r" style={{ background: m.color }}></div>
          )}
        </button>
      ))}
    </div>
  );
}


+++ src/components/ModuleSidebar.tsx (修改后)
