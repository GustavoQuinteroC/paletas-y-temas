import { PASOS, type Paso } from './color.js';

export interface Tema {
  /** nombre → escala completa. Ejemplo: { primario: {50: '#...', ..., 950: '#...'} } */
  colores: Record<string, Record<Paso, string>>;
}

export type Formato = 'css' | 'tailwind4' | 'tailwind3' | 'bootstrap' | 'tokens';

export const FORMATOS: Record<Formato, { nombre: string; archivo: string }> = {
  css: { nombre: 'Variables CSS', archivo: 'colores.css' },
  tailwind4: { nombre: 'Tailwind 4 (@theme)', archivo: 'tema.css' },
  tailwind3: { nombre: 'Tailwind 3 (config)', archivo: 'tailwind.config.js' },
  bootstrap: { nombre: 'Bootstrap 5 (Sass)', archivo: '_variables.scss' },
  tokens: { nombre: 'Tokens de diseño (JSON)', archivo: 'tokens.json' },
};

/** Nombre seguro para CSS y JS: minúsculas, sin acentos, con guiones. */
export function slug(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'color';
}

export function exportar(tema: Tema, formato: Formato): string {
  const entradas = Object.entries(tema.colores).map(([nombre, escala]) => [slug(nombre), escala] as const);

  switch (formato) {
    case 'css':
      return `:root {\n${entradas.map(([n, e]) => PASOS.map((p) => `  --${n}-${p}: ${e[p]};`).join('\n')).join('\n\n')}\n}\n`;

    case 'tailwind4':
      return `@import "tailwindcss";\n\n@theme {\n${entradas.map(([n, e]) => PASOS.map((p) => `  --color-${n}-${p}: ${e[p]};`).join('\n')).join('\n\n')}\n}\n`;

    case 'tailwind3': {
      const cuerpo = entradas.map(([n, e]) =>
        `        '${n}': {\n${PASOS.map((p) => `          ${p}: '${e[p]}',`).join('\n')}\n        },`).join('\n');
      return `/** @type {import('tailwindcss').Config} */\nexport default {\n  theme: {\n    extend: {\n      colors: {\n${cuerpo}\n      },\n    },\n  },\n};\n`;
    }

    case 'bootstrap': {
      const roles = ['primary', 'secondary', 'success', 'info', 'warning', 'danger'];
      const escalas = entradas.map(([n, e]) => PASOS.map((p) => `$${n}-${p}: ${e[p]};`).join('\n')).join('\n\n');
      const mapa = entradas.slice(0, roles.length).map(([n], i) => `$${roles[i]}: $${n}-500;`).join('\n');
      return `// Pega esto antes de @import "bootstrap/scss/bootstrap";\n\n${escalas}\n\n${mapa}\n`;
    }

    case 'tokens': {
      // Formato del W3C Design Tokens Community Group (lo leen Tokens Studio para Figma y Style Dictionary).
      const tokens: Record<string, Record<string, { $type: 'color'; $value: string }>> = {};
      for (const [n, e] of entradas) {
        tokens[n] = Object.fromEntries(PASOS.map((p) => [String(p), { $type: 'color' as const, $value: e[p] }]));
      }
      return `${JSON.stringify({ color: tokens }, null, 2)}\n`;
    }
  }
}
