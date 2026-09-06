import { useState } from 'react'

import { EQUIPES_DE_CURSO } from '../constants'
import { supabase } from '../supabase/client'
import { Aviso, Campo } from './ui'

type Modo = 'entrar' | 'cadastrar' | 'recuperar'

/**
 * Tela de entrada (login/cadastro/recuperação): e-mail e senha, ou Google.
 * Sem link mágico — decisão do instrutor, mais previsível pro professor.
 *
 * Entrar pelo Google com um e-mail que já tem conta aqui NÃO cria conta
 * nova: o Supabase liga a identidade nova ao usuário existente quando o
 * e-mail bate e está confirmado, então planos, perfil e equipes seguem os
 * mesmos, e os dois jeitos de entrar passam a valer. Com e-mail diferente,
 * é conta separada — é o que a tela avisa, e o que `CompletarPerfil`
 * reforça para quem cai lá sem equipe nenhuma.
 *
 * Se o Supabase não tiver as chaves configuradas (`supabase === null`), o
 * app mostra um aviso em vez de travar aqui — assim continua dando pra abrir
 * o gerador sem conta, se um dia isso voltar a ser opcional.
 */
export function Auth() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [equipes, setEquipes] = useState<string[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  function alternarEquipe(id: string) {
    setEquipes((atual) => (atual.includes(id) ? atual.filter((e) => e !== id) : [...atual, id]))
  }

  /**
   * Entrada pelo Google.
   *
   * Serve para entrar E para se cadastrar: se a conta ainda não existe, o
   * Supabase cria na hora. Como esse caminho não passa pelo formulário, o
   * professor não escolhe equipe aqui — quem pergunta isso é a tela de
   * "Complete seu perfil", logo depois de entrar (ver `CompletarPerfil`).
   */
  async function entrarComGoogle() {
    setErro('')
    setAviso('')
    setCarregando(true)
    try {
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
      // Em caso de sucesso o navegador sai da página para o Google; nada
      // depois daqui roda.
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : 'Não consegui abrir a entrada pelo Google.'
      setErro(
        /provider is not enabled|Unsupported provider/i.test(mensagem)
          ? 'A entrada pelo Google ainda não está ligada neste projeto. Use e-mail e senha, ou peça para a Gestão ativar.'
          : mensagem,
      )
      setCarregando(false)
    }
  }

  if (!supabase) {
    return (
      <div className="auth">
        <Aviso tipo="erro">
          O login está indisponível no momento (faltam as chaves do Supabase configuradas).
        </Aviso>
      </div>
    )
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setAviso('')
    setCarregando(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase!.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
      } else if (modo === 'cadastrar') {
        if (equipes.length === 0) throw new Error('Escolha pelo menos uma equipe para continuar.')
        // Nome e equipes viajam como metadado do usuário: a trigger
        // `ao_criar_usuario`, no banco, cria o perfil e as linhas de
        // `membros_equipe` a partir daí — assim ninguém entra sem equipe, nem
        // que feche a aba logo depois de cadastrar.
        const { data, error } = await supabase!.auth.signUp({
          email,
          password: senha,
          options: { data: { nome: nome.trim(), equipes } },
        })
        if (error) throw error
        if (!data.session) {
          setAviso('Conta criada! Confira seu e-mail para confirmar antes de entrar.')
        }
      } else {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setAviso('Te mandamos um e-mail com um link para escolher uma senha nova.')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui completar. Tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  const titulo = { entrar: 'Entrar', cadastrar: 'Criar conta', recuperar: 'Redefinir senha' }[modo]

  return (
    <div className="auth">
      <div className="auth-cartao">
        <h1>Gerador de Plano de Aula</h1>
        <p className="subtitulo">Núcleo WIT · Micro Ka</p>

        {modo !== 'recuperar' ? (
          <div className="auth-abas">
            <button
              type="button"
              className={modo === 'entrar' ? 'ativa' : ''}
              onClick={() => {
                setModo('entrar')
                setErro('')
                setAviso('')
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={modo === 'cadastrar' ? 'ativa' : ''}
              onClick={() => {
                setModo('cadastrar')
                setErro('')
                setAviso('')
              }}
            >
              Criar conta
            </button>
          </div>
        ) : null}

        <form onSubmit={enviar}>
          <Campo rotulo="E-mail">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Campo>

          {modo === 'cadastrar' ? (
            <Campo rotulo="Nome e sobrenome" dica="é o que sai no campo Prof. do plano">
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Ex.: Nicolas Correa"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Campo>
          ) : null}

          {modo !== 'recuperar' ? (
            <Campo rotulo="Senha" dica={modo === 'cadastrar' ? 'pelo menos 6 caracteres' : undefined}>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </Campo>
          ) : null}

          {modo === 'cadastrar' ? (
            <fieldset className="equipes-escolha">
              <legend>Qual equipe você faz parte?</legend>
              <p className="explica">
                Marque quantas forem — quem dá aula no Integral e num curso faz parte das duas.
                É por aqui que você enxerga os planos compartilhados pelos colegas.
              </p>
              <div className="equipes-lista">
                {EQUIPES_DE_CURSO.map((equipe) => (
                  <label
                    className={`equipe-opcao${equipes.includes(equipe.id) ? ' marcada' : ''}`}
                    key={equipe.id}
                  >
                    <input
                      type="checkbox"
                      checked={equipes.includes(equipe.id)}
                      onChange={() => alternarEquipe(equipe.id)}
                    />
                    <span>{equipe.nome}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
          {aviso ? <Aviso tipo="info">{aviso}</Aviso> : null}

          <button type="submit" className="botao" disabled={carregando}>
            {carregando ? 'Um momento…' : titulo}
          </button>
        </form>

        {modo !== 'recuperar' ? (
          <>
            <div className="separador-ou">
              <span>ou</span>
            </div>
            <button
              type="button"
              className="botao secundario botao-google"
              onClick={entrarComGoogle}
              disabled={carregando}
            >
              <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
                />
              </svg>
              Entrar com o Google
            </button>
            <p className="explica" style={{ marginTop: 8 }}>
              <strong>Use o mesmo e-mail de sempre.</strong> Se você já tem conta aqui, entrar pelo
              Google com esse e-mail não cria conta nova: é a mesma conta, com os mesmos planos
              salvos — e a senha continua valendo, se quiser entrar pelos campos acima. Com um
              e-mail diferente, o sistema cria uma conta separada e seus planos ficam na antiga.
            </p>
          </>
        ) : null}

        {modo === 'entrar' ? (
          <button
            type="button"
            className="botao discreto auth-esqueci"
            onClick={() => {
              setModo('recuperar')
              setErro('')
              setAviso('')
            }}
          >
            Esqueci minha senha
          </button>
        ) : null}

        {modo === 'recuperar' ? (
          <p className="explica">
            Serve também para <strong>criar</strong> uma senha: quem só entrou pelo Google até
            agora não tem senha definida, e o link do e-mail deixa escolher uma — depois disso,
            os dois jeitos de entrar funcionam na mesma conta.
          </p>
        ) : null}

        {modo === 'recuperar' ? (
          <button
            type="button"
            className="botao discreto auth-esqueci"
            onClick={() => {
              setModo('entrar')
              setErro('')
              setAviso('')
            }}
          >
            Voltar para o login
          </button>
        ) : null}
      </div>
    </div>
  )
}
