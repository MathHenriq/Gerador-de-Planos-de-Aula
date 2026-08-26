import { MINUTOS_TOTAIS } from './constants'
import type { BlocoAtividade } from './types'

/** Soma dos blocos da Estrutura da Atividade. */
export function somaDosBlocos(estrutura: BlocoAtividade[]): number {
  return estrutura.reduce((total, b) => total + (Number(b.minutos) || 0), 0)
}

/** A estrutura fecha exatamente os 90 minutos da aula? */
export function fechaNoTempoDaAula(estrutura: BlocoAtividade[]): boolean {
  return somaDosBlocos(estrutura) === MINUTOS_TOTAIS
}
