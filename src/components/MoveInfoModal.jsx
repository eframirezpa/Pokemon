import { X } from 'lucide-react'
import { useState } from 'react'
import FeatInfoModal from './FeatInfoModal'

const MOVE_TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC', Typeless:'#9CA3AF',
}

/* Estilos por tema: 'dark' (panel de combate) y 'pokedex' (pergamino claro) */
const THEMES = {
  dark: {
    panel:        'bg-gray-800 border border-gray-700',
    header:       'border-b border-gray-700',
    title:        'text-white',
    close:        'text-gray-400 hover:text-white',
    factBox:      'bg-gray-700/50',
    factLabel:    'text-gray-400',
    factValue:    'text-white',
    sectionLabel: 'text-gray-400',
    text:         'text-gray-200',
    subText:      'text-gray-400',
  },
  pokedex: {
    panel:        'bg-[#FDF1DC] border-2 border-[#d4a96a]',
    header:       'border-b-2 border-[#d4a96a]/60',
    title:        'text-[#7A200D]',
    close:        'text-[#7A200D]/60 hover:text-[#7A200D]',
    factBox:      'bg-[#f5e6c8]',
    factLabel:    'text-[#7A200D]',
    factValue:    'text-gray-900',
    sectionLabel: 'text-[#7A200D]',
    text:         'text-gray-800',
    subText:      'text-gray-500',
  },
}

const hasVal = x => (x ?? '') !== ''

function Fact({ label, value, t }) {
  if (!hasVal(value)) return null
  return (
    <div className={`rounded-lg px-2 py-1.5 min-w-0 ${t.factBox}`}>
      <p className={`text-[9px] font-black uppercase tracking-wide ${t.factLabel}`}>{label}</p>
      <p className={`text-xs font-semibold leading-snug ${t.factValue}`}>{value}</p>
    </div>
  )
}

