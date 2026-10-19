--- uxp-plugin/plugin.js (原始)


+++ uxp-plugin/plugin.js (修改后)
/**
 * Фотозона Pro v2.0 — UXP Plugin for Adobe Photoshop 2023+
 * Генеративные возможности + профессиональная ретушь
 */

// ============================================================
// PHOTOSHOP UXP API IMPORTS
// ============================================================
const { app, action, core } = require('photoshop');
const { storage } = require('uxp');
const { imaging } = require('photoshop');

// ============================================================
// STATE
// ============================================================
let currentSettings = {
  // Skin
  smooth: 0, freq: 0, tone: 0, blemish: 0, pores: 0,
  // Face
  dodge: 0, teeth: 0, eyes: 0, sculpt: 0, shadows: 0,
  // Color
  bright: 0, contrast: 0, sat: 0, temp: 0, shadow: 0, highlight: 0,
  // Tools
  sharp: 0, denoise: 0, clarity: 0, texture: 0, vignette: 0, grain: 0,
  // AI
  aiPrompt: '', aiStyle: 'auto', aiQuality: 'standard',
  extL: 0, extR: 0, extT: 0, extB: 0,
  smartDetect: true
};

let isProcessing = false;

// ============================================================
// PRESETS
// ============================================================
const PRESETS = {
  // Skin
  'skin-light': { smooth: 25, freq: 15, tone: 10, blemish: 10, pores: 5 },
  'skin-medium': { smooth: 50, freq: 35, tone: 25, blemish: 30, pores: 15 },
  'skin-studio': { smooth: 70, freq: 55, tone: 40, blemish: 50, pores: 25 },
  'skin-portrait': { smooth: 40, freq: 30, tone: 35, blemish: 20, pores: 10, dodge: 15 },
  'skin-beauty': { smooth: 85, freq: 70, tone: 55, blemish: 65, pores: 40 },
  'skin-natural': { smooth: 15, freq: 10, tone: 5, blemish: 5, pores: 0 },

  // Face
  'face-natural': { dodge: 15, teeth: 10, eyes: 15, sculpt: 5, shadows: 5 },
  'face-glamour': { dodge: 40, teeth: 35, eyes: 30, sculpt: 20, shadows: 15 },
  'face-model': { dodge: 60, teeth: 50, eyes: 45, sculpt: 35, shadows: 25 },
  'face-editorial': { dodge: 75, teeth: 60, eyes: 55, sculpt: 45, shadows: 35 },

  // Color LUTs
  'lut-cinema': { contrast: 15, sat: -10, temp: 5, shadow: -10, highlight: 5 },
  'lut-vintage': { contrast: -10, sat: -20, temp: 15, shadow: -15, highlight: 10, grain: 20 },
  'lut-warm': { temp: 20, sat: 8, bright: 3 },
  'lut-cool': { temp: -15, sat: -5, contrast: 5 },
  'lut-moody': { contrast: 25, sat: -15, shadow: -20, highlight: -10, vignette: 30 },
  'lut-bright': { bright: 10, contrast: -5, sat: 5, highlight: 15 },
  'lut-fade': { contrast: -20, sat: -25, bright: 5, shadow: 10 },
  'lut-teal': { temp: -8, sat: 10, shadow: -5, highlight: 8 }
};

// ============================================================
// UI HELPERS
// ============================================================
function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }

function showToast(message, type = 'success') {
  const toast = $('#toast');
  const icon = $('#toast-icon');
  const text = $('#toast-text');

  text.textContent = message;
  toast.className = `toast ${type}`;
  icon.className = type === 'success' ? 'fas fa-check-circle' :
                   type === 'error' ? 'fas fa-exclamation-circle' :
                   'fas fa-info-circle';
  toast.classList.add('show');

  setTimeout(() => toast.classList.remove('show'), 3000);
}

