import { useState } from 'react'

import { codigoValido, normalizarCodigo } from '../bncc/validar'
import { moverItem } from '../plano'
import type { Habilidade } from '../types'
import { Aviso, BotoesDeOrdem, TextoMultilinha } from './ui'

/**
 * Habilidades da BNCC — campo livre.
 *
 * O professor digita o código e a descrição à mão; não há catálogo embutido
 * nem descrição sugerida. A única regra automática é que o código comece com
 * "EF" (Ensino Fundamental) — o resto da conferência contra a BNCC é
 * responsabilidade de quem preenche.
 *
 * Depois de adicionada, a habilidade continua editável e reordenável, como
 * qualquer outra lista do formulário: antes ela virava um texto fixo que só
 * dava para apagar e digitar de novo.
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

  const trocar = (i: number, mudanca: Partial<Habilidade>) =>
    aoMudar(habilidades.map((h, j) => (i === j ? { ...h, ...mudanca } : h)))

  // Aviso, não bloqueio: quem está no meio de uma edição pode estar com o
  // código pela metade, e travar a digitação seria pior que sinalizar.
  const invalidas = habilidades
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.codigo.trim() && !codigoValido(h.codigo))

  return (
    <div>
      {habilidades.map((h, i) => (
        <div className="bncc-escolhida" key={i}>
          <input
            type="text"
            className="codigo-editavel"
            value={h.codigo}
            placeholder="EF69CO02"
            aria-label={`Código da habilidade ${i + 1}`}
            onChange={(e) => trocar(i, { codigo: e.target.value.toUpperCase() })}
            onBlur={(e) => trocar(i, { codigo: normalizarCodigo(e.target.value) })}
          />
          <div className="descricao-editavel">
            <TextoMultilinha
              valor={h.descricao}
              aoMudar={(descricao) => trocar(i, { descricao })}
              placeholder="Texto da habilidade"
              rotulo={`Descrição da habilidade ${i + 1}`}
            />
          </div>
          <div className="item-lista-acoes">
            <BotoesDeOrdem
              indice={i}
              total={habilidades.length}
              descricao={`habilidade ${i + 1}`}
              aoMover={(de, para) => aoMudar(moverItem(habilidades, de, para))}
            />
            <button
              type="button"
              className="botao icone"
              onClick={() => aoMudar(habilidades.filter((_, j) => j !== i))}
              aria-label={`Remover habilidade ${i + 1}`}
              title="Remover"
            >
              ×
            </button>
          </div>
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

      <div className="acoes" style={{ marginBottom: erro || invalidas.length ? 10 : 0 }}>
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

      {invalidas.length ? (
        <Aviso tipo="atencao">
          {invalidas.length === 1
            ? `O código "${invalidas[0].h.codigo}" não começa com "EF".`
            : `${invalidas.length} códigos não começam com "EF".`}{' '}
          O plano é gerado do mesmo jeito, mas confira antes de baixar.
        </Aviso>
      ) : null}
    </div>
  )
}
