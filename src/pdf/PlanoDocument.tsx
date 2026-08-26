import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import type { ReactNode } from 'react'

import { ESCOLAS_PARCEIRAS } from '../constants'
import type { BlocoAtividade, Habilidade, PlanoDeAula } from '../types'
import { escalaParaCaber, estimarLinhas, type Paragrafo } from './ajuste'
import { FAMILIA } from './fontes'
import {
  BORDA_PX,
  CAIXAS,
  CAIXAS_CABECALHO,
  ESTRUTURA_ESPACO_ENTRE_BLOCOS,
  ESTRUTURA_TITULO_PAD_LEFT,
  HABILIDADES_ESPACO,
  LOGO_MICRO_KA,
  MARCA_WIT,
  MARCADOR_PX,
  PAGINA_PT,
  ROTULOS,
  TEXTOS,
  TEXTO_CABECALHO,
  pt,
  type Caixa,
  type Rotulo,
  type Texto,
} from './layout'

export interface AssetsDoPlano {
  logoMicroKa: string
  marcaWit: string
}

const s = StyleSheet.create({
  pagina: { backgroundColor: '#FFFFFF', fontFamily: FAMILIA, color: '#000000' },
  moldura: {
    position: 'absolute',
    borderWidth: pt(BORDA_PX),
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  rotulo: { position: 'absolute', fontWeight: 700, textTransform: 'uppercase' },
  linhaItem: { flexDirection: 'row' },
  marcador: {
    width: pt(MARCADOR_PX),
    height: pt(MARCADOR_PX),
    borderRadius: pt(MARCADOR_PX / 2),
    backgroundColor: '#000000',
  },
})

/* ── helpers de posicionamento ────────────────────────────────────────────── */

function posicao(c: Caixa): Style {
  return {
    position: 'absolute',
    top: pt(c.top),
    left: pt(c.left),
    width: pt(c.largura),
    height: pt(c.altura),
  }
}

function larguraUtil(c: Caixa, t: Texto): number {
  return c.largura - t.padLeft - t.padRight
}

/** Altura livre para o texto dentro da caixa (sobra uma folga parecida embaixo). */
function alturaUtil(c: Caixa, t: Texto): number {
  return c.altura - t.padTop - Math.max(t.padTop, 6)
}

function Moldura({ caixa }: { caixa: Caixa }) {
  return <View style={[s.moldura, posicao(caixa)]} />
}

/**
 * Recorte do tamanho exato da caixa, com o conteúdo posicionado por dentro
 * (coordenadas relativas ao canto superior esquerdo da caixa).
 *
 * Resolve duas coisas de uma vez: o texto nunca vaza por cima da borda — que é
 * justamente o defeito que este gerador veio corrigir — e o @react-pdf não
 * tenta abrir uma quarta página quando alguém escreve demais. O plano tem
 * 3 páginas fixas; o excesso é tratado encolhendo a fonte e avisando na tela.
 */
function RecorteDaCaixa({ caixa, children }: { caixa: Caixa; children: ReactNode }) {
  return <View style={[posicao(caixa), { overflow: 'hidden' }]}>{children}</View>
}

function RotuloSecao({ rotulo, children }: { rotulo: Rotulo; children: string }) {
  return (
    <Text
      style={[
        s.rotulo,
        { top: pt(rotulo.top), left: pt(rotulo.left), fontSize: pt(rotulo.fonte), lineHeight: 1 },
      ]}
    >
      {children}
    </Text>
  )
}

/* ── blocos de conteúdo ───────────────────────────────────────────────────── */

interface ConteudoProps {
  caixa: Caixa
  texto: Texto
  maiuscula?: boolean
}

/** Texto corrido dentro de uma caixa (Escolas, Tema, Resumo). */
function CaixaParagrafo({
  caixa,
  texto,
  conteudo,
  maiuscula,
  negrito,
  peso,
}: ConteudoProps & { conteudo: string; negrito?: boolean; peso?: 400 | 500 | 700 }) {
  const escala = escalaParaCaber(
    [{ texto: conteudo, recuo: 0, negrito }],
    {
      larguraUtil: larguraUtil(caixa, texto),
      fonte: texto.fonte,
      entrelinha: texto.entrelinha,
      maiuscula,
    },
    alturaUtil(caixa, texto),
  )

  return (
    <RecorteDaCaixa caixa={caixa}>
      <View
        style={{
          position: 'absolute',
          top: pt(texto.padTop),
          left: pt(texto.padLeft),
          width: pt(larguraUtil(caixa, texto)),
        }}
      >
        <Text
          style={{
            fontSize: pt(texto.fonte * escala),
            lineHeight: texto.entrelinha / texto.fonte,
            textAlign: texto.alinhamento ?? 'left',
            textTransform: maiuscula ? 'uppercase' : 'none',
            fontWeight: negrito ? 700 : (peso ?? 400),
          }}
        >
          {conteudo}
        </Text>
      </View>
    </RecorteDaCaixa>
  )
}

/** Um item de lista: marcador redondo + texto. */
function ItemComMarcador({
  texto,
  padMarcador,
  padLeft,
  padRight,
  fonte,
  entrelinha,
  alinhamento,
  maiuscula,
}: {
  texto: string
  padMarcador: number
  padLeft: number
  padRight: number
  fonte: number
  entrelinha: number
  alinhamento?: 'left' | 'justify'
  maiuscula?: boolean
}) {
  return (
    <View style={[s.linhaItem, { paddingLeft: pt(padMarcador), paddingRight: pt(padRight) }]}>
      <View style={[s.marcador, { marginTop: pt((entrelinha - MARCADOR_PX) / 2) }]} />
      <Text
        style={{
          marginLeft: pt(padLeft - padMarcador - MARCADOR_PX),
          flex: 1,
          fontSize: pt(fonte),
          lineHeight: entrelinha / fonte,
          textAlign: alinhamento ?? 'left',
          textTransform: maiuscula ? 'uppercase' : 'none',
        }}
      >
        {texto}
      </Text>
    </View>
  )
}

/** Lista com marcadores (Objetivos, Materiais, Metodologia, Recursos). */
function CaixaLista({ caixa, texto, itens, maiuscula }: ConteudoProps & { itens: string[] }) {
  const visiveis = itens.map((i) => i.trim()).filter(Boolean)
  const escala = escalaParaCaber(
    visiveis.map((t) => ({ texto: t, recuo: 0 })),
    {
      larguraUtil: larguraUtil(caixa, texto),
      fonte: texto.fonte,
      entrelinha: texto.entrelinha,
      maiuscula,
    },
    alturaUtil(caixa, texto),
  )

  const fonte = texto.fonte * escala
  const entrelinha = texto.entrelinha * escala
  const padMarcador = texto.padMarcador ?? texto.padLeft / 2

  return (
    <RecorteDaCaixa caixa={caixa}>
      <View
        style={{ position: 'absolute', top: pt(texto.padTop), left: 0, width: pt(caixa.largura) }}
      >
        {visiveis.map((item, i) => (
          <ItemComMarcador
            key={i}
            texto={item}
            padMarcador={padMarcador}
            padLeft={texto.padLeft}
            padRight={texto.padRight}
            fonte={fonte}
            entrelinha={entrelinha}
            alinhamento={texto.alinhamento}
            maiuscula={maiuscula}
          />
        ))}
      </View>
    </RecorteDaCaixa>
  )
}

/** Habilidades da BNCC: código em negrito + descrição oficial, no mesmo parágrafo. */
function CaixaHabilidades({
  caixa,
  texto,
  habilidades,
}: ConteudoProps & { habilidades: Habilidade[] }) {
  const escala = escalaParaCaber(
    habilidades.map((h) => ({
      texto: `${h.codigo} – ${h.descricao}`,
      recuo: 0,
      espacoAcima: HABILIDADES_ESPACO,
    })),
    {
      larguraUtil: larguraUtil(caixa, texto),
      fonte: texto.fonte,
      entrelinha: texto.entrelinha,
      maiuscula: true,
    },
    alturaUtil(caixa, texto),
  )

  return (
    <RecorteDaCaixa caixa={caixa}>
      <View
        style={{
          position: 'absolute',
          top: pt(texto.padTop),
          left: pt(texto.padLeft),
          width: pt(larguraUtil(caixa, texto)),
        }}
      >
        {habilidades.map((h, i) => (
          <Text
            key={h.codigo}
            style={{
              fontSize: pt(texto.fonte * escala),
              lineHeight: texto.entrelinha / texto.fonte,
              textAlign: texto.alinhamento ?? 'left',
              textTransform: 'uppercase',
              marginTop: i === 0 ? 0 : pt(HABILIDADES_ESPACO * escala),
            }}
          >
            <Text style={{ fontWeight: 700 }}>{h.codigo}</Text>
            <Text> – {h.descricao}</Text>
          </Text>
        ))}
      </View>
    </RecorteDaCaixa>
  )
}

export function tituloDoBloco(bloco: BlocoAtividade): string {
  const titulo = bloco.titulo.trim()
  if (!bloco.minutos) return titulo
  return `${titulo} – ${bloco.minutos} MIN`
}

/** Estrutura da Atividade: título do bloco em negrito + itens com marcador. */
function CaixaEstrutura({ caixa, texto, blocos }: ConteudoProps & { blocos: BlocoAtividade[] }) {
  const uteis = blocos
    .map((b) => ({ ...b, itens: b.itens.map((i) => i.trim()).filter(Boolean) }))
    .filter((b) => b.titulo.trim() || b.itens.length)

  const paragrafos: Paragrafo[] = []
  uteis.forEach((b, i) => {
    paragrafos.push({
      texto: tituloDoBloco(b),
      recuo: ESTRUTURA_TITULO_PAD_LEFT,
      espacoAcima: i === 0 ? 0 : ESTRUTURA_ESPACO_ENTRE_BLOCOS,
      negrito: true,
    })
    b.itens.forEach((item) => paragrafos.push({ texto: item, recuo: texto.padLeft }))
  })

  const escala = escalaParaCaber(
    paragrafos,
    {
      larguraUtil: caixa.largura - texto.padRight,
      fonte: texto.fonte,
      entrelinha: texto.entrelinha,
      maiuscula: true,
    },
    alturaUtil(caixa, texto),
  )

  const fonte = texto.fonte * escala
  const entrelinha = texto.entrelinha * escala
  const padMarcador = texto.padMarcador ?? texto.padLeft / 2

  return (
    <RecorteDaCaixa caixa={caixa}>
      <View
        style={{ position: 'absolute', top: pt(texto.padTop), left: 0, width: pt(caixa.largura) }}
      >
        {uteis.map((bloco, i) => (
          <View
            key={i}
            style={{ marginTop: i === 0 ? 0 : pt(ESTRUTURA_ESPACO_ENTRE_BLOCOS * escala) }}
          >
            <Text
              style={{
                paddingLeft: pt(ESTRUTURA_TITULO_PAD_LEFT),
                paddingRight: pt(texto.padRight),
                fontSize: pt(fonte),
                lineHeight: entrelinha / fonte,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {tituloDoBloco(bloco)}
            </Text>
            {bloco.itens.map((item, j) => (
              <ItemComMarcador
                key={j}
                texto={item}
                padMarcador={padMarcador}
                padLeft={texto.padLeft}
                padRight={texto.padRight}
                fonte={fonte}
                entrelinha={entrelinha}
                maiuscula
              />
            ))}
          </View>
        ))}
      </View>
    </RecorteDaCaixa>
  )
}

/* ── cabeçalho ────────────────────────────────────────────────────────────── */

/** Entrelinha dos campos do cabeçalho, em múltiplos do corpo da fonte. */
const ENTRELINHA_CABECALHO = 1.35
/** Folga à direita dentro das caixas do cabeçalho. */
const PAD_RIGHT_CABECALHO = 4

/**
 * Campo do cabeçalho: rótulo em negrito + valor.
 *
 * A moldura e o texto são desenhados separados de propósito. Se o texto ficasse
 * dentro de uma View de altura fixa, o @react-pdf cortaria a segunda linha com
 * reticências quando o valor fosse longo (é o que acontecia com "Semana:
 * 31/08 - 04/09"). Desenhando por fora, a centralização vertical é calculada na
 * mão e o texto ocupa as duas linhas, como no template original.
 */
function CampoCabecalho({
  caixa,
  padLeft,
  fonte,
  rotulo,
  valor,
  valorRegular,
}: {
  caixa: Caixa
  padLeft: number
  fonte: number
  rotulo: string
  valor: string
  valorRegular?: boolean
}) {
  const larguraTexto = caixa.largura - padLeft - PAD_RIGHT_CABECALHO
  const entrelinha = fonte * ENTRELINHA_CABECALHO
  const conteudo = `${rotulo}${valor}`

  const escala = escalaParaCaber(
    [{ texto: conteudo, recuo: 0, negrito: true }],
    { larguraUtil: larguraTexto, fonte, entrelinha },
    caixa.altura - 4,
  )
  const linhas = estimarLinhas(conteudo, larguraTexto, fonte * escala, { negrito: true })
  const alturaTexto = linhas * entrelinha * escala

  return (
    <>
      <View style={[s.moldura, posicao(caixa)]} />
      <View
        style={{
          position: 'absolute',
          top: pt(caixa.top + (caixa.altura - alturaTexto) / 2),
          left: pt(caixa.left + padLeft),
          width: pt(larguraTexto),
        }}
      >
        <Text
          style={{ fontSize: pt(fonte * escala), lineHeight: ENTRELINHA_CABECALHO, fontWeight: 700 }}
        >
          {rotulo}
          <Text style={{ fontWeight: valorRegular ? 400 : 700 }}>{valor}</Text>
        </Text>
      </View>
    </>
  )
}

/* ── páginas ──────────────────────────────────────────────────────────────── */

function Marca({ assets, primeira }: { assets: AssetsDoPlano; primeira?: boolean }) {
  const m = primeira ? MARCA_WIT.pagina1 : MARCA_WIT.demais
  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: pt(LOGO_MICRO_KA.recorte.top),
          left: pt(LOGO_MICRO_KA.recorte.left),
          width: pt(LOGO_MICRO_KA.recorte.largura),
          height: pt(LOGO_MICRO_KA.recorte.altura),
          overflow: 'hidden',
        }}
      >
        <Image
          src={assets.logoMicroKa}
          style={{
            position: 'absolute',
            top: pt(LOGO_MICRO_KA.imagem.top),
            left: pt(LOGO_MICRO_KA.imagem.left),
            width: pt(LOGO_MICRO_KA.imagem.largura),
            height: pt(LOGO_MICRO_KA.imagem.altura),
          }}
        />
      </View>
      <Image
        src={assets.marcaWit}
        style={{
          position: 'absolute',
          top: pt(m.top),
          left: pt(m.left),
          width: pt(m.largura),
          height: pt(m.altura),
          opacity: MARCA_WIT.opacidade,
        }}
      />
    </>
  )
}

