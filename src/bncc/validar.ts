/** "ef69co02", "EF69-CO02", " ef 69 co 02 " → "EF69CO02". */
export function normalizarCodigo(bruto: string): string {
  return bruto.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Regra do Núcleo WIT: o professor escreve a habilidade à mão — código e
 * descrição —, e a única exigência é que o código comece com "EF" (Ensino
 * Fundamental). Não há catálogo oficial embutido: conferir o texto contra a
 * BNCC é responsabilidade de quem preenche.
 */
export function codigoValido(bruto: string): boolean {
  return normalizarCodigo(bruto).startsWith('EF')
}
