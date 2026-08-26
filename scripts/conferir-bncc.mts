/**
 * Confere o catálogo da BNCC contra um documento oficial em PDF.
 *
 *   npm run conferir-bncc -- caminho/para/BNCC-Computacao.pdf
 *
 * Por que existe: o plano de aula imprime o código E a descrição da habilidade.
 * Se a descrição divergir do documento oficial, o divergente vai impresso no
 * documento institucional. Este script lê o PDF, acha as habilidades e compara
 * palavra por palavra com src/bncc/catalogo.ts, separando o que é diferença de
 * verdade do que é só aspa tipográfica ou hifenização de quebra de linha.
 *
 * Reconhece os dois formatos em que os documentos costumam trazer a habilidade:
 *   "EF69CO02: Elaborar algoritmos…"  e  "Habilidade EF69CO02: Elaborar…"
 */
import { readFileSync } from 'node:fs'
import { CATALOGO_BNCC } from '../src/bncc/catalogo'

const caminho = process.argv[2]
if (!caminho) {
  console.error('Uso: npm run conferir-bncc -- caminho/para/documento.pdf')
  process.exit(1)
}

/** Extrai o texto do PDF sem depender de biblioteca externa de layout. */
async function textoDoPdf(arquivo: string): Promise<string> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await getDocument({ data: new Uint8Array(readFileSync(arquivo)) }).promise
  const partes: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const conteudo = await (await doc.getPage(i)).getTextContent()
    partes.push(conteudo.items.map((it) => ('str' in it ? it.str : '')).join(' '))
  }
  return partes.join('\n')
}

function habilidadesDoTexto(bruto: string): Map<string, string> {
  let t = bruto.replace(/\s+/g, ' ')
  t = t.replace(/(\p{L})- (\p{L})/gu, '$1$2') // hifenização de quebra de linha
  const achadas = new Map<string, string>()
  const re = /(?:Habilidade\s+)?(E[FIM]\d{2}CO\d{2})\s*[:–-]\s*(.+?)(?=(?:Habilidade\s+)?E[FIM]\d{2}CO\d{2}\s*[:–-]|$)/gu
  for (const m of t.matchAll(re)) {
    const codigo = m[1]
    const frase = m[2].split(/(?<=\.)\s(?=[\p{Lu}0-9•])/u)[0]?.trim() ?? ''
    if (frase && !achadas.has(codigo)) achadas.set(codigo, frase)
  }
  return achadas
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Tira o que é ruído de extração, não diferença de texto: o pdf.js separa
 * trechos em itálico ("( hardware )") e alguns documentos põem a habilidade
 * inteira entre aspas.
 */
const normalizar = (s: string) =>
  semAcento(s)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
    .trim()
const semAspas = (s: string) => s.replace(/[“”‘’"']/g, '"')
const casa = (a: string, b: string) => a.startsWith(b) || b.startsWith(a)

const referencia = habilidadesDoTexto(await textoDoPdf(caminho))
console.log(`Documento: ${caminho}`)
console.log(`Habilidades encontradas no documento: ${referencia.size}`)
console.log(`Habilidades no catálogo: ${CATALOGO_BNCC.length}\n`)

let identicas = 0
const soAspas: string[] = []
const divergentes: string[] = []
const ausentes: string[] = []

for (const entrada of CATALOGO_BNCC) {
  const oficial = referencia.get(entrada.codigo)
  if (!oficial) {
    ausentes.push(entrada.codigo)
    continue
  }
  if (casa(normalizar(entrada.descricao), normalizar(oficial))) identicas++
  else if (casa(normalizar(semAspas(entrada.descricao)), normalizar(semAspas(oficial))))
    soAspas.push(entrada.codigo)
  else
    divergentes.push(
      `${entrada.codigo}\n   catálogo:  ${entrada.descricao}\n   documento: ${oficial}`,
    )
}

console.log(`idênticas ...................... ${identicas}`)
console.log(`só diferem nas aspas ........... ${soAspas.length}${soAspas.length ? `  (${soAspas.join(', ')})` : ''}`)
console.log(`DIVERGEM EM PALAVRAS ........... ${divergentes.length}`)
console.log(`não constam no documento ....... ${ausentes.length}${ausentes.length ? `  (${ausentes.join(', ')})` : ''}`)

if (divergentes.length) {
  console.log('\n--- divergências ---')
  for (const d of divergentes) console.log(`\n${d}`)
}

process.exit(divergentes.length ? 1 : 0)
