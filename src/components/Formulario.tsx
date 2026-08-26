import { useState } from 'react'

import { CICLOS_SUGERIDOS, CURSOS, DURACAO, MINUTOS_TOTAIS } from '../constants'
import { nomeDoArquivo } from '../nomeDoDocumento'
import { diagnosticar } from '../pdf/diagnostico'
import { fechaNoTempoDaAula, somaDosBlocos } from '../plano'
import type { PlanoDeAula } from '../types'
import { EditorEstrutura } from './EditorEstrutura'
import { ListaEditavel } from './ListaEditavel'
import { baixarPdf, PreviaPdf } from './PreviaPdf'
import { SeletorBncc } from './SeletorBncc'
import { SeletorDeEscolas } from './SeletorDeEscolas'
import { Aviso, Campo, Secao } from './ui'

/**
 * Tela única do gerador: o professor preenche, confere na prévia ao lado e
 * baixa o PDF.
 */
export function Formulario({
  plano,
  aoMudar,
  aoLimpar,
}: {
  plano: PlanoDeAula
  aoMudar: (mudanca: Partial<PlanoDeAula>) => void
  aoLimpar: () => void
}) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState('')

  const faltando = camposObrigatoriosFaltando(plano)
  const tempoOk = fechaNoTempoDaAula(plano.estrutura)
  const { apertadas, estouradas } = diagnosticar(plano)

  async function baixar() {
    setBaixando(true)
    setErro('')
    try {
      await baixarPdf(plano)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui gerar o PDF.')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="pagina">
      <h1 style={{ fontSize: 24, margin: '0 0 4px' }}>Plano de aula da semana</h1>
      <p style={{ marginBottom: 22, color: 'var(--tinta-suave)' }}>
        Preencha os campos e baixe o PDF. A prévia à direita é o arquivo final — o mesmo layout
        institucional de sempre.
      </p>

      <div className="revisao">
        <div className="cartao">
          <Secao titulo="Cabeçalho">
            <div className="linha">
              <Campo rotulo="Curso">
                <select value={plano.curso} onChange={(e) => aoMudar({ curso: e.target.value })}>
                  {CURSOS.map((c) => (
                    <option value={c} key={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Ciclo">
                <input
                  type="text"
                  list="ciclos"
                  value={plano.ciclo}
                  onChange={(e) => aoMudar({ ciclo: e.target.value })}
                />
                <datalist id="ciclos">
                  {CICLOS_SUGERIDOS.map((c) => (
                    <option value={c} key={c} />
                  ))}
                </datalist>
              </Campo>
              <Campo rotulo="Semana" dica="ex.: 31/08 - 04/09">
                <input
                  type="text"
                  value={plano.semana}
                  onChange={(e) => aoMudar({ semana: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Prof.">
                <input
                  type="text"
                  value={plano.professor}
                  placeholder="Seu nome"
                  onChange={(e) => aoMudar({ professor: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Duração" dica="fixa em 90 min">
                <input type="text" value={DURACAO} readOnly />
              </Campo>
            </div>

            <Campo rotulo="Conteúdo" dica="a linha ao lado do ciclo">
              <input
                type="text"
                value={plano.conteudo}
                onChange={(e) => aoMudar({ conteudo: e.target.value })}
              />
            </Campo>
          </Secao>

          <Secao
            titulo="Escolas"
            explica="Marque na ordem da semana — o primeiro marcado é o de segunda-feira."
          >
            <SeletorDeEscolas
              escolhidas={plano.escolas}
              aoMudar={(escolas) => aoMudar({ escolas })}
            />
          </Secao>

          <Secao titulo="Tema da aula">
            <input
              type="text"
              value={plano.temaDaAula}
              placeholder="Ex.: Produção do projeto"
              onChange={(e) => aoMudar({ temaDaAula: e.target.value })}
            />
          </Secao>

          <Secao
            titulo="Objetivos de aprendizagem"
            explica="Um objetivo por item. Aparecem como lista com marcadores."
          >
            <ListaEditavel
              itens={plano.objetivos}
              aoMudar={(objetivos) => aoMudar({ objetivos })}
              placeholder="Ex.: Compreender os conceitos básicos de front-end…"
              rotuloAdicionar="Adicionar objetivo"
            />
          </Secao>

          <Secao
            titulo="Habilidades da aula (BNCC)"
            explica="Só entram códigos que existem no catálogo oficial da BNCC Computação — a descrição usada é sempre a oficial."
          >
            <SeletorBncc
              habilidades={plano.habilidades}
              aoMudar={(habilidades) => aoMudar({ habilidades })}
            />
          </Secao>

          <Secao titulo="Materiais necessários">
            <ListaEditavel
              itens={plano.materiais.length ? plano.materiais : ['']}
              aoMudar={(materiais) => aoMudar({ materiais })}
              placeholder="Ex.: Computador"
              rotuloAdicionar="Adicionar material"
              linhas={1}
            />
          </Secao>

          <Secao titulo="Metodologia">
            <ListaEditavel
              itens={plano.metodologia}
              aoMudar={(metodologia) => aoMudar({ metodologia })}
              placeholder="Como a aula é conduzida"
              rotuloAdicionar="Adicionar passo"
            />
          </Secao>

          <Secao titulo="Resumo da aula" explica="Um parágrafo corrido, página 2 do PDF.">
            <textarea
              rows={5}
              value={plano.resumo}
              placeholder="Aula introdutória sobre…"
              onChange={(e) => aoMudar({ resumo: e.target.value })}
            />
          </Secao>

          <Secao
            titulo="Estrutura da atividade"
            etiqueta={
              <span className={`etiqueta ${tempoOk ? 'ok' : 'atencao'}`}>
                {somaDosBlocos(plano.estrutura)}/{MINUTOS_TOTAIS} min
              </span>
            }
          >
            <EditorEstrutura
              blocos={plano.estrutura}
              aoMudar={(estrutura) => aoMudar({ estrutura })}
            />
          </Secao>

          <Secao titulo="Recursos necessários" explica="Ferramentas e plataformas, página 3.">
            <ListaEditavel
              itens={plano.recursos}
              aoMudar={(recursos) => aoMudar({ recursos })}
              placeholder="Ex.: VSCode"
              rotuloAdicionar="Adicionar recurso"
              linhas={1}
            />
          </Secao>

          <div className="rodape-form">
            <button type="button" className="botao secundario" onClick={aoLimpar}>
              Começar um plano novo
            </button>
          </div>
        </div>

        <div className="previa">
          {faltando.length ? (
            <Aviso tipo="atencao">
              Ainda falta preencher: <strong>{faltando.join(', ')}</strong>.
            </Aviso>
          ) : null}

          {!tempoOk ? (
            <Aviso tipo="atencao">
              A estrutura da atividade soma {somaDosBlocos(plano.estrutura)} min — toda aula tem{' '}
              {MINUTOS_TOTAIS} min.
            </Aviso>
          ) : null}

          {estouradas.length ? (
            <Aviso tipo="erro">
              O texto de <strong>{estouradas.join(', ')}</strong> não cabe na caixa nem no menor
              tamanho de fonte, e vai sair cortado no PDF. Encurte o conteúdo.
            </Aviso>
          ) : null}

          {apertadas.length ? (
            <Aviso tipo="atencao">
              O texto de <strong>{apertadas.join(', ')}</strong> passou do tamanho da caixa e foi
              reduzido para caber. Se ficar pequeno demais, encurte o conteúdo.
            </Aviso>
          ) : null}

          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

          <div className="acoes">
            <button type="button" className="botao" onClick={baixar} disabled={baixando}>
              {baixando ? 'Gerando…' : 'Baixar PDF'}
            </button>
          </div>

          <p className="nome-arquivo" title={nomeDoArquivo(plano)}>
            Sai como <strong>{nomeDoArquivo(plano)}</strong>
          </p>

          <PreviaPdf plano={plano} />
        </div>
      </div>
    </div>
  )
}

function camposObrigatoriosFaltando(plano: PlanoDeAula): string[] {
  const faltando: string[] = []
  if (!plano.semana.trim()) faltando.push('semana')
  if (!plano.professor.trim()) faltando.push('professor')
  if (plano.escolas.length === 0) faltando.push('escolas')
  if (!plano.temaDaAula.trim()) faltando.push('tema da aula')
  if (!plano.objetivos.some((o) => o.trim())) faltando.push('objetivos')
  if (plano.habilidades.length === 0) faltando.push('habilidades da BNCC')
  if (!plano.resumo.trim()) faltando.push('resumo')
  if (plano.estrutura.length === 0) faltando.push('estrutura da atividade')
  return faltando
}
