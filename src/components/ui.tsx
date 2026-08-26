import type { ReactNode } from 'react'

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

/** Textarea que cresce conforme o conteúdo, para itens de lista. */
export function TextoMultilinha({
  valor,
  aoMudar,
  placeholder,
  linhas = 2,
}: {
  valor: string
  aoMudar: (v: string) => void
  placeholder?: string
  linhas?: number
}) {
  return (
    <textarea
      rows={linhas}
      value={valor}
      placeholder={placeholder}
      onChange={(e) => aoMudar(e.target.value)}
    />
  )
}
