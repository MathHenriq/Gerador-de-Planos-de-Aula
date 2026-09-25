import { moverItem } from '../plano'
import type { LinkNecessario } from '../types'
import { BotoesDeOrdem } from './ui'

const LINK_VAZIO: LinkNecessario = { nome: '', link: '' }

/** Links necessários: nome da plataforma e endereço, em campos separados. */
export function EditorLinks({
  links,
  aoMudar,
}: {
  links: LinkNecessario[]
  aoMudar: (links: LinkNecessario[]) => void
}) {
  const itens = links.length ? links : [LINK_VAZIO]

  const trocar = (i: number, mudanca: Partial<LinkNecessario>) =>
    aoMudar(itens.map((item, j) => (i === j ? { ...item, ...mudanca } : item)))

  const remover = (i: number) => {
    const restantes = itens.filter((_, j) => j !== i)
    aoMudar(restantes.length ? restantes : [LINK_VAZIO])
  }

  return (
    <div>
      {itens.map((item, i) => (
        <div className="item-lista item-link" key={i}>
          <input
            type="text"
            className="link-nome"
            value={item.nome}
            placeholder="Nome — ex.: Canva"
            aria-label={`Nome do link ${i + 1}`}
            onChange={(e) => trocar(i, { nome: e.target.value })}
          />
          <input
            type="url"
            className="link-endereco"
            value={item.link}
            placeholder="https://www.canva.com"
            aria-label={`Endereço do link ${i + 1}`}
            onChange={(e) => trocar(i, { link: e.target.value.trim() })}
          />
          <div className="item-lista-acoes">
            <BotoesDeOrdem
              indice={i}
              total={itens.length}
              descricao={`link ${i + 1}`}
              aoMover={(de, para) => aoMudar(moverItem(itens, de, para))}
            />
            <button
              type="button"
              className="botao icone"
              onClick={() => remover(i)}
              aria-label={`Remover link ${i + 1}`}
              title="Remover"
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="botao discreto"
        onClick={() => aoMudar([...itens, LINK_VAZIO])}
      >
        + Adicionar link
      </button>
    </div>
  )
}
