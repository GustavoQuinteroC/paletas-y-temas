// Matemática de color sin dependencias.
// Las armonías y escalas se calculan en OKLCH (Björn Ottosson, 2020): a diferencia de HSL,
// mover el tono en OKLCH conserva la luminosidad percibida, así que un amarillo y un azul
// con la misma L se ven igual de claros.

export interface Rgb { r: number; g: number; b: number } // 0–1, sRGB con gamma
export interface Oklch { l: number; c: number; h: number } // l 0–1, c ≥ 0, h 0–360

const limitar = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export function hexARgb(hex: string): Rgb {
  const limpio = hex.trim().replace(/^#/, '');
  const largo = /^[0-9a-f]{3}$/i.test(limpio) ? limpio.replace(/./g, '$&$&') : limpio;
  if (!/^[0-9a-f]{6}$/i.test(largo)) throw new Error(`Color inválido: ${hex}`);
  const n = Number.parseInt(largo, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function rgbAHex({ r, g, b }: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(limitar(v) * 255).toString(16).padStart(2, '0')).join('');
}

export function esHexValido(texto: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(texto.trim());
}

const aLineal = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const aGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function rgbAOklch({ r, g, b }: Rgb): Oklch {
  const [lr, lg, lb] = [aLineal(r), aLineal(g), aLineal(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  const h = c < 1e-4 ? 0 : (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/** OKLCH a sRGB sin recortar: puede salir de 0–1 si el color no existe en sRGB. */
function oklchARgbLibre({ l, c, h }: Oklch): Rgb {
  const rad = h * Math.PI / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: aGamma(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    g: aGamma(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    b: aGamma(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  };
}

const dentroDeGama = ({ r, g, b }: Rgb) => [r, g, b].every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/**
 * Convierte a sRGB. Si el color no cabe en la pantalla, baja el croma (búsqueda binaria)
 * manteniendo luminosidad y tono, en vez de recortar canales, que cambia el tono.
 */
export function oklchARgb(color: Oklch): Rgb {
  const l = limitar(color.l);
  let rgb = oklchARgbLibre({ ...color, l });
  if (dentroDeGama(rgb)) return rgb;
  let bajo = 0;
  let alto = color.c;
  for (let i = 0; i < 24; i++) {
    const medio = (bajo + alto) / 2;
    if (dentroDeGama(oklchARgbLibre({ l, c: medio, h: color.h }))) bajo = medio; else alto = medio;
  }
  rgb = oklchARgbLibre({ l, c: bajo, h: color.h });
  return { r: limitar(rgb.r), g: limitar(rgb.g), b: limitar(rgb.b) };
}

export const hexAOklch = (hex: string) => rgbAOklch(hexARgb(hex));
export const oklchAHex = (color: Oklch) => rgbAHex(oklchARgb(color));

/* ---------- Contraste WCAG 2.2 ---------- */

export function luminanciaRelativa(hex: string): number {
  const { r, g, b } = hexARgb(hex);
  return 0.2126 * aLineal(r) + 0.7152 * aLineal(g) + 0.0722 * aLineal(b);
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminanciaRelativa(a), luminanciaRelativa(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

export type NivelWcag = 'AAA' | 'AA' | 'AA grande' | 'No pasa';

/** Nivel para texto normal; "AA grande" sirve solo para texto de 24 px o 18.66 px en negritas. */
export function nivelWcag(razon: number): NivelWcag {
  if (razon >= 7) return 'AAA';
  if (razon >= 4.5) return 'AA';
  if (razon >= 3) return 'AA grande';
  return 'No pasa';
}

/** Elige blanco o tinta oscura según cuál contraste más con el fondo. */
export function textoSobre(fondo: string, oscuro = '#0b1220', claro = '#ffffff'): string {
  return contraste(fondo, oscuro) >= contraste(fondo, claro) ? oscuro : claro;
}

/* ---------- Armonías y escalas ---------- */

export const ARMONIAS = {
  complementaria: { nombre: 'Complementaria', giros: [0, 180] },
  analoga: { nombre: 'Análoga', giros: [0, -30, 30] },
  triadica: { nombre: 'Triádica', giros: [0, 120, 240] },
  complementaria_dividida: { nombre: 'Complementaria dividida', giros: [0, 150, 210] },
  tetradica: { nombre: 'Tetrádica', giros: [0, 90, 180, 270] },
  monocromatica: { nombre: 'Monocromática', giros: [0] },
} as const;

export type Armonia = keyof typeof ARMONIAS;

export function armonia(base: string, tipo: Armonia): string[] {
  const color = hexAOklch(base);
  return ARMONIAS[tipo].giros.map((giro, i) =>
    i === 0 ? rgbAHex(hexARgb(base)) : oklchAHex({ ...color, h: (color.h + giro + 360) % 360 }));
}

export const PASOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Paso = (typeof PASOS)[number];

// Luminosidad objetivo de cada paso, parecida a las escalas de Tailwind.
const L_PASO: Record<Paso, number> = { 50: 0.975, 100: 0.945, 200: 0.89, 300: 0.81, 400: 0.71, 500: 0.62, 600: 0.54, 700: 0.46, 800: 0.39, 900: 0.32, 950: 0.24 };

/**
 * Escala 50–950 de un color. Mantiene el tono, fija la luminosidad de cada paso
 * y reduce el croma en los extremos, donde los colores saturados se salen de la gama.
 */
export function escala(hex: string): Record<Paso, string> {
  const { c, h } = hexAOklch(hex);
  const salida = {} as Record<Paso, string>;
  for (const paso of PASOS) {
    const l = L_PASO[paso];
    const factor = paso <= 100 ? 0.25 : paso === 200 ? 0.5 : paso >= 900 ? 0.75 : 1;
    salida[paso] = oklchAHex({ l, c: c * factor, h });
  }
  // El color que eligió la persona aparece tal cual en el paso más cercano a su luminosidad.
  salida[pasoBase(hex)] = rgbAHex(hexARgb(hex));
  return salida;
}

/** Paso de la escala cuya luminosidad objetivo está más cerca del color base. */
export function pasoBase(hex: string): Paso {
  const { l } = hexAOklch(hex);
  return PASOS.reduce((mejor, p) => (Math.abs(L_PASO[p] - l) < Math.abs(L_PASO[mejor] - l) ? p : mejor), 500 as Paso);
}

/** Gris con un toque del tono base: queda mejor que un gris puro junto a la paleta. */
export function neutro(hex: string): string {
  const { h } = hexAOklch(hex);
  return oklchAHex({ l: 0.62, c: 0.018, h });
}
