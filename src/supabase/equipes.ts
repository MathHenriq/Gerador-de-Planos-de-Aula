import { EQUIPE_GESTAO } from '../constants'
import { supabase } from './client'

/** Uma linha da tabela `perfis` — quem é o professor, fora o login. */
export interface Perfil {
  id: string
  nome: string
  email: string
  /** Núcleos que ele costuma marcar; sugestão inicial ao copiar um plano. */
  escolas_padrao: string[]
}

/** O perfil de quem está logado, junto com as equipes dele. */
export interface MinhaConta {
  perfil: Perfil
  equipes: string[]
  /** Atalho: `equipes` contém a Gestão. */
  gestao: boolean
}

function exigirSupabase() {
  if (!supabase) throw new Error('Login indisponível: o app não tem as chaves do Supabase configuradas.')
  return supabase
}

/**
 * Carrega perfil + equipes de quem está logado.
 *
 * O perfil normalmente já existe (a trigger `ao_criar_usuario` cria no
 * cadastro), mas quem entrou antes da migração pode não ter linha ainda —
 * nesse caso criamos uma vazia aqui, para a tela não ficar sem nome nenhum.
 */
export async function carregarMinhaConta(): Promise<MinhaConta> {
  const cliente = exigirSupabase()
  const { data: sessao } = await cliente.auth.getSession()
  const usuario = sessao.session?.user
  if (!usuario) throw new Error('Sua sessão expirou. Entre de novo.')

  const [perfilResposta, membrosResposta] = await Promise.all([
    cliente.from('perfis').select('id, nome, email, escolas_padrao').eq('id', usuario.id).maybeSingle(),
    cliente.from('membros_equipe').select('equipe_id').eq('professor_id', usuario.id),
  ])

  if (perfilResposta.error) throw perfilResposta.error
  if (membrosResposta.error) throw membrosResposta.error

  let perfil = perfilResposta.data
  if (!perfil) {
    const { data, error } = await cliente
      .from('perfis')
      .insert({ id: usuario.id, nome: '', email: usuario.email ?? '' })
      .select('id, nome, email, escolas_padrao')
      .single()
    if (error) throw error
    perfil = data
  }

  const equipes = membrosResposta.data.map((m) => m.equipe_id as string)
  return { perfil, equipes, gestao: equipes.includes(EQUIPE_GESTAO) }
}

/** Grava nome e escolas habituais — o que a cópia de um plano usa de padrão. */
export async function atualizarMeuPerfil(mudanca: {
  nome?: string
  escolas_padrao?: string[]
}): Promise<void> {
  const cliente = exigirSupabase()
  const { data: sessao } = await cliente.auth.getSession()
  const id = sessao.session?.user.id
  if (!id) throw new Error('Sua sessão expirou. Entre de novo.')

  const { error } = await cliente.from('perfis').update(mudanca).eq('id', id)
  if (error) throw error
}

/**
 * Entra nas equipes escolhidas na tela de "complete seu perfil".
 *
 * A Gestão fica de fora da lista oferecida, e o banco recusa de qualquer
 * forma (política `membros_insercao`) — ninguém se promove sozinho.
 */
export async function entrarNasEquipes(equipes: string[]): Promise<void> {
  const cliente = exigirSupabase()
  const { data: sessao } = await cliente.auth.getSession()
  const id = sessao.session?.user.id
  if (!id) throw new Error('Sua sessão expirou. Entre de novo.')

  const novas = equipes.filter((e) => e !== EQUIPE_GESTAO)
  if (!novas.length) return

  const { error } = await cliente
    .from('membros_equipe')
    .insert(novas.map((equipe_id) => ({ professor_id: id, equipe_id })))
  if (error) throw error
}

// --------------------------------------------------------------- gestão ---
// Daqui para baixo, só a Gestão consegue usar: as políticas de RLS recusam
// as chamadas de qualquer outra pessoa (não é a tela que protege, é o banco).

export interface ProfessorDaGestao extends Perfil {
  equipes: string[]
}

/** Todos os professores e suas equipes — a lista que a Gestão administra. */
export async function listarProfessores(): Promise<ProfessorDaGestao[]> {
  const cliente = exigirSupabase()

  const [perfisResposta, membrosResposta] = await Promise.all([
    cliente.from('perfis').select('id, nome, email, escolas_padrao').order('email'),
    cliente.from('membros_equipe').select('professor_id, equipe_id'),
  ])
  if (perfisResposta.error) throw perfisResposta.error
  if (membrosResposta.error) throw membrosResposta.error

  const porProfessor = new Map<string, string[]>()
  for (const m of membrosResposta.data) {
    const lista = porProfessor.get(m.professor_id) ?? []
    lista.push(m.equipe_id)
    porProfessor.set(m.professor_id, lista)
  }

  return perfisResposta.data.map((p) => ({ ...p, equipes: porProfessor.get(p.id) ?? [] }))
}

export async function adicionarNaEquipe(professorId: string, equipeId: string): Promise<void> {
  const cliente = exigirSupabase()
  const { error } = await cliente
    .from('membros_equipe')
    .insert({ professor_id: professorId, equipe_id: equipeId })
  if (error) throw error
}

export async function removerDaEquipe(professorId: string, equipeId: string): Promise<void> {
  const cliente = exigirSupabase()
  const { error } = await cliente
    .from('membros_equipe')
    .delete()
    .eq('professor_id', professorId)
    .eq('equipe_id', equipeId)
  if (error) throw error
}
