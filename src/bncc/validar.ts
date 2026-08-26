import type { Habilidade } from '../types'
import { CATALOGO_BNCC, INDICE_BNCC, INDICE_COMPLETO, type EntradaBncc } from './catalogo'
import { competenciasDaHabilidade } from './competencias'

/** "ef69co02", "EF69-CO02", " ef 69 co 02 " → "EF69CO02". */
export function normalizarCodigo(bruto: string): string {
  return bruto.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Devolve a entrada oficial do catálogo, ou `undefined` se o código não existe. */
export function buscarPorCodigo(bruto: string): EntradaBncc | undefined {
  return INDICE_BNCC.get(normalizarCodigo(bruto))
}

export interface ResultadoValidacao {
  /** Habilidades aceitas, sempre com a descrição oficial (nunca a que veio de fora). */
  validas: Habilidade[]
  /** Códigos rejeitados por não existirem no catálogo oficial. */
  descartados: string[]
  /**
   * Códigos que existem na BNCC, mas são de outra etapa (Educação Infantil ou
   * Ensino Médio). Vale distinguir de um código inexistente: quem digitou não
   * errou o código, errou a etapa.
   */
  foraDaEtapa: string[]
}

/**
 * Porta de entrada única para qualquer código BNCC digitado pelo professor.
 *
 * Regra crítica: a descrição usada no plano é SEMPRE a do catálogo oficial.
 * Se o código não estiver no catálogo, ele é descartado — nunca "aproveitado"
 * com uma descrição inventada.
 */
export function validarCodigos(codigos: string[]): ResultadoValidacao {
  const validas: Habilidade[] = []
  const descartados: string[] = []
  const foraDaEtapa: string[] = []
  const jaVistos = new Set<string>()

  for (const bruto of codigos) {
    const codigo = normalizarCodigo(bruto)
    if (!codigo || jaVistos.has(codigo)) continue
    jaVistos.add(codigo)

    const oficial = INDICE_BNCC.get(codigo)
    if (oficial) validas.push({ codigo: oficial.codigo, descricao: oficial.descricao })
    else if (INDICE_COMPLETO.has(codigo)) foraDaEtapa.push(codigo)
    else descartados.push(bruto.trim())
  }

  return { validas, descartados, foraDaEtapa }
}

/**
 * Busca livre por código ou por trecho da descrição, para o seletor da
 * interface. `competencias` restringe às habilidades daquelas competências
 * (ver a ressalva em ./competencias.ts).
 */
export function buscarNoCatalogo(
  consulta: string,
  limite = 40,
  competencias?: number[],
): EntradaBncc[] {
  const base =
    competencias && competencias.length
      ? CATALOGO_BNCC.filter((e) =>
          competenciasDaHabilidade(e.codigo).some((c) => competencias.includes(c)),
        )
      : CATALOGO_BNCC

  const termo = consulta.trim().toLowerCase()
  if (!termo) return base.slice(0, limite)

  const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const alvo = semAcento(termo)
  const palavras = alvo.split(/\s+/).filter(Boolean)

  return base
    .filter((e) => {
      const texto = semAcento(`${e.codigo} ${e.descricao} ${e.etapa}`)
      return palavras.every((p) => texto.includes(p))
    })
    .slice(0, limite)
}