/* Popup con la información detallada de un movimiento (para decidir qué lanzar) */
export default function MoveInfoModal({ m, onClose, theme = 'dark', attackBonos = [] }) {
  const [featInfo, setFeatInfo] = useState(null)
  const t = THEMES[theme] ?? THEMES.dark
  const has = hasVal
  const powers = [m.move_power_1, m.move_power_2, m.move_power_3].filter(has).join(' / ')
  const damages = [['Nv 1', m.move_damage_level_1], ['Nv 5', m.move_damage_level_5],
    ['Nv 10', m.move_damage_level_10], ['Nv 17', m.move_damage_level_17]].filter(([, v]) => has(v))
  const save = [m.move_save_attribute, has(m.move_save_dc) ? `DC ${m.move_save_dc}` : null].filter(Boolean).join(' · ')

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden ${t.panel}`}>
        <div className={`px-4 py-3 flex items-center justify-between shrink-0 ${t.header}`}>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={`font-bold text-sm truncate ${t.title}`}>{m.move_name}</h3>
            <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0"
              style={{ backgroundColor: MOVE_TYPE_COLORS[m.move_type] || '#9CA3AF' }}>{m.move_type}</span>
          </div>
          <button onClick={onClose} className={`shrink-0 ml-2 ${t.close}`}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Datos clave */}
          {/* Los datos del movimiento a la izquierda, tal y como estaban, y a su
              derecha la columna Bonus, ocupando toda la altura.

              Tres columnas iguales: la rejilla de datos se lleva dos y Bonus la
              tercera. Al subdividir esas dos en dos, cada hueco mide justo lo
              mismo que Bonus, así que los tres quedan del mismo ancho.
              items-stretch es lo que hace que Bonus crezca con la rejilla sea
              cual sea su alto. */}
          <div className="grid grid-cols-3 gap-1.5 items-stretch">
            <div className="col-span-2 grid grid-cols-2 gap-1.5">
              <Fact t={t} label="Tiempo"   value={m.move_time} />
              <Fact t={t} label="PP"       value={Number(m.move_pp) === 0 ? '∞' : m.move_pp} />
              <Fact t={t} label="Rango"    value={m.move_range} />
              <Fact t={t} label="Duración" value={m.move_duration} />
              <Fact t={t} label="Alcance"  value={m.move_attack_scope} />
              <Fact t={t} label="Poder"    value={powers} />
              <Fact t={t} label="Salvación" value={save} />
              {Number(m.move_is_concentration) === 1 && <Fact t={t} label="Concentración" value="Sí" />}
            </div>

            {/* Bonus: los bonos de ataque que dan los feats del Pokémon. Son
                condicionales —Terrain Adept solo vale en su terreno—, así que
                se listan con el nombre del feat para que se sepa de dónde
                salen y cuándo aplican. Repetir el feat añade otra línea. */}
            <div className={`rounded-lg px-2 py-1.5 flex flex-col min-w-0 ${t.factBox}`}>
              <p className={`text-[9px] font-black uppercase tracking-wide ${t.factLabel}`}>Bonus</p>
              {attackBonos.length === 0 ? (
                <p className={`text-xs font-semibold leading-snug ${t.factValue}`}>—</p>
              ) : attackBonos.map((a, i) => {
                // Los que vienen de un feat abren su ficha al pulsarlos; si
                // algún día un bono llega de otra fuente, se pinta sin más.
                const Etiqueta = a.feat ? 'button' : 'div'
                return (
                  <Etiqueta key={i}
                    onClick={a.feat ? () => setFeatInfo(a.feat) : undefined}
                    title={a.feat ? 'Ver detalle del rasgo' : undefined}
                    className={`block text-left w-full ${i > 0 ? 'mt-1.5' : ''} ${
                      a.feat ? 'hover:opacity-70 transition-opacity cursor-pointer' : ''}`}>
                    <p className={`text-[10px] font-semibold leading-tight ${t.factValue} ${
                      a.feat ? 'underline decoration-dotted decoration-current/40 underline-offset-2' : ''}`}>
                      {a.feat_name}
                    </p>
                    <p className={`text-xs font-black leading-tight ${t.factValue}`}>Atk+{a.valor}</p>
                    {a.terreno && (
                      <p className={`text-[9px] leading-tight ${t.subText || t.factLabel}`}>{a.terreno}</p>
                    )}
                  </Etiqueta>
                )
              })}
            </div>
          </div>

          {/* Daño por nivel */}
          {Number(m.move_has_damage) === 1 && damages.length > 0 && (
            <div className={`rounded-lg px-2 py-1.5 ${t.factBox}`}>
              <p className={`text-[9px] font-black uppercase tracking-wide mb-1 ${t.factLabel}`}>
                Daño{has(m.move_damage_type) ? ` (${m.move_damage_type})` : ''}{has(m.move_damage_modifier) ? ` · ${m.move_damage_modifier}` : ''}
              </p>
              <div className="grid grid-cols-4 gap-1">
                {damages.map(([lvl, val]) => (
                  <div key={lvl} className="text-center">
                    <p className={`text-[9px] font-bold ${t.subText}`}>{lvl}</p>
                    <p className={`text-xs font-bold ${t.factValue}`}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          {has(m.move_description) && (
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${t.sectionLabel}`}>Descripción</p>
              <p className={`text-xs leading-relaxed whitespace-pre-line ${t.text}`}>{m.move_description}</p>
            </div>
          )}

          {/* A niveles superiores */}
          {has(m.move_higher_levels) && (
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${t.sectionLabel}`}>A niveles superiores</p>
              <p className={`text-xs leading-relaxed whitespace-pre-line ${t.text}`}>{m.move_higher_levels}</p>
            </div>
          )}

          {/* Reglas opcionales */}
          {has(m.move_optional_rules) && (
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${t.sectionLabel}`}>Reglas opcionales</p>
              <p className={`text-xs leading-relaxed whitespace-pre-line ${t.text}`}>{m.move_optional_rules}</p>
            </div>
          )}
        </div>
      </div>

      {/* Ficha del rasgo. Va en z-[80], por encima de este modal (z-[70]). */}
      {featInfo && <FeatInfoModal feat={featInfo} theme={theme} onClose={() => setFeatInfo(null)} />}
    </div>
  )
}
