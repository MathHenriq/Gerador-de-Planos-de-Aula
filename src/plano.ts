import type { BlocoAtividade } from './types'

/** Soma dos blocos da Estrutura da Atividade. */
export function somaDosBlocos(estrutura: BlocoAtividade[]): number {
  return estrutura.reduce((total, b) => total + (Number(b.minutos) || 0), 0)
}

/** A estrutura fecha exatamente a duração escolhida para a aula? */
export function fechaNoTempoDaAula(estrutura: BlocoAtividade[], minutosTotais: number): boolean {
  return somaDosBlocos(estrutura) === minutosTotais
}
