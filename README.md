# Paletas y temas

[![Pruebas](https://github.com/GustavoQuinteroC/paletas-y-temas/actions/workflows/pruebas.yml/badge.svg)](https://github.com/GustavoQuinteroC/paletas-y-temas/actions/workflows/pruebas.yml)
![React + TypeScript](https://img.shields.io/badge/React-TypeScript-2350ff)
![Licencia MIT](https://img.shields.io/badge/licencia-MIT-2350ff)

Parte de un color y obtén una paleta completa por teoría del color: escalas 50 a 950 listas para tu sitio, revisión de contraste WCAG, una vista previa en modo claro y oscuro, y el código para CSS, Tailwind, Bootstrap o Figma.

**Úsalo aquí:** https://proyectos.gustavoquintero.dev/paletas/

> **English:** A color palette and theme generator built with React and TypeScript. Harmonies (complementary, analogous, triadic, split-complementary, tetradic, monochromatic) and 50–950 scales are computed in OKLCH with gamut mapping, every pair gets a WCAG 2.2 contrast rating, and the theme exports to CSS variables, Tailwind 4 `@theme`, Tailwind 3 config, Bootstrap 5 Sass and W3C design tokens (Tokens Studio for Figma). No color library: the math is in `src/color.ts`. The UI is in Spanish.

## Qué hace

- **Seis armonías:** complementaria, análoga, triádica, complementaria dividida, tetrádica y monocromática, más un gris con el tono de la paleta.
- **Escalas 50 a 950** por color. Tu color aparece tal cual en el paso más cercano a su luminosidad.
- **Contraste WCAG 2.2** de las combinaciones más usadas, con nivel AAA, AA, AA para texto grande o "No pasa".
- **Vista previa** de una página de ejemplo en modo claro y oscuro.
- **Exportación** a variables CSS, Tailwind 4 (`@theme`), Tailwind 3 (`tailwind.config.js`), Bootstrap 5 (Sass, con `$primary` y compañía) y tokens JSON en el formato del W3C Design Tokens Community Group, que leen Tokens Studio para Figma y Style Dictionary.
- **Degradado** entre los dos primeros colores, interpolado en OKLCH, con respaldo para navegadores viejos.
- **Enlace para compartir:** la paleta queda en la URL (`#base=2350ff&armonia=triadica`).

## Por qué OKLCH y no HSL

En HSL, un amarillo y un azul con la misma "luminosidad" se ven muy distintos: el amarillo brilla y el azul se ve oscuro. OKLCH está diseñado para que la luminosidad corresponda a lo que percibe el ojo, así que girar el tono para armar una armonía conserva el peso visual de cada color, y las escalas quedan parejas entre colores.

Cuando un color calculado no existe en sRGB, se baja el croma con búsqueda binaria, conservando luminosidad y tono, en vez de recortar canales (lo que cambia el tono).

## Correrlo localmente

```bash
npm ci
npm run dev        # servidor de desarrollo de Vite
npm run build      # tipos + compilación a dist/
```

## Pruebas

```bash
npm run typecheck  # TypeScript estricto
npm test           # Vitest: conversiones contra valores de referencia, ida y vuelta, contraste 21:1, armonías, escalas y formatos
npm run e2e        # Playwright: armonías, estado en la URL, color inválido, exportación y contraste
```

## Estructura

| Archivo | Qué hace |
|---|---|
| `src/color.ts` | sRGB ↔ OKLCH, ajuste de gama, contraste WCAG, armonías y escalas |
| `src/exportar.ts` | Los cinco formatos de exportación |
| `src/App.tsx` | Interfaz |
| `src/estilos.css` | Estilos |

La única dependencia en tiempo de ejecución es React.

## Licencia

MIT.
