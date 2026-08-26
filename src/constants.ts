import type { PlanoDeAula } from './types'

/**
 * Núcleos atendidos. O professor marca os que a aula alcança.
 *
 * Esta lista é só o cardápio da interface: no plano, o que vale é a ORDEM EM
 * QUE ELE MARCA, porque ela é a ordem da semana (primeiro marcado = segunda).
 */
export const NUCLEOS = [
  'EMEF Renato Rosa',
  'EMEF Prefeito Nestor de Camargo',
  'EMEF Professor Ézio Berzaghi',
  'EMEIEF Professor Eneias Raimundo da Silva',
  'Complexo Educacional Professor Carlos Osmarinho de Lima',
  'EMEF Professor Alfredo do Carmo',
  'EMEF Professor Egídio Costa',
  'EMEF Francisco Zacarioto',
  'EMEF Rita de Jesus',
  'EMEF Professora Dalva Fogaça',
  'EMEF Prof. João Tibúrcio Silva Filho',
  'EMEIEF Anna Irene Mazaro de Freitas',
  'EMEIEF Benedito Adherbal Farbo',
  'EMEF Armando Cavazza',
  'EMEIEF Vereadora Elisabet Titto',
  'EMEIEF José Emidio de Aguiar',
  'EMEF Professora Maria Medunekas',
  'EMEF Júlio Gomes Camisão',
] as const

/** Cursos oferecidos. */
export const CURSOS = [
  'Oficina de Games',
  'Inteligência Artificial',
  'Comunicação Digital',
  'Metaverso',
  'Ambientes Inteligentes',
] as const

export const CICLOS_SUGERIDOS = ['Sênior', 'Júnior', 'Pleno']

/** A posição do núcleo na seleção diz em que dia o professor vai até ele. */
export const DIAS_DA_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'] as const

/**
 * Rótulo da posição na seleção: os cinco primeiros viram dias da semana; do
 * sexto em diante sobra só o número de ordem, porque a semana acabou.
 */
export function rotuloDoDia(posicao: number): string {
  return DIAS_DA_SEMANA[posicao] ?? `${posicao + 1}º`
}

/**
 * A aula tem 90 minutos. Este é o número do qual tudo depende: a duração
 * impressa no cabeçalho sai daqui, e a Estrutura da Atividade tem que fechar
 * exatamente neste total.
 */
export const MINUTOS_TOTAIS = 90

/** 90 → "1h:30 min", no formato do template. */
export function formatarDuracao(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (!horas) return `${resto} min`
  return `${horas}h:${String(resto).padStart(2, '0')} min`
}

/** Duração impressa no cabeçalho — sempre derivada de MINUTOS_TOTAIS. */
export const DURACAO = formatarDuracao(MINUTOS_TOTAIS)

export const MATERIAIS_PADRAO = ['Computador', 'Mouse e teclado', 'Acesso à internet']

/**
 * Junta os núcleos escolhidos no formato do documento:
 * "A, B e C." — vírgulas entre todos, "e" antes do último, ponto no fim.
 *
 * Preserva a ordem recebida, que é a ordem da semana.
 */
export function textoDasEscolas(escolas: string[]): string {
  const limpas = escolas.map((e) => e.trim()).filter(Boolean)
  if (limpas.length === 0) return ''
  if (limpas.length === 1) return `${limpas[0]}.`
  return `${limpas.slice(0, -1).join(', ')} e ${limpas[limpas.length - 1]}.`
}

export function planoVazio(): PlanoDeAula {
  return {
    curso: CURSOS[1],
    ciclo: 'Sênior',
    semana: '',
    conteudo: '',
    professor: '',
    escolas: [],
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
