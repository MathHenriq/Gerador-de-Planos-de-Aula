/**
 * Renderiza um plano de amostra em PDF fora do navegador.
 *
 * Serve para conferir a fidelidade do layout contra os PDFs de referência
 * (as semanas 27/07 e 31/08 exportadas do Canva) sem precisar abrir a interface:
 *
 *   npm run amostra -- amostras/plano.pdf
 */
import { createElement, type ReactElement } from 'react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { renderToFile, type DocumentProps } from '@react-pdf/renderer'

import { registrarFontes } from '../src/pdf/fontes'
import { PlanoDocument } from '../src/pdf/PlanoDocument'
import { planoDeAmostra } from '../src/planoDeAmostra'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = resolve(aqui, '..')
const fontes = resolve(raiz, 'src/assets/fonts')

registrarFontes({
  regular: resolve(fontes, 'Poppins-Regular.ttf'),
  medium: resolve(fontes, 'Poppins-Medium.ttf'),
  semibold: resolve(fontes, 'Poppins-SemiBold.ttf'),
  bold: resolve(fontes, 'Poppins-Bold.ttf'),
})

const assets = {
  logoMicroKa: resolve(raiz, 'src/assets/logo-micro-ka.png'),
  marcaWit: resolve(raiz, 'src/assets/marca-nucleo-wit.png'),
}

const saida = resolve(raiz, process.argv[2] ?? 'amostras/plano.pdf')
mkdirSync(dirname(saida), { recursive: true })

const documento = createElement(PlanoDocument, {
  plano: planoDeAmostra,
  assets,
}) as ReactElement<DocumentProps>

await renderToFile(documento, saida)
console.log('PDF gerado em', saida)
