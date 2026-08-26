import { useMemo, useState } from 'react'

import { buscarNoCatalogo, validarCodigos } from '../bncc/validar'
import type { Habilidade } from '../types'
import { Aviso } from './ui'

/**
 * Escolha das habilidades da BNCC.
 *
 * Dois caminhos, os dois passando pela mesma validação: digitar o código direto
 * (para quem já sabe qual é) ou buscar por palavra no catálogo oficial. Em
 * qualquer um deles a descrição usada é sempre a oficial do catálogo.
 */
export function SeletorBncc({
  habilidades,
  aoMudar,
}: {
  habilidades: Habilidade[]
  aoMudar: (h: Habilidade[]) => void
}) {
  const [busca, setBusca] = useState('')
  const [digitado, setDigitado] = useState('')
  const [erro, setErro] = useState('')

  const resultados = useMemo(() => buscarNoCatalogo(busca, 30), [busca])
  const escolhidos = new Set(habilidades.map((h) => h.codigo))

  function adicionar(novas: Habilidade[]) {
    const juntas = [...habilidades]
    for (const h of novas) if (!juntas.some((j) => j.codigo === h.codigo)) juntas.push(h)
    aoMudar(juntas)
  }

  function adicionarDigitados() {
    const { validas, descartados } = validarCodigos(digitado.split(/[\s,;]+/))
    adicionar(validas)
    setDigitado('')
    setErro(
      descartados.length
        ? `Não encontrei no catálogo oficial da BNCC: ${descartados.join(', ')}. ` +
            'Confira o código ou busque pela descrição abaixo.'
        : '',
    )
  }

  return (
    <div>
      {habilidades.map((h) => (
        <div className="bncc-escolhida" key={h.codigo}>
          <span className="codigo">{h.codigo}</span>
          <span className="descricao">{h.descricao}</span>
          <button
            type="button"
            className="botao icone"
            onClick={() => aoMudar(habilidades.filter((x) => x.codigo !== h.codigo))}
            aria-label={`Remover ${h.codigo}`}
            title="Remover"
          >
            ×
          </button>
        </div>
      ))}

      <div className="linha" style={{ marginTop: habilidades.length ? 14 : 0 }}>
        <label className="campo">
          <span>Já sei o código</span>
          <input
            type="text"
            value={digitado}
            placeholder="Ex.: EF69CO02, EF09CO09"
            onChange={(e) => setDigitado(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarDigitados()
              }
            }}
          />
        </label>

        <label className="campo">
          <span>Buscar no catálogo oficial</span>
          <input
            type="text"
            value={busca}
            placeholder="Ex.: algoritmo, direitos autorais, 9º ano"
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
      </div>

      <div className="acoes" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="botao secundario"
          onClick={adicionarDigitados}
          disabled={!digitado.trim()}
        >
          Adicionar código
        </button>
      </div>

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      {busca.trim() ? (
        <div className="bncc-resultados">
          {resultados.length === 0 ? (
            <div className="bncc-resultado">Nenhuma habilidade encontrada para essa busca.</div>
          ) : (
            resultados.map((e) => (
              <button
                type="button"
                className="bncc-resultado"
                key={e.codigo}
                disabled={escolhidos.has(e.codigo)}
                onClick={() => adicionar([{ codigo: e.codigo, descricao: e.descricao }])}
              >
                <span className="codigo">{e.codigo}</span> <span className="etapa">{e.etapa}</span>
                <br />
                {e.descricao}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
