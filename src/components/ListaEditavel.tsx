import { TextoMultilinha } from './ui'

/** Lista de textos com adicionar/remover — objetivos, materiais, metodologia, recursos. */
export function ListaEditavel({
  itens,
  aoMudar,
  placeholder,
  rotuloAdicionar = 'Adicionar item',
  linhas = 2,
}: {
  itens: string[]
  aoMudar: (itens: string[]) => void
  placeholder?: string
  rotuloAdicionar?: string
  linhas?: number
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
          <button
            type="button"
            className="botao icone"
            onClick={() => remover(i)}
            aria-label={`Remover item ${i + 1}`}
            title="Remover"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="botao discreto" onClick={() => aoMudar([...itens, ''])}>
        + {rotuloAdicionar}
      </button>
    </div>
  )
}
