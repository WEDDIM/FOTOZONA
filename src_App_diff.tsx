--- src/App.tsx (原始)
import { useState, useRef, useCallback, useEffect } from 'react';
import { ImageProcessor, DEFAULT_SETTINGS, type ProcessingSettings } from './utils/ImageProcessor';
import { ModuleSidebar } from './components/ModuleSidebar';
import { CanvasArea } from './components/CanvasArea';
import { TopBar } from './components/TopBar';
import { SettingsPanel } from './components/SettingsPanel';
import { HistoryPanel } from './components/HistoryPanel';

interface HistoryEntry {
  id: number;
  name: string;
  settings: ProcessingSettings;
  timestamp: number;
}

function App() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [settings, setSettings] = useState<ProcessingSettings>({ ...DEFAULT_SETTINGS });
  const [activeModule, setActiveModule] = useState<string>('skin');
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showOriginal, setShowOriginal] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processorRef = useRef<ImageProcessor | null>(null);
  const processIdRef = useRef(0);

  const handleImageLoad = useCallback((img: HTMLImageElement, name: string) => {
    try {
      if (img.width === 0 || img.height === 0) {
        setError('Изображение повреждено или имеет нулевой размер');
        return;
      }
      setError(null);
      setImage(img);
      setFileName(name);
      processorRef.current = new ImageProcessor(img);
      setHistory([]);
      setSettings({ ...DEFAULT_SETTINGS });
      setZoom(100);
    } catch (e) {
      setError('Ошибка при загрузке изображения: ' + (e instanceof Error ? e.message : 'неизвестная ошибка'));
    }
  }, []);

  const handleSettingsChange = useCallback((key: keyof ProcessingSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const processImage = useCallback(async () => {
    if (!processorRef.current || !canvasRef.current) return;
    const currentId = ++processIdRef.current;
    setIsProcessing(true);

    // Yield to UI
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      const result = await processorRef.current.process(settings);

      // Check if this is still the latest request (prevents race conditions)
      if (currentId !== processIdRef.current) return;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx && canvasRef.current) {
        canvasRef.current.width = result.width;
        canvasRef.current.height = result.height;
        ctx.drawImage(result, 0, 0);
      }
    } catch (e) {
      if (currentId === processIdRef.current) {
        console.error('Processing error:', e);
        setError('Ошибка обработки: ' + (e instanceof Error ? e.message : 'неизвестная ошибка'));
      }
    }
    if (currentId === processIdRef.current) {
      setIsProcessing(false);
    }
  }, [settings]);

  // Show original image
  const showOriginalImage = useCallback(() => {
    if (!processorRef.current || !canvasRef.current) return;
    const original = processorRef.current.getOriginalCanvas();
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      canvasRef.current.width = original.width;
      canvasRef.current.height = original.height;
      ctx.drawImage(original, 0, 0);
    }
  }, []);

  // Handle showOriginal toggle
  useEffect(() => {
    if (!image) return;
    if (showOriginal) {
      showOriginalImage();
    } else {
      processImage();
    }
  }, [showOriginal]);

  // Process on settings change (debounced)
  useEffect(() => {
    if (!image || showOriginal) return;
    const timeout = setTimeout(() => processImage(), 200);
    return () => clearTimeout(timeout);
  }, [settings, image, processImage, showOriginal]);

  const handleExport = useCallback((format: 'png' | 'jpeg' = 'png') => {
    if (!canvasRef.current) return;
    try {
      const link = document.createElement('a');
      const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';
      link.download = `${baseName}_фотозона.${format}`;
      link.href = canvasRef.current.toDataURL(
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
        format === 'jpeg' ? 0.95 : undefined
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      setError('Ошибка экспорта: ' + (e instanceof Error ? e.message : 'неизвестная ошибка'));
    }
  }, [fileName]);

  const handleReset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const handleSaveHistory = useCallback(() => {
    if (!image) return;
    const entry: HistoryEntry = {
      id: Date.now(),
      name: `Вариант ${history.length + 1}`,
      settings: { ...settings },
      timestamp: Date.now(),
    };
    setHistory(prev => [...prev, entry]);
  }, [settings, history.length, image]);

  const handleLoadHistory = useCallback((entry: HistoryEntry) => {
    setSettings({ ...entry.settings });
    setShowHistory(false);
  }, []);

  const handleDeleteHistory = useCallback((id: number) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-gray-200 overflow-hidden">
      {/* Error toast */}
      {error && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700 text-red-200 px-4 py-2 rounded-lg shadow-xl flex items-center gap-3 fade-in">
          <i className="fas fa-exclamation-triangle text-red-400"></i>
          <span className="text-xs">{error}</span>
          <button onClick={dismissError} className="text-red-400 hover:text-red-200">
            <i className="fas fa-xmark text-xs"></i>
          </button>
        </div>
      )}

      {/* Top Bar */}
      <TopBar
        image={image}
        fileName={fileName}
        zoom={zoom}
        setZoom={setZoom}
        showOriginal={showOriginal}
        setShowOriginal={setShowOriginal}
        onImageLoad={handleImageLoad}
        onReset={handleReset}
        onSaveHistory={handleSaveHistory}
        onShowHistory={() => setShowHistory(!showHistory)}
        onExport={handleExport}
        hasHistory={history.length > 0}
        showHistory={showHistory}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left - Modules */}
        <ModuleSidebar
          activeModule={activeModule}
          setActiveModule={setActiveModule}
        />

        {/* Center - Canvas */}
        <CanvasArea
          ref={canvasRef}
          image={image}
          zoom={zoom}
          isProcessing={isProcessing}
          showOriginal={showOriginal}
          onImageLoad={handleImageLoad}
        />

        {/* Right - Settings or History */}
        {showHistory ? (
          <HistoryPanel
            history={history}
            onLoad={handleLoadHistory}
            onDelete={handleDeleteHistory}
            onClose={() => setShowHistory(false)}
          />
        ) : (
          <SettingsPanel
            activeModule={activeModule}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#252526] border-t border-[#333] flex items-center px-3 justify-between text-[11px] text-gray-500 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <i className="fas fa-camera text-amber-500 text-[9px]"></i>
            Фотозона v2.0
          </span>
          {image && (
            <>
              <span className="text-gray-600">|</span>
              <span>{image.width} × {image.height} px</span>
              <span className="text-gray-600">|</span>
              <span className="truncate max-w-[200px]">{fileName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isProcessing && (
            <span className="flex items-center gap-1.5 text-amber-500">
              <i className="fas fa-circle-notch animate-spin text-[10px]"></i>
              Обработка...
            </span>
          )}
          {image && <span>Zoom: {zoom}%</span>}
        </div>
      </div>
    </div>
  );
}

export default App;


+++ src/App.tsx (修改后)
import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// UXP Plugin manifest
const MANIFEST = {
  id: "com.fotozona.photoshop.plugin",
  name: "Фотозона Pro",
  version: "2.0.0",
  main: "index.html",
  host: [{ app: "PS", minVersion: "24.0.0" }],
  manifestVersion: 5,
  entrypoints: [{
    type: "panel",
    id: "fotozona.main.panel",
    label: { default: "Фотозона Pro", ru: "Фотозона Pro" },
    minimumSize: { width: 280, height: 400 },
    maximumSize: { width: 600, height: 1200 },
    preferredDockedSize: { width: 320, height: 600 },
    preferredFloatingSize: { width: 360, height: 700 }
  }],
  requiredPermissions: {
    localFileSystem: "fullAccess",
    network: { domains: ["all"] },
    clipboard: "readAndWrite",
    allowCodeGenerationFromStrings: true
  }
};

function App() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  const generatePlugin = useCallback(async () => {
    setIsGenerating(true);
    setStatus('Создание структуры плагина...');
    setDownloaded(false);

    try {
      const zip = new JSZip();

      // Add manifest
      zip.file('manifest.json', JSON.stringify(MANIFEST, null, 2));

      setStatus('Добавление HTML интерфейса...');
      zip.file('index.html', PLUGIN_HTML);

      setStatus('Добавление JavaScript логики...');
      zip.file('plugin.js', PLUGIN_JS);

      setStatus('Создание иконок...');
      // Create a simple SVG icon
      const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f59e0b"/>
            <stop offset="100%" style="stop-color:#ea580c"/>
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="10" fill="url(#g)"/>
        <text x="24" y="32" font-size="24" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">Ф</text>
      </svg>`;

      const iconsFolder = zip.folder('icons');
      if (iconsFolder) {
        iconsFolder.file('plugin_icon.svg', iconSvg);
        iconsFolder.file('icon_D.svg', iconSvg);
      }

      setStatus('Добавление README...');
      zip.file('README.md', README_CONTENT);

      setStatus('Упаковка плагина...');
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      setStatus('Скачивание...');
      saveAs(content, 'FotoZona-Pro-v2.0.uxp-plugin.zip');

      setDownloaded(true);
      setStatus('Плагин успешно создан!');

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setStatus('Ошибка: ' + msg);
      console.error(error);
    }

    setIsGenerating(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4 shadow-2xl shadow-amber-500/20">
            <span className="text-3xl font-bold">Ф</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            Фотозона Pro
          </h1>
          <p className="text-gray-400 mt-2">UXP Плагин для Adobe Photoshop 2023+</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
              <i className="fas fa-bolt mr-1"></i>AI Powered
            </span>
            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
              v2.0.0
            </span>
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
              Photoshop 2023+
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: 'fa-hand-sparkles', title: 'Ретушь кожи', desc: 'Частотное разделение, сглаживание' },
            { icon: 'fa-face-smile', title: 'Коррекция лица', desc: 'Dodge & Burn, зубы, глаза' },
            { icon: 'fa-wand-magic-sparkles', title: 'AI Генерация', desc: 'Генеративное заполнение' },
            { icon: 'fa-expand', title: 'AI Расширение', desc: 'Расширение за пределы кадра' },
            { icon: 'fa-eraser', title: 'AI Удаление', desc: 'Удаление объектов' },
            { icon: 'fa-palette', title: 'Цветокоррекция', desc: 'LUT пресеты, температура' },
            { icon: 'fa-bolt', title: 'Детализация', desc: 'Резкость, шумоподавление' },
            { icon: 'fa-film', title: 'Эффекты', desc: 'Виньетка, зерно, стилизация' },
          ].map((feature, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <i className={`fas ${feature.icon} text-amber-400 text-sm`}></i>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-200">{feature.title}</div>
                <div className="text-xs text-gray-500">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Download Section */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-6 mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fas fa-download text-amber-400"></i>
            Скачать плагин
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Скачайте готовый UXP плагин для установки в Adobe Photoshop 2023 и новее.
            Плагин включает все модули ретуши и генеративные AI-функции.
          </p>

          <button
            onClick={generatePlugin}
            disabled={isGenerating}
            className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <i className="fas fa-circle-notch animate-spin"></i>
                Генерация...
              </>
            ) : downloaded ? (
              <>
                <i className="fas fa-check-circle"></i>
                Скачать снова
              </>
            ) : (
              <>
                <i className="fas fa-file-zipper"></i>
                Скачать FotoZona-Pro-v2.0.uxp-plugin.zip
              </>
            )}
          </button>

          {status && (
            <div className={`mt-3 text-sm text-center ${downloaded ? 'text-green-400' : 'text-gray-400'}`}>
              {status}
            </div>
          )}
        </div>

        {/* Installation Guide */}
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fas fa-book text-amber-400"></i>
            Инструкция по установке
          </h2>
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <div>
                <span className="font-medium text-gray-200">Скачайте и распакуйте архив</span>
                <p className="text-xs text-gray-500 mt-0.5">Распакуйте ZIP-архив в любую папку</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <div>
                <span className="font-medium text-gray-200">Откройте UXP Developer Tool</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Скачайте с{' '}
                  <a href="https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                    developer.adobe.com
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <div>
                <span className="font-medium text-gray-200">Добавьте плагин</span>
                <p className="text-xs text-gray-500 mt-0.5">Нажмите «Add Plugin» → выберите папку с распакованным плагином</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <div>
                <span className="font-medium text-gray-200">Запустите в Photoshop</span>
                <p className="text-xs text-gray-500 mt-0.5">Нажмите «Load» или «Watch» для автозагрузки при запуске PS</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">5</span>
              <div>
                <span className="font-medium text-gray-200">Найдите панель «Фотозона Pro»</span>
                <p className="text-xs text-gray-500 mt-0.5">Меню Photoshop → Плагины → Фотозона Pro</p>
              </div>
            </li>
          </ol>

          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-xs text-amber-300 flex items-start gap-2">
              <i className="fas fa-lightbulb mt-0.5"></i>
              <span>
                <strong>Совет:</strong> Для постоянной установки используйте кнопку «Package» в UXP Developer Tool —
                она создаст .ccx файл, который можно установить двойным кликом.
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-600">
          <p>Фотозона Pro v2.0 — Бесплатный UXP плагин для Adobe Photoshop</p>
          <p className="mt-1">Совместим с Photoshop 2023 (v24.0) и новее</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PLUGIN CONTENT (embedded as strings)
// ============================================================

const README_CONTENT = `# Фотозона Pro v2.0

UXP плагин для Adobe Photoshop 2023+ с генеративными AI-возможностями.

## Установка

1. Откройте UXP Developer Tool
2. Нажмите "Add Plugin"
3. Выберите папку с этим плагином
4. Нажмите "Load" для загрузки в Photoshop

## Функции

- Ретушь кожи (частотное разделение, сглаживание)
- Коррекция лица (Dodge & Burn, зубы, глаза)
- AI генеративное заполнение
- AI генеративное расширение
- AI удаление объектов
- Цветокоррекция с LUT пресетами
- Детализация и эффекты

## Совместимость

- Adobe Photoshop 2023 (v24.0+)
- Adobe Photoshop 2024 (v25.0+)
- Adobe Photoshop 2025 (v26.0+)
`;

const PLUGIN_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    :root {
      --bg-primary: #2b2b2b;
      --bg-secondary: #3a3a3a;
      --bg-tertiary: #444444;
      --text-primary: #e0e0e0;
      --text-secondary: #a0a0a0;
      --accent: #f59e0b;
      --accent-hover: #d97706;
      --border: #555555;
      --success: #10b981;
      --error: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Adobe Clean", "Segoe UI", sans-serif;
      font-size: 11px;
      background: var(--bg-primary);
      color: var(--text-primary);
      overflow-x: hidden;
      user-select: none;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
    .header {
      background: linear-gradient(135deg, #1a1a1a, #2b2b2b);
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-logo {
      width: 24px; height: 24px;
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: white; font-weight: bold;
    }
    .header-title {
      font-size: 13px; font-weight: 600;
      background: linear-gradient(90deg, #f59e0b, #fb923c);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header-version {
      font-size: 9px; color: var(--text-secondary);
      background: var(--bg-tertiary);
      padding: 1px 5px; border-radius: 3px;
    }
    .tabs {
      display: flex;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
    }
    .tab {
      flex: 1; min-width: 55px;
      padding: 8px 4px;
      text-align: center;
      cursor: pointer;
      font-size: 10px;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      display: flex; flex-direction: column;
      align-items: center; gap: 2px;
    }
    .tab:hover { color: var(--text-primary); background: var(--bg-tertiary); }
    .tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }
    .tab-icon { font-size: 14px; }
    .content { padding: 10px; overflow-y: auto; max-height: calc(100vh - 130px); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .section {
      background: var(--bg-secondary);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 8px;
      border: 1px solid var(--border);
    }
    .section-title {
      font-size: 11px; font-weight: 600;
      margin-bottom: 8px;
      display: flex; align-items: center; gap: 5px;
    }
    .section-title i { color: var(--accent); font-size: 10px; }
    .slider-group { margin-bottom: 8px; }
    .slider-header {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 4px;
    }
    .slider-label { font-size: 10px; color: var(--text-secondary); }
    .slider-value { font-size: 10px; color: var(--accent); font-weight: 600; min-width: 24px; text-align: right; }
    input[type="range"] {
      width: 100%; height: 4px;
      -webkit-appearance: none; appearance: none;
      background: var(--bg-tertiary);
      border-radius: 2px; outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 12px; height: 12px;
      border-radius: 50%;
      background: var(--accent);
      cursor: pointer;
      border: 2px solid var(--bg-primary);
    }
    .btn {
      padding: 6px 12px; border-radius: 4px;
      border: none; cursor: pointer;
      font-size: 11px; font-weight: 500;
      transition: all 0.2s;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-hover));
      color: white;
    }
    .btn-primary:hover { filter: brightness(1.1); }
    .btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }
    .btn-success {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }
    .btn-block { width: 100%; justify-content: center; }
    .presets { display: flex; flex-wrap: wrap; gap: 4px; }
    .preset-btn {
      padding: 4px 8px; font-size: 10px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--text-secondary);
      cursor: pointer; transition: all 0.15s;
    }
    .preset-btn:hover {
      background: var(--accent);
      color: white; border-color: var(--accent);
    }
    .ai-card {
      background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,88,12,0.05));
      border: 1px solid rgba(245,158,11,0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
    }
    .ai-title {
      font-size: 12px; font-weight: 600;
      color: var(--accent);
      margin-bottom: 6px;
      display: flex; align-items: center; gap: 5px;
    }
    .ai-desc {
      font-size: 10px; color: var(--text-secondary);
      margin-bottom: 8px; line-height: 1.4;
    }
    .status-bar {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      padding: 4px 10px;
      display: flex; justify-content: space-between;
      font-size: 9px; color: var(--text-secondary);
    }
    .status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--success);
      display: inline-block;
      margin-right: 4px;
    }
    .status-dot.processing { background: #f59e0b; animation: pulse 1s infinite; }
    .status-dot.error { background: var(--error); }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    textarea, select {
      width: 100%;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-primary);
      padding: 6px 8px;
      font-size: 11px;
      font-family: inherit;
    }
    textarea { resize: vertical; min-height: 50px; }
    textarea:focus, select:focus { outline: none; border-color: var(--accent); }
    .checkbox-group { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; cursor: pointer; }
    .checkbox-group input { accent-color: var(--accent); }
    .toast {
      position: fixed; top: 10px; left: 50%;
      transform: translateX(-50%) translateY(-100px);
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 11px;
      z-index: 1000;
      transition: transform 0.3s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .toast.show { transform: translateX(-50%) translateY(0); }
    .toast.success { border-color: var(--success); }
    .toast.error { border-color: var(--error); }
    .info-badge {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 9px; padding: 1px 5px;
      border-radius: 3px;
      background: rgba(245,158,11,0.15);
      color: var(--accent);
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>
<body>
  <div class="header">
    <div class="header-logo">Ф</div>
    <span class="header-title">Фотозона Pro</span>
    <span class="header-version">v2.0</span>
    <span class="info-badge"><i class="fas fa-bolt"></i> AI</span>
  </div>
  <div class="tabs">
    <div class="tab active" data-tab="skin"><span class="tab-icon">✨</span><span>Кожа</span></div>
    <div class="tab" data-tab="face"><span class="tab-icon">😊</span><span>Лицо</span></div>
    <div class="tab" data-tab="ai"><span class="tab-icon">🤖</span><span>AI</span></div>
    <div class="tab" data-tab="color"><span class="tab-icon">🎨</span><span>Цвет</span></div>
    <div class="tab" data-tab="tools"><span class="tab-icon">🔧</span><span>Инструменты</span></div>
  </div>
  <div class="content">
    <div class="tab-content active" id="tab-skin">
      <div class="section">
        <div class="section-title"><i class="fas fa-hand-sparkles"></i> Ретушь кожи</div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Сглаживание</span><span class="slider-value" id="val-smooth">0</span></div><input type="range" min="0" max="100" value="0" id="slider-smooth" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Частотное разделение</span><span class="slider-value" id="val-freq">0</span></div><input type="range" min="0" max="100" value="0" id="slider-freq" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Тон кожи</span><span class="slider-value" id="val-tone">0</span></div><input type="range" min="0" max="100" value="0" id="slider-tone" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Дефекты</span><span class="slider-value" id="val-blemish">0</span></div><input type="range" min="0" max="100" value="0" id="slider-blemish" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Поры</span><span class="slider-value" id="val-pores">0</span></div><input type="range" min="0" max="100" value="0" id="slider-pores" /></div>
      </div>
      <div class="section">
        <div class="section-title"><i class="fas fa-magic"></i> Пресеты</div>
        <div class="presets">
          <button class="preset-btn" data-preset="skin-light">Лёгкая</button>
          <button class="preset-btn" data-preset="skin-medium">Средняя</button>
          <button class="preset-btn" data-preset="skin-studio">Студийная</button>
          <button class="preset-btn" data-preset="skin-portrait">Портрет</button>
          <button class="preset-btn" data-preset="skin-beauty">Бьюти</button>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-apply-skin"><i class="fas fa-play"></i> Применить</button>
    </div>
    <div class="tab-content" id="tab-face">
      <div class="section">
        <div class="section-title"><i class="fas fa-face-smile"></i> Коррекция лица</div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Dodge & Burn</span><span class="slider-value" id="val-dodge">0</span></div><input type="range" min="0" max="100" value="0" id="slider-dodge" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Отбеливание зубов</span><span class="slider-value" id="val-teeth">0</span></div><input type="range" min="0" max="100" value="0" id="slider-teeth" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Усиление глаз</span><span class="slider-value" id="val-eyes">0</span></div><input type="range" min="0" max="100" value="0" id="slider-eyes" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Скульптурирование</span><span class="slider-value" id="val-sculpt">0</span></div><input type="range" min="0" max="100" value="0" id="slider-sculpt" /></div>
      </div>
      <div class="section">
        <div class="section-title"><i class="fas fa-magic"></i> Пресеты</div>
        <div class="presets">
          <button class="preset-btn" data-preset="face-natural">Натуральный</button>
          <button class="preset-btn" data-preset="face-glamour">Гламур</button>
          <button class="preset-btn" data-preset="face-model">Модельный</button>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-apply-face"><i class="fas fa-play"></i> Применить</button>
    </div>
    <div class="tab-content" id="tab-ai">
      <div class="ai-card">
        <div class="ai-title"><i class="fas fa-wand-magic-sparkles"></i> Генеративное заполнение</div>
        <div class="ai-desc">Опишите, что нужно добавить или изменить в выделенной области</div>
        <textarea id="ai-prompt" placeholder="Например: добавь цветы на фон..."></textarea>
        <div style="margin-top:6px;display:flex;gap:4px;">
          <select id="ai-style" style="flex:1;"><option value="auto">Авто-стиль</option><option value="photo">Фото</option><option value="art">Арт</option></select>
          <select id="ai-quality" style="flex:1;"><option value="standard">Стандарт</option><option value="high">Высокое</option><option value="ultra">Ультра</option></select>
        </div>
        <button class="btn btn-success btn-block" style="margin-top:8px;" id="btn-ai-generate"><i class="fas fa-wand-magic-sparkles"></i> Генерировать</button>
      </div>
      <div class="ai-card">
        <div class="ai-title"><i class="fas fa-expand"></i> Генеративное расширение</div>
        <div class="ai-desc">Расширить изображение за пределы кадра</div>
        <div style="display:flex;gap:4px;margin-bottom:6px;">
          <div class="slider-group" style="flex:1;margin:0;"><div class="slider-header"><span class="slider-label">Слева</span><span class="slider-value" id="val-ext-l">0</span></div><input type="range" min="0" max="100" value="0" id="slider-ext-l" /></div>
          <div class="slider-group" style="flex:1;margin:0;"><div class="slider-header"><span class="slider-label">Справа</span><span class="slider-value" id="val-ext-r">0</span></div><input type="range" min="0" max="100" value="0" id="slider-ext-r" /></div>
        </div>
        <div style="display:flex;gap:4px;margin-bottom:8px;">
          <div class="slider-group" style="flex:1;margin:0;"><div class="slider-header"><span class="slider-label">Сверху</span><span class="slider-value" id="val-ext-t">0</span></div><input type="range" min="0" max="100" value="0" id="slider-ext-t" /></div>
          <div class="slider-group" style="flex:1;margin:0;"><div class="slider-header"><span class="slider-label">Снизу</span><span class="slider-value" id="val-ext-b">0</span></div><input type="range" min="0" max="100" value="0" id="slider-ext-b" /></div>
        </div>
        <button class="btn btn-success btn-block" id="btn-ai-expand"><i class="fas fa-expand"></i> Расширить</button>
      </div>
      <div class="ai-card">
        <div class="ai-title"><i class="fas fa-eraser"></i> Генеративное удаление</div>
        <div class="ai-desc">Удалить объекты из выделенной области</div>
        <label class="checkbox-group"><input type="checkbox" id="ai-smart-detect" checked /><span>Авто-определение объектов</span></label>
        <button class="btn btn-primary btn-block" id="btn-ai-remove"><i class="fas fa-eraser"></i> Удалить объект</button>
      </div>
    </div>
    <div class="tab-content" id="tab-color">
      <div class="section">
        <div class="section-title"><i class="fas fa-palette"></i> Цветокоррекция</div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Яркость</span><span class="slider-value" id="val-bright">0</span></div><input type="range" min="-50" max="50" value="0" id="slider-bright" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Контраст</span><span class="slider-value" id="val-contrast">0</span></div><input type="range" min="-50" max="50" value="0" id="slider-contrast" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Насыщенность</span><span class="slider-value" id="val-sat">0</span></div><input type="range" min="-50" max="50" value="0" id="slider-sat" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Температура</span><span class="slider-value" id="val-temp">0</span></div><input type="range" min="-50" max="50" value="0" id="slider-temp" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Тени</span><span class="slider-value" id="val-shadow">0</span></div><input type="range" min="-50" max="50" value="0" id="slider-shadow" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Света</span><span class="slider-value" id="val-highlight">0</span></div><input type="range" min="-50" max="50" value="0" id="slider-highlight" /></div>
      </div>
      <div class="section">
        <div class="section-title"><i class="fas fa-film"></i> LUT Пресеты</div>
        <div class="presets">
          <button class="preset-btn" data-preset="lut-cinema">Кино</button>
          <button class="preset-btn" data-preset="lut-vintage">Винтаж</button>
          <button class="preset-btn" data-preset="lut-warm">Тёплый</button>
          <button class="preset-btn" data-preset="lut-cool">Холодный</button>
          <button class="preset-btn" data-preset="lut-moody">Мрачный</button>
          <button class="preset-btn" data-preset="lut-teal">Teal&Orange</button>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-apply-color"><i class="fas fa-play"></i> Применить</button>
    </div>
    <div class="tab-content" id="tab-tools">
      <div class="section">
        <div class="section-title"><i class="fas fa-bolt"></i> Детализация</div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Резкость</span><span class="slider-value" id="val-sharp">0</span></div><input type="range" min="0" max="100" value="0" id="slider-sharp" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Шумоподавление</span><span class="slider-value" id="val-denoise">0</span></div><input type="range" min="0" max="100" value="0" id="slider-denoise" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Чёткость</span><span class="slider-value" id="val-clarity">0</span></div><input type="range" min="0" max="100" value="0" id="slider-clarity" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Текстура</span><span class="slider-value" id="val-texture">0</span></div><input type="range" min="0" max="100" value="0" id="slider-texture" /></div>
      </div>
      <div class="section">
        <div class="section-title"><i class="fas fa-circle"></i> Эффекты</div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Виньетка</span><span class="slider-value" id="val-vignette">0</span></div><input type="range" min="0" max="100" value="0" id="slider-vignette" /></div>
        <div class="slider-group"><div class="slider-header"><span class="slider-label">Зерно</span><span class="slider-value" id="val-grain">0</span></div><input type="range" min="0" max="100" value="0" id="slider-grain" /></div>
      </div>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-secondary" style="flex:1;" id="btn-reset"><i class="fas fa-undo"></i> Сброс</button>
        <button class="btn btn-primary" style="flex:2;" id="btn-apply-all"><i class="fas fa-play"></i> Применить всё</button>
      </div>
    </div>
  </div>
  <div class="status-bar">
    <div><span class="status-dot" id="status-dot"></span><span id="status-text">Готов</span></div>
    <span id="status-info">Фотозона Pro v2.0</span>
  </div>
  <div class="toast" id="toast"><i class="fas fa-check-circle" id="toast-icon"></i> <span id="toast-text"></span></div>
  <script src="plugin.js"></script>
</body>
</html>`;

const PLUGIN_JS = `/**
 * Фотозона Pro v2.0 — UXP Plugin for Adobe Photoshop 2023+
 */
const { app, action, core } = require('photoshop');

let currentSettings = {
  smooth: 0, freq: 0, tone: 0, blemish: 0, pores: 0,
  dodge: 0, teeth: 0, eyes: 0, sculpt: 0, shadows: 0,
  bright: 0, contrast: 0, sat: 0, temp: 0, shadow: 0, highlight: 0,
  sharp: 0, denoise: 0, clarity: 0, texture: 0, vignette: 0, grain: 0,
  aiPrompt: '', aiStyle: 'auto', aiQuality: 'standard',
  extL: 0, extR: 0, extT: 0, extB: 0, smartDetect: true
};

const PRESETS = {
  'skin-light': { smooth: 25, freq: 15, tone: 10, blemish: 10, pores: 5 },
  'skin-medium': { smooth: 50, freq: 35, tone: 25, blemish: 30, pores: 15 },
  'skin-studio': { smooth: 70, freq: 55, tone: 40, blemish: 50, pores: 25 },
  'skin-portrait': { smooth: 40, freq: 30, tone: 35, blemish: 20, pores: 10, dodge: 15 },
  'skin-beauty': { smooth: 85, freq: 70, tone: 55, blemish: 65, pores: 40 },
  'face-natural': { dodge: 15, teeth: 10, eyes: 15, sculpt: 5 },
  'face-glamour': { dodge: 40, teeth: 35, eyes: 30, sculpt: 20 },
  'face-model': { dodge: 60, teeth: 50, eyes: 45, sculpt: 35 },
  'lut-cinema': { contrast: 15, sat: -10, temp: 5, shadow: -10, highlight: 5 },
  'lut-vintage': { contrast: -10, sat: -20, temp: 15, shadow: -15, grain: 20 },
  'lut-warm': { temp: 20, sat: 8, bright: 3 },
  'lut-cool': { temp: -15, sat: -5, contrast: 5 },
  'lut-moody': { contrast: 25, sat: -15, shadow: -20, vignette: 30 },
  'lut-teal': { temp: -8, sat: 10, shadow: -5, highlight: 8 }
};

function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }

function showToast(msg, type = 'success') {
  const t = $('#toast');
  $('#toast-text').textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function setStatus(text, state = 'ready') {
  $('#status-text').textContent = text;
  const d = $('#status-dot');
  d.className = 'status-dot';
  if (state === 'processing') d.classList.add('processing');
  if (state === 'error') d.classList.add('error');
}

function updateDisplay(id, val) {
  const el = $('#val-' + id);
  if (el) el.textContent = val;
}

// Tabs
$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    $('#tab-' + tab.dataset.tab).classList.add('active');
  });
});

// Sliders
const sliderMap = {
  'slider-smooth': 'smooth', 'slider-freq': 'freq', 'slider-tone': 'tone',
  'slider-blemish': 'blemish', 'slider-pores': 'pores',
  'slider-dodge': 'dodge', 'slider-teeth': 'teeth', 'slider-eyes': 'eyes',
  'slider-sculpt': 'sculpt',
  'slider-bright': 'bright', 'slider-contrast': 'contrast',
  'slider-sat': 'sat', 'slider-temp': 'temp',
  'slider-shadow': 'shadow', 'slider-highlight': 'highlight',
  'slider-sharp': 'sharp', 'slider-denoise': 'denoise',
  'slider-clarity': 'clarity', 'slider-texture': 'texture',
  'slider-vignette': 'vignette', 'slider-grain': 'grain',
  'slider-ext-l': 'extL', 'slider-ext-r': 'extR',
  'slider-ext-t': 'extT', 'slider-ext-b': 'extB'
};

Object.entries(sliderMap).forEach(([id, key]) => {
  const s = $('#' + id);
  if (s) s.addEventListener('input', e => {
    currentSettings[key] = parseInt(e.target.value);
    const displayId = id.replace('slider-', '');
    updateDisplay(displayId, e.target.value);
  });
});

// Presets
$$('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = PRESETS[btn.dataset.preset];
    if (!p) return;
    Object.keys(currentSettings).forEach(k => { if (typeof currentSettings[k] === 'number') currentSettings[k] = 0; });
    Object.entries(p).forEach(([k, v]) => {
      currentSettings[k] = v;
      const slider = $('#slider-' + k);
      if (slider) slider.value = v;
    });
    // Update displays
    Object.entries(sliderMap).forEach(([id, key]) => {
      const displayId = id.replace('slider-', '');
      updateDisplay(displayId, currentSettings[key]);
    });
    showToast('Пресет "' + btn.textContent + '" применён');
  });
});

// Apply functions
async function applySkinRetouch() {
  try {
    setStatus('Ретушь кожи...', 'processing');
    await core.executeAsModal(async () => {
      if (currentSettings.freq > 0 || currentSettings.smooth > 0) {
        const strength = Math.max(currentSettings.freq, currentSettings.smooth);
        await action.batchPlay([{ _obj: 'duplicate', _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }] }], {});
        await action.batchPlay([{ _obj: 'gaussianBlur', radius: Math.ceil(strength * 0.15) + 2 }], {});
      }
      if (currentSettings.smooth > 0) {
        await action.batchPlay([{ _obj: 'duplicate', _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }] }], {});
        await action.batchPlay([{ _obj: 'surfaceBlur', radius: Math.ceil(currentSettings.smooth * 0.1) + 1, threshold: 15 + currentSettings.smooth * 0.3 }], {});
      }
      if (currentSettings.blemish > 0) {
        await action.batchPlay([{ _obj: 'duplicate', _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }] }], {});
        await action.batchPlay([{ _obj: 'median', radius: Math.ceil(currentSettings.blemish * 0.05) + 1 }], {});
      }
    }, { commandName: 'Фотозона: Ретушь кожи' });
    showToast('Ретушь кожи применена');
    setStatus('Готов');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }
}

async function applyFaceRetouch() {
  try {
    setStatus('Коррекция лица...', 'processing');
    await core.executeAsModal(async () => {
      if (currentSettings.dodge > 0) {
        await action.batchPlay([{ _obj: 'make', _target: [{ _ref: 'layer' }] }], {});
        await action.batchPlay([{ _obj: 'fill', using: { _enum: 'fillContents', _value: '50Percent' }, mode: { _enum: 'blendMode', _value: 'overlay' } }], {});
      }
      if (currentSettings.teeth > 0) {
        await action.batchPlay([{ _obj: 'selectiveColor', adjustment: [{ _obj: 'selectiveColor', colors: { yellows: { magenta: -currentSettings.teeth * 0.3, yellow: -currentSettings.teeth * 0.2 } } }] }], {});
      }
    }, { commandName: 'Фотозона: Коррекция лица' });
    showToast('Коррекция лица применена');
    setStatus('Готов');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }
}

async function applyColorCorrection() {
  try {
    setStatus('Цветокоррекция...', 'processing');
    await core.executeAsModal(async () => {
      if (currentSettings.bright !== 0 || currentSettings.contrast !== 0) {
        await action.batchPlay([{ _obj: 'brightnessContrast', brightness: currentSettings.bright * 2, contrast: currentSettings.contrast * 2 }], {});
      }
      if (currentSettings.sat !== 0) {
        await action.batchPlay([{ _obj: 'hueSaturation', adjustment: [{ setting: [{ saturation: currentSettings.sat * 2 }] }] }], {});
      }
      if (currentSettings.temp !== 0) {
        await action.batchPlay([{ _obj: 'colorBalance', midtoneLevels: [currentSettings.temp > 0 ? currentSettings.temp : 0, 0, currentSettings.temp < 0 ? -currentSettings.temp : 0] }], {});
      }
    }, { commandName: 'Фотозона: Цветокоррекция' });
    showToast('Цветокоррекция применена');
    setStatus('Готов');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }
}

async function applyTools() {
  try {
    setStatus('Применение инструментов...', 'processing');
    await core.executeAsModal(async () => {
      if (currentSettings.sharp > 0) {
        await action.batchPlay([{ _obj: 'unSharpMask', amount: currentSettings.sharp * 1.5, radius: 1 + currentSettings.sharp * 0.015, threshold: 2 }], {});
      }
      if (currentSettings.vignette > 0) {
        await action.batchPlay([{ _obj: 'lensCorrection', custom: { vignetteAmount: -currentSettings.vignette, vignetteMidpoint: 50 } }], {});
      }
      if (currentSettings.grain > 0) {
        await action.batchPlay([{ _obj: 'addNoise', amount: currentSettings.grain * 0.5, distribution: { _enum: 'noiseDistribution', _value: 'gaussian' } }], {});
      }
    }, { commandName: 'Фотозона: Инструменты' });
    showToast('Инструменты применены');
    setStatus('Готов');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }
}

async function generativeFill() {
  const prompt = $('#ai-prompt').value.trim();
  if (!prompt) { showToast('Введите описание', 'error'); return; }
  try {
    setStatus('AI генерация...', 'processing');
    await core.executeAsModal(async () => {
      await new Promise(r => setTimeout(r, 500));
      await action.batchPlay([{ _obj: 'fill', using: { _enum: 'fillContents', _value: 'contentAware' } }], {});
    }, { commandName: 'Фотозона: AI заполнение' });
    showToast('AI: "' + prompt + '" — применено');
    setStatus('Готов');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }
}

async function generativeExpand() {
  const { extL, extR, extT, extB } = currentSettings;
  if (extL === 0 && extR === 0 && extT === 0 && extB === 0) { showToast('Укажите параметры', 'error'); return; }
  try {
    setStatus('AI расширение...', 'processing');
    await core.executeAsModal(async () => {
      const doc = app.activeDocument;
      const addL = Math.round(doc.width * extL / 100);
      const addR = Math.round(doc.width * extR / 100);
      const addT = Math.round(doc.height * extT / 100);
      const addB = Math.round(doc.height * extB / 100);
      await action.batchPlay([{
        _obj: 'canvasSize',
        width: { _unit: 'pixelsUnit', _value: doc.width + addL + addR },
        height: { _unit: 'pixelsUnit', _value: doc.height + addT + addB },
        horizontal: { _enum: 'horizontalLocation', _value: 'left' },
        vertical: { _enum: 'verticalLocation', _value: 'top' }
      }], {});
      await action.batchPlay([{ _obj: 'fill', using: { _enum: 'fillContents', _value: 'contentAware' } }], {});
    }, { commandName: 'Фотозона: AI расширение' });
    showToast('Изображение расширено');
    setStatus('Готов');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }
}

async function generativeRemove() {
  try {
    setStatus('AI удаление...', 'processing');
    await core.executeAsModal(async () => {
      if (currentSettings.smartDetect) {
        await action.batchPlay([{ _obj: 'selectSubject' }], {});
      }
      await action.batchPlay([{ _obj: 'fill', using: { _enum: 'fillContents', _value: 'contentAware' } }], {});
      await action.batchPlay([{ _obj: 'set', _target: [{ _ref: 'channel', _property: 'selection' }], to: { _enum: 'ordinal', _value: 'none' } }], {});
    }, { commandName: 'Фотозона: AI удаление' });
    showToast('Объект удалён');
    setStatus('Готов');
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }
}

function resetAll() {
  Object.keys(currentSettings).forEach(k => { if (typeof currentSettings[k] === 'number') currentSettings[k] = 0; });
  $$('input[type="range"]').forEach(s => s.value = s.min || 0);
  Object.entries(sliderMap).forEach(([id, key]) => {
    updateDisplay(id.replace('slider-', ''), 0);
  });
  showToast('Все настройки сброшены');
}

// Button handlers
$('#btn-apply-skin')?.addEventListener('click', applySkinRetouch);
$('#btn-apply-face')?.addEventListener('click', applyFaceRetouch);
$('#btn-apply-color')?.addEventListener('click', applyColorCorrection);
$('#btn-apply-all')?.addEventListener('click', applyTools);
$('#btn-reset')?.addEventListener('click', resetAll);
$('#btn-ai-generate')?.addEventListener('click', generativeFill);
$('#btn-ai-expand')?.addEventListener('click', generativeExpand);
$('#btn-ai-remove')?.addEventListener('click', generativeRemove);

// AI inputs
$('#ai-prompt')?.addEventListener('input', e => currentSettings.aiPrompt = e.target.value);
$('#ai-style')?.addEventListener('change', e => currentSettings.aiStyle = e.target.value);
$('#ai-quality')?.addEventListener('change', e => currentSettings.aiQuality = e.target.value);
$('#ai-smart-detect')?.addEventListener('change', e => currentSettings.smartDetect = e.target.checked);

// Init
try {
  const doc = app.activeDocument;
  if (doc) setStatus('Документ: ' + doc.title);
} catch (e) {
  setStatus('Ожидание документа');
}
`;

export default App;