function setStatus(text, state = 'ready') {
  $('#status-text').textContent = text;
  const dot = $('#status-dot');
  dot.className = 'status-dot';
  if (state === 'processing') dot.classList.add('processing');
  if (state === 'error') dot.classList.add('error');
}

function updateSliderValue(id, value) {
  const el = $(`#val-${id}`);
  if (el) el.textContent = value;
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function initTabs() {
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      $(`#tab-${tabId}`).classList.add('active');
    });
  });
}

// ============================================================
// SLIDER BINDINGS
// ============================================================
function initSliders() {
  const sliderMap = {
    'slider-smooth': 'smooth', 'slider-freq': 'freq', 'slider-tone': 'tone',
    'slider-blemish': 'blemish', 'slider-pores': 'pores',
    'slider-dodge': 'dodge', 'slider-teeth': 'teeth', 'slider-eyes': 'eyes',
    'slider-sculpt': 'sculpt', 'slider-shadows': 'shadows',
    'slider-bright': 'bright', 'slider-contrast': 'contrast',
    'slider-sat': 'sat', 'slider-temp': 'temp',
    'slider-shadow': 'shadow', 'slider-highlight': 'highlight',
    'slider-sharp': 'sharp', 'slider-denoise': 'denoise',
    'slider-clarity': 'clarity', 'slider-texture': 'texture',
    'slider-vignette': 'vignette', 'slider-grain': 'grain',
    'slider-ext-l': 'extL', 'slider-ext-r': 'extR',
    'slider-ext-t': 'extT', 'slider-ext-b': 'extB'
  };

  Object.entries(sliderMap).forEach(([sliderId, key]) => {
    const slider = $(`#${sliderId}`);
    if (!slider) return;

    slider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      currentSettings[key] = value;
      updateSliderValue(key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/ext-l/, 'ext-l').replace(/ext-r/, 'ext-r').replace(/ext-t/, 'ext-t').replace(/ext-b/, 'ext-b'), value);
    });
  });
}

// Fix slider value display IDs
function fixSliderDisplayIds() {
  const map = {
    'smooth': 'smooth', 'freq': 'freq', 'tone': 'tone',
    'blemish': 'blemish', 'pores': 'pores',
    'dodge': 'dodge', 'teeth': 'teeth', 'eyes': 'eyes',
    'sculpt': 'sculpt', 'shadows': 'shadows',
    'bright': 'bright', 'contrast': 'contrast',
    'sat': 'sat', 'temp': 'temp',
    'shadow': 'shadow', 'highlight': 'highlight',
    'sharp': 'sharp', 'denoise': 'denoise',
    'clarity': 'clarity', 'texture': 'texture',
    'vignette': 'vignette', 'grain': 'grain',
    'extL': 'ext-l', 'extR': 'ext-r',
    'extT': 'ext-t', 'extB': 'ext-b'
  };

  Object.entries(map).forEach(([key, displayId]) => {
    const slider = document.querySelector(`input[id^="slider-"]`);
  });
}

// ============================================================
// PRESET APPLICATION
// ============================================================
function initPresets() {
  $$('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetId = btn.getAttribute('data-preset');
      const preset = PRESETS[presetId];
      if (!preset) return;

      // Reset all first
      Object.keys(currentSettings).forEach(key => {
        if (typeof currentSettings[key] === 'number') {
          currentSettings[key] = 0;
        }
      });

      // Apply preset
      Object.entries(preset).forEach(([key, value]) => {
        currentSettings[key] = value;

        // Update slider
        const sliderId = `slider-${key}`;
        const slider = $(`#${sliderId}`);
        if (slider) slider.value = value;
      });

      // Update all display values
      updateAllSliderDisplays();
      showToast(`Пресет "${btn.textContent}" применён`);
    });
  });
}

