import { describe, expect, it } from 'vitest';
import { ARMONIAS, armonia, contraste, escala, esHexValido, hexAOklch, hexARgb, nivelWcag, oklchAHex, pasoBase, PASOS, rgbAHex, textoSobre } from '../src/color.js';
import { exportar, slug } from '../src/exportar.js';

describe('conversiones', () => {
  it('lee hex corto y largo', () => {
    expect(rgbAHex(hexARgb('#fff'))).toBe('#ffffff');
    expect(rgbAHex(hexARgb('2350FF'))).toBe('#2350ff');
    expect(() => hexARgb('#12')).toThrow();
    expect(esHexValido('#abc')).toBe(true);
    expect(esHexValido('azul')).toBe(false);
  });
  it('ida y vuelta por OKLCH conserva el color', () => {
    for (const hex of ['#2350ff', '#00c389', '#ff5d5d', '#0b1a4a', '#ffffff', '#000000', '#e5b80b']) {
      expect(oklchAHex(hexAOklch(hex))).toBe(hex);
    }
  });
  it('coincide con valores de referencia de OKLCH', () => {
    const blanco = hexAOklch('#ffffff');
    expect(blanco.l).toBeCloseTo(1, 3);
    expect(blanco.c).toBeLessThan(1e-3);
    const rojo = hexAOklch('#ff0000');
    expect(rojo.l).toBeCloseTo(0.628, 2);
    expect(rojo.c).toBeCloseTo(0.258, 2);
    expect(rojo.h).toBeCloseTo(29.2, 0);
  });
  it('lleva a la gama sRGB un color imposible sin romper el tono', () => {
    const hex = oklchAHex({ l: 0.7, c: 0.5, h: 145 });
    expect(esHexValido(hex)).toBe(true);
    expect(hexAOklch(hex).h).toBeCloseTo(145, -1);
  });
});

describe('contraste WCAG', () => {
  it('blanco contra negro es 21:1', () => {
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contraste('#000', '#fff')).toBeCloseTo(21, 5);
  });
  it('clasifica niveles', () => {
    expect(nivelWcag(7.1)).toBe('AAA');
    expect(nivelWcag(4.5)).toBe('AA');
    expect(nivelWcag(3.2)).toBe('AA grande');
    expect(nivelWcag(2)).toBe('No pasa');
  });
  it('elige el texto que más contrasta', () => {
    expect(textoSobre('#ffff00')).toBe('#0b1220');
    expect(textoSobre('#0b1a4a')).toBe('#ffffff');
  });
});

describe('armonías y escalas', () => {
  it('cada armonía da el número de colores esperado y empieza con la base', () => {
    for (const [tipo, { giros }] of Object.entries(ARMONIAS)) {
      const colores = armonia('#2350ff', tipo as keyof typeof ARMONIAS);
      expect(colores).toHaveLength(giros.length);
      expect(colores[0]).toBe('#2350ff');
    }
  });
  it('la complementaria está a 180° de tono', () => {
    const [a, b] = armonia('#2350ff', 'complementaria');
    const diferencia = Math.abs(hexAOklch(a!).h - hexAOklch(b!).h);
    expect(Math.min(diferencia, 360 - diferencia)).toBeGreaterThan(170);
  });
  it('la escala va de claro a oscuro e incluye el color base', () => {
    const e = escala('#2350ff');
    const ls = PASOS.map((p) => hexAOklch(e[p]).l);
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeLessThan(ls[i - 1]!);
    expect(e[pasoBase('#2350ff')]).toBe('#2350ff');
  });
});

describe('exportar', () => {
  const tema = { colores: { 'Primario Azul': escala('#2350ff') } };
  it('genera nombres seguros', () => {
    expect(slug('Primario Azul')).toBe('primario-azul');
    expect(slug('Acción ñ')).toBe('accion-n');
  });
  it('variables CSS y Tailwind 4', () => {
    expect(exportar(tema, 'css')).toMatch(/--primario-azul-500: #[0-9a-f]{6};/);
    expect(exportar(tema, 'tailwind4')).toMatch(/@theme \{\n {2}--color-primario-azul-50: /);
  });
  it('Bootstrap asigna el 500 a $primary', () => {
    expect(exportar(tema, 'bootstrap')).toContain('$primary: $primario-azul-500;');
  });
  it('tokens JSON válidos en formato DTCG', () => {
    const json = JSON.parse(exportar(tema, 'tokens'));
    expect(json.color['primario-azul']['500']).toEqual({ $type: 'color', $value: expect.stringMatching(/^#[0-9a-f]{6}$/) });
  });
});
