--- src/components/SettingsPanel.tsx (原始)
import type { ProcessingSettings } from '../utils/ImageProcessor';

interface Props {
  activeModule: string;
  settings: ProcessingSettings;
  onSettingsChange: (key: keyof ProcessingSettings, value: number) => void;
}

interface Slider {
  key: keyof ProcessingSettings;
  label: string;
  min: number;
  max: number;
  icon: string;
}

import { DEFAULT_SETTINGS } from '../utils/ImageProcessor';

interface Preset {
  name: string;
  apply: (fn: (key: keyof ProcessingSettings, value: number) => void) => void;
}

// Helper to reset all and apply preset
function applyPreset(
  preset: Preset,
  onChange: (key: keyof ProcessingSettings, value: number) => void
) {
  // First reset all to defaults
  (Object.keys(DEFAULT_SETTINGS) as (keyof ProcessingSettings)[]).forEach(key => {
    onChange(key, DEFAULT_SETTINGS[key]);
  });
  // Then apply preset values
  preset.apply(onChange);
}

const configs: Record<string, { title: string; desc: string; sliders: Slider[]; presets: Preset[] }> = {
  skin: {
    title: 'Ретушь кожи',
    desc: 'Сглаживание, тон, удаление дефектов',
    sliders: [
      { key: 'skinSmoothing', label: 'Сглаживание', min: 0, max: 100, icon: 'fa-droplet' },
      { key: 'frequencySeparation', label: 'Частотное разделение', min: 0, max: 100, icon: 'fa-layer-group' },
      { key: 'skinTone', label: 'Выравнивание тона', min: 0, max: 100, icon: 'fa-circle-half-stroke' },
      { key: 'blemishRemoval', label: 'Удаление дефектов', min: 0, max: 100, icon: 'fa-eraser' },
    ],
    presets: [
      { name: 'Лёгкая', apply: (fn) => { fn('skinSmoothing', 25); fn('frequencySeparation', 15); fn('blemishRemoval', 10); } },
      { name: 'Средняя', apply: (fn) => { fn('skinSmoothing', 50); fn('frequencySeparation', 35); fn('blemishRemoval', 30); fn('skinTone', 20); } },
      { name: 'Студийная', apply: (fn) => { fn('skinSmoothing', 70); fn('frequencySeparation', 55); fn('blemishRemoval', 50); fn('skinTone', 40); } },
      { name: 'Портрет', apply: (fn) => { fn('skinSmoothing', 40); fn('frequencySeparation', 30); fn('blemishRemoval', 20); fn('skinTone', 35); fn('dodgeBurn', 15); } },
    ],
  },
  face: {
    title: 'Коррекция лица',
    desc: 'Светотень, зубы, контуры',
    sliders: [
      { key: 'dodgeBurn', label: 'Dodge & Burn', min: 0, max: 100, icon: 'fa-circle-half-stroke' },
      { key: 'teethWhitening', label: 'Отбеливание зубов', min: 0, max: 100, icon: 'fa-tooth' },
      { key: 'blemishRemoval', label: 'Удаление дефектов', min: 0, max: 100, icon: 'fa-eraser' },
      { key: 'clarity', label: 'Чёткость', min: 0, max: 100, icon: 'fa-diamond' },
    ],
    presets: [
      { name: 'Натуральная', apply: (fn) => { fn('dodgeBurn', 20); fn('teethWhitening', 15); } },
      { name: 'Гламур', apply: (fn) => { fn('dodgeBurn', 45); fn('teethWhitening', 40); fn('blemishRemoval', 35); } },
      { name: 'Модельная', apply: (fn) => { fn('dodgeBurn', 60); fn('teethWhitening', 55); fn('blemishRemoval', 50); fn('clarity', 25); } },
    ],
  },
  eyes: {
    title: 'Обработка глаз',
    desc: 'Яркость, цвет, выразительность',
    sliders: [
      { key: 'eyeEnhancement', label: 'Усиление глаз', min: 0, max: 100, icon: 'fa-eye' },
      { key: 'brightness', label: 'Яркость', min: -50, max: 50, icon: 'fa-sun' },
      { key: 'contrast', label: 'Контраст', min: -50, max: 50, icon: 'fa-adjust' },
      { key: 'clarity', label: 'Чёткость', min: 0, max: 100, icon: 'fa-diamond' },
    ],
    presets: [
      { name: 'Яркие', apply: (fn) => { fn('eyeEnhancement', 35); fn('brightness', 8); fn('contrast', 10); } },
      { name: 'Выразительные', apply: (fn) => { fn('eyeEnhancement', 60); fn('brightness', 12); fn('contrast', 20); fn('clarity', 20); } },
      { name: 'Сияющие', apply: (fn) => { fn('eyeEnhancement', 80); fn('brightness', 18); fn('contrast', 25); fn('clarity', 35); } },
    ],
  },
  color: {
    title: 'Цветокоррекция',
    desc: 'Баланс, насыщенность, температура',
    sliders: [
      { key: 'colorCorrection', label: 'Авто-баланс', min: 0, max: 100, icon: 'fa-wand-magic-sparkles' },
      { key: 'saturation', label: 'Насыщенность', min: -50, max: 50, icon: 'fa-palette' },
      { key: 'warmth', label: 'Температура', min: -50, max: 50, icon: 'fa-temperature-half' },
      { key: 'contrast', label: 'Контраст', min: -50, max: 50, icon: 'fa-adjust' },
    ],
    presets: [
      { name: 'Авто', apply: (fn) => { fn('colorCorrection', 50); } },
      { name: 'Тёплый', apply: (fn) => { fn('warmth', 18); fn('saturation', 8); } },
      { name: 'Холодный', apply: (fn) => { fn('warmth', -15); fn('saturation', -5); } },
      { name: 'Кино', apply: (fn) => { fn('colorCorrection', 35); fn('saturation', -12); fn('warmth', 8); fn('contrast', 15); } },
      { name: 'Винтаж', apply: (fn) => { fn('saturation', -20); fn('warmth', 12); fn('contrast', -10); } },
    ],
  },
  detail: {
    title: 'Детализация',
    desc: 'Резкость, шум, структура',
    sliders: [
      { key: 'sharpening', label: 'Резкость', min: 0, max: 100, icon: 'fa-bolt' },
      { key: 'noiseReduction', label: 'Шумоподавление', min: 0, max: 100, icon: 'fa-volume-xmark' },
      { key: 'clarity', label: 'Чёткость', min: 0, max: 100, icon: 'fa-diamond' },
      { key: 'frequencySeparation', label: 'Частотное разделение', min: 0, max: 100, icon: 'fa-layer-group' },
    ],
    presets: [
      { name: 'Резкость', apply: (fn) => { fn('sharpening', 35); fn('clarity', 20); } },
      { name: 'Чистота', apply: (fn) => { fn('noiseReduction', 45); fn('sharpening', 15); } },
      { name: 'HDR', apply: (fn) => { fn('clarity', 60); fn('sharpening', 40); fn('contrast', 20); } },
    ],
  },
  light: {
    title: 'Свет и тон',
    desc: 'Экспозиция, контраст, объём',
    sliders: [
      { key: 'brightness', label: 'Яркость', min: -50, max: 50, icon: 'fa-sun' },
      { key: 'contrast', label: 'Контраст', min: -50, max: 50, icon: 'fa-adjust' },
      { key: 'dodgeBurn', label: 'Dodge & Burn', min: 0, max: 100, icon: 'fa-circle-half-stroke' },
      { key: 'clarity', label: 'Чёткость', min: 0, max: 100, icon: 'fa-diamond' },
    ],
    presets: [
      { name: 'Светлый', apply: (fn) => { fn('brightness', 12); fn('contrast', 8); } },
      { name: 'Драматичный', apply: (fn) => { fn('brightness', -5); fn('contrast', 30); fn('dodgeBurn', 30); } },
      { name: 'Мягкий', apply: (fn) => { fn('brightness', 8); fn('contrast', -10); fn('dodgeBurn', 12); } },
      { name: 'Высокий ключ', apply: (fn) => { fn('brightness', 20); fn('contrast', -15); } },
    ],
  },
  effects: {
    title: 'Эффекты',
    desc: 'Виньетка, стилизация',
    sliders: [
      { key: 'vignette', label: 'Виньетка', min: 0, max: 100, icon: 'fa-circle' },
      { key: 'warmth', label: 'Температура', min: -50, max: 50, icon: 'fa-temperature-half' },
      { key: 'saturation', label: 'Насыщенность', min: -50, max: 50, icon: 'fa-palette' },
      { key: 'contrast', label: 'Контраст', min: -50, max: 50, icon: 'fa-adjust' },
      { key: 'sharpening', label: 'Резкость', min: 0, max: 100, icon: 'fa-bolt' },
    ],
    presets: [
      { name: 'Портрет', apply: (fn) => { fn('vignette', 30); fn('warmth', 8); fn('sharpening', 15); } },
      { name: 'Кинематограф', apply: (fn) => { fn('vignette', 50); fn('contrast', 20); fn('saturation', -15); fn('warmth', 5); } },
      { name: 'Ретро', apply: (fn) => { fn('vignette', 60); fn('warmth', 20); fn('saturation', -25); fn('contrast', -10); } },
      { name: 'Минимализм', apply: (fn) => { fn('vignette', 15); fn('saturation', -10); fn('contrast', 10); } },
    ],
  },
};

