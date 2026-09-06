import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'

import logoMicroKa from './assets/logo-micro-ka.png'
import { Auth } from './components/Auth'
import { Formulario } from './components/Formulario'
import { Gestao } from './components/Gestao'
import { ImportarPlano } from './components/ImportarPlano'
import { MeusPlanos } from './components/MeusPlanos'
import { PlanosDaEquipe } from './components/PlanosDaEquipe'
import { RedefinirSenha } from './components/RedefinirSenha'
import { Aviso } from './components/ui'
import { EQUIPE_GESTAO, planoVazio } from './constants'
import { planoDeAmostra } from './planoDeAmostra'
import { supabase } from './supabase/client'
import { carregarMinhaConta, type MinhaConta } from './supabase/equipes'
import { salvarPlano, type PlanoSalvo } from './supabase/planos'
import type { PlanoDeAula } from './types'

const PREFIXO_RASCUNHO = 'nucleo-wit:plano-de-aula'

function eraOBugDoExemplo(bruto: string): boolean {
  return bruto === JSON.stringify(planoDeAmostra)
}

function lerRascunho(chave: string): PlanoDeAula | null {
  try {
    const bruto = localStorage.getItem(chave)
    if (!bruto) return null
    if (eraOBugDoExemplo(bruto)) {
      localStorage.removeItem(chave)
      return null
    }
    return { ...planoVazio(), ...(JSON.parse(bruto) as PlanoDeAula) }
  } catch {
    return null
  }
}