export interface PlanoDocumentProps {
  plano: PlanoDeAula
  assets: AssetsDoPlano
}

export function PlanoDocument({ plano, assets }: PlanoDocumentProps) {
  return (
    <Document
      title={`Plano de aula — ${plano.temaDaAula || 'Núcleo WIT'}`}
      author={plano.professor || 'Núcleo WIT'}
      creator="Gerador de Plano de Aula — Núcleo WIT"
    >
      {/* Página 1 — cabeçalho, objetivos, habilidades, materiais e metodologia */}
      <Page size={PAGINA_PT} style={s.pagina}>
        <Marca assets={assets} primeira />

        <CampoCabecalho
          caixa={CAIXAS_CABECALHO.curso}
          {...TEXTO_CABECALHO.curso}
          rotulo="Curso: "
          valor={plano.curso}
        />
        <CampoCabecalho
          caixa={CAIXAS_CABECALHO.semana}
          {...TEXTO_CABECALHO.semana}
          rotulo="Semana: "
          valor={plano.semana}
        />
        <CampoCabecalho
          caixa={CAIXAS_CABECALHO.professor}
          {...TEXTO_CABECALHO.professor}
          rotulo="Prof.: "
          valor={plano.professor}
        />
        <CampoCabecalho
          caixa={CAIXAS_CABECALHO.duracao}
          {...TEXTO_CABECALHO.duracao}
          rotulo="Duração:"
          valor={` ${plano.duracao}`}
          valorRegular
        />
        <CampoCabecalho
          caixa={CAIXAS_CABECALHO.ciclo}
          {...TEXTO_CABECALHO.ciclo}
          rotulo="Ciclo: "
          valor={plano.ciclo}
        />
        <CampoCabecalho
          caixa={CAIXAS_CABECALHO.conteudo}
          {...TEXTO_CABECALHO.conteudo}
          rotulo="Conteúdo: "
          valor={plano.conteudo}
        />

        <RotuloSecao rotulo={ROTULOS.escolas}>Escolas:</RotuloSecao>
        <Moldura caixa={CAIXAS.escolas} />
        <CaixaParagrafo
          caixa={CAIXAS.escolas}
          texto={TEXTOS.escolas}
          conteudo={ESCOLAS_PARCEIRAS}
          peso={500}
        />

        <RotuloSecao rotulo={ROTULOS.tema}>Tema da aula:</RotuloSecao>
        <Moldura caixa={CAIXAS.tema} />
        <CaixaParagrafo
          caixa={CAIXAS.tema}
          texto={TEXTOS.tema}
          conteudo={plano.temaDaAula}
          maiuscula
          negrito
        />

        <RotuloSecao rotulo={ROTULOS.objetivos}>Objetivos de aprendizagem</RotuloSecao>
        <Moldura caixa={CAIXAS.objetivos} />
        <CaixaLista
          caixa={CAIXAS.objetivos}
          texto={TEXTOS.objetivos}
          itens={plano.objetivos}
          maiuscula
        />

        <RotuloSecao rotulo={ROTULOS.habilidades}>Habilidades da aula</RotuloSecao>
        <Moldura caixa={CAIXAS.habilidades} />
        <CaixaHabilidades
          caixa={CAIXAS.habilidades}
          texto={TEXTOS.habilidades}
          habilidades={plano.habilidades}
        />

        <RotuloSecao rotulo={ROTULOS.materiais}>Materiais necessários</RotuloSecao>
        <Moldura caixa={CAIXAS.materiais} />
        <CaixaLista
          caixa={CAIXAS.materiais}
          texto={TEXTOS.materiais}
          itens={plano.materiais}
          maiuscula
        />

        <RotuloSecao rotulo={ROTULOS.metodologia}>Metodologia</RotuloSecao>
        <Moldura caixa={CAIXAS.metodologia} />
        <CaixaLista
          caixa={CAIXAS.metodologia}
          texto={TEXTOS.metodologia}
          itens={plano.metodologia}
          maiuscula
        />
      </Page>

      {/* Página 2 — resumo e estrutura da atividade */}
      <Page size={PAGINA_PT} style={s.pagina}>
        <Marca assets={assets} />

        <RotuloSecao rotulo={ROTULOS.resumo}>Resumo da aula</RotuloSecao>
        <Moldura caixa={CAIXAS.resumo} />
        <CaixaParagrafo
          caixa={CAIXAS.resumo}
          texto={TEXTOS.resumo}
          conteudo={plano.resumo}
          maiuscula
        />

        <RotuloSecao rotulo={ROTULOS.estrutura}>Estrutura da atividade</RotuloSecao>
        <Moldura caixa={CAIXAS.estrutura} />
        <CaixaEstrutura caixa={CAIXAS.estrutura} texto={TEXTOS.estrutura} blocos={plano.estrutura} />
      </Page>

      {/* Página 3 — recursos necessários */}
      <Page size={PAGINA_PT} style={s.pagina}>
        <Marca assets={assets} />

        <RotuloSecao rotulo={ROTULOS.recursos}>Recursos necessários</RotuloSecao>
        <Moldura caixa={CAIXAS.recursos} />
        <CaixaLista
          caixa={CAIXAS.recursos}
          texto={TEXTOS.recursos}
          itens={plano.recursos}
          maiuscula
        />
      </Page>
    </Document>
  )
}
