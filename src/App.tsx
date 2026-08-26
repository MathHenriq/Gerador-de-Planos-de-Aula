import { useCallback, useEffect, useMemo, useState } from 'react'

import logoMicroKa from './assets/logo-micro-ka.png'
import { Formulario } from './components/Formulario'
import { planoVazio } from './constants'
import { planoDeAmostra } from './planoDeAmostra'
import type { PlanoDeAula } from './types'

const CHAVE_RASCUNHO = 'nucleo-wit:plano-de-aula'

function lerRascunho(): PlanoDeAula | null {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO)
    if (!bruto) return null
    return { ...planoVazio(), ...(JSON.parse(bruto) as PlanoDeAula) }
  } catch {
    return null
  }
}

export function App() {
  const rascunho = useMemo(lerRascunho, [])
  const [plano, setPlano] = useState<PlanoDeAula>(() => rascunho ?? planoVazio())

  // Rascunho fica no navegador: recarregar a página não perde o trabalho.
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(plano))
    } catch {
      /* navegador sem armazenamento: seguimos sem salvar */
    }
  }, [plano])

  const mudar = useCallback(
    (mudanca: Partial<PlanoDeAula>) => setPlano((atual) => ({ ...atual, ...mudanca })),
    [],
  )

  return (
    <>
      <header className="topo">
        <img src={logoMicroKa} alt="Micro Ka" />
        <div>
          <div className="titulo">Gerador de Plano de Aula</div>
          <div className="subtitulo">Núcleo WIT · Micro Ka</div>
        </div>
        <div className="espaco" />
        <button type="button" className="botao discreto" onClick={() => setPlano(planoDeAmostra)}>
          Ver um exemplo preenchido
        </button>
      </header>

      <Formulario plano={plano} aoMudar={mudar} aoLimpar={() => setPlano(planoVazio())} />
    </>
  )
}
