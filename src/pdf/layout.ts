/**
 * Coordenadas absolutas do plano de aula institucional.
 *
 * Tudo aqui está em **pixels do design original (794 × 1123)** — os mesmos
 * números da especificação, que por sua vez foram lidos do arquivo de produção
 * do Canva e conferidos contra os PDFs reais das semanas 27/07 e 31/08.
 *
 * A conversão para pontos do PDF é feita por `pt()`: 794 px × 0,75 = 595,5 pt,
 * 1123 px × 0,75 = 842,25 pt (A4).
 */

/** 1 px do design = 0,75 pt no PDF. */
export const ESCALA = 0.75

export const PAGINA_PX = { largura: 794, altura: 1123 }
export const PAGINA_PT: [number, number] = [
  PAGINA_PX.largura * ESCALA,
  PAGINA_PX.altura * ESCALA,
]

export const pt = (px: number) => px * ESCALA

/**
 * Espessura da borda preta das caixas, em px do design.
 * Medida a 300 dpi no PDF de referência: 6 px de raster = 1,44 pt = 1,92 px de design.
 */
export const BORDA_PX = 1.92

export interface Caixa {
  top: number
  left: number
  largura: number
  altura: number
}

/** Métricas de um bloco de texto dentro de uma caixa. */
export interface Texto {
  /** Distância do topo da caixa até o topo da primeira linha. */
  padTop: number
  /** Distância da esquerda da caixa até o início do texto. */
  padLeft: number
  /** Distância da esquerda da caixa até o marcador (bolinha), quando há lista. */
  padMarcador?: number
  /** Folga à direita, para o texto não encostar na borda. */
  padRight: number
  fonte: number
  /** Distância vertical entre linhas, em px (vira `lineHeight` relativo). */
  entrelinha: number
  alinhamento?: 'left' | 'justify'
}

/**
 * O logo Micro Ka é desenhado maior do que a área visível e recortado — é assim
 * no arquivo original, e o recorte é o que esconde o traço vertical que existe
 * na borda direita da arte.
 */
export const LOGO_MICRO_KA = {
  /** Área visível na página. */
  recorte: { top: 11.3, left: 13.8, largura: 135.1, altura: 110.1 },
  /** Posição da arte dentro do recorte (coordenadas relativas ao recorte). */
  imagem: { top: -3.4, left: -23.2, largura: 178.1, altura: 128.0 },
}

/** A marca-d'água fica um pouco mais alta na página 1 do que nas 2 e 3. */
export const MARCA_WIT = {
  pagina1: { top: 891.7, left: 538.9, largura: 221.1, altura: 165.1 },
  demais: { top: 901.4, left: 536.2, largura: 221.1, altura: 165.1 },
  opacidade: 0.44,
}

/** Rótulos em negrito que ficam fora das caixas (ex.: "OBJETIVOS DE APRENDIZAGEM"). */
export interface Rotulo {
  top: number
  left: number
  fonte: number
}

export const ROTULOS = {
  escolas: { top: 121.0, left: 21.5, fonte: 16 },
  tema: { top: 178.3, left: 24.7, fonte: 16 },
  objetivos: { top: 218.8, left: 24.7, fonte: 16 },
  habilidades: { top: 413.9, left: 24.7, fonte: 16 },
  materiais: { top: 620.9, left: 24.7, fonte: 16 },
  metodologia: { top: 760.3, left: 24.7, fonte: 16 },
  resumo: { top: 128.9, left: 24.7, fonte: 16 },
  estrutura: { top: 291.4, left: 24.7, fonte: 16 },
  recursos: { top: 140.8, left: 24.7, fonte: 16 },
} satisfies Record<string, Rotulo>

/** Caixas do cabeçalho (linha 1 e 2 da página 1). */
export const CAIXAS_CABECALHO = {
  curso: { top: 20.6, left: 180.8, largura: 139.6, altura: 38.6 },
  semana: { top: 20.6, left: 325.6, largura: 142.4, altura: 38.6 },
  professor: { top: 20.6, left: 473.0, largura: 142.4, altura: 38.6 },
  duracao: { top: 20.2, left: 618.1, largura: 141.6, altura: 37.1 },
  ciclo: { top: 65.7, left: 180.8, largura: 155.0, altura: 38.6 },
  conteudo: { top: 65.9, left: 342.9, largura: 422.0, altura: 38.6 },
} satisfies Record<string, Caixa>

