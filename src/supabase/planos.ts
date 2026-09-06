import type { PlanoDeAula } from '../types'
import { supabase } from './client'

/** Uma linha da tabela `planos` — o plano salvo mais os metadados da lista. */
export interface PlanoSalvo {
  id: string
  dados: PlanoDeAula
  criado_em: string
  atualizado_em: string
  /** Equipe com quem o plano foi compartilhado; `null` = só o autor vê. */
  equipe_id: string | null
}

/**
 * Um plano visto na lista da equipe (ou na da Gestão): o mesmo plano, mais
 * quem é o autor. Vem da visão `planos_visao`, não da tabela.
 */
export interface PlanoDaEquipe extends PlanoSalvo {
  professor_id: string
  autor_nome: string | null
  autor_email: string | null
}

const COLUNAS = 'id, dados, criado_em, atualizado_em, equipe_id'
const COLUNAS_VISAO = `${COLUNAS}, professor_id, autor_nome, autor_email`

function exigirSupabase() {
  if (!supabase) throw new Error('Login indisponível: o app não tem as chaves do Supabase configuradas.')
  return supabase
}

async function meuId(): Promise<string> {
  const cliente = exigirSupabase()
  const { data: sessao } = await cliente.auth.getSession()
  const id = sessao.session?.user.id
  if (!id) throw new Error('Sua sessão expirou. Entre de novo para salvar.')
  return id
}

export async function listarPlanos(): Promise<PlanoSalvo[]> {
  const cliente = exigirSupabase()
  const { data, error } = await cliente
    .from('planos')
    .select(COLUNAS)
    .order('atualizado_em', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Cria um plano novo (quando `id` é `null`) ou atualiza um existente.
 *
 * `equipeId` é com quem ele fica compartilhado: `null` mantém o plano só para
 * o autor. O banco só aceita equipe da qual o professor faz parte.
 */
export async function salvarPlano(
  id: string | null,
  dados: PlanoDeAula,
  equipeId: string | null = null,
): Promise<PlanoSalvo> {
  const cliente = exigirSupabase()

  if (id) {
    const { data, error } = await cliente
      .from('planos')
      .update({ dados, equipe_id: equipeId })
      .eq('id', id)
      .select(COLUNAS)
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await cliente
    .from('planos')
    .insert({ dados, professor_id: await meuId(), equipe_id: equipeId })
    .select(COLUNAS)
    .single()
  if (error) throw error
  return data
}

/** Muda só o compartilhamento, sem tocar no conteúdo do plano. */
export async function compartilharPlano(id: string, equipeId: string | null): Promise<void> {
  const cliente = exigirSupabase()
  const { error } = await cliente.from('planos').update({ equipe_id: equipeId }).eq('id', id)
  if (error) throw error
}

export async function excluirPlano(id: string): Promise<void> {
  const cliente = exigirSupabase()
  const { error } = await cliente.from('planos').delete().eq('id', id)
  if (error) throw error
}

/**
 * Tudo o que está compartilhado com as minhas equipes — inclusive o que eu
 * mesmo compartilhei.
 *
 * A primeira versão escondia os meus, com o argumento de que já estão em
 * "Meus planos". Na prática isso deixava quem compartilha sem nenhuma
 * confirmação: o professor marcava "compartilhar com a equipe", abria a aba
 * da equipe e via "ninguém compartilhou nada" — indistinguível de ter falhado.
 * A tela marca os meus com "por você"; ver o próprio plano na lista é
 * justamente a prova de que a equipe está vendo.
 */
export async function listarPlanosDaEquipe(): Promise<PlanoDaEquipe[]> {
  const cliente = exigirSupabase()
  const { data, error } = await cliente
    .from('planos_visao')
    .select(COLUNAS_VISAO)
    .not('equipe_id', 'is', null)
    .order('atualizado_em', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Copia um plano da equipe para a minha conta.
 *
 * A cópia nasce privada (`equipe_id: null`) — quem copiou decide depois se
 * compartilha a versão dele. Só o nome do professor e os núcleos mudam; o
 * resto do conteúdo é o que o colega escreveu.
 */
export async function copiarPlanoParaMim(
  original: PlanoDaEquipe,
  ajustes: { professor: string; escolas: string[] },
): Promise<PlanoSalvo> {
  const cliente = exigirSupabase()
  const dados: PlanoDeAula = {
    ...original.dados,
    professor: ajustes.professor,
    escolas: ajustes.escolas,
  }

  const { data, error } = await cliente
    .from('planos')
    .insert({
      dados,
      professor_id: await meuId(),
      equipe_id: null,
      copiado_de: original.id,
    })
    .select(COLUNAS)
    .single()
  if (error) throw error
  return data
}

/**
 * Todos os planos do sistema, compartilhados ou não — a RLS só devolve isso
 * para quem está na Gestão.
 */
export async function listarTodosOsPlanos(): Promise<PlanoDaEquipe[]> {
  const cliente = exigirSupabase()
  const { data, error } = await cliente
    .from('planos_visao')
    .select(COLUNAS_VISAO)
    .order('atualizado_em', { ascending: false })

  if (error) throw error
  return data
}
