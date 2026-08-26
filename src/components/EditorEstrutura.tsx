import { somaDosBlocos } from '../ai/cliente'
import { MINUTOS_TOTAIS } from '../constants'
import type { BlocoAtividade } from '../types'
import { ListaEditavel } from './ListaEditavel'

/**
 * Editor dos blocos de tempo da aula. O total precisa fechar em 90 minutos —
 * o aviso fica sempre visível para não passar batido.
 */
export function EditorEstrutura({
  blocos,
  aoMudar,
}: {
  blocos: BlocoAtividade[]
  aoMudar: (blocos: BlocoAtividade[]) => void
}) {
  const total = somaDosBlocos(blocos)
  const fecha = total === MINUTOS_TOTAIS

  const trocar = (i: number, mudanca: Partial<BlocoAtividade>) =>
    aoMudar(blocos.map((b, j) => (i === j ? { ...b, ...mudanca } : b)))

  const remover = (i: number) => aoMudar(blocos.filter((_, j) => j !== i))

  return (
    <div>
      <p className="explica">
        Total dos blocos:{' '}
        <strong className={`etiqueta ${fecha ? 'ok' : 'atencao'}`}>
          {total} de {MINUTOS_TOTAIS} min
        </strong>{' '}
        {fecha ? '' : `— faltam ${MINUTOS_TOTAIS - total} min para fechar a aula.`}
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
