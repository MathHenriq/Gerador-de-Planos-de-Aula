import { useCallback, useEffect, useMemo, useState } from 'react'

import logoMicroKa from './assets/logo-micro-ka.png'
import { Formulario } from './components/Formulario'
import { planoVazio } from './constants'
import { planoDeAmostra } from './planoDeAmostra'
import type { PlanoDeAula } from './types'

const CHAVE_RASCUNHO = 'nucleo-wit:plano-de-aula'

/**
 * Se o que está salvo é byte-a-byte o plano de exemplo, não é um rascunho —
 * é sequela do bug em que "Ver um exemplo preenchido" sobrescrevia o
 * rascunho de verdade (corrigido abaixo, no efeito que salva). Quem já foi
 * afetado tem isso limpo automaticamente na próxima vez que abrir o link.
 */
function eraOBugDoExemplo(bruto: string): boolean {
  return bruto === JSON.stringify(planoDeAmostra)
}

function lerRascunho(): PlanoDeAula | null {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO)
    if (!bruto) return null
    if (eraOBugDoExemplo(bruto)) {
      localStorage.removeItem(CHAVE_RASCUNHO)
      return null
    }
    return { ...planoVazio(), ...(JSON.parse(bruto) as PlanoDeAula) }
  } catch {
    return null
  }
}

export function App() {
  const rascunho = useMemo(lerRascunho, [])
  const [plano, setPlano] = useState<PlanoDeAula>(() => rascunho ?? planoVazio())

  // Rascunho fica no navegador: recarregar a página não perde o trabalho.
  //
  // Exceção de propósito: enquanto `plano` for exatamente `planoDeAmostra` (o
  // professor só clicou em "Ver um exemplo preenchido" para olhar), NADA é
  // salvo. Sem essa guarda, o clique — que qualquer um dá só por curiosidade —
  // sobrescrevia o rascunho de verdade, e o link passava a abrir sempre no
  // exemplo, sem nenhum aviso de como sair dali. Assim que o professor edita
  // qualquer campo do exemplo, `mudar()` cria um objeto novo (deixa de ser
  // `=== planoDeAmostra`) e a partir daí ele passa a ser salvo normalmente,
  // porque virou um rascunho real.
  useEffect(() => {
    if (plano === planoDeAmostra) return
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
