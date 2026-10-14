import { createContext, useContext } from 'react'

// { tirar(notacion, opciones) → Promise<resultado>, abrirBandeja() } o null
// fuera de una partida: quien lo use debe esconder su botón de dado si no hay.
export const DadosContext = createContext(null)
export const useDados = () => useContext(DadosContext)
