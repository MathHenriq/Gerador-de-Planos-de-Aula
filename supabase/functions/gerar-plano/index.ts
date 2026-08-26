/**
 * Edge Function "gerar-plano" — a única parte do sistema que fala com a IA.
 *
 * O front-end nunca vê a chave da Anthropic: ela vive apenas nos secrets do
 * projeto Supabase. Para publicar:
 *
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *   supabase functions deploy gerar-plano
 *
 * Duas ações:
 *   { acao: "extrair", texto, contexto? }        → campos do plano de aula
 *   { acao: "bncc", contexto, catalogo: [...] }  → códigos BNCC sugeridos
 *
 * Sobre a BNCC: a função só pode escolher códigos do catálogo que o cliente
 * envia, e a resposta é filtrada de novo aqui. O cliente ainda revalida contra
 * o catálogo oficial local — código que não existir lá é descartado.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@^0.71.0'

const MODELO = 'claude-opus-5'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const INSTRUCOES = `Você ajuda instrutores do Núcleo WIT (curso de Inteligência Artificial para
alunos do Ensino Fundamental anos finais, em escolas públicas parceiras) a montar o plano da
aula semanal.

Regras:
- Escreva sempre em português do Brasil, com linguagem objetiva de plano de aula.
- Cada aula dura exatamente 90 minutos. A Estrutura da Atividade tem que somar 90 minutos.
- Não escreva em CAIXA ALTA: o documento aplica isso sozinho. Use frases normais.
- Não invente ferramentas, plataformas ou conteúdos que não estejam no material recebido;
  quando faltar informação, prefira algo genérico e coerente com o tema.
- Termine cada item de lista com ponto final.`

const ESQUEMA_PLANO = {
  type: 'object',
  properties: {
    temaDaAula: { type: 'string', description: 'Título curto da aula, no máximo 6 palavras.' },
    conteudo: { type: 'string', description: 'Conteúdo da semana, uma linha.' },
    objetivos: {
      type: 'array',
      items: { type: 'string' },
      description: 'De 2 a 4 objetivos de aprendizagem.',
    },
    resumo: {
      type: 'string',
      description: 'Parágrafo único de 3 a 5 frases resumindo a aula.',
    },
    materiais: { type: 'array', items: { type: 'string' } },
    metodologia: {
      type: 'array',
      items: { type: 'string' },
      description: 'De 2 a 4 passos descrevendo como a aula é conduzida.',
    },
    estrutura: {
      type: 'array',
      description: 'Blocos de tempo que somam exatamente 90 minutos.',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          minutos: { type: 'integer' },
          itens: { type: 'array', items: { type: 'string' } },
        },
        required: ['titulo', 'minutos', 'itens'],
        additionalProperties: false,
      },
    },
    recursos: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ferramentas e plataformas usadas na aula.',
    },
  },
  required: [
    'temaDaAula',
    'conteudo',
    'objetivos',
    'resumo',
    'materiais',
    'metodologia',
    'estrutura',
    'recursos',
  ],
  additionalProperties: false,
} as const

const ESQUEMA_BNCC = {
  type: 'object',
  properties: {
    codigos: {
      type: 'array',
      items: { type: 'string' },
      description: 'De 1 a 3 códigos, copiados exatamente do catálogo recebido.',
    },
    justificativa: { type: 'string', description: 'Uma frase explicando a escolha.' },
  },
  required: ['codigos', 'justificativa'],
  additionalProperties: false,
} as const

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Roda uma chamada de ferramenta estrita e devolve o objeto validado. */
async function extrairEstruturado(
  cliente: Anthropic,
  nome: string,
  descricao: string,
  esquema: unknown,
  prompt: string,
): Promise<Record<string, unknown>> {
  const resposta = await cliente.messages.create({
    model: MODELO,
    max_tokens: 16000,
    system: INSTRUCOES,
    output_config: { effort: 'medium' },
    tools: [
      {
        name: nome,
        description: descricao,
        strict: true,
        input_schema: esquema as never,
      },
    ],
    tool_choice: { type: 'tool', name: nome },
    messages: [{ role: 'user', content: prompt }],
  })

  if (resposta.stop_reason === 'refusal') {
    throw new Error('A IA recusou o pedido. Revise o texto enviado.')
  }

  const bloco = resposta.content.find((b) => b.type === 'tool_use')
  if (!bloco || bloco.type !== 'tool_use') {
    throw new Error('A IA não devolveu os campos estruturados.')
  }
  return bloco.input as Record<string, unknown>
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405)

  const chave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!chave) {
    return json(
      { erro: 'ANTHROPIC_API_KEY não está configurada nos secrets do projeto Supabase.' },
      503,
    )
  }

  let corpo: {
    acao?: string
    texto?: string
    contexto?: string
    catalogo?: Array<{ codigo: string; descricao: string }>
  }
  try {
    corpo = await req.json()
  } catch {
    return json({ erro: 'Corpo da requisição inválido.' }, 400)
  }

  const cliente = new Anthropic({ apiKey: chave })

  try {
    if (corpo.acao === 'extrair') {
      const texto = (corpo.texto ?? '').trim()
      if (!texto) return json({ erro: 'Nenhum conteúdo foi enviado.' }, 400)

      const plano = await extrairEstruturado(
        cliente,
        'montar_plano',
        'Organiza o conteúdo bruto da aula nos campos do plano de aula institucional.',
        ESQUEMA_PLANO,
        [
          corpo.contexto ? `Contexto da semana: ${corpo.contexto}` : '',
          'Organize o material abaixo nos campos do plano de aula.',
          '',
          '--- material da aula ---',
          texto,
        ]
          .filter(Boolean)
          .join('\n'),
      )

      return json({ plano })
    }

    if (corpo.acao === 'bncc') {
      const catalogo = corpo.catalogo ?? []
      if (catalogo.length === 0) return json({ erro: 'Catálogo BNCC não enviado.' }, 400)

      const permitidos = new Set(catalogo.map((e) => e.codigo))
      const resultado = await extrairEstruturado(
        cliente,
        'escolher_habilidades',
        'Escolhe as habilidades da BNCC que combinam com a aula, apenas dentro do catálogo dado.',
        ESQUEMA_BNCC,
        [
          'Escolha de 1 a 3 habilidades do catálogo abaixo que combinam com esta aula.',
          'Use SOMENTE códigos que aparecem no catálogo. Se nenhum servir, devolva a lista vazia.',
          '',
          `Aula: ${corpo.contexto ?? ''}`,
          '',
          '--- catálogo oficial ---',
          ...catalogo.map((e) => `${e.codigo}: ${e.descricao}`),
        ].join('\n'),
      )

      const codigos = (resultado.codigos as string[] | undefined ?? []).filter((c) =>
        permitidos.has(c),
      )
      return json({ codigos, justificativa: resultado.justificativa ?? '' })
    }

    return json({ erro: 'Ação desconhecida. Use "extrair" ou "bncc".' }, 400)
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha inesperada ao chamar a IA.'
    return json({ erro: mensagem }, 502)
  }
})
