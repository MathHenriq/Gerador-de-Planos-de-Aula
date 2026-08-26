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
  /** Duração da aula, em minutos — uma das opções de `DURACOES_DISPONIVEIS`. */
  minutos: number
  /** Núcleos escolhidos pelo professor, entre os de `NUCLEOS`. */
  escolas: string[]

  // Página 1: Escolas (acima) → Tema → Resumo → Materiais → Objetivos → Habilidades
  temaDaAula: string
  resumo: string
  materiais: string[]
  objetivos: string[]
  habilidades: Habilidade[]

  // Página 2: Metodologia → Estrutura da Atividade
  metodologia: string[]
  estrutura: BlocoAtividade[]

  // Página 3: Recursos → Observação
  recursos: string[]
  /** Campo livre no fim do documento — não faz parte do modelo original. */
  observacao: string
}
