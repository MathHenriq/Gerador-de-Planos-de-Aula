import type { BlocoAtividade } from './types'

/** Soma dos blocos da Estrutura da Atividade. */
export function somaDosBlocos(estrutura: BlocoAtividade[]): number {
  return estrutura.reduce((total, b) => total + (Number(b.minutos) || 0), 0)
}

/** A estrutura fecha exatamente a duração escolhida para a aula? */
export function fechaNoTempoDaAula(estrutura: BlocoAtividade[], minutosTotais: number): boolean {
  return somaDosBlocos(estrutura) === minutosTotais
}

/**
 * Troca um item de posição numa lista, sem alterar a original.
 *
 * Índice fora da lista devolve a lista como está — assim o botão de subir do
 * primeiro item (ou o de descer do último) não precisa de guarda em cada tela.
 */
export function moverItem<T>(lista: T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length || de < 0 || de >= lista.length || de === para) return lista
  const nova = [...lista]
  const [item] = nova.splice(de, 1)
  nova.splice(para, 0, item)
  return nova
}
