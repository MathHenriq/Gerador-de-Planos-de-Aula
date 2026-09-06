import { CICLOS, CURSOS, DURACOES_DISPONIVEIS, MINUTOS_PADRAO, NUCLEOS, planoVazio } from '../constants'
import { larguraDoTexto } from '../pdf/ajuste'
import { CAIXAS, CAIXAS_CABECALHO, TEXTOS, type Caixa } from '../pdf/layout'
import type { BlocoAtividade, Habilidade, PlanoDeAula } from '../types'
import type { ConteudoDoPdf, Linha, Marcador } from './linhas'

export interface Importacao {
  plano: PlanoDeAula
  /** O que não deu para reconhecer com certeza — a tela mostra antes de usar. */
  avisos: string[]
}

/** Folga ao testar se uma linha caiu dentro de uma caixa, em px do design. */
const FOLGA_CAIXA = 6

function dentro(linha: Linha, caixa: Caixa, pagina: number): boolean {
  return (
    linha.pagina === pagina &&
    linha.y >= caixa.top - FOLGA_CAIXA &&
    linha.y <= caixa.top + caixa.altura + FOLGA_CAIXA &&
    linha.x >= caixa.left - FOLGA_CAIXA &&
    linha.x <= caixa.left + caixa.largura + FOLGA_CAIXA
  )
}

function linhasDa(linhas: Linha[], caixa: Caixa, pagina: number): Linha[] {
  return linhas.filter((l) => dentro(l, caixa, pagina)).sort((a, b) => a.y - b.y)
}

