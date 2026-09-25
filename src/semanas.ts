/**
 * As semanas em que dá para fazer plano de aula.
 *
 * Só a semana atual e as duas seguintes: mais à frente do que isso a equipe
 * ainda não sabe o que vai dar, e plano adiantado demais só gerava confusão.
 * O banco aplica a mesma janela (ver `supabase/migrations/20260925_plano_mestre.sql`)
 * — a tela só evita que o professor tente e leve um "não".
 *
 * Uma semana é identificada pela segunda-feira, em `AAAA-MM-DD`. As contas são
 * feitas no horário local (o do navegador, que é o de Barueri), nunca em UTC:
 * domingo à noite em UTC já seria segunda e empurraria a janela um dia.
 */

/** Quantas semanas depois da atual ainda aceitam plano. */
export const SEMANAS_A_FRENTE = 2

export interface Semana {
  /** Segunda-feira, `AAAA-MM-DD`. */
  inicio: string
  /** "31/08 - 04/09" — segunda a sexta, o formato que sai no PDF. */
  rotulo: string
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

function paraIso(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

function deIso(iso: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!partes) return null
  return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
}

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias)
}

function diaMes(data: Date): string {
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}`
}

/** A segunda-feira da semana de `data` (domingo conta como fim da semana anterior). */
export function segundaDaSemana(data: Date): Date {
  const deslocamento = (data.getDay() + 6) % 7
  return somarDias(data, -deslocamento)
}

/** "2026-08-31" → "31/08 - 04/09". Texto vazio para data inválida. */
export function rotuloDaSemana(inicio: string): string {
  const segunda = deIso(inicio)
  if (!segunda) return ''
  return `${diaMes(segunda)} - ${diaMes(somarDias(segunda, 4))}`
}

/** A semana atual e as duas seguintes, em ordem. */
export function semanasPermitidas(hoje: Date = new Date()): Semana[] {
  const segunda = segundaDaSemana(hoje)
  return Array.from({ length: SEMANAS_A_FRENTE + 1 }, (_, i) => {
    const inicio = paraIso(somarDias(segunda, i * 7))
    return { inicio, rotulo: rotuloDaSemana(inicio) }
  })
}

export function semanaPermitida(inicio: string, hoje: Date = new Date()): boolean {
  return semanasPermitidas(hoje).some((s) => s.inicio === inicio)
}

/**
 * Reconhece, entre as semanas permitidas, a que corresponde a um texto como
 * "31/08 - 04/09" (o que vem de um PDF importado). Olha só o dia/mês de
 * início, que é o que o texto tem de confiável.
 */
export function semanaPeloTexto(texto: string, hoje: Date = new Date()): Semana | null {
  const inicio = /(\d{1,2})\/(\d{1,2})/.exec(texto)
  if (!inicio) return null
  const alvo = `${doisDigitos(Number(inicio[1]))}/${doisDigitos(Number(inicio[2]))}`
  return semanasPermitidas(hoje).find((s) => s.rotulo.startsWith(alvo)) ?? null
}
