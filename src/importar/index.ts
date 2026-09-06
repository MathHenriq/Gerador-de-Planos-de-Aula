import { extrairConteudo } from './linhas'
import { planoDoConteudo, type Importacao } from './plano'

export type { Importacao } from './plano'

/**
 * Lê um plano de aula a partir do PDF.
 *
 * Funciona porque a leitura é **posicional**: o PDF do Núcleo WIT tem as
 * caixas sempre nas mesmas coordenadas (`src/pdf/layout.ts`), então dá para
 * dizer qual campo é cada trecho de texto pelo lugar em que ele está — não é
 * adivinhação por palavra-chave. Vale para os PDFs gerados por este sistema e
 * pelos que seguem o mesmo template institucional.
 *
 * O pdf.js é carregado só aqui, por importação dinâmica: é uma biblioteca
 * grande, e quem nunca importa um plano não precisa baixá-la.
 */
export async function importarPlanoDePdf(arquivo: File): Promise<Importacao> {
  // Build "legacy" de propósito: o build moderno do pdf.js usa recursos de
  // JavaScript que só existem em navegador muito recente (Map.getOrInsertComputed,
  // Math.sumPrecise) e quebra nos computadores das escolas. O legacy é o mesmo
  // leitor, transpilado para rodar em navegador antigo.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const dados = new Uint8Array(await arquivo.arrayBuffer())
  const doc = await pdfjs.getDocument({ data: dados }).promise
  if (doc.numPages < 3) {
    throw new Error(
      `O plano do Núcleo WIT tem 3 páginas e este PDF tem ${doc.numPages}. Confira se é o arquivo certo.`,
    )
  }

  return planoDoConteudo(await extrairConteudo(doc, pdfjs.OPS))
}