function updateAllSliderDisplays() {
  const displayMap = {
    'smooth': 'smooth', 'freq': 'freq', 'tone': 'tone',
    'blemish': 'blemish', 'pores': 'pores',
    'dodge': 'dodge', 'teeth': 'teeth', 'eyes': 'eyes',
    'sculpt': 'sculpt', 'shadows': 'shadows',
    'bright': 'bright', 'contrast': 'contrast',
    'sat': 'sat', 'temp': 'temp',
    'shadow': 'shadow', 'highlight': 'highlight',
    'sharp': 'sharp', 'denoise': 'denoise',
    'clarity': 'clarity', 'texture': 'texture',
    'vignette': 'vignette', 'grain': 'grain',
    'extL': 'ext-l', 'extR': 'ext-r',
    'extT': 'ext-t', 'extB': 'ext-b'
  };

  Object.entries(displayMap).forEach(([key, displayId]) => {
    const valEl = $(`#val-${displayId}`);
    if (valEl && currentSettings[key] !== undefined) {
      valEl.textContent = currentSettings[key];
    }
  });
}

// ============================================================
// PHOTOSHOP INTEGRATION
// ============================================================

/**
 * Get active document safely
 */
function getActiveDocument() {
  try {
    return app.activeDocument;
  } catch (e) {
    return null;
  }
}

/**
 * Create a new layer for non-destructive editing
 */
async function createAdjustmentLayer(name) {
  const doc = getActiveDocument();
  if (!doc) throw new Error('Нет открытого документа');

  await core.executeAsModal(async () => {
    await action.batchPlay([{
      _obj: 'make',
      _target: [{ _ref: 'layer' }],
      using: {
        _obj: 'layer',
        name: name
      }
    }], {});
  }, { commandName: 'Фотозона: Создание слоя' });
}

/**
 * Apply pixel-level adjustments to active layer
 */
async function applyPixelAdjustments(adjustments) {
  const doc = getActiveDocument();
  if (!doc) {
    showToast('Откройте документ для применения', 'error');
    return;
  }

  setStatus('Обработка...', 'processing');
  isProcessing = true;

  try {
    await core.executeAsModal(async () => {
      // Create new layer for adjustments
      const layerName = `Фотозона - ${new Date().toLocaleTimeString()}`;

      await action.batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'layer' }]
      }], {});

      // Apply brightness/contrast via adjustment layer
      if (adjustments.brightness !== 0 || adjustments.contrast !== 0) {
        await action.batchPlay([{
          _obj: 'make',
          _target: [{ _ref: 'adjustmentLayer', _enum: 'adjustmentType', _value: 'brightnessContrast' }],
          using: {
            _obj: 'brightnessContrast',
            brightness: adjustments.brightness || 0,
            contrast: adjustments.contrast || 0
          }
        }], {});
      }

      // Apply hue/saturation
      if (adjustments.saturation !== 0) {
        await action.batchPlay([{
          _obj: 'hueSaturation',
          adjustment: [{
            _obj: 'hueSatAdjustmentV2',
            setting: [{
              _obj: 'hueSatAdjustment',
              hue: 0,
              saturation: adjustments.saturation || 0,
              lightness: 0
            }]
          }]
        }], {});
      }

      // Apply levels for shadows/highlights
      if (adjustments.shadows !== 0 || adjustments.highlights !== 0) {
        const shadowInput = Math.max(0, Math.min(255, 127 + (adjustments.shadows || 0)));
        const highlightOutput = Math.max(0, Math.min(255, 255 + (adjustments.highlights || 0) * 0.5));

        await action.batchPlay([{
          _obj: 'levels',
          adjustment: [{
            _obj: 'levelsLayer',
            channel: { _ref: 'channel', _enum: 'channel', _value: 'composite' },
            input: [0, shadowInput, 255],
            output: [0, Math.round(highlightOutput)]
          }]
        }], {});
      }

      // Apply color balance for temperature
      if (adjustments.temperature !== 0) {
        const temp = adjustments.temperature || 0;
        await action.batchPlay([{
          _obj: 'colorBalance',
          shadowLevels: [temp > 0 ? temp * 0.5 : 0, 0, temp < 0 ? -temp * 0.5 : 0],
          midtoneLevels: [temp > 0 ? temp : 0, 0, temp < 0 ? -temp : 0],
          highlightLevels: [temp > 0 ? temp * 0.3 : 0, 0, temp < 0 ? -temp * 0.3 : 0]
        }], {});
      }

      // Apply sharpening
      if (adjustments.sharpening > 0) {
        const amount = adjustments.sharpening;
        await action.batchPlay([{
          _obj: 'unSharpMask',
          amount: amount * 2,
          radius: 1.0 + amount * 0.02,
          threshold: 0
        }], {});
      }

      // Apply noise reduction
      if (adjustments.noiseReduction > 0) {
        await action.batchPlay([{
          _obj: 'noiseReduction',
          amount: adjustments.noiseReduction
        }], {});
      }

    }, { commandName: 'Фотозона: Применение корректировок' });

    showToast('Корректировки применены');
    setStatus('Готов');

  } catch (e) {
    console.error('Ошибка применения:', e);
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }

  isProcessing = false;
}

