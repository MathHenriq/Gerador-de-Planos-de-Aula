/**
 * Camada de IA — isolada de propósito.
 *
 * Todo o resto do app funciona sem ela: o modo manual não passa por aqui.
 * Quando a chave da Anthropic estiver configurada no Supabase, basta preencher
 * VITE_IA_ENDPOINT no `.env` e o modo IA liga sozinho.
 */
import { CATALOGO_BNCC } from '../bncc/catalogo'
import { validarCodigos, type ResultadoValidacao } from '../bncc/validar'
import { MINUTOS_TOTAIS } from '../constants'
import type { BlocoAtividade, PlanoDeAula } from '../types'

const ENDPOINT = import.meta.env.VITE_IA_ENDPOINT ?? ''
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/** A interface usa isso para decidir se mostra o modo IA como disponível. */
export function iaConfigurada(): boolean {
  return Boolean(ENDPOINT)
}

export class ErroDeIA extends Error {}

async function chamar<T>(corpo: unknown): Promise<T> {
  if (!ENDPOINT) {
    throw new ErroDeIA(
      'O modo IA ainda não está configurado. Defina VITE_IA_ENDPOINT apontando para a ' +
        'Edge Function do Supabase (e a chave da Anthropic nos secrets do projeto).',
    )
  }

  let resposta: Response
  try {
    resposta = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ANON_KEY ? { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } : {}),
      },
      body: JSON.stringify(corpo),
    })
  } catch {
    throw new ErroDeIA('Não deu para falar com o servidor da IA. Verifique sua conexão.')
  }

  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    throw new ErroDeIA(dados?.erro ?? `A IA respondeu com erro ${resposta.status}.`)
  }
  return dados as T
}

/** Campos que a IA preenche — o cabeçalho continua sendo do professor. */
export type PlanoSugerido = Pick<
  PlanoDeAula,
  | 'temaDaAula'
  | 'conteudo'
  | 'objetivos'
  | 'resumo'
  | 'materiais'
  | 'metodologia'
  | 'estrutura'
  | 'recursos'
>

/**
 * Modo IA: recebe o texto bruto que o professor colou e devolve os campos
 * separados. O professor revisa tudo antes de gerar o PDF.
 */
export async function extrairPlano(texto: string, contexto?: string): Promise<PlanoSugerido> {
  const { plano } = await chamar<{ plano: PlanoSugerido }>({
    acao: 'extrair',
    texto,
    contexto,
  })
  return normalizarSugestao(plano)
}

export interface SugestaoBncc extends ResultadoValidacao {
  justificativa: string
}

/**
 * Sugestão de habilidades BNCC.
 *
 * O catálogo oficial vai junto no pedido e a resposta é revalidada aqui:
 * qualquer código que não exista no catálogo é descartado, nunca "aproveitado".
 */
export async function sugerirBncc(contexto: string): Promise<SugestaoBncc> {
  const { codigos, justificativa } = await chamar<{ codigos: string[]; justificativa: string }>({
    acao: 'bncc',
    contexto,
    catalogo: CATALOGO_BNCC.map(({ codigo, descricao }) => ({ codigo, descricao })),
  })

  return { ...validarCodigos(codigos ?? []), justificativa: justificativa ?? '' }
}

/* ── saneamento do que volta da IA ────────────────────────────────────────── */

function listaDeTextos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  return valor.map((v) => String(v ?? '').trim()).filter(Boolean)
}

function normalizarSugestao(bruto: PlanoSugerido): PlanoSugerido {
  const estrutura = normalizarEstrutura(bruto?.estrutura)
  return {
    temaDaAula: String(bruto?.temaDaAula ?? '').trim(),
    conteudo: String(bruto?.conteudo ?? '').trim(),
    objetivos: listaDeTextos(bruto?.objetivos),
    resumo: String(bruto?.resumo ?? '').trim(),
    materiais: listaDeTextos(bruto?.materiais),
    metodologia: listaDeTextos(bruto?.metodologia),
    estrutura,
    recursos: listaDeTextos(bruto?.recursos),
  }
}

function normalizarEstrutura(valor: unknown): BlocoAtividade[] {
  if (!Array.isArray(valor)) return []
  return valor
    .map((b) => ({
      titulo: String((b as BlocoAtividade)?.titulo ?? '').trim(),
      minutos: Math.max(0, Math.round(Number((b as BlocoAtividade)?.minutos) || 0)),
      itens: listaDeTextos((b as BlocoAtividade)?.itens),
    }))
    .filter((b) => b.titulo || b.itens.length)
}

/** Soma dos blocos — a interface avisa quando não fecha os 90 minutos. */
export function somaDosBlocos(estrutura: BlocoAtividade[]): number {
  return estrutura.reduce((total, b) => total + (Number(b.minutos) || 0), 0)
}

export function fechaNoTempoDaAula(estrutura: BlocoAtividade[]): boolean {
  return somaDosBlocos(estrutura) === MINUTOS_TOTAIS
}
