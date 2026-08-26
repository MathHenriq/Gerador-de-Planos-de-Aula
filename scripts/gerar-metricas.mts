/**
 * Gera `src/pdf/metricas.ts` a partir dos arquivos da Poppins.
 *
 * O gerador precisa saber a largura de cada linha ANTES de o @react-pdf compor
 * a página (é assim que ele decide encolher a fonte para caber na caixa e é
 * assim que a interface avisa que o texto estourou). Uma média de largura por
 * caractere erra feio em textos curtos, então extraímos a largura real de cada
 * glifo da fonte e guardamos numa tabela.
 *
 *   npm run metricas
 */
import { openSync } from 'fontkit'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pasta = resolve(raiz, 'src/assets/fonts')

/** ASCII imprimível + Latin-1 + a pontuação tipográfica que o plano usa. */
const CARACTERES = [
  ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)),
  ...Array.from({ length: 0xff - 0xa0 + 1 }, (_, i) => String.fromCharCode(0xa0 + i)),
  '–',
  '—',
  '‘',
  '’',
  '“',
  '”',
  '…',
  '•',
  '·',
]

function larguras(arquivo: string): Record<string, number> {
  const fonte = openSync(resolve(pasta, arquivo)) as unknown as {
    unitsPerEm: number
    layout: (t: string) => { advanceWidth: number }
  }
  const tabela: Record<string, number> = {}
  for (const c of CARACTERES) {
    const avanco = fonte.layout(c).advanceWidth / fonte.unitsPerEm
    tabela[c] = Number(avanco.toFixed(4))
  }
  return tabela
}

const regular = larguras('Poppins-Regular.ttf')
const bold = larguras('Poppins-Bold.ttf')

const media = (t: Record<string, number>) => {
  const letras = Object.entries(t).filter(([c]) => /[a-zA-ZÀ-ÿ]/.test(c))
  return Number((letras.reduce((s, [, v]) => s + v, 0) / letras.length).toFixed(4))
}

const conteudo = `/**
 * Larguras de avanço da Poppins, em múltiplos do corpo da fonte.
 *
 * ARQUIVO GERADO — não edite à mão. Rode \`npm run metricas\` depois de trocar
 * os arquivos da fonte em src/assets/fonts.
 */

export const LARGURA_MEDIA = { regular: ${media(regular)}, bold: ${media(bold)} }

export const LARGURAS_REGULAR: Readonly<Record<string, number>> = ${JSON.stringify(regular, null, 0)}

export const LARGURAS_BOLD: Readonly<Record<string, number>> = ${JSON.stringify(bold, null, 0)}
`

const destino = resolve(raiz, 'src/pdf/metricas.ts')
writeFileSync(destino, conteudo)
console.log('métricas escritas em', destino)