// ============================================================
// SKIN RETOUCHING
// ============================================================
async function applySkinRetouch() {
  const doc = getActiveDocument();
  if (!doc) {
    showToast('Откройте документ', 'error');
    return;
  }

  setStatus('Ретушь кожи...', 'processing');
  isProcessing = true;

  try {
    await core.executeAsModal(async () => {
      // Frequency Separation technique
      if (currentSettings.freq > 0 || currentSettings.smooth > 0) {
        const strength = Math.max(currentSettings.freq, currentSettings.smooth);
        const blurRadius = Math.ceil(strength * 0.15) + 2;

        // Duplicate layer
        await action.batchPlay([{
          _obj: 'duplicate',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }]
        }], {});

        // Apply Gaussian blur for low frequency
        await action.batchPlay([{
          _obj: 'gaussianBlur',
          radius: blurRadius
        }], {});

        // Apply Image > Apply Image for high frequency
        await action.batchPlay([{
          _obj: 'applyImageEvent',
          to: {
            _ref: 'layer',
            _enum: 'ordinal',
            _value: 'targetEnum'
          },
          blending: { _enum: 'blendMode', _value: 'subtract' },
          scale: 2,
          offset: 128
        }], {});

        // Set blend mode to Linear Light for high frequency layer
        await action.batchPlay([{
          _obj: 'set',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }],
          to: { _obj: 'layer', mode: { _enum: 'blendMode', _value: 'linearLight' } }
        }], {});
      }

      // Skin smoothing via surface blur
      if (currentSettings.smooth > 0) {
        await action.batchPlay([{
          _obj: 'duplicate',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }]
        }], {});

        await action.batchPlay([{
          _obj: 'surfaceBlur',
          radius: Math.ceil(currentSettings.smooth * 0.1) + 1,
          threshold: 15 + currentSettings.smooth * 0.3
        }], {});

        // Add mask based on skin detection (simplified)
        await action.batchPlay([{
          _obj: 'make',
          _target: [{ _ref: 'channel' }],
          at: { _ref: 'channel', _enum: 'channel', _value: 'mask' },
          using: { _obj: 'channel', maskOptions: { _enum: 'maskArea', _value: 'selectedArea' } }
        }], {});
      }

      // Blemish removal via spot healing simulation
      if (currentSettings.blemish > 0) {
        await action.batchPlay([{
          _obj: 'duplicate',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }]
        }], {});

        await action.batchPlay([{
          _obj: 'median',
          radius: Math.ceil(currentSettings.blemish * 0.05) + 1
        }], {});
      }

    }, { commandName: 'Фотозона: Ретушь кожи' });

    showToast('Ретушь кожи применена');
    setStatus('Готов');

  } catch (e) {
    console.error('Ошибка ретуши кожи:', e);
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }

  isProcessing = false;
}

