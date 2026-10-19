--- src/components/TopBar.tsx (原始)
import { useRef } from 'react';

interface Props {
  image: HTMLImageElement | null;
  fileName: string;
  zoom: number;
  setZoom: (z: number) => void;
  showOriginal: boolean;
  setShowOriginal: (v: boolean) => void;
  onImageLoad: (img: HTMLImageElement, name: string) => void;
  onReset: () => void;
  onSaveHistory: () => void;
  onShowHistory: () => void;
  onExport: (format: 'png' | 'jpeg') => void;
  hasHistory: boolean;
  showHistory: boolean;
}

export function TopBar({
  image, fileName, zoom, setZoom, showOriginal, setShowOriginal,
  onImageLoad, onReset, onSaveHistory, onShowHistory, onExport, hasHistory, showHistory
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert('Файл слишком большой (максимум 100 МБ)');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => alert('Ошибка чтения файла');
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => alert('Ошибка загрузки изображения. Файл может быть повреждён.');
      img.onload = () => onImageLoad(img, file.name);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-11 bg-[#333] border-b border-[#222] flex items-center px-3 justify-between shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-3">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <i className="fas fa-camera text-white text-[10px]"></i>
          </div>
          <span className="text-sm font-semibold text-gray-200 tracking-tight">Фотозона</span>
          <span className="text-[10px] text-gray-500 bg-[#252526] px-1.5 py-0.5 rounded">v2.0</span>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="px-2.5 py-1 text-[11px] bg-[#0e639c] hover:bg-[#1177bb] rounded transition-colors flex items-center gap-1.5 text-white font-medium"
        >
          <i className="fas fa-folder-open text-[10px]"></i>
          Открыть
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
          className="hidden"
        />

        {image && (
          <>
            <button
              onClick={onReset}
              className="px-2.5 py-1 text-[11px] bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded transition-colors flex items-center gap-1.5"
            >
              <i className="fas fa-rotate-left text-[10px]"></i>
              Сброс
            </button>
            <button
              onClick={onSaveHistory}
              className="px-2.5 py-1 text-[11px] bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded transition-colors flex items-center gap-1.5"
              title="Сохранить текущие настройки как вариант"
            >
              <i className="fas fa-bookmark text-[10px]"></i>
              Сохранить
            </button>
            {hasHistory && (
              <button
                onClick={onShowHistory}
                className={`px-2.5 py-1 text-[11px] rounded transition-colors flex items-center gap-1.5 ${
                  showHistory ? 'bg-amber-600/30 text-amber-400 border border-amber-600/40' : 'bg-[#3c3c3c] hover:bg-[#4a4a4a]'
                }`}
              >
                <i className="fas fa-clock-rotate-left text-[10px]"></i>
                Варианты
              </button>
            )}
          </>
        )}
      </div>

      {/* Center - file name */}
      <div className="absolute left-1/2 -translate-x-1/2 text-[11px] text-gray-400 truncate max-w-[200px]">
        {fileName}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {image && (
          <>
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className={`px-2.5 py-1 text-[11px] rounded transition-colors flex items-center gap-1.5 ${
                showOriginal ? 'bg-amber-600 text-white' : 'bg-[#3c3c3c] hover:bg-[#4a4a4a]'
              }`}
              title="Переключить просмотр оригинала"
            >
              <i className={`fas ${showOriginal ? 'fa-eye-slash' : 'fa-eye'} text-[10px]`}></i>
              {showOriginal ? 'Оригинал ✓' : 'Оригинал'}
            </button>
            <div className="w-px h-5 bg-[#555] mx-1"></div>
            <button
              onClick={() => setZoom(Math.max(10, zoom - 25))}
              className="w-6 h-6 flex items-center justify-center text-[10px] bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded"
            >
              <i className="fas fa-minus"></i>
            </button>
            <div className="relative w-20 h-4 flex items-center">
              <div className="w-full h-1 bg-[#555] rounded-full relative">
                <div className="absolute h-full bg-amber-500 rounded-full" style={{ width: `${((zoom - 10) / 390) * 100}%` }}></div>
              </div>
              <input
                type="range" min="10" max="400" value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-[10px] text-gray-400 w-8 text-center font-mono">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(400, zoom + 25))}
              className="w-6 h-6 flex items-center justify-center text-[10px] bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded"
            >
              <i className="fas fa-plus"></i>
            </button>
            <button
              onClick={() => setZoom(100)}
              className="px-1.5 py-1 text-[10px] bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded"
            >
              1:1
            </button>
            <div className="w-px h-5 bg-[#555] mx-1"></div>
            <button
              onClick={() => onExport('png')}
              className="px-2.5 py-1 text-[11px] bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded transition-colors flex items-center gap-1.5 text-white font-medium shadow-sm"
            >
              <i className="fas fa-download text-[10px]"></i>
              Экспорт
            </button>
          </>
        )}
      </div>
    </div>
  );
}


+++ src/components/TopBar.tsx (修改后)
