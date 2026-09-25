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

/** Um link da seção "Links necessários": o nome da plataforma e o endereço. */
export interface LinkNecessario {
  nome: string
  link: string
}

/** O plano de aula completo — é isso que alimenta o PDF. */
export interface PlanoDeAula {
  // Cabeçalho
  curso: string
  ciclo: string
  semana: string
  /**
   * Segunda-feira da semana do plano, em `AAAA-MM-DD` — o que o sistema usa
   * para saber quem é o responsável pela semana e para limitar os planos às
   * próximas duas semanas. Vazio em plano antigo ou importado de PDF, até o
   * professor escolher a semana na lista. `semana` continua sendo o texto que
   * sai no PDF ("31/08 - 04/09").
   */
  semanaInicio: string
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

  // Página 3: Links necessários → Observação
  /** Sites e plataformas usados na aula. Equipamento vai em `materiais`. */
  links: LinkNecessario[]
  /** Campo livre no fim do documento — não faz parte do modelo original. */
  observacao: string
}
