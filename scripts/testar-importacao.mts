/**
 * Conferência do leitor de PDF: gera o PDF do plano de amostra e lê de volta.
 *
 *   npm run importacao
 *
 * O que sai do leitor tem que bater com o plano original campo a campo — com
 * uma exceção conhecida e aceita: o template imprime quase tudo em caixa alta,
 * então a comparação é feita ignorando maiúsculas/minúsculas. Se algum campo
 * divergir de verdade, o script falha (exit 1).
 */
import { mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement, type ReactElement } from 'react'
import { renderToFile, type DocumentProps } from '@react-pdf/renderer'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

import { extrairConteudo } from '../src/importar/linhas'
import { planoDoConteudo } from '../src/importar/plano'
import { registrarFontes } from '../src/pdf/fontes'
import { PlanoDocument } from '../src/pdf/PlanoDocument'
import { planoDeAmostra } from '../src/planoDeAmostra'
import type { PlanoDeAula } from '../src/types'

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

const destino = resolve(raiz, 'amostras/importacao.pdf')
mkdirSync(dirname(destino), { recursive: true })

const documento = createElement(PlanoDocument, {
  plano: planoDeAmostra,
  assets,
}) as ReactElement<DocumentProps>
await renderToFile(documento, destino)

const dados = new Uint8Array(await readFile(destino))
const doc = await pdfjs.getDocument({ data: dados }).promise
const { plano: lido, avisos } = planoDoConteudo(await extrairConteudo(doc, pdfjs.OPS))

/* ── comparação ─────────────────────────────────────────────────────────── */

const igual = (a: string, b: string) =>
  a.replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR') ===
  b.replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR')

const falhas: string[] = []

function conferirTexto(campo: string, esperado: string, obtido: string) {
  if (!igual(esperado, obtido)) {
    falhas.push(`${campo}\n    esperado: ${JSON.stringify(esperado)}\n    lido:     ${JSON.stringify(obtido)}`)
  }
}

function conferirLista(campo: string, esperado: string[], obtido: string[]) {
  if (esperado.length !== obtido.length) {
    falhas.push(`${campo}: esperava ${esperado.length} item(ns), li ${obtido.length}\n    ${obtido.map((o) => `- ${o}`).join('\n    ')}`)
    return
  }
  esperado.forEach((item, i) => conferirTexto(`${campo}[${i}]`, item, obtido[i]))
}

const p: PlanoDeAula = planoDeAmostra
conferirTexto('curso', p.curso, lido.curso)
conferirTexto('ciclo', p.ciclo, lido.ciclo)
conferirTexto('semana', p.semana, lido.semana)
conferirTexto('professor', p.professor, lido.professor)
conferirTexto('conteudo', p.conteudo, lido.conteudo)
conferirTexto('temaDaAula', p.temaDaAula, lido.temaDaAula)
conferirTexto('resumo', p.resumo, lido.resumo)
conferirTexto('observacao', p.observacao, lido.observacao)
if (p.minutos !== lido.minutos) falhas.push(`minutos: esperava ${p.minutos}, li ${lido.minutos}`)

conferirLista('escolas', p.escolas, lido.escolas)
conferirLista('materiais', p.materiais, lido.materiais)
conferirLista('objetivos', p.objetivos, lido.objetivos)
conferirLista('metodologia', p.metodologia, lido.metodologia)
conferirLista('recursos', p.recursos, lido.recursos)

conferirLista(
  'habilidades (código)',
  p.habilidades.map((h) => h.codigo),
  lido.habilidades.map((h) => h.codigo),
)
conferirLista(
  'habilidades (descrição)',
  p.habilidades.map((h) => h.descricao),
  lido.habilidades.map((h) => h.descricao),
)

conferirLista(
  'estrutura (títulos)',
  p.estrutura.map((b) => b.titulo),
  lido.estrutura.map((b) => b.titulo),
)
conferirLista(
  'estrutura (minutos)',
  p.estrutura.map((b) => String(b.minutos)),
  lido.estrutura.map((b) => String(b.minutos)),
)
p.estrutura.forEach((bloco, i) => {
  conferirLista(`estrutura[${i}].itens`, bloco.itens, lido.estrutura[i]?.itens ?? [])
})

/* ── resultado ──────────────────────────────────────────────────────────── */

console.log(`PDF de teste: ${destino}`)
console.log(`\nAvisos que o leitor devolveu (${avisos.length}):`)
for (const aviso of avisos) console.log(`  · ${aviso}`)

if (falhas.length) {
  console.error(`\n✗ ${falhas.length} campo(s) divergiram na ida e volta:\n`)
  for (const f of falhas) console.error(`  ${f}\n`)
  process.exit(1)
}

console.log('\n✓ Ida e volta sem divergência: todos os campos do plano voltaram iguais.')
