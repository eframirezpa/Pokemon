import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { LogOut, Plus, UserCircle, Check, LogIn, Eye } from 'lucide-react'
import { apiFetch } from '../api'
import CharacterWizard from '../components/CharacterWizard'
import CharacterSheet from '../components/CharacterSheet'
import PokemonWizard from '../components/PokemonWizard'
import Boton from '../components/ui/Boton'
import { Pagina, CabeceraPagina, Vacio } from '../components/ui/Pagina'

export default function PartidaLobby() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const location  = useLocation()
  const nombre    = location.state?.nombre || `Partida #${id}`

  const [personajes, setPersonajes]     = useState([])
  const [pokemonByChar, setPokemonByChar] = useState({}) // { id_personaje: [pokemon] }
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [showWizard, setShowWizard]     = useState(false)
  const [viewChar, setViewChar]         = useState(null)
  const [addPokemonFor, setAddPokemonFor] = useState(null)

  const reloadPokemon = async (idPers) => {
    try {
      const r = await apiFetch(`/personaje/${idPers}/pokemon`)
      const pk = await r.json()
      setPokemonByChar(prev => ({ ...prev, [idPers]: Array.isArray(pk) ? pk : [] }))
    } catch { /* noop */ }
  }

  const load = () => {
    setLoading(true)
    apiFetch(`/personaje?id_partida=${id}`)
      .then(r => r.json())
      .then(async (d) => {
        const list = Array.isArray(d) ? d : []
        setPersonajes(list)
        const entries = await Promise.all(list.map(async (c) => {
          try {
            const r = await apiFetch(`/personaje/${c.id_personaje}/pokemon`)
            const pk = await r.json()
            return [c.id_personaje, Array.isArray(pk) ? pk : []]
          } catch { return [c.id_personaje, []] }
        }))
        setPokemonByChar(Object.fromEntries(entries))
      })
      .catch(() => setPersonajes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleCreated = (personaje) => {
    setShowWizard(false)
    setPersonajes(prev => [...prev, personaje])
    setPokemonByChar(prev => ({ ...prev, [personaje.id_personaje]: [] }))
    setSelected(personaje.id_personaje)
  }

  // Se puede entrar con al menos un Pokémon, o sin ninguno si ya recibió su
  // starter: en ese caso se quedó sin ellos por liberarlos o entregarlos, y
  // bloquearle la entrada lo dejaría fuera de la partida sin forma de recuperar
  // ninguno, porque eso ocurre dentro.
  const selectedChar   = personajes.find(p => p.id_personaje === selected)
  const yaTuvoStarter  = !!selectedChar?.personaje_get_starter_pokemon
  const selectedHasPokemon = selected && (pokemonByChar[selected]?.length > 0 || yaTuvoStarter)

  const handleEnter = () => {
    const personaje = selectedChar
    navigate(`/trainer-partida/${id}`, { state: { nombre, personaje } })
  }

  // Pasos para poder entrar: se marcan solos según lo que ya hay
  const algunoConPokemon = personajes.some(p => pokemonByChar[p.id_personaje]?.length > 0 || p.personaje_get_starter_pokemon)
  const pasos = [
    { titulo: 'Crea tu personaje', corto: 'Personaje', hecho: personajes.length > 0 },
    { titulo: 'Elige su Pokémon inicial', corto: 'Pokémon', hecho: algunoConPokemon },
    { titulo: 'Entra a la partida', corto: 'Entrar', hecho: false, actual: !!selectedHasPokemon },
  ]

  return (
    <div className="min-h-dvh bg-fondo text-texto flex flex-col">

      {/* Barra superior */}
      <header className="sticky top-0 z-20 h-14 px-4 sm:px-6 flex items-center justify-between gap-3
                         bg-fondo/85 backdrop-blur-xl backdrop-saturate-150 border-b border-separador">
        <div className="min-w-0">
          <p className="font-semibold text-[15px] truncate">{nombre}</p>
          <p className="text-xs text-texto-2">Sala de espera</p>
        </div>
        <Boton variante="peligro" tamano="sm" onClick={() => navigate('/dashboard/trainer')}>
          <LogOut size={14} /> Salir
        </Boton>
      </header>

      <Pagina className="max-w-3xl">
        <CabeceraPagina titulo="Tus personajes"
          accion={<Boton onClick={() => setShowWizard(true)} className="self-start sm:self-auto"><Plus size={16} /> Crear personaje</Boton>} />

        {/* Pasos */}
        <ol className="grid grid-cols-3 gap-2" aria-label="Pasos para entrar">
          {pasos.map((p, i) => (
            <li key={p.titulo} className={`rounded-grupo px-2.5 sm:px-3 py-2.5 flex items-center gap-2 sm:gap-2.5 min-w-0 ${p.actual ? 'bg-acento text-white' : 'bg-superficie'}`}>
              <span className={`w-6 h-6 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                p.hecho ? 'bg-ok text-white' : p.actual ? 'bg-white text-acento' : 'bg-relleno text-texto-2'}`}>
                {p.hecho ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`text-[13px] leading-tight font-medium truncate ${p.hecho ? 'text-texto-2' : ''}`}>
                <span className="sm:hidden">{p.corto}</span><span className="hidden sm:inline">{p.titulo}</span>
              </span>
            </li>
          ))}
        </ol>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map(i => <div key={i} className="h-[118px] rounded-[20px] bg-relleno animate-pulse" />)}
          </div>
        ) : personajes.length === 0 ? (
          <Vacio titulo="Aún no tienes personajes" detalle="Crea uno para poder entrar a la partida."
            accion={<Boton className="mt-2" onClick={() => setShowWizard(true)}><Plus size={16} /> Crear personaje</Boton>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {personajes.map(p => {
              const isSel = selected === p.id_personaje
              const pkmn  = pokemonByChar[p.id_personaje] || []
              const first = pkmn[0]
              return (
                <div key={p.id_personaje}
                  className={`rounded-[20px] bg-superficie overflow-hidden transition-shadow ${isSel ? 'ring-[3px] ring-acento' : ''}`}>
                  <div className="p-3 pr-4 flex items-center gap-3">
                    {/* Zona seleccionable */}
                    <button type="button" onClick={() => setSelected(p.id_personaje)} aria-pressed={isSel}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <span className={`w-10 h-10 rounded-full grid place-items-center shrink-0 transition-colors ${
                        isSel ? 'bg-acento text-white' : 'bg-relleno text-texto-2'}`}>
                        {isSel ? <Check size={18} strokeWidth={3} /> : <UserCircle size={20} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-[17px] tracking-[-.01em] truncate">{p.nombre_personaje || 'Sin nombre'}</span>
                        <span className="block text-[13px] text-texto-2">Nivel {p.personaje_level ?? 1}</span>
                      </span>
                    </button>

                    {/* Pokémon inicial: sprite, o botón de agregar solo si aún
                        no lo ha recibido. Sin comprobar la marca, un entrenador
                        que liberara todos sus Pokémon volvería a ver el botón y
                        se llevaría un segundo inicial. */}
                    <div className="shrink-0">
                      {first ? (
                        <img
                          src={first.pokemon_media_sprite || first.pokemon_media_main}
                          alt={first.pokemon_name}
                          title={first.pokemon_name}
                          className="w-14 h-14 object-contain [image-rendering:pixelated]"
                          onError={e => { e.target.style.opacity = '0.3' }}
                        />
                      ) : p.personaje_get_starter_pokemon ? (
                        <span className="text-xs text-texto-2 italic px-2" title="Ya recibió su Pokémon inicial">
                          Sin Pokémon
                        </span>
                      ) : (
                        <Boton variante="tintado" tamano="sm" onClick={() => setAddPokemonFor(p.id_personaje)}>
                          <Plus size={14} /> Pokémon inicial
                        </Boton>
                      )}
                    </div>
                  </div>

                  <button type="button" onClick={() => setViewChar(p.id_personaje)}
                    className="w-full h-10 flex items-center justify-center gap-1.5 text-[13px] font-medium text-tinte
                               border-t border-separador hover:bg-relleno transition-colors">
                    <Eye size={14} /> Ver ficha completa
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Entrar */}
        <div className="mt-2 flex flex-col items-center gap-2">
          <Boton tamano="lg" onClick={handleEnter} disabled={!selected || !selectedHasPokemon} className="sm:max-w-xs">
            <LogIn size={18} /> Entrar a la partida
          </Boton>
          {!selected && personajes.length > 0 && (
            <p className="text-[13px] text-texto-2">Toca un personaje para elegirlo.</p>
          )}
          {selected && !selectedHasPokemon && (
            <p className="text-[13px] text-aviso">Este personaje necesita al menos un Pokémon para entrar.</p>
          )}
        </div>
      </Pagina>

      {showWizard && (
        <CharacterWizard idPartida={Number(id)} onClose={() => setShowWizard(false)} onCreated={handleCreated} />
      )}

      {viewChar && (
        <CharacterSheet id={viewChar} onClose={() => setViewChar(null)} />
      )}

      {addPokemonFor && (
        <PokemonWizard
          personajeId={addPokemonFor}
          onClose={() => setAddPokemonFor(null)}
          onCreated={() => { reloadPokemon(addPokemonFor); setAddPokemonFor(null) }}
        />
      )}
    </div>
  )
}
