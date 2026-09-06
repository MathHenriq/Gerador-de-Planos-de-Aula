import { EQUIPES, EQUIPE_GESTAO, nomeDaEquipe } from '../constants'
import { nomeDoArquivo } from '../nomeDoDocumento'
import type { PlanoDaEquipe } from '../supabase/planos'

/**
 * Como as pastas do ZIP são organizadas.
 *
 * - `curso`: uma pasta por curso, com os planos soltos dentro.
 * - `curso-professor`: dentro de cada curso, uma pasta por professor.
 * - `professor`: só as pastas de professor, na raiz, sem separar por curso.
 */
export type Organizacao = 'curso' | 'curso-professor' | 'professor'

/** As equipes que viram pasta: os 5 cursos + Integral (a Gestão não é curso). */
export const EQUIPES_EXPORTAVEIS = EQUIPES.filter((e) => e.id !== EQUIPE_GESTAO)

/** Pasta de quem não caiu em nenhum curso — nem por equipe, nem pelo campo Curso. */
export const PASTA_SEM_CURSO = 'Sem curso definido'

const AVISO_PASTA_VAZIA = 'Nenhum plano desta equipe na seleção exportada.\n'

/**
 * Nome de arquivo/pasta que sobrevive a Windows, macOS e Linux.
 *
 * A barra é o caso que importa de verdade: ela viraria um nível de pasta a
 * mais dentro do ZIP, quebrando a organização escolhida.
 */
export function nomeSeguro(bruto: string): string {
  const limpo = bruto
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '')
  return limpo || 'Sem nome'
}

/** Como o autor aparece na pasta dele: perfil, campo Prof. do plano, ou e-mail. */
export function autorDoPlano(plano: PlanoDaEquipe): string {
  return (
    plano.autor_nome?.trim() ||
    plano.dados.professor?.trim() ||
    plano.autor_email?.trim() ||
    'Professor sem nome'
  )
}

/**
 * Em que curso o plano entra.
 *
 * A equipe com quem ele foi compartilhado manda; quando o plano é privado
 * (`equipe_id` nulo, que só a Gestão enxerga), sobra o campo *Curso* do próprio
 * plano — é o que o professor escolheu no cabeçalho.
 */
export function cursoDoPlano(plano: PlanoDaEquipe): string {
  if (plano.equipe_id && plano.equipe_id !== EQUIPE_GESTAO) return nomeDaEquipe(plano.equipe_id)

  const curso = plano.dados.curso?.trim()
  const equipe = EQUIPES_EXPORTAVEIS.find((e) => e.curso === curso)
  if (equipe) return equipe.nome
  return PASTA_SEM_CURSO
}

/** O caminho de pastas de um plano dentro do ZIP, conforme a organização escolhida. */
export function pastaDoPlano(plano: PlanoDaEquipe, organizacao: Organizacao): string {
  const curso = nomeSeguro(cursoDoPlano(plano))
  const professor = nomeSeguro(autorDoPlano(plano))

  if (organizacao === 'professor') return professor
  if (organizacao === 'curso-professor') return `${curso}/${professor}`
  return curso
}

/**
 * Distribui os planos nas pastas, já resolvendo nomes repetidos.
 *
 * Dois planos do mesmo professor na mesma semana geram o mesmo nome de arquivo
 * (o nome padrão é professor + semana). Em vez de um sobrescrever o outro
 * dentro do ZIP, o segundo ganha um sufixo com o tema da aula, e o terceiro em
 * diante um número.
 */
export function montarCaminhos(
  planos: PlanoDaEquipe[],
  organizacao: Organizacao,
): Map<string, PlanoDaEquipe> {
  const caminhos = new Map<string, PlanoDaEquipe>()

  for (const plano of planos) {
    const pasta = pastaDoPlano(plano, organizacao)
    const base = nomeSeguro(nomeDoArquivo(plano.dados).replace(/\.pdf$/i, ''))

    let nome = `${pasta}/${base}.pdf`
    if (caminhos.has(nome)) {
      const tema = nomeSeguro(plano.dados.temaDaAula || '')
      nome = `${pasta}/${base}${tema ? ` - ${tema}` : ''}.pdf`
    }
    let n = 2
    while (caminhos.has(nome)) {
      nome = `${pasta}/${base} (${n}).pdf`
      n += 1
    }

    caminhos.set(nome, plano)
  }

  return caminhos
}

/**
 * Monta o ZIP dos planos selecionados, um PDF por plano.
 *
 * Quando a organização inclui os cursos, as seis pastas aparecem sempre —
 * mesmo as vazias, com um aviso dentro —, para a Gestão ver de relance qual
 * equipe não entregou plano naquela semana.
 *
 * `aoProgredir` é chamado a cada PDF gerado: cada um leva um tempinho, e sem
 * isso a tela fica parada sem explicação.
 */
export async function montarZip(
  planos: PlanoDaEquipe[],
  organizacao: Organizacao,
  aoProgredir?: (feitos: number, total: number) => void,
): Promise<Blob> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  const caminhos = montarCaminhos(planos, organizacao)

  if (organizacao !== 'professor') {
    const comPlano = new Set([...caminhos.values()].map((p) => nomeSeguro(cursoDoPlano(p))))
    for (const equipe of EQUIPES_EXPORTAVEIS) {
      const pasta = nomeSeguro(equipe.nome)
      if (!comPlano.has(pasta)) zip.file(`${pasta}/(sem planos).txt`, AVISO_PASTA_VAZIA)
    }
  }

  // Os PDFs são gerados um a um de propósito: gerar dezenas em paralelo no
  // navegador do professor come memória e trava a aba.
  const { gerarBlob } = await import('../components/PreviaPdf')
  let feitos = 0
  for (const [caminho, plano] of caminhos) {
    zip.file(caminho, await gerarBlob(plano.dados))
    feitos += 1
    aoProgredir?.(feitos, caminhos.size)
  }

  return zip.generateAsync({ type: 'blob' })
}

/** As semanas presentes numa lista de planos, da mais recente para a mais antiga. */
export function semanasDisponiveis(
  planos: PlanoDaEquipe[],
): { semana: string; quantidade: number; maisRecente: string }[] {
  const porSemana = new Map<string, { quantidade: number; maisRecente: string }>()

  for (const plano of planos) {
    const semana = plano.dados.semana?.trim() || '(sem semana preenchida)'
    const atual = porSemana.get(semana)
    if (!atual) {
      porSemana.set(semana, { quantidade: 1, maisRecente: plano.atualizado_em })
    } else {
      atual.quantidade += 1
      if (plano.atualizado_em > atual.maisRecente) atual.maisRecente = plano.atualizado_em
    }
  }

  return [...porSemana.entries()]
    .map(([semana, dados]) => ({ semana, ...dados }))
    .sort((a, b) => b.maisRecente.localeCompare(a.maisRecente))
}