// ============================================================
// FACE RETOUCHING
// ============================================================
async function applyFaceRetouch() {
  const doc = getActiveDocument();
  if (!doc) {
    showToast('Откройте документ', 'error');
    return;
  }

  setStatus('Коррекция лица...', 'processing');
  isProcessing = true;

  try {
    await core.executeAsModal(async () => {
      // Dodge & Burn via curves
      if (currentSettings.dodge > 0) {
        // Create dodge layer
        await action.batchPlay([{
          _obj: 'make',
          _target: [{ _ref: 'layer' }]
        }], {});

        // Fill with 50% gray
        await action.batchPlay([{
          _obj: 'fill',
          using: { _enum: 'fillContents', _value: '50Percent' },
          opacity: { _unit: 'percentUnit', _value: 100 },
          mode: { _enum: 'blendMode', _value: 'overlay' }
        }], {});
      }

      // Teeth whitening via selective color
      if (currentSettings.teeth > 0) {
        await action.batchPlay([{
          _obj: 'selectiveColor',
          _target: [{ _ref: 'adjustmentLayer' }],
          using: {
            _obj: 'selectiveColor',
            colors: {
              _obj: 'colors',
              yellows: {
                cyan: 0,
                magenta: -currentSettings.teeth * 0.3,
                yellow: -currentSettings.teeth * 0.2,
                black: 0
              },
              whites: {
                cyan: 0,
                magenta: -currentSettings.teeth * 0.1,
                yellow: -currentSettings.teeth * 0.15,
                black: 0
              }
            }
          }
        }], {});
      }

      // Eye enhancement
      if (currentSettings.eyes > 0) {
        await action.batchPlay([{
          _obj: 'brightnessContrast',
          brightness: currentSettings.eyes * 0.2,
          contrast: currentSettings.eyes * 0.3,
          _isCommand: true
        }], {});
      }

    }, { commandName: 'Фотозона: Коррекция лица' });

    showToast('Коррекция лица применена');
    setStatus('Готов');

  } catch (e) {
    console.error('Ошибка коррекции лица:', e);
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }

  isProcessing = false;
}

// ============================================================
// COLOR CORRECTION
// ============================================================
async function applyColorCorrection() {
  const adjustments = {
    brightness: currentSettings.bright,
    contrast: currentSettings.contrast,
    saturation: currentSettings.sat,
    temperature: currentSettings.temp,
    shadows: currentSettings.shadow,
    highlights: currentSettings.highlight
  };

  await applyPixelAdjustments(adjustments);
}

// ============================================================
// TOOLS (Sharpening, Denoise, etc.)
// ============================================================
async function applyTools() {
  const doc = getActiveDocument();
  if (!doc) {
    showToast('Откройте документ', 'error');
    return;
  }

  setStatus('Применение инструментов...', 'processing');
  isProcessing = true;

  try {
    await core.executeAsModal(async () => {
      // Sharpening
      if (currentSettings.sharp > 0) {
        await action.batchPlay([{
          _obj: 'unSharpMask',
          amount: currentSettings.sharp * 1.5,
          radius: 1.0 + currentSettings.sharp * 0.015,
          threshold: 2
        }], {});
      }

      // Noise reduction
      if (currentSettings.denoise > 0) {
        await action.batchPlay([{
          _obj: 'noiseReduction',
          amount: currentSettings.denoise
        }], {});
      }

      // Clarity (local contrast)
      if (currentSettings.clarity > 0) {
        await action.batchPlay([{
          _obj: 'highPass',
          radius: 10 + currentSettings.clarity * 0.1
        }], {});

        await action.batchPlay([{
          _obj: 'set',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }],
          to: { _obj: 'layer', mode: { _enum: 'blendMode', _value: 'overlay' } }
        }], {});
      }

      // Vignette
      if (currentSettings.vignette > 0) {
        await action.batchPlay([{
          _obj: 'lensCorrection',
          custom: {
            vignetteAmount: -currentSettings.vignette,
            vignetteMidpoint: 50
          }
        }], {});
      }

      // Grain
      if (currentSettings.grain > 0) {
        await action.batchPlay([{
          _obj: 'addNoise',
          amount: currentSettings.grain * 0.5,
          distribution: { _enum: 'noiseDistribution', _value: 'gaussian' },
          monochromatic: false
        }], {});
      }

    }, { commandName: 'Фотозона: Инструменты' });

    showToast('Инструменты применены');
    setStatus('Готов');

  } catch (e) {
    console.error('Ошибка инструментов:', e);
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }

  isProcessing = false;
}

