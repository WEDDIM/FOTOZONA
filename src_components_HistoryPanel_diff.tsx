--- src/components/HistoryPanel.tsx (原始)
import type { ProcessingSettings } from '../utils/ImageProcessor';

interface HistoryEntry {
  id: number;
  name: string;
  settings: ProcessingSettings;
  timestamp: number;
}

interface Props {
  history: HistoryEntry[];
  onLoad: (entry: HistoryEntry) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function HistoryPanel({ history, onLoad, onDelete, onClose }: Props) {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const countActive = (settings: ProcessingSettings) => {
    return Object.values(settings).filter(v => v !== 0).length;
  };

  return (
    <div className="w-[280px] bg-[#252526] border-l border-[#333] flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Варианты обработки</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">{history.length} сохранённых</p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-300 rounded hover:bg-[#3c3c3c] transition-colors"
        >
          <i className="fas fa-xmark text-xs"></i>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {history.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-bookmark text-2xl text-gray-600 mb-2"></i>
            <p className="text-xs text-gray-500">Нет сохранённых вариантов</p>
            <p className="text-[10px] text-gray-600 mt-1">Нажмите «Сохранить» чтобы добавить</p>
          </div>
        ) : (
          history.map((entry) => (
            <div
              key={entry.id}
              className="bg-[#1e1e1e] rounded-lg border border-[#333] p-3 hover:border-[#555] transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-300">{entry.name}</span>
                <span className="text-[10px] text-gray-600">{formatTime(entry.timestamp)}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-500 bg-[#333] px-1.5 py-0.5 rounded">
                  {countActive(entry.settings)} параметров
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onLoad(entry)}
                  className="flex-1 px-2 py-1 text-[10px] bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded transition-colors border border-amber-600/30"
                >
                  <i className="fas fa-arrow-rotate-left mr-1"></i>
                  Применить
                </button>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="px-2 py-1 text-[10px] bg-[#333] hover:bg-red-900/30 text-gray-500 hover:text-red-400 rounded transition-colors"
                >
                  <i className="fas fa-trash-can text-[9px]"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


+++ src/components/HistoryPanel.tsx (修改后)
