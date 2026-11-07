import { useEffect, useMemo, useState } from 'react';
import { ARMONIAS, armonia, contraste, escala, esHexValido, hexAOklch, nivelWcag, oklchAHex, pasoBase, PASOS, textoSobre, type Armonia, type Paso } from './color.js';
import { exportar, FORMATOS, type Formato } from './exportar.js';

const NOMBRES = ['primario', 'secundario', 'acento', 'cuarto'];

interface Estado { base: string; armonia: Armonia; neutro: boolean }

function leerHash(): Estado {
  const p = new URLSearchParams(location.hash.slice(1));
  const base = `#${p.get('base') ?? ''}`;
  const tipo = p.get('armonia') as Armonia | null;
  return {
    base: esHexValido(base) ? base.toLowerCase() : '#2350ff',
    armonia: tipo && tipo in ARMONIAS ? tipo : 'triadica',
    neutro: p.get('neutro') !== '0',
  };
}

function normalizarHex(texto: string): string {
  const limpio = texto.trim().replace(/^#/, '').toLowerCase();
  return `#${limpio.length === 3 ? limpio.replace(/./g, '$&$&') : limpio}`;
}

async function copiar(texto: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

function useAviso(): [string, (t: string) => void] {
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 1800);
    return () => clearTimeout(t);
  }, [aviso]);
  return [aviso, setAviso];
}