/** Tela principal, depois de confirmado quem está logado. */
function AppLogado({ sessao }: { sessao: Session }) {
  // O rascunho fica isolado por professor (userId), não só por navegador —
  // num computador da escola, mais de um professor pode logar no mesmo
  // navegador, e ninguém deve ver o rascunho de quem usou antes.
  const chaveRascunho = `${PREFIXO_RASCUNHO}:${sessao.user.id}`
  const rascunho = useMemo(() => lerRascunho(chaveRascunho), [chaveRascunho])
  const [plano, setPlano] = useState<PlanoDeAula>(() => rascunho ?? planoVazio())
  const [planoAtualId, setPlanoAtualId] = useState<string | null>(null)
  const [equipeCompartilhada, setEquipeCompartilhada] = useState<string | null>(null)
  const [mostrarMeusPlanos, setMostrarMeusPlanos] = useState(false)
  const [mostrarPlanosDaEquipe, setMostrarPlanosDaEquipe] = useState(false)
  const [mostrarGestao, setMostrarGestao] = useState(false)
  const [mostrarImportar, setMostrarImportar] = useState(false)
  const [conta, setConta] = useState<MinhaConta | null>(null)
  const [carregandoConta, setCarregandoConta] = useState(true)
  const [erroConta, setErroConta] = useState('')
  const [tentativa, setTentativa] = useState(0)

  // Perfil e equipes vêm do banco uma vez por sessão.
  //
  // Quando isso falha, o app CONTINUA funcionando (gerador e planos da própria
  // conta), mas a falha aparece na tela: a primeira versão engolia o erro em
  // silêncio, e o sintoma era só o sumiço dos botões de equipe — impossível de
  // diagnosticar para quem está usando, e difícil até para quem escreveu.
  useEffect(() => {
    let ativo = true
    setCarregandoConta(true)
    carregarMinhaConta()
      .then((c) => {
        if (!ativo) return
        setConta(c)
        setErroConta('')
      })
      .catch((e: unknown) => {
        if (!ativo) return
        const mensagem = e instanceof Error ? e.message : 'erro desconhecido'
        console.error('Falha ao carregar perfil e equipes:', e)
        setConta(null)
        setErroConta(mensagem)
      })
      .finally(() => {
        if (ativo) setCarregandoConta(false)
      })
    return () => {
      ativo = false
    }
  }, [sessao.user.id, tentativa])

  // Compartilhar é sempre com uma equipe de curso: a Gestão enxerga tudo de
  // qualquer jeito, então não faz sentido oferecê-la como destino.
  const equipesDeCurso = useMemo(
    () => (conta?.equipes ?? []).filter((id) => id !== EQUIPE_GESTAO),
    [conta],
  )

  useEffect(() => {
    if (plano === planoDeAmostra) return
    try {
      localStorage.setItem(chaveRascunho, JSON.stringify(plano))
    } catch {
      /* navegador sem armazenamento: seguimos sem salvar */
    }
  }, [plano, chaveRascunho])

  const mudar = useCallback(
    (mudanca: Partial<PlanoDeAula>) => setPlano((atual) => ({ ...atual, ...mudanca })),
    [],
  )

  const limpar = useCallback(() => {
    if (confirm('Isso apaga tudo o que você preencheu nesta página. Continuar?')) {
      setPlano(planoVazio())
      setPlanoAtualId(null)
      setEquipeCompartilhada(null)
    }
  }, [])

  const abrirPlanoSalvo = useCallback((salvo: PlanoSalvo) => {
    // Igual ao rascunho do localStorage: um plano salvo antes de um campo
    // novo existir (ex.: "observacao") não tem essa chave, e sem o merge
    // com planoVazio() a tela quebra tentando ler undefined.
    setPlano({ ...planoVazio(), ...salvo.dados })
    setPlanoAtualId(salvo.id)
    setEquipeCompartilhada(salvo.equipe_id ?? null)
    setMostrarMeusPlanos(false)
    setMostrarPlanosDaEquipe(false)
  }, [])

  return (
    <>
      <header className="topo">
        <img src={logoMicroKa} alt="Micro Ka" />
        <div>
          <div className="titulo">Gerador de Plano de Aula</div>
          <div className="subtitulo">Núcleo WIT · Micro Ka</div>
        </div>
        <div className="espaco" />
        <button
          type="button"
          className="botao discreto"
          onClick={() => {
            setPlano(planoDeAmostra)
            setPlanoAtualId(null)
          }}
        >
          Ver um exemplo preenchido
        </button>
        <button type="button" className="botao discreto" onClick={() => setMostrarMeusPlanos(true)}>
          Meus planos
        </button>
        <button type="button" className="botao discreto" onClick={() => setMostrarImportar(true)}>
          Importar PDF
        </button>
        {/* Sempre presente: se as equipes não carregaram, o botão fica
            desabilitado dizendo por quê, em vez de simplesmente sumir. */}
        <button
          type="button"
          className="botao discreto"
          disabled={!conta}
          title={
            conta
              ? undefined
              : carregandoConta
                ? 'Carregando suas equipes…'
                : `Não consegui carregar suas equipes: ${erroConta}`
          }
          onClick={() => setMostrarPlanosDaEquipe(true)}
        >
          {carregandoConta ? 'Planos da equipe…' : 'Planos da equipe'}
        </button>
        {conta?.gestao ? (
          <button type="button" className="botao discreto" onClick={() => setMostrarGestao(true)}>
            Gestão
          </button>
        ) : null}
        <button type="button" className="botao discreto" onClick={limpar}>
          Limpar página
        </button>
        <button
          type="button"
          className="botao discreto"
          title={sessao.user.email}
          onClick={() => supabase?.auth.signOut()}
        >
          Sair
        </button>
      </header>

      {erroConta ? (
        <div className="faixa-erro">
          <Aviso tipo="erro">
            <strong>Não consegui carregar seu perfil e suas equipes.</strong> O gerador continua
            funcionando, mas sem compartilhar com a equipe nem ver os planos dos colegas. Detalhe do
            erro: <code>{erroConta}</code>{' '}
            <button
              type="button"
              className="botao secundario"
              onClick={() => setTentativa((n) => n + 1)}
              disabled={carregandoConta}
            >
              {carregandoConta ? 'Tentando…' : 'Tentar de novo'}
            </button>
          </Aviso>
        </div>
      ) : null}

      <Formulario
        plano={plano}
        aoMudar={mudar}
        aoLimpar={limpar}
        planoSalvoId={planoAtualId}
        contaCarregada={!!conta}
        minhasEquipes={equipesDeCurso}
        equipeCompartilhada={equipeCompartilhada}
        aoMudarEquipeCompartilhada={setEquipeCompartilhada}
        aoSalvar={async (dadosAtuais) => {
          const salvo = await salvarPlano(planoAtualId, dadosAtuais, equipeCompartilhada)
          setPlanoAtualId(salvo.id)
        }}
      />

      {mostrarMeusPlanos ? (
        <MeusPlanos
          minhasEquipes={equipesDeCurso}
          aoFechar={() => setMostrarMeusPlanos(false)}
          aoAbrirPlano={abrirPlanoSalvo}
        />
      ) : null}

      {mostrarPlanosDaEquipe && conta ? (
        <PlanosDaEquipe
          minhasEquipes={equipesDeCurso}
          perfil={conta.perfil}
          aoFechar={() => setMostrarPlanosDaEquipe(false)}
          aoAbrirPlano={abrirPlanoSalvo}
        />
      ) : null}

      {mostrarGestao && conta?.gestao ? <Gestao aoFechar={() => setMostrarGestao(false)} /> : null}

      {mostrarImportar ? (
        <ImportarPlano
          aoFechar={() => setMostrarImportar(false)}
          aoUsar={(importado) => {
            // Entra como plano NOVO, não como edição do que estava aberto: o
            // conteúdo veio de outro documento, e sobrescrever um plano salvo
            // sem querer seria pior do que criar um a mais.
            setPlano(importado)
            setPlanoAtualId(null)
            setEquipeCompartilhada(null)
            setMostrarImportar(false)
          }}
        />
      ) : null}
    </>
  )
}

export function App() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  // O link de "esqueci minha senha" volta pro app numa sessão temporária de
  // recuperação — o Supabase avisa disso com o evento PASSWORD_RECOVERY, e
  // enquanto ele não terminar (escolher a senha nova) a tela normal fica
  // escondida, senão a pessoa cairia direto no formulário sem trocar nada.
  const [recuperandoSenha, setRecuperandoSenha] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setCarregando(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      setSessao(novaSessao)
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoSenha(true)
    })
    return () => assinatura.subscription.unsubscribe()
  }, [])

  if (carregando) return null
  if (recuperandoSenha) return <RedefinirSenha aoConcluir={() => setRecuperandoSenha(false)} />
  if (!sessao) return <Auth />
  return <AppLogado sessao={sessao} />
}
