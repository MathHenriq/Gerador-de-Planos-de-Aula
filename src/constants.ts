import type { PlanoDeAula } from './types'

/**
 * Texto institucional fixo das escolas parceiras.
 * Não é editável no formulário: aparece igual em todo plano.
 */
export const ESCOLAS_PARCEIRAS =
  'EMEIF Vereadora Elizabeth Titto, EMEF Armando Cavazza, EMEF Júlio Gomes Camisão, ' +
  'EMEIEF José Emidio de Aguiar e EMEIEF Benedito Adherbal Farbo.'

export const DURACAO_PADRAO = '1h:30 min'

/** A Estrutura da Atividade tem que fechar exatamente neste total. */
export const MINUTOS_TOTAIS = 90

export const CURSO_PADRAO = 'IA'

export const CICLOS_SUGERIDOS = ['Sênior', 'Júnior', 'Pleno']

export const MATERIAIS_PADRAO = ['Computador', 'Mouse e teclado', 'Acesso à internet']

export function planoVazio(): PlanoDeAula {
  return {
    curso: CURSO_PADRAO,
    ciclo: 'Sênior',
    semana: '',
    conteudo: '',
    professor: '',
    duracao: DURACAO_PADRAO,
    temaDaAula: '',
    objetivos: [''],
    habilidades: [],
    materiais: [...MATERIAIS_PADRAO],
    metodologia: [''],
    resumo: '',
    estrutura: [
      { titulo: 'Conversa inicial e organização da aula', minutos: 10, itens: [''] },
      { titulo: 'Introdução teórica', minutos: 20, itens: [''] },
      { titulo: 'Atividade prática', minutos: 50, itens: [''] },
      { titulo: 'Finalização da aula', minutos: 10, itens: [''] },
    ],
    recursos: [''],
  }
}
