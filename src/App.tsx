import { useCallback, useEffect, useMemo, useState } from 'react'

import type { PlanoSugerido } from './ai/cliente'
import logoMicroKa from './assets/logo-micro-ka.png'
import { EntradaIA } from './components/EntradaIA'
import { EscolhaDeModo } from './components/EscolhaDeModo'
import { Revisao } from './components/Revisao'
import { planoVazio } from './constants'
import { planoDeAmostra } from './planoDeAmostra'
import type { Etapa, ModoEntrada, PlanoDeAula } from './types'

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
  const rascunhoInicial = useMemo(lerRascunho, [])
  const [plano, setPlano] = useState<PlanoDeAula>(() => rascunhoInicial ?? planoVazio())
  const [etapa, setEtapa] = useState<Etapa>('escolha')
  const [temRascunho] = useState(() => rascunhoInicial !== null)

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

  function escolherModo(modo: ModoEntrada) {
    setEtapa(modo === 'ia' ? 'entrada-ia' : 'revisao')
  }

  function aplicarSugestao(sugestao: PlanoSugerido) {
    setPlano((atual) => ({
      ...atual,
      ...sugestao,
      // A IA não escolhe BNCC aqui: isso é feito na revisão, com validação.
      habilidades: atual.habilidades,
      objetivos: sugestao.objetivos.length ? sugestao.objetivos : atual.objetivos,
      materiais: sugestao.materiais.length ? sugestao.materiais : atual.materiais,
      metodologia: sugestao.metodologia.length ? sugestao.metodologia : atual.metodologia,
      estrutura: sugestao.estrutura.length ? sugestao.estrutura : atual.estrutura,
      recursos: sugestao.recursos.length ? sugestao.recursos : atual.recursos,
    }))
    setEtapa('revisao')
  }

  function limpar() {
    setPlano(planoVazio())
    setEtapa('escolha')
  }

  return (
    <>
      <header className="topo">
        <img src={logoMicroKa} alt="Micro Ka" />
        <div>
          <div className="titulo">Gerador de Plano de Aula</div>
          <div className="subtitulo">Núcleo WIT · Micro Ka</div>
        </div>
        <div className="espaco" />
        {etapa === 'escolha' ? (
          <button
            type="button"
            className="botao discreto"
            onClick={() => {
              setPlano(planoDeAmostra)
              setEtapa('revisao')
            }}
          >
            Ver um exemplo preenchido
          </button>
        ) : null}
      </header>

      {etapa === 'escolha' ? (
        <EscolhaDeModo
          aoEscolher={escolherModo}
          temRascunho={temRascunho}
          aoRetomar={() => setEtapa('revisao')}
        />
      ) : null}

      {etapa === 'entrada-ia' ? (
        <EntradaIA
          plano={plano}
          aoMudarCabecalho={mudar}
          aoConcluir={aplicarSugestao}
          aoPular={() => setEtapa('revisao')}
          aoVoltar={() => setEtapa('escolha')}
        />
      ) : null}

      {etapa === 'revisao' ? (
        <Revisao
          plano={plano}
          aoMudar={mudar}
          aoVoltar={() => setEtapa('escolha')}
          aoLimpar={limpar}
        />
      ) : null}
    </>
  )
}
