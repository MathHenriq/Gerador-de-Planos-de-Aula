import { NUCLEOS, textoDasEscolas } from '../constants'
import { escolasCabem } from '../pdf/diagnostico'
import { Aviso } from './ui'

/**
 * Marcação dos núcleos que a aula alcança.
 *
 * A ordem impressa no PDF é sempre a da lista oficial, não a ordem em que o
 * professor foi clicando — assim dois planos da mesma semana saem iguais.
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
    const nova = new Set(marcadas)
    if (nova.has(nucleo)) nova.delete(nucleo)
    else nova.add(nucleo)
    aoMudar(NUCLEOS.filter((n) => nova.has(n)))
  }

  return (
    <div>
      <div className="acoes" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className="botao discreto"
          onClick={() => aoMudar([...NUCLEOS])}
          disabled={escolhidas.length === NUCLEOS.length}
        >
          Marcar todos
        </button>
        <button
          type="button"
          className="botao discreto"
          onClick={() => aoMudar([])}
          disabled={escolhidas.length === 0}
        >
          Limpar
        </button>
        <span className="dica">
          {escolhidas.length} de {NUCLEOS.length} marcados
        </span>
      </div>

      <div className="escolas">
        {NUCLEOS.map((nucleo) => (
          <label className="escola" key={nucleo}>
            <input
              type="checkbox"
              checked={marcadas.has(nucleo)}
              onChange={() => alternar(nucleo)}
            />
            <span>{nucleo}</span>
          </label>
        ))}
      </div>

      {escolhidas.length ? (
        <p className="explica" style={{ marginTop: 12 }}>
          Vai sair assim no PDF: <em>{textoDasEscolas(escolhidas)}</em>
        </p>
      ) : null}

      {cabe ? null : (
        <Aviso tipo="atencao">
          Com {escolhidas.length} núcleos marcados o texto não cabe na caixa "Escolas:" do
          template, que tem altura fixa — o final da lista sairia cortado. Desmarque alguns.
        </Aviso>
      )}
    </div>
  )
}