export default function App() {
  const [estado, setEstado] = useState<Estado>(leerHash);
  const [borrador, setBorrador] = useState(estado.base);
  const [formato, setFormato] = useState<Formato>('css');
  const [oscuro, setOscuro] = useState(false);
  const [angulo, setAngulo] = useState(135);
  const [aviso, setAviso] = useAviso();

  useEffect(() => {
    const hash = `base=${estado.base.slice(1)}&armonia=${estado.armonia}${estado.neutro ? '' : '&neutro=0'}`;
    history.replaceState(null, '', `#${hash}`);
  }, [estado]);

  const colores = useMemo(() => {
    const lista = armonia(estado.base, estado.armonia);
    const pares: [string, string][] = estado.armonia === 'monocromatica'
      ? [['primario', lista[0]!]]
      : lista.map((hex, i) => [NOMBRES[i] ?? `color-${i + 1}`, hex]);
    if (estado.neutro) {
      const { h } = hexAOklch(estado.base);
      pares.push(['neutro', oklchAHex({ l: 0.62, c: 0.018, h })]);
    }
    return pares.map(([nombre, hex]) => ({ nombre, hex, escala: escala(hex), paso: pasoBase(hex) }));
  }, [estado]);

  const tema = useMemo(() => ({ colores: Object.fromEntries(colores.map((c) => [c.nombre, c.escala])) }), [colores]);
  const codigo = useMemo(() => exportar(tema, formato), [tema, formato]);

  const primario = colores[0]!.escala;
  const secundario = (colores[1] ?? colores[0]!).escala;
  const neutro = colores.find((c) => c.nombre === 'neutro')?.escala ?? primario;

  const cambiarBase = (hex: string) => {
    setBorrador(hex);
    if (esHexValido(hex)) setEstado((e) => ({ ...e, base: normalizarHex(hex) }));
  };

  const alAzar = () => {
    const bytes = crypto.getRandomValues(new Uint16Array(2));
    cambiarBase(oklchAHex({ l: 0.55 + (bytes[0]! % 15) / 100, c: 0.16, h: bytes[1]! % 360 }));
  };

  const copiarColor = async (hex: string) => setAviso((await copiar(hex)) ? `${hex} copiado` : 'No se pudo copiar');

  const descargar = () => {
    const url = URL.createObjectURL(new Blob([codigo], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: FORMATOS[formato].archivo });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const pares = colores.filter((c) => c.nombre !== 'neutro').flatMap((c) => [
    { etiqueta: `Texto ${c.nombre} 900 sobre ${c.nombre} 50`, texto: c.escala[900], fondo: c.escala[50] },
    { etiqueta: `Texto blanco sobre ${c.nombre} 600`, texto: '#ffffff', fondo: c.escala[600] },
    { etiqueta: `Texto ${c.nombre} 600 sobre blanco`, texto: c.escala[600], fondo: '#ffffff' },
    { etiqueta: `Texto ${c.nombre} 300 sobre ${c.nombre} 950`, texto: c.escala[300], fondo: c.escala[950] },
  ]);

  const desde = primario[500];
  const hasta = secundario[500];

  return (
    <>
      <section className="tarjeta controles" aria-label="Color base y armonía">
        <div className="base">
          <label htmlFor="base-texto">Color base</label>
          <div className="base__fila">
            <input type="color" aria-label="Elegir color base" value={estado.base} onChange={(e) => cambiarBase(e.target.value)} />
            <input id="base-texto" className="hex" value={borrador} spellCheck={false} maxLength={7}
              aria-invalid={!esHexValido(borrador)} onChange={(e) => cambiarBase(e.target.value)} />
            <button type="button" className="boton-chico" onClick={alAzar}>Color al azar</button>
          </div>
          {!esHexValido(borrador) && <p className="ayuda error">Escribe un color hexadecimal, por ejemplo #2350ff.</p>}
        </div>
        <fieldset className="armonias">
          <legend>Armonía</legend>
          {(Object.keys(ARMONIAS) as Armonia[]).map((tipo) => (
            <label key={tipo} className="chip">
              <input type="radio" name="armonia" value={tipo} checked={estado.armonia === tipo}
                onChange={() => setEstado((e) => ({ ...e, armonia: tipo }))} />
              <span>{ARMONIAS[tipo].nombre}</span>
            </label>
          ))}
        </fieldset>
        <label className="casilla">
          <input type="checkbox" checked={estado.neutro} onChange={(e) => setEstado((s) => ({ ...s, neutro: e.target.checked }))} />
          Incluir un gris con el tono de la paleta
        </label>
      </section>

      <section className="tarjeta" aria-labelledby="titulo-escalas">
        <div className="encabezado">
          <h2 id="titulo-escalas">Escalas</h2>
          <p className="ayuda">Haz clic en un color para copiarlo. El punto marca tu color original.</p>
        </div>
        <div className="escalas">
          {colores.map((c) => (
            <div className="escala" key={c.nombre}>
              <h3>{c.nombre}</h3>
              <ol>
                {PASOS.map((p: Paso) => (
                  <li key={p}>
                    <button type="button" className="muestra" style={{ background: c.escala[p], color: textoSobre(c.escala[p]) }}
                      onClick={() => copiarColor(c.escala[p])} aria-label={`${c.nombre} ${p}: ${c.escala[p]}, copiar`}>
                      <span className="muestra__paso">{p}{p === c.paso ? ' ●' : ''}</span>
                      <span className="muestra__hex">{c.escala[p]}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <div className="dos">
        <section className={`tarjeta vista${oscuro ? ' vista--oscura' : ''}`} aria-labelledby="titulo-vista">
          <div className="encabezado">
            <h2 id="titulo-vista">Vista previa</h2>
            <label className="casilla"><input type="checkbox" checked={oscuro} onChange={(e) => setOscuro(e.target.checked)} /> Modo oscuro</label>
          </div>
          <div className="maqueta" style={{
            background: oscuro ? neutro[950] : neutro[50], color: oscuro ? neutro[100] : neutro[900], borderColor: oscuro ? neutro[800] : neutro[200],
          }}>
            <div className="maqueta__barra" style={{ background: oscuro ? neutro[900] : '#ffffff', borderColor: oscuro ? neutro[800] : neutro[200] }}>
              <strong style={{ color: oscuro ? primario[300] : primario[600] }}>Cafetería Aurora</strong>
              <span style={{ color: oscuro ? neutro[400] : neutro[600] }}>Menú · Sucursales · Pedidos</span>
            </div>
            <div className="maqueta__cuerpo">
              <h3>Tu café de siempre, listo cuando llegas</h3>
              <p style={{ color: oscuro ? neutro[300] : neutro[700] }}>Pide desde tu celular y recoge sin hacer fila.</p>
              <div className="maqueta__botones">
                <span className="maqueta__boton" style={{ background: oscuro ? primario[400] : primario[600], color: textoSobre(oscuro ? primario[400] : primario[600]) }}>Hacer pedido</span>
                <span className="maqueta__boton maqueta__boton--borde" style={{ borderColor: oscuro ? secundario[400] : secundario[600], color: oscuro ? secundario[300] : secundario[700] }}>Ver menú</span>
              </div>
              <div className="maqueta__aviso" style={{ background: oscuro ? secundario[900] : secundario[100], color: oscuro ? secundario[100] : secundario[900] }}>
                Nueva sucursal en el centro: 2x1 en lattes esta semana.
              </div>
            </div>
          </div>
        </section>

        <section className="tarjeta" aria-labelledby="titulo-contraste">
          <h2 id="titulo-contraste">Contraste (WCAG 2.2)</h2>
          <p className="ayuda">AA pide 4.5:1 para texto normal y 3:1 para texto grande; AAA pide 7:1.</p>
          <ul className="contrastes">
            {pares.map((par) => {
              const razon = contraste(par.texto, par.fondo);
              const nivel = nivelWcag(razon);
              return (
                <li key={par.etiqueta}>
                  <span className="contraste__muestra" style={{ background: par.fondo, color: par.texto }}>Aa</span>
                  <span className="contraste__etiqueta">{par.etiqueta}</span>
                  <span className="contraste__razon">{razon.toFixed(2)}:1</span>
                  <span className={`nivel nivel--${nivel === 'No pasa' ? 'no' : nivel === 'AA grande' ? 'grande' : 'si'}`}>{nivel}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="dos">
        <section className="tarjeta" aria-labelledby="titulo-exportar">
          <div className="encabezado">
            <h2 id="titulo-exportar">Exportar</h2>
            <select aria-label="Formato" value={formato} onChange={(e) => setFormato(e.target.value as Formato)}>
              {(Object.keys(FORMATOS) as Formato[]).map((f) => <option key={f} value={f}>{FORMATOS[f].nombre}</option>)}
            </select>
          </div>
          <pre className="codigo" tabIndex={0} aria-label={`Código en formato ${FORMATOS[formato].nombre}`}><code>{codigo}</code></pre>
          <div className="acciones">
            <button type="button" className="boton boton--principal" onClick={async () => setAviso((await copiar(codigo)) ? 'Código copiado' : 'No se pudo copiar')}>Copiar código</button>
            <button type="button" className="boton" onClick={descargar}>Descargar {FORMATOS[formato].archivo}</button>
          </div>
        </section>

        <section className="tarjeta" aria-labelledby="titulo-degradado">
          <h2 id="titulo-degradado">Degradado</h2>
          <p className="ayuda">Del {colores[0]!.nombre} al {(colores[1] ?? colores[0]!).nombre}, mezclado en OKLCH para que el centro no se vea gris.</p>
          <div className="degradado" style={{ background: `linear-gradient(${angulo}deg, ${desde}, ${hasta})`, backgroundImage: `linear-gradient(in oklch ${angulo}deg, ${desde}, ${hasta})` }} />
          <label className="deslizador">Ángulo <output>{angulo}°</output>
            <input type="range" min={0} max={360} value={angulo} onChange={(e) => setAngulo(Number(e.target.value))} />
          </label>
          <pre className="codigo codigo--corto"><code>{`background: linear-gradient(${angulo}deg, ${desde}, ${hasta});\nbackground: linear-gradient(in oklch ${angulo}deg, ${desde}, ${hasta});`}</code></pre>
          <button type="button" className="boton" onClick={async () => setAviso((await copiar(`background: linear-gradient(${angulo}deg, ${desde}, ${hasta});\nbackground: linear-gradient(in oklch ${angulo}deg, ${desde}, ${hasta});`)) ? 'Degradado copiado' : 'No se pudo copiar')}>Copiar CSS</button>
        </section>
      </div>

      <p className="aviso" role="status" aria-live="polite">{aviso}</p>
    </>
  );
}
