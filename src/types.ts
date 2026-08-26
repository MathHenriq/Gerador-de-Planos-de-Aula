/** Uma habilidade da BNCC já validada contra o catálogo oficial. */
export interface Habilidade {
  codigo: string
  descricao: string
}

/** Um bloco da Estrutura da Atividade (ex.: "Conversa inicial — 10 min"). */
export interface BlocoAtividade {
  titulo: string
  minutos: number
  itens: string[]
}

/** O plano de aula completo — é isso que alimenta o PDF. */
export interface PlanoDeAula {
  // Cabeçalho
  curso: string
  ciclo: string
  semana: string
  conteudo: string
  professor: string
  duracao: string

  // Página 1
  temaDaAula: string
  objetivos: string[]
  habilidades: Habilidade[]
  materiais: string[]
  metodologia: string[]

  // Página 2
  resumo: string
  estrutura: BlocoAtividade[]

  // Página 3
  recursos: string[]
}

export type ModoEntrada = 'ia' | 'manual'

export type Etapa = 'escolha' | 'entrada-ia' | 'revisao'