/** Tira o rótulo do começo do campo do cabeçalho ("Curso: X" → "X"). */
function semRotulo(texto: string, rotulo: string): string {
  const limpo = texto.trim()
  const marca = limpo.toLowerCase().indexOf(rotulo.toLowerCase())
  if (marca === -1) return limpo
  return limpo.slice(marca + rotulo.length).trim()
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Devolve o valor da lista oficial que corresponde ao texto lido, se houver. */
function daLista(texto: string, opcoes: readonly string[]): string | null {
  const alvo = normalizar(texto)
  return opcoes.find((o) => normalizar(o) === alvo) ?? null
}

/**
 * Corpo de fonte com que a caixa foi desenhada, em px do design.
 *
 * O gerador encolhe a fonte quando o texto não cabe, então não dá para supor
 * o corpo do layout. Cada linha dá uma estimativa (largura medida ÷ largura
 * teórica com corpo 1); ficamos com a MENOR, porque as linhas justificadas
 * saem esticadas e inflariam a conta.
 */
function fonteDaCaixa(linhas: Linha[], padrao: number): number {
  const estimativas = linhas
    .map((l) => {
      const teorica = larguraDoTexto(l.texto, 1)
      return teorica > 0 ? (l.fim - l.x) / teorica : 0
    })
    .filter((f) => f > 0)

  if (!estimativas.length) return padrao
  return Math.min(...estimativas)
}

/** Distância máxima entre a bolinha e a linha de base do item que ela marca. */
const ALCANCE_DO_MARCADOR = 9

/** A linha começa um item novo? É item novo quando tem uma bolinha ao lado. */
function temMarcador(linha: Linha, marcadores: Marcador[]): boolean {
  return marcadores.some(
    (m) =>
      m.pagina === linha.pagina &&
      m.x < linha.x &&
      Math.abs(m.y - linha.y) < ALCANCE_DO_MARCADOR,
  )
}

/**
 * Junta as linhas de uma lista nos itens originais.
 *
 * O marcador é desenhado como círculo, não como texto, então o texto sozinho
 * não diz onde um item acaba e o outro começa: todas as linhas — inclusive as
 * de continuação — começam no mesmo x. A posição das bolinhas resolve isso, e
 * é o caminho principal aqui.
 *
 * Quando não há bolinha nenhuma (um PDF de outra origem, sem os marcadores
 * onde esperamos), sobra a quebra de linha como pista: se a primeira palavra
 * da linha seguinte ainda caberia no que sobrou da linha atual, ela não foi
 * quebrada por falta de espaço — é item novo. Acerta na maioria dos casos e
 * erra quando a palavra seguinte é comprida, por isso é só o plano B.
 */
function juntarItens(
  linhas: Linha[],
  margemDireita: number,
  fonte: number,
  marcadores: Marcador[],
): string[] {
  const itens: string[] = []
  const comMarcador = marcadores.length > 0 && linhas.some((l) => temMarcador(l, marcadores))
  const larguraEspaco = larguraDoTexto(' ', fonte)

  linhas.forEach((linha, i) => {
    const anterior = linhas[i - 1]
    if (!anterior) {
      itens.push(linha.texto)
      return
    }

    let itemNovo: boolean
    if (comMarcador) {
      itemNovo = temMarcador(linha, marcadores)
    } else {
      const primeiraPalavra = linha.texto.split(' ')[0] ?? ''
      const precisava = larguraEspaco + larguraDoTexto(primeiraPalavra, fonte)
      // 1 px de folga: a medida do PDF e a métrica da fonte não batem no
      // último decimal, e o empate tem que cair para "coube" (continuação).
      itemNovo = margemDireita - anterior.fim >= precisava - 1
    }

    if (itemNovo) itens.push(linha.texto)
    else itens[itens.length - 1] += ` ${linha.texto}`
  })

  return itens.map((i) => i.trim()).filter(Boolean)
}

function lista(
  conteudo: ConteudoDoPdf,
  caixa: Caixa,
  pagina: number,
  chave: keyof typeof TEXTOS,
): string[] {
  const texto = TEXTOS[chave]
  const doBloco = linhasDa(conteudo.linhas, caixa, pagina)
  if (!doBloco.length) return []
  const fonte = fonteDaCaixa(doBloco, texto.fonte)
  return juntarItens(
    doBloco,
    caixa.left + caixa.largura - texto.padRight,
    fonte,
    conteudo.marcadores,
  )
}

function paragrafo(linhas: Linha[], caixa: Caixa, pagina: number): string {
  return linhasDa(linhas, caixa, pagina)
    .map((l) => l.texto)
    .join(' ')
    .trim()
}

/** "A, B e C." → ["A", "B", "C"] */
function separarEscolas(texto: string): string[] {
  return texto
    .replace(/\.\s*$/, '')
    .split(/,\s*|\s+e\s+/i)
    .map((e) => e.trim())
    .filter(Boolean)
}

const CODIGO_HABILIDADE = /^(EF[A-Z0-9]+)\s*[–—-]\s*(.*)$/i

function lerHabilidades(linhas: Linha[]): { habilidades: Habilidade[]; naoLidas: number } {
  const doBloco = linhasDa(linhas, CAIXAS.habilidades, 1)
  const habilidades: Habilidade[] = []
  let naoLidas = 0

  for (const linha of doBloco) {
    const casa = CODIGO_HABILIDADE.exec(linha.texto)
    if (casa) {
      habilidades.push({ codigo: casa[1].toUpperCase(), descricao: casa[2].trim() })
    } else if (habilidades.length) {
      habilidades[habilidades.length - 1].descricao += ` ${linha.texto}`
    } else {
      naoLidas += 1
    }
  }

  return {
    habilidades: habilidades.map((h) => ({ ...h, descricao: h.descricao.replace(/\s+/g, ' ').trim() })),
    naoLidas,
  }
}

/** "CONVERSA INICIAL – 10 MIN" → título e minutos. */
const TITULO_DE_BLOCO = /^(.*?)\s*[–—-]\s*(\d+)\s*MIN\.?$/i

/**
 * Estrutura da atividade: o título do bloco tem recuo menor que o dos itens
 * (11,1 px contra 36), e é isso que separa um do outro — os dois saem em
 * caixa alta, então o texto sozinho não distinguiria.
 */
function lerEstrutura(conteudo: ConteudoDoPdf): BlocoAtividade[] {
  const caixa = CAIXAS.estrutura
  const texto = TEXTOS.estrutura
  const doBloco = linhasDa(conteudo.linhas, caixa, 2)
  if (!doBloco.length) return []

  const fonte = fonteDaCaixa(doBloco, texto.fonte)
  const margemDireita = caixa.left + caixa.largura - texto.padRight
  const limiteDeTitulo = caixa.left + (texto.padLeft + 11.1) / 2

  const blocos: BlocoAtividade[] = []
  let linhasDoItem: Linha[] = []

  const fecharItens = () => {
    if (!blocos.length || !linhasDoItem.length) {
      linhasDoItem = []
      return
    }
    blocos[blocos.length - 1].itens = juntarItens(
      linhasDoItem,
      margemDireita,
      fonte,
      conteudo.marcadores,
    )
    linhasDoItem = []
  }

  for (const linha of doBloco) {
    if (linha.x < limiteDeTitulo) {
      fecharItens()
      const casa = TITULO_DE_BLOCO.exec(linha.texto)
      blocos.push({
        titulo: (casa ? casa[1] : linha.texto).trim(),
        minutos: casa ? Number(casa[2]) : 0,
        itens: [],
      })
    } else {
      linhasDoItem.push(linha)
    }
  }
  fecharItens()

  return blocos.filter((b) => b.titulo || b.itens.length)
}

/**
 * Reconstrói o plano a partir das linhas do PDF.
 *
 * Vale para os PDFs gerados por este próprio sistema (e pelo template do Canva
 * que ele reproduz), porque a leitura é posicional: cada caixa do layout diz
 * qual campo é aquele texto.
 */
export function planoDoConteudo(conteudo: ConteudoDoPdf): Importacao {
  const { linhas } = conteudo
  const avisos: string[] = []
  const plano = planoVazio()

  // ── cabeçalho ──────────────────────────────────────────────────────────
  const cursoLido = semRotulo(paragrafo(linhas, CAIXAS_CABECALHO.curso, 1), 'Curso:')
  const cicloLido = semRotulo(paragrafo(linhas, CAIXAS_CABECALHO.ciclo, 1), 'Ciclo:')
  plano.curso = daLista(cursoLido, CURSOS) ?? plano.curso
  plano.ciclo = daLista(cicloLido, CICLOS) ?? plano.ciclo
  if (cursoLido && !daLista(cursoLido, CURSOS)) {
    avisos.push(`O curso do PDF ("${cursoLido}") não está na lista do sistema — confira o campo.`)
  }
  if (cicloLido && !daLista(cicloLido, CICLOS)) {
    avisos.push(`O ciclo do PDF ("${cicloLido}") não está na lista do sistema — confira o campo.`)
  }

  plano.semana = semRotulo(paragrafo(linhas, CAIXAS_CABECALHO.semana, 1), 'Semana:')
  plano.professor = semRotulo(paragrafo(linhas, CAIXAS_CABECALHO.professor, 1), 'Prof.:')
  plano.conteudo = semRotulo(paragrafo(linhas, CAIXAS_CABECALHO.conteudo, 1), 'Conteúdo:')

  const duracao = semRotulo(paragrafo(linhas, CAIXAS_CABECALHO.duracao, 1), 'Duração:')
  const minutos = Number(duracao.replace(/\D+/g, ''))
  plano.minutos = DURACOES_DISPONIVEIS.includes(minutos as (typeof DURACOES_DISPONIVEIS)[number])
    ? minutos
    : MINUTOS_PADRAO
  if (minutos && plano.minutos !== minutos) {
    avisos.push(`A duração do PDF (${minutos} min) não é uma das opções — ficou ${plano.minutos} min.`)
  }

  // ── escolas ────────────────────────────────────────────────────────────
  const lidas = separarEscolas(paragrafo(linhas, CAIXAS.escolas, 1))
  const reconhecidas: string[] = []
  const desconhecidas: string[] = []
  for (const escola of lidas) {
    const oficial = daLista(escola, NUCLEOS)
    if (oficial) reconhecidas.push(oficial)
    else desconhecidas.push(escola)
  }
  plano.escolas = reconhecidas
  if (desconhecidas.length) {
    avisos.push(
      `Não achei na lista de núcleos: ${desconhecidas.join(', ')}. Marque manualmente na seção Escolas.`,
    )
  }

  // ── páginas 1 a 3 ──────────────────────────────────────────────────────
  plano.temaDaAula = paragrafo(linhas, CAIXAS.tema, 1)
  plano.resumo = paragrafo(linhas, CAIXAS.resumo, 1)
  plano.materiais = lista(conteudo, CAIXAS.materiais, 1, 'materiais')
  plano.objetivos = lista(conteudo, CAIXAS.objetivos, 1, 'objetivos')
  plano.metodologia = lista(conteudo, CAIXAS.metodologia, 2, 'metodologia')
  plano.recursos = lista(conteudo, CAIXAS.recursos, 3, 'recursos')
  plano.observacao = paragrafo(linhas, CAIXAS.observacao, 3)

  const { habilidades, naoLidas } = lerHabilidades(linhas)
  plano.habilidades = habilidades
  if (naoLidas) {
    avisos.push(`${naoLidas} linha(s) da caixa de habilidades não começavam com um código "EF".`)
  }

  const estrutura = lerEstrutura(conteudo)
  if (estrutura.length) plano.estrutura = estrutura

  // Campos vazios viram uma linha em branco, como num plano novo — senão a
  // lista some da tela e o professor não tem onde digitar.
  if (!plano.objetivos.length) plano.objetivos = ['']
  if (!plano.metodologia.length) plano.metodologia = ['']
  if (!plano.recursos.length) plano.recursos = ['']

  // ── conferências finais ────────────────────────────────────────────────
  const soma = plano.estrutura.reduce((t, b) => t + b.minutos, 0)
  if (plano.estrutura.length && soma !== plano.minutos) {
    avisos.push(
      `Os blocos da estrutura somam ${soma} min e a duração lida é ${plano.minutos} min — ajuste antes de salvar.`,
    )
  }

  const faltando = [
    !plano.semana && 'semana',
    !plano.professor && 'professor',
    !plano.temaDaAula && 'tema da aula',
    !plano.resumo && 'resumo',
  ].filter(Boolean)
  if (faltando.length) {
    avisos.push(`Não consegui ler: ${faltando.join(', ')}. Preencha à mão depois de importar.`)
  }

  avisos.push(
    'O PDF guarda o texto em CAIXA ALTA (é assim que o template imprime), então o que foi importado vem em maiúsculas. O conteúdo está certo; só a caixa das letras muda.',
  )

  return { plano, avisos }
}
