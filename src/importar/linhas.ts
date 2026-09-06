import { ESCALA, MARCADOR_PX } from '../pdf/layout'

/**
 * Uma linha de texto do PDF, já convertida para os pixels do design
 * (794 × 1123) — as mesmas coordenadas de `src/pdf/layout.ts`, o que deixa
 * comparar cada linha com a caixa em que ela caiu.
 */
export interface Linha {
  /** 1, 2 ou 3. */
  pagina: number
  texto: string
  /** Início do texto, em px do design. */
  x: number
  /** Fim do texto (x + largura medida). */
  fim: number
  /** Linha de base do texto, medida do topo da página. */
  y: number
}

/** Um marcador de lista (a bolinha antes do item), em px do design. */
export interface Marcador {
  pagina: number
  x: number
  /** Topo da bolinha, medido do topo da página. */
  y: number
}

export interface ConteudoDoPdf {
  linhas: Linha[]
  marcadores: Marcador[]
}

/* Tipagem mínima do que usamos do pdf.js, para este módulo não depender do
 * pacote (o mesmo código roda no navegador e no script de teste em Node). */
interface ItemDeTexto {
  str: string
  width: number
  transform: number[]
}
interface PaginaPdf {
  getViewport(opcoes: { scale: number }): { height: number }
  getTextContent(): Promise<{ items: unknown[] }>
  getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[] }>
}
export interface DocumentoPdf {
  numPages: number
  getPage(n: number): Promise<PaginaPdf>
}
/** O objeto `OPS` do pdf.js (nome da operação → código). */
export type CodigosDeOperacao = Record<string, number>

/** Duas linhas de base a menos de 1,5 px são a mesma linha visual. */
const TOLERANCIA_LINHA = 1.5

/** Espaço entre dois pedaços do mesmo texto, em px, para inserir um " ". */
const ESPACO_MINIMO = 1.2

/**
 * Vão a partir do qual dois pedaços na mesma altura são coisas separadas.
 *
 * Sem isso, "Curso: X" e "Semana: Y" — que ficam lado a lado, na mesma linha
 * de base — virariam um texto só, e nenhum dos dois cairia na sua caixa.
 */
const VAO_ENTRE_CAMPOS = 12

function ehItemDeTexto(item: unknown): item is ItemDeTexto {
  const i = item as ItemDeTexto
  return typeof i?.str === 'string' && Array.isArray(i?.transform)
}

/** Multiplica duas matrizes de transformação do PDF ([a, b, c, d, e, f]). */
function compor(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ]
}

const aplicar = (m: number[], x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
]

/**
 * Onde estão as bolinhas das listas.
 *
 * O marcador não é texto — é um retângulo arredondado preenchido —, então ele
 * não aparece na extração de texto. É ele, porém, que diz onde cada item
 * começa: sem isso não dá para saber se uma linha é item novo ou a
 * continuação da anterior (todas começam no mesmo x).
 *
 * Percorremos a lista de operações de desenho mantendo a matriz corrente
 * (save/restore/transform) e ficamos com as formas do tamanho do marcador.
 */
async function marcadoresDaPagina(
  page: PaginaPdf,
  OPS: CodigosDeOperacao,
  pagina: number,
  alturaPt: number,
): Promise<Marcador[]> {
  const ops = await page.getOperatorList()
  const ladoEsperado = MARCADOR_PX * ESCALA
  const tolerancia = 1.2

  let ctm = [1, 0, 0, 1, 0, 0]
  const pilha: number[][] = []
  const encontrados: Marcador[] = []

  for (let i = 0; i < ops.fnArray.length; i += 1) {
    const codigo = ops.fnArray[i]
    if (codigo === OPS.save) {
      pilha.push([...ctm])
    } else if (codigo === OPS.restore) {
      ctm = pilha.pop() ?? ctm
    } else if (codigo === OPS.transform) {
      ctm = compor(ctm, Array.from(ops.argsArray[i] as ArrayLike<number>))
    } else if (codigo === OPS.constructPath) {
      const args = ops.argsArray[i] as ArrayLike<unknown>
      const limites = Array.from((args?.[2] ?? []) as ArrayLike<number>)
      if (limites.length !== 4) continue

      const [x1, y1] = aplicar(ctm, limites[0], limites[1])
      const [x2, y2] = aplicar(ctm, limites[2], limites[3])
      const largura = Math.abs(x2 - x1)
      const altura = Math.abs(y2 - y1)
      if (
        Math.abs(largura - ladoEsperado) > tolerancia ||
        Math.abs(altura - ladoEsperado) > tolerancia
      ) {
        continue
      }

      encontrados.push({
        pagina,
        x: Math.min(x1, x2) / ESCALA,
        y: (alturaPt - Math.max(y1, y2)) / ESCALA,
      })
    }
  }

  // Cada bolinha é desenhada mais de uma vez (contorno e preenchimento);
  // posições repetidas viram uma só.
  const unicos: Marcador[] = []
  for (const m of encontrados) {
    if (!unicos.some((u) => Math.abs(u.x - m.x) < 1 && Math.abs(u.y - m.y) < 1)) unicos.push(m)
  }
  return unicos
}

/**
 * Junta os pedaços de texto do pdf.js em linhas e localiza os marcadores.
 *
 * O pdf.js devolve o texto em fragmentos (uma mudança de fonte já quebra um
 * em dois — é o que acontece no código da habilidade, em negrito, colado na
 * descrição). Agrupamos por linha de base e emendamos na ordem horizontal,
 * inserindo espaço só quando havia mesmo um vão entre os fragmentos.
 */
export async function extrairConteudo(
  doc: DocumentoPdf,
  OPS: CodigosDeOperacao,
): Promise<ConteudoDoPdf> {
  const linhas: Linha[] = []
  const marcadores: Marcador[] = []

  for (let pagina = 1; pagina <= doc.numPages; pagina += 1) {
    const page = await doc.getPage(pagina)
    const alturaPt = page.getViewport({ scale: 1 }).height
    const conteudo = await page.getTextContent()

    const fragmentos = conteudo.items.filter(ehItemDeTexto).flatMap((item) => {
      if (!item.str.trim()) return []
      const [, , , , xPt, yPt] = item.transform
      return [
        {
          texto: item.str,
          x: xPt / ESCALA,
          fim: (xPt + (item.width ?? 0)) / ESCALA,
          // O PDF conta o y de baixo para cima; o design conta de cima.
          y: (alturaPt - yPt) / ESCALA,
        },
      ]
    })

    fragmentos.sort((a, b) => (Math.abs(a.y - b.y) < TOLERANCIA_LINHA ? a.x - b.x : a.y - b.y))

    for (const f of fragmentos) {
      const ultima = linhas[linhas.length - 1]
      const vao = ultima ? f.x - ultima.fim : 0
      const mesmaLinha =
        ultima &&
        ultima.pagina === pagina &&
        Math.abs(ultima.y - f.y) < TOLERANCIA_LINHA &&
        f.x >= ultima.x &&
        vao < VAO_ENTRE_CAMPOS
      if (mesmaLinha) {
        ultima.texto += (vao > ESPACO_MINIMO ? ' ' : '') + f.texto
        ultima.fim = Math.max(ultima.fim, f.fim)
      } else {
        linhas.push({ pagina, texto: f.texto, x: f.x, fim: f.fim, y: f.y })
      }
    }

    marcadores.push(...(await marcadoresDaPagina(page, OPS, pagina, alturaPt)))
  }

  return {
    linhas: linhas.map((l) => ({ ...l, texto: l.texto.replace(/\s+/g, ' ').trim() })),
    marcadores,
  }
}
