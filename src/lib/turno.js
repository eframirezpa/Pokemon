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
