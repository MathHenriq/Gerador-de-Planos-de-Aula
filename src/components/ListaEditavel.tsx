import { moverItem } from '../plano'
import { BotoesDeOrdem, TextoMultilinha } from './ui'

/** Lista de textos com adicionar/reordenar/remover — objetivos, materiais, metodologia, recursos. */
export function ListaEditavel({
  itens,
  aoMudar,
  placeholder,
  rotuloAdicionar = 'Adicionar item',
  linhas = 2,
  descricaoDoItem = 'item',
}: {
  itens: string[]
  aoMudar: (itens: string[]) => void
  placeholder?: string
  rotuloAdicionar?: string
  linhas?: number
  /** Como o item é chamado nos rótulos de acessibilidade ("objetivo", "passo"). */
  descricaoDoItem?: string
}) {
  const trocar = (i: number, valor: string) =>
    aoMudar(itens.map((item, j) => (i === j ? valor : item)))

  const remover = (i: number) => {
    const restantes = itens.filter((_, j) => j !== i)
    aoMudar(restantes.length ? restantes : [''])
  }

  return (
    <div>
      {itens.map((item, i) => (
        <div className="item-lista" key={i}>
          <TextoMultilinha
            valor={item}
            aoMudar={(v) => trocar(i, v)}
            placeholder={placeholder}
            linhas={linhas}
          />
          <div className="item-lista-acoes">
            <BotoesDeOrdem
              indice={i}
              total={itens.length}
              descricao={`${descricaoDoItem} ${i + 1}`}
              aoMover={(de, para) => aoMudar(moverItem(itens, de, para))}
            />
            <button
              type="button"
              className="botao icone"
              onClick={() => remover(i)}
              aria-label={`Remover ${descricaoDoItem} ${i + 1}`}
              title="Remover"
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="botao discreto" onClick={() => aoMudar([...itens, ''])}>
        + {rotuloAdicionar}
      </button>
    </div>
  )
}
