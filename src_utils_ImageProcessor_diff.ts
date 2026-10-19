--- src/utils/ImageProcessor.ts (原始)
export interface ProcessingSettings {
  skinSmoothing: number;
  skinTone: number;
  blemishRemoval: number;
  eyeEnhancement: number;
  teethWhitening: number;
  dodgeBurn: number;
  colorCorrection: number;
  frequencySeparation: number;
  sharpening: number;
  noiseReduction: number;
  contrast: number;
  brightness: number;
  saturation: number;
  warmth: number;
  vignette: number;
  clarity: number;
}

export const DEFAULT_SETTINGS: ProcessingSettings = {
  skinSmoothing: 0,
  skinTone: 0,
  blemishRemoval: 0,
  eyeEnhancement: 0,
  teethWhitening: 0,
  dodgeBurn: 0,
  colorCorrection: 0,
  frequencySeparation: 0,
  sharpening: 0,
  noiseReduction: 0,
  contrast: 0,
  brightness: 0,
  saturation: 0,
  warmth: 0,
  vignette: 0,
  clarity: 0,
};

const MAX_DIMENSION = 4096;

export class ImageProcessor {
  private sourceCanvas: HTMLCanvasElement;

  constructor(image: HTMLImageElement) {
    // Downscale if needed to prevent memory issues
    let w = image.width;
    let h = image.height;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    this.sourceCanvas = document.createElement('canvas');
    this.sourceCanvas.width = w;
    this.sourceCanvas.height = h;
    const ctx = this.sourceCanvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0, w, h);
  }

  get width() { return this.sourceCanvas.width; }
  get height() { return this.sourceCanvas.height; }

  getOriginalCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.sourceCanvas.width;
    c.height = this.sourceCanvas.height;
    c.getContext('2d')!.drawImage(this.sourceCanvas, 0, 0);
    return c;
  }

  async process(settings: ProcessingSettings): Promise<HTMLCanvasElement> {
    const w = this.sourceCanvas.width;
    const h = this.sourceCanvas.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.sourceCanvas, 0, 0);

    // Check if any processing needed
    const hasAny = Object.values(settings).some(v => v !== 0);
    if (!hasAny) return canvas;

    let imageData = ctx.getImageData(0, 0, w, h);

    // Yield to UI between heavy operations
    const yieldToUI = () => new Promise<void>(r => setTimeout(r, 0));

    if (settings.frequencySeparation > 0 || settings.skinSmoothing > 0) {
      imageData = this.frequencySeparation(imageData, Math.max(settings.frequencySeparation, settings.skinSmoothing));
    }
    if (settings.skinTone > 0) imageData = this.skinToneCorrection(imageData, settings.skinTone);
    if (settings.blemishRemoval > 0) {
      await yieldToUI();
      imageData = this.blemishRemoval(imageData, settings.blemishRemoval);
    }
    if (settings.eyeEnhancement > 0) imageData = this.eyeEnhance(imageData, settings.eyeEnhancement);
    if (settings.teethWhitening > 0) imageData = this.teethWhitening(imageData, settings.teethWhitening);
    if (settings.dodgeBurn > 0) imageData = this.dodgeAndBurn(imageData, settings.dodgeBurn);
    if (settings.colorCorrection > 0) imageData = this.autoColorCorrection(imageData, settings.colorCorrection);
    if (settings.noiseReduction > 0) {
      await yieldToUI();
      imageData = this.noiseReduction(imageData, settings.noiseReduction);
    }
    if (settings.brightness !== 0) imageData = this.adjustBrightness(imageData, settings.brightness);
    if (settings.contrast !== 0) imageData = this.adjustContrast(imageData, settings.contrast);
    if (settings.saturation !== 0) imageData = this.adjustSaturation(imageData, settings.saturation);
    if (settings.warmth !== 0) imageData = this.adjustWarmth(imageData, settings.warmth);
    if (settings.clarity > 0) {
      await yieldToUI();
      imageData = this.adjustClarity(imageData, settings.clarity);
    }
    if (settings.sharpening > 0) imageData = this.sharpen(imageData, settings.sharpening);
    if (settings.vignette > 0) imageData = this.applyVignette(imageData, settings.vignette);

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // === SKIN ===
  private frequencySeparation(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const strength = amount / 100;
    const radius = Math.max(2, Math.ceil(strength * 8));
    const lowFreq = this.gaussianBlur(data, width, height, radius);
    const blend = strength * 0.6;

    for (let i = 0; i < data.length; i += 4) {
      result.data[i] = Math.round(data[i] * (1 - blend) + lowFreq[i] * blend);
      result.data[i + 1] = Math.round(data[i + 1] * (1 - blend) + lowFreq[i + 1] * blend);
      result.data[i + 2] = Math.round(data[i + 2] * (1 - blend) + lowFreq[i + 2] * blend);
    }
    return result;
  }

  private skinToneCorrection(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const strength = amount / 100;
    const blend = strength * 0.35;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (this.isSkin(r, g, b)) {
        const avg = (r + g + b) / 3;
        result.data[i] = Math.round(r + (avg * 1.04 - r) * blend);
        result.data[i + 1] = Math.round(g + (avg * 0.96 - g) * blend);
        result.data[i + 2] = Math.round(b + (avg * 0.91 - b) * blend);
      }
    }
    return result;
  }

  private blemishRemoval(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const strength = amount / 100;
    // Limit radius for performance
    const radius = Math.min(4, Math.ceil(strength * 3) + 1);

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (!this.isSkin(r, g, b)) continue;

        let avgR = 0, avgG = 0, avgB = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy += 2) {
          for (let dx = -radius; dx <= radius; dx += 2) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            avgR += data[nIdx]; avgG += data[nIdx + 1]; avgB += data[nIdx + 2];
            count++;
          }
        }
        avgR /= count; avgG /= count; avgB /= count;

        const deviation = Math.abs(r - avgR) + Math.abs(g - avgG) + Math.abs(b - avgB);
        if (deviation > 25) {
          const b2 = Math.min(1, (deviation - 25) / 60) * strength;
          result.data[idx] = Math.round(r + (avgR - r) * b2);
          result.data[idx + 1] = Math.round(g + (avgG - g) * b2);
          result.data[idx + 2] = Math.round(b + (avgB - b) * b2);
        }
      }
    }
    return result;
  }

  // === FACE ===
  private eyeEnhance(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const boost = (amount / 100) * 0.35;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);

      if (lum > 30 && lum < 130 && sat > 20) {
        result.data[i] = Math.min(255, Math.round(r * (1 + boost * 0.3)));
        result.data[i + 1] = Math.min(255, Math.round(g * (1 + boost * 0.3)));
        result.data[i + 2] = Math.min(255, Math.round(b * (1 + boost * 0.4)));
      }
    }
    return result;
  }

  private teethWhitening(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const w = (amount / 100) * 0.5;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (r > g && g > b && (r - b) < 45 && lum > 140 && lum < 240) {
        result.data[i] = Math.min(255, Math.round(r + (255 - r) * w * 0.4));
        result.data[i + 1] = Math.min(255, Math.round(g + (255 - g) * w * 0.6));
        result.data[i + 2] = Math.min(255, Math.round(b + (255 - b) * w * 0.8));
      }
    }
    return result;
  }

  private dodgeAndBurn(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const s = amount / 100;

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum > 170) {
        const f = 1 + s * 0.12;
        result.data[i] = Math.min(255, Math.round(data[i] * f));
        result.data[i + 1] = Math.min(255, Math.round(data[i + 1] * f));
        result.data[i + 2] = Math.min(255, Math.round(data[i + 2] * f));
      } else if (lum < 60) {
        const f = 1 - s * 0.12;
        result.data[i] = Math.round(data[i] * f);
        result.data[i + 1] = Math.round(data[i + 1] * f);
        result.data[i + 2] = Math.round(data[i + 2] * f);
      }
    }
    return result;
  }

  // === COLOR ===
  private autoColorCorrection(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const strength = amount / 100;
    const px = data.length / 4;
    let tR = 0, tG = 0, tB = 0;

    for (let i = 0; i < data.length; i += 4) {
      tR += data[i]; tG += data[i + 1]; tB += data[i + 2];
    }
    const aR = tR / px, aG = tG / px, aB = tB / px;
    // Prevent division by zero
    if (aR < 1 || aG < 1 || aB < 1) return result;

    const avg = (aR + aG + aB) / 3;
    const cR = avg / aR, cG = avg / aG, cB = avg / aB;

    for (let i = 0; i < data.length; i += 4) {
      result.data[i] = Math.min(255, Math.max(0, Math.round(data[i] * (1 + (cR - 1) * strength))));
      result.data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] * (1 + (cG - 1) * strength))));
      result.data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] * (1 + (cB - 1) * strength))));
    }
    return result;
  }

  // === DETAIL ===
  private noiseReduction(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const strength = amount / 100;
    const radius = Math.min(3, Math.ceil(strength * 2));
    if (radius === 0) return result;
    const bl = strength * 0.5;

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        let r = 0, g = 0, b = 0, c = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; c++;
          }
        }
        const idx = (y * width + x) * 4;
        result.data[idx] = Math.round(data[idx] * (1 - bl) + (r / c) * bl);
        result.data[idx + 1] = Math.round(data[idx + 1] * (1 - bl) + (g / c) * bl);
        result.data[idx + 2] = Math.round(data[idx + 2] * (1 - bl) + (b / c) * bl);
      }
    }
    return result;
  }

  private sharpen(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const strength = amount / 50;
    const blurred = this.gaussianBlur(data, width, height, 1);

    for (let i = 0; i < data.length; i += 4) {
      result.data[i] = Math.min(255, Math.max(0, Math.round(data[i] + (data[i] - blurred[i]) * strength)));
      result.data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] + (data[i + 1] - blurred[i + 1]) * strength)));
      result.data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] + (data[i + 2] - blurred[i + 2]) * strength)));
    }
    return result;
  }

  private adjustClarity(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const strength = amount / 100;
    const blurred = this.gaussianBlur(data, width, height, 8);

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum > 40 && lum < 220) {
        result.data[i] = Math.min(255, Math.max(0, Math.round(data[i] + (data[i] - blurred[i]) * strength * 0.5)));
        result.data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] + (data[i + 1] - blurred[i + 1]) * strength * 0.5)));
        result.data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] + (data[i + 2] - blurred[i + 2]) * strength * 0.5)));
      }
    }
    return result;
  }

  // === LIGHT ===
  private adjustBrightness(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const adj = amount * 1.5;
    for (let i = 0; i < data.length; i += 4) {
      result.data[i] = Math.min(255, Math.max(0, data[i] + adj));
      result.data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adj));
      result.data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adj));
    }
    return result;
  }

  private adjustContrast(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const v = amount * 2.55;
    const denom = 255 * (259 - v);
    if (denom === 0) return result;
    const f = (259 * (v + 255)) / denom;
    for (let i = 0; i < data.length; i += 4) {
      result.data[i] = Math.min(255, Math.max(0, Math.round(f * (data[i] - 128) + 128)));
      result.data[i + 1] = Math.min(255, Math.max(0, Math.round(f * (data[i + 1] - 128) + 128)));
      result.data[i + 2] = Math.min(255, Math.max(0, Math.round(f * (data[i + 2] - 128) + 128)));
    }
    return result;
  }

  private adjustSaturation(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const sat = 1 + amount / 50;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      result.data[i] = Math.min(255, Math.max(0, Math.round(gray + sat * (data[i] - gray))));
      result.data[i + 1] = Math.min(255, Math.max(0, Math.round(gray + sat * (data[i + 1] - gray))));
      result.data[i + 2] = Math.min(255, Math.max(0, Math.round(gray + sat * (data[i + 2] - gray))));
    }
    return result;
  }

  private adjustWarmth(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const w = amount * 0.5;
    for (let i = 0; i < data.length; i += 4) {
      result.data[i] = Math.min(255, Math.max(0, data[i] + w));
      result.data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - w * 0.5));
    }
    return result;
  }

  private applyVignette(imageData: ImageData, amount: number): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    const strength = amount / 100;
    const cx = width / 2, cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const factor0 = strength * 0.7;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
        const factor = 1 - dist * dist * factor0;
        const idx = (y * width + x) * 4;
        result.data[idx] = Math.round(data[idx] * factor);
        result.data[idx + 1] = Math.round(data[idx + 1] * factor);
        result.data[idx + 2] = Math.round(data[idx + 2] * factor);
      }
    }
    return result;
  }

  // === HELPERS ===
  private isSkin(r: number, g: number, b: number): boolean {
    return r > 95 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15 && Math.abs(r - g) < 80;
  }

  private gaussianBlur( Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    if (radius <= 0) return new Uint8ClampedArray(data);
    const result = new Uint8ClampedArray(data.length);
    const kernel = this.gaussianKernel(radius);
    const size = kernel.length;
    const half = Math.floor(size / 2);

    const temp = new Uint8ClampedArray(data.length);
    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, s = 0;
        for (let k = 0; k < size; k++) {
          const px = Math.min(width - 1, Math.max(0, x + k - half));
          const idx = (y * width + px) * 4;
          r += data[idx] * kernel[k];
          g += data[idx + 1] * kernel[k];
          b += data[idx + 2] * kernel[k];
          s += kernel[k];
        }
        const idx = (y * width + x) * 4;
        temp[idx] = r / s;
        temp[idx + 1] = g / s;
        temp[idx + 2] = b / s;
        temp[idx + 3] = data[idx + 3];
      }
    }
    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, s = 0;
        for (let k = 0; k < size; k++) {
          const py = Math.min(height - 1, Math.max(0, y + k - half));
          const idx = (py * width + x) * 4;
          r += temp[idx] * kernel[k];
          g += temp[idx + 1] * kernel[k];
          b += temp[idx + 2] * kernel[k];
          s += kernel[k];
        }
        const idx = (y * width + x) * 4;
        result[idx] = r / s;
        result[idx + 1] = g / s;
        result[idx + 2] = b / s;
        result[idx + 3] = temp[idx + 3];
      }
    }
    return result;
  }

  private gaussianKernel(radius: number): number[] {
    const size = radius * 2 + 1;
    const kernel: number[] = [];
    const sigma = Math.max(0.5, radius / 3); // Prevent sigma=0
    for (let i = 0; i < size; i++) {
      const x = i - radius;
      kernel.push(Math.exp(-(x * x) / (2 * sigma * sigma)));
    }
    return kernel;
  }
}


+++ src/utils/ImageProcessor.ts (修改后)
