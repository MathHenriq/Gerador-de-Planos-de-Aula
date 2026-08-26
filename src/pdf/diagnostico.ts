import { textoDasEscolas } from '../constants'
import type { PlanoDeAula } from '../types'
import { alturaEstimada, escalaParaCaber, type MedidaCaixa, type Paragrafo } from './ajuste'
import { CAIXAS, HABILIDADES_ESPACO, TEXTOS, alturaDisponivel } from './layout'

export interface Diagnostico {
  /** Caixas em que a fonte precisou encolher, mas o conteúdo ainda cabe. */
  apertadas: string[]
  /** Caixas em que o conteúdo não cabe nem no menor corpo — vai sair cortado. */
  estouradas: string[]
}

interface Caso {
  nome: string
  chave: keyof typeof CAIXAS
  itens: string[]
  espacoEntre?: number
  /** A caixa das escolas é a única que não vai em caixa alta no PDF. */
  maiuscula?: boolean
}

function medir(chave: keyof typeof CAIXAS, maiuscula: boolean) {
  const caixa = CAIXAS[chave]
  const texto = TEXTOS[chave]
  const medida: MedidaCaixa = {
    larguraUtil: caixa.largura - texto.padLeft - texto.padRight,
    fonte: texto.fonte,
    entrelinha: texto.entrelinha,
    maiuscula,
  }
  const disponivel = alturaDisponivel(caixa, texto)
  return { medida, disponivel }
}

/**
 * Como cada caixa do PDF vai se comportar com o conteúdo atual.
 *
 * Usa a mesma medição do gerador, então os avisos da tela correspondem
 * exatamente ao que sai no arquivo.
 */
export function diagnosticar(plano: PlanoDeAula): Diagnostico {
  const casos: Caso[] = [
    { nome: 'escolas', chave: 'escolas', itens: [textoDasEscolas(plano.escolas)], maiuscula: false },
    { nome: 'objetivos', chave: 'objetivos', itens: plano.objetivos },
    {
      nome: 'habilidades da BNCC',
      chave: 'habilidades',
      itens: plano.habilidades.map((h) => `${h.codigo} – ${h.descricao}`),
      espacoEntre: HABILIDADES_ESPACO,
    },
    { nome: 'materiais', chave: 'materiais', itens: plano.materiais },
    { nome: 'metodologia', chave: 'metodologia', itens: plano.metodologia },
    { nome: 'resumo', chave: 'resumo', itens: [plano.resumo] },
    {
      nome: 'estrutura da atividade',
      chave: 'estrutura',
      itens: plano.estrutura.flatMap((b) => [`${b.titulo} – ${b.minutos} MIN`, ...b.itens]),
    },
    { nome: 'recursos', chave: 'recursos', itens: plano.recursos },
  ]

  const apertadas: string[] = []
  const estouradas: string[] = []

  for (const { nome, chave, itens, espacoEntre, maiuscula } of casos) {
    const paragrafos: Paragrafo[] = itens
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t, i) => ({ texto: t, recuo: 0, espacoAcima: i === 0 ? 0 : espacoEntre }))
    if (!paragrafos.length) continue

    const { medida, disponivel } = medir(chave, maiuscula ?? true)
    if (alturaEstimada(paragrafos, medida) <= disponivel) continue

    const escala = escalaParaCaber(paragrafos, medida, disponivel)
    if (alturaEstimada(paragrafos, medida, escala) <= disponivel) apertadas.push(nome)
    else estouradas.push(nome)
  }

  return { apertadas, estouradas }
}

/**
 * A lista de núcleos ainda cabe na caixa "Escolas:"?
 *
 * A caixa tem altura fixa no template. Passando de um certo número de núcleos,
 * nem o menor corpo de fonte dá conta — e aí o texto sai cortado. O seletor usa
 * isso para avisar na hora da marcação, e não só depois de gerar o PDF.
 */
export function escolasCabem(escolas: string[]): boolean {
  const conteudo = textoDasEscolas(escolas)
  if (!conteudo) return true

  const { medida, disponivel } = medir('escolas', false)
  const paragrafos: Paragrafo[] = [{ texto: conteudo, recuo: 0 }]
  const escala = escalaParaCaber(paragrafos, medida, disponivel)

  return alturaEstimada(paragrafos, medida, escala) <= disponivel
}
