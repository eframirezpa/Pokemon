// Utilidades de tiradas: notación "2d4+2", tirada de respaldo sin 3D y el
// texto que se muestra y queda en el registro.

export const CARAS = [4, 6, 8, 10, 12, 20, 100]

/** "2d4+2" → { cantidad: 2, caras: 4, mod: 2 }; null si no es válida */
export const parseNotacion = (txt) => {
  const m = /^\s*(\d*)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(String(txt || ''))
  if (!m) return null
  const cantidad = Number(m[1] || 1)
  const caras = Number(m[2])
  const mod = m[3] ? (m[3] === '-' ? -1 : 1) * Number(m[4]) : 0
  if (!CARAS.includes(caras) || cantidad < 1 || cantidad > 20) return null
  return { cantidad, caras, mod }
}

export const notacion = ({ cantidad, caras, mod }) =>
  `${cantidad}d${caras}${mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : ''}`

/** Respaldo cuando el navegador no puede con los dados 3D (sin WebGL, etc.) */
export const tiradaPlana = (cantidad, caras) => {
  const out = []
  const buf = new Uint32Array(cantidad)
  crypto.getRandomValues(buf)
  for (const n of buf) out.push((n % caras) + 1)
  return out
}

/**
 * Resultado a partir de los dados que cayeron. Con ventaja o desventaja se
 * tiran dos d20 y se queda el mayor o el menor.
 */
export const resolver = ({ cantidad, caras, mod }, valores, modo = null) => {
  let usados = valores
  if (modo && caras === 20 && valores.length === 2) {
    usados = [modo === 'ventaja' ? Math.max(...valores) : Math.min(...valores)]
  }
  const suma = usados.reduce((a, v) => a + v, 0)
  return { total: suma + mod, valores, usados, mod, notacion: notacion({ cantidad, caras, mod }), modo }
}

/** "1d20+5 (ventaja): [12, 7] + 5 = 17" */
export const detalle = (r) => {
  const modo = r.modo ? ` (${r.modo})` : ''
  const mod = r.mod ? ` ${r.mod > 0 ? '+' : '−'} ${Math.abs(r.mod)}` : ''
  return `${r.notacion}${modo}: [${r.valores.join(', ')}]${mod} = ${r.total}`
}
