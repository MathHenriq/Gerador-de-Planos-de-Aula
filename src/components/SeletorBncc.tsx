import { useMemo, useState } from 'react'

import { COMPETENCIAS_EF } from '../bncc/competencias'
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
  /** Começa nas competências 5 e 6, que são as usadas no curso. */
  const [competencias, setCompetencias] = useState<number[]>(
    COMPETENCIAS_EF.map((c) => c.numero),
  )

  // Sem limite: a lista inteira fica à mão, a busca só estreita.
  const resultados = useMemo(
    () => buscarNoCatalogo(busca, Number.MAX_SAFE_INTEGER, competencias),
    [busca, competencias],
  )

  function alternarCompetencia(numero: number) {
    setCompetencias((atual) =>
      atual.includes(numero) ? atual.filter((n) => n !== numero) : [...atual, numero].sort(),
    )
  }
  const escolhidos = new Set(habilidades.map((h) => h.codigo))

  function adicionar(novas: Habilidade[]) {
    const juntas = [...habilidades]
    for (const h of novas) if (!juntas.some((j) => j.codigo === h.codigo)) juntas.push(h)
    aoMudar(juntas)
  }

  function adicionarDigitados() {
    const { validas, descartados, foraDaEtapa } = validarCodigos(digitado.split(/[\s,;]+/))
    adicionar(validas)
    setDigitado('')
    setErro(
      [
        foraDaEtapa.length
          ? `${foraDaEtapa.join(', ')} existe(m) na BNCC, mas fora do Ensino Fundamental — ` +
            'o gerador trabalha só com essa etapa.'
          : '',
        descartados.length
          ? `Não encontrei no catálogo oficial da BNCC: ${descartados.join(', ')}. ` +
            'Confira o código ou busque pela descrição abaixo.'
          : '',
      ]
        .filter(Boolean)
        .join(' '),
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

      <div className="competencias">
        {COMPETENCIAS_EF.map((c) => (
          <button
            type="button"
            key={c.numero}
            className={`chip${competencias.includes(c.numero) ? ' ativo' : ''}`}
            onClick={() => alternarCompetencia(c.numero)}
            title={c.texto}
          >
            Competência {c.numero} · {c.apelido}
          </button>
        ))}
        <button
          type="button"
          className={`chip${competencias.length === 0 ? ' ativo' : ''}`}
          onClick={() => setCompetencias([])}
        >
          Catálogo inteiro
        </button>
      </div>

      <p className="explica">
        {busca.trim()
          ? `${resultados.length} habilidade(s) para "${busca.trim()}"`
          : `${resultados.length} habilidades. Clique para adicionar.`}
      </p>

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
    </div>
  )
}
