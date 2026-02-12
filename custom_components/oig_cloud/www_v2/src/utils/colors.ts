export interface Color {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(clamp(x, 0, 255)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function rgbToString(color: Color, alpha?: number): string {
  if (alpha !== undefined) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function mixColors(color1: Color, color2: Color, ratio: number): Color {
  const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
  const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
  const b = Math.round(color1.b + (color2.b - color1.b) * ratio);
  return { r, g, b };
}

export function lighten(hex: string, amount: number): string {
  const color = hexToRgb(hex);
  const white: Color = { r: 255, g: 255, b: 255 };
  const mixed = mixColors(color, white, amount);
  return rgbToHex(mixed.r, mixed.g, mixed.b);
}

export function darken(hex: string, amount: number): string {
  const color = hexToRgb(hex);
  const black: Color = { r: 0, g: 0, b: 0 };
  const mixed = mixColors(color, black, amount);
  return rgbToHex(mixed.r, mixed.g, mixed.b);
}

export function getCssVar(name: string, fallback: string = '#000'): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  const bgColor = getCssVar('--primary-background-color', '#ffffff');
  const rgb = hexToRgb(bgColor);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
