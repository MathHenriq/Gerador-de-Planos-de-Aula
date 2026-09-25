import { planoVazio } from './constants'
import type { BlocoAtividade, LinkNecessario, PlanoDeAula } from './types'

/** Soma dos blocos da Estrutura da Atividade. */
export function somaDosBlocos(estrutura: BlocoAtividade[]): number {
  return estrutura.reduce((total, b) => total + (Number(b.minutos) || 0), 0)
}

/** A estrutura fecha exatamente a duração escolhida para a aula? */
export function fechaNoTempoDaAula(estrutura: BlocoAtividade[], minutosTotais: number): boolean {
  return somaDosBlocos(estrutura) === minutosTotais
}

/**
 * Troca um item de posição numa lista, sem alterar a original.
 *
 * Índice fora da lista devolve a lista como está — assim o botão de subir do
 * primeiro item (ou o de descer do último) não precisa de guarda em cada tela.
 */
export function moverItem<T>(lista: T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length || de < 0 || de >= lista.length || de === para) return lista
  const nova = [...lista]
  const [item] = nova.splice(de, 1)
  nova.splice(para, 0, item)
  return nova
}

/** Um endereço dentro de um texto livre: "Canva – https://canva.com". */
const ENDERECO = /(https?:\/\/\S+|www\.\S+)/i

/**
 * Separa nome e link de um texto livre. Serve para os planos salvos antes de
 * "Recursos necessários" virar "Links necessários" (quando era uma linha só)
 * e para o que vem de um PDF importado.
 */
export function linkDoTexto(texto: string): LinkNecessario {
  const limpo = texto.trim()
  const achado = ENDERECO.exec(limpo)
  if (!achado) return { nome: limpo, link: '' }
  const nome = limpo
    .slice(0, achado.index)
    .replace(/[\s:–—-]+$/, '')
    .trim()
  return { nome, link: achado[0] }
}

/**
 * Completa um plano vindo de fora (banco, rascunho do navegador) com o formato
 * atual. Plano salvo antes de um campo existir não tem a chave, e sem isso a
 * tela quebra lendo `undefined`.
 */
export function normalizarPlano(dados: Partial<PlanoDeAula> & { recursos?: unknown }): PlanoDeAula {
  const { recursos, ...resto } = dados
  const plano: PlanoDeAula = { ...planoVazio(), ...resto }

  if (!Array.isArray(dados.links) && Array.isArray(recursos)) {
    const antigos = recursos
      .filter((r): r is string => typeof r === 'string' && r.trim() !== '')
      .map(linkDoTexto)
    plano.links = antigos.length ? antigos : [{ nome: '', link: '' }]
  }
  return plano
}

/** "Canva: https://canva.com" — como o link aparece no PDF e nas medições. */
export function textoDoLink({ nome, link }: LinkNecessario): string {
  const n = nome.trim()
  const l = link.trim()
  return n && l ? `${n}: ${l}` : n || l
}
