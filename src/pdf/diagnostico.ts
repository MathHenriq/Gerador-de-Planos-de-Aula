import type { PlanoDeAula } from '../types'
import { alturaEstimada, type Paragrafo } from './ajuste'
import { CAIXAS, HABILIDADES_ESPACO, TEXTOS } from './layout'

/**
 * Quais caixas do PDF vão precisar encolher a fonte para o conteúdo caber.
 *
 * Usa a mesma medição do gerador, então o aviso na tela de revisão corresponde
 * exatamente ao que acontece no arquivo.
 */
export function caixasApertadas(plano: PlanoDeAula): string[] {
  const casos: Array<{
    nome: string
    chave: keyof typeof CAIXAS
    itens: string[]
    espacoEntre?: number
  }> = [
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

  return casos
    .filter(({ chave, itens, espacoEntre }) => {
      const caixa = CAIXAS[chave]
      const texto = TEXTOS[chave]
      const paragrafos: Paragrafo[] = itens
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t, i) => ({ texto: t, recuo: 0, espacoAcima: i === 0 ? 0 : espacoEntre }))
      if (!paragrafos.length) return false

      const altura = alturaEstimada(paragrafos, {
        larguraUtil: caixa.largura - texto.padLeft - texto.padRight,
        fonte: texto.fonte,
        entrelinha: texto.entrelinha,
        maiuscula: true,
      })
      return altura > caixa.altura - texto.padTop - Math.max(texto.padTop, 6)
    })
    .map(({ nome }) => nome)
}
