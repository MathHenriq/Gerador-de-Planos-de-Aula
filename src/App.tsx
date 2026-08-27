import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'

import logoMicroKa from './assets/logo-micro-ka.png'
import { Auth } from './components/Auth'
import { Formulario } from './components/Formulario'
import { MeusPlanos } from './components/MeusPlanos'
import { RedefinirSenha } from './components/RedefinirSenha'
import { planoVazio } from './constants'
import { planoDeAmostra } from './planoDeAmostra'
import { supabase } from './supabase/client'
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
  const [mostrarMeusPlanos, setMostrarMeusPlanos] = useState(false)

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
    }
  }, [])

  const abrirPlanoSalvo = useCallback((salvo: PlanoSalvo) => {
    // Igual ao rascunho do localStorage: um plano salvo antes de um campo
    // novo existir (ex.: "observacao") não tem essa chave, e sem o merge
    // com planoVazio() a tela quebra tentando ler undefined.
    setPlano({ ...planoVazio(), ...salvo.dados })
    setPlanoAtualId(salvo.id)
    setMostrarMeusPlanos(false)
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

      <Formulario
        plano={plano}
        aoMudar={mudar}
        aoLimpar={limpar}
        planoSalvoId={planoAtualId}
        aoSalvar={async (dadosAtuais) => {
          const salvo = await salvarPlano(planoAtualId, dadosAtuais)
          setPlanoAtualId(salvo.id)
        }}
      />

      {mostrarMeusPlanos ? (
        <MeusPlanos aoFechar={() => setMostrarMeusPlanos(false)} aoAbrirPlano={abrirPlanoSalvo} />
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
