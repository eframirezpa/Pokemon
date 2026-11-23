// Quién tiene el turno según la iniciativa activa, y un aviso sonoro corto.

/** El participante con el turno, o null si no hay combate en curso. */
export const participanteEnTurno = (iniciativa) => {
  if (iniciativa?.estado !== 'activa') return null
  const ps = iniciativa.participantes || []
  return ps[Number(iniciativa.turno) || 0] || null
}

/**
 * Dos notas suaves con WebAudio, sin archivos de sonido. Si el navegador no
 * deja reproducir (no hubo interacción todavía, o no hay audio), no pasa nada.
 */
export const sonarTurno = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const ahora = ctx.currentTime
    ;[[660, 0], [880, 0.16]].forEach(([f, t]) => {
      const osc = ctx.createOscillator()
      const vol = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      vol.gain.setValueAtTime(0.0001, ahora + t)
      vol.gain.exponentialRampToValueAtTime(0.18, ahora + t + 0.02)
      vol.gain.exponentialRampToValueAtTime(0.0001, ahora + t + 0.35)
      osc.connect(vol).connect(ctx.destination)
      osc.start(ahora + t)
      osc.stop(ahora + t + 0.4)
    })
    setTimeout(() => ctx.close(), 800)
  } catch { /* sin sonido */ }
}

/**
 * Vibración corta al llegar el turno propio (celular). Donde no hay vibración
 * (escritorio, iPhone) no hace nada; el sonido avisa igual.
 */
export const vibrarTurno = () => {
  try { navigator.vibrate?.([120, 80, 120]) } catch { /* sin vibración */ }
}

/** Posición del turno para comparar: ronda 2 turno 0 va después de ronda 1 turno 5. */
export const posicionTurno = (ini) => (Number(ini?.ronda) || 1) * 1000 + (Number(ini?.turno) || 0)

/**
 * ¿Debe volver a desplegarse sola la barra de turno que el jugador plegó?
 *
 * `plegado` es { en: posición del turno en que la plegó } (o null si está
 * desplegada). Se despliega si empezó un combate nuevo (el turno actual va
 * antes que el guardado) o si llegó un turno nuevo en que juega el
 * participante justo anterior al jugador o el propio jugador. Plegarla en uno
 * de esos turnos la deja plegada en ese mismo turno.
 */
export const debeDesplegarTurno = (plegado, iniciativa, userId) => {
  if (!plegado || iniciativa?.estado !== 'activa') return false
  const ps = iniciativa.participantes || []
  if (!ps.length) return false
  const turno = Number(iniciativa.turno) || 0
  const pos = posicionTurno(iniciativa)
  if (pos < plegado.en) return true
  if (pos === plegado.en) return false
  const yo = String(userId)
  const enTurno = ps[turno]
  const siguiente = ps[(turno + 1) % ps.length]
  return String(enTurno?.user_id) === yo || String(siguiente?.user_id) === yo
}
