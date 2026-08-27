import { useEffect, useState } from 'react'

import { excluirPlano, listarPlanos, type PlanoSalvo } from '../supabase/planos'
import { Aviso } from './ui'

function dataFormatada(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Título de exibição de um plano salvo: tema + curso, ou um genérico se ainda estiver vazio. */
function tituloDoPlano(plano: PlanoSalvo): string {
  const { temaDaAula, curso } = plano.dados
  if (temaDaAula.trim()) return temaDaAula.trim()
  return curso || 'Plano sem tema'
}

/**
 * Painel com os planos salvos do professor: abrir um deles carrega os dados
 * no formulário (substituindo o que estiver na tela); excluir pede
 * confirmação, porque não tem como desfazer.
 */
export function MeusPlanos({
  aoFechar,
  aoAbrirPlano,
}: {
  aoFechar: () => void
  aoAbrirPlano: (plano: PlanoSalvo) => void
}) {
  const [planos, setPlanos] = useState<PlanoSalvo[] | null>(null)
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState<string | null>(null)

  useEffect(() => {
    listarPlanos()
      .then(setPlanos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não consegui carregar seus planos.'))
  }, [])

  async function excluir(id: string) {
    if (!confirm('Excluir este plano salvo? Não tem como desfazer.')) return
    setExcluindo(id)
    try {
      await excluirPlano(id)
      setPlanos((atual) => atual?.filter((p) => p.id !== id) ?? null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui excluir esse plano.')
    } finally {
      setExcluindo(null)
    }
  }

  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div className="modal-cartao" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Meus planos</h2>
          <button type="button" className="botao icone" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

        {!planos ? (
          <p className="explica">Carregando…</p>
        ) : planos.length === 0 ? (
          <p className="explica">Você ainda não salvou nenhum plano.</p>
        ) : (
          <ul className="lista-planos">
            {planos.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{tituloDoPlano(p)}</strong>
                  <span className="lista-planos-data">
                    {p.dados.semana ? `${p.dados.semana} · ` : ''}
                    Salvo em {dataFormatada(p.atualizado_em)}
                  </span>
                </div>
                <div className="lista-planos-acoes">
                  <button type="button" className="botao secundario" onClick={() => aoAbrirPlano(p)}>
                    Abrir
                  </button>
                  <button
                    type="button"
                    className="botao icone"
                    onClick={() => excluir(p.id)}
                    disabled={excluindo === p.id}
                    aria-label="Excluir"
                    title="Excluir"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
