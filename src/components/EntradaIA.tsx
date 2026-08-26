import { useState } from 'react'

import { ErroDeIA, extrairPlano, type PlanoSugerido } from '../ai/cliente'
import { CICLOS_SUGERIDOS } from '../constants'
import type { PlanoDeAula } from '../types'
import { Aviso, Campo } from './ui'

/**
 * Modo IA: o professor cola o material bruto e informa só o cabeçalho.
 * O que a IA devolve cai na tela de revisão, onde tudo pode ser editado.
 */
export function EntradaIA({
  plano,
  aoMudarCabecalho,
  aoConcluir,
  aoPular,
  aoVoltar,
}: {
  plano: PlanoDeAula
  aoMudarCabecalho: (mudanca: Partial<PlanoDeAula>) => void
  aoConcluir: (sugestao: PlanoSugerido) => void
  /** Vai para a revisão sem passar pela IA, mantendo o que já foi preenchido. */
  aoPular: () => void
  aoVoltar: () => void
}) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function organizar() {
    setCarregando(true)
    setErro('')
    try {
      const contexto = [
        plano.curso && `curso de ${plano.curso}`,
        plano.ciclo && `ciclo ${plano.ciclo}`,
        plano.semana && `semana de ${plano.semana}`,
      ]
        .filter(Boolean)
        .join(', ')

      aoConcluir(await extrairPlano(texto, contexto))
    } catch (e) {
      setErro(
        e instanceof ErroDeIA
          ? e.message
          : 'Não consegui organizar o conteúdo agora. Tente de novo ou siga no modo manual.',
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="pagina estreito">
      <button type="button" className="botao discreto" onClick={aoVoltar}>
        ← Voltar
      </button>

      <h1 style={{ fontSize: 24, marginTop: 8 }}>Cole o conteúdo da aula</h1>
      <p style={{ marginTop: 8, marginBottom: 22, color: 'var(--tinta-suave)' }}>
        Pode ser o texto cru copiado de outra plataforma — a IA separa nos campos do plano. Depois
        você revisa tudo.
      </p>

      <div className="cartao">
        <div className="linha">
          <Campo rotulo="Curso">
            <input
              type="text"
              value={plano.curso}
              onChange={(e) => aoMudarCabecalho({ curso: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Ciclo">
            <input
              type="text"
              list="ciclos"
              value={plano.ciclo}
              onChange={(e) => aoMudarCabecalho({ ciclo: e.target.value })}
            />
            <datalist id="ciclos">
              {CICLOS_SUGERIDOS.map((c) => (
                <option value={c} key={c} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Semana" dica="ex.: 31/08 - 04/09">
            <input
              type="text"
              value={plano.semana}
              onChange={(e) => aoMudarCabecalho({ semana: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Prof.">
            <input
              type="text"
              value={plano.professor}
              placeholder="Seu nome"
              onChange={(e) => aoMudarCabecalho({ professor: e.target.value })}
            />
          </Campo>
        </div>

        <Campo rotulo="Conteúdo / material da aula">
          <textarea
            rows={14}
            value={texto}
            placeholder={
              'Cole aqui o tema e o material da aula.\n\n' +
              'Ex.: "Criação do front-end do projeto: HTML, CSS e JavaScript. Os alunos começam ' +
              'a montar a página do projeto final. Usar VSCode. Fazer um quebra-gelo com o Globe."'
            }
            onChange={(e) => setTexto(e.target.value)}
          />
        </Campo>

        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

        <div className="acoes">
          <button
            type="button"
            className="botao"
            onClick={organizar}
            disabled={carregando || texto.trim().length < 20}
          >
            {carregando ? 'Organizando…' : 'Organizar com IA'}
          </button>
          <button type="button" className="botao secundario" onClick={aoPular}>
            Pular e preencher na mão
          </button>
        </div>
      </div>
    </div>
  )
}
