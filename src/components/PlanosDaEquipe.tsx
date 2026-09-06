import { useEffect, useMemo, useState } from 'react'

import { nomeDaEquipe } from '../constants'
import { atualizarMeuPerfil, type Perfil } from '../supabase/equipes'
import {
  copiarPlanoParaMim,
  listarPlanosDaEquipe,
  type PlanoDaEquipe,
  type PlanoSalvo,
} from '../supabase/planos'
import { SeletorDeEscolas } from './SeletorDeEscolas'
import { Aviso, Campo } from './ui'

function dataFormatada(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function tituloDoPlano(plano: PlanoDaEquipe): string {
  const tema = plano.dados.temaDaAula?.trim()
  return tema || plano.dados.curso || 'Plano sem tema'
}

/** "Compartilhado por Nicolas Correa" — cai no e-mail quando não há nome. */
function autoria(plano: PlanoDaEquipe, meuId: string): string {
  if (plano.professor_id === meuId) return 'Compartilhado por você'
  const nome = plano.autor_nome?.trim() || plano.dados.professor?.trim() || plano.autor_email || ''
  return nome ? `Compartilhado por ${nome}` : 'Compartilhado por um colega'
}

/**
 * Os planos que os colegas de equipe compartilharam.
 *
 * O caminho é: lista → abre um plano → "Fazer uma cópia para mim". A cópia
 * entra na conta de quem copiou já com o nome dele e com os núcleos que ele
 * costuma atender — o resto do conteúdo é o que o colega escreveu, que era
 * exatamente o trabalho que antes se refazia campo por campo.
 */
export function PlanosDaEquipe({
  minhasEquipes,
  perfil,
  aoFechar,
  aoAbrirPlano,
}: {
  minhasEquipes: string[]
  perfil: Perfil
  aoFechar: () => void
  aoAbrirPlano: (plano: PlanoSalvo) => void
}) {
  const [planos, setPlanos] = useState<PlanoDaEquipe[] | null>(null)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState<string>('todas')
  const [aberto, setAberto] = useState<PlanoDaEquipe | null>(null)
  const [copiando, setCopiando] = useState(false)
  const [nome, setNome] = useState(perfil.nome)
  const [escolas, setEscolas] = useState<string[]>(perfil.escolas_padrao)

  useEffect(() => {
    listarPlanosDaEquipe()
      .then(setPlanos)
      .catch((e) =>
        setErro(e instanceof Error ? e.message : 'Não consegui carregar os planos da equipe.'),
      )
  }, [])

  const visiveis = useMemo(
    () => (planos ?? []).filter((p) => filtro === 'todas' || p.equipe_id === filtro),
    [planos, filtro],
  )

  async function criarCopia() {
    if (!aberto) return
    setCopiando(true)
    setErro('')
    try {
      const copia = await copiarPlanoParaMim(aberto, { professor: nome.trim(), escolas })
      // O que ele escolheu aqui vira o padrão da próxima cópia — é assim que
      // "as escolas que ele costuma colocar" se mantêm atualizadas sozinhas.
      await atualizarMeuPerfil({ nome: nome.trim(), escolas_padrao: escolas }).catch(() => {})
      aoAbrirPlano(copia)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui criar a cópia.')
    } finally {
      setCopiando(false)
    }
  }

  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div className="modal-cartao largo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>{aberto ? tituloDoPlano(aberto) : 'Planos da equipe'}</h2>
          <button type="button" className="botao icone" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

        {aberto ? (
          <div className="plano-detalhe">
            <button type="button" className="botao discreto" onClick={() => setAberto(null)}>
              ← Voltar para a lista
            </button>

            <p className="explica">
              {autoria(aberto, perfil.id)} · {nomeDaEquipe(aberto.equipe_id)}
              {aberto.dados.semana ? ` · Semana ${aberto.dados.semana}` : ''}
            </p>

            <dl className="resumo-plano">
              <dt>Curso</dt>
              <dd>{aberto.dados.curso || '—'}</dd>
              <dt>Ciclo</dt>
              <dd>{aberto.dados.ciclo || '—'}</dd>
              <dt>Conteúdo</dt>
              <dd>{aberto.dados.conteudo || '—'}</dd>
              <dt>Resumo</dt>
              <dd>{aberto.dados.resumo || '—'}</dd>
              <dt>Objetivos</dt>
              <dd>
                <ul>
                  {aberto.dados.objetivos.filter((o) => o.trim()).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </dd>
              <dt>Estrutura</dt>
              <dd>
                <ul>
                  {aberto.dados.estrutura.map((bloco, i) => (
                    <li key={i}>
                      {bloco.titulo} — {bloco.minutos} min
                    </li>
                  ))}
                </ul>
              </dd>
            </dl>

            {aberto.professor_id === perfil.id ? (
              <div className="cartao-copia">
                <h3>Este plano é seu</h3>
                <p className="explica">
                  Ele está compartilhado com a equipe {nomeDaEquipe(aberto.equipe_id)} — é assim
                  que os colegas o enxergam. Para mudar o conteúdo ou deixar de compartilhar,
                  abra e edite normalmente.
                </p>
                <div className="acoes" style={{ marginTop: 12 }}>
                  <button type="button" className="botao" onClick={() => aoAbrirPlano(aberto)}>
                    Abrir para editar
                  </button>
                </div>
              </div>
            ) : (
              <div className="cartao-copia">
                <h3>Fazer uma cópia para mim</h3>
                <p className="explica">
                  A cópia entra na sua conta com todo o conteúdo do plano — trocando só o professor e
                  os núcleos pelos seus. Ela nasce <strong>somente sua</strong>: compartilhe depois, se
                  quiser.
                </p>

                <Campo rotulo="Prof." dica="sai no cabeçalho do PDF">
                  <input
                    type="text"
                    value={nome}
                    placeholder="Seu nome e sobrenome"
                    onChange={(e) => setNome(e.target.value)}
                  />
                </Campo>

                <p className="explica" style={{ marginTop: 12 }}>
                  Seus núcleos, na ordem da sua semana:
                </p>
                <SeletorDeEscolas escolhidas={escolas} aoMudar={setEscolas} />

                <div className="acoes" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="botao"
                    onClick={criarCopia}
                    disabled={copiando || !nome.trim() || escolas.length === 0}
                  >
                    {copiando ? 'Copiando…' : 'Criar minha cópia'}
                  </button>
                  {!nome.trim() || escolas.length === 0 ? (
                    <span className="dica">Preencha o nome e marque ao menos um núcleo.</span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {minhasEquipes.length > 1 ? (
              <div className="filtro-equipes">
                <button
                  type="button"
                  className={`chip${filtro === 'todas' ? ' ativo' : ''}`}
                  onClick={() => setFiltro('todas')}
                >
                  Todas
                </button>
                {minhasEquipes.map((id) => (
                  <button
                    type="button"
                    key={id}
                    className={`chip${filtro === id ? ' ativo' : ''}`}
                    onClick={() => setFiltro(id)}
                  >
                    {nomeDaEquipe(id)}
                  </button>
                ))}
              </div>
            ) : null}

            {!planos ? (
              <p className="explica">Carregando…</p>
            ) : minhasEquipes.length === 0 ? (
              <p className="explica">
                Você ainda não faz parte de nenhuma equipe — fale com a Gestão para ser incluído.
              </p>
            ) : visiveis.length === 0 ? (
              <p className="explica">
                Ainda não há plano compartilhado
                {filtro === 'todas' ? ' com as suas equipes' : ` com a equipe ${nomeDaEquipe(filtro)}`}.
                Quando alguém (você inclusive) marcar “Compartilhar com a equipe” ao salvar, o
                plano aparece aqui.
              </p>
            ) : (
              <ul className="lista-planos">
                {visiveis.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{tituloDoPlano(p)}</strong>
                      <span className="lista-planos-data">
                        {autoria(p, perfil.id)} · {nomeDaEquipe(p.equipe_id)}
                        {p.dados.semana ? ` · ${p.dados.semana}` : ''} · {dataFormatada(p.atualizado_em)}
                      </span>
                    </div>
                    <div className="lista-planos-acoes">
                      {p.professor_id === perfil.id ? (
                        <span className="etiqueta ok">seu</span>
                      ) : null}
                      <button
                        type="button"
                        className="botao secundario"
                        onClick={() => {
                          setAberto(p)
                          setNome(perfil.nome)
                          setEscolas(perfil.escolas_padrao)
                        }}
                      >
                        Abrir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
