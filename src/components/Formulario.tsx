import { useEffect, useState } from 'react'

import {
  CICLOS,
  CURSOS,
  DURACOES_DISPONIVEIS,
  formatarDuracao,
  nomeDaEquipe,
} from '../constants'
import { nomeDoArquivo } from '../nomeDoDocumento'
import { diagnosticar } from '../pdf/diagnostico'
import { fechaNoTempoDaAula, somaDosBlocos } from '../plano'
import { rotuloDaSemana, semanaPermitida, semanasPermitidas } from '../semanas'
import {
  assumirSemana,
  liberarSemana,
  nomeDoResponsavel,
  type ResponsavelDaSemana,
} from '../supabase/semanas'
import type { PlanoDeAula } from '../types'
import { CampoHabilidades } from './CampoHabilidades'
import { EditorEstrutura } from './EditorEstrutura'
import { EditorLinks } from './EditorLinks'
import { ListaEditavel } from './ListaEditavel'
import { baixarPdf, PreviaPdf } from './PreviaPdf'
import { SeletorDeEscolas } from './SeletorDeEscolas'
import { confirmacaoDeResponsavel } from './SemanasDaEquipe'
import { Aviso, Campo, Dica, Secao } from './ui'

const QUANDO = ['esta semana', 'próxima', 'daqui a 2 semanas']

/**
 * Tela única do gerador: o professor preenche, confere na prévia ao lado e
 * baixa o PDF.
 */
