import {
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'

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

/**
 * Lembrete de preenchimento, dentro da seção: o que a coordenação espera
 * daquele campo. Mais visível que o `explica`, porque é o erro que se repete.
 */
export function Dica({ children }: { children: ReactNode }) {
  return (
    <div className="dica-secao">
      <strong>Dica:</strong> {children}
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
  campoRef,
  aoTeclar,
  aoColar,
}: {
  valor: string
  aoMudar: (v: string) => void
  placeholder?: string
  linhas?: number
  /** Rótulo para leitor de tela, quando o campo não tem `<label>` próprio. */
  rotulo?: string
  /** Para quem precisa pôr o cursor no campo (ex.: o item novo criado pelo Enter). */
  campoRef?: Ref<HTMLTextAreaElement>
  aoTeclar?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  aoColar?: (e: ClipboardEvent<HTMLTextAreaElement>) => void
}) {
  const campo = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const el = campo.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [valor])

  return (
    <textarea
      ref={(el) => {
        campo.current = el
        if (typeof campoRef === 'function') campoRef(el)
        else if (campoRef) (campoRef as { current: HTMLTextAreaElement | null }).current = el
      }}
      rows={linhas}
      value={valor}
      placeholder={placeholder}
      aria-label={rotulo}
      onChange={(e) => aoMudar(e.target.value)}
      onKeyDown={aoTeclar}
      onPaste={aoColar}
    />
  )
}
