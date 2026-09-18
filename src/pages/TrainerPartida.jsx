import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Smartphone, User, Backpack, Shield, Sword, Monitor, X, Minus, Plus, Pencil, PencilOff, BedDouble, Dices } from 'lucide-react'
import PartidaRoom from '../components/PartidaRoom'
import PokemonList from './PokemonList'
import CharacterSheet from '../components/CharacterSheet'
import TrainerLevelUpModal from '../components/TrainerLevelUpModal'
import Mochila from '../components/Mochila'
import Equipamiento from '../components/Equipamiento'
import PokemonBox from '../components/PokemonBox'
import FormulaAtaqueModal from '../components/FormulaAtaqueModal'
import PendingImprovementModal from '../components/PendingImprovementModal'
import EditarPersonajeModal from '../components/EditarPersonajeModal'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { hpValues } from '../lib/hp'
import DescansoModal from '../components/DescansoModal'
import PokeballsIcon from '../components/PokeballsIcon'
import HeldItemsModal from '../components/HeldItemsModal'
import { buildProfs } from '../lib/profs'
import { construirSkillsTrainer } from '../lib/trainerStats'
import { EstadoTrigger, EstadosChips, EstadosPopup } from '../components/EstadosControl'
import { AuraInspirado, InspiradoInfoPopup } from '../components/InspiradoAura'
import PokeballSpinner from '../components/PokeballSpinner'
import LoadingOverlay from '../components/LoadingOverlay'
import { acDelTrainer, ICONO_REDONDO } from '../lib/trainerCombatShared'
import { CombatePanel } from '../components/partida/CombatePanel'