export function SettingsPanel({ activeModule, settings, onSettingsChange }: Props) {
  const config = configs[activeModule];
  if (!config) return null;

  return (
    <div className="w-[280px] bg-[#252526] border-l border-[#333] flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#333]">
        <h2 className="text-sm font-semibold text-gray-200">{config.title}</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">{config.desc}</p>
      </div>

      {/* Sliders */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {config.sliders.map((slider) => (
          <SliderControl
            key={slider.key}
            config={slider}
            value={settings[slider.key]}
            onChange={(v) => onSettingsChange(slider.key, v)}
          />
        ))}
      </div>

      {/* Presets */}
      <div className="px-4 py-3 border-t border-[#333] bg-[#1e1e1e]">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium">Пресеты</p>
        <div className="flex flex-wrap gap-1.5">
          {config.presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset, onSettingsChange)}
              className="px-2.5 py-1 text-[11px] bg-[#333] hover:bg-[#444] rounded transition-colors text-gray-300 hover:text-white border border-[#444] hover:border-[#555]"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SliderProps {
  config: Slider;
  value: number;
  onChange: (v: number) => void;
}

function SliderControl({ config, value, onChange }: SliderProps) {
  const pct = ((value - config.min) / (config.max - config.min)) * 100;
  const isDefault = value === 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <i className={`fas ${config.icon} text-[10px] text-gray-500 w-3 text-center`}></i>
          <label className="text-[11px] text-gray-300">{config.label}</label>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[11px] font-mono w-7 text-right ${isDefault ? 'text-gray-600' : 'text-amber-400'}`}>
            {value}
          </span>
          {!isDefault && (
            <button
              onClick={() => onChange(0)}
              className="w-3.5 h-3.5 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"
            >
              <i className="fas fa-xmark text-[7px]"></i>
            </button>
          )}
        </div>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="w-full h-[3px] bg-[#3c3c3c] rounded-full relative overflow-hidden">
          {config.min < 0 ? (
            <>
              <div className="absolute top-0 bottom-0 bg-[#555]" style={{ left: '50%', width: '0.5px' }}></div>
              <div
                className="absolute h-full bg-amber-500 rounded-full"
                style={value >= 0
                  ? { left: '50%', width: `${pct - 50}%` }
                  : { left: `${pct}%`, width: `${50 - pct}%` }
                }
              ></div>
            </>
          ) : (
            <div className="absolute h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }}></div>
          )}
        </div>
        <input
          type="range" min={config.min} max={config.max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-2.5 h-2.5 bg-amber-400 rounded-full shadow pointer-events-none border border-amber-600"
          style={{ left: `calc(${pct}% - 5px)` }}
        ></div>
      </div>
    </div>
  );
}


+++ src/components/SettingsPanel.tsx (修改后)
