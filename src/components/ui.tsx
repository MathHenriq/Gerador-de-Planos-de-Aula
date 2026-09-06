import { useLayoutEffect, useRef, type ReactNode } from 'react'

export function Campo({
  rotulo,
  dica,
  children,
}: {
  rotulo: string
  dica?: string
  children: ReactNode
}) {
  return (
    <label className="campo">
      <span>
        {rotulo}
        {dica ? <span className="dica"> — {dica}</span> : null}
      </span>
      {children}
    </label>
  )
}

export function Aviso({
  tipo = 'info',
  children,
}: {
  tipo?: 'info' | 'atencao' | 'erro'
  children: ReactNode
}) {
  return (
    <div className={`aviso ${tipo}`} role={tipo === 'erro' ? 'alert' : undefined}>
      {children}
    </div>
  )
}

export function Secao({
  titulo,
  explica,
  etiqueta,
  children,
}: {
  titulo: string
  explica?: string
  etiqueta?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="secao">
      <h3>
        {titulo}
        {etiqueta}
      </h3>
      {explica ? <p className="explica">{explica}</p> : null}
      {children}
    </section>
  )
}

/**
 * Setas de subir/descer de um item de lista.
 *
 * Mesmo par de botões usado na seleção de escolas: o professor que errou a
 * ordem (ou acrescentou um item no fim) reordena sem ter que reescrever tudo.
 * Fica ao lado do × de remover, na mesma linha.
 */
export function BotoesDeOrdem({
  indice,
  total,
  descricao,
  aoMover,
}: {
  indice: number
  total: number
  /** O que está sendo movido, para o leitor de tela: "bloco 2", "objetivo 3". */
  descricao: string
  aoMover: (de: number, para: number) => void
}) {
  return (
    <>
      <button
        type="button"
        className="botao icone"
        onClick={() => aoMover(indice, indice - 1)}
        disabled={indice === 0}
        aria-label={`Mover ${descricao} para cima`}
        title="Mover para cima"
      >
        ↑
      </button>
      <button
        type="button"
        className="botao icone"
        onClick={() => aoMover(indice, indice + 1)}
        disabled={indice === total - 1}
        aria-label={`Mover ${descricao} para baixo`}
        title="Mover para baixo"
      >
        ↓
      </button>
    </>
  )
}

/**
 * Textarea que cresce conforme o conteúdo, para itens de lista.
 *
 * Cresce de verdade: a altura acompanha o texto a cada mudança. Com altura
 * fixa, um item longo — o caso normal depois de importar um plano de PDF —
 * ficava com o fim cortado dentro da caixa, e o professor não via o que
 * estava editando.
 */
export function TextoMultilinha({
  valor,
  aoMudar,
  placeholder,
  linhas = 2,
  rotulo,
}: {
  valor: string
  aoMudar: (v: string) => void
  placeholder?: string
  linhas?: number
  /** Rótulo para leitor de tela, quando o campo não tem `<label>` próprio. */
  rotulo?: string
}) {
  const campo = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [valor])

  return (
    <textarea
      ref={campo}
      rows={linhas}
      value={valor}
      placeholder={placeholder}
      aria-label={rotulo}
      onChange={(e) => aoMudar(e.target.value)}
    />
  )
}