/** Recuo interno esquerdo e corpo de fonte de cada caixa do cabeçalho. */
export const TEXTO_CABECALHO = {
  curso: { padLeft: 8.8, fonte: 14.6 },
  semana: { padLeft: 7.3, fonte: 13.3 },
  professor: { padLeft: 13.6, fonte: 13.0 },
  duracao: { padLeft: 5.9, fonte: 13.3 },
  ciclo: { padLeft: 8.8, fonte: 14.6 },
  conteudo: { padLeft: 4.9, fonte: 13.3 },
} satisfies Record<string, { padLeft: number; fonte: number }>

export const CAIXAS = {
  escolas: { top: 114.5, left: 103.5, largura: 656.3, altura: 49.9 },
  tema: { top: 171.4, left: 154.0, largura: 610.9, altura: 31.4 },
  objetivos: { top: 244.4, left: 24.7, largura: 743.4, altura: 153.3 },
  habilidades: { top: 436.5, left: 31.4, largura: 745.8, altura: 162.8 },
  materiais: { top: 646.2, left: 24.7, largura: 745.8, altura: 97.8 },
  metodologia: { top: 785.6, left: 21.5, largura: 749.0, altura: 277.7 },
  resumo: { top: 162.4, left: 24.7, largura: 740.7, altura: 115.4 },
  estrutura: { top: 319.1, left: 25.6, largura: 739.9, altura: 755.0 },
  recursos: { top: 170.5, left: 25.8, largura: 742.1, altura: 909.6 },
} satisfies Record<string, Caixa>

export const TEXTOS = {
  escolas: { padTop: 8.1, padLeft: 12.1, padRight: 12, fonte: 13.3, entrelinha: 18, alinhamento: 'left' },
  tema: { padTop: 6.9, padLeft: 10.6, padRight: 10, fonte: 13.3, entrelinha: 18, alinhamento: 'left' },
  objetivos: { padTop: 15.9, padLeft: 30.0, padMarcador: 15.0, padRight: 14, fonte: 13.7, entrelinha: 18.5, alinhamento: 'justify' },
  habilidades: { padTop: 17.9, padLeft: 13.3, padRight: 14, fonte: 13.3, entrelinha: 17.7, alinhamento: 'justify' },
  materiais: { padTop: 11.5, padLeft: 34.4, padMarcador: 19.5, padRight: 14, fonte: 14.7, entrelinha: 20, alinhamento: 'left' },
  metodologia: { padTop: 11.6, padLeft: 34.9, padMarcador: 19.9, padRight: 14, fonte: 14.7, entrelinha: 20, alinhamento: 'left' },
  resumo: { padTop: 8.3, padLeft: 12.0, padRight: 12, fonte: 13.3, entrelinha: 18, alinhamento: 'justify' },
  estrutura: { padTop: 11.5, padLeft: 36.0, padMarcador: 21.1, padRight: 14, fonte: 14.7, entrelinha: 20, alinhamento: 'left' },
  recursos: { padTop: 17.8, padLeft: 38.5, padMarcador: 23.6, padRight: 14, fonte: 14.7, entrelinha: 20, alinhamento: 'left' },
} satisfies Record<string, Texto>

/** Recuo do título de cada bloco da Estrutura da Atividade (não leva marcador). */
export const ESTRUTURA_TITULO_PAD_LEFT = 11.1
/** Espaço vertical extra antes do título de cada bloco (a partir do segundo). */
export const ESTRUTURA_ESPACO_ENTRE_BLOCOS = 20
/** Espaço vertical entre duas habilidades da BNCC. */
export const HABILIDADES_ESPACO = 18.6

/** Diâmetro do marcador de lista. */
export const MARCADOR_PX = 4

/**
 * Folga entre a última linha de texto e a borda de baixo da caixa.
 *
 * Pequena de propósito: espelhar o recuo de cima faria a caixa das escolas
 * encolher a fonte com duas linhas, quando o template original as acomoda no
 * corpo cheio.
 */
export const FOLGA_INFERIOR = 4

/** Altura que sobra para o texto dentro de uma caixa. */
export function alturaDisponivel(caixa: Caixa, texto: Texto): number {
  return caixa.altura - texto.padTop - FOLGA_INFERIOR
}
