import { useState } from 'react'

import { nomeDaEquipe } from '../constants'
import { semanasPermitidas } from '../semanas'
import type { PlanoDaEquipe } from '../supabase/planos'
import {
  assumirSemana,
  liberarSemana,
  nomeDoResponsavel,
  type ResponsavelDaSemana,
} from '../supabase/semanas'
import { Aviso } from './ui'

const QUANDO = ['esta semana', 'próxima semana', 'daqui a 2 semanas']

/** O texto do "sim, sou eu" — o mesmo no painel e no formulário. */
export function confirmacaoDeResponsavel(equipeId: string, rotuloDaSemana: string): string {
  return (
    `Confirma que você é o professor responsável pelo plano da equipe ` +
    `${nomeDaEquipe(equipeId)} na semana ${rotuloDaSemana}?\n\n` +
    `A partir daqui só você cria e altera o plano dessa semana. Os colegas veem ` +
    `o plano e combinam as correções com você.`
  )
}

/**
 * Quem faz o plano de cada semana, por equipe — o "plano mestre".
 *
 * Mostra só a semana atual e as duas seguintes, que são as únicas em que dá
 * para assumir ou mexer. Uma semana livre pode ser assumida por qualquer um
 * da equipe; assumida, fica com o nome do responsável e ninguém mais cria
 * plano de equipe para ela.
 */
export function SemanasDaEquipe({
  equipes,
  responsaveis,
  planos,
  meuId,
  gestao = false,
  aoMudarResponsaveis,
  aoComecarPlano,
  aoAbrirMeuPlano,
  aoVerPlano,
}: {
  equipes: string[]
  responsaveis: ResponsavelDaSemana[]
  /** Planos compartilhados com as equipes — para saber se a semana já tem plano. */
  planos: PlanoDaEquipe[]
  meuId: string
  /** Na tela da Gestão: só leitura, com o botão de destravar a semana. */
  gestao?: boolean
  aoMudarResponsaveis: () => void
  aoComecarPlano?: (equipeId: string, semanaInicio: string) => void
  aoAbrirMeuPlano?: (plano: PlanoDaEquipe) => void
  aoVerPlano?: (plano: PlanoDaEquipe) => void
}) {
  const semanas = semanasPermitidas()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  async function executar(chave: string, acao: () => Promise<void>) {
    setOcupado(chave)
    setErro('')
    try {
      await acao()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui concluir.')
    } finally {
      setOcupado(null)
      aoMudarResponsaveis()
    }
  }

  if (!equipes.length) return null

  return (
    <div className="semanas-equipe">
      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {equipes.map((equipeId) => (
        <div key={equipeId} className="semanas-equipe-bloco">
          {equipes.length > 1 ? <h4>{nomeDaEquipe(equipeId)}</h4> : null}
          <ul>
            {semanas.map((semana, i) => {
              const chave = `${equipeId}:${semana.inicio}`
              const responsavel = responsaveis.find(
                (r) => r.equipe_id === equipeId && r.semana_inicio === semana.inicio,
              )
              const plano = planos.find(
                (p) => p.equipe_id === equipeId && p.semana_inicio === semana.inicio,
              )
              const meu = responsavel?.professor_id === meuId

              return (
                <li key={semana.inicio}>
                  <div>
                    <strong>{semana.rotulo}</strong>
                    <span className="dica"> · {QUANDO[i]}</span>
                    <div className="semanas-equipe-status">
                      {!responsavel ? (
                        <span className="etiqueta atencao">sem responsável</span>
                      ) : meu ? (
                        <span className="etiqueta ok">você é o responsável</span>
                      ) : (
                        <span className="etiqueta">com {nomeDoResponsavel(responsavel)}</span>
                      )}
                      {plano ? <span className="dica"> plano salvo</span> : null}
                    </div>
                  </div>

                  <div className="lista-planos-acoes">
                    {gestao ? (
                      responsavel ? (
                        <button
                          type="button"
                          className="botao secundario"
                          disabled={ocupado === chave}
                          onClick={() => {
                            const aviso = plano
                              ? ' O plano já salvo deixa de ser o da equipe e volta a ser só do autor.'
                              : ''
                            if (
                              !confirm(
                                `Tirar ${nomeDoResponsavel(responsavel)} da semana ${semana.rotulo} da equipe ${nomeDaEquipe(equipeId)}? Outro professor poderá assumir.${aviso}`,
                              )
                            )
                              return
                            executar(chave, () => liberarSemana(equipeId, semana.inicio))
                          }}
                        >
                          Destravar
                        </button>
                      ) : null
                    ) : !responsavel ? (
                      <button
                        type="button"
                        className="botao"
                        disabled={ocupado === chave}
                        onClick={() => {
                          if (!confirm(confirmacaoDeResponsavel(equipeId, semana.rotulo))) return
                          executar(chave, async () => {
                            await assumirSemana(equipeId, semana.inicio)
                            aoComecarPlano?.(equipeId, semana.inicio)
                          })
                        }}
                      >
                        {ocupado === chave ? 'Assumindo…' : 'Sou o responsável'}
                      </button>
                    ) : meu ? (
                      <>
                        {plano ? (
                          <button
                            type="button"
                            className="botao"
                            onClick={() => aoAbrirMeuPlano?.(plano)}
                          >
                            Abrir para editar
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="botao"
                              onClick={() => aoComecarPlano?.(equipeId, semana.inicio)}
                            >
                              Começar o plano
                            </button>
                            <button
                              type="button"
                              className="botao discreto"
                              disabled={ocupado === chave}
                              onClick={() => {
                                if (!confirm(`Largar a semana ${semana.rotulo}? Outro professor da equipe poderá assumir.`))
                                  return
                                executar(chave, () => liberarSemana(equipeId, semana.inicio))
                              }}
                            >
                              Largar
                            </button>
                          </>
                        )}
                      </>
                    ) : plano ? (
                      <button
                        type="button"
                        className="botao secundario"
                        onClick={() => aoVerPlano?.(plano)}
                      >
                        Ver plano
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
