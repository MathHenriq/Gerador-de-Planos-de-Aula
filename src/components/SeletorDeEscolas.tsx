import { DIAS_DA_SEMANA, NUCLEOS, rotuloDoDia, textoDasEscolas } from '../constants'
import { escolasCabem } from '../pdf/diagnostico'
import { Aviso } from './ui'

/**
 * Marcação dos núcleos que a aula alcança.
 *
 * A ORDEM IMPORTA: é a ordem da semana. O primeiro núcleo marcado é o de
 * segunda, o segundo é o de terça, e assim por diante — por isso a seleção
 * guarda a ordem de clique, e não a ordem da lista oficial. Quem clicou fora de
 * ordem corrige pelas setas, sem precisar desmarcar tudo.
 */
export function SeletorDeEscolas({
  escolhidas,
  aoMudar,
}: {
  escolhidas: string[]
  aoMudar: (escolas: string[]) => void
}) {
  const marcadas = new Set(escolhidas)
  const cabe = escolasCabem(escolhidas)

  function alternar(nucleo: string) {
    if (marcadas.has(nucleo)) aoMudar(escolhidas.filter((n) => n !== nucleo))
    else aoMudar([...escolhidas, nucleo])
  }

  function mover(de: number, para: number) {
    if (para < 0 || para >= escolhidas.length) return
    const nova = [...escolhidas]
    const [item] = nova.splice(de, 1)
    nova.splice(para, 0, item)
    aoMudar(nova)
  }

  return (
    <div>
      {escolhidas.length ? (
        <ol className="ordem-escolas">
          {escolhidas.map((nucleo, i) => (
            <li key={nucleo}>
              <span className="dia">{rotuloDoDia(i)}</span>
              <span className="nome">{nucleo}</span>
              <button
                type="button"
                className="botao icone"
                onClick={() => mover(i, i - 1)}
                disabled={i === 0}
                aria-label={`Mover ${nucleo} para cima`}
                title="Mover para cima"
              >
                ↑
              </button>
              <button
                type="button"
                className="botao icone"
                onClick={() => mover(i, i + 1)}
                disabled={i === escolhidas.length - 1}
                aria-label={`Mover ${nucleo} para baixo`}
                title="Mover para baixo"
              >
                ↓
              </button>
              <button
                type="button"
                className="botao icone"
                onClick={() => alternar(nucleo)}
                aria-label={`Remover ${nucleo}`}
                title="Remover"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="explica">
          Marque os núcleos na ordem da semana: o primeiro é o de{' '}
          {DIAS_DA_SEMANA[0].toLowerCase()}, o segundo é o de{' '}
          {DIAS_DA_SEMANA[1].toLowerCase()}, e assim por diante.
        </p>
      )}

      <div className="acoes" style={{ margin: '12px 0 10px' }}>
        <button
          type="button"
          className="botao discreto"
          onClick={() => aoMudar([])}
          disabled={escolhidas.length === 0}
        >
          Limpar seleção
        </button>
        <span className="dica">
          {escolhidas.length} de {NUCLEOS.length} marcados
        </span>
      </div>

      <div className="escolas">
        {NUCLEOS.map((nucleo) => {
          const posicao = escolhidas.indexOf(nucleo)
          return (
            <label className={`escola${posicao >= 0 ? ' marcada' : ''}`} key={nucleo}>
              <input type="checkbox" checked={posicao >= 0} onChange={() => alternar(nucleo)} />
              <span>{nucleo}</span>
              {posicao >= 0 ? <span className="posicao">{rotuloDoDia(posicao)}</span> : null}
            </label>
          )
        })}
      </div>

      {escolhidas.length ? (
        <p className="explica" style={{ marginTop: 12 }}>
          Vai sair assim no PDF: <em>{textoDasEscolas(escolhidas)}</em>
        </p>
      ) : null}

      {cabe ? null : (
        <Aviso tipo="atencao">
          Com {escolhidas.length} núcleos marcados o texto não cabe na caixa “Escolas:” do
          template, que tem altura fixa — o final da lista sairia cortado. Desmarque alguns.
        </Aviso>
      )}
    </div>
  )
}
