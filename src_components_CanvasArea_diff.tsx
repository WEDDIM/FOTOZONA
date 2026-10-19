--- src/components/CanvasArea.tsx (原始)
import { forwardRef, useEffect, useState } from 'react';

interface Props {
  image: HTMLImageElement | null;
  zoom: number;
  isProcessing: boolean;
  showOriginal: boolean;
  onImageLoad: (img: HTMLImageElement, name: string) => void;
}

export const CanvasArea = forwardRef<HTMLCanvasElement, Props>(
  ({ image, zoom, isProcessing, showOriginal, onImageLoad }, ref) => {
    const [dragOver, setDragOver] = useState(false);

    // Draw initial image when loaded
    useEffect(() => {
      if (!image || !ref || typeof ref === 'function' || !ref.current) return;
      const canvas = ref.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
    }, [image, ref]);

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
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
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => alert('Ошибка загрузки изображения. Файл может быть повреждён.');
        img.onload = () => onImageLoad(img, file.name);
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    };

    const handleDragLeave = () => {
      setDragOver(false);
    };

    if (!image) {
      return (
        <div
          className={`flex-1 flex items-center justify-center bg-[#1e1e1e] checkerboard relative transition-colors ${
            dragOver ? 'bg-[#252530]' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {dragOver && (
            <div className="absolute inset-4 border-2 border-dashed border-amber-500 rounded-xl flex items-center justify-center bg-amber-500/5">
              <div className="text-center">
                <i className="fas fa-cloud-arrow-up text-3xl text-amber-500 mb-2"></i>
                <p className="text-sm text-amber-400">Отпустите файл для загрузки</p>
              </div>
            </div>
          )}
          <div className="text-center fade-in">
            <div className="w-32 h-32 mx-auto mb-6 rounded-2xl border-2 border-dashed border-[#555] flex items-center justify-center bg-[#252526]/50">
              <i className="fas fa-cloud-arrow-up text-4xl text-gray-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-1">Перетащите изображение сюда</h3>
            <p className="text-xs text-gray-500 mb-4">или нажмите «Открыть» в верхней панели</p>
            <div className="flex justify-center gap-2">
              {['JPG', 'PNG', 'WebP', 'BMP'].map(f => (
                <span key={f} className="px-2 py-0.5 text-[10px] bg-[#333] rounded text-gray-400 font-mono">{f}</span>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-4">Максимум 100 МБ • Авто-масштабирование до 4096px</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex-1 overflow-auto flex items-center justify-center bg-[#1e1e1e] checkerboard relative ${
          dragOver ? 'ring-2 ring-amber-500 ring-inset' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="relative">
          <canvas
            ref={ref}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center center',
              maxWidth: 'none',
              transition: 'transform 0.1s ease-out',
            }}
            className="shadow-2xl"
          />
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex items-center gap-2 bg-[#252526]/95 px-4 py-2 rounded-lg border border-[#444] shadow-xl">
                <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-300">Обработка...</span>
              </div>
            </div>
          )}
          {showOriginal && !isProcessing && (
            <div className="absolute top-3 left-3 bg-black/80 text-amber-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-amber-500/30 shadow-lg">
              <i className="fas fa-eye"></i> Оригинал
            </div>
          )}
        </div>
      </div>
    );
  }
);

CanvasArea.displayName = 'CanvasArea';


+++ src/components/CanvasArea.tsx (修改后)
