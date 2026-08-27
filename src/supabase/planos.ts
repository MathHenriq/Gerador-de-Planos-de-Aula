import type { PlanoDeAula } from '../types'
import { supabase } from './client'

/** Uma linha da tabela `planos` — o plano salvo mais os metadados da lista. */
export interface PlanoSalvo {
  id: string
  dados: PlanoDeAula
  criado_em: string
  atualizado_em: string
}

function exigirSupabase() {
  if (!supabase) throw new Error('Login indisponível: o app não tem as chaves do Supabase configuradas.')
  return supabase
}

export async function listarPlanos(): Promise<PlanoSalvo[]> {
  const cliente = exigirSupabase()
  const { data, error } = await cliente
    .from('planos')
    .select('id, dados, criado_em, atualizado_em')
    .order('atualizado_em', { ascending: false })

  if (error) throw error
  return data
}

/** Cria um plano novo (quando `id` é `null`) ou atualiza um existente. */
export async function salvarPlano(id: string | null, dados: PlanoDeAula): Promise<PlanoSalvo> {
  const cliente = exigirSupabase()
  const { data: sessao } = await cliente.auth.getSession()
  const professorId = sessao.session?.user.id
  if (!professorId) throw new Error('Sua sessão expirou. Entre de novo para salvar.')

  if (id) {
    const { data, error } = await cliente
      .from('planos')
      .update({ dados })
      .eq('id', id)
      .select('id, dados, criado_em, atualizado_em')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await cliente
    .from('planos')
    .insert({ dados, professor_id: professorId })
    .select('id, dados, criado_em, atualizado_em')
    .single()
  if (error) throw error
  return data
}

export async function excluirPlano(id: string): Promise<void> {
  const cliente = exigirSupabase()
  const { error } = await cliente.from('planos').delete().eq('id', id)
  if (error) throw error
}