export function Formulario({
  plano,
  aoMudar,
  aoLimpar,
  planoSalvoId,
  aoSalvar,
  minhasEquipes = [],
  equipeCompartilhada = null,
  aoMudarEquipeCompartilhada,
  contaCarregada = false,
  meuId = '',
  responsaveis = [],
  aoMudarResponsaveis,
}: {
  plano: PlanoDeAula
  aoMudar: (mudanca: Partial<PlanoDeAula>) => void
  aoLimpar: () => void
  /** `null` quando o plano em edição ainda não foi salvo na conta. */
  planoSalvoId?: string | null
  /** Ausente quando não há login (ver `App.tsx`) — some o botão "Salvar". */
  aoSalvar?: (plano: PlanoDeAula) => Promise<void>
  /** Equipes do professor: as opções de "compartilhar com". */
  minhasEquipes?: string[]
  /** Equipe com quem este plano fica compartilhado; `null` = somente ele. */
  equipeCompartilhada?: string | null
  aoMudarEquipeCompartilhada?: (equipeId: string | null) => void
  /** O perfil e as equipes do professor já vieram do banco? */
  contaCarregada?: boolean
  meuId?: string
  /** Quem assumiu cada semana aberta nas minhas equipes — o "plano mestre". */
  responsaveis?: ResponsavelDaSemana[]
  aoMudarResponsaveis?: () => void
}) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState('')
  const [salvoAgora, setSalvoAgora] = useState(false)
  const [assumindo, setAssumindo] = useState(false)

  const faltando = camposObrigatoriosFaltando(plano)
  const tempoOk = fechaNoTempoDaAula(plano.estrutura, plano.minutos)
  const { apertadas, estouradas } = diagnosticar(plano)

  const semanas = semanasPermitidas()
  const semanaNaJanela = semanaPermitida(plano.semanaInicio)
  const responsavelDe = (equipeId: string | null, inicio: string) =>
    equipeId
      ? responsaveis.find((r) => r.equipe_id === equipeId && r.semana_inicio === inicio)
      : undefined
  const responsavel = responsavelDe(equipeCompartilhada, plano.semanaInicio)
  const souResponsavel = !!responsavel && responsavel.professor_id === meuId

  // O plano da equipe só é salvo pelo responsável da semana — o banco barra
  // de qualquer jeito, mas aqui o botão já explica em vez de falhar.
  const bloqueioEquipe: string | null = !equipeCompartilhada
    ? null
    : !plano.semanaInicio
      ? 'Escolha a semana no cabeçalho para salvar o plano da equipe.'
      : !semanaNaJanela
        ? 'Plano da equipe só pode ser criado ou alterado na semana atual e nas duas próximas.'
        : !responsavel
          ? 'Confirme que você é o responsável por esta semana para salvar o plano da equipe.'
          : !souResponsavel
            ? `O responsável por esta semana é ${nomeDoResponsavel(responsavel)}.`
            : null

  function rotuloDaOpcao(inicio: string, rotulo: string, i: number): string {
    const r = responsavelDe(equipeCompartilhada, inicio)
    const dono = !r ? '' : r.professor_id === meuId ? ' · você é o responsável' : ` · com ${nomeDoResponsavel(r)}`
    return `${rotulo} (${QUANDO[i]})${dono}`
  }

  async function assumir() {
    if (!equipeCompartilhada || !plano.semanaInicio) return
    if (!confirm(confirmacaoDeResponsavel(equipeCompartilhada, rotuloDaSemana(plano.semanaInicio))))
      return
    setAssumindo(true)
    setErroSalvar('')
    try {
      await assumirSemana(equipeCompartilhada, plano.semanaInicio)
    } catch (e) {
      setErroSalvar(e instanceof Error ? e.message : 'Não consegui assumir a semana.')
    } finally {
      setAssumindo(false)
      aoMudarResponsaveis?.()
    }
  }

  async function largar() {
    if (!equipeCompartilhada || !plano.semanaInicio) return
    if (!confirm('Largar esta semana? Outro professor da equipe poderá assumir.')) return
    setAssumindo(true)
    setErroSalvar('')
    try {
      await liberarSemana(equipeCompartilhada, plano.semanaInicio)
    } catch (e) {
      setErroSalvar(e instanceof Error ? e.message : 'Não consegui largar a semana.')
    } finally {
      setAssumindo(false)
      aoMudarResponsaveis?.()
    }
  }

  // Uma edição depois de salvar torna o "Plano salvo" desatualizado.
  useEffect(() => setSalvoAgora(false), [plano])

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

  async function salvar() {
    if (!aoSalvar) return
    setSalvando(true)
    setErroSalvar('')
    setSalvoAgora(false)
    try {
      await aoSalvar(plano)
      setSalvoAgora(true)
    } catch (e) {
      setErroSalvar(e instanceof Error ? e.message : 'Não consegui salvar o plano.')
    } finally {
      setSalvando(false)
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
                <select value={plano.ciclo} onChange={(e) => aoMudar({ ciclo: e.target.value })}>
                  {CICLOS.map((c) => (
                    <option value={c} key={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Semana" dica="a atual ou as duas próximas">
                <select
                  value={plano.semanaInicio || (plano.semana ? 'antiga' : '')}
                  onChange={(e) =>
                    aoMudar({
                      semanaInicio: e.target.value,
                      semana: rotuloDaSemana(e.target.value),
                    })
                  }
                >
                  <option value="" disabled>
                    Escolha a semana
                  </option>
                  {/* Plano antigo ou importado: a semana dele continua aparecendo,
                      mas não dá para escolhê-la de novo. */}
                  {plano.semana && !semanaNaJanela ? (
                    <option value={plano.semanaInicio || 'antiga'} disabled>
                      {plano.semana} (fora do prazo)
                    </option>
                  ) : null}
                  {semanas.map((s, i) => (
                    <option value={s.inicio} key={s.inicio}>
                      {rotuloDaOpcao(s.inicio, s.rotulo, i)}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Prof">
                <input
                  type="text"
                  value={plano.professor}
                  placeholder="Seu nome"
                  onChange={(e) => aoMudar({ professor: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Duração">
                <select
                  value={plano.minutos}
                  onChange={(e) => aoMudar({ minutos: Number(e.target.value) })}
                >
                  {DURACOES_DISPONIVEIS.map((min) => (
                    <option value={min} key={min}>
                      {formatarDuracao(min)}
                    </option>
                  ))}
                </select>
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

          <Secao titulo="Resumo da aula" explica="Um parágrafo corrido, página 1 do PDF.">
            <textarea
              rows={5}
              value={plano.resumo}
              placeholder="Aula introdutória sobre…"
              onChange={(e) => aoMudar({ resumo: e.target.value })}
            />
          </Secao>

          <Secao titulo="Materiais necessários">
            <Dica>
              Aqui vão os equipamentos: computador, tablet, celular, fones, mouse e teclado.
              Sites e plataformas (Canva, VSCode…) vão em <strong>Links necessários</strong>, no
              fim do plano.
            </Dica>
            <ListaEditavel
              itens={plano.materiais.length ? plano.materiais : ['']}
              aoMudar={(materiais) => aoMudar({ materiais })}
              placeholder="Ex.: Computador"
              rotuloAdicionar="Adicionar material"
              descricaoDoItem="material"
              linhas={1}
            />
          </Secao>

          <Secao
            titulo="Objetivos de aprendizagem"
            explica="Um objetivo por item — cada um sai com a sua bolinha no PDF."
          >
            <ListaEditavel
              itens={plano.objetivos}
              aoMudar={(objetivos) => aoMudar({ objetivos })}
              placeholder="Ex.: Compreender os conceitos básicos de front-end…"
              rotuloAdicionar="Adicionar objetivo"
              descricaoDoItem="objetivo"
              comMarcador
            />
          </Secao>

          <Secao
            titulo="Habilidades da aula (BNCC)"
            explica='Digite o código e a descrição — o código precisa começar com "EF" (Ensino Fundamental).'
          >
            <CampoHabilidades
              habilidades={plano.habilidades}
              aoMudar={(habilidades) => aoMudar({ habilidades })}
            />
          </Secao>

          <Secao titulo="Metodologia" explica="Página 2 do PDF.">
            <Dica>
              A metodologia é um <strong>texto corrido e estruturado</strong> que explica como a
              aula acontece — como você apresenta o tema, como a turma trabalha, como fecha a aula
              e por quê. Não é uma lista de tópicos: escreva frases completas, em parágrafos.
            </Dica>
            <ListaEditavel
              itens={plano.metodologia}
              aoMudar={(metodologia) => aoMudar({ metodologia })}
              placeholder="Ex.: A aula começa retomando o que a turma produziu na semana anterior, para… Em seguida, …"
              rotuloAdicionar="Adicionar parágrafo"
              descricaoDoItem="parágrafo"
              linhas={4}
            />
          </Secao>

          <Secao
            titulo="Estrutura da atividade"
            etiqueta={
              <span className={`etiqueta ${tempoOk ? 'ok' : 'atencao'}`}>
                {somaDosBlocos(plano.estrutura)}/{plano.minutos} min
              </span>
            }
          >
            <Dica>
              Descreva cada etapa com detalhe: o que o professor faz, o que os alunos fazem, qual
              é a atividade, as regras e o que se espera que a turma entregue. Quem ler o plano
              tem que conseguir dar a aula só com ele.
            </Dica>
            <EditorEstrutura
              blocos={plano.estrutura}
              minutosTotais={plano.minutos}
              aoMudar={(estrutura) => aoMudar({ estrutura })}
            />
          </Secao>

          <Secao titulo="Links necessários" explica="Sites e plataformas usados na aula, página 3.">
            <Dica>
              Só sites e plataformas, com o nome e o link (ex.: Canva —
              https://www.canva.com). Tablet, computador e outros dispositivos
              não entram aqui: eles vão em <strong>Materiais necessários</strong>.
            </Dica>
            <EditorLinks links={plano.links} aoMudar={(links) => aoMudar({ links })} />
          </Secao>

          <Secao titulo="Observação" explica="Campo livre, opcional — fecha a página 3.">
            <textarea
              rows={3}
              value={plano.observacao}
              placeholder="Alguma observação sobre a aula, a turma ou o núcleo…"
              onChange={(e) => aoMudar({ observacao: e.target.value })}
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
              A estrutura da atividade soma {somaDosBlocos(plano.estrutura)} min — a duração
              escolhida é {plano.minutos} min.
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
          {erroSalvar ? <Aviso tipo="erro">{erroSalvar}</Aviso> : null}
          {salvoAgora ? (
            <Aviso tipo="info">
              Plano salvo na sua conta
              {equipeCompartilhada
                ? ` e compartilhado com a equipe ${nomeDaEquipe(equipeCompartilhada)}.`
                : ' — somente você vê.'}
            </Aviso>
          ) : null}

          {aoSalvar && contaCarregada && !minhasEquipes.length ? (
            <Aviso tipo="info">
              Você ainda não está em nenhuma equipe, então este plano fica só na sua conta. Peça à
              Gestão para incluir você na equipe do seu curso — aí aparece aqui a opção de
              compartilhar.
            </Aviso>
          ) : null}

          {aoSalvar && minhasEquipes.length && aoMudarEquipeCompartilhada ? (
            <div className="compartilhamento">
              <Campo
                rotulo="Ao salvar"
                dica="quem mais enxerga este plano"
              >
                <select
                  value={equipeCompartilhada ?? ''}
                  onChange={(e) => aoMudarEquipeCompartilhada(e.target.value || null)}
                >
                  <option value="">Manter somente para mim</option>
                  {minhasEquipes.map((id) => (
                    <option value={id} key={id}>
                      Compartilhar com a equipe {nomeDaEquipe(id)}
                    </option>
                  ))}
                </select>
              </Campo>
              <p className="explica">
                Compartilhado, este vira o plano da equipe para a semana — um só por equipe. Os
                colegas o veem em “Planos da equipe” e fazem uma cópia com o nome e os núcleos
                deles; a cópia é um plano à parte.
              </p>

              {equipeCompartilhada && plano.semanaInicio && semanaNaJanela ? (
                !responsavel ? (
                  <div className="responsavel-semana">
                    <p>
                      Ninguém assumiu a semana <strong>{plano.semana}</strong> da equipe{' '}
                      {nomeDaEquipe(equipeCompartilhada)} ainda.
                    </p>
                    <button
                      type="button"
                      className="botao"
                      onClick={assumir}
                      disabled={assumindo}
                    >
                      {assumindo ? 'Assumindo…' : 'Sou o professor responsável por esta semana'}
                    </button>
                  </div>
                ) : souResponsavel ? (
                  <Aviso tipo="info">
                    Você é o responsável pelo plano da semana {plano.semana} da equipe{' '}
                    {nomeDaEquipe(equipeCompartilhada)}. Os colegas acompanham, mas só você altera.
                    {!planoSalvoId ? (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="botao discreto"
                          onClick={largar}
                          disabled={assumindo}
                        >
                          Largar a semana
                        </button>
                      </>
                    ) : null}
                  </Aviso>
                ) : (
                  <Aviso tipo="atencao">
                    <strong>{nomeDoResponsavel(responsavel)}</strong> é o responsável pelo plano
                    da semana {plano.semana} da equipe {nomeDaEquipe(equipeCompartilhada)} — só
                    essa pessoa cria e altera esse plano. Para mudar algo, converse com o grupo.
                    Quando o plano estiver salvo, faça a sua cópia em “Planos da equipe”.
                  </Aviso>
                )
              ) : null}
            </div>
          ) : null}

          <div className="acoes">
            <button type="button" className="botao" onClick={baixar} disabled={baixando}>
              {baixando ? 'Gerando…' : 'Baixar PDF'}
            </button>
            {aoSalvar ? (
              <button
                type="button"
                className="botao secundario"
                onClick={salvar}
                disabled={salvando || !!bloqueioEquipe}
                title={bloqueioEquipe ?? undefined}
              >
                {salvando ? 'Salvando…' : planoSalvoId ? 'Atualizar plano salvo' : 'Salvar na minha conta'}
              </button>
            ) : null}
          </div>

          {aoSalvar && bloqueioEquipe ? <p className="dica">{bloqueioEquipe}</p> : null}

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
