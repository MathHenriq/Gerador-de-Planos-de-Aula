import { useState } from 'react'

import { codigoValido, normalizarCodigo } from '../bncc/validar'
import type { Habilidade } from '../types'
import { Aviso } from './ui'

/**
 * Habilidades da BNCC — campo livre.
 *
 * O professor digita o código e a descrição à mão; não há catálogo embutido
 * nem descrição sugerida. A única regra automática é que o código comece com
 * "EF" (Ensino Fundamental) — o resto da conferência contra a BNCC é
 * responsabilidade de quem preenche.
 */
export function CampoHabilidades({
  habilidades,
  aoMudar,
}: {
  habilidades: Habilidade[]
  aoMudar: (h: Habilidade[]) => void
}) {
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')

  function adicionar() {
    if (!codigoValido(codigo)) {
      setErro('O código precisa começar com "EF" (ex.: EF69CO02).')
      return
    }
    if (!descricao.trim()) {
      setErro('Escreva a descrição da habilidade.')
      return
    }

    const normalizado = normalizarCodigo(codigo)
    aoMudar([
      ...habilidades.filter((h) => h.codigo !== normalizado),
      { codigo: normalizado, descricao: descricao.trim() },
    ])
    setCodigo('')
    setDescricao('')
    setErro('')
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
        <label className="campo" style={{ maxWidth: 220 }}>
          <span>Código</span>
          <input
            type="text"
            value={codigo}
            placeholder="Ex.: EF69CO02"
            onChange={(e) => setCodigo(e.target.value)}
          />
        </label>

        <label className="campo" style={{ flex: 1 }}>
          <span>Descrição da habilidade</span>
          <input
            type="text"
            value={descricao}
            placeholder="Cole ou digite o texto oficial da habilidade"
            onChange={(e) => setDescricao(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionar()
              }
            }}
          />
        </label>
      </div>

      <div className="acoes" style={{ marginBottom: erro ? 10 : 0 }}>
        <button
          type="button"
          className="botao secundario"
          onClick={adicionar}
          disabled={!codigo.trim() || !descricao.trim()}
        >
          Adicionar habilidade
        </button>
      </div>

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
    </div>
  )
}