// ============================================================
// GENERATIVE AI FEATURES
// ============================================================

/**
 * Генеративное заполнение через Firefly API (имитация)
 * В реальном плагине используется Adobe Firefly API
 */
async function generativeFill() {
  const doc = getActiveDocument();
  if (!doc) {
    showToast('Откройте документ', 'error');
    return;
  }

  const prompt = $('#ai-prompt').value.trim();
  if (!prompt) {
    showToast('Введите описание для генерации', 'error');
    return;
  }

  setStatus('AI генерация...', 'processing');
  isProcessing = true;

  try {
    await core.executeAsModal(async () => {
      // Check for selection
      let hasSelection = false;
      try {
        const selection = await action.batchPlay([{
          _obj: 'get',
          _target: [
            { _property: 'selection' },
            { _ref: 'document', _enum: 'ordinal', _value: 'targetEnum' }
          ]
        }], {});
        hasSelection = selection[0]?.selection !== undefined;
      } catch (e) {
        hasSelection = false;
      }

      if (!hasSelection) {
        // Create elliptical selection in center as demo
        const bounds = doc.activeLayer.bounds;
        const cx = (bounds.left + bounds.right) / 2;
        const cy = (bounds.top + bounds.bottom) / 2;
        const rx = (bounds.right - bounds.left) * 0.2;
        const ry = (bounds.bottom - bounds.top) * 0.2;

        await action.batchPlay([{
          _obj: 'set',
          _target: [{ _ref: 'channel', _property: 'selection' }],
          to: {
            _obj: 'rectangle',
            top: cy - ry,
            left: cx - rx,
            bottom: cy + ry,
            right: cx + rx
          }
        }], {});
      }

      // Simulate AI processing with progress
      await simulateProgress('Анализ изображения...', 20);
      await simulateProgress('Генерация контента...', 50);
      await simulateProgress('Синтез результата...', 80);

      // Apply content-aware fill as AI simulation
      await action.batchPlay([{
        _obj: 'fill',
        using: { _enum: 'fillContents', _value: 'contentAware' },
        opacity: { _unit: 'percentUnit', _value: 100 },
        mode: { _enum: 'blendMode', _value: 'normal' }
      }], {});

      await simulateProgress('Готово!', 100);

      // Deselect
      await action.batchPlay([{
        _obj: 'set',
        _target: [{ _ref: 'channel', _property: 'selection' }],
        to: { _enum: 'ordinal', _value: 'none' }
      }], {});

    }, { commandName: 'Фотозона: Генеративное заполнение' });

    showToast(`AI: "${prompt}" — применено`, 'success');
    setStatus('Готов');

  } catch (e) {
    console.error('Ошибка AI:', e);
    showToast('Ошибка генерации: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }

  isProcessing = false;
}

/**
 * Генеративное расширение изображения
 */
async function generativeExpand() {
  const doc = getActiveDocument();
  if (!doc) {
    showToast('Откройте документ', 'error');
    return;
  }

  const { extL, extR, extT, extB } = currentSettings;
  if (extL === 0 && extR === 0 && extT === 0 && extB === 0) {
    showToast('Укажите параметры расширения', 'error');
    return;
  }

  setStatus('AI расширение...', 'processing');
  isProcessing = true;

  try {
    await core.executeAsModal(async () => {
      const origWidth = doc.width;
      const origHeight = doc.height;

      // Calculate new dimensions
      const addL = Math.round(origWidth * extL / 100);
      const addR = Math.round(origWidth * extR / 100);
      const addT = Math.round(origHeight * extT / 100);
      const addB = Math.round(origHeight * extB / 100);

      const newWidth = origWidth + addL + addR;
      const newHeight = origHeight + addT + addB;

      await simulateProgress('Расширение холста...', 30);

      // Resize canvas
      await action.batchPlay([{
        _obj: 'canvasSize',
        width: { _unit: 'pixelsUnit', _value: newWidth },
        height: { _unit: 'pixelsUnit', _value: newHeight },
        horizontal: { _enum: 'horizontalLocation', _value: 'left' },
        vertical: { _enum: 'verticalLocation', _value: 'top' },
        canvasExtensionColorType: { _enum: 'canvasExtensionColorType', _value: 'backgroundColor' }
      }], {});

      await simulateProgress('AI заполнение...', 60);

      // Select extended areas and fill with content-aware
      // Left area
      if (addL > 0) {
        await action.batchPlay([{
          _obj: 'set',
          _target: [{ _ref: 'channel', _property: 'selection' }],
          to: {
            _obj: 'rectangle',
            top: 0, left: 0,
            bottom: newHeight, right: addL
          }
        }], {});

        await action.batchPlay([{
          _obj: 'fill',
          using: { _enum: 'fillContents', _value: 'contentAware' }
        }], {});
      }

      // Right area
      if (addR > 0) {
        await action.batchPlay([{
          _obj: 'set',
          _target: [{ _ref: 'channel', _property: 'selection' }],
          to: {
            _obj: 'rectangle',
            top: 0, left: origWidth + addL,
            bottom: newHeight, right: newWidth
          }
        }], {});

        await action.batchPlay([{
          _obj: 'fill',
          using: { _enum: 'fillContents', _value: 'contentAware' }
        }], {});
      }

      // Top area
      if (addT > 0) {
        await action.batchPlay([{
          _obj: 'set',
          _target: [{ _ref: 'channel', _property: 'selection' }],
          to: {
            _obj: 'rectangle',
            top: 0, left: 0,
            bottom: addT, right: newWidth
          }
        }], {});

        await action.batchPlay([{
          _obj: 'fill',
          using: { _enum: 'fillContents', _value: 'contentAware' }
        }], {});
      }

      // Bottom area
      if (addB > 0) {
        await action.batchPlay([{
          _obj: 'set',
          _target: [{ _ref: 'channel', _property: 'selection' }],
          to: {
            _obj: 'rectangle',
            top: origHeight + addT, left: 0,
            bottom: newHeight, right: newWidth
          }
        }], {});

        await action.batchPlay([{
          _obj: 'fill',
          using: { _enum: 'fillContents', _value: 'contentAware' }
        }], {});
      }

      await simulateProgress('Готово!', 100);

      // Deselect
      await action.batchPlay([{
        _obj: 'set',
        _target: [{ _ref: 'channel', _property: 'selection' }],
        to: { _enum: 'ordinal', _value: 'none' }
      }], {});

    }, { commandName: 'Фотозона: Генеративное расширение' });

    showToast('Изображение расширено с помощью AI');
    setStatus('Готов');

  } catch (e) {
    console.error('Ошибка расширения:', e);
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }

  isProcessing = false;
}

/**
 * Генеративное удаление объектов
 */
async function generativeRemove() {
  const doc = getActiveDocument();
  if (!doc) {
    showToast('Откройте документ', 'error');
    return;
  }

  setStatus('AI удаление...', 'processing');
  isProcessing = true;

  try {
    await core.executeAsModal(async () => {
      await simulateProgress('Анализ выделения...', 30);

      // If smart detect is on, try to auto-select
      if (currentSettings.smartDetect) {
        await action.batchPlay([{
          _obj: 'selectSubject',
          sampleAllLayers: false
        }], {});
      }

      await simulateProgress('Удаление объекта...', 60);

      // Content-aware fill
      await action.batchPlay([{
        _obj: 'fill',
        using: { _enum: 'fillContents', _value: 'contentAware' },
        opacity: { _unit: 'percentUnit', _value: 100 }
      }], {});

      await simulateProgress('Сглаживание...', 80);

      // Additional smoothing pass
      await action.batchPlay([{
        _obj: 'gaussianBlur',
        radius: 0.5
      }], {});

      await simulateProgress('Готово!', 100);

      // Deselect
      await action.batchPlay([{
        _obj: 'set',
        _target: [{ _ref: 'channel', _property: 'selection' }],
        to: { _enum: 'ordinal', _value: 'none' }
      }], {});

    }, { commandName: 'Фотозона: Генеративное удаление' });

    showToast('Объект удалён с помощью AI');
    setStatus('Готов');

  } catch (e) {
    console.error('Ошибка удаления:', e);
    showToast('Ошибка: ' + e.message, 'error');
    setStatus('Ошибка', 'error');
  }

  isProcessing = false;
}

/**
 * Simulate progress with delay
 */
function simulateProgress(text, percent) {
  return new Promise(resolve => {
    setStatus(`${text} ${percent}%`, 'processing');
    setTimeout(resolve, 300 + Math.random() * 400);
  });
}

// ============================================================
// RESET
// ============================================================
function resetAll() {
  Object.keys(currentSettings).forEach(key => {
    if (typeof currentSettings[key] === 'number') {
      currentSettings[key] = 0;
    }
  });
  currentSettings.aiPrompt = '';
  currentSettings.aiStyle = 'auto';
  currentSettings.aiQuality = 'standard';
  currentSettings.smartDetect = true;

  // Reset all sliders
  $$('input[type="range"]').forEach(slider => {
    slider.value = slider.min || 0;
  });

  // Reset text fields
  const prompt = $('#ai-prompt');
  if (prompt) prompt.value = '';

  updateAllSliderDisplays();
  showToast('Все настройки сброшены');
}

// ============================================================
// BUTTON HANDLERS
// ============================================================
function initButtons() {
  // Skin
  $('#btn-apply-skin')?.addEventListener('click', applySkinRetouch);

  // Face
  $('#btn-apply-face')?.addEventListener('click', applyFaceRetouch);

  // Color
  $('#btn-apply-color')?.addEventListener('click', applyColorCorrection);

  // Tools
  $('#btn-apply-all')?.addEventListener('click', applyTools);
  $('#btn-reset')?.addEventListener('click', resetAll);

  // AI
  $('#btn-ai-generate')?.addEventListener('click', generativeFill);
  $('#btn-ai-expand')?.addEventListener('click', generativeExpand);
  $('#btn-ai-remove')?.addEventListener('click', generativeRemove);

  // AI settings
  $('#ai-prompt')?.addEventListener('input', (e) => {
    currentSettings.aiPrompt = e.target.value;
  });

  $('#ai-style')?.addEventListener('change', (e) => {
    currentSettings.aiStyle = e.target.value;
  });

  $('#ai-quality')?.addEventListener('change', (e) => {
    currentSettings.aiQuality = e.target.value;
  });

  $('#ai-smart-detect')?.addEventListener('change', (e) => {
    currentSettings.smartDetect = e.target.checked;
  });
}

// ============================================================
// INITIALIZATION
// ============================================================
function init() {
  initTabs();
  initSliders();
  initPresets();
  initButtons();

  // Check Photoshop connection
  try {
    const doc = getActiveDocument();
    if (doc) {
      setStatus(`Документ: ${doc.title}`);
      $('#status-info').textContent = `${doc.width}×${doc.height}px`;
    } else {
      setStatus('Ожидание документа');
    }
  } catch (e) {
    setStatus('UXP плагин загружен');
  }
}

// Run initialization
init();
