import { useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

import { moverItem } from '../plano'
import { BotoesDeOrdem, TextoMultilinha } from './ui'

/** "• ", "- ", "* " ou "1. " no começo de uma linha colada — o PDF já desenha a bolinha. */
const MARCADOR_DIGITADO = /^\s*(?:[•·▪◦*-]|\d+[.)])\s*/

/** Lista de textos com adicionar/reordenar/remover — objetivos, materiais, metodologia. */
export function ListaEditavel({
  itens,
  aoMudar,
  placeholder,
  rotuloAdicionar = 'Adicionar item',
  linhas = 2,
  descricaoDoItem = 'item',
  comMarcador = false,
}: {
  itens: string[]
  aoMudar: (itens: string[]) => void
  placeholder?: string
  rotuloAdicionar?: string
  linhas?: number
  /** Como o item é chamado nos rótulos de acessibilidade ("objetivo", "passo"). */
  descricaoDoItem?: string
  /**
   * Mostra a bolinha "•" antes de cada item, como sai no PDF, e faz o Enter
   * funcionar como num editor de texto: abre o item seguinte já com o cursor
   * nele. Backspace num item vazio o apaga e volta para o anterior; colar
   * várias linhas vira um item por linha. Shift+Enter continua quebrando a
   * linha dentro do mesmo item.
   */
  comMarcador?: boolean
}) {
  const campos = useRef<(HTMLTextAreaElement | null)[]>([])
  // Para onde o cursor vai depois do Enter/Backspace/colar. O item novo só
  // existe no DOM depois do render, então o foco é aplicado logo após ele — e
  // uma vez só: se reaplicasse a cada render, o cursor voltaria para o começo
  // enquanto o professor já está digitando.
  const focoPendente = useRef<{ indice: number; noFim: boolean } | null>(null)
  const setFocarEm = (alvo: { indice: number; noFim: boolean }) => {
    focoPendente.current = alvo
  }

  useLayoutEffect(() => {
    const alvo = focoPendente.current
    if (!alvo) return
    const campo = campos.current[alvo.indice]
    if (!campo) return
    focoPendente.current = null
    campo.focus()
    const posicao = alvo.noFim ? campo.value.length : 0
    campo.setSelectionRange(posicao, posicao)
  })

  const trocar = (i: number, valor: string) =>
    aoMudar(itens.map((item, j) => (i === j ? valor : item)))

  const remover = (i: number) => {
    const restantes = itens.filter((_, j) => j !== i)
    aoMudar(restantes.length ? restantes : [''])
  }

  function teclar(i: number, e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return
    const campo = e.currentTarget

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // O que estiver depois do cursor desce para o item novo, como num editor.
      const antes = campo.value.slice(0, campo.selectionStart).trimEnd()
      const depois = campo.value.slice(campo.selectionEnd).trimStart()
      aoMudar([...itens.slice(0, i), antes, depois, ...itens.slice(i + 1)])
      setFocarEm({ indice: i + 1, noFim: false })
      return
    }

    if (e.key === 'Backspace' && campo.value === '' && itens.length > 1) {
      e.preventDefault()
      remover(i)
      setFocarEm({ indice: Math.max(0, i - 1), noFim: true })
    }
  }

  function colar(i: number, e: ClipboardEvent<HTMLTextAreaElement>) {
    const linhasColadas = e.clipboardData.getData('text').split(/\r?\n/)
    if (linhasColadas.length < 2) return

    e.preventDefault()
    const campo = e.currentTarget
    // O que já estava antes do cursor fica com a primeira linha colada, e o
    // que estava depois, com a última — como num editor de texto.
    const partes = linhasColadas.map((l) => l.replace(MARCADOR_DIGITADO, '').trim())
    partes[0] = `${campo.value.slice(0, campo.selectionStart).trimEnd()} ${partes[0]}`.trim()
    const ultima = partes.length - 1
    partes[ultima] = `${partes[ultima]} ${campo.value.slice(campo.selectionEnd).trimStart()}`.trim()

    const novos = partes.filter(Boolean)
    const substitutos = novos.length ? novos : ['']
    aoMudar([...itens.slice(0, i), ...substitutos, ...itens.slice(i + 1)])
    setFocarEm({ indice: i + substitutos.length - 1, noFim: true })
  }

  return (
    <div>
      {itens.map((item, i) => (
        <div className="item-lista" key={i}>
          {comMarcador ? (
            <span className="item-lista-marcador" aria-hidden="true">
              •
            </span>
          ) : null}
          <TextoMultilinha
            valor={item}
            aoMudar={(v) => trocar(i, v)}
            placeholder={placeholder}
            linhas={linhas}
            rotulo={`${descricaoDoItem} ${i + 1}`}
            campoRef={(el) => {
              campos.current[i] = el
            }}
            aoTeclar={comMarcador ? (e) => teclar(i, e) : undefined}
            aoColar={comMarcador ? (e) => colar(i, e) : undefined}
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
      <button
        type="button"
        className="botao discreto"
        onClick={() => {
          aoMudar([...itens, ''])
          if (comMarcador) setFocarEm({ indice: itens.length, noFim: false })
        }}
      >
        + {rotuloAdicionar}
      </button>
      {comMarcador ? (
        <p className="dica-teclado">
          Enter abre o próximo item · Shift+Enter quebra a linha no mesmo item
        </p>
      ) : null}
    </div>
  )
}
