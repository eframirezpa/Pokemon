import {
  Star, Flame, Droplet, Leaf, Zap, Snowflake, HandFist, Skull, Mountain, Feather,
  Eye, Bug, Gem, Ghost, Crown, Moon, Shield, Sparkles,
} from 'lucide-react'

// Símbolo de cada tipo Pokémon, para el fondo del aura (un trueno para
// Electric, una llama para Fire…). Dragon no tiene icono propio en lucide:
// va con una corona.
export const ICONO_TIPO = {
  Normal: Star, Fire: Flame, Water: Droplet, Grass: Leaf, Electric: Zap, Ice: Snowflake,
  Fighting: HandFist, Poison: Skull, Ground: Mountain, Flying: Feather, Psychic: Eye, Bug,
  Rock: Gem, Ghost, Dragon: Crown, Dark: Moon, Steel: Shield, Fairy: Sparkles,
}
