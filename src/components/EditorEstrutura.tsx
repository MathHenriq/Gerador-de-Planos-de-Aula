import { somaDosBlocos } from '../plano'
import type { BlocoAtividade } from '../types'
import { ListaEditavel } from './ListaEditavel'

/**
 * Editor dos blocos de tempo da aula. O total precisa fechar exatamente na
 * duração escolhida no cabeçalho — o aviso fica sempre visível para não
 * passar batido.
 */
export function EditorEstrutura({
  blocos,
  minutosTotais,
  aoMudar,
}: {
  blocos: BlocoAtividade[]
  /** Duração escolhida para a aula (`plano.minutos`) — o alvo da soma. */
  minutosTotais: number
  aoMudar: (blocos: BlocoAtividade[]) => void
}) {
  const total = somaDosBlocos(blocos)
  const fecha = total === minutosTotais

  const trocar = (i: number, mudanca: Partial<BlocoAtividade>) =>
    aoMudar(blocos.map((b, j) => (i === j ? { ...b, ...mudanca } : b)))

  const remover = (i: number) => aoMudar(blocos.filter((_, j) => j !== i))

  return (
    <div>
      <p className="explica">
        Total dos blocos:{' '}
        <strong className={`etiqueta ${fecha ? 'ok' : 'atencao'}`}>
          {total} de {minutosTotais} min
        </strong>{' '}
        {fecha ? '' : `— faltam ${minutosTotais - total} min para fechar a aula.`}
      </p>

      {blocos.map((bloco, i) => (
        <div className="bloco" key={i}>
          <div className="bloco-topo">
            <input
              type="text"
              value={bloco.titulo}
              placeholder="Título do bloco (ex.: Conversa inicial)"
              onChange={(e) => trocar(i, { titulo: e.target.value })}
            />
            <input
              type="text"
              inputMode="numeric"
              className="minutos"
              value={bloco.minutos ? String(bloco.minutos) : ''}
              placeholder="min"
              aria-label={`Minutos do bloco ${i + 1}`}
              onChange={(e) =>
                trocar(i, { minutos: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
            <button
              type="button"
              className="botao icone"
              onClick={() => remover(i)}
              aria-label={`Remover bloco ${i + 1}`}
              title="Remover bloco"
            >
              ×
            </button>
          </div>

          <ListaEditavel
            itens={bloco.itens.length ? bloco.itens : ['']}
            aoMudar={(itens) => trocar(i, { itens })}
            placeholder="O que acontece nesse bloco"
            rotuloAdicionar="Adicionar passo"
          />
        </div>
      ))}

      <button
        type="button"
        className="botao secundario"
        onClick={() => aoMudar([...blocos, { titulo: '', minutos: 0, itens: [''] }])}
      >
        + Adicionar bloco
      </button>
    </div>
  )
}
