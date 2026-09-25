import { supabase } from './client'

/**
 * Quem assumiu o plano de uma semana numa equipe — o "plano mestre".
 *
 * Enquanto a semana tem responsável, só ele cria e altera o plano da equipe
 * daquela semana; os colegas veem e combinam as correções com ele. As regras
 * valem no banco (`supabase/migrations/20260925_plano_mestre.sql`): a tela
 * só as explica antes de o professor tentar.
 */
export interface ResponsavelDaSemana {
  equipe_id: string
  /** Segunda-feira, `AAAA-MM-DD`. */
  semana_inicio: string
  professor_id: string
  professor_nome: string | null
  professor_email: string | null
}

function exigirSupabase() {
  if (!supabase) throw new Error('Login indisponível: o app não tem as chaves do Supabase configuradas.')
  return supabase
}

/** Nome para mostrar na tela: o do perfil, ou o e-mail se ele ainda não preencheu. */
export function nomeDoResponsavel(r: ResponsavelDaSemana): string {
  return r.professor_nome?.trim() || r.professor_email || 'outro professor'
}

/** Os responsáveis das minhas equipes nas semanas indicadas. */
export async function listarResponsaveis(semanas: string[]): Promise<ResponsavelDaSemana[]> {
  const cliente = exigirSupabase()
  const { data, error } = await cliente
    .from('responsaveis_visao')
    .select('equipe_id, semana_inicio, professor_id, professor_nome, professor_email')
    .in('semana_inicio', semanas)
  if (error) throw error
  return data
}

/** "Sou o professor responsável por esta semana" — trava a semana para os outros. */
export async function assumirSemana(equipeId: string, semanaInicio: string): Promise<void> {
  const cliente = exigirSupabase()
  const { data: sessao } = await cliente.auth.getSession()
  const id = sessao.session?.user.id
  if (!id) throw new Error('Sua sessão expirou. Entre de novo.')

  const { error } = await cliente
    .from('responsaveis_semana')
    .insert({ equipe_id: equipeId, semana_inicio: semanaInicio, professor_id: id })
  if (error) {
    // Dois professores clicando ao mesmo tempo: a chave primária barra o segundo.
    if (error.code === '23505') {
      throw new Error('Outro professor acabou de assumir esta semana. Atualize a lista e converse com o grupo.')
    }
    throw error
  }
}

/** Devolve a semana para a equipe — só enquanto o plano não foi salvo. */
export async function liberarSemana(equipeId: string, semanaInicio: string): Promise<void> {
  const cliente = exigirSupabase()
  const { error } = await cliente
    .from('responsaveis_semana')
    .delete()
    .eq('equipe_id', equipeId)
    .eq('semana_inicio', semanaInicio)
  if (error) throw error
}
