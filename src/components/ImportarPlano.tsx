import { useState } from 'react'

import { importarPlanoDePdf, type Importacao } from '../importar'
import { somaDosBlocos } from '../plano'
import type { PlanoDeAula } from '../types'
import { Aviso } from './ui'

/**
 * Importa um plano a partir do PDF de outro sistema.
 *
 * O que é lido não vai direto para o banco: cai no formulário, para o
 * professor conferir e salvar. É de propósito — o reconhecimento é bom, mas o
 * PDF perde a caixa das letras, e quem assina o plano tem que ver antes.
 */
export function ImportarPlano({
  aoFechar,
  aoUsar,
}: {
  aoFechar: () => void
  aoUsar: (plano: PlanoDeAula) => void
}) {
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<Importacao | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return
    setLendo(true)
    setErro('')
    setResultado(null)
    setNomeArquivo(arquivo.name)
    try {
      setResultado(await importarPlanoDePdf(arquivo))
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : 'Não consegui ler esse PDF. Ele precisa ser um plano no modelo do Núcleo WIT.',
      )
    } finally {
      setLendo(false)
    }
  }

  const plano = resultado?.plano

  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div className="modal-cartao largo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Importar plano de um PDF</h2>
          <button type="button" className="botao icone" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        <p className="explica">
          Escolha o PDF do plano (o modelo do Núcleo WIT, de 3 páginas). Os campos são
          reconhecidos pela posição no documento e caem no formulário prontos para conferir —
          nada é salvo sem você mandar.
        </p>

        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={lendo}
          onChange={(e) => escolher(e.target.files?.[0])}
          style={{ marginTop: 12 }}
        />

        {lendo ? <p className="explica">Lendo {nomeArquivo}…</p> : null}
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

        {plano && resultado ? (
          <>
            <div className="previa-pastas" style={{ marginTop: 16 }}>
              <p className="explica">
                <strong>Reconhecido em {nomeArquivo}</strong>
              </p>
              <dl className="resumo-plano">
                <dt>Curso</dt>
                <dd>{plano.curso || '—'}</dd>
                <dt>Ciclo</dt>
                <dd>{plano.ciclo || '—'}</dd>
                <dt>Semana</dt>
                <dd>{plano.semana || '—'}</dd>
                <dt>Prof.</dt>
                <dd>{plano.professor || '—'}</dd>
                <dt>Tema</dt>
                <dd>{plano.temaDaAula || '—'}</dd>
                <dt>Núcleos</dt>
                <dd>{plano.escolas.length ? plano.escolas.join(', ') : '—'}</dd>
                <dt>Listas</dt>
                <dd>
                  {plano.objetivos.filter((o) => o.trim()).length} objetivo(s),{' '}
                  {plano.habilidades.length} habilidade(s),{' '}
                  {plano.materiais.filter((m) => m.trim()).length} material(is),{' '}
                  {plano.metodologia.filter((m) => m.trim()).length} passo(s) de metodologia,{' '}
                  {plano.recursos.filter((r) => r.trim()).length} recurso(s)
                </dd>
                <dt>Estrutura</dt>
                <dd>
                  {plano.estrutura.length} bloco(s), somando {somaDosBlocos(plano.estrutura)} min
                </dd>
              </dl>
            </div>

            {resultado.avisos.map((aviso, i) => (
              <Aviso tipo="atencao" key={i}>
                {aviso}
              </Aviso>
            ))}

            <div className="acoes" style={{ marginTop: 14 }}>
              <button type="button" className="botao" onClick={() => aoUsar(plano)}>
                Usar este plano no formulário
              </button>
              <button type="button" className="botao secundario" onClick={aoFechar}>
                Cancelar
              </button>
            </div>
            <p className="explica">
              O que estiver preenchido agora na tela é substituído por este plano.
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
