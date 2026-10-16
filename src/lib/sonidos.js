// Efectos de sonido con WebAudio, sin archivos. Si el navegador no deja
// reproducir (no hubo interacción todavía, o no hay audio), no pasa nada.

/**
 * Pifia (1 natural): el trombón triste, "wah wah wah waaaa". Cuatro notas que
 * bajan por semitonos; la última, larga y temblando.
 */
export const sonarPifia = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const t0 = ctx.currentTime + 0.05
    // [frecuencia, inicio, duración]: Sol, Fa#, Fa y Mi largo
    const notas = [[392, 0, 0.42], [370, 0.46, 0.42], [349, 0.92, 0.42], [330, 1.38, 1.3]]

    // Sierra con filtro pasa bajos: suena a metal con sordina
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'lowpass'
    filtro.frequency.value = 1100
    filtro.Q.value = 4
    filtro.connect(ctx.destination)

    notas.forEach(([f, ini, dur], i) => {
      const osc = ctx.createOscillator()
      const vol = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(f, t0 + ini)
      // Cada nota cae un poco al final, como el "wah" de la sordina
      osc.frequency.linearRampToValueAtTime(f * 0.97, t0 + ini + dur)
      if (i === notas.length - 1) {
        // Vibrato de la última
        const lfo = ctx.createOscillator()
        const prof = ctx.createGain()
        lfo.frequency.value = 6
        prof.gain.value = 9
        lfo.connect(prof).connect(osc.frequency)
        lfo.start(t0 + ini + 0.25)
        lfo.stop(t0 + ini + dur)
      }
      vol.gain.setValueAtTime(0.0001, t0 + ini)
      vol.gain.exponentialRampToValueAtTime(0.16, t0 + ini + 0.06)
      vol.gain.setValueAtTime(0.16, t0 + ini + dur * 0.7)
      vol.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur)
      osc.connect(vol).connect(filtro)
      osc.start(t0 + ini)
      osc.stop(t0 + ini + dur + 0.05)
    })
    setTimeout(() => ctx.close(), 3200)
  } catch { /* sin sonido */ }
}