export default function TrainerPartida() {
  const { id }   = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const stateId  = location.state?.personaje?.id_personaje ?? null
  const nombrePartida = location.state?.nombre ?? null

  const [personajeId, setPersonajeId] = useState(stateId)
  const [showPokedex, setShowPokedex] = useState(false)
  const [pokedexListo, setPokedexListo] = useState(false) // primera consulta resuelta
  const [showChar, setShowChar]       = useState(false)
  const [showMochila, setShowMochila] = useState(false)
  const [showEquip, setShowEquip]     = useState(false)
  const [showBelt, setShowBelt]       = useState(false)
  const [showPC, setShowPC]           = useState(false)
  const [showEdit, setShowEdit]       = useState(false)
  const [isEditable, setIsEditable]   = useState(false) // personaje_is_editable (lo controla el master)
  const [isInspirado, setIsInspirado] = useState(false) // personaje_inspirado (lo activa el master)
  const [showInspiradoInfo, setShowInspiradoInfo] = useState(false)
  const [pending, setPending]         = useState([])    // mejoras de nivel por confirmar (secuencial)
  const [renames, setRenames]         = useState([])    // Pokémon recibidos pendientes de renombrar
  const [levelUps, setLevelUps]       = useState([])    // niveles de entrenador por confirmar
  const [charSkills, setCharSkills]   = useState([])    // habilidades del entrenador
  const [charEstados, setCharEstados] = useState(null)  // estados alterados del entrenador
  const [pokeEstados, setPokeEstados] = useState(null)  // ...y los del Pokémon abierto
  const [charNombre, setCharNombre]   = useState('')    // nombre del personaje, no del usuario
  const [recursos, setRecursos]       = useState([])    // Extra Points de la ruta
  const [recursosTitulo, setRecursosTitulo] = useState('Trainer')
  const [recursosRasgos, setRecursosRasgos] = useState([]) // rasgos de la ruta ya alcanzados
  const [especialidades, setEspecialidades] = useState([]) // especialidades del entrenador
  const [recursosFeat, setRecursosFeat] = useState([])   // puntos que dan los feats (Lucky Points)
  const [recursoEdit, setRecursoEdit] = useState(null)  // recurso en el lápiz
  const [dadoBatalla, setDadoBatalla] = useState(null)  // recurso de dados a punto de gastarse
  const [recursoVal, setRecursoVal]   = useState(0)
  // Dados de golpe: { actual, maximo }. Van aparte de charData/pokeData porque
  // el panel los muta en vivo y esos objetos se rearman al abrir el control.
  const [hdTrainer, setHdTrainer]     = useState(null)
  const [hdPoke, setHdPoke]           = useState(null)
  const [showDescanso, setShowDescanso] = useState(false)
  const [apodoEdit, setApodoEdit]     = useState({ id: null, value: '' })
  const [ppMove, setPpMove]           = useState(null)  // movimiento cuyo gasto de PP se está confirmando
  const [ppCantidad, setPpCantidad]   = useState(1)
  const [ppBusy, setPpBusy]           = useState(false)
  const [ppError, setPpError]         = useState('')
  const [castCooldown, setCastCooldown] = useState(false)
  const castTimer = useRef(null)
  const [gpMove, setGpMove]     = useState(null)  // movimiento en gestión de PP
  const [gpMax, setGpMax]       = useState(0)
  const [gpCur, setGpCur]       = useState(0)
  const [gpBusy, setGpBusy]     = useState(false)
  const [gpError, setGpError]   = useState('')
  const [renameBusy, setRenameBusy]   = useState(false)
  const [renameError, setRenameError] = useState('')
  const [partyVersion, setPartyVersion] = useState(0)   // cambia cuando el master actualiza la party
  const [pokemonInvocado, setPokemonInvocado] = useState(null) // id_personaje_pokemon
  const [invocadoSprite, setInvocadoSprite]   = useState(null)
  const [openControl, setOpenControl] = useState(null) // 'trainer' | 'pokemon' | null (solo uno a la vez)
  const [cargandoPanel, setCargandoPanel] = useState(null) // panel que se está pidiendo, o null
  const [charProfs, setCharProfs] = useState(null) // proficiencias del entrenador (de /full)
  const [heldOpen, setHeldOpen] = useState(false)   // popup de objetos equipados del Pokémon
  const [charData, setCharData] = useState(null)
  const [pokeData, setPokeData] = useState(null)
  const partidaApiRef = useRef(null) // acciones expuestas por PartidaRoom (p. ej. sendPartyUpdate)
  const [fight, setFight] = useState({ active: false, players: [] }) // modo lucha
  // Monitor (PC/escritorio con mouse) → iconos más grandes
  const [isMonitor, setIsMonitor] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  // Mitad del tamaño del avatar (66px en monitor, 44px normal), para la carita
  // que abre el selector. Los iconos que aparecen debajo del avatar son la
  // mitad de ESTE tamaño: se leen como una marca discreta, no como otro botón.
  const estadoIconSize = isMonitor ? 33 : 22
  const estadoChipSize = estadoIconSize / 2
  const [estadosPopup, setEstadosPopup] = useState(null) // 'trainer' | 'pokemon' | null
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const onChange = () => setIsMonitor(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])


  // Lee si el personaje es editable y si está inspirado (lo activa el master).
  // Se re-consulta al recibir party_update.
  useEffect(() => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}`)
      .then(r => r.json())
      .then(d => {
        setIsEditable(!!d?.personaje_is_editable)
        setIsInspirado(!!d?.personaje_inspirado)
      })
      .catch(() => {})
  }, [personajeId, partyVersion])

  // Mejoras pendientes por subida de nivel: se muestran al entrar y tras subir experiencia
  const refreshPending = () => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}/pending-improvements`)
      .then(r => r.json())
      .then(d => setPending(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  // Pokémon recién recibidos que aún hay que renombrar. Se consulta también en
  // cada party_update, que es lo que disparan las dos transferencias.
  const refreshRenames = () => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}/pokemon/pending-rename`)
      .then(r => r.json())
      .then(d => setRenames(Array.isArray(d) ? d : []))
      .catch(() => {})
  }
  // Niveles de entrenador pendientes de confirmar. Se persisten, así que
  // sobreviven a una recarga: subir de nivel ocurre en el servidor y el jugador
  // puede no estar mirando cuando pasa.
  // Si esta recarga falla, la lista se queda con el pendiente que se acaba de
  // confirmar y la ventana no se reemplaza. Tragarse el error dejaba al jugador
  // mirando una pantalla que no avanza y sin nada que leer, así que al menos se
  // deja constancia en la consola.
  const refreshLevelUps = () => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}/improvements`)
      .then(r => r.json())
      .then(d => setLevelUps(Array.isArray(d) ? d : []))
      .catch(e => console.error('No se pudo releer las subidas de nivel:', e))
  }
  // Ganar experiencia o subir de nivel un Pokémon puede subir también al
  // entrenador, porque su nivel se deriva de los niveles de sus Pokémon. Hay
  // que releer las DOS colas: sin esto la ventana de leveo no aparecía hasta
  // recargar, ya que solo se refrescaba con partyVersion, que únicamente mueve
  // el máster.
  const trasEventoPokemon = () => { refreshPending(); refreshLevelUps() }

  // El descanso toca HP, dados y PP de varios a la vez: al terminar se cierra
  // el control abierto para que no muestre valores viejos.
  const abrirDescanso = () => setShowDescanso(true)
  const trasDescanso = () => { setOpenControl(null); setCharData(null); setPokeData(null); trasEventoPokemon() }

  useEffect(() => { refreshPending() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [personajeId])
  useEffect(() => { refreshRenames() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [personajeId, partyVersion])
  useEffect(() => { refreshLevelUps() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [personajeId, partyVersion])

  // Recupera el personaje del usuario: state → localStorage → backend (para recargas).
  // Un usuario puede tener varios personajes en la misma partida (el lobby los lista
  // para elegir), así que cuando no hay elección guardada NO se puede adivinar: antes
  // se tomaba el primero de la lista y cargaba el personaje equivocado.
  // La clave lleva el usuario: sin él, dos cuentas en el mismo navegador
  // compartían la elección y la segunda cargaba el personaje de la primera
  // -y lo anunciaba así en la partida, con su nombre-. El v3 descarta las
  // elecciones que guardó la clave compartida.
  useEffect(() => {
    if (!user?.user_id) return
    const storeKey = `trainer_personaje_v3_${user.user_id}_${id}`
    if (stateId) { localStorage.setItem(storeKey, String(stateId)); return }

    const stored = localStorage.getItem(storeKey)
    if (stored) { setPersonajeId(Number(stored)); return }

    apiFetch(`/personaje?id_partida=${id}`)
      .then(r => r.json())
      .then(list => {
        const arr = Array.isArray(list) ? list : []
        if (arr.length === 1) {
          // Un solo personaje: no hay ambigüedad posible
          setPersonajeId(arr[0].id_personaje)
          localStorage.setItem(storeKey, String(arr[0].id_personaje))
          return
        }
        // Varios (o ninguno): que lo elija en el lobby en vez de adivinar
        navigate(`/partida-lobby/${id}`, { replace: true, state: { nombre: nombrePartida } })
      })
      .catch(() => {})
  }, [id, stateId, navigate, nombrePartida, user?.user_id])

  // Restaura el Pokémon invocado tras una recarga: se persiste en personaje_pokemon_is_in_game
  useEffect(() => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}/pokemon?en_equipo=1`)
      .then(r => r.json())
      .then(list => {
        const inGame = Array.isArray(list) && list.find(p => p.personaje_pokemon_is_in_game)
        if (inGame) {
          const sprite = (inGame.pokemon_is_shiny && inGame.pokemon_media_main_shiny)
            ? inGame.pokemon_media_main_shiny
            : (inGame.pokemon_media_main || inGame.pokemon_media_sprite)
          setPokemonInvocado(inGame.id_personaje_pokemon)
          setInvocadoSprite(sprite)
        }
      })
      .catch(() => {})
  }, [personajeId])

  // Persiste el estado "en juego" del Pokémon invocado (no bloquea la UI)
  const persistEnJuego = (idpp, enJuego) =>
    apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/en-juego`, {
      method: 'PATCH', body: JSON.stringify({ en_juego: enJuego }),
    }).catch(() => {})

  // Abrir control del jugador (personaje) — carga HP/exhaust/dsts/dstf
  // Gastar un punto: optimista y con reconciliación, como los PP
  const gastarRecurso = async (r) => {
    if (r.actual <= 0) return
    // Los recursos de dados avisan primero qué dado toca tirar: el punto se gasta al
    // confirmar, no al pulsar, para que cerrar el aviso no cueste un uso.
    if (r.tipo === 'dice_resource') { setDadoBatalla(r); return }
    // Los puntos de feat viven en otra tabla y tienen su propia ruta, pero el
    // control es el mismo: se distingue por el `tipo` que trae el recurso.
    // Cada bono dice por su `tipo` a qué ruta escribir: los de feat viven en
    // personaje_feat_bonus, el Tracker en una columna del personaje, y el resto
    // son los Extra Points de la ruta.
    const propio = r.tipo === 'feat' || r.tipo === 'feature'
    const setLista = propio ? setRecursosFeat : setRecursos
    const ruta = r.tipo === 'feature' ? `feature/${r.clave}`
      : r.tipo === 'feat' ? `feat-resource/${r.id}` : `path-resource/${r.id}`
    setLista(prev => prev.map(x => x.id === r.id ? { ...x, actual: x.actual - 1 } : x))
    try {
      const res = await apiFetch(`/personaje/${personajeId}/${ruta}`,
        { method: 'PATCH', body: JSON.stringify({ cantidad: 1 }) })
      const j = await res.json()
      if (res.ok) setLista(prev => prev.map(x => x.id === r.id ? { ...x, actual: j.actual } : x))
      else setLista(prev => prev.map(x => x.id === r.id ? { ...x, actual: j.actual ?? r.actual } : x))
    } catch { setLista(prev => prev.map(x => x.id === r.id ? { ...x, actual: r.actual } : x)) }
  }

  // Confirmado el aviso: se gasta como cualquier otro recurso de ruta
  const usarDadoBatalla = async () => {
    const r = dadoBatalla
    setDadoBatalla(null)
    if (!r || r.actual <= 0) return
    setRecursos(prev => prev.map(x => x.id === r.id ? { ...x, actual: x.actual - 1 } : x))
    try {
      const res = await apiFetch(`/personaje/${personajeId}/path-resource/${r.id}`,
        { method: 'PATCH', body: JSON.stringify({ cantidad: 1 }) })
      const j = await res.json()
      setRecursos(prev => prev.map(x => x.id === r.id
        ? { ...x, actual: res.ok ? j.actual : (j.actual ?? r.actual) } : x))
    } catch { setRecursos(prev => prev.map(x => x.id === r.id ? { ...x, actual: r.actual } : x)) }
  }

  const guardarRecurso = async () => {
    if (!recursoEdit) return
    const tipo = recursoEdit.tipo || 'path'
    try {
      if (tipo === 'feature') {
        const res = await apiFetch(`/personaje/${personajeId}/feature/${recursoEdit.clave}`,
          { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) setRecursosFeat(prev => prev.map(x => x.id === recursoEdit.id ? { ...x, actual: j.actual, maximo: j.maximo } : x))
      } else if (tipo === 'feat') {
        const res = await apiFetch(`/personaje/${personajeId}/feat-resource/${recursoEdit.id}`,
          { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) setRecursosFeat(prev => prev.map(x => x.id === recursoEdit.id ? { ...x, actual: j.actual, maximo: j.maximo } : x))
      } else if (tipo === 'path') {
        const res = await apiFetch(`/personaje/${personajeId}/path-resource/${recursoEdit.id}`,
          { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) setRecursos(prev => prev.map(x => x.id === recursoEdit.id ? { ...x, actual: j.actual, maximo: j.maximo } : x))
      } else if (tipo === 'bond') {
        const res = await apiFetch(urlBond(), { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) setPokeData(p => p && ({ ...p, path_recursos: (p.path_recursos || []).map(x => x.id === recursoEdit.id ? { ...x, actual: j.actual, maximo: j.maximo } : x) }))
      } else {
        const res = await apiFetch(urlDados(tipo), { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) (tipo === 'hd-trainer' ? setHdTrainer : setHdPoke)({ actual: j.actual, maximo: j.maximo })
      }
    } catch { /* noop */ }
    setRecursoEdit(null)
  }

  // ── Dados de golpe ────────────────────────────────────────────────────────
  const urlDados = tipo => tipo === 'hd-trainer'
    ? `/personaje/${personajeId}/hit-dice`
    : `/personaje/${personajeId}/pokemon/${pokemonInvocado}/hit-dice`

  // Gastar un dado: optimista y con reconciliación, igual que los Extra Points
  const gastarDado = async (tipo) => {
    const set = tipo === 'hd-trainer' ? setHdTrainer : setHdPoke
    const previo = tipo === 'hd-trainer' ? hdTrainer : hdPoke
    if (!previo || previo.actual <= 0) return
    set({ ...previo, actual: previo.actual - 1 })
    try {
      const res = await apiFetch(urlDados(tipo), { method: 'PATCH', body: JSON.stringify({ cantidad: 1 }) })
      const j = await res.json()
      set({ actual: j.actual ?? previo.actual, maximo: j.maximo ?? previo.maximo })
    } catch { set(previo) }
  }

  // Puntos de vínculo del Pokémon invocado: mismo patrón que los Extra Points
  const urlBond = () => `/personaje/${personajeId}/pokemon/${pokemonInvocado}/bond-points`

  const gastarBond = async (r) => {
    if (!r || r.actual <= 0) return
    const previo = pokeData?.path_recursos
    setPokeData(p => p && ({ ...p, path_recursos: (p.path_recursos || []).map(x => x.id === r.id ? { ...x, actual: x.actual - 1 } : x) }))
    try {
      const res = await apiFetch(urlBond(), { method: 'PATCH', body: JSON.stringify({ cantidad: 1 }) })
      const j = await res.json()
      setPokeData(p => p && ({ ...p, path_recursos: (p.path_recursos || []).map(x => x.id === r.id ? { ...x, actual: j.actual ?? x.actual, maximo: j.maximo ?? x.maximo } : x) }))
    } catch { setPokeData(p => p && ({ ...p, path_recursos: previo })) }
  }

  const abrirLapizBond = (r) => {
    setRecursoEdit({ tipo: 'bond', nombre: r.nombre, maximo: r.maximo, id: r.id })
    setRecursoVal(r.actual)
  }

  const abrirLapizDados = (tipo) => {
    const d = tipo === 'hd-trainer' ? hdTrainer : hdPoke
    if (!d) return
    setRecursoEdit({ tipo, nombre: 'Dados de golpe', maximo: d.maximo })
    setRecursoVal(d.actual)
  }

  // Los dos abrir* piden primero y pintan después: mientras llega la respuesta
  // el panel que estuviera abierto sigue en pantalla, con la pokébola girando
  // encima. Antes se cambiaba de panel al empezar y la ventana se quedaba en
  // blanco todo lo que tardara el servidor.
  // Los estados se guardan al vuelo y se avisa a la party: el resto de la mesa
  // los ve sin recargar nada.
  const guardarEstados = async (destino, lista) => {
    const texto = lista.join(',') || null
    if (destino === 'trainer') setCharEstados(texto); else setPokeEstados(texto)
    const url = destino === 'trainer'
      ? `/personaje/${personajeId}/estados`
      : `/personaje/${personajeId}/pokemon/${pokemonInvocado}/estados`
    try {
      await apiFetch(url, { method: 'PATCH', body: JSON.stringify({ estados: lista }) })
      partidaApiRef.current?.sendPartyUpdate?.()
    } catch { /* si falla, se corrige al volver a abrir el panel */ }
  }

  const openTrainerControl = async () => {
    setCargandoPanel('trainer')
    try {
      // /full trae stats, feats y especialidades: el HP se calcula con sus bonos
      const d = await apiFetch(`/personaje/${personajeId}/full`).then(r => r.json())
      const { max, cur } = hpValues(d)
      // Rasgos de la ruta que ya alcanzó: los de nivel <= su nivel actual
      const nivel = Number(d.personaje_level) || 1
      const rasgos = d.path
        ? [2, 5, 9, 15]
            .filter(n => nivel >= n && (d.path[`path_level_${n}_feature_name`] || d.path[`path_level_${n}_description`]))
            .map(n => ({
              nivel: n,
              nombre: d.path[`path_level_${n}_feature_name`],
              descripcion: d.path[`path_level_${n}_description`],
              bonos: (d.path.bonos_catalogo || []).filter(b => Number(b.level) === n),
            }))
        : []
      const { skills: skillsTrainer, dexMod, stats: statsTrainer } = construirSkillsTrainer(d)
      // Proficiencias de arma: salen de este mismo /full, así que la pestaña
      // Weapon no tiene que volver a pedirlo. Importa el feat que la otorga —
      // si dejó de estar vigente, el arma ya no cuenta como proficiente.
      const profsTrainer = buildProfs(d)

      // Ya está todo calculado: recién aquí se hace el cambio, de una sola vez.
      setCharNombre(d.nombre_personaje || '')
      setCharEstados(d.personaje_estados ?? null)
      setCharProfs(profsTrainer)
      setRecursosRasgos(rasgos)
      // Recursos de la ruta y su título: el nombre del path, o "Trainer"
      // mientras no tenga uno (nivel 1).
      setRecursos(Array.isArray(d.path_recursos) ? d.path_recursos : [])
      setRecursosTitulo(d.path?.path_name || 'Trainer')
      setCharSkills(skillsTrainer)
      setEspecialidades(Array.isArray(d.specializations) ? d.specializations : [])
      setCharData({
        stats: statsTrainer,
        hp: cur, hpMax: max,
        level: nivel,
        // Van en la columna izquierda, donde el Pokémon lleva STAB/PROF/AC
        prof: d.personaje_prof,
        ac:   acDelTrainer(d, dexMod),
        sr:   d.personaje_sr,
        init: dexMod,
        speeds: d.personaje_speed != null ? [['Speed', `${d.personaje_speed} ft`]] : [],
        exhaust: d.personaje_exahust_lvl ?? 0, dsts: d.personaje_dsts ?? 0, dstf: d.personaje_dstf ?? 0,
        // Bono de ataque de su ruta, para el campo Bonus de la fórmula
        attack_bonus_path: d.attack_bonus_path || { total: 0, detalle: [] },
      })
      setHdTrainer({ actual: d.personaje_hit_dice_left ?? 0, maximo: d.hit_dice_pool ?? 0 })
      setRecursosFeat(Array.isArray(d.feat_recursos) ? d.feat_recursos : [])
      setPokeData(null)
      setOpenControl('trainer')
    } catch { /* si falla, se queda donde estaba en vez de dejar el hueco */ }
    finally { setCargandoPanel(null) }
  }

  // Abrir control del Pokémon invocado
  const openPokemonControl = async () => {
    if (!pokemonInvocado) return
    setCargandoPanel('pokemon')
    try {
      const d = await apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}`).then(r => r.json())
      setPokeEstados(d.personaje_pokemon_estados ?? null)
      const moves = Array.isArray(d.moves) ? d.moves : []

      // Habilidades con su modificador: misma fórmula que el detalle del Pokémon
      // (stat base + bonus + overlay de feats, tope por nivel, más proficiencia).
      const stats = d.stats || {}
      const lvl = Number(d.pokemon_level) || 1
      const capStat = x => Math.min(x, lvl >= 20 ? 22 : 20)
      const conFeats = (d.feats || []).length > 0
      const statAdd = {}, skProf = new Set(), skExpert = new Set()
      if (conFeats) for (const f of (d.feats || [])) for (const b of (f.bonos || [])) {
        const t = (b.type || '').toLowerCase(), llave = (b.llave || '').toLowerCase()
        if (t === 'stat') statAdd[llave] = (statAdd[llave] || 0) + (Number(b.value) || 0)
        else if (t === 'skill') {
          const val = (b.value || '').toLowerCase()
          if (val === 'expert') skExpert.add(llave); else if (val === 'prof') skProf.add(llave)
        }
      }
      const statVal = k => {
        const x = (Number(stats[`pokemon_${k}`]) || 0) + (Number(stats[`pokemon_${k}_bonus`]) || 0) + (statAdd[k] || 0)
        return conFeats ? capStat(x) : x
      }
      const modOf = k => Math.floor((statVal(k) - 10) / 2)
      const profBonus = Number(d.pokemon_proficient) || 2
      const skills = (Array.isArray(d.skills) ? d.skills : []).map(s => {
        const nombre = (s.skill_name || '').toLowerCase()
        let pref = !!s.pokemon_skill_pref, expert = !!s.pokemon_skill_expert
        if (conFeats) {
          if (skProf.has(nombre)) pref = true
          if (skExpert.has(nombre)) { if (pref) expert = true; else pref = true }
        }
        return {
          name: s.skill_name,
          ability: s.skill_related_ability,
          pref, expert,
          // especializacion_extra lo resuelve el backend: ya viene en 0 si la
          // característica asociada no es proficiente o si no coincide el tipo.
          mod: modOf((s.skill_related_ability || '').toLowerCase()) + (pref ? profBonus : 0) + (expert ? profBonus : 0)
             + (Number(s.especializacion_extra) || 0),
        }
      })
      // Proficiencia en la tirada de salvación, igual que en el entrenador: es
      // la que marca en verde el recuadro y la que decide el bono de
      // especialización sobre las habilidades.
      const statsLista = ['str','dex','con','int','wis','cha'].map(k => ({
        key: k.toUpperCase(), valor: statVal(k), mod: modOf(k),
        prof: !!stats[`pokemon_stats_${k}_prof`],
      }))
      // La ruta del entrenador viaja en el propio detalle, así que su pestaña se
      // ve igual aunque no se haya abierto antes el panel del jugador. Antes
      // dependía de eso y se quedaba vacía.
      const nivelT = Number(d.trainer_path_level) || 0
      const rasgosT = d.trainer_path
        ? [2, 5, 9, 15]
            .filter(n => nivelT >= n && (d.trainer_path[`path_level_${n}_feature_name`] || d.trainer_path[`path_level_${n}_description`]))
            .map(n => ({
              nivel: n,
              nombre: d.trainer_path[`path_level_${n}_feature_name`],
              descripcion: d.trainer_path[`path_level_${n}_description`],
              bonos: (d.trainer_path.bonos_catalogo || []).filter(b => Number(b.level) === n),
            }))
        : []

      // Ya está todo calculado: recién aquí se hace el cambio, de una sola vez.
      setRecursos(Array.isArray(d.trainer_path_recursos) ? d.trainer_path_recursos : [])
      setRecursosFeat(Array.isArray(d.trainer_feat_recursos) ? d.trainer_feat_recursos : [])
      setRecursosRasgos(rasgosT)
      setRecursosTitulo(d.trainer_path?.path_name || 'Trainer')
      setHdPoke({ actual: d.pokemon_hit_dice_left ?? 0, maximo: d.hit_dice_pool ?? 0 })
      setPokeData({
        path_recursos: Array.isArray(d.path_recursos) ? d.path_recursos : [],
        stats: statsLista,
        hp: d.pokemon_current_hp ?? d.pokemon_hp ?? 0, hpMax: d.pokemon_hp ?? 0,
        exhaust: d.personaje_pokemon_exahust_lvl ?? 0, dsts: d.personaje_pokemon_dsts ?? 0, dstf: d.personaje_pokemon_dstf ?? 0,
        moves,
        pasivas: Array.isArray(d.pasivas) ? d.pasivas : [],
        skills,
        // El STAB parte de la proficiencia y suma el bono de ruta del entrenador
        stab: (Number(d.pokemon_proficient) || 0) + (Number(d.pokemon_stab_extra) || 0),
        prof: d.pokemon_proficient,
        ac: d.personaje_pokemon_ac,
        sr: d.pokemon_sr,   // de la especie: no cambia con el ejemplar
        // Regla 6: bonos de ataque condicionales que dan sus feats
        attack_bonos: d.feat_efectos?.attack_bonos || [],
        // Bonos de elemento: el tipo elegido, que se cambia desde la pestaña Bonus
        feat_elementos: Array.isArray(d.feat_elementos) ? d.feat_elementos : [],
        // Bono de ataque que le da la ruta de su entrenador
        attack_bonus_path: d.attack_bonus_path || { total: 0, detalle: [] },
        // Iniciativa: el modificador de DEX, igual que el entrenador. Se
        // calcula al leer y no se guarda, así ya viene con la naturaleza, los
        // bonos de feats y el tope por nivel que aplica statVal. La columna
        // pokemon_initiative no se usa: guarda un 3 fijo desde la creación.
        init: modOf('dex'),
        // Las velocidades son del ejemplar, no de la especie: se editan por
        // Pokémon y pueden ser varias (andar, volar, nadar, trepar).
        speeds: [1, 2, 3, 4]
          .filter(i => d[`personaje_pokemon_speed${i}_name`])
          .map(i => [d[`personaje_pokemon_speed${i}_name`], d[`personaje_pokemon_speed${i}_value`]]),
        name: d.pokemon_apodo || 'Pokémon',
        level: d.pokemon_level,
        typeId1: d.personaje_pokemon_type_1, typeId2: d.personaje_pokemon_type_2,
      })
      setCharData(null)
      setOpenControl('pokemon')
    } catch { /* si falla, se queda donde estaba en vez de dejar el hueco */ }
    finally { setCargandoPanel(null) }
  }

  // Movimiento cuya fórmula se está resolviendo, antes de llegar a los PP, y lo
  // que salió de ella: se anuncia junto con los PP gastados. Un movimiento
  // puede dar las dos cosas a la vez (ataque físico + DC de salvación), así
  // que van por separado y no como un único "poder".
  const [formulaMove, setFormulaMove] = useState(null)
  const [ataqueLanzado, setAtaqueLanzado] = useState(null)
  const [dificultadLanzada, setDificultadLanzada] = useState(null)

  // Lanzar movimiento del Pokémon invocado → animación de ataque (como el master)
  // Al pulsar la flecha se abre el popup para elegir cuántos PP gastar
  const abrirPP = (m, ataque = null, dificultad = null) => {
    // Struggle y demás movimientos de PP ilimitado no gastan nada: se lanzan directo
    if ((Number(m.personaje_pokemon_moves_max_pp) || 0) === 0) { lanzar(m, ataque, dificultad, 0); return }
    setPpMove(m); setPpCantidad(1); setPpError('')
  }

  // Al lanzar, primero la fórmula (si el movimiento tiene alguna) y solo después
  // los PP. Un movimiento sin move_attack_scope ni move_save_attribute no tiene
  // nada que calcular, así que se salta la ventana de fórmula por completo.
  const abrirFormulaAtaque = (m) => {
    const tieneFormula = !!String(m?.move_attack_scope || '').trim() || !!String(m?.move_save_attribute || '').trim()
    if (!tieneFormula) { abrirPP(m); return }
    setFormulaMove(m)
  }

  // Dispara el ataque y arranca el cooldown
  const lanzar = (m, ataque = null, dificultad = null, pp = 0) => {
    partidaApiRef.current?.sendAttack?.({
      pokemonName: pokeData?.name || 'Pokémon', moveName: m.move_name, type: m.move_type, hidden: false,
      ataque, dificultad, pp,
    })
    setCastCooldown(true)
    if (castTimer.current) clearTimeout(castTimer.current)
    castTimer.current = setTimeout(() => setCastCooldown(false), 3000)
  }

  // Gestión manual de PP: se edita en local y solo se persiste al confirmar
  const abrirGestionPP = (m) => {
    setGpMove(m)
    setGpMax(Number(m.personaje_pokemon_moves_max_pp) || 0)
    setGpCur(Number(m.personaje_pokemon_moves_current_pp) || 0)
    setGpError('')
  }

  const confirmarGestionPP = async () => {
    const m = gpMove
    if (!m || gpBusy) return
    setGpBusy(true); setGpError('')
    try {
      const res = await apiFetch(
        `/personaje/${personajeId}/pokemon/${pokemonInvocado}/moves/${m.personaje_pokemon_moves_id}/pp`,
        { method: 'PUT', body: JSON.stringify({ current_pp: gpCur, max_pp: gpMax }) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setGpError(j.error || 'No se pudo guardar'); setGpBusy(false); return
      }
      const j = await res.json()
      setPokeData(prev => prev && ({
        ...prev,
        moves: (prev.moves || []).map(x => x.personaje_pokemon_moves_id === m.personaje_pokemon_moves_id
          ? { ...x, personaje_pokemon_moves_current_pp: j.current_pp, personaje_pokemon_moves_max_pp: j.max_pp } : x),
      }))
      setGpMove(null)
    } catch { setGpError('No se pudo guardar') } finally { setGpBusy(false) }
  }

  // Confirma el gasto: lo persiste y solo entonces dispara el ataque
  const confirmarPP = async () => {
    const m = ppMove
    if (!m || ppBusy) return
    const maxPP = Number(m.personaje_pokemon_moves_max_pp) || 0
    setPpBusy(true); setPpError('')
    try {
      if (maxPP > 0) { // max 0 = PP ilimitado: no se descuenta nada
        const res = await apiFetch(
          `/personaje/${personajeId}/pokemon/${pokemonInvocado}/moves/${m.personaje_pokemon_moves_id}/pp`,
          { method: 'PATCH', body: JSON.stringify({ cantidad: ppCantidad }) })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setPpError(j.error || 'No se pudo gastar los PP'); setPpBusy(false); return
        }
        const j = await res.json()
        // Refleja el nuevo saldo sin volver a pedir todo el detalle
        setPokeData(prev => prev && ({
          ...prev,
          moves: (prev.moves || []).map(x => x.personaje_pokemon_moves_id === m.personaje_pokemon_moves_id
            ? { ...x, personaje_pokemon_moves_current_pp: j.current_pp } : x),
        }))
      }
      setPpMove(null)
      lanzar(m, ataqueLanzado, dificultadLanzada, maxPP > 0 ? ppCantidad : 0)
    } catch { setPpError('No se pudo gastar los PP') } finally { setPpBusy(false) }
  }

  const toBody = (patch) => {
    const b = {}
    if ('hp' in patch) b.current_hp = patch.hp
    if ('exhaust' in patch) b.exhaust_lvl = patch.exhaust
    if ('dsts' in patch) b.dsts = patch.dsts
    if ('dstf' in patch) b.dstf = patch.dstf
    return b
  }
  const pendingPersist = useRef(Promise.resolve())
  // Tras guardar, avisa a los demás para que su panel (party/rival) se actualice de inmediato
  const persistChar = (patch) => {
    const p = apiFetch(`/personaje/${personajeId}/combate`, { method: 'PATCH', body: JSON.stringify(toBody(patch)) })
      .then(() => { partidaApiRef.current?.sendPartyUpdate?.() }).catch(() => {})
    pendingPersist.current = p
    return p
  }
  const persistPoke = (patch) => {
    const p = apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}/combate`, { method: 'PATCH', body: JSON.stringify(toBody(patch)) })
      .then(() => { partidaApiRef.current?.sendPartyUpdate?.() }).catch(() => {})
    pendingPersist.current = p
    return p
  }

  // Avisa a los demás (cuando el último guardado terminó) para que la Party se actualice en vivo
  const notifyParty = () => {
    Promise.resolve(pendingPersist.current).finally(() => partidaApiRef.current?.sendPartyUpdate?.())
  }

  // Cierra el control y avisa a los demás
  const closeControl = () => {
    setOpenControl(null)
    notifyParty()
  }

  const returnPokemon = () => {
    if (pokemonInvocado != null) persistEnJuego(pokemonInvocado, false)
    setPokemonInvocado(null); setInvocadoSprite(null)
    setOpenControl(null); setPokeData(null)
    notifyParty()
  }

  const sideBtn = `${ICONO_REDONDO} w-10 h-10`

  // En modo lucha, los no seleccionados no ven sus iconos inferiores
  const hideBottomIcons = fight.active && !fight.players.some(p => String(p.id_personaje) === String(personajeId))

  return (
    <PartidaRoom roleLabel="Trainer" personajeId={personajeId} apiRef={partidaApiRef} pokemonInvocado={pokemonInvocado} onFight={setFight} onPartyVersion={setPartyVersion}>
      {/* Mejora obligatoria por subida de nivel (una a la vez, no se puede cerrar) */}
      {pending.length > 0 && personajeId && (
        <PendingImprovementModal personajeId={personajeId} pending={pending[0]} onConfirmed={trasEventoPokemon} />
      )}

      {/* Gestión de PP: edita máximo y actual, se persiste solo al confirmar */}
      {gpMove && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget && !gpBusy) setGpMove(null) }}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-[17rem] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm">Gestion de PP</h4>
                <p className="text-[11px] text-gray-400 truncate">{gpMove.move_name}</p>
              </div>
              <button onClick={() => setGpMove(null)} disabled={gpBusy}
                className="text-gray-400 hover:text-white shrink-0 disabled:opacity-40"><X size={16} /></button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {[
                ['PP máximos', gpMax, (n) => { const v = Math.max(0, n); setGpMax(v); if (gpCur > v) setGpCur(v) }],
                ['PP actuales', gpCur, (n) => setGpCur(Math.max(0, Math.min(gpMax, n)))],
              ].map(([label, valor, set]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase">{label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => set(valor - 1)} disabled={gpBusy || valor <= 0}
                      className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-red-600 disabled:opacity-30 flex items-center justify-center text-white transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-black text-white tabular-nums">{valor}</span>
                    <button onClick={() => set(valor + 1)} disabled={gpBusy}
                      className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-green-600 disabled:opacity-30 flex items-center justify-center text-white transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => setGpCur(gpMax)} disabled={gpBusy || gpCur === gpMax}
                className="w-full text-xs font-bold text-gray-200 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 py-1.5 rounded-lg transition-colors">
                Restore
              </button>
              {gpError && <p className="text-xs text-red-400 font-medium text-center">{gpError}</p>}
            </div>
            <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-center">
              <button onClick={confirmarGestionPP} disabled={gpBusy}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-2 rounded-lg transition-colors">
                {gpBusy ? <PokeballSpinner size={15} /> : null} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PPs a gastar antes de lanzar el movimiento */}
      {/* Fórmula del ataque: va delante de la ventana de PP */}
      {formulaMove && (
        <FormulaAtaqueModal
          move={formulaMove}
          prof={pokeData?.prof}
          stats={pokeData?.stats || []}
          bonoRuta={pokeData?.attack_bonus_path || { total: 0, detalle: [] }}
          onClose={() => { setFormulaMove(null); setAtaqueLanzado(null); setDificultadLanzada(null) }}
          onAtacar={(ataque, dificultad) => {
            const m = formulaMove
            setAtaqueLanzado(ataque); setDificultadLanzada(dificultad)
            setFormulaMove(null); abrirPP(m, ataque, dificultad)
          }}
        />
      )}

      {ppMove && (() => {
        const maxPP = Number(ppMove.personaje_pokemon_moves_max_pp) || 0
        const actual = Number(ppMove.personaje_pokemon_moves_current_pp) || 0
        const tope = maxPP > 0 ? actual : 99 // max 0 = ilimitado
        const set = (n) => setPpCantidad(Math.max(1, Math.min(tope, n)))
        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={e => { if (e.target === e.currentTarget && !ppBusy) setPpMove(null) }}>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-[15rem] shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-sm">PPs a gastar</h4>
                  <p className="text-[11px] text-gray-400 truncate">{ppMove.move_name}</p>
                </div>
                <button onClick={() => setPpMove(null)} disabled={ppBusy}
                  className="text-gray-400 hover:text-white shrink-0 disabled:opacity-40"><X size={16} /></button>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => set(ppCantidad - 1)} disabled={ppBusy || ppCantidad <= 1}
                    className="w-9 h-9 shrink-0 rounded-lg bg-gray-700 hover:bg-red-600 disabled:opacity-30 flex items-center justify-center text-white transition-colors">
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center text-2xl font-black text-white tabular-nums">{ppCantidad}</span>
                  <button onClick={() => set(ppCantidad + 1)} disabled={ppBusy || ppCantidad >= tope}
                    className="w-9 h-9 shrink-0 rounded-lg bg-gray-700 hover:bg-green-600 disabled:opacity-30 flex items-center justify-center text-white transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-center text-[11px] text-gray-400 mt-2">
                  {maxPP > 0 ? `Disponibles ${actual}/${maxPP}` : 'PP ilimitados'}
                </p>
                {ppError && <p className="text-xs text-red-400 font-medium mt-2 text-center">{ppError}</p>}
              </div>
              <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-center">
                <button onClick={confirmarPP} disabled={ppBusy}
                  className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-2 rounded-lg transition-colors">
                  {ppBusy ? <PokeballSpinner size={15} /> : null} Confirmar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Renombrar Pokémon recibido: obligatorio, no se puede cerrar.
          Va por encima de la mejora de nivel para que el jugador sepa primero
          qué Pokémon acaba de recibir. */}
      {/* Subida de nivel del entrenador: se resuelve un nivel a la vez, del más
          bajo al más alto, y va por delante del renombrado porque puede cambiar
          los pokéslots. */}
      {levelUps.length > 0 && (
        <TrainerLevelUpModal
          key={levelUps[0].id}
          personajeId={personajeId}
          pending={levelUps[0]}
          // Bump de partyVersion: el nivel cambia stats, prof y pokéslots,
          // así que la ficha y el cinturón tienen que releerse.
          onConfirmed={() => { refreshLevelUps(); setPartyVersion(v => v + 1) }}
        />
      )}

      {renames.length > 0 && (() => {
        const r = renames[0]
        const sprite = (r.pokemon_is_shiny && r.pokemon_media_sprite_shiny) ? r.pokemon_media_sprite_shiny : r.pokemon_media_sprite
        // El campo arranca con el apodo actual y solo se sobreescribe cuando el
        // jugador escribe; así no hace falta un efecto que sincronice el estado.
        const nuevoApodo = apodoEdit.id === r.id_personaje_pokemon ? apodoEdit.value : (r.pokemon_apodo ?? '')
        const valido = nuevoApodo.trim().length > 0
        const confirmar = async () => {
          if (!valido || renameBusy) return
          setRenameBusy(true); setRenameError('')
          try {
            const res = await apiFetch(`/personaje/${personajeId}/pokemon/${r.id_personaje_pokemon}/apodo`,
              { method: 'PATCH', body: JSON.stringify({ apodo: nuevoApodo.trim() }) })
            if (!res.ok) { const j = await res.json().catch(() => ({})); setRenameError(j.error || 'No se pudo guardar'); return }
            refreshRenames()
          } catch { setRenameError('No se pudo guardar') } finally { setRenameBusy(false) }
        }
        return (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-black text-gray-900 text-lg leading-tight">Renombrar Pokemon</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{r.pokemon_name} · Nv {r.pokemon_level}</p>
              </div>
              <div className="px-5 py-4">
                {sprite && (
                  <img src={sprite} alt="" className="w-20 h-20 object-contain mx-auto mb-2"
                    onError={e => { e.target.style.opacity = '0.2' }} />
                )}
                <label htmlFor="apodo-nuevo" className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Apodo</label>
                <input id="apodo-nuevo" value={nuevoApodo} autoFocus maxLength={60}
                  onChange={e => { setApodoEdit({ id: r.id_personaje_pokemon, value: e.target.value }); setRenameError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') confirmar() }}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                {renameError && <p className="text-xs text-red-600 font-medium mt-2">{renameError}</p>}
                {renames.length > 1 && (
                  <p className="text-[11px] text-gray-400 mt-2">Quedan {renames.length - 1} por renombrar.</p>
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end">
                <button onClick={confirmar} disabled={!valido || renameBusy}
                  className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-lg transition-colors">
                  {renameBusy ? <PokeballSpinner size={15} /> : null} Confirmar
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      <div className="absolute inset-0">
        {/* Zona inferior: sprite del jugador + sprite del Pokémon invocado */}
        {/* fixed y no absolute: con muchos Pokémon invocados el contenedor crece
            y el bottom-4 quedaba anclado al final del contenido, no al de la
            pantalla, así que al hacer scroll los iconos se iban al medio.
            z-[48] los deja por encima de todo el campo -- las tarjetas de los
            invocados van en z-10 y llegaban a taparlos hasta impedir el clic --
            y por debajo de los modales, que empiezan en z-50. */}
        {!hideBottomIcons && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[48] flex items-end justify-center gap-10">
          {/* Carita de estados + avatar: la carita queda a la izquierda del
              entrenador y a la derecha del Pokémon, pero los estados ya
              puestos se centran solo bajo su propio avatar, no bajo el par
              carita+avatar completo. */}
          {user?.avatar_face_url && (
            <div className="flex items-end gap-1.5">
              <EstadoTrigger size={estadoIconSize} onClick={() => setEstadosPopup('trainer')} title="Estados del entrenador" />
              <div className="flex flex-col items-center gap-1">
                <div className="relative">
                  {/* El aviso (el signo de información) vive en el panel de
                      combate, junto al botón de fórmula; aquí solo queda el
                      aura, que se ve tanto en este icono como en la party. */}
                  {isInspirado && <AuraInspirado size={isMonitor ? 66 : 44} />}
                  <button onClick={openTrainerControl} className="relative transition-transform hover:scale-105" title="Controlar jugador">
                    {/* data-throw-origin: PartidaRoom lo mide para lanzar la pokébola desde aquí */}
                    <img src={user.avatar_face_url} alt="Jugador" data-throw-origin="1"
                      className={`${isMonitor ? 'w-[66px] h-[66px]' : 'w-11 h-11'} object-contain`} onError={e => { e.target.style.opacity = '0.2' }} />
                  </button>
                </div>
                <EstadosChips estados={charEstados} iconPx={estadoChipSize} />
              </div>
            </div>
          )}
          {pokemonInvocado && invocadoSprite && (
            <div className="flex items-end gap-1.5">
              <div className="flex flex-col items-center gap-1">
                <button onClick={openPokemonControl} className="transition-transform hover:scale-105" title="Controlar Pokémon">
                  <img src={invocadoSprite} alt="Pokémon invocado"
                    className={`${isMonitor ? 'w-[66px] h-[66px]' : 'w-11 h-11'} object-contain`} onError={e => { e.target.style.opacity = '0.2' }} />
                </button>
                <EstadosChips estados={pokeEstados} iconPx={estadoChipSize} />
              </div>
              <EstadoTrigger size={estadoIconSize} onClick={() => setEstadosPopup('pokemon')} title="Estados del Pokémon" />
            </div>
          )}
        </div>
        )}

        {/* Pokédex — flotante justo debajo del botón de notas de PartidaRoom */}
        <button onClick={() => { setPokedexListo(false); setShowPokedex(true) }} className={`${sideBtn} fixed left-3 top-52 z-40`} title="Abrir Pokédex">
          <Smartphone size={18} />
        </button>

        {/* Botones laterales — columna centrada y scrolleable (para pantallas bajas) */}
        <div className="fixed left-3 top-64 bottom-3 z-30 overflow-y-auto">
          <div className="min-h-full flex flex-col justify-center gap-2 py-1">
            {personajeId && (
              <button onClick={() => setShowChar(true)} className={sideBtn} title="Ver mi personaje">
                <User size={18} />
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowMochila(true)} className={sideBtn} title="Mochila">
                <Backpack size={18} />
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowEquip(true)} className={sideBtn} title="Equipamiento">
                <span className="relative inline-flex items-center justify-center">
                  <Shield size={18} />
                  <Sword size={11} className="absolute -bottom-1 -right-1.5" />
                </span>
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowBelt(true)} className={sideBtn} title="Cinturón">
                <PokeballsIcon size={18} />
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowPC(true)} className={sideBtn} title="Femputadora">
                <Monitor size={18} />
              </button>
            )}

            {personajeId && (
              <button
                onClick={() => { if (isEditable) setShowEdit(true) }}
                disabled={!isEditable}
                className={`${sideBtn} ${isEditable ? '' : 'opacity-40 cursor-not-allowed hover:bg-gray-700'}`}
                title={isEditable ? 'Editar jugador' : 'Editar jugador (deshabilitado por el master)'}
              >
                {isEditable ? <Pencil size={18} /> : <PencilOff size={18} />}
              </button>
            )}

            {/* Descansos: el visto bueno del DM se pide dentro de la ventana */}
            {personajeId && (
              <button onClick={abrirDescanso} className={sideBtn} title="Tomar un descanso">
                <BedDouble size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Descanso largo / corto */}
      {showDescanso && personajeId && (
        <DescansoModal personajeId={personajeId}
          onClose={() => setShowDescanso(false)}
          onDone={trasDescanso} />
      )}

      {/* Modal Pokédex.
          Aquí la ventana es de esta página pero quien consulta es PokemonList,
          así que no se puede montar solo cuando esté lista: sin montarla no
          consulta. Se monta oculta —invisible mantiene el componente vivo, que
          es lo que hace falta— y la pokébola tapa mientras tanto. */}
      {showPokedex && (
        <>
          {!pokedexListo && (
            <LoadingOverlay label="Pokédex" onClose={() => setShowPokedex(false)} z="z-[55]" />
          )}
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
              pokedexListo ? '' : 'invisible pointer-events-none'}`}
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowPokedex(false) }}
          >
            <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
              <button
                onClick={() => setShowPokedex(false)}
                className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center
                           rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                title="Cerrar"
              >
                <X size={18} />
              </button>
              <PokemonList title="Pokédex" moveDetail onReady={() => setPokedexListo(true)} />
            </div>
          </div>
        </>
      )}

      {/* Estados alterados: se ponen y se quitan a mano, y los ve la mesa
          entera en el panel de party. */}
      {estadosPopup && (
        <EstadosPopup
          titulo={estadosPopup === 'trainer' ? 'Estados del entrenador' : 'Estados del Pokémon'}
          estados={estadosPopup === 'trainer' ? charEstados : pokeEstados}
          onChange={(l) => guardarEstados(estadosPopup, l)}
          onClose={() => setEstadosPopup(null)}
        />
      )}

      {/* Aviso del punto de inspiración */}
      {showInspiradoInfo && <InspiradoInfoPopup onClose={() => setShowInspiradoInfo(false)} />}

      {/* Hoja del personaje */}
      {showChar && personajeId && (
        <CharacterSheet id={personajeId} onClose={() => setShowChar(false)}
          partyVersion={partyVersion} narrativo
          onChanged={() => partidaApiRef.current?.sendPartyUpdate?.()} />
      )}

      {/* Mochila */}
      {showMochila && personajeId && (
        <Mochila personajeId={personajeId}
          onClose={() => { setShowMochila(false); partidaApiRef.current?.reloadPokeballs?.() }} />
      )}

      {/* Equipamiento */}
      {showEquip && personajeId && (
        <Equipamiento personajeId={personajeId} onClose={() => setShowEquip(false)} />
      )}

      {/* Cinturón — Pokémon en el equipo */}
      {showBelt && personajeId && (
        <PokemonBox
          personajeId={personajeId}
          mode="belt"
          editable={isEditable}
          onExpAdded={trasEventoPokemon}
          nombrePersonaje={charNombre}
          onAnuncio={(texto, trainer, pokemon) => partidaApiRef.current?.anunciar?.(texto, trainer, pokemon)}
          onClose={() => setShowBelt(false)}
          onSwitchMode={() => { setShowBelt(false); setShowPC(true) }}
          onInvoke={(idpp, sprite) => {
            persistEnJuego(idpp, true)
            setPokemonInvocado(idpp)
            setInvocadoSprite(sprite)
            setShowBelt(false)
          }}
          onMoved={(idpp) => {
            // Si se envió al computador el Pokémon invocado, se limpia el invocado
            if (String(idpp) === String(pokemonInvocado)) {
              persistEnJuego(idpp, false)
              setPokemonInvocado(null)
              setInvocadoSprite(null)
            }
          }}
        />
      )}

      {/* Femputadora — Pokémon almacenados */}
      {showPC && personajeId && (
        <PokemonBox personajeId={personajeId} partidaId={id} getConectados={() => partidaApiRef.current?.getPresentes?.() ?? []} mode="pc" editable={isEditable} onExpAdded={trasEventoPokemon}
          onMoved={() => { refreshRenames(); partidaApiRef.current?.sendPartyUpdate?.() }}
          nombrePersonaje={charNombre}
          onAnuncio={(texto, trainer, pokemon) => partidaApiRef.current?.anunciar?.(texto, trainer, pokemon)}
          onSwitchMode={() => { setShowPC(false); setShowBelt(true) }}
          onClose={() => setShowPC(false)} />
      )}

      {/* Editar jugador (solo si el master lo habilitó) */}
      {showEdit && personajeId && isEditable && (
        <EditarPersonajeModal
          personajeId={personajeId}
          onClose={() => setShowEdit(false)}
          onChanged={() => partidaApiRef.current?.sendPartyUpdate?.()}
        />
      )}

      {/* Pokébola girando mientras se pide el otro panel. El z-[65] la deja por
          encima de los paneles (z-[60]) y por debajo del lápiz de recursos
          (z-[70]). Sin onClose: la espera es corta y no debe poder pedirse el
          cambio dos veces. */}
      {cargandoPanel && (
        <LoadingOverlay label={cargandoPanel === 'trainer' ? 'Entrenador' : 'Pokémon'} />
      )}

      {/* Control del jugador */}
      {openControl === 'trainer' && charData && (
        <CombatePanel
          title={`${charNombre || 'Jugador'}${charData.level != null ? ` (nivel ${charData.level})` : ''}`}
          // Salta al Pokémon invocado; sin uno en campo no hay atajo
          switchSprite={pokemonInvocado ? invocadoSprite : null}
          switchLabel="Ir al Pokémon"
          onSwitch={openPokemonControl}
          onAtaque={(poder) => partidaApiRef.current?.anunciar?.(
            `${charNombre || 'El entrenador'} ha atacado con un poder de ${poder}`)}
          recursosFeat={recursosFeat}
          weaponProfs={charProfs}
          initial={charData}
          skills={charSkills}
          bonoRuta={charData.attack_bonus_path || { total: 0, detalle: [] }}
          recursos={recursos}
          recursosTitulo={recursosTitulo}
          recursosRasgos={recursosRasgos}
          especialidades={especialidades}
          onSpendBond={gastarBond}
          onManageBond={abrirLapizBond}
          onSpendRecurso={gastarRecurso}
          onManageRecurso={r => { setRecursoEdit(r); setRecursoVal(r.actual) }}
          hitDice={hdTrainer}
          onSpendHitDice={() => gastarDado('hd-trainer')}
          onManageHitDice={() => abrirLapizDados('hd-trainer')}
          personajeId={personajeId}
          inspirado={isInspirado}
          onInspiradoInfo={() => setShowInspiradoInfo(true)}
          onPersist={persistChar}
          onClose={closeControl}
        />
      )}

      {/* Lápiz de un Extra Point: solo ajusta lo que queda. El máximo se deriva
          del personaje (nivel, proficiencia...) y no se edita a mano. */}
      {/* Recurso de dados (Battle Dice, Skill Dice...): recuerda qué dado tirar.
          La tirada es física; la app solo lleva la cuenta de los usos. El título
          es el nombre del recurso, que cada ruta pone el suyo. */}
      {dadoBatalla && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setDadoBatalla(null) }}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 min-w-0">
                <Dices size={15} className="text-amber-400 shrink-0" />
                <span className="truncate">{dadoBatalla.nombre}</span>
              </h4>
              <button onClick={() => setDadoBatalla(null)} className="text-gray-400 hover:text-white shrink-0">
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">Tira</p>
              <p className="text-3xl font-black text-amber-300">1{dadoBatalla.dado}</p>
              <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                Súmalo a la tirada de tu Pokémon, después de tirarla.
              </p>
              <p className="mt-2 text-[11px] text-gray-500">
                Te quedan {dadoBatalla.actual} de {dadoBatalla.maximo}
              </p>
              <button onClick={usarDadoBatalla}
                className="mt-4 w-full flex items-center justify-center gap-1.5 h-10 rounded-xl
                           text-xs font-black uppercase tracking-widest text-white transition-colors
                           bg-red-600 hover:bg-red-700">
                <Dices size={14} /> Gastar punto
              </button>
            </div>
          </div>
        </div>
      )}

      {recursoEdit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setRecursoEdit(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 truncate">{recursoEdit.nombre}</h3>
              <p className="text-[11px] text-gray-500">
                Máximo {recursoEdit.maximo} · {recursoEdit.tipo && recursoEdit.tipo !== 'path' ? 'lo fija el nivel' : 'se deriva de tu personaje'}
              </p>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                {recursoEdit.tipo && recursoEdit.tipo !== 'path' ? 'Dados restantes' : 'Puntos restantes'}
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setRecursoVal(v => Math.max(0, v - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center"><Minus size={15} /></button>
                <input type="number" min={0} max={recursoEdit.maximo} value={recursoVal}
                  onChange={e => setRecursoVal(Math.min(recursoEdit.maximo, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
                  className="flex-1 px-3 py-2 text-sm text-center text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                <button onClick={() => setRecursoVal(v => Math.min(recursoEdit.maximo, v + 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center"><Plus size={15} /></button>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => setRecursoEdit(null)} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
              <button onClick={guardarRecurso}
                className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg transition-colors">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Objetos equipados del Pokémon invocado. En modo combate solo se
          consultan y se usan: quitarlos y devolverlos a la mochila es cosa del
          cinturón, no de la mesa. */}
      {heldOpen && pokemonInvocado && (
        <HeldItemsModal
          personajeId={personajeId}
          idpp={pokemonInvocado}
          modo="combate"
          onClose={() => setHeldOpen(false)}
        />
      )}

      {/* Control del Pokémon invocado */}
      {openControl === 'pokemon' && pokeData && (
        <CombatePanel
          title={`${pokeData.name || 'Pokémon'}${pokeData.level != null ? ` (nivel ${pokeData.level})` : ''}`}
          // De vuelta al entrenador: aquí siempre hay a dónde ir
          switchSprite={user?.avatar_face_url || null}
          switchLabel="Ir al entrenador"
          onSwitch={openTrainerControl}
          onHeldItems={() => setHeldOpen(true)}
          attackBonos={pokeData.attack_bonos || []}
          recursosTrainer={recursos}
          recursosFeat={recursosFeat}
          elementos={pokeData.feat_elementos || []}
          onSpendRecurso={gastarRecurso}
          onManageRecurso={r => { setRecursoEdit(r); setRecursoVal(r.actual) }}
          initial={pokeData}
          moves={pokeData.moves}
          pasivas={pokeData.pasivas}
          skills={pokeData.skills}
          onCastRequest={abrirFormulaAtaque}
          onManagePP={abrirGestionPP}
          castDisabled={castCooldown}
          hitDice={hdPoke}
          recursosPokemon={pokeData.path_recursos || []}
          recursosRasgos={recursosRasgos}
          onSpendBond={gastarBond}
          onManageBond={abrirLapizBond}
          onSpendHitDice={() => gastarDado('hd-poke')}
          onManageHitDice={() => abrirLapizDados('hd-poke')}
          personajeId={personajeId}
          onPersist={persistPoke}
          onReturn={returnPokemon}
          onClose={closeControl}
        />
      )}
    </PartidaRoom>
  )
}
