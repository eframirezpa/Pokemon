// Estados alterados (poke5e, Status Conditions). Los ven todos en la mesa;
// lo que dicen las reglas se aplica solo donde la app tiene los datos: daño
// al final del turno, tiradas de inicio y final de turno, desventajas en las
// ventanas de tiradas y la velocidad a la mitad.
//
// La misma lista vive en el backend (back/src/lib/estados.js), que descarta
// cualquier estado que no esté aquí: si se agrega uno, hay que tocar los dos.
//
// - No volátiles: uno a la vez. Volátiles (confuso, retroceso): además de uno
//   no volátil; terminan fuera de combate o al cambiar de Pokémon.
// - Se guardan como texto "quemado,confuso" y sus datos aparte (meta):
//     { dormido: { restantes: 3 }, congelado: { dc: 13 }, gracia: { quemado: 1 } }
//   restantes = finales de turno que le quedan · dc = para liberarse de Congelado
//   gracia = tras curarse no puede volver a sufrirlo hasta el final de su siguiente turno
// - Los turnos son por usuario: el de un Pokémon es el de su entrenador (o el del DM).
export const ESTADOS = [
  { clave: 'paralizado',       label: 'Paralizado',       icono: '⚡', color: '#F8D030' },
  { clave: 'dormido',          label: 'Dormido',          icono: '💤', color: '#A890F0' },
  { clave: 'envenenado',       label: 'Envenenado',       icono: '☠️', color: '#A040A0' },
  { clave: 'envenenado_grave', label: 'Envenenado grave', icono: '💀', color: '#7B1FA2' },
  { clave: 'quemado',          label: 'Quemado',          icono: '🔥', color: '#F08030' },
  { clave: 'congelado',        label: 'Congelado',        icono: '❄️', color: '#98D8D8' },
  { clave: 'confuso',          label: 'Confuso',          icono: '💫', color: '#F85888', volatil: true },
  { clave: 'retroceso',        label: 'Retroceso',        icono: '😵', color: '#9CA3AF', volatil: true },
]

const PORCLAVE = new Map(ESTADOS.map(e => [e.clave, e]))
export const VOLATILES = ESTADOS.filter(e => e.volatil).map(e => e.clave)
export const esVolatil = (clave) => VOLATILES.includes(clave)
export const etiquetaEstado = (clave) => PORCLAVE.get(clave)?.label || clave

