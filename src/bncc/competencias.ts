/**
 * Competências da Computação para a etapa do Ensino Fundamental
 * (complemento à BNCC — "Computação na Educação Básica").
 *
 * O TEXTO das competências abaixo é oficial e está transcrito ao pé da letra.
 *
 * ⚠️ A ASSOCIAÇÃO entre habilidade e competência NÃO é oficial.
 *
 * As tabelas da BNCC Computação organizam as habilidades por eixo (Pensamento
 * Computacional, Mundo Digital, Cultura Digital) e por ano — não por
 * competência. Não existe, nos documentos publicados, uma coluna dizendo que
 * a habilidade X pertence à competência Y.
 *
 * O mapa em `HABILIDADES_POR_COMPETENCIA` é, portanto, uma LEITURA CURRICULAR
 * proposta a partir do verbo e do objeto de cada habilidade, feita para os anos
 * finais (6º ao 9º), que é a faixa atendida pelo Núcleo WIT. Serve para filtrar
 * a lista na tela; não deve ser apresentada a ninguém como classificação
 * oficial. Se a rede tiver a classificação própria, é só substituir as listas
 * abaixo — nada mais no código precisa mudar.
 */

export interface Competencia {
  numero: number
  /** Apelido curto, para caber nos botões da interface. */
  apelido: string
  /** Texto oficial, transcrito do complemento à BNCC. */
  texto: string
}

export const COMPETENCIAS_EF: Competencia[] = [
  {
    numero: 5,
    apelido: 'Avaliar soluções e argumentar',
    texto:
      'Avaliar as soluções e os processos envolvidos na resolução computacional de problemas de diversas áreas do conhecimento, sendo capaz de construir argumentações coerentes e consistentes, utilizando conhecimentos da Computação para argumentar em diferentes contextos com base em fatos e informações confiáveis com respeito à diversidade de opiniões, saberes, identidades e culturas.',
  },
  {
    numero: 6,
    apelido: 'Desenvolver projetos',
    texto:
      'Desenvolver projetos, baseados em problemas, desafios e oportunidades que façam sentido ao contexto ou interesse do estudante, de maneira individual e/ou cooperativa, fazendo uso da Computação e suas tecnologias, utilizando conceitos, técnicas e ferramentas computacionais que possibilitem automatizar processos em diversas áreas do conhecimento com base em princípios éticos, democráticos, sustentáveis e solidários, valorizando a diversidade de indivíduos e de grupos sociais, de maneira inclusiva.',
  },
]

/**
 * Leitura proposta (ver o aviso no topo do arquivo).
 *
 * Competência 5 — o que o estudante AVALIA, COMPARA, ANALISA CRITICAMENTE ou
 * ARGUMENTA: correção de programas, confiabilidade de informação, adequação de
 * uma tecnologia, implicações de uma escolha.
 *
 * Competência 6 — o que o estudante CONSTRÓI e AUTOMATIZA como projeto, sozinho
 * ou em equipe, incluindo publicar o resultado e atacar um problema real.
 */
export const HABILIDADES_POR_COMPETENCIA: Record<number, string[]> = {
  5: [
    'EF06CO06',
    'EF69CO06',
    'EF07CO02',
    'EF07CO08',
    'EF08CO09',
    'EF08CO11',
    'EF09CO07',
    'EF09CO08',
    'EF09CO10',
  ],
  6: [
    'EF06CO04',
    'EF69CO04',
    'EF07CO01',
    'EF07CO03',
    'EF07CO05',
    'EF07CO11',
    'EF08CO01',
    'EF08CO02',
    'EF08CO04',
    'EF09CO01',
    'EF09CO02',
    'EF09CO03',
    'EF09CO06',
  ],
}

/** Competências (propostas) de uma habilidade. */
export function competenciasDaHabilidade(codigo: string): number[] {
  return Object.entries(HABILIDADES_POR_COMPETENCIA)
    .filter(([, codigos]) => codigos.includes(codigo))
    .map(([numero]) => Number(numero))
    .sort((a, b) => a - b)
}
