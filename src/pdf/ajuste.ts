/**
 * As caixas do template têm altura fixa. Quando o professor escreve mais do que
 * cabe, em vez de deixar o texto vazar por cima da borda (o problema clássico do
 * Canva), reduzimos o corpo da fonte até caber — igual ao "encolher para caber".
 *
 * Para decidir isso é preciso saber quantas linhas o texto vai ocupar antes de o
 * @react-pdf compor a página. A conta usa as larguras reais dos glifos da
 * Poppins (ver src/pdf/metricas.ts, gerado por `npm run metricas`), então bate
 * com a quebra de linha do arquivo final.
 */
import { LARGURAS_BOLD, LARGURAS_REGULAR, LARGURA_MEDIA } from './metricas'

export interface EstiloDoTexto {
  /** O PDF aplica caixa alta via `textTransform`; medimos o texto já transformado. */
  maiuscula?: boolean
  negrito?: boolean
}

/** Largura de um texto, em px, para um dado corpo de fonte. */
export function larguraDoTexto(texto: string, fontePx: number, estilo: EstiloDoTexto = {}): number {
  const tabela = estilo.negrito ? LARGURAS_BOLD : LARGURAS_REGULAR
  const media = estilo.negrito ? LARGURA_MEDIA.bold : LARGURA_MEDIA.regular
  const alvo = estilo.maiuscula ? texto.toUpperCase() : texto

  let soma = 0
  for (const c of alvo) soma += tabela[c] ?? media
  return soma * fontePx
}

export interface Paragrafo {
  texto: string
  /** Recuo horizontal total (marcador + espaçamento), em px do design. */
  recuo: number
  /** Espaço extra acima deste parágrafo, em px do design. */
  espacoAcima?: number
  negrito?: boolean
}

export function estimarLinhas(
  texto: string,
  larguraPx: number,
  fontePx: number,
  estilo: EstiloDoTexto = {},
): number {
  if (larguraPx <= 0) return 1
  const larguraEspaco = larguraDoTexto(' ', fontePx, estilo)
  let linhas = 0

  for (const bruto of texto.split('\n')) {
    const palavras = bruto.trim().split(/\s+/).filter(Boolean)
    if (palavras.length === 0) {
      linhas += 1
      continue
    }
    let atual = 0
    linhas += 1
    for (const palavra of palavras) {
      const largura = larguraDoTexto(palavra, fontePx, estilo)
      const comEspaco = atual === 0 ? largura : atual + larguraEspaco + largura
      if (comEspaco > larguraPx && atual > 0) {
        linhas += 1
        atual = largura
      } else {
        atual = comEspaco
      }
    }
  }

  return linhas
}

export interface MedidaCaixa {
  larguraUtil: number
  fonte: number
  entrelinha: number
  maiuscula?: boolean
}

/** Altura total (px) que os parágrafos ocupam com um dado fator de escala. */
export function alturaEstimada(paragrafos: Paragrafo[], m: MedidaCaixa, escala = 1): number {
  const fonte = m.fonte * escala
  const entrelinha = m.entrelinha * escala
  let altura = 0

  paragrafos.forEach((p, i) => {
    if (i > 0 && p.espacoAcima) altura += p.espacoAcima * escala
    altura +=
      estimarLinhas(p.texto, m.larguraUtil - p.recuo, fonte, {
        maiuscula: m.maiuscula,
        negrito: p.negrito,
      }) * entrelinha
  })

  return altura
}

/**
 * Maior escala (≤ 1) em que o conteúdo ainda cabe na altura disponível.
 * Nunca desce de 0,62 — abaixo disso o plano fica ilegível e o certo é o
 * professor encurtar o texto (a interface avisa quando chega nesse ponto).
 */
export const ESCALA_MINIMA = 0.62

export function escalaParaCaber(
  paragrafos: Paragrafo[],
  m: MedidaCaixa,
  alturaDisponivel: number,
): number {
  for (let escala = 1; escala > ESCALA_MINIMA; escala -= 0.02) {
    if (alturaEstimada(paragrafos, m, escala) <= alturaDisponivel) {
      return Number(escala.toFixed(2))
    }
  }
  return ESCALA_MINIMA
}