/** 'quemado,confuso' → [{clave,label,...}]. Ignora lo que no conozca. */
export const leerEstados = (texto) => String(texto ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  .map(e => PORCLAVE.get(e)).filter(Boolean)

/** Las claves que tiene, a partir del texto o de una lista. */
export const clavesEstados = (x) => (Array.isArray(x) ? x : leerEstados(x).map(e => e.clave))
  .filter(c => PORCLAVE.has(c))

// Inmunidades por tipo: un Pokémon de estos tipos no puede sufrir el estado.
export const INMUNIDADES = {
  quemado: ['Fire'],
  congelado: ['Ice'],
  paralizado: ['Electric'],
  envenenado: ['Poison', 'Steel'],
  envenenado_grave: ['Poison', 'Steel'],
}

/** Estados a los que es inmune un Pokémon con estos tipos (claves). */
export const estadosInmunes = (tipos = []) => {
  const ts = tipos.filter(Boolean).map(t => String(t).toLowerCase())
  return Object.entries(INMUNIDADES)
    .filter(([, inm]) => inm.some(t => ts.includes(t.toLowerCase())))
    .map(([clave]) => clave)
}

// ── Elegir estados ──────────────────────────────────────────────────────────

/**
 * Lo que queda al tocar un estado en el selector: si ya lo tiene, se le quita;
 * si no, reemplaza al de su misma clase (no volátil o volátil).
 */
export const alternarEstado = (claves, clave) => {
  const cs = clavesEstados(claves)
  if (cs.includes(clave)) return cs.filter(c => c !== clave)
  const otros = cs.filter(c => esVolatil(c) !== esVolatil(clave))
  const nv = [...otros, clave].find(c => !esVolatil(c))
  const v = [...otros, clave].find(c => esVolatil(c))
  return [nv, v].filter(Boolean)
}

/** Datos con los que empieza cada estado. */
export const metaInicial = (clave, { dc = null } = {}) => {
  if (clave === 'dormido' || clave === 'confuso') return { restantes: 3 }
  if (clave === 'retroceso') return { restantes: 1 }
  if (clave === 'congelado') return { dc: Number(dc) || 12 }
  return null
}

const limpiarMeta = (m) => {
  const out = {}
  for (const [k, v] of Object.entries(m || {})) {
    if (v && typeof v === 'object' && Object.keys(v).length) out[k] = v
  }
  return Object.keys(out).length ? out : null
}

/**
 * Cambio de estados con sus datos: lo que se quita entra en periodo de
 * gracia; lo que se agrega arranca con su meta inicial.
 *   ({ claves, meta }, nuevas, { dc }) → { claves, texto, meta }
 */
export const cambiarEstados = ({ claves, meta }, nuevas, { dc = null } = {}) => {
  const antes = clavesEstados(claves)
  const despues = clavesEstados(nuevas)
  const m = { ...(meta || {}) }
  const gracia = { ...(m.gracia || {}) }
  for (const c of antes) if (!despues.includes(c)) { delete m[c]; gracia[c] = 1 }
  for (const c of despues) {
    if (!antes.includes(c)) { const ini = metaInicial(c, { dc }); if (ini) m[c] = ini; else delete m[c] }
    delete gracia[c]
  }
  m.gracia = gracia
  return { claves: despues, texto: despues.join(',') || null, meta: limpiarMeta(m) }
}

export const enGracia = (meta, clave) => !!meta?.gracia?.[clave]

// ── Desventajas y velocidad ─────────────────────────────────────────────────
// Devuelven el motivo (para mostrarlo) o null.
const primero = (claves, lista) => {
  const c = clavesEstados(claves).find(x => lista.includes(x))
  return c ? etiquetaEstado(c) : null
}

/** Tiradas de ataque: Envenenado y Retroceso. */
export const desventajaAtaque = (claves) => primero(claves, ['envenenado', 'envenenado_grave', 'retroceso'])
/** Pruebas de característica (skills): Envenenado y Retroceso. */
export const desventajaPrueba = (claves) => primero(claves, ['envenenado', 'envenenado_grave', 'retroceso'])
/** Salvaciones: Dormido y Retroceso todas; Paralizado las de STR y DEX. */
export const desventajaSalvacion = (claves, attr) => {
  const a = String(attr || '').trim().toUpperCase()
  return primero(claves, ['dormido', 'retroceso', ...(a === 'STR' || a === 'DEX' ? ['paralizado'] : [])])
}
/** Daño: Quemado tira dos veces y se queda con el menor. */
export const danoMenorDeDos = (claves) => primero(claves, ['quemado'])
/** Paralizado: se mueve a la mitad de velocidad. */
export const velocidadAMitad = (claves) => clavesEstados(claves).includes('paralizado')

/** "30 ft" → "15 ft" (la mitad, hacia abajo). Sin número, igual. */
export const mitadVelocidad = (valor) => String(valor ?? '').replace(/\d+/, n => String(Math.floor(Number(n) / 2)))

// ── Turnos ──────────────────────────────────────────────────────────────────
// c: { claves, meta, hp, prof }

/** Daño por estado al final del turno (proficiencia; el grave, el doble). */
export const danoPorTurno = (c) => {
  const cs = clavesEstados(c.claves)
  if (!(Number(c.hp) > 0)) return []    // "hasta curarse o quedar inconsciente"
  const prof = Number(c.prof) || 2
  const out = []
  if (cs.includes('envenenado')) out.push({ estado: 'envenenado', cantidad: prof })
  if (cs.includes('envenenado_grave')) out.push({ estado: 'envenenado_grave', cantidad: prof * 2 })
  if (cs.includes('quemado')) out.push({ estado: 'quemado', cantidad: prof })
  return out
}

/** Tiradas al final del turno: d20 de Dormido (11+ despierta), STR de Congelado. */
export const tiradasFinTurno = (c) => {
  const cs = clavesEstados(c.claves)
  const out = []
  if (cs.includes('dormido')) out.push({ estado: 'dormido', dado: '1d20', meta: 11, texto: 'd20: con 11 o más se despierta' })
  if (cs.includes('congelado')) {
    const dc = Number(c.meta?.congelado?.dc) || 12
    out.push({ estado: 'congelado', dado: '1d20', salvacion: 'STR', meta: dc, texto: `Salvación de STR contra DC ${dc} para liberarse` })
  }
  return out
}

/** Tiradas al inicio del turno: d4 de Paralizado (antes) y d8 de Confuso. */
export const tiradasInicioTurno = (c) => {
  const cs = clavesEstados(c.claves)
  const out = []
  if (cs.includes('paralizado')) out.push({ estado: 'paralizado', dado: '1d4', texto: 'd4: con 1 no puede actuar hasta el inicio de su siguiente turno' })
  if (cs.includes('confuso')) out.push({ estado: 'confuso', dado: '1d8', texto: 'd8: tabla de Confuso' })
  return out
}

/** Recordatorios al inicio del turno, sin tirada. */
export const avisosInicioTurno = (c) => {
  const cs = clavesEstados(c.claves)
  const out = []
  if (cs.includes('dormido')) out.push('Está dormido: no puede actuar (incapacitado y apresado).')
  if (cs.includes('congelado')) out.push('Está congelado: no puede actuar (incapacitado y apresado).')
  if (cs.includes('paralizado')) out.push('Paralizado: se mueve a la mitad de velocidad.')
  if (cs.includes('confuso')) out.push('Confuso: no puede usar reacciones.')
  return out
}

export const CONFUSO_D8 = {
  1: 'usa Struggle contra sí mismo y acierta solo',
  2: 'usa Struggle contra el Pokémon más cercano (si no hay, contra sí mismo y acierta)',
  3: 'no se mueve ni actúa',
  4: 'elige qué hace', 5: 'elige qué hace', 6: 'elige qué hace', 7: 'elige qué hace',
  8: 'se le pasa la confusión',
}

const quitar = (st, clave, textos, por) => {
  st.claves = st.claves.filter(c => c !== clave)
  delete st.meta[clave]
  st.nuevaGracia.push(clave)
  textos.push(`${etiquetaEstado(clave)}: ${por}`)
}

const cerrar = (st) => {
  const gracia = { ...(st.meta.gracia || {}) }
  for (const c of st.nuevaGracia) gracia[c] = 1
  st.meta.gracia = gracia
  return { claves: st.claves, texto: st.claves.join(',') || null, meta: limpiarMeta(st.meta) }
}

/**
 * Final del turno. resultados: { dormido: d20, congelado: total de la salvación }.
 * Devuelve { claves, texto, meta, dano, textos }.
 */
export const resolverFinTurno = (c, resultados = {}) => {
  const st = { claves: clavesEstados(c.claves), meta: JSON.parse(JSON.stringify(c.meta || {})), nuevaGracia: [] }
  const textos = []
  const danos = danoPorTurno(c)
  for (const d of danos) textos.push(`${etiquetaEstado(d.estado)}: pierde ${d.cantidad} de vida`)
  // La gracia que ya tenía avanza un turno (la de ahora empieza después)
  const g = { ...(st.meta.gracia || {}) }
  for (const k of Object.keys(g)) { g[k] -= 1; if (g[k] <= 0) delete g[k] }
  st.meta.gracia = g

  if (st.claves.includes('dormido')) {
    const v = Number(resultados.dormido)
    const r = (Number(st.meta.dormido?.restantes) || 3) - 1
    if (v >= 11) quitar(st, 'dormido', textos, `se despierta (d20 = ${v})`)
    else if (r <= 0) quitar(st, 'dormido', textos, `se despierta: pasaron 3 rondas (d20 = ${v})`)
    else { st.meta.dormido = { restantes: r }; textos.push(`Dormido: sigue dormido (d20 = ${v}, quedan ${r} ronda${r === 1 ? '' : 's'})`) }
  }
  if (st.claves.includes('congelado')) {
    const dc = Number(st.meta.congelado?.dc) || 12
    const t = Number(resultados.congelado)
    if (t >= dc) quitar(st, 'congelado', textos, `se libera (STR ${t} contra DC ${dc})`)
    else textos.push(`Congelado: sigue congelado (STR ${t} contra DC ${dc})`)
  }
  for (const vol of ['confuso', 'retroceso']) {
    if (!st.claves.includes(vol)) continue
    const r = (Number(st.meta[vol]?.restantes) || (vol === 'confuso' ? 3 : 1)) - 1
    if (r <= 0) quitar(st, vol, textos, vol === 'confuso' ? 'se le pasa (3 rondas)' : 'se le pasa')
    else st.meta[vol] = { restantes: r }
  }
  return { ...cerrar(st), dano: danos.reduce((a, d) => a + d.cantidad, 0), textos }
}

/**
 * Inicio del turno. resultados: { paralizado: d4, confuso: d8, struggle: daño
 * a sí mismo si el d8 sale 1 }. Devuelve { claves, texto, meta, dano, textos }.
 */
export const resolverInicioTurno = (c, resultados = {}) => {
  const st = { claves: clavesEstados(c.claves), meta: JSON.parse(JSON.stringify(c.meta || {})), nuevaGracia: [] }
  const textos = []
  let dano = 0
  if (st.claves.includes('paralizado')) {
    const v = Number(resultados.paralizado)
    textos.push(v === 1 ? `Paralizado (d4 = 1): no puede actuar hasta el inicio de su siguiente turno` : `Paralizado (d4 = ${v}): puede actuar`)
  }
  if (st.claves.includes('confuso')) {
    const v = Number(resultados.confuso)
    if (v === 8) quitar(st, 'confuso', textos, 'se le pasa (d8 = 8)')
    else {
      textos.push(`Confuso (d8 = ${v}): ${CONFUSO_D8[v] || 'elige qué hace'}`)
      if (v === 1) {
        dano = Math.max(0, Math.floor(Number(resultados.struggle) || 0))
        if (dano) textos.push(`Struggle contra sí mismo: pierde ${dano} de vida`)
      }
    }
  }
  return { ...cerrar(st), dano, textos }
}

/** Al cerrar la iniciativa o cambiar de Pokémon: se van los volátiles. */
export const sinVolatiles = ({ claves, meta }) => {
  const cs = clavesEstados(claves)
  if (!cs.some(esVolatil)) return null
  return cambiarEstados({ claves: cs, meta }, cs.filter(c => !esVolatil(c)))
}
