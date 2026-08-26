/** Uma habilidade da BNCC, digitada pelo professor (código + descrição). */
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
  /** Núcleos escolhidos pelo professor, entre os de `NUCLEOS`. */
  escolas: string[]

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
