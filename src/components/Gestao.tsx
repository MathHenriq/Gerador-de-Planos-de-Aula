import { useEffect, useMemo, useState } from 'react'

import { EQUIPES, nomeDaEquipe } from '../constants'
import {
  adicionarNaEquipe,
  listarProfessores,
  removerDaEquipe,
  type ProfessorDaGestao,
} from '../supabase/equipes'
import { listarTodosOsPlanos, type PlanoDaEquipe } from '../supabase/planos'
import { ExportarPlanos } from './ExportarPlanos'
import { Aviso } from './ui'

type Aba = 'professores' | 'planos' | 'exportar'

function dataFormatada(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Painel da Gestão: quem está em qual equipe, e todos os planos do sistema.
 *
 * O foco é a primeira aba — mover professor de equipe sem precisar mexer no
 * banco à mão. A segunda existe para dar visibilidade (inclusive dos planos
 * não compartilhados), e é só leitura: a Gestão não edita plano de ninguém.
 *
 * A tela só aparece para quem está na equipe Gestão, mas quem garante isso é
 * a RLS do banco — se alguém chamar as funções por fora, o Supabase recusa.
 */
export function Gestao({ aoFechar }: { aoFechar: () => void }) {
  const [aba, setAba] = useState<Aba>('professores')
  const [professores, setProfessores] = useState<ProfessorDaGestao[] | null>(null)
  const [planos, setPlanos] = useState<PlanoDaEquipe[] | null>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState<string | null>(null)
  const [planoAberto, setPlanoAberto] = useState<string | null>(null)

  useEffect(() => {
    listarProfessores()
      .then(setProfessores)
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Não consegui carregar os professores.'),
      )
  }, [])

  useEffect(() => {
    if ((aba !== 'planos' && aba !== 'exportar') || planos) return
    listarTodosOsPlanos()
      .then(setPlanos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não consegui carregar os planos.'))
  }, [aba, planos])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return professores ?? []
    return (professores ?? []).filter(
      (p) => p.email.toLowerCase().includes(termo) || p.nome.toLowerCase().includes(termo),
    )
  }, [professores, busca])

  async function alternarEquipe(professor: ProfessorDaGestao, equipeId: string) {
    const tinha = professor.equipes.includes(equipeId)
    setSalvando(`${professor.id}:${equipeId}`)
    setErro('')
    try {
      if (tinha) await removerDaEquipe(professor.id, equipeId)
      else await adicionarNaEquipe(professor.id, equipeId)

      setProfessores(
        (atual) =>
          atual?.map((p) =>
            p.id === professor.id
              ? {
                  ...p,
                  equipes: tinha
                    ? p.equipes.filter((e) => e !== equipeId)
                    : [...p.equipes, equipeId],
                }
              : p,
          ) ?? null,
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui mudar a equipe desse professor.')
    } finally {
      setSalvando(null)
    }
  }

  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div className="modal-cartao largo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Gestão</h2>
          <button type="button" className="botao icone" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="auth-abas">
          <button
            type="button"
            className={aba === 'professores' ? 'ativa' : ''}
            onClick={() => setAba('professores')}
          >
            Professores e equipes
          </button>
          <button
            type="button"
            className={aba === 'planos' ? 'ativa' : ''}
            onClick={() => setAba('planos')}
          >
            Todos os planos
          </button>
          <button
            type="button"
            className={aba === 'exportar' ? 'ativa' : ''}
            onClick={() => setAba('exportar')}
          >
            Exportar
          </button>
        </div>

        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

        {aba === 'professores' ? (
          !professores ? (
            <p className="explica">Carregando…</p>
          ) : (
            <>
              <input
                type="search"
                placeholder="Buscar por nome ou e-mail"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{ marginBottom: 14 }}
              />
              <p className="explica">
                Marque as equipes de cada professor. A mudança vale na hora — quem estiver logado
                vê a nova equipe ao recarregar a página.
              </p>

              <ul className="lista-professores">
                {filtrados.map((professor) => (
                  <li key={professor.id}>
                    <div className="professor-identificacao">
                      <strong>{professor.nome || '(sem nome preenchido)'}</strong>
                      <span className="lista-planos-data">{professor.email}</span>
                    </div>
                    <div className="equipes-lista">
                      {EQUIPES.map((equipe) => (
                        <label
                          className={`equipe-opcao${
                            professor.equipes.includes(equipe.id) ? ' marcada' : ''
                          }`}
                          key={equipe.id}
                        >
                          <input
                            type="checkbox"
                            checked={professor.equipes.includes(equipe.id)}
                            disabled={salvando === `${professor.id}:${equipe.id}`}
                            onChange={() => alternarEquipe(professor, equipe.id)}
                          />
                          <span>{equipe.nome}</span>
                        </label>
                      ))}
                    </div>
                  </li>
                ))}
                {filtrados.length === 0 ? (
                  <li>
                    <p className="explica">Nenhum professor com esse nome ou e-mail.</p>
                  </li>
                ) : null}
              </ul>
            </>
          )
        ) : !planos ? (
          <p className="explica">Carregando…</p>
        ) : aba === 'exportar' ? (
          <ExportarPlanos planos={planos} />
        ) : (
          <>
            <p className="explica">
              Todos os planos do sistema, compartilhados ou não. Aqui é só leitura — a Gestão não
              edita nem exclui plano de professor.
            </p>
            <ul className="lista-planos">
              {planos.map((p) => (
                <li key={p.id} className="empilhado">
                  <div>
                    <strong>{p.dados.temaDaAula?.trim() || p.dados.curso || 'Plano sem tema'}</strong>
                    <span className="lista-planos-data">
                      {p.autor_nome?.trim() || p.autor_email || 'autor desconhecido'} ·{' '}
                      {p.dados.curso}
                      {p.dados.semana ? ` · ${p.dados.semana}` : ''} ·{' '}
                      {dataFormatada(p.atualizado_em)}
                    </span>
                  </div>
                  <div className="lista-planos-acoes">
                    <span className={`etiqueta ${p.equipe_id ? 'ok' : ''}`}>
                      {p.equipe_id ? nomeDaEquipe(p.equipe_id) : 'Não compartilhado'}
                    </span>
                    <button
                      type="button"
                      className="botao discreto"
                      onClick={() => setPlanoAberto(planoAberto === p.id ? null : p.id)}
                    >
                      {planoAberto === p.id ? 'Fechar' : 'Ver'}
                    </button>
                  </div>
                  {planoAberto === p.id ? (
                    <dl className="resumo-plano">
                      <dt>Prof.</dt>
                      <dd>{p.dados.professor || '—'}</dd>
                      <dt>Ciclo</dt>
                      <dd>{p.dados.ciclo || '—'}</dd>
                      <dt>Núcleos</dt>
                      <dd>{p.dados.escolas.join(', ') || '—'}</dd>
                      <dt>Resumo</dt>
                      <dd>{p.dados.resumo || '—'}</dd>
                    </dl>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
