import type { PlanoDeAula } from './types'

/**
 * Nome padronizado dos documentos do Núcleo WIT:
 *
 *   Plano de aula Núcleo WIT - Nome Sobrenome - data
 *   Plano de aula Núcleo WIT - Matheus Henrique - 31.08 - 04.09
 *
 * Sobre a data: o padrão escrito usa barra ("31/08 - 04/09"), mas barra é
 * caractere proibido em nome de arquivo — no Windows, no macOS e no Linux. Em
 * vez de deixar o navegador truncar ou trocar por conta própria, trocamos por
 * ponto, que mantém a forma visual do padrão. Dentro do PDF, no cabeçalho, a
 * semana continua saindo exatamente como foi digitada.
 */
export const PREFIXO_DOCUMENTO = 'Plano de aula Núcleo WIT'

/** Partículas que não contam como sobrenome ("Ana de Souza" → "Ana Souza"). */
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'van', 'von'])

/**
 * Primeiro nome + primeiro sobrenome, como pede o padrão.
 *
 * Só encurta: o que o professor digitar de abreviado continua abreviado — não
 * há como adivinhar que "Matheus H." é "Matheus Henrique".
 */
export function nomeCurtoDoProfessor(professor: string): string {
  const partes = professor.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''

  const primeiro = partes[0]
  const sobrenome = partes.slice(1).find((p) => !PARTICULAS.has(p.toLowerCase()))
  return sobrenome ? `${primeiro} ${sobrenome}` : primeiro
}

/** Troca o que o sistema de arquivos não aceita, preservando a leitura. */
function seguroParaArquivo(texto: string): string {
  return texto
    .replace(/[/\\]/g, '.')
    .replace(/[:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Nome padronizado, sem a extensão — serve também de título do PDF. */
export function nomePadronizado(plano: PlanoDeAula): string {
  const partes = [
    PREFIXO_DOCUMENTO,
    seguroParaArquivo(nomeCurtoDoProfessor(plano.professor)),
    seguroParaArquivo(plano.semana),
  ].filter(Boolean)

  // Ponto no fim quebra o nome no Windows; a extensão vem logo depois.
  return partes.join(' - ').replace(/\.+$/, '')
}

export function nomeDoArquivo(plano: PlanoDeAula): string {
  return `${nomePadronizado(plano)}.pdf`
}
